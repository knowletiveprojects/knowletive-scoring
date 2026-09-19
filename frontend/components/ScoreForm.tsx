"use client"
import { useState, useEffect, useRef } from "react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const METRICS = [
  { key: "attendance", label: "Attendance", max: 10,  icon: "🟢", color: "#10b981", bg: "#ecfdf5", border: "#6ee7b7" },
  { key: "speak_up",   label: "Speak Up",   max: 15,  icon: "🎤", color: "#8b5cf6", bg: "#f5f3ff", border: "#c4b5fd" },
  { key: "activity",   label: "Activity",   max: 20,  icon: "⚡", color: "#f59e0b", bg: "#fffbeb", border: "#fcd34d" },
  { key: "technical",  label: "Technical",  max: 30,  icon: "💻", color: "#3b82f6", bg: "#eff6ff", border: "#93c5fd" },
  { key: "behavior",   label: "Behavior",   max: 10,  icon: "🤝", color: "#ec4899", bg: "#fdf2f8", border: "#f9a8d4" },
  { key: "initiative", label: "Initiative", max: 15,  icon: "🚀", color: "#6366f1", bg: "#eef2ff", border: "#a5b4fc" },
]

// Every category is rated 0–10 by faculty; we convert to weighted points internally
const RATING_LABELS: Record<number, string> = {
  0:"Not Rated", 1:"Very Poor", 2:"Very Poor", 3:"Poor", 4:"Poor",
  5:"Average", 6:"Average", 7:"Good", 8:"Good", 9:"Excellent", 10:"Excellent",
}
const ratingColor = (r: number) =>
  r === 0 ? "#cbd5e1" : r <= 3 ? "#dc2626" : r <= 5 ? "#d97706" : r <= 7 ? "#2563eb" : "#059669"
const toPoints = (rating: number, max: number) => Math.round((rating / 10) * max)

// Map an Attendance Tracker status to an auto rating (0-10)
const attendanceStatusToRating = (status?: string): number | null => {
  if (status === "present")  return 10
  if (status === "half_day") return 5
  if (status === "absent")   return 0
  if (status === "holiday")  return 10
  return null // no record for this date — fall back to manual
}

const tierInfo = (t: number) =>
  t >= 90 ? { label: "Pro",       color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" }
  : t >= 75 ? { label: "Good",    color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" }
  : t >= 50 ? { label: "Average", color: "#d97706", bg: "#fffbeb", border: "#fde68a" }
  :           { label: "Beginner",color: "#dc2626", bg: "#fef2f2", border: "#fecaca" }

const getPctColor = (pct: number) =>
  pct >= 90 ? "#059669" : pct >= 75 ? "#2563eb" : pct >= 50 ? "#d97706" : "#dc2626"

const avatarGrads = [
  ["#667eea","#764ba2"],["#f093fb","#f5576c"],["#4facfe","#00f2fe"],
  ["#43e97b","#38f9d7"],["#fa709a","#fee140"],["#30cfd0","#667eea"],
  ["#a18cd1","#fbc2eb"],["#fccb90","#d57eeb"],
]

const emptyScores = () => ({ attendance:0, speak_up:0, activity:0, technical:0, behavior:0, initiative:0 })

const DEMO_STUDENTS = [
  { id:1, name:"Khatal Srushti Santosh", email:"srushti@example.com", rollNo:"STU-001" },
  { id:2, name:"Aman Verma",            email:"aman@example.com",    rollNo:"STU-002" },
  { id:3, name:"Rahul Patil",           email:"rahul@example.com",   rollNo:"STU-003" },
  { id:4, name:"Priya Sharma",          email:"priya@example.com",   rollNo:"STU-004" },
  { id:5, name:"Neha Singh",            email:"neha@example.com",    rollNo:"STU-005" },
  { id:6, name:"Rohit Kumar",           email:"rohit@example.com",   rollNo:"STU-006" },
  { id:7, name:"Sagar Joshi",           email:"sagar@example.com",   rollNo:"STU-007" },
  { id:8, name:"Pooja Yadav",           email:"pooja@example.com",   rollNo:"STU-008" },
  { id:9, name:"Vishal Mehta",          email:"vishal@example.com",  rollNo:"STU-009" },
  { id:10,name:"Anjali Gupta",          email:"anjali@example.com",  rollNo:"STU-010" },
]

// ratings (0-10 per category) -> total weighted points out of 100
const totalScore = (ratings: Record<string, number>) =>
  METRICS.reduce((sum, m) => sum + toPoints(ratings[m.key] || 0, m.max), 0)

const initials = (name: string) => name.split(" ").map((w: string) => w[0]).join("").slice(0,2).toUpperCase()
const DRAFT_KEY = (sid: any, date: any) => `score_draft_${sid}_${date}`

interface Student {
  id: number
  name: string
  email: string
  rollNo?: string
  photo?: string
}

interface Props {
  students?: Student[]
  onSaveAll?: (entries: any[]) => Promise<void>
  batchName?: string
}

export default function ScoreEntryFullRange({
  students: propStudents,
  onSaveAll,
  batchName = "BCA 1st Year - A",
}: Props) {

  const students = propStudents || DEMO_STUDENTS
  const today = new Date().toLocaleDateString("en-CA")

  const [date, setDate] = useState(today)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [scores, setScores] = useState<any>({})
  const [saved,  setSaved]  = useState<any>({})
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [showSummary, setShowSummary] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)

  // ✅ Attendance summary for selected student
  const [attendance, setAttendance] = useState<Record<string, string>>({})
  const [attLoading, setAttLoading] = useState(false)
  // Track which (student, date) combos faculty chose to manually override
  const [attOverride, setAttOverride] = useState<Record<string, boolean>>({})

  const showToast = (msg: string, type = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const loaded: any = {}
    students.forEach(s => {
      try {
        const d = localStorage.getItem(DRAFT_KEY(s.id, date))
        if (d) loaded[s.id] = JSON.parse(d)
      } catch {}
    })
    setScores(loaded)
    setSaved({})
  }, [date])

  const getScores = (sid: any) => scores[sid] || emptyScores()
  const setStudentScore = (sid: any, key: string, val: number) => {
    setScores((prev: any) => {
      const next = { ...prev, [sid]: { ...getScores(sid), [key]: val } }
      try { localStorage.setItem(DRAFT_KEY(sid, date), JSON.stringify(next[sid])) } catch {}
      return next
    })
  }

  const filteredStudents = students.filter(s => {
    const q = search.toLowerCase()
    if (q && !s.name.toLowerCase().includes(q)) return false
    if (filter === "scored")  return !!saved[s.id]
    if (filter === "pending") return !saved[s.id]
    return true
  })

  const sel = filteredStudents[selectedIdx] || filteredStudents[0]
  const selRealIdx = sel ? students.findIndex(s => s.id === sel.id) : 0

  // ✅ Fetch attendance summary whenever selected student changes
  useEffect(() => {
    if (!sel) return
    setAttLoading(true)
    fetch(`${API}/attendance/student/${sel.id}`)
      .then(r => r.json())
      .then(data => {
        const map: Record<string, string> = {}
        ;(Array.isArray(data) ? data : []).forEach((r: any) => {
          map[r.date] = r.status
        })
        setAttendance(map)
      })
      .catch(() => setAttendance({}))
      .finally(() => setAttLoading(false))
  }, [sel?.id])

  const attVals = Object.values(attendance)
  const attPresent = attVals.filter(v => v === "present").length
  const attHalf    = attVals.filter(v => v === "half_day").length
  const attAbsent  = attVals.filter(v => v === "absent").length
  const attHoliday = attVals.filter(v => v === "holiday").length
  const attMarked  = attPresent + attHalf + attAbsent + attHoliday
  const attPct     = attMarked > 0 ? Math.round(((attPresent + attHalf * 0.5) / attMarked) * 100) : 0

  const overrideKey = sel ? `${sel.id}_${date}` : ""
  const todayStatus = attendance[date] // this student's attendance status for the selected date
  const autoRating = attendanceStatusToRating(todayStatus)
  const isAttendanceSynced = autoRating !== null && !attOverride[overrideKey]

  // ✅ Auto-fill Attendance score from Attendance Tracker, unless faculty overrode it
  useEffect(() => {
    if (!sel) return
    if (attLoading) return
    if (autoRating === null) return           // no record for this date — leave manual
    if (attOverride[overrideKey]) return       // faculty chose to edit manually
    if ((scores[sel.id]?.attendance ?? 0) !== autoRating) {
      setStudentScore(sel.id, "attendance", autoRating)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel?.id, date, todayStatus, attLoading])

  const handleSave = async (single = false) => {
    setSaving(true)
    const toSave = single
      ? [{ student: sel, sc: getScores(sel.id) }]
      : students.map(s => ({ student: s, sc: getScores(s.id) }))

    try {
      if (onSaveAll) {
        await onSaveAll(toSave.map(({ student, sc }) => {
          const points: any = {}
          METRICS.forEach(m => { points[m.key] = toPoints(sc[m.key] || 0, m.max) })
          return {
            student_id: student.id,
            date,
            ...points,
            total: totalScore(sc),
            score_type: "daily",
          }
        }))
      }
      const newSaved = { ...saved }
      toSave.forEach(({ student }) => {
        newSaved[student.id] = true
        try { localStorage.removeItem(DRAFT_KEY(student.id, date)) } catch {}
      })
      setSaved(newSaved)
      showToast(single ? `Score saved for ${sel.name}! 🚀` : "All scores saved! 🚀")
    } catch (e: any) {
      showToast(e?.response?.data?.detail || "Error saving scores", "error")
    }
    setSaving(false)
  }

  const goNext = () => { if (selectedIdx < filteredStudents.length - 1) setSelectedIdx(i => i + 1) }
  const goPrev = () => { if (selectedIdx > 0) setSelectedIdx(i => i - 1) }

  const scoredCount = students.filter(s => saved[s.id]).length

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }
        .frs-root { font-family: 'Plus Jakarta Sans', sans-serif; background: #f8f9fe; min-height: 100vh; color: #0f172a; }

        .frs-topbar { background: #fff; border-bottom: 1px solid #e5e9f5; padding: 16px 32px; display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
        .frs-title { font-size: 22px; font-weight: 800; color: #0f172a; }
        .frs-sub   { font-size: 13px; color: #64748b; margin-top: 2px; }
        .frs-topbar-right { margin-left: auto; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .frs-date-input { padding: 9px 14px; border-radius: 10px; border: 1.5px solid #e5e9f5; font-size: 13px; font-family: 'Plus Jakarta Sans', sans-serif; color: #0f172a; outline: none; background: #fff; cursor: pointer; }
        .frs-date-input:focus { border-color: #5b5ef4; }

        .frs-btn-outline { padding: 9px 18px; border-radius: 10px; border: 1.5px solid #e5e9f5; background: #fff; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; color: #0f172a; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
        .frs-btn-outline:hover { background: #f8f9fe; border-color: #c7d2fe; }

        .frs-btn-primary { padding: 9px 20px; border-radius: 10px; border: none; background: linear-gradient(135deg,#5b5ef4,#818cf8); font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; color: #fff; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(91,94,244,0.3); transition: all 0.2s; }
        .frs-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(91,94,244,0.4); }
        .frs-btn-primary:disabled { opacity:0.6; cursor: not-allowed; transform: none; }

        .frs-body { display: grid; grid-template-columns: 300px 1fr; height: calc(100vh - 72px); overflow: hidden; }

        /* Left panel */
        .frs-left { background: #fff; border-right: 1px solid #e5e9f5; display: flex; flex-direction: column; height: 100%; overflow: hidden; }
        .frs-left-header { padding: 16px 20px 12px; border-bottom: 1px solid #e5e9f5; flex-shrink: 0; }
        .frs-stats-row { display:flex; gap:8px; }
        .frs-stat-pill { flex:1; background:#f8f9fe; border:1px solid #e5e9f5; border-radius:8px; padding:8px 10px; text-align:center; }
        .frs-stat-pill-val { font-size:18px; font-weight:800; color:#5b5ef4; }
        .frs-stat-pill-lbl { font-size:10px; color:#94a3b8; font-weight:600; margin-top:1px; }

        .frs-filter-row { display:flex; gap:4px; padding:10px 20px 0; flex-shrink:0; }
        .frs-filter-btn { flex:1; padding:7px 6px; border-radius:8px; border:1px solid #e5e9f5; background:transparent; font-size:11px; font-weight:700; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; color:#94a3b8; transition:all 0.15s; }
        .frs-filter-btn.active { background:#eef0ff; color:#5b5ef4; border-color:#c7d2fe; }

        .frs-search-wrap { padding:10px 20px 0; position:relative; flex-shrink:0; }
        .frs-search { width:100%; padding:9px 36px 9px 12px; border-radius:9px; border:1.5px solid #e5e9f5; font-size:13px; font-family:'Plus Jakarta Sans',sans-serif; outline:none; color:#0f172a; background:#f8f9fe; }
        .frs-search:focus { border-color:#5b5ef4; background:#fff; }
        .frs-search-icon { position:absolute; right:30px; top:50%; transform:translateY(-50%); font-size:14px; color:#94a3b8; pointer-events:none; margin-top:5px; }

        .frs-list { flex:1; overflow-y:auto; padding:10px 12px 20px; }
        .frs-student-row { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; cursor:pointer; transition:all 0.15s; margin-bottom:4px; border:1px solid transparent; }
        .frs-student-row:hover { background:#f8f9fe; }
        .frs-student-row.active { background:#eef0ff; border-color:#c7d2fe; }
        .frs-srow-num { font-size:12px; color:#94a3b8; font-weight:600; min-width:20px; text-align:center; }
        .frs-srow-avatar { width:36px; height:36px; border-radius:10px; flex-shrink:0; overflow:hidden; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:800; color:#fff; }
        .frs-srow-info { flex:1; min-width:0; }
        .frs-srow-name { font-size:13px; font-weight:600; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .frs-srow-score { font-size:11px; color:#64748b; margin-top:1px; }
        .frs-srow-badge { width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; flex-shrink:0; }

        /* Right panel */
        .frs-right { display:flex; flex-direction:column; height:100%; overflow:hidden; }

        .frs-right-header {
          padding: 16px 32px;
          background: #fff;
          border-bottom: 1px solid #e5e9f5;
          display: flex;
          align-items: center;
          gap: 16px;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          z-index: 10;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          flex-wrap: wrap;
        }
        .frs-student-avatar-lg { width:48px; height:48px; border-radius:13px; flex-shrink:0; overflow:hidden; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:800; color:#fff; }
        .frs-student-name-lg { font-size:18px; font-weight:800; color:#0f172a; }
        .frs-student-roll { font-size:12px; color:#64748b; margin-top:2px; }

        /* ✅ Attendance summary badge */
        .frs-att-badge { display:flex; align-items:center; gap:14px; padding:8px 14px; border-radius:10px; margin-left:8px; }
        .frs-att-label { font-size:10px; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; }
        .frs-att-breakdown { font-size:11px; color:#94a3b8; font-weight:600; }

        .frs-header-actions { display:flex; align-items:center; gap:8px; margin-left:auto; }
        .frs-btn-nav { padding:9px 16px; border-radius:10px; border:1.5px solid #e5e9f5; background:#fff; font-size:13px; font-weight:700; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; color:#0f172a; display:flex; align-items:center; gap:6px; transition:all 0.2s; }
        .frs-btn-nav:hover:not(:disabled) { background:#f8f9fe; border-color:#c7d2fe; }
        .frs-btn-nav:disabled { opacity:0.4; cursor:not-allowed; }
        .frs-btn-save { padding:10px 22px; border-radius:10px; border:none; background:linear-gradient(135deg,#5b5ef4,#818cf8); font-size:13px; font-weight:700; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; color:#fff; display:flex; align-items:center; gap:6px; box-shadow:0 4px 14px rgba(91,94,244,0.3); transition:all 0.2s; }
        .frs-btn-save:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(91,94,244,0.4); }
        .frs-btn-save:disabled { opacity:0.6; cursor:not-allowed; transform:none; }

        .frs-total-wrap { text-align:right; padding-left:16px; border-left:1px solid #f1f5f9; }
        .frs-total-label { font-size:10px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:1px; }
        .frs-total-score { font-size:32px; font-weight:800; line-height:1; }
        .frs-total-out { font-size:14px; color:#94a3b8; font-weight:500; }
        .frs-tier-pill { display:inline-block; padding:3px 12px; border-radius:20px; font-size:11px; font-weight:700; margin-top:4px; }

        .frs-metrics-area { flex:1; padding:20px 32px; overflow-y:auto; }
        .frs-metric-row { display:flex; align-items:center; gap:16px; padding:18px 0; border-bottom:1px solid #f1f5f9; }
        .frs-metric-row:last-child { border-bottom:none; }
        .frs-metric-icon { font-size:24px; flex-shrink:0; }
        .frs-metric-label { font-size:15px; font-weight:700; color:#0f172a; min-width:110px; }
        .frs-metric-max { font-size:11px; color:#94a3b8; }

        .frs-footer { background:#fff; border-top:1px solid #e5e9f5; padding:10px 32px; display:flex; align-items:center; flex-shrink:0; }
        .frs-autosave-note { font-size:12px; color:#94a3b8; display:flex; align-items:center; gap:6px; }

        .frs-toast { position:fixed; bottom:28px; right:28px; z-index:9999; padding:12px 20px; border-radius:12px; font-size:13px; font-weight:700; box-shadow:0 8px 32px rgba(0,0,0,0.15); animation:slideUp 0.3s ease; font-family:'Plus Jakarta Sans',sans-serif; }
        @keyframes slideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }

        .frs-overlay { position:fixed; inset:0; z-index:200; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; }
        .frs-summary-card { background:#fff; border-radius:20px; padding:28px 32px; width:560px; max-height:80vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,0.2); }
        .frs-summary-title { font-size:18px; font-weight:800; color:#0f172a; margin-bottom:18px; }
        .frs-summary-row { display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid #f1f5f9; }
        .frs-summary-row:last-child { border-bottom:none; }

        @media(max-width:768px){
          .frs-body { grid-template-columns:1fr; height:auto; }
          .frs-left { max-height:300px; }
          .frs-topbar { padding:12px 16px; }
          .frs-right-header { padding:12px 16px; flex-wrap:wrap; }
          .frs-metrics-area { padding:16px; }
          .frs-footer { padding:10px 16px; }
          .frs-header-actions { flex-wrap:wrap; }
          .frs-total-wrap { border-left:none; padding-left:0; }
          .frs-att-badge { margin-left:0; }
          .frs-metric-row { flex-wrap:wrap; }
        }
      `}</style>

      <div className="frs-root">

        {toast && (
          <div className="frs-toast" style={{
            background: toast.type==="error"?"#fef2f2":toast.type==="warning"?"#fffbeb":"#f0fdf4",
            color:      toast.type==="error"?"#dc2626":toast.type==="warning"?"#b45309":"#15803d",
            border:     `1px solid ${toast.type==="error"?"#fecaca":toast.type==="warning"?"#fde68a":"#bbf7d0"}`,
          }}>
            {toast.msg}
          </div>
        )}

        {showSummary && (
          <div className="frs-overlay" onClick={() => setShowSummary(false)}>
            <div className="frs-summary-card" onClick={e => e.stopPropagation()}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
                <div className="frs-summary-title">📊 Score Summary — {date}</div>
                <button onClick={() => setShowSummary(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#94a3b8"}}>✕</button>
              </div>
              {students.map((s,i) => {
                const sc = getScores(s.id)
                const tot = totalScore(sc)
                const tier = tierInfo(tot)
                const [g1,g2] = avatarGrads[i % avatarGrads.length]
                return (
                  <div key={s.id} className="frs-summary-row">
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:32,height:32,borderRadius:8,background:`linear-gradient(135deg,${g1},${g2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff",flexShrink:0,overflow:"hidden"}}>
                        {s.photo ? <img src={s.photo} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="" /> : initials(s.name)}
                      </div>
                      <div>
                        <div style={{fontSize:13,fontWeight:700}}>{s.name}</div>
                        <div style={{fontSize:11,color:"#94a3b8"}}>{s.rollNo}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:20,fontWeight:800,color:tier.color}}>{tot}</span>
                      <span style={{fontSize:11,color:"#94a3b8"}}>/100</span>
                      <span className="frs-tier-pill" style={{background:tier.bg,color:tier.color,border:`1px solid ${tier.border}`,fontSize:11}}>{tier.label}</span>
                      {saved[s.id] && <span style={{fontSize:14}}>✅</span>}
                    </div>
                  </div>
                )
              })}
              <button className="frs-btn-primary" style={{width:"100%",marginTop:20,justifyContent:"center"}}
                onClick={() => { handleSave(false); setShowSummary(false) }} disabled={saving}>
                {saving ? "Saving…" : "💾 Save All Scores"}
              </button>
            </div>
          </div>
        )}

        <div className="frs-topbar">
          <div>
            <div className="frs-title">📝 Score Entry</div>
            <div className="frs-sub">Rate each category from 0–10. Points are calculated automatically based on category weight.</div>
          </div>
          <div className="frs-topbar-right">
            <input type="date" className="frs-date-input" value={date} onChange={e => setDate(e.target.value)} />
            <button className="frs-btn-outline" onClick={() => setShowSummary(true)}>📊 View Summary</button>
            <button className="frs-btn-primary" onClick={() => handleSave(false)} disabled={saving}>
              💾 {saving ? "Saving…" : "Save All Scores"}
            </button>
          </div>
        </div>

        <div className="frs-body">

          {/* LEFT: student list */}
          <div className="frs-left">
            <div className="frs-left-header">
              <div className="frs-stats-row">
                <div className="frs-stat-pill">
                  <div className="frs-stat-pill-val">{students.length}</div>
                  <div className="frs-stat-pill-lbl">Total Students</div>
                </div>
                <div className="frs-stat-pill">
                  <div className="frs-stat-pill-val" style={{color:"#10b981"}}>{scoredCount}</div>
                  <div className="frs-stat-pill-lbl">Scored</div>
                </div>
                <div className="frs-stat-pill">
                  <div className="frs-stat-pill-val" style={{color:"#f59e0b"}}>{students.length - scoredCount}</div>
                  <div className="frs-stat-pill-lbl">Pending</div>
                </div>
              </div>
            </div>

            <div className="frs-filter-row">
              {["all","scored","pending"].map(f => (
                <button key={f} className={`frs-filter-btn ${filter===f?"active":""}`}
                  onClick={() => { setFilter(f); setSelectedIdx(0) }}>
                  {f==="all"?"All":f==="scored"?"✅ Scored":"⏳ Pending"}
                </button>
              ))}
            </div>

            <div className="frs-search-wrap">
              <input className="frs-search" placeholder="Search student..." value={search}
                onChange={e => { setSearch(e.target.value); setSelectedIdx(0) }} />
              <span className="frs-search-icon">🔍</span>
            </div>

            <div className="frs-list">
              {filteredStudents.map((s, fi) => {
                const realIdx = students.findIndex(x => x.id === s.id)
                const [g1,g2] = avatarGrads[realIdx % avatarGrads.length]
                const sc = getScores(s.id)
                const tot = totalScore(sc)
                const hasAnyScore = tot > 0 || saved[s.id]
                const isActive = fi === selectedIdx
                return (
                  <div key={s.id} className={`frs-student-row ${isActive?"active":""}`} onClick={() => setSelectedIdx(fi)}>
                    <span className="frs-srow-num">{realIdx+1}</span>
                    <div className="frs-srow-avatar" style={{background:`linear-gradient(135deg,${g1},${g2})`}}>
                      {s.photo ? <img src={s.photo} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="" /> : initials(s.name)}
                    </div>
                    <div className="frs-srow-info">
                      <div className="frs-srow-name">{s.name}</div>
                      <div className="frs-srow-score">
                        {saved[s.id] ? `${tot}/100` : hasAnyScore ? `${tot}/100 (draft)` : "–/100"}
                      </div>
                    </div>
                    <div className="frs-srow-badge" style={{
                      background: saved[s.id] ? "#ecfdf5" : hasAnyScore ? "#fffbeb" : "#f1f5f9",
                      color:      saved[s.id] ? "#10b981" : hasAnyScore ? "#f59e0b" : "#94a3b8",
                    }}>
                      {saved[s.id] ? "✓" : hasAnyScore ? "◑" : "○"}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* RIGHT: score entry */}
          {sel && (() => {
            const [g1,g2] = avatarGrads[selRealIdx % avatarGrads.length]
            const sc = getScores(sel.id)
            const tot = totalScore(sc)
            const tier = tierInfo(tot)
            return (
              <div className="frs-right">

                <div className="frs-right-header">
                  <div className="frs-student-avatar-lg" style={{background:`linear-gradient(135deg,${g1},${g2})`}}>
                    {sel.photo
                      ? <img src={sel.photo} alt={sel.name} style={{width:"100%",height:"100%",objectFit:"cover"}} />
                      : initials(sel.name)
                    }
                  </div>
                  <div>
                    <div className="frs-student-name-lg">{sel.name}</div>
                    {sel.rollNo && <div className="frs-student-roll">Roll No: {sel.rollNo}</div>}
                  </div>

                  {/* ✅ Attendance summary badge with day-wise boxes */}
                  {!attLoading && attMarked > 0 && (
                    <div className="frs-att-badge" style={{
                      background: getPctColor(attPct) + "0c",
                      border: `1.5px solid ${getPctColor(attPct)}33`,
                    }}>
                      <div style={{display:"flex", flexDirection:"column", gap:6}}>
                        <div style={{display:"flex", alignItems:"center", gap:8}}>
                          <span className="frs-att-label">Attendance</span>
                          <span className="frs-att-breakdown">P:{attPresent} · HD:{attHalf} · A:{attAbsent} · H:{attHoliday}</span>
                        </div>
                        <div style={{display:"flex", gap:4, flexWrap:"wrap"}}>
                          {Object.entries(attendance)
                            .sort(([a],[b]) => a.localeCompare(b))
                            .slice(-7)
                            .map(([d, status]) => {
                              const lbl = status === "present" ? "P" : status === "half_day" ? "HD" : status === "absent" ? "A" : status === "holiday" ? "H" : "—"
                              const clr = status === "present" ? "#059669" : status === "half_day" ? "#2563eb" : status === "absent" ? "#dc2626" : status === "holiday" ? "#d97706" : "#94a3b8"
                              const bg  = status === "present" ? "#ecfdf5" : status === "half_day" ? "#eff6ff" : status === "absent" ? "#fef2f2" : status === "holiday" ? "#fffbeb" : "#f8f9fe"
                              const brd = status === "present" ? "#a7f3d0" : status === "half_day" ? "#bfdbfe" : status === "absent" ? "#fecaca" : status === "holiday" ? "#fde68a" : "#e5e9f5"
                              const dl = new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day:"numeric", month:"short" })
                              return (
                                <div key={d} title={dl} style={{
                                  display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                                  minWidth:34, padding:"3px 4px", borderRadius:6,
                                  background:bg, border:`1px solid ${brd}`, color:clr,
                                }}>
                                  <span style={{fontSize:9, fontWeight:600, color:"#94a3b8"}}>{dl}</span>
                                  <span style={{fontSize:11, fontWeight:800}}>{lbl}</span>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                      <div style={{textAlign:"right", marginLeft:4}}>
                        <div style={{fontSize:22, fontWeight:800, color:getPctColor(attPct), lineHeight:1}}>{attPct}%</div>
                        <div style={{fontSize:10, color:"#94a3b8"}}>{attMarked} days</div>
                      </div>
                    </div>
                  )}
                  {attLoading && (
                    <div className="frs-att-badge" style={{background:"#f8f9fe", border:"1.5px solid #e5e9f5"}}>
                      <span style={{fontSize:12, color:"#94a3b8"}}>Loading attendance…</span>
                    </div>
                  )}

                  <div className="frs-header-actions">
                    <button className="frs-btn-nav" onClick={goPrev} disabled={selectedIdx === 0}>
                      ← Prev
                    </button>
                    <button
                      className="frs-btn-save"
                      onClick={() => handleSave(true)}
                      disabled={saving}
                    >
                      {saved[sel.id]
                        ? "✅ Saved!"
                        : saving
                        ? "Saving…"
                        : `💾 Submit ${sel.name.split(" ")[0]}'s Score`
                      }
                    </button>
                    <button className="frs-btn-nav" onClick={goNext} disabled={selectedIdx === filteredStudents.length - 1}>
                      Next →
                    </button>
                  </div>

                  <div className="frs-total-wrap">
                    <div className="frs-total-label">Total Score</div>
                    <div>
                      <span className="frs-total-score" style={{color:tier.color}}>{tot}</span>
                      <span className="frs-total-out">/100</span>
                    </div>
                    <span className="frs-tier-pill" style={{background:tier.bg,color:tier.color,border:`1px solid ${tier.border}`}}>
                      {tier.label}
                    </span>
                  </div>
                </div>

                <div className="frs-metrics-area">
                  {METRICS.map(m => {
                    const rating = sc[m.key] || 0
                    const points = toPoints(rating, m.max)
                    const isAttendanceRow = m.key === "attendance"
                    const locked = isAttendanceRow && isAttendanceSynced

                    return (
                      <div key={m.key} className="frs-metric-row">
                        <span className="frs-metric-icon">{m.icon}</span>
                        <div style={{minWidth:110}}>
                          <div className="frs-metric-label">{m.label}</div>
                          <div className="frs-metric-max">weight: {m.max} pts</div>
                        </div>
                        <div style={{flex:1, display:"flex", flexDirection:"column", gap:8, minWidth:220}}>

                          {locked ? (
                            <>
                              <div style={{display:"flex", alignItems:"center", gap:10, flexWrap:"wrap"}}>
                                <span style={{
                                  fontSize:11.5, fontWeight:700, color:"#059669", background:"#ecfdf5",
                                  border:"1px solid #a7f3d0", borderRadius:20, padding:"4px 10px",
                                  display:"flex", alignItems:"center", gap:5,
                                }}>
                                  🔄 Synced from Attendance Tracker — {todayStatus === "present" ? "Present" : todayStatus === "half_day" ? "Half Day" : todayStatus === "absent" ? "Absent" : "Holiday"}
                                </span>
                                <button
                                  onClick={() => setAttOverride(prev => ({ ...prev, [overrideKey]: true }))}
                                  style={{ background:"none", border:"none", cursor:"pointer", fontSize:11.5, color:"#5b5ef4", fontWeight:700, textDecoration:"underline" }}
                                >
                                  Edit manually
                                </button>
                              </div>
                              <div style={{display:"flex", alignItems:"center", gap:14}}>
                                <div style={{ flex:1, height:6, borderRadius:99, background:"#f1f5f9", overflow:"hidden" }}>
                                  <div style={{ height:"100%", width:`${rating*10}%`, background: m.color, borderRadius:99 }} />
                                </div>
                                <div style={{
                                  minWidth:66, textAlign:"center", padding:"6px 10px", borderRadius:9,
                                  background:m.bg, border:`1.5px solid ${m.border}`,
                                  fontWeight:800, fontSize:15, color:m.color,
                                }}>
                                  {rating}/10
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div style={{display:"flex", alignItems:"center", gap:14}}>
                                <input
                                  type="range" min={0} max={10} step={1} value={rating}
                                  onChange={e => setStudentScore(sel.id, m.key, Number(e.target.value))}
                                  style={{ flex:1, accentColor: ratingColor(rating), height:6, cursor:"pointer" }}
                                />
                                <div style={{
                                  minWidth:66, textAlign:"center", padding:"6px 10px", borderRadius:9,
                                  background: rating===0 ? "#f1f5f9" : m.bg,
                                  border:`1.5px solid ${rating===0?"#e5e9f5":m.border}`,
                                  fontWeight:800, fontSize:15, color: rating===0 ? "#94a3b8" : m.color,
                                }}>
                                  {rating}/10
                                </div>
                              </div>
                              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:11.5}}>
                                <span style={{color: ratingColor(rating), fontWeight:700}}>{RATING_LABELS[rating]}</span>
                                <span style={{display:"flex", alignItems:"center", gap:10}}>
                                  {isAttendanceRow && attOverride[overrideKey] && (
                                    <button
                                      onClick={() => setAttOverride(prev => { const n = { ...prev }; delete n[overrideKey]; return n })}
                                      style={{ background:"none", border:"none", cursor:"pointer", fontSize:11, color:"#5b5ef4", fontWeight:700, textDecoration:"underline" }}
                                    >
                                      Use synced value
                                    </button>
                                  )}
                                  <span style={{color:"#94a3b8", fontWeight:600}}>→ {points}/{m.max} pts</span>
                                </span>
                              </div>
                            </>
                          )}

                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="frs-footer">
                  <div className="frs-autosave-note">
                    <span style={{fontSize:16}}>ℹ️</span>
                    Scores are auto-saved as drafts. Click Submit to confirm.
                  </div>
                </div>

              </div>
            )
          })()}
        </div>
      </div>
    </>
  )
}