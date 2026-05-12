import { expect, describe, it, vi } from "vitest";
import { buildVerifyContext } from "../../src/utils/verifyContext";

const noopLog = (_err: unknown) => {
  return;
};

describe("buildVerifyContext", () => {
  it("returns UNKNOWN when resolver returns undefined", async () => {
    const ctx = await buildVerifyContext(
      { resolve: () => Promise.resolve(undefined), logError: noopLog },
      "hash",
      { name: "x", description: "", url: "https://app.uniswap.org", icons: [] },
    );
    expect(ctx.verified.validation).toBe("UNKNOWN");
    expect(ctx.verified.origin).toBe("https://app.uniswap.org");
  });

  it("returns UNKNOWN when resolver throws", async () => {
    const ctx = await buildVerifyContext(
      {
        resolve: () => Promise.reject(new Error("network")),
        logError: noopLog,
      },
      "hash",
      { name: "x", description: "", url: "https://app.uniswap.org", icons: [] },
    );
    expect(ctx.verified.validation).toBe("UNKNOWN");
  });

  it("returns VALID when attested origin matches dApp metadata.url", async () => {
    const ctx = await buildVerifyContext(
      {
        resolve: () => Promise.resolve({ origin: "https://app.uniswap.org" }),
        logError: noopLog,
      },
      "hash",
      { name: "Uniswap", description: "", url: "https://app.uniswap.org", icons: [] },
    );
    expect(ctx.verified.validation).toBe("VALID");
    expect(ctx.verified.origin).toBe("https://app.uniswap.org");
  });

  it("returns INVALID when attested origin differs from claimed metadata.url (spoofing)", async () => {
    const ctx = await buildVerifyContext(
      {
        resolve: () => Promise.resolve({ origin: "https://attacker.com" }),
        logError: noopLog,
      },
      "hash",
      { name: "Uniswap", description: "", url: "https://app.uniswap.org", icons: [] },
    );
    expect(ctx.verified.validation).toBe("INVALID");
    expect(ctx.verified.origin).toBe("https://attacker.com");
  });

  it("propagates isScam=true", async () => {
    const ctx = await buildVerifyContext(
      {
        resolve: () => Promise.resolve({ origin: "https://attacker.com", isScam: true }),
        logError: noopLog,
      },
      "hash",
      { name: "Uniswap", description: "", url: "https://app.uniswap.org", icons: [] },
    );
    expect(ctx.verified.isScam).toBe(true);
  });

  it("does not set isScam when attestation lacks the flag", async () => {
    const ctx = await buildVerifyContext(
      {
        resolve: () => Promise.resolve({ origin: "https://app.uniswap.org" }),
        logError: noopLog,
      },
      "hash",
      { name: "Uniswap", description: "", url: "https://app.uniswap.org", icons: [] },
    );
    expect(ctx.verified.isScam).toBeUndefined();
  });

  it("supports string-shaped attestation response (legacy)", async () => {
    const ctx = await buildVerifyContext(
      { resolve: () => Promise.resolve("https://app.uniswap.org"), logError: noopLog },
      "hash",
      { name: "Uniswap", description: "", url: "https://app.uniswap.org", icons: [] },
    );
    expect(ctx.verified.validation).toBe("VALID");
    expect(ctx.verified.origin).toBe("https://app.uniswap.org");
  });

  it("forwards verifyUrl from metadata to resolver", async () => {
    const spy = vi.fn().mockResolvedValue(undefined);
    await buildVerifyContext({ resolve: spy, logError: noopLog }, "h", {
      name: "x",
      description: "",
      url: "https://x.com",
      icons: [],
      verifyUrl: "https://verify.example.com",
    });
    expect(spy).toHaveBeenCalledWith({
      attestationId: "h",
      verifyUrl: "https://verify.example.com",
    });
  });

  it("returns UNKNOWN with empty origin when metadata is undefined", async () => {
    const ctx = await buildVerifyContext(
      { resolve: () => Promise.resolve(undefined), logError: noopLog },
      "hash",
      undefined as any,
    );
    expect(ctx.verified.validation).toBe("UNKNOWN");
    expect(ctx.verified.origin).toBe("");
    expect(ctx.verified.verifyUrl).toBe("");
  });

  it("returns UNKNOWN with empty origin when metadata is null", async () => {
    const ctx = await buildVerifyContext(
      { resolve: () => Promise.resolve(undefined), logError: noopLog },
      "hash",
      null as any,
    );
    expect(ctx.verified.validation).toBe("UNKNOWN");
    expect(ctx.verified.origin).toBe("");
    expect(ctx.verified.verifyUrl).toBe("");
  });

  it("returns UNKNOWN with empty origin when metadata.url is empty string", async () => {
    const ctx = await buildVerifyContext(
      { resolve: () => Promise.resolve(undefined), logError: noopLog },
      "hash",
      { name: "x", description: "", url: "", icons: [] },
    );
    expect(ctx.verified.validation).toBe("UNKNOWN");
    expect(ctx.verified.origin).toBe("");
  });

  it("propagates isScam even when metadata is undefined", async () => {
    const ctx = await buildVerifyContext(
      {
        resolve: () => Promise.resolve({ origin: "https://attacker.com", isScam: true }),
        logError: noopLog,
      },
      "hash",
      undefined as any,
    );
    expect(ctx.verified.isScam).toBe(true);
  });

  it("flags empty-url dApp as INVALID when Reown returns an attested origin", async () => {
    // Spoof scenario: attacker omits metadata.url so the legacy null-guard
    // skipped validation entirely. Receiving an attested origin means Reown
    // knows the real source — surface it as INVALID.
    const ctx = await buildVerifyContext(
      {
        resolve: () => Promise.resolve({ origin: "https://evil.com" }),
        logError: noopLog,
      },
      "hash",
      { name: "Uniswap", description: "", url: "", icons: [] },
    );
    expect(ctx.verified.validation).toBe("INVALID");
    expect(ctx.verified.origin).toBe("https://evil.com");
  });

  it("flags empty-url dApp as INVALID when attestation is a bare string", async () => {
    const ctx = await buildVerifyContext(
      { resolve: () => Promise.resolve("https://evil.com"), logError: noopLog },
      "hash",
      undefined as any,
    );
    expect(ctx.verified.validation).toBe("INVALID");
    expect(ctx.verified.origin).toBe("https://evil.com");
  });

  it("defaults context.verifyUrl/origin from metadata when no attestation", async () => {
    const ctx = await buildVerifyContext(
      { resolve: () => Promise.resolve(undefined), logError: noopLog },
      "h",
      {
        name: "x",
        description: "",
        url: "https://x.com",
        icons: [],
        verifyUrl: "https://verify.example.com",
      },
    );
    expect(ctx.verified.verifyUrl).toBe("https://verify.example.com");
    expect(ctx.verified.origin).toBe("https://x.com");
    expect(ctx.verified.validation).toBe("UNKNOWN");
  });
});
