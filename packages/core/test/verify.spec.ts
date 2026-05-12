import { expect, describe, it, beforeEach, afterEach, vi } from "vitest";
import { getDefaultLoggerOptions, pino } from "@exodus/walletconnect-logger";

import { Verify } from "../src/controllers/verify";
import { VERIFY_FALLBACK_SERVER, VERIFY_SERVER } from "../src/constants";

const TEST_PROJECT_ID = "test-project-id";
const TEST_ATTESTATION_ID = "test-attestation-id";

describe("Verify", () => {
  const logger = pino(getDefaultLoggerOptions({ level: "fatal" }));
  let verify: Verify;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    verify = new Verify(TEST_PROJECT_ID, logger);
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("init", () => {
    it("is a no-op (wallet build has no DOM iframe)", async () => {
      await expect(verify.init()).resolves.toBeUndefined();
    });
  });

  describe("register", () => {
    it("is a no-op (dApp-side registration is browser-only and unused in wallet)", async () => {
      await expect(
        verify.register({ attestationId: TEST_ATTESTATION_ID }),
      ).resolves.toBeUndefined();
    });
  });

  describe("resolve", () => {
    it("returns undefined when attestationId is empty", async () => {
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy as any;
      const result = await verify.resolve({ attestationId: "" });
      expect(result).toBeUndefined();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("hits VERIFY_SERVER and returns parsed JSON on 200", async () => {
      const expected = { origin: "https://uniswap.org", isScam: false };
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        json: async () => expected,
      }) as any;
      const result = await verify.resolve({ attestationId: TEST_ATTESTATION_ID });
      expect(result).toEqual(expected);
      expect(global.fetch).toHaveBeenCalledWith(
        `${VERIFY_SERVER}/attestation/${TEST_ATTESTATION_ID}`,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it("returns undefined on non-200 response", async () => {
      global.fetch = vi.fn().mockResolvedValue({ status: 404, json: async () => undefined }) as any;
      const result = await verify.resolve({ attestationId: TEST_ATTESTATION_ID });
      expect(result).toBeUndefined();
    });

    it("falls back to VERIFY_FALLBACK_SERVER when primary URL throws", async () => {
      const expected = { origin: "https://fallback.example" };
      global.fetch = vi
        .fn()
        .mockRejectedValueOnce(new Error("primary down"))
        .mockResolvedValueOnce({ status: 200, json: async () => expected }) as any;
      const result = await verify.resolve({ attestationId: TEST_ATTESTATION_ID });
      expect(result).toEqual(expected);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        `${VERIFY_FALLBACK_SERVER}/attestation/${TEST_ATTESTATION_ID}`,
        expect.anything(),
      );
    });

    it("returns undefined when both primary and fallback throw", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("net down")) as any;
      const result = await verify.resolve({ attestationId: TEST_ATTESTATION_ID });
      expect(result).toBeUndefined();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("rejects untrusted verifyUrl and falls back to VERIFY_SERVER", async () => {
      const expected = { origin: "https://uniswap.org" };
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        json: async () => expected,
      }) as any;
      await verify.resolve({
        attestationId: TEST_ATTESTATION_ID,
        verifyUrl: "https://evil.example.com",
      });
      expect(global.fetch).toHaveBeenCalledWith(
        `${VERIFY_SERVER}/attestation/${TEST_ATTESTATION_ID}`,
        expect.anything(),
      );
    });

    it("uses caller-provided verifyUrl when it is in the trusted list", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({ origin: "https://x.com" }),
      }) as any;
      await verify.resolve({
        attestationId: TEST_ATTESTATION_ID,
        verifyUrl: VERIFY_FALLBACK_SERVER,
      });
      expect(global.fetch).toHaveBeenCalledWith(
        `${VERIFY_FALLBACK_SERVER}/attestation/${TEST_ATTESTATION_ID}`,
        expect.anything(),
      );
    });

    it("skips fallback when primary is already the fallback server", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("net down")) as any;
      const result = await verify.resolve({
        attestationId: TEST_ATTESTATION_ID,
        verifyUrl: VERIFY_FALLBACK_SERVER,
      });
      expect(result).toBeUndefined();
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        `${VERIFY_FALLBACK_SERVER}/attestation/${TEST_ATTESTATION_ID}`,
        expect.anything(),
      );
    });
  });
});
