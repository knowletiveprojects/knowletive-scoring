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
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{left:-100%} 60%,100%{left:160%} }
        @keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes glow { 0%,100%{opacity:.5} 50%{opacity:1} }

        .f1{animation:fadeUp .6s cubic-bezier(.16,1,.3,1) .00s both}
        .f2{animation:fadeUp .6s cubic-bezier(.16,1,.3,1) .08s both}
        .f3{animation:fadeUp .6s cubic-bezier(.16,1,.3,1) .16s both}
        .f4{animation:fadeUp .6s cubic-bezier(.16,1,.3,1) .24s both}
        .f5{animation:fadeUp .6s cubic-bezier(.16,1,.3,1) .32s both}

        .page {
          min-height: 100vh;
          display: flex;
          font-family: 'DM Sans', sans-serif;
        }

        /* LEFT — brand panel */
        .lp {
          flex: 1 1 55%;
          min-width: 0;
          position: relative;
          overflow: hidden;
          padding: 56px 64px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: linear-gradient(150deg, #020c18 0%, #041e2e 35%, #052028 65%, #040e18 100%);
        }

        .brand-badge {
          width:46px; height:46px; border-radius:13px; flex-shrink:0;
          display:flex; align-items:center; justify-content:center; font-size:22px;
          background:linear-gradient(135deg,#0d9488,#0891b2);
          box-shadow:0 8px 24px rgba(13,148,136,0.35);
        }

        .orbit {
          position:absolute; border-radius:50%; border:1px solid rgba(255,255,255,0.06);
          pointer-events:none;
        }
        .spark { position:absolute; border-radius:50%; animation: glow 3s ease-in-out infinite; pointer-events:none; }

        /* RIGHT — auth panel */
        .rp {
          flex: 1 1 420px;
          max-width: 460px;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 44px;
          position: relative;
        }

        .rp-accent { position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg,#14b8a6,#06b6d4,#6366f1); }

        .logo-badge {
          width:64px; height:64px; border-radius:18px; display:flex; align-items:center; justify-content:center;
          background:linear-gradient(135deg,#f0fdfa,#eff6ff); border:1px solid #e0f2fe;
          box-shadow:0 8px 20px rgba(20,184,166,0.12);
        }

        /* feature rows */
        .feat {
          display:flex; align-items:center; gap:16px;
          padding:16px 20px;
          background:rgba(255,255,255,0.03);
          border:1px solid rgba(255,255,255,0.07);
          border-radius:14px; margin-bottom:10px;
          transition:all .25s;
        }
        .feat:hover { background:rgba(255,255,255,0.06); border-color:rgba(20,184,166,0.25); transform:translateX(4px); }
        .fico { width:42px; height:42px; border-radius:11px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:19px; }

        .stat-strip { display:flex; gap:28px; margin-top:32px; padding-top:24px; border-top:1px solid rgba(255,255,255,0.08); }
        .stat-num { font-family:'Outfit',sans-serif; font-weight:800; font-size:22px; background:linear-gradient(135deg,#2dd4bf,#5eead4); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .stat-lbl { font-size:11.5px; color:rgba(255,255,255,0.4); margin-top:2px; }

        /* right panel form */
        .r-input {
          width:100%; padding:13px 16px 13px 44px;
          border:1.5px solid #e2e8f0; border-radius:12px;
          font-size:14px; font-family:'DM Sans',sans-serif;
          color:#1e293b; background:#f8fafc;
          outline:none; transition:all .2s;
        }
        .r-input::placeholder { color:#a3adc2; }
        .r-input:focus { border-color:#14b8a6; background:#fff; box-shadow:0 0 0 4px rgba(20,184,166,0.1); }
        .r-lbl { font-size:11.5px; font-weight:700; color:#64748b; letter-spacing:.6px; text-transform:uppercase; display:block; margin-bottom:7px; }
        .r-ico { position:absolute; left:14px; top:50%; transform:translateY(-50%); font-size:15px; color:#a3adc2; pointer-events:none; }

        .tab-wrap { background:#f1f5f9; border-radius:12px; padding:4px; display:flex; width:100%; margin-bottom:26px; }
        .rtab { flex:1; padding:11px; border-radius:9px; border:none; cursor:pointer; font-weight:700; font-size:13px; font-family:'DM Sans',sans-serif; transition:all .2s; display:flex; align-items:center; justify-content:center; gap:6px; }
        .rtab-on { background:linear-gradient(135deg,#0d9488,#0891b2); color:#fff; box-shadow:0 4px 14px rgba(13,148,136,0.3); }
        .rtab-off { background:transparent; color:#94a3b8; }
        .rtab-off:hover { color:#475569; }

        .sbtn {
          width:100%; padding:14px; border-radius:13px; border:none;
          cursor:pointer; font-weight:700; font-size:15px; font-family:'DM Sans',sans-serif;
          background:linear-gradient(135deg,#0d9488,#0891b2);
          color:#fff; box-shadow:0 8px 24px rgba(13,148,136,0.35);
          transition:all .25s; position:relative; overflow:hidden;
          display:flex; align-items:center; justify-content:center; gap:8px;
        }
        .sbtn:hover { transform:translateY(-2px); box-shadow:0 12px 30px rgba(13,148,136,0.42); }
        .sbtn:active { transform:translateY(0); }
        .sbtn:disabled { opacity:.55; cursor:not-allowed; transform:none!important; }
        .sbtn-v { background:linear-gradient(135deg,#6366f1,#8b5cf6); box-shadow:0 8px 24px rgba(99,102,241,0.35); }
        .sbtn-v:hover { box-shadow:0 12px 30px rgba(99,102,241,0.42); }
        .shine { position:absolute; top:0; left:-100%; width:50%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent); animation:shimmer 2.6s ease-in-out infinite; }

        .err { background:#fef2f2; border:1.5px solid #fecaca; border-radius:10px; padding:11px 14px; color:#dc2626; font-size:13px; font-weight:500; display:flex; align-items:center; gap:8px; }

        @media(max-width:860px){
          .page { flex-direction: column; }
          .lp { flex: none; padding: 40px 28px; }
          .rp { flex: none; max-width: 100%; padding: 40px 28px 48px; }
          .lp-headline { font-size: clamp(30px,8vw,44px)!important; }
          .stat-strip { gap:20px; }
        }
      `}</style>

      <div className="page">

        {/* ══════ LEFT PANEL ══════ */}
        <div className="lp">

          <div style={{position:"absolute",width:560,height:560,borderRadius:"50%",background:"radial-gradient(circle,rgba(20,184,166,0.14) 0%,transparent 65%)",top:-190,left:-150,filter:"blur(75px)",pointerEvents:"none"}}/>
          <div style={{position:"absolute",width:440,height:440,borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 65%)",bottom:-140,right:-90,filter:"blur(75px)",pointerEvents:"none"}}/>
          <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(rgba(255,255,255,0.035) 1px,transparent 1px)",backgroundSize:"26px 26px",pointerEvents:"none"}}/>

          <div className="orbit" style={{width:340,height:340,top:-100,right:-100,animation:"floatY 8s ease-in-out infinite"}}/>
          <div className="orbit" style={{width:220,height:220,bottom:40,left:-60}}/>
          <div className="spark" style={{width:6,height:6,background:"#5eead4",top:"22%",left:"68%"}}/>
          <div className="spark" style={{width:4,height:4,background:"#818cf8",top:"64%",left:"48%",animationDelay:"1s"}}/>
          <div className="spark" style={{width:5,height:5,background:"#22d3ee",top:"44%",left:"78%",animationDelay:"1.8s"}}/>

          <div className="f1" style={{marginBottom:40, position:"relative", zIndex:2, display:"flex", alignItems:"center", gap:14}}>
            <div className="brand-badge">📊</div>
            <div>
              <div style={{
                fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"clamp(22px,2.2vw,28px)",
                letterSpacing:"-1px", lineHeight:1, color:"#fff",
              }}>Knowletive</div>
              <div style={{ fontSize:11.5, fontWeight:600, letterSpacing:"1.5px", textTransform:"uppercase", color:"rgba(255,255,255,0.5)", marginTop:4 }}>
                Training Minds, Placing Talents
              </div>
            </div>
          </div>

          <div className="f2 lp-headline" style={{ position:"relative", zIndex:2, marginBottom:18 }}>
            <div style={{
              fontFamily:"'Syne',sans-serif", fontSize:"clamp(38px,4.6vw,58px)", fontWeight:800,
              lineHeight:1.08, letterSpacing:"-2px", color:"#fff",
            }}>
              Track student performance,{" "}
              <span style={{
                background:"linear-gradient(135deg,#2dd4bf 0%,#22d3ee 50%,#a5f3fc 100%)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
              }}>with precision.</span>
            </div>
          </div>

          <p className="f2" style={{ color:"rgba(255,255,255,0.42)", fontSize:15, lineHeight:1.7, maxWidth:440, position:"relative", zIndex:2, marginBottom:32 }}>
            One dashboard to score, track, and grow every student — attendance, skills, and progress in one place.
          </p>

          <div className="f3" style={{ position:"relative", zIndex:2 }}>
            {[
              {icon:"📊", bg:"rgba(20,184,166,0.16)", title:"Daily Score Tracking",  desc:"Attendance, participation, and technical performance"},
              {icon:"🏆", bg:"rgba(245,158,11,0.14)", title:"Live Leaderboard",       desc:"Real-time rankings after every submission"},
              {icon:"📈", bg:"rgba(99,102,241,0.14)", title:"Progress Analytics",    desc:"Clear growth trends from Beginner to Pro"},
            ].map(f=>(
              <div key={f.title} className="feat">
                <div className="fico" style={{background:f.bg}}>{f.icon}</div>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:"#fff"}}>{f.title}</div>
                  <div style={{fontSize:12.5,color:"rgba(255,255,255,0.38)",marginTop:2}}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="stat-strip f4" style={{ position:"relative", zIndex:2 }}>
            {[{n:"6",l:"Score Categories"},{n:"100",l:"Max Points"},{n:"Live",l:"Leaderboard"}].map(s=>(
              <div key={s.l}>
                <div className="stat-num">{s.n}</div>
                <div className="stat-lbl">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ══════ RIGHT PANEL ══════ */}
        <div className="rp">
          <div className="rp-accent"/>

          <div className="f1" style={{textAlign:"center",marginBottom:26,width:"100%"}}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:16}}>
              <div className="logo-badge">
                <Image src="/logo.png" alt="Knowletive" width={40} height={40} style={{objectFit:"contain"}}/>
              </div>
            </div>
            <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:24,fontWeight:800,color:"#0f172a",letterSpacing:"-0.5px",marginBottom:6}}>Welcome back</h2>
            <p style={{color:"#94a3b8",fontSize:13.5}}>Sign in to continue to your dashboard</p>
          </div>

          <div className="tab-wrap f2">
            {(["faculty","student"] as const).map(m=>(
              <button key={m} onClick={()=>{setMode(m);setError("")}} className={`rtab ${mode===m?"rtab-on":"rtab-off"}`}>
                {m==="faculty"?"🎓 Faculty":"🧑‍🎓 Student"}
              </button>
            ))}
          </div>

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
            <div className="f3" style={{display:"flex",flexDirection:"column",gap:18,width:"100%"}}>
              <div>
                <label className="r-lbl">Email address</label>
                <div style={{position:"relative"}}>
                  <span className="r-ico">✉️</span>
                  <input className="r-input" type="email" placeholder="yourname@email.com"
                    value={studentEmail} onChange={e=>{setStudentEmail(e.target.value);setError("")}}
                    onKeyDown={e=>e.key==="Enter"&&handleStudentLogin()}/>
                </div>
                <p style={{fontSize:12,color:"#94a3b8",marginTop:6}}>Use the email registered by your faculty</p>
              </div>
              {error&&<div className="err">⚠ {error}</div>}
              <button className="sbtn sbtn-v" onClick={handleStudentLogin} disabled={loading}>
                <span className="shine"/>
                {loading?"Verifying...":"View My Performance →"}
              </button>
            </div>
          )}

          <div className="f5" style={{width:"100%",marginTop:32,textAlign:"center"}}>
            <p style={{fontSize:11,color:"#cbd5e1"}}>© 2026 Knowletive. All rights reserved.</p>
          </div>
        </div>

      </div>
    </>
  )
}