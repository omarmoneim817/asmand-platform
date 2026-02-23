/* eslint-disable */
import { useState, useEffect, useRef } from "react";

// XLSX loaded via CDN in public/index.html

// ═══════════════════════════════════════════════════
// DESIGN SYSTEM
// ═══════════════════════════════════════════════════
const C = {
  bg:"#04070a", s1:"#080e13", s2:"#0c1520", s3:"#111e2a", s4:"#162535",
  b:"#1a2d3d", b2:"#224060", b3:"#2a5080",
  accent:"#00d4aa", gold:"#e8a020", red:"#e63946", blue:"#4a9eff",
  purple:"#9b5de5", orange:"#ff6b35", cyan:"#00b4d8",
  t:"#b8ccd8", t2:"#4a6880", t3:"#2a4860", tb:"#e8f4fa"
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');
  @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
  @keyframes bar{0%,100%{transform:scaleY(0.3);opacity:0.3}50%{transform:scaleY(1);opacity:1}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes glow{0%,100%{box-shadow:0 0 8px rgba(0,212,170,0.3)}50%{box-shadow:0 0 24px rgba(0,212,170,0.7)}}
  @keyframes scan{0%{top:0}100%{top:100%}}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#04070a;}
  input,textarea,select{font-family:'JetBrains Mono',monospace;}
  input:focus,textarea:focus,select:focus{outline:none;border-color:#00d4aa!important;box-shadow:0 0 0 3px rgba(0,212,170,0.12);}
  ::-webkit-scrollbar{width:5px;height:5px}
  ::-webkit-scrollbar-track{background:#080e13}
  ::-webkit-scrollbar-thumb{background:#1a2d3d;border-radius:3px}
  ::-webkit-scrollbar-thumb:hover{background:#224060}
  a{color:#00d4aa;text-decoration:none}
  a:hover{text-decoration:underline}
  ::selection{background:rgba(0,212,170,0.25)}
`;

// ── STORAGE ──
const stor = {
  get: async (k) => { try { const r=localStorage.getItem(k); return r?JSON.parse(r):null; } catch { return null; } },
  set: async (k,v) => { try { localStorage.setItem(k,JSON.stringify(v)); } catch(e){console.error(e);} }
};

// ── AI CALL ──
// Repair truncated JSON by closing all open brackets/strings
function repairJSON(raw) {
  let s = raw.replace(/^```json\s*/,"").replace(/^```\s*/,"").replace(/\s*```$/,"").trim();
  const start = s.indexOf("{");
  if(start === -1) throw new Error("No JSON found in response");
  s = s.slice(start);
  try { return JSON.parse(s); } catch(_){}
  // Walk and track open structures to repair truncation
  let result = "";
  let stack = [];
  let inStr = false;
  let esc = false;
  for(let i=0;i<s.length;i++){
    const c=s[i];
    if(esc){result+=c;esc=false;continue;}
    if(c==="\\" && inStr){result+=c;esc=true;continue;}
    if(c==='"'){inStr=!inStr;result+=c;continue;}
    if(inStr){result+=c;continue;}
    if(c==="{"){stack.push("}");result+=c;continue;}
    if(c==="["){stack.push("]");result+=c;continue;}
    if(c==="}"||c==="]"){if(stack.length>0)stack.pop();result+=c;continue;}
    result+=c;
  }
  if(inStr) result+='"';
  result=result.replace(/,\s*$/,"");
  while(stack.length>0) result+=stack.pop();
  try{return JSON.parse(result);}
  catch(e){throw new Error("JSON repair failed: "+e.message);}
}

async function ai(prompt, maxTokens=3500) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":process.env.REACT_APP_ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:maxTokens,messages:[{role:"user",content:prompt}]})
  });
  const data = await res.json();
  if(data.error) throw new Error(data.error.message);
  const raw = (data.content||[]).map(b=>b.text||"").join("");
  return repairJSON(raw);
}

// ── TAG INPUT COMPONENT ──
function TagInput({ value, onChange, placeholder }) {
  const [input, setInput] = useState("");
  const tags = Array.isArray(value) ? value : (value ? value.split(",").map(s=>s.trim()).filter(Boolean) : []);

  const add = (raw) => {
    const newTags = raw.split(/[,;\n]/).map(s=>s.trim()).filter(s=>s&&!tags.includes(s));
    if(newTags.length) onChange([...tags, ...newTags]);
    setInput("");
  };

  const remove = (i) => onChange(tags.filter((_,j)=>j!==i));

  return (
    <div style={{border:"1px solid "+C.b,borderRadius:4,padding:"6px 8px",background:C.s2,minHeight:40}}>
      <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:tags.length?6:0}}>
        {tags.map((t,i)=>(
          <span key={i} style={{display:"inline-flex",alignItems:"center",gap:4,
            padding:"2px 8px",background:C.s3,border:"1px solid "+C.b2,
            borderRadius:3,fontFamily:"JetBrains Mono,monospace",fontSize:10,color:C.t}}>
            {t}
            <span onClick={()=>remove(i)} style={{cursor:"pointer",color:C.t2,fontSize:12,lineHeight:1}}>×</span>
          </span>
        ))}
      </div>
      <input
        value={input}
        onChange={e=>setInput(e.target.value)}
        onKeyDown={e=>{ if(e.key==="Enter"||e.key===","||e.key===";"){e.preventDefault();if(input.trim())add(input);} }}
        onBlur={()=>{ if(input.trim()) add(input); }}
        placeholder={tags.length===0?placeholder:"Add more (press Enter or comma)…"}
        style={{background:"transparent",border:"none",outline:"none",color:C.tb,
          fontFamily:"Inter,sans-serif",fontSize:12,width:"100%",minWidth:120}}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════
// UI PRIMITIVES
// ═══════════════════════════════════════════════════
const Mono = ({children,style={}}) => <span style={{fontFamily:"'JetBrains Mono',monospace",...style}}>{children}</span>;

const SLabel = ({children,color=C.accent,size=10}) => (
  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:size,letterSpacing:3,color,
    textTransform:"uppercase",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
    <span>{children}</span><div style={{flex:1,height:1,background:"linear-gradient(90deg,"+color+"40,transparent)"}}/>
  </div>
);

const Card = ({children,accent=C.accent,style={}}) => (
  <div style={{background:C.s1,border:"1px solid "+C.b,borderLeft:"3px solid "+accent,
    borderRadius:6,padding:"20px 22px",marginBottom:14,...style}}>{children}</div>
);

const GlassCard = ({children,style={}}) => (
  <div style={{background:"linear-gradient(135deg,rgba(8,14,19,0.9),rgba(12,21,32,0.7))",
    border:"1px solid "+C.b2,borderRadius:8,padding:"20px 22px",backdropFilter:"blur(10px)",...style}}>
    {children}
  </div>
);

const Input = ({style,...p}) => (
  <input {...p} style={{background:C.s2,border:"1px solid "+C.b,color:C.tb,
    fontFamily:"'JetBrains Mono',monospace",fontSize:12,padding:"10px 14px",
    borderRadius:4,width:"100%",...(style||{})}}/>
);
const Select = ({style,...p}) => (
  <select {...p} style={{background:C.s2,border:"1px solid "+C.b,color:C.tb,
    fontFamily:"'JetBrains Mono',monospace",fontSize:12,padding:"10px 14px",
    borderRadius:4,width:"100%",...(style||{})}}/>
);
const TA = ({style,...p}) => (
  <textarea {...p} style={{background:C.s2,border:"1px solid "+C.b,color:C.tb,
    fontFamily:"'JetBrains Mono',monospace",fontSize:12,padding:"10px 14px",
    borderRadius:4,width:"100%",resize:"vertical",lineHeight:1.7,...(style||{})}}/>
);

const Btn = ({children,onClick,variant="primary",disabled,style={}}) => {
  const variants = {
    primary:{background:"linear-gradient(135deg,"+C.accent+",#009977)",color:C.bg,border:"none",boxShadow:"0 4px 20px rgba(0,212,170,0.25)"},
    gold:{background:"linear-gradient(135deg,"+C.gold+",#c07010)",color:C.bg,border:"none",boxShadow:"0 4px 20px rgba(232,160,32,0.25)"},
    red:{background:"linear-gradient(135deg,"+C.red+",#c02030)",color:"#fff",border:"none"},
    sec:{background:"transparent",border:"1px solid "+C.b2,color:C.t2},
    ghost:{background:"transparent",border:"1px solid transparent",color:C.t2},
    purple:{background:"linear-gradient(135deg,"+C.purple+",#7040c0)",color:"#fff",border:"none"},
  };
  return <button onClick={onClick} disabled={disabled}
    style={{borderRadius:5,fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:11,
      letterSpacing:2,textTransform:"uppercase",cursor:disabled?"not-allowed":"pointer",
      display:"inline-flex",alignItems:"center",gap:8,padding:"10px 20px",
      opacity:disabled?0.5:1,transition:"all 0.2s",...variants[variant],...style}}>
    {children}
  </button>;
};

const Badge = ({label,color=C.accent,style={}}) => (
  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,padding:"3px 9px",
    border:"1px solid "+color,color,letterSpacing:1,textTransform:"uppercase",
    borderRadius:2,whiteSpace:"nowrap",...style}}>{label}</span>
);

const Field = ({label,children,style={}}) => (
  <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:14,...style}}>
    <label style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:2,
      color:C.t2,textTransform:"uppercase"}}>{label}</label>
    {children}
  </div>
);

const Loader = ({msg=""}) => (
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",
    justifyContent:"center",padding:"60px 20px",gap:20}}>
    <div style={{display:"flex",gap:4}}>
      {[0,1,2,3,4,5].map(i=>(
        <div key={i} style={{width:4,height:28,background:C.accent,borderRadius:2,
          animation:"bar 1.2s ease-in-out infinite",animationDelay:i*0.1+"s"}}/>
      ))}
    </div>
    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.accent,
      letterSpacing:3,textTransform:"uppercase",animation:"pulse 2s infinite"}}>{msg||"Processing…"}</div>
  </div>
);

const StatCard = ({label,value,sub,color=C.accent,icon}) => (
  <div style={{background:"linear-gradient(135deg,"+C.s1+","+C.s2+")",
    border:"1px solid "+C.b,borderRadius:6,padding:"18px 20px",
    borderTop:"3px solid "+color,position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",right:16,top:14,fontSize:22,opacity:0.15}}>{icon}</div>
    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:3,
      color:C.t2,textTransform:"uppercase",marginBottom:8}}>{label}</div>
    <div style={{fontWeight:900,fontSize:28,color,lineHeight:1,fontFamily:"Inter,sans-serif"}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:C.t2,marginTop:5,fontFamily:"Inter,sans-serif"}}>{sub}</div>}
  </div>
);

const Modal = ({title,children,onClose,wide}) => (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:2000,
    display:"flex",alignItems:"center",justifyContent:"center",padding:20,
    backdropFilter:"blur(4px)",animation:"fadeIn 0.2s ease"}}>
    <div style={{background:C.s1,border:"1px solid "+C.b2,borderRadius:8,
      width:"100%",maxWidth:wide?900:660,maxHeight:"90vh",overflow:"auto",
      padding:32,position:"relative",boxShadow:"0 40px 80px rgba(0,0,0,0.6)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <h3 style={{fontWeight:800,fontSize:20,color:C.tb,fontFamily:"Inter,sans-serif"}}>{title}</h3>
        <button onClick={onClose} style={{background:C.s2,border:"1px solid "+C.b,color:C.t2,
          borderRadius:4,padding:"6px 14px",cursor:"pointer",fontSize:18,lineHeight:1}}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const EmptyState = ({icon,title,sub}) => (
  <div style={{textAlign:"center",padding:"64px 20px",color:C.t2}}>
    <div style={{fontSize:48,marginBottom:16,filter:"grayscale(0.3)"}}>{icon}</div>
    <div style={{fontWeight:700,fontSize:15,color:C.t,marginBottom:8,fontFamily:"Inter,sans-serif"}}>{title}</div>
    {sub&&<div style={{fontSize:13,color:C.t2,fontFamily:"Inter,sans-serif"}}>{sub}</div>}
  </div>
);

const ScoreBar = ({value,max=100,color=C.accent}) => (
  <div style={{height:6,background:C.s3,borderRadius:3,overflow:"hidden"}}>
    <div style={{height:"100%",width:Math.min(value/max*100,100)+"%",
      background:"linear-gradient(90deg,"+color+"80,"+color+")",
      borderRadius:3,transition:"width 1s ease"}}/>
  </div>
);

const statusColor = s => s==="Won"?C.accent:s==="Lost"?C.red:s==="Submitted"?C.blue:s==="Pending"?C.gold:s==="Cancelled"?C.t2:C.t2;
const threatColor = t => t==="CRITICAL"?C.red:t==="HIGH"?C.orange:t==="MEDIUM"?C.gold:C.t2;
const exportColor = e => e==="low"?C.accent:e==="high"?C.red:C.gold;

// ═══════════════════════════════════════════════════
// AI ANALYSIS ENGINE — 2 focused calls, aggressive global research
// ═══════════════════════════════════════════════════

const TODAY = new Date().toISOString().slice(0,10);

const STRICT_SEPARATION = `
ABSOLUTE RULE — NEVER BREAK THIS:
- SUPPLIERS = international manufacturers/companies Ashmand BUYS EQUIPMENT FROM to fulfill the tender. They make or sell the physical product.
- COMPETITORS = Egyptian distributors or foreign companies who will SUBMIT A BID against Ashmand for this same tender.
These are COMPLETELY DIFFERENT categories. A supplier CANNOT appear as a competitor. A competitor CANNOT appear as a supplier. If you confuse these, the analysis is worthless.
`;

function buildPrompt1(tenderDoc, userSuppliers, userCompetitors) {
  const suppSection = userSuppliers && userSuppliers.length > 0
    ? "ASHMAND'S CURRENT SUPPLIERS (evaluate these + find MORE new ones): "+userSuppliers.map(s=>s.name+" ("+s.country+")").join("; ")
    : "ASHMAND HAS NO EXISTING SUPPLIERS — find the best worldwide from scratch.";
  const compNames = userCompetitors && userCompetitors.length > 0
    ? "KNOWN COMPETITORS (DO NOT put these in suppliers list): "+userCompetitors.join(", ")
    : "";

  return "Elite defence procurement analyst — Egyptian MOD market expert. Find REAL global suppliers for this tender. Return ONLY valid compact JSON. CRITICAL: every string value MUST be 10 words or less. No exceptions.\n\n"
  +STRICT_SEPARATION
  +suppSection+"\n"+compNames+"\n\n"
  +"TENDER (first 1800 chars):\n"+tenderDoc.slice(0,1800)+"\n\n"
  +"Return ONLY this JSON structure — ALL string values max 10 words:\n"
  +'{"tender":{"refNum":"","title":"","authority":"","branch":"Army|Navy|Air Force|Air Defence|MOD|NSPO|AOI|Police","category":"PPE|Weapons & Ammunition|Electronics & Communications|Vehicles & Logistics|Surveillance|C2 Systems|MRO|Training|Other","estimatedValue":"","deadline":"YYYY-MM-DD","dateReceived":"'+TODAY+'","quantity":"","keySpecs":["s1","s2","s3"],"requiredCertifications":["c1"],"summary":"max 20 words total"},'
  +'"opportunityScore":75,"verdict":"GO","verdictReason":"max 10 words","yourStrengths":["s1","s2","s3"],"yourWeaknesses":["w1","w2"],"criticalSuccessFactors":["f1","f2","f3"],'
  +'"suppliers":{'
  +'"existing":[{"name":"","country":"","suitabilityScore":80,"fitAssessment":"max 10 words","exportRisk":"low|medium|high","egyptRelationship":"established|good|developing|unknown","pricePosition":"budget|competitive|premium","leadTime":"","negotiationTip":"max 10 words","email":"","website":""}],'
  +'"recommended":[{"name":"","country":"","rank":1,"whyBest":"max 12 words","exportRisk":"low|medium|high","egyptRelationship":"established|good|developing|unknown","pricePosition":"budget|competitive|premium","leadTime":"","keyProducts":["p1"],"egyptProjects":"max 8 words","negotiationTip":"max 10 words","email":"","website":""}],'
  +'"sourceCountries":[{"country":"","score":85,"exportLicenseEase":"easy|moderate|difficult|blocked","priceLevel":"low|medium|high","qualityLevel":"standard|premium|world-class","egyptBilateralRelation":"excellent|good|neutral|tense","strategicNotes":"max 8 words"}]'
  +'}}\n\n'
  +'Give: existing suppliers assessed, EXACTLY 4 recommended suppliers from different countries, EXACTLY 3 source countries. String values MUST be 10 words or less.';
}

function buildPrompt2(tenderDoc, userCompetitors, tenderTitle, tenderCategory) {
  const compSection = userCompetitors && userCompetitors.length > 0
    ? "ASHMAND IDENTIFIED THESE COMPETITORS (isManual:true, analyse each one): "+userCompetitors.join(", ")
    : "No competitors identified by user yet.";

  return "Egyptian defence market competitive intelligence analyst. Build win strategy. Return ONLY valid compact JSON. ALL string values MUST be 10 words or less.\n\n"
  +STRICT_SEPARATION
  +compSection+"\n\nTENDER: "+tenderTitle+" ("+tenderCategory+")\n"+tenderDoc.slice(0,1200)+"\n\n"
  +"Return ONLY this JSON — ALL string values max 10 words:\n"
  +'{"competition":{'
  +'"knownCompetitors":[{"name":"","type":"Egyptian distributor|Foreign integrator|State entity","country":"Egypt","threatLevel":"HIGH","whyThreat":"max 8 words","theirLikelySuppliers":"max 8 words","theirAdvantages":["a1"],"theirWeaknesses":["w1"],"howToBeat":"max 10 words","isManual":true}],'
  +'"discoveredCompetitors":[{"name":"","type":"Egyptian distributor","country":"Egypt","threatLevel":"HIGH","whyThreat":"max 8 words","theirLikelySuppliers":"max 8 words","theirAdvantages":["a1"],"theirWeaknesses":["w1"],"howToBeat":"max 10 words","isManual":false}],'
  +'"competitiveIntelligence":"max 15 words","marketPosition":"max 10 words"},'
  +'"winStrategy":{"overallApproach":"max 15 words",'
  +'"pricingStrategy":{"recommendation":"max 10 words","targetMargin":"X-Y%","pricingTactics":["max 8 words","t2","t3"]},'
  +'"preSubmissionActions":["a1","a2","a3","a4"],"keyDifferentiators":["d1","d2","d3"],'
  +'"technicalCompliance":["s1","s2"],"relationshipLeverage":"max 10 words",'
  +'"riskMitigation":["r1","r2"],"redFlags":["f1","f2"],'
  +'"priorityActionList":[{"action":"max 8 words","deadline":"X days","owner":"You","impact":"max 8 words"}],'
  +'"winProbability":65,"winProbabilityFactors":"max 10 words"},'
  +'"intelligence":{"marketContext":"max 15 words","budgetCycle":"max 10 words","decisionMakers":"max 10 words",'
  +'"incumbentAdvantage":"max 10 words","politicalConsiderations":"max 10 words",'
  +'"offsetStrategy":"max 8 words","pastTenderPatterns":"max 10 words","insiderTips":["tip1","tip2","tip3"]}}\n\n'
  +'Give: all user competitors analysed, EXACTLY 3 discovered competitors, 4 priority actions. Every string MUST be 10 words max.';
}

// ═══════════════════════════════════════════════════
// MODULE: TENDER INTELLIGENCE (AI Analysis)
// ═══════════════════════════════════════════════════
// ═══════════════════════════════════════════════════
// COMPETITOR INTELLIGENCE LOG
// ═══════════════════════════════════════════════════
function CompetitorLog({ tenderId, competitors }) {
  const [logs,setLogs]     = useState([]);
  const [showForm,setShowForm] = useState(false);
  const [editId,setEditId] = useState(null);
  const [form,setForm]     = useState({competitor:"",date:TODAY,event:"","theirPrice":"",theirSupplier:"",theirStrength:"",theirMistake:"",whatWorked:"",whatFailed:"",outcome:"",lessons:"",nextTime:""});

  useEffect(()=>{
    stor.get("ashmand:complog").then(all=>{
      if(all) setLogs(all.filter(l=>l.tenderId===tenderId));
    });
  },[tenderId]);

  const persist = async (updated) => {
    setLogs(updated);
    const all = await stor.get("ashmand:complog") || [];
    const otherLogs = all.filter(l=>l.tenderId!==tenderId);
    await stor.set("ashmand:complog",[...updated,...otherLogs]);
  };

  const f = (k,v) => setForm(p=>({...p,[k]:v}));
  const openNew  = () => { setForm({competitor:"",date:TODAY,event:"",theirPrice:"",theirSupplier:"",theirStrength:"",theirMistake:"",whatWorked:"",whatFailed:"",outcome:"",lessons:"",nextTime:""}); setEditId(null); setShowForm(true); };
  const openEdit = (l) => { setForm({...l}); setEditId(l.id); setShowForm(true); };
  const submit   = () => {
    if(!form.competitor){window.alert("Competitor name required.");return;}
    const entry = {...form,id:editId||Date.now()+"",tenderId};
    if(editId) persist(logs.map(l=>l.id===editId?entry:l));
    else persist([entry,...logs]);
    setShowForm(false);
  };
  const remove = (id) => { if(window.confirm("Delete log entry?")) persist(logs.filter(l=>l.id!==id)); };

  const EVENTS = ["They submitted a bid","They won the tender","We won over them","They dropped out","Intel gathered","Meeting/interaction","Post-award debrief","Other"];
  const OUTCOMES = ["They Won","We Won","No Award","Tender Cancelled","Still Pending"];

  return (
    <div style={{animation:"fadeUp 0.2s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontWeight:700,fontSize:18,color:C.tb,fontFamily:"Inter,sans-serif",marginBottom:4}}>Competitor Intelligence Log</div>
          <div style={{fontSize:13,color:C.t2,fontFamily:"Inter,sans-serif"}}>Record everything your competitors do — prices, suppliers, strategies, mistakes. This is your long-term competitive edge.</div>
        </div>
        <Btn onClick={openNew} variant="red">+ LOG COMPETITOR ACTIVITY</Btn>
      </div>

      {/* Quick add from AI-identified competitors */}
      {competitors?.length>0&&(
        <Card accent={C.t2} style={{marginBottom:16}}>
          <SLabel color={C.t2}>Quick Add — AI-Identified Competitors</SLabel>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {competitors.map((c,i)=>(
              <div key={i} onClick={()=>{setForm(p=>({...p,competitor:c.name,date:TODAY}));setEditId(null);setShowForm(true);}}
                style={{padding:"6px 14px",background:C.s2,border:"1px solid "+threatColor(c.threatLevel),
                  borderRadius:3,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:threatColor(c.threatLevel)}}>{c.threatLevel}</span>
                <span style={{fontSize:13,color:C.tb,fontFamily:"Inter,sans-serif",fontWeight:600}}>{c.name}</span>
                <span style={{fontSize:11,color:C.t2}}>+ Log</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {logs.length===0
        ?<EmptyState icon="📓" title="No Competitor Activity Logged Yet" sub="Every time a competitor does something — bids, wins, loses, quotes a price — log it here. Over time this becomes your most valuable intelligence."/>
        :logs.map(l=>(
          <div key={l.id} style={{background:C.s1,border:"1px solid "+C.b,borderRadius:6,padding:"16px 20px",marginBottom:10,borderLeft:"3px solid "+C.red}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:8}}>
              <div>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:4}}>
                  <span style={{fontWeight:800,fontSize:15,color:C.tb,fontFamily:"Inter,sans-serif"}}>{l.competitor}</span>
                  {l.event&&<Badge label={l.event} color={C.red}/>}
                  {l.outcome&&<Badge label={l.outcome} color={l.outcome==="We Won"?C.accent:l.outcome==="They Won"?C.red:C.t2}/>}
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.t2}}>{l.date}</span>
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <Btn variant="sec" onClick={()=>openEdit(l)} style={{fontSize:9,padding:"4px 8px"}}>Edit</Btn>
                <Btn variant="ghost" onClick={()=>remove(l.id)} style={{fontSize:9,padding:"4px 8px",color:C.red}}>✕</Btn>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {l.theirPrice&&<div style={{background:C.s2,padding:"8px 10px",borderRadius:3}}><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.gold,letterSpacing:2,marginBottom:3}}>THEIR PRICE</div><div style={{fontSize:12,color:C.t,fontFamily:"Inter,sans-serif"}}>{l.theirPrice}</div></div>}
              {l.theirSupplier&&<div style={{background:C.s2,padding:"8px 10px",borderRadius:3}}><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.blue,letterSpacing:2,marginBottom:3}}>THEIR SUPPLIER</div><div style={{fontSize:12,color:C.t,fontFamily:"Inter,sans-serif"}}>{l.theirSupplier}</div></div>}
              {l.theirStrength&&<div style={{background:C.s2,padding:"8px 10px",borderRadius:3}}><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.red,letterSpacing:2,marginBottom:3}}>THEIR STRENGTH</div><div style={{fontSize:12,color:C.t,fontFamily:"Inter,sans-serif"}}>{l.theirStrength}</div></div>}
              {l.theirMistake&&<div style={{background:C.s2,padding:"8px 10px",borderRadius:3}}><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.accent,letterSpacing:2,marginBottom:3}}>THEIR MISTAKE</div><div style={{fontSize:12,color:C.t,fontFamily:"Inter,sans-serif"}}>{l.theirMistake}</div></div>}
              {l.whatWorked&&<div style={{background:C.s2,padding:"8px 10px",borderRadius:3}}><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.accent,letterSpacing:2,marginBottom:3}}>WHAT WORKED FOR US</div><div style={{fontSize:12,color:C.t,fontFamily:"Inter,sans-serif"}}>{l.whatWorked}</div></div>}
              {l.whatFailed&&<div style={{background:C.s2,padding:"8px 10px",borderRadius:3}}><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.red,letterSpacing:2,marginBottom:3}}>WHAT FAILED</div><div style={{fontSize:12,color:C.t,fontFamily:"Inter,sans-serif"}}>{l.whatFailed}</div></div>}
            </div>
            {l.lessons&&<div style={{marginTop:8,padding:"8px 12px",background:"rgba(155,93,229,0.06)",border:"1px solid "+C.purple+"40",borderRadius:4}}><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.purple,letterSpacing:2,marginBottom:3}}>LESSONS LEARNED</div><div style={{fontSize:12,color:C.t,fontFamily:"Inter,sans-serif"}}>{l.lessons}</div></div>}
            {l.nextTime&&<div style={{marginTop:6,padding:"8px 12px",background:"rgba(0,212,170,0.05)",border:"1px solid "+C.accent+"30",borderRadius:4}}><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.accent,letterSpacing:2,marginBottom:3}}>NEXT TIME DO THIS</div><div style={{fontSize:12,color:C.t,fontFamily:"Inter,sans-serif"}}>{l.nextTime}</div></div>}
          </div>
        ))
      }

      {showForm&&(
        <Modal title="Log Competitor Activity" onClose={()=>setShowForm(false)} wide>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Field label="Competitor Name *"><Input value={form.competitor} onChange={e=>f("competitor",e.target.value)} placeholder="Company name"/></Field>
            <Field label="Date"><Input type="date" value={form.date} onChange={e=>f("date",e.target.value)}/></Field>
            <Field label="Event Type">
              <Select value={form.event} onChange={e=>f("event",e.target.value)}>
                <option value="">Select event…</option>
                {EVENTS.map(v=><option key={v}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Outcome">
              <Select value={form.outcome} onChange={e=>f("outcome",e.target.value)}>
                <option value="">Select outcome…</option>
                {OUTCOMES.map(v=><option key={v}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Their Bid Price (if known)"><Input value={form.theirPrice} onChange={e=>f("theirPrice",e.target.value)} placeholder="e.g. EGP 48M or 20% below us"/></Field>
            <Field label="Their Supplier (if known)"><Input value={form.theirSupplier} onChange={e=>f("theirSupplier",e.target.value)} placeholder="e.g. Chinese manufacturer, Norinco…"/></Field>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Field label="What Was Their Strength?"><TA value={form.theirStrength} onChange={e=>f("theirStrength",e.target.value)} rows={2} placeholder="What made them competitive…"/></Field>
            <Field label="What Was Their Mistake?"><TA value={form.theirMistake} onChange={e=>f("theirMistake",e.target.value)} rows={2} placeholder="What they got wrong…"/></Field>
            <Field label="What Worked For Us?"><TA value={form.whatWorked} onChange={e=>f("whatWorked",e.target.value)} rows={2} placeholder="Our tactics that worked…"/></Field>
            <Field label="What Failed For Us?"><TA value={form.whatFailed} onChange={e=>f("whatFailed",e.target.value)} rows={2} placeholder="What we should have done differently…"/></Field>
          </div>
          <Field label="Lessons Learned"><TA value={form.lessons} onChange={e=>f("lessons",e.target.value)} rows={2} placeholder="Key takeaways for future tenders against this competitor…"/></Field>
          <Field label="Next Time — Do This Differently"><TA value={form.nextTime} onChange={e=>f("nextTime",e.target.value)} rows={2} placeholder="Specific actions to take next time to beat them…"/></Field>
          <div style={{display:"flex",gap:10,marginTop:8}}>
            <Btn onClick={submit} variant="red">{editId?"SAVE":"LOG ACTIVITY"}</Btn>
            <Btn variant="sec" onClick={()=>setShowForm(false)}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function TenderIntelligence({ suppliers, onSaveSuppliers }) {
  // Load persisted state from localStorage so navigation doesn't clear work
  const _saved = (() => { try { const r=localStorage.getItem("ashmand:intel_session"); return r?JSON.parse(r):{}; } catch{return {};} })();

  const [step,setStep]           = useState(_saved.step||"input");
  const [tenderDoc,setTenderDoc] = useState(_saved.tenderDoc||"");
  const [pdfName,setPdfName]     = useState(_saved.pdfName||"");
  const [hasSuppliers,setHasSuppliers] = useState(_saved.hasSuppliers||null);
  const [knownComps,setKnownComps]     = useState(_saved.knownComps||[]);
  const [compInput,setCompInput]       = useState("");
  const [result,setResult]             = useState(_saved.result||null);
  const [loadMsg,setLoadMsg]           = useState("");
  const [activeTab,setActiveTab]       = useState(_saved.activeTab||"overview");
  const [error,setError]               = useState("");
  const [saveMsg,setSaveMsg]           = useState("");
  const [genMoreLoading, setGenMoreLoading] = useState(false);
  const [extraSuppliers, setExtraSuppliers] = useState(_saved.extraSuppliers||[]);
  const pdfRef = useRef(null);

  // Persist session whenever key state changes
  const persist_session = (updates) => {
    try {
      const current = (() => { try { const r=localStorage.getItem("ashmand:intel_session"); return r?JSON.parse(r):{}; } catch{return {};} })();
      localStorage.setItem("ashmand:intel_session", JSON.stringify({...current,...updates}));
    } catch{}
  };

  // Clear everything
  const clearSession = () => {
    localStorage.removeItem("ashmand:intel_session");
    setStep("input"); setTenderDoc(""); setPdfName(""); setHasSuppliers(null);
    setKnownComps([]); setResult(null); setActiveTab("overview");
    setError(""); setSaveMsg(""); setExtraSuppliers([]);
  };

  const LOAD_MSGS = [
    "Reading tender document…","Extracting technical requirements…",
    "Hunting suppliers across USA, Europe, Asia…","Researching export licences…",
    "Scanning Turkish, Korean & Chinese manufacturers…","Analysing Egyptian MOD market…",
    "Identifying competitors in Egypt…","Building competitive intelligence…",
    "Crafting ruthless win strategy…","Auto-saving suppliers to directory…"
  ];

  // PDF → base64 → extract text via AI
  const handlePDF = async (file) => {
    if(!file) return;
    setPdfName(file.name);
    setTenderDoc(""); setError("");
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64 = e.target.result.split(",")[1];
        setLoadMsg("Reading PDF…"); setStep("analyzing");
        const res = await fetch("https://api.anthropic.com/v1/messages",{
          method:"POST",
          headers:{"Content-Type":"application/json","x-api-key":process.env.REACT_APP_ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
          body:JSON.stringify({
            model:"claude-sonnet-4-20250514", max_tokens:2000,
            messages:[{role:"user",content:[
              {type:"document",source:{type:"base64",media_type:"application/pdf",data:base64}},
              {type:"text",text:"Extract ALL text from this tender document. Return only the raw text, nothing else."}
            ]}]
          })
        });
        const data = await res.json();
        if(data.error) throw new Error(data.error.message);
        const extracted = (data.content||[]).map(b=>b.text||"").join("");
        setTenderDoc(extracted);
        persist_session({tenderDoc:extracted, pdfName:file.name});
        setStep("input");
        setError("");
      } catch(e) {
        setError("PDF read failed: "+e.message);
        setStep("input");
      }
    };
    reader.readAsDataURL(file);
  };

  const runAnalysis = async () => {
    if(!tenderDoc.trim()){setError("Paste the tender document first.");return;}
    if(hasSuppliers===null){setError("Select your supplier situation first.");return;}
    setError(""); setStep("analyzing");
    let i=0; setLoadMsg(LOAD_MSGS[0]);
    const iv=setInterval(()=>{i=(i+1)%LOAD_MSGS.length;setLoadMsg(LOAD_MSGS[i]);},2200);
    try {
      const suppList = hasSuppliers ? (suppliers||[]) : [];

      // CALL 1 — Tender + aggressive global supplier hunt
      setLoadMsg("Hunting global suppliers across 6 continents…");
      const part1 = await ai(buildPrompt1(tenderDoc, suppList, knownComps), 3500);

      // CALL 2 — Competition + Strategy + Intelligence
      setLoadMsg("Building competitive intelligence & win strategy…");
      const tenderTitle    = part1?.tender?.title    || "This tender";
      const tenderCategory = part1?.tender?.category || "Defence";
      const part2 = await ai(buildPrompt2(tenderDoc, knownComps, tenderTitle, tenderCategory), 3500);

      // MERGE
      const merged = { ...part1, ...part2 };

      // Ensure competitors list never contains any supplier names
      const supplierNames = new Set([
        ...(merged.suppliers?.recommended||[]).map(s=>s.name?.toLowerCase()),
        ...(merged.suppliers?.existing||[]).map(s=>s.name?.toLowerCase()),
      ]);
      if(merged.competition?.knownCompetitors)
        merged.competition.knownCompetitors = merged.competition.knownCompetitors.filter(c=>!supplierNames.has(c.name?.toLowerCase()));
      if(merged.competition?.discoveredCompetitors)
        merged.competition.discoveredCompetitors = merged.competition.discoveredCompetitors.filter(c=>!supplierNames.has(c.name?.toLowerCase()));

      // Add manually entered competitors AI may have missed
      if(knownComps.length > 0) {
        if(!merged.competition) merged.competition = {};
        if(!merged.competition.knownCompetitors) merged.competition.knownCompetitors = [];
        const aiNames = merged.competition.knownCompetitors.map(c=>c.name?.toLowerCase());
        knownComps.forEach(kc => {
          if(!aiNames.includes(kc.toLowerCase()) && !supplierNames.has(kc.toLowerCase())) {
            merged.competition.knownCompetitors.unshift({
              name:kc, type:"Egyptian distributor", country:"Egypt",
              threatLevel:"MEDIUM", whyThreat:"Identified by Ashmand as active in this market.",
              theirLikelySuppliers:"Unknown", theirAdvantages:["Market presence"],
              theirWeaknesses:["Unknown — assess directly"],
              howToBeat:"Compete on price, delivery speed, and supplier quality.",
              recentActivity:"Not yet assessed.", isManual:true
            });
          }
        });
      }

      // AUTO-SAVE ALL suppliers to directory immediately
      const allNewSuppliers = [
        ...(merged.suppliers?.recommended||[]),
        ...(merged.suppliers?.existing||[]),
      ].filter(s => s.name && s.name.trim());

      if(allNewSuppliers.length > 0) {
        const currentDir = await stor.get("asmand:suppliers") || [];
        const currentNames = new Set(currentDir.map(s=>s.name?.toLowerCase()));
        const toAdd = allNewSuppliers
          .filter(s => !currentNames.has(s.name.toLowerCase()))
          .map(s => ({
            id: Date.now()+"-"+Math.random().toString(36).slice(2,7),
            name: s.name, country: s.country||"",
            category: merged.tender?.category||"Other",
            exportRisk: s.exportRisk||"",
            pricePosition: s.pricePosition||"",
            egyptRelationship: s.egyptRelationship||"",
            certifications: s.certifications||[],
            keyProducts: s.keyProducts||[],
            email: s.email||"", website: s.website||"",
            linkedIn: s.linkedIn||"",
            notes: s.whyBest||s.fitAssessment||"",
            addedFrom: "AI Analysis — "+(merged.tender?.title||"Tender"),
            dateAdded: TODAY,
          }));
        if(toAdd.length > 0) {
          const updated = [...toAdd, ...currentDir];
          await stor.set("asmand:suppliers", updated);
          if(onSaveSuppliers) onSaveSuppliers(updated);
          setSaveMsg("✓ "+toAdd.length+" new supplier"+(toAdd.length>1?"s":"")+" auto-saved to Supplier Directory");
          setTimeout(()=>setSaveMsg(""),6000);
        }
      }

      setResult(merged);
      setActiveTab("overview");
      setStep("result");
      persist_session({result:merged, step:"result", activeTab:"overview", tenderDoc, knownComps, hasSuppliers, pdfName});

      // AUTO-SAVE to Tenders File
      if(merged?.tender?.title || merged?.tender?.refNum) {
        const existingT = await stor.get("asmand:tenders") || [];
        const t = merged.tender;
        const autoRef = t.refNum || "AUTO-"+Date.now();
        const alreadySaved = existingT.some(e=>e.refNum===autoRef);
        if(!alreadySaved) {
          const newT = {
            id: Date.now()+"",
            refNum: autoRef,
            title: t.title, authority: t.authority,
            category: t.category, dateReceived: t.dateReceived||new Date().toISOString().slice(0,10),
            deadline: t.deadline, value: t.estimatedValue,
            status: "Pending", notes: t.summary,
            rawDoc: tenderDoc,
            aiAnalysis: JSON.stringify(merged),
            winProbability: merged.winStrategy?.winProbability,
            autoSynced: true,
          };
          await stor.set("asmand:tenders", [newT, ...existingT]);
          setSaveMsg("✓ Tender auto-saved to Tenders File");
          setTimeout(()=>setSaveMsg(""), 5000);
        }
      }
    } catch(e) {
      setError("Analysis failed: "+e.message);
      setStep("input");
    }
    clearInterval(iv);
  };

  const saveSupplierToDirectory = async (sup) => {
    const existing = await stor.get("asmand:suppliers") || [];
    const newSup = {
      id: Date.now()+"",
      name: sup.name, country: sup.country,
      category: result?.tender?.category||"Other",
      exportRisk: sup.exportRisk, pricePosition: sup.pricePosition,
      egyptRelationship: sup.egyptRelationship||sup.egyptRelation,
      certifications: sup.certifications||[],
      keyProducts: sup.keyProducts||[],
      email: sup.email||"", website: sup.website||"",
      linkedIn: sup.linkedIn||"",
      notes: sup.whyBest||sup.fitAssessment||"",
      addedFrom: "AI Analysis — "+( result?.tender?.title||"Tender"),
      dateAdded: new Date().toISOString().slice(0,10),
      rating: sup.suitabilityScore||sup.rank||null
    };
    const updated = [newSup,...existing.filter(e=>e.name!==sup.name)];
    await stor.set("asmand:suppliers",updated);
    setSaveMsg("✓ "+sup.name+" saved to Supplier Directory");
    setTimeout(()=>setSaveMsg(""),3000);
    if(onSaveSuppliers) onSaveSuppliers(updated);
  };

  const saveAnalysisToTender = async () => {
    if(!result?.tender) return;
    const existing = await stor.get("asmand:tenders") || [];
    const t = result.tender;
    const newT = {
      id: Date.now()+"",
      refNum: t.refNum||"AUTO-"+Date.now(),
      title: t.title, authority: t.authority,
      category: t.category, dateReceived: t.dateReceived||new Date().toISOString().slice(0,10),
      deadline: t.deadline, value: t.estimatedValue,
      status: "Pending", notes: t.summary,
      rawDoc: tenderDoc,
      aiAnalysis: JSON.stringify(result),
      winProbability: result.winStrategy?.winProbability
    };
    await stor.set("asmand:tenders",[newT,...existing.filter(e=>e.refNum!==newT.refNum)]);
    setSaveMsg("✓ Tender saved to Ashmand Tenders file");
    setTimeout(()=>setSaveMsg(""),3000);
  };

  const addComp = () => { if(compInput.trim()){const nc=[...knownComps,compInput.trim()];setKnownComps(nc);persist_session({knownComps:nc});setCompInput("");} };

  // GENERATE MORE SUPPLIERS
  const generateMoreSuppliers = async () => {
    if(!result) return;
    setGenMoreLoading(true);
    try {
      const prompt = `You are a global defence procurement sourcing specialist. For this Egyptian MOD tender, generate 6 ADDITIONAL supplier recommendations that were NOT already listed. Include some less obvious options, regional players, and direct manufacturer alternatives.

TENDER: ${result.tender?.title||"Defence procurement"}
CATEGORY: ${result.tender?.category||"Defence equipment"}
SPECS: ${(result.tender?.keySpecs||[]).join(", ")}
CERTIFICATIONS REQUIRED: ${(result.tender?.requiredCertifications||[]).join(", ")}
ALREADY RECOMMENDED: ${(result.suppliers?.recommended||[]).map(s=>s.name).join(", ")}

Return ONLY a JSON array of 6 suppliers:
[{
  "name": "Company Name",
  "country": "Country",
  "exportRisk": "Low|Medium|High",
  "pricePosition": "Budget|Competitive|Premium",
  "egyptRelationship": "Active|Limited|New",
  "keyProducts": ["product1","product2"],
  "whyBest": "2 sentence explanation of why good for this tender",
  "email": "info@company.com or empty",
  "website": "https://... or empty",
  "negotiationTip": "specific tip"
}]`;
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":process.env.REACT_APP_ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:2000,messages:[{role:"user",content:prompt}]})
      });
      const data = await res.json();
      const raw = (data.content||[]).map(b=>b.text||"").join("");
      const start = raw.indexOf("["), end = raw.lastIndexOf("]");
      const parsed = JSON.parse(raw.slice(start, end+1));
      setExtraSuppliers(p=>[...p,...parsed]);
    } catch(e) {
      window.alert("Failed to generate suppliers: "+e.message);
    }
    setGenMoreLoading(false);
  };

  const saveExtraSupplier = async (sup) => {
    const existing = await stor.get("asmand:suppliers") || [];
    const newSup = {
      id: Date.now()+"",
      name: sup.name, country: sup.country,
      category: result?.tender?.category||"Other",
      exportRisk: sup.exportRisk||"",
      pricePosition: sup.pricePosition||"",
      egyptRelationship: sup.egyptRelationship||"",
      keyProducts: sup.keyProducts||[],
      email: sup.email||"",
      website: sup.website||"",
      notes: sup.whyBest||"",
      addedFrom: "Generate More — "+(result?.tender?.title||"Tender"),
      dateAdded: new Date().toISOString().slice(0,10),
    };
    const updated = [newSup,...existing.filter(e=>e.name!==newSup.name)];
    await stor.set("asmand:suppliers", updated);
    if(onSaveSuppliers) onSaveSuppliers(updated);
    setSaveMsg("✓ "+sup.name+" saved to Supplier Directory");
    setTimeout(()=>setSaveMsg(""),3000);
  };

  const setTabAndPersist = (t) => { setActiveTab(t); persist_session({activeTab:t}); };

  const VTABS = [
    {id:"overview",    label:"🎯 Overview"},
    {id:"suppliers",   label:"🏭 Suppliers"},
    {id:"competition", label:"⚔️ Competition"},
    {id:"complog",     label:"📓 Competitor Log"},
    {id:"strategy",    label:"🏆 Win Strategy"},
    {id:"intelligence",label:"🔍 Deep Intel"},
  ];

  if(step==="analyzing") return (
    <div style={{textAlign:"center",padding:"80px 20px"}}>
      <div style={{marginBottom:30}}>
        <div style={{width:60,height:60,border:"3px solid "+C.accent,borderTopColor:"transparent",
          borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 20px"}}/>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:C.accent,
          letterSpacing:3,textTransform:"uppercase",animation:"pulse 2s infinite"}}>{loadMsg}</div>
      </div>
      <div style={{maxWidth:500,margin:"0 auto",background:C.s1,border:"1px solid "+C.b,
        borderRadius:6,padding:"16px 20px"}}>
        {LOAD_MSGS.map((m,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"4px 0",
            color:m===loadMsg?C.accent:C.t3,fontSize:12,fontFamily:"'JetBrains Mono',monospace"}}>
            <span style={{color:m===loadMsg?C.accent:"transparent"}}>▶</span>{m}
          </div>
        ))}
      </div>
    </div>
  );

  if(step==="input") return (
    <div style={{animation:"fadeUp 0.3s ease both"}}>
      <div style={{marginBottom:24,display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{fontSize:26,fontWeight:900,color:C.tb,fontFamily:"Inter,sans-serif",marginBottom:6}}>
            AI Tender Intelligence Engine
          </h2>
          <p style={{fontSize:14,color:C.t2,fontFamily:"Inter,sans-serif",lineHeight:1.6}}>
            Paste any tender document. Our AI performs a deeper analysis than any human analyst — suppliers, competition, strategy, and actionable intel to maximise your win rate.
          </p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {(tenderDoc||result)&&(
            <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",
              background:"rgba(0,212,170,0.06)",border:"1px solid "+C.accent,borderRadius:5}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:C.accent}}/>
              <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:C.accent}}>SESSION SAVED</span>
            </div>
          )}
          {(tenderDoc||result)&&(
            <Btn variant="ghost" onClick={clearSession} style={{fontSize:10,color:C.red,border:"1px solid "+C.red}}>
              🗑 Clear Session
            </Btn>
          )}
        </div>
      </div>

      {/* STEP 1 */}
      <Card accent={C.accent}>
        <SLabel>Step 1 — Tender Document</SLabel>

        {/* PDF Upload */}
        <div style={{display:"flex",gap:10,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
          <div onClick={()=>pdfRef.current?.click()}
            style={{display:"flex",alignItems:"center",gap:10,padding:"10px 18px",
              background:"rgba(0,212,170,0.06)",border:"2px dashed "+C.accent,
              borderRadius:5,cursor:"pointer",transition:"all 0.2s"}}>
            <span style={{fontSize:20}}>📄</span>
            <div>
              <div style={{fontWeight:700,fontSize:13,color:C.accent,fontFamily:"Inter,sans-serif"}}>Upload PDF Tender</div>
              <div style={{fontSize:11,color:C.t2,fontFamily:"Inter,sans-serif"}}>AI extracts all text automatically</div>
            </div>
          </div>
          {pdfName&&(
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",
              background:"rgba(0,212,170,0.08)",border:"1px solid "+C.accent,borderRadius:4}}>
              <span style={{fontSize:14}}>✓</span>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.accent}}>{pdfName}</span>
              <span onClick={()=>{setPdfName("");setTenderDoc("");}}
                style={{color:C.red,cursor:"pointer",fontSize:12,marginLeft:4}}>✕</span>
            </div>
          )}
          <input ref={pdfRef} type="file" accept=".pdf" style={{display:"none"}}
            onChange={e=>handlePDF(e.target.files[0])}/>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <div style={{flex:1,height:1,background:C.b}}/>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.t2,letterSpacing:2}}>OR PASTE TEXT</span>
          <div style={{flex:1,height:1,background:C.b}}/>
        </div>

        <Field label="Paste Full Tender Text (Arabic or English)">
          <TA value={tenderDoc} onChange={e=>{setTenderDoc(e.target.value);persist_session({tenderDoc:e.target.value});}} rows={tenderDoc?8:5}
            placeholder={"Paste the full tender here:\n• Tender reference & issuing authority\n• Equipment type, quantity, specifications\n• Technical standards & certifications\n• Submission deadline & budget\n• Any special conditions"}/>
        </Field>
        {tenderDoc&&(
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.accent,marginTop:-6}}>
            ✓ {tenderDoc.length.toLocaleString()} characters loaded
          </div>
        )}
      </Card>

      {/* STEP 2 */}
      <Card accent={C.gold}>
        <SLabel color={C.gold}>Step 2 — Your Supplier Situation</SLabel>
        <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap"}}>
          {[
            {val:true, label:"✓ I have existing suppliers",desc:"AI evaluates them + finds new ones worldwide"},
            {val:false,label:"→ Find me suppliers from scratch",desc:"AI hunts best suppliers globally for this tender"},
          ].map(opt=>(
            <div key={String(opt.val)} onClick={()=>setHasSuppliers(opt.val)}
              style={{flex:1,minWidth:200,padding:"14px 18px",cursor:"pointer",borderRadius:5,
                border:"2px solid "+(hasSuppliers===opt.val?C.gold:C.b),
                background:hasSuppliers===opt.val?"rgba(232,160,32,0.08)":C.s2,transition:"all 0.2s"}}>
              <div style={{fontWeight:700,fontSize:13,color:hasSuppliers===opt.val?C.gold:C.tb,marginBottom:3,fontFamily:"Inter,sans-serif"}}>{opt.label}</div>
              <div style={{fontSize:11,color:C.t2,fontFamily:"Inter,sans-serif"}}>{opt.desc}</div>
            </div>
          ))}
        </div>
        {hasSuppliers===true&&suppliers&&suppliers.length>0&&(
          <div style={{background:C.s2,border:"1px solid "+C.b,borderRadius:4,padding:"12px 16px"}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.gold,letterSpacing:2,marginBottom:8}}>YOUR SAVED SUPPLIERS ({suppliers.length}) — AI WILL EVALUATE THESE</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {suppliers.map((s,i)=><Badge key={i} label={s.name+" · "+s.country} color={C.accent}/>)}
            </div>
          </div>
        )}
        {hasSuppliers===true&&(!suppliers||suppliers.length===0)&&(
          <div style={{padding:"10px 14px",background:"rgba(232,160,32,0.06)",border:"1px solid "+C.gold+"40",borderRadius:4,fontSize:13,color:C.t2,fontFamily:"Inter,sans-serif"}}>
            No suppliers saved in your directory yet. Add suppliers in the Supplier Directory module, or choose "Find from scratch" and AI will find the best ones for this tender.
          </div>
        )}
      </Card>

      {/* STEP 3 */}
      <Card accent={C.red}>
        <SLabel color={C.red}>Step 3 — Known Competitors (optional)</SLabel>
        <p style={{fontSize:13,color:C.t2,marginBottom:12,fontFamily:"Inter,sans-serif"}}>
          Add companies you know will bid. AI discovers additional ones you may not know about.
        </p>
        <div style={{display:"flex",gap:10,marginBottom:10}}>
          <Input value={compInput} onChange={e=>setCompInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&addComp()} placeholder="Competitor name…" style={{flex:1}}/>
          <Btn variant="sec" onClick={addComp} style={{borderColor:C.red,color:C.red,whiteSpace:"nowrap"}}>+ Add</Btn>
        </div>
        {knownComps.map((c,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px",
            background:C.s2,border:"1px solid "+C.b,borderRadius:3,marginBottom:6}}>
            <span style={{flex:1,fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.t}}>{c}</span>
            <span onClick={()=>setKnownComps(p=>p.filter((_,j)=>j!==i))}
              style={{color:C.red,cursor:"pointer",fontSize:11,padding:"1px 6px",
                border:"1px solid "+C.red,borderRadius:2}}>✕</span>
          </div>
        ))}
      </Card>

      {error&&<div style={{color:C.red,fontFamily:"'JetBrains Mono',monospace",fontSize:12,
        padding:"10px 14px",border:"1px solid "+C.red,borderRadius:4,
        background:"rgba(230,57,70,0.08)",marginBottom:14}}>⚠ {error}</div>}

      <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
        <Btn onClick={runAnalysis} disabled={!tenderDoc.trim()||hasSuppliers===null}
          style={{padding:"13px 28px",fontSize:12}}>
          ⬡ LAUNCH DEEP ANALYSIS
        </Btn>
        {(hasSuppliers===null)&&tenderDoc.trim()&&
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.gold}}>
            ← Select supplier option to continue
          </span>}
      </div>
    </div>
  );

  // ── RESULTS ──
  const r = result;
  const wp = r?.winStrategy?.winProbability||0;
  const wpColor = wp>=70?C.accent:wp>=50?C.gold:C.red;

  return (
    <div style={{animation:"fadeUp 0.3s ease both"}}>
      {/* TOP BAR */}
      <div style={{background:"linear-gradient(135deg,"+C.s1+","+C.s2+")",
        border:"1px solid "+C.b2,borderRadius:8,padding:"20px 24px",marginBottom:20,
        display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:200}}>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.t2,
            letterSpacing:3,textTransform:"uppercase",marginBottom:4}}>
            {r?.tender?.authority} · {r?.tender?.branch}
          </div>
          <h2 style={{fontWeight:900,fontSize:20,color:C.tb,fontFamily:"Inter,sans-serif",marginBottom:6}}>
            {r?.tender?.title||"Tender Analysis"}
          </h2>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <Badge label={r?.tender?.refNum||"No ref"} color={C.accent}/>
            <Badge label={r?.tender?.category||"—"} color={C.t2}/>
            {r?.tender?.deadline&&<Badge label={"Deadline: "+r.tender.deadline} color={C.gold}/>}
            {r?.tender?.estimatedValue&&<Badge label={"EGP "+Number(r.tender.estimatedValue).toLocaleString()} color={C.blue}/>}
          </div>
        </div>
        <div style={{textAlign:"center",flexShrink:0}}>
          <div style={{fontWeight:900,fontSize:64,color:wpColor,lineHeight:1,fontFamily:"Inter,sans-serif"}}>{wp}%</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.t2,letterSpacing:2,textTransform:"uppercase"}}>Win Probability</div>
          <div style={{marginTop:8}}>
            <Badge label={r?.verdict||"PENDING"}
              color={r?.verdict==="GO"?C.accent:r?.verdict==="NO-GO"?C.red:C.gold}
              style={{fontSize:11,padding:"5px 12px"}}/>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexDirection:"column",flexShrink:0}}>
          <Btn variant="gold" onClick={saveAnalysisToTender} style={{fontSize:10}}>💾 Save to Tenders</Btn>
          <Btn variant="sec" onClick={()=>{setStep("input");persist_session({step:"input"});}} style={{fontSize:10}}>← Edit Inputs</Btn>
          <Btn variant="ghost" onClick={clearSession} style={{fontSize:10,color:C.red,border:"1px solid "+C.red}}>🗑 Clear All</Btn>
        </div>
      </div>

      {saveMsg&&<div style={{padding:"10px 14px",background:"rgba(0,212,170,0.08)",border:"1px solid "+C.accent,
        borderRadius:4,marginBottom:14,fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.accent}}>{saveMsg}</div>}

      {/* TABS */}
      <div style={{display:"flex",gap:0,marginBottom:20,flexWrap:"wrap",borderBottom:"1px solid "+C.b}}>
        {VTABS.map(t=>(
          <div key={t.id} onClick={()=>setActiveTab(t.id)}
            style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,letterSpacing:1,
              textTransform:"uppercase",padding:"10px 18px",cursor:"pointer",
              borderBottom:"2px solid "+(activeTab===t.id?C.accent:"transparent"),
              color:activeTab===t.id?C.accent:C.t2,
              background:activeTab===t.id?"rgba(0,212,170,0.04)":"transparent",
              transition:"all 0.15s",marginBottom:-1}}>
            {t.label}
          </div>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab==="overview"&&(
        <div style={{animation:"fadeUp 0.2s ease"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
            <StatCard label="Win Probability" value={wp+"%"} color={wpColor} icon="🎯"
              sub={r?.winStrategy?.winProbabilityFactors?.slice(0,40)+"…"}/>
            <StatCard label="Opportunity Score" value={r?.opportunityScore+"/100"} color={C.blue} icon="⭐"/>
            <StatCard label="Suppliers Found" value={(r?.suppliers?.recommended||[]).length+(r?.suppliers?.existing||[]).length} color={C.accent} icon="🏭"/>
            <StatCard label="Competitors ID'd" value={(r?.competition?.knownCompetitors||[]).length+(r?.competition?.discoveredCompetitors||[]).length} color={C.red} icon="⚔️"/>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <Card accent={C.accent}>
              <SLabel>Verdict & Reason</SLabel>
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
                <div style={{fontWeight:900,fontSize:42,color:r?.verdict==="GO"?C.accent:r?.verdict==="NO-GO"?C.red:C.gold,fontFamily:"Inter,sans-serif"}}>
                  {r?.verdict}
                </div>
                <div style={{fontSize:13,color:C.t,lineHeight:1.7,fontFamily:"Inter,sans-serif"}}>{r?.verdictReason}</div>
              </div>
              <ScoreBar value={r?.opportunityScore||0} color={C.accent}/>
            </Card>
            <Card accent={C.blue}>
              <SLabel color={C.blue}>Tender Summary</SLabel>
              <p style={{fontSize:13,color:C.t,lineHeight:1.8,fontFamily:"Inter,sans-serif"}}>{r?.tender?.summary}</p>
              {r?.tender?.quantity&&<div style={{marginTop:10,fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.blue}}>Quantity: {r.tender.quantity}</div>}
            </Card>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <Card accent={C.accent}>
              <SLabel>Your Strengths for This Tender</SLabel>
              {(r?.yourStrengths||[]).map((s,i)=>(
                <div key={i} style={{display:"flex",gap:10,padding:"6px 0",borderBottom:i<r.yourStrengths.length-1?"1px solid "+C.b:"none"}}>
                  <span style={{color:C.accent,fontWeight:700,flexShrink:0}}>✓</span>
                  <span style={{fontSize:13,color:C.t,fontFamily:"Inter,sans-serif",lineHeight:1.5}}>{s}</span>
                </div>
              ))}
            </Card>
            <Card accent={C.red}>
              <SLabel color={C.red}>Gaps & Weaknesses to Address</SLabel>
              {(r?.yourWeaknesses||[]).map((w,i)=>(
                <div key={i} style={{display:"flex",gap:10,padding:"6px 0",borderBottom:i<r.yourWeaknesses.length-1?"1px solid "+C.b:"none"}}>
                  <span style={{color:C.red,fontWeight:700,flexShrink:0}}>⚠</span>
                  <span style={{fontSize:13,color:C.t,fontFamily:"Inter,sans-serif",lineHeight:1.5}}>{w}</span>
                </div>
              ))}
            </Card>
          </div>

          <Card accent={C.gold}>
            <SLabel color={C.gold}>Critical Success Factors — Must Nail These</SLabel>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {(r?.criticalSuccessFactors||[]).map((f,i)=>(
                <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",
                  padding:"10px 14px",background:C.s2,borderRadius:4}}>
                  <span style={{background:C.gold,color:C.bg,borderRadius:"50%",width:20,height:20,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:10,fontWeight:800,flexShrink:0,fontFamily:"'JetBrains Mono',monospace"}}>{i+1}</span>
                  <span style={{fontSize:13,color:C.t,fontFamily:"Inter,sans-serif",lineHeight:1.5}}>{f}</span>
                </div>
              ))}
            </div>
          </Card>

          {r?.tender?.keySpecs?.length>0&&(
            <Card accent={C.blue}>
              <SLabel color={C.blue}>Key Technical Specifications</SLabel>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {r.tender.keySpecs.map((s,i)=>(
                  <div key={i} style={{padding:"6px 12px",background:C.s2,border:"1px solid "+C.b,
                    borderRadius:3,fontSize:12,color:C.t,fontFamily:"Inter,sans-serif"}}>{s}</div>
                ))}
              </div>
              {r.tender.requiredCertifications?.length>0&&(
                <div style={{marginTop:12}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.t2,letterSpacing:2,marginBottom:8}}>REQUIRED CERTIFICATIONS</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {r.tender.requiredCertifications.map((c,i)=><Badge key={i} label={c} color={C.gold}/>)}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* SUPPLIERS TAB */}
      {activeTab==="suppliers"&&(
        <div style={{animation:"fadeUp 0.2s ease"}}>
          {r?.suppliers?.existing?.length>0&&(
            <div style={{marginBottom:20}}>
              <SLabel color={C.gold}>Your Existing Suppliers — Evaluated for This Tender</SLabel>
              {r.suppliers.existing.map((s,i)=>(
                <div key={i} style={{background:C.s1,border:"1px solid "+C.b,borderRadius:6,
                  padding:"18px 20px",marginBottom:10,borderLeft:"3px solid "+C.gold}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6,flexWrap:"wrap"}}>
                        <span style={{fontWeight:800,fontSize:16,color:C.tb,fontFamily:"Inter,sans-serif"}}>{s.name}</span>
                        <Badge label={s.country} color={C.t2}/>
                        <Badge label={"Export: "+s.exportRisk} color={exportColor(s.exportRisk)}/>
                        <Badge label={s.pricePosition} color={C.blue}/>
                        <Badge label={"★ YOUR SUPPLIER"} color={C.gold}/>
                      </div>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.t2,marginBottom:8}}>Suitability for this tender:</div>
                      <ScoreBar value={s.suitabilityScore||70} color={C.gold}/>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.gold,marginTop:2}}>{s.suitabilityScore||70}% match</div>
                      <p style={{fontSize:13,color:C.t,lineHeight:1.7,fontFamily:"Inter,sans-serif",marginTop:8}}>{s.fitAssessment}</p>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}>
                        <div style={{background:C.s2,padding:"10px 12px",borderRadius:4}}>
                          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.accent,letterSpacing:2,marginBottom:6}}>STRENGTHS</div>
                          {(s.strengths||[]).map((st,j)=><div key={j} style={{fontSize:12,color:C.t,fontFamily:"Inter,sans-serif",marginBottom:3}}>• {st}</div>)}
                        </div>
                        <div style={{background:C.s2,padding:"10px 12px",borderRadius:4}}>
                          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.red,letterSpacing:2,marginBottom:6}}>WEAKNESSES</div>
                          {(s.weaknesses||[]).map((w,j)=><div key={j} style={{fontSize:12,color:C.t,fontFamily:"Inter,sans-serif",marginBottom:3}}>• {w}</div>)}
                        </div>
                      </div>
                      <div style={{marginTop:10,padding:"10px 12px",background:"rgba(232,160,32,0.06)",border:"1px solid "+C.gold+"40",borderRadius:4}}>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.gold,letterSpacing:2,marginBottom:4}}>NEGOTIATION TIP</div>
                        <div style={{fontSize:12,color:C.t,fontFamily:"Inter,sans-serif"}}>{s.negotiationTip}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <SLabel>Top Recommended Suppliers for This Tender</SLabel>
          {(r?.suppliers?.recommended||[]).map((s,i)=>(
            <div key={i} style={{background:C.s1,border:"1px solid "+C.b,borderRadius:6,
              padding:"20px 22px",marginBottom:12,borderLeft:"3px solid "+C.accent,position:"relative"}}>
              <div style={{position:"absolute",top:16,right:20,
                fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.t2}}>RANK #{s.rank||i+1}</div>
              <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
                <span style={{fontWeight:800,fontSize:17,color:C.tb,fontFamily:"Inter,sans-serif"}}>{s.name}</span>
                <Badge label={s.country} color={C.t2}/>
                <Badge label={"Export: "+s.exportRisk} color={exportColor(s.exportRisk)}/>
                <Badge label={s.pricePosition} color={C.blue}/>
                {s.egyptRelationship&&<Badge label={s.egyptRelationship+" w/ Egypt"} color={C.t2}/>}
              </div>
              <p style={{fontSize:13,color:C.t,lineHeight:1.7,fontFamily:"Inter,sans-serif",marginBottom:10}}>{s.whyBest}</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                {s.keyProducts?.length>0&&(
                  <div style={{background:C.s2,padding:"8px 10px",borderRadius:4}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.accent,letterSpacing:2,marginBottom:4}}>KEY PRODUCTS</div>
                    {s.keyProducts.map((p,j)=><div key={j} style={{fontSize:11,color:C.t,fontFamily:"Inter,sans-serif"}}>• {p}</div>)}
                  </div>
                )}
                {s.certifications?.length>0&&(
                  <div style={{background:C.s2,padding:"8px 10px",borderRadius:4}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.gold,letterSpacing:2,marginBottom:4}}>CERTS</div>
                    {s.certifications.map((c,j)=><div key={j} style={{fontSize:11,color:C.t,fontFamily:"Inter,sans-serif"}}>• {c}</div>)}
                  </div>
                )}
                <div style={{background:C.s2,padding:"8px 10px",borderRadius:4}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.blue,letterSpacing:2,marginBottom:4}}>CONTACT</div>
                  {s.email&&<div style={{fontSize:11}}><a href={"mailto:"+s.email}>{s.email}</a></div>}
                  {s.website&&<div style={{fontSize:11}}><a href={s.website} target="_blank" rel="noreferrer">{s.website}</a></div>}
                  {s.leadTime&&<div style={{fontSize:11,color:C.t2,fontFamily:"Inter,sans-serif",marginTop:4}}>Lead time: {s.leadTime}</div>}
                </div>
              </div>
              {s.egyptProjects&&(
                <div style={{padding:"8px 12px",background:"rgba(0,212,170,0.04)",border:"1px solid "+C.accent+"30",borderRadius:4,marginBottom:8}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.accent,letterSpacing:2,marginBottom:3}}>EGYPT/REGIONAL TRACK RECORD</div>
                  <div style={{fontSize:12,color:C.t,fontFamily:"Inter,sans-serif"}}>{s.egyptProjects}</div>
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div style={{padding:"8px 12px",background:"rgba(232,160,32,0.06)",border:"1px solid "+C.gold+"40",borderRadius:4}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.gold,letterSpacing:2,marginBottom:3}}>NEGOTIATION TIP</div>
                  <div style={{fontSize:12,color:C.t,fontFamily:"Inter,sans-serif"}}>{s.negotiationTip}</div>
                </div>
                <div style={{padding:"8px 12px",background:"rgba(74,158,255,0.06)",border:"1px solid "+C.blue+"40",borderRadius:4}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.blue,letterSpacing:2,marginBottom:3}}>CONTACT STRATEGY</div>
                  <div style={{fontSize:12,color:C.t,fontFamily:"Inter,sans-serif"}}>{s.contactStrategy}</div>
                </div>
              </div>
              <div style={{marginTop:12}}>
                <Btn variant="primary" onClick={()=>saveSupplierToDirectory(s)} style={{fontSize:10,padding:"7px 16px"}}>
                  💾 Save to Supplier Directory
                </Btn>
              </div>
            </div>
          ))}

          {/* GENERATE MORE SUPPLIERS BUTTON */}
          <div style={{margin:"20px 0",textAlign:"center"}}>
            <Btn onClick={generateMoreSuppliers}
              style={{background:"linear-gradient(135deg,rgba(0,180,216,0.15),rgba(0,212,170,0.1))",
                border:"1px solid "+C.blue,color:C.blue,fontSize:12,padding:"10px 24px"}}>
              {genMoreLoading ? "⏳ Generating..." : "⚡ GENERATE MORE SUPPLIERS"}
            </Btn>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:11,color:C.t2,marginTop:6}}>
              AI finds additional global suppliers not in the initial analysis
            </div>
          </div>

          {/* EXTRA SUPPLIERS */}
          {extraSuppliers.length>0&&(
            <div style={{marginTop:8}}>
              <SLabel color={C.blue}>Additional Suppliers Generated ({extraSuppliers.length})</SLabel>
              {extraSuppliers.map((s,i)=>(
                <div key={i} style={{background:C.s1,border:"1px solid "+C.b2,borderRadius:6,
                  padding:"16px 20px",marginBottom:10,borderLeft:"3px solid "+C.blue}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <div>
                      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:4}}>
                        <span style={{fontWeight:800,fontSize:15,color:C.tb,fontFamily:"Inter,sans-serif"}}>{s.name}</span>
                        <Badge label={s.country} color={C.t2}/>
                        <Badge label={"Export: "+s.exportRisk} color={s.exportRisk==="Low"?C.accent:s.exportRisk==="High"?C.red:C.gold}/>
                        <Badge label={s.pricePosition} color={C.blue}/>
                      </div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                        {(s.keyProducts||[]).map((p,j)=><Badge key={j} label={p} color={C.t2}/>)}
                      </div>
                    </div>
                    <Btn onClick={()=>saveExtraSupplier(s)} style={{fontSize:9,padding:"5px 12px",flexShrink:0}}>+ Save</Btn>
                  </div>
                  <p style={{fontFamily:"Inter,sans-serif",fontSize:12,color:C.t,lineHeight:1.6,marginBottom:8}}>{s.whyBest}</p>
                  {s.negotiationTip&&(
                    <div style={{background:"rgba(232,160,32,0.08)",border:"1px solid rgba(232,160,32,0.2)",borderRadius:4,padding:"8px 12px"}}>
                      <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:C.gold,letterSpacing:2}}>TIP: </span>
                      <span style={{fontFamily:"Inter,sans-serif",fontSize:11,color:C.t}}>{s.negotiationTip}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {r?.suppliers?.sourceCountries?.length>0&&(
            <div style={{marginTop:20}}>
              <SLabel color={C.purple}>Best Countries to Source From</SLabel>
              {r.suppliers.sourceCountries.sort((a,b)=>b.score-a.score).map((c,i)=>(
                <div key={i} style={{background:C.s1,border:"1px solid "+C.b,borderRadius:5,
                  padding:"14px 18px",marginBottom:8,display:"flex",alignItems:"center",gap:14}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,fontSize:22,
                    color:i<3?C.purple:C.t3,width:30,flexShrink:0}}>{i+1}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:15,color:C.tb,fontFamily:"Inter,sans-serif",marginBottom:4}}>{c.country}</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:4}}>
                      <Badge label={"Export: "+c.exportLicenseEase} color={c.exportLicenseEase==="easy"?C.accent:c.exportLicenseEase==="blocked"?C.red:C.gold}/>
                      <Badge label={"Price: "+c.priceLevel} color={C.blue}/>
                      <Badge label={"Quality: "+c.qualityLevel} color={C.purple}/>
                      <Badge label={"Egypt: "+c.egyptBilateralRelation} color={C.t2}/>
                    </div>
                    <div style={{fontSize:12,color:C.t2,fontFamily:"Inter,sans-serif"}}>{c.strategicNotes}</div>
                  </div>
                  <div style={{width:80,flexShrink:0,textAlign:"right"}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:16,color:C.purple,fontWeight:800}}>{c.score}%</div>
                    <ScoreBar value={c.score} color={C.purple}/>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* COMPETITION TAB */}
      {activeTab==="competition"&&(
        <div style={{animation:"fadeUp 0.2s ease"}}>
          <div style={{padding:"14px 18px",background:"rgba(230,57,70,0.05)",border:"1px solid "+C.red+"40",
            borderRadius:6,marginBottom:20,fontFamily:"Inter,sans-serif",fontSize:13,color:C.t,lineHeight:1.7}}>
            <strong style={{color:C.red}}>COMPETITIVE LANDSCAPE ASSESSMENT: </strong>
            {r?.competition?.competitiveIntelligence}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
            <div style={{background:C.s2,border:"1px solid "+C.b,borderRadius:5,padding:"14px 16px",textAlign:"center"}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.gold,letterSpacing:2,marginBottom:4}}>YOU IDENTIFIED</div>
              <div style={{fontWeight:900,fontSize:32,color:C.gold,fontFamily:"Inter,sans-serif"}}>{(r?.competition?.knownCompetitors||[]).length}</div>
            </div>
            <div style={{background:C.s2,border:"1px solid "+C.b,borderRadius:5,padding:"14px 16px",textAlign:"center"}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.accent,letterSpacing:2,marginBottom:4}}>AI DISCOVERED</div>
              <div style={{fontWeight:900,fontSize:32,color:C.accent,fontFamily:"Inter,sans-serif"}}>{(r?.competition?.discoveredCompetitors||[]).length}</div>
            </div>
          </div>

          {[...(r?.competition?.knownCompetitors||[]),...(r?.competition?.discoveredCompetitors||[])].map((c,i)=>(
            <div key={i} style={{background:C.s1,border:"1px solid "+C.b,borderRadius:6,
              padding:"18px 20px",marginBottom:12,
              borderLeft:"3px solid "+threatColor(c.threatLevel)}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8,marginBottom:10}}>
                <div>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:4}}>
                    <span style={{fontWeight:800,fontSize:16,color:C.tb,fontFamily:"Inter,sans-serif"}}>{c.name}</span>
                    {c.country&&<Badge label={c.country} color={C.t2}/>}
                    <Badge label={c.type||"Competitor"} color={C.t2}/>
                    {c.isManual&&<Badge label="YOU ADDED" color={C.gold}/>}
                    {!c.isManual&&<Badge label="AI FOUND" color={C.accent}/>}
                  </div>
                  <div style={{fontSize:13,color:C.t,fontFamily:"Inter,sans-serif",lineHeight:1.6,marginBottom:6}}>{c.whyThreat}</div>
                  {c.theirLikelySuppliers||c.theirSuppliers&&<div style={{fontSize:12,color:C.t2,fontFamily:"'JetBrains Mono',monospace"}}>Likely suppliers: {c.theirLikelySuppliers||c.theirSuppliers}</div>}
                </div>
                <div style={{padding:"8px 14px",border:"2px solid "+threatColor(c.threatLevel),
                  borderRadius:4,textAlign:"center",flexShrink:0}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.t2,letterSpacing:2,marginBottom:2}}>THREAT</div>
                  <div style={{fontWeight:800,fontSize:15,color:threatColor(c.threatLevel),fontFamily:"Inter,sans-serif"}}>{c.threatLevel}</div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                <div style={{background:C.s2,padding:"10px 12px",borderRadius:4}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.red,letterSpacing:2,marginBottom:4}}>THEIR ADVANTAGES</div>
                  {(c.theirAdvantages||[]).map((a,j)=><div key={j} style={{fontSize:11,color:C.t,fontFamily:"Inter,sans-serif",marginBottom:2}}>⚠ {a}</div>)}
                </div>
                <div style={{background:C.s2,padding:"10px 12px",borderRadius:4}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.accent,letterSpacing:2,marginBottom:4}}>THEIR WEAKNESSES</div>
                  {(c.theirWeaknesses||[]).map((w,j)=><div key={j} style={{fontSize:11,color:C.t,fontFamily:"Inter,sans-serif",marginBottom:2}}>✓ {w}</div>)}
                </div>
                <div style={{background:"rgba(0,212,170,0.05)",border:"1px solid "+C.accent+"30",padding:"10px 12px",borderRadius:4}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.accent,letterSpacing:2,marginBottom:4}}>HOW TO BEAT THEM</div>
                  <div style={{fontSize:11,color:C.t,fontFamily:"Inter,sans-serif",lineHeight:1.5}}>{c.howToBeat}</div>
                </div>
              </div>
            </div>
          ))}

          {r?.competition?.marketPosition&&(
            <Card accent={C.blue}>
              <SLabel color={C.blue}>Your Market Position</SLabel>
              <p style={{fontSize:13,color:C.t,lineHeight:1.7,fontFamily:"Inter,sans-serif"}}>{r.competition.marketPosition}</p>
            </Card>
          )}
        </div>
      )}

      {/* COMPETITOR LOG TAB */}
      {activeTab==="complog"&&(
        <CompetitorLog tenderId={r?.tender?.refNum||r?.tender?.title||"current"} competitors={[...(r?.competition?.knownCompetitors||[]),...(r?.competition?.discoveredCompetitors||[])]}/>
      )}

      {/* STRATEGY TAB */}
      {activeTab==="strategy"&&r?.winStrategy&&(
        <div style={{animation:"fadeUp 0.2s ease"}}>
          <div style={{background:"linear-gradient(135deg,rgba(0,212,170,0.06),rgba(0,212,170,0.02))",
            border:"1px solid "+C.accent+"40",borderRadius:8,padding:"20px 24px",marginBottom:20}}>
            <SLabel>Master Strategic Approach</SLabel>
            <p style={{fontSize:14,color:C.t,lineHeight:1.8,fontFamily:"Inter,sans-serif"}}>{r.winStrategy.overallApproach}</p>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <Card accent={C.gold}>
              <SLabel color={C.gold}>Pricing Strategy</SLabel>
              <p style={{fontSize:13,color:C.t,lineHeight:1.7,fontFamily:"Inter,sans-serif",marginBottom:10}}>{r.winStrategy.pricingStrategy?.recommendation}</p>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.gold,marginBottom:6}}>Target margin: {r.winStrategy.pricingStrategy?.targetMargin}</div>
              {(r.winStrategy.pricingStrategy?.pricingTactics||[]).map((t,i)=>(
                <div key={i} style={{display:"flex",gap:8,padding:"5px 0",fontSize:12,color:C.t,fontFamily:"Inter,sans-serif"}}>
                  <span style={{color:C.gold,flexShrink:0}}>→</span>{t}
                </div>
              ))}
            </Card>
            <Card accent={C.accent}>
              <SLabel>Key Differentiators to Emphasise</SLabel>
              {(r.winStrategy.keyDifferentiators||[]).map((d,i)=>(
                <div key={i} style={{display:"flex",gap:10,padding:"7px 10px",background:C.s2,
                  borderRadius:4,marginBottom:6,alignItems:"flex-start"}}>
                  <span style={{color:C.accent,fontWeight:800,flexShrink:0,fontFamily:"'JetBrains Mono',monospace"}}>#{i+1}</span>
                  <span style={{fontSize:12,color:C.t,fontFamily:"Inter,sans-serif",lineHeight:1.5}}>{d}</span>
                </div>
              ))}
            </Card>
          </div>

          <Card accent={C.red}>
            <SLabel color={C.red}>Priority Action List — Do These Now</SLabel>
            {(r.winStrategy.priorityActionList||[]).map((a,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"auto 1fr auto auto",gap:12,
                alignItems:"start",padding:"12px 14px",background:C.s2,borderRadius:4,marginBottom:8}}>
                <div style={{background:C.red,color:"#fff",borderRadius:"50%",width:24,height:24,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,
                  fontWeight:800,fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>{i+1}</div>
                <div>
                  <div style={{fontWeight:700,fontSize:13,color:C.tb,fontFamily:"Inter,sans-serif",marginBottom:2}}>{a.action}</div>
                  <div style={{fontSize:12,color:C.t2,fontFamily:"Inter,sans-serif"}}>{a.impact}</div>
                </div>
                <Badge label={a.deadline||"ASAP"} color={C.gold}/>
                <Badge label={a.owner||"You"} color={C.t2}/>
              </div>
            ))}
          </Card>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Card accent={C.blue}>
              <SLabel color={C.blue}>Pre-Submission Actions</SLabel>
              {(r.winStrategy.preSubmissionActions||[]).map((a,i)=>(
                <div key={i} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:i<r.winStrategy.preSubmissionActions.length-1?"1px solid "+C.b:"none"}}>
                  <span style={{color:C.blue,flexShrink:0}}>□</span>
                  <span style={{fontSize:12,color:C.t,fontFamily:"Inter,sans-serif",lineHeight:1.5}}>{a}</span>
                </div>
              ))}
            </Card>
            <Card accent={C.orange}>
              <SLabel color={C.orange}>Risk Mitigation</SLabel>
              {(r.winStrategy.riskMitigation||[]).map((r2,i)=>(
                <div key={i} style={{fontSize:12,color:C.t,fontFamily:"Inter,sans-serif",
                  padding:"6px 0",borderBottom:i<r.winStrategy.riskMitigation.length-1?"1px solid "+C.b:"none",
                  lineHeight:1.6}}>{r2}</div>
              ))}
              {r.winStrategy.redFlags?.length>0&&(
                <div style={{marginTop:12}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.red,letterSpacing:2,marginBottom:6}}>RED FLAGS</div>
                  {r.winStrategy.redFlags.map((f,i)=>(
                    <div key={i} style={{fontSize:12,color:C.red,fontFamily:"Inter,sans-serif",marginBottom:3}}>⚠ {f}</div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {r.winStrategy.relationshipLeverage&&(
            <Card accent={C.purple}>
              <SLabel color={C.purple}>Relationship Leverage Strategy</SLabel>
              <p style={{fontSize:13,color:C.t,lineHeight:1.7,fontFamily:"Inter,sans-serif"}}>{r.winStrategy.relationshipLeverage}</p>
            </Card>
          )}
        </div>
      )}

      {/* DEEP INTEL TAB */}
      {activeTab==="intelligence"&&r?.intelligence&&(
        <div style={{animation:"fadeUp 0.2s ease"}}>
          {[
            {label:"Market Context",key:"marketContext",color:C.accent,icon:"🌍"},
            {label:"Budget Cycle & Payment Timing",key:"budgetCycle",color:C.gold,icon:"💰"},
            {label:"Decision-Maker Profile",key:"decisionMakers",color:C.blue,icon:"👤"},
            {label:"Incumbent Advantage & Counter",key:"incumbentAdvantage",color:C.red,icon:"⚔️"},
            {label:"Political & Relationship Factors",key:"politicalConsiderations",color:C.purple,icon:"🤝"},
            {label:"Offset & Local Content Strategy",key:"offsetStrategy",color:C.orange,icon:"🏭"},
            {label:"Patterns from Similar MOD Tenders",key:"pastTenderPatterns",color:C.cyan,icon:"📊"},
          ].map((item,i)=>(
            r.intelligence[item.key]&&(
              <Card key={i} accent={item.color}>
                <SLabel color={item.color}>{item.icon} {item.label}</SLabel>
                <p style={{fontSize:13,color:C.t,lineHeight:1.8,fontFamily:"Inter,sans-serif"}}>{r.intelligence[item.key]}</p>
              </Card>
            )
          ))}
          {r.intelligence.insiderTips?.length>0&&(
            <div style={{background:"linear-gradient(135deg,rgba(155,93,229,0.08),rgba(0,212,170,0.04))",
              border:"1px solid "+C.purple+"40",borderRadius:8,padding:"20px 24px"}}>
              <SLabel color={C.purple}>💡 Insider Tips — Use These Carefully</SLabel>
              {r.intelligence.insiderTips.map((t,i)=>(
                <div key={i} style={{display:"flex",gap:12,padding:"10px 14px",background:C.s2,
                  borderRadius:4,marginBottom:8,alignItems:"flex-start"}}>
                  <span style={{background:C.purple,color:"#fff",borderRadius:"50%",width:22,height:22,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,
                    fontWeight:800,flexShrink:0,fontFamily:"'JetBrains Mono',monospace"}}>{i+1}</span>
                  <span style={{fontSize:13,color:C.t,fontFamily:"Inter,sans-serif",lineHeight:1.6}}>{t}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MODULE: ASHMAND TENDERS FILE
// ═══════════════════════════════════════════════════
function TendersFile({ tenders:tendersProp, setTenders:setTendersProp, contacts }) {
  const [tendersLocal,setTendersLocal] = useState([]);
  const tenders    = tendersProp    || tendersLocal;
  const setTenders = setTendersProp || ((d)=>{ setTendersLocal(d); stor.set("asmand:tenders",d); });

  const [showForm,setShowForm] = useState(false);
  const [showPaste,setShowPaste] = useState(false);
  const [pasteText,setPasteText] = useState("");
  const [extracting,setExtracting] = useState(false);
  const [extractErr,setExtractErr] = useState("");
  const [editId,setEditId]     = useState(null);
  const [search,setSearch]     = useState("");
  const [filterStatus,setFilterStatus] = useState("All");
  const [expandedId,setExpandedId] = useState(null);
  const [form,setForm]         = useState({refNum:"",title:"",authority:"",branch:"",category:"",dateReceived:"",deadline:"",value:"",status:"Pending",notes:"",winLossReason:"",winProbability:""});

  useEffect(()=>{ if(!tendersProp) stor.get("asmand:tenders").then(d=>d&&setTendersLocal(d)); },[]);
  const persist = (data) => setTenders(data);
  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  const openNew  = () => { setForm({refNum:"",title:"",authority:"",branch:"",category:"",dateReceived:new Date().toISOString().slice(0,10),deadline:"",value:"",status:"Pending",notes:"",winLossReason:"",winProbability:""}); setEditId(null); setShowForm(true); };
  const openEdit = (t) => { setForm({...t}); setEditId(t.id); setShowForm(true); };
  const submit   = () => {
    if(!form.title){window.alert("Title required.");return;}
    if(editId) persist(tenders.map(t=>t.id===editId?{...form,id:editId}:t));
    else persist([{...form,id:Date.now()+""},...tenders]);
    setShowForm(false);
  };
  const remove = (id) => { if(window.confirm("Delete this tender?")) persist(tenders.filter(t=>t.id!==id)); };

  const extractFromDoc = async () => {
    if(!pasteText.trim()){setExtractErr("Paste a document first.");return;}
    setExtracting(true); setExtractErr("");
    try {
      const parsed = await ai(
        "Extract structured tender data from this Egyptian MOD document. Return ONLY JSON:\n"
        +'{"refNum":"ref or empty","title":"what is being procured","authority":"issuing authority","branch":"Egyptian Army|Navy|Air Force|Air Defence|MOD|NSPO|AOI|Police","category":"Weapons & Ammunition|Electronics & Communications|PPE|Vehicles & Logistics|Surveillance|C2 Systems|MRO|Training|Other","deadline":"YYYY-MM-DD or empty","value":"numeric only or empty","notes":"2-sentence summary of key requirements"}\n\nDOCUMENT:\n'+pasteText.slice(0,3000),
        800
      );
      setForm(p=>({...p,...parsed,dateReceived:new Date().toISOString().slice(0,10),status:"Pending",rawDoc:pasteText}));
      setShowPaste(false); setPasteText(""); setShowForm(true);
    } catch(e){ setExtractErr("Failed: "+e.message); }
    setExtracting(false);
  };

  const CATS   = ["Weapons & Ammunition","Electronics & Communications","PPE","Vehicles & Logistics","Surveillance","C2 Systems","MRO","Training","Other"];
  const STATS  = ["Pending","Submitted","Won","Lost","Cancelled"];
  const BRANCH = ["Egyptian Army","Egyptian Navy","Egyptian Air Force","Egyptian Air Defence","MOD Central","NSPO","AOI","Police","Other"];

  const won=tenders.filter(t=>t.status==="Won").length;
  const lost=tenders.filter(t=>t.status==="Lost").length;
  const winRate=won+lost>0?Math.round(won/(won+lost)*100):0;
  const activeCount=tenders.filter(t=>t.status==="Pending"||t.status==="Submitted").length;
  const totalWonVal=tenders.filter(t=>t.status==="Won").reduce((s,t)=>s+(parseFloat(t.value)||0),0);

  const filtered = tenders.filter(t=>{
    const matchSearch = !search||[t.title,t.refNum,t.authority,t.category].some(v=>v?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus==="All"||t.status===filterStatus;
    return matchSearch&&matchStatus;
  });

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        <StatCard label="Total Tenders" value={tenders.length} icon="📁" sub="All time"/>
        <StatCard label="Win Rate" value={winRate+"%"} color={winRate>=50?C.accent:C.gold} icon="🏆" sub={won+" won / "+lost+" lost"}/>
        <StatCard label="Won Value" value={totalWonVal>0?"EGP "+Math.round(totalWonVal/1e6)+"M":"—"} color={C.gold} icon="💰"/>
        <StatCard label="Active" value={activeCount} color={C.blue} icon="⚡" sub="Pending or submitted"/>
      </div>

      <div style={{display:"flex",gap:10,marginBottom:16,alignItems:"center",flexWrap:"wrap"}}>
        <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tenders…" style={{maxWidth:280}}/>
        <div style={{display:"flex",gap:4}}>
          {["All","Pending","Submitted","Won","Lost"].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)}
              style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,padding:"6px 12px",
                border:"1px solid "+(filterStatus===s?statusColor(s):C.b),
                color:filterStatus===s?statusColor(s):C.t2,
                background:filterStatus===s?"rgba(0,0,0,0.3)":C.s2,
                borderRadius:3,cursor:"pointer",letterSpacing:1}}>
              {s}
            </button>
          ))}
        </div>
        <div style={{flex:1}}/>
        <Btn variant="gold" onClick={()=>{setShowPaste(true);setExtractErr("");}}>⚡ PASTE & EXTRACT</Btn>
        <Btn onClick={openNew}>+ MANUAL ENTRY</Btn>
      </div>

      {showPaste&&(
        <Modal title="⚡ AI Auto-Extract from Tender Document" onClose={()=>{setShowPaste(false);setPasteText("");}}>
          <p style={{fontSize:13,color:C.t2,marginBottom:14,fontFamily:"Inter,sans-serif",lineHeight:1.7}}>
            Paste the tender document and AI will automatically extract all fields. You review and confirm before saving.
          </p>
          <Field label="Paste Tender Document">
            <TA value={pasteText} onChange={e=>setPasteText(e.target.value)} rows={10}
              placeholder="Paste full tender text here…"/>
          </Field>
          {extractErr&&<div style={{color:C.red,fontFamily:"'JetBrains Mono',monospace",fontSize:12,marginBottom:10}}>{extractErr}</div>}
          <div style={{display:"flex",gap:10}}>
            <Btn variant="gold" onClick={extractFromDoc} disabled={extracting}>
              {extracting?"⏳ Extracting…":"⚡ EXTRACT & FILL FORM"}
            </Btn>
            <Btn variant="sec" onClick={()=>{setShowPaste(false);setPasteText("");}}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {filtered.length===0
        ?<EmptyState icon="📁" title={tenders.length===0?"No Tenders Filed Yet":"No Results Found"} sub={tenders.length===0?"Use ⚡ Paste & Extract or Manual Entry to file your first tender":"Try adjusting your search or filter"}/>
        :filtered.map(t=>(
          <div key={t.id} style={{background:C.s1,border:"1px solid "+C.b,borderRadius:6,
            marginBottom:10,borderLeft:"3px solid "+statusColor(t.status),overflow:"hidden"}}>
            <div style={{padding:"14px 18px",cursor:"pointer"}}
              onClick={()=>setExpandedId(expandedId===t.id?null:t.id)}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                    <Mono style={{fontSize:10,color:C.accent,letterSpacing:2}}>{t.refNum||"—"}</Mono>
                    <Badge label={t.status} color={statusColor(t.status)}/>
                    {t.category&&<Badge label={t.category} color={C.t2}/>}
                    {t.branch&&<Badge label={t.branch} color={C.t3}/>}
                    {t.winProbability&&<Badge label={"Win prob: "+t.winProbability+"%"} color={parseInt(t.winProbability)>=60?C.accent:C.gold}/>}
                  </div>
                  <div style={{fontWeight:700,fontSize:15,color:C.tb,fontFamily:"Inter,sans-serif"}}>{t.title}</div>
                  <div style={{fontSize:12,color:C.t2,fontFamily:"Inter,sans-serif",marginTop:2}}>
                    {t.authority&&<span>{t.authority}</span>}
                    {t.deadline&&<span style={{marginLeft:12}}>📅 {t.deadline}</span>}
                    {t.value&&<span style={{marginLeft:12}}>💰 EGP {Number(t.value).toLocaleString()}</span>}
                    {t.dateReceived&&<span style={{marginLeft:12,color:C.t3}}>Received: {t.dateReceived}</span>}
                  </div>
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <Btn variant="sec" onClick={e=>{e.stopPropagation();openEdit(t);}} style={{fontSize:10,padding:"5px 10px"}}>Edit</Btn>
                  <Btn variant="ghost" onClick={e=>{e.stopPropagation();remove(t.id);}} style={{fontSize:10,padding:"5px 10px",color:C.red}}>✕</Btn>
                </div>
              </div>
            </div>
            {expandedId===t.id&&(
              <div style={{padding:"14px 18px",borderTop:"1px solid "+C.b,background:C.s2}}>
                {t.notes&&<p style={{fontSize:13,color:C.t,fontFamily:"Inter,sans-serif",lineHeight:1.7,marginBottom:10}}>{t.notes}</p>}
                {(t.status==="Won"||t.status==="Lost")&&t.winLossReason&&(
                  <div style={{padding:"8px 12px",background:t.status==="Won"?"rgba(0,212,170,0.06)":"rgba(230,57,70,0.06)",
                    border:"1px solid "+(t.status==="Won"?C.accent:C.red)+"40",borderRadius:4}}>
                    <Mono style={{fontSize:9,color:t.status==="Won"?C.accent:C.red,letterSpacing:2}}>
                      {t.status==="Won"?"WIN REASON":"LOSS REASON"}
                    </Mono>
                    <p style={{fontSize:12,color:C.t,fontFamily:"Inter,sans-serif",marginTop:4}}>{t.winLossReason}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      }

      {showForm&&(
        <Modal title={editId?"Edit Tender":"New Tender"} onClose={()=>setShowForm(false)}>
          {form.rawDoc&&(
            <div style={{padding:"10px 14px",background:"rgba(0,212,170,0.06)",border:"1px solid "+C.accent,
              borderRadius:4,marginBottom:16,fontFamily:"Inter,sans-serif",fontSize:13,color:C.accent}}>
              ⚡ AI-Extracted — Review and confirm all fields before saving.
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Field label="Tender Ref Number"><Input value={form.refNum} onChange={e=>f("refNum",e.target.value)} placeholder="MOD-2025-XXXX"/></Field>
            <Field label="Date Received"><Input type="date" value={form.dateReceived} onChange={e=>f("dateReceived",e.target.value)}/></Field>
          </div>
          <Field label="Tender Title *"><Input value={form.title} onChange={e=>f("title",e.target.value)} placeholder="Supply of…"/></Field>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Field label="Issuing Authority"><Input value={form.authority} onChange={e=>f("authority",e.target.value)} placeholder="Egyptian Army, MOD…"/></Field>
            <Field label="Branch">
              <Select value={form.branch} onChange={e=>f("branch",e.target.value)}>
                <option value="">Select…</option>
                {BRANCH.map(b=><option key={b}>{b}</option>)}
              </Select>
            </Field>
            <Field label="Category">
              <Select value={form.category} onChange={e=>f("category",e.target.value)}>
                <option value="">Select…</option>
                {CATS.map(c=><option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={e=>f("status",e.target.value)}>
                {STATS.map(s=><option key={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Deadline"><Input type="date" value={form.deadline} onChange={e=>f("deadline",e.target.value)}/></Field>
            <Field label="Value (EGP numeric)"><Input type="number" value={form.value} onChange={e=>f("value",e.target.value)} placeholder="45000000"/></Field>
          </div>
          {(form.status==="Won"||form.status==="Lost")&&(
            <Field label={form.status==="Won"?"Why Did You Win?":"Why Did You Lose?"}>
              <TA value={form.winLossReason} onChange={e=>f("winLossReason",e.target.value)} rows={2}
                placeholder={form.status==="Won"?"Best price, relationships, fast delivery…":"Undercut, incumbent advantage, missing cert…"}/>
            </Field>
          )}
          <Field label="Notes / Summary"><TA value={form.notes} onChange={e=>f("notes",e.target.value)} rows={3}/></Field>
          <div style={{display:"flex",gap:10,marginTop:8}}>
            <Btn onClick={submit}>{editId?"SAVE CHANGES":"FILE TENDER"}</Btn>
            <Btn variant="sec" onClick={()=>setShowForm(false)}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MODULE: SUPPLIER DIRECTORY
// ═══════════════════════════════════════════════════
// ═══════════════════════════════════════════════════
// EXCEL IMPORT ENGINE — reusable for suppliers + financials
// ═══════════════════════════════════════════════════
function ExcelImporter({ mode, onImport, onClose }) {
  const [step,setStep]       = useState("upload"); // upload | preview | importing | done
  const [fileName,setFileName] = useState("");
  const [rawRows,setRawRows] = useState([]);
  const [headers,setHeaders] = useState([]);
  const [mapped,setMapped]   = useState([]);
  const [importMsg,setImportMsg] = useState("");
  const [error,setError]     = useState("");
  const [imported,setImported] = useState(0);
  const fileRef = useRef(null);

  const readExcel = async (file) => {
    setFileName(file.name); setError("");
    try {
      // Wait for SheetJS to load if needed
      let attempts = 0;
      while(!window.XLSX && attempts < 20) {
        await new Promise(r=>setTimeout(r,200));
        attempts++;
      }
      if(!window.XLSX) throw new Error("SheetJS library not loaded. Please refresh and try again.");
      const XLSX = window.XLSX; // eslint-disable-line no-undef
      const data = await file.arrayBuffer();
      const wb   = XLSX.read(data, {type:"array"});
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, {defval:""});
      if(!json.length){setError("Sheet appears empty.");return;}
      const hdrs = Object.keys(json[0]);
      setHeaders(hdrs);
      setRawRows(json);
      setStep("mapping");
      setImportMsg("AI is reading your column headers…");
      await aiMapColumns(hdrs, json.slice(0,3), mode);
    } catch(e){ setError("Failed to read file: "+e.message); }
  };

  const aiMapColumns = async (hdrs, sampleRows, mode) => {
    const sampleText = sampleRows.map((r,i)=>"Row "+(i+1)+": "+JSON.stringify(r)).join("\n");
    const targetFields = mode==="suppliers"
      ? '{"name":"company name col","country":"country col","category":"category col","exportRisk":"export risk col or empty","pricePosition":"price level col or empty","email":"email col or empty","website":"website col or empty","phone":"phone col or empty","contactPerson":"contact person col or empty","keyProducts":"products col or empty","certifications":"certifications col or empty","notes":"notes/comments col or empty"}'
      : '{"tenderRef":"ref/ID col","tenderTitle":"title/description col or empty","bidAmount":"bid/revenue/amount col or empty","costOfGoods":"cost/COGS col or empty","status":"status col or empty","paymentStatus":"payment col or empty","notes":"notes col or empty"}';

    const prompt = "You are mapping Excel columns to a database schema. "
      +"Available columns: "+hdrs.join(", ")+"\n"
      +"Sample data:\n"+sampleText+"\n\n"
      +"Map to these target fields. Use exact column header names from the available columns. If no good match, use empty string.\n"
      +"Return ONLY valid JSON: "+targetFields;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST", headers:{"Content-Type":"application/json","x-api-key":process.env.REACT_APP_ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:500,messages:[{role:"user",content:prompt}]})
      });
      const data = await res.json();
      if(data.error) throw new Error(data.error.message);
      const raw = (data.content||[]).map(b=>b.text||"").join("");
      const clean = raw.replace(/```json|```/g,"").trim();
      const mapping = JSON.parse(clean);
      setMapped(mapping);
      setImportMsg("");
    } catch(e){
      setError("AI mapping failed: "+e.message+". Please map columns manually.");
      setImportMsg("");
      // Build empty mapping as fallback
      const empty = mode==="suppliers"
        ? {name:"",country:"",category:"",exportRisk:"",pricePosition:"",email:"",website:"",phone:"",contactPerson:"",keyProducts:"",certifications:"",notes:""}
        : {tenderRef:"",tenderTitle:"",bidAmount:"",costOfGoods:"",status:"",paymentStatus:"",notes:""};
      setMapped(empty);
    }
  };

  const runImport = () => {
    if(!rawRows.length){return;}
    setStep("importing");
    const results = rawRows.map((row,idx) => {
      const get = (col) => col&&row[col]!==undefined ? String(row[col]).trim() : "";
      if(mode==="suppliers") {
        return {
          id: Date.now()+"-"+idx,
          name: get(mapped.name),
          country: get(mapped.country),
          category: get(mapped.category)||"Other",
          exportRisk: get(mapped.exportRisk)||"",
          pricePosition: get(mapped.pricePosition)||"",
          email: get(mapped.email),
          website: get(mapped.website),
          phone: get(mapped.phone),
          contactPerson: get(mapped.contactPerson),
          keyProducts: (() => {
            const raw = get(mapped.keyProducts);
            if(!raw) {
              // Auto-detect: scan ALL columns for product-like keywords
              const allText = Object.values(row).join(" ").toLowerCase();
              const defenceKeywords = [
                "body armour","armor","helmet","vest","plate","ballistic","tactical","rifle","pistol",
                "ammo","ammunition","drone","uav","radar","night vision","nvg","thermal","optic","scope",
                "radio","communication","c2","vehicle","truck","apc","ifv","tank","explosive","ied",
                "surveillance","camera","sensor","bomb","rocket","missile","artillery","mortar",
                "uniform","boot","glove","mask","nbc","cbrn","medical","first aid","stretcher",
                "training","simulator","software","cyber","encryption","satellite","ew","electronic warfare"
              ];
              const found = defenceKeywords.filter(kw=>allText.includes(kw));
              return found.map(k=>k.split(" ").map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" "));
            }
            return raw.split(/[,;|\/]/).map(s=>s.trim()).filter(Boolean);
          })(),
          certifications: get(mapped.certifications) ? get(mapped.certifications).split(/[,;]/).map(s=>s.trim()).filter(Boolean) : [],
          notes: get(mapped.notes),
          addedFrom: "Excel Import — "+fileName,
          dateAdded: TODAY,
        };
      } else {
        const bid = parseFloat(get(mapped.bidAmount).replace(/[^0-9.]/g,""))||"";
        const cogs = parseFloat(get(mapped.costOfGoods).replace(/[^0-9.]/g,""))||"";
        const margin = bid&&cogs ? Math.round(((bid-cogs)/bid)*100) : "";
        return {
          id: Date.now()+"-"+idx,
          tenderRef: get(mapped.tenderRef)||"IMPORT-"+idx,
          tenderTitle: get(mapped.tenderTitle),
          bidAmount: bid,
          costOfGoods: cogs,
          margin,
          status: get(mapped.status)||"Pending",
          paymentStatus: get(mapped.paymentStatus)||"Not received",
          notes: get(mapped.notes),
        };
      }
    }).filter(r => mode==="suppliers" ? r.name : r.tenderRef);

    setImported(results.length);
    setStep("done");
    onImport(results);
  };

  const MappingRow = ({field, label, required}) => (
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",
      borderBottom:"1px solid "+C.b}}>
      <div style={{width:160,flexShrink:0}}>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:required?C.accent:C.t2,letterSpacing:1}}>{label}{required?" *":""}</div>
      </div>
      <select value={mapped[field]||""} onChange={e=>setMapped(p=>({...p,[field]:e.target.value}))}
        style={{flex:1,background:C.s2,border:"1px solid "+(mapped[field]?C.accent:C.b),
          color:mapped[field]?C.tb:C.t2,fontFamily:"'JetBrains Mono',monospace",
          fontSize:11,padding:"6px 10px",borderRadius:3}}>
        <option value="">— not mapped —</option>
        {headers.map(h=><option key={h} value={h}>{h}</option>)}
      </select>
      {mapped[field]&&<div style={{fontSize:11,color:C.t2,fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>✓</div>}
    </div>
  );

  const supplierFields = [
    {field:"name",label:"Company Name",required:true},
    {field:"country",label:"Country",required:true},
    {field:"category",label:"Category"},
    {field:"exportRisk",label:"Export Risk"},
    {field:"pricePosition",label:"Price Level"},
    {field:"email",label:"Email"},
    {field:"website",label:"Website"},
    {field:"phone",label:"Phone"},
    {field:"contactPerson",label:"Contact Person"},
    {field:"keyProducts",label:"Key Products"},
    {field:"certifications",label:"Certifications"},
    {field:"notes",label:"Notes"},
  ];
  const financeFields = [
    {field:"tenderRef",label:"Tender Ref/ID",required:true},
    {field:"tenderTitle",label:"Tender Title"},
    {field:"bidAmount",label:"Bid Amount"},
    {field:"costOfGoods",label:"Cost of Goods"},
    {field:"status",label:"Status"},
    {field:"paymentStatus",label:"Payment Status"},
    {field:"notes",label:"Notes"},
  ];
  const fields = mode==="suppliers" ? supplierFields : financeFields;

  return (
    <Modal title={"📊 Import from Excel — "+(mode==="suppliers"?"Supplier Directory":"Financials")} onClose={onClose} wide>

      {step==="upload"&&(
        <div>
          <p style={{fontSize:13,color:C.t2,fontFamily:"Inter,sans-serif",lineHeight:1.7,marginBottom:20}}>
            Upload your Excel file (.xlsx or .xls). AI will automatically detect which columns match which fields, then you can review and adjust before importing.
          </p>
          <div onClick={()=>fileRef.current?.click()}
            style={{border:"2px dashed "+C.accent,borderRadius:8,padding:"40px 20px",
              textAlign:"center",cursor:"pointer",background:"rgba(0,212,170,0.03)",
              transition:"all 0.2s"}}>
            <div style={{fontSize:40,marginBottom:12}}>📊</div>
            <div style={{fontWeight:700,fontSize:16,color:C.accent,fontFamily:"Inter,sans-serif",marginBottom:6}}>Click to upload Excel file</div>
            <div style={{fontSize:12,color:C.t2,fontFamily:"Inter,sans-serif"}}>.xlsx or .xls — AI maps your columns automatically</div>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}}
            onChange={e=>e.target.files[0]&&readExcel(e.target.files[0])}/>
          {error&&<div style={{marginTop:12,color:C.red,fontSize:12,fontFamily:"'JetBrains Mono',monospace"}}>{error}</div>}
        </div>
      )}

      {step==="mapping"&&(
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
            background:"rgba(0,212,170,0.06)",border:"1px solid "+C.accent,
            borderRadius:4,marginBottom:16}}>
            <span style={{fontSize:16}}>📊</span>
            <div>
              <div style={{fontWeight:700,fontSize:13,color:C.accent,fontFamily:"Inter,sans-serif"}}>{fileName}</div>
              <div style={{fontSize:11,color:C.t2,fontFamily:"Inter,sans-serif"}}>{rawRows.length} rows detected · AI mapped your columns below</div>
            </div>
          </div>
          {importMsg&&<div style={{color:C.gold,fontFamily:"'JetBrains Mono',monospace",fontSize:11,marginBottom:10,animation:"pulse 1.5s infinite"}}>{importMsg}</div>}
          {error&&<div style={{color:C.red,fontSize:11,fontFamily:"'JetBrains Mono',monospace",marginBottom:10}}>{error}</div>}
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.t2,letterSpacing:2,marginBottom:8}}>COLUMN MAPPING — REVIEW & ADJUST IF NEEDED</div>
          <div style={{background:C.s2,border:"1px solid "+C.b,borderRadius:4,padding:"8px 14px",marginBottom:16}}>
            {fields.map(f=><MappingRow key={f.field} {...f}/>)}
          </div>
          {/* Preview first 3 rows */}
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.t2,letterSpacing:2,marginBottom:8}}>PREVIEW — FIRST 3 ROWS</div>
          <div style={{overflowX:"auto",marginBottom:16}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,fontFamily:"Inter,sans-serif"}}>
              <thead>
                <tr>{headers.map(h=><th key={h} style={{padding:"6px 10px",background:C.s3,border:"1px solid "+C.b,color:C.t2,textAlign:"left",fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:1,whiteSpace:"nowrap"}}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rawRows.slice(0,3).map((row,i)=>(
                  <tr key={i}>{headers.map(h=><td key={h} style={{padding:"5px 10px",border:"1px solid "+C.b,color:C.t,maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{String(row[h]||"")}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn onClick={runImport} disabled={!mapped[fields[0].field]}>
              ⬆ IMPORT {rawRows.length} ROWS
            </Btn>
            <Btn variant="sec" onClick={()=>{setStep("upload");setRawRows([]);setHeaders([]);setMapped({});}}>← Back</Btn>
          </div>
        </div>
      )}

      {step==="importing"&&(
        <div style={{textAlign:"center",padding:"40px 20px"}}>
          <div style={{width:48,height:48,border:"3px solid "+C.accent,borderTopColor:"transparent",
            borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 16px"}}/>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.accent,letterSpacing:3}}>IMPORTING…</div>
        </div>
      )}

      {step==="done"&&(
        <div style={{textAlign:"center",padding:"32px 20px"}}>
          <div style={{fontSize:48,marginBottom:16}}>✅</div>
          <div style={{fontWeight:800,fontSize:22,color:C.accent,fontFamily:"Inter,sans-serif",marginBottom:8}}>
            {imported} records imported
          </div>
          <div style={{fontSize:14,color:C.t2,fontFamily:"Inter,sans-serif",marginBottom:24}}>
            Successfully added to your {mode==="suppliers"?"Supplier Directory":"Financials"}.
          </div>
          <Btn onClick={onClose}>Close</Btn>
        </div>
      )}
    </Modal>
  );
}

function SupplierDirectory({ suppliers, setSuppliers, contacts, setContacts }) {
  const [showForm,setShowForm]     = useState(false);
  const [showExcel,setShowExcel]   = useState(false);
  const [editId,setEditId]         = useState(null);
  const [search,setSearch]         = useState("");
  const [filterCat,setFilterCat]   = useState("All");
  const [filterCountry,setFilterCountry] = useState("All");
  const [importMsg,setImportMsg]   = useState("");
  const [syncMsg,setSyncMsg]       = useState("");
  const [showDupes,setShowDupes]   = useState(false);
  const [form,setForm]             = useState({name:"",country:"",category:"",exportRisk:"",pricePosition:"",egyptRelationship:"",certifications:[],keyProducts:[],email:"",website:"",linkedIn:"",phone:"",contactPerson:"",notes:"",rating:""});

  // ── DUPLICATE DETECTION ──
  const findDuplicates = (list) => {
    const dupeGroups = [];
    const used = new Set();
    list.forEach((a, i) => {
      if(used.has(i)) return;
      const matches = [a];
      const aName = (a.name||"").toLowerCase().replace(/[^a-z0-9]/g,"");
      const aEmail = (a.email||"").toLowerCase();
      list.forEach((b, j) => {
        if(i===j||used.has(j)) return;
        const bName = (b.name||"").toLowerCase().replace(/[^a-z0-9]/g,"");
        const bEmail = (b.email||"").toLowerCase();
        // Match by: exact name, similar name (substring), or same email
        const nameMatch = aName===bName || (aName.length>4&&(aName.includes(bName)||bName.includes(aName)));
        const emailMatch = aEmail&&bEmail&&aEmail===bEmail;
        if(nameMatch||emailMatch) {
          matches.push(b);
          used.add(j);
        }
      });
      if(matches.length>1) {
        used.add(i);
        dupeGroups.push({reason: matches.some((x,xi)=>matches.some((y,yi)=>xi!==yi&&x.email&&y.email&&x.email===y.email))?"Same email":"Similar name", items:matches});
      }
    });
    return dupeGroups;
  };

  const dupeGroups = findDuplicates(suppliers||[]);
  const dupeTotalCount = dupeGroups.reduce((s,g)=>s+g.items.length,0);

  const mergeDupes = (group, keepId) => {
    const keep = group.items.find(s=>s.id===keepId);
    const rest = group.items.filter(s=>s.id!==keepId);
    // Merge keyProducts and certifications from all
    const allProducts = [...new Set([...(keep.keyProducts||[]), ...rest.flatMap(s=>s.keyProducts||[])])];
    const allCerts    = [...new Set([...(keep.certifications||[]), ...rest.flatMap(s=>s.certifications||[])])];
    const merged = {...keep, keyProducts:allProducts, certifications:allCerts,
      notes:[keep.notes,...rest.map(s=>s.notes)].filter(Boolean).join(" | ")};
    const removeIds = new Set(rest.map(s=>s.id));
    const updated = (suppliers||[]).filter(s=>!removeIds.has(s.id)).map(s=>s.id===keepId?merged:s);
    persist(updated);
    setSyncMsg("✓ Merged "+rest.length+" duplicate"+(rest.length>1?"s":"")+" into "+keep.name);
    setTimeout(()=>setSyncMsg(""),4000);
  };

  const deleteDupe = (id) => {
    persist((suppliers||[]).filter(s=>s.id!==id));
  };

  const handleExcelImport = (rows) => {
    const existing = suppliers || [];
    const existingNames = new Set(existing.map(s=>s.name?.toLowerCase()));
    const newOnes = rows.filter(r=>r.name&&!existingNames.has(r.name.toLowerCase()));
    const merged = [...newOnes, ...existing];
    persist(merged);
    setImportMsg("✓ "+newOnes.length+" new suppliers imported from Excel");
    setTimeout(()=>setImportMsg(""),5000);
  };

  useEffect(()=>{stor.get("asmand:suppliers").then(d=>d&&setSuppliers(d));},[]);
  const persist = (data) => { setSuppliers(data); };
  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  const openNew  = () => { setForm({name:"",country:"",category:"",exportRisk:"",pricePosition:"",egyptRelationship:"",certifications:[],keyProducts:[],email:"",website:"",linkedIn:"",phone:"",contactPerson:"",notes:"",rating:""}); setEditId(null); setShowForm(true); };
  const openEdit = (s) => { setForm({...s,certifications:s.certifications||[],keyProducts:s.keyProducts||(s.keyProducts?.split?s.keyProducts.split(",").map(x=>x.trim()).filter(Boolean):[])||[]}); setEditId(s.id); setShowForm(true); };
  const submit   = () => {
    if(!form.name){window.alert("Name required.");return;}
    const entry = {...form,id:editId||Date.now()+"",
      certifications:Array.isArray(form.certifications)?form.certifications:(form.certifications||"").split(",").map(s=>s.trim()).filter(Boolean),
      keyProducts:Array.isArray(form.keyProducts)?form.keyProducts:(form.keyProducts||"").split(",").map(s=>s.trim()).filter(Boolean),
      dateAdded:form.dateAdded||new Date().toISOString().slice(0,10)};
    if(editId) persist(suppliers.map(s=>s.id===editId?entry:s));
    else persist([entry,...suppliers]);
    setShowForm(false);
  };
  const remove = (id) => { if(window.confirm("Delete supplier?")) persist(suppliers.filter(s=>s.id!==id)); };

  const countries = ["All",...[...new Set(suppliers.map(s=>s.country).filter(Boolean))].sort()];
  const cats = ["All","Weapons & Ammunition","Electronics & Communications","PPE","Vehicles & Logistics","Surveillance","C2 Systems","MRO","Training","Other"];

  const filtered = suppliers.filter(s=>{
    const ms = !search||[s.name,s.country,s.category,...(s.keyProducts||[])].some(v=>v?.toLowerCase().includes(search.toLowerCase()));
    const mc = filterCat==="All"||s.category===filterCat;
    const mco = filterCountry==="All"||s.country===filterCountry;
    return ms&&mc&&mco;
  });

  const ERISK = ["low","medium","high"];
  const PPRICE = ["budget","competitive","premium"];
  const EREL   = ["established","good","developing","unknown"];

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        <StatCard label="Total Suppliers" value={suppliers.length} icon="🏭"/>
        <StatCard label="Countries Covered" value={new Set(suppliers.map(s=>s.country).filter(Boolean)).size} color={C.blue} icon="🌍"/>
        <StatCard label="Low Export Risk" value={suppliers.filter(s=>s.exportRisk==="low").length} color={C.accent} icon="✓"/>
        <StatCard label="High Risk" value={suppliers.filter(s=>s.exportRisk==="high").length} color={C.red} icon="⚠"/>
      </div>

      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search suppliers, products, country…" style={{maxWidth:280}}/>
        <Select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{width:"auto",minWidth:160}}>
          {cats.map(c=><option key={c}>{c}</option>)}
        </Select>
        <Select value={filterCountry} onChange={e=>setFilterCountry(e.target.value)} style={{width:"auto",minWidth:120}}>
          {countries.map(c=><option key={c}>{c}</option>)}
        </Select>
        <div style={{flex:1}}/>
        {dupeGroups.length>0&&(
          <button onClick={()=>setShowDupes(p=>!p)}
            style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",
              background:showDupes?"rgba(230,57,70,0.15)":"rgba(230,57,70,0.08)",
              border:"1px solid "+C.red,borderRadius:4,cursor:"pointer",
              fontFamily:"JetBrains Mono,monospace",fontSize:10,color:C.red,letterSpacing:1}}>
            ⚠ {dupeTotalCount} DUPLICATES FOUND
          </button>
        )}
        <Btn variant="gold" onClick={()=>setShowExcel(true)} style={{fontSize:10}}>📊 IMPORT EXCEL</Btn>
        <Btn onClick={openNew}>+ ADD SUPPLIER</Btn>
      </div>

      {/* DUPLICATE PANEL */}
      {showDupes&&dupeGroups.length>0&&(
        <div style={{background:"rgba(230,57,70,0.05)",border:"1px solid "+C.red,borderRadius:8,padding:"16px",marginBottom:16}}>
          <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:C.red,letterSpacing:2,marginBottom:12}}>
            ⚠ DUPLICATE SUPPLIERS DETECTED — {dupeGroups.length} GROUP{dupeGroups.length>1?"S":""}
          </div>
          {dupeGroups.map((group,gi)=>(
            <div key={gi} style={{background:C.s1,border:"1px solid "+C.b,borderRadius:6,padding:"14px",marginBottom:10}}>
              <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:C.gold,marginBottom:8}}>
                REASON: {group.reason} · {group.items.length} entries
              </div>
              {group.items.map((s,si)=>(
                <div key={si} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",
                  borderBottom:si<group.items.length-1?"1px solid "+C.b:"none"}}>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"Inter,sans-serif",fontSize:13,fontWeight:700,color:C.tb}}>{s.name}</div>
                    <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:C.t2}}>
                      {s.country} · {s.category} {s.email?"· "+s.email:""} {s.addedFrom?"· "+s.addedFrom.slice(0,30):""}
                    </div>
                  </div>
                  <Btn onClick={()=>mergeDupes(group,s.id)}
                    style={{fontSize:9,padding:"4px 10px",background:"rgba(0,212,170,0.1)",border:"1px solid "+C.accent,color:C.accent}}>
                    ✓ Keep & Merge
                  </Btn>
                  <Btn onClick={()=>deleteDupe(s.id)}
                    style={{fontSize:9,padding:"4px 10px",background:"rgba(230,57,70,0.1)",border:"1px solid "+C.red,color:C.red}}>
                    🗑 Delete
                  </Btn>
                </div>
              ))}
            </div>
          ))}
          <div style={{fontFamily:"Inter,sans-serif",fontSize:11,color:C.t2,marginTop:8}}>
            Click <strong style={{color:C.accent}}>Keep & Merge</strong> to keep one entry and merge all products/certifications from duplicates into it. Click <strong style={{color:C.red}}>Delete</strong> to remove an entry.
          </div>
        </div>
      )}

      {importMsg&&<div style={{padding:"10px 14px",background:"rgba(0,212,170,0.08)",border:"1px solid "+C.accent,borderRadius:4,marginBottom:12,fontFamily:"JetBrains Mono,monospace",fontSize:12,color:C.accent}}>{importMsg}</div>}
      {syncMsg&&<div style={{padding:"10px 14px",background:"rgba(155,93,229,0.08)",border:"1px solid "+C.purple,borderRadius:4,marginBottom:12,fontFamily:"JetBrains Mono,monospace",fontSize:12,color:C.purple}}>{syncMsg}</div>}

      {showExcel&&<ExcelImporter mode="suppliers" onImport={handleExcelImport} onClose={()=>setShowExcel(false)}/>}

      {filtered.length===0
        ?<EmptyState icon="🏭" title="No Suppliers Yet" sub="Add suppliers manually or save them from AI Tender Analysis"/>
        :<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {filtered.map(s=>{
            const contactExists = (contacts||[]).some(c=>
              (s.email&&c.email?.toLowerCase()===s.email.toLowerCase())||
              (s.contactPerson&&c.name?.toLowerCase()===s.contactPerson.toLowerCase())
            );
            const syncToContact = () => {
              if(contactExists){setSyncMsg("ℹ Contact for "+s.name+" already exists");setTimeout(()=>setSyncMsg(""),3000);return;}
              const newC = {
                id:"sync-"+Date.now(),
                name:s.contactPerson||s.name+" (Contact)",
                title:"Export Sales",
                org:s.name,
                type:"Supplier",
                email:s.email||"",
                phone:s.phone||"",
                relationship:"Developing",
                notes:"Synced from Supplier Directory · "+s.country+(s.keyProducts?.length?" · "+(s.keyProducts||[]).join(", "):""),
                lastContact:TODAY,
                autoSynced:false,
                sourceSupplier:s.name,
              };
              setContacts([newC,...(contacts||[])]);
              setSyncMsg("👤 Contact created: "+(s.contactPerson||s.name));
              setTimeout(()=>setSyncMsg(""),3000);
            };
            return (
            <div key={s.id} style={{background:C.s1,border:"1px solid "+C.b,borderRadius:6,
              padding:"16px 18px",borderLeft:"3px solid "+exportColor(s.exportRisk||"medium")}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:15,color:C.tb,fontFamily:"Inter,sans-serif",marginBottom:5}}>{s.name}</div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                    <Badge label={s.country||"Unknown"} color={C.t2}/>
                    {s.category&&<Badge label={s.category} color={C.blue}/>}
                    {s.exportRisk&&<Badge label={"Export: "+s.exportRisk} color={exportColor(s.exportRisk)}/>}
                    {s.pricePosition&&<Badge label={s.pricePosition} color={C.t2}/>}
                    {s.egyptRelationship&&<Badge label={s.egyptRelationship+" w/ Egypt"} color={C.t3}/>}
                    {contactExists&&<Badge label="✓ In Contacts" color={C.accent}/>}
                  </div>
                </div>
                <div style={{display:"flex",gap:4,flexShrink:0}}>
                  <Btn variant="sec" onClick={()=>openEdit(s)} style={{fontSize:9,padding:"4px 8px"}}>Edit</Btn>
                  <Btn variant="ghost" onClick={()=>remove(s.id)} style={{fontSize:9,padding:"4px 8px",color:C.red}}>✕</Btn>
                </div>
              </div>
              {s.keyProducts?.length>0&&(
                <div style={{marginBottom:8,display:"flex",flexWrap:"wrap",gap:4}}>
                  {s.keyProducts.map((p,i)=>(
                    <span key={i} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
                      padding:"2px 7px",background:C.s2,border:"1px solid "+C.b,
                      borderRadius:2,color:C.t}}>{p}</span>
                  ))}
                </div>
              )}
              {/* CONTACT INFO SECTION */}
              <div style={{background:C.s2,border:"1px solid "+C.b,borderRadius:4,padding:"10px 12px",marginBottom:6}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.t2,letterSpacing:2,marginBottom:6}}>CONTACT INFO</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
                  {s.contactPerson&&<div style={{fontSize:11,color:C.gold,fontFamily:"Inter,sans-serif",fontWeight:600}}>👤 {s.contactPerson}</div>}
                  {s.email&&<a href={"mailto:"+s.email} style={{fontSize:11,color:C.accent,fontFamily:"Inter,sans-serif"}}>✉ {s.email}</a>}
                  {s.phone&&<div style={{fontSize:11,color:C.t,fontFamily:"'JetBrains Mono',monospace"}}>📞 {s.phone}</div>}
                  {s.website&&<a href={s.website} target="_blank" rel="noreferrer" style={{fontSize:11,color:C.blue,fontFamily:"Inter,sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>🌐 {s.website}</a>}
                  {s.linkedIn&&<a href={s.linkedIn} target="_blank" rel="noreferrer" style={{fontSize:11,color:"#0a66c2",fontFamily:"Inter,sans-serif"}}>in LinkedIn</a>}
                </div>
                {(!s.contactPerson&&!s.email&&!s.phone&&!s.website)&&(
                  <div style={{fontSize:11,color:C.t3,fontFamily:"Inter,sans-serif",fontStyle:"italic"}}>No contact info — click Edit to add</div>
                )}
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:6}}>
                {s.notes&&<div style={{fontSize:11,color:C.t2,fontStyle:"italic",fontFamily:"Inter,sans-serif",lineHeight:1.5,flex:1}}>{s.notes?.slice(0,100)}{s.notes?.length>100?"…":""}</div>}
                <button onClick={syncToContact}
                  style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,padding:"4px 10px",
                    border:"1px solid "+(contactExists?C.accent:C.purple),
                    color:contactExists?C.accent:C.purple,
                    background:contactExists?"rgba(0,212,170,0.05)":"rgba(155,93,229,0.05)",
                    borderRadius:3,cursor:contactExists?"default":"pointer",letterSpacing:1,
                    whiteSpace:"nowrap"}}>
                  {contactExists?"✓ SYNCED TO CONTACTS":"→ ADD TO CONTACTS"}
                </button>
              </div>
              {s.addedFrom&&<div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.t3,marginTop:6}}>Source: {s.addedFrom}</div>}
            </div>
            );
          })}
        </div>
      }

      {showForm&&(
        <Modal title={editId?"Edit Supplier":"Add Supplier"} onClose={()=>setShowForm(false)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Field label="Company Name *"><Input value={form.name} onChange={e=>f("name",e.target.value)}/></Field>
            <Field label="Country"><Input value={form.country} onChange={e=>f("country",e.target.value)} placeholder="USA, France, Germany…"/></Field>
            <Field label="Category">
              <Select value={form.category} onChange={e=>f("category",e.target.value)}>
                <option value="">Select…</option>
                {["Weapons & Ammunition","Electronics & Communications","PPE","Vehicles & Logistics","Surveillance","C2 Systems","MRO","Training","Other"].map(c=><option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Export Risk">
              <Select value={form.exportRisk} onChange={e=>f("exportRisk",e.target.value)}>
                <option value="">Select…</option>
                {ERISK.map(r=><option key={r}>{r}</option>)}
              </Select>
            </Field>
            <Field label="Price Position">
              <Select value={form.pricePosition} onChange={e=>f("pricePosition",e.target.value)}>
                <option value="">Select…</option>
                {PPRICE.map(p=><option key={p}>{p}</option>)}
              </Select>
            </Field>
            <Field label="Egypt Relationship">
              <Select value={form.egyptRelationship} onChange={e=>f("egyptRelationship",e.target.value)}>
                <option value="">Select…</option>
                {EREL.map(r=><option key={r}>{r}</option>)}
              </Select>
            </Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={e=>f("email",e.target.value)}/></Field>
            <Field label="Phone"><Input value={form.phone} onChange={e=>f("phone",e.target.value)}/></Field>
            <Field label="Website"><Input value={form.website} onChange={e=>f("website",e.target.value)}/></Field>
            <Field label="Contact Person"><Input value={form.contactPerson} onChange={e=>f("contactPerson",e.target.value)}/></Field>
          </div>
          <Field label="Key Products / Equipment Keywords">
            <TagInput
              value={form.keyProducts}
              onChange={v=>f("keyProducts",v)}
              placeholder="Type a product and press Enter (e.g. Body armour, helmets, plates…)"
            />
            <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:C.t2,marginTop:4}}>
              Press Enter or comma after each item. These keywords are used by AI to match this supplier to tenders.
            </div>
          </Field>
          <Field label="Certifications">
            <TagInput
              value={form.certifications}
              onChange={v=>f("certifications",v)}
              placeholder="Type a certification and press Enter (e.g. NIJ, NATO STANAG, ISO 9001…)"
            />
          </Field>
          <Field label="Notes"><TA value={form.notes} onChange={e=>f("notes",e.target.value)} rows={3}/></Field>
          <div style={{display:"flex",gap:10,marginTop:8}}>
            <Btn onClick={submit}>{editId?"SAVE":"ADD SUPPLIER"}</Btn>
            <Btn variant="sec" onClick={()=>setShowForm(false)}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MODULE: COMPETITOR INTELLIGENCE
// ═══════════════════════════════════════════════════
function CompetitorIntel({ tenders, competitors, setCompetitors }) {
  const [activeTab, setActiveTab]   = useState("overview");
  const [showAddBid, setShowAddBid] = useState(false);
  const [showAddComp, setShowAddComp] = useState(false);
  const [aiReport, setAiReport]     = useState(null);
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiError, setAiError]       = useState("");
  const [search, setSearch]         = useState("");
  const [editBidId, setEditBidId]   = useState(null);

  const emptyBid = { id:"", tenderId:"", tenderTitle:"", tenderRef:"", authority:"",
    date:"", ourBid:"", competitors:[], winner:"", winnerPrice:"", notes:"", category:"" };
  const [bidForm, setBidForm] = useState({...emptyBid});
  const [compRowInput, setCompRowInput] = useState({ name:"", price:"", notes:"" });

  const emptyComp = { id:"", name:"", country:"", knownCategories:"", strengths:"", weaknesses:"", typicalPricing:"", winRate:"", notes:"", website:"" };
  const [compForm, setCompForm] = useState({...emptyComp});
  const [editCompId, setEditCompId] = useState(null);

  const allData = competitors || { bids:[], profiles:[] };
  const bids     = allData.bids     || [];
  const profiles = allData.profiles || [];

  const persist = (updates) => {
    const next = { ...allData, ...updates };
    setCompetitors(next);
    localStorage.setItem("ashmand:competitors", JSON.stringify(next));
  };

  useEffect(() => {
    const saved = localStorage.getItem("ashmand:competitors");
    if(saved) try { setCompetitors(JSON.parse(saved)); } catch {}
  }, []);

  const bf = (k,v) => setBidForm(p=>({...p,[k]:v}));
  const cf = (k,v) => setCompForm(p=>({...p,[k]:v}));

  // ── BID SUBMISSION RECORD ──
  const openNewBid  = () => { setBidForm({...emptyBid, id:Date.now()+"", date:new Date().toISOString().slice(0,10)}); setEditBidId(null); setShowAddBid(true); };
  const openEditBid = (b) => { setBidForm({...b}); setEditBidId(b.id); setShowAddBid(true); };

  const addCompRow  = () => {
    if(!compRowInput.name.trim()) return;
    bf("competitors", [...(bidForm.competitors||[]), {...compRowInput, id:Date.now()+""}]);
    setCompRowInput({name:"",price:"",notes:""});
  };
  const removeCompRow = (id) => bf("competitors", bidForm.competitors.filter(c=>c.id!==id));

  const saveBid = () => {
    if(!bidForm.tenderTitle && !bidForm.tenderRef) { window.alert("Enter a tender title or ref."); return; }
    const entry = {...bidForm, id: editBidId || Date.now()+""};
    const updated = editBidId ? bids.map(b=>b.id===editBidId?entry:b) : [entry, ...bids];
    persist({ bids: updated });
    setShowAddBid(false);
    setBidForm({...emptyBid});
  };

  const deleteBid = (id) => { if(window.confirm("Delete this bid record?")) persist({ bids: bids.filter(b=>b.id!==id) }); };

  // ── COMPETITOR PROFILES ──
  const openNewComp  = () => { setCompForm({...emptyComp, id:Date.now()+""}); setEditCompId(null); setShowAddComp(true); };
  const openEditComp = (c) => { setCompForm({...c}); setEditCompId(c.id); setShowAddComp(true); };
  const saveComp = () => {
    if(!compForm.name.trim()) { window.alert("Name required."); return; }
    const entry = {...compForm, id: editCompId || Date.now()+""};
    const updated = editCompId ? profiles.map(p=>p.id===editCompId?entry:p) : [entry,...profiles];
    persist({ profiles: updated });
    setShowAddComp(false);
  };
  const deleteComp = (id) => { if(window.confirm("Delete competitor?")) persist({ profiles: profiles.filter(p=>p.id!==id) }); };

  // ── AI ANALYSIS ──
  const runAiAnalysis = async () => {
    if(bids.length === 0) { setAiError("Add some bid records first so AI can analyse patterns."); return; }
    setAiLoading(true); setAiError("");
    try {
      const bidSummary = bids.map(b => {
        const comps = (b.competitors||[]).map(c=>`${c.name} bid EGP ${c.price||"unknown"}`).join(", ");
        return `Tender: ${b.tenderTitle||b.tenderRef} | Category: ${b.category||"?"} | Our bid: EGP ${b.ourBid||"?"} | Competitors: ${comps||"none recorded"} | Winner: ${b.winner||"unknown"} at EGP ${b.winnerPrice||"?"} | Notes: ${b.notes||""}`;
      }).join("\n");

      const profileSummary = profiles.map(p =>
        `${p.name} (${p.country||"?"}) — Categories: ${p.knownCategories||"?"} — Strengths: ${p.strengths||"?"} — Typical pricing: ${p.typicalPricing||"?"}`
      ).join("\n");

      const prompt = `You are an elite Egyptian defence procurement competitive intelligence analyst. Analyse this bid history and competitor data for Ashmand, an Egyptian defence distributor.

BID HISTORY (${bids.length} tenders):
${bidSummary}

COMPETITOR PROFILES (${profiles.length}):
${profileSummary||"None added yet"}

Generate a detailed competitor intelligence report as JSON:
{
  "executiveSummary": "3-4 sentences on competitive landscape",
  "competitorRankings": [
    {
      "name": "competitor name",
      "threatLevel": "HIGH/MEDIUM/LOW",
      "winRate": "estimated % based on data",
      "avgPricingStrategy": "how they price vs us",
      "categoriesTheyDominate": ["cat1","cat2"],
      "weaknesses": ["weakness1","weakness2"],
      "howTobeat": "specific tactical advice to beat this competitor",
      "priceGapVsUs": "e.g. typically 8% below us"
    }
  ],
  "pricingIntelligence": {
    "ourAvgBid": "average of our bids in EGP",
    "marketAvgBid": "average across all bids",
    "ourPricingPosition": "where we sit vs market",
    "pricingAdvice": "specific advice on our pricing strategy",
    "sweetSpotMargin": "recommended margin % to win more tenders"
  },
  "winLossPatterns": {
    "categoriesWeWin": ["cat1"],
    "categoriesWeLose": ["cat1"],
    "keyWinFactors": ["factor1","factor2"],
    "keyLossFactors": ["factor1","factor2"],
    "bestAuthority": "which authority we perform best with",
    "worstAuthority": "which authority we lose most to"
  },
  "tacticalRecommendations": [
    {
      "recommendation": "specific action",
      "rationale": "why",
      "expectedImpact": "e.g. win 2-3 more tenders per quarter",
      "priority": "HIGH/MEDIUM/LOW"
    }
  ],
  "upcomingThreatAlert": "any specific threat or opportunity based on patterns"
}
Return ONLY valid JSON.`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":process.env.REACT_APP_ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:3000,messages:[{role:"user",content:prompt}]})
      });
      const data = await res.json();
      if(data.error) throw new Error(data.error.message);
      const raw = (data.content||[]).map(b=>b.text||"").join("");
      const start = raw.indexOf("{"), end = raw.lastIndexOf("}");
      setAiReport(JSON.parse(raw.slice(start,end+1)));
      setActiveTab("aianalysis");
    } catch(e) { setAiError("AI analysis failed: "+e.message); }
    setAiLoading(false);
  };

  // ── COMPUTED STATS ──
  const allCompNames = [...new Set(bids.flatMap(b=>(b.competitors||[]).map(c=>c.name).filter(Boolean)))];
  const compStats = allCompNames.map(name => {
    const appeared = bids.filter(b=>(b.competitors||[]).some(c=>c.name===name));
    const won = bids.filter(b=>b.winner?.toLowerCase()===name.toLowerCase());
    const prices = bids.flatMap(b=>(b.competitors||[]).filter(c=>c.name===name&&c.price).map(c=>parseFloat(c.price)||0)).filter(Boolean);
    const ourPrices = appeared.map(b=>parseFloat(b.ourBid)||0).filter(Boolean);
    const avgTheirPrice = prices.length ? Math.round(prices.reduce((a,b)=>a+b,0)/prices.length) : null;
    const avgOurPrice   = ourPrices.length ? Math.round(ourPrices.reduce((a,b)=>a+b,0)/ourPrices.length) : null;
    const priceDiff = avgTheirPrice&&avgOurPrice ? Math.round(((avgTheirPrice-avgOurPrice)/avgOurPrice)*100) : null;
    return { name, appeared:appeared.length, won:won.length, winRate:appeared.length?Math.round(won.length/appeared.length*100):0, avgPrice:avgTheirPrice, priceDiff };
  }).sort((a,b)=>b.appeared-a.appeared);

  const filteredBids = bids.filter(b => !search ||
    [b.tenderTitle,b.tenderRef,b.authority,...(b.competitors||[]).map(c=>c.name)].join(" ").toLowerCase().includes(search.toLowerCase())
  );

  const fmtEGP = (v) => { const n=parseFloat(v)||0; return n>=1e6?"EGP "+(n/1e6).toFixed(1)+"M":n>=1000?"EGP "+(n/1000).toFixed(0)+"K":"EGP "+n.toLocaleString(); };
  const threatColor = t => t==="HIGH"?C.red:t==="MEDIUM"?C.gold:C.accent;

  const TABS = [
    {id:"overview",   label:"📊 Overview"},
    {id:"bids",       label:"📋 Bid Records",    count:bids.length},
    {id:"profiles",   label:"🏢 Competitors",    count:profiles.length},
    {id:"aianalysis", label:"🧠 AI Analysis",    count:aiReport?1:0},
  ];

  return (
    <div>
      {/* HEADER */}
      <div style={{marginBottom:24,display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:C.red,letterSpacing:3,marginBottom:6}}>COMPETITIVE INTELLIGENCE</div>
          <h2 style={{fontSize:26,fontWeight:900,color:C.tb,fontFamily:"Inter,sans-serif",marginBottom:4}}>Competitor Tracker</h2>
          <p style={{fontSize:13,color:C.t2,fontFamily:"Inter,sans-serif"}}>Record who bids on every tender, at what price, and use AI to find their weaknesses and beat them.</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="sec" onClick={openNewComp} style={{fontSize:11}}>+ Add Competitor</Btn>
          <Btn onClick={openNewBid} style={{fontSize:11,background:"linear-gradient(135deg,rgba(230,57,70,0.2),rgba(230,57,70,0.1))",border:"1px solid "+C.red,color:C.red}}>+ Record Bid</Btn>
          <Btn onClick={runAiAnalysis} style={{fontSize:11,background:"linear-gradient(135deg,"+C.purple+",#6a3db8)",border:"none"}}>
            {aiLoading?"⏳ Analysing...":"⚡ AI Analysis"}
          </Btn>
        </div>
      </div>

      {/* TOP STAT CARDS */}
      {bids.length>0&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
          {[
            {label:"TENDERS TRACKED",     value:bids.length,                          color:C.blue},
            {label:"COMPETITORS SEEN",     value:allCompNames.length,                  color:C.red},
            {label:"TIMES WE WON",         value:bids.filter(b=>b.winner?.toLowerCase()==="ashmand"||b.winner?.toLowerCase()==="us"||b.winner==="").length, color:C.accent},
            {label:"COMPETITOR PROFILES",  value:profiles.length,                      color:C.purple},
          ].map((s,i)=>(
            <div key={i} style={{background:C.s1,border:"1px solid "+C.b,borderRadius:8,padding:"16px 20px"}}>
              <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:s.color,letterSpacing:2,marginBottom:8}}>{s.label}</div>
              <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:28,fontWeight:900,color:C.tb}}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {aiError&&<div style={{background:"rgba(230,57,70,0.1)",border:"1px solid "+C.red,borderRadius:6,padding:"10px 16px",color:C.red,fontFamily:"Inter,sans-serif",fontSize:13,marginBottom:16}}>{aiError}</div>}

      {/* TABS */}
      <div style={{display:"flex",gap:6,marginBottom:20,borderBottom:"1px solid "+C.b,paddingBottom:12}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            style={{padding:"8px 16px",borderRadius:4,border:"none",cursor:"pointer",
              background:activeTab===t.id?"rgba(230,57,70,0.12)":"transparent",
              color:activeTab===t.id?C.red:C.t2,
              fontFamily:"JetBrains Mono,monospace",fontSize:10,letterSpacing:0.5,
              display:"flex",alignItems:"center",gap:6,
              borderBottom:activeTab===t.id?"2px solid "+C.red:"2px solid transparent"}}>
            {t.label}
            {t.count>0&&<span style={{background:"rgba(230,57,70,0.2)",borderRadius:10,padding:"1px 6px",fontSize:9,color:C.red}}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab==="overview"&&(
        <div>
          {compStats.length===0
            ? <EmptyState icon="⚔️" title="No Competitor Data Yet" sub="Click '+ Record Bid' to log who competed on a tender and at what price. The more you add, the smarter the AI analysis."/>
            : (
              <div>
                <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:C.t2,letterSpacing:2,marginBottom:12}}>COMPETITOR LEAGUE TABLE — BASED ON BID HISTORY</div>
                {compStats.map((c,i)=>(
                  <div key={i} style={{background:C.s1,border:"1px solid "+C.b,borderRadius:8,padding:"16px 20px",marginBottom:10,
                    display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
                    <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:20,fontWeight:900,color:i<3?C.red:C.t3,width:32,flexShrink:0}}>#{i+1}</div>
                    <div style={{flex:1,minWidth:140}}>
                      <div style={{fontFamily:"Inter,sans-serif",fontSize:15,fontWeight:800,color:C.tb,marginBottom:3}}>{c.name}</div>
                      <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:C.t2}}>Appeared in {c.appeared} tender{c.appeared!==1?"s":""} · Won {c.won}</div>
                    </div>
                    <div style={{textAlign:"center",minWidth:70}}>
                      <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:22,fontWeight:900,color:c.winRate>=50?C.red:C.gold}}>{c.winRate}%</div>
                      <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:C.t2}}>WIN RATE</div>
                    </div>
                    {c.avgPrice&&(
                      <div style={{textAlign:"center",minWidth:100}}>
                        <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:13,fontWeight:700,color:C.tb}}>{fmtEGP(c.avgPrice)}</div>
                        <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:C.t2}}>AVG PRICE</div>
                      </div>
                    )}
                    {c.priceDiff!==null&&(
                      <div style={{textAlign:"center",minWidth:90}}>
                        <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:14,fontWeight:800,
                          color:c.priceDiff<0?C.red:C.accent}}>
                          {c.priceDiff>0?"+":""}{c.priceDiff}%
                        </div>
                        <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:C.t2}}>VS OUR PRICE</div>
                      </div>
                    )}
                    {/* Win rate bar */}
                    <div style={{width:120,flexShrink:0}}>
                      <div style={{height:6,background:C.s2,borderRadius:3,overflow:"hidden"}}>
                        <div style={{height:"100%",width:c.winRate+"%",background:c.winRate>=50?"linear-gradient(90deg,"+C.red+",#ff8080)":"linear-gradient(90deg,"+C.gold+",#ffd080)",borderRadius:3,transition:"width 0.6s ease"}}/>
                      </div>
                    </div>
                    {profiles.find(p=>p.name?.toLowerCase()===c.name.toLowerCase())&&(
                      <Badge label="PROFILED" color={C.purple}/>
                    )}
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}

      {/* ── BID RECORDS TAB ── */}
      {activeTab==="bids"&&(
        <div>
          <div style={{display:"flex",gap:10,marginBottom:16,alignItems:"center"}}>
            <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tenders or competitor names…" style={{flex:1}}/>
            <Btn onClick={openNewBid} style={{fontSize:11}}>+ Record Bid</Btn>
          </div>
          {filteredBids.length===0
            ? <EmptyState icon="📋" title="No Bid Records" sub="Record every tender you bid on, including who else bid and at what price."/>
            : filteredBids.map((b,i)=>(
              <div key={i} style={{background:C.s1,border:"1px solid "+C.b,borderRadius:8,padding:"18px 20px",marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                      {b.category&&<Badge label={b.category} color={C.blue}/>}
                      {b.date&&<Badge label={b.date} color={C.t2}/>}
                      {b.authority&&<Badge label={b.authority} color={C.purple}/>}
                    </div>
                    <div style={{fontFamily:"Inter,sans-serif",fontSize:16,fontWeight:800,color:C.tb}}>{b.tenderTitle||b.tenderRef}</div>
                    {b.tenderRef&&b.tenderTitle&&<div style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:C.t2,marginTop:2}}>Ref: {b.tenderRef}</div>}
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <Btn variant="sec" onClick={()=>openEditBid(b)} style={{fontSize:9,padding:"4px 10px"}}>Edit</Btn>
                    <Btn onClick={()=>deleteBid(b.id)} style={{fontSize:9,padding:"4px 10px",color:C.red,border:"1px solid "+C.red,background:"rgba(230,57,70,0.08)"}}>Delete</Btn>
                  </div>
                </div>

                {/* Price comparison grid */}
                <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
                  <div style={{background:"rgba(0,212,170,0.08)",border:"1px solid rgba(0,212,170,0.2)",borderRadius:5,padding:"10px 14px",minWidth:120}}>
                    <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:C.accent,letterSpacing:2,marginBottom:4}}>OUR BID</div>
                    <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:16,fontWeight:800,color:C.tb}}>{b.ourBid?fmtEGP(b.ourBid):"—"}</div>
                  </div>
                  {b.winnerPrice&&(
                    <div style={{background:"rgba(232,160,32,0.08)",border:"1px solid rgba(232,160,32,0.2)",borderRadius:5,padding:"10px 14px",minWidth:120}}>
                      <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:C.gold,letterSpacing:2,marginBottom:4}}>WINNING BID</div>
                      <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:16,fontWeight:800,color:C.tb}}>{fmtEGP(b.winnerPrice)}</div>
                      {b.winner&&<div style={{fontFamily:"Inter,sans-serif",fontSize:10,color:C.t2,marginTop:2}}>{b.winner}</div>}
                    </div>
                  )}
                  {b.ourBid&&b.winnerPrice&&(
                    <div style={{background:parseFloat(b.ourBid)<parseFloat(b.winnerPrice)?"rgba(0,212,170,0.08)":"rgba(230,57,70,0.08)",
                      border:"1px solid "+(parseFloat(b.ourBid)<parseFloat(b.winnerPrice)?C.accent:C.red),borderRadius:5,padding:"10px 14px",minWidth:120}}>
                      <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:C.t2,letterSpacing:2,marginBottom:4}}>PRICE DIFF</div>
                      <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:16,fontWeight:800,
                        color:parseFloat(b.ourBid)<parseFloat(b.winnerPrice)?C.accent:C.red}}>
                        {parseFloat(b.winnerPrice)>0?Math.round(((parseFloat(b.ourBid)-parseFloat(b.winnerPrice))/parseFloat(b.winnerPrice))*100):0}%
                      </div>
                      <div style={{fontFamily:"Inter,sans-serif",fontSize:9,color:C.t2,marginTop:2}}>
                        {parseFloat(b.ourBid)<parseFloat(b.winnerPrice)?"We bid lower":"We bid higher"}
                      </div>
                    </div>
                  )}
                </div>

                {/* Competitor bids */}
                {(b.competitors||[]).length>0&&(
                  <div>
                    <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:C.t2,letterSpacing:2,marginBottom:8}}>COMPETITOR BIDS</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {b.competitors.map((c,ci)=>(
                        <div key={ci} style={{background:C.s2,border:"1px solid "+C.b,borderRadius:4,padding:"8px 12px"}}>
                          <div style={{fontFamily:"Inter,sans-serif",fontSize:12,fontWeight:700,color:C.tb}}>{c.name}</div>
                          <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:11,color:C.gold}}>{c.price?fmtEGP(c.price):"Price unknown"}</div>
                          {c.notes&&<div style={{fontFamily:"Inter,sans-serif",fontSize:10,color:C.t2,marginTop:2}}>{c.notes}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {b.notes&&<div style={{marginTop:10,fontFamily:"Inter,sans-serif",fontSize:12,color:C.t2,fontStyle:"italic"}}>{b.notes}</div>}
              </div>
            ))
          }
        </div>
      )}

      {/* ── COMPETITOR PROFILES TAB ── */}
      {activeTab==="profiles"&&(
        <div>
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
            <Btn onClick={openNewComp} style={{fontSize:11}}>+ Add Competitor Profile</Btn>
          </div>
          {profiles.length===0
            ? <EmptyState icon="🏢" title="No Competitor Profiles" sub="Build detailed profiles for your key competitors — their strengths, weaknesses, pricing strategy, and which categories they dominate."/>
            : <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                {profiles.map((p,i)=>{
                  const stats = compStats.find(c=>c.name?.toLowerCase()===p.name.toLowerCase());
                  return (
                    <div key={i} style={{background:C.s1,border:"1px solid "+C.b,borderRadius:8,padding:"18px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                        <div>
                          <div style={{fontFamily:"Inter,sans-serif",fontSize:16,fontWeight:800,color:C.tb,marginBottom:4}}>{p.name}</div>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                            {p.country&&<Badge label={p.country} color={C.t2}/>}
                            {stats&&<Badge label={`${stats.winRate}% win rate`} color={stats.winRate>=50?C.red:C.gold}/>}
                            {stats&&<Badge label={`${stats.appeared} tenders`} color={C.blue}/>}
                          </div>
                        </div>
                        <div style={{display:"flex",gap:6}}>
                          <Btn variant="sec" onClick={()=>openEditComp(p)} style={{fontSize:9,padding:"4px 10px"}}>Edit</Btn>
                          <Btn onClick={()=>deleteComp(p.id)} style={{fontSize:9,padding:"4px 10px",color:C.red,border:"1px solid "+C.red,background:"rgba(230,57,70,0.08)"}}>Delete</Btn>
                        </div>
                      </div>
                      {p.knownCategories&&(
                        <div style={{marginBottom:10}}>
                          <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:C.blue,letterSpacing:2,marginBottom:4}}>CATEGORIES</div>
                          <div style={{fontFamily:"Inter,sans-serif",fontSize:12,color:C.t}}>{p.knownCategories}</div>
                        </div>
                      )}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                        {p.strengths&&(
                          <div style={{background:"rgba(230,57,70,0.06)",borderRadius:4,padding:"8px 10px"}}>
                            <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:C.red,letterSpacing:1,marginBottom:4}}>STRENGTHS</div>
                            <div style={{fontFamily:"Inter,sans-serif",fontSize:11,color:C.t,lineHeight:1.5}}>{p.strengths}</div>
                          </div>
                        )}
                        {p.weaknesses&&(
                          <div style={{background:"rgba(0,212,170,0.06)",borderRadius:4,padding:"8px 10px"}}>
                            <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:C.accent,letterSpacing:1,marginBottom:4}}>WEAKNESSES</div>
                            <div style={{fontFamily:"Inter,sans-serif",fontSize:11,color:C.t,lineHeight:1.5}}>{p.weaknesses}</div>
                          </div>
                        )}
                      </div>
                      {p.typicalPricing&&(
                        <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:C.gold}}>💰 {p.typicalPricing}</div>
                      )}
                      {p.notes&&<div style={{marginTop:8,fontFamily:"Inter,sans-serif",fontSize:11,color:C.t2,fontStyle:"italic"}}>{p.notes}</div>}
                      {p.website&&<a href={p.website} target="_blank" rel="noreferrer" style={{display:"block",marginTop:6,fontFamily:"JetBrains Mono,monospace",fontSize:10,color:C.blue}}>🌐 {p.website}</a>}
                    </div>
                  );
                })}
              </div>
          }
        </div>
      )}

      {/* ── AI ANALYSIS TAB ── */}
      {activeTab==="aianalysis"&&(
        <div>
          {!aiReport&&!aiLoading&&(
            <div style={{textAlign:"center",padding:"48px 0"}}>
              <div style={{fontSize:40,marginBottom:16}}>🧠</div>
              <div style={{fontFamily:"Inter,sans-serif",fontSize:16,fontWeight:700,color:C.tb,marginBottom:8}}>AI Competitor Analysis</div>
              <div style={{fontFamily:"Inter,sans-serif",fontSize:13,color:C.t2,marginBottom:24,maxWidth:480,margin:"0 auto 24px"}}>
                {bids.length>0?`Based on ${bids.length} bid records and ${profiles.length} profiles, AI will identify competitor patterns, pricing strategies, and how to beat them.`:"Add bid records first then run AI analysis."}
              </div>
              <Btn onClick={runAiAnalysis} style={{background:"linear-gradient(135deg,"+C.red+",#c0392b)",border:"none",fontSize:13}}>⚡ Run AI Competitor Analysis</Btn>
            </div>
          )}
          {aiLoading&&<div style={{textAlign:"center",padding:"60px 0"}}>
            <div style={{fontSize:36,marginBottom:12,animation:"spin 2s linear infinite",display:"inline-block"}}>⚙️</div>
            <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:12,color:C.red}}>ANALYSING COMPETITOR PATTERNS…</div>
          </div>}
          {aiReport&&(
            <div>
              <div style={{background:"linear-gradient(135deg,rgba(230,57,70,0.1),rgba(155,93,229,0.05))",border:"1px solid rgba(230,57,70,0.3)",borderRadius:10,padding:"20px 24px",marginBottom:20}}>
                <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:C.red,letterSpacing:2,marginBottom:10}}>EXECUTIVE SUMMARY</div>
                <p style={{fontFamily:"Inter,sans-serif",fontSize:14,color:C.t,lineHeight:1.7}}>{aiReport.executiveSummary}</p>
                {aiReport.upcomingThreatAlert&&(
                  <div style={{marginTop:12,padding:"10px 14px",background:"rgba(232,160,32,0.1)",border:"1px solid "+C.gold,borderRadius:5}}>
                    <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:C.gold,letterSpacing:2}}>⚡ ALERT: </span>
                    <span style={{fontFamily:"Inter,sans-serif",fontSize:12,color:C.t}}>{aiReport.upcomingThreatAlert}</span>
                  </div>
                )}
              </div>

              {/* Competitor rankings */}
              {aiReport.competitorRankings?.length>0&&(
                <div style={{marginBottom:20}}>
                  <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:C.t2,letterSpacing:2,marginBottom:12}}>COMPETITOR RANKINGS & HOW TO BEAT THEM</div>
                  {aiReport.competitorRankings.map((c,i)=>(
                    <div key={i} style={{background:C.s1,border:"1px solid "+C.b,borderRadius:8,padding:"16px 20px",marginBottom:10,borderLeft:"3px solid "+threatColor(c.threatLevel)}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:8}}>
                        <div>
                          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                            <span style={{fontFamily:"Inter,sans-serif",fontSize:15,fontWeight:800,color:C.tb}}>{c.name}</span>
                            <Badge label={c.threatLevel+" THREAT"} color={threatColor(c.threatLevel)}/>
                          </div>
                          <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:C.t2}}>Est. win rate: {c.winRate} · {c.priceGapVsUs}</div>
                        </div>
                        <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:12,color:C.gold}}>{c.avgPricingStrategy}</div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                        <div>
                          <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:C.t2,letterSpacing:1,marginBottom:4}}>WEAKNESSES</div>
                          {c.weaknesses?.map((w,j)=><div key={j} style={{fontFamily:"Inter,sans-serif",fontSize:11,color:C.t,marginBottom:3}}>• {w}</div>)}
                        </div>
                        <div>
                          <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:C.t2,letterSpacing:1,marginBottom:4}}>DOMINATES</div>
                          {c.categoriesTheyDominate?.map((cat,j)=><Badge key={j} label={cat} color={C.red} style={{marginRight:4,marginBottom:4}}/>)}
                        </div>
                      </div>
                      <div style={{background:"rgba(0,212,170,0.06)",border:"1px solid rgba(0,212,170,0.15)",borderRadius:5,padding:"10px 14px"}}>
                        <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:C.accent,letterSpacing:2,marginBottom:4}}>HOW TO BEAT THEM</div>
                        <div style={{fontFamily:"Inter,sans-serif",fontSize:12,color:C.t}}>{c.howTobeat}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pricing intel */}
              {aiReport.pricingIntelligence&&(
                <div style={{background:C.s1,border:"1px solid "+C.b,borderRadius:8,padding:"18px 20px",marginBottom:20}}>
                  <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:C.gold,letterSpacing:2,marginBottom:14}}>PRICING INTELLIGENCE</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:14}}>
                    {[
                      {label:"OUR AVG BID",    value:aiReport.pricingIntelligence.ourAvgBid},
                      {label:"MARKET AVERAGE", value:aiReport.pricingIntelligence.marketAvgBid},
                      {label:"OUR POSITION",   value:aiReport.pricingIntelligence.ourPricingPosition},
                    ].map((s,i)=>(
                      <div key={i} style={{background:C.s2,borderRadius:5,padding:"12px 14px"}}>
                        <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:C.t2,letterSpacing:2,marginBottom:6}}>{s.label}</div>
                        <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:13,fontWeight:700,color:C.tb}}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:C.gold,letterSpacing:2,marginBottom:6}}>PRICING ADVICE</div>
                  <p style={{fontFamily:"Inter,sans-serif",fontSize:13,color:C.t,lineHeight:1.65,marginBottom:8}}>{aiReport.pricingIntelligence.pricingAdvice}</p>
                  <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"8px 14px",background:"rgba(232,160,32,0.1)",border:"1px solid "+C.gold,borderRadius:5}}>
                    <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:C.gold}}>SWEET SPOT MARGIN:</span>
                    <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:13,fontWeight:800,color:C.tb}}>{aiReport.pricingIntelligence.sweetSpotMargin}</span>
                  </div>
                </div>
              )}

              {/* Tactical recs */}
              {aiReport.tacticalRecommendations?.length>0&&(
                <div>
                  <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:C.t2,letterSpacing:2,marginBottom:12}}>TACTICAL RECOMMENDATIONS</div>
                  {aiReport.tacticalRecommendations.map((r,i)=>(
                    <div key={i} style={{background:C.s1,border:"1px solid "+C.b,borderRadius:6,padding:"14px 18px",marginBottom:8,
                      borderLeft:"3px solid "+(r.priority==="HIGH"?C.red:r.priority==="MEDIUM"?C.gold:C.accent)}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                        <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:700,color:C.tb}}>{r.recommendation}</div>
                        <Badge label={r.priority} color={r.priority==="HIGH"?C.red:r.priority==="MEDIUM"?C.gold:C.accent}/>
                      </div>
                      <p style={{fontFamily:"Inter,sans-serif",fontSize:12,color:C.t,lineHeight:1.6,marginBottom:6}}>{r.rationale}</p>
                      <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:C.accent}}>Expected: {r.expectedImpact}</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}>
                <Btn onClick={runAiAnalysis} style={{fontSize:11,background:"rgba(230,57,70,0.1)",border:"1px solid "+C.red,color:C.red}}>🔄 Refresh Analysis</Btn>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: RECORD BID ── */}
      {showAddBid&&(
        <Modal title={editBidId?"Edit Bid Record":"Record New Bid"} onClose={()=>setShowAddBid(false)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Field label="Tender Title *"><Input value={bidForm.tenderTitle} onChange={e=>bf("tenderTitle",e.target.value)} placeholder="What was being procured"/></Field>
            <Field label="Tender Ref"><Input value={bidForm.tenderRef} onChange={e=>bf("tenderRef",e.target.value)} placeholder="Ref number"/></Field>
            <Field label="Authority"><Input value={bidForm.authority} onChange={e=>bf("authority",e.target.value)} placeholder="e.g. Egyptian Air Force"/></Field>
            <Field label="Category">
              <Select value={bidForm.category} onChange={e=>bf("category",e.target.value)}>
                <option value="">Select…</option>
                {["Weapons & Ammunition","Electronics & Communications","PPE","Vehicles & Logistics","Surveillance","C2 Systems","MRO","Training","Other"].map(c=><option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Date"><Input type="date" value={bidForm.date} onChange={e=>bf("date",e.target.value)}/></Field>
            <Field label="Our Bid (EGP)"><Input type="number" value={bidForm.ourBid} onChange={e=>bf("ourBid",e.target.value)} placeholder="0"/></Field>
            <Field label="Winner Name"><Input value={bidForm.winner} onChange={e=>bf("winner",e.target.value)} placeholder="Who won? (or 'Us')"/></Field>
            <Field label="Winning Price (EGP)"><Input type="number" value={bidForm.winnerPrice} onChange={e=>bf("winnerPrice",e.target.value)} placeholder="0"/></Field>
          </div>

          <div style={{margin:"16px 0 8px",borderTop:"1px solid "+C.b,paddingTop:16}}>
            <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:C.red,letterSpacing:2,marginBottom:12}}>COMPETITOR BIDS</div>
            {(bidForm.competitors||[]).map((c,i)=>(
              <div key={i} style={{display:"flex",gap:8,alignItems:"center",padding:"8px 12px",background:C.s2,borderRadius:4,marginBottom:6}}>
                <div style={{flex:1,fontFamily:"Inter,sans-serif",fontSize:12,fontWeight:700,color:C.tb}}>{c.name}</div>
                <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:11,color:C.gold}}>{c.price?fmtEGP(c.price):"No price"}</div>
                {c.notes&&<div style={{fontFamily:"Inter,sans-serif",fontSize:10,color:C.t2}}>{c.notes}</div>}
                <span onClick={()=>removeCompRow(c.id)} style={{cursor:"pointer",color:C.red,fontSize:16,flexShrink:0}}>×</span>
              </div>
            ))}
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 2fr auto",gap:8,alignItems:"flex-end",marginTop:8}}>
              <Field label="Competitor Name"><Input value={compRowInput.name} onChange={e=>setCompRowInput(p=>({...p,name:e.target.value}))} placeholder="Company name"/></Field>
              <Field label="Their Price (EGP)"><Input type="number" value={compRowInput.price} onChange={e=>setCompRowInput(p=>({...p,price:e.target.value}))} placeholder="0"/></Field>
              <Field label="Notes"><Input value={compRowInput.notes} onChange={e=>setCompRowInput(p=>({...p,notes:e.target.value}))} placeholder="Optional notes"/></Field>
              <Btn onClick={addCompRow} style={{fontSize:11,padding:"8px 16px",marginBottom:1}}>+ Add</Btn>
            </div>
          </div>

          <Field label="Notes"><TA value={bidForm.notes} onChange={e=>bf("notes",e.target.value)} rows={2} placeholder="Any other notes about this tender…"/></Field>
          <div style={{display:"flex",gap:10,marginTop:12}}>
            <Btn onClick={saveBid}>{editBidId?"SAVE CHANGES":"SAVE BID RECORD"}</Btn>
            <Btn variant="sec" onClick={()=>setShowAddBid(false)}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {/* ── MODAL: COMPETITOR PROFILE ── */}
      {showAddComp&&(
        <Modal title={editCompId?"Edit Competitor":"Add Competitor Profile"} onClose={()=>setShowAddComp(false)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Field label="Company Name *"><Input value={compForm.name} onChange={e=>cf("name",e.target.value)}/></Field>
            <Field label="Country"><Input value={compForm.country} onChange={e=>cf("country",e.target.value)} placeholder="Egypt, Turkey, UAE…"/></Field>
            <Field label="Website"><Input value={compForm.website} onChange={e=>cf("website",e.target.value)} placeholder="https://"/></Field>
            <Field label="Estimated Win Rate %"><Input type="number" value={compForm.winRate} onChange={e=>cf("winRate",e.target.value)} placeholder="e.g. 40"/></Field>
          </div>
          <Field label="Known Categories" style={{marginTop:12}}><Input value={compForm.knownCategories} onChange={e=>cf("knownCategories",e.target.value)} placeholder="PPE, Vehicles, Electronics…"/></Field>
          <Field label="Typical Pricing Strategy" style={{marginTop:12}}><Input value={compForm.typicalPricing} onChange={e=>cf("typicalPricing",e.target.value)} placeholder="e.g. Always 5-10% below market, aggressive on PPE"/></Field>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:12}}>
            <Field label="Strengths"><TA value={compForm.strengths} onChange={e=>cf("strengths",e.target.value)} rows={3} placeholder="What are they good at?"/></Field>
            <Field label="Weaknesses"><TA value={compForm.weaknesses} onChange={e=>cf("weaknesses",e.target.value)} rows={3} placeholder="Where do they fall short?"/></Field>
          </div>
          <Field label="Notes" style={{marginTop:12}}><TA value={compForm.notes} onChange={e=>cf("notes",e.target.value)} rows={2} placeholder="Any additional intel…"/></Field>
          <div style={{display:"flex",gap:10,marginTop:12}}>
            <Btn onClick={saveComp}>{editCompId?"SAVE":"ADD COMPETITOR"}</Btn>
            <Btn variant="sec" onClick={()=>setShowAddComp(false)}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════
// MODULE: CONTACTS CRM
// ═══════════════════════════════════════════════════
function ContactsCRM({ contacts, setContacts, suppliers }) {
  const [showForm,setShowForm] = useState(false);
  const [editId,setEditId]     = useState(null);
  const [search,setSearch]     = useState("");
  const [filterType,setFilterType] = useState("All");
  const [form,setForm]         = useState({name:"",title:"",org:"",type:"",email:"",phone:"",relationship:"",notes:"",lastContact:""});

  useEffect(()=>{stor.get("asmand:contacts").then(d=>{ if(d&&(!contacts||contacts.length===0)) setContacts(d); });},[]);
  const persist = (data) => { setContacts(data); };
  const f = (k,v) => setForm(p=>({...p,[k]:v}));
  const openNew  = () => { setForm({name:"",title:"",org:"",type:"",email:"",phone:"",relationship:"",notes:"",lastContact:TODAY}); setEditId(null); setShowForm(true); };
  const openEdit = (c) => { setForm({...c}); setEditId(c.id); setShowForm(true); };
  const submit   = () => { if(!form.name){window.alert("Name required.");return;} if(editId) persist((contacts||[]).map(c=>c.id===editId?{...form,id:editId}:c)); else persist([{...form,id:Date.now()+""},...(contacts||[])]); setShowForm(false); };
  const remove   = (id) => { if(window.confirm("Delete?")) persist((contacts||[]).filter(c=>c.id!==id)); };

  const relColor = r => r==="Strategic"?C.accent:r==="Strong"?C.blue:r==="Developing"?C.gold:C.t2;
  const allContacts = contacts||[];
  const TYPES = ["All","MOD Official","Procurement Officer","Supplier","Partner","Competitor","Consultant","Other"];
  const RELS  = ["Strategic","Strong","Developing","Weak","Unknown"];

  const filtered = allContacts.filter(c=>{
    const ms = !search||[c.name,c.org,c.type].some(v=>v?.toLowerCase().includes(search.toLowerCase()));
    const mt = filterType==="All"||c.type===filterType;
    return ms&&mt;
  });

  // Count contacts by type
  const supplierContacts = allContacts.filter(c=>c.type==="Supplier").length;
  const modContacts      = allContacts.filter(c=>c.type==="MOD Official"||c.type==="Procurement Officer").length;

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        <StatCard label="Total Contacts" value={allContacts.length} icon="👥"/>
        <StatCard label="MOD / Procurement" value={modContacts} color={C.gold} icon="🏛"/>
        <StatCard label="Supplier Contacts" value={supplierContacts} color={C.accent} icon="🏭" sub="From supplier directory"/>
        <StatCard label="Strategic Relations" value={allContacts.filter(c=>c.relationship==="Strategic").length} color={C.purple} icon="⭐"/>
      </div>

      <div style={{display:"flex",gap:10,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
        <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search contacts…" style={{maxWidth:240}}/>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {TYPES.map(t=>(
            <button key={t} onClick={()=>setFilterType(t)}
              style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,padding:"5px 10px",
                border:"1px solid "+(filterType===t?C.accent:C.b),
                color:filterType===t?C.accent:C.t2,
                background:filterType===t?"rgba(0,212,170,0.06)":C.s2,
                borderRadius:3,cursor:"pointer",letterSpacing:1,whiteSpace:"nowrap"}}>
              {t}
            </button>
          ))}
        </div>
        <div style={{flex:1}}/>
        <Btn onClick={openNew}>+ ADD CONTACT</Btn>
      </div>

      {filtered.length===0
        ?<EmptyState icon="👤" title="No Contacts Yet" sub="Contacts auto-sync from Supplier Directory when you add contact info to a supplier"/>
        :filtered.map(c=>(
          <div key={c.id} style={{background:C.s1,border:"1px solid "+C.b,borderRadius:5,
            padding:"14px 18px",marginBottom:8,borderLeft:"3px solid "+relColor(c.relationship)}}>
            <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:3}}>
                  <span style={{fontWeight:700,fontSize:15,color:C.tb,fontFamily:"Inter,sans-serif"}}>{c.name}</span>
                  {c.relationship&&<Badge label={c.relationship} color={relColor(c.relationship)}/>}
                  {c.type&&<Badge label={c.type} color={C.t2}/>}
                  {c.autoSynced&&<Badge label="AUTO-SYNCED" color={C.purple}/>}
                </div>
                {c.title&&<div style={{fontSize:12,color:C.t2,fontFamily:"Inter,sans-serif"}}>{c.title}{c.org?" · "+c.org:""}</div>}
                <div style={{fontSize:12,color:C.t,marginTop:5,display:"flex",gap:14,flexWrap:"wrap",alignItems:"center"}}>
                  {c.email&&<a href={"mailto:"+c.email} style={{color:C.accent}}>✉ {c.email}</a>}
                  {c.phone&&<span style={{fontFamily:"'JetBrains Mono',monospace",color:C.t}}>📞 {c.phone}</span>}
                  {c.website&&<a href={c.website} target="_blank" rel="noreferrer" style={{color:C.blue,fontSize:11}}>🌐 Website</a>}
                  {c.lastContact&&<span style={{color:C.t2,fontSize:11}}>Last contact: {c.lastContact}</span>}
                </div>
                {c.sourceSupplier&&<div style={{fontSize:11,color:C.purple,marginTop:3,fontFamily:"Inter,sans-serif"}}>↳ From supplier: {c.sourceSupplier}</div>}
                {c.notes&&<div style={{fontSize:12,color:C.t2,marginTop:5,fontStyle:"italic",fontFamily:"Inter,sans-serif",lineHeight:1.5}}>{c.notes}</div>}
              </div>
              <div style={{display:"flex",gap:5}}>
                <Btn variant="sec" onClick={()=>openEdit(c)} style={{fontSize:9,padding:"5px 10px"}}>Edit</Btn>
                <Btn variant="ghost" onClick={()=>remove(c.id)} style={{fontSize:9,padding:"5px 10px",color:C.red}}>✕</Btn>
              </div>
            </div>
          </div>
        ))
      }
      {showForm&&(
        <Modal title={editId?"Edit Contact":"New Contact"} onClose={()=>setShowForm(false)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Field label="Full Name *"><Input value={form.name} onChange={e=>f("name",e.target.value)}/></Field>
            <Field label="Job Title"><Input value={form.title} onChange={e=>f("title",e.target.value)}/></Field>
            <Field label="Organisation"><Input value={form.org} onChange={e=>f("org",e.target.value)}/></Field>
            <Field label="Type"><Select value={form.type} onChange={e=>f("type",e.target.value)}><option value="">Select…</option>{RELS.map(()=>null)}{["MOD Official","Procurement Officer","Supplier","Partner","Competitor","Consultant","Other"].map(t=><option key={t}>{t}</option>)}</Select></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={e=>f("email",e.target.value)}/></Field>
            <Field label="Phone"><Input value={form.phone} onChange={e=>f("phone",e.target.value)}/></Field>
            <Field label="Relationship"><Select value={form.relationship} onChange={e=>f("relationship",e.target.value)}><option value="">Select…</option>{RELS.map(r=><option key={r}>{r}</option>)}</Select></Field>
            <Field label="Last Contact"><Input type="date" value={form.lastContact} onChange={e=>f("lastContact",e.target.value)}/></Field>
          </div>
          <Field label="Notes"><TA value={form.notes} onChange={e=>f("notes",e.target.value)} rows={2}/></Field>
          <div style={{display:"flex",gap:10,marginTop:8}}><Btn onClick={submit}>{editId?"SAVE":"ADD"}</Btn><Btn variant="sec" onClick={()=>setShowForm(false)}>Cancel</Btn></div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MODULE: AI MARKET INTELLIGENCE
// ═══════════════════════════════════════════════════
function MarketIntelligence({ tenders, suppliers, bids, contacts }) {
  const [loading, setLoading]   = useState(false);
  const [report,  setReport]    = useState(null);
  const [error,   setError]     = useState("");
  const [activeTab, setActiveTab] = useState("opportunities");

  const hasData = tenders.length > 0;

  const buildPrompt = () => {
    const tenderSummary = tenders.slice(0,40).map(t=>
      [t.category||"Unknown",t.authority||"",t.status,t.value?"EGP "+t.value:"",
       t.winProbability?t.winProbability+"%wp":"",t.title?.slice(0,60)].filter(Boolean).join(" | ")
    ).join("\n");

    const wonCats = {};
    tenders.filter(t=>t.status==="Won").forEach(t=>{ if(t.category) wonCats[t.category]=(wonCats[t.category]||0)+1; });
    const lostCats = {};
    tenders.filter(t=>t.status==="Lost").forEach(t=>{ if(t.category) lostCats[t.category]=(lostCats[t.category]||0)+1; });
    const authorities = {};
    tenders.forEach(t=>{ if(t.authority) authorities[t.authority]=(authorities[t.authority]||0)+1; });
    const totalRevenue = tenders.filter(t=>t.status==="Won").reduce((s,t)=>s+(parseFloat(t.value)||0),0);
    const winRate = tenders.filter(t=>t.status==="Won").length + tenders.filter(t=>t.status==="Lost").length > 0
      ? Math.round(tenders.filter(t=>t.status==="Won").length / (tenders.filter(t=>t.status==="Won").length + tenders.filter(t=>t.status==="Lost").length) * 100) : 0;

    return `You are an elite Egyptian defence market intelligence analyst. Analyze this procurement data for Ashmand, an Egyptian defence distributor, and generate a comprehensive market intelligence report.

ASHMAND PERFORMANCE DATA:
- Total tenders: ${tenders.length}
- Win rate: ${winRate}%
- Total won revenue: EGP ${Math.round(totalRevenue/1e6)}M
- Supplier network: ${suppliers.length} suppliers across multiple countries
- MOD contacts: ${contacts.length}

WON CATEGORIES: ${JSON.stringify(wonCats)}
LOST CATEGORIES: ${JSON.stringify(lostCats)}
TOP AUTHORITIES: ${JSON.stringify(Object.entries(authorities).sort((a,b)=>b[1]-a[1]).slice(0,8).reduce((o,[k,v])=>({...o,[k]:v}),{}))}

TENDER DATA (last 40):
${tenderSummary}

Generate a detailed JSON market intelligence report with this exact structure:
{
  "marketSnapshot": {
    "summary": "3-4 sentence overall market assessment for Ashmand",
    "marketSize": "estimated Egyptian defence procurement market size and growth",
    "ashmandPosition": "Ashmand's current position in the market",
    "biggestThreat": "single biggest threat to Ashmand's growth",
    "biggestOpportunity": "single biggest opportunity right now"
  },
  "opportunities": [
    {
      "title": "specific opportunity name",
      "category": "product/service category",
      "targetDepartment": "specific MOD department or branch to target",
      "whyNow": "why this opportunity exists now",
      "estimatedValue": "estimated contract value range in EGP",
      "winProbability": 75,
      "actionSteps": ["step 1", "step 2", "step 3"],
      "suppliersToApproach": ["supplier country/type 1", "supplier country/type 2"],
      "urgency": "HIGH/MEDIUM/LOW",
      "timeframe": "e.g. Q1 2025"
    }
  ],
  "departmentTargets": [
    {
      "department": "e.g. Egyptian Air Force Procurement",
      "opportunity": "what to sell them",
      "relationship": "current relationship assessment",
      "approach": "how to approach them",
      "products": ["product 1", "product 2"],
      "estimatedBudget": "their estimated annual procurement budget",
      "insiderTip": "specific tactical advice for this department"
    }
  ],
  "revenueStrategies": [
    {
      "strategy": "strategy name",
      "description": "detailed explanation",
      "estimatedRevenueIncrease": "e.g. +30% in 12 months",
      "implementation": ["step 1", "step 2"],
      "riskLevel": "LOW/MEDIUM/HIGH",
      "priority": 1
    }
  ],
  "emergingThreats": [
    {
      "threat": "threat name",
      "description": "what it is and why it matters",
      "impact": "HIGH/MEDIUM/LOW",
      "mitigation": "how to counter it"
    }
  ],
  "productRecommendations": [
    {
      "product": "specific product or solution",
      "targetBranch": "which MOD branch",
      "rationale": "why Ashmand should market this",
      "suppliers": ["country or company type"],
      "marketingAngle": "how to position it"
    }
  ],
  "winRateImprovement": {
    "currentWeaknesses": ["weakness 1", "weakness 2", "weakness 3"],
    "quickWins": ["quick win 1", "quick win 2"],
    "longTermPlays": ["play 1", "play 2"]
  }
}

Make this Egypt-specific, defence-market-accurate, and genuinely actionable. Base recommendations on actual patterns in the data. Return ONLY valid JSON.`;
  };

  const runAnalysis = async () => {
    if(!hasData){ setError("Add some tenders first — the AI needs your data to identify patterns and opportunities."); return; }
    setLoading(true); setError(""); setReport(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":process.env.REACT_APP_ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:4000,messages:[{role:"user",content:buildPrompt()}]})
      });
      const data = await res.json();
      if(data.error) throw new Error(data.error.message);
      const raw = (data.content||[]).map(b=>b.text||"").join("");
      const start = raw.indexOf("{"), end = raw.lastIndexOf("}");
      const parsed = JSON.parse(raw.slice(start, end+1));
      setReport(parsed);
      setActiveTab("opportunities");
    } catch(e) {
      setError("Analysis failed: "+e.message);
    }
    setLoading(false);
  };

  const urgencyColor = (u) => u==="HIGH"?C.red:u==="MEDIUM"?C.gold:C.t2;
  const impactColor  = (i) => i==="HIGH"?C.red:i==="MEDIUM"?C.gold:C.accent;
  const riskColor    = (r) => r==="HIGH"?C.red:r==="MEDIUM"?C.gold:C.accent;

  const TABS = [
    {id:"opportunities",    label:"🎯 Opportunities",       count:report?.opportunities?.length},
    {id:"departments",      label:"🏛️ Department Targets",  count:report?.departmentTargets?.length},
    {id:"revenue",          label:"💰 Revenue Strategies",  count:report?.revenueStrategies?.length},
    {id:"products",         label:"📦 Product Recs",        count:report?.productRecommendations?.length},
    {id:"threats",          label:"⚠️ Threats",             count:report?.emergingThreats?.length},
    {id:"winrate",          label:"📈 Win Rate",             count:null},
  ];

  return (
    <div>
      {/* HEADER */}
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.purple,letterSpacing:3,marginBottom:6}}>AI-POWERED · EGYPT DEFENCE MARKET</div>
        <h2 style={{fontSize:26,fontWeight:900,color:C.tb,fontFamily:"Inter,sans-serif",marginBottom:8}}>Market Intelligence Engine</h2>
        <p style={{fontSize:13,color:C.t2,fontFamily:"Inter,sans-serif",maxWidth:620}}>
          AI analyses your entire tender history to identify untapped opportunities, recommend which MOD departments to target, and build strategies to maximise your revenue in the Egyptian defence market.
        </p>
      </div>

      {/* TRIGGER */}
      {!report&&!loading&&(
        <div style={{background:"linear-gradient(135deg,"+C.s2+","+C.s1+")",border:"1px solid "+C.purple,borderRadius:10,padding:"32px",textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:48,marginBottom:16}}>🧠</div>
          <div style={{fontFamily:"Inter,sans-serif",fontSize:18,fontWeight:700,color:C.tb,marginBottom:8}}>Ready to analyse your market</div>
          <div style={{fontFamily:"Inter,sans-serif",fontSize:13,color:C.t2,marginBottom:24,maxWidth:480,margin:"0 auto 24px"}}>
            {hasData
              ? `Based on ${tenders.length} tenders, ${suppliers.length} suppliers, and ${contacts.length} contacts — the AI will identify your best opportunities and strategies.`
              : "Add some tenders first to enable market analysis. The more data you have, the better the intelligence."}
          </div>
          <Btn onClick={runAnalysis} style={{background:"linear-gradient(135deg,"+C.purple+",#6a3db8)",border:"none",fontSize:14,padding:"12px 32px"}}>
            ⚡ RUN MARKET INTELLIGENCE ANALYSIS
          </Btn>
          {!hasData&&<div style={{marginTop:12,fontSize:11,color:C.red,fontFamily:"'JetBrains Mono',monospace"}}>⚠ No tender data found — add tenders first</div>}
        </div>
      )}

      {/* LOADING */}
      {loading&&(
        <div style={{textAlign:"center",padding:"60px 0"}}>
          <div style={{fontSize:40,marginBottom:16,animation:"spin 2s linear infinite",display:"inline-block"}}>⚙️</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:C.purple,marginBottom:8}}>ANALYSING MARKET INTELLIGENCE...</div>
          <div style={{fontFamily:"Inter,sans-serif",fontSize:12,color:C.t2}}>Scanning tender patterns · Identifying opportunities · Mapping MOD departments · Building revenue strategies</div>
        </div>
      )}

      {error&&<div style={{background:"rgba(230,57,70,0.1)",border:"1px solid "+C.red,borderRadius:6,padding:"12px 16px",color:C.red,fontFamily:"Inter,sans-serif",fontSize:13,marginBottom:16}}>{error}</div>}

      {/* REPORT */}
      {report&&(
        <div>
          {/* MARKET SNAPSHOT */}
          <div style={{background:"linear-gradient(135deg,rgba(155,93,229,0.1),rgba(0,212,170,0.05))",border:"1px solid "+C.purple,borderRadius:10,padding:"20px 24px",marginBottom:20}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.purple,letterSpacing:2,marginBottom:12}}>MARKET SNAPSHOT</div>
            <p style={{fontFamily:"Inter,sans-serif",fontSize:14,color:C.t,lineHeight:1.7,marginBottom:16}}>{report.marketSnapshot?.summary}</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div style={{background:C.s2,borderRadius:6,padding:"12px 16px"}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.accent,letterSpacing:2,marginBottom:6}}>BIGGEST OPPORTUNITY</div>
                <div style={{fontFamily:"Inter,sans-serif",fontSize:13,color:C.tb}}>{report.marketSnapshot?.biggestOpportunity}</div>
              </div>
              <div style={{background:C.s2,borderRadius:6,padding:"12px 16px"}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.red,letterSpacing:2,marginBottom:6}}>BIGGEST THREAT</div>
                <div style={{fontFamily:"Inter,sans-serif",fontSize:13,color:C.tb}}>{report.marketSnapshot?.biggestThreat}</div>
              </div>
            </div>
          </div>

          {/* RERUN BUTTON */}
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
            <Btn onClick={runAnalysis} style={{background:"rgba(155,93,229,0.15)",border:"1px solid "+C.purple,color:C.purple,fontSize:11}}>
              🔄 REFRESH ANALYSIS
            </Btn>
          </div>

          {/* TABS */}
          <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
            {TABS.map(tab=>(
              <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
                style={{padding:"8px 14px",borderRadius:4,border:"1px solid "+(activeTab===tab.id?C.purple:C.b),
                  background:activeTab===tab.id?"rgba(155,93,229,0.12)":C.s2,
                  color:activeTab===tab.id?C.purple:C.t2,cursor:"pointer",
                  fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:0.5,
                  display:"flex",alignItems:"center",gap:6}}>
                {tab.label}
                {tab.count>0&&<span style={{background:activeTab===tab.id?C.purple:"rgba(255,255,255,0.1)",borderRadius:10,padding:"1px 6px",fontSize:9,color:activeTab===tab.id?"#fff":C.t2}}>{tab.count}</span>}
              </button>
            ))}
          </div>

          {/* OPPORTUNITIES TAB */}
          {activeTab==="opportunities"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {(report.opportunities||[]).map((opp,i)=>(
                <div key={i} style={{background:C.s1,border:"1px solid "+C.b,borderRadius:8,padding:"20px",borderLeft:"3px solid "+urgencyColor(opp.urgency)}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
                    <div>
                      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6,flexWrap:"wrap"}}>
                        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:700,color:C.tb}}>#{i+1}</span>
                        <Badge label={opp.urgency+" URGENCY"} color={urgencyColor(opp.urgency)}/>
                        <Badge label={opp.category} color={C.blue}/>
                        <Badge label={opp.timeframe||""} color={C.t2}/>
                      </div>
                      <div style={{fontFamily:"Inter,sans-serif",fontSize:17,fontWeight:800,color:C.tb,marginBottom:4}}>{opp.title}</div>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.purple}}>🏛️ {opp.targetDepartment}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:22,fontWeight:900,color:opp.winProbability>=60?C.accent:C.gold}}>{opp.winProbability}%</div>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:C.t2}}>WIN PROBABILITY</div>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.gold,marginTop:4}}>{opp.estimatedValue}</div>
                    </div>
                  </div>
                  <p style={{fontFamily:"Inter,sans-serif",fontSize:13,color:C.t,lineHeight:1.65,marginBottom:14}}>{opp.whyNow}</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    <div>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.accent,letterSpacing:2,marginBottom:8}}>ACTION STEPS</div>
                      {(opp.actionSteps||[]).map((step,j)=>(
                        <div key={j} style={{display:"flex",gap:8,marginBottom:6,alignItems:"flex-start"}}>
                          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.accent,flexShrink:0,marginTop:1}}>{j+1}.</span>
                          <span style={{fontFamily:"Inter,sans-serif",fontSize:12,color:C.t}}>{step}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.gold,letterSpacing:2,marginBottom:8}}>SUPPLIERS TO APPROACH</div>
                      {(opp.suppliersToApproach||[]).map((s,j)=>(
                        <div key={j} style={{display:"flex",gap:6,marginBottom:5,alignItems:"center"}}>
                          <span style={{color:C.gold,fontSize:10}}>→</span>
                          <span style={{fontFamily:"Inter,sans-serif",fontSize:12,color:C.t}}>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* DEPARTMENT TARGETS TAB */}
          {activeTab==="departments"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              {(report.departmentTargets||[]).map((dept,i)=>(
                <div key={i} style={{background:C.s1,border:"1px solid "+C.b,borderRadius:8,padding:"18px"}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.purple,letterSpacing:2,marginBottom:6}}>TARGET DEPARTMENT</div>
                  <div style={{fontFamily:"Inter,sans-serif",fontSize:15,fontWeight:800,color:C.tb,marginBottom:4}}>{dept.department}</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.gold,marginBottom:12}}>{dept.estimatedBudget}</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.accent,letterSpacing:2,marginBottom:6}}>WHAT TO SELL</div>
                  <p style={{fontFamily:"Inter,sans-serif",fontSize:12,color:C.t,marginBottom:12,lineHeight:1.6}}>{dept.opportunity}</p>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12}}>
                    {(dept.products||[]).map((p,j)=><Badge key={j} label={p} color={C.blue}/>)}
                  </div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.gold,letterSpacing:2,marginBottom:6}}>HOW TO APPROACH</div>
                  <p style={{fontFamily:"Inter,sans-serif",fontSize:12,color:C.t,marginBottom:12,lineHeight:1.6}}>{dept.approach}</p>
                  <div style={{background:"rgba(155,93,229,0.08)",border:"1px solid rgba(155,93,229,0.2)",borderRadius:5,padding:"10px 12px"}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:C.purple,letterSpacing:2,marginBottom:4}}>INSIDER TIP</div>
                    <div style={{fontFamily:"Inter,sans-serif",fontSize:12,color:C.t,lineHeight:1.6}}>{dept.insiderTip}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* REVENUE STRATEGIES TAB */}
          {activeTab==="revenue"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {(report.revenueStrategies||[]).sort((a,b)=>a.priority-b.priority).map((strat,i)=>(
                <div key={i} style={{background:C.s1,border:"1px solid "+C.b,borderRadius:8,padding:"20px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div>
                      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
                        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.gold}}>PRIORITY {strat.priority}</span>
                        <Badge label={strat.riskLevel+" RISK"} color={riskColor(strat.riskLevel)}/>
                      </div>
                      <div style={{fontFamily:"Inter,sans-serif",fontSize:17,fontWeight:800,color:C.tb}}>{strat.strategy}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0,marginLeft:16}}>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:14,fontWeight:900,color:C.gold}}>{strat.estimatedRevenueIncrease}</div>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:C.t2,marginTop:2}}>EST. REVENUE IMPACT</div>
                    </div>
                  </div>
                  <p style={{fontFamily:"Inter,sans-serif",fontSize:13,color:C.t,lineHeight:1.7,marginBottom:14}}>{strat.description}</p>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.accent,letterSpacing:2,marginBottom:8}}>IMPLEMENTATION</div>
                  {(strat.implementation||[]).map((step,j)=>(
                    <div key={j} style={{display:"flex",gap:8,marginBottom:6,alignItems:"flex-start"}}>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.accent,flexShrink:0,marginTop:1}}>{j+1}.</span>
                      <span style={{fontFamily:"Inter,sans-serif",fontSize:12,color:C.t}}>{step}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* PRODUCT RECOMMENDATIONS TAB */}
          {activeTab==="products"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              {(report.productRecommendations||[]).map((prod,i)=>(
                <div key={i} style={{background:C.s1,border:"1px solid "+C.b,borderRadius:8,padding:"18px"}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.blue,letterSpacing:2,marginBottom:6}}>RECOMMENDED PRODUCT</div>
                  <div style={{fontFamily:"Inter,sans-serif",fontSize:15,fontWeight:800,color:C.tb,marginBottom:4}}>{prod.product}</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.purple,marginBottom:12}}>🏛️ {prod.targetBranch}</div>
                  <p style={{fontFamily:"Inter,sans-serif",fontSize:12,color:C.t,lineHeight:1.6,marginBottom:10}}>{prod.rationale}</p>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.gold,letterSpacing:2,marginBottom:6}}>MARKETING ANGLE</div>
                  <p style={{fontFamily:"Inter,sans-serif",fontSize:12,color:C.t,lineHeight:1.6,marginBottom:10}}>{prod.marketingAngle}</p>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {(prod.suppliers||[]).map((s,j)=><Badge key={j} label={s} color={C.accent}/>)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* THREATS TAB */}
          {activeTab==="threats"&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {(report.emergingThreats||[]).map((threat,i)=>(
                <div key={i} style={{background:C.s1,border:"1px solid "+C.b,borderRadius:8,padding:"18px",borderLeft:"3px solid "+impactColor(threat.impact)}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                    <div style={{fontFamily:"Inter,sans-serif",fontSize:15,fontWeight:800,color:C.tb}}>{threat.threat}</div>
                    <Badge label={threat.impact+" IMPACT"} color={impactColor(threat.impact)}/>
                  </div>
                  <p style={{fontFamily:"Inter,sans-serif",fontSize:13,color:C.t,lineHeight:1.65,marginBottom:12}}>{threat.description}</p>
                  <div style={{background:"rgba(0,212,170,0.05)",border:"1px solid "+C.b,borderRadius:5,padding:"10px 12px"}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.accent,letterSpacing:2,marginBottom:4}}>HOW TO COUNTER</div>
                    <div style={{fontFamily:"Inter,sans-serif",fontSize:12,color:C.t}}>{threat.mitigation}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* WIN RATE TAB */}
          {activeTab==="winrate"&&report.winRateImprovement&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
              <div style={{background:C.s1,border:"1px solid "+C.b,borderRadius:8,padding:"18px"}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.red,letterSpacing:2,marginBottom:12}}>CURRENT WEAKNESSES</div>
                {(report.winRateImprovement.currentWeaknesses||[]).map((w,i)=>(
                  <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"flex-start"}}>
                    <span style={{color:C.red,fontSize:12,flexShrink:0}}>⚠</span>
                    <span style={{fontFamily:"Inter,sans-serif",fontSize:12,color:C.t}}>{w}</span>
                  </div>
                ))}
              </div>
              <div style={{background:C.s1,border:"1px solid "+C.b,borderRadius:8,padding:"18px"}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.gold,letterSpacing:2,marginBottom:12}}>QUICK WINS</div>
                {(report.winRateImprovement.quickWins||[]).map((w,i)=>(
                  <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"flex-start"}}>
                    <span style={{color:C.gold,fontSize:12,flexShrink:0}}>⚡</span>
                    <span style={{fontFamily:"Inter,sans-serif",fontSize:12,color:C.t}}>{w}</span>
                  </div>
                ))}
              </div>
              <div style={{background:C.s1,border:"1px solid "+C.b,borderRadius:8,padding:"18px"}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.accent,letterSpacing:2,marginBottom:12}}>LONG-TERM PLAYS</div>
                {(report.winRateImprovement.longTermPlays||[]).map((w,i)=>(
                  <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"flex-start"}}>
                    <span style={{color:C.accent,fontSize:12,flexShrink:0}}>→</span>
                    <span style={{fontFamily:"Inter,sans-serif",fontSize:12,color:C.t}}>{w}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// GLOBAL SEARCH
// ═══════════════════════════════════════════════════
function GlobalSearch({ tenders, suppliers, contacts, bids, onNavigate, onClose }) {
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useEffect(()=>{ ref.current?.focus(); },[]);

  const results = q.length < 2 ? [] : [
    ...tenders.filter(t=>[t.title,t.refNum,t.authority,t.category].join(" ").toLowerCase().includes(q.toLowerCase()))
      .slice(0,5).map(t=>({type:"tender",icon:"📁",label:t.title||t.refNum,sub:(t.authority||"")+" · "+t.status,id:"tenders",color:C.blue})),
    ...suppliers.filter(s=>[s.name,s.country,s.category,...(s.keyProducts||[])].join(" ").toLowerCase().includes(q.toLowerCase()))
      .slice(0,5).map(s=>({type:"supplier",icon:"🏭",label:s.name,sub:(s.country||"")+" · "+(s.category||""),id:"suppliers",color:C.accent})),
    ...contacts.filter(c=>[c.name,c.org,c.title].join(" ").toLowerCase().includes(q.toLowerCase()))
      .slice(0,4).map(c=>({type:"contact",icon:"👥",label:c.name,sub:(c.title||"")+" · "+(c.org||""),id:"contacts",color:C.purple})),
    ...bids.filter(b=>[b.tenderRef,b.tenderTitle].join(" ").toLowerCase().includes(q.toLowerCase()))
      .slice(0,3).map(b=>({type:"bid",icon:"💰",label:b.tenderTitle||b.tenderRef,sub:"EGP "+(parseFloat(b.bidAmount)||0).toLocaleString()+" · "+b.status,id:"finance",color:C.gold})),
  ];

  return (
    <div style={{position:"fixed",inset:0,zIndex:9990,background:"rgba(4,7,10,0.85)",display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:100}}
      onClick={onClose}>
      <div style={{width:"100%",maxWidth:600,background:C.s1,border:"1px solid "+C.b2,borderRadius:12,
        boxShadow:"0 24px 80px rgba(0,0,0,0.8)",overflow:"hidden",animation:"fadeUp 0.2s ease"}}
        onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 18px",borderBottom:"1px solid "+C.b}}>
          <span style={{fontSize:18,color:C.t2}}>🔍</span>
          <input ref={ref} value={q} onChange={e=>setQ(e.target.value)}
            placeholder="Search tenders, suppliers, contacts, financials..."
            style={{flex:1,background:"transparent",border:"none",color:C.tb,fontFamily:"Inter,sans-serif",fontSize:15,outline:"none"}}/>
          <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:C.t2,cursor:"pointer"}} onClick={onClose}>ESC</span>
        </div>
        {q.length>=2&&(
          <div style={{maxHeight:400,overflowY:"auto"}}>
            {results.length===0
              ? <div style={{padding:"24px",textAlign:"center",color:C.t2,fontFamily:"Inter,sans-serif",fontSize:13}}>No results for that search</div>
              : results.map((r,i)=>(
                <div key={i} onClick={()=>{ onNavigate(r.id); onClose(); }}
                  style={{display:"flex",alignItems:"center",gap:12,padding:"12px 18px",cursor:"pointer",
                    borderBottom:"1px solid "+C.b}}
                  onMouseEnter={e=>e.currentTarget.style.background=C.s2}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <span style={{fontSize:16,flexShrink:0}}>{r.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"Inter,sans-serif",fontSize:13,fontWeight:600,color:C.tb}}>{r.label}</div>
                    <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:C.t2,marginTop:2}}>{r.sub}</div>
                  </div>
                  <Badge label={r.type.toUpperCase()} color={r.color}/>
                </div>
              ))
            }
          </div>
        )}
        {q.length<2&&(
          <div style={{padding:"20px 18px"}}>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:11,color:C.t2}}>Type at least 2 characters to search across all modules</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MODULE: SETTINGS
// ═══════════════════════════════════════════════════
function Settings({ settings, setSettings }) {
  const defaults = {
    companyName:"Ashmand",
    companyFullName:"Ashmand for Defence & Security",
    country:"Egypt",
    currency:"EGP",
    defaultMarginTarget:20,
    aiLanguage:"English",
    defaultTenderStatus:"Pending",
    deadlineWarningDays:14,
    lowMarginAlert:10,
    autoSyncEnabled:true,
    exportControlFocus:"ITAR,EAR,EU",
    modKeywords:"Egyptian MOD,EAF,Egyptian Navy,Egyptian Army,Ministry of Defence,Armed Forces",
    supplierPriorityCountries:"USA,UK,Germany,France,Turkey,South Korea,Czech Republic",
    competitorKeywords:"SEDICO,ETS,Arab Organization for Industrialization,AOI",
  };

  const [form, setForm] = useState({...defaults,...(settings||{})});
  const [saved, setSaved] = useState(false);
  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  const save = () => {
    setSettings(form);
    localStorage.setItem("asmand:settings", JSON.stringify(form));
    setSaved(true);
    setTimeout(()=>setSaved(false), 3000);
  };

  const Section = ({title, color, children}) => (
    <div style={{background:C.s1,border:"1px solid "+C.b,borderRadius:8,padding:"20px",marginBottom:16}}>
      <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:color||C.accent,letterSpacing:3,marginBottom:16}}>{title}</div>
      {children}
    </div>
  );

  return (
    <div>
      <div style={{marginBottom:24,display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:C.t2,letterSpacing:3,marginBottom:6}}>PLATFORM CONFIGURATION</div>
          <h2 style={{fontSize:26,fontWeight:900,color:C.tb,fontFamily:"Inter,sans-serif"}}>Settings</h2>
          <p style={{fontSize:13,color:C.t2,marginTop:4,fontFamily:"Inter,sans-serif"}}>Customise keywords, filters, alerts, and AI behaviour across the platform.</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="sec" onClick={()=>setForm(defaults)} style={{fontSize:11}}>Reset Defaults</Btn>
          <Btn onClick={save} style={{fontSize:11}}>
            {saved?"SAVED ✅":"SAVE SETTINGS"}
          </Btn>
        </div>
      </div>

      <Section title="COMPANY IDENTITY">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Company Short Name"><Input value={form.companyName} onChange={e=>f("companyName",e.target.value)}/></Field>
          <Field label="Company Full Name"><Input value={form.companyFullName} onChange={e=>f("companyFullName",e.target.value)}/></Field>
          <Field label="Country"><Input value={form.country} onChange={e=>f("country",e.target.value)}/></Field>
          <Field label="Currency"><Select value={form.currency} onChange={e=>f("currency",e.target.value)}>
            {["EGP","USD","EUR","GBP"].map(c=><option key={c}>{c}</option>)}
          </Select></Field>
        </div>
      </Section>

      <Section title="AI BEHAVIOUR" color={C.purple}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="AI Response Language"><Select value={form.aiLanguage} onChange={e=>f("aiLanguage",e.target.value)}>
            {["English","Arabic","Both"].map(l=><option key={l}>{l}</option>)}
          </Select></Field>
          <Field label="Export Control Focus"><Input value={form.exportControlFocus} onChange={e=>f("exportControlFocus",e.target.value)} placeholder="ITAR,EAR,EU"/></Field>
        </div>
        <Field label="MOD / Authority Keywords" style={{marginTop:12}}>
          <TA value={form.modKeywords} onChange={e=>f("modKeywords",e.target.value)} rows={2}/>
        </Field>
        <Field label="Supplier Priority Countries" style={{marginTop:12}}>
          <TA value={form.supplierPriorityCountries} onChange={e=>f("supplierPriorityCountries",e.target.value)} rows={2}/>
        </Field>
        <Field label="Known Competitor Keywords" style={{marginTop:12}}>
          <TA value={form.competitorKeywords} onChange={e=>f("competitorKeywords",e.target.value)} rows={2}/>
        </Field>
      </Section>

      <Section title="ALERTS AND THRESHOLDS" color={C.gold}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          <Field label="Deadline Warning (days before)">
            <Input type="number" value={form.deadlineWarningDays} onChange={e=>f("deadlineWarningDays",parseInt(e.target.value)||14)}/>
          </Field>
          <Field label="Low Margin Alert (%)">
            <Input type="number" value={form.lowMarginAlert} onChange={e=>f("lowMarginAlert",parseInt(e.target.value)||10)}/>
          </Field>
          <Field label="Target Margin (%)">
            <Input type="number" value={form.defaultMarginTarget} onChange={e=>f("defaultMarginTarget",parseInt(e.target.value)||20)}/>
          </Field>
        </div>
      </Section>

      <Section title="PLATFORM BEHAVIOUR" color={C.blue}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Default Tender Status">
            <Select value={form.defaultTenderStatus} onChange={e=>f("defaultTenderStatus",e.target.value)}>
              {["Pending","Submitted","Won","Lost"].map(s=><option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Auto-Sync Engine">
            <Select value={form.autoSyncEnabled?"on":"off"} onChange={e=>f("autoSyncEnabled",e.target.value==="on")}>
              <option value="on">Enabled</option>
              <option value="off">Disabled</option>
            </Select>
          </Field>
        </div>
      </Section>

      {saved&&(
        <div style={{position:"fixed",bottom:32,right:32,zIndex:9999,padding:"16px 24px",
          background:"linear-gradient(135deg,#0c2a1e,#0a1f17)",border:"2px solid "+C.accent,
          borderRadius:12,boxShadow:"0 8px 32px rgba(0,212,170,0.4)",
          fontFamily:"JetBrains Mono,monospace",fontSize:14,color:C.accent,
          display:"flex",alignItems:"center",gap:10,animation:"fadeUp 0.3s ease"}}>
          <span style={{fontSize:20}}>✅</span>
          <span>Settings saved</span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MODULE: FINANCIALS
// ═══════════════════════════════════════════════════
function Financials({ bids:bidsProp, setBids:setBidsProp, tenders }) {
  const [bidsLocal,setBidsLocal] = useState([]);
  const bids    = bidsProp    || bidsLocal;
  const setBids = setBidsProp || ((d)=>{ setBidsLocal(d); stor.set("asmand:financials",d); });

  const [showForm,setShowForm]   = useState(false);
  const [showExcel,setShowExcel] = useState(false);
  const [editId,setEditId]       = useState(null);
  const [importMsg,setImportMsg] = useState("");
  const [filterStatus,setFilterStatus] = useState("All");
  const [form,setForm] = useState({tenderRef:"",tenderTitle:"",bidAmount:"",costOfGoods:"",otherCosts:"",status:"Pending",paymentStatus:"Not received",notes:""});

  useEffect(()=>{ if(!bidsProp) stor.get("asmand:financials").then(d=>d&&setBidsLocal(d)); },[]);
  const persist = (data) => setBids(data);

  // CALCULATE margin correctly: (Bid - COGS - OtherCosts) / Bid * 100
  const calcMargin = (bid, cogs, other) => {
    const b = parseFloat(bid)||0;
    const c = parseFloat(cogs)||0;
    const o = parseFloat(other)||0;
    if(b===0) return "";
    return Math.round(((b - c - o) / b) * 100);
  };

  const calcProfit = (bid, cogs, other) => {
    const b = parseFloat(bid)||0;
    const c = parseFloat(cogs)||0;
    const o = parseFloat(other)||0;
    return b - c - o;
  };

  const handleExcelImport = (rows) => {
    const existing = bids || [];
    const existingRefs = new Set(existing.map(b=>b.tenderRef?.toLowerCase()));
    const newOnes = rows.filter(r=>r.tenderRef&&!existingRefs.has(r.tenderRef.toLowerCase()))
      .map(r=>({...r, margin: calcMargin(r.bidAmount,r.costOfGoods,r.otherCosts||0)}));
    persist([...newOnes, ...existing]);
    setImportMsg("✓ "+newOnes.length+" records imported from Excel");
    setTimeout(()=>setImportMsg(""),5000);
  };

  const f = (k,v) => setForm(p=>({...p,[k]:v}));
  const openNew  = () => { setForm({tenderRef:"",tenderTitle:"",bidAmount:"",costOfGoods:"",otherCosts:"",status:"Pending",paymentStatus:"Not received",notes:""}); setEditId(null); setShowForm(true); };
  const openEdit = (b) => { setForm({...b,otherCosts:b.otherCosts||""}); setEditId(b.id); setShowForm(true); };

  const submit = () => {
    if(!form.tenderRef){ window.alert("Tender Ref is required."); return; }
    const bid    = parseFloat(form.bidAmount)||0;
    const cogs   = parseFloat(form.costOfGoods)||0;
    const other  = parseFloat(form.otherCosts)||0;
    const profit = bid - cogs - other;
    const margin = bid>0 ? Math.round((profit/bid)*100) : "";
    const entry  = {...form, bidAmount:bid||form.bidAmount, costOfGoods:cogs||form.costOfGoods, otherCosts:other||form.otherCosts, profit, margin, id:editId||Date.now()+""};
    if(editId) persist(bids.map(b=>b.id===editId?entry:b));
    else persist([entry,...bids]);
    setShowForm(false);
  };

  const remove = (id) => { if(window.confirm("Delete this entry?")) persist(bids.filter(b=>b.id!==id)); };

  // ── SUMMARY CALCULATIONS (all bids) ──
  const allBids    = bids || [];
  const wonBids    = allBids.filter(b=>b.status==="Won");
  const lostBids   = allBids.filter(b=>b.status==="Lost");
  const pendingBids= allBids.filter(b=>b.status==="Pending"||b.status==="Submitted");
  const overdueBids= allBids.filter(b=>b.paymentStatus==="Overdue");

  const totalRevenue   = wonBids.reduce((s,b)=>s+(parseFloat(b.bidAmount)||0),0);
  const totalCOGS      = wonBids.reduce((s,b)=>s+(parseFloat(b.costOfGoods)||0),0);
  const totalOther     = wonBids.reduce((s,b)=>s+(parseFloat(b.otherCosts)||0),0);
  const totalProfit    = totalRevenue - totalCOGS - totalOther;
  const overallMargin  = totalRevenue>0 ? Math.round((totalProfit/totalRevenue)*100) : 0;
  const pipelineValue  = pendingBids.reduce((s,b)=>s+(parseFloat(b.bidAmount)||0),0);
  const overdueValue   = overdueBids.reduce((s,b)=>s+(parseFloat(b.bidAmount)||0),0);
  const receivedValue  = wonBids.filter(b=>b.paymentStatus==="Received").reduce((s,b)=>s+(parseFloat(b.bidAmount)||0),0);
  const pendingPayment = wonBids.filter(b=>b.paymentStatus==="Not received"||b.paymentStatus==="Partial").reduce((s,b)=>s+(parseFloat(b.bidAmount)||0),0);

  // Filtered list
  const filtered = filterStatus==="All" ? allBids : allBids.filter(b=>b.status===filterStatus);

  const fmt = (n) => n>=1e6 ? "EGP "+Math.round(n/1e6)+"M" : n>=1e3 ? "EGP "+Math.round(n/1e3)+"K" : "EGP "+Math.round(n).toLocaleString();

  return (
    <div>
      {/* ── TOP KPI CARDS ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        <StatCard label="Won Revenue" value={totalRevenue>0?fmt(totalRevenue):"—"} color={C.accent} icon="💵" sub={wonBids.length+" bids won"}/>
        <StatCard label="Gross Profit" value={totalRevenue>0?fmt(totalProfit):"—"} color={totalProfit>=0?C.gold:C.red} icon="📈" sub={overallMargin+"% margin"}/>
        <StatCard label="Pipeline" value={pipelineValue>0?fmt(pipelineValue):"—"} color={C.blue} icon="⚡" sub={pendingBids.length+" active bids"}/>
        <StatCard label="Overdue" value={overdueValue>0?fmt(overdueValue):"—"} color={overdueValue>0?C.red:C.t2} icon="⚠️" sub={overdueBids.length+" unpaid"}/>
      </div>

      {/* ── P&L SUMMARY BAR ── */}
      {totalRevenue>0&&(
        <div style={{background:C.s1,border:"1px solid "+C.b,borderRadius:6,padding:"16px 20px",marginBottom:16}}>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.t2,letterSpacing:2,marginBottom:12}}>PROFIT & LOSS SUMMARY (WON BIDS)</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:14}}>
            {[
              {label:"TOTAL REVENUE",   value:fmt(totalRevenue),          color:C.accent},
              {label:"COST OF GOODS",   value:fmt(totalCOGS),             color:C.red},
              {label:"OTHER COSTS",     value:fmt(totalOther),            color:C.orange},
              {label:"GROSS PROFIT",    value:fmt(totalProfit),           color:totalProfit>=0?C.gold:C.red},
              {label:"MARGIN",          value:overallMargin+"%",          color:overallMargin>=20?C.accent:overallMargin>=10?C.gold:C.red},
            ].map(item=>(
              <div key={item.label} style={{textAlign:"center",background:C.s2,borderRadius:4,padding:"10px 6px"}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:16,fontWeight:900,color:item.color}}>{item.value}</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:C.t2,marginTop:4,letterSpacing:1}}>{item.label}</div>
              </div>
            ))}
          </div>
          {/* Visual margin bar */}
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.t2,letterSpacing:2,marginBottom:6}}>MARGIN BREAKDOWN</div>
          <div style={{height:8,borderRadius:4,background:C.s3,overflow:"hidden",display:"flex"}}>
            <div style={{width:(totalCOGS/totalRevenue*100)+"%",background:C.red,transition:"width 0.8s"}}/>
            <div style={{width:(totalOther/totalRevenue*100)+"%",background:C.orange,transition:"width 0.8s"}}/>
            <div style={{width:(Math.max(totalProfit,0)/totalRevenue*100)+"%",background:C.accent,transition:"width 0.8s"}}/>
          </div>
          <div style={{display:"flex",gap:16,marginTop:6}}>
            {[{label:"COGS",color:C.red},{label:"OTHER",color:C.orange},{label:"PROFIT",color:C.accent}].map(l=>(
              <div key={l.label} style={{display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:l.color}}/>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.t2}}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PAYMENT STATUS ROW ── */}
      {wonBids.length>0&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
          <div style={{background:C.s1,border:"1px solid "+C.b,borderRadius:5,padding:"12px 16px",textAlign:"center"}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:18,fontWeight:900,color:C.accent}}>{fmt(receivedValue)||"—"}</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.t2,marginTop:4}}>PAYMENTS RECEIVED</div>
          </div>
          <div style={{background:C.s1,border:"1px solid "+C.b,borderRadius:5,padding:"12px 16px",textAlign:"center"}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:18,fontWeight:900,color:C.gold}}>{fmt(pendingPayment)||"—"}</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.t2,marginTop:4}}>PAYMENTS PENDING</div>
          </div>
          <div style={{background:C.s1,border:"1px solid "+C.b,borderRadius:5,padding:"12px 16px",textAlign:"center"}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:18,fontWeight:900,color:overdueValue>0?C.red:C.t2}}>{overdueValue>0?fmt(overdueValue):"—"}</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.t2,marginTop:4}}>OVERDUE</div>
          </div>
        </div>
      )}

      {/* ── CONTROLS ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:6}}>
          {["All","Won","Submitted","Pending","Lost"].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)}
              style={{padding:"5px 12px",borderRadius:3,border:"1px solid "+(filterStatus===s?C.accent:C.b),
                background:filterStatus===s?"rgba(0,212,170,0.1)":C.s2,
                color:filterStatus===s?C.accent:C.t2,cursor:"pointer",
                fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:1}}>
              {s.toUpperCase()}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="sec" onClick={()=>{
            const rows = [
              ["Tender Ref","Title","Bid Amount (EGP)","Cost of Goods (EGP)","Other Costs (EGP)","Gross Profit (EGP)","Margin %","Status","Payment Status","Notes"],
              ...allBids.map(b=>{
                const bid=parseFloat(b.bidAmount)||0,cogs=parseFloat(b.costOfGoods)||0,other=parseFloat(b.otherCosts)||0,profit=bid-cogs-other,margin=bid>0?Math.round((profit/bid)*100):"";
                return [b.tenderRef,b.tenderTitle||"",bid,cogs,other,profit,margin,b.status,b.paymentStatus||"",b.notes||""];
              }),
              [],
              ["TOTALS","","EGP "+totalRevenue,"EGP "+totalCOGS,"EGP "+totalOther,"EGP "+totalProfit,overallMargin+"%","","",""],
            ];
            const csv = rows.map(r=>r.map(v=>'"'+(v+"").replace(/"/g,'""')+'"').join(",")).join("\n");
            const blob = new Blob([csv],{type:"text/csv"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href=url; a.download="Ashmand-Financials-"+new Date().toISOString().slice(0,10)+".csv"; a.click();
            URL.revokeObjectURL(url);
          }} style={{fontSize:10}}>📥 EXPORT CSV</Btn>
          <Btn variant="gold" onClick={()=>setShowExcel(true)} style={{fontSize:10}}>📊 IMPORT EXCEL</Btn>
          <Btn onClick={openNew}>+ ADD BID</Btn>
        </div>
      </div>

      {importMsg&&<div style={{padding:"10px 14px",background:"rgba(0,212,170,0.08)",border:"1px solid "+C.accent,borderRadius:4,marginBottom:12,fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.accent}}>{importMsg}</div>}
      {showExcel&&<ExcelImporter mode="financials" onImport={handleExcelImport} onClose={()=>setShowExcel(false)}/>}

      {/* ── BID LIST ── */}
      {filtered.length===0
        ?<EmptyState icon="💰" title="No Financial Data Yet" sub="Track your bid amounts, costs, and margins for every tender"/>
        :filtered.map(b=>{
          const bid    = parseFloat(b.bidAmount)||0;
          const cogs   = parseFloat(b.costOfGoods)||0;
          const other  = parseFloat(b.otherCosts)||0;
          const profit = bid - cogs - other;
          const margin = bid>0 ? Math.round((profit/bid)*100) : null;
          const mc     = margin>=20?C.accent:margin>=10?C.gold:C.red;
          return (
            <div key={b.id} style={{background:C.s1,border:"1px solid "+C.b,borderRadius:6,
              padding:"14px 18px",marginBottom:8,borderLeft:"3px solid "+statusColor(b.status)}}>
              <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:6,flexWrap:"wrap"}}>
                    <Mono style={{fontSize:10,color:C.accent}}>{b.tenderRef}</Mono>
                    <Badge label={b.status} color={statusColor(b.status)}/>
                    <Badge label={b.paymentStatus||"Not received"} color={b.paymentStatus==="Received"?C.accent:b.paymentStatus==="Overdue"?C.red:b.paymentStatus==="Partial"?C.gold:C.t2}/>
                    {b.autoSynced&&<Badge label="AUTO-SYNCED" color={C.purple}/>}
                  </div>
                  <div style={{fontWeight:700,fontSize:14,color:C.tb,fontFamily:"Inter,sans-serif",marginBottom:10}}>{b.tenderTitle||b.tenderRef}</div>

                  {/* NUMBER GRID */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                    {[
                      {label:"BID AMOUNT",   value:bid>0?"EGP "+bid.toLocaleString():"—",     color:C.tb},
                      {label:"COST OF GOODS",value:cogs>0?"EGP "+cogs.toLocaleString():"—",   color:C.t},
                      {label:"OTHER COSTS",  value:other>0?"EGP "+other.toLocaleString():"—",  color:C.t},
                      {label:"GROSS PROFIT", value:bid>0?"EGP "+profit.toLocaleString():"—",  color:profit>=0?C.gold:C.red},
                    ].map(item=>(
                      <div key={item.label} style={{background:C.s2,borderRadius:3,padding:"6px 8px"}}>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:700,color:item.color}}>{item.value}</div>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:C.t2,marginTop:2}}>{item.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* MARGIN BAR */}
                  {bid>0&&(
                    <div style={{marginTop:8,display:"flex",alignItems:"center",gap:10}}>
                      <div style={{flex:1,height:4,borderRadius:2,background:C.s3,overflow:"hidden"}}>
                        <div style={{height:"100%",width:Math.max(Math.min(margin,100),0)+"%",background:mc,transition:"width 0.8s ease",borderRadius:2}}/>
                      </div>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:700,color:mc,minWidth:36}}>{margin!==null?margin+"%":"—"}</span>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.t2}}>MARGIN</span>
                    </div>
                  )}
                  {b.notes&&<div style={{marginTop:6,fontSize:11,color:C.t2,fontFamily:"Inter,sans-serif",fontStyle:"italic"}}>{b.notes}</div>}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:5,alignItems:"flex-end"}}>
                  <Btn variant="sec" onClick={()=>openEdit(b)} style={{fontSize:9,padding:"5px 10px"}}>Edit</Btn>
                  <Btn variant="ghost" onClick={()=>remove(b.id)} style={{fontSize:9,padding:"5px 10px",color:C.red}}>✕</Btn>
                </div>
              </div>
            </div>
          );
        })
      }

      {/* ── ADD/EDIT FORM ── */}
      {showForm&&(
        <Modal title={editId?"Edit Bid":"Add Bid to Financials"} onClose={()=>setShowForm(false)}>
          {tenders&&tenders.length>0&&(
            <div style={{marginBottom:16}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.gold,letterSpacing:2,marginBottom:6}}>QUICK-FILL FROM TENDERS</div>
              <select onChange={e=>{
                const t=tenders.find(x=>x.id===e.target.value);
                if(t){ f("tenderRef",t.refNum||""); f("tenderTitle",t.title||""); f("status",t.status==="Won"||t.status==="Lost"?t.status:"Pending"); f("bidAmount",t.value||""); }
              }} style={{width:"100%",background:C.s2,border:"1px solid "+C.gold,color:C.t,fontFamily:"'JetBrains Mono',monospace",fontSize:11,padding:"8px 10px",borderRadius:3}}>
                <option value="">— Select a tender to auto-fill —</option>
                {tenders.map(t=><option key={t.id} value={t.id}>[{t.status}] {t.refNum?t.refNum+" · ":""}{t.title}</option>)}
              </select>
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Field label="Tender Ref *"><Input value={form.tenderRef} onChange={e=>f("tenderRef",e.target.value)}/></Field>
            <Field label="Tender Title"><Input value={form.tenderTitle} onChange={e=>f("tenderTitle",e.target.value)}/></Field>
            <Field label="Bid Amount (EGP)"><Input type="number" value={form.bidAmount} onChange={e=>f("bidAmount",e.target.value)}/></Field>
            <Field label="Cost of Goods (EGP)"><Input type="number" value={form.costOfGoods} onChange={e=>f("costOfGoods",e.target.value)}/></Field>
            <Field label="Other Costs (EGP)"><Input type="number" value={form.otherCosts} onChange={e=>f("otherCosts",e.target.value)} placeholder="Shipping, duties, etc."/></Field>
            <Field label="Gross Profit (EGP)" style={{opacity:0.7}}>
              <div style={{background:C.s3,border:"1px solid "+C.b,borderRadius:3,padding:"8px 12px",fontFamily:"'JetBrains Mono',monospace",fontSize:13,
                color:calcProfit(form.bidAmount,form.costOfGoods,form.otherCosts)>=0?C.gold:C.red}}>
                {form.bidAmount ? "EGP "+calcProfit(form.bidAmount,form.costOfGoods,form.otherCosts).toLocaleString() : "—"}
              </div>
            </Field>
            <Field label="Margin %" style={{opacity:0.7}}>
              <div style={{background:C.s3,border:"1px solid "+C.b,borderRadius:3,padding:"8px 12px",fontFamily:"'JetBrains Mono',monospace",fontSize:13,
                color:(calcMargin(form.bidAmount,form.costOfGoods,form.otherCosts)||0)>=20?C.accent:(calcMargin(form.bidAmount,form.costOfGoods,form.otherCosts)||0)>=10?C.gold:C.red}}>
                {form.bidAmount ? calcMargin(form.bidAmount,form.costOfGoods,form.otherCosts)+"%" : "—"}
              </div>
            </Field>
            <Field label="Status"><Select value={form.status} onChange={e=>f("status",e.target.value)}>{["Pending","Submitted","Won","Lost"].map(s=><option key={s}>{s}</option>)}</Select></Field>
          </div>
          <Field label="Payment Status"><Select value={form.paymentStatus} onChange={e=>f("paymentStatus",e.target.value)}>{["Not received","Partial","Received","Overdue"].map(s=><option key={s}>{s}</option>)}</Select></Field>
          <Field label="Notes"><TA value={form.notes} onChange={e=>f("notes",e.target.value)} rows={2}/></Field>
          <div style={{padding:"10px 14px",background:"rgba(0,212,170,0.05)",border:"1px solid "+C.b,borderRadius:4,marginBottom:12,fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>
            <span style={{color:C.t2}}>Profit = Bid Amount − Cost of Goods − Other Costs &nbsp;|&nbsp; Margin = Profit ÷ Bid Amount × 100</span>
          </div>
          <div style={{display:"flex",gap:10,marginTop:8}}>
            <Btn onClick={submit}>{editId?"SAVE CHANGES":"ADD BID"}</Btn>
            <Btn variant="sec" onClick={()=>setShowForm(false)}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ═══════════════════════════════════════════════════
// CHART PRIMITIVES (pure SVG, no libraries)
// ═══════════════════════════════════════════════════

function DonutChart({ segments, size=140, label, sub }) {
  const r = 52, cx = size/2, cy = size/2;
  const circ = 2*Math.PI*r;
  const total = segments.reduce((s,g)=>s+g.value,0)||1;
  let offset = 0;
  const arcs = segments.map(seg=>{
    const pct = seg.value/total;
    const dash = pct*circ;
    const gap  = circ - dash;
    const arc  = {color:seg.color, dash, gap, offset, label:seg.label, value:seg.value, pct:Math.round(pct*100)};
    offset += dash;
    return arc;
  });
  return (
    <div style={{position:"relative",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.s3} strokeWidth={14}/>
        {arcs.map((arc,i)=>(
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={arc.color} strokeWidth={14}
            strokeDasharray={`${arc.dash} ${arc.gap}`}
            strokeDashoffset={-arc.offset}
            strokeLinecap="butt"
            style={{transition:"stroke-dasharray 0.8s ease"}}/>
        ))}
      </svg>
      <div style={{position:"absolute",textAlign:"center"}}>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:22,fontWeight:900,color:C.tb,lineHeight:1}}>{label}</div>
        {sub&&<div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.t2,marginTop:2,letterSpacing:1}}>{sub}</div>}
      </div>
    </div>
  );
}

function BarChart({ bars, height=100, showValues=true }) {
  const max = Math.max(...bars.map(b=>b.value),1);
  return (
    <div style={{display:"flex",alignItems:"flex-end",gap:6,height:height+30,paddingTop:8}}>
      {bars.map((bar,i)=>(
        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
          {showValues&&<div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:bar.color||C.t2}}>{bar.value||""}</div>}
          <div style={{width:"100%",background:C.s3,borderRadius:"3px 3px 0 0",position:"relative",height:height,display:"flex",alignItems:"flex-end"}}>
            <div style={{
              width:"100%",
              height: bar.value>0 ? Math.max((bar.value/max)*height,4) : 0,
              background:`linear-gradient(180deg,${bar.color||C.accent},${bar.color||C.accent}88)`,
              borderRadius:"3px 3px 0 0",
              transition:"height 1s cubic-bezier(0.34,1.56,0.64,1)",
              boxShadow:`0 0 8px ${bar.color||C.accent}44`
            }}/>
          </div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:C.t2,letterSpacing:0.5,textAlign:"center",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",width:"100%"}}>{bar.label}</div>
        </div>
      ))}
    </div>
  );
}

function SparkLine({ points, color=C.accent, height=50, width=180 }) {
  if(!points||points.length<2) return <div style={{height,width,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:C.t2,fontSize:10,fontFamily:"'JetBrains Mono',monospace"}}>NO DATA YET</span></div>;
  const max=Math.max(...points,1),min=Math.min(...points,0);
  const range=max-min||1;
  const pad=6;
  const W=width-pad*2, H=height-pad*2;
  const pts=points.map((v,i)=>({
    x:pad+i*(W/(points.length-1)),
    y:pad+H-(((v-min)/range)*H)
  }));
  const path="M"+pts.map(p=>`${p.x},${p.y}`).join("L");
  const area=path+`L${pts[pts.length-1].x},${pad+H}L${pts[0].x},${pad+H}Z`;
  return (
    <svg width={width} height={height} style={{overflow:"visible"}}>
      <defs>
        <linearGradient id={"sg"+color.replace("#","")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg${color.replace("#","")})`}/>
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={i===pts.length-1?3.5:2} fill={color} opacity={i===pts.length-1?1:0.5}/>)}
    </svg>
  );
}

function RadarChart({ axes, size=160 }) {
  const N=axes.length, r=60, cx=size/2, cy=size/2;
  const angle=(i)=>((i/N)*2*Math.PI)-Math.PI/2;
  const pt=(i,val)=>({
    x:cx+r*(val/100)*Math.cos(angle(i)),
    y:cy+r*(val/100)*Math.sin(angle(i))
  });
  const gridPts=(frac)=>Array.from({length:N},(_,i)=>({
    x:cx+r*frac*Math.cos(angle(i)),
    y:cy+r*frac*Math.sin(angle(i))
  }));
  const polyStr=(pts)=>pts.map(p=>`${p.x},${p.y}`).join(" ");
  const dataStr=axes.map((_,i)=>pt(i,axes[i].value)).map(p=>`${p.x},${p.y}`).join(" ");
  return (
    <svg width={size} height={size}>
      {[0.25,0.5,0.75,1].map(f=>(
        <polygon key={f} points={polyStr(gridPts(f))} fill="none" stroke={C.b} strokeWidth={0.5} opacity={0.6}/>
      ))}
      {Array.from({length:N},(_,i)=>(
        <line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(angle(i))} y2={cy+r*Math.sin(angle(i))} stroke={C.b2} strokeWidth={0.5}/>
      ))}
      <polygon points={dataStr} fill={C.accent+"22"} stroke={C.accent} strokeWidth={1.5} strokeLinejoin="round"/>
      {axes.map((_,i)=>{
        const p=pt(i,axes[i].value);
        return <circle key={i} cx={p.x} cy={p.y} r={3} fill={C.accent}/>;
      })}
      {axes.map((ax,i)=>{
        const labelR=r+16;
        const lx=cx+labelR*Math.cos(angle(i));
        const ly=cy+labelR*Math.sin(angle(i));
        return <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
          fontSize={7} fill={C.t2} fontFamily="'JetBrains Mono',monospace">{ax.label}</text>;
      })}
    </svg>
  );
}

// COMMAND CENTRE (DASHBOARD HOME)
// ═══════════════════════════════════════════════════
function CommandCentre({ tenders, suppliers, contacts, bids }) {
  const won      = tenders.filter(t=>t.status==="Won").length;
  const lost     = tenders.filter(t=>t.status==="Lost").length;
  const pending  = tenders.filter(t=>t.status==="Pending").length;
  const submitted= tenders.filter(t=>t.status==="Submitted").length;
  const cancelled= tenders.filter(t=>t.status==="Cancelled").length;
  const winRate  = won+lost>0?Math.round(won/(won+lost)*100):0;
  const active   = tenders.filter(t=>t.status==="Pending"||t.status==="Submitted");
  const upcoming = [...active].sort((a,b)=>(a.deadline||"z").localeCompare(b.deadline||"z")).slice(0,5);
  const wonVal   = tenders.filter(t=>t.status==="Won").reduce((s,t)=>s+(parseFloat(t.value)||0),0);
  const pipeVal  = active.reduce((s,t)=>s+(parseFloat(t.value)||0),0);
  const avgBidVal= tenders.length>0?tenders.reduce((s,t)=>s+(parseFloat(t.value)||0),0)/tenders.length:0;

  // Win probability distribution
  const wpBuckets = [
    {label:"<30%", value:tenders.filter(t=>t.winProbability&&t.winProbability<30).length, color:C.red},
    {label:"30-50%", value:tenders.filter(t=>t.winProbability&&t.winProbability>=30&&t.winProbability<50).length, color:C.gold},
    {label:"50-70%", value:tenders.filter(t=>t.winProbability&&t.winProbability>=50&&t.winProbability<70).length, color:C.blue},
    {label:">70%", value:tenders.filter(t=>t.winProbability&&t.winProbability>=70).length, color:C.accent},
  ];

  // Category breakdown for bar chart
  const cats = {};
  tenders.forEach(t=>{if(t.category){cats[t.category]=(cats[t.category]||0)+1;}});
  const catBars = Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>({label:k.slice(0,8),value:v,color:C.blue}));

  // Monthly pipeline sparkline (last 6 months by dateReceived)
  const now=new Date();
  const monthlyPipeline = Array.from({length:6},(_,i)=>{
    const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);
    const key=d.toISOString().slice(0,7);
    return tenders.filter(t=>(t.dateReceived||"").startsWith(key)).length;
  });

  // Financial sparkline
  const monthlyRevenue = Array.from({length:6},(_,i)=>{
    const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);
    const key=d.toISOString().slice(0,7);
    return tenders.filter(t=>t.status==="Won"&&(t.dateReceived||"").startsWith(key))
      .reduce((s,t)=>s+(parseFloat(t.value)||0),0)/1e6;
  });

  // Supplier country breakdown
  const countries={};
  suppliers.forEach(s=>{if(s.country){countries[s.country]=(countries[s.country]||0)+1;}});
  const topCountries=Object.entries(countries).sort((a,b)=>b[1]-a[1]).slice(0,5);

  // Performance radar
  const radarAxes = [
    {label:"WIN%",   value:winRate},
    {label:"SUPPLY", value:Math.min(suppliers.length*5,100)},
    {label:"NETWORK",value:Math.min(contacts.length*8,100)},
    {label:"PIPELINE",value:Math.min(active.length*15,100)},
    {label:"INTEL",  value:Math.min(tenders.filter(t=>t.aiAnalysis).length*10,100)},
  ];

  const hour=new Date().getHours();
  const greeting=hour<12?"Morning":hour<18?"Afternoon":"Evening";

  return (
    <div>
      {/* HEADER */}
      <div style={{marginBottom:24,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.t2,letterSpacing:3,marginBottom:6}}>
            {new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).toUpperCase()}
          </div>
          <h2 style={{fontSize:28,fontWeight:900,color:C.tb,fontFamily:"Inter,sans-serif"}}>
            Good {greeting}, Ashmand
          </h2>
          <p style={{fontSize:13,color:C.t2,fontFamily:"Inter,sans-serif",marginTop:4}}>
            {tenders.length===0
              ? "No tenders yet — start by running an AI analysis."
              : `${active.length} active tenders · ${tenders.filter(t=>t.aiAnalysis).length} AI-analysed · Pipeline EGP ${pipeVal>0?Math.round(pipeVal/1e6)+"M":"—"}`}
          </p>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:32,fontWeight:900,color:winRate>=50?C.accent:C.gold}}>{winRate}%</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.t2,letterSpacing:2}}>WIN RATE</div>
        </div>
      </div>

      {/* TOP KPI ROW */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:20}}>
        <StatCard label="Win Rate" value={winRate+"%"} color={winRate>=50?C.accent:C.gold} icon="🏆" sub={won+" won · "+lost+" lost"}/>
        <StatCard label="Active" value={active.length} color={C.blue} icon="⚡" sub="Pending + Submitted"/>
        <StatCard label="Won Revenue" value={wonVal>0?"EGP "+Math.round(wonVal/1e6)+"M":"—"} color={C.gold} icon="💰" sub={won+" tenders won"}/>
        <StatCard label="Suppliers" value={suppliers.length} color={C.accent} icon="🏭" sub={Object.keys(countries).length+" countries"}/>
        <StatCard label="Contacts" value={contacts.length} color={C.purple} icon="👥" sub="MOD network"/>
      </div>

      {/* MAIN CHARTS ROW */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:16}}>

        {/* DONUT — Pipeline Status */}
        <Card accent={C.accent}>
          <SLabel>Pipeline Breakdown</SLabel>
          <div style={{display:"flex",alignItems:"center",gap:16,justifyContent:"center",padding:"8px 0"}}>
            <DonutChart
              size={140}
              label={tenders.length}
              sub="TENDERS"
              segments={[
                {label:"Won",      value:won,       color:C.accent},
                {label:"Submitted",value:submitted,  color:C.blue},
                {label:"Pending",  value:pending,    color:C.gold},
                {label:"Lost",     value:lost,       color:C.red},
                {label:"Cancelled",value:cancelled,  color:C.t2},
              ].filter(s=>s.value>0)}
            />
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {[
                {label:"Won",       value:won,        color:C.accent},
                {label:"Submitted", value:submitted,  color:C.blue},
                {label:"Pending",   value:pending,    color:C.gold},
                {label:"Lost",      value:lost,       color:C.red},
                {label:"Cancelled", value:cancelled,  color:C.t2},
              ].map(s=>(
                <div key={s.label} style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:s.color,flexShrink:0}}/>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.t2,width:58}}>{s.label}</span>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:s.color,fontWeight:700}}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* WIN PROBABILITY BARS */}
        <Card accent={C.gold}>
          <SLabel color={C.gold}>Win Probability Distribution</SLabel>
          {tenders.some(t=>t.winProbability)
            ? <BarChart bars={wpBuckets} height={90}/>
            : <div style={{color:C.t2,fontSize:11,fontFamily:"Inter,sans-serif",padding:"20px 0",textAlign:"center"}}>Run AI analyses to see win probability data</div>
          }
        </Card>

        {/* RADAR — Performance */}
        <Card accent={C.purple}>
          <SLabel color={C.purple}>Performance Radar</SLabel>
          <div style={{display:"flex",justifyContent:"center",padding:"4px 0"}}>
            <RadarChart axes={radarAxes} size={160}/>
          </div>
        </Card>
      </div>

      {/* SPARKLINES ROW */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <Card accent={C.blue}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div>
              <SLabel color={C.blue}>Tender Activity (6 Months)</SLabel>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:20,fontWeight:900,color:C.tb,marginTop:2}}>{tenders.length}</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.t2}}>TOTAL TENDERS</div>
            </div>
            <SparkLine points={monthlyPipeline} color={C.blue} height={55} width={160}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:4}}>
            {Array.from({length:6},(_,i)=>{
              const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);
              return <div key={i} style={{textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:C.t2}}>
                {d.toLocaleString("en",{month:"short"})}
              </div>;
            })}
          </div>
        </Card>

        <Card accent={C.gold}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div>
              <SLabel color={C.gold}>Revenue Track (6 Months)</SLabel>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:20,fontWeight:900,color:C.tb,marginTop:2}}>
                {wonVal>0?"EGP "+Math.round(wonVal/1e6)+"M":"—"}
              </div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.t2}}>TOTAL WON REVENUE</div>
            </div>
            <SparkLine points={monthlyRevenue} color={C.gold} height={55} width={160}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:4}}>
            {Array.from({length:6},(_,i)=>{
              const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);
              return <div key={i} style={{textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:C.t2}}>
                {d.toLocaleString("en",{month:"short"})}
              </div>;
            })}
          </div>
        </Card>
      </div>

      {/* BOTTOM ROW */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>

        {/* Upcoming Deadlines */}
        <Card accent={C.accent}>
          <SLabel>Upcoming Deadlines</SLabel>
          {upcoming.length===0
            ?<div style={{color:C.t2,fontSize:13,fontFamily:"Inter,sans-serif",padding:"8px 0"}}>No active tenders</div>
            :upcoming.map((t,i)=>(
              <div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 0",
                borderBottom:i<upcoming.length-1?"1px solid "+C.b:"none"}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:12,color:C.tb,fontFamily:"Inter,sans-serif"}}>{t.title?.slice(0,36)}{t.title?.length>36?"…":""}</div>
                  <div style={{fontSize:10,color:C.t2,fontFamily:"'JetBrains Mono',monospace"}}>{t.authority?.slice(0,25)}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <Badge label={t.deadline||"No date"} color={C.gold}/>
                </div>
              </div>
            ))
          }
        </Card>

        {/* Category Breakdown */}
        <Card accent={C.blue}>
          <SLabel color={C.blue}>Tenders by Category</SLabel>
          {catBars.length>0
            ? <BarChart bars={catBars} height={80} showValues={true}/>
            : <div style={{color:C.t2,fontSize:11,fontFamily:"Inter,sans-serif",padding:"20px 0",textAlign:"center"}}>No category data yet</div>
          }
        </Card>

        {/* Top Supplier Countries */}
        <Card accent={C.purple}>
          <SLabel color={C.purple}>Top Supplier Countries</SLabel>
          {topCountries.length===0
            ?<div style={{color:C.t2,fontSize:11,fontFamily:"Inter,sans-serif",padding:"8px 0"}}>No suppliers yet</div>
            :topCountries.map(([country,count],i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.t2,width:16}}>{i+1}</div>
                <div style={{flex:1,fontFamily:"Inter,sans-serif",fontSize:12,color:C.tb}}>{country}</div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{height:6,borderRadius:3,background:C.purple,width:Math.max((count/topCountries[0][1])*60,8),transition:"width 0.8s ease"}}/>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.purple}}>{count}</span>
                </div>
              </div>
            ))
          }
          {suppliers.length>0&&(
            <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid "+C.b,
              fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.t2}}>
              {Object.keys(countries).length} COUNTRIES · {suppliers.length} SUPPLIERS TOTAL
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════
// INTEL CHAT — floating AI assistant with full data access
// ═══════════════════════════════════════════════════
function IntelChat({ suppliers, tenders, contacts, bids }) {
  const [open,setOpen]     = useState(false);
  const [msgs,setMsgs]     = useState([{role:"assistant",text:"👋 **Ashmand Intelligence Assistant**\n\nAsk me anything:\n- Find suppliers for a product\n- Search by country or category\n- Check your tender status\n- Get sourcing advice\n- Analyse competitors\n- Compare your supplier options\n\nWhat do you need?"}]);
  const [input,setInput]   = useState("");
  const [loading,setLoading] = useState(false);
  const [history,setHistory] = useState([]);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(()=>{ if(open) setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),80); },[msgs,open]);
  useEffect(()=>{ if(open) setTimeout(()=>inputRef.current?.focus(),150); },[open]);

  const buildContext = () => {
    const sd = suppliers.length>0
      ? suppliers.map(s=>[s.name,s.country,s.category,(s.keyProducts||[]).join("/"),s.exportRisk,s.pricePosition,s.email,s.egyptRelationship,s.certifications?.join("/"),s.notes].filter(Boolean).join(" | ")).join("\n")
      : "Empty — no suppliers yet.";
    const td = tenders.length>0
      ? tenders.slice(0,30).map(t=>[t.refNum,t.title,t.authority,t.status,t.deadline,t.value?"EGP "+t.value:null,t.winProbability?t.winProbability+"%":null].filter(Boolean).join(" | ")).join("\n")
      : "No tenders.";
    const cd = contacts.length>0
      ? contacts.slice(0,20).map(c=>[c.name,c.title,c.org,c.type,c.relationship].filter(Boolean).join(" | ")).join("\n")
      : "No contacts.";
    const bd = bids.length>0
      ? bids.slice(0,15).map(b=>[b.tenderRef,b.tenderTitle,"EGP"+(b.bidAmount||"?"),b.margin?b.margin+"%margin":null,b.status,b.paymentStatus].filter(Boolean).join(" | ")).join("\n")
      : "No financial data.";
    return `You are the Ashmand Defence Intelligence Assistant — embedded inside Ashmand's private Egyptian defence procurement platform. You have FULL access to their live database.

SUPPLIER DIRECTORY (${suppliers.length} suppliers):
${sd}

TENDERS (${tenders.length}):
${td}

CONTACTS (${contacts.length}):
${cd}

FINANCIALS (${bids.length} bids):
${bd}

INSTRUCTIONS:
- When user asks for suppliers for a product/category: FIRST search the directory above for matches (by product, category, country keyword), list ALL matches with their details, THEN suggest 2-3 additional global suppliers they could add
- Match suppliers intelligently — "body armour" matches PPE category, "helmets", "plates" etc
- Be specific — show name, country, products, email when available
- If directory is empty or has no match, say so clearly then suggest global options
- Format nicely with bold names and clear structure
- Keep answers focused and actionable
- You know the Egyptian MOD market — give Egypt-specific advice when relevant
- Respond in the same language the user uses (Arabic or English)`;
  };

  const send = async () => {
    const text = input.trim();
    if(!text||loading) return;
    setInput("");
    setMsgs(p=>[...p,{role:"user",text}]);
    setLoading(true);
    const apiMsgs = [...history,{role:"user",content:text}].slice(-16);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST", headers:{"Content-Type":"application/json","x-api-key":process.env.REACT_APP_ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1200,system:buildContext(),messages:apiMsgs})
      });
      const data = await res.json();
      if(data.error) throw new Error(data.error.message);
      const reply = (data.content||[]).map(b=>b.text||"").join("");
      setMsgs(p=>[...p,{role:"assistant",text:reply}]);
      setHistory(p=>[...p,{role:"user",content:text},{role:"assistant",content:reply}].slice(-16));
    } catch(e) {
      setMsgs(p=>[...p,{role:"assistant",text:"Error: "+e.message,err:true}]);
    }
    setLoading(false);
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),80);
  };

  const renderMsg = (text) => text.split("\n").map((line,i)=>{
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <div key={i} style={{marginBottom:line.trim()?1:5,lineHeight:1.72,fontSize:13,fontFamily:"Inter,sans-serif",color:C.t,paddingLeft:line.trim().startsWith("-")||line.trim().startsWith("•")?10:0}}>
        {parts.map((p,j)=>p.startsWith("**")&&p.endsWith("**")
          ? <strong key={j} style={{color:C.tb,fontWeight:700}}>{p.slice(2,-2)}</strong>
          : <span key={j}>{p||"\u00a0"}</span>
        )}
      </div>
    );
  });

  const QUICK = ["Find suppliers for body armour","Show Turkish suppliers","What tenders are pending?","Find night vision suppliers","Which suppliers have low export risk?","Show my won tenders"];

  return (
    <>
      {/* BUBBLE */}
      <div onClick={()=>setOpen(p=>!p)} title="Intel Assistant"
        style={{position:"fixed",bottom:24,right:24,zIndex:9999,width:54,height:54,
          borderRadius:"50%",cursor:"pointer",userSelect:"none",
          background:"linear-gradient(135deg,"+C.accent+",#009470)",
          boxShadow:"0 6px 28px rgba(0,212,170,0.5)",
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:22,transition:"transform 0.25s, box-shadow 0.25s",
          transform:open?"rotate(180deg)":"rotate(0deg)"}}>
        {open?"✕":"💬"}
      </div>

      {/* UNREAD DOT */}
      {!open&&<div style={{position:"fixed",bottom:68,right:22,zIndex:10000,
        width:10,height:10,borderRadius:"50%",background:C.red,
        border:"2px solid "+C.bg,animation:"pulse 2s infinite"}}/>}

      {/* PANEL */}
      {open&&(
        <div style={{position:"fixed",bottom:90,right:24,zIndex:9998,
          width:Math.min(440,window.innerWidth-32),height:580,
          display:"flex",flexDirection:"column",
          background:C.s1,border:"1px solid "+C.b2,borderRadius:14,
          boxShadow:"0 20px 80px rgba(0,0,0,0.75)",
          animation:"fadeUp 0.2s ease both"}}>

          {/* HEADER */}
          <div style={{padding:"12px 16px",borderBottom:"1px solid "+C.b,flexShrink:0,
            background:"linear-gradient(90deg,"+C.s2+","+C.s1+")",borderRadius:"14px 14px 0 0",
            display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,borderRadius:"50%",flexShrink:0,
              background:"linear-gradient(135deg,"+C.accent+"30,"+C.purple+"30)",
              border:"1px solid "+C.accent+"50",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🤖</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:14,color:C.tb,fontFamily:"Inter,sans-serif",lineHeight:1}}>Intel Assistant</div>
              <div style={{display:"flex",alignItems:"center",gap:5,marginTop:3}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:C.accent,animation:"pulse 2s infinite"}}/>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.accent,letterSpacing:2}}>
                  LIVE · {suppliers.length} SUPPLIERS · {tenders.length} TENDERS
                </span>
              </div>
            </div>
            <button onClick={()=>setMsgs([{role:"assistant",text:"Chat cleared. What do you need?"}])}
              style={{background:"transparent",border:"1px solid "+C.b,color:C.t2,
                borderRadius:3,padding:"3px 8px",cursor:"pointer",
                fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:1}}>CLEAR</button>
          </div>

          {/* MESSAGES */}
          <div style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>
            {msgs.map((m,i)=>(
              <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",
                flexDirection:m.role==="user"?"row-reverse":"row"}}>
                {m.role==="assistant"&&(
                  <div style={{width:24,height:24,borderRadius:"50%",flexShrink:0,marginTop:2,
                    background:C.s3,border:"1px solid "+C.b,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>🤖</div>
                )}
                <div style={{maxWidth:"85%",padding:"9px 12px",borderRadius:10,
                  background:m.role==="user"?"rgba(0,212,170,0.10)":m.err?"rgba(230,57,70,0.08)":C.s2,
                  border:"1px solid "+(m.role==="user"?C.accent+"35":m.err?C.red+"35":C.b),
                  borderBottomRightRadius:m.role==="user"?3:10,
                  borderBottomLeftRadius:m.role==="user"?10:3}}>
                  {m.role==="user"
                    ? <div style={{fontSize:13,color:C.tb,fontFamily:"Inter,sans-serif",lineHeight:1.65}}>{m.text}</div>
                    : renderMsg(m.text)
                  }
                </div>
              </div>
            ))}
            {loading&&(
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <div style={{width:24,height:24,borderRadius:"50%",background:C.s3,
                  border:"1px solid "+C.b,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>🤖</div>
                <div style={{padding:"10px 14px",background:C.s2,border:"1px solid "+C.b,borderRadius:10,display:"flex",gap:5,alignItems:"center"}}>
                  {[0,1,2].map(i=>(
                    <div key={i} style={{width:7,height:7,borderRadius:"50%",background:C.accent,
                      animation:"pulse 1.1s ease-in-out infinite",animationDelay:i*0.18+"s"}}/>
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* QUICK PROMPTS */}
          {msgs.length<=2&&(
            <div style={{padding:"6px 12px",display:"flex",flexWrap:"wrap",gap:5,flexShrink:0,borderTop:"1px solid "+C.b}}>
              {QUICK.map((q,i)=>(
                <div key={i} onClick={()=>{setInput(q);setTimeout(()=>inputRef.current?.focus(),30);}}
                  style={{padding:"4px 10px",background:C.s2,border:"1px solid "+C.b,
                    borderRadius:20,fontSize:11,color:C.t2,cursor:"pointer",fontFamily:"Inter,sans-serif",
                    transition:"border-color 0.15s, color 0.15s", whiteSpace:"nowrap"}}>
                  {q}
                </div>
              ))}
            </div>
          )}

          {/* INPUT */}
          <div style={{padding:"10px 12px",borderTop:"1px solid "+C.b,flexShrink:0,
            display:"flex",gap:8,alignItems:"center",
            background:C.s2,borderRadius:"0 0 14px 14px"}}>
            <input ref={inputRef} value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();} }}
              placeholder="Ask about suppliers, tenders, contacts…"
              style={{flex:1,background:"transparent",border:"none",color:C.tb,
                fontFamily:"Inter,sans-serif",fontSize:13,padding:"5px 2px",outline:"none"}}/>
            <button onClick={send} disabled={!input.trim()||loading}
              style={{width:32,height:32,borderRadius:"50%",border:"none",
                cursor:input.trim()&&!loading?"pointer":"default",
                background:input.trim()&&!loading
                  ? "linear-gradient(135deg,"+C.accent+",#009977)"
                  : C.b,
                color:input.trim()&&!loading?C.bg:C.t2,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:13,flexShrink:0,transition:"all 0.2s",
                opacity:input.trim()&&!loading?1:0.35}}>➤</button>
          </div>
        </div>
      )}
    </>
  );
}

const Min = (a,b) => a<b?a:b;

// ═══════════════════════════════════════════════════
// ROOT APP — with full intelligent auto-sync engine
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════
// AUTH SYSTEM
// ═══════════════════════════════════════════════════

// Password hashing (simple but effective for client-side)
const hashPassword = async (password) => {
  const msgBuffer = new TextEncoder().encode(password + "ashmand_salt_2025");
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
};

// Default admin account (hashed at runtime on first load)
const DEFAULT_ADMIN = {
  id: "admin-001",
  email: "admin@ashmand.com",
  name: "Admin",
  role: "admin",
  passwordHash: null, // set on first init
  defaultPassword: "Ashmand2025!"
};

const AUTH_KEY   = "ashmand:auth_users";
const SESSION_KEY = "ashmand:session";

function LoginScreen({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);

  const handleLogin = async (e) => {
    e && e.preventDefault();
    if(!email || !password) { setError("Enter your email and password."); return; }
    setLoading(true); setError("");
    try {
      const users = JSON.parse(localStorage.getItem(AUTH_KEY)||"[]");
      const hash  = await hashPassword(password);
      const user  = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === hash && u.active !== false);
      if(!user) { setError("Invalid email or password."); setLoading(false); return; }
      const session = { userId: user.id, email: user.email, name: user.name, role: user.role, loginTime: Date.now() };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      onLogin(session);
    } catch(e) { setError("Login failed: " + e.message); }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Inter,sans-serif"}}>
      <style>{css}</style>
      <div style={{width:"100%",maxWidth:420,padding:"0 20px"}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{width:60,height:60,background:"conic-gradient("+C.accent+","+C.gold+","+C.purple+","+C.accent+")",
            clipPath:"polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",
            display:"grid",placeItems:"center",fontSize:24,color:C.bg,fontWeight:900,
            margin:"0 auto 16px",animation:"glow 3s ease-in-out infinite"}}>A</div>
          <div style={{fontFamily:"JetBrains Mono,monospace",fontWeight:700,fontSize:18,letterSpacing:4,color:C.tb}}>ASHMAND</div>
          <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:9,color:C.t2,letterSpacing:3,marginTop:4}}>DEFENCE INTELLIGENCE PLATFORM</div>
        </div>

        {/* Login card */}
        <div style={{background:C.s1,border:"1px solid "+C.b2,borderRadius:12,padding:"32px",
          boxShadow:"0 24px 80px rgba(0,0,0,0.6)",animation:"fadeUp 0.4s ease"}}>
          <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:C.accent,letterSpacing:3,marginBottom:20}}>SECURE LOGIN</div>

          <form onSubmit={handleLogin}>
            <Field label="Email Address">
              <Input type="email" value={email} onChange={e=>{setEmail(e.target.value);setError("");}}
                placeholder="your@email.com" autoComplete="email"/>
            </Field>
            <Field label="Password" style={{marginTop:14}}>
              <div style={{position:"relative"}}>
                <Input type={showPw?"text":"password"} value={password}
                  onChange={e=>{setPassword(e.target.value);setError("");}}
                  placeholder="••••••••••" autoComplete="current-password"
                  style={{paddingRight:40}}/>
                <span onClick={()=>setShowPw(p=>!p)}
                  style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",
                    cursor:"pointer",color:C.t2,fontSize:14,userSelect:"none"}}>
                  {showPw?"🙈":"👁"}
                </span>
              </div>
            </Field>

            {error&&(
              <div style={{marginTop:12,padding:"10px 14px",background:"rgba(230,57,70,0.1)",
                border:"1px solid "+C.red,borderRadius:5,color:C.red,
                fontFamily:"JetBrains Mono,monospace",fontSize:11}}>
                ⚠ {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{width:"100%",marginTop:20,padding:"13px",borderRadius:6,border:"none",
                background:"linear-gradient(135deg,"+C.accent+",#00a888)",
                color:C.bg,fontFamily:"JetBrains Mono,monospace",fontSize:12,fontWeight:700,
                letterSpacing:2,cursor:loading?"not-allowed":"pointer",
                opacity:loading?0.7:1,transition:"opacity 0.2s"}}>
              {loading?"VERIFYING...":"LOGIN →"}
            </button>
          </form>

          <div style={{marginTop:20,padding:"12px",background:C.s2,borderRadius:5,
            fontFamily:"JetBrains Mono,monospace",fontSize:9,color:C.t2,textAlign:"center",lineHeight:1.7}}>
            🔒 RESTRICTED ACCESS · AUTHORISED PERSONNEL ONLY
          </div>
        </div>
      </div>
    </div>
  );
}

function UserManagement({ session, onClose }) {
  const [users, setUsers]       = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [msg, setMsg]           = useState("");
  const [form, setForm]         = useState({name:"",email:"",password:"",role:"viewer"});
  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  useEffect(() => {
    const raw = localStorage.getItem(AUTH_KEY);
    setUsers(raw ? JSON.parse(raw) : []);
  }, []);

  const persist = (updated) => {
    setUsers(updated);
    localStorage.setItem(AUTH_KEY, JSON.stringify(updated));
  };

  const openNew  = () => { setForm({name:"",email:"",password:"",role:"viewer"}); setEditId(null); setShowForm(true); };
  const openEdit = (u) => { setForm({name:u.name,email:u.email,password:"",role:u.role}); setEditId(u.id); setShowForm(true); };

  const save = async () => {
    if(!form.name||!form.email) { setMsg("Name and email required."); return; }
    if(!editId && !form.password) { setMsg("Password required for new users."); return; }
    if(form.password && form.password.length < 8) { setMsg("Password must be at least 8 characters."); return; }
    const emailExists = users.some(u=>u.email.toLowerCase()===form.email.toLowerCase()&&u.id!==editId);
    if(emailExists) { setMsg("Email already in use."); return; }

    if(editId) {
      const updated = await Promise.all(users.map(async u => {
        if(u.id !== editId) return u;
        const newHash = form.password ? await hashPassword(form.password) : u.passwordHash;
        return {...u, name:form.name, email:form.email, role:form.role, passwordHash:newHash};
      }));
      persist(updated);
    } else {
      const hash = await hashPassword(form.password);
      const newUser = {id:"user-"+Date.now(), name:form.name, email:form.email, role:form.role, passwordHash:hash, active:true, createdAt:new Date().toISOString().slice(0,10)};
      persist([...users, newUser]);
    }
    setShowForm(false);
    setMsg("✓ User "+(editId?"updated":"created")+" successfully");
    setTimeout(()=>setMsg(""),4000);
  };

  const toggleActive = (id) => {
    if(id === session.userId) { setMsg("Cannot deactivate your own account."); setTimeout(()=>setMsg(""),3000); return; }
    persist(users.map(u=>u.id===id?{...u,active:!u.active}:u));
  };

  const deleteUser = (id) => {
    if(id === session.userId) { setMsg("Cannot delete your own account."); setTimeout(()=>setMsg(""),3000); return; }
    if(window.confirm("Delete this user? They will lose access immediately.")) persist(users.filter(u=>u.id!==id));
  };

  const roleColor = r => r==="admin"?C.red:r==="editor"?C.gold:C.t2;

  return (
    <Modal title="User Management" onClose={onClose}>
      <div style={{marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:C.t2}}>{users.length} user{users.length!==1?"s":""} total</div>
        <Btn onClick={openNew} style={{fontSize:10}}>+ Add User</Btn>
      </div>

      {msg&&<div style={{padding:"10px 14px",background:"rgba(0,212,170,0.08)",border:"1px solid "+C.accent,borderRadius:5,marginBottom:12,fontFamily:"JetBrains Mono,monospace",fontSize:11,color:C.accent}}>{msg}</div>}

      {users.map(u=>(
        <div key={u.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",
          background:C.s2,border:"1px solid "+C.b,borderRadius:6,marginBottom:8,
          opacity:u.active===false?0.5:1}}>
          <div style={{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,"+C.s3+","+C.b2+")",
            display:"grid",placeItems:"center",fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:C.tb,flexShrink:0}}>
            {u.name.charAt(0).toUpperCase()}
          </div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:13,fontWeight:700,color:C.tb,display:"flex",gap:8,alignItems:"center"}}>
              {u.name}
              {u.id===session.userId&&<Badge label="YOU" color={C.accent}/>}
              {u.active===false&&<Badge label="INACTIVE" color={C.red}/>}
            </div>
            <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:C.t2}}>{u.email} · Created {u.createdAt||"—"}</div>
          </div>
          <Badge label={u.role?.toUpperCase()||"VIEWER"} color={roleColor(u.role)}/>
          <div style={{display:"flex",gap:6}}>
            <Btn variant="sec" onClick={()=>openEdit(u)} style={{fontSize:9,padding:"4px 10px"}}>Edit</Btn>
            <button onClick={()=>toggleActive(u.id)}
              style={{padding:"4px 10px",borderRadius:3,border:"1px solid "+C.b,
                background:u.active===false?"rgba(0,212,170,0.1)":"rgba(230,57,70,0.1)",
                color:u.active===false?C.accent:C.red,cursor:"pointer",
                fontFamily:"JetBrains Mono,monospace",fontSize:9}}>
              {u.active===false?"Enable":"Disable"}
            </button>
            {u.id!==session.userId&&(
              <button onClick={()=>deleteUser(u.id)}
                style={{padding:"4px 10px",borderRadius:3,border:"1px solid "+C.red,
                  background:"rgba(230,57,70,0.08)",color:C.red,cursor:"pointer",
                  fontFamily:"JetBrains Mono,monospace",fontSize:9}}>🗑</button>
            )}
          </div>
        </div>
      ))}

      {users.length===0&&<div style={{textAlign:"center",padding:"24px",color:C.t2,fontFamily:"Inter,sans-serif",fontSize:13}}>No users yet. Add one above.</div>}

      {showForm&&(
        <div style={{marginTop:16,padding:"16px",background:C.s1,border:"1px solid "+C.b2,borderRadius:8}}>
          <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:C.accent,letterSpacing:2,marginBottom:12}}>{editId?"EDIT USER":"NEW USER"}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Field label="Full Name *"><Input value={form.name} onChange={e=>f("name",e.target.value)} placeholder="John Smith"/></Field>
            <Field label="Email *"><Input type="email" value={form.email} onChange={e=>f("email",e.target.value)} placeholder="john@ashmand.com"/></Field>
            <Field label={editId?"New Password (leave blank to keep)":"Password *"}>
              <Input type="password" value={form.password} onChange={e=>f("password",e.target.value)} placeholder="Min 8 characters"/>
            </Field>
            <Field label="Role">
              <Select value={form.role} onChange={e=>f("role",e.target.value)}>
                <option value="viewer">Viewer — read only</option>
                <option value="editor">Editor — can add/edit</option>
                <option value="admin">Admin — full access + users</option>
              </Select>
            </Field>
          </div>
          {msg&&<div style={{marginTop:8,color:C.red,fontFamily:"JetBrains Mono,monospace",fontSize:11}}>{msg}</div>}
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <Btn onClick={save} style={{fontSize:11}}>{editId?"SAVE CHANGES":"CREATE USER"}</Btn>
            <Btn variant="sec" onClick={()=>{setShowForm(false);setMsg("");}} style={{fontSize:11}}>Cancel</Btn>
          </div>
        </div>
      )}

      <div style={{marginTop:16,padding:"10px 14px",background:C.s2,borderRadius:5,fontFamily:"JetBrains Mono,monospace",fontSize:9,color:C.t2,lineHeight:1.7}}>
        ROLES: Admin = full access including user management · Editor = add/edit all data · Viewer = read only
      </div>
    </Modal>
  );
}

// Initialise default admin on first load
const initAuth = async () => {
  const existing = localStorage.getItem(AUTH_KEY);
  if(existing) {
    const users = JSON.parse(existing);
    if(users.length > 0) return; // already set up
  }
  const hash = await hashPassword(DEFAULT_ADMIN.defaultPassword);
  const adminUser = { id:DEFAULT_ADMIN.id, name:"Admin", email:DEFAULT_ADMIN.email, role:"admin", passwordHash:hash, active:true, createdAt:new Date().toISOString().slice(0,10) };
  localStorage.setItem(AUTH_KEY, JSON.stringify([adminUser]));
};

export default function App() {
  const [session, setSession]    = useState(null);
  const [authReady, setAuthReady]= useState(false);
  const [showUsers, setShowUsers]= useState(false);

  const [module,setModule]       = useState("home");
  const [tenders,setTendersRaw]  = useState([]);
  const [suppliers,setSuppRaw]   = useState([]);
  const [contacts,setContactsRaw]= useState([]);
  const [bids,setBidsRaw]        = useState([]);
  const [competitors,setCompetitorsRaw] = useState({bids:[],profiles:[]});
  const [syncLog,setSyncLog]     = useState([]);
  const [showSearch,setShowSearch] = useState(false);
  const [settings,setSettingsRaw]  = useState({});
  const syncTimer                = useRef(null);

  // ── Init auth on mount ──
  useEffect(()=>{
    initAuth().then(()=>{
      const raw = localStorage.getItem(SESSION_KEY);
      if(raw) {
        try {
          const s = JSON.parse(raw);
          if(Date.now() - s.loginTime < 24*60*60*1000) setSession(s);
          else localStorage.removeItem(SESSION_KEY);
        } catch {}
      }
      setAuthReady(true);
    });
  },[]);

  // ── Load all data on mount ──
  useEffect(()=>{
    if(!session) return;
    stor.get("asmand:tenders").then(d=>d&&setTendersRaw(d));
    stor.get("asmand:suppliers").then(d=>d&&setSuppRaw(d));
    stor.get("asmand:contacts").then(d=>d&&setContactsRaw(d));
    stor.get("asmand:financials").then(d=>d&&setBidsRaw(d));
    const s = localStorage.getItem("asmand:settings");
    if(s) try{ setSettingsRaw(JSON.parse(s)); }catch{}
  },[session]);

  const handleLogin  = (s) => setSession(s);
  const handleLogout = () => { localStorage.removeItem(SESSION_KEY); setSession(null); };

  // Show nothing until auth is checked
  if(!authReady) return <div style={{background:C.bg,minHeight:"100vh",display:"grid",placeItems:"center"}}>
    <style>{css}</style>
    <div style={{fontFamily:"JetBrains Mono,monospace",color:C.t2,fontSize:12,letterSpacing:2}}>LOADING…</div>
  </div>;

  // Show login if no session
  if(!session) return <LoginScreen onLogin={handleLogin}/>;

  // ── Show sync notification briefly ──
  const flash = (msg) => {
    setSyncLog(p=>[{id:Date.now(),msg},...p].slice(0,4));
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(()=>setSyncLog([]),4000);
  };

  // ── INTELLIGENT AUTO-SYNC ENGINE ──
  // Rule 1: When a supplier is saved, auto-create a Contact if contact person info exists
  const autoSyncSupplierToContact = async (sup) => {
    if(!sup.contactPerson && !sup.email && !sup.phone) return;
    const existing = await stor.get("asmand:contacts") || [];
    const alreadyExists = existing.some(c =>
      (sup.email && c.email?.toLowerCase() === sup.email.toLowerCase()) ||
      (sup.contactPerson && c.name?.toLowerCase() === sup.contactPerson.toLowerCase())
    );
    if(alreadyExists) return;
    const newContact = {
      id: "auto-"+Date.now(),
      name: sup.contactPerson || sup.name+" (Contact)",
      title: "Export Sales",
      org: sup.name,
      type: "Supplier",
      email: sup.email || "",
      phone: sup.phone || "",
      relationship: "Developing",
      notes: "Auto-synced from Supplier Directory — "+sup.name+" ("+sup.country+")",
      lastContact: TODAY,
      autoSynced: true,
      sourceSupplier: sup.name,
    };
    const updated = [newContact, ...existing];
    await stor.set("asmand:contacts", updated);
    setContactsRaw(updated);
    flash("👤 Auto-created contact: "+newContact.name+" from supplier "+sup.name);
  };

  // Rule 2: When a tender is filed with a value, auto-create a financial record if none exists
  const autoSyncTenderToFinancials = async (tender) => {
    if(!tender.value) return;
    const existing = await stor.get("asmand:financials") || [];
    const alreadyExists = existing.some(b => b.tenderRef === tender.refNum);
    if(alreadyExists) return;
    const newBid = {
      id: "auto-"+Date.now(),
      tenderRef: tender.refNum || "AUTO",
      tenderTitle: tender.title,
      bidAmount: tender.value,
      costOfGoods: "",
      margin: "",
      status: tender.status || "Pending",
      paymentStatus: "Not received",
      notes: "Auto-synced from Tenders — filed "+tender.dateReceived,
      autoSynced: true,
    };
    const updated = [newBid, ...existing];
    await stor.set("asmand:financials", updated);
    setBidsRaw(updated);
    flash("💰 Auto-created financial record for: "+tender.title);
  };

  // Rule 3: When a won/lost tender status changes, update matching financial record status
  const autoSyncTenderStatusToFinancials = async (tender) => {
    const existing = await stor.get("asmand:financials") || [];
    const idx = existing.findIndex(b => b.tenderRef === tender.refNum);
    if(idx === -1) return;
    if(existing[idx].status === tender.status) return;
    const updated = existing.map((b,i) => i===idx ? {...b, status:tender.status} : b);
    await stor.set("asmand:financials", updated);
    setBidsRaw(updated);
    flash("💰 Updated financial status to "+tender.status+" for: "+tender.title);
  };

  // Rule 4: When AI analysis finds suppliers, their contact person auto-goes to Contacts
  // (handled inside TenderIntelligence via onSaveSuppliers callback)

  // ── SMART SETTERS — run auto-sync rules automatically ──
  const setSuppliers = async (data) => {
    setSuppRaw(data);
    await stor.set("asmand:suppliers", data);
    // Auto-sync: any new supplier with contact info → Contacts
    const existing = await stor.get("asmand:contacts") || [];
    const existingEmails = new Set(existing.map(c=>c.email?.toLowerCase()).filter(Boolean));
    const existingNames  = new Set(existing.map(c=>c.name?.toLowerCase()).filter(Boolean));
    const newOnes = Array.isArray(data) ? data.filter(s =>
      (s.contactPerson || s.email) &&
      !existingEmails.has(s.email?.toLowerCase()) &&
      !existingNames.has(s.contactPerson?.toLowerCase()) &&
      !existingNames.has((s.name+" (Contact)").toLowerCase())
    ) : [];
    if(newOnes.length > 0) {
      const newContacts = newOnes.map(s=>({
        id: "auto-"+Date.now()+"-"+Math.random().toString(36).slice(2,5),
        name: s.contactPerson || s.name+" (Contact)",
        title: s.contactPerson ? "Export Sales" : "Company",
        org: s.name,
        type: "Supplier",
        email: s.email||"",
        phone: s.phone||"",
        website: s.website||"",
        relationship: "Developing",
        notes: "Auto-synced · "+s.country+" · Products: "+(s.keyProducts||[]).join(", "),
        lastContact: TODAY,
        autoSynced: true,
        sourceSupplier: s.name,
      }));
      const updatedContacts = [...newContacts, ...existing];
      await stor.set("asmand:contacts", updatedContacts);
      setContactsRaw(updatedContacts);
      flash("👤 Auto-added "+newContacts.length+" contact"+(newContacts.length>1?"s":"")+" from suppliers");
    }
  };

  const setContacts = async (data) => {
    setContactsRaw(data);
    await stor.set("asmand:contacts", data);
  };

  const setTenders = async (data) => {
    setTendersRaw(data);
    await stor.set("asmand:tenders", data);
    // Auto-sync new tenders with values → Financials
    const existingBids = await stor.get("asmand:financials") || [];
    const existingRefs = new Set(existingBids.map(b=>b.tenderRef));
    const toSync = Array.isArray(data) ? data.filter(t => t.value && !existingRefs.has(t.refNum)) : [];
    if(toSync.length > 0) {
      const newBids = toSync.map(t=>({
        id: "auto-"+Date.now()+"-"+Math.random().toString(36).slice(2,5),
        tenderRef: t.refNum||"AUTO-"+Date.now(),
        tenderTitle: t.title,
        bidAmount: t.value,
        costOfGoods: "",
        margin: "",
        status: t.status||"Pending",
        paymentStatus: "Not received",
        notes: "Auto-synced from Tenders",
        autoSynced: true,
      }));
      const updatedBids = [...newBids, ...existingBids];
      await stor.set("asmand:financials", updatedBids);
      setBidsRaw(updatedBids);
      flash("💰 Auto-created "+newBids.length+" financial record"+(newBids.length>1?"s":"")+" from tenders");
    }
    // Also update financial statuses for status-changed tenders
    const statusChanged = Array.isArray(data) ? data.filter(t =>
      (t.status==="Won"||t.status==="Lost") &&
      existingBids.some(b=>b.tenderRef===t.refNum && b.status!==t.status)
    ) : [];
    if(statusChanged.length > 0) {
      const updatedBids2 = await stor.get("asmand:financials") || [];
      let changed = false;
      const synced = updatedBids2.map(b => {
        const match = statusChanged.find(t=>t.refNum===b.tenderRef);
        if(match && b.status!==match.status){ changed=true; return {...b,status:match.status}; }
        return b;
      });
      if(changed){
        await stor.set("asmand:financials",synced);
        setBidsRaw(synced);
        flash("💰 Updated financial statuses from tender changes");
      }
    }
  };

  const setBids = async (data) => {
    setBidsRaw(data);
    await stor.set("asmand:financials", data);
    // Auto-sync won bid payment → update tender status if needed
    const existingTenders = await stor.get("asmand:tenders") || [];
    let tenderChanged = false;
    const syncedTenders = existingTenders.map(t => {
      const match = Array.isArray(data) ? data.find(b=>b.tenderRef===t.refNum) : null;
      if(match && match.status==="Won" && t.status!=="Won"){
        tenderChanged = true;
        return {...t, status:"Won"};
      }
      return t;
    });
    if(tenderChanged){
      await stor.set("asmand:tenders", syncedTenders);
      setTendersRaw(syncedTenders);
      flash("📁 Tender status updated to Won from financial record");
    }
  };

  const NAV = [
    {id:"home",     icon:"⬡", label:"Command Centre",  sub:"Overview & dashboard"},
    {id:"intel",    icon:"🎯", label:"AI Analysis",     sub:"Deep intelligence engine"},
    {id:"market",   icon:"🧠", label:"Market Intel",    sub:"Opportunities & strategies"},
    {id:"compete",  icon:"⚔️", label:"Competitors",     sub:"Track bids & beat rivals"},
    {id:"tenders",  icon:"📁", label:"Tenders",         sub:"File & track tenders"},
    {id:"suppliers",icon:"🏭", label:"Suppliers",       sub:"Directory by product & country"},
    {id:"contacts", icon:"👥", label:"Contacts",        sub:"MOD relationships & network"},
    {id:"finance",  icon:"💰", label:"Financials",      sub:"Bids, margins, P&L"},
    {id:"settings", icon:"⚙️", label:"Settings",        sub:"Customise platform"},
  ];

  return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"Inter,sans-serif",color:C.t,display:"flex",flexDirection:"column"}}>
      <style>{css}</style>

      {/* TOP HEADER */}
      <div style={{background:"linear-gradient(90deg,"+C.s1+","+C.s2+")",
        borderBottom:"1px solid "+C.b,height:56,
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"0 24px",flexShrink:0,position:"sticky",top:0,zIndex:200}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:36,height:36,background:"conic-gradient("+C.accent+","+C.gold+","+C.purple+","+C.accent+")",
            clipPath:"polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",
            display:"grid",placeItems:"center",fontSize:15,color:C.bg,fontWeight:900,
            animation:"glow 3s ease-in-out infinite"}}>A</div>
          <div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:13,letterSpacing:4,color:C.tb,textTransform:"uppercase",lineHeight:1}}>{(settings?.companyName||"ASHMAND").toUpperCase()}</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:C.t2,letterSpacing:3,textTransform:"uppercase"}}>{settings?.companyFullName||"DEFENCE INTELLIGENCE PLATFORM"}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <button onClick={()=>setShowSearch(true)}
            style={{display:"flex",alignItems:"center",gap:8,padding:"6px 14px",
              background:C.s2,border:"1px solid "+C.b,borderRadius:6,cursor:"pointer",
              color:C.t2,fontFamily:"Inter,sans-serif",fontSize:12}}>
            🔍 <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:10}}>Search...</span>
          </button>
          <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:C.t2,display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:C.accent,animation:"pulse 2s infinite"}}/>
            LIVE · AUTO-SYNC ON
          </div>
          {/* USER BADGE + LOGOUT */}
          <div style={{display:"flex",alignItems:"center",gap:8,borderLeft:"1px solid "+C.b,paddingLeft:12}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,"+C.purple+",#6a3db8)",
                display:"grid",placeItems:"center",fontSize:12,fontWeight:800,color:"#fff",flexShrink:0}}>
                {session?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{fontFamily:"Inter,sans-serif",fontSize:11,fontWeight:700,color:C.tb,lineHeight:1}}>{session?.name}</div>
                <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:C.t2,letterSpacing:1}}>{session?.role?.toUpperCase()}</div>
              </div>
            </div>
            {session?.role==="admin"&&(
              <button onClick={()=>setShowUsers(true)}
                style={{padding:"4px 10px",borderRadius:3,border:"1px solid "+C.b,background:C.s2,
                  color:C.t2,cursor:"pointer",fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:1}}>
                👥 USERS
              </button>
            )}
            <button onClick={handleLogout}
              style={{padding:"4px 10px",borderRadius:3,border:"1px solid rgba(230,57,70,0.3)",
                background:"rgba(230,57,70,0.08)",color:C.red,cursor:"pointer",
                fontFamily:"JetBrains Mono,monospace",fontSize:9,letterSpacing:1}}>
              LOGOUT
            </button>
          </div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {NAV.map(n=>(
              <button key={n.id} onClick={()=>setModule(n.id)}
                style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:1,
                  textTransform:"uppercase",padding:"6px 12px",cursor:"pointer",
                  border:"1px solid "+(module===n.id?C.accent:C.b),
                  color:module===n.id?C.accent:C.t2,
                  background:module===n.id?"rgba(0,212,170,0.08)":C.s1,
                  borderRadius:3,display:"flex",alignItems:"center",gap:5,transition:"all 0.15s"}}>
                <span>{n.icon}</span>{n.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AUTO-SYNC TOAST NOTIFICATIONS */}
      {syncLog.length>0&&(
        <div style={{position:"fixed",top:66,right:16,zIndex:9990,display:"flex",flexDirection:"column",gap:6}}>
          {syncLog.map(l=>(
            <div key={l.id} style={{padding:"10px 16px",background:"linear-gradient(135deg,"+C.s1+","+C.s2+")",
              border:"1px solid "+C.accent+"60",borderLeft:"3px solid "+C.accent,
              borderRadius:6,fontSize:12,color:C.accent,fontFamily:"Inter,sans-serif",
              fontWeight:600,animation:"fadeUp 0.2s ease",
              boxShadow:"0 4px 20px rgba(0,212,170,0.15)"}}>
              ⚡ {l.msg}
            </div>
          ))}
        </div>
      )}

      {/* DEADLINE ALERT BANNER */}
      {(()=>{
        const today = new Date();
        const urgent = tenders.filter(t=>{
          if(t.status==="Won"||t.status==="Lost"||t.status==="Cancelled"||!t.deadline) return false;
          const dDays = Math.ceil((new Date(t.deadline)-today)/(1000*60*60*24));
          return dDays>=0 && dDays<=14;
        }).sort((a,b)=>new Date(a.deadline)-new Date(b.deadline));
        if(urgent.length===0) return null;
        return (
          <div style={{background:"linear-gradient(90deg,rgba(232,160,32,0.12),rgba(230,57,70,0.08))",
            borderBottom:"1px solid rgba(232,160,32,0.3)",padding:"8px 32px",
            display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:C.gold,letterSpacing:2,flexShrink:0}}>⚠ DEADLINES</span>
            {urgent.slice(0,4).map((t,i)=>{
              const dDays = Math.ceil((new Date(t.deadline)-today)/(1000*60*60*24));
              return (
                <div key={i} onClick={()=>setModule("tenders")} style={{cursor:"pointer",
                  display:"flex",alignItems:"center",gap:6,padding:"3px 10px",
                  background:dDays<=3?"rgba(230,57,70,0.15)":"rgba(232,160,32,0.1)",
                  border:"1px solid "+(dDays<=3?C.red:C.gold),borderRadius:4}}>
                  <span style={{fontFamily:"Inter,sans-serif",fontSize:11,color:C.tb,fontWeight:600}}>{t.title?.slice(0,30)}{t.title?.length>30?"…":""}</span>
                  <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:dDays<=3?C.red:C.gold,fontWeight:700}}>{dDays===0?"TODAY":dDays===1?"TOMORROW":dDays+"d"}</span>
                </div>
              );
            })}
            {urgent.length>4&&<span style={{fontFamily:"JetBrains Mono,monospace",fontSize:10,color:C.t2}}>+{urgent.length-4} more</span>}
          </div>
        );
      })()}

      {/* MAIN */}
      <div style={{flex:1,padding:"28px 32px",maxWidth:1320,width:"100%",margin:"0 auto"}}>
        <div style={{marginBottom:20}}>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.t2,letterSpacing:3,textTransform:"uppercase",marginBottom:4}}>
            {NAV.find(n=>n.id===module)?.sub}
          </div>
          <h1 style={{fontWeight:900,fontSize:24,color:C.tb,letterSpacing:-0.5}}>
            {NAV.find(n=>n.id===module)?.icon} {NAV.find(n=>n.id===module)?.label}
          </h1>
        </div>

        <div key={module} style={{animation:"fadeUp 0.25s ease both"}}>
          {module==="home"    &&<CommandCentre tenders={tenders} suppliers={suppliers} contacts={contacts} bids={bids} settings={settings}/>}
          {module==="intel"   &&<TenderIntelligence suppliers={suppliers} onSaveSuppliers={setSuppliers} settings={settings}/>}
          {module==="market"  &&<MarketIntelligence tenders={tenders} suppliers={suppliers} bids={bids} contacts={contacts} settings={settings}/>}
          {module==="compete" &&<CompetitorIntel tenders={tenders} competitors={competitors} setCompetitors={setCompetitorsRaw}/>}
          {module==="settings"&&<Settings settings={settings} setSettings={setSettingsRaw}/>}
          {module==="tenders" &&<TendersFile contacts={contacts} setTenders={setTenders} tenders={tenders} settings={settings}/>}
          {module==="suppliers"&&<SupplierDirectory suppliers={suppliers} setSuppliers={setSuppliers} contacts={contacts} setContacts={setContacts} settings={settings}/>}
          {module==="contacts"&&<ContactsCRM contacts={contacts} setContacts={setContacts} suppliers={suppliers}/>}
          {module==="finance" &&<Financials bids={bids} setBids={setBids} tenders={tenders} settings={settings}/>}
        </div>
      </div>

      {/* FLOATING INTEL CHATBOT */}
      <IntelChat suppliers={suppliers} tenders={tenders} contacts={contacts} bids={bids}/>
      {showSearch&&<GlobalSearch tenders={tenders} suppliers={suppliers} contacts={contacts} bids={bids} onNavigate={setModule} onClose={()=>setShowSearch(false)}/>}
      {showUsers&&<UserManagement session={session} onClose={()=>setShowUsers(false)}/>}
    </div>
  );
}
