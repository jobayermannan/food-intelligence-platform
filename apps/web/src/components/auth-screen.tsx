"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownRight, CircleCheck, Leaf, PlayCircle, Sprout } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "./session";
import { ActionForm, Field, value } from "./ui";
export type AuthMode = "login" | "register" | "verify" | "forgot-password" | "reset-password";
const content: Record<AuthMode,{title:string;description:string;button:string}> = {
  login:{title:"Welcome back.",description:"Your business, a little clearer. Sign in to your workspace.",button:"Sign in to workspace"},
  register:{title:"Start with a fresh perspective.",description:"Create your account, verify your email, then set up your business.",button:"Create account"},
  verify:{title:"Make it official.",description:"Paste the verification token from your email to activate your account.",button:"Verify email"},
  "forgot-password":{title:"Let’s get you back in.",description:"We’ll send reset instructions if an eligible account exists.",button:"Send reset instructions"},
  "reset-password":{title:"A fresh start.",description:"Paste your emailed reset token and choose a new password.",button:"Reset password"},
};
export function DemoWorkspaceCta({onExplore}: {onExplore: () => void}) {
  return <div className="demo-workspace-cta">
    <button type="button" className="button secondary" onClick={onExplore}><PlayCircle size={16} aria-hidden="true"/>Explore Demo Workspace</button>
    <p>No setup required · Sample data</p>
  </div>;
}
export function AuthScreen({mode}: {mode:AuthMode}) {
  const {login} = useSession(), [done,setDone] = useState(false), copy = content[mode];
  const router = useRouter();
  return <div className="auth-shell"><aside className="auth-story"><Link className="brand" href="/login"><span className="brand-mark"><Sprout size={25}/></span><span>food<span className="brand-light">intelligence</span></span></Link><div className="auth-story-content"><div className="eyebrow">EVERY INGREDIENT COUNTS</div><h1>Less waste.<br/>More possibility.</h1><p>Bring your stock, sales and team together.<br/>See the bigger picture in every little detail.</p><div className="food-illustration" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="illustration-leaf"><Leaf size={95} strokeWidth={1}/></div><div className="illustration-label"><span className="live-dot"/> From stock to insight <ArrowDownRight size={18}/></div><span className="seed seed-one"/><span className="seed seed-two"/></div></div><small>Built for food businesses. Designed for everyday clarity.</small></aside>
    <main className="auth-main"><div className="auth-form"><div className="eyebrow">FOOD INTELLIGENCE PLATFORM</div><h2>{copy.title}</h2><p className="auth-description">{copy.description}</p>{done ? <div className="auth-success"><CircleCheck size={38}/><h3>{mode === "register" ? "Check your inbox" : mode === "forgot-password" ? "Check your email" : mode === "verify" ? "Email verified" : "Password updated"}</h3><p>{mode === "register" ? "If eligible, verification instructions were sent. Use the token in that email on the verification page." : mode === "forgot-password" ? "If eligible, reset instructions were sent. Use the token on the reset page." : "You can now sign in securely."}</p><Link className="button primary" href={mode === "register" ? "/verify" : mode === "forgot-password" ? "/reset-password" : "/login"}>Continue</Link></div> : <ActionForm submit={copy.button} onSubmit={async data => {
      const email = value(data,"email"), password = String(data.get("password") ?? "");
      if (mode === "login") {await login(email,password); return;}
      if (mode === "register" || mode === "reset-password") {if (password !== String(data.get("confirmation") ?? "")) throw new Error("Passwords do not match.");}
      const endpoint = mode === "verify" ? "verify-email" : mode;
      const body = mode === "register" ? {email,password,displayName:value(data,"displayName")} : mode === "verify" ? {token:value(data,"token")} : mode === "forgot-password" ? {email} : {token:value(data,"token"),password};
      await api(`/auth/${endpoint}`,{method:"POST",public:true,body}); setDone(true);
    }}>
      {mode === "register" && <Field label="Your name" name="displayName" autoComplete="name" maxLength={120} required/>}
      {["login","register","forgot-password"].includes(mode) && <Field label="Email address" name="email" type="email" autoComplete="email" placeholder="you@yourbusiness.com" required/>}
      {["verify","reset-password"].includes(mode) && <Field label="Email token" name="token" autoComplete="off" required spellCheck={false} hint="Copy only the token, without surrounding text."/>}
      {["login","register","reset-password"].includes(mode) && <Field label={mode === "reset-password" ? "New password" : "Password"} name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "login" ? 1 : 12} maxLength={200} hint={mode !== "login" ? "At least 12 characters. A memorable passphrase works well." : undefined}/>}
      {["register","reset-password"].includes(mode) && <Field label="Confirm password" name="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={200}/>}
      {mode === "login" && <div className="auth-forgot"><Link href="/forgot-password">Forgot password?</Link></div>}
    </ActionForm>}
    {mode === "login" && <DemoWorkspaceCta onExplore={() => router.push("/demo")}/>}<div className="auth-links">{mode === "login" ? <>New here? <Link href="/register">Create an account</Link><br/><Link href="/verify">Have a verification token?</Link></> : <Link href="/login">Back to sign in</Link>}</div></div><small className="auth-footer">Your ingredients. Your insights. Your next chapter.</small></main></div>;
}
