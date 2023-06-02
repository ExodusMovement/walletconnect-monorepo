import { generateChildLogger, getLoggerContext, Logger } from "@exodus/walletconnect-logger";
import { IVerify } from "@exodus/walletconnect-types";

import { VERIFY_CONTEXT } from "../constants";

export class Verify extends IVerify {
  public name = VERIFY_CONTEXT;

  constructor(public projectId: string, public logger: Logger) {
    super(projectId, logger);
    this.logger = generateChildLogger(logger, this.name);
  }

  public init: IVerify["init"] = async (_params) => {};

  public register: IVerify["register"] = async (_params) => {
    throw new Error("verify not supported in exodus fork yet");
  };

  public resolve: IVerify["resolve"] = async (_params) => {
    throw new Error("verify not supported in exodus fork yet");
  };

  get context(): string {
    return getLoggerContext(this.logger);
  }
}
