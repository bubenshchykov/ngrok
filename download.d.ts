declare module "ngrok/download" {
  export function downloadNgrok(
    callback: (err?: Error) => void,
    options?: {
      cafilePath: string;
      arch: string;
      cdnUrl: string;
      cdnPath: string;
      ignoreCache: boolean;
    }
  ): void;
}