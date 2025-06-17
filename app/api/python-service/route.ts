import { NextRequest, NextResponse } from 'next/server';
import { 
  getPythonServiceMetrics, 
  forcePythonHealthCheck, 
  resetPythonServiceMetrics,
  updatePythonServiceConfig,
  getPythonServiceConfig
} from '../../../lib/bacnet-processor';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'health':
        const isHealthy = await forcePythonHealthCheck();
        return NextResponse.json({
          success: true,
          healthy: isHealthy,
          timestamp: new Date().toISOString()
        });

      case 'metrics':
        const metrics = getPythonServiceMetrics();
        return NextResponse.json({
          success: true,
          metrics,
          timestamp: new Date().toISOString()
        });

      case 'config':
        const config = getPythonServiceConfig();
        return NextResponse.json({
          success: true,
          config,
          timestamp: new Date().toISOString()
        });

      default:
        // Default: return both health and metrics
        const [healthStatus, serviceMetrics] = await Promise.all([
          forcePythonHealthCheck(),
          Promise.resolve(getPythonServiceMetrics())
        ]);

        return NextResponse.json({
          success: true,
          health: {
            healthy: healthStatus,
            lastCheck: serviceMetrics.lastHealthCheck
          },
          metrics: serviceMetrics,
          config: getPythonServiceConfig(),
          timestamp: new Date().toISOString()
        });
    }
  } catch (error) {
    console.error('Python service API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const body = await request.json();

    switch (action) {
      case 'reset-metrics':
        resetPythonServiceMetrics();
        return NextResponse.json({
          success: true,
          message: 'Metrics reset successfully',
          timestamp: new Date().toISOString()
        });

      case 'update-config':
        if (!body.config) {
          return NextResponse.json({
            success: false,
            error: 'Missing config in request body'
          }, { status: 400 });
        }

        const updatedConfig = updatePythonServiceConfig(body.config);
        return NextResponse.json({
          success: true,
          config: updatedConfig,
          message: 'Configuration updated successfully',
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: reset-metrics, update-config'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Python service API POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 