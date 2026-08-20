import { useEffect, useMemo, useRef, useState } from "react";
import type { RecognitionSegment } from "../types/speech";

type SR = {
  continuous:boolean; interimResults:boolean; lang:string; maxAlternatives?:number;
  onstart?:any; onresult:any; onend:any; onerror:any; start:()=>void; stop:()=>void; abort?:()=>void;
};

type Options = { confidenceThreshold?: number };

export function useSpeechRecognition(lang="en-GB", options:Options={}) {
  const threshold = options.confidenceThreshold ?? .35;
  const [supported,setSupported]=useState(true), [listening,setListening]=useState(false);
  const [segments,setSegments]=useState<RecognitionSegment[]>([]), [interim,setInterim]=useState("");
  const [interimConfidence,setInterimConfidence]=useState<number|null>(null), [error,setError]=useState("");
  const [restartCount,setRestartCount]=useState(0), [rejectedLowConfidence,setRejectedLowConfidence]=useState(0);
  const [lastResultAt,setLastResultAt]=useState<number|null>(null);
  const ref=useRef<SR|null>(null), wantsListening=useRef(false), restartTimer=useRef<number|null>(null), startedAt=useRef<number|null>(null);
  const recentFinals=useRef<Array<{text:string;at:number}>>([]);

  useEffect(()=>{
    const C=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    if(!C){setSupported(false);return;} setSupported(true);
    const r:SR=new C(); r.continuous=true; r.interimResults=true; r.lang=lang; r.maxAlternatives=7;
    r.onstart=()=>{setListening(true);startedAt.current=performance.now();};
    r.onresult=(e:any)=>{
      let interimText="", interimConf:number|null=null;
      const additions:RecognitionSegment[]=[];
      for(let i=e.resultIndex;i<e.results.length;i++){
        const alternatives=Array.from(e.results[i] as any) as any[];
        alternatives.sort((a,b)=>(b.confidence||0)-(a.confidence||0));
        const best=alternatives[0]||e.results[i][0];
        const text=String(best?.transcript||"").replace(/\s+/g," ").trim();
        const conf=typeof best?.confidence==="number"&&best.confidence>0?best.confidence:null;
        if(!text)continue;
        if(e.results[i].isFinal){
          // Known low-confidence segments are held out of authoritative scoring.
          if(conf!==null && conf<threshold){setRejectedLowConfidence(v=>v+1);continue;}
          const now=Date.now();
          recentFinals.current=recentFinals.current.filter(x=>now-x.at<700);
          const duplicate=recentFinals.current.some(x=>x.text.toLowerCase()===text.toLowerCase());
          if(!duplicate){recentFinals.current.push({text,at:now});additions.push({text,confidence:conf,at:now});}
        }else{interimText += ` ${text}`; if(conf!==null) interimConf=Math.max(interimConf||0,conf);}
      }
      if(additions.length)setSegments(v=>[...v,...additions]);
      setInterim(interimText.trim());setInterimConfidence(interimConf);setLastResultAt(Date.now());setError("");
    };
    r.onerror=(e:any)=>{const code=e?.error||"recognition-error"; if(code!=="no-speech"&&code!=="aborted")setError(code); if(["not-allowed","service-not-allowed","audio-capture"].includes(code))wantsListening.current=false;};
    r.onend=()=>{
      setListening(false);
      if(wantsListening.current){
        restartTimer.current=window.setTimeout(()=>{try{r.start();setRestartCount(v=>v+1);}catch{}},90);
      }
    };
    ref.current=r;
    return()=>{wantsListening.current=false;if(restartTimer.current)clearTimeout(restartTimer.current);try{r.abort?.();}catch{}};
  },[lang,threshold]);

  const finalText=useMemo(()=>segments.map(s=>s.text).join(" ").replace(/\s+/g," ").trim(),[segments]);
  const confidence=useMemo(()=>{const c=segments.map(s=>s.confidence).filter((x):x is number=>x!==null);return c.length?c.reduce((a,b)=>a+b,0)/c.length:null;},[segments]);
  const start=()=>{if(!ref.current)return;wantsListening.current=true;setError("");try{ref.current.start();}catch{}};
  const stop=()=>{wantsListening.current=false;if(restartTimer.current)clearTimeout(restartTimer.current);try{ref.current?.stop();}catch{}setListening(false);setInterim("");setInterimConfidence(null);};
  const reset=()=>{setSegments([]);setInterim("");setInterimConfidence(null);setError("");setRestartCount(0);setRejectedLowConfidence(0);setLastResultAt(null);recentFinals.current=[];};
  const latencyMs = lastResultAt && startedAt.current ? Math.max(0, Math.round(lastResultAt - (Date.now()-performance.now()+startedAt.current))) : null;
  return {supported,listening,finalText,interim,error,lang,start,stop,reset,segments,confidence,interimConfidence,restartCount,rejectedLowConfidence,lastResultAt,latencyMs};
}
