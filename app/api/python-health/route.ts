import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';

// Server-side Python health check
async function checkPythonServiceHealth(): Promise<{ isHealthy: boolean; details: string; duration: number }> {
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    try {
      // Try to use virtual environment Python first, fall back to system Python
      const venvPython = join(process.cwd(), 'venv', 'bin', 'python');
      const pythonCmd = existsSync(venvPython) ? venvPython : 'python3';
      
      const healthCheck = spawn(pythonCmd, ['-c', 'import kmodes, numpy, sklearn; print("healthy")'], {
        timeout: 10000 // 10 second timeout
      });
      
      let output = '';
      let errorOutput = '';
      
      healthCheck.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });
      
      healthCheck.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });
      
      healthCheck.on('close', (code: number) => {
        const duration = Date.now() - startTime;
        const isHealthy = code === 0 && output.trim() === 'healthy';
        
        let details = '';
        if (isHealthy) {
          details = `Python service is healthy. Required packages (kmodes, numpy, sklearn) are available.`;
        } else {
          details = `Python service unhealthy. Exit code: ${code}. Error: ${errorOutput || 'Unknown error'}`;
        }
        
        console.log(`🏥 Python service health check: ${isHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY'} (${duration}ms)`);
        
        resolve({ isHealthy, details, duration });
      });
      
      healthCheck.on('error', (error) => {
        const duration = Date.now() - startTime;
        const details = `Failed to spawn Python process: ${error.message}`;
        console.log('🏥 Python service health check: ❌ UNHEALTHY (spawn error)');
        resolve({ isHealthy: false, details, duration });
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const details = `Health check exception: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.log('🏥 Python service health check: ❌ UNHEALTHY (exception)');
      resolve({ isHealthy: false, details, duration });
    }
  });
}

// Diagnostic function to check Python environment setup
async function runPythonDiagnostics(): Promise<any> {
  const diagnostics = {
    venvExists: false,
    venvPythonExists: false,
    systemPythonExists: false,
    pythonVersion: null as string | null,
    packagesInstalled: false,
    setupInstructions: [] as string[],
    errors: [] as string[]
  };

  // Check if virtual environment exists
  const venvPath = join(process.cwd(), 'venv');
  const venvPythonPath = join(venvPath, 'bin', 'python');
  
  diagnostics.venvExists = existsSync(venvPath);
  diagnostics.venvPythonExists = existsSync(venvPythonPath);

  // Check system Python
  try {
    const pythonCheck = await new Promise<{ version: string; exists: boolean }>((resolve) => {
      const python = spawn('python3', ['--version'], { timeout: 5000 });
      let output = '';
      
      python.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      python.on('close', (code) => {
        if (code === 0) {
          resolve({ version: output.trim(), exists: true });
        } else {
          resolve({ version: '', exists: false });
        }
      });
      
      python.on('error', () => {
        resolve({ version: '', exists: false });
      });
    });
    
    diagnostics.systemPythonExists = pythonCheck.exists;
    diagnostics.pythonVersion = pythonCheck.version;
  } catch (error) {
    diagnostics.errors.push(`Failed to check Python version: ${error}`);
  }

  // Generate setup instructions
  if (!diagnostics.systemPythonExists) {
    diagnostics.setupInstructions.push('❌ Install Python 3.8+ from https://python.org');
  }
  
  if (!diagnostics.venvExists) {
    diagnostics.setupInstructions.push('🔧 Run: chmod +x scripts/setup_python.sh && ./scripts/setup_python.sh');
  } else if (!diagnostics.venvPythonExists) {
    diagnostics.setupInstructions.push('🔧 Virtual environment is broken. Run: rm -rf venv && ./scripts/setup_python.sh');
  }

  return diagnostics;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'diagnostics') {
    try {
      const diagnostics = await runPythonDiagnostics();
      return NextResponse.json({ 
        success: true, 
        data: diagnostics
      });
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to run diagnostics',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  }

  // Default health check
  try {
    const healthResult = await checkPythonServiceHealth();
    return NextResponse.json({ 
      success: true, 
      data: {
        isHealthy: healthResult.isHealthy,
        details: healthResult.details,
        duration: healthResult.duration,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to check Python service health:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to perform health check',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const healthResult = await checkPythonServiceHealth();
    return NextResponse.json({ 
      success: true, 
      data: {
        isHealthy: healthResult.isHealthy,
        details: healthResult.details,
        duration: healthResult.duration,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to check Python service health:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to perform health check',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 