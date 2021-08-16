import { Response } from "got";

declare module "ngrok" {
  /**
   * Creates a ngrok tunnel.
   * E.g:
   *     const url = await ngrok.connect(); // https://757c1652.ngrok.io -> http://localhost:80
   *     const url = await ngrok.connect(9090); // https://757c1652.ngrok.io -> http://localhost:9090
   *     const url = await ngrok.connect({ proto: 'tcp', addr: 22 }); // tcp://0.tcp.ngrok.io:48590
   *
   * @param options Optional. Port number or options.
   */
  export function connect(options?: number | Ngrok.Options): Promise<string>;

  /**
   * Stops a tunnel, or all of them if no URL is passed.
   *
   * /!\ ngrok and all opened tunnels will be killed when the node process is done.
   *
   * /!\ Note on HTTP tunnels: by default bind_tls is true, so whenever you use http proto two tunnels are created:
   *     http and https. If you disconnect https tunnel, http tunnel remains open.
   *     You might want to close them both by passing http-version url, or simply by disconnecting all in one,
   *     with ngrok.disconnect().
   *
   * @param url The URL of the specific tunnel to disconnect -- if not passed, kills them all.
   */
  export function disconnect(url?: string): Promise<void>;

  /**
   * Kills the ngrok process.
   */
  export function kill(): Promise<void>;

  /**
   * Gets the ngrok client URL.
   */
  export function getUrl(): string | null;

  /**
   * Gets the ngrok client API.
   */
  export function getApi(): NgrokClient | null;

  /**
   * You can create basic http-https-tcp tunnel without authtoken.
   * For custom subdomains and more you should obtain authtoken by signing up at ngrok.com.
   * E.g:
   *     await ngrok.authtoken(token);
   *     // or
   *     await ngrok.authtoken({ authtoken: token, ... });
   *     // or
   *     const url = await ngrok.connect({ authtoken: token, ... });
   *
   * @param token
   */
  export function authtoken(token: string | Ngrok.Options): Promise<void>;

  /**
   *
   * Gets the version of the ngrok binary.
   */
  export function getVersion(options?: Ngrok.Options): Promise<string>;

  namespace Ngrok {
    type Protocol = "http" | "tcp" | "tls";
    type Region = "us" | "eu" | "au" | "ap" | "sa" | "jp" | "in";

    interface Options {
      /**
       * Other "custom", indirectly-supported ngrok process options.
       *
       * @see {@link https://ngrok.com/docs}
       */
      [customOption: string]: any;

      /**
       * The tunnel type to put in place.
       *
       * @default 'http'
       */
      proto?: Protocol;

      /**
       * Port or network address to redirect traffic on.
       *
       * @default opts.port || opts.host || 80
       */
      addr?: string | number;

      /**
       * HTTP Basic authentication for tunnel.
       *
       * @default opts.httpauth
       */
      auth?: string;

      /**
       * Reserved tunnel name (e.g. https://alex.ngrok.io)
       */
      subdomain?: string;

      /**
       * Your authtoken from ngrok.com
       */
      authtoken?: string;

      /**
       * One of ngrok regions.
       * Note: region used in first tunnel will be used for all next tunnels too.
       *
       * @default 'us'
       */
      region?: Region;

      /**
       * Custom path for ngrok config file.
       */
      configPath?: string;

      /**
       * Custom binary path, eg for prod in electron
       */
      binPath?: (defaultPath: string) => string;

      /**
       * Callback called when ngrok logs an event.
       */
      onLogEvent?: (logEventMessage: string) => any;

      /**
       * Callback called when session status is changed.
       * When connection is lost, ngrok will keep trying to reconnect.
       */
      onStatusChange?: (status: "connected" | "closed") => any;

       /**
       * Callback called when ngrok host process is terminated.
       */
      onTerminated?: () => any;
    }

    interface Metrics {
      count: number;
      rate1: number;
      rate5: number;
      rate15: number;
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    }

    interface Connections extends Metrics {
      gauge: number;
    }

    interface HTTPRequests extends Metrics {}

    interface Tunnel {
      name: string;
      uri: string;
      public_url: string;
      proto: Ngrok.Protocol;
      metrics: {
        conns: Connections;
        http: HTTPRequests;
      };
    }

    interface TunnelsResponse {
      tunnels: Tunnel[];
      uri: string;
    }

    interface CapturedRequestOptions {
      limit: number;
      tunnel_name: string;
    }

    interface Request {
      uri: string;
      id: string;
      tunnel_name: string;
      remote_addr: string;
      start: string;
      duration: number;
      request: {
        method: string;
        proto: string;
        headers: {
          [header: string]: string;
        };
        uri: string;
        raw: string;
      };
      response: {
        status: string;
        status_code: number;
        proto: string;
        headers: {
          [header: string]: string;
        };
        raw: string;
      };
    }

    interface RequestsResponse {
      requests: Request[];
      uri: string;
    }
  }

  class NgrokClient {
    constructor(processUrl: string);
    listTunnels(): Promise<Ngrok.TunnelsResponse>;
    startTunnel(options: Ngrok.Options): Promise<Ngrok.Tunnel>;
    tunnelDetail(name: string): Promise<Ngrok.Tunnel>;
    stopTunnel(name: string): Promise<boolean>;
    listRequests(
      options: Ngrok.CapturedRequestOptions
    ): Promise<Ngrok.RequestsResponse>;
    replayRequest(id: string, tunnelName: string): Promise<boolean>;
    deleteAllRequests(): Promise<boolean>;
    requestDetail(id: string): Promise<Ngrok.Request>;
  }

  type ErrorBody = {
    error_code: number;
    status_code: number;
    msg: string;
    details: { [key: string]: string }
  }

  class NgrokClientError extends Error {
    constructor(message: string, response: Response, body: ErrorBody | string);
    get response(): Response;
    get body(): ErrorBody | string;
  }
}
