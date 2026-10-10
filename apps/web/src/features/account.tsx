"use client";
import Link from "next/link";
import { useState } from "react";
import { Copy, LogOut } from "lucide-react";
import { useSession } from "@/components/session";
import { Button,ErrorBox,PageTitle,Panel } from "@/components/ui";
export function Account() {
  const {user,logout}=useSession(),[copied,setCopied]=useState(false),[error,setError]=useState<string|null>(null);
  return <><PageTitle title="Your account" description="Your identity follows you across every business you belong to."/><Panel title="Profile"><div className="panel-body"><dl className="detail-list"><div><dt>Display name</dt><dd>{user?.displayName}</dd></div><div><dt>Email</dt><dd>{user?.email}</dd></div><div><dt>User ID · share with a business owner to join</dt><dd className="mono">{user?.id}</dd></div></dl><Button variant="secondary" onClick={async()=>{try{await navigator.clipboard.writeText(user!.id);setCopied(true);}catch{setError("Clipboard is unavailable. Select and copy the user ID above.");}}}><Copy size={14}/>{copied ? "Copied" : "Copy user ID"}</Button></div></Panel><Panel title="Session & security" subtitle="Sign out of every device if you no longer trust an active session."><div className="panel-body"><ErrorBox error={error}/><div className="actions"><Link className="button secondary" href="/forgot-password">Reset password</Link><Button variant="danger" onClick={()=>void logout(true).catch(e=>setError(e.message))}><LogOut size={15}/>Sign out all devices</Button></div></div></Panel></>;
}
