const request = require('request-promise-native')
const { spawn } = require('child_process')
const { EventEmitter } = require('events')
const platform = require('os').platform()
const uuid = require('uuid')
const url = require('url')
const path = require('path')

const bin = './ngrok' + (platform === 'win32' ? '.exe' : '')
const ready = /starting web service.*addr=(\d+\.\d+\.\d+\.\d+:\d+)/
const inUse = /address already in use/
const binDir = path.join(__dirname, '/bin')

const MAX_RETRY = 100

class NGrok extends EventEmitter {
  constructor () {
    super()
    this.tunnels = {}
  }

  async connect (opts) {
    opts = this.defaults(opts)
    this.validate(opts)

    if (opts.authtoken) {
      await this.authtoken(opts.authtoken, opts.configPath)
    }

    if (!this.api) {
      await this.runNgrok(opts)
    }
    return this.runTunnel(opts)
  }

  defaults (opts) {
    opts = opts || {proto: 'http', addr: 80}

    if (typeof opts === 'function') {
      opts = {proto: 'http', addr: 80}
    }

    if (typeof opts !== 'object') {
      opts = {proto: 'http', addr: opts}
    }

    if (!opts.proto) {
      opts.proto = 'http'
    }

    if (!opts.addr) {
      opts.addr = opts.port || opts.host || 80
    }

    if (opts.httpauth) {
      opts.auth = opts.httpauth
    }

    return opts
  }

  validate (opts) {
    if (opts.web_addr === false || opts.web_addr === 'false') {
      throw new Error('web_addr:false is not supported, module depends on internal ngrok api')
    }
  }

  async runNgrok (opts) {
    const start = ['start', '--none', '--log=stdout']

    if (opts.region) {
      start.push('--region=' + opts.region)
    }

    if (opts.configPath) {
      start.push('--config=' + opts.configPath)
    }

    this.ngrok = spawn(bin, start, {cwd: binDir})

    let resolvePromise, rejectPromise
    const promise = new Promise((resolve, reject) => {
      resolvePromise = resolve
      rejectPromise = reject
    })

    this.ngrok.stdout.on('data', (data) => {
      const msg = data.toString()
      const addr = msg.match(ready)
      if (addr) {
        this.api = request.defaults({baseUrl: 'http://' + addr[1]})
        resolvePromise()
      } else if (msg.match(inUse)) {
        rejectPromise(new Error(msg.substring(0, 10000)))
      }
    })

    this.ngrok.stderr.on('data', (data) => {
      const info = data.toString().substring(0, 10000)
      rejectPromise(new Error(info))
    })

    this.ngrok.on('close', () => {
      this.emit('close')
    })

    process.on('exit', async () => {
      await this.kill()
    })

    try {
      const response = await promise
      return response
    } finally {
      this.ngrok.stdout.removeAllListeners('data')
      this.ngrok.stderr.removeAllListeners('data')
    }
  }

  async runTunnel (opts, retryCount = 0) {
    opts.name = String(opts.name || uuid.v4())
    try {
      const response = await this.api.post({url: 'api/tunnels', json: opts})
      const publicUrl = response.public_url
      if (!publicUrl) {
        throw new Error(response.msg || 'failed to start tunnel')
      }
      this.tunnels[publicUrl] = response.uri
      if (opts.proto === 'http' && opts.bind_tls !== false) {
        this.tunnels[publicUrl.replace('https', 'http')] = response.uri + ' (http)'
      }
      // TODO: understand how to get this correctly.
      // The test in ngrok.guest.eventemitter.spec.js fails
      const parsedUiUrl = url.parse(response.uri)
      const uiUrl = parsedUiUrl.resolve('/')

      this.emit('connect', publicUrl, uiUrl)
      return publicUrl
    } catch (err) {
      if (!err.response) throw err 
      const body = err.response.body
      const notReady500 = err.statusCode === 500 && /panic/.test(body)
      const notReady502 = err.statusCode === 502 && body.details && body.details.err === 'tunnel session not ready yet'
      if ((notReady500 || notReady502) && retryCount < MAX_RETRY) {
        await new Promise((resolve) => setTimeout(resolve, 200))
        retryCount++
        return this.runTunnel(opts, retryCount)
      }
      throw err
    }
  }

  async authtoken (token, configPath) {
    const authtoken = ['authtoken', token]
    if (configPath) {
      authtoken.push('--config=' + configPath)
    }
    const a = spawn(
      bin,
      authtoken,
      {cwd: binDir})

    const promise = new Promise((resolve, reject) => {
      a.stdout.once('data', () => {
        a.kill()
        resolve(token)
      })
      a.stderr.once('data', () => {
        a.kill()
        reject(new Error('cant set authtoken'))
      })
    })
    return promise
  }

  async disconnect (publicUrl) {
    if (!this.api) {
      return
    }

    if (publicUrl) {
      const tunnelUrl = this.tunnels[publicUrl]
      if (!tunnelUrl) {
        throw new Error(`there is no tunnel with url: ${publicUrl}`)
      }
      await this.api.del(this.tunnels[publicUrl])
      delete this.tunnels[publicUrl]
      this.emit('disconnect', publicUrl)
      return
    }

    for (const url of Object.keys(this.tunnels)) {
      await this.disconnect(url)
    }
    this.emit('disconnect')
  }

  async kill () {
    if (!this.ngrok) {
      return
    }
    let resolvePromise
    const promise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    this.ngrok.on('exit', () => {
      this.api = null
      this.tunnels = {}
      this.emit('disconnect')
      resolvePromise()
    })
    this.ngrok.kill()
    delete this.api
    return promise
  }
}

module.exports = NGrok
