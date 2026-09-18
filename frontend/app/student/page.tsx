"use client"
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { getMyScores, getLeaderboard, getWeeklyLeaderboard, getMonthlyLeaderboard, getStudentRewards, updateStudentPhoto } from "@/lib/api"
import ProjectUpdateForm from "@/components/ProjectUpdateForm"
import WeeklyChart from "@/components/WeeklyChart"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const SKILLS_LIST = [
  { key: "communication",   label: "Communication",   icon: "🗣️" },
  { key: "dressing",        label: "Dressing",        icon: "👔" },
  { key: "gestures",        label: "Gestures",        icon: "🤲" },
  { key: "time_management", label: "Time Management", icon: "⏰" },
  { key: "posture",         label: "Posture",         icon: "🧍" },
  { key: "teamwork",        label: "Team Work",       icon: "🤝" },
  { key: "confidence",      label: "Confidence",      icon: "💪" },
  { key: "leadership",      label: "Leadership",      icon: "👑" },
]

const skillScoreColor = (pct: number) =>
  pct >= 80 ? "#059669" : pct >= 60 ? "#2563eb" : pct >= 40 ? "#d97706" : "#dc2626"

export default function StudentPage() {
  const router = useRouter()
  const [student, setStudent]             = useState<any>(null)
  const [scores, setScores]               = useState<any[]>([])
  const [leaderboard, setLeaderboard]     = useState<any[]>([])
  const [rewards, setRewards]             = useState<any[]>([])
  const [photo, setPhoto]                 = useState<string>("")
  const [photoUploading, setPhotoUploading] = useState(false)
  const [toast, setToast]                 = useState<{ msg: string; type: string } | null>(null)
  const [skills, setSkills]               = useState<any[]>([]) // array of week entries from backend
  const [lbPeriod, setLbPeriod]           = useState<"daily" | "weekly" | "monthly">("daily")
  const [periodLeaderboard, setPeriodLeaderboard] = useState<any[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string, type = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const s = localStorage.getItem("student")
    if (!s) { router.replace("/login"); return }
    const parsed = JSON.parse(s)
    setStudent(parsed)

    if (parsed.photo) {
      setPhoto(parsed.photo)
    } else {
      const cached = localStorage.getItem(`student_photo_${parsed.id}`)
      if (cached) setPhoto(cached)
    }

    fetchData(parsed.id)
    fetchPeriodLeaderboard("daily")

    // ✅ Fetch interpersonal skills from backend
    fetch(`${API}/skills/student/${parsed.id}`)
      .then(r => r.json())
      .then((data: any[]) => {
        if (Array.isArray(data)) setSkills(data)
      })
      .catch(() => {})
  }, [])

  const fetchPeriodLeaderboard = async (period: "daily" | "weekly" | "monthly") => {
    try {
      let res
      if (period === "daily") res = await getLeaderboard()
      else if (period === "weekly") res = await getWeeklyLeaderboard()
      else res = await getMonthlyLeaderboard()
      setPeriodLeaderboard(res.data)
    } catch {
      setPeriodLeaderboard([])
    }
  }

  const handleLbPeriod = (p: "daily" | "weekly" | "monthly") => {
    setLbPeriod(p)
    fetchPeriodLeaderboard(p)
  }

  const fetchData = async (id: number) => {
    try {
      const [s, lb, r] = await Promise.all([
        getMyScores(id),
        getLeaderboard(),
        getStudentRewards(id),
      ])
      setScores(s.data)
      setLeaderboard(lb.data)
      setRewards(r.data)
    } catch {}
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1000000) { showToast("Photo must be under 1MB", "warning"); return }
    setPhotoUploading(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string
      try {
        await updateStudentPhoto(student.id, dataUrl)
        setPhoto(dataUrl)
        localStorage.setItem(`student_photo_${student.id}`, dataUrl)
        const updated = { ...student, photo: dataUrl }
        localStorage.setItem("student", JSON.stringify(updated))
        setStudent(updated)
        showToast("Profile photo updated! ✅")
      } catch {
        showToast("Error updating photo", "error")
      }
      setPhotoUploading(false)
    }
    reader.readAsDataURL(file)
  }

  const latest = scores[0]
  const myRank = leaderboard.findIndex((l: any) => l.name === student?.name) + 1

  const levelColor = (t: number) => t >= 90 ? "#7c3aed" : t >= 75 ? "#2563eb" : t >= 50 ? "#d97706" : "#dc2626"
  const levelBg    = (t: number) => t >= 90 ? "#f5f3ff" : t >= 75 ? "#eff6ff" : t >= 50 ? "#fffbeb" : "#fef2f2"
  const levelLabel = (t: number) => t >= 90 ? "🟣 Pro" : t >= 75 ? "🔵 Skilled" : t >= 50 ? "🟡 Learner" : "🔴 Beginner"

  const categories = [
    { key: "attendance", label: "Attendance", max: 10, icon: "🟢", color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
    { key: "speak_up",   label: "Speak Up",   max: 15, icon: "🎤", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
    { key: "activity",   label: "Activity",   max: 20, icon: "⚡", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
    { key: "technical",  label: "Technical",  max: 30, icon: "💻", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
    { key: "behavior",   label: "Behavior",   max: 10, icon: "🤝", color: "#db2777", bg: "#fdf2f8", border: "#fbcfe8" },
    { key: "initiative", label: "Initiative", max: 15, icon: "🚀", color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" },
  ]

  if (!student) return (
    <div style={{ minHeight: "100vh", background: "#f8f9fc", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#94a3b8", fontSize: 15 }}>Loading...</div>
    </div>
  )

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes barFill { from { width:0% } to { width:var(--pct) } }
        @keyframes toastIn { from { transform:translateY(20px); opacity:0 } to { transform:translateY(0); opacity:1 } }
        .fade { animation: fadeUp 0.45s cubic-bezier(.16,1,.3,1) forwards; }
        .card { background:#fff; border-radius:16px; box-shadow:0 1px 4px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04); border:1px solid #f1f5f9; }
        .bar  { height:8px; border-radius:99px; animation:barFill 1s cubic-bezier(.16,1,.3,1) forwards; }
        .avatar-wrap { position:relative; width:80px; height:80px; flex-shrink:0; cursor:pointer; }
        .avatar-img { width:80px; height:80px; border-radius:22px; object-fit:cover; border:3px solid rgba(255,255,255,0.5); display:block; }
        .avatar-initials { width:80px; height:80px; border-radius:22px; background:rgba(255,255,255,0.2); border:3px solid rgba(255,255,255,0.35); display:flex; align-items:center; justify-content:center; font-size:34px; font-weight:800; color:#fff; }
        .avatar-overlay { position:absolute; inset:0; border-radius:22px; background:rgba(0,0,0,0.45); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; opacity:0; transition:opacity 0.2s; color:#fff; font-size:11px; font-weight:700; font-family:'Plus Jakarta Sans',sans-serif; }
        .avatar-wrap:hover .avatar-overlay { opacity:1; }
        .avatar-edit-badge { position:absolute; bottom:-4px; right:-4px; width:22px; height:22px; border-radius:50%; background:#fff; border:2px solid rgba(255,255,255,0.6); display:flex; align-items:center; justify-content:center; font-size:11px; box-shadow:0 2px 6px rgba(0,0,0,0.2); color:#4f46e5; }
        .uploading-ring { position:absolute; inset:0; border-radius:22px; border:3px solid transparent; border-top-color:#fff; animation:spin 0.8s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .toast-box { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); z-index:9999; padding:12px 22px; border-radius:12px; font-size:13px; font-weight:700; font-family:'Plus Jakarta Sans',sans-serif; box-shadow:0 8px 32px rgba(0,0,0,0.15); animation:toastIn 0.3s ease; white-space:nowrap; }
        .skill-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        @media(max-width:640px) {
          .hero-inner { flex-direction:column!important; gap:16px!important; }
          .badges { flex-wrap:wrap!important; }
          .cat-row { flex-direction:column!important; gap:6px!important; }
          .skill-grid { grid-template-columns:1fr!important; }
        }
      `}</style>

      {toast && (
        <div className="toast-box" style={{
          background: toast.type==="error"?"#fef2f2":toast.type==="warning"?"#fffbeb":"#f0fdf4",
          color:      toast.type==="error"?"#dc2626":toast.type==="warning"?"#b45309":"#15803d",
          border: `1px solid ${toast.type==="error"?"#fecaca":toast.type==="warning"?"#fde68a":"#bbf7d0"}`,
        }}>{toast.msg}</div>
      )}

      <div style={{ minHeight:"100vh", background:"#f8f9fc", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>

        {/* Header */}
        <div style={{ background:"#fff", borderBottom:"1px solid #f1f5f9", padding:"0 24px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ maxWidth:760, margin:"0 auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 0" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:36, height:36, background:"linear-gradient(135deg,#6366f1,#4f46e5)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>🎯</div>
                <div>
                  <div style={{ fontFamily:"'Outfit',sans-serif", fontWeight:800, fontSize:15, color:"#0f172a" }}>Knowletive</div>
                  <div style={{ fontSize:11, color:"#94a3b8" }}>Student Portal</div>
                </div>
              </div>
              <button onClick={() => { localStorage.removeItem("student"); router.replace("/login") }}
                style={{ padding:"8px 16px", borderRadius:10, border:"1.5px solid #e2e8f0", background:"#fff", color:"#475569", cursor:"pointer", fontWeight:600, fontSize:13, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Hero */}
        <div style={{ background:"linear-gradient(135deg,#4f46e5,#7c3aed)", padding:"32px 24px" }}>
          <div style={{ maxWidth:760, margin:"0 auto" }}>
            <div className="hero-inner" style={{ display:"flex", alignItems:"center", gap:20 }}>
              <div className="avatar-wrap" onClick={() => fileRef.current?.click()} title="Click to change profile photo">
                {photo
                  ? <img src={photo} className="avatar-img" alt={student.name} />
                  : <div className="avatar-initials">{student.name.charAt(0).toUpperCase()}</div>
                }
                <div className="avatar-overlay"><span style={{fontSize:18}}>📷</span><span>Change</span></div>
                {!photoUploading && <div className="avatar-edit-badge">✎</div>}
                {photoUploading && <div className="uploading-ring" />}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handlePhotoChange} />
              <div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", fontWeight:600, letterSpacing:"1px", textTransform:"uppercase" }}>Welcome back</div>
                <h1 style={{ fontFamily:"'Outfit',sans-serif", fontSize:26, fontWeight:800, color:"#fff", margin:"4px 0", letterSpacing:"-0.5px" }}>{student.name}</h1>
                <p style={{ color:"rgba(255,255,255,0.6)", fontSize:13, margin:0 }}>{student.email}</p>
                <div className="badges" style={{ display:"flex", gap:8, marginTop:10 }}>
                  <span style={{ background:"rgba(255,255,255,0.2)", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.25)", padding:"4px 12px", borderRadius:20, fontSize:12, fontWeight:700, color:"#fff" }}>🏆 {student.level}</span>
                  {myRank > 0 && <span style={{ background:"rgba(255,255,255,0.2)", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.25)", padding:"4px 12px", borderRadius:20, fontSize:12, fontWeight:700, color:"#fff" }}>📊 Rank #{myRank} Today</span>}
                </div>
                <div style={{ marginTop:10, fontSize:11, color:"rgba(255,255,255,0.5)", display:"flex", alignItems:"center", gap:4 }}>📷 Click your photo to update it</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth:760, margin:"0 auto", padding:"24px" }}>

          {/* Today's Score */}
          {latest ? (
            <div className="card fade" style={{ padding:24, marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:22 }}>
                <div>
                  <h2 style={{ fontFamily:"'Outfit',sans-serif", fontSize:17, fontWeight:700, color:"#0f172a", margin:"0 0 4px" }}>Today's Performance</h2>
                  <div style={{ fontSize:13, color:"#94a3b8" }}>{latest.date}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:48, fontWeight:800, fontFamily:"'Outfit',sans-serif", color:levelColor(latest.total), lineHeight:1 }}>{latest.total}</div>
                  <div style={{ fontSize:12, color:"#94a3b8" }}>out of 100</div>
                  <span style={{ padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:700, background:levelBg(latest.total), color:levelColor(latest.total), display:"inline-block", marginTop:4 }}>{levelLabel(latest.total)}</span>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {categories.map(cat => {
                  const val = latest[cat.key] || 0
                  const pct = Math.round((val / cat.max) * 100)
                  return (
                    <div key={cat.key}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ width:30, height:30, borderRadius:8, background:cat.bg, border:`1px solid ${cat.border}`, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>{cat.icon}</span>
                          <span style={{ fontSize:13, fontWeight:600, color:"#334155" }}>{cat.label}</span>
                        </div>
                        <span style={{ fontSize:14, fontWeight:700, color:cat.color }}>{val}<span style={{ color:"#cbd5e1", fontWeight:400 }}>/{cat.max}</span></span>
                      </div>
                      <div style={{ height:8, background:"#f1f5f9", borderRadius:99, overflow:"hidden" }}>
                        <div className="bar" style={{ background:`linear-gradient(90deg,${cat.color}88,${cat.color})`, "--pct":`${pct}%` } as any} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="card fade" style={{ padding:48, textAlign:"center", marginBottom:16 }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
              <p style={{ color:"#94a3b8", fontSize:15, fontWeight:500 }}>No scores recorded yet</p>
              <p style={{ color:"#cbd5e1", fontSize:13, marginTop:4 }}>Check back after your session</p>
            </div>
          )}

          <ProjectUpdateForm />

          {/* Leaderboard */}
          <div className="card fade" style={{ padding:22, marginBottom:16, animationDelay:"0.05s" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap" as const, gap:10 }}>
              <h2 style={{ fontFamily:"'Outfit',sans-serif", fontSize:16, fontWeight:700, color:"#0f172a", margin:0 }}>🏆 Leaderboard</h2>
              <div style={{ display:"flex", gap:6, background:"#f1f5f9", padding:4, borderRadius:12 }}>
                {([["daily","📅 Daily"],["weekly","📆 Weekly"],["monthly","🗓️ Monthly"]] as const).map(([key,label]) => (
                  <button key={key} onClick={() => handleLbPeriod(key)} style={{
                    padding:"7px 14px", borderRadius:9, border:"none", cursor:"pointer",
                    fontWeight:700, fontSize:12, fontFamily:"'Plus Jakarta Sans',sans-serif",
                    background: lbPeriod === key ? "#fff" : "transparent",
                    color: lbPeriod === key ? "#4f46e5" : "#94a3b8",
                    boxShadow: lbPeriod === key ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                  }}>{label}</button>
                ))}
              </div>
            </div>
            {periodLeaderboard.length === 0 ? (
              <div style={{ textAlign:"center", padding:"32px 16px" }}>
                <div style={{ fontSize:36, marginBottom:8 }}>📭</div>
                <p style={{ color:"#94a3b8", fontSize:14 }}>No scores for {lbPeriod === "daily" ? "today" : lbPeriod === "weekly" ? "this week" : "this month"} yet</p>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {periodLeaderboard.map((entry: any, i: number) => {
                  const isMe = entry.name === student.name
                  const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`
                  return (
                    <div key={i} style={{
                      display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderRadius:12,
                      background: isMe ? "#eef2ff" : i === 0 ? "linear-gradient(135deg,#fffbeb,#fef9c3)" : "#f8fafc",
                      border: `1.5px solid ${isMe ? "#c7d2fe" : i === 0 ? "#fde68a" : "#f1f5f9"}`,
                    }}>
                      <span style={{ fontSize:20, width:32, textAlign:"center" }}>{medal}</span>
                      <span style={{ flex:1, fontWeight: isMe ? 800 : 600, fontSize:14, color: isMe ? "#4338ca" : "#0f172a" }}>
                        {entry.name}{isMe && " (You)"}
                      </span>
                      <span style={{ fontSize:18, fontWeight:800, color:"#4f46e5" }}>{entry.total}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ✅ Interpersonal Skills from backend */}
          {skills.length > 0 && (
            <div className="card fade" style={{ padding:22, marginBottom:16, animationDelay:"0.08s" }}>
              <h2 style={{ fontFamily:"'Outfit',sans-serif", fontSize:16, fontWeight:700, color:"#0f172a", margin:"0 0 16px" }}>🎯 Interpersonal Skills</h2>
              {skills.sort((a,b) => a.week - b.week).map(entry => {
                const total = SKILLS_LIST.reduce((s, sk) => s + (entry[sk.key] || 0), 0)
                const maxTotal = SKILLS_LIST.length * 10
                const pct = Math.round((total / maxTotal) * 100)
                return (
                  <div key={entry.week} style={{ marginBottom:14, padding:16, borderRadius:12, background:"#f8f9fe", border:"1px solid #e5e9f5" }}>
                    {/* Week header */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                      <div style={{ fontWeight:700, fontSize:14, color:"#0f172a" }}>Week {entry.week}</div>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:80, height:6, background:"#e5e9f5", borderRadius:99, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${pct}%`, background:skillScoreColor(pct), borderRadius:99 }} />
                        </div>
                        <span style={{ fontSize:14, fontWeight:800, color:skillScoreColor(pct) }}>
                          {total}<span style={{ fontSize:11, color:"#94a3b8", fontWeight:400 }}>/{maxTotal}</span>
                        </span>
                      </div>
                    </div>
                    {/* Skills grid */}
                    <div className="skill-grid">
                      {SKILLS_LIST.map(sk => {
                        const val = entry[sk.key] || 0
                        const spct = Math.round((val / 10) * 100)
                        return (
                          <div key={sk.key} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, background:"#fff", border:"1px solid #e5e9f5" }}>
                            <span style={{ fontSize:18, flexShrink:0 }}>{sk.icon}</span>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:12, fontWeight:600, color:"#334155", marginBottom:4 }}>{sk.label}</div>
                              <div style={{ height:5, background:"#f1f5f9", borderRadius:99, overflow:"hidden" }}>
                                <div style={{ height:"100%", width:`${spct}%`, background:skillScoreColor(spct), borderRadius:99, transition:"width 0.6s" }} />
                              </div>
                            </div>
                            <span style={{ fontSize:13, fontWeight:800, color:skillScoreColor(spct), flexShrink:0 }}>
                              {val}<span style={{ fontSize:10, color:"#94a3b8", fontWeight:400 }}>/10</span>
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Score History */}
          {scores.length > 1 && (
            <div className="card fade" style={{ padding:22, marginBottom:16, animationDelay:"0.1s" }}>
              <WeeklyChart scores={scores} />

              <h2 style={{ fontFamily:"'Outfit',sans-serif", fontSize:16, fontWeight:700, color:"#0f172a", margin:"24px 0 16px" }}>📋 Detailed History</h2>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {scores.slice(1).map((s: any, i: number) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", borderRadius:12, background:"#f8fafc", border:"1px solid #f1f5f9" }}>
                    <div>
                      <div style={{ fontWeight:600, fontSize:14, color:"#0f172a" }}>{s.date}</div>
                      <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>A:{s.attendance} · S:{s.speak_up} · Ac:{s.activity} · T:{s.technical} · B:{s.behavior} · I:{s.initiative}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <span style={{ fontSize:22, fontWeight:800, fontFamily:"'Outfit',sans-serif", color:levelColor(s.total) }}>{s.total}</span>
                      <div style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:levelBg(s.total), color:levelColor(s.total), fontWeight:700, marginTop:2, display:"inline-block" }}>{levelLabel(s.total)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rewards */}
          {rewards.length > 0 && (
            <div className="card fade" style={{ padding:22, marginBottom:16, animationDelay:"0.15s" }}>
              <h2 style={{ fontFamily:"'Outfit',sans-serif", fontSize:16, fontWeight:700, color:"#0f172a", margin:"0 0 14px" }}>🏆 My Awards</h2>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {rewards.map((r: any, i: number) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderRadius:12, background:r.type==="daily"?"#fffbeb":r.type==="weekly"?"#eff6ff":"#f5f3ff", border:`1px solid ${r.type==="daily"?"#fde68a":r.type==="weekly"?"#bfdbfe":"#ddd6fe"}` }}>
                    <span style={{ fontSize:24 }}>{r.type==="daily"?"⭐":r.type==="weekly"?"🏅":"🏆"}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:14, color:"#0f172a" }}>{r.title}</div>
                      <div style={{ fontSize:12, color:"#64748b", marginTop:1 }}>{r.date}</div>
                    </div>
                    <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:700, background:"rgba(255,255,255,0.7)", color:r.type==="daily"?"#d97706":r.type==="weekly"?"#2563eb":"#7c3aed" }}>{r.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Faculty Feedback */}
          {scores.filter((s: any) => s.suggestion).length > 0 && (
            <div className="card fade" style={{ padding:22, marginBottom:16, animationDelay:"0.2s" }}>
              <h2 style={{ fontFamily:"'Outfit',sans-serif", fontSize:16, fontWeight:700, color:"#0f172a", margin:"0 0 14px" }}>💬 Faculty Feedback</h2>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {scores.filter((s: any) => s.suggestion).map((s: any, i: number) => (
                  <div key={i} style={{ padding:"16px", borderRadius:12, background:"linear-gradient(135deg,#f0f4ff,#f8faff)", border:"1px solid #c7d7ff" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#1a3fa0,#1a2f6e)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>👨‍🏫</div>
                        <span style={{ fontSize:13, fontWeight:700, color:"#1a2f6e" }}>Faculty Feedback</span>
                      </div>
                      <span style={{ fontSize:11, color:"#94a3b8" }}>{s.date}</span>
                    </div>
                    <p style={{ fontSize:14, color:"#334155", lineHeight:1.7, margin:0, padding:"10px 12px", background:"#fff", borderRadius:8, border:"1px solid #e8eeff" }}>"{s.suggestion}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Level Guide */}
          <div className="card fade" style={{ padding:22, animationDelay:"0.25s" }}>
            <h2 style={{ fontFamily:"'Outfit',sans-serif", fontSize:16, fontWeight:700, color:"#0f172a", margin:"0 0 14px" }}>🎯 Level System</h2>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10 }}>
              {[
                { level:"Beginner", range:"< 50 pts",  score:0  },
                { level:"Learner",  range:"50–74 pts", score:50 },
                { level:"Skilled",  range:"75–89 pts", score:75 },
                { level:"Pro",      range:"90+ pts",   score:90 },
              ].map(l => (
                <div key={l.level} style={{ padding:"14px 16px", borderRadius:12, background:student.level===l.level?levelBg(l.score):"#f8fafc", border:`1.5px solid ${student.level===l.level?levelColor(l.score)+"33":"#f1f5f9"}` }}>
                  <div style={{ fontWeight:700, fontSize:14, color:student.level===l.level?levelColor(l.score):"#334155" }}>{levelLabel(l.score).split(" ")[1]||levelLabel(l.score)}</div>
                  <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>{l.range}</div>
                  {student.level===l.level && <div style={{ fontSize:10, color:levelColor(l.score), fontWeight:700, marginTop:6, letterSpacing:"0.5px" }}>● YOUR CURRENT LEVEL</div>}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}