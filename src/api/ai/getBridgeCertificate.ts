import { client } from "../client";
export type BridgeCertificate = { protocol: string; certificate_pem: string; fingerprint_sha256: string };
export function getBridgeCertificate(): Promise<BridgeCertificate> { return client<BridgeCertificate>("/ai/certificate"); }
