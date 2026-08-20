import { motion } from "framer-motion";
import { AudioLines, BookOpenText, SpellCheck2 } from "lucide-react";
import { useDisplaySubscriber } from "../hooks/useDisplayChannel";

export default function DisplayPage() {
  const s = useDisplaySubscriber();
  if (!s) return <div className="display-page"><div className="display-wait"><span className="display-logo"><AudioLines size={28}/></span><span className="display-brand">TRIBEVOX</span><h1>Backdrop standing by</h1><p>Open the control console to begin a live session.</p></div></div>;

  const reached = s.tokens.filter(t => t.status === "correct" || t.status === "incorrect" || t.status === "interim").length;
  const completion = s.progress ?? (s.tokens.length ? Math.round(reached / s.tokens.length * 100) : 0);
  return (
    <div className="display-page">
      <div className="display-glow one"/><div className="display-glow two"/>
      <motion.main className="display-card" initial={{opacity:0,y:18}} animate={{opacity:1,y:0}}>
        <div className="display-topline">
          <span className="display-brand-lockup"><span className="mini-mark"><AudioLines size={17}/></span><b>TRIBEVOX</b><i/> <span>{s.mode === "recitation" ? "Recitation" : "Spelling"}</span></span>
          <span className={`display-status ${s.listening ? "active" : ""}`}><i/>{s.listening ? "LIVE" : completion === 100 ? "COMPLETE" : "READY"}{s.turn ? ` · TURN ${s.turn}` : ""}</span>
        </div>
        <div className="display-heading">
          <span className="display-reference">{s.reference}</span>
          <h1>{s.mode === "spelling" ? s.expected : s.title}</h1>
          <div className="display-mode-pill">{s.mode === "recitation" ? <BookOpenText size={15}/> : <SpellCheck2 size={15}/>} {s.mode === "recitation" ? `Bible Recitation${s.intelligence?.currentVerse ? ` · Verse ${s.intelligence.currentVerse}` : ""}` : "Spelling Bee"}</div>
        </div>
        <div className={`tracker display-tracker ${s.mode === "spelling" ? "letters" : ""}`}>
          {s.tokens.map((t, i) => <motion.span layout key={`${t.expected}-${i}`} className={`token ${t.status}`}>{t.expected}</motion.span>)}
        </div>
        <footer className="display-footer">
          <div className="display-stat"><span>Accuracy</span><strong>{s.accuracy}%</strong></div>
          <div className="display-progress-wrap"><div className="display-progress"><i style={{width:`${completion}%`}}/></div><small>{completion}% complete</small></div>
          <div className="display-stat right"><span>{s.confidence != null ? "Speech confidence" : (s.mode === "spelling" ? "Letters tracked" : "Words tracked")}</span><strong>{s.confidence != null ? `${s.confidence}%` : reached}<small>{s.confidence != null ? "" : ` / ${s.tokens.length}`}</small></strong></div>
        </footer>
      </motion.main>
    </div>
  );
}
