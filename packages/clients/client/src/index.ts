import Connector from "@exodus/walletconnect-core-v1";
import { IWalletConnectOptions, IPushServerOptions } from "@exodus/walletconnect-types";
import * as cryptoLib from "@exodus/walletconnect-iso-crypto";

class WalletConnect extends Connector {
  constructor(connectorOpts: IWalletConnectOptions, pushServerOpts?: IPushServerOptions) {
    super({
      cryptoLib,
      connectorOpts,
      pushServerOpts,
    });
  }
}

export default WalletConnect;
