import assert from "node:assert/strict";
import { test } from "node:test";
import { canSeeNavigation, isNavGroup, navigation, pageLabel } from "../src/lib/navigation";
import type { Role } from "../src/lib/models";

function visible(role: Role) {
  return navigation.flatMap(section => section.items.filter(item => canSeeNavigation(item, role))).flatMap(item =>
    isNavGroup(item) ? [item.label, ...item.children.filter(child => canSeeNavigation(child, role)).map(child => child.label)] : [item.label],
  );
}

test("navigation follows endpoint permissions, including staff waste and viewer analytics", () => {
  const staff = visible("STAFF");
  assert.ok(staff.includes("Stock Waste"));
  assert.ok(!staff.includes("Customer Disposal"));
  assert.ok(!staff.includes("Stock Health & Analytics"));
  assert.ok(!staff.includes("Team & Access"));
  const viewer = visible("VIEWER");
  assert.ok(viewer.includes("Customer Disposal"));
  assert.ok(viewer.includes("Stock Health & Analytics"));
  assert.ok(!viewer.includes("Team & Access"));
  assert.ok(visible("ADMIN").includes("Settings"));
});

test("nested destinations have usable page labels", () => {
  assert.equal(pageLabel("/inventory/batches"), "Inventory / Batches & Expiry");
  assert.equal(pageLabel("/sales/returns"), "Sales & Returns / Returns");
});
