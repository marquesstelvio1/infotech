declare module "qr-scanner/qr-scanner.min.js" {
  const QrScanner: any;
  export default QrScanner;
}

declare module "qr-scanner/qr-scanner-worker.min.js?url" {
  const workerUrl: string;
  export default workerUrl;
}
