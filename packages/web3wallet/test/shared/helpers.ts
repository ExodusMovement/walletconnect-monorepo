import { ICore } from "@exodus/walletconnect-types";

export async function disconnect(core: ICore) {
  if (core.relayer.connected) {
    await core.relayer.transportClose();
  }
}
