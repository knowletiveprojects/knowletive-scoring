"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { studentLogin } from "@/lib/api"
import Image from "next/image"

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<"faculty" | "student">("faculty")
  const [facultyUser, setFacultyUser] = useState("")
  const [facultyPass, setFacultyPass] = useState("")
  const [studentEmail, setStudentEmail] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleFacultyLogin = () => {
    setError("")
    if (!facultyUser || !facultyPass) return setError("Please fill in all fields.")
    if (facultyUser === "admin" && facultyPass === "admin123") {
      localStorage.setItem("faculty_auth", "true")
      router.replace("/faculty")
    } else {
      setError("Invalid username or password.")
    }
  }

  const handleStudentLogin = async () => {
    setError("")
    if (!studentEmail) return setError("Please enter your email.")
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(studentEmail)) return setError("Enter a valid email address.")
    setLoading(true)
    try {
      const res = await studentLogin(studentEmail)
      localStorage.setItem("student", JSON.stringify(res.data))
      router.replace("/student")
    } catch {
      setError("No student found with this email.")
    }
    setLoading(false)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Outfit:wght@400;500;600;700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes fadeUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes floatY  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes shimmer { 0%{left:-100%} 60%,100%{left:160%} }
        @keyframes rotSlow { to{transform:rotate(360deg)} }
        @keyframes pdot    { 0%,100%{opacity:.8;transform:scale(1)} 50%{opacity:.25;transform:scale(.65)} }

        .f1{animation:fadeUp .65s cubic-bezier(.16,1,.3,1) .00s both}
        .f2{animation:fadeUp .65s cubic-bezier(.16,1,.3,1) .10s both}
        .f3{animation:fadeUp .65s cubic-bezier(.16,1,.3,1) .18s both}
        .f4{animation:fadeUp .65s cubic-bezier(.16,1,.3,1) .26s both}
        .f5{animation:fadeUp .65s cubic-bezier(.16,1,.3,1) .34s both}

        /* page shell — KEY: fixed two-column layout */
        .page {
          min-height: 100vh;
          display: flex;
          flex-direction: row;
          font-family: 'DM Sans', sans-serif;
        }

        /* LEFT — takes remaining space */
        .lp {
          flex: 1 1 0%;
          min-width: 0;
          position: relative;
          overflow: hidden;
          padding: 44px 52px;
          display: flex;
          flex-direction: column;
          background: linear-gradient(150deg, #020c18 0%, #041e2e 30%, #052028 60%, #040e18 100%);
        }

        /* RIGHT — fixed 440px, never shrinks */
        .rp {
          width: 440px;
          flex-shrink: 0;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 44px 40px;
          border-left: 1px solid #e0f2f1;
          position: relative;
          overflow-y: auto;
        }

        /* background decorations */
        .geo {
          position: absolute; border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.055);
          animation: rotSlow linear infinite;
          pointer-events: none;
        }
        .fdot {
          position: absolute; border-radius: 50%;
          animation: floatY ease-in-out infinite;
          pointer-events: none;
        }
        .pdot {
          position: absolute; border-radius: 50%;
          animation: pdot ease-in-out infinite;
          pointer-events: none;
        }

        /* stat bar */
        .stat-bar {
          display: grid; grid-template-columns: repeat(4,1fr);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; overflow: hidden;
          background: rgba(255,255,255,0.03);
          margin: 28px 0;
        }
        .stat-cell {
          padding: 16px 10px; text-align: center;
          border-right: 1px solid rgba(255,255,255,0.07);
        }
        .stat-cell:last-child { border-right: none; }
        .sn { font-family:'Outfit',sans-serif; font-size:24px; font-weight:800; color:#fff; line-height:1; }
        .sl { font-size:9px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:rgba(255,255,255,0.28); margin-top:5px; }

        /* pills */
        .pills { display:flex; flex-wrap:wrap; gap:8px; margin-top:22px; }
        .pill {
          display:inline-flex; align-items:center; gap:6px;
          padding:5px 13px; border-radius:20px;
          border:1px solid rgba(255,255,255,0.09);
          background:rgba(255,255,255,0.04);
          font-size:12px; font-weight:600; color:rgba(255,255,255,0.5);
        }
        .pdot2 { width:6px; height:6px; border-radius:50%; }

        /* feature rows */
        .feat {
          display:flex; align-items:center; gap:15px;
          padding:15px 18px;
          background:rgba(255,255,255,0.025);
          border:1px solid rgba(255,255,255,0.055);
          border-radius:14px; margin-bottom:9px;
          transition:all .2s; cursor:default;
        }
        .feat:hover { background:rgba(255,255,255,0.05); border-color:rgba(255,255,255,0.1); transform:translateX(5px); }
        .fico { width:40px; height:40px; border-radius:11px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:19px; }

        /* right panel */
        .r-input {
          width:100%; padding:13px 16px 13px 44px;
          border:1.5px solid #e2e8f0; border-radius:12px;
          font-size:14px; font-family:'DM Sans',sans-serif;
          color:#1e293b; background:#f8fafc;
          outline:none; transition:all .22s;
        }
        .r-input::placeholder { color:#adb5c7; }
        .r-input:focus { border-color:#14b8a6; background:#fff; box-shadow:0 0 0 4px rgba(20,184,166,0.1); }
        .r-lbl { font-size:11px; font-weight:700; color:#64748b; letter-spacing:.9px; text-transform:uppercase; display:block; margin-bottom:7px; }
        .r-ico { position:absolute; left:14px; top:50%; transform:translateY(-50%); font-size:15px; color:#adb5c7; pointer-events:none; }

        .tab-wrap { background:#f1f5f9; border-radius:12px; padding:4px; display:flex; width:100%; margin-bottom:24px; }
        .rtab { flex:1; padding:10px; border-radius:9px; border:none; cursor:pointer; font-weight:600; font-size:13px; font-family:'DM Sans',sans-serif; transition:all .22s; }
        .rtab-on { background:linear-gradient(135deg,#0d9488,#0891b2); color:#fff; box-shadow:0 4px 14px rgba(13,148,136,0.35); }
        .rtab-off { background:transparent; color:#94a3b8; }
        .rtab-off:hover { color:#475569; }

        .sbtn {
          width:100%; padding:14px; border-radius:13px; border:none;
          cursor:pointer; font-weight:700; font-size:15px; font-family:'DM Sans',sans-serif;
          background:linear-gradient(135deg,#0d9488,#0891b2);
          color:#fff; box-shadow:0 6px 24px rgba(13,148,136,0.38);
          transition:all .25s; position:relative; overflow:hidden;
        }
        .sbtn:hover { transform:translateY(-2px); box-shadow:0 10px 32px rgba(13,148,136,0.48); }
        .sbtn:active { transform:translateY(0); }
        .sbtn:disabled { opacity:.55; cursor:not-allowed; transform:none!important; }
        .sbtn-v { background:linear-gradient(135deg,#6366f1,#8b5cf6); box-shadow:0 6px 24px rgba(99,102,241,0.38); }
        .sbtn-v:hover { box-shadow:0 10px 32px rgba(99,102,241,0.48); }
        .shine { position:absolute; top:0; left:-100%; width:50%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent); animation:shimmer 2.8s ease-in-out infinite; }

        .err { background:#fef2f2; border:1.5px solid #fecaca; border-radius:10px; padding:11px 14px; color:#dc2626; font-size:13px; font-weight:500; display:flex; align-items:center; gap:8px; }

        .trust { display:flex; align-items:center; justify-content:center; gap:18px; padding:11px 14px; background:linear-gradient(135deg,#f0fdfa,#f0f9ff); border:1px solid #ccfbf1; border-radius:11px; margin-bottom:22px; }
        .trust-i { display:flex; align-items:center; gap:5px; font-size:11px; font-weight:600; color:#0f766e; }

        /* top accent bar on right panel */
        .rp-accent { position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg,#14b8a6,#06b6d4,#6366f1); }

        @media(max-width:900px){
          .lp { display:none!important; }
          .rp { width:100%!important; }
        }
      `}</style>

      <div className="page">

        {/* ══════════════ LEFT DARK PANEL ══════════════ */}
        <div className="lp">

          {/* teal mesh blobs */}
          <div style={{position:"absolute",width:580,height:580,borderRadius:"50%",background:"radial-gradient(circle,rgba(20,184,166,0.13) 0%,transparent 65%)",top:-200,left:-160,filter:"blur(70px)",pointerEvents:"none"}}/>
          <div style={{position:"absolute",width:440,height:440,borderRadius:"50%",background:"radial-gradient(circle,rgba(6,182,212,0.1) 0%,transparent 65%)",bottom:-130,right:-90,filter:"blur(70px)",pointerEvents:"none"}}/>
          <div style={{position:"absolute",width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,0.09) 0%,transparent 65%)",top:"38%",left:"60%",filter:"blur(50px)",pointerEvents:"none"}}/>

          {/* dot-grid texture */}
          <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(rgba(255,255,255,0.032) 1px,transparent 1px)",backgroundSize:"28px 28px",pointerEvents:"none"}}/>

          {/* rotating rings */}
          <div className="geo" style={{width:300,height:300,top:-70,right:-70,animationDuration:"28s",border:"1px solid rgba(20,184,166,0.07)"}}/>
          <div className="geo" style={{width:180,height:180,bottom:50,left:-55,animationDuration:"20s",animationDirection:"reverse",border:"1px solid rgba(6,182,212,0.06)"}}/>

          {/* diagonal accent line */}
          <div style={{position:"absolute",top:0,right:90,width:"1px",height:"100%",background:"linear-gradient(to bottom,transparent,rgba(20,184,166,0.1),transparent)",pointerEvents:"none"}}/>

          {/* pulsing dots */}
          <div className="pdot" style={{width:7,height:7,background:"#2dd4bf",top:"19%",left:"57%",animationDuration:"3.4s",opacity:.75}}/>
          <div className="pdot" style={{width:4,height:4,background:"#06b6d4",top:"52%",left:"79%",animationDuration:"5s",animationDelay:"1.2s",opacity:.5}}/>
          <div className="pdot" style={{width:5,height:5,background:"#818cf8",top:"74%",left:"41%",animationDuration:"4.2s",animationDelay:".8s",opacity:.45}}/>
          <div className="pdot" style={{width:3,height:3,background:"#34d399",top:"34%",left:"31%",animationDuration:"6s",animationDelay:"2s",opacity:.4}}/>

          {/* Brand */}
          <div className="f1" style={{marginBottom:48,position:"relative",zIndex:2}}>
            <div style={{
              fontFamily:"'Syne',sans-serif",
              fontWeight:800,
              fontSize:"clamp(26px,2.6vw,36px)",
              letterSpacing:"-1px",
              lineHeight:1,
              background:"linear-gradient(135deg,#fff 0%,#e0f2fe 50%,#99f6e4 100%)",
              WebkitBackgroundClip:"text",
              WebkitTextFillColor:"transparent",
              backgroundClip:"text",
            }}>Knowletive</div>
            <div style={{
              fontSize:13,
              fontWeight:600,
              letterSpacing:"2px",
              textTransform:"uppercase",
              color:"rgba(255,255,255,0.6)",
              marginTop:7,
            }}>Training Minds, Placing Talents</div>
          </div>

          {/* Headline */}
          <div className="f2" style={{position:"relative",zIndex:2,marginBottom:0}}>
            {/* Line 1: "Track Student" — normal weight, slightly smaller */}
            <div style={{
              fontFamily:"'Syne',sans-serif",
              fontSize:"clamp(22px,2.2vw,32px)",
              fontWeight:700,
              color:"rgba(255,255,255,0.7)",
              letterSpacing:"0.08em",
              textTransform:"uppercase",
              lineHeight:1.2,
              marginBottom:2,
            }}>Track Student</div>

            {/* Line 2: "Performance" — massive, gradient, italic-styled */}
            <div style={{
              fontFamily:"'Syne',sans-serif",
              fontSize:"clamp(44px,5.5vw,76px)",
              fontWeight:800,
              lineHeight:0.95,
              letterSpacing:"-3px",
              background:"linear-gradient(135deg,#2dd4bf 0%,#22d3ee 45%,#a5f3fc 100%)",
              WebkitBackgroundClip:"text",
              WebkitTextFillColor:"transparent",
              backgroundClip:"text",
              display:"block",
              marginBottom:4,
            }}>Performance</div>

            {/* Line 3: "with Precision" — outlined text effect */}
            <div style={{
              fontFamily:"'Syne',sans-serif",
              fontSize:"clamp(26px,2.8vw,40px)",
              fontWeight:800,
              letterSpacing:"-1px",
              lineHeight:1.1,
              color:"transparent",
              WebkitTextStroke:"1.5px rgba(255,255,255,0.55)",
            }}>with Precision</div>
          </div>

          <p className="f2" style={{color:"rgba(255,255,255,0.36)",fontSize:14.5,lineHeight:1.75,maxWidth:420,marginTop:16,position:"relative",zIndex:2}}>
            A complete scoring system for modern learning programs. Track attendance, skills, and growth — all in one place.
          </p>

          {/* Pills */}
          <div className="pills f3" style={{position:"relative",zIndex:2}}>
            {[{l:"Daily Scoring",c:"#14b8a6"},{l:"Leaderboard",c:"#f59e0b"},{l:"6 Metrics",c:"#06b6d4"},{l:"Free Forever",c:"#a78bfa"}].map(t=>(
              <div key={t.l} className="pill"><div className="pdot2" style={{background:t.c}}/>{t.l}</div>
            ))}
          </div>

          {/* Stats bar */}
          <div className="stat-bar f3" style={{position:"relative",zIndex:2}}>
            {[{n:"6",l:"Score Categories"},{n:"100",l:"Max Points"},{n:"Live",l:"Leaderboard"},{n:"100%",l:"Free to Use"}].map(s=>(
              <div key={s.l} className="stat-cell"><div className="sn">{s.n}</div><div className="sl">{s.l}</div></div>
            ))}
          </div>

          {/* Feature rows */}
          <div style={{position:"relative",zIndex:2}}>
            {[
              {icon:"📊",bg:"rgba(20,184,166,0.14)", title:"Daily Score Tracking",  desc:"Attendance, speak-up, activity, technical, behavior & initiative"},
              {icon:"🏆",bg:"rgba(245,158,11,0.12)", title:"Live Leaderboard",       desc:"Real-time rankings updated after every score submission"},
              {icon:"⭐",bg:"rgba(167,139,250,0.12)",title:"Student of the Day",     desc:"Automatic recognition for the top performer each day"},
              {icon:"📈",bg:"rgba(6,182,212,0.11)",  title:"Progress Analytics",    desc:"Level progression from Beginner to Pro based on scores"},
            ].map((f,i)=>(
              <div key={f.title} className="feat f4" style={{animationDelay:`${.28+i*.08}s`}}>
                <div className="fico" style={{background:f.bg}}>{f.icon}</div>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:"#fff"}}>{f.title}</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.33)",marginTop:3}}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════ RIGHT WHITE PANEL ══════════════ */}
        <div className="rp">
          <div className="rp-accent"/>

          {/* Logo + title */}
          <div className="f1" style={{textAlign:"center",marginBottom:22,width:"100%"}}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
              <Image src="/logo.png" alt="Knowletive" width={88} height={88} style={{objectFit:"contain"}}/>
            </div>
            <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:24,fontWeight:800,color:"#0f172a",letterSpacing:"-0.5px",marginBottom:5}}>Welcome Back</h2>
            <p style={{color:"#94a3b8",fontSize:13.5}}>Sign in to continue your journey</p>
          </div>

          {/* Trust bar */}
          <div className="trust f2" style={{width:"100%"}}>
            <div className="trust-i">🔒 SSL Encrypted</div>
            <div style={{width:1,height:15,background:"#99f6e4"}}/>
            <div className="trust-i">🛡️ GDPR Safe</div>
            <div style={{width:1,height:15,background:"#99f6e4"}}/>
            <div className="trust-i">✅ 100% Free</div>
          </div>

          {/* Tab toggle */}
          <div className="tab-wrap f2">
            {(["faculty","student"] as const).map(m=>(
              <button key={m} onClick={()=>{setMode(m);setError("")}} className={`rtab ${mode===m?"rtab-on":"rtab-off"}`}>
                {m==="faculty"?"👨‍🏫 Faculty":"👨‍🎓 Student"}
              </button>
            ))}
          </div>

          {/* Faculty form */}
          {mode==="faculty" ? (
            <div className="f3" style={{display:"flex",flexDirection:"column",gap:18,width:"100%"}}>
              <div>
                <label className="r-lbl">Username</label>
                <div style={{position:"relative"}}>
                  <span className="r-ico">👤</span>
                  <input className="r-input" type="text" placeholder="Enter your username"
                    value={facultyUser} onChange={e=>{setFacultyUser(e.target.value);setError("")}}
                    onKeyDown={e=>e.key==="Enter"&&handleFacultyLogin()}/>
                </div>
              </div>
              <div>
                <label className="r-lbl">Password</label>
                <div style={{position:"relative"}}>
                  <span className="r-ico">🔒</span>
                  <input className="r-input" type={showPass?"text":"password"} placeholder="Enter your password"
                    style={{paddingRight:46}} value={facultyPass}
                    onChange={e=>{setFacultyPass(e.target.value);setError("")}}
                    onKeyDown={e=>e.key==="Enter"&&handleFacultyLogin()}/>
                  <button onClick={()=>setShowPass(!showPass)}
                    style={{position:"absolute",right:13,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:15,color:"#adb5c7",transition:"color .2s"}}
                    onMouseEnter={e=>(e.currentTarget.style.color="#0d9488")}
                    onMouseLeave={e=>(e.currentTarget.style.color="#adb5c7")}>
                    {showPass?"🙈":"👁️"}
                  </button>
                </div>
              </div>
              {error&&<div className="err">⚠️ {error}</div>}
              <button className="sbtn" onClick={handleFacultyLogin}>
                <span className="shine"/>Sign In →
              </button>
            </div>
          ):(
            <div className="f3" style={{display:"flex",flexDirection:"column",gap:18,width:"100%"}}>
              <div>
                <label className="r-lbl">Email Address</label>
                <div style={{position:"relative"}}>
                  <span className="r-ico">✉️</span>
                  <input className="r-input" type="email" placeholder="yourname@email.com"
                    value={studentEmail} onChange={e=>{setStudentEmail(e.target.value);setError("")}}
                    onKeyDown={e=>e.key==="Enter"&&handleStudentLogin()}/>
                </div>
                <p style={{fontSize:12,color:"#94a3b8",marginTop:6}}>Use the email registered by your faculty</p>
              </div>
              {error&&<div className="err">⚠️ {error}</div>}
              <button className="sbtn sbtn-v" onClick={handleStudentLogin} disabled={loading}>
                <span className="shine"/>
                {loading?"⏳ Verifying...":"View My Performance →"}
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="f5" style={{width:"100%",marginTop:28,textAlign:"center"}}>
            <p style={{fontSize:12,color:"#b0bac9",marginBottom:8}}>🔐 Secure &amp; confidential — your data is protected</p>
            <p style={{fontSize:11,color:"#cbd5e1"}}>© 2025 Knowletive. All rights reserved.</p>
          </div>
        </div>

      </div>
    </>
  )
}