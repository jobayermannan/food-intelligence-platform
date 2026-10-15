export function trustProxyHops() {
  const value = process.env.TRUST_PROXY_HOPS?.trim();
  if (!value) return undefined;
  const hops = Number(value);
  if (!Number.isInteger(hops) || hops < 1 || hops > 10)
    throw new Error("TRUST_PROXY_HOPS must be an integer between 1 and 10");
  return hops;
}
