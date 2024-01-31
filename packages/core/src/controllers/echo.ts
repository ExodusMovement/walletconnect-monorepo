import { generateChildLogger, Logger } from "@exodus/walletconnect-logger";
import { IEchoClient } from "@exodus/walletconnect-types";
import { ECHO_CONTEXT } from "../constants";

// @ts-ignore
// import { fetch } from "@exodus/fetch";
// @ts-ignore
// import { url } from "@exodus/fetch/url";

export class EchoClient extends IEchoClient {
  public readonly context = ECHO_CONTEXT;
  constructor(public projectId: string, public logger: Logger) {
    super(projectId, logger);
    this.logger = generateChildLogger(logger, this.context);
  }

  public registerDeviceToken: IEchoClient["registerDeviceToken"] = async () => {
    // const { clientId, token, notificationType, enableEncrypted = false } = params;

    // const echoUrl = url`${ECHO_URL}/${this.projectId}/clients`;

    // await fetch(echoUrl, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     client_id: clientId,
    //     type: notificationType,
    //     token,
    //     always_raw: enableEncrypted,
    //   }),
    // });

    throw new Error("notifications are not supported in exodus fork");
  };
}
