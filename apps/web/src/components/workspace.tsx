"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Plus, Sprout } from "lucide-react";
import { api } from "@/lib/api";
import type { Business, Location } from "@/lib/models";
import { readWorkspacePreference, saveWorkspacePreference, selectBusinessId, selectLocationId, workspaceBootPending } from "@/lib/workspace-preference";
import { useSession } from "./session";
import { ShellView } from "./shell-view";
import { ActionForm, BootLoader, Button, ErrorBox, Field, LoadingSkeleton, Modal, value } from "./ui";
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
export function WorkspaceShell({children}: {children: ReactNode}) {
  const {user,ready,error:sessionError,restore,logout} = useSession(); const router = useRouter(), pathname = usePathname();
  const userId = user?.id, selectionUserId = useRef<string | null>(null), selectedBusinessId = useRef("");
  const [businesses, setBusinesses] = useState<Business[]>([]), [businessesUserId,setBusinessesUserId] = useState<string | null>(null), [businessId, setBusinessId] = useState(""), [locations,setLocations] = useState<Location[]>([]), [locationId,setLocationId] = useState("");
  const [loading,setLoading] = useState(true), [selectionReady,setSelectionReady] = useState(false), [error,setError] = useState<string | null>(null), [revision,setRevision] = useState(0), [create,setCreate] = useState(false), [notification,setNotification] = useState("");
  const availableBusinesses = businessesUserId === userId ? businesses : [];
  const business = availableBusinesses.find(b => b.id === businessId), location = business ? locations.find(l => l.id === locationId) : undefined;
  const refresh = useCallback(() => setRevision(v => v+1), []);
  const resetDemo = async () => {
    if (!window.confirm("Reset the shared demo workspace? Your demo changes will be discarded and the fictional sample data will be restored.")) return;
    await api("/demo/reset", {method:"POST"});
    refresh(); setNotification("Demo workspace reset. Sample data has been restored.");
  };
  useEffect(() => { if (ready && !user && !sessionError) router.replace("/login"); },[ready,user,sessionError,router]);
  useEffect(() => {
    if (!userId) return;
    const sameUser = selectionUserId.current === userId;
    selectionUserId.current = userId;
    if (!sameUser) {selectedBusinessId.current=""; setSelectionReady(false); setBusinesses([]); setBusinessesUserId(null); setBusinessId(""); setLocations([]); setLocationId("");}
    const controller = new AbortController(); setLoading(true); setError(null);
    api<Business[]>("/businesses",{signal:controller.signal}).then(rows => {
      if (controller.signal.aborted) return;
      const saved = readWorkspacePreference(userId);
      const selected = selectBusinessId(rows, saved ? saved.businessId : sameUser ? businessId : "");
      selectedBusinessId.current = selected;
      setBusinesses(rows); setBusinessesUserId(userId); setBusinessId(selected);
      if (!selected) setSelectionReady(true);
      if (!saved || saved.businessId !== selected) saveWorkspacePreference(userId,{businessId:selected,locationId:""});
    }).catch(e => {if (!controller.signal.aborted) {setError(e.message); setSelectionReady(true);}}).finally(() => {if (!controller.signal.aborted) setLoading(false);});
    return () => controller.abort();
  },[userId,revision]);
  useEffect(() => {
    setLocations([]); setLocationId(""); if (!businessId || !userId || businessesUserId !== userId) return;
    const controller = new AbortController();
    api<Location[]>(`/businesses/${businessId}/locations`,{signal:controller.signal}).then(rows => {
      if (controller.signal.aborted || selectedBusinessId.current !== businessId) return;
      const saved = readWorkspacePreference(userId);
      const selected = selectLocationId(rows,saved?.businessId === businessId ? saved.locationId : "");
      setLocations(rows); setLocationId(selected); saveWorkspacePreference(userId,{businessId,locationId:selected}); setSelectionReady(true);
    }).catch(e => {if (!controller.signal.aborted) {setError(e.message); setSelectionReady(true);}});
    return () => controller.abort();
  },[businessId,userId,businessesUserId]);
  // Re-read locations after edits without resetting the user's current selection.
  useEffect(() => { if (!businessId || !revision || !userId || businessesUserId !== userId) return; const controller = new AbortController(); api<Location[]>(`/businesses/${businessId}/locations`,{signal:controller.signal}).then(rows => {if (controller.signal.aborted || selectedBusinessId.current !== businessId) return; const saved = readWorkspacePreference(userId); const selected = selectLocationId(rows,saved?.businessId === businessId ? saved.locationId : locationId); setLocations(rows); setLocationId(selected); saveWorkspacePreference(userId,{businessId,locationId:selected});}).catch(e => {if (!controller.signal.aborted) setError(e.message);}); return () => controller.abort(); },[businessId,revision,userId,businessesUserId]);
  useEffect(() => { if (!notification) return; const id = setTimeout(() => setNotification(""),5000); return () => clearTimeout(id); },[notification]);
  const path = (suffix: string, scoped = false) => `/businesses/${businessId}${suffix}${scoped && locationId ? `${suffix.includes("?") ? "&" : "?"}locationId=${locationId}` : ""}`;
  if (workspaceBootPending(ready,Boolean(user),Boolean(sessionError),selectionReady)) return <BootLoader/>;
  if (sessionError) return <main className="standalone"><ErrorBox error={sessionError} retry={restore}/><Link href="/login">Go to login</Link></main>;
  if (!user) return null;
  const createDialog = create && <Modal title="Create your business" description="A separate workspace with its own products, stock and team." onClose={() => setCreate(false)}><ActionForm submit="Create workspace" onCancel={() => setCreate(false)} onSubmit={async (data,key) => {
    const created = await api<Business>("/businesses",{method:"POST",body:{name:value(data,"name"),timezone:value(data,"timezone"),currency:value(data,"currency"),defaultTaxRate:Number(value(data,"tax"))/100,requestKey:key}});
    setBusinesses(list => [...list,{...created,role:"OWNER"}]); selectedBusinessId.current=created.id; setBusinessId(created.id); saveWorkspacePreference(user.id,{businessId:created.id,locationId:""}); setCreate(false); refresh(); setNotification("Business created. Add your first location next."); router.push("/settings");
  }}><Field name="name" label="Business name" required maxLength={120} placeholder="e.g. The Green Table"/><div className="form-grid"><Field name="timezone" label="Business timezone" defaultValue={Intl.DateTimeFormat().resolvedOptions().timeZone} required hint="IANA timezone, e.g. Asia/Dhaka"/><Field name="currency" label="Currency code" defaultValue="BDT" pattern="[A-Za-z]{3}" maxLength={3} required/></div><Field name="tax" label="Default sales tax (%)" type="number" min="0" max="100" step="0.01" defaultValue="0" required hint="Applied by the server to sales after discounts."/></ActionForm></Modal>;
  const content = <>
    <ErrorBox error={error} retry={refresh}/>
    {pathname === "/account" && !business ? children
      : loading && !business ? <LoadingSkeleton label="Loading workspace"/>
      : !business ? <div className="welcome panel">
          <span className="welcome-icon"><Sprout size={38} aria-hidden="true"/></span>
          <div className="eyebrow">GET STARTED</div>
          <h1>Create your first business</h1>
          <p>Set up your workspace, then add a location and products to begin tracking stock.</p>
          <Button onClick={() => setCreate(true)}><Plus size={18} aria-hidden="true"/>Create business</Button>
          <div className="welcome-steps"><span>01 · Business</span><span>02 · Location</span><span>03 · Catalog and stock</span></div>
        </div>
      : <Context.Provider value={{business,locations,location,locationId,path,refresh,revision,toast:setNotification}}>
          <div key={businessId + ":" + locationId}>{children}</div>
        </Context.Provider>}
  </>;
  return <>
    <ShellView
      user={user}
      business={business}
      businesses={availableBusinesses}
      locations={locations}
      businessId={businessId}
      locationId={locationId}
      onBusinessChange={selected => {
        selectedBusinessId.current=selected;
        setBusinessId(selected);
        setLocationId("");
        saveWorkspacePreference(user.id,{businessId:selected,locationId:""});
      }}
      onLocationChange={selected => {
        setLocationId(selected);
        saveWorkspacePreference(user.id,{businessId,locationId:selected});
      }}
      onCreateBusiness={() => setCreate(true)}
      onRefresh={refresh}
      onLogout={() => void logout().catch(e => setError(e.message))}
      onResetDemo={() => void resetDemo().catch(e => setError(e.message))}
      notification={notification}
      onDismissNotification={() => setNotification("")}
    >{content}</ShellView>
    {createDialog}
  </>;
}
