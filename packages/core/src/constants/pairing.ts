import { THIRTY_DAYS, ONE_DAY, THIRTY_SECONDS } from "@exodus/walletconnect-time";
import { RelayerTypes, PairingJsonRpcTypes } from "@exodus/walletconnect-types";

export const PAIRING_CONTEXT = "pairing";

export const PAIRING_STORAGE_VERSION = "0.3";

export const PAIRING_DEFAULT_TTL = THIRTY_DAYS;

export const PAIRING_RPC_OPTS: Record<
  PairingJsonRpcTypes.WcMethod | "unregistered_method",
  {
    req: RelayerTypes.PublishOptions;
    res: RelayerTypes.PublishOptions;
  }
> = Object.assign(Object.create(null), {
  wc_pairingDelete: {
    req: {
      ttl: ONE_DAY,
      prompt: false,
      tag: 1000,
    },
    res: {
      ttl: ONE_DAY,
      prompt: false,
      tag: 1001,
    },
  },
  wc_pairingPing: {
    req: {
      ttl: THIRTY_SECONDS,
      prompt: false,
      tag: 1002,
    },
    res: {
      ttl: THIRTY_SECONDS,
      prompt: false,
      tag: 1003,
    },
  },
  unregistered_method: {
    req: {
      ttl: ONE_DAY,
      prompt: false,
      tag: 0,
    },
    res: {
      ttl: ONE_DAY,
      prompt: false,
      tag: 0,
    },
  },
});
