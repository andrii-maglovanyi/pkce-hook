export type PKCECodePair = {
  codeChallenge: string;
  codeVerifier: string;
  createdAt: Date;
};

export const base64URLEncode = (str: Buffer): string => {
  return str
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
};

const sha256 = async (input: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const digest = await window.crypto.subtle.digest("SHA-256", data);

  return Buffer.from(digest);
};

export const randomBytes = async (length: number) => {
  const bytes = new Uint8Array(length);
  const values = await window.crypto.getRandomValues(bytes);

  return Buffer.from(values);
};

export const createPKCECodes = async (): Promise<PKCECodePair> => {
  const codeVerifier = base64URLEncode(await randomBytes(64));
  const codeChallenge = base64URLEncode(await sha256(codeVerifier));
  const createdAt = new Date();
  const codePair = {
    codeChallenge,
    codeVerifier,
    createdAt,
  };

  return codePair;
};
