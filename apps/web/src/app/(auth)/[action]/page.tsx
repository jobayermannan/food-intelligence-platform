import { notFound } from "next/navigation";
import { AuthScreen, type AuthMode } from "@/components/auth-screen";
export function generateStaticParams() { return ["login","register","verify","forgot-password","reset-password"].map(action => ({action})); }
export default async function Page({params}: {params:Promise<{action:string}>}) { const {action} = await params; if (!["login","register","verify","forgot-password","reset-password"].includes(action)) notFound(); return <AuthScreen mode={action as AuthMode}/>; }
