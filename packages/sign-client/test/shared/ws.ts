import { ICore } from "@exodus/walletconnect-types";

export async function disconnectSocket(core: ICore) {
  if (core.relayer.connected) {
    await core.relayer.transportClose();
  }
}
