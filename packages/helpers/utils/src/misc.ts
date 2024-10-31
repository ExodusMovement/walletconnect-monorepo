import * as encoding from "@exodus/walletconnect-encoding";
import * as jsonRpcUtils from "@exodus/walletconnect-jsonrpc-utils";
import { randomBytes } from '@exodus/crypto/randomBytes'

// -- hex -------------------------------------------------- //

export function sanitizeHex(hex: string): string {
  return encoding.sanitizeHex(hex);
}

export function addHexPrefix(hex: string): string {
  return encoding.addHexPrefix(hex);
}

export function removeHexPrefix(hex: string): string {
  return encoding.removeHexPrefix(hex);
}

export function removeHexLeadingZeros(hex: string): string {
  return encoding.removeHexLeadingZeros(encoding.addHexPrefix(hex));
}

// -- id -------------------------------------------------- //

export const payloadId = jsonRpcUtils.payloadId;

export function uuid(): string {
  const bytes = randomBytes(36)
  const chars: Array<String> = []
  for (let a = 1; a <= 36; a++) {
    chars.push((a * 51) & 52 ? (a ^ 15 ? 8 ^ (bytes[a - 1] % (a ^ 20 ? 16 : 4)) : 4).toString(16) : "-")
  }
  return chars.join('');
}
