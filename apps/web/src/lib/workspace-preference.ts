import type { Business, Location } from "./models";

export type WorkspacePreference = { businessId: string; locationId: string };

const key = (userId: string) => `food-intelligence:workspace:${userId}`;

export function readWorkspacePreference(userId: string, storage?: Pick<Storage, "getItem">): WorkspacePreference | null {
  try {
    const raw = (storage ?? window.localStorage).getItem(key(userId));
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || !("businessId" in value) || !("locationId" in value) || typeof value.businessId !== "string" || typeof value.locationId !== "string") return null;
    return {businessId:value.businessId,locationId:value.locationId};
  } catch { return null; }
}

export function saveWorkspacePreference(userId: string, preference: WorkspacePreference, storage?: Pick<Storage, "setItem">) {
  try { (storage ?? window.localStorage).setItem(key(userId), JSON.stringify(preference)); }
  catch { /* Storage may be unavailable; selection still works for this page. */ }
}

export function selectBusinessId(businesses: Pick<Business, "id">[], preferredId: string) {
  return businesses.find(b => b.id === preferredId)?.id ?? businesses[0]?.id ?? "";
}

export function selectLocationId(locations: Pick<Location, "id" | "archivedAt">[], preferredId: string) {
  return locations.find(l => l.id === preferredId && !l.archivedAt)?.id ?? locations.find(l => !l.archivedAt)?.id ?? "";
}

export function workspaceBootPending(sessionReady: boolean, hasUser: boolean, hasSessionError: boolean, selectionReady: boolean) {
  return !sessionReady || (!hasUser && !hasSessionError) || (hasUser && !selectionReady);
}
