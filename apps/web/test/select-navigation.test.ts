import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { nextOptionIndex } from "../src/lib/select-navigation";
import { PopoverSelect } from "../src/components/popover-select";

test("custom selectors support wrapping arrow navigation and list boundaries", () => {
  assert.equal(nextOptionIndex(0,3,"ArrowDown"),1);
  assert.equal(nextOptionIndex(2,3,"ArrowDown"),0);
  assert.equal(nextOptionIndex(0,3,"ArrowUp"),2);
  assert.equal(nextOptionIndex(1,3,"Home"),0);
  assert.equal(nextOptionIndex(1,3,"End"),2);
  assert.equal(nextOptionIndex(0,0,"ArrowDown"),-1);
});

test("custom selector exposes a named listbox trigger and selected option semantics", () => {
  const markup = renderToStaticMarkup(createElement(PopoverSelect,{
    label:"Color theme", value:"midnight", onChange:() => undefined,
    options:[{value:"obsidian",label:"Obsidian"},{value:"midnight",label:"Midnight Blue"}],
  }));
  assert.match(markup,/aria-label="Color theme"/);
  assert.match(markup,/aria-haspopup="listbox"/);
  assert.match(markup,/role="listbox"/);
  assert.match(markup,/role="option" aria-selected="true"/);
});
