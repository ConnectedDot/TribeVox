import { useCallback, useEffect, useState } from "react";
export type ElevenMetrics = { tier:string; status:string; used:number; limit:number; remaining:number; percentUsed:number; resetAt:number|null; billingPeriod?:string|null };
export function useElevenLabsMetrics() {
  const [data,setData] = useState<ElevenMetrics|null>(null); const [error,setError] = useState(""); const [loading,setLoading] = useState(true);
  const refresh = useCallback(async()=>{ setLoading(true); setError(""); try { const r=await fetch("/api/elevenlabs-metrics",{cache:"no-store"}); const p=await r.json(); if(!r.ok) throw new Error(p.error||"Could not load usage"); setData(p); } catch(e){setError(e instanceof Error?e.message:"Could not load usage");} finally{setLoading(false);} },[]);
  useEffect(()=>{refresh();},[refresh]);
  return {data,error,loading,refresh};
}
