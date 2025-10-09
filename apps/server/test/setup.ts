import { spawn, ChildProcess } from 'child_process';

let serverProcess: ChildProcess | null = null;

const waitForServer = async (url: string, maxAttempts = 30, interval = 1000): Promise<void> => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log('✅ Server is ready');
        return;
      }
    } catch (error) {
      // Server not ready yet, continue waiting
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error(`Server did not start within ${maxAttempts * interval}ms`);
};

export async function setup() {
  console.log('🚀 Starting test server...');
  
  // Start the server process
  serverProcess = spawn('tsx', ['src/index.ts'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: {
      ...process.env,
      SERVER_PORT: '4000',
      NODE_ENV: 'test'
    }
  });

  // Wait for the server to be ready
  await waitForServer('http://localhost:4000/health');
  
  console.log('✅ Test server started successfully');
}

export async function teardown() {
  console.log('🛑 Stopping test server...');
  
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    
    // Wait for graceful shutdown
    await new Promise<void>((resolve) => {
      serverProcess!.on('exit', () => {
        console.log('✅ Test server stopped');
        resolve();
      });
      
      // Force kill after 5 seconds if not gracefully shut down
      setTimeout(() => {
        if (serverProcess && !serverProcess.killed) {
          serverProcess.kill('SIGKILL');
          resolve();
        }
      }, 5000);
    });
  }
}

