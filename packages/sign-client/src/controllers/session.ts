import { Store } from "@exodus/walletconnect-core";
import { Logger } from "@exodus/walletconnect-logger";
import { ICore, SessionTypes } from "@exodus/walletconnect-types";

import { SIGN_CLIENT_STORAGE_PREFIX, SESSION_CONTEXT } from "../constants";

export class Session extends Store<string, SessionTypes.Struct> {
  constructor(public core: ICore, public logger: Logger) {
    super(core, logger, SESSION_CONTEXT, SIGN_CLIENT_STORAGE_PREFIX);
  }
}
