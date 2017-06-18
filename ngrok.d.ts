/// <reference types="node" />

declare const ngrok: Ngrok;

declare type NgrokToken = string;
declare type NgrokUrl = string;

declare type Callback<T> = (err?: any, result?: T) => void;

declare type Ngrok = NodeJS.EventEmitter & INgrokWrapper;

declare interface INgrokOptions {
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
    proto?: 'http' | 'tcp' | 'tls';

    /**
     * Port or network address to redirect traffic on.
     *
     * @default opts.port || opts.host || 80
     */
    addr?: string|number;

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
    region?: 'us' | 'eu' | 'au' | 'ap';

    /**
     * Custom path for ngrok config file.
     */
    configPath?: string;
}

declare interface INgrokWrapper {
    /**
     * You can create basic http-https-tcp tunnel without authtoken.
     * For custom subdomains and more you should obtain authtoken by signing up at ngrok.com.
     * E.g:
     *     ngrok.authtoken(token, (err, token) => {});
     *     ngrok.connect({ authtoken: token, ... }, (err, url) => {});
     *
     * @param token
     * @param callback
     */
    authtoken(token: string, callback: Callback<NgrokToken>): void;

    /**
     * Creates a ngrok HTTP tunnel to http://localhost:80.
     * E.g. https://757c1652.ngrok.io -> http://localhost:80
     *
     * @param callback
     */
    connect(callback: Callback<NgrokUrl>): void;

    /**
     * Creates a ngrok HTTP tunnel to the specified port on localhost.
     * E.g. https://757c1652.ngrok.io -> http://localhost:9090
     *
     * @param port
     * @param callback
     */
    connect(port: number, callback: Callback<NgrokUrl>): void;

    /**
     * Creates a ngrok tunnel with more advanded configuration.
     * E.g:
     *     ngrok.connect({ proto: 'tcp', addr: 22 }, (err, url) => {});
     *     // => tcp://0.tcp.ngrok.io:48590
     *
     * @param options
     * @param callback
     */
    connect(options: INgrokOptions, callback: Callback<NgrokUrl>): void;

    /**
     * Stops a tunnel, or all of them if no URL is passed.
     *
     * /!\ Note on HTTP tunnels: by default bind_tls is true, so whenever you use http proto two tunnels are created:
     *     http and https. If you disconnect https tunnel, http tunnel remains open.
     *     You might want to close them both by passing http-version url, or simply by disconnecting all in one,
     *     with ngrok.disconnect().
     *
     * @param url The URL of the specific tunnel to disconnect -- if not passed, kills them all.
     */
    disconnect(url?: string): void;

    /**
     * Kills the ngrok process.
     */
    kill(): void;
}

export = ngrok;
