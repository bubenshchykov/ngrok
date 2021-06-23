const got = require("got");

class NgrokClientError extends Error {
  constructor(message, response, body) {
    super(message);
    this.name = "NgrokClientError";
    this.response = response;
    this.body = body;
  }
}

class NgrokClient {
  constructor(processUrl) {
    this.internalApi = got.extend({
      prefixUrl: processUrl,
      retry: 3,
    });
  }

  async request(method, path, options = {}) {
    try {
      if (method === "get") {
        return await this.internalApi
          .get(path, { searchParams: options })
          .json();
      } else {
        return await this.internalApi[method](path, { json: options }).json();
      }
    } catch (error) {
      let clientError;
      const response = error.response ? error.response.body ? JSON.parse(error.response.body) : error.response : error;
      clientError = new NgrokClientError(
          error.msg,
          error.details,
          response
      );
      throw clientError;
    }
  }

  async booleanRequest(method, path, options = {}) {
    try {
      return await this.internalApi[method](path, { json: options }).then(
        (response) => response.statusCode === 204
      );
    } catch (e) {
      const response = e.response ? e.response.body ? JSON.parse(e.response.body) : e.response : e
      throw new NgrokClientError(e.msg, e.response, response);
    }
  }

  listTunnels() {
    return this.request("get", "api/tunnels");
  }

  startTunnel(options = {}) {
    return this.request("post", "api/tunnels", options);
  }

  tunnelDetail(name) {
    return this.request("get", `api/tunnels/${name}`);
  }

  stopTunnel(name) {
    if (typeof name === "undefined" || name.length === 0) {
      throw new Error("To stop a tunnel, please provide a name.");
    }
    return this.booleanRequest("delete", `api/tunnels/${name}`);
  }

  listRequests(options) {
    return this.request("get", "api/requests/http", options);
  }

  replayRequest(id, tunnelName) {
    return this.booleanRequest("post", "api/requests/http", { id, tunnelName });
  }

  deleteAllRequests() {
    return this.booleanRequest("delete", "api/requests/http");
  }

  requestDetail(id) {
    if (typeof id === "undefined" || id.length === 0) {
      throw new Error("To get the details of a request, please provide an id.");
    }
    return this.request("get", `api/requests/http/${id}`);
  }
}

module.exports = { NgrokClient };
