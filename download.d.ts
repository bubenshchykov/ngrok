declare module "ngrok/download" {
  export default function downloadNgrok(
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