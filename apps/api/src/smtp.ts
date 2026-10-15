function optionalBoolean(name: string, fallback: boolean) {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be true or false`);
}

export function smtpTransportOptions() {
  const port = Number(process.env.SMTP_PORT ?? 1025);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("SMTP_PORT must be an integer between 1 and 65535");

  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;
  if (Boolean(user) !== Boolean(password))
    throw new Error("SMTP_USER and SMTP_PASSWORD must be configured together");

  return {
    host: process.env.SMTP_HOST?.trim() || "localhost",
    port,
    secure: optionalBoolean("SMTP_SECURE", port === 465),
    requireTLS: optionalBoolean("SMTP_REQUIRE_TLS", false),
    ...(user && password ? { auth: { user, pass: password } } : {}),
  };
}

export function mailFrom() {
  return process.env.MAIL_FROM?.trim() || "development@food-intelligence.local";
}
