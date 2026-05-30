import { useState, useRef, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "./firebase";

// ── Palette & design tokens ───────────────────────────────────────────────────
const T = {
  paper:       "#FFFDF5",
  paperCard:   "#F5EDD6",
  paperHover:  "#EDE4C8",
  border:      "rgba(139,105,20,0.15)",
  borderStrong:"rgba(139,105,20,0.30)",
  ink:         "#2C2412",
  inkMuted:    "#6B5830",
  inkFaint:    "#A08C5A",
  amber:       "#C8891A",
  amberDark:   "#8B6914",
  gradBtn:     "linear-gradient(135deg,#C8891A,#E8A838)",
  gradLogo:    "linear-gradient(135deg,#8B6914,#C8891A)",
  urgent:      "#B85C4A", urgentBg: "#F0E0DA", urgentText: "#7A3528",
  week:        "#5B82A0", weekBg:   "#E2E8EE", weekText:   "#2F4A60",
  backlog:     "#A09880", backlogBg:"#EDE9DD", backlogText:"#5C5440",
  successBg:   "#EEF2E8", successText:"#3A4A2A", successBorder:"rgba(90,120,70,0.2)",
  newspaceBg:  "#EAF0F5", newspaceText:"#2A3A4A", newspaceBorder:"rgba(70,100,130,0.2)",
  errorBg:     "#F5EDE8", errorText:"#7A2A1A", errorBorder:"rgba(184,92,74,0.25)",
};

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  { id:"pro",   label:"Vie pro",           icon:"briefcase" },
  { id:"perso", label:"Vie perso",         icon:"home"      },
  { id:"idees", label:"Idées & Créativité",icon:"lightbulb" },
];
const ONBOARDING_SPACES = {
  pro:   ["Projets en cours","Clients / Comptes","Recrutement","Administratif pro","Formation & Veille"],
  perso: ["Admin & Papiers","Santé","Shopping & Achats","Sorties & Loisirs","Maison & Travaux","Voyages","Finances perso","Sport & Bien-être"],
  idees: ["Créations & Art","Lectures & Podcasts","Apprentissage"],
};
const ONBOARDING_DEFAULTS = ["Projets en cours","Admin & Papiers","Santé","Shopping & Achats","Sorties & Loisirs"];

const PRIO_CONFIG = {
  urgent:  { label:"Urgent",        color:T.urgent,  bg:T.urgentBg,  text:T.urgentText  },
  week:    { label:"Cette semaine", color:T.week,    bg:T.weekBg,    text:T.weekText    },
  backlog: { label:"Plus tard",     color:T.backlog, bg:T.backlogBg, text:T.backlogText },
};
const PRIO_ORDER = { urgent:0, week:1, backlog:2 };
const PRIOS = ["urgent","week","backlog"];
const CAT_COLORS = [T.amber,T.amberDark,"#4A7A5A","#5B82A0","#8B7A6A","#7A5A8A","#6A7A8A","#7A6A4A"];
const CAT_ICONS_LIST = ["briefcase","home","lightbulb","palette","rocket","book","target","leaf","bolt","plane","music","heart"];

function generateId() { return Math.random().toString(36).slice(2,9); }

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const ICONS = {
  brain:      <g><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></g>,
  briefcase:  <g><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/></g>,
  home:       <g><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/><path d="M10 21v-6h4v6"/></g>,
  lightbulb:  <g><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.8 1 1.5 1 2.5v2h6v-2c0-1 .3-1.7 1-2.5A6 6 0 0 0 12 3Z"/></g>,
  bell:       <g><path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 18a2 2 0 0 0 4 0"/></g>,
  search:     <g><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></g>,
  mic:        <g><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></g>,
  check:      <g><path d="m5 12 5 5 9-11"/></g>,
  plus:       <g><path d="M12 5v14M5 12h14"/></g>,
  arrowRight: <g><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></g>,
  arrowLeft:  <g><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></g>,
  rotateCw:   <g><path d="M21 12a9 9 0 1 1-3.5-7.1"/><path d="M21 4v5h-5"/></g>,
  sparkle:    <g><path d="M12 3v6M12 15v6M3 12h6M15 12h6"/><path d="M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/></g>,
  pencil:     <g><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></g>,
  move:       <g><path d="M5 9l-3 3 3 3"/><path d="M19 9l3 3-3 3"/><path d="M2 12h20"/><path d="M9 5l3-3 3 3"/><path d="M15 19l-3 3-3-3"/><path d="M12 2v20"/></g>,
  trash:      <g><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></g>,
  palette:    <g><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></g>,
  rocket:     <g><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></g>,
  book:       <g><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></g>,
  target:     <g><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></g>,
  leaf:       <g><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></g>,
  bolt:       <g><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></g>,
  key:        <g><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></g>,
  plane:      <g><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2l3.9 3.9L2.1 15l4.2 4.2 5.3-3.6 3.9 3.9 1.3-4.3z"/></g>,
  music:      <g><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></g>,
  heart:      <g><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></g>,
};
function Icon({ name, size=16, stroke, strokeWidth=1.5 }) {
  const g = ICONS[name];
  if (!g) return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke||"currentColor"} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/></svg>;
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={stroke||"currentColor"} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round">{g}</svg>
  );
}

// ── AI functions ──────────────────────────────────────────────────────────────
async function classifyWithClaude(text, spaces, categories, apiKey) {
  const spaceList = spaces.map(p => {
    const cat = categories.find(c => c.id === p.category);
    const examples = p.tasks.slice(-3).map(t => t.text).join(", ");
    const hint = examples ? ` | tâches existantes: "${examples}"` : "";
    return `- id: ${p.id}, nom: "${p.name}", catégorie: ${cat?.label || p.category}${hint}`;
  }).join("\n");

  const prompt = `Tu es un assistant de productivité. Analyse ce texte et extrais les tâches.

Espaces disponibles:
${spaceList}

Catégories: ${categories.map(c => `${c.id} (${c.label})`).join(", ")}

Texte: "${text}"

Règles:
- PAR DÉFAUT : 1 prompt = 1 tâche. Regroupe en une phrase claire. Découpe SEULEMENT si l'utilisateur utilise une virgule entre deux actions distinctes, "+" / "et", OU un retour à la ligne — chaque ligne = une tâche distincte.
- MATCHING D'ESPACE :
  · BON MATCH : le sujet de la tâche correspond vraiment à l'espace → utilise cet espace
  · MAUVAIS MATCH : ne pas forcer, proposer un newSpace
  · Si les tâches existantes d'un espace ressemblent sémantiquement → utilise cet espace
- Si aucun espace ne correspond vraiment → mets spaceId à null et propose un newSpace générique
- Un newSpace doit être un DOMAINE LARGE, jamais la tâche elle-même
- PRIORITÉ : 1) "!" en fin = urgent  2) mots temporels ("ce soir","demain" = urgent, "lundi","semaine" = week)  3) déduction (vague = backlog)
- reminder: marqueur temporel précis ou null

Réponds UNIQUEMENT en JSON valide, sans markdown:
{
  "tasks": [{ "text": "tâche", "spaceId": "id ou null", "priority": "urgent|week|backlog", "reminder": "texte ou null" }],
  "newSpaces": [{ "name": "Nom large", "category": "id catégorie", "tasks": [{"text":"tâche","priority":"backlog","reminder":null}] }]
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:1000, messages:[{role:"user",content:prompt}] }),
  });
  const data = await res.json();
  const raw = data.content?.[0]?.text || "{}";
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g,"").trim());
    if (parsed.tasks) parsed.tasks = parsed.tasks.map(t => ({...t, spaceId: t.spaceId||t.projectId||null}));
    if (parsed.newProjects) parsed.newSpaces = parsed.newSpaces||parsed.newProjects;
    return parsed;
  } catch { return {tasks:[],newSpaces:[]}; }
}

async function buildFocusWithClaude(spaces, categories, apiKey) {
  const all = spaces.flatMap(p => p.tasks.filter(t=>!t.done).map(t => ({
    id:t.id, text:t.text, priority:t.priority, reminder:t.reminder, createdAt:t.createdAt,
    spaceName:p.name, spaceId:p.id, spaceCategory:p.category,
  })));
  if (!all.length) return [];
  const prompt = `Choisis les 3 meilleures tâches à faire aujourd'hui.
Tâches: ${JSON.stringify(all)}
Date: ${new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}
Critères: 1) rappels proches 2) urgent 3) week en fin de semaine 4) tâches qui traînent 5) équilibre pro/perso 6) jamais 3 du même espace
Réponds UNIQUEMENT en JSON: { "focus": [{ "id": "...", "reason": "max 10 mots" }] }`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST", headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:400,messages:[{role:"user",content:prompt}]}),
  });
  const data = await res.json();
  try {
    const result = JSON.parse((data.content?.[0]?.text||"{}").replace(/```json|```/g,"").trim());
    return (result.focus||[]).map(f=>{const t=all.find(x=>x.id===f.id);return t?{...t,reason:f.reason}:null;}).filter(Boolean);
  } catch {
    return [...all.filter(t=>t.priority==="urgent").slice(0,2),...all.filter(t=>t.priority==="week").slice(0,1)].slice(0,3);
  }
}

// ── Global styles ─────────────────────────────────────────────────────────────
const GLOBAL_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: ${T.paper}; color: ${T.ink}; font-family: 'DM Sans','Helvetica Neue',sans-serif; -webkit-font-smoothing: antialiased; min-height: 100vh; }
  textarea, input, select { resize: none; outline: none; border: none; background: transparent; color: inherit; font-family: inherit; }
  textarea::placeholder, input::placeholder { color: ${T.inkFaint}; opacity: 1; }
  button { cursor: pointer; border: none; background: none; color: inherit; font-family: inherit; }
  ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(200,137,26,0.35); border-radius: 3px; }
  .task-row:hover .task-act { opacity: 1 !important; }
  .space-card-wrap:hover .space-del { opacity: 1 !important; }
  @keyframes slideUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes waveBar { 0%,100% { transform:scaleY(0.4); } 50% { transform:scaleY(1); } }
  @keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  .label-up { text-transform: uppercase; letter-spacing: 0.12em; color: ${T.amberDark}; font-weight: 600; font-size: 11px; }
  @media (max-width: 599px) { .hint-desktop { display: none !important; } }
  @media (min-width: 600px) { .header-tabs-mobile { display: none !important; } .bottom-nav { display: none !important; } }
  @media (max-width: 599px) { .header-tabs-desktop { display: none !important; } .header-tabs-mobile { display: none !important; } .main-content { padding-bottom: 72px !important; } }
`;

// ── InlineTitle ───────────────────────────────────────────────────────────────
function InlineTitle({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef(null);
  useEffect(()=>{ if(editing){ setDraft(value); inputRef.current?.select(); } },[editing]);
  const commit = () => { const t=draft.trim(); if(t&&t!==value) onSave(t); setEditing(false); };
  if (editing) return (
    <div style={{display:"flex",alignItems:"center",gap:8,flex:1}}>
      <input ref={inputRef} value={draft} onChange={e=>setDraft(e.target.value)}
        onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();commit();}if(e.key==="Escape")setEditing(false);}}
        style={{fontSize:19,fontWeight:600,letterSpacing:"-0.02em",color:T.ink,background:"transparent",borderBottom:`1px solid ${T.amber}`,padding:"0 2px",flex:1}}/>
      <button onMouseDown={e=>{e.preventDefault();commit();}} style={{fontSize:12,padding:"3px 10px",borderRadius:8,background:T.gradBtn,color:"white",fontWeight:500,flexShrink:0}}>✓</button>
      <button onMouseDown={e=>{e.preventDefault();setEditing(false);}} style={{fontSize:12,padding:"3px 8px",borderRadius:8,background:T.paperHover,color:T.inkMuted,border:`1px solid ${T.border}`,flexShrink:0}}>✕</button>
    </div>
  );
  return (
    <div style={{fontSize:19,fontWeight:600,letterSpacing:"-0.02em",display:"flex",alignItems:"center",gap:8,color:T.ink}}>
      {value}
      <button onClick={e=>{e.stopPropagation();setEditing(true);}} style={{color:T.paperHover,padding:"2px 4px",borderRadius:4,transition:"color 0.15s"}}
        onMouseEnter={e=>e.currentTarget.style.color=T.amber} onMouseLeave={e=>e.currentTarget.style.color=T.paperHover}>
        <Icon name="pencil" size={14} />
      </button>
    </div>
  );
}

// ── TaskRow (space detail) ────────────────────────────────────────────────────
function TaskRow({ task, space, allSpaces, onToggle, onDelete, onMove, onChangePriority, onEditText }) {
  const [showPrio, setShowPrio] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.text);
  const inputRef = useRef(null);
  const cfg = PRIO_CONFIG[task.priority] || PRIO_CONFIG.backlog;
  const others = allSpaces.filter(p=>p.id!==space.id);
  useEffect(()=>{ if(editing) inputRef.current?.focus(); },[editing]);
  const commit = () => { if(draft.trim()&&draft.trim()!==task.text) onEditText(space.id,task.id,draft.trim()); else setDraft(task.text); setEditing(false); };

  return (
    <div className="task-row" style={{background:task.done?"transparent":T.paperCard,border:`1px solid ${task.done?"transparent":T.border}`,borderRadius:10,marginBottom:6,overflow:"hidden",transition:"all 0.15s"}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px"}}>
        <button onClick={()=>onToggle(space.id,task.id)} style={{width:18,height:18,borderRadius:"50%",flexShrink:0,marginTop:2,border:`1.5px solid ${task.done?cfg.color:T.borderStrong}`,background:task.done?cfg.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
          {task.done&&<Icon name="check" size={10} stroke="white" strokeWidth={2.5}/>}
        </button>
        <div style={{flex:1}}>
          {editing?(
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <input ref={inputRef} value={draft} onChange={e=>setDraft(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();commit();}if(e.key==="Escape"){setDraft(task.text);setEditing(false);}}}
                style={{flex:1,fontSize:14,color:T.ink,background:T.paper,border:`1px solid ${T.amber}`,borderRadius:6,padding:"2px 8px"}}/>
              <button onMouseDown={e=>{e.preventDefault();commit();}} style={{fontSize:11,padding:"2px 8px",borderRadius:8,background:T.gradBtn,color:"white",fontWeight:500}}>✓</button>
              <button onMouseDown={e=>{e.preventDefault();setDraft(task.text);setEditing(false);}} style={{fontSize:11,padding:"2px 6px",borderRadius:8,background:T.paperHover,color:T.inkMuted,border:`1px solid ${T.border}`}}>✕</button>
            </div>
          ):(
            <div onDoubleClick={()=>{if(!task.done){setEditing(true);setDraft(task.text);}}} title="Double-clic pour modifier"
              style={{fontSize:14,color:task.done?T.inkFaint:T.ink,textDecoration:task.done?"line-through":"none",cursor:task.done?"default":"text",lineHeight:1.4}}>{task.text}</div>
          )}
          {task.reminder&&<div style={{fontSize:11,color:T.amber,marginTop:3,display:"flex",alignItems:"center",gap:4}}><Icon name="bell" size={11}/>{task.reminder}</div>}
        </div>
        {!task.done&&(
          <div style={{display:"flex",gap:4,alignItems:"center"}}>
            <button className="task-act" onClick={()=>{setShowPrio(s=>!s);setShowMove(false);}} style={{fontSize:11,padding:"2px 7px",borderRadius:8,opacity:0,transition:"opacity 0.15s",border:`1px solid ${showPrio?cfg.color:T.border}`,color:cfg.text,background:showPrio?cfg.bg:"transparent"}}>
              <span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:cfg.color,marginRight:4,verticalAlign:"middle"}}/>
              {cfg.label}
            </button>
            <button className="task-act" onClick={()=>{setShowMove(s=>!s);setShowPrio(false);}} style={{opacity:0,transition:"opacity 0.15s",color:T.inkMuted,padding:"2px 5px"}}>
              <Icon name="move" size={13}/>
            </button>
            <button className="task-act" onClick={()=>onDelete(space.id,task.id)} style={{opacity:0,transition:"opacity 0.15s",color:T.urgent,padding:"2px 5px"}}>
              <Icon name="trash" size={13}/>
            </button>
          </div>
        )}
      </div>
      {showPrio&&(
        <div style={{paddingLeft:40,paddingRight:12,paddingBottom:10,display:"flex",gap:5,flexWrap:"wrap"}}>
          {PRIOS.map(p=>{const c=PRIO_CONFIG[p];const active=task.priority===p;return(
            <button key={p} onClick={()=>{onChangePriority(space.id,task.id,p);setShowPrio(false);}}
              style={{fontSize:11,padding:"3px 10px",borderRadius:12,border:`1px solid ${active?c.color:T.border}`,background:active?c.bg:"transparent",color:active?c.text:T.inkMuted,fontWeight:active?600:400}}>
              <span style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:c.color,marginRight:5,verticalAlign:"middle"}}/>
              {c.label}
            </button>
          );})}
        </div>
      )}
      {showMove&&others.length>0&&(
        <div style={{paddingLeft:40,paddingRight:12,paddingBottom:10,display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:11,color:T.inkFaint}}>→</span>
          {others.map(p=>(
            <button key={p.id} onClick={()=>{onMove(task.id,space.id,p.id);setShowMove(false);}}
              style={{fontSize:11,padding:"3px 10px",borderRadius:12,background:T.paperHover,border:`1px solid ${T.border}`,color:T.inkMuted,transition:"all 0.15s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=T.amber;e.currentTarget.style.color=T.amberDark;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.inkMuted;}}
            >{p.name}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── AllTasksView ──────────────────────────────────────────────────────────────
function AllTasksView({ spaces, categories, onToggle, onDelete, onChangePriority, onMove, onGoSpace, onEditText }) {
  const [filterPrio, setFilterPrio] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [showDone, setShowDone] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [prioPicking, setPrioPicking] = useState(null);
  const editRef = useRef(null);

  useEffect(()=>{ if(editingId) editRef.current?.select(); },[editingId]);
  const commitEdit = (task) => {
    if(editDraft.trim()&&editDraft.trim()!==task.text) onEditText(task.spaceId,task.id,editDraft.trim());
    setEditingId(null);
  };

  const allTasks = spaces.flatMap(p=>p.tasks.map(t=>({...t,spaceName:p.name,spaceId:p.id,spaceCategory:p.category})));
  const counts = {urgent:0,week:0,backlog:0};
  allTasks.filter(t=>!t.done).forEach(t=>{if(counts[t.priority]!==undefined)counts[t.priority]++;});

  const filtered = allTasks.filter(t=>{
    if(!showDone&&t.done) return false;
    if(filterPrio!=="all"&&t.priority!==filterPrio) return false;
    if(filterCat!=="all"&&t.spaceCategory!==filterCat) return false;
    if(search&&!t.text.toLowerCase().includes(search.toLowerCase())&&!t.spaceName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const sorted = [...filtered].sort((a,b)=>{
    if(a.done!==b.done) return a.done?1:-1;
    return (PRIO_ORDER[a.priority]??2)-(PRIO_ORDER[b.priority]??2);
  });

  const filterDefs = [
    {id:"all",    label:`Tout · ${allTasks.filter(t=>!t.done).length}`, withDot:false},
    {id:"urgent", label:`Urgent · ${counts.urgent}`,      withDot:true},
    {id:"week",   label:`Cette semaine · ${counts.week}`, withDot:true},
    {id:"backlog",label:`Plus tard · ${counts.backlog}`,  withDot:true},
  ];

  return (
    <div style={{maxWidth:660,margin:"0 auto",padding:"28px 20px"}}>
      <div style={{position:"relative",marginBottom:14}}>
        <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:T.inkFaint,display:"flex"}}><Icon name="search" size={15}/></span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher une tâche ou un espace…"
          style={{width:"100%",padding:"11px 12px 11px 36px",borderRadius:12,background:T.paperCard,border:`1px solid ${T.border}`,fontSize:14,color:T.ink}}/>
      </div>

      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20,alignItems:"center"}}>
        {filterDefs.map(f=>{
          const cfg = PRIO_CONFIG[f.id];
          const active = filterPrio===f.id;
          return(
            <button key={f.id} onClick={()=>setFilterPrio(f.id)} style={{padding:"5px 12px",borderRadius:20,fontSize:12,fontWeight:500,border:`1px solid ${active?(cfg?.color||T.borderStrong):T.border}`,background:active?(cfg?.bg||T.paperHover):"transparent",color:active?(cfg?.text||T.ink):T.inkMuted,transition:"all 0.15s",display:"flex",alignItems:"center",gap:5}}>
              {f.withDot&&<span style={{width:6,height:6,borderRadius:"50%",background:cfg?.color,display:"inline-block"}}/>}
              {f.label}
            </button>
          );
        })}
        <div style={{flex:1}}/>
        {categories.map(c=>(
          <button key={c.id} onClick={()=>setFilterCat(filterCat===c.id?"all":c.id)}
            style={{padding:"5px 9px",borderRadius:20,fontSize:13,border:`1px solid ${filterCat===c.id?T.amber:T.border}`,background:filterCat===c.id?T.paperHover:"transparent",color:filterCat===c.id?T.amberDark:T.inkMuted,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
            <Icon name={c.icon} size={14}/>
          </button>
        ))}
        <button onClick={()=>setShowDone(s=>!s)} style={{padding:"5px 12px",borderRadius:20,fontSize:12,border:`1px solid ${showDone?"#6B8B7A":T.border}`,color:showDone?"#3F5A4C":T.inkMuted,background:showDone?"#E5EEE8":"transparent",display:"inline-flex",alignItems:"center",gap:5,transition:"all 0.15s"}}>
          <Icon name="check" size={12}/>Faites
        </button>
      </div>

      {sorted.length===0?(
        <div style={{textAlign:"center",padding:"60px 0",color:T.inkFaint,fontSize:14}}>{search?"Aucun résultat":"Aucune tâche ici"}</div>
      ):sorted.map((task,i)=>{
        const cfg = PRIO_CONFIG[task.priority] || PRIO_CONFIG.backlog;
        const cat = categories.find(c=>c.id===task.spaceCategory);
        const isEditing = editingId===task.id;
        const isPicking = prioPicking===task.id;
        return(
          <div key={task.id} className="task-row" style={{display:"flex",flexDirection:"column",padding:"10px 14px",marginBottom:5,borderRadius:10,background:task.done?"transparent":T.paperCard,border:`1px solid ${task.done?"transparent":T.border}`,opacity:task.done?0.5:1,transition:"all 0.15s",animation:`slideUp 0.2s ease ${Math.min(i,15)*0.02}s both`}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <button onClick={()=>onToggle(task.spaceId,task.id)} style={{width:17,height:17,borderRadius:"50%",flexShrink:0,border:`1.5px solid ${task.done?cfg.color:T.borderStrong}`,background:task.done?cfg.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
                {task.done&&<Icon name="check" size={9} stroke="white" strokeWidth={2.5}/>}
              </button>
              <div style={{flex:1,minWidth:0}}>
                {isEditing?(
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <input ref={editRef} value={editDraft} onChange={e=>setEditDraft(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();commitEdit(task);}if(e.key==="Escape")setEditingId(null);}}
                      style={{flex:1,fontSize:14,color:T.ink,background:T.paper,border:`1px solid ${T.amber}`,borderRadius:6,padding:"2px 8px"}}/>
                    <button onMouseDown={e=>{e.preventDefault();commitEdit(task);}} style={{fontSize:11,padding:"2px 8px",borderRadius:8,background:T.gradBtn,color:"white",fontWeight:500}}>✓</button>
                    <button onMouseDown={e=>{e.preventDefault();setEditingId(null);}} style={{fontSize:11,padding:"2px 6px",borderRadius:8,background:T.paperHover,color:T.inkMuted,border:`1px solid ${T.border}`}}>✕</button>
                  </div>
                ):(
                  <div onDoubleClick={()=>{if(!task.done){setEditingId(task.id);setEditDraft(task.text);}}} title="Double-clic pour modifier"
                    style={{fontSize:14,color:task.done?T.inkFaint:T.ink,textDecoration:task.done?"line-through":"none",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden",cursor:task.done?"default":"text",lineHeight:1.4}}>{task.text}</div>
                )}
                <div style={{display:"flex",alignItems:"center",gap:5,marginTop:2,overflow:"hidden",minWidth:0}}>
                  {cat&&<Icon name={cat.icon} size={11} stroke={T.inkFaint} style={{flexShrink:0}}/>}
                  <button onClick={()=>onGoSpace(task.spaceId)} style={{fontSize:11,color:T.inkFaint,padding:0,transition:"color 0.15s",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flexShrink:1,minWidth:0}}
                    onMouseEnter={e=>e.currentTarget.style.color=T.amberDark} onMouseLeave={e=>e.currentTarget.style.color=T.inkFaint}>{task.spaceName}</button>
                  {task.reminder&&<span style={{fontSize:11,color:T.amber,display:"inline-flex",alignItems:"center",gap:3,flexShrink:0,whiteSpace:"nowrap"}}><Icon name="bell" size={10}/>{task.reminder}</span>}
                </div>
              </div>
              {!task.done&&(
                <div style={{display:"flex",gap:4,alignItems:"center",flexShrink:0}}>
                  <button onClick={()=>setPrioPicking(isPicking?null:task.id)} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:10,transition:"all 0.15s",background:isPicking?cfg.bg:"transparent",border:`1px solid ${isPicking?cfg.color:T.border}`}}>
                    <span style={{width:7,height:7,borderRadius:"50%",background:cfg.color,display:"inline-block"}}/>
                    <span className="hint-desktop" style={{fontSize:11,color:cfg.text,fontWeight:500}}>{cfg.label}</span>
                  </button>
                  <button onClick={()=>onDelete(task.spaceId,task.id)} className="task-act"
                    style={{opacity:0,transition:"opacity 0.15s",color:T.urgent,padding:"2px 5px"}}>
                    <Icon name="trash" size={13}/>
                  </button>
                </div>
              )}
            </div>
            {isPicking&&(
              <div style={{display:"flex",gap:5,paddingLeft:27,flexWrap:"wrap",marginTop:7}}>
                {PRIOS.map(p=>{const c=PRIO_CONFIG[p];const active=task.priority===p;return(
                  <button key={p} onClick={()=>{onChangePriority(task.spaceId,task.id,p);setPrioPicking(null);}}
                    style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:12,fontSize:12,border:`1px solid ${active?c.color:T.border}`,background:active?c.bg:"transparent",color:active?c.text:T.inkMuted,fontWeight:active?600:400}}>
                    <span style={{width:6,height:6,borderRadius:"50%",background:c.color,display:"inline-block"}}/>{c.label}
                  </button>
                );})}
              </div>
            )}
          </div>
        );
      })}
      {sorted.length>0&&<div style={{fontSize:12,color:T.inkFaint,textAlign:"center",marginTop:14,fontFamily:"DM Mono,monospace"}}>{sorted.filter(t=>!t.done).length} à faire{sorted.filter(t=>t.done).length>0&&` · ${sorted.filter(t=>t.done).length} terminée(s)`}</div>}
    </div>
  );
}

// ── Onboarding ────────────────────────────────────────────────────────────────
function Onboarding({ categories, onDone }) {
  const [selected, setSelected] = useState(()=>{
    const init={};
    Object.entries(ONBOARDING_SPACES).forEach(([catId,names])=>{
      names.forEach(name=>{ if(ONBOARDING_DEFAULTS.includes(name)) init[`${catId}::${name}`]=true; });
    });
    return init;
  });
  const toggleSpace = (catId,name) => { const k=`${catId}::${name}`; setSelected(p=>({...p,[k]:!p[k]})); };
  const isSelected = (catId,name) => !!selected[`${catId}::${name}`];
  const handleDone = () => {
    const spaces=[];
    Object.entries(selected).forEach(([key,val])=>{ if(!val) return; const [catId,name]=key.split("::"); spaces.push({id:generateId(),name,category:catId,tasks:[]}); });
    onDone(spaces);
  };
  const totalSelected = Object.values(selected).filter(Boolean).length;

  return (
    <div style={{minHeight:"100vh",background:T.paper,display:"flex",alignItems:"center",justifyContent:"center",padding:"40px 20px"}}>
      <div style={{maxWidth:560,width:"100%",animation:"slideUp 0.4s ease"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:40}}>
          <Icon name="brain" size={26} stroke={T.amberDark}/>
          <span style={{fontWeight:600,fontSize:18,letterSpacing:"-0.02em",color:T.ink}}>BrainDump</span>
        </div>
        <div style={{fontSize:28,fontWeight:700,letterSpacing:"-0.03em",marginBottom:10,color:T.ink}}>Choisis tes espaces</div>
        <div style={{fontSize:14,color:T.inkMuted,marginBottom:32,lineHeight:1.6}}>Commence avec ce qui compte pour toi — tu pourras ajuster et en ajouter d'autres plus tard.</div>

        {categories.map(cat=>(
          <div key={cat.id} style={{marginBottom:26}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <Icon name={cat.icon} size={15} stroke={T.amberDark}/>
              <span className="label-up">{cat.label}</span>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {(ONBOARDING_SPACES[cat.id]||[]).map(name=>{
                const active=isSelected(cat.id,name);
                const isDefault=ONBOARDING_DEFAULTS.includes(name);
                return(
                  <button key={name} onClick={()=>toggleSpace(cat.id,name)}
                    style={{padding:"8px 16px",borderRadius:20,fontSize:13,fontWeight:500,border:`1px solid ${active?T.amber:isDefault?T.borderStrong:T.border}`,background:active?T.paperCard:"transparent",color:active?T.amberDark:isDefault?T.inkMuted:T.inkFaint,transition:"all 0.15s",display:"inline-flex",alignItems:"center",gap:6}}>
                    {active&&<Icon name="check" size={12} stroke={T.amberDark}/>}{name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div style={{marginTop:8,paddingTop:24,borderTop:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:13,color:T.inkMuted}}>{totalSelected===0?"Sélectionne au moins un espace":`${totalSelected} espace${totalSelected>1?"s":""} sélectionné${totalSelected>1?"s":""}`}</div>
          <button onClick={handleDone} disabled={totalSelected===0}
            style={{padding:"11px 24px",borderRadius:20,fontSize:14,fontWeight:600,background:totalSelected>0?T.gradBtn:T.paperHover,color:totalSelected>0?"white":T.inkFaint,transition:"all 0.2s",display:"inline-flex",alignItems:"center",gap:8}}>
            Commencer<Icon name="arrowRight" size={16} stroke={totalSelected>0?"white":T.inkFaint}/>
          </button>
        </div>
        <div style={{marginTop:16,textAlign:"center"}}>
          <button onClick={()=>onDone([])} style={{fontSize:12,color:T.inkFaint}}>Passer — je créerai mes espaces moi-même</button>
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function BrainDump({ user }) {
  const [apiKey,       setApiKey]       = useState(()=>localStorage.getItem("braindump_api_key")||"");
  const [onboarded,    setOnboarded]    = useState(false);
  const [view,         setView]         = useState("capture");
  const [input,        setInput]        = useState("");
  const [isListening,  setIsListening]  = useState(false);
  const [categories,   setCategories]   = useState(DEFAULT_CATEGORIES);
  const [spaces,       setSpaces]       = useState([]);
  const [dataLoaded,   setDataLoaded]   = useState(false);
  const dataLoadedRef  = useRef(false);
  const [loading,      setLoading]      = useState(false);
  const [toast,        setToast]        = useState(null);
  const [selectedSid,  setSelectedSid]  = useState(null);
  const [contextMode,  setContextMode]  = useState(null);
  const [pendingNew,   setPendingNew]   = useState([]);
  const [focusTasks,   setFocusTasks]   = useState(null);
  const [showAddCat,   setShowAddCat]   = useState(false);
  const [newCatName,   setNewCatName]   = useState("");
  const [newCatIcon,   setNewCatIcon]   = useState("target");
  const [newCatColor,  setNewCatColor]  = useState(T.amber);
  const [showCtxPicker,setShowCtxPicker] = useState(false);
  const [showAddSpace, setShowAddSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceCat,  setNewSpaceCat]  = useState("");
  const [confirmDelId, setConfirmDelId] = useState(null);
  const [showApiKey,   setShowApiKey]   = useState(false);
  const [apiKeyDraft,  setApiKeyDraft]  = useState("");
  const textareaRef    = useRef(null);
  const recognitionRef = useRef(null);
  const toastTimer     = useRef(null);

  useEffect(()=>{ if(view==="capture") textareaRef.current?.focus(); },[view]);
  useEffect(()=>{
    if(toast){ if(toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current=setTimeout(()=>setToast(null),6000); }
  },[toast]);
  useEffect(()=>{
    getDoc(doc(db,"users",user.uid)).then(snap=>{
      if(snap.exists()){
        const d=snap.data();
        if(d.spaces)     setSpaces(d.spaces);
        if(d.categories) setCategories(d.categories);
        if(d.onboarded!==undefined) setOnboarded(d.onboarded);
      } else {
        try {
          const s=JSON.parse(localStorage.getItem("braindump_spaces")||"[]");
          const c=JSON.parse(localStorage.getItem("braindump_categories")||"null")||DEFAULT_CATEGORIES;
          const o=localStorage.getItem("braindump_onboarded")==="true";
          setSpaces(s); setCategories(c); setOnboarded(o);
        } catch {}
      }
      dataLoadedRef.current=true;
      setDataLoaded(true);
    });
  },[user.uid]);
  useEffect(()=>{ if(!dataLoadedRef.current) return; setDoc(doc(db,"users",user.uid),{onboarded},{merge:true}); },[onboarded,user.uid]);
  useEffect(()=>{ if(!dataLoadedRef.current) return; setDoc(doc(db,"users",user.uid),{spaces},{merge:true}); },[spaces,user.uid]);
  useEffect(()=>{ if(!dataLoadedRef.current) return; setDoc(doc(db,"users",user.uid),{categories},{merge:true}); },[categories,user.uid]);

  const startListening = useCallback(()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){alert("Ton navigateur ne supporte pas la reconnaissance vocale.");return;}
    const rec=new SR(); rec.lang="fr-FR"; rec.continuous=false; rec.interimResults=false;
    rec.onresult=e=>setInput(prev=>prev?prev+" "+e.results[0][0].transcript:e.results[0][0].transcript);
    rec.onend=()=>setIsListening(false); rec.onerror=()=>setIsListening(false);
    recognitionRef.current=rec; rec.start(); setIsListening(true);
  },[]);
  const stopListening = useCallback(()=>{ recognitionRef.current?.stop(); setIsListening(false); },[]);

  const handleSubmit = useCallback(async()=>{
    if(!input.trim()||loading) return;
    const text=contextMode?`[Contexte ${contextMode}] ${input}`:input;
    setLoading(true); setInput("");
    try {
      const result=await classifyWithClaude(text,spaces,categories,apiKey);
      if(result.tasks?.length){
        const newTasks=result.tasks.filter(t=>t.spaceId).map(t=>({id:generateId(),text:t.text,spaceId:t.spaceId,priority:t.priority==="maybe"?"backlog":t.priority||"backlog",reminder:t.reminder||null,done:false,createdAt:new Date().toISOString()}));
        if(newTasks.length){
          setSpaces(prev=>prev.map(p=>({...p,tasks:[...p.tasks,...newTasks.filter(t=>t.spaceId===p.id)]})));
          setToast({type:"success",items:newTasks.map(t=>({...t,spaceName:spaces.find(p=>p.id===t.spaceId)?.name||"?"}))});
        }
      }
      if(result.newSpaces?.length){
        const normalize=s=>s.toLowerCase().replace(/[^a-z0-9]/g,"");
        const isSimilar=name=>spaces.some(ex=>{
          const a=normalize(name),b=normalize(ex.name);
          if(a===b||a.includes(b)||b.includes(a)) return true;
          const wA=name.toLowerCase().split(/\s+/),wB=ex.name.toLowerCase().split(/\s+/);
          return wA.filter(w=>wB.some(wb=>wb.includes(w)||w.includes(wb))).length/Math.max(wA.length,wB.length)>=0.5;
        });
        result.newSpaces.filter(ns=>isSimilar(ns.name)).forEach(ns=>{
          const match=spaces.find(ex=>{const a=normalize(ns.name),b=normalize(ex.name);if(a===b||a.includes(b)||b.includes(a))return true;const wA=ns.name.toLowerCase().split(/\s+/),wB=ex.name.toLowerCase().split(/\s+/);return wA.filter(w=>wB.some(wb=>wb.includes(w)||w.includes(wb))).length/Math.max(wA.length,wB.length)>=0.5;});
          if(match&&ns.tasks?.length){
            const rescued=ns.tasks.map(t=>({id:generateId(),text:t.text,spaceId:match.id,priority:t.priority||"backlog",reminder:t.reminder||null,done:false,createdAt:new Date().toISOString()}));
            setSpaces(prev=>prev.map(p=>p.id===match.id?{...p,tasks:[...p.tasks,...rescued]}:p));
            setToast({type:"success",items:rescued.map(t=>({...t,spaceName:match.name}))});
          }
        });
        const genuinelyNew=result.newSpaces.filter(ns=>!isSimilar(ns.name));
        if(genuinelyNew.length) setPendingNew(prev=>[...prev,...genuinelyNew.map(ns=>({id:generateId(),name:ns.name,editedName:ns.name,category:ns.category,tasks:(ns.tasks||[]).map(t=>({...t,id:generateId()}))}))]);
      }
    } catch { setToast({type:"error"}); }
    setLoading(false);
  },[input,loading,contextMode,spaces,categories,apiKey]);

  const handleKeyDown = e=>{ if(e.key==="Enter"&&(e.metaKey||e.ctrlKey)) handleSubmit(); };

  const toggleDone=(spaceId,taskId)=>setSpaces(prev=>prev.map(p=>p.id===spaceId?{...p,tasks:p.tasks.map(t=>t.id===taskId?{...t,done:!t.done}:t)}:p));
  const deleteTask=(spaceId,taskId)=>setSpaces(prev=>prev.map(p=>p.id===spaceId?{...p,tasks:p.tasks.filter(t=>t.id!==taskId)}:p));
  const changePriority=(spaceId,taskId,prio)=>setSpaces(prev=>prev.map(p=>p.id===spaceId?{...p,tasks:p.tasks.map(t=>t.id===taskId?{...t,priority:prio}:t)}:p));
  const editTaskText=(spaceId,taskId,text)=>setSpaces(prev=>prev.map(p=>p.id===spaceId?{...p,tasks:p.tasks.map(t=>t.id===taskId?{...t,text}:t)}:p));
  const moveTask=(taskId,fromId,toId)=>setSpaces(prev=>{
    const task=prev.find(p=>p.id===fromId)?.tasks.find(t=>t.id===taskId);
    if(!task) return prev;
    return prev.map(p=>{if(p.id===fromId)return{...p,tasks:p.tasks.filter(t=>t.id!==taskId)};if(p.id===toId)return{...p,tasks:[...p.tasks,{...task,spaceId:toId}]};return p;});
  });

  const addSpace=()=>{
    if(!newSpaceName.trim()) return;
    setSpaces(prev=>[...prev,{id:generateId(),name:newSpaceName.trim(),category:newSpaceCat||categories[0]?.id,tasks:[]}]);
    setNewSpaceName(""); setShowAddSpace(false);
  };
  const confirmNewSpace=(pending)=>{
    const sp={id:generateId(),name:pending.editedName.trim()||pending.name,category:pending.category,tasks:[]};
    sp.tasks=pending.tasks.map(t=>({id:generateId(),text:t.text,spaceId:sp.id,priority:t.priority||"backlog",reminder:t.reminder||null,done:false,createdAt:new Date().toISOString()}));
    setSpaces(prev=>[...prev,sp]);
    setPendingNew(prev=>prev.filter(p=>p.id!==pending.id));
    setToast({type:"newspace",name:sp.name,count:sp.tasks.length});
  };
  const addCategory=()=>{
    if(!newCatName.trim()) return;
    setCategories(prev=>[...prev,{id:generateId(),label:newCatName.trim(),icon:newCatIcon,color:newCatColor}]);
    setNewCatName(""); setShowAddCat(false);
  };
  const loadFocus=useCallback(async()=>{
    setView("focus"); setFocusTasks(null);
    const result=await buildFocusWithClaude(spaces,categories,apiKey);
    setFocusTasks(result);
  },[spaces,categories,apiKey]);

  if(!dataLoaded) return (
    <>
      <style>{GLOBAL_STYLE}</style>
      <div style={{minHeight:"100vh",background:"#FFFDF5",display:"flex",alignItems:"center",justifyContent:"center",color:"#A08C5A",fontSize:14}}>Chargement…</div>
    </>
  );

  if(!onboarded) return (
    <>
      <style>{GLOBAL_STYLE}</style>
      <Onboarding categories={categories} onDone={sp=>{setSpaces(sp);setOnboarded(true);}}/>
    </>
  );

  const totalTasks=spaces.reduce((s,p)=>s+p.tasks.filter(t=>!t.done).length,0);

  const TABS = [
    {id:"capture", label:"Capturer", icon:"sparkle"},
    {id:"all",     label:"Tâches",   icon:"check"},
    {id:"spaces",  label:"Espaces",  icon:"home"},
    {id:"focus",   label:"Aujourd'hui", icon:"target", action:loadFocus},
  ];

  return (
    <div style={{minHeight:"100vh",background:T.paper,color:T.ink}}>
      <style>{GLOBAL_STYLE}</style>

      {/* Header */}
      <div style={{background:T.paper,position:"sticky",top:0,zIndex:5,borderBottom:`1px solid ${T.border}`}}>
        <div style={{display:"flex",alignItems:"center",padding:"12px 20px",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            <Icon name="brain" size={20} stroke={T.amberDark}/>
            <span style={{fontWeight:600,fontSize:15,letterSpacing:"-0.02em",color:T.ink}}>BrainDump</span>
          </div>
          {/* Onglets desktop */}
          <div className="header-tabs-desktop" style={{display:"flex",gap:2,flex:1,justifyContent:"center"}}>
            {TABS.map(tab=>(
              <button key={tab.id} onClick={()=>tab.action?tab.action():setView(tab.id)}
                style={{padding:"7px 14px",borderRadius:20,fontSize:13,fontWeight:500,background:view===tab.id?T.paperHover:"transparent",color:view===tab.id?T.ink:T.inkMuted,transition:"all 0.15s"}}>
                {tab.label}
              </button>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0,marginLeft:"auto"}}>
            <div style={{fontSize:12,color:T.inkFaint,fontFamily:"DM Mono,monospace"}}>{totalTasks} tâches</div>
            <button onClick={()=>{setApiKeyDraft(apiKey);setShowApiKey(s=>!s);}}
              title="Clé API"
              style={{width:30,height:30,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:apiKey?"transparent":T.urgentBg,border:`1px solid ${apiKey?T.border:T.urgent}`,color:apiKey?T.inkFaint:T.urgent,transition:"all 0.15s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=T.amber;e.currentTarget.style.color=T.amberDark;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=apiKey?T.border:T.urgent;e.currentTarget.style.color=apiKey?T.inkFaint:T.urgent;}}>
              <Icon name="key" size={13}/>
            </button>
            <button onClick={()=>signOut(auth)} title={user.email}
              style={{width:30,height:30,borderRadius:"50%",background:T.amber,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:12,fontWeight:600,flexShrink:0,border:"none"}}>
              {user.email[0].toUpperCase()}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom nav mobile */}
      <div className="bottom-nav" style={{position:"fixed",bottom:0,left:0,right:0,background:T.paper,borderTop:`1px solid ${T.border}`,display:"flex",zIndex:10,paddingBottom:"env(safe-area-inset-bottom)"}}>
        {TABS.map(tab=>(
          <button key={tab.id} onClick={()=>tab.action?tab.action():setView(tab.id)}
            style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"10px 4px 8px",background:"transparent",border:"none",color:view===tab.id?T.amberDark:T.inkFaint,transition:"color 0.15s"}}>
            <Icon name={tab.icon} size={20} stroke={view===tab.id?T.amberDark:T.inkFaint}/>
            <span style={{fontSize:10,fontWeight:view===tab.id?600:400}}>{tab.label}</span>
          </button>
        ))}
      </div>

      {showApiKey&&(
        <div style={{background:T.paperCard,borderBottom:`1px solid ${T.amber}`,padding:"12px 24px",display:"flex",alignItems:"center",gap:10,animation:"slideUp 0.15s ease"}}>
          <span style={{fontSize:12,color:T.inkMuted,whiteSpace:"nowrap"}}>Clé API Anthropic</span>
          <input type="password" value={apiKeyDraft} onChange={e=>setApiKeyDraft(e.target.value)}
            onKeyDown={e=>{
              if(e.key==="Enter"){localStorage.setItem("braindump_api_key",apiKeyDraft.trim());setApiKey(apiKeyDraft.trim());setShowApiKey(false);}
              if(e.key==="Escape")setShowApiKey(false);
            }}
            placeholder="sk-ant-…" autoFocus
            style={{flex:1,fontSize:13,fontFamily:"DM Mono,monospace",color:T.ink,background:T.paper,border:`1px solid ${T.border}`,borderRadius:8,padding:"7px 11px"}}/>
          <button onClick={()=>{localStorage.setItem("braindump_api_key",apiKeyDraft.trim());setApiKey(apiKeyDraft.trim());setShowApiKey(false);}}
            style={{padding:"7px 16px",borderRadius:10,fontSize:13,fontWeight:500,background:T.gradBtn,color:"white",flexShrink:0}}>
            Enregistrer
          </button>
          <button onClick={()=>setShowApiKey(false)}
            style={{padding:"7px 10px",borderRadius:10,fontSize:13,color:T.inkMuted,border:`1px solid ${T.border}`,background:T.paperHover,flexShrink:0}}>
            ✕
          </button>
        </div>
      )}

      {/* CAPTURE */}
      {view==="capture"&&(
        <div className="main-content" style={{maxWidth:580,margin:"0 auto",padding:"32px 20px"}}>
          {!apiKey&&(
            <div style={{marginBottom:18,padding:"11px 16px",borderRadius:12,background:T.urgentBg,border:`1px solid rgba(184,92,74,0.3)`,display:"flex",alignItems:"center",gap:10}}>
              <Icon name="key" size={14} stroke={T.urgentText}/>
              <span style={{fontSize:13,color:T.urgentText,flex:1}}>Clé API manquante — l'IA ne fonctionnera pas.</span>
              <button onClick={()=>{setApiKeyDraft("");setShowApiKey(true);}} style={{fontSize:12,padding:"4px 12px",borderRadius:8,background:T.urgent,color:"white",fontWeight:500,flexShrink:0}}>Configurer</button>
            </div>
          )}
          <div style={{marginBottom:18}}>
            <button className="label-up" onClick={()=>setShowCtxPicker(s=>!s)} style={{marginBottom:10,background:"none",border:"none",padding:0,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
              Mode contexte
              <span style={{fontSize:10,color:T.inkFaint}}>{showCtxPicker?"▲":"▼"}</span>
            </button>
            {showCtxPicker&&(
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {spaces.map(p=>{const active=contextMode===p.name;return(
                  <button key={p.id} onClick={()=>{setContextMode(active?null:p.name);setShowCtxPicker(false);}}
                    style={{padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:500,border:`1px solid ${active?T.amber:T.border}`,background:active?T.paperCard:"transparent",color:active?T.amberDark:T.inkMuted,transition:"all 0.15s",display:"inline-flex",alignItems:"center",gap:6}}>
                    {active&&<span style={{width:6,height:6,borderRadius:"50%",background:T.amber,display:"inline-block",animation:"pulse 1.5s infinite"}}/>}{p.name}
                  </button>
                );})}
              </div>
            )}
            {contextMode&&(
              <div style={{marginTop:8,fontSize:12,color:T.amberDark,display:"flex",alignItems:"center",gap:6}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:T.amber,display:"inline-block",animation:"pulse 1.5s infinite"}}/>
                Tout ira dans <strong style={{marginLeft:2}}>{contextMode}</strong>
                <button onClick={()=>{setContextMode(null);setShowCtxPicker(false);}} style={{marginLeft:8,fontSize:11,color:T.inkMuted,padding:"2px 8px",border:`1px solid ${T.border}`,borderRadius:10,background:T.paperHover}}>Fin</button>
              </div>
            )}
          </div>

          <div style={{background:T.paperCard,border:`1px solid ${contextMode?T.amber:T.border}`,borderRadius:20,padding:"18px",transition:"border-color 0.3s"}}>
            {!isListening?(
              <>
                <textarea ref={textareaRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder={contextMode?`Contexte actif : ${contextMode}…`:"Vide ta tête ici."}
                  rows={5} style={{width:"100%",fontSize:16,lineHeight:1.65,fontWeight:400,color:T.ink}}/>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:14,gap:14}}>
                    <button onClick={startListening} style={{width:42,height:42,borderRadius:"50%",background:T.paperHover,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",color:T.amberDark,flexShrink:0,transition:"all 0.15s"}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor=T.amber;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;}}>
                      <Icon name="mic" size={18}/>
                    </button>
                    <button onClick={handleSubmit} disabled={!input.trim()||loading}
                      style={{padding:"9px 20px",borderRadius:20,fontSize:14,fontWeight:600,background:input.trim()&&!loading?T.gradBtn:T.paperHover,color:input.trim()&&!loading?"white":T.inkFaint,transition:"all 0.2s",display:"inline-flex",alignItems:"center",gap:7,flexShrink:0}}>
                      {loading?<><span style={{width:13,height:13,border:`2px solid rgba(255,255,255,0.3)`,borderTopColor:"white",borderRadius:"50%",display:"inline-block",animation:"spin 0.7s linear infinite"}}/>Analyse…</>:<>Ranger<Icon name="arrowRight" size={15} stroke="white"/></>}
                    </button>
                  </div>
              </>
            ):(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:18,padding:"16px 0"}}>
                <div style={{display:"flex",alignItems:"center",gap:4,height:44}}>
                  {[18,30,22,42,28,36,16,26].map((h,i)=><div key={i} style={{width:4,borderRadius:2,background:T.amber,height:h,animation:`waveBar 0.6s ease-in-out ${i*0.08}s infinite`}}/>)}
                </div>
                <div style={{fontSize:14,color:T.inkMuted}}>Je t'écoute…</div>
                <button onClick={stopListening} style={{width:52,height:52,borderRadius:"50%",background:T.urgent,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:20}}>■</button>
              </div>
            )}
          </div>

          <div style={{display:"flex",gap:0,marginTop:10,paddingLeft:2,flexWrap:"wrap",alignItems:"center"}}>
            {[", sépare","↵ sépare","! urgent","⌘↵ ranger"].map((h,i)=>(
              <span key={h} className={h==="⌘↵ ranger"?"hint-desktop":""} style={{display:"inline-flex",alignItems:"center"}}>
                {i>0&&<span style={{fontSize:13,color:T.borderStrong,margin:"0 7px",lineHeight:1}}>/</span>}
                <span style={{fontSize:11,color:T.inkFaint,fontFamily:"DM Mono,monospace"}}>{h}</span>
              </span>
            ))}
          </div>

          {toast&&(
            <div style={{marginTop:14,borderRadius:14,padding:"13px 15px",animation:"slideUp 0.2s ease",
              background:toast.type==="error"?T.errorBg:toast.type==="newspace"?T.newspaceBg:T.successBg,
              border:`1px solid ${toast.type==="error"?T.errorBorder:toast.type==="newspace"?T.newspaceBorder:T.successBorder}`}}>
              {toast.type==="error"&&<div style={{fontSize:13,color:T.urgentText}}>Erreur de connexion — réessaie</div>}
              {toast.type==="newspace"&&<div style={{fontSize:13,color:T.newspaceText}}>Espace "{toast.name}" créé · {toast.count} tâche(s)</div>}
              {toast.type==="success"&&(
                <>
                  <div style={{fontSize:12,color:T.successText,marginBottom:8,fontWeight:500}}>{toast.items.length} tâche{toast.items.length>1?"s":""} rangée{toast.items.length>1?"s":""}</div>
                  {toast.items.map((item,i)=>(
                    <div key={i} style={{fontSize:13,color:T.inkMuted,padding:"3px 0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <span>— {item.text} <span style={{color:T.inkFaint}}>→ {item.spaceName}</span></span>
                      <div style={{display:"flex",gap:4}}>
                        {spaces.filter(p=>p.id!==item.spaceId).slice(0,2).map(p=>(
                          <button key={p.id} onClick={()=>{moveTask(item.id,item.spaceId,p.id);setToast(null);}}
                            style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:T.paperHover,border:`1px solid ${T.border}`,color:T.inkMuted}}>{p.name.split(" ")[0]}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {pendingNew.map(pending=>{
            const cat=categories.find(c=>c.id===pending.category);
            return(
              <div key={pending.id} style={{marginTop:14,background:T.newspaceBg,border:`1px solid ${T.newspaceBorder}`,borderRadius:14,padding:"15px",animation:"slideUp 0.25s ease"}}>
                <div style={{fontSize:12,color:T.newspaceText,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                  {cat&&<Icon name={cat.icon} size={13} stroke={T.newspaceText}/>}Nouvel espace suggéré — confirme ou redirige :
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
                  <input value={pending.editedName} onChange={e=>setPendingNew(prev=>prev.map(p=>p.id===pending.id?{...p,editedName:e.target.value}:p))}
                    style={{flex:1,fontSize:14,fontWeight:500,color:T.ink,background:T.paper,border:`1px solid ${T.border}`,borderRadius:8,padding:"7px 11px"}}/>
                  <select value={pending.category} onChange={e=>setPendingNew(prev=>prev.map(p=>p.id===pending.id?{...p,category:e.target.value}:p))}
                    style={{fontSize:12,color:T.inkMuted,background:T.paper,border:`1px solid ${T.border}`,borderRadius:8,padding:"7px 10px"}}>
                    {categories.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                {pending.tasks.length>0&&<div style={{fontSize:12,color:T.inkMuted,marginBottom:10}}>{pending.tasks.map((t,i)=><span key={i}>— {t.text}<br/></span>)}</div>}
                <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  <button onClick={()=>confirmNewSpace(pending)} style={{padding:"7px 18px",borderRadius:20,fontSize:13,fontWeight:500,background:T.newspaceBg,border:`1px solid ${T.newspaceText}`,color:T.newspaceText}}>✓ Créer cet espace</button>
                  <span style={{fontSize:12,color:T.inkFaint}}>ou ranger dans :</span>
                  {spaces.map(sp=>(
                    <button key={sp.id} onClick={()=>{
                      if(pending.tasks.length){
                        const rescued=pending.tasks.map(t=>({id:generateId(),text:t.text,spaceId:sp.id,priority:t.priority||"backlog",reminder:t.reminder||null,done:false,createdAt:new Date().toISOString()}));
                        setSpaces(prev=>prev.map(p=>p.id===sp.id?{...p,tasks:[...p.tasks,...rescued]}:p));
                        setToast({type:"success",items:rescued.map(t=>({...t,spaceName:sp.name}))});
                      }
                      setPendingNew(prev=>prev.filter(p=>p.id!==pending.id));
                    }} style={{padding:"6px 12px",borderRadius:20,fontSize:12,background:T.paperHover,border:`1px solid ${T.border}`,color:T.inkMuted,transition:"all 0.15s"}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor=T.amber;e.currentTarget.style.color=T.amberDark;}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.inkMuted;}}
                    >{sp.name}</button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TÂCHES */}
      {view==="all"&&<AllTasksView spaces={spaces} categories={categories} onToggle={toggleDone} onDelete={deleteTask} onChangePriority={changePriority} onMove={moveTask} onGoSpace={sid=>{setSelectedSid(sid);setView("space");}} onEditText={editTaskText}/>}

      {/* ESPACES */}
      {view==="spaces"&&(
        <div style={{maxWidth:720,margin:"0 auto",padding:"28px 20px"}}>
          {categories.map(cat=>{
            const catSpaces=spaces.filter(p=>p.category===cat.id);
            return(
              <div key={cat.id} style={{marginBottom:32}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                  <Icon name={cat.icon} size={15} stroke={T.amberDark}/>
                  <span className="label-up">{cat.label}</span>
                  <span style={{fontSize:12,color:T.inkFaint,fontFamily:"DM Mono,monospace"}}>{catSpaces.reduce((s,p)=>s+p.tasks.filter(t=>!t.done).length,0)}</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",gap:10}}>
                  {catSpaces.map(sp=>{
                    const open=sp.tasks.filter(t=>!t.done).length;
                    const urgent=sp.tasks.filter(t=>t.priority==="urgent"&&!t.done).length;
                    return(
                      <div key={sp.id} className="space-card-wrap" style={{position:"relative"}}>
                        <button onClick={()=>{setSelectedSid(sp.id);setView("space");}}
                          style={{width:"100%",background:T.paperCard,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px",textAlign:"left",transition:"all 0.15s"}}
                          onMouseEnter={e=>{e.currentTarget.style.borderColor=T.amber;e.currentTarget.style.background=T.paperHover;}}
                          onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.background=T.paperCard;}}>
                          <div style={{fontSize:13,fontWeight:500,color:T.ink,marginBottom:6}}>{sp.name}</div>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{fontSize:12,color:T.inkMuted}}>{open} tâche{open>1?"s":""}</span>
                            {urgent>0&&<span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:T.urgentBg,color:T.urgentText,fontWeight:500,display:"inline-flex",alignItems:"center",gap:3}}>
                              <span style={{width:5,height:5,borderRadius:"50%",background:T.urgent,display:"inline-block"}}/>{urgent}
                            </span>}
                          </div>
                        </button>
                        {confirmDelId===sp.id?(
                          <div style={{position:"absolute",top:4,right:4,display:"flex",gap:4,background:T.paper,border:`1px solid ${T.urgent}`,borderRadius:10,padding:"4px 6px",zIndex:10}}>
                            <span style={{fontSize:11,color:T.inkMuted,alignSelf:"center",marginRight:2}}>Supprimer ?</span>
                            <button onMouseDown={e=>{e.stopPropagation();setSpaces(prev=>prev.filter(p=>p.id!==sp.id));setConfirmDelId(null);}} style={{fontSize:11,padding:"2px 8px",borderRadius:8,background:T.urgent,color:"white",fontWeight:500}}>Oui</button>
                            <button onMouseDown={e=>{e.stopPropagation();setConfirmDelId(null);}} style={{fontSize:11,padding:"2px 6px",borderRadius:8,background:T.paperHover,color:T.inkMuted,border:`1px solid ${T.border}`}}>Non</button>
                          </div>
                        ):(
                          <button className="space-del" onMouseDown={e=>{e.stopPropagation();setConfirmDelId(sp.id);}}
                            style={{position:"absolute",top:6,right:6,width:20,height:20,borderRadius:"50%",background:T.paperHover,border:`1px solid ${T.border}`,color:T.urgent,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",opacity:0,transition:"opacity 0.15s"}}>
                            <Icon name="trash" size={11}/>
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <button onClick={()=>{setShowAddSpace(true);setNewSpaceCat(cat.id);}}
                    style={{background:"transparent",border:`1px dashed ${T.borderStrong}`,borderRadius:12,padding:"14px",textAlign:"left",color:T.inkFaint,fontSize:13,transition:"all 0.15s",display:"inline-flex",alignItems:"center",gap:6}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=T.amber;e.currentTarget.style.color=T.amberDark;e.currentTarget.style.background=T.paperCard;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=T.borderStrong;e.currentTarget.style.color=T.inkFaint;e.currentTarget.style.background="transparent";}}>
                    <Icon name="plus" size={14}/>Nouvel espace
                  </button>
                </div>
              </div>
            );
          })}
          <div style={{marginTop:8,paddingTop:24,borderTop:`1px solid ${T.border}`}}>
            {!showAddCat?(
              <button onClick={()=>setShowAddCat(true)} style={{fontSize:13,color:T.inkMuted,display:"inline-flex",alignItems:"center",gap:6,transition:"color 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.color=T.amberDark} onMouseLeave={e=>e.currentTarget.style.color=T.inkMuted}>
                <Icon name="plus" size={14}/>Nouvelle catégorie
              </button>
            ):(
              <div style={{background:T.paperCard,border:`1px solid ${T.amber}`,borderRadius:14,padding:"16px",animation:"slideUp 0.2s ease"}}>
                <div className="label-up" style={{marginBottom:12}}>Nouvelle catégorie</div>
                <div style={{display:"flex",gap:8,marginBottom:10}}>
                  <select value={newCatIcon} onChange={e=>setNewCatIcon(e.target.value)} style={{fontSize:13,background:T.paper,border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 8px",color:T.ink}}>
                    {CAT_ICONS_LIST.map(ic=><option key={ic} value={ic}>{ic}</option>)}
                  </select>
                  <input value={newCatName} onChange={e=>setNewCatName(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter")addCategory();if(e.key==="Escape")setShowAddCat(false);}}
                    placeholder="Nom de la catégorie…" autoFocus
                    style={{flex:1,fontSize:14,color:T.ink,background:T.paper,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 12px"}}/>
                </div>
                <div style={{display:"flex",gap:6,marginBottom:12}}>
                  {CAT_COLORS.map(c=><button key={c} onClick={()=>setNewCatColor(c)} style={{width:22,height:22,borderRadius:"50%",background:c,border:`2px solid ${newCatColor===c?T.ink:"transparent"}`,transition:"border 0.1s"}}/>)}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={addCategory} style={{padding:"7px 18px",borderRadius:20,fontSize:13,fontWeight:500,background:T.gradBtn,color:"white"}}>Créer</button>
                  <button onClick={()=>{setShowAddCat(false);setNewCatName("");}} style={{padding:"7px 14px",borderRadius:20,fontSize:13,color:T.inkMuted,border:`1px solid ${T.border}`,background:T.paperHover}}>Annuler</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal ajout espace */}
      {showAddSpace&&(
        <div style={{position:"fixed",inset:0,background:"rgba(44,36,18,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}} onClick={()=>setShowAddSpace(false)}>
          <div style={{background:T.paper,border:`1px solid ${T.amber}`,borderRadius:16,padding:"24px",width:340,animation:"slideUp 0.2s ease"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:14,fontWeight:500,color:T.ink,marginBottom:16}}>Nouvel espace</div>
            <input value={newSpaceName} onChange={e=>setNewSpaceName(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter")addSpace();if(e.key==="Escape")setShowAddSpace(false);}}
              placeholder="Nom de l'espace…" autoFocus
              style={{width:"100%",fontSize:14,color:T.ink,background:T.paperCard,border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 12px",marginBottom:10}}/>
            <select value={newSpaceCat} onChange={e=>setNewSpaceCat(e.target.value)} style={{width:"100%",fontSize:13,color:T.inkMuted,background:T.paperCard,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 12px",marginBottom:16}}>
              {categories.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <div style={{display:"flex",gap:8}}>
              <button onClick={addSpace} style={{flex:1,padding:"9px",borderRadius:10,background:T.gradBtn,color:"white",fontSize:14,fontWeight:500}}>Créer</button>
              <button onClick={()=>setShowAddSpace(false)} style={{padding:"9px 14px",borderRadius:10,background:T.paperHover,color:T.inkMuted,fontSize:14,border:`1px solid ${T.border}`}}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* SPACE DETAIL */}
      {view==="space"&&selectedSid&&(()=>{
        const sp=spaces.find(p=>p.id===selectedSid);
        if(!sp) return null;
        const cat=categories.find(c=>c.id===sp.category);
        const groups=PRIOS.map(prio=>({prio,cfg:PRIO_CONFIG[prio],tasks:sp.tasks.filter(t=>t.priority===prio)})).filter(g=>g.tasks.length>0);
        const done=sp.tasks.filter(t=>t.done);
        return(
          <div style={{maxWidth:600,margin:"0 auto",padding:"28px 20px"}}>
            <button onClick={()=>setView("spaces")} style={{fontSize:13,color:T.inkMuted,marginBottom:20,display:"inline-flex",alignItems:"center",gap:5,transition:"color 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.color=T.amberDark} onMouseLeave={e=>e.currentTarget.style.color=T.inkMuted}>
              <Icon name="arrowLeft" size={14}/>Espaces
            </button>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:24}}>
              {cat&&<Icon name={cat.icon} size={20} stroke={T.amberDark}/>}
              <div style={{flex:1}}>
                <InlineTitle value={sp.name} onSave={val=>setSpaces(prev=>prev.map(p=>p.id===sp.id?{...p,name:val}:p))}/>
                <div style={{fontSize:12,color:T.amberDark,marginTop:1}}>{cat?.label}</div>
              </div>
              <button onClick={()=>{setView("capture");setContextMode(sp.name);}}
                style={{padding:"7px 14px",borderRadius:20,fontSize:12,fontWeight:500,background:T.paperCard,color:T.amberDark,border:`1px solid ${T.border}`,display:"inline-flex",alignItems:"center",gap:6}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:T.amber,display:"inline-block"}}/>Contexte
              </button>
            </div>
            {sp.tasks.length===0?(
              <div style={{textAlign:"center",padding:"40px 0",color:T.inkFaint,fontSize:14}}>Aucune tâche — capture quelque chose !</div>
            ):(<>
              {groups.map(({prio,cfg,tasks})=>(
                <div key={prio} style={{marginBottom:22}}>
                  <div style={{fontSize:11,fontWeight:600,color:cfg.text,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                    <span style={{width:7,height:7,borderRadius:"50%",background:cfg.color,display:"inline-block"}}/>{cfg.label}
                  </div>
                  {tasks.map(task=><TaskRow key={task.id} task={task} space={sp} allSpaces={spaces} onToggle={toggleDone} onDelete={deleteTask} onChangePriority={changePriority} onMove={moveTask} onEditText={editTaskText}/>)}
                </div>
              ))}
              {done.length>0&&(
                <div style={{marginTop:16}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <div style={{flex:1,height:1,background:T.border}}/>
                    <span style={{fontSize:11,color:T.inkFaint,textTransform:"uppercase",letterSpacing:"0.12em"}}>Terminées · {done.length}</span>
                    <div style={{flex:1,height:1,background:T.border}}/>
                  </div>
                  {done.map(task=><TaskRow key={task.id} task={task} space={sp} allSpaces={spaces} onToggle={toggleDone} onDelete={deleteTask} onChangePriority={changePriority} onMove={moveTask} onEditText={editTaskText}/>)}
                </div>
              )}
            </>)}
          </div>
        );
      })()}

      {/* AUJOURD'HUI */}
      {view==="focus"&&(
        <div style={{maxWidth:500,margin:"0 auto",padding:"44px 20px"}}>
          <div style={{textAlign:"center",marginBottom:36}}>
            <div style={{fontSize:28,fontWeight:700,letterSpacing:"-0.03em",marginBottom:8,color:T.ink}}>Aujourd'hui</div>
            <div style={{fontSize:13,color:T.inkMuted,fontFamily:"DM Mono,monospace"}}>{new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}</div>
          </div>
          {focusTasks===null&&(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16,padding:"40px 0"}}>
              <div style={{display:"flex",alignItems:"center",gap:4,height:36}}>
                {[14,24,18,32,20,28,12].map((h,i)=><div key={i} style={{width:4,borderRadius:2,background:T.amber,height:h,animation:`waveBar 0.6s ease-in-out ${i*0.09}s infinite`}}/>)}
              </div>
              <div style={{fontSize:13,color:T.inkMuted}}>L'IA analyse tes tâches…</div>
            </div>
          )}
          {focusTasks?.length===0&&(
            <div style={{textAlign:"center",padding:"40px 0"}}>
              <div style={{fontSize:32,marginBottom:12,color:T.amber}}><Icon name="check" size={40} stroke={T.amber}/></div>
              <div style={{color:T.inkMuted,fontSize:15}}>Aucune tâche en cours</div>
            </div>
          )}
          {focusTasks?.length>0&&focusTasks.map((task,i)=>{
            const cfg=PRIO_CONFIG[task.priority]||PRIO_CONFIG.backlog;
            const cat=categories.find(c=>c.id===task.spaceCategory);
            return(
              <div key={task.id} style={{background:T.paperCard,border:`1px solid ${T.border}`,borderRadius:16,padding:"18px 20px",marginBottom:10,animation:`slideUp 0.3s ease ${i*0.1}s both`,transition:"border-color 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=T.amber} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                <div style={{display:"flex",alignItems:"flex-start",gap:16}}>
                  <div style={{fontSize:30,fontWeight:700,color:T.amber,opacity:0.32,fontFamily:"DM Mono,monospace",minWidth:34,lineHeight:1.05}}>{i+1}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:15,fontWeight:500,color:T.ink,marginBottom:8,lineHeight:1.4}}>{task.text}</div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                      <span style={{fontSize:12,color:T.inkMuted,display:"inline-flex",alignItems:"center",gap:5}}>
                        {cat&&<Icon name={cat.icon} size={13} stroke={T.inkMuted}/>}{task.spaceName}
                      </span>
                      <span style={{fontSize:11,padding:"2px 9px",borderRadius:8,fontWeight:500,background:cfg.bg,color:cfg.text}}>{cfg.label}</span>
                    </div>
                    {task.reason&&<div style={{display:"flex",alignItems:"center",gap:7,fontSize:12,color:T.inkMuted,fontStyle:"italic"}}>
                      <Icon name="sparkle" size={12} stroke={T.amber}/>{task.reason}
                    </div>}
                  </div>
                </div>
              </div>
            );
          })}
          {focusTasks!==null&&(
            <div style={{display:"flex",gap:10,marginTop:30,justifyContent:"center"}}>
              <button onClick={loadFocus} style={{padding:"10px 18px",borderRadius:20,fontSize:13,fontWeight:500,background:T.paperHover,border:`1px solid ${T.border}`,color:T.inkMuted,display:"inline-flex",alignItems:"center",gap:7}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=T.borderStrong;e.currentTarget.style.color=T.ink;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.inkMuted;}}>
                <Icon name="rotateCw" size={14}/>Recalculer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
