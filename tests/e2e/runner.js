const http = require('http');
const net = require('net');
const { spawn } = require('child_process');
const path = require('path');

const { suite } = require('./test-suite');

const isMockTarget = process.argv.includes('--mock-target');
const MOCK_SERVER_PORT = 4000;
const TARGET_PORT_CLINIC = 3000;
const TARGET_PORT_SUPERADMIN = 3002;

let mockServerProcess = null;
let mockTargetProcess = null;
let clinicProcess = null;
let superAdminProcess = null;

// Helper to check if a port is open
function checkPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const onError = () => {
      socket.destroy();
      resolve(false);
    };
    socket.setTimeout(150);
    socket.once('error', onError);
    socket.once('timeout', onError);
    socket.connect(port, '127.0.0.1', () => {
      socket.end();
      resolve(true);
    });
  });
}

// Helper to wait for a port to be open
function waitPort(port, timeoutMs = 5000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = async () => {
      if (await checkPort(port)) {
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timeout waiting for port ${port}`));
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
}

// Helper to make HTTP requests
function httpRequest(urlStr, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (body) {
      if (typeof body === 'object') {
        body = JSON.stringify(body);
        if (!reqOptions.headers['Content-Type'] && !reqOptions.headers['content-type']) {
          reqOptions.headers['Content-Type'] = 'application/json';
        }
      }
      reqOptions.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(reqOptions, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const rawBody = Buffer.concat(data);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: rawBody.toString(),
          rawBody: rawBody
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function getTargetUrl(requestPath) {
  if (isMockTarget) {
    // In mock-target mode, everything runs on port 3000
    return `http://localhost:${TARGET_PORT_CLINIC}${requestPath}`;
  } else {
    // Real mode
    if (requestPath.startsWith('/api/settings')) {
      return `http://localhost:${TARGET_PORT_SUPERADMIN}${requestPath}`;
    } else {
      return `http://localhost:${TARGET_PORT_CLINIC}${requestPath}`;
    }
  }
}

async function startServers() {
  console.log('Starting E2E Mock Server on port 4000...');
  
  // Start mock-server.js
  mockServerProcess = spawn('node', [path.join(__dirname, 'mock-server.js')], {
    stdio: 'ignore',
    detached: false
  });
  
  await waitPort(MOCK_SERVER_PORT);
  console.log('Mock Server is online.');

  if (isMockTarget) {
    console.log('Mock Target mode enabled. Starting Dummy Target Server on port 3000...');
    
    // We require and start the targetServer directly in-process
    const { targetServer } = require('./mock-target');
    await new Promise((resolve) => {
      targetServer.listen(TARGET_PORT_CLINIC, '127.0.0.1', () => {
        resolve();
      });
    });
    
    await waitPort(TARGET_PORT_CLINIC);
    console.log('Dummy Target Server is online.');
  } else {
    console.log('Verifying if Next.js application servers are online...');
    let clinicOnline = await checkPort(TARGET_PORT_CLINIC);
    let superAdminOnline = await checkPort(TARGET_PORT_SUPERADMIN);
    
    if (!clinicOnline) {
      console.log(`Clinic Dashboard is not running. Starting it in the background on port ${TARGET_PORT_CLINIC}...`);
      clinicProcess = spawn('npx', ['next', 'dev', '-p', TARGET_PORT_CLINIC.toString()], {
        cwd: path.join(__dirname, '../../clinic-dashboard'),
        env: {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:4000/supabase',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: 'mock-anon-key'
        },
        shell: true
      });
      
      console.log(`Waiting for Clinic Dashboard to bind to port ${TARGET_PORT_CLINIC}...`);
      await waitPort(TARGET_PORT_CLINIC, 45000);
      clinicOnline = true;
    }
    
    if (!superAdminOnline) {
      console.log(`Super Admin Web is not running. Starting it in the background on port ${TARGET_PORT_SUPERADMIN}...`);
      superAdminProcess = spawn('npx', ['next', 'dev', '-p', TARGET_PORT_SUPERADMIN.toString()], {
        cwd: path.join(__dirname, '../../super_admin_web'),
        env: {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:4000/supabase',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: 'mock-anon-key',
          SUPABASE_SERVICE_ROLE_KEY: 'mock-service-role-key',
          WHATSAPP_PHONE_NUMBER_ID: 'mock-waba-id'
        },
        shell: true
      });
      
      console.log(`Waiting for Super Admin Web to bind to port ${TARGET_PORT_SUPERADMIN}...`);
      await waitPort(TARGET_PORT_SUPERADMIN, 45000);
      superAdminOnline = true;
    }
    
    if (!clinicOnline || !superAdminOnline) {
      console.error('Make sure both applications are running before launching the E2E tests, or use --mock-target');
      process.exit(1);
    }
    console.log('Both Next.js dashboards are online.');
  }
}

function cleanup() {
  console.log('Cleaning up servers...');
  if (mockServerProcess) {
    mockServerProcess.kill();
  }
  if (clinicProcess) {
    console.log('Stopping clinic-dashboard...');
    if (process.platform === 'win32') {
      try {
        require('child_process').execSync(`taskkill /pid ${clinicProcess.pid} /t /f`, { stdio: 'ignore' });
      } catch (e) {}
    } else {
      clinicProcess.kill();
    }
  }
  if (superAdminProcess) {
    console.log('Stopping super_admin_web...');
    if (process.platform === 'win32') {
      try {
        require('child_process').execSync(`taskkill /pid ${superAdminProcess.pid} /t /f`, { stdio: 'ignore' });
      } catch (e) {}
    } else {
      superAdminProcess.kill();
    }
  }
  if (isMockTarget) {
    const { targetServer } = require('./mock-target');
    targetServer.close();
  }
  console.log('Cleanup finished.');
}

async function runAllTests() {
  let passedCount = 0;
  let failedCount = 0;
  
  const results = [];

  console.log(`\nExecuting E2E Test Suite (${suite.length} Test Cases Total)\n`);

  for (const test of suite) {
    // Reset mock server state before each test
    await httpRequest(`http://localhost:${MOCK_SERVER_PORT}/mock-inspect/state/reset`, { method: 'POST' });

    const requestFn = (path, options, body) => httpRequest(getTargetUrl(path), options, body);
    const setMockStateFn = (state) => httpRequest(`http://localhost:${MOCK_SERVER_PORT}/mock-inspect/state/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, state);
    const getCapturedFn = async () => {
      const res = await httpRequest(`http://localhost:${MOCK_SERVER_PORT}/mock-inspect/requests`, { method: 'GET' });
      return JSON.parse(res.body);
    };

    let pass = false;
    let errorMsg = '';
    
    try {
      await test.run(requestFn, setMockStateFn, getCapturedFn);
      pass = true;
      passedCount++;
    } catch (err) {
      pass = false;
      failedCount++;
      errorMsg = err.stack || err.message;
    }

    results.push({
      id: test.id,
      name: test.name,
      feature: test.feature,
      tier: test.tier,
      pass,
      errorMsg
    });

    const statusStr = pass ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
    console.log(`[Tier ${test.tier}] [${test.id}] ${test.name}: ${statusStr}`);
    if (!pass) {
      console.log(`   \x1b[33mError:\x1b[0m ${errorMsg.split('\n')[0]}`);
    }
  }

  console.log('\n======================================');
  console.log('TEST RUN RESULTS SUMMARY');
  console.log('======================================');
  console.log(`Total Run:  ${suite.length}`);
  console.log(`Passed:     \x1b[32m${passedCount}\x1b[0m`);
  console.log(`Failed:     \x1b[31m${failedCount}\x1b[0m`);
  console.log('======================================\n');

  if (failedCount > 0) {
    console.error('Some E2E tests failed.');
    return false;
  }
  console.log('All E2E tests passed successfully!');
  return true;
}

async function main() {
  try {
    await startServers();
    const success = await runAllTests();
    cleanup();
    process.exit(success ? 0 : 1);
  } catch (err) {
    console.error('Error executing E2E Runner:', err);
    cleanup();
    process.exit(1);
  }
}

// Handle termination signals
process.on('SIGINT', () => {
  cleanup();
  process.exit(1);
});
process.on('SIGTERM', () => {
  cleanup();
  process.exit(1);
});

main();
