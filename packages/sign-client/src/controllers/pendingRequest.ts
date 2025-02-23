import { Store } from "@exodus/walletconnect-core";
import { Logger } from "@exodus/walletconnect-logger";
import { ICore, PendingRequestTypes } from "@exodus/walletconnect-types";
import { REQUEST_CONTEXT, SIGN_CLIENT_STORAGE_PREFIX } from "../constants";

export class PendingRequest extends Store<number, PendingRequestTypes.Struct> {
  constructor(public core: ICore, public logger: Logger) {
    super(
      core,
      logger,
      REQUEST_CONTEXT,
      SIGN_CLIENT_STORAGE_PREFIX,
      (val: PendingRequestTypes.Struct) => val.id,
    );
  }
}
