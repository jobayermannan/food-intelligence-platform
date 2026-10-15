// Explicit configuration only: no implicit LAN origins, wildcards, or suffix matching.
export function appOrigins(): string[] {
  const value =
    process.env.APP_ORIGINS?.trim() ||
    process.env.APP_ORIGIN ||
    "http://localhost:3000";
  return [
    ...new Set(
      value.split(",").map((entry) => {
        const origin = entry.trim();
        const url = new URL(origin);
        if (
          !["http:", "https:"].includes(url.protocol) ||
          url.origin !== origin ||
          origin.includes("*")
        ) {
          throw new Error(
            "APP_ORIGINS/APP_ORIGIN must contain exact HTTP(S) origins without paths or wildcards",
          );
        }
        return origin;
      }),
    ),
  ];
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  return origin !== undefined && appOrigins().includes(origin);
}
