// Skyspark API Integration for Next.js
// Server running on localhost:8081

// 1. Environment Configuration (.env.local)
/*
SKYSPARK_BASE_URL=http://localhost:8081
SKYSPARK_PROJECT=demo
SKYSPARK_SESSION_COOKIE=skyarc-auth-8081=web-WSOaLAC5GNIX7BxMAbRr1NemKBU-GztkxkZFpBNd3hw-1
*/

// 2. Skyspark API Client
class SkysparkAPI {
  constructor() {
    this.baseUrl = process.env.SKYSPARK_BASE_URL || 'http://localhost:8081';
    this.project = process.env.SKYSPARK_PROJECT || 'demo';
    this.sessionCookie = process.env.SKYSPARK_SESSION_COOKIE;
  }

  // Check if session is valid
  async validateSession() {
    try {
      const response = await fetch(`${this.baseUrl}/api/${this.project}/about`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      return response.ok;
    } catch (error) {
      console.error('Session validation failed:', error);
      return false;
    }
  }

  // Get request headers with session cookie
  getHeaders() {
    const headers = {
      'Accept': 'text/zinc,application/json,text/plain',
      'Content-Type': 'text/plain' // For eval endpoints
    };

    if (this.sessionCookie) {
      headers['Cookie'] = this.sessionCookie;
    }

    return headers;
  }

  // Execute Axon query - handles Zinc format responses
  async eval(expr) {
    try {
      const response = await fetch(`${this.baseUrl}/api/${this.project}/eval`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: expr
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // SkySpark returns Zinc format by default
      const contentType = response.headers.get('content-type');
      const data = await response.text();
      
      // Return raw Zinc data for now - can add parsing later
      return {
        success: true,
        data: data,
        format: contentType?.includes('zinc') ? 'zinc' : 'text'
      };
    } catch (error) {
      console.error('Eval request failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Parse simple Zinc responses (basic implementation)
  parseZincResponse(zincData) {
    // For now, return raw data - you can implement Zinc parsing as needed
    // This is a placeholder for proper Zinc parsing
    return {
      raw: zincData,
      parsed: zincData.split('\n').filter(line => line.trim())
    };
  }

  // Read entities/points
  async read(filter, limit = null) {
    let expr = `read(${filter})`;
    if (limit) {
      expr += `.limit(${limit})`;
    }
    return await this.eval(expr);
  }

  // Read history data
  async hisRead(pointRef, range) {
    const expr = `hisRead(${pointRef}, ${range})`;
    return await this.eval(expr);
  }

  // Get all sites
  async getSites() {
    return await this.read('site');
  }

  // Get all equipment for a site
  async getEquipment(siteRef) {
    return await this.read(`equip and siteRef==${siteRef}`);
  }

  // Get all points for equipment
  async getPoints(equipRef) {
    return await this.read(`point and equipRef==${equipRef}`);
  }

  // Get project information
  async getAbout() {
    try {
      const response = await fetch(`${this.baseUrl}/api/${this.project}/about`, {
        method: 'GET',
        headers: this.getHeaders()
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
        error: error.message
      };
    }
  }
}

// 3. Next.js API Routes

// 3. Next.js API Routes

// /api/skyspark/test.js - Test connection
export async function GET(request) {
  try {
    const skyspark = new SkysparkAPI();
    const isValid = await skyspark.validateSession();
    
    if (isValid) {
      const aboutInfo = await skyspark.getAbout();
      return Response.json({ success: true, data: aboutInfo });
    } else {
      return Response.json({ 
        success: false, 
        message: 'Session invalid - please update SKYSPARK_SESSION_COOKIE' 
      }, { status: 401 });
    }
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// /api/skyspark/sites.js
export async function GET(request) {
  try {
    const skyspark = new SkysparkAPI();
    const sites = await skyspark.getSites();
    return Response.json(sites);
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// /api/skyspark/equipment/[siteId].js
export async function GET(request, { params }) {
  try {
    const { siteId } = params;
    const skyspark = new SkysparkAPI();
    
    const equipment = await skyspark.getEquipment(`@${siteId}`);
    return Response.json(equipment);
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// /api/skyspark/points/[equipId].js
export async function GET(request, { params }) {
  try {
    const { equipId } = params;
    const skyspark = new SkysparkAPI();
    
    const points = await skyspark.getPoints(`@${equipId}`);
    return Response.json(points);
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// /api/skyspark/eval.js - Direct Axon query endpoint
export async function POST(request) {
  try {
    const { expr } = await request.json();
    const skyspark = new SkysparkAPI();
    
    const result = await skyspark.eval(expr);
    return Response.json(result);
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// /api/skyspark/history.js
export async function POST(request) {
  try {
    const { pointRef, range } = await request.json();
    const skyspark = new SkysparkAPI();
    await skyspark.authenticate();
    
    const history = await skyspark.hisRead(`@${pointRef}`, range);
    return Response.json({ success: true, data: history });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 4. React Hook for Skyspark Integration
import { useState, useEffect } from 'react';

export function useSkyspark() {
  const [sites, setSites] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('unknown');

  // Test connection
  const testConnection = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/skyspark/test');
      const result = await response.json();
      
      if (result.success) {
        setConnectionStatus('connected');
        return true;
      } else {
        setConnectionStatus('disconnected');
        setError(result.message || 'Connection failed');
        return false;
      }
    } catch (err) {
      setConnectionStatus('error');
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Execute direct Axon query
  const executeQuery = async (expr) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/skyspark/eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expr })
      });
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        setError(result.error);
        return null;
      }
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Fetch sites using direct query
  const fetchSites = async () => {
    const result = await executeQuery('read(site)');
    if (result) {
      // Parse Zinc response or use raw data
      setSites(result.parsed || [result.raw]);
    }
  };

  // Fetch equipment for a site
  const fetchEquipment = async (siteId) => {
    const result = await executeQuery(`read(equip and siteRef==@${siteId})`);
    if (result) {
      setEquipment(result.parsed || [result.raw]);
    }
  };

  // Fetch points for equipment  
  const fetchPoints = async (equipId) => {
    const result = await executeQuery(`read(point and equipRef==@${equipId})`);
    if (result) {
      setPoints(result.parsed || [result.raw]);
    }
  };

  return {
    sites,
    equipment, 
    points,
    loading,
    error,
    connectionStatus,
    testConnection,
    executeQuery,
    fetchSites,
    fetchEquipment,
    fetchPoints
  };
}

// 5. Example React Component
function SkysparkDashboard() {
  const { 
    sites, 
    equipment, 
    points, 
    loading, 
    error, 
    connectionStatus,
    testConnection,
    executeQuery,
    fetchSites, 
    fetchEquipment, 
    fetchPoints 
  } = useSkyspark();

  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedEquip, setSelectedEquip] = useState(null);
  const [queryResult, setQueryResult] = useState('');

  useEffect(() => {
    testConnection();
  }, []);

  const handleSiteSelect = (site) => {
    setSelectedSite(site);
    // Extract site ID from Zinc data (basic parsing)
    fetchEquipment('demo_site_1'); // You'll need to parse actual IDs from Zinc
  };

  const handleEquipSelect = (equip) => {
    setSelectedEquip(equip);
    fetchPoints('demo_equip_1'); // You'll need to parse actual IDs from Zinc
  };

  const handleCustomQuery = async () => {
    const customExpr = document.getElementById('customQuery').value;
    const result = await executeQuery(customExpr);
    setQueryResult(result ? result.raw : 'No data');
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Skyspark Dashboard</h1>
      
      {/* Connection Status */}
      <div className="mb-6 p-4 rounded border">
        <h2 className="text-lg font-semibold mb-2">Connection Status</h2>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' : 
            connectionStatus === 'disconnected' ? 'bg-red-500' : 'bg-gray-500'
          }`}></div>
          <span className="capitalize">{connectionStatus}</span>
          <button 
            onClick={testConnection}
            className="ml-4 px-3 py-1 bg-blue-500 text-white rounded text-sm"
          >
            Test Connection
          </button>
        </div>
        {error && <div className="text-red-600 text-sm mt-2">Error: {error}</div>}
      </div>

      {/* Custom Query Section */}
      <div className="mb-6 p-4 rounded border">
        <h2 className="text-lg font-semibold mb-2">Custom Query</h2>
        <div className="flex gap-2 mb-2">
          <input
            id="customQuery"
            type="text"
            placeholder="Enter Axon query (e.g., read(site))"
            defaultValue="read(site)"
            className="flex-1 p-2 border rounded"
          />
          <button 
            onClick={handleCustomQuery}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            Execute
          </button>
        </div>
        {queryResult && (
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-40">
            {queryResult}
          </pre>
        )}
      </div>

      {/* Quick Test Buttons */}
      <div className="mb-6 flex gap-2">
        <button 
          onClick={() => executeQuery('read(site)').then(r => setQueryResult(r?.raw || 'No data'))}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Get Sites
        </button>
        <button 
          onClick={() => executeQuery('read(equip)').then(r => setQueryResult(r?.raw || 'No data'))}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Get Equipment
        </button>
        <button 
          onClick={() => executeQuery('read(point)').then(r => setQueryResult(r?.raw || 'No data'))}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Get Points
        </button>
      </div>

      {/* Data Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Sites Data</h2>
          <div className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-60">
            {sites.length > 0 ? sites.map((site, idx) => (
              <div key={idx} className="border-b border-gray-300 pb-2 mb-2">
                {typeof site === 'string' ? site : JSON.stringify(site, null, 2)}
              </div>
            )) : 'No sites data - try running a query'}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Equipment Data</h2>
          <div className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-60">
            {equipment.length > 0 ? equipment.map((equip, idx) => (
              <div key={idx} className="border-b border-gray-300 pb-2 mb-2">
                {typeof equip === 'string' ? equip : JSON.stringify(equip, null, 2)}
              </div>
            )) : 'No equipment data - try running a query'}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Points Data</h2>
          <div className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-60">
            {points.length > 0 ? points.map((point, idx) => (
              <div key={idx} className="border-b border-gray-300 pb-2 mb-2">
                {typeof point === 'string' ? point : JSON.stringify(point, null, 2)}
              </div>
            )) : 'No points data - try running a query'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SkysparkDashboard;