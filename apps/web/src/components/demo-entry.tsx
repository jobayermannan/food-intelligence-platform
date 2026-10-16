"use client";
import { useEffect, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { useSession } from "./session";
import { Button, ErrorBox, LoadingSkeleton } from "./ui";

export function DemoEntry() {
  const { startDemo } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const initialize = async () => { setStarted(true); setError(null); try { await startDemo(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to prepare the demo."); setStarted(false); } };
  useEffect(() => { void initialize(); }, []);
  return <main className="standalone demo-entry"><div className="panel"><Sparkles size={28} aria-hidden="true"/><div className="eyebrow">RECRUITER DEMO</div><h1>Preparing your demo workspace</h1><p>The demo may take a few seconds to initialize on your first visit. Please wait while we prepare your workspace.</p><p className="notice">This is a shared demonstration environment. Please do not enter personal or confidential information. Demo data may be reset periodically.</p>{started && !error && <LoadingSkeleton label="Loading Green Spoon Demo Café"/>}{error && <><ErrorBox error={error}/><Button onClick={() => void initialize()}><RefreshCw size={16}/>Try again</Button></>}</div></main>;
}
