const { spawn } = require('child_process')
const path = require('path')
const platform = require('os').platform();

const bin = './ngrok' + (platform === 'win32' ? '.exe' : '')
const ready = /starting web service.*addr=(\d+\.\d+\.\d+\.\d+:\d+)/
const inUse = /address already in use/
const binDir = path.join(__dirname, '/bin');

let processPromise, activeProcess;

/*
  ngrok process runs internal ngrok api
  and should be spawned only ONCE 
  (respawn allowed if it fails or .kill method called)
*/

async function startProcessSafe(opts) {
  if (processPromise) return processPromise; 
  try {
    processPromise = startProcess(opts);
    return await processPromise;
  }
  catch(ex) {
    processPromise = null;
    throw ex;
  }
}

async function startProcess (opts) {
  const start = ['start', '--none', '--log=stdout']
  if (opts.region) start.push('--region=' + opts.region);
  if (opts.configPath) start.push('--config=' + opts.configPath);

  const ngrok = spawn(bin, start, {cwd: binDir})
  
  let resolve, reject;
  const apiUrl = new Promise((res, rej) => {   
    resolve = res;
    reject = rej;
  });

  ngrok.stdout.on('data', data => {
    const msg = data.toString();
    const addr = msg.match(ready)
    if (addr) {
      resolve(`http://${addr[1]}`);
    } else if (msg.match(inUse)) {
      reject(new Error(msg.substring(0, 10000)));
    }
  });  

  ngrok.stderr.on('data', data => {
    const msg = data.toString().substring(0, 10000);
    reject(new Error(msg));
  })

  process.on('exit', async () => await killProcess());

  try {
    const url = await apiUrl;
    activeProcess = ngrok;
    return url;      
  }
  catch(ex) {
    ngrok.kill();
    throw ex;
  }
  finally {
    ngrok.stdout.removeAllListeners('data');
    ngrok.stderr.removeAllListeners('data');
  }
}

function killProcess ()  {
  if (!activeProcess) return;
  return new Promise(resolve => {
    activeProcess.on('exit', () => {
      processPromise = null;
      activeProcess = null;
      resolve();
    });
    activeProcess.kill();
  });
}

async function setAuthtoken (token, configPath) {
  const authtoken = ['authtoken', token]
  if (configPath) authtoken.push('--config=' + configPath);

  const ngrok = spawn(bin, authtoken, {cwd: binDir});

  const killed = new Promise((resolve, reject) => {
    ngrok.stdout.once('data', () => resolve());
    ngrok.stderr.once('data', () => reject(new Error('cant set authtoken')));
  });

  try {
    return await killed;
  }
  finally {
    ngrok.kill();
  }
}

module.exports = {
  startProcess: startProcessSafe,
  killProcess,
  setAuthtoken
};