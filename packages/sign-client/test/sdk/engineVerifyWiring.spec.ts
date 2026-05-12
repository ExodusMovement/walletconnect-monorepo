import { expect, describe, it, vi, beforeEach } from "vitest";
import { EventEmitter } from "events";
import { Engine } from "../../src/controllers/engine";

const DAPP_ORIGIN = "https://app.uniswap.org";
const WALLET_ORIGIN = "https://my-wallet.example.com";

function createMockClient(walletUrl: string) {
  return {
    metadata: { name: "Test Wallet", description: "", url: walletUrl, icons: [] },
    events: new EventEmitter(),
    logger: {
      error: vi.fn(),
      trace: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    },
    core: {
      verify: { resolve: vi.fn() },
      expirer: { set: vi.fn() },
    },
    proposal: { set: vi.fn() },
    session: {
      get: vi.fn(),
    },
    pendingRequest: { set: vi.fn() },
  } as any;
}

function proposalPayload(id: number, proposerUrl: string) {
  return {
    id,
    params: {
      proposer: {
        publicKey: "abc123",
        metadata: {
          name: "dApp",
          description: "",
          url: proposerUrl,
          icons: [],
        },
      },
      requiredNamespaces: {
        eip155: {
          methods: ["eth_sendTransaction"],
          chains: ["eip155:1"],
          events: ["chainChanged"],
        },
      },
      relays: [{ protocol: "irn" }],
    },
  };
}

function sessionRequestPayload(id: number) {
  return {
    id,
    params: {
      request: { method: "personal_sign", params: ["0xdeadbeef", "0x0"] },
      chainId: "eip155:1",
    },
  };
}

describe("Engine verifyContext wiring – session_proposal", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let engine: Engine;

  beforeEach(() => {
    mockClient = createMockClient(WALLET_ORIGIN);
    engine = new Engine(mockClient);

    (engine as any).isValidConnect = vi.fn();
    (engine as any).setProposal = vi.fn();
  });

  it("passes proposer metadata (not wallet metadata) to buildVerifyContext — VALID when origins match", async () => {
    mockClient.core.verify.resolve.mockResolvedValue({ origin: DAPP_ORIGIN });

    const proposalReceived = new Promise<any>((resolve) => {
      mockClient.events.once("session_proposal", resolve);
    });

    const payload = proposalPayload(1, DAPP_ORIGIN);
    await (engine as any).onSessionProposeRequest("pairing-topic", payload);

    const event = await proposalReceived;
    expect(event.verifyContext.verified.validation).toBe("VALID");
    expect(event.verifyContext.verified.origin).toBe(DAPP_ORIGIN);
  });

  it("detects wrong-metadata bug: attestation matches WALLET url yields INVALID for proposer", async () => {
    mockClient.core.verify.resolve.mockResolvedValue({ origin: WALLET_ORIGIN });

    const proposalReceived = new Promise<any>((resolve) => {
      mockClient.events.once("session_proposal", resolve);
    });

    const payload = proposalPayload(2, DAPP_ORIGIN);
    await (engine as any).onSessionProposeRequest("pairing-topic", payload);

    const event = await proposalReceived;
    expect(event.verifyContext.verified.validation).toBe("INVALID");
    expect(event.verifyContext.verified.origin).toBe(WALLET_ORIGIN);
  });
});

describe("Engine verifyContext wiring – session_request", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let engine: Engine;

  const peerMetadataUrl = "https://dapp-peer.example.com";

  beforeEach(() => {
    mockClient = createMockClient(WALLET_ORIGIN);
    engine = new Engine(mockClient);

    (engine as any).isValidRequest = vi.fn();
    (engine as any).setPendingSessionRequest = vi.fn();

    mockClient.session.get.mockReturnValue({
      peer: {
        metadata: {
          name: "Peer dApp",
          description: "",
          url: peerMetadataUrl,
          icons: [],
        },
      },
    });
  });

  it("passes session.peer.metadata (not wallet metadata) to buildVerifyContext", async () => {
    mockClient.core.verify.resolve.mockResolvedValue({ origin: peerMetadataUrl });

    const requestReceived = new Promise<any>((resolve) => {
      mockClient.events.once("session_request", resolve);
    });

    const payload = sessionRequestPayload(100);
    await (engine as any).onSessionRequest("session-topic", payload);

    const event = await requestReceived;
    expect(event.verifyContext.verified.validation).toBe("VALID");
    expect(event.verifyContext.verified.origin).toBe(peerMetadataUrl);
  });

  it("yields INVALID when attestation matches wallet url instead of peer metadata", async () => {
    mockClient.core.verify.resolve.mockResolvedValue({ origin: WALLET_ORIGIN });

    const requestReceived = new Promise<any>((resolve) => {
      mockClient.events.once("session_request", resolve);
    });

    const payload = sessionRequestPayload(101);
    await (engine as any).onSessionRequest("session-topic", payload);

    const event = await requestReceived;
    expect(event.verifyContext.verified.validation).toBe("INVALID");
    expect(event.verifyContext.verified.origin).toBe(WALLET_ORIGIN);
  });
});
