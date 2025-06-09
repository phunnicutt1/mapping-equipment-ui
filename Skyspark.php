<?php

declare(strict_types=1);

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Psr\Http\Message\ResponseInterface;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Promise;

defined('BASEPATH') or exit('No direct script access allowed');

require 'vendor/autoload.php';

/*****************************************************************
 * CxAlloy | SkySpark Library Class
 *
 * Authentication and other essential functionality for Skyspark.
 ******************************************************************/
class Skyspark {

    /**
     * Guzzle HTTP client
     *
     * @var Client
     */
    private Client $_HClient;

    /**
     * URI to use for requests
     * Set by `constructor()`
     *
     * @var string|mixed
     */
    private string $_uri;

    /**
     * Username to use for requests
     * Set by `constructor()`
     *
     * @var string|mixed
     */
    private string $_username;

    /**
     * Password to use for requests
     * Set by `constructor()`
     *
     * @var string|mixed
     */
    private string $_password;

    /**
     * OTTO web base url to use for requests
     * Set by `constructor()`
     *
     * @var string
     */
    private string $_serverUrl;

    /**
     * Access token to use for requests
     * Set by `constructor()`
     *
     * @var string|null
     */
    private ?string $_auth_token = NULL;

    /**
     * OTTO project ID to use for requests
     * Set by `use_project($cxalloy_project_id)`
     *
     * @var int|null
     */
    private $_otto_project_id = NULL;

    /**
     * CxAlloy project ID currently in use
     * Set by `use_project($cxalloy_project_id)`
     *
     * @var int|null
     */
    private $_cxalloy_project_id = NULL;

    /**
     * Project settings currently in use
     * Set by `use_project($cxalloy_project_id)`
     *
     * @var array
     */
    private array $_settings = [];

    /**
     * Where log messages should be written.
     * "codeigniter" writes them to the general
     * CI log file using `log_message`. "console"
     * writes them to standard output.
     *
     * @var string
     */
    private $_log_target = 'console';
    
    /**
     * Whether to echo messages to output
     *
     * @var bool
     */
    private bool $echo_messages = TRUE;

    /**
     * CodeIgniter global object instance
     *
     * @var object
     */
    private $CI;

    /**
     * Initialize the Skyspark library
     * 
     * Loads configuration values and authenticates with Skyspark server
     *
     * @return void
     */
    public function __construct()
    {
        $this->CI =& get_instance();
        $this->CI->config->load('skyspark');

        // add credentials to private class properties
        $this->_uri       = $this->CI->config->config['skyspark_uri'];
        $this->_serverUrl = $this->CI->config->config['skyspark_server_url'];
        $this->_username  = $this->CI->config->config['skyspark_username'];
        $this->_password  = $this->CI->config->config['skyspark_pass'];
        $this->_HClient   = new Client(['base_uri' => $this->_serverUrl, 'timeout' => 5.0]);

        // authenticate & store auth token
        $this->_check_auth_token();

        log_message('debug', 'Skyspark library initialized...');
    }

    /**
     * Authenticate with Skyspark server
     * & store auth token if not already authenticated
     *
     * @return void
     */
    private function _check_auth_token() : void
    {
        if (empty($this->_auth_token))
        {
            $this->_scram_auth();
        }
    }

    /*******************************************
     * This section is for SCRAM Authentication
     * to return an auth token that can be used
     * for other api requests once obtained.
     * ******************************************
     * Token is stored in the private class
     * property $this->auth_token
     ********************************************/

    /**
     * Performs SCRAM authentication with Skyspark server
     * and stores the auth token for subsequent API requests
     *
     * @return void
     */
    private function _scram_auth() : void
    {
        // the size in bytes of a SHA-256 hash
        $dklen = 32;

        //Send url and username for first introduction in message 1
        $handshakeToken = $this->_sendMsg1($this->_serverUrl, $this->_username);

        //Parse handshakeToken from Server Response 1.
        $handshakeToken = $this->get_string_between($handshakeToken, '=', ',');

        //Create a random but strong id.
        $random = md5(uniqid((string) mt_rand(), TRUE));

        $clientNonce = $random;

        $clientFirstMsg = 'n=' . $this->_username . ',r=' . $clientNonce;

        //Send url, Client's First Message, and the handshakeToken in message 2
        $serverFirstMsg = $this->_sendMsg2($this->_serverUrl, $clientFirstMsg, $handshakeToken);

        //Parse Server Nonce, Server Salt, and Server Iterations from Server Response 2
        $serverNonce      = $this->get_string_between($serverFirstMsg, 'r=', ',');
        $serverSalt       = $this->get_string_between($serverFirstMsg, 's=', ',');
        $serverIterations = substr($serverFirstMsg, strpos($serverFirstMsg, 'i=') + 2);

        //PBKDf2 for the SHA-256 hashing algorithm
        $saltedPassword = hash_pbkdf2('sha256', $this->_password, base64_decode($serverSalt), intval($serverIterations), $dklen, TRUE);

        $gs2Header       = base64_encode('n,,');
        $clientFinalNoPf = 'c=' . $gs2Header . ',r=' . $serverNonce;
        $authMessage     = $clientFirstMsg . ',' . $serverFirstMsg . ',' . $clientFinalNoPf;

        //HMAC for SHA-256 hashing for the Client Key
        $clientKey = hash_hmac('sha256', 'Client Key', $saltedPassword, TRUE);

        //hash the Stored Key
        $storedKey = hash('sha256', $clientKey, TRUE);

        //HMAC for SHA-256 hashing for the Client Signature
        $clientSignature = hash_hmac('sha256', $authMessage, $storedKey, TRUE);

        //Xor Client Key with Client Signature
        $clientProof = ($clientKey ^ $clientSignature);

        $clientFinalMsg = $clientFinalNoPf . ',p=' . base64_encode($clientProof);

        //Send url, Client's Final Message, and the handshakeToken in message 3
        $this->_auth_token = $this->_sendMsg3($this->_serverUrl, $clientFinalMsg, $handshakeToken);
        //return $this->auth_token;
    }

    /*************************************
     * Auth SCRAM - Message 1 Using cURL *
     *************************************/

    private function _sendMsg1($serverUrl, $msg) : bool|string
    {
        $authMsg = 'HELLO username=' . rtrim(strtr(base64_encode($msg), '+/', '-_'), '=');
        $ch      = curl_init();
        curl_setopt($ch, CURLOPT_URL, $serverUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_HEADER, TRUE);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: ' . $authMsg,
            'WWW-Authenticate: SCRAM'
        ]);
        $serverMsg = curl_exec($ch);

        curl_close($ch);

        return $serverMsg;
    }

    /*************************************
     * Auth SCRAM - Message 2 Using cURL *
     *************************************/

    private function _sendMsg2($serverUrl, $msg, $handshakeToken)
    {
        $authMsg = 'SCRAM handshakeToken=' . $handshakeToken . ', data=' . rtrim(strtr(base64_encode($msg), '+/', '-_'), '=');
        $ch      = curl_init();
        curl_setopt($ch, CURLOPT_URL, $serverUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_HEADER, TRUE);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: ' . $authMsg,
            'WWW-Authenticate: SCRAM'
        ]);
        $serverMsg = curl_exec($ch);
        $serverMsg = base64_decode($this->get_string_between($serverMsg, 'data=', ','));

        curl_close($ch);

        return $serverMsg;
    }

    /*************************************
     * Auth SCRAM - Message 3 Using cURL *
     *************************************/

    private function _sendMsg3($serverUrl, $msg, $handshakeToken)
    {
        $authMsg = 'SCRAM handshakeToken=' . $handshakeToken . ', data=' . rtrim(strtr(base64_encode($msg), '+/', '-_'), '=');

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $serverUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_HEADER, TRUE);
        curl_setopt($ch, CURLOPT_FAILONERROR, FALSE);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: ' . $authMsg
        ]);
        $serverMsg = curl_exec($ch);
        $serverMsg = $this->get_string_between($serverMsg, 'authToken=', ',');

        curl_close($ch);

        return $serverMsg;
    }

    /******************************************
     * Auth SCRAM - End Authentication Methods
     ******************************************/

    /**
     * Sets the current project for Skyspark operations
     * and loads project-specific integration settings
     *
     * @param int $cxalloy_project_id CxAlloy project ID to use
     * @return void
     */
    public function use_project(int $cxalloy_project_id) : void
    {
        if (empty($this->_cxalloy_project_id))
        {
            $this->_cxalloy_project_id = $cxalloy_project_id;
        }
        $settings = $this->get_integration_settings($cxalloy_project_id);

        $this->_settings = $settings;
    }

    /**
     * Retrieves integration settings for a specific project
     *
     * @param int $project_id CxAlloy project ID
     * @return array Integration settings for the project
     * @throws Exception If project ID is not set
     */
    private function get_integration_settings(int $project_id) : array
    {
        $project_id = $project_id ?? $this->_cxalloy_project_id;

        if (empty($project_id))
        {
            throw new Exception(line('otto_project_id_empty_integration'));
        }

        // get existing contents of `integrations` and decode the JSON
        $this->CI->db->select('integrations');
        $this->CI->db->where('project_id', $project_id);

        $stored_settings = $this->CI->db->get('project')->row();
        $string_settings = $stored_settings->integrations ?? ' ';

        $integrations    = json_decode($string_settings, TRUE) ?? [];
        $this->_settings = $integrations['otto'] ?? $this->_settings;

        return $this->_settings;
    }

    /**
     * Save integration settings for the current project
     *
     * Call `use_project()` before calling this function to avoid error
     * due to the project_id not being set in the private _cxalloy_project_id property
     *
     * @return void
     * @throws Exception If project ID is not set
     */
    private function save_integration_settings() : void
    {
        if (empty($this->_cxalloy_project_id))
        {
            throw new Exception(line('otto_project_id_empty_integration'));
        }

        // get existing contents of `integrations` and decode the JSON
        $this->CI->db->select('integrations');
        $this->CI->db->where('project_id', $this->_cxalloy_project_id);

        $project         = $this->CI->db->get('project')->row();
        $string_settings = $project->integrations ?? ' ';
        $integrations    = json_decode($string_settings, TRUE) ?? [];

        $integrations['otto'] = $this->_settings ?? [];

        $this->CI->db->update('project', ['integrations' => json_encode($integrations)], ['project_id' => $this->_cxalloy_project_id]);
    }

    /**
     * Checks if Skyspark integration is enabled for the current project
     *
     * @return bool True if integration is enabled, false otherwise
     */
    public function is_enabled() : bool
    {
        if ( ! empty($this->_settings['enabled']) && $this->_settings['enabled'] === 1)
        {
            return TRUE;
        }

        return FALSE;
    }

    /**
     * Checks if cancellation is pending for the current project
     *
     * @return bool True if cancellation is pending, false otherwise
     */
    public function is_cancel_pending() : bool
    {
        if ( ! empty($this->_settings['cancel_pending']) && $this->_settings['cancel_pending'] === 1)
        {
            return TRUE;
        }

        return FALSE;
    }

    /**
     * Gets the connection status for a specific gateway
     *
     * @param int $gateway_id The ID of the gateway to check
     * @return string|null The gateway connection status or NULL if not set
     */
    public function get_project_gateway_status(int $gateway_id)
    {
        if ( ! empty($this->_settings['gateway_connection_status']))
        {
            return $this->_settings['gateway_connection_status'][$gateway_id];
        }

        return NULL;
    }

    /**
     * Sets the connection status for a specific gateway
     *
     * @param int $gateway_id The ID of the gateway to update
     * @param string $status The new status to set
     * @return void
     */
    public function set_project_gateway_status(int $gateway_id, string $status)
    {
        $this->_settings['gateway_connection_status'][$gateway_id] = $status;
        $this->save_integration_settings();
    }

    /**
     * Gets the OTTO project name for the current project
     *
     * @return string|null The OTTO project name or NULL if not set
     */
    public function get_otto_project_name()
    {
        if ( ! empty($this->_settings['otto_project_name']))
        {
            return $this->_settings['otto_project_name'];
        }

        return NULL;
    }

    /**
     * Sets the OTTO project name for the current project
     *
     * @param string $name The OTTO project name to set
     * @return void
     */
    public function set_otto_project_name($name)
    {
        $this->_settings['otto_project_name'] = $name;
        $this->save_integration_settings();
    }

    /**
     * Disables Skyspark integration for the current project
     *
     * @return void
     */
    public function disable()
    {
        // set "enabled" to 0
        $this->_settings['enabled'] = 0;
        $this->save_integration_settings();
    }

    /**
     * Enables Skyspark integration for the current project
     * and clears any pending cancellation
     *
     * @return void
     * @throws Exception If there is an error saving the settings
     */
    public function enable() : void
    {
        $this->_settings['enabled']        = 1;
        $this->_settings['cancel_pending'] = 0;
        $this->save_integration_settings();
    }

    /**
     * Initialize the cancellation process for OTTO service
     *
     * Sets the cancel_pending flag to 1 in the integration settings,
     * indicating that the OTTO service cancellation has been initiated
     * but not yet completed.
     *
     * @return void
     */
    public function init_cancel() : void
    {
        $this->_settings['cancel_pending'] = 1;
        $this->save_integration_settings();
    }

    /**
     * Complete the cancellation process for OTTO service
     *
     * Sets the cancel_pending flag to 0 in the integration settings,
     * indicating that the OTTO service cancellation has been completed.
     *
     * @return void
     */
    public function complete_cancel() : void
    {
        $this->_settings['cancel_pending'] = 0;
        $this->save_integration_settings();
    }

    /**
     * Archive an OTTO project
     *
     * Sets the enabled flag to 0 and the archived flag to 1 in the integration settings,
     * indicating that the OTTO project has been archived.
     *
     * @param int $project_id The ID of the project to archive
     * @return void
     */
    public function archive_project($project_id) : void
    {
        // set "enabled" to 0
        $this->_settings['enabled']  = 0;
        $this->_settings['archived'] = 1;
        $this->save_integration_settings();
    }

    /**
     * Restore an archived OTTO project
     *
     * Sets the enabled flag to 1 and the archived flag to 0 in the integration settings,
     * indicating that the OTTO project has been restored from an archived state.
     *
     * @throws Exception If the project ID is not set
     * @return void
     */
    public function restore_project() : void
    {
        $this->_settings['enabled']  = 1;
        $this->_settings['archived'] = 0;
        $this->save_integration_settings();
    }


    /**
     * Checks if the OTTO integration is active for the current project
     *
     * @return bool True if active, false otherwise
     */
    public function is_active() : bool
    {
        if ( ! empty($this->_settings['active']) && $this->_settings['active'] === 1)
        {
            return TRUE;
        }

        return FALSE;
    }

    /**
     * Deletes/removes an OTTO project from the Skyspark server
     *
     * Executes the projDelete Axon command on the Skyspark server to permanently
     * delete the specified OTTO project. This action cannot be undone.
     *
     * @param string $otto_project_name Valid OTTO project name (contains project ID)
     * @return void
     */
    public function remove_otto_project(string $otto_project_name) : void
    {
        // Project name of "sys" used here to represent host level
        //axon command example: projDelete(@p:magnolia_9,"2024-12-09")
        $current_date   = date("Y-m-d");
        $delete_project = 'projDelete(@p:' . $otto_project_name . ', "' . $current_date . '")';
        echo $delete_project;
        $response_array = $this->eval($delete_project, 'sys');
        echo $response_array;
    }

    /**
     * Archive an OTTO project on the Skyspark server ** RESERVED FOR FUTURE
     *
     * Archives the specified OTTO project on the Skyspark server instead of
     * permanently deleting it. This allows the project to be restored later if needed.
     *
     * @param string $otto_project_name Valid OTTO project name (contains project ID)
     * @return void
     */
    public function archive_otto_project(string $otto_project_name) : void
    {
        // Project name of "sys" used here to represent host level

        //$response_array = $this->skyspark->eval($archive_project, 'sys');
        //echo $response_array;
    }

    /**
     * Run any Axon expression in Skyspark
     *
     * @param string $expression The axon expression to evaluate
     * @param string $project    The project to evaluate the expression in
     *
     * @return string The raw response from the Skyspark server
     */
    public function eval(string $expression, string $project) : string
    {
        $this->_check_auth_token();

        $uri           = 'api/' . $project . '/eval';
        $response_body = '';

        $request_grid = <<<ZINC
			ver:"3.0"
			expr
			"$expression"
			
			ZINC;

        try
        {
            $response = $this->_HClient->request('POST', $uri, [
                'headers' => [
                    'Host'          => $this->_uri,
                    'Accept'        => 'text/zinc',
                    'Content-Type'  => 'text/zinc; charset=utf-8',
                    'Authorization' => "BEARER authToken=$this->_auth_token"
                ],
                'body'    => $request_grid
            ]);

            $response_body = $response->getBody()->getContents();
        }
        catch(GuzzleException $e)
        {
            $this->_message('error', 'Failed to process response: ' . $e->getMessage());
        }
        catch(Exception $e)
        {
            $this->_message('error', "Error: call to URL '{$uri}' failed with status {$e->getCode()} response: {$e->getMessage()}");
        }

        return $response_body;
    }

    /**
     * Run any Axon expression in Skyspark and return the result as JSON
     *
     * @param string $expression The axon expression to evaluate
     * @param string $project    The project to evaluate the expression in
     *
     * @return array The parsed JSON response as an associative array
     */
    public function evalJson(string $expression, string $project) : array
    {
        $this->_check_auth_token();

        $uri = 'api/' . $project . '/eval';

        $request_grid = <<<ZINC
			ver:"3.0"
			expr
			"$expression"
			
			ZINC;

        try
        {
            $payload  = [];
            $response = $this->_HClient->request('POST', $uri, [
                'headers' => [
                    'Host'          => $this->_uri,
                    'Accept'        => 'application/json',
                    'Content-Type'  => 'text/zinc; charset=utf-8',
                    'Authorization' => "BEARER authToken=$this->_auth_token"
                ],
                'body'    => $request_grid
            ]);

            if ( ! empty($response->getBody()))
            {
                $payload = json_decode($response->getBody()->getContents() ?? '[]', TRUE);
            }
        }
        catch(GuzzleException $e)
        {
            $this->_message('error', 'Failed to process response: ' . $e->getMessage());
        }
        catch(Exception $e)
        {
            $this->_message('error', "Error: call to URL '{$uri}' failed with status {$e->getCode()} response: {$e->getMessage()}");
        }

        return $payload;
    }

    /**
     * Read time-series data from a historized point
     *
     * @param string $id      Ref identifier of historized point
     * @param string $range   String encoding of a date-time range
     * @param string $project The project to read data from
     *
     * @return string The raw response from the Skyspark server
     */
    public function hisRead(string $id, string $range, string $project) : string
    {
        $this->_check_auth_token();

        $request_grid = <<<ZINC
        ver:"3.0"
        id,range
        $id,"$range"
        
        ZINC;

        $uri           = 'api/' . $project . '/hisRead';
        $response_body = '';

        try
        {
            $response = $this->_HClient->request('POST', $uri, [
                'headers' => [
                    'Host'          => $this->_uri,
                    'Accept'        => 'text/zinc',
                    'Content-Type'  => 'text/zinc; charset=utf-8',
                    'Authorization' => "BEARER authToken=$this->_auth_token"
                ],
                'body'    => $request_grid
            ]);

            $response_body = $response->getBody()->getContents();
        }
        catch(GuzzleException $e)
        {
            $this->_message('error', 'Failed to process response: ' . $e->getMessage());
        }
        catch(Exception $e)
        {
            $this->_message('error', "Error: call to URL '{$uri}' failed with status {$e->getCode()} response: {$e->getMessage()}");
        }

        return $response_body;
    }

    /**
     * Read time-series data from a historized point with optimized performance
     *
     * Optimized for reading large date ranges by splitting them into smaller 7-day
     * ranges and making concurrent requests to the Skyspark API. Results are encoded
     * in JSON format for faster parsing.
     *
     * @param string $id      Ref identifier of historized point
     * @param string $range   String encoding of a date-time range
     * @param string $project The project to read data from
     *
     * @return array Array of JSON responses from the Skyspark server
     */
    public function hisReadOptimized(string $id, string $range, string $project) : array
    {
        $promises = [];

        $this->_check_auth_token();

        try
        {
            $date_ranges = $this->slice_date_range($range);
        }
        catch(Exception $e)
        {
            $this->_message('Error splitting date range into smaller ranges: ' . $e->getMessage() . '\n');
            // use the full range due to error splitting range
            $date_ranges = [$range];
        }

        $uri = 'api/' . $project . '/hisRead';

        $headers = [
            'Host'          => $this->_uri,
            'Accept'        => 'application/json',
            'Content-Type'  => 'text/zinc; charset=utf-8',
            'Authorization' => "BEARER authToken=$this->_auth_token"
        ];

        foreach ($date_ranges as $date_range)
        {
            $request_grid = <<<ZINC
            ver:"3.0"
            id,range
            $id,"{$date_range['start']},{$date_range['end']}"

            ZINC;

            // Create a PSR-7 request object to resolve
            $request    = new Request('POST', $uri, $headers, $request_grid);
            $promises[] = $this->_HClient->sendAsync($request);
        }

        try
        {
            $responses = Promise\Utils::unwrap($promises);
            $grids     = array_map(fn($response) => $response->getBody()->getContents(), $responses) ?? [];
        }
        catch(Throwable $e)
        {
            // Handle exceptions as needed
            $this->_message('Error unwrapping promises: ' . $e->getMessage() . '\n');
            $grids = [];
        }

        return $grids;
    }

    /**
     * Split a date range into smaller 7-day date ranges
     *
     * @param string $date_range Date range in format "start_date,end_date"
     *
     * @return array Array of date ranges, each containing 'start' and 'end' keys
     * @throws Exception If there is an error parsing the date range
     */
    public function slice_date_range($date_range) : array
    {
        // Split the input string to get the start and end dates
        [$start_date, $end_date] = explode(',', $date_range);

        // Convert the dates to DateTime objects
        $start = new DateTime($start_date);
        $end   = new DateTime($end_date);

        // Initialize an array to hold the date ranges
        $date_ranges = [];

        // Loop through the date range in 7-day increments
        while ($start < $end)
        {
            // Clone the start date to avoid modifying the original object
            $range_start = clone $start;

            // Add 7 days to the start date to get the end of the range
            $range_end = clone $start;
            $range_end->modify('+6 days');

            // If the range end exceeds the overall end date, set it to the overall end date
            if ($range_end > $end)
            {
                $range_end = $end;
            }

            // Add the range to the array
            $date_ranges[] = [
                'start' => $range_start->format('Y-m-d'),
                'end'   => $range_end->format('Y-m-d')
            ];

            // Move the start date to the next day after the current range end
            $start->modify('+7 days');
        }

        return $date_ranges;
    }

    /**
     * Read current data from a point or filter
     *
     * @param string  $project The project to read data from
     * @param ?string $id      Ref identifier of point to read (optional)
     * @param ?string $filter  String encoding of a filter to apply (optional)
     *
     * @return string The raw response from the Skyspark server
     */
    public function read(string $project, string $id = NULL, string $filter = NULL) : string
    {
        $this->_check_auth_token();

        $uri           = 'api/' . $project . '/read';
        $response_body = '';

        try
        {
            if (isset($filter) && empty($id))
            {
                $request_grid = <<<ZINC
                ver:"3.0"
                filter,limit
                "$filter",1000

                ZINC;
            }
            elseif (isset($id))
            {
                $request_grid = <<<ZINC
                ver:"3.0"
                id
                $id

                ZINC;
            }
            else
            {
                throw new Exception('Missing required parameters to call API');
            }

            $response = $this->_HClient->request('POST', $uri, [
                'headers' => [
                    'Host'          => $this->_uri,
                    'Accept'        => 'text/zinc',
                    'Content-Type'  => 'text/zinc; charset=utf-8',
                    'Authorization' => "BEARER authToken=$this->_auth_token"
                ],
                'body'    => $request_grid
            ]);

            $response_body = $response->getBody()->getContents();
        }
        catch(GuzzleException $e)
        {
            $this->_message('error', 'Failed to process response: ' . $e->getMessage());
        }
        catch(Exception $e)
        {
            $this->_message('error', "Error: call to URL '{$uri}' failed with status {$e->getCode()} response: {$e->getMessage()}");
        }

        return $response_body;
    }

    /**
     * Returns the response body as a string
     *
     * @param string $response_body The response body to return
     * @return string The response body
     */
    public function response_body(String $response_body) : string
    {
        return $response_body;
    }

    /******************
     * Parse function  *
     *******************/
    /**
     * Extract a substring between two delimiter strings
     *
     * @param string $string The string to extract from
     * @param string $start  The start delimiter
     * @param string $end    The end delimiter
     * @return string The extracted substring or empty string if not found
     */
    private function get_string_between($string, $start, $end) : string
    {
        $string = ' ' . $string;
        $ini    = strpos($string, $start);
        if ($ini == 0)
        {
            return '';
        }
        $ini += strlen($start);
        $len = strpos($string, $end, $ini) - $ini;

        return substr($string, $ini, $len);
    }

    /**
     * Private message method which can log massages or echo messages in the CLI
     *
     * @param string $prefix     Prefix for the message (e.g., ERROR, INFO)
     * @param string $text       The message text to output
     * @param bool   $extra_line Whether to add new lines before and after the message
     * @return void
     */
    private function _message(string $prefix = '', string $text = '', bool $extra_line = FALSE) : void
    {
        $message = '';

        if ( ! empty($prefix))
        {
            $message = $prefix . ': ';
        }

        if (is_cli())
        {
            if ($extra_line)
            {
                $message .= PHP_EOL . $text . PHP_EOL;
            }
            else
            {
                $message .= $text . PHP_EOL;
            }
        }
        else
        {
            if ($extra_line)
            {
                $message .= '<br>' . $text . '<br>';
            }
            else
            {
                $message .= $text . '<br>';
            }
        }

        if ($this->echo_messages)
        {
            echo $message;
        }
        else
        {
            if (empty($prefix))
            {
                $prefix = 'info';
            }
            log_message($prefix, $message);
        }
    }

}
