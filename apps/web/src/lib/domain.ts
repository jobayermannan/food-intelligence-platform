import Decimal from "decimal.js";
import type { Role, Revenue } from "./models";
export const manages = (role?: Role) => role === "OWNER" || role === "ADMIN";
export const operates = (role?: Role) => manages(role) || role === "STAFF";
export const analyzes = (role?: Role) => manages(role) || role === "VIEWER";
export const quantity = (value: string | number = 0) => new Decimal(value).toDecimalPlaces(6).toString();
export const sum = (values: (string | number)[]) => values.reduce<Decimal>((total, value) => total.plus(value), new Decimal(0)).toString();
export const netRevenue = (data: Revenue) => new Decimal(sum(data.sales.map(row => row.net))).minus(sum(data.returns.map(row => row.net))).toString();
export const money = (value: string | number, currency = "USD") => {
  try { return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value)); }
  catch { return `${currency} ${new Decimal(value).toFixed(2)}`; }
};
export const date = (value?: string | null, timezone?: string) => value ? new Intl.DateTimeFormat("en", {month: "short", day: "numeric", year: "numeric", ...(timezone ? {timeZone: timezone} : {})}).format(new Date(value)) : "—";
export const shortId = (value: string) => value.slice(0, 8).toUpperCase();
export function returnDisposition(quantity: string, restocked: string, disposed: string) {
  const q = new Decimal(quantity), r = new Decimal(restocked), d = new Decimal(disposed);
  if (q.lte(0) || r.lt(0) || d.lt(0) || r.plus(d).gt(q)) throw new Error("Restocked and disposed quantities must not exceed the return quantity.");
  return {quantity: q.toString(), restocked: r.toString(), disposed: d.toString()};
}
