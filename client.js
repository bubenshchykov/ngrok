const got = require('got');

class NgrokClient {
  constructor(processUrl) {
    this.internalApi = got.extend({
      prefixUrl: processUrl,
      retry: 0
    });
  }

  listTunnels() {
    return this.internalApi.get('api/tunnels').json();
  }

  startTunnel(options) {
    return this.internalApi.post('api/tunnels', { json: options }).json();
  }

  tunnelDetail(name) {
    return this.internalApi.get(`api/tunnels/${name}`).json();
  }

  stopTunnel(tunnelUrl) {
    return this.internalApi.delete(tunnelUrl.replace(/^\//, '')).json();
  }

  listRequests(options) {
    return this.internalApi.get('api/requests/http', { searchParams: options }).json();
  }

  replayRequest(id, tunnelName) {
    return this.internalApi.post('api/requests/http', {json: { id, tunnelName }}).then(response => response.statusCode === 204);
  }

  deleteAllRequests() {
    return this.internalApi.delete('api/requests/http').then(response => response.statusCode === 204);
  }

  requestDetail(id) {
    return this.internalApi.get(`api/requests/http/${id}`).json();
  }
}

module.exports = { NgrokClient };