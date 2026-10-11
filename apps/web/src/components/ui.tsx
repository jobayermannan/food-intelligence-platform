"use client";
import { useEffect, useId, useRef, useState, type ReactNode, type FormEvent, type Ref } from "react";
import { AlertCircle, ArrowUpRight, LoaderCircle, PackageOpen, X } from "lucide-react";
import { randomUuid } from "@/lib/uuid";
export function Button({children, variant = "primary", ...props}: React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?: "primary" | "secondary" | "ghost" | "danger"}) {
  return <button {...props} className={`button ${variant} ${props.className ?? ""}`}>{children}</button>;
}
export function IconButton({children, label, ref, ...props}: React.ButtonHTMLAttributes<HTMLButtonElement> & {children: ReactNode; label: string; ref?: Ref<HTMLButtonElement>}) {
  return <button {...props} ref={ref} type={props.type ?? "button"} aria-label={label} className={`icon-button ${props.className ?? ""}`}>{children}</button>;
}
export function Card({children, className = ""}: {children: ReactNode; className?: string}) {
  return <div className={`card ${className}`}>{children}</div>;
}
export function Skeleton({className = ""}: {className?: string}) {
  return <span className={`skeleton ${className}`} aria-hidden="true"/>;
}
export function LoadingSkeleton({label = "Loading content"}: {label?: string}) {
  return <div className="loading-skeleton" role="status" aria-label={label}><Skeleton className="skeleton-heading"/><Skeleton/><Skeleton/><Skeleton className="skeleton-short"/></div>;
}
export const MetricCard = Stat;
export const StatusBadge = Badge;
export const DataTable = Table;
export const EmptyState = Empty;
export const ErrorState = ErrorBox;
export const PageHeader = PageTitle;
export function Field({label, hint, ...props}: React.InputHTMLAttributes<HTMLInputElement> & {label: string; hint?: string}) {
  const id = useId(); return <label className="field" htmlFor={id}><span>{label}</span><input {...props} id={id}/>{hint && <small>{hint}</small>}</label>;
}
export function Select({label, children, ...props}: React.SelectHTMLAttributes<HTMLSelectElement> & {label: string}) {
  const id = useId(); return <label className="field" htmlFor={id}><span>{label}</span><select {...props} id={id}>{children}</select></label>;
}
export function Badge({children, tone = "neutral"}: {children: ReactNode; tone?: string}) { return <span className={`badge ${tone.toLowerCase()}`}>{children}</span>; }
export function ErrorBox({error, retry}: {error: string | null; retry?: () => void}) { return error ? <div className="error-box" role="alert"><AlertCircle size={18}/><span>{error}</span>{retry && <Button variant="ghost" onClick={retry}>Retry</Button>}</div> : null; }
export function DotWave({label="Loading content"}: {label?: string}) { return <span className="dot-wave" role="status" aria-label={label}>{[0,1,2,3,4].map(dot => <span key={dot} aria-hidden="true"/>)}</span>; }
export function BootLoader() { return <main className="boot-loader"><DotWave label="Loading application"/></main>; }
export function Loading() { return <div className="empty local-loading"><DotWave/></div>; }
export function Empty({title = "Nothing here yet", description, action}: {title?: string; description: string; action?: ReactNode}) { return <div className="empty"><PackageOpen size={32}/><h3>{title}</h3><p>{description}</p>{action}</div>; }
export function PageTitle({eyebrow, title, description, action}: {eyebrow?: string; title: string; description: string; action?: ReactNode}) { return <header className="page-title"><div><div className="eyebrow">{eyebrow ?? "YOUR OPERATIONS, CONNECTED"}</div><h1>{title}</h1><p>{description}</p></div><div className="actions">{action}</div></header>; }
export function Panel({title, subtitle, action, children, className = ""}: {title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string}) { return <section className={`panel ${className}`}>{title && <div className="panel-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>}{children}</section>; }
export function Stat({label, value, detail, icon, accent}: {label: string; value: ReactNode; detail: string; icon: ReactNode; accent?: boolean}) { return <div className={`stat ${accent ? "accent" : ""}`}><div className="stat-top"><span>{label}</span>{icon}</div><strong>{value}</strong><small>{detail}</small></div>; }
export function Table({headers, children, empty}: {headers: string[]; children: ReactNode; empty?: boolean}) { return empty ? <Empty description="Records will appear here once you add them."/> : <div className="table-scroll"><table><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
export function LimitNote({count, limit = 100}: {count: number; limit?: number}) { return <p className="table-note">{count} loaded record{count === 1 ? "" : "s"}{count >= limit ? ` · API limit of ${limit} reached. This is not the complete dataset.` : ""}</p>; }
export function Modal({title, description, children, onClose, busy, placement = "dialog"}: {title: string; description?: string; children: ReactNode; onClose: () => void; busy?: boolean; placement?: "dialog" | "drawer"}) {
  const dialog = useRef<HTMLDialogElement>(null), heading = useId();
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  return <dialog ref={dialog} aria-labelledby={heading} onCancel={e => {e.preventDefault(); if (!busy) onClose();}} className={`modal ${placement}`}><div className="modal-heading"><div><h2 id={heading}>{title}</h2>{description && <p>{description}</p>}</div><button className="icon-button" onClick={onClose} disabled={busy} aria-label="Close dialog"><X size={20}/></button></div>{children}</dialog>;
}
export function ActionForm({children, onSubmit, submit = "Save changes", onCancel, success}: {children: ReactNode; onSubmit: (data: FormData, key: string) => Promise<void>; submit?: string; onCancel?: () => void; success?: string}) {
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [done, setDone] = useState(false);
  const operation = useRef<{fingerprint: string; key: string} | null>(null);
  async function handle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(null); setDone(false);
    try {
      const data = new FormData(event.currentTarget), fingerprint = JSON.stringify([...data.entries()]);
      if (!operation.current || operation.current.fingerprint !== fingerprint) operation.current = {fingerprint, key: randomUuid()};
      await onSubmit(data, operation.current.key); operation.current = null; setDone(true);
    }
    catch (e) { setError(e instanceof Error ? e.message : "Something went wrong. Please retry."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={handle} className="form-stack"><fieldset disabled={busy}>{children}</fieldset><ErrorBox error={error}/>{done && success && <p className="success-box" role="status">{success}</p>}<div className="form-actions">{onCancel && <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>Cancel</Button>}<Button type="submit" disabled={busy}>{busy && <LoaderCircle size={16} className="spin"/>}{busy ? "Saving…" : submit}{!busy && <ArrowUpRight size={16}/>}</Button></div></form>;
}
export const value = (data: FormData, name: string) => String(data.get(name) ?? "").trim();
export const optional = (data: FormData, name: string) => value(data, name) || undefined;
