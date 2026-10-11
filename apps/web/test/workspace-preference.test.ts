import assert from "node:assert/strict";
import { test } from "node:test";
import { readWorkspacePreference, saveWorkspacePreference, selectBusinessId, selectLocationId, workspaceBootPending } from "../src/lib/workspace-preference";

function storage() {
  const values = new Map<string,string>();
  return {getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => {values.set(key,value);}};
}

test("workspace preference is scoped to the authenticated user", () => {
  const store = storage();
  saveWorkspacePreference("owner",{businessId:"green-spoon",locationId:"gulshan"},store);
  assert.deepEqual(readWorkspacePreference("owner",store),{businessId:"green-spoon",locationId:"gulshan"});
  assert.equal(readWorkspacePreference("viewer",store),null);
});

test("saved selections must still be available and active", () => {
  const businesses = [{id:"default"},{id:"green-spoon"}];
  const locations = [{id:"dhanmondi",archivedAt:null},{id:"gulshan",archivedAt:null},{id:"old",archivedAt:"2026-01-01"}];
  assert.equal(selectBusinessId(businesses,"green-spoon"),"green-spoon");
  assert.equal(selectBusinessId(businesses,"removed"),"default");
  assert.equal(selectLocationId(locations,"gulshan"),"gulshan");
  assert.equal(selectLocationId(locations,"old"),"dhanmondi");
  assert.equal(selectLocationId(locations,"inaccessible"),"dhanmondi");
  assert.equal(selectLocationId([{id:"old",archivedAt:"2026-01-01"}],"old"),"");
});

test("initial shell waits for session and workspace restoration, then stays available", () => {
  assert.equal(workspaceBootPending(false,false,false,false),true);
  assert.equal(workspaceBootPending(true,true,false,false),true);
  assert.equal(workspaceBootPending(true,true,false,true),false);
  assert.equal(workspaceBootPending(true,false,true,false),false);
});
