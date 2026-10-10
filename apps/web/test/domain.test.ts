import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzes, manages, netRevenue, operates, returnDisposition, sum } from "../src/lib/domain";

test("workspace capabilities follow backend roles", () => {
  assert.equal(manages("OWNER"), true);
  assert.equal(manages("ADMIN"), true);
  assert.equal(manages("STAFF"), false);
  assert.equal(operates("STAFF"), true);
  assert.equal(operates("VIEWER"), false);
  assert.equal(analyzes("VIEWER"), true);
  assert.equal(analyzes("STAFF"), false);
});

test("revenue subtracts returns using exact decimal arithmetic", () => {
  assert.equal(sum(["0.1", "0.2"]), "0.3");
  assert.equal(netRevenue({sales:[{locationId:"a",gross:"0.5",discounts:"0",net:"0.3",tax:"0"}],returns:[{locationId:"a",net:"0.1",tax:"0"}]}), "0.2");
});

test("return disposition cannot exceed original return quantity", () => {
  assert.deepEqual(returnDisposition("1.5", "0.5", "1"), {quantity:"1.5",restocked:"0.5",disposed:"1"});
  assert.throws(() => returnDisposition("1.5", "1", "1"));
  assert.throws(() => returnDisposition("1", "-0.1", "0"));
});
