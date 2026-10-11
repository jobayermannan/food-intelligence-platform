export const themeNames = ["obsidian", "midnight", "graphite"] as const;
export type ThemeName = typeof themeNames[number];

export const themeStorageKey = "food-intelligence:theme";

export function isThemeName(value: string | null): value is ThemeName {
  return value !== null && (themeNames as readonly string[]).includes(value);
}

export function readTheme(storage?: Pick<Storage, "getItem">): ThemeName {
  try {
    const value = (storage ?? window.localStorage).getItem(themeStorageKey);
    return isThemeName(value) ? value : "obsidian";
  } catch {
    return "obsidian";
  }
}

export function saveTheme(theme: ThemeName, storage?: Pick<Storage, "setItem">) {
  try {
    (storage ?? window.localStorage).setItem(themeStorageKey, theme);
  } catch {
    // A theme change remains active for this page when storage is unavailable.
  }
}

export function applyTheme(theme: ThemeName, element?: Pick<HTMLElement, "dataset">) {
  const target = element ?? (typeof document === "undefined" ? undefined : document.documentElement);
  if (target) target.dataset.theme = theme;
}
