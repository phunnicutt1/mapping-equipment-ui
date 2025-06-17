/**
 * SkySpark API Client for Next.js Integration
 * Successfully tested with SkySpark Development Instance 3.1.10
 * Project: demo, User: patrick
 * Authentication: Session Cookie + Attest-Key (CSRF Protection)
 * Uses SkySpark-specific eval operation for Axon queries
 * Date: June 8, 2025
 */

export interface SkysparkResponse {
  success: boolean;
  data?: string;
  format?: 'zinc' | 'text' | 'json';
  error?: string;
}

export interface AuthenticationResult {
  success: boolean;
  authToken?: string;
  error?: string;
  supportedMechanisms?: string[];
}

export interface SkysparkConfig {
  baseUrl: string;
  project: string;
  sessionCookie?: string;
  attestKey?: string;
  username?: string;
  password?: string;
}

export class SkysparkAPI {
  private config: SkysparkConfig;
  private authToken: string | null = null;

  constructor(config?: Partial<SkysparkConfig>) {
    this.config = {
      baseUrl: process.env.SKYSPARK_BASE_URL || 'http://localhost:8081',
      project: process.env.SKYSPARK_PROJECT || 'demo',
      sessionCookie: process.env.SKYSPARK_SESSION_COOKIE,
      attestKey: process.env.SKYSPARK_ATTEST_KEY,
      username: process.env.SKYSPARK_USERNAME,
      password: process.env.SKYSPARK_PASSWORD,
      ...config
    };
    
    // Session cookie auth doesn't need explicit token setting
    // The cookie will be used directly in headers
  }

  /**
   * Base64URL encode a string (without padding as per RFC4648)
   */
  private base64urlEncode(str: string): string {
    const base64 = Buffer.from(str, 'utf8').toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Parse WWW-Authenticate header to extract supported auth mechanisms
   */
  private parseWWWAuthenticate(header: string): { mechanism: string; params: Record<string, string> }[] {
    const mechanisms: { mechanism: string; params: Record<string, string> }[] = [];
    
    // Simple parser for WWW-Authenticate header
    const parts = header.split(',').map(p => p.trim());
    
    for (const part of parts) {
      const [mechanism, ...paramParts] = part.split(' ');
      const params: Record<string, string> = {};
      
      for (const paramPart of paramParts) {
        const [key, value] = paramPart.split('=');
        if (key && value) {
          params[key.trim()] = value.trim();
        }
      }
      
      mechanisms.push({ mechanism: mechanism.trim(), params });
    }
    
    return mechanisms;
  }

  /**
   * Step 1: Send HELLO handshake to get supported authentication mechanisms
   */
  async hello(): Promise<AuthenticationResult> {
    console.log('👋 Starting HELLO handshake...');
    
    if (!this.config.username) {
      console.error('❌ Username required for HELLO');
      return {
        success: false,
        error: 'Username is required for authentication'
      };
    }

    try {
      const username = this.base64urlEncode(this.config.username);
      console.log('👋 Encoded username:', username);
      
      const url = `${this.config.baseUrl}/api/${this.config.project}/about`;
      console.log('👋 HELLO request to:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `HELLO username=${username}`
        }
      });

      console.log('👋 HELLO response status:', response.status);
      
      if (response.status === 401) {
        const wwwAuth = response.headers.get('www-authenticate');
        console.log('👋 WWW-Authenticate header:', wwwAuth);
        
        if (wwwAuth) {
          const mechanisms = this.parseWWWAuthenticate(wwwAuth);
          console.log('👋 Supported mechanisms:', mechanisms.map(m => m.mechanism));
          return {
            success: true,
            supportedMechanisms: mechanisms.map(m => m.mechanism)
          };
        }
      }

      const responseText = await response.text();
      console.error('❌ Unexpected HELLO response:', response.status, responseText);
      
      return {
        success: false,
        error: `Unexpected response status: ${response.status}`
      };
    } catch (error) {
      console.error('❌ HELLO handshake error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Hello handshake failed'
      };
    }
  }

  /**
   * Step 2: Authenticate using PLAINTEXT mechanism
   */
  async authenticatePlaintext(): Promise<AuthenticationResult> {
    console.log('🔐 Starting PLAINTEXT authentication...');
    
    if (!this.config.username || !this.config.password) {
      console.error('❌ Username and password required for PLAINTEXT');
      return {
        success: false,
        error: 'Username and password are required for PLAINTEXT authentication'
      };
    }

    try {
      const username = this.base64urlEncode(this.config.username);
      const password = this.base64urlEncode(this.config.password);
      console.log('🔐 Encoded credentials - username:', username, 'password length:', password.length);
      
      const url = `${this.config.baseUrl}/api/${this.config.project}/about`;
      console.log('🔐 PLAINTEXT request to:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `PLAINTEXT username=${username}, password=${password}`
        }
      });

      console.log('🔐 PLAINTEXT response status:', response.status);
      
      if (response.status === 200) {
        const authInfo = response.headers.get('authentication-info');
        console.log('🔐 Authentication-Info header:', authInfo);
        
        if (authInfo) {
          // Parse authToken from Authentication-Info header
          const tokenMatch = authInfo.match(/authToken=([^,\s]+)/);
          if (tokenMatch) {
            const authToken = tokenMatch[1];
            this.authToken = authToken;
            console.log('✅ PLAINTEXT auth successful, token obtained:', authToken.substring(0, 10) + '...');
            return {
              success: true,
              authToken
            };
          } else {
            console.error('❌ No authToken found in Authentication-Info header');
          }
        } else {
          console.error('❌ No Authentication-Info header in response');
        }
      }

      const responseText = await response.text();
      console.error('❌ PLAINTEXT failed:', response.status, responseText);
      
      return {
        success: false,
        error: `Authentication failed with status: ${response.status}`
      };
    } catch (error) {
      console.error('❌ PLAINTEXT authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PLAINTEXT authentication failed'
      };
    }
  }

  /**
   * Complete authentication flow: HELLO + PLAINTEXT
   */
  async authenticate(): Promise<AuthenticationResult> {
    // First, try HELLO handshake
    const helloResult = await this.hello();
    if (!helloResult.success) {
      return helloResult;
    }

    // Check if PLAINTEXT is supported
    if (!helloResult.supportedMechanisms?.includes('PLAINTEXT')) {
      return {
        success: false,
        error: `PLAINTEXT not supported. Available: ${helloResult.supportedMechanisms?.join(', ')}`
      };
    }

    // Authenticate with PLAINTEXT
    return await this.authenticatePlaintext();
  }

  /**
   * Check if the current session is valid
   */
  async validateSession(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/${this.config.project}/about`, {
        method: 'GET',
        headers: {
          ...this.getHeaders(),
          'Accept': 'text/zinc,text/plain,*/*'
        }
      });
      return response.ok;
    } catch (error) {
      console.error('Session validation failed:', error);
      return false;
    }
  }

  /**
   * Get request headers with session cookie authentication and CSRF protection
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'text/zinc,application/json,text/plain'
    };

    // Use Cookie header with session cookie
    if (this.config.sessionCookie) {
      headers['Cookie'] = this.config.sessionCookie;
      
      // Include Attest-Key for CSRF protection when using cookie auth
      if (this.config.attestKey) {
        headers['Attest-Key'] = this.config.attestKey;
      }
    }

    return headers;
  }

  /**
   * Execute Axon query using SkySpark eval operation
   */
  async eval(expr: string): Promise<SkysparkResponse> {
    try {
      // Use the SkySpark eval endpoint directly (this is the correct approach)
      return await this.evalDirect(expr);
    } catch (error) {
      console.error('Query execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Direct eval for SkySpark eval endpoint (per SkySpark documentation)
   */
  private async evalDirect(expr: string): Promise<SkysparkResponse> {
    try {
      // Format exactly as shown in SkySpark documentation (MUST have quotes around expression)
      const zincGrid = `ver:"3.0"\nexpr\n"${expr.replace(/"/g, '\\"')}"`;
      
      const response = await fetch(`${this.config.baseUrl}/api/${this.config.project}/eval`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'text/zinc; charset=utf-8'
        },
        body: zincGrid
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      const data = await response.text();
      
      return {
        success: true,
        data: data,
        format: contentType?.includes('zinc') ? 'zinc' : 'text'
      };
    } catch (error) {
      console.error('SkySpark eval request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Parse simple Zinc responses (basic implementation)
   */
  parseZincResponse(zincData: string) {
    // Basic Zinc parsing - can be enhanced later
    return {
      raw: zincData,
      lines: zincData.split('\n').filter(line => line.trim()),
      header: zincData.split('\n')[0],
      data: zincData.split('\n').slice(1).filter(line => line.trim())
    };
  }

  /**
   * Read entities/points using Haystack HTTP API read operation
   */
  async read(filter: string, limit?: number): Promise<SkysparkResponse> {
    try {
      // Create proper Haystack grid for read operation
      let zincGrid = `ver:"3.0"\n`;
      
      if (limit) {
        zincGrid += `filter,limit\n"${filter.replace(/"/g, '\\"')}",${limit}`;
      } else {
        zincGrid += `filter\n"${filter.replace(/"/g, '\\"')}"`;
      }
      
      const response = await fetch(`${this.config.baseUrl}/api/${this.config.project}/read`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'text/zinc; charset=utf-8'
        },
        body: zincGrid
      });

      if (!response.ok) {
        // Try JSON format as fallback
        const jsonGrid: any = {
          "_kind": "grid",
          "meta": {"ver": "3.0"},
          "cols": [{"name": "filter"}],
          "rows": [{"filter": filter}]
        };
        
        if (limit) {
          jsonGrid.cols.push({"name": "limit"});
          jsonGrid.rows[0].limit = limit;
        }
        
        const jsonResponse = await fetch(`${this.config.baseUrl}/api/${this.config.project}/read`, {
          method: 'POST',
          headers: {
            ...this.getHeaders(),
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: JSON.stringify(jsonGrid)
        });
        
        if (!jsonResponse.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const contentType = jsonResponse.headers.get('content-type');
        const data = await jsonResponse.text();
        
        return {
          success: true,
          data: data,
          format: contentType?.includes('zinc') ? 'zinc' : 'json'
        };
      }

      const contentType = response.headers.get('content-type');
      const data = await response.text();
      
      return {
        success: true,
        data: data,
        format: contentType?.includes('zinc') ? 'zinc' : 'text'
      };
    } catch (error) {
      console.error('Read request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Read historical data using Haystack HTTP API hisRead operation
   */
  async hisRead(pointRef: string, range: string): Promise<SkysparkResponse> {
    try {
      // Create proper Haystack grid for hisRead operation
      const zincGrid = `ver:"3.0"\nid,range\n${pointRef},"${range.replace(/"/g, '\\"')}"`;
      
      const response = await fetch(`${this.config.baseUrl}/api/${this.config.project}/hisRead`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'text/zinc; charset=utf-8'
        },
        body: zincGrid
      });

      if (!response.ok) {
        // Try JSON format as fallback
        const jsonGrid = {
          "_kind": "grid",
          "meta": {"ver": "3.0"},
          "cols": [{"name": "id"}, {"name": "range"}],
          "rows": [{"id": pointRef, "range": range}]
        };
        
        const jsonResponse = await fetch(`${this.config.baseUrl}/api/${this.config.project}/hisRead`, {
          method: 'POST',
          headers: {
            ...this.getHeaders(),
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: JSON.stringify(jsonGrid)
        });
        
        if (!jsonResponse.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const contentType = jsonResponse.headers.get('content-type');
        const data = await jsonResponse.text();
        
        return {
          success: true,
          data: data,
          format: contentType?.includes('zinc') ? 'zinc' : 'json'
        };
      }

      const contentType = response.headers.get('content-type');
      const data = await response.text();
      
      return {
        success: true,
        data: data,
        format: contentType?.includes('zinc') ? 'zinc' : 'text'
      };
    } catch (error) {
      console.error('HisRead request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all sites using SkySpark eval
   */
  async getSites(): Promise<SkysparkResponse> {
    return await this.eval('readAll(site)');
  }

  /**
   * Get all equipment for a site using SkySpark eval
   */
  async getEquipment(siteRef: string): Promise<SkysparkResponse> {
    return await this.eval(`readAll(equip and siteRef==${siteRef})`);
  }

  /**
   * Get all points for equipment using SkySpark eval
   */
  async getPoints(equipRef: string): Promise<SkysparkResponse> {
    return await this.eval(`readAll(point and equipRef==${equipRef})`);
  }

  /**
   * Get project information
   */
  async getAbout(): Promise<SkysparkResponse> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/${this.config.project}/about`, {
        method: 'GET',
        headers: {
          ...this.getHeaders(),
          'Accept': 'text/zinc,text/plain,*/*'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.text();
      return {
        success: true,
        data: data,
        format: 'zinc'
      };
    } catch (error) {
      console.error('About request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test connection with detailed diagnostics
   */
  async testConnection(): Promise<{
    connected: boolean;
    projectInfo?: any;
    error?: string;
    diagnostics: Record<string, any>;
  }> {
    const diagnostics: Record<string, any> = {
      timestamp: new Date().toISOString(),
      config: {
        baseUrl: this.config.baseUrl,
        project: this.config.project,
        hasSessionCookie: !!this.config.sessionCookie,
        hasAttestKey: !!this.config.attestKey,
        hasCredentials: !!(this.config.username && this.config.password)
      }
    };

    try {
      // Test session validation
      const sessionValid = await this.validateSession();
      diagnostics.sessionValid = sessionValid;

      if (!sessionValid) {
        return {
          connected: false,
          error: 'Session validation failed',
          diagnostics
        };
      }

      // Get project info
      const aboutResult = await this.getAbout();
      diagnostics.aboutRequest = {
        success: aboutResult.success,
        format: aboutResult.format,
        hasData: !!aboutResult.data
      };

      if (!aboutResult.success) {
        return {
          connected: false,
          error: aboutResult.error,
          diagnostics
        };
      }

      return {
        connected: true,
        projectInfo: aboutResult.data,
        diagnostics
      };

    } catch (error) {
      diagnostics.error = error instanceof Error ? error.message : 'Unknown error';
      return {
        connected: false,
        error: diagnostics.error,
        diagnostics
      };
    }
  }
}

// Export singleton instance for easy use
export const skysparkApi = new SkysparkAPI();
