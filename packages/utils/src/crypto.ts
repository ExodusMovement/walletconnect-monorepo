import { randomBytes, scalarMult } from "tweetnacl";
import SHA from "sha.js";
import createHmac from "create-hmac";
import { CryptoTypes } from "@exodus/walletconnect-types";
import { fromByteArray, toByteArray } from "base64-js";
/// <reference path="sodium-crypto.d.ts"/>
import { encryptAEAD, decryptAEAD } from "@exodus/sodium-crypto";

export const BASE10 = "base10";
export const BASE16 = "base16";
export const BASE64 = "base64pad";
export const UTF8 = "utf8";

export const TYPE_0 = 0;
export const TYPE_1 = 1;

const ZERO_INDEX = 0;
const TYPE_LENGTH = 1;
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

// Taken from @stablelib/x25519
const _9 = new Uint8Array(KEY_LENGTH);
_9[0] = 9;
function _generateKeyPair() {
  const secretKey = randomBytes(KEY_LENGTH);
  const publicKey = scalarMult(secretKey, _9);
  return { secretKey, publicKey };
}
function _sharedKey(a: Uint8Array, b: Uint8Array) {
  return scalarMult(a, b);
}

// Implementation of RFC 5869 HKDF constrained to a single use, no salt or
// info, and keys of 32 bits
function _hkdf32(key: Uint8Array) {
  if (key.length !== 32) {
    throw new Error("key must be of length 32");
  }
  const zeroes = Buffer.alloc(32);
  const prk = createHmac("sha256", zeroes).update(key).digest();

  // Since the derived key will be of length 32, we only need to do one HMAC.
  // There's no need for writing a loop that repeadly calls HMAC.
  const one = Buffer.from([1]);

  const derived = createHmac("sha256", prk).update(one).digest();

  return new Uint8Array(derived);
}

export function uint8array2hex(arr: Uint8Array): string {
  return Buffer.from(arr).toString("hex").toString();
}

export function hex2uint8array(str: string): Uint8Array {
  if (!/^([a-f0-9])*$/i.test(str)) {
    throw new Error(`not an hex string: ${str}`);
  }
  return new Uint8Array(Buffer.from(str, "hex"));
}

export function generateKeyPair(): CryptoTypes.KeyPair {
  const keyPair = _generateKeyPair();
  return {
    privateKey: uint8array2hex(keyPair.secretKey),
    publicKey: uint8array2hex(keyPair.publicKey),
  };
}

export function generateRandomBytes32(): string {
  const random = randomBytes(KEY_LENGTH);
  return Buffer.from(random).toString("hex").toString();
}

export function deriveSymKey(privateKeyA: string, publicKeyB: string): string {
  const sharedKey = _sharedKey(hex2uint8array(privateKeyA), hex2uint8array(publicKeyB));
  const symKey = _hkdf32(sharedKey);
  return uint8array2hex(symKey);
}

export function hashKey(key: string): string {
  const result = new Uint8Array(SHA("sha256").update(hex2uint8array(key)).digest());
  return uint8array2hex(result);
}

function utf8string2uint8array(str: string): Uint8Array {
  return new Uint8Array(Buffer.from(str, "utf8"));
}

export function hashMessage(message: string): string {
  const result = new Uint8Array(SHA("sha256").update(utf8string2uint8array(message)).digest());
  return uint8array2hex(result);
}

export function encodeTypeByte(type: number): Uint8Array {
  if (type < 0 || type > 255) {
    throw new Error(`invalid type number: ${type}`);
  }
  return new Uint8Array([type]);
}

export function decodeTypeByte(byte: Uint8Array): number {
  if (byte.length !== 1) {
    throw new Error(`invalid length: ${byte.length}`);
  }
  return byte[0];
}

export async function encrypt(params: CryptoTypes.EncryptParams): Promise<string> {
  const type = encodeTypeByte(typeof params.type !== "undefined" ? params.type : TYPE_0);
  if (decodeTypeByte(type) === TYPE_1 && typeof params.senderPublicKey === "undefined") {
    throw new Error("Missing sender public key for type 1 envelope");
  }
  const senderPublicKey =
    typeof params.senderPublicKey !== "undefined"
      ? hex2uint8array(params.senderPublicKey)
      : undefined;

  const iv = typeof params.iv !== "undefined" ? hex2uint8array(params.iv) : randomBytes(IV_LENGTH);
  const sealed = new Uint8Array(
    await encryptAEAD(
      utf8string2uint8array(params.message),
      hex2uint8array(params.symKey),
      iv,
      null,
    ),
  );
  return serialize({ type, sealed, iv, senderPublicKey });
}

export async function decrypt(params: CryptoTypes.DecryptParams): Promise<string> {
  const { sealed, iv } = deserialize(params.encoded);
  const message = new Uint8Array(
    await decryptAEAD(sealed, hex2uint8array(params.symKey), iv, null),
  );
  if (message === null) throw new Error("Failed to decrypt");
  return Buffer.from(message).toString("utf8");
}

export function serialize(params: CryptoTypes.EncodingParams): string {
  if (decodeTypeByte(params.type) === TYPE_1) {
    if (typeof params.senderPublicKey === "undefined") {
      throw new Error("Missing sender public key for type 1 envelope");
    }
    return fromByteArray(
      Buffer.concat([params.type, params.senderPublicKey, params.iv, params.sealed]),
    );
  }
  // default to type 0 envelope
  return fromByteArray(Buffer.concat([params.type, params.iv, params.sealed]));
}

export function deserialize(encoded: string): CryptoTypes.EncodingParams {
  const bytes = toByteArray(encoded);
  const type = bytes.slice(ZERO_INDEX, TYPE_LENGTH);
  const slice1 = TYPE_LENGTH;
  if (decodeTypeByte(type) === TYPE_1) {
    const slice2 = slice1 + KEY_LENGTH;
    const slice3 = slice2 + IV_LENGTH;
    const senderPublicKey = bytes.slice(slice1, slice2);
    const iv = bytes.slice(slice2, slice3);
    const sealed = bytes.slice(slice3);
    return { type, sealed, iv, senderPublicKey };
  }
  // default to type 0 envelope
  const slice2 = slice1 + IV_LENGTH;
  const iv = bytes.slice(slice1, slice2);
  const sealed = bytes.slice(slice2);
  return { type, sealed, iv };
}

export function validateDecoding(
  encoded: string,
  opts?: CryptoTypes.DecodeOptions,
): CryptoTypes.EncodingValidation {
  const deserialized = deserialize(encoded);
  return validateEncoding({
    type: decodeTypeByte(deserialized.type),
    senderPublicKey:
      typeof deserialized.senderPublicKey !== "undefined"
        ? uint8array2hex(deserialized.senderPublicKey)
        : undefined,
    receiverPublicKey: opts?.receiverPublicKey,
  });
}

export function validateEncoding(opts?: CryptoTypes.EncodeOptions): CryptoTypes.EncodingValidation {
  const type = opts?.type || TYPE_0;
  if (type === TYPE_1) {
    if (typeof opts?.senderPublicKey === "undefined") {
      throw new Error("missing sender public key");
    }
    if (typeof opts?.receiverPublicKey === "undefined") {
      throw new Error("missing receiver public key");
    }
  }
  return {
    type,
    senderPublicKey: opts?.senderPublicKey,
    receiverPublicKey: opts?.receiverPublicKey,
  };
}

export function isTypeOneEnvelope(
  result: CryptoTypes.EncodingValidation,
): result is CryptoTypes.TypeOneParams {
  return (
    result.type === TYPE_1 &&
    typeof result.senderPublicKey === "string" &&
    typeof result.receiverPublicKey === "string"
  );
}
