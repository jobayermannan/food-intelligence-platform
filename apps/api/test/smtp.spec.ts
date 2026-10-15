import { mailFrom, smtpTransportOptions } from "../src/smtp";

const names = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_REQUIRE_TLS",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "MAIL_FROM",
] as const;

describe("SMTP configuration", () => {
  const original = { ...process.env };

  beforeEach(() => {
    for (const name of names) delete process.env[name];
  });

  afterAll(() => {
    process.env = original;
  });

  it("keeps local Mailpit defaults", () => {
    expect(smtpTransportOptions()).toEqual({
      host: "localhost",
      port: 1025,
      secure: false,
      requireTLS: false,
    });
    expect(mailFrom()).toBe("development@food-intelligence.local");
  });

  it("supports authenticated STARTTLS SMTP", () => {
    Object.assign(process.env, {
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "587",
      SMTP_SECURE: "false",
      SMTP_REQUIRE_TLS: "true",
      SMTP_USER: "mailer",
      SMTP_PASSWORD: "secret",
      MAIL_FROM: "Food Intelligence <no-reply@example.com>",
    });

    expect(smtpTransportOptions()).toEqual({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: "mailer", pass: "secret" },
    });
    expect(mailFrom()).toBe("Food Intelligence <no-reply@example.com>");
  });

  it("defaults port 465 to implicit TLS", () => {
    process.env.SMTP_PORT = "465";
    expect(smtpTransportOptions().secure).toBe(true);
  });

  it("rejects incomplete credentials", () => {
    process.env.SMTP_USER = "mailer";
    expect(() => smtpTransportOptions()).toThrow(
      "SMTP_USER and SMTP_PASSWORD must be configured together",
    );
  });
});
