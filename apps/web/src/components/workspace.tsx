"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Activity, ArrowUpRight, BarChart3, Boxes, ChevronDown, Clock3, Leaf, LayoutDashboard, LogOut, MapPin, Menu, Package, Plus, RefreshCw, Settings2, ShoppingBag, Sprout, Trash2, Users, X } from "lucide-react";
import { api } from "@/lib/api";
import type { Business, Location } from "@/lib/models";
import { analyzes, manages } from "@/lib/domain";
import { readWorkspacePreference, saveWorkspacePreference, selectBusinessId, selectLocationId } from "@/lib/workspace-preference";
import { useSession } from "./session";
import { ActionForm, Button, ErrorBox, Field, Loading, Modal, Select, value } from "./ui";
type Workspace = {business: Business; locations: Location[]; location: Location | undefined; locationId: string; path: (suffix: string, scoped?: boolean) => string; refresh: () => void; revision: number; toast: (message: string) => void};
const Context = createContext<Workspace | null>(null);
export function useWorkspace() { const ctx = useContext(Context); if (!ctx) throw new Error("Missing business context"); return ctx; }
export function useResource<T>(path: string | null) {
  const {revision} = useWorkspace();
  const [state, setState] = useState<{key: string; data?: T; error: string | null; loading: boolean}>({key: "",error: null,loading: true});
  const [retry, setRetry] = useState(0); const key = `${path}:${revision}:${retry}`;
  useEffect(() => {
    const controller = new AbortController();
    if (!path) return;
    setState({key,error: null,loading: true});
    api<T>(path,{signal:controller.signal}).then(data => setState({key,data,error:null,loading:false})).catch(e => {if (!controller.signal.aborted) setState({key,error:e.message,loading:false});});
    return () => controller.abort();
  }, [path,key]);
  return {...(state.key === key ? state : {data:undefined,error:null,loading:Boolean(path)}), reload: () => setRetry(v => v + 1)};
}
const nav = [
  {href:"/",label:"Overview",icon:LayoutDashboard}, {href:"/inventory",label:"Inventory",icon:Boxes}, {href:"/catalog",label:"Products & suppliers",icon:Package}, {href:"/sales",label:"Sales & returns",icon:ShoppingBag}, {href:"/waste",label:"Waste",icon:Trash2}, {href:"/expiry",label:"Expiry & discounts",icon:Clock3}, {href:"/analytics",label:"Analytics",icon:BarChart3,analytics:true}, {href:"/team",label:"Team & access",icon:Users,manage:true}, {href:"/settings",label:"Business settings",icon:Settings2,manage:true},
];
export function WorkspaceShell({children}: {children: ReactNode}) {
  const {user,ready,error:sessionError,restore,logout} = useSession(); const router = useRouter(), pathname = usePathname();
  const userId = user?.id, selectionUserId = useRef<string | null>(null), selectedBusinessId = useRef("");
  const [businesses, setBusinesses] = useState<Business[]>([]), [businessesUserId,setBusinessesUserId] = useState<string | null>(null), [businessId, setBusinessId] = useState(""), [locations,setLocations] = useState<Location[]>([]), [locationId,setLocationId] = useState("");
  const [loading,setLoading] = useState(true), [error,setError] = useState<string | null>(null), [revision,setRevision] = useState(0), [create,setCreate] = useState(false), [mobile,setMobile] = useState(false), [notification,setNotification] = useState("");
  const availableBusinesses = businessesUserId === userId ? businesses : [];
  const business = availableBusinesses.find(b => b.id === businessId), location = business ? locations.find(l => l.id === locationId) : undefined;
  const refresh = useCallback(() => setRevision(v => v+1), []);
  useEffect(() => { if (ready && !user && !sessionError) router.replace("/login"); },[ready,user,sessionError,router]);
  useEffect(() => {
    if (!userId) return;
    const sameUser = selectionUserId.current === userId;
    selectionUserId.current = userId;
    if (!sameUser) {selectedBusinessId.current=""; setBusinesses([]); setBusinessesUserId(null); setBusinessId(""); setLocations([]); setLocationId("");}
    const controller = new AbortController(); setLoading(true); setError(null);
    api<Business[]>("/businesses",{signal:controller.signal}).then(rows => {
      if (controller.signal.aborted) return;
      const saved = readWorkspacePreference(userId);
      const selected = selectBusinessId(rows, saved ? saved.businessId : sameUser ? businessId : "");
      selectedBusinessId.current = selected;
      setBusinesses(rows); setBusinessesUserId(userId); setBusinessId(selected);
      if (!saved || saved.businessId !== selected) saveWorkspacePreference(userId,{businessId:selected,locationId:""});
    }).catch(e => {if (!controller.signal.aborted) setError(e.message);}).finally(() => {if (!controller.signal.aborted) setLoading(false);});
    return () => controller.abort();
  },[userId,revision]);
  useEffect(() => {
    setLocations([]); setLocationId(""); if (!businessId || !userId || businessesUserId !== userId) return;
    const controller = new AbortController();
    api<Location[]>(`/businesses/${businessId}/locations`,{signal:controller.signal}).then(rows => {
      if (controller.signal.aborted || selectedBusinessId.current !== businessId) return;
      const saved = readWorkspacePreference(userId);
      const selected = selectLocationId(rows,saved?.businessId === businessId ? saved.locationId : "");
      setLocations(rows); setLocationId(selected); saveWorkspacePreference(userId,{businessId,locationId:selected});
    }).catch(e => {if (!controller.signal.aborted) setError(e.message);});
    return () => controller.abort();
  },[businessId,userId,businessesUserId]);
  // Re-read locations after edits without resetting the user's current selection.
  useEffect(() => { if (!businessId || !revision || !userId || businessesUserId !== userId) return; const controller = new AbortController(); api<Location[]>(`/businesses/${businessId}/locations`,{signal:controller.signal}).then(rows => {if (controller.signal.aborted || selectedBusinessId.current !== businessId) return; const saved = readWorkspacePreference(userId); const selected = selectLocationId(rows,saved?.businessId === businessId ? saved.locationId : locationId); setLocations(rows); setLocationId(selected); saveWorkspacePreference(userId,{businessId,locationId:selected});}).catch(e => {if (!controller.signal.aborted) setError(e.message);}); return () => controller.abort(); },[businessId,revision,userId,businessesUserId]);
  useEffect(() => { if (!notification) return; const id = setTimeout(() => setNotification(""),5000); return () => clearTimeout(id); },[notification]);
  const path = (suffix: string, scoped = false) => `/businesses/${businessId}${suffix}${scoped && locationId ? `${suffix.includes("?") ? "&" : "?"}locationId=${locationId}` : ""}`;
  if (!ready || (!user && !sessionError)) return <Loading/>;
  if (sessionError) return <main className="standalone"><ErrorBox error={sessionError} retry={restore}/><Link href="/login">Go to login</Link></main>;
  if (!user) return null;
  const createDialog = create && <Modal title="Create your business" description="A separate workspace with its own products, stock and team." onClose={() => setCreate(false)}><ActionForm submit="Create workspace" onCancel={() => setCreate(false)} onSubmit={async (data,key) => {
    const created = await api<Business>("/businesses",{method:"POST",body:{name:value(data,"name"),timezone:value(data,"timezone"),currency:value(data,"currency"),defaultTaxRate:Number(value(data,"tax"))/100,requestKey:key}});
    setBusinesses(list => [...list,{...created,role:"OWNER"}]); selectedBusinessId.current=created.id; setBusinessId(created.id); saveWorkspacePreference(user.id,{businessId:created.id,locationId:""}); setCreate(false); refresh(); setNotification("Business created. Add your first location next."); router.push("/settings");
  }}><Field name="name" label="Business name" required maxLength={120} placeholder="e.g. The Green Table"/><div className="form-grid"><Field name="timezone" label="Business timezone" defaultValue={Intl.DateTimeFormat().resolvedOptions().timeZone} required hint="IANA timezone, e.g. Asia/Dhaka"/><Field name="currency" label="Currency code" defaultValue="BDT" pattern="[A-Za-z]{3}" maxLength={3} required/></div><Field name="tax" label="Default sales tax (%)" type="number" min="0" max="100" step="0.01" defaultValue="0" required hint="Applied by the server to sales after discounts."/></ActionForm></Modal>;
  return <div className="app-shell"><a href="#main" className="skip-link">Skip to content</a>{mobile && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobile(false)}/>}
    <aside className={`sidebar ${mobile ? "open" : ""}`}><Link className="brand" href="/"><span className="brand-mark"><Sprout size={25}/></span><span>food<span className="brand-light">intelligence</span><small>WORKSPACE</small></span></Link><button className="mobile-close icon-button" aria-label="Close navigation" onClick={() => setMobile(false)}><X/></button>
      <div className="workspace-picker"><span className="tiny-label">BUSINESS WORKSPACE</span><label className="sr-only" htmlFor="business-select">Business</label><select id="business-select" value={businessId} onChange={e => {const selected=e.target.value;selectedBusinessId.current=selected;setBusinessId(selected);setLocationId("");saveWorkspacePreference(user.id,{businessId:selected,locationId:""});setMobile(false);}}>{availableBusinesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}{!availableBusinesses.length && <option value="">No business yet</option>}</select><button className="text-button" onClick={() => setCreate(true)}><Plus size={13}/> New business</button></div>
      <div className="tiny-label nav-label">MANAGE</div><nav aria-label="Main navigation">{nav.filter(item => (!item.manage || manages(business?.role)) && (!item.analytics || analyzes(business?.role))).map(item => <Link key={item.href} href={item.href} onClick={() => setMobile(false)} className={pathname === item.href ? "nav-link active" : "nav-link"} aria-current={pathname === item.href ? "page" : undefined}><item.icon size={18}/>{item.label}{pathname === item.href && <span className="nav-dot"/>}</Link>)}</nav>
      <div className="sidebar-bottom"><a className="learn-card" href={process.env.NEXT_PUBLIC_DOCS_URL ?? "http://localhost:4321"} target="_blank" rel="noreferrer"><Leaf size={20}/><strong>See how it all connects</strong><span>Explore the architecture map <ArrowUpRight size={14}/></span></a><Link href="/account" className="account-link"><span className="avatar">{user.displayName.slice(0,1).toUpperCase()}</span><span><strong>{user.displayName}</strong><small>{business?.role.toLowerCase() ?? "Your account"}</small></span></Link><button className="text-button logout" onClick={() => void logout().catch(e => setError(e.message))}><LogOut size={15}/> Sign out</button></div>
    </aside><div className="main-shell"><header className="topbar"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobile(true)}><Menu/></button><div className="breadcrumb">Workspace <span>/</span> <strong>{nav.find(n => n.href === pathname)?.label ?? "Your account"}</strong></div><div className="topbar-actions"><div className="location-picker"><MapPin size={16}/><label htmlFor="location-select" className="sr-only">Active location</label><select id="location-select" value={locationId} onChange={e => {const selected=e.target.value;setLocationId(selected);saveWorkspacePreference(user.id,{businessId,locationId:selected});}}>{locations.filter(l => !l.archivedAt).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}{!locations.some(l => !l.archivedAt) && <option value="">No active location</option>}</select><ChevronDown size={13}/></div><button title="Refresh workspace" aria-label="Refresh workspace" className="icon-button" onClick={refresh}><RefreshCw size={17}/></button><Link href="/account" className="avatar small" aria-label="Your account">{user.displayName.slice(0,1).toUpperCase()}</Link></div></header>
      <main id="main"><ErrorBox error={error} retry={refresh}/>{pathname === "/account" && !business ? children : loading && !business ? <Loading/> : !business ? <div className="welcome panel"><span className="welcome-icon"><Sprout size={40}/></span><div className="eyebrow">A FRESH START</div><h1>Good food. Less waste.<br/>A clearer picture.</h1><p>Create a workspace to connect your inventory, sales and everyday decisions.</p><Button onClick={() => setCreate(true)}><Plus size={18}/>Create your first business</Button><div className="welcome-steps"><span>01 · Set up your business</span><span>02 · Add your products</span><span>03 · Start tracking stock</span></div></div> : <Context.Provider value={{business,locations,location,locationId,path,refresh,revision,toast:setNotification}}><div key={`${businessId}:${locationId}`}>{children}</div></Context.Provider>}</main><footer className="app-footer"><span><Activity size={13}/> Food Intelligence Platform</span><span>Better decisions. Less waste.</span></footer></div>{createDialog}{notification && <div className="toast" role="status"><Leaf size={18}/>{notification}<button aria-label="Dismiss notification" onClick={() => setNotification("")}><X size={16}/></button></div>}</div>;
}
