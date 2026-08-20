import { useEffect, useRef, useState } from "react";
export function useAudioMonitor(enabled:boolean){
  const [level,setLevel]=useState(0),[noiseFloor,setNoiseFloor]=useState(0),[active,setActive]=useState(false),[error,setError]=useState("");
  const raf=useRef<number|null>(null);
  useEffect(()=>{
    if(!enabled){setActive(false);setLevel(0);return;}
    let stream:MediaStream|undefined,ctx:AudioContext|undefined,analyser:AnalyserNode|undefined,cancel=false;const samples:number[]=[];
    if (!navigator.mediaDevices?.getUserMedia) { setError("microphone-monitor-unavailable"); return; }
    navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}}).then(s=>{
      if(cancel){s.getTracks().forEach(t=>t.stop());return;}stream=s;ctx=new AudioContext();analyser=ctx.createAnalyser();analyser.fftSize=512;ctx.createMediaStreamSource(s).connect(analyser);const data=new Uint8Array(analyser.fftSize);setActive(true);
      const tick=()=>{if(!analyser)return;analyser.getByteTimeDomainData(data);let sum=0;for(const v of data){const n=(v-128)/128;sum+=n*n;}const rms=Math.sqrt(sum/data.length);const pct=Math.min(100,Math.round(rms*420));setLevel(pct);if(samples.length<80){samples.push(pct);const sorted=[...samples].sort((a,b)=>a-b);setNoiseFloor(sorted[Math.floor(sorted.length*.35)]||0);}raf.current=requestAnimationFrame(tick);};tick();
    }).catch(e=>setError(e?.name||"microphone-monitor-unavailable"));
    return()=>{cancel=true;if(raf.current)cancelAnimationFrame(raf.current);stream?.getTracks().forEach(t=>t.stop());ctx?.close().catch(()=>{});setActive(false);};
  },[enabled]);
  return {level,noiseFloor,active,error};
}
