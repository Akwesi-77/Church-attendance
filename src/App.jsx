import { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from "recharts";
import {
  subscribeRecords, addRecord, deleteRecord,
  subscribeSettings, saveSettings as saveSettingsToDB,
  loadSettings, isConfigured, downloadBackup,
  loadUsers, loginUser, createUser, updateUser, deleteUser
} from "./supabase";
import { ROLES, NAV, SETTINGS_TABS, can } from "./rbac";

// ─── Design Tokens — Light Green Theme ───────────────────────
const G1  = "#16a34a";   // primary green
const G2  = "#22c55e";   // lighter green
const G3  = "#dcfce7";   // very light green background
const G4  = "#bbf7d0";   // light green border
const G5  = "#f0fdf4";   // page background
const G6  = "#166534";   // dark green text
const TXT = "#1a2e1f";   // main text
const DIM = "#6b7280";   // muted text
const WHT = "#ffffff";   // white
const RED = "#dc2626";   // error
const AMB = "#d97706";   // warning/amber
const BLU = "#2563eb";   // blue accent
const PRP = "#7c3aed";   // purple accent
const SANS = "'Inter', 'Segoe UI', system-ui, sans-serif";
const COLS = [G1,"#0891b2","#d97706","#dc2626","#7c3aed","#db2777","#059669","#ea580c","#0284c7","#9333ea"];

const BG_PRESETS = [
  { label:"Cathedral",  value:"https://images.unsplash.com/photo-1438032005730-c779502df39b?w=1600&q=80" },
  { label:"Sunrise",    value:"https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=1600&q=80" },
  { label:"Cross",      value:"https://images.unsplash.com/photo-1519817650390-64a93db51149?w=1600&q=80" },
  { label:"Interior",   value:"https://images.unsplash.com/photo-1548625149-720834a84c32?w=1600&q=80" },
  { label:"Evening",    value:"https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1600&q=80" },
];
const DEFAULT_CATS = [
  { id:"men",         label:"Men",          icon:"👨", color:G1,      locked:true },
  { id:"women",       label:"Women",        icon:"👩", color:"#0891b2",locked:true },
  { id:"children",    label:"Children",     icon:"👦", color:AMB,     locked:true },
  { id:"teens",       label:"Teens",        icon:"🧑", color:BLU,     locked:true },
  { id:"firstTimers", label:"First Timers", icon:"🌟", color:"#db2777",locked:true },
  { id:"soulsWon",    label:"Souls Won",    icon:"✝",  color:PRP,     locked:true },
  { id:"workers",     label:"Workers",      icon:"🛠",  color:"#059669",locked:true },
  { id:"online",      label:"Online",       icon:"💻", color:"#ea580c",locked:true },
];
const DEFAULT_SETTINGS = {
  bg: BG_PRESETS[0].value, churchName:"Grace Community Church",
  accentColor: G1, password:"", categories:[...DEFAULT_CATS],
  pastors:[{id:1,name:"Pastor John Doe",role:"Senior Pastor",email:"pastor@church.org",phone:""}],
  hikvision:{ ip:"", port:"80", username:"admin", password:"", label:"Main Entrance", syncMode:"manual", autoInterval:30, userMap:[], lastSync:"" }
};
const CORE = ["men","women","children","teens"];
const total = r => CORE.reduce((a,id)=>a+(+r[id]||0),0);

// ─── Shared Styles ────────────────────────────────────────────
const S = {
  input: {
    width:"100%", background:WHT, border:"1.5px solid #d1fae5",
    borderRadius:8, padding:"9px 13px", color:TXT, fontSize:14,
    outline:"none", fontFamily:SANS, boxSizing:"border-box",
    transition:"border .15s", boxShadow:"0 1px 3px rgba(0,0,0,0.05)"
  },
  btn: (c=G1, fill=true) => ({
    padding:"9px 20px",
    background: fill ? c : "transparent",
    border: `1.5px solid ${c}`,
    borderRadius:8, color: fill ? WHT : c,
    fontSize:13, fontFamily:SANS, fontWeight:600,
    cursor:"pointer", transition:"all .15s", whiteSpace:"nowrap",
    boxShadow: fill ? `0 2px 8px ${c}33` : "none"
  }),
  card: (extra={}) => ({
    background:WHT, border:`1.5px solid ${G4}`,
    borderRadius:12, padding:"18px 20px",
    boxShadow:"0 2px 8px rgba(22,163,74,0.07)", ...extra
  }),
};

// ─── UI Components ────────────────────────────────────────────
function Card({ title, sub, children, style, action }) {
  return (
    <div style={S.card(style)}>
      {(title||action) && (
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:G6, letterSpacing:1, textTransform:"uppercase" }}>{title}</div>
            {sub && <div style={{ fontSize:12, color:DIM, marginTop:2 }}>{sub}</div>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function Field({ label, children, style }) {
  return (
    <div style={{ marginBottom:14, ...style }}>
      <label style={{ display:"block", fontSize:12, fontWeight:600, color:G6, marginBottom:5 }}>{label}</label>
      {children}
    </div>
  );
}

function Stat({ icon, label, value, sub, color=G1 }) {
  return (
    <div style={{ background:WHT, border:`1.5px solid ${G4}`, borderRadius:12, padding:"18px 20px", position:"relative", overflow:"hidden", boxShadow:"0 2px 8px rgba(22,163,74,0.07)" }}>
      <div style={{ position:"absolute", top:0, right:0, width:80, height:80, background:`${color}0d`, borderRadius:"0 12px 0 80px" }}/>
      <div style={{ fontSize:24, marginBottom:8 }}>{icon}</div>
      <div style={{ fontSize:11, fontWeight:600, color:DIM, letterSpacing:1, textTransform:"uppercase", marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:32, fontWeight:800, color, lineHeight:1 }}>{value??"-"}</div>
      {sub && <div style={{ fontSize:11, color:DIM, marginTop:4 }}>{sub}</div>}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${color},${color}33)`, borderRadius:"0 0 12px 12px" }}/>
    </div>
  );
}

function Badge({ children, color=G1 }) {
  return (
    <span style={{ background:`${color}18`, border:`1px solid ${color}33`, color, borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:600, display:"inline-flex", alignItems:"center", gap:3 }}>
      {children}
    </span>
  );
}

function Toast({ msg, type="ok" }) {
  const c = type==="err"?RED:type==="warn"?AMB:G1;
  const bg = type==="err"?"#fef2f2":type==="warn"?"#fffbeb":"#f0fdf4";
  return (
    <div style={{ background:bg, border:`1.5px solid ${c}44`, borderRadius:8, padding:"10px 14px", marginBottom:14, color:c, fontSize:13, fontWeight:500, display:"flex", gap:8, alignItems:"center" }}>
      {type==="err"?"⚠️":type==="warn"?"⚠️":"✅"} {msg}
    </div>
  );
}

function RoleBadge({ role }) {
  const r = ROLES[role];
  if (!r) return null;
  return <Badge color={r.color}>{r.icon} {r.label}</Badge>;
}

function PageHeader({ title, sub, accent=G1, children }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:22 }}>
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:4, height:28, background:accent, borderRadius:2 }}/>
          <h1 style={{ fontSize:22, fontWeight:800, color:TXT, margin:0 }}>{title}</h1>
        </div>
        {sub && <div style={{ fontSize:13, color:DIM, marginTop:4, marginLeft:14 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

const TT = { contentStyle:{ background:WHT, border:`1px solid ${G4}`, color:TXT, fontSize:12, borderRadius:8, boxShadow:"0 4px 12px rgba(0,0,0,0.1)" } };
const CG = <CartesianGrid strokeDasharray="3 3" stroke="#dcfce7"/>;

// ═══════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [records,  setRecords]  = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded,   setLoaded]   = useState(false);
  const [dbStatus, setDbStatus] = useState("connecting");
  const [user,     setUser]     = useState(null);
  const [page,     setPage]     = useState("dashboard");

  useEffect(() => {
    if (!isConfigured()) { setDbStatus("unconfigured"); setLoaded(true); return; }
    let unR, unS;
    loadSettings()
      .then(s => {
        if (s) setSettings({ ...DEFAULT_SETTINGS, ...s, categories:s.categories||DEFAULT_CATS });
        setLoaded(true); setDbStatus("live");
        unR = subscribeRecords(recs => setRecords([...recs].sort((a,b)=>a.date.localeCompare(b.date))));
        unS = subscribeSettings(s => setSettings({ ...DEFAULT_SETTINGS, ...s, categories:s.categories||DEFAULT_CATS }));
      })
      .catch(() => { setDbStatus("error"); setLoaded(true); });
    return () => { unR?.(); unS?.(); };
  }, []);

  const accent = settings.accentColor || G1;

  const handleSaveSettings = async s => {
    setSettings(s);
    try { await saveSettingsToDB(s); } catch(e) { console.error(e); }
  };

  if (!loaded) return <Splash/>;
  if (dbStatus==="unconfigured") return <ErrScreen type="unconfigured"/>;
  if (dbStatus==="error")        return <ErrScreen type="error"/>;
  if (!user) return <LoginScreen onLogin={setUser}/>;

  const pageAccess = page==="users"?"*":page==="settings"?"settings.general":page;

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:G5, fontFamily:SANS, color:TXT }}>
      <Sidebar page={page} setPage={setPage} user={user} accent={accent} dbStatus={dbStatus} onLogout={()=>setUser(null)}/>
      <main style={{ flex:1, marginLeft:240, padding:"24px 30px", minHeight:"100vh" }}>
        {/* Live bar */}
        {dbStatus==="live" && (
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:18, padding:"7px 14px", background:G3, border:`1px solid ${G4}`, borderRadius:20, width:"fit-content", fontSize:12, color:G6, fontWeight:500 }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:G2, display:"inline-block", boxShadow:`0 0 6px ${G2}` }}/>
            Live · Syncing with Supabase ·
            <span style={{ marginLeft:2 }}><RoleBadge role={user?.role}/></span>
            <span style={{ color:DIM, marginLeft:4 }}>{user?.name}</span>
          </div>
        )}

        {/* Routes */}
        {can(user, pageAccess) ? (
          <>
            {page==="dashboard"  && <Dashboard   records={records} settings={settings} accent={accent}/>}
            {page==="entry"      && <EntryForm    settings={settings} accent={accent} onSave={async r=>{try{await addRecord(r)}catch(e){alert(e.message)}}}/>}
            {page==="analytics"  && <Analytics    records={records} settings={settings} accent={accent}/>}
            {page==="records"    && <AllRecords   records={records} settings={settings} accent={accent} user={user} onDelete={async id=>{try{await deleteRecord(id)}catch(e){console.error(e)}}}/>}
            {page==="reports"    && <Reports      records={records} settings={settings} accent={accent}/>}
            {page==="pastors"    && <Pastors      settings={settings} accent={accent} onSave={handleSaveSettings}/>}
            {page==="hikvision"  && <HikvisionPage settings={settings} accent={accent} onSave={handleSaveSettings}/>}
            {page==="settings"   && <SettingsPage  settings={settings} accent={accent} user={user} onSave={handleSaveSettings}/>}
            {page==="users"      && <UsersPage     accent={accent} currentUser={user}/>}
          </>
        ) : (
          <div style={{ textAlign:"center", padding:"80px 0" }}>
            <div style={{ fontSize:56, marginBottom:16 }}>🔒</div>
            <div style={{ fontSize:20, fontWeight:700, color:RED, marginBottom:8 }}>Access Denied</div>
            <div style={{ fontSize:14, color:DIM }}>Your role <RoleBadge role={user?.role}/> does not have permission to view this page.</div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Splash ───────────────────────────────────────────────────
function Splash() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100vh", background:G5, gap:16 }}>
      <div style={{ width:64, height:64, borderRadius:16, background:G3, border:`2px solid ${G4}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, boxShadow:`0 0 30px ${G2}44` }}>✝</div>
      <div style={{ fontSize:14, color:G6, fontWeight:600 }}>Connecting to Supabase…</div>
      <div style={{ width:40, height:3, background:`linear-gradient(90deg,${G2},${G1})`, borderRadius:2, animation:"grow 1.5s ease infinite" }}/>
      <style>{`@keyframes grow{0%,100%{width:40px}50%{width:120px}}`}</style>
    </div>
  );
}

function ErrScreen({ type }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:G5 }}>
      <div style={{ maxWidth:460, textAlign:"center", padding:32, background:WHT, borderRadius:16, border:`1.5px solid ${G4}`, boxShadow:"0 4px 24px rgba(0,0,0,0.08)" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
        <div style={{ fontSize:20, fontWeight:700, color:RED, marginBottom:10 }}>{type==="unconfigured"?"Supabase Not Configured":"Connection Error"}</div>
        <div style={{ fontSize:13, color:DIM, lineHeight:2 }}>
          {type==="unconfigured" ? <>Open <code style={{color:G1,background:G3,padding:"1px 6px",borderRadius:4}}>src/supabase.js</code> and paste your Project URL and anon key.</> : <>Check credentials in <code style={{color:G1}}>src/supabase.js</code> and ensure you ran <code style={{color:G1}}>setup.sql</code> in Supabase.</>}
        </div>
        <button onClick={()=>window.location.reload()} style={{ ...S.btn(G1,true), marginTop:20, padding:"11px 28px" }}>↺ Retry</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err,  setErr]  = useState("");
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (!username.trim()||!password) { setErr("Please enter username and password."); return; }
    setBusy(true); setErr("");
    const u = await loginUser(username, password);
    if (u) { onLogin(u); }
    else { setErr("Invalid username or password."); setPassword(""); }
    setBusy(false);
  };

  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:`linear-gradient(135deg, ${G5} 0%, ${G3} 100%)` }}>
      <div style={{ width:400, background:WHT, border:`1.5px solid ${G4}`, borderRadius:20, padding:"48px 40px", boxShadow:"0 20px 60px rgba(22,163,74,0.15)" }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:72, height:72, borderRadius:20, background:G3, border:`2px solid ${G4}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:34, margin:"0 auto 16px", boxShadow:`0 4px 20px ${G1}22` }}>✝</div>
          <div style={{ fontSize:20, fontWeight:800, color:TXT }}>Church Attendance</div>
          <div style={{ fontSize:13, color:DIM, marginTop:4 }}>Sign in to your account</div>
        </div>

        {err && <Toast msg={err} type="err"/>}

        <Field label="Username">
          <input value={username} onChange={e=>setUsername(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()}
            placeholder="Enter your username" autoFocus
            style={{ ...S.input, fontSize:14 }}
            onFocus={e=>e.target.style.borderColor=G1} onBlur={e=>e.target.style.borderColor="#d1fae5"}/>
        </Field>
        <Field label="Password">
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()}
            placeholder="Enter your password"
            style={{ ...S.input, fontSize:14 }}
            onFocus={e=>e.target.style.borderColor=G1} onBlur={e=>e.target.style.borderColor="#d1fae5"}/>
        </Field>

        <button onClick={go} disabled={busy} style={{ ...S.btn(G1,true), width:"100%", padding:"12px", fontSize:15, marginTop:6, opacity:busy?.7:1 }}>
          {busy?"Signing in…":"Sign In →"}
        </button>

      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────
function Sidebar({ page, setPage, user, accent, dbStatus, onLogout }) {
  const allNav = [
    { id:"dashboard", icon:"📊", label:"Dashboard"    },
    { id:"entry",     icon:"✏️",  label:"Record"        },
    { id:"analytics", icon:"📈", label:"Analytics"     },
    { id:"records",   icon:"📋", label:"All Records"   },
    { id:"reports",   icon:"📄", label:"Reports"       },
    { id:"pastors",   icon:"👥", label:"Team"           },
    { id:"hikvision", icon:"📷", label:"Hikvision"     },
    { id:"settings",  icon:"⚙️", label:"Settings"      },
    { id:"users",     icon:"🔐", label:"User Accounts" },
  ];
  const visibleNav = allNav.filter(n => {
    if (n.id==="users")     return can(user,"*");
    if (n.id==="settings")  return can(user,"settings.general");
    if (n.id==="hikvision") return can(user,"settings.general")||can(user,"*");
    return can(user, n.id==="entry"?"entry":n.id==="records"?"records":n.id==="pastors"?"pastors":n.id==="analytics"?"analytics":n.id==="reports"?"reports":"dashboard");
  });
  const scColor = dbStatus==="live"?G2:RED;

  return (
    <div style={{ position:"fixed", left:0, top:0, width:240, height:"100vh", background:WHT, borderRight:`1.5px solid ${G4}`, display:"flex", flexDirection:"column", zIndex:100, boxShadow:"2px 0 12px rgba(22,163,74,0.08)" }}>
      {/* Header */}
      <div style={{ padding:"20px 18px 16px", borderBottom:`1px solid ${G3}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:G3, border:`1.5px solid ${G4}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>✝</div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:TXT, lineHeight:1.3 }}>Church Attendance</div>
            <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:2 }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:scColor, display:"inline-block" }}/>
              <span style={{ fontSize:10, color:scColor, fontWeight:500 }}>{dbStatus==="live"?"Live":"Offline"}</span>
            </div>
          </div>
        </div>
        {/* User pill */}
        <div style={{ background:G3, border:`1px solid ${G4}`, borderRadius:10, padding:"8px 10px" }}>
          <div style={{ fontSize:12, fontWeight:600, color:TXT }}>{user?.name}</div>
          <div style={{ marginTop:3 }}><RoleBadge role={user?.role}/></div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:"10px 10px", overflowY:"auto" }}>
        {visibleNav.map(n => {
          const active = page===n.id;
          return (
            <button key={n.id} onClick={()=>setPage(n.id)} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"9px 12px", marginBottom:2, border:"none", background:active?G3:"transparent", color:active?G6:DIM, fontSize:13, fontWeight:active?600:400, fontFamily:SANS, cursor:"pointer", textAlign:"left", borderRadius:9, transition:"all .12s", borderLeft:active?`3px solid ${accent}`:"3px solid transparent" }}>
              <span style={{ fontSize:16 }}>{n.icon}</span> {n.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding:"12px 12px", borderTop:`1px solid ${G3}` }}>
        <button onClick={downloadBackup} style={{ ...S.btn(G1,false), width:"100%", padding:"7px", fontSize:12, marginBottom:6 }}>↓ Download Backup</button>
        <button onClick={onLogout} style={{ ...S.btn("#6b7280",false), width:"100%", padding:"7px", fontSize:12 }}>Sign Out</button>
        <div style={{ fontSize:10, color:"#d1fae5", marginTop:8, textAlign:"center" }}>v6.0 · Light Green Edition</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
function Dashboard({ records, settings, accent }) {
  const cats   = settings.categories||DEFAULT_CATS;
  const sorted = [...records].sort((a,b)=>a.date.localeCompare(b.date));
  const latest = sorted[sorted.length-1];
  const lastT  = latest?total(latest):0;
  const prevT  = sorted.length>1?total(sorted[sorted.length-2]):0;
  const growth = prevT?(((lastT-prevT)/prevT)*100).toFixed(1):null;
  const allFT  = records.reduce((a,r)=>a+(+r.firstTimers||0),0);
  const allSW  = records.reduce((a,r)=>a+(+r.soulsWon||0),0);
  const avg    = records.length?Math.round(records.reduce((a,r)=>a+total(r),0)/records.length):0;
  const trend  = sorted.slice(-8).map(r=>({ d:r.date.slice(5), t:total(r), ...Object.fromEntries(cats.map(c=>[c.id,+r[c.id]||0])) }));
  const pie    = latest?cats.filter(c=>CORE.includes(c.id)).map(c=>({name:c.label,value:+latest[c.id]||0})).filter(v=>v.value>0):[];

  return (
    <div>
      <PageHeader title="Dashboard" sub={`${settings.churchName} · Live Overview`} accent={accent}/>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        <Stat icon="👥" label="Last Service"   value={lastT} sub={growth?`${+growth>0?"+":""}${growth}% vs prev`:"—"} color={accent}/>
        <Stat icon="📈" label="Avg Attendance" value={avg}   sub={`${records.length} services`}  color={BLU}/>
        <Stat icon="🌟" label="First Timers"   value={allFT} sub="all-time"                       color="#db2777"/>
        <Stat icon="✝"  label="Souls Won"      value={allSW} sub="all-time"                       color={PRP}/>
      </div>
      {records.length===0 ? (
        <Card title="Getting Started">
          <div style={{ textAlign:"center", padding:"50px 0", color:DIM }}>
            <div style={{ fontSize:48, marginBottom:12 }}>⛪</div>
            <div style={{ fontSize:16, fontWeight:600, color:TXT, marginBottom:6 }}>No records yet</div>
            <div style={{ fontSize:13 }}>Click <strong>Record</strong> in the sidebar to log your first service.</div>
          </div>
        </Card>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:16 }}>
          <Card title="Attendance Trend">
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={trend}>
                <defs><linearGradient id="gG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={accent} stopOpacity={0.25}/><stop offset="95%" stopColor={accent} stopOpacity={0}/></linearGradient></defs>
                {CG}<XAxis dataKey="d" stroke="#9ca3af" tick={{fontSize:11}}/><YAxis stroke="#9ca3af" tick={{fontSize:11}}/>
                <Tooltip {...TT}/><Area type="monotone" dataKey="t" stroke={accent} fill="url(#gG)" strokeWidth={2.5} name="Total"/>
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          <Card title={`Last Service — ${latest?.date||""}`}>
            {pie.length>0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <PieChart><Pie data={pie} cx="50%" cy="45%" innerRadius={52} outerRadius={76} paddingAngle={3} dataKey="value">{pie.map((_,i)=><Cell key={i} fill={COLS[i%COLS.length]}/>)}</Pie><Tooltip {...TT}/><Legend wrapperStyle={{fontSize:11,color:DIM}}/></PieChart>
              </ResponsiveContainer>
            ) : <div style={{ textAlign:"center", padding:40, color:DIM }}>No breakdown data</div>}
          </Card>
          <Card title="Breakdown — Last 8 Services" style={{ gridColumn:"1/-1" }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={trend}>{CG}<XAxis dataKey="d" stroke="#9ca3af" tick={{fontSize:11}}/><YAxis stroke="#9ca3af" tick={{fontSize:11}}/><Tooltip {...TT}/><Legend wrapperStyle={{fontSize:11,color:DIM}}/>
                {cats.filter(c=>CORE.includes(c.id)).map((c,i)=><Bar key={c.id} dataKey={c.id} fill={c.color||COLS[i]} name={c.label} radius={[4,4,0,0]} maxBarSize={30}/>)}
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ENTRY FORM
// ═══════════════════════════════════════════════════════════════
function EntryForm({ settings, accent, onSave }) {
  const cats = settings.categories||DEFAULT_CATS;
  const blank = () => ({ date:new Date().toISOString().split("T")[0], service:"Morning Service", pastor:"", notes:"", ...Object.fromEntries(cats.map(c=>[c.id,""])) });
  const [form, setForm] = useState(blank());
  const [busy, setBusy] = useState(false);
  const [toast,setToast]= useState(null);
  const t = CORE.reduce((a,id)=>a+(+form[id]||0),0);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const submit = async () => {
    if (!form.date) return;
    setBusy(true);
    await onSave({ ...form, total:t });
    setToast("Record saved successfully!");
    setForm(blank()); setBusy(false);
    setTimeout(()=>setToast(null),4000);
  };

  return (
    <div>
      <PageHeader title="Record Attendance" sub="Saves to Supabase instantly" accent={accent}/>
      {toast && <Toast msg={toast}/>}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:14 }}>
        <Card title="Date"><input type="date" value={form.date} onChange={e=>set("date",e.target.value)} style={S.input}/></Card>
        <Card title="Service Type"><select value={form.service} onChange={e=>set("service",e.target.value)} style={S.input}>{["Morning Service","Evening Service","Mid-week Service","Special Service","Youth Service","Children Service","Prayer Service"].map(s=><option key={s}>{s}</option>)}</select></Card>
        <Card title="Presiding Pastor"><select value={form.pastor} onChange={e=>set("pastor",e.target.value)} style={S.input}><option value="">— Select —</option>{(settings.pastors||[]).map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select></Card>
      </div>
      <Card title="Congregation Count" style={{ marginBottom:14 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          {cats.map((c,i)=>(
            <div key={c.id} style={{ background:`${c.color||COLS[i%COLS.length]}0d`, border:`1.5px solid ${c.color||COLS[i%COLS.length]}33`, borderRadius:10, padding:"14px 12px" }}>
              <div style={{ fontSize:12, fontWeight:600, color:c.color||COLS[i%COLS.length], marginBottom:8 }}>{c.icon} {c.label}</div>
              <input type="number" min="0" value={form[c.id]||""} onChange={e=>set(c.id,e.target.value)} placeholder="0"
                style={{ width:"100%", background:"transparent", border:"none", outline:"none", fontFamily:SANS, fontSize:34, fontWeight:800, color:c.color||COLS[i%COLS.length], padding:0, borderBottom:`2px solid ${c.color||COLS[i%COLS.length]}44` }}/>
            </div>
          ))}
        </div>
      </Card>
      <div style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:14, marginBottom:14 }}>
        <Card title="Total Count">
          <div style={{ fontSize:52, fontWeight:800, color:accent, lineHeight:1 }}>{t}</div>
          <div style={{ fontSize:11, color:DIM, marginTop:4 }}>Physical attendance</div>
        </Card>
        <Card title="Notes"><textarea value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="Service notes, highlights, special events…" style={{ ...S.input, minHeight:82, resize:"vertical" }}/></Card>
      </div>
      <button onClick={submit} disabled={busy} style={{ ...S.btn(accent,true), padding:"12px 36px", fontSize:14, opacity:busy?.7:1 }}>
        {busy?"Saving…":"💾 Save Attendance Record"}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════
function Analytics({ records, settings, accent }) {
  const cats   = settings.categories||DEFAULT_CATS;
  const sorted = [...records].sort((a,b)=>a.date.localeCompare(b.date));
  const data   = sorted.map(r=>({ d:r.date.slice(5), t:total(r), ft:+r.firstTimers||0, sw:+r.soulsWon||0, ...Object.fromEntries(cats.map(c=>[c.id,+r[c.id]||0])) }));
  const best   = records.length?records.reduce((a,b)=>total(a)>total(b)?a:b):null;
  const tFT    = records.reduce((a,r)=>a+(+r.firstTimers||0),0);
  const tSW    = records.reduce((a,r)=>a+(+r.soulsWon||0),0);
  const conv   = tFT?((tSW/tFT)*100).toFixed(1):0;
  const gData  = cats.filter(c=>CORE.includes(c.id)).map(c=>({name:c.label,value:records.reduce((a,r)=>a+(+r[c.id]||0),0)})).filter(v=>v.value>0);

  return (
    <div>
      <PageHeader title="Analytics" sub="Growth trends and insights" accent={accent}/>
      {records.length===0 ? <Card><div style={{ textAlign:"center", padding:40, color:DIM }}>No data yet — add your first attendance record.</div></Card> : (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:16 }}>
            <Stat icon="📅" label="Total Services" value={records.length}       color={accent}/>
            <Stat icon="🏆" label="Best Service"   value={best?total(best):0}   sub={best?.date} color={BLU}/>
            <Stat icon="🔄" label="Conversion"     value={`${conv}%`}           sub="1st timers → souls" color={AMB}/>
            <Stat icon="✝"  label="Souls Won"      value={tSW}                  color={PRP}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
            <Card title="Overall Trend">
              <ResponsiveContainer width="100%" height={195}>
                <LineChart data={data}>{CG}<XAxis dataKey="d" stroke="#9ca3af" tick={{fontSize:11}}/><YAxis stroke="#9ca3af" tick={{fontSize:11}}/><Tooltip {...TT}/><Line type="monotone" dataKey="t" stroke={accent} strokeWidth={2.5} dot={{fill:accent,r:3}} name="Total"/></LineChart>
              </ResponsiveContainer>
            </Card>
            <Card title="Congregation Breakdown">
              <ResponsiveContainer width="100%" height={195}>
                <PieChart><Pie data={gData} cx="50%" cy="50%" outerRadius={78} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={{stroke:"#9ca3af"}} style={{fontSize:11}}>{gData.map((_,i)=><Cell key={i} fill={COLS[i%COLS.length]}/>)}</Pie><Tooltip {...TT}/></PieChart>
              </ResponsiveContainer>
            </Card>
          </div>
          <Card title="First Timers & Souls Won">
            <ResponsiveContainer width="100%" height={175}>
              <BarChart data={data}>{CG}<XAxis dataKey="d" stroke="#9ca3af" tick={{fontSize:11}}/><YAxis stroke="#9ca3af" tick={{fontSize:11}}/><Tooltip {...TT}/><Legend wrapperStyle={{fontSize:11,color:DIM}}/><Bar dataKey="ft" fill="#db2777" name="First Timers" radius={[4,4,0,0]} maxBarSize={30}/><Bar dataKey="sw" fill={PRP} name="Souls Won" radius={[4,4,0,0]} maxBarSize={30}/></BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ALL RECORDS
// ═══════════════════════════════════════════════════════════════
function AllRecords({ records, settings, accent, user, onDelete }) {
  const cats   = settings.categories||DEFAULT_CATS;
  const sorted = [...records].sort((a,b)=>b.date.localeCompare(a.date));
  const [q, setQ] = useState("");
  const filtered = sorted.filter(r => !q || r.date.includes(q)||(r.service||"").toLowerCase().includes(q.toLowerCase())||(r.pastor||"").toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title="All Records" sub={`${records.length} records in database`} accent={accent}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="🔍 Search records…" style={{ ...S.input, width:240, fontSize:13 }}/>
      </PageHeader>
      <Card>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:`2px solid ${G3}` }}>
                {["Date","Service","Pastor","Total",...cats.map(c=>c.label),can(user,"records.delete")?"":""].map((h,i)=>(
                  <th key={i} style={{ padding:"10px 10px", color:G6, textAlign:"left", fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:0.5, whiteSpace:"nowrap", background:G5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length===0
                ? <tr><td colSpan={20} style={{ textAlign:"center", padding:40, color:DIM }}>No records found</td></tr>
                : filtered.map((r,idx)=>(
                  <tr key={r.id} style={{ borderBottom:`1px solid ${G3}`, background:idx%2===0?WHT:G5, transition:"background .12s" }}
                    onMouseEnter={e=>e.currentTarget.style.background=G3} onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?WHT:G5}>
                    <td style={{ padding:"10px 10px", fontWeight:600, color:TXT }}>{r.date}</td>
                    <td style={{ padding:"10px 10px", color:DIM }}>{r.service}</td>
                    <td style={{ padding:"10px 10px", color:DIM }}>{r.pastor||"—"}</td>
                    <td style={{ padding:"10px 10px", fontWeight:800, color:accent, fontSize:16 }}>{total(r)}</td>
                    {cats.map(c=><td key={c.id} style={{ padding:"10px 10px", color:c.color, fontWeight:600 }}>{r[c.id]||0}</td>)}
                    {can(user,"records.delete") && <td style={{ padding:"10px 10px" }}><button onClick={()=>{if(window.confirm("Delete this record?"))onDelete(r.id);}} style={{ background:"#fef2f2", border:"1px solid #fecaca", color:RED, borderRadius:6, padding:"3px 10px", cursor:"pointer", fontSize:12, fontWeight:600 }}>Delete</button></td>}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════
function Reports({ records, settings, accent }) {
  const cats = settings.categories||DEFAULT_CATS;
  const [range, setRange] = useState("all");
  const filtered = range==="all"?records:records.filter(r=>{
    const d=new Date(r.date),now=new Date();
    return range==="month"?d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear():d.getFullYear()===now.getFullYear();
  });
  const tAtt=filtered.reduce((a,r)=>a+total(r),0),tFT=filtered.reduce((a,r)=>a+(+r.firstTimers||0),0),tSW=filtered.reduce((a,r)=>a+(+r.soulsWon||0),0),avg=filtered.length?Math.round(tAtt/filtered.length):0;
  const csv=()=>{const h=["Date","Service","Pastor",...cats.map(c=>c.label),"Total","Notes"];const rows=[...filtered].sort((a,b)=>b.date.localeCompare(a.date)).map(r=>[r.date,r.service,r.pastor||"",...cats.map(c=>r[c.id]||0),total(r),`"${(r.notes||"").replace(/"/g,"'")}"`]);const blob=new Blob([[h,...rows].map(r=>r.join(",")).join("\n")],{type:"text/csv"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`attendance_${new Date().toISOString().slice(0,10)}.csv`;a.click();};
  const print=()=>{const w=window.open("","_blank");w.document.write(`<!DOCTYPE html><html><head><style>body{font-family:sans-serif;margin:30px}h1{color:#16a34a}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#16a34a;color:#fff;padding:8px;text-align:left}td{padding:7px 8px;border-bottom:1px solid #dcfce7}tr:nth-child(even){background:#f0fdf4}</style></head><body><h1>⛪ ${settings.churchName} — Attendance Report</h1><p>Period: ${range} | Generated: ${new Date().toLocaleString()}</p><p>Total: ${tAtt} | Avg: ${avg} | First Timers: ${tFT} | Souls Won: ${tSW}</p><table><thead><tr><th>Date</th><th>Service</th><th>Pastor</th>${cats.map(c=>`<th>${c.label}</th>`).join("")}<th>Total</th></tr></thead><tbody>${[...filtered].sort((a,b)=>b.date.localeCompare(a.date)).map(r=>`<tr><td>${r.date}</td><td>${r.service}</td><td>${r.pastor||"—"}</td>${cats.map(c=>`<td>${r[c.id]||0}</td>`).join("")}<td><b>${total(r)}</b></td></tr>`).join("")}</tbody></table></body></html>`);w.document.close();setTimeout(()=>w.print(),300);};

  return (
    <div>
      <PageHeader title="Reports" sub="Export and print attendance data" accent={accent}/>
      <Card title="Export Options" style={{ marginBottom:16 }}>
        <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
          <select value={range} onChange={e=>setRange(e.target.value)} style={{ ...S.input, width:"auto" }}>
            <option value="all">All Time</option><option value="month">This Month</option><option value="year">This Year</option>
          </select>
          <button onClick={csv}   style={S.btn(BLU,true)}>📥 Download CSV</button>
          <button onClick={print} style={S.btn(accent,true)}>🖨 Print / PDF</button>
          <button onClick={downloadBackup} style={S.btn(AMB,true)}>📦 Full Backup</button>
        </div>
      </Card>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
        <Stat icon="📅" label="Services"     value={filtered.length} color={accent}/>
        <Stat icon="👥" label="Total Att."   value={tAtt}            color={BLU}/>
        <Stat icon="🌟" label="First Timers" value={tFT}             color="#db2777"/>
        <Stat icon="✝"  label="Souls Won"    value={tSW}             color={PRP}/>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TEAM / PASTORS
// ═══════════════════════════════════════════════════════════════
function Pastors({ settings, accent, onSave }) {
  const [list,  setList]  = useState(settings.pastors||[]);
  const [form,  setForm]  = useState({ name:"", role:"Senior Pastor", email:"", phone:"" });
  const [edit,  setEdit]  = useState(null);
  const [toast, setToast] = useState(null);
  const ROLES_LIST = ["Senior Pastor","Assistant Pastor","Associate Pastor","Youth Pastor","Children Pastor","Administrator","Deacon","Deaconess","Usher Coordinator","Worship Leader","Secretary","Elder"];
  const setF=(k,v)=>setForm(f=>({...f,[k]:v}));
  const save=async()=>{if(!form.name.trim())return;const u=edit?list.map(p=>p.id===edit?{...p,...form}:p):[...list,{...form,id:Date.now()}];setList(u);await onSave({...settings,pastors:u});setToast("Saved!");setEdit(null);setForm({name:"",role:"Senior Pastor",email:"",phone:""});setTimeout(()=>setToast(null),3000);};
  const del=async id=>{const u=list.filter(p=>p.id!==id);setList(u);await onSave({...settings,pastors:u});};

  return (
    <div>
      <PageHeader title="Team" sub="Pastors & Administrators" accent={accent}/>
      {toast && <Toast msg={toast}/>}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1.8fr", gap:16, alignItems:"start" }}>
        <Card title={edit?"Edit Member":"Add Member"}>
          <Field label="Full Name"><input value={form.name} onChange={e=>setF("name",e.target.value)} placeholder="Rev. James Mensah" style={S.input}/></Field>
          <Field label="Role"><select value={form.role} onChange={e=>setF("role",e.target.value)} style={S.input}>{ROLES_LIST.map(r=><option key={r}>{r}</option>)}</select></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={e=>setF("email",e.target.value)} placeholder="pastor@church.org" style={S.input}/></Field>
          <Field label="Phone"><input value={form.phone} onChange={e=>setF("phone",e.target.value)} placeholder="+233 24 000 0000" style={S.input}/></Field>
          <div style={{ display:"flex", gap:8, marginTop:4 }}>
            <button onClick={save} style={{ ...S.btn(accent,true), flex:1 }}>{edit?"✓ Update":"+ Add Member"}</button>
            {edit && <button onClick={()=>{setEdit(null);setForm({name:"",role:"Senior Pastor",email:"",phone:""});}} style={S.btn(DIM,false)}>Cancel</button>}
          </div>
        </Card>
        <Card title={`Team Members (${list.length})`}>
          {list.length===0 ? <div style={{ textAlign:"center", padding:28, color:DIM }}>No team members yet</div> : list.map(p=>(
            <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", marginBottom:8, background:G5, border:`1px solid ${G4}`, borderRadius:10 }}>
              <div style={{ width:44, height:44, borderRadius:10, background:G3, border:`1px solid ${G4}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>🧑‍💼</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, color:TXT, fontSize:14 }}>{p.name}</div>
                <div style={{ fontSize:12, color:G1, fontWeight:500, marginTop:1 }}>{p.role}</div>
                {(p.email||p.phone) && <div style={{ fontSize:12, color:DIM, marginTop:2 }}>{p.email&&<span style={{marginRight:8}}>✉ {p.email}</span>}{p.phone&&<span>📞 {p.phone}</span>}</div>}
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={()=>{setForm({name:p.name,role:p.role,email:p.email||"",phone:p.phone||""});setEdit(p.id);}} style={{ ...S.btn(accent,false), padding:"5px 12px", fontSize:12 }}>Edit</button>
                <button onClick={()=>del(p.id)} style={{ ...S.btn(RED,false), padding:"5px 10px", fontSize:12 }}>✕</button>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HIKVISION PAGE
// ═══════════════════════════════════════════════════════════════
function HikvisionPage({ settings, accent, onSave }) {
  const hik = settings.hikvision || {};
  const [cfg,   setCfg]   = useState({ ip:hik.ip||"", port:hik.port||"80", username:hik.username||"admin", password:hik.password||"", label:hik.label||"Main Entrance" });
  const [tab,   setTab]   = useState("setup");
  const [log,   setLog]   = useState([]);
  const [busy,  setBusy]  = useState(false);
  const [toast, setToast] = useState(null);
  const [autoOn,setAutoOn]= useState(false);
  const [autoSec,setAutoSec]=useState(hik.autoInterval||30);
  const [events,setEvents]= useState([]);
  const [userMap,setUserMap]=useState(hik.userMap||[]);

  const addLog = (msg, type="info") => setLog(l => [{ time:new Date().toLocaleTimeString(), msg, type }, ...l].slice(0,50));

  const callDevice = async (endpoint, method="GET", body=null) => {
    const res = await fetch(`/.netlify/functions/hikvision`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ ip:cfg.ip, port:cfg.port, username:cfg.username, password:cfg.password, endpoint, method, body })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  const testConnection = async () => {
    if (!cfg.ip) { setToast({msg:"Enter device IP first.", type:"warn"}); return; }
    setBusy(true); addLog("Testing connection…");
    try {
      await callDevice("/ISAPI/System/deviceInfo");
      addLog("✅ Connected successfully!", "success");
      setToast({msg:"Connected to Hikvision device!"});
    } catch(e) {
      addLog(`❌ Connection failed: ${e.message}`, "error");
      setToast({msg:"Connection failed. Check IP and credentials.", type:"err"});
    }
    setBusy(false); setTimeout(()=>setToast(null),4000);
  };

  const fetchEvents = async () => {
    setBusy(true); addLog("Fetching attendance events…");
    try {
      const today = new Date().toISOString().split("T")[0];
      const data  = await callDevice("/ISAPI/AccessControl/AcsEvent?format=json","POST",{ AcsEventCond:{ searchID:"1", searchResultPosition:0, maxResults:50, major:0, minor:0, startTime:`${today}T00:00:00`, endTime:`${today}T23:59:59` }});
      const evts  = data?.AcsEvent?.InfoList || [];
      setEvents(evts);
      addLog(`✅ Fetched ${evts.length} events for today.`, "success");
    } catch(e) {
      addLog(`❌ Failed to fetch events: ${e.message}`, "error");
    }
    setBusy(false);
  };

  const saveCfg = async () => {
    const updated = { ...settings, hikvision:{ ...settings.hikvision, ...cfg, autoInterval:autoSec, userMap } };
    await onSave(updated);
    setToast({msg:"Device settings saved!"}); setTimeout(()=>setToast(null),3000);
  };

  const TABS = [
    { id:"setup",   label:"⚙️ Device Setup"   },
    { id:"sync",    label:"🔄 Sync Controls"  },
    { id:"mapping", label:"👥 User Mapping"   },
    { id:"log",     label:"📋 Event Log"      },
  ];

  const logColor = t => t==="error"?RED:t==="success"?G1:t==="warn"?AMB:DIM;

  return (
    <div>
      <PageHeader title="Hikvision Integration" sub="Link your access control device to auto-sync attendance" accent={accent}/>
      {toast && <Toast msg={toast.msg} type={toast.type}/>}

      {/* Status bar */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, padding:"10px 16px", background:cfg.ip?G3:"#fef9c3", border:`1px solid ${cfg.ip?G4:"#fde68a"}`, borderRadius:10, fontSize:13 }}>
        <span style={{ width:8, height:8, borderRadius:"50%", background:cfg.ip?G1:AMB, display:"inline-block" }}/>
        {cfg.ip ? <span style={{ color:G6, fontWeight:500 }}>Device: <strong>{cfg.label}</strong> at <code style={{background:G3,padding:"1px 6px",borderRadius:4}}>{cfg.ip}:{cfg.port}</code></span>
          : <span style={{ color:AMB, fontWeight:500 }}>No device configured — enter your Hikvision device IP below</span>}
        {hik.lastSync && <span style={{ marginLeft:"auto", color:DIM, fontSize:12 }}>Last sync: {hik.lastSync}</span>}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:0, marginBottom:16, background:G3, borderRadius:10, padding:4, width:"fit-content" }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:"8px 18px", border:"none", background:tab===t.id?WHT:"transparent", color:tab===t.id?G6:DIM, fontSize:13, fontWeight:tab===t.id?600:400, fontFamily:SANS, cursor:"pointer", borderRadius:8, transition:"all .12s", boxShadow:tab===t.id?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>{t.label}</button>
        ))}
      </div>

      {/* SETUP TAB */}
      {tab==="setup" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <Card title="Device Configuration">
            <Field label="Device IP Address"><input value={cfg.ip} onChange={e=>setCfg(c=>({...c,ip:e.target.value}))} placeholder="192.168.1.64" style={S.input}/></Field>
            <Field label="Port"><input value={cfg.port} onChange={e=>setCfg(c=>({...c,port:e.target.value}))} placeholder="80" style={{ ...S.input, maxWidth:120 }}/></Field>
            <Field label="Username"><input value={cfg.username} onChange={e=>setCfg(c=>({...c,username:e.target.value}))} placeholder="admin" style={S.input}/></Field>
            <Field label="Password"><input type="password" value={cfg.password} onChange={e=>setCfg(c=>({...c,password:e.target.value}))} placeholder="Device password" style={S.input}/></Field>
            <Field label="Label / Location"><input value={cfg.label} onChange={e=>setCfg(c=>({...c,label:e.target.value}))} placeholder="Main Entrance" style={S.input}/></Field>
            <div style={{ display:"flex", gap:8, marginTop:4 }}>
              <button onClick={saveCfg}       style={{ ...S.btn(accent,true), flex:1 }}>💾 Save Config</button>
              <button onClick={testConnection} disabled={busy} style={{ ...S.btn(BLU,true), flex:1 }}>{busy?"Testing…":"🔌 Test Connection"}</button>
            </div>
          </Card>
          <Card title="Setup Instructions">
            {[["1","Enable ISAPI on device","Device web UI → Configuration → Network → Advanced → Integration Protocol → Enable ISAPI"],["2","Same network","Device and this computer must be on the same WiFi/network"],["3","Port forwarding (optional)","To access remotely, set up port forwarding on your router"],["4","Test connection","Enter credentials above and click Test Connection"]].map(([n,title,desc])=>(
              <div key={n} style={{ display:"flex", gap:12, marginBottom:14 }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:G3, border:`1.5px solid ${G4}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:G1, flexShrink:0 }}>{n}</div>
                <div>
                  <div style={{ fontWeight:600, color:TXT, fontSize:13 }}>{title}</div>
                  <div style={{ fontSize:12, color:DIM, marginTop:2, lineHeight:1.6 }}>{desc}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* SYNC TAB */}
      {tab==="sync" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <Card title="Manual Sync">
            <div style={{ fontSize:13, color:DIM, marginBottom:16, lineHeight:1.7 }}>Pull today's attendance events from the Hikvision device and preview them before importing.</div>
            <button onClick={fetchEvents} disabled={busy||!cfg.ip} style={{ ...S.btn(accent,true), width:"100%", marginBottom:12 }}>{busy?"Fetching…":"📥 Pull Today's Events"}</button>
            {events.length>0 && (
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:G6, marginBottom:8 }}>{events.length} events found — preview:</div>
                <div style={{ maxHeight:200, overflowY:"auto", border:`1px solid ${G4}`, borderRadius:8 }}>
                  {events.map((e,i)=>(
                    <div key={i} style={{ display:"flex", gap:10, padding:"8px 12px", borderBottom:`1px solid ${G3}`, fontSize:12 }}>
                      <span style={{ color:DIM }}>{e.time||"—"}</span>
                      <span style={{ fontWeight:500 }}>{e.name||e.employeeNoString||`ID: ${e.cardReaderNo}`}</span>
                      <span style={{ marginLeft:"auto", color:G1, fontWeight:600 }}>{e.type||"Access"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
          <Card title="Auto Sync">
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, padding:"12px 14px", background:autoOn?G3:"#f9fafb", border:`1.5px solid ${autoOn?G4:"#e5e7eb"}`, borderRadius:10 }}>
              <div>
                <div style={{ fontWeight:600, color:TXT, fontSize:13 }}>Auto Sync</div>
                <div style={{ fontSize:12, color:DIM }}>Pull events automatically</div>
              </div>
              <button onClick={()=>setAutoOn(v=>!v)} style={{ ...S.btn(autoOn?RED:G1,true), padding:"7px 16px", fontSize:12 }}>{autoOn?"Stop":"Start"}</button>
            </div>
            <Field label="Sync interval (seconds)">
              <select value={autoSec} onChange={e=>setAutoSec(+e.target.value)} style={{ ...S.input, width:"auto" }}>
                {[15,30,60,120,300].map(s=><option key={s} value={s}>{s}s — {s<60?`every ${s} sec`:`every ${s/60} min`}</option>)}
              </select>
            </Field>
            <div style={{ fontSize:12, color:DIM, marginTop:8, background:"#fef9c3", border:"1px solid #fde68a", borderRadius:8, padding:"8px 12px" }}>
              ⚠ Auto sync works while this browser tab is open. For background sync, set up a Netlify scheduled function.
            </div>
          </Card>
        </div>
      )}

      {/* USER MAPPING TAB */}
      {tab==="mapping" && (
        <Card title="User Mapping" sub="Map Hikvision employee IDs to attendance categories">
          <div style={{ fontSize:13, color:DIM, marginBottom:16, lineHeight:1.7 }}>When the device records an event for a specific employee ID, it will automatically count them in the category you map them to.</div>
          {userMap.length===0 ? (
            <div style={{ textAlign:"center", padding:28, color:DIM, background:G5, borderRadius:8 }}>
              No mappings yet — add employee IDs from your Hikvision device
            </div>
          ) : userMap.map((m,i)=>(
            <div key={i} style={{ display:"flex", gap:10, alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${G3}` }}>
              <input value={m.empId} onChange={e=>{const u=[...userMap];u[i]={...u[i],empId:e.target.value};setUserMap(u);}} placeholder="Employee ID" style={{ ...S.input, flex:1 }}/>
              <span style={{ color:DIM }}>→</span>
              <select value={m.category} onChange={e=>{const u=[...userMap];u[i]={...u[i],category:e.target.value};setUserMap(u);}} style={{ ...S.input, flex:1 }}>
                {(settings.categories||DEFAULT_CATS).map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <button onClick={()=>setUserMap(u=>u.filter((_,j)=>j!==i))} style={{ ...S.btn(RED,false), padding:"5px 10px", fontSize:12 }}>✕</button>
            </div>
          ))}
          <div style={{ display:"flex", gap:8, marginTop:12 }}>
            <button onClick={()=>setUserMap(u=>[...u,{empId:"",category:"men"}])} style={S.btn(accent,false)}>+ Add Mapping</button>
            <button onClick={async()=>{await onSave({...settings,hikvision:{...settings.hikvision,userMap}});setToast({msg:"Mappings saved!"});setTimeout(()=>setToast(null),3000);}} style={S.btn(accent,true)}>💾 Save Mappings</button>
          </div>
        </Card>
      )}

      {/* LOG TAB */}
      {tab==="log" && (
        <Card title="Event Log" action={<button onClick={()=>setLog([])} style={{ ...S.btn(DIM,false), padding:"5px 12px", fontSize:12 }}>Clear</button>}>
          {log.length===0 ? (
            <div style={{ textAlign:"center", padding:28, color:DIM }}>No events logged yet — use Sync Controls to pull data.</div>
          ) : (
            <div style={{ fontFamily:"monospace", fontSize:12, maxHeight:400, overflowY:"auto" }}>
              {log.map((l,i)=>(
                <div key={i} style={{ display:"flex", gap:12, padding:"6px 8px", borderBottom:`1px solid ${G3}`, background:i%2===0?WHT:G5 }}>
                  <span style={{ color:DIM, flexShrink:0 }}>{l.time}</span>
                  <span style={{ color:logColor(l.type) }}>{l.msg}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// USER ACCOUNTS (Super Admin only)
// ═══════════════════════════════════════════════════════════════
function UsersPage({ accent, currentUser }) {
  const [users,  setUsers]  = useState([]);
  const [form,   setForm]   = useState({ username:"", password:"", name:"", role:"viewer", email:"" });
  const [editId, setEditId] = useState(null);
  const [toast,  setToast]  = useState(null);
  const [busy,   setBusy]   = useState(false);
  const roleOrder = ["superadmin","admin","pastor","dataentry","viewer"];

  useEffect(()=>{ loadUsers().then(setUsers).catch(console.error); },[]);

  const setF = (k,v) => setForm(f=>({...f,[k]:v}));

  const saveUser = async () => {
    if (!form.name.trim()||!form.username.trim()) { setToast({msg:"Name and username are required.",type:"err"}); return; }
    if (!editId&&!form.password) { setToast({msg:"Password is required for new users.",type:"err"}); return; }
    setBusy(true);
    try {
      if (editId) {
        const u = { name:form.name, role:form.role, email:form.email, username:form.username };
        if (form.password) u.password = form.password;
        await updateUser(editId, u);
        setUsers(list=>list.map(x=>x.id===editId?{...x,...u}:x));
        setToast({msg:"User updated successfully."});
      } else {
        const nu = await createUser(form);
        setUsers(u=>[...u,nu]);
        setToast({msg:"User created successfully."});
      }
      setForm({username:"",password:"",name:"",role:"viewer",email:""});
      setEditId(null);
    } catch(e) {
      setToast({msg:e.message.includes("unique")?"That username is already taken.":e.message, type:"err"});
    }
    setBusy(false); setTimeout(()=>setToast(null),4000);
  };

  const toggleActive = async u => {
    await updateUser(u.id,{active:!u.active});
    setUsers(l=>l.map(x=>x.id===u.id?{...x,active:!u.active}:x));
  };

  const removeUser = async id => {
    if (id===currentUser.id) { alert("You cannot delete your own account."); return; }
    if (!window.confirm("Delete this user?")) return;
    await deleteUser(id); setUsers(u=>u.filter(x=>x.id!==id));
  };

  return (
    <div>
      <PageHeader title="User Accounts" sub="Manage who can access the system and what they can do" accent={accent}/>

      {/* Role reference */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:20 }}>
        {Object.entries(ROLES).map(([key,r])=>(
          <div key={key} style={{ background:WHT, border:`1.5px solid ${r.color}33`, borderRadius:10, padding:"12px 14px", borderTop:`3px solid ${r.color}` }}>
            <div style={{ fontWeight:700, color:r.color, fontSize:13, marginBottom:4 }}>{r.icon} {r.label}</div>
            <div style={{ fontSize:11, color:DIM, lineHeight:1.5 }}>{r.description}</div>
          </div>
        ))}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type}/>}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:16, alignItems:"start" }}>
        {/* Form */}
        <Card title={editId?"Edit User":"Create New User"}>
          <Field label="Full Name"><input value={form.name} onChange={e=>setF("name",e.target.value)} placeholder="Rev. John Smith" style={S.input}/></Field>
          <Field label="Username"><input value={form.username} onChange={e=>setF("username",e.target.value)} placeholder="johnsmith" style={S.input}/></Field>
          <Field label={editId?"New Password (blank = keep current)":"Password"}>
            <input type="password" value={form.password} onChange={e=>setF("password",e.target.value)} placeholder={editId?"Leave blank to keep current":"Set a password"} style={S.input}/>
          </Field>
          <Field label="Role">
            <select value={form.role} onChange={e=>setF("role",e.target.value)} style={S.input}>
              {roleOrder.map(r=><option key={r} value={r}>{ROLES[r]?.label}</option>)}
            </select>
          </Field>
          <Field label="Email (optional)"><input type="email" value={form.email} onChange={e=>setF("email",e.target.value)} placeholder="user@church.org" style={S.input}/></Field>

          {/* Permission preview */}
          <div style={{ background:G5, border:`1px solid ${G4}`, borderRadius:8, padding:"10px 12px", marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color:G6, marginBottom:8, textTransform:"uppercase", letterSpacing:0.5 }}>Permissions Preview</div>
            {[["Dashboard",can({role:form.role},"dashboard")],["Record Attendance",can({role:form.role},"entry")],["Analytics",can({role:form.role},"analytics")],["All Records",can({role:form.role},"records")],["Delete Records",can({role:form.role},"records.delete")],["Reports",can({role:form.role},"reports")],["Team / Pastors",can({role:form.role},"pastors")],["Settings",can({role:form.role},"settings.general")],["User Management",can({role:form.role},"*")]].map(([label,allowed])=>(
              <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:`1px solid ${G3}` }}>
                <span style={{ fontSize:12, color:DIM }}>{label}</span>
                <span style={{ fontSize:12, fontWeight:600, color:allowed?G1:RED }}>{allowed?"✓ Yes":"✗ No"}</span>
              </div>
            ))}
          </div>

          <div style={{ display:"flex", gap:8 }}>
            <button onClick={saveUser} disabled={busy} style={{ ...S.btn(accent,true), flex:1 }}>{editId?"✓ Update User":"+ Create User"}</button>
            {editId && <button onClick={()=>{setEditId(null);setForm({username:"",password:"",name:"",role:"viewer",email:""});}} style={S.btn(DIM,false)}>Cancel</button>}
          </div>
        </Card>

        {/* User list */}
        <Card title={`All Users (${users.length})`}>
          {users.length===0 ? <div style={{ textAlign:"center", padding:28, color:DIM }}>No users found</div> : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[...users].sort((a,b)=>roleOrder.indexOf(a.role)-roleOrder.indexOf(b.role)).map(u=>{
                const r = ROLES[u.role];
                const isMe = u.id===currentUser.id;
                return (
                  <div key={u.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", background:WHT, border:`1.5px solid ${G4}`, borderRadius:10, opacity:u.active?1:0.5, borderLeft:`4px solid ${r?.color||G1}` }}>
                    <div style={{ width:44, height:44, borderRadius:10, background:`${r?.color||G1}18`, border:`1.5px solid ${r?.color||G1}33`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{r?.icon||"?"}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap" }}>
                        <span style={{ fontWeight:700, color:TXT, fontSize:14 }}>{u.name}</span>
                        {isMe && <Badge color={G1}>You</Badge>}
                        {!u.active && <Badge color={RED}>Disabled</Badge>}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:3 }}>
                        <code style={{ fontSize:12, color:DIM }}>@{u.username}</code>
                        <RoleBadge role={u.role}/>
                      </div>
                      {u.email && <div style={{ fontSize:12, color:DIM, marginTop:2 }}>✉ {u.email}</div>}
                      {u.last_login && <div style={{ fontSize:11, color:DIM, marginTop:2 }}>Last login: {new Date(u.last_login).toLocaleString()}</div>}
                    </div>
                    {!isMe && (
                      <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                        <button onClick={()=>{ setForm({name:u.name,role:u.role,email:u.email||"",phone:u.phone||"",username:u.username,password:""}); setEditId(u.id); }} style={{ ...S.btn(accent,false), padding:"5px 12px", fontSize:12 }}>Edit</button>
                        <button onClick={()=>toggleActive(u)} style={{ ...S.btn(u.active?AMB:G1,false), padding:"5px 12px", fontSize:12 }}>{u.active?"Disable":"Enable"}</button>
                        <button onClick={()=>removeUser(u.id)} style={{ ...S.btn(RED,false), padding:"5px 10px", fontSize:12 }}>✕</button>
                      </div>
                    )}
                    {isMe && <span style={{ fontSize:12, color:DIM, fontStyle:"italic" }}>Current session</span>}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════
function SettingsPage({ settings, accent, user, onSave }) {
  const [form,  setForm]  = useState({ ...settings, categories:settings.categories||DEFAULT_CATS });
  const [tab,   setTab]   = useState("general");
  const [toast, setToast] = useState(null);
  const [busy,  setBusy]  = useState(false);
  const [newCat,setNewCat]= useState({ label:"", icon:"📌", color:G1 });
  const setF=(k,v)=>setForm(f=>({...f,[k]:v}));
  const save=async(extra={})=>{setBusy(true);const m={...form,...extra};setForm(m);await onSave(m);setToast("Settings saved!");setBusy(false);setTimeout(()=>setToast(null),3000);};
  const addCat=()=>{if(!newCat.label.trim())return;setForm(f=>({...f,categories:[...f.categories,{id:"c_"+Date.now(),...newCat,locked:false}]}));setNewCat({label:"",icon:"📌",color:G1});};
  const delCat=id=>setForm(f=>({...f,categories:f.categories.filter(c=>c.id!==id)}));
  const moveCat=(id,dir)=>{const a=[...form.categories];const i=a.findIndex(c=>c.id===id);const j=i+dir;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];setForm(f=>({...f,categories:a}));};
  const visibleTabs = SETTINGS_TABS.filter(t=>can(user,t.perm));

  return (
    <div>
      <PageHeader title="Settings" sub="Changes are saved to Supabase and sync everywhere" accent={accent}/>
      {toast && <Toast msg={toast}/>}
      <div style={{ display:"flex", gap:2, marginBottom:18, borderBottom:`2px solid ${G3}` }}>
        {visibleTabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:"9px 18px", border:"none", background:"transparent", cursor:"pointer", color:tab===t.id?accent:DIM, fontSize:13, fontWeight:tab===t.id?600:400, fontFamily:SANS, borderBottom:tab===t.id?`2px solid ${accent}`:"2px solid transparent", transition:"all .12s", marginBottom:-2 }}>{t.label}</button>
        ))}
      </div>

      {tab==="general" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <Card title="Church Identity">
            <Field label="Church Name"><input value={form.churchName} onChange={e=>setF("churchName",e.target.value)} style={S.input}/></Field>
            <Field label="Accent Color">
              <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                <input type="color" value={form.accentColor||G1} onChange={e=>setF("accentColor",e.target.value)} style={{ width:44, height:36, border:`1.5px solid ${G4}`, borderRadius:8, cursor:"pointer" }}/>
                <span style={{ fontSize:13, color:form.accentColor||G1, fontWeight:600 }}>Preview accent colour</span>
              </div>
            </Field>
          </Card>
          <Card title="System Status">
            {[["🟢","Database","Supabase ✓",G1],["🔐","Access Control","Role-Based ✓",G1],["🏷️","Categories",`${form.categories.length} total`,BLU],["👥","Team",`${(settings.pastors||[]).length} members`,AMB]].map(([icon,k,v,c])=>(
              <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${G3}` }}>
                <span style={{ fontSize:13, color:DIM }}>{icon} {k}</span>
                <span style={{ fontSize:13, fontWeight:600, color:c }}>{v}</span>
              </div>
            ))}
          </Card>
          <button onClick={()=>save()} disabled={busy} style={{ ...S.btn(accent,true), padding:"11px 28px" }}>{busy?"Saving…":"💾 Save Settings"}</button>
        </div>
      )}
      {tab==="background" && (
        <Card title="Background Image">
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8, marginBottom:14 }}>
            {BG_PRESETS.map(p=><button key={p.value} onClick={()=>setF("bg",p.value)} style={{ height:72, borderRadius:8, cursor:"pointer", padding:0, overflow:"hidden", border:form.bg===p.value?`3px solid ${accent}`:`2px solid ${G4}`, backgroundImage:`linear-gradient(rgba(0,0,0,0.35),rgba(0,0,0,0.35)),url(${p.value})`, backgroundSize:"cover", backgroundPosition:"center", color:WHT, fontSize:11, fontWeight:700 }}>{p.label}</button>)}
          </div>
          <Field label="Custom Image URL"><input value={form.bg} onChange={e=>setF("bg",e.target.value)} placeholder="https://…" style={S.input}/></Field>
          <button onClick={()=>save()} disabled={busy} style={{ ...S.btn(accent,true), marginTop:8 }}>{busy?"Saving…":"💾 Save Background"}</button>
        </Card>
      )}
      {tab==="categories" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1.6fr", gap:16, alignItems:"start" }}>
          <Card title="Add Custom Category">
            <Field label="Category Name"><input value={newCat.label} onChange={e=>setNewCat(c=>({...c,label:e.target.value}))} placeholder="e.g. Choir…" style={S.input}/></Field>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Field label="Icon"><input value={newCat.icon} onChange={e=>setNewCat(c=>({...c,icon:e.target.value}))} style={{ ...S.input, fontSize:20, width:60 }} maxLength={2}/></Field>
              <Field label="Colour"><input type="color" value={newCat.color} onChange={e=>setNewCat(c=>({...c,color:e.target.value}))} style={{ width:60, height:40, border:`1.5px solid ${G4}`, borderRadius:8, cursor:"pointer" }}/></Field>
            </div>
            <button onClick={addCat} style={{ ...S.btn(accent,true), width:"100%", marginTop:4 }}>+ Add Category</button>
            <div style={{ display:"flex", gap:8, marginTop:10 }}>
              <button onClick={()=>save()} disabled={busy} style={{ ...S.btn(G1,true), flex:1 }}>{busy?"Saving…":"💾 Save All"}</button>
              <button onClick={()=>setForm(f=>({...f,categories:[...DEFAULT_CATS]}))} style={{ ...S.btn(DIM,false), flex:1 }}>↺ Reset</button>
            </div>
          </Card>
          <Card title={`Categories (${form.categories.length})`}>
            {form.categories.map((c,i)=>(
              <div key={c.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:`1px solid ${G3}` }}>
                <span style={{ fontSize:18, width:26 }}>{c.icon}</span>
                <div style={{ width:12, height:12, borderRadius:"50%", background:c.color, flexShrink:0, border:`2px solid ${c.color}55` }}/>
                <span style={{ flex:1, fontSize:13, color:TXT, fontWeight:500 }}>{c.label}</span>
                {c.locked ? <Badge color={DIM}>built-in</Badge> : (
                  <div style={{ display:"flex", gap:4 }}>
                    <button onClick={()=>moveCat(c.id,-1)} disabled={i===0} style={{ ...S.btn(DIM,false), padding:"2px 8px", fontSize:12 }}>↑</button>
                    <button onClick={()=>moveCat(c.id,1)} disabled={i===form.categories.length-1} style={{ ...S.btn(DIM,false), padding:"2px 8px", fontSize:12 }}>↓</button>
                    <button onClick={()=>delCat(c.id)} style={{ ...S.btn(RED,false), padding:"2px 8px", fontSize:12 }}>✕</button>
                  </div>
                )}
              </div>
            ))}
          </Card>
        </div>
      )}
      {tab==="password" && (
        <Card title="Password System" style={{ maxWidth:480 }}>
          <div style={{ background:"#fef9c3", border:"1px solid #fde68a", borderRadius:8, padding:"12px 14px", fontSize:13, color:AMB, lineHeight:1.7 }}>
            ⚠ The single-password system has been replaced by Role-Based Access Control.<br/>
            <span style={{ color:DIM }}>Manage all user passwords in the </span><strong style={{color:TXT}}>User Accounts</strong><span style={{ color:DIM }}> page (Super Admin only).</span>
          </div>
        </Card>
      )}
    </div>
  );
}
