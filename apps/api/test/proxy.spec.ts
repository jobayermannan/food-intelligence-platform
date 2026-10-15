import { trustProxyHops } from "../src/proxy";

describe("proxy configuration", () => {
  const original = process.env.TRUST_PROXY_HOPS;

  afterEach(() => {
    if (original === undefined) delete process.env.TRUST_PROXY_HOPS;
    else process.env.TRUST_PROXY_HOPS = original;
  });

  it("is disabled by default", () => {
    delete process.env.TRUST_PROXY_HOPS;
    expect(trustProxyHops()).toBeUndefined();
  });

  it("accepts a bounded proxy hop count", () => {
    process.env.TRUST_PROXY_HOPS = "1";
    expect(trustProxyHops()).toBe(1);
  });

  it("rejects unsafe values", () => {
    process.env.TRUST_PROXY_HOPS = "true";
    expect(() => trustProxyHops()).toThrow(
      "TRUST_PROXY_HOPS must be an integer between 1 and 10",
    );
  });
});
