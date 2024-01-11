declare module "@exodus/sodium-crypto" {
  export function encryptAEAD(
    message: Uint8Array,
    secretKey: Uint8Array,
    nonce: Uint8Array,
    associatedData?: Uint8Array | null,
  ): Buffer;
  export function decryptAEAD(
    ciphertext: Uint8Array,
    secretKey: Uint8Array,
    nonce: Uint8Array,
    associatedData?: Uint8Array | null,
  ): Buffer;
}
