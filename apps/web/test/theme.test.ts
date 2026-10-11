import assert from "node:assert/strict";
import { test } from "node:test";
import { applyTheme, readTheme, saveTheme, themeStorageKey } from "../src/lib/theme";

test("theme preference accepts only supported names and falls back to obsidian", () => {
  assert.equal(readTheme({getItem: () => "midnight"}), "midnight");
  assert.equal(readTheme({getItem: () => "graphite"}), "graphite");
  assert.equal(readTheme({getItem: () => "neon"}), "obsidian");
  assert.equal(readTheme({getItem: () => null}), "obsidian");
});

test("theme selection persists and applies the selected token set", () => {
  let saved: [string, string] | undefined;
  saveTheme("graphite", {setItem: (key, value) => { saved = [key, value]; }});
  assert.deepEqual(saved, [themeStorageKey, "graphite"]);
  const element = {dataset: {} as DOMStringMap};
  applyTheme("midnight", element);
  assert.equal(element.dataset.theme, "midnight");
});
