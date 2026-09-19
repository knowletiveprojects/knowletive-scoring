"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { studentLogin } from "@/lib/api"

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
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes floatSlow { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes shimmer { 0%{left:-100%} 60%,100%{left:160%} }

        .f1{animation:fadeUp .6s cubic-bezier(.16,1,.3,1) .00s both}
        .f2{animation:fadeUp .6s cubic-bezier(.16,1,.3,1) .08s both}
        .f3{animation:fadeUp .6s cubic-bezier(.16,1,.3,1) .16s both}
        .f4{animation:fadeUp .6s cubic-bezier(.16,1,.3,1) .24s both}

        .page {
          min-height: 100vh;
          display: flex;
          font-family: 'DM Sans', sans-serif;
        }

        /* LEFT — landing / brand side */
        .lp {
          flex: 1 1 60%;
          min-width: 0;
          position: relative;
          overflow: hidden;
          padding: 32px 48px 40px;
          display: flex;
          flex-direction: column;
          background: linear-gradient(150deg, #020c18 0%, #041e2e 35%, #052028 65%, #040e18 100%);
          color: #fff;
        }

        .lp-nav { display:flex; align-items:center; justify-content:space-between; position:relative; z-index:2; }
        .lp-navlinks { display:flex; gap:28px; }
        .lp-navlinks a { color:rgba(255,255,255,0.65); font-size:13.5px; font-weight:600; text-decoration:none; }
        .lp-navlinks a.active { color:#fff; }
        .lp-tag { text-align:right; font-size:12.5px; color:rgba(255,255,255,0.45); line-height:1.4; }

        .lp-badge {
          display:inline-flex; align-items:center; gap:8px; width:fit-content;
          padding:7px 16px; border-radius:20px; margin:28px 0 20px;
          background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12);
          font-size:11.5px; font-weight:700; letter-spacing:1px; color:#5eead4;
        }

        .lp-headline { font-family:'Syne',sans-serif; font-weight:800; font-size:clamp(34px,3.6vw,50px); line-height:1.06; letter-spacing:-1.5px; }
        .lp-grad { background:linear-gradient(135deg,#2dd4bf 0%,#22d3ee 50%,#60a5fa 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }

        .feat { display:flex; align-items:center; gap:13px; margin-bottom:12px; }
        .fico { width:38px; height:38px; border-radius:10px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:17px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); }

        .lp-stats { display:flex; gap:36px; border-top:1px solid rgba(255,255,255,0.1); padding-top:18px; margin-top:auto; position:relative; z-index:2; }
        .lp-stat-num { font-family:'Outfit',sans-serif; font-weight:800; font-size:20px; color:#fff; }
        .lp-stat-lbl { font-size:11.5px; color:rgba(255,255,255,0.4); margin-top:2px; }

        /* mock dashboard visual */
        .mock-wrap { position:relative; flex:1; display:flex; align-items:center; justify-content:center; min-height:280px; z-index:2; }
        .mock-screen {
          width:100%; max-width:520px; border-radius:16px; overflow:hidden;
          background:#0b1524; border:1px solid rgba(255,255,255,0.1);
          box-shadow: 0 30px 80px rgba(0,0,0,0.5);
        }
        .mock-topbar { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.08); }
        .mock-body { display:flex; }
        .mock-side { width:110px; padding:14px 10px; border-right:1px solid rgba(255,255,255,0.07); display:flex; flex-direction:column; gap:6px; }
        .mock-navitem { font-size:10.5px; padding:7px 8px; border-radius:7px; color:rgba(255,255,255,0.5); }
        .mock-navitem.on { background:linear-gradient(135deg,#0d9488,#0891b2); color:#fff; font-weight:700; }
        .mock-main { flex:1; padding:14px 16px; }
        .mock-stat-row { display:flex; gap:8px; margin:10px 0; }
        .mock-stat-card { flex:1; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:9px; padding:8px 10px; }
        .mock-stat-val { font-size:15px; font-weight:800; color:#fff; }
        .mock-stat-lbl { font-size:9px; color:rgba(255,255,255,0.4); margin-top:1px; }
        .mock-panel-row { display:flex; gap:10px; margin-top:10px; }
        .mock-panel { flex:1; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:9px; padding:10px; }
        .mock-panel-title { font-size:10px; color:rgba(255,255,255,0.55); font-weight:700; margin-bottom:6px; }

        .float-card {
          position:absolute; background:rgba(255,255,255,0.06); backdrop-filter:blur(6px);
          border:1px solid rgba(255,255,255,0.14); border-radius:14px; padding:12px 16px;
          font-family:'Outfit',sans-serif; font-weight:700; font-size:13px; color:#fff; line-height:1.35;
          animation: floatSlow 5s ease-in-out infinite; z-index:3;
        }

        /* RIGHT — login card floating on soft gradient */
        .rp {
          flex: 1 1 420px;
          max-width: 480px;
          background: linear-gradient(160deg,#eef4ff 0%,#f7fbff 60%,#eaf7f5 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
          position: relative;
        }
        .rp-card {
          width:100%; max-width:400px; background:#fff; border-radius:24px;
          padding:36px 34px 30px; box-shadow: 0 20px 60px rgba(15,23,42,0.08);
          position:relative; z-index:2;
        }

        .r-input {
          width:100%; padding:13px 16px 13px 44px;
          border:1.5px solid #e2e8f0; border-radius:12px;
          font-size:14px; font-family:'DM Sans',sans-serif;
          color:#1e293b; background:#f8fafc;
          outline:none; transition:all .2s;
        }
        .r-input::placeholder { color:#a3adc2; }
        .r-input:focus { border-color:#14b8a6; background:#fff; box-shadow:0 0 0 4px rgba(20,184,166,0.1); }
        .r-lbl { font-size:12.5px; font-weight:700; color:#334155; display:block; margin-bottom:7px; }
        .r-ico { position:absolute; left:14px; top:50%; transform:translateY(-50%); font-size:15px; color:#a3adc2; pointer-events:none; }

        .tab-wrap { background:#f1f5f9; border-radius:12px; padding:4px; display:flex; width:100%; margin-bottom:24px; }
        .rtab { flex:1; padding:11px; border-radius:9px; border:none; cursor:pointer; font-weight:700; font-size:13px; font-family:'DM Sans',sans-serif; transition:all .2s; display:flex; align-items:center; justify-content:center; gap:6px; }
        .rtab-on { background:linear-gradient(135deg,#2563eb,#14b8a6); color:#fff; box-shadow:0 4px 14px rgba(37,99,235,0.25); }
        .rtab-off { background:transparent; color:#94a3b8; }

        .sbtn {
          width:100%; padding:14px; border-radius:13px; border:none;
          cursor:pointer; font-weight:700; font-size:15px; font-family:'DM Sans',sans-serif;
          background:linear-gradient(135deg,#2563eb,#14b8a6);
          color:#fff; box-shadow:0 8px 22px rgba(37,99,235,0.28);
          transition:all .25s; position:relative; overflow:hidden;
          display:flex; align-items:center; justify-content:center; gap:8px;
        }
        .sbtn:hover { transform:translateY(-1px); box-shadow:0 10px 28px rgba(37,99,235,0.35); }
        .sbtn:disabled { opacity:.55; cursor:not-allowed; transform:none!important; }
        .shine { position:absolute; top:0; left:-100%; width:50%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent); animation:shimmer 2.6s ease-in-out infinite; }

        .err { background:#fef2f2; border:1.5px solid #fecaca; border-radius:10px; padding:11px 14px; color:#dc2626; font-size:13px; font-weight:500; display:flex; align-items:center; gap:8px; }

        .divider { display:flex; align-items:center; gap:12px; margin-top:22px; }
        .divider::before, .divider::after { content:""; flex:1; height:1px; background:#e2e8f0; }
        .divider span { font-size:11.5px; color:#94a3b8; white-space:nowrap; }

        @media(max-width:980px){
          .lp { display:none; }
          .rp { flex: 1 1 100%; max-width:100%; min-height:100vh; }
        }
      `}</style>

      <div className="page">

        {/* ══════ LEFT — landing style panel ══════ */}
        <div className="lp">
          <div style={{position:"absolute",width:520,height:520,borderRadius:"50%",background:"radial-gradient(circle,rgba(20,184,166,0.12) 0%,transparent 65%)",top:-160,left:-140,filter:"blur(70px)",pointerEvents:"none"}}/>
          <div style={{position:"absolute",width:420,height:420,borderRadius:"50%",background:"radial-gradient(circle,rgba(37,99,235,0.12) 0%,transparent 65%)",bottom:-140,right:-100,filter:"blur(70px)",pointerEvents:"none"}}/>

          <div className="lp-nav f1">
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:22}}>📊</span>
              <div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:19}}>Knowletive</div>
                <div style={{fontSize:9.5,letterSpacing:"2px",color:"rgba(255,255,255,0.4)"}}>TRAINING MINDS, PLACING TALENTS</div>
              </div>
            </div>
            <div className="lp-navlinks">
              <a href="#" className="active">Home</a>
              <a href="#">About</a>
              <a href="#">Features</a>
              <a href="#">Contact</a>
            </div>
            <div className="lp-tag">"Data Today<br/>Better Tomorrow"</div>
          </div>

          <div className="lp-badge f2">📈 STUDENT ANALYTICS PLATFORM</div>

          <div className="lp-headline f2">
            Track Student<br/>Performance,<br/>
            <span className="lp-grad">With Precision.</span>
          </div>

          <p className="f2" style={{color:"rgba(255,255,255,0.45)",fontSize:14.5,lineHeight:1.7,maxWidth:420,margin:"16px 0 22px"}}>
            One dashboard to score, track, and grow every student — attendance, skills, and progress in one place.
          </p>

          <div className="f3" style={{marginBottom:24}}>
            {[
              {icon:"👥", title:"Daily Score Tracking", desc:"Attendance, participation & technical performance"},
              {icon:"🏆", title:"Live Leaderboard", desc:"Real-time rankings after every submission"},
              {icon:"📈", title:"Progress Analytics", desc:"Clear growth trends from Beginner to Pro"},
            ].map(f=>(
              <div key={f.title} className="feat">
                <div className="fico">{f.icon}</div>
                <div>
                  <div style={{fontWeight:700,fontSize:13.5}}>{f.title}</div>
                  <div style={{fontSize:11.5,color:"rgba(255,255,255,0.4)"}}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* mock dashboard preview */}
          <div className="mock-wrap f3">
            <div className="float-card" style={{top:-6,left:20,animationDelay:"0s"}}>📉 Learn · Track · Grow</div>
            <div className="float-card" style={{top:-10,right:10,animationDelay:"1.2s"}}>✨ Better Students,<br/>Brighter Futures</div>

            <div className="mock-screen">
              <div className="mock-topbar">
                <span style={{fontSize:11,fontWeight:700,color:"#fff"}}>📊 Knowletive</span>
                <span style={{fontSize:9.5,color:"rgba(255,255,255,0.4)"}}>Sep 2026</span>
              </div>
              <div className="mock-body">
                <div className="mock-side">
                  <div className="mock-navitem on">Dashboard</div>
                  <div className="mock-navitem">Students</div>
                  <div className="mock-navitem">Analytics</div>
                  <div className="mock-navitem">Leaderboard</div>
                </div>
                <div className="mock-main">
                  <div style={{fontSize:12,fontWeight:800,color:"#fff"}}>Welcome back!</div>
                  <div style={{fontSize:9.5,color:"rgba(255,255,255,0.4)",marginTop:2}}>Here's what's happening today</div>
                  <div className="mock-stat-row">
                    <div className="mock-stat-card"><div className="mock-stat-val">125</div><div className="mock-stat-lbl">Total Students</div></div>
                    <div className="mock-stat-card"><div className="mock-stat-val">92%</div><div className="mock-stat-lbl">Avg Attendance</div></div>
                    <div className="mock-stat-card"><div className="mock-stat-val">76</div><div className="mock-stat-lbl">Active Learners</div></div>
                  </div>
                  <div className="mock-panel-row">
                    <div className="mock-panel" style={{flex:1.4}}>
                      <div className="mock-panel-title">Performance Trend</div>
                      <svg viewBox="0 0 160 46" width="100%" height="46">
                        <polyline points="0,36 25,28 50,32 75,18 100,22 125,10 160,6" fill="none" stroke="#2dd4bf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="mock-panel">
                      <div className="mock-panel-title">Skill Level</div>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:44}}>
                        <div style={{width:40,height:40,borderRadius:"50%",background:"conic-gradient(#2dd4bf 0% 78%, rgba(255,255,255,0.1) 78% 100%)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <div style={{width:26,height:26,borderRadius:"50%",background:"#0b1524",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,color:"#fff"}}>78%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lp-stats f4">
            {[{n:"10K+",l:"Students Empowered"},{n:"50+",l:"Institutions"},{n:"98%",l:"Satisfaction Rate"}].map(s=>(
              <div key={s.l}><div className="lp-stat-num">{s.n}</div><div className="lp-stat-lbl">{s.l}</div></div>
            ))}
          </div>
        </div>

        {/* ══════ RIGHT — floating login card ══════ */}
        <div className="rp">
          <div className="rp-card f1">
            <div style={{textAlign:"center",marginBottom:22}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:10}}>
                <span style={{fontSize:22}}>📊</span>
                <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,color:"#0f172a"}}>Knowletive</span>
              </div>
              <div style={{fontSize:9.5,letterSpacing:"1.5px",color:"#94a3b8",marginBottom:16}}>TRAINING MINDS, PLACING TALENTS</div>
              <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:22,fontWeight:800,color:"#0f172a",marginBottom:5}}>Welcome Back</h2>
              <p style={{color:"#94a3b8",fontSize:13}}>Sign in to continue to your dashboard</p>
            </div>

            <div className="tab-wrap">
              {(["faculty","student"] as const).map(m=>(
                <button key={m} onClick={()=>{setMode(m);setError("")}} className={`rtab ${mode===m?"rtab-on":"rtab-off"}`}>
                  {m==="faculty"?"🎓 Faculty":"👤 Student"}
                </button>
              ))}
            </div>

            {mode==="faculty" ? (
              <div style={{display:"flex",flexDirection:"column",gap:16}}>
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
                      style={{position:"absolute",right:13,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:15,color:"#a3adc2"}}>
                      {showPass?"🙈":"👁️"}
                    </button>
                  </div>
                </div>
                {error&&<div className="err">⚠ {error}</div>}
                <button className="sbtn" onClick={handleFacultyLogin}>
                  <span className="shine"/>Sign In →
                </button>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                <div>
                  <label className="r-lbl">Email address</label>
                  <div style={{position:"relative"}}>
                    <span className="r-ico">✉️</span>
                    <input className="r-input" type="email" placeholder="yourname@email.com"
                      value={studentEmail} onChange={e=>{setStudentEmail(e.target.value);setError("")}}
                      onKeyDown={e=>e.key==="Enter"&&handleStudentLogin()}/>
                  </div>
                  <p style={{fontSize:11.5,color:"#94a3b8",marginTop:6}}>Use the email registered by your faculty</p>
                </div>
                {error&&<div className="err">⚠ {error}</div>}
                <button className="sbtn" onClick={handleStudentLogin} disabled={loading}>
                  <span className="shine"/>
                  {loading?"Verifying...":"View My Performance →"}
                </button>
              </div>
            )}

            <div className="divider"><span>Access your academic insights securely</span></div>
          </div>

          <p style={{position:"absolute",bottom:20,fontSize:11.5,color:"#94a3b8",textAlign:"center",width:"100%"}}>
            © 2026 Knowletive. All rights reserved.
          </p>
        </div>

      </div>
    </>
  )
}