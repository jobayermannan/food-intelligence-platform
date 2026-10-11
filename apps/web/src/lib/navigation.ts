import type { Role } from "./models";

export type NavItem = {
  label: string;
  href: string;
  roles?: readonly Role[];
  icon?: string;
};

export type NavGroup = {
  label: string;
  href: string;
  icon: string;
  roles?: readonly Role[];
  children: readonly NavItem[];
};

export type NavSection = {
  label: string;
  items: readonly (NavItem | NavGroup)[];
};

const readers = ["OWNER", "ADMIN", "STAFF", "VIEWER"] as const;
const analysts = ["OWNER", "ADMIN", "VIEWER"] as const;
const managers = ["OWNER", "ADMIN"] as const;

// Nested routes reuse the working V1 feature screens until each V2 screen is migrated.
// Returns still start from a sale detail; there is no independent return-list API.
export const navigation: readonly NavSection[] = [
  { label: "Core", items: [{ label: "Overview", href: "/", icon: "overview", roles: readers }] },
  {
    label: "Operations & Stock",
    items: [
      {
        label: "Inventory", href: "/inventory", icon: "inventory", roles: readers,
        children: [
          { label: "Stock Positions", href: "/inventory/positions" },
          { label: "Batches & Expiry", href: "/inventory/batches" },
          { label: "Movement Ledger", href: "/inventory/movements" },
        ],
      },
      {
        label: "Catalog", href: "/catalog", icon: "catalog", roles: readers,
        children: [
          { label: "Categories", href: "/catalog/categories" },
          { label: "Products", href: "/catalog/products" },
          { label: "Suppliers", href: "/catalog/suppliers" },
        ],
      },
      {
        label: "Sales & Returns", href: "/sales", icon: "sales", roles: readers,
        children: [
          { label: "Sales Ledger", href: "/sales" },
          { label: "Returns", href: "/sales/returns" },
        ],
      },
      {
        label: "Waste", href: "/waste", icon: "waste", roles: readers,
        children: [
          { label: "Stock Waste", href: "/waste" },
          { label: "Customer Disposal", href: "/waste/customer-disposal", roles: analysts },
        ],
      },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Expiry Watchlist & Discounts", href: "/expiry", icon: "expiry", roles: readers },
      { label: "Stock Health & Analytics", href: "/analytics", icon: "analytics", roles: analysts },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Team & Access", href: "/team", icon: "team", roles: managers },
      { label: "Settings", href: "/settings", icon: "settings", roles: managers },
    ],
  },
];

export function canSeeNavigation(item: { roles?: readonly Role[] }, role?: Role) {
  return Boolean(role && (!item.roles || item.roles.includes(role)));
}

export function isNavGroup(item: NavItem | NavGroup): item is NavGroup {
  return "children" in item;
}

export function pageLabel(pathname: string) {
  if (pathname === "/account") return "Account";
  for (const section of navigation) {
    for (const item of section.items) {
      if (item.href === pathname) return item.label;
      if (isNavGroup(item)) {
        const child = item.children.find(candidate => candidate.href === pathname);
        if (child) return `${item.label} / ${child.label}`;
      }
    }
  }
  return "Workspace";
}
