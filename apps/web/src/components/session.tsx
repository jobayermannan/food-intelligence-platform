"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, refreshSession, setToken } from "@/lib/api";
import type { User } from "@/lib/models";
type Session = {user: User | null; ready: boolean; error: string | null; login: (email: string, password: string) => Promise<void>; logout: (all?: boolean) => Promise<void>; restore: () => void};
const Context = createContext<Session | null>(null);
export function SessionProvider({children}: {children: ReactNode}) {
  const [user, setUser] = useState<User | null>(null), [ready, setReady] = useState(false), [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const restore = useCallback(async () => {
    setReady(false); setError(null);
    try { setUser(await refreshSession() ? await api<User>("/auth/me") : null); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to restore session."); }
    finally { setReady(true); }
  }, []);
  useEffect(() => {
    void restore(); const expired = () => {setUser(null); setToken(null); router.replace("/login");};
    window.addEventListener("session-expired", expired);
    const channel = new BroadcastChannel("food-intelligence-auth");
    channel.onmessage = (event) => {if (event.data === "logout") expired();};
    return () => {window.removeEventListener("session-expired", expired); channel.close();};
  }, [restore, router]);
  const login = async (email: string, password: string) => {
    const result = await api<{accessToken: string}>("/auth/login", {method: "POST", public: true, body: {email,password}});
    setToken(result.accessToken); setUser(await api<User>("/auth/me")); setError(null); router.replace("/");
  };
  const logout = async (all = false) => {
    await api(`/auth/${all ? "logout-all" : "logout"}`, {method: "POST"});
    setToken(null); setUser(null); const channel = new BroadcastChannel("food-intelligence-auth"); channel.postMessage("logout"); channel.close(); router.replace("/login");
  };
  return <Context.Provider value={{user,ready,error,login,logout,restore}}>{children}</Context.Provider>;
}
export function useSession() { const session = useContext(Context); if (!session) throw new Error("Missing session provider"); return session; }
