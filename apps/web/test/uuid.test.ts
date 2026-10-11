import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUuid } from "../src/lib/uuid";

test("uses native randomUUID when available", () => {
  assert.equal(randomUuid({
    randomUUID: () => "12345678-1234-4234-8234-123456789abc",
    getRandomValues: () => { throw new Error("Fallback should not run"); },
  }), "12345678-1234-4234-8234-123456789abc");
});

test("fallback uses random bytes and sets UUID v4 version and variant bits", () => {
  let calls = 0;
  const getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
    assert.ok(array instanceof Uint8Array);
    assert.equal(array.length, 16);
    array.fill(0xff);
    calls++;
    return array;
  };
  assert.equal(randomUuid({getRandomValues}), "ffffffff-ffff-4fff-bfff-ffffffffffff");
  assert.equal(calls, 1);
});

test("fallback preserves leading zeroes and fails if secure randomness is unavailable", () => {
  const getRandomValues = <T extends ArrayBufferView | null>(array: T): T => array;
  assert.equal(randomUuid({getRandomValues}), "00000000-0000-4000-8000-000000000000");
  assert.throws(() => randomUuid({} as Crypto), /Secure random generation is unavailable/);
});
