import { generateChildLogger, getLoggerContext, Logger } from "@exodus/walletconnect-logger";
import { safeJsonParse, safeJsonStringify } from "@exodus/walletconnect-safe-json";
import { ICore, ICrypto, IKeyChain } from "@exodus/walletconnect-types";
import * as relayAuth from "@exodus/walletconnect-relay-auth";
import {
  decrypt,
  deriveSymKey,
  encrypt,
  generateKeyPair as generateKeyPairUtil,
  hashKey,
  hex2uint8array,
  uint8array2hex,
  getInternalError,
  generateRandomBytes32,
  validateEncoding,
  validateDecoding,
  isTypeOneEnvelope,
  deserialize,
  decodeTypeByte,
} from "@exodus/walletconnect-utils";

import { CRYPTO_CONTEXT, CRYPTO_CLIENT_SEED, CRYPTO_JWT_TTL } from "../constants";
import { KeyChain } from "./keychain";

export class Crypto implements ICrypto {
  public name = CRYPTO_CONTEXT;
  public keychain: ICrypto["keychain"];

  private initialized = false;

  constructor(public core: ICore, public logger: Logger, keychain?: IKeyChain) {
    this.core = core;
    this.logger = generateChildLogger(logger, this.name);
    this.keychain = keychain || new KeyChain(this.core, this.logger);
  }

  public init: ICrypto["init"] = async () => {
    if (!this.initialized) {
      await this.keychain.init();
      this.initialized = true;
    }
  };

  get context() {
    return getLoggerContext(this.logger);
  }

  public hasKeys: ICrypto["hasKeys"] = (tag) => {
    this.isInitialized();
    return this.keychain.has(`sym-${tag}`);
  };

  public getClientId: ICrypto["getClientId"] = async () => {
    this.isInitialized();
    const seed = await this.getClientSeed();
    const keyPair = relayAuth.generateKeyPair(seed);
    const clientId = relayAuth.encodeIss(keyPair.publicKey);
    return clientId;
  };

  public generateKeyPair: ICrypto["generateKeyPair"] = () => {
    this.isInitialized();
    const keyPair = generateKeyPairUtil();
    return this.setPrivateKey(keyPair.publicKey, keyPair.privateKey);
  };

  public signJWT: ICrypto["signJWT"] = async (aud) => {
    this.isInitialized();
    const seed = await this.getClientSeed();
    const keyPair = relayAuth.generateKeyPair(seed);
    const sub = generateRandomBytes32();
    const ttl = CRYPTO_JWT_TTL;
    const jwt = await relayAuth.signJWT(sub, aud, ttl, keyPair);
    return jwt;
  };

  public generateSharedKey: ICrypto["generateSharedKey"] = (
    selfPublicKey,
    peerPublicKey,
    overrideTopic,
  ) => {
    this.isInitialized();
    if (overrideTopic) {
      throw new Error("overrideTopic disabled in Exodus fork due to security reasons");
    }
    const selfPrivateKey = this.getPrivateKey(selfPublicKey);
    const symKey = deriveSymKey(selfPrivateKey, peerPublicKey);
    return this.setSymKey(symKey);
  };

  public setSymKey: ICrypto["setSymKey"] = async (symKey, overrideTopic) => {
    if (overrideTopic) {
      throw new Error("overrideTopic disabled in Exodus fork due to security reasons");
    }
    // TODO check if we can remove overrideTopic
    this.isInitialized();
    const topic = hashKey(symKey);
    await this.keychain.set(`sym-${topic}`, symKey);
    return topic;
  };

  public deleteKeyPair: ICrypto["deleteKeyPair"] = async (publicKey: string) => {
    this.isInitialized();
    await this.keychain.del(`pk-${publicKey}`);
  };

  public deleteSymKey: ICrypto["deleteSymKey"] = async (topic: string) => {
    this.isInitialized();
    await this.keychain.del(`sym-${topic}`);
  };

  public encode: ICrypto["encode"] = async (topic, payload, opts) => {
    this.isInitialized();
    const params = validateEncoding(opts);
    const message = safeJsonStringify(payload);
    if (isTypeOneEnvelope(params)) {
      const selfPublicKey = params.senderPublicKey;
      const peerPublicKey = params.receiverPublicKey;
      topic = await this.generateSharedKey(selfPublicKey, peerPublicKey);
    }
    const symKey = this.getSymKey(topic);
    const { type, senderPublicKey } = params;
    const result = await encrypt({ type, symKey, message, senderPublicKey });
    return result;
  };

  public decode: ICrypto["decode"] = async (topic, encoded, opts) => {
    this.isInitialized();
    const params = validateDecoding(encoded, opts);
    if (isTypeOneEnvelope(params)) {
      const selfPublicKey = params.receiverPublicKey;
      const peerPublicKey = params.senderPublicKey;
      topic = await this.generateSharedKey(selfPublicKey, peerPublicKey);
    }
    try {
      const symKey = this.getSymKey(topic);
      const message = await decrypt({ symKey, encoded });
      const payload = safeJsonParse(message);
      return payload;
    } catch (error) {
      this.logger.error(
        `Failed to decode message from topic: '${topic}', clientId: '${await this.getClientId()}'`,
      );
      this.logger.error(error);
    }
  };

  public getPayloadType: ICrypto["getPayloadType"] = (encoded) => {
    const deserialized = deserialize(encoded);
    return decodeTypeByte(deserialized.type);
  };

  public getPayloadSenderPublicKey: ICrypto["getPayloadSenderPublicKey"] = (encoded) => {
    const deserialized = deserialize(encoded);
    return deserialized.senderPublicKey ? uint8array2hex(deserialized.senderPublicKey) : undefined;
  };

  // ---------- Private ----------------------------------------------- //

  private async setPrivateKey(publicKey: string, privateKey: string): Promise<string> {
    await this.keychain.set(`pk-${publicKey}`, privateKey);
    return publicKey;
  }

  private getPrivateKey(publicKey: string) {
    const privateKey = this.keychain.get(`pk-${publicKey}`);
    return privateKey;
  }

  private async getClientSeed(): Promise<Uint8Array> {
    let seed = "";
    try {
      seed = this.keychain.get(CRYPTO_CLIENT_SEED);
    } catch {
      seed = generateRandomBytes32();
      await this.keychain.set(CRYPTO_CLIENT_SEED, seed);
    }
    return hex2uint8array(seed);
  }

  private getSymKey(topic: string) {
    const symKey = this.keychain.get(`sym-${topic}`);
    return symKey;
  }

  private isInitialized() {
    if (!this.initialized) {
      const { message } = getInternalError("NOT_INITIALIZED", this.name);
      throw new Error(message);
    }
  }
}
