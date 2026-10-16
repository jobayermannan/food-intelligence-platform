"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  BarChart3, Boxes, ChevronDown, Clock3, LayoutDashboard, LogOut,
  MapPin, Menu, Package, Plus, RefreshCw, Settings2, ShoppingBag,
  Sprout, Trash2, Users, X,
} from "lucide-react";
import type { Business, Location, User } from "@/lib/models";
import { canSeeNavigation, isNavGroup, navigation, pageLabel, type NavGroup, type NavItem } from "@/lib/navigation";
import { IconButton } from "./ui";
import { ThemeSelector } from "./theme-selector";
import { PopoverSelect } from "./popover-select";

const icons = {
  overview: LayoutDashboard, inventory: Boxes, catalog: Package,
  sales: ShoppingBag, waste: Trash2, expiry: Clock3,
  analytics: BarChart3, team: Users, settings: Settings2,
};

type Props = {
  user: User;
  business?: Business;
  businesses: Business[];
  locations: Location[];
  businessId: string;
  locationId: string;
  onBusinessChange: (id: string) => void;
  onLocationChange: (id: string) => void;
  onCreateBusiness: () => void;
  onRefresh: () => void;
  onLogout: () => void;
  onResetDemo: () => void;
  children: ReactNode;
  notification: string;
  onDismissNotification: () => void;
};

function NavigationGroup({item, pathname, close}: {item: NavGroup; pathname: string; close: () => void}) {
  const active = pathname === item.href || item.children.some(child => child.href === pathname);
  const [open, setOpen] = useState(active);
  const Icon = icons[item.icon as keyof typeof icons];
  useEffect(() => { if (active) setOpen(true); }, [active]);
  const legacyChild = item.href === "/catalog" ? 1 : 0;
  return <div className="nav-group">
    <button type="button" className={`nav-group-button${active ? " active" : ""}`} aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <span className="nav-group-title"><Icon size={18} aria-hidden="true"/>{item.label}</span>
      <ChevronDown size={16} aria-hidden="true" className={open ? "chevron open" : "chevron"}/>
    </button>
    {open && <div className="nav-children">{item.children.map((child, index) => <Link
      key={`${child.label}:${index}`} href={child.href} onClick={close}
      className={`nav-child${pathname === child.href || (pathname === item.href && index === legacyChild) ? " active" : ""}`}
      aria-current={pathname === child.href || (pathname === item.href && index === legacyChild) ? "page" : undefined}
    ><span className="nav-connector" aria-hidden="true"/>{child.label}</Link>)}</div>}
  </div>;
}

export function ShellView({user,business,businesses,locations,businessId,locationId,onBusinessChange,onLocationChange,onCreateBusiness,onRefresh,onLogout,onResetDemo,children,notification,onDismissNotification}: Props) {
  const pathname = usePathname();
  const [mobile, setMobile] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setMobile(false), []);
  useEffect(() => { close(); }, [pathname]);
  useEffect(() => {
    if (!mobile) return;
    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { close(); trigger.current?.focus(); }
      if (event.key === "Tab") {
        const controls = sidebar.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), select:not([disabled])');
        if (!controls?.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    const media = window.matchMedia("(max-width: 760px)");
    const onResize = () => { if (!media.matches) close(); };
    window.addEventListener("keydown", onKey);
    media.addEventListener("change", onResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
      window.removeEventListener("keydown", onKey);
      media.removeEventListener("change", onResize);
    };
  }, [mobile]);
  const activeLocations = locations.filter(location => !location.archivedAt);
  const initials = user.displayName.trim().slice(0, 2).toUpperCase();

  return <div className="app-shell">
    <a href="#main" className="skip-link">Skip to content</a>
    <button className={`sidebar-backdrop${mobile ? " open" : ""}`} aria-hidden={!mobile} aria-label="Close navigation" tabIndex={mobile ? 0 : -1} onClick={() => { close(); trigger.current?.focus(); }}/>
    <aside ref={sidebar} className={`sidebar${mobile ? " open" : ""}`} role={mobile ? "dialog" : undefined} aria-modal={mobile ? true : undefined} aria-label="Workspace navigation">
      <div className="sidebar-brand-row">
        <Link className="brand" href="/" onClick={close}><span className="brand-mark"><Sprout size={23} aria-hidden="true"/></span><span>FoodIntel<small>Food operations</small></span></Link>
        <IconButton ref={closeButton} className="mobile-close" label="Close navigation" onClick={() => { close(); trigger.current?.focus(); }}><X size={20}/></IconButton>
      </div>
      <div className="workspace-picker">
        <span className="tiny-label">Workspace</span>
        <PopoverSelect label="Active workspace" value={businessId} disabled={!businesses.length} options={businesses.map(row => ({value:row.id,label:row.name}))} onChange={selected => {onBusinessChange(selected); close();}} compact/>
        {!user.isDemo && <button type="button" className="text-button" onClick={() => {onCreateBusiness(); close();}}><Plus size={14} aria-hidden="true"/> New business</button>}
      </div>
      <nav aria-label="Main navigation" className="sidebar-nav">
        {business && navigation.filter(section => !user.isDemo || section.label !== "Administration").map(section => {
          const visible = section.items.filter(item => canSeeNavigation(item, business.role));
          if (!visible.length) return null;
          return <div className="nav-section" key={section.label}>
            <div className="tiny-label nav-label">{section.label}</div>
            {visible.map(item => {
              if (isNavGroup(item)) {
                const scoped = {...item, children: item.children.filter(child => canSeeNavigation(child, business.role))};
                return <NavigationGroup key={item.label} item={scoped} pathname={pathname} close={close}/>;
              }
              const leaf = item as NavItem;
              const Icon = icons[leaf.icon as keyof typeof icons];
              const active = pathname === leaf.href;
              return <Link key={leaf.label} href={leaf.href} onClick={close} className={`nav-link${active ? " active" : ""}`} aria-current={active ? "page" : undefined}><Icon size={18} aria-hidden="true"/>{leaf.label}</Link>;
            })}
          </div>;
        })}
      </nav>
      <div className="sidebar-bottom">
        {user.isDemo && <button type="button" className="text-button" onClick={onResetDemo}><RefreshCw size={15} aria-hidden="true"/> Reset demo</button>}
        <Link href="/account" onClick={close} className={`account-link${pathname === "/account" ? " active" : ""}`} aria-current={pathname === "/account" ? "page" : undefined}>
          <span className="avatar" aria-hidden="true">{initials}</span><span className="account-copy"><strong>{user.displayName}</strong><small>{business?.role ?? "Your account"}</small></span>
        </Link>
        <button type="button" className="text-button logout" onClick={onLogout}><LogOut size={15} aria-hidden="true"/> Sign out</button>
      </div>
    </aside>
    <div className="main-shell">
      <header className="topbar">
        <IconButton ref={trigger} className="mobile-menu" label="Open navigation" aria-expanded={mobile} disabled={mobile} onClick={() => setMobile(true)}><Menu size={21}/></IconButton>
        <div className="topbar-context"><span className="topbar-overline">{business?.name ?? "Your account"}</span><span className="breadcrumb">{pageLabel(pathname)}</span></div>
        <div className="topbar-actions">
          <ThemeSelector/>
          <PopoverSelect className="location-picker" label="Active location" value={locationId} disabled={!business || !activeLocations.length} icon={<MapPin size={17} aria-hidden="true"/>} options={activeLocations.map(row => ({value:row.id,label:row.name}))} onChange={onLocationChange} compact/>
          <IconButton label="Refresh workspace" onClick={onRefresh}><RefreshCw size={18}/></IconButton>
          <Link href="/account" className="avatar small" aria-label="Your account">{initials}</Link>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="app-footer">Food Intelligence Platform <span>Operational data is an on-demand snapshot.</span></footer>
    </div>
    {notification && <div className="toast" role="status">{notification}<button type="button" aria-label="Dismiss notification" onClick={onDismissNotification}><X size={16}/></button></div>}
  </div>;
}
