import { generateChildLogger, getLoggerContext, Logger } from "@exodus/walletconnect-logger";
import { IVerify } from "@exodus/walletconnect-types";

import {
  TRUSTED_VERIFY_URLS,
  VERIFY_CONTEXT,
  VERIFY_FALLBACK_SERVER,
  VERIFY_FETCH_TIMEOUT_MS,
  VERIFY_SERVER,
} from "../constants";

export class Verify extends IVerify {
  public name = VERIFY_CONTEXT;

  constructor(public projectId: string, public logger: Logger) {
    super(projectId, logger);
    this.logger = generateChildLogger(logger, this.name);
  }

  public init: IVerify["init"] = async (_params) => {};

  // dApp-side iframe registration is not used in a wallet build (no DOM); intentional no-op.
  public register: IVerify["register"] = async (_params) => {};

  public resolve: IVerify["resolve"] = async (params) => {
    const { attestationId } = params;
    if (!attestationId) return undefined;
    const verifyUrl = this.getVerifyUrl(params?.verifyUrl);
    try {
      return await this.fetchAttestation(attestationId, verifyUrl);
    } catch (error) {
      this.logger.info(`failed to resolve attestation: ${attestationId} from url: ${verifyUrl}`);
      this.logger.info(error);
      if (verifyUrl === VERIFY_FALLBACK_SERVER) return undefined;
      try {
        return await this.fetchAttestation(attestationId, VERIFY_FALLBACK_SERVER);
      } catch (fallbackError) {
        this.logger.info(`fallback attestation fetch also failed`);
        this.logger.info(fallbackError);
        return undefined;
      }
    }
  };

  get context(): string {
    return getLoggerContext(this.logger);
  }

  private fetchAttestation = async (attestationId: string, url: string) => {
    this.logger.debug(`resolving attestation: ${attestationId} from url: ${url}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VERIFY_FETCH_TIMEOUT_MS);
    try {
      const result = await fetch(`${url}/attestation/${attestationId}`, {
        signal: controller.signal,
      });
      return result.status === 200 ? await result.json() : undefined;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  private getVerifyUrl = (verifyUrl?: string) => {
    let url = verifyUrl || VERIFY_SERVER;
    if (!TRUSTED_VERIFY_URLS.includes(url)) {
      this.logger.info(
        `verify url: ${url}, not included in trusted list, assigning default: ${VERIFY_SERVER}`,
      );
      url = VERIFY_SERVER;
    }
    return url;
  };
}
