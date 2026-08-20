import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AudioLines, BookOpenText, ChevronLeft, ChevronRight, CircleHelp, Download, ExternalLink,
  FileUp, Gauge, Headphones, LibraryBig, Mic, MicOff, Moon, Pencil, Plus, RotateCcw,
  Search, Settings2, Sparkles, SpellCheck2, Sun, Trash2, Volume2, Waves, X, ShieldCheck, UserRoundPlus, Radio, Activity
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { useDisplayPublisher } from "../hooks/useDisplayChannel";
import { useCatalogStore } from "../hooks/useCatalogStore";
import { accuracy, progress } from "../recognition/scoring";
import { matchRecitation } from "../recognition/RecitationMatcher";
import { matchSpelling } from "../recognition/SpellingMatcher";
import { useAudioMonitor } from "../hooks/useAudioMonitor";
import type { Mode, Theme } from "../types/speech";
import type { ScriptureItem, WordItem } from "../types/catalog";

type RecitationDraft = { title: string; reference: string; expected: string; sourceId?: string };
type SpellingDraft = { title: string; reference: string; expected: string; sourceId?: string };
type EditorState = { mode: Mode; kind: "add" | "edit"; id?: string } | null;

const recognitionLocales = [
  { value: "en-NG", label: "English · Nigeria", short: "NG" },
  { value: "en-GB", label: "English · United Kingdom", short: "UK" },
  { value: "en-US", label: "English · United States", short: "US" },
  { value: "en-ZA", label: "English · South Africa", short: "ZA" },
];

export default function ControlPage() {
  const catalogue = useCatalogStore();
  const firstScripture = catalogue.scriptures[0] || { id: "", reference: "", title: "Bible Recitation", text: "" };
  const firstWord = catalogue.words[0] || { id: "", word: "", category: "General", hint: "" };
  const [mode, setMode] = useState<Mode>("recitation");
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("tribevox.theme") as Theme) || "light");
  const [recognitionLang, setRecognitionLang] = useState(() => localStorage.getItem("tribevox.recognition.lang") || "en-NG");
  const [recitation, setRecitation] = useState<RecitationDraft>({ title: "Bible Recitation", reference: firstScripture.reference, expected: firstScripture.text, sourceId: firstScripture.id });
  const [spelling, setSpelling] = useState<SpellingDraft>({ title: "Spelling Bee", reference: firstWord.category, expected: firstWord.word, sourceId: firstWord.id });
  const [query, setQuery] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(true);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(null);
  const [importError, setImportError] = useState("");
  const [confidenceThreshold, setConfidenceThreshold] = useState(() => Number(localStorage.getItem("tribevox.confidence") || .35));
  const [noiseGuard, setNoiseGuard] = useState(() => localStorage.getItem("tribevox.noiseGuard") !== "false");
  const [turn, setTurn] = useState(1);
  const importRef = useRef<HTMLInputElement>(null);

  const speech = useSpeechRecognition(recognitionLang, { confidenceThreshold });
  const audio = useAudioMonitor(noiseGuard && speech.listening);
  const tts = useSpeechSynthesis();
  const publish = useDisplayPublisher();
  const current = mode === "recitation" ? recitation : spelling;
  const combined = `${speech.finalText} ${speech.interim}`.trim();

  const intelligence = useMemo(() => mode === "recitation"
    ? matchRecitation(current.expected, combined, current.reference, { interim: Boolean(speech.interim), skipTolerance: 6, recoveryLookahead: 4 })
    : matchSpelling(current.expected, combined, Boolean(speech.interim)),
    [mode, current.expected, current.reference, combined, speech.interim]
  );
  const tokens = intelligence.tokens;
  const score = accuracy(tokens);
  const completion = progress(tokens);
  const confidencePct = speech.confidence == null ? null : Math.round(speech.confidence * 100);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("tribevox.theme", theme);
  }, [theme]);
  useEffect(() => { localStorage.setItem("tribevox.recognition.lang", recognitionLang); }, [recognitionLang]);
  useEffect(() => { localStorage.setItem("tribevox.confidence", String(confidenceThreshold)); }, [confidenceThreshold]);
  useEffect(() => { localStorage.setItem("tribevox.noiseGuard", String(noiseGuard)); }, [noiseGuard]);

  useEffect(() => {
    publish({ mode, title: current.title, reference: current.reference, expected: current.expected, transcript: speech.finalText, interim: speech.interim, accuracy: score, progress: completion, confidence: confidencePct ?? undefined, listening: speech.listening, tokens, intelligence: intelligence.metrics, turn, updatedAt: Date.now() });
  }, [mode, current.title, current.reference, current.expected, speech.finalText, speech.interim, score, completion, confidencePct, speech.listening, tokens, intelligence.metrics, turn, publish]);

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

  const chooseScripture = (item: ScriptureItem) => {
    speech.stop(); speech.reset();
    setRecitation({ title: "Bible Recitation", reference: item.reference, expected: item.text, sourceId: item.id });
  };
  const chooseWord = (item: WordItem) => {
    speech.stop(); speech.reset();
    setSpelling({ title: "Spelling Bee", reference: item.category, expected: item.word, sourceId: item.id });
  };

  const editCurrent = () => {
    const id = current.sourceId;
    if (id) setEditor({ mode, kind: "edit", id });
    else setEditor({ mode, kind: "add" });
  };

  const removeItem = (itemMode: Mode, id: string) => {
    if (!window.confirm(`Delete this ${itemMode === "recitation" ? "scripture" : "spelling word"} from your local catalogue?`)) return;
    if (itemMode === "recitation") {
      catalogue.deleteScripture(id);
      if (recitation.sourceId === id) setRecitation({ title: "Bible Recitation", reference: "", expected: "" });
    } else {
      catalogue.deleteWord(id);
      if (spelling.sourceId === id) setSpelling({ title: "Spelling Bee", reference: "", expected: "" });
    }
    speech.reset();
  };

  const handleImport = async (file?: File) => {
    if (!file) return;
    setImportError("");
    try { await catalogue.importJson(file); }
    catch (e) { setImportError(e instanceof Error ? e.message : "Could not import catalogue."); }
    if (importRef.current) importRef.current.value = "";
  };

  const currentLocale = recognitionLocales.find(x => x.value === recognitionLang) || recognitionLocales[0];
  const selectedVoice = tts.voices.find(v => v.name === tts.voiceName);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><AudioLines size={20}/></span>
          <div><strong>TribeVox</strong><small>Live voice engine</small></div>
        </div>
        <div className="top-actions">
          <div className="mode-switch" aria-label="Mode">
            <button className={mode === "recitation" ? "active" : ""} onClick={() => switchMode("recitation")}><BookOpenText size={16}/> Recitation</button>
            <button className={mode === "spelling" ? "active" : ""} onClick={() => switchMode("spelling")}><SpellCheck2 size={16}/> Spelling</button>
          </div>
          <button className="icon-btn" title="Toggle theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}</button>
          <Link className="btn display-btn" to="/display" target="_blank"><ExternalLink size={16}/> Backdrop</Link>
        </div>
      </header>

      <main className="workspace">
        <section className="command-hero">
          <div className="hero-main">
            <span className="eyebrow"><Sparkles size={14}/> Twelve Tribes Family Games · vocal operations</span>
            <h1>Recognition that <em>keeps its place.</em></h1>
            <p>V4 intelligence tracks the participant through pauses, repetitions, stutters, skipped words, verse transitions and browser recognition restarts without losing the expected sequence.</p>
          </div>
          <div className="hero-status-card">
            <span className="status-orb"><Waves size={22}/></span>
            <div><small>Recognition intelligence · V4</small><strong>{speech.supported ? "Engine ready" : "Unavailable"}</strong><span>{currentLocale.label} · Turn {turn} · {catalogue.scriptures.length + catalogue.words.length} items</span></div>
          </div>
        </section>

        <section className={`console-grid ${catalogOpen ? "" : "library-closed"}`}>
          <aside className={`catalog panel ${catalogOpen ? "" : "collapsed"}`}>
            <div className="panel-head">
              {catalogOpen ? <div className="panel-title"><span className="soft-icon"><LibraryBig size={18}/></span><div><span className="section-kicker">Session library</span><h2>{mode === "recitation" ? "Scriptures" : "Spelling words"}</h2></div></div> : null}
              <button className="collapse-handle" title={catalogOpen ? "Collapse library" : "Open library"} onClick={() => setCatalogOpen(v => !v)}>
                {catalogOpen ? <ChevronLeft size={18}/> : <><LibraryBig size={18}/><ChevronRight size={16}/></>}
              </button>
            </div>

            {catalogOpen && <>
              <div className="library-actions">
                <button className="btn accent-soft" onClick={() => setEditor({ mode, kind: "add" })}><Plus size={16}/> Add {mode === "recitation" ? "scripture" : "word"}</button>
                <button className="icon-btn compact" title="Import catalogue JSON" onClick={() => importRef.current?.click()}><FileUp size={16}/></button>
                <button className="icon-btn compact" title="Export catalogue JSON" onClick={catalogue.exportJson}><Download size={16}/></button>
                <input ref={importRef} type="file" hidden accept="application/json,.json" onChange={e => handleImport(e.target.files?.[0])}/>
              </div>
              {importError && <div className="inline-error">{importError}</div>}
              <div className="search-box"><Search size={16}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={mode === "recitation" ? "Search reference or verse…" : "Search word or category…"}/></div>
              <div className="catalog-list">
                <AnimatePresence mode="popLayout">
                  {mode === "recitation" ? filteredScriptures.map(item => (
                    <motion.div layout initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}} key={item.id} className={`catalog-row ${current.sourceId === item.id ? "selected" : ""}`}>
                      <button className="catalog-item" onClick={() => chooseScripture(item)}>
                        <span className="catalog-icon"><BookOpenText size={16}/></span><span><strong>{item.reference}</strong><small>{item.text.slice(0, 76)}{item.text.length > 76 ? "…" : ""}</small></span>
                      </button>
                      <div className="row-tools"><button title="Edit" onClick={() => setEditor({ mode: "recitation", kind: "edit", id: item.id })}><Pencil size={14}/></button><button title="Delete" onClick={() => removeItem("recitation", item.id)}><Trash2 size={14}/></button></div>
                    </motion.div>
                  )) : filteredWords.map(item => (
                    <motion.div layout initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}} key={item.id} className={`catalog-row ${current.sourceId === item.id ? "selected" : ""}`}>
                      <button className="catalog-item" onClick={() => chooseWord(item)}>
                        <span className="catalog-icon"><SpellCheck2 size={16}/></span><span><strong>{item.word}</strong><small>{item.category} · {item.hint}</small></span>
                      </button>
                      <div className="row-tools"><button title="Edit" onClick={() => setEditor({ mode: "spelling", kind: "edit", id: item.id })}><Pencil size={14}/></button><button title="Delete" onClick={() => removeItem("spelling", item.id)}><Trash2 size={14}/></button></div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <div className="library-foot"><span><Gauge size={14}/> Persistent local JSON store</span><button onClick={catalogue.resetToSeed}>Restore seed data</button></div>
            </>}
          </aside>

          <section className="session panel">
            <div className="session-head">
              <div className="session-title-wrap">
                <span className="session-icon">{mode === "recitation" ? <BookOpenText size={21}/> : <SpellCheck2 size={21}/>}</span>
                <div><span className="section-kicker">Live session</span><h2>{current.title}</h2><p>{speech.supported ? `${currentLocale.label} recognition is ready.` : "Speech recognition is not available in this browser."}</p></div>
              </div>
              <div className="session-actions">
                <button className="btn ghost" onClick={resetSession}><RotateCcw size={16}/> Reset attempt</button>
                <button className="btn ghost warm" onClick={nextParticipant}><UserRoundPlus size={16}/> New participant</button>
                <button className={speech.listening ? "btn stop" : "btn primary"} disabled={!speech.supported} onClick={speech.listening ? speech.stop : speech.start}>
                  {speech.listening ? <MicOff size={17}/> : <Mic size={17}/>} {speech.listening ? "Stop listening" : "Start listening"}
                </button>
              </div>
            </div>

            <div className="metrics-row intelligence-metrics">
              <div className="metric"><span>Recitation accuracy</span><strong>{score}%</strong><div className="meter"><i style={{width:`${score}%`}}/></div><small>{score >= 95 ? "Strong sequence match" : score ? "Live authoritative score" : "Awaiting attempt"}</small></div>
              <div className="metric"><span>Sequence progress</span><strong>{completion}%</strong><div className="meter"><i style={{width:`${completion}%`}}/></div><small>{mode === "recitation" && intelligence.metrics.currentVerse ? `Tracking verse ${intelligence.metrics.currentVerse}` : completion === 100 ? "Sequence complete" : "Position locked"}</small></div>
              <div className="metric"><span>Speech confidence</span><strong>{confidencePct == null ? "—" : `${confidencePct}%`}</strong><div className="meter confidence"><i style={{width:`${confidencePct || 0}%`}}/></div><small>{speech.rejectedLowConfidence ? `${speech.rejectedLowConfidence} low-confidence result(s) gated` : "Unknown confidence is never auto-rejected"}</small></div>
              <div className="metric status"><span>Engine state</span><strong><i className={speech.listening ? "live-dot" : "idle-dot"}/>{speech.listening ? "Tracking" : completion === 100 ? "Complete" : "Ready"}</strong><small>{speech.restartCount ? `${speech.restartCount} automatic recognition recovery` : "Automatic restart armed"}</small></div>
            </div>
            <div className="intelligence-strip">
              <span><ShieldCheck size={15}/><b>{intelligence.metrics.ignoredRepetitions}</b> repetitions/stutters ignored</span>
              <span><Radio size={15}/><b>{intelligence.metrics.ignoredNoise}</b> filler/noise insertions ignored</span>
              <span><Activity size={15}/><b>{intelligence.metrics.recoveries}</b> sequence recoveries</span>
              <span><Gauge size={15}/><b>{intelligence.metrics.skippedWords}</b> skipped words detected</span>
            </div>

            <div className="control-strip v4-controls">
              <label><span>Recognition accent</span><select value={recognitionLang} onChange={e => { speech.stop(); speech.reset(); setRecognitionLang(e.target.value); }}>{recognitionLocales.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}</select></label>
              <label className="threshold-control"><span>Confidence gate <b>{Math.round(confidenceThreshold*100)}%</b></span><input type="range" min="0" max="0.8" step="0.05" value={confidenceThreshold} onChange={e=>setConfidenceThreshold(Number(e.target.value))}/></label>
              <button className={`btn voice-settings ${noiseGuard ? "active" : ""}`} onClick={()=>setNoiseGuard(v=>!v)}><ShieldCheck size={16}/> Noise guard {noiseGuard ? "on" : "off"}</button>
              {mode === "spelling" && <button className={`btn voice-settings ${voiceOpen ? "active" : ""}`} onClick={() => setVoiceOpen(v => !v)}><Settings2 size={16}/> Voice lab</button>}
            </div>
            <div className="audio-health">
              <div><span>Mic activity</span><div className="audio-meter"><i style={{width:`${audio.level}%`}}/></div><b>{audio.level}%</b></div>
              <div><span>Estimated room floor</span><div className="audio-meter quiet"><i style={{width:`${audio.noiseFloor}%`}}/></div><b>{audio.noiseFloor}%</b></div>
              <p><CircleHelp size={14}/> Noise guard requests browser echo cancellation, noise suppression and automatic gain control, then the V4 matcher ignores likely filler/repetition insertions. Web Speech still controls its own microphone processing.</p>
            </div>

            <AnimatePresence initial={false}>
              {mode === "spelling" && voiceOpen && <motion.div className="voice-lab" initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}}>
                <div className="voice-lab-head"><span className="soft-icon violet"><Headphones size={18}/></span><div><strong>Pronunciation voice lab</strong><small>Controls apply to browser text-to-speech only.</small></div></div>
                <div className="voice-grid">
                  <label><span>Voice model</span><select value={tts.voiceName} onChange={e => tts.setVoiceName(e.target.value)}>{tts.voices.length ? tts.voices.map(v => <option key={`${v.name}-${v.lang}`} value={v.name}>{v.name} · {v.lang}</option>) : <option>Browser default voice</option>}</select></label>
                  <label><span>Speed <b>{tts.rate.toFixed(2)}×</b></span><input type="range" min="0.55" max="1.3" step="0.05" value={tts.rate} onChange={e => tts.setRate(Number(e.target.value))}/></label>
                  <label><span>Pitch <b>{tts.pitch.toFixed(2)}</b></span><input type="range" min="0.7" max="1.3" step="0.05" value={tts.pitch} onChange={e => tts.setPitch(Number(e.target.value))}/></label>
                </div>
                <div className="voice-note"><span>{selectedVoice ? `${selectedVoice.name} · ${selectedVoice.lang}` : "Default system voice"}</span><span>{selectedVoice?.localService ? "Local voice" : "Browser/online voice"}</span></div>
              </motion.div>}
            </AnimatePresence>

            <div className="editor-grid">
              <div className="field-group">
                <label>{mode === "recitation" ? "Scripture reference" : "Category / label"}</label>
                <input className="input" value={current.reference} onChange={(e) => mode === "recitation" ? setRecitation(v => ({...v, reference:e.target.value, sourceId: undefined})) : setSpelling(v => ({...v, reference:e.target.value, sourceId: undefined}))}/>
              </div>
              <div className="field-group wide">
                <label>{mode === "recitation" ? "Expected KJV text" : "Expected word"}</label>
                {mode === "recitation" ? <textarea className="input expected-input" rows={5} value={current.expected} onChange={(e) => setRecitation(v => ({...v, expected:e.target.value, sourceId: undefined}))}/> : <div className="spelling-entry"><input className="input word-input" value={current.expected} onChange={(e) => setSpelling(v => ({...v, expected:e.target.value, sourceId: undefined}))}/><button className="btn pronounce" disabled={!current.expected.trim() || tts.speaking} onClick={() => tts.speak(current.expected)}>{tts.speaking ? <AudioLines size={16}/> : <Volume2 size={16}/>} {tts.speaking ? "Speaking…" : "Pronounce"}</button>{tts.speaking && <button className="icon-btn" onClick={tts.stop} title="Stop pronunciation"><X size={16}/></button>}</div>}
              </div>
            </div>
            <div className="editor-actions-inline"><span>{current.sourceId ? "Loaded from your catalogue" : "This session has unsaved changes"}</span><button className="btn text-btn" onClick={editCurrent}><Pencil size={15}/> {current.sourceId ? "Edit catalogue item" : "Save to catalogue"}</button></div>

            {speech.error && <div className="notice">Recognition notice: <strong>{speech.error}</strong>. Check microphone permission and try again.</div>}

            <div className="recognition-stage">
              <div className="stage-head"><span>Stabilised live transcript</span><small>{speech.listening ? `Streaming · ${speech.interim ? "interim result active" : "waiting for next phrase"}` : "Waiting for speech"}</small></div>
              <div className={`transcript ${!combined ? "empty" : ""}`}>{combined ? <><span>{speech.finalText}</span>{speech.interim && <span className="interim-text"> {speech.interim}</span>}</> : "Recognised speech will appear here as the participant speaks…"}</div>
            </div>

            <div className="tracker-block">
              <div className="stage-head"><span>Intelligent sequence tracker</span><small><b className="legend correct-dot"/> matched <b className="legend wrong-dot"/> missed / wrong <b className="legend pending-dot"/> not reached</small></div>
              <div className={`tracker ${mode === "spelling" ? "letters" : ""}`}>
                {tokens.map((t, i) => <motion.span layout initial={{opacity:0,scale:.94}} animate={{opacity:1,scale:1}} transition={{duration:.16}} key={`${t.expected}-${i}`} className={`token ${t.status}`} title={t.actual ? `Heard: ${t.actual}` : "Not reached yet"}>{t.expected}</motion.span>)}
              </div>
            </div>
          </section>
        </section>
      </main>

      <AnimatePresence>{editor && <CatalogueEditor editor={editor} words={catalogue.words} scriptures={catalogue.scriptures} onClose={() => setEditor(null)} onSave={(payload) => {
        if (editor.mode === "spelling") {
          const p = payload as Omit<WordItem,"id">;
          if (editor.kind === "edit" && editor.id) { catalogue.updateWord(editor.id, p); chooseWord({ id: editor.id, ...p }); }
          else { const added = catalogue.addWord(p); chooseWord(added); }
        } else {
          const p = payload as Omit<ScriptureItem,"id">;
          if (editor.kind === "edit" && editor.id) { catalogue.updateScripture(editor.id, p); chooseScripture({ id: editor.id, ...p }); }
          else { const added = catalogue.addScripture(p); chooseScripture(added); }
        }
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
