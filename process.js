const { spawn } = require('child_process')
const path = require('path')
const platform = require('os').platform();

const bin = './ngrok' + (platform === 'win32' ? '.exe' : '')
const ready = /starting web service.*addr=(\d+\.\d+\.\d+\.\d+:\d+)/
const inUse = /address already in use/
const binDir = path.join(__dirname, '/bin');

let runningProcess;

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
    const msg = data.toString()
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
    runningProcess = ngrok;
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
};

function killProcess ()  {
  if (!runningProcess) return;
  return new Promise(resolve => {
    runningProcess.on('exit', () => {
      runningProcess = null;
      resolve();
    });
    runningProcess.kill();
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

// todo 
const singleton = factory => {
  let promise;
  return (...args) => {
    if (promise) return promise;  
    promise = factory(args);
    promise.catch(ex => promise = null);
    return promise;
  };
};

module.exports = {
  startProcess: singleton(startProcess),
  killProcess,
  setAuthtoken
};