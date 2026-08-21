import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, AudioLines, BarChart3, BookOpenText, ChevronLeft, ChevronRight, CircleHelp,
  Download, ExternalLink, FileUp, Gauge, Headphones, LibraryBig, Mic, MicOff, Moon,
  Pencil, Plus, RefreshCw, RotateCcw, Search, Settings2, ShieldCheck, Sparkles,
  SpellCheck2, Sun, Trash2, UserRoundPlus, Volume2, Waves, X
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useElevenLabsRecognition } from "../hooks/useElevenLabsRecognition";
import { useElevenLabsTTS } from "../hooks/useElevenLabsTTS";
import { useElevenLabsMetrics } from "../hooks/useElevenLabsMetrics";
import { useDisplayPublisher } from "../hooks/useDisplayChannel";
import { useCatalogStore } from "../hooks/useCatalogStore";
import { accuracy, progress } from "../recognition/scoring";
import { matchRecitation } from "../recognition/RecitationMatcher";
import { matchSpelling } from "../recognition/SpellingMatcher";
import type { Mode, Theme } from "../types/speech";
import type { ScriptureItem, WordItem } from "../types/catalog";

type RecitationDraft = { title: string; reference: string; expected: string; sourceId?: string };
type SpellingDraft = { title: string; reference: string; expected: string; sourceId?: string };
type EditorState = { mode: Mode; kind: "add" | "edit"; id?: string } | null;

export default function ControlPage() {
  const catalogue = useCatalogStore();
  const firstScripture = catalogue.scriptures[0] || { id: "", reference: "", title: "Bible Recitation", text: "" };
  const firstWord = catalogue.words[0] || { id: "", word: "", category: "General", hint: "" };
  const [mode, setMode] = useState<Mode>("recitation");
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("tribevox.theme") as Theme) || "dark");
  const [recitation, setRecitation] = useState<RecitationDraft>({ title: "Bible Recitation", reference: firstScripture.reference, expected: firstScripture.text, sourceId: firstScripture.id });
  const [spelling, setSpelling] = useState<SpellingDraft>({ title: "Spelling Bee", reference: firstWord.category, expected: firstWord.word, sourceId: firstWord.id });
  const [query, setQuery] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(true);
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(null);
  const [importError, setImportError] = useState("");
  const [turn, setTurn] = useState(1);
  const importRef = useRef<HTMLInputElement>(null);

  const speech = useElevenLabsRecognition();
  const tts = useElevenLabsTTS();
  const usage = useElevenLabsMetrics();
  const publish = useDisplayPublisher();
  const current = mode === "recitation" ? recitation : spelling;
  const combined = `${speech.finalText} ${speech.interim}`.trim();

  const intelligence = useMemo(() => mode === "recitation"
    ? matchRecitation(current.expected, combined, current.reference, { interim: Boolean(speech.interim), skipTolerance: 6, recoveryLookahead: 5 })
    : matchSpelling(current.expected, combined, Boolean(speech.interim)),
    [mode, current.expected, current.reference, combined, speech.interim]
  );
  const tokens = intelligence.tokens;
  const score = accuracy(tokens);
  const completion = progress(tokens);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("tribevox.theme", theme);
  }, [theme]);

  useEffect(() => {
    publish({ mode, title: current.title, reference: current.reference, expected: current.expected, transcript: speech.finalText, interim: speech.interim, accuracy: score, progress: completion, listening: speech.listening, tokens, intelligence: intelligence.metrics, turn, updatedAt: Date.now() });
  }, [mode, current.title, current.reference, current.expected, speech.finalText, speech.interim, score, completion, speech.listening, tokens, intelligence.metrics, turn, publish]);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    speech.stop(); speech.reset(); setQuery(""); setEditor(null); setMode(next);
  };
  const resetSession = () => { speech.stop(); speech.reset(); };
  const nextParticipant = () => { speech.stop(); tts.stop(); speech.reset(); setTurn(v => v + 1); };

  const filteredScriptures = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalogue.scriptures.filter(item => !q || `${item.reference} ${item.title} ${item.text}`.toLowerCase().includes(q));
  }, [query, catalogue.scriptures]);
  const filteredWords = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalogue.words.filter(item => !q || `${item.word} ${item.category} ${item.hint}`.toLowerCase().includes(q));
  }, [query, catalogue.words]);

  const chooseScripture = (item: ScriptureItem) => { speech.stop(); speech.reset(); setRecitation({ title: "Bible Recitation", reference: item.reference, expected: item.text, sourceId: item.id }); };
  const chooseWord = (item: WordItem) => { speech.stop(); speech.reset(); setSpelling({ title: "Spelling Bee", reference: item.category, expected: item.word, sourceId: item.id }); };
  const editCurrent = () => setEditor(current.sourceId ? { mode, kind: "edit", id: current.sourceId } : { mode, kind: "add" });

  const removeItem = (itemMode: Mode, id: string) => {
    if (!window.confirm(`Delete this ${itemMode === "recitation" ? "scripture" : "spelling word"} from your local catalogue?`)) return;
    if (itemMode === "recitation") { catalogue.deleteScripture(id); if (recitation.sourceId === id) setRecitation({ title: "Bible Recitation", reference: "", expected: "" }); }
    else { catalogue.deleteWord(id); if (spelling.sourceId === id) setSpelling({ title: "Spelling Bee", reference: "", expected: "" }); }
    speech.reset();
  };

  const handleImport = async (file?: File) => {
    if (!file) return; setImportError("");
    try { await catalogue.importJson(file); } catch (e) { setImportError(e instanceof Error ? e.message : "Could not import catalogue."); }
    if (importRef.current) importRef.current.value = "";
  };

  const usageReset = usage.data?.resetAt ? new Date(usage.data.resetAt).toLocaleDateString(undefined, { day:"numeric", month:"short" }) : "—";

  return (
    <div className="v5-shell">
      <header className="v5-topbar">
        <div className="v5-brand"><span className="v5-brandmark"><AudioLines size={18}/></span><strong>TribeVox</strong><span className="version-chip">V5</span></div>
        <div className="v5-search"><Search size={15}/><span>Recognition studio</span><kbd>⌘ K</kbd></div>
        <div className="v5-top-actions">
          <div className="engine-pill"><i className={speech.listening ? "live" : ""}/><span>Scribe v2 Realtime</span></div>
          <button className="v5-icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Toggle theme">{theme === "dark" ? <Sun size={17}/> : <Moon size={17}/>}</button>
          <Link className="v5-btn compact" to="/display" target="_blank"><ExternalLink size={15}/> Backdrop</Link>
        </div>
      </header>

      <div className={`v5-layout ${catalogOpen ? "library-open" : "library-closed"} ${insightsOpen ? "insights-open" : "insights-closed"}`}>
        <aside className={`v5-sidebar ${catalogOpen ? "" : "rail"}`}>
          <div className="side-section">
            <span className="side-caption">Studio</span>
            <button className={`side-link ${mode === "recitation" ? "active" : ""}`} onClick={() => switchMode("recitation")}><BookOpenText size={17}/>{catalogOpen && <span>Recitation</span>}</button>
            <button className={`side-link ${mode === "spelling" ? "active" : ""}`} onClick={() => switchMode("spelling")}><SpellCheck2 size={17}/>{catalogOpen && <span>Spelling</span>}</button>
          </div>
          <div className="side-section library-section">
            <div className="side-section-head">{catalogOpen && <span className="side-caption">Library</span>}<button onClick={()=>setCatalogOpen(v=>!v)} title={catalogOpen?"Collapse library":"Expand library"}>{catalogOpen?<ChevronLeft size={16}/>:<ChevronRight size={16}/>}</button></div>
            {catalogOpen && <>
              <div className="library-toolbar"><button onClick={() => setEditor({mode,kind:"add"})}><Plus size={15}/> Add</button><button onClick={()=>importRef.current?.click()} title="Import JSON"><FileUp size={15}/></button><button onClick={catalogue.exportJson} title="Export JSON"><Download size={15}/></button><input ref={importRef} hidden type="file" accept="application/json,.json" onChange={e=>handleImport(e.target.files?.[0])}/></div>
              {importError && <div className="side-error">{importError}</div>}
              <div className="side-search"><Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={mode === "recitation" ? "Find scripture…" : "Find word…"}/></div>
              <div className="v5-library-list">
                {mode === "recitation" ? filteredScriptures.map(item => <div key={item.id} className={`v5-library-item ${current.sourceId===item.id?"selected":""}`}>
                  <button className="library-main" onClick={()=>chooseScripture(item)}><span>{item.reference}</span><small>{item.text.slice(0,62)}{item.text.length>62?"…":""}</small></button><div><button onClick={()=>setEditor({mode:"recitation",kind:"edit",id:item.id})}><Pencil size={13}/></button><button onClick={()=>removeItem("recitation",item.id)}><Trash2 size={13}/></button></div>
                </div>) : filteredWords.map(item => <div key={item.id} className={`v5-library-item ${current.sourceId===item.id?"selected":""}`}>
                  <button className="library-main" onClick={()=>chooseWord(item)}><span>{item.word}</span><small>{item.category} · {item.hint}</small></button><div><button onClick={()=>setEditor({mode:"spelling",kind:"edit",id:item.id})}><Pencil size={13}/></button><button onClick={()=>removeItem("spelling",item.id)}><Trash2 size={13}/></button></div>
                </div>)}
              </div>
              <button className="restore-link" onClick={catalogue.resetToSeed}><RotateCcw size={13}/> Restore seed catalogue</button>
            </>}
          </div>
        </aside>

        <main className="v5-studio">
          <section className="studio-heading">
            <div><span className="studio-kicker"><Sparkles size={13}/> Twelve Tribes vocal operations</span><h1>{mode === "recitation" ? "Bible Recitation" : "Spelling Bee"}</h1><p>{mode === "recitation" ? "Sequence-aware live tracking that tolerates stutters, repetitions and verse transitions." : "Letter-by-letter competition tracking with corrections and repeat handling."}</p></div>
            <div className="session-actions">
              <button className="v5-btn ghost" onClick={resetSession}><RotateCcw size={15}/> Reset</button>
              <button className="v5-btn ghost" onClick={nextParticipant}><UserRoundPlus size={15}/> Turn {turn + 1}</button>
              <button className={`v5-btn ${speech.listening ? "danger" : "primary"}`} disabled={!speech.supported || speech.connecting} onClick={speech.listening ? speech.stop : speech.start}>{speech.listening?<MicOff size={16}/>:<Mic size={16}/>} {speech.connecting?"Connecting…":speech.listening?"Stop":"Start listening"}</button>
            </div>
          </section>

          <section className="live-stage-card">
            <div className="live-stage-top">
              <div className="stage-identity"><span className="stage-icon"><Waves size={18}/></span><div><small>LIVE RECOGNITION</small><strong>{current.reference || "Select content from the library"}</strong></div></div>
              <div className="stage-state"><i className={speech.listening?"live":""}/>{speech.listening?"Streaming":completion===100?"Complete":"Ready"}</div>
            </div>

            <div className="score-strip">
              <div><span>Accuracy</span><strong>{score}%</strong><small>{score>=95?"Strong match":score?"Live score":"Awaiting speech"}</small></div>
              <div><span>Progress</span><strong>{completion}%</strong><small>{intelligence.metrics.currentVerse?`Verse ${intelligence.metrics.currentVerse}`:"Sequence position"}</small></div>
              <div><span>Commit settle</span><strong>{speech.latencyMs!=null?`${speech.latencyMs}ms`:"—"}</strong><small>Last partial → committed</small></div>
              <div><span>Turn</span><strong>#{turn}</strong><small>{intelligence.metrics.recoveries} recoveries</small></div>
            </div>

            <div className="content-config-row">
              <label><span>{mode === "recitation" ? "Scripture reference" : "Category"}</span><input value={current.reference} onChange={e=>mode==="recitation"?setRecitation(v=>({...v,reference:e.target.value,sourceId:undefined})):setSpelling(v=>({...v,reference:e.target.value,sourceId:undefined}))}/></label>
              <div className="config-actions"><button className="text-action" onClick={editCurrent}><Pencil size={14}/>{current.sourceId?"Edit library item":"Save to library"}</button>{mode==="spelling"&&<button className="text-action" onClick={()=>setVoiceOpen(v=>!v)}><Headphones size={14}/>Voice settings</button>}</div>
            </div>

            {mode === "recitation" ? <textarea className="expected-v5" rows={4} value={current.expected} onChange={e=>setRecitation(v=>({...v,expected:e.target.value,sourceId:undefined}))}/> : <div className="spelling-word-row"><input className="expected-v5 word" value={current.expected} onChange={e=>setSpelling(v=>({...v,expected:e.target.value,sourceId:undefined}))}/><button className="v5-btn voice" disabled={!current.expected.trim()||tts.speaking} onClick={()=>tts.speak(current.expected)}><Volume2 size={16}/>{tts.speaking?"Generating…":"Pronounce"}</button>{tts.speaking&&<button className="v5-icon" onClick={tts.stop}><X size={15}/></button>}</div>}

            <AnimatePresence>{mode==="spelling"&&voiceOpen&&<motion.div className="voice-popover" initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
              <div><span>ElevenLabs voice</span><select value={tts.voiceId} onChange={e=>tts.setVoiceId(e.target.value)}>{tts.voices.map(v=><option key={v.voice_id} value={v.voice_id}>{v.name}{v.labels?.accent?` · ${v.labels.accent}`:""}</option>)}</select></div>
              <label><span>Speed <b>{tts.speed.toFixed(2)}×</b></span><input type="range" min="0.7" max="1.2" step="0.05" value={tts.speed} onChange={e=>tts.setSpeed(Number(e.target.value))}/></label>
              <small>{tts.limitedVoices?"Free-tier voice listing is limited; using available default voices.":"Voices loaded from your ElevenLabs workspace."}</small>
            </motion.div>}</AnimatePresence>

            {(speech.error || tts.error) && <div className="v5-notice">{speech.error || tts.error}</div>}

            <div className="transcript-area">
              <div className="area-head"><span>Live transcript</span><small>{speech.listening?"Scribe v2 Realtime · partial + committed":"Standing by"}</small></div>
              <div className={`transcript-v5 ${!combined?"empty":""}`}>{combined?<><span>{speech.finalText}</span>{speech.interim&&<mark> {speech.interim}</mark>}</>:"The participant transcript will flow here in real time…"}</div>
            </div>

            <div className="tracker-area">
              <div className="area-head"><span>Sequence intelligence</span><small>{intelligence.metrics.ignoredRepetitions} repeats ignored · {intelligence.metrics.skippedWords} skipped · {intelligence.metrics.ignoredNoise} noise/filler ignored</small></div>
              <div className={`tracker tracker-v5 ${mode==="spelling"?"letters":""}`}>{tokens.map((t,i)=><motion.span layout key={`${t.expected}-${i}`} className={`token ${t.status}`} title={t.actual?`Heard: ${t.actual}`:"Not reached"}>{t.expected}</motion.span>)}</div>
            </div>
          </section>
        </main>

        <aside className={`v5-insights ${insightsOpen?"":"closed"}`}>
          <div className="insights-head"><div><BarChart3 size={16}/>{insightsOpen&&<strong>Engine monitor</strong>}</div><button onClick={()=>setInsightsOpen(v=>!v)}>{insightsOpen?<ChevronRight size={16}/>:<ChevronLeft size={16}/>}</button></div>
          {insightsOpen&&<>
            <section className="engine-card eleven"><div className="engine-card-head"><span><AudioLines size={16}/> ElevenLabs</span><button onClick={usage.refresh} title="Refresh"><RefreshCw size={14}/></button></div><strong>Scribe v2 Realtime</strong><p>Primary speech engine</p><div className="engine-health"><i className={speech.listening?"live":""}/>{speech.listening?"Connected":"Ready to connect"}</div></section>
            <section className="usage-card"><div className="usage-title"><span>API usage</span><b>{usage.data?.tier?.toUpperCase()||"—"}</b></div>{usage.loading?<div className="metric-skeleton"/>:usage.error?<div className="usage-error"><strong>Usage metrics unavailable</strong><span>{usage.error}</span>{usage.error.toLowerCase().includes("user_read")&&<small>Edit the TribeVox API key in ElevenLabs and enable User → Read permission. Speech can continue without this permission; only the monitoring card is affected.</small>}</div>:<><div className="usage-big"><strong>{usage.data?.remaining.toLocaleString()}</strong><span>credits remaining</span></div><div className="usage-meter"><i style={{width:`${usage.data?.percentUsed||0}%`}}/></div><div className="usage-grid"><div><span>Used</span><b>{usage.data?.used.toLocaleString()}</b></div><div><span>Limit</span><b>{usage.data?.limit.toLocaleString()}</b></div><div><span>Reset</span><b>{usageReset}</b></div><div><span>Status</span><b>{usage.data?.status||"—"}</b></div></div></>}</section>
            <section className="intel-card"><span className="side-caption">Recognition intelligence</span><div><ShieldCheck size={15}/><span>Stutters ignored</span><b>{intelligence.metrics.ignoredRepetitions}</b></div><div><Activity size={15}/><span>Recoveries</span><b>{intelligence.metrics.recoveries}</b></div><div><Gauge size={15}/><span>Skipped words</span><b>{intelligence.metrics.skippedWords}</b></div><div><CircleHelp size={15}/><span>Noise/filler</span><b>{intelligence.metrics.ignoredNoise}</b></div></section>
            <section className="noise-card"><ShieldCheck size={16}/><div><strong>Noise guard active</strong><p>Echo cancellation, browser noise suppression and AGC are requested on the Scribe microphone stream.</p></div></section>
          </>}
        </aside>
      </div>

      <AnimatePresence>{editor && <CatalogueEditor editor={editor} words={catalogue.words} scriptures={catalogue.scriptures} onClose={() => setEditor(null)} onSave={(payload) => {
        if (editor.mode === "spelling") { const p = payload as Omit<WordItem,"id">; if (editor.kind === "edit" && editor.id) { catalogue.updateWord(editor.id,p); chooseWord({id:editor.id,...p}); } else chooseWord(catalogue.addWord(p)); }
        else { const p = payload as Omit<ScriptureItem,"id">; if (editor.kind === "edit" && editor.id) { catalogue.updateScripture(editor.id,p); chooseScripture({id:editor.id,...p}); } else chooseScripture(catalogue.addScripture(p)); }
        setEditor(null);
      }}/>}</AnimatePresence>
    </div>
  );
}

function CatalogueEditor({ editor, words, scriptures, onClose, onSave }: { editor: NonNullable<EditorState>; words: WordItem[]; scriptures: ScriptureItem[]; onClose: () => void; onSave: (payload: Omit<WordItem,"id"> | Omit<ScriptureItem,"id">) => void }) {
  const word = editor.mode === "spelling" && editor.id ? words.find(x => x.id === editor.id) : undefined;
  const scripture = editor.mode === "recitation" && editor.id ? scriptures.find(x => x.id === editor.id) : undefined;
  const [wordForm, setWordForm] = useState({ word: word?.word || "", category: word?.category || "General", hint: word?.hint || "" });
  const [scriptureForm, setScriptureForm] = useState({ reference: scripture?.reference || "", title: scripture?.title || scripture?.reference || "", text: scripture?.text || "" });
  const valid = editor.mode === "spelling" ? Boolean(wordForm.word.trim()) : Boolean(scriptureForm.reference.trim() && scriptureForm.text.trim());
  return <motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={onClose}>
    <motion.div className="catalog-modal" initial={{opacity:0,y:18,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:14,scale:.98}} onMouseDown={e => e.stopPropagation()}>
      <div className="modal-head"><div><span className="section-kicker">Catalogue manager</span><h3>{editor.kind === "edit" ? "Edit" : "Add"} {editor.mode === "spelling" ? "spelling word" : "scripture"}</h3></div><button className="icon-btn compact" onClick={onClose}><X size={17}/></button></div>
      {editor.mode === "spelling" ? <div className="modal-form">
        <label><span>Word</span><input autoFocus value={wordForm.word} onChange={e => setWordForm(v => ({...v,word:e.target.value}))} placeholder="e.g. necessary"/></label>
        <label><span>Category</span><input value={wordForm.category} onChange={e => setWordForm(v => ({...v,category:e.target.value}))} placeholder="General / Advanced"/></label>
        <label><span>Meaning / hint</span><textarea rows={3} value={wordForm.hint} onChange={e => setWordForm(v => ({...v,hint:e.target.value}))} placeholder="Short definition or cue"/></label>
      </div> : <div className="modal-form">
        <div className="two-col"><label><span>Reference</span><input autoFocus value={scriptureForm.reference} onChange={e => setScriptureForm(v => ({...v,reference:e.target.value,title:v.title || e.target.value}))} placeholder="John 3:16"/></label><label><span>Title</span><input value={scriptureForm.title} onChange={e => setScriptureForm(v => ({...v,title:e.target.value}))} placeholder="Optional display title"/></label></div>
        <label><span>KJV text</span><textarea rows={8} value={scriptureForm.text} onChange={e => setScriptureForm(v => ({...v,text:e.target.value}))} placeholder="Paste the complete expected passage…"/></label>
      </div>}
      <div className="modal-foot"><div><Sparkles size={15}/><span>Saved locally in JSON format in this browser and included in catalogue exports.</span></div><div><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!valid} onClick={() => onSave(editor.mode === "spelling" ? wordForm : scriptureForm)}><Plus size={16}/>{editor.kind === "edit" ? "Save changes" : "Add to catalogue"}</button></div></div>
    </motion.div>
  </motion.div>;
}
