"use client"
import Toast from "@/components/Toast"
import { useToast } from "@/lib/useToast"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import AttendanceTracker from "@/components/AttendanceTracker"
import StudyMaterial from "@/components/StudyMaterial"
import DailyActivity from "@/components/Dailyactivity"
import InterpersonalSkills from "@/components/InterpersonalSkills"
import ProjectUpdates from "@/components/ProjectUpdates"
import ScoreEntryFullRange from "@/components/ScoreForm"

import {
  getStudents, createStudent, deleteStudent,
  getLeaderboard, getStudentOfDay, submitScore,
  giveReward, getAllRewards,
  getWeeklyLeaderboard, getMonthlyLeaderboard,
  getAllAverages, getAllStreaks,
  updateStudentPhoto, updateStudent, getActiveBatches,
} from "@/lib/api"

type Period = "daily" | "weekly" | "monthly"

const scoreMax: Record<string, number> = {
  attendance: 10, speak_up: 15, activity: 20,
  technical: 30, behavior: 10, initiative: 15,
}

const labels: Record<string, { label: string; icon: string; max: number; color: string; bg: string; border: string }> = {
  attendance: { label: "Attendance", icon: "🟢", max: 10, color: "#10b981", bg: "#ecfdf5", border: "#bbf7d0" },
  speak_up:   { label: "Speak Up",   icon: "🎤", max: 15, color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe" },
  activity:   { label: "Activity",   icon: "⚡", max: 20, color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  technical:  { label: "Technical",  icon: "💻", max: 30, color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
  behavior:   { label: "Behavior",   icon: "🤝", max: 10, color: "#ec4899", bg: "#fdf2f8", border: "#fbcfe8" },
  initiative: { label: "Initiative", icon: "🚀", max: 15, color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe" },
}

const emptyScoreForm = () => ({
  student_id: "", date: new Date().toISOString().split("T")[0],
  attendance: 0, speak_up: 0, activity: 0,
  technical: 0, behavior: 0, initiative: 0,
})

// ── Draft helpers ──────────────────────────────────────────
const saveFormDraft = (period: string, form: any) => {
  try { localStorage.setItem(`score_draft_${period}`, JSON.stringify(form)) } catch {}
}
const loadFormDraft = (period: string) => {
  try {
    const saved = localStorage.getItem(`score_draft_${period}`)
    return saved ? JSON.parse(saved) : emptyScoreForm()
  } catch { return emptyScoreForm() }
}
const clearFormDraft = (period: string) => {
  try { localStorage.removeItem(`score_draft_${period}`) } catch {}
}

const tierInfo = (t: number) =>
  t >= 90 ? { label: "🔮 Pro",       color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" }
  : t >= 75 ? { label: "💎 Skilled", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" }
  : t >= 50 ? { label: "🌟 Learner", color: "#d97706", bg: "#fffbeb", border: "#fde68a" }
  :           { label: "🌱 Beginner",color: "#dc2626", bg: "#fef2f2", border: "#fecaca" }

const rankEmoji = (i: number) => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`

const avatarColors = [
  ["#667eea","#764ba2"],["#f093fb","#f5576c"],["#4facfe","#00f2fe"],
  ["#43e97b","#38f9d7"],["#fa709a","#fee140"],["#30cfd0","#667eea"],
]

const streakColor = (n: number) =>
  n >= 14 ? { bg:"#fff1f2", color:"#be123c", border:"#fecdd3" }
  : n >= 7  ? { bg:"#fff7ed", color:"#c2410c", border:"#fed7aa" }
  :           { bg:"#fefce8", color:"#b45309", border:"#fde68a" }

function StreakBadge({ streak, size = "sm" }: { streak: number; size?: "sm" | "md" }) {
  if (streak === 0) return <span style={{ fontSize:11, color:"#94a3b8" }}>No streak yet</span>
  const c = streakColor(streak)
  return (
    <span style={{
      fontSize: size === "md" ? 12 : 11, fontWeight: 700,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      borderRadius: 20, padding: size === "md" ? "4px 12px" : "3px 10px",
      whiteSpace: "nowrap" as const,
    }}>
      🔥 {streak} day{streak !== 1 ? "s" : ""} streak
    </span>
  )
}

function PeriodSelector({ active, onChange }: { active: Period; onChange: (p: Period) => void }) {
  const opts: { key: Period; label: string }[] = [
    { key: "daily",   label: "📅 Daily"   },
    { key: "weekly",  label: "📆 Weekly"  },
    { key: "monthly", label: "🗓️ Monthly" },
  ]
  return (
    <div style={{ display:"flex", gap:6, background:"#f1f5f9", padding:4, borderRadius:12, width:"fit-content", marginBottom:24 }}>
      {opts.map(p => (
        <button key={p.key} onClick={() => onChange(p.key)} style={{
          padding:"8px 18px", borderRadius:9, border:"none", cursor:"pointer",
          fontWeight:700, fontSize:13, fontFamily:"'Plus Jakarta Sans',sans-serif",
          transition:"all 0.2s",
          background: active === p.key ? "#fff" : "transparent",
          color:       active === p.key ? "#5b5ef4" : "#94a3b8",
          boxShadow:   active === p.key ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
        }}>{p.label}</button>
      ))}
    </div>
  )
}

function MetricRow({ metricKey, form, setForm }: { metricKey: string; form: any; setForm: any }) {
  const m = labels[metricKey]
  const val = form[metricKey]
  const pct = Math.round((val / m.max) * 100)
  return (
    <div className="score-metric" style={{ borderColor: val > 0 ? m.border : "var(--border)", background: val > 0 ? m.bg : "#fff" }}>
      <span style={{ fontSize:24 }}>{m.icon}</span>
      <div style={{ minWidth:110 }}>
        <div style={{ fontSize:14, fontWeight:600, color:"var(--text)" }}>{m.label}</div>
        <div style={{ fontSize:11, color:"var(--faint)" }}>max {m.max} pts</div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginLeft:"auto" }}>
        <div style={{ width:80, height:6, background:"#f1f5f9", borderRadius:99, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`, background:m.color, borderRadius:99, transition:"width 0.3s" }} />
        </div>
        <input
          type="number" min={0} max={m.max} value={val}
          onChange={e => {
            let v = parseInt(e.target.value) || 0
            if (v < 0) v = 0
            if (v > m.max) v = m.max
            setForm((prev: any) => ({ ...prev, [metricKey]: v }))
          }}
          style={{
            width:64, padding:"8px 10px", borderRadius:8,
            border:`1.5px solid ${val > 0 ? m.color : "var(--border)"}`,
            background: val > 0 ? m.bg : "#fff", color:m.color,
            fontWeight:800, fontSize:16, textAlign:"center",
            outline:"none", fontFamily:"'Plus Jakarta Sans',sans-serif", transition:"all 0.2s",
          }}
        />
        <span style={{ fontSize:12, color:"var(--faint)", minWidth:40 }}>/ {m.max}</span>
      </div>
    </div>
  )
}

function LeaderboardList({ data, period, streaks = {} }: { data: any[]; period: Period; streaks?: Record<number, number> }) {
  if (data.length === 0) return (
    <div style={{ textAlign:"center", padding:"48px 24px" }}>
      <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
      <p style={{ color:"var(--muted)", fontSize:15 }}>No scores for {period === "daily" ? "today" : period === "weekly" ? "this week" : "this month"} yet</p>
    </div>
  )
  return (
    <>
      {data.map((e, i) => {
        const t = tierInfo(e.total)
        const streak = streaks[e.student_id] || 0
        return (
          <div key={i} className="lb-row" style={{
            background: i === 0 ? "linear-gradient(135deg,#fffbeb,#fef9c3)" : "#fff",
            borderColor: i === 0 ? "#fde68a" : "var(--border)",
          }}>
            <span className="lb-rank">{rankEmoji(i)}</span>
            <div style={{ flex:1 }}>
              <div className="lb-name">{e.name}</div>
              {streak > 0 && <div style={{ marginTop:4 }}><StreakBadge streak={streak} /></div>}
            </div>
            <div className="lb-bar-wrap">
              <div className="lb-bar" style={{ width:`${Math.min((e.total / (period === "daily" ? 100 : 700)) * 100, 100)}%`, background:t.color }} />
            </div>
            <div style={{ textAlign:"right" }}>
              <span className="lb-score" style={{ color:t.color }}>{e.total}</span>
              <span className="lb-denom">{period === "daily" ? "/100" : " pts"}</span>
            </div>
            <span className="tier-pill" style={{ background:t.bg, color:t.color, border:`1px solid ${t.border}` }}>{t.label}</span>
          </div>
        )
      })}
    </>
  )
}

export default function FacultyPage() {
  const router = useRouter()
  const { toasts, showToast, removeToast } = useToast()

  // ── Tab persisted to localStorage ──
  const [tab, setTab] = useState("dashboard")
  useEffect(() => {
    const saved = localStorage.getItem("faculty_tab")
    if (saved) setTab(saved)
  }, [])
  const handleTabChange = (tabId: string) => {
    setTab(tabId)
    localStorage.setItem("faculty_tab", tabId)
  }

  const [students, setStudents] = useState<any[]>([])
  const [studentOfDay, setStudentOfDay] = useState<any>(null)
  const [rewards, setRewards] = useState<any[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [rewardForm, setRewardForm] = useState({ student_id:"", type:"daily", title:"" })
  const [suggestion, setSuggestion] = useState("")
  const [suggestionStudentId, setSuggestionStudentId] = useState("")
  const [dashPeriod, setDashPeriod] = useState<Period>("daily")
  const [scorePeriod, setScorePeriod] = useState<Period>("daily")
  const [rewardPeriod, setRewardPeriod] = useState<Period>("daily")
  const [dashLeaderboard, setDashLeaderboard] = useState<any[]>([])
  const [scoreLeaderboard, setScoreLeaderboard] = useState<any[]>([])
  const [streaks, setStreaks] = useState<Record<number, number>>({})
  const [newPhoto, setNewPhoto] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState("")
  const [activeBatches, setActiveBatches] = useState<any[]>([])
  const [selectedBatchId, setSelectedBatchId] = useState<string>("")

  // ── Score forms — loaded from localStorage drafts ──
  const [dailyForm,   setDailyFormRaw]   = useState(() => loadFormDraft("daily"))
  const [weeklyForm,  setWeeklyFormRaw]  = useState(() => loadFormDraft("weekly"))
  const [monthlyForm, setMonthlyFormRaw] = useState(() => loadFormDraft("monthly"))

  // Wrappers that also save drafts
  const setDailyForm   = (u: any) => { setDailyFormRaw(u);   setDailyFormRaw((v: any) => { saveFormDraft("daily",   v); return v }) }
  const setWeeklyForm  = (u: any) => { setWeeklyFormRaw(u);  setWeeklyFormRaw((v: any) => { saveFormDraft("weekly",  v); return v }) }
  const setMonthlyForm = (u: any) => { setMonthlyFormRaw(u); setMonthlyFormRaw((v: any) => { saveFormDraft("monthly", v); return v }) }

  const formByPeriod    = { daily: dailyForm,    weekly: weeklyForm,    monthly: monthlyForm    }
  const setFormByPeriod: Record<string, any> = { daily: setDailyForm, weekly: setWeeklyForm, monthly: setMonthlyForm }

  // Analytics
  const [analytics, setAnalytics] = useState<any[]>([])
  const [analyticsDays, setAnalyticsDays] = useState(7)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [expandedStudent, setExpandedStudent] = useState<number|null>(null)
  const [customDays, setCustomDays] = useState("")

  useEffect(() => {
    if (!localStorage.getItem("faculty_auth")) { router.push("/login"); return }
    fetchBase()
    fetchLeaderboard("daily", "dash")
    fetchLeaderboard("daily", "score")
    fetchAnalytics(7)
    fetchStreaks()
    fetchBatches()
  }, [])

  const fetchBase = async () => {
    try {
      const [s, r] = await Promise.all([getStudents(), getAllRewards()])
      setStudents(s.data); setRewards(r.data)
    } catch {}
    try { const sod = await getStudentOfDay(); setStudentOfDay(sod.data) } catch {}
  }

  const fetchBatches = async () => {
    try {
      const res = await getActiveBatches()
      setActiveBatches(res.data)
      if (res.data.length === 1) setSelectedBatchId(String(res.data[0].id))
    } catch {}
  }

  const fetchLeaderboard = async (period: Period, context: "dash" | "score") => {
    try {
      let res
      if (period === "daily")       res = await getLeaderboard()
      else if (period === "weekly") res = await getWeeklyLeaderboard()
      else                          res = await getMonthlyLeaderboard()
      if (context === "dash") setDashLeaderboard(res.data)
      else                    setScoreLeaderboard(res.data)
    } catch {
      if (context === "dash") setDashLeaderboard([])
      else                    setScoreLeaderboard([])
    }
  }

  const fetchAnalytics = async (days: number) => {
    setAnalyticsLoading(true)
    try { const res = await getAllAverages(days); setAnalytics(res.data) } catch {}
    setAnalyticsLoading(false)
  }

  const fetchStreaks = async () => {
    try {
      const res = await getAllStreaks()
      const map: Record<number, number> = {}
      res.data.forEach((s: any) => { map[s.student_id] = s.streak })
      setStreaks(map)
    } catch {}
  }

  const handleDashPeriod  = (p: Period) => { setDashPeriod(p);  fetchLeaderboard(p, "dash")  }
  const handleScorePeriod = (p: Period) => { setScorePeriod(p); fetchLeaderboard(p, "score") }

  const handleSubmitScore = async (period: Period) => {
    const form    = formByPeriod[period]
    const setForm = setFormByPeriod[period]
    if (!form.student_id) return showToast("Please select a student!", "warning")
    const total = Object.keys(scoreMax).reduce((sum, k) => sum + Number((form as any)[k]), 0)
    try {
      await submitScore({ ...form, student_id: Number(form.student_id), total, score_type: period })
      fetchBase(); fetchLeaderboard(period, "score"); fetchStreaks()
      showToast("Score submitted successfully! 🚀", "success")
      clearFormDraft(period)
      setForm(emptyScoreForm())
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Error submitting score!"
      showToast(msg.includes("already submitted") ? "⚠️ Score already submitted for this student today!" : msg, "error")
    }
  }

  const handleAddStudent = async () => {
    if (!newName || !newEmail) return showToast("Please fill in all fields!", "warning")
    if (!selectedBatchId) return showToast("No active batch found — create one first!", "warning")
    try {
      await createStudent({ name: newName, email: newEmail, photo: newPhoto || undefined, batch_id: Number(selectedBatchId) })
      setNewName(""); setNewEmail(""); setNewPhoto("")
      const photoInput = document.getElementById("photo-upload") as HTMLInputElement
      if (photoInput) photoInput.value = ""
      fetchBase()
      showToast(`${newName} added successfully!`, "success")
    } catch { showToast("Error adding student. Email may already exist!", "error") }
  }

  const handleGiveReward = async () => {
    if (!rewardForm.student_id || !rewardForm.title) return showToast("Please fill in all fields!", "warning")
    try {
      await giveReward({ ...rewardForm, student_id: Number(rewardForm.student_id) })
      setRewardForm({ student_id:"", type:"daily", title:"" }); fetchBase()
      showToast("Award given successfully! 🏅", "success")
    } catch { showToast("Error giving award!", "error") }
  }

  const handleSubmitSuggestion = async () => {
    if (!suggestionStudentId || !suggestion) return showToast("Please fill in all fields!", "warning")
    try {
      await submitScore({
        student_id: Number(suggestionStudentId),
        date: new Date().toISOString().split("T")[0],
        attendance:0, speak_up:0, activity:0, technical:0, behavior:0, initiative:0,
        total:0, suggestion, score_type: "daily",
      })
      setSuggestion(""); setSuggestionStudentId("")
      showToast("Feedback sent successfully! 💬", "success")
    } catch { showToast("Error sending feedback!", "error") }
  }

  const navTabs = [
    { id:"dashboard",  icon:"🏠", label:"Dashboard"      },
    { id:"score",      icon:"📝", label:"Score Entry"    },
    { id:"students",   icon:"👥", label:"Students"       },
    { id:"leaderboard",icon:"🏆", label:"Leaderboard"   },
    { id:"rewards",    icon:"🎖️", label:"Rewards"        },
    { id:"analytics",  icon:"📈", label:"Analytics"      },
    { id:"attendance", icon:"✅", label:"Attendance"     },
    { id:"activity",   icon:"⚡", label:"Daily Activity" },
    { id:"study",      icon:"📚", label:"Study Material" },
    { id:"interpersonal", icon:"🎯", label:"Interpersonal Skills" },
    { id:"projectupdates", icon:"📋", label:"Project Updates" },
  ]

  const dashAvg = dashLeaderboard.length > 0
    ? Math.round(dashLeaderboard.reduce((a,b) => a + b.total, 0) / dashLeaderboard.length) : 0
  const periodLabel = (p: Period) => p === "daily" ? "Today" : p === "weekly" ? "This Week" : "This Month"

  const topStreakEntry   = Object.entries(streaks).sort((a,b) => b[1] - a[1])[0]
  const topStreakStudent = topStreakEntry ? students.find(s => s.id === Number(topStreakEntry[0])) : null
  const topStreakDays    = topStreakEntry ? topStreakEntry[1] : 0

  const ScoreEntryForm = ({ period }: { period: Period }) => {
    const form    = formByPeriod[period]
    const setForm = setFormByPeriod[period]
    const total   = Object.keys(scoreMax).reduce((sum, k) => sum + Number((form as any)[k]), 0)
    const tier    = tierInfo(total)

    // draft-aware setter
    const setFormWithDraft = (updater: any) => {
      setForm((prev: any) => {
        const next = typeof updater === "function" ? updater(prev) : updater
        saveFormDraft(period, next)
        return next
      })
    }

    return (
      <div className="card fu fu1">
        {/* Draft indicator */}
        {(form.student_id || Object.keys(scoreMax).some(k => (form as any)[k] > 0)) && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 14px", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:9, marginBottom:18, fontSize:12, fontWeight:600, color:"#b45309" }}>
            <span>📝 Draft saved — your progress is preserved on refresh</span>
            <button onClick={() => { clearFormDraft(period); setForm(emptyScoreForm()) }}
              style={{ background:"none", border:"none", cursor:"pointer", color:"#dc2626", fontWeight:700, fontSize:12, fontFamily:"inherit" }}>
              ✕ Clear
            </button>
          </div>
        )}
        <div className="sec-label">👤 Student & Date</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:28 }}>
          <div>
            <label className="field-label">Student</label>
            <select className="f-input" value={form.student_id} onChange={e => setFormWithDraft((p: any) => ({ ...p, student_id: e.target.value }))}>
              <option value="">— Select student —</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Date</label>
            <input className="f-input" type="date" value={form.date} onChange={e => setFormWithDraft((p: any) => ({ ...p, date: e.target.value }))} />
          </div>
        </div>
        <div className="sec-label">⚡ Performance Metrics</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:28 }}>
          {Object.keys(scoreMax).map(key => (
            <MetricRow key={key} metricKey={key} form={form} setForm={setFormWithDraft} />
          ))}
        </div>
        <div className="total-box">
          <div>
            <div style={{ fontSize:11, letterSpacing:"1px", textTransform:"uppercase", color:"var(--faint)", fontWeight:700, marginBottom:4 }}>Total Score</div>
            <span className="total-num" style={{ color: tier.color }}>{total}</span>
            <span className="total-out">/100</span>
          </div>
          <span className="tier-pill" style={{ background:tier.bg, color:tier.color, border:`1px solid ${tier.border}`, fontSize:14, padding:"6px 16px" }}>{tier.label}</span>
        </div>
        <button className="btn-primary" onClick={() => handleSubmitScore(period)}>Submit Score 🚀</button>
      </div>
    )
  }

  const analyticsCats = [
    { key:"avg_attendance", label:"Attendance", max:10,  icon:"🟢", color:"#10b981" },
    { key:"avg_speak_up",   label:"Speak Up",   max:15,  icon:"🎤", color:"#8b5cf6" },
    { key:"avg_activity",   label:"Activity",   max:20,  icon:"⚡", color:"#f59e0b" },
    { key:"avg_technical",  label:"Technical",  max:30,  icon:"💻", color:"#3b82f6" },
    { key:"avg_behavior",   label:"Behavior",   max:10,  icon:"🤝", color:"#ec4899" },
    { key:"avg_initiative", label:"Initiative", max:15,  icon:"🚀", color:"#6366f1" },
  ]

  const classAvg = analytics.filter(a => a.sessions > 0).length > 0
    ? Math.round(analytics.filter(a => a.sessions > 0).reduce((acc,a) => acc + a.avg_total, 0) / analytics.filter(a => a.sessions > 0).length)
    : 0

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        :root {
          --font:'Plus Jakarta Sans',sans-serif;
          --bg:#f8f9fe; --white:#ffffff;
          --border:#e5e9f5; --border-dark:#d1d9ee;
          --text:#0f172a; --muted:#64748b; --faint:#94a3b8;
          --accent:#5b5ef4; --accent-light:#eef0ff;
          --radius:16px; --radius-sm:10px;
          --shadow:0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04);
          --shadow-md:0 4px 24px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.04);
        }
        body { font-family:var(--font); background:var(--bg); color:var(--text); }
        .layout { display:flex; min-height:100vh; }
        .sidebar { width:256px; min-height:100vh; flex-shrink:0; background:var(--white); border-right:1px solid var(--border); display:flex; flex-direction:column; position:sticky; top:0; height:100vh; box-shadow:2px 0 12px rgba(91,94,244,0.04); }
        .brand-zone { padding:24px 20px 18px; border-bottom:1px solid var(--border); background:linear-gradient(135deg,#f8f7ff 0%,#ffffff 100%); }
        .brand-logo { height:100px; width:auto; object-fit:contain; }
        .brand-tag { font-size:10px; letter-spacing:2px; color:var(--faint); text-transform:uppercase; margin-top:6px; font-weight:600; }
        .nav-area { padding:16px 12px; flex:1; min-height:0; display:flex; flex-direction:column; gap:3px; overflow-y:auto; }
        .nav-label { font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:var(--faint); font-weight:700; padding:0 10px; margin:8px 0 6px; }
        .nav-item { display:flex; align-items:center; gap:10px; padding:11px 14px; border-radius:var(--radius-sm); border:1px solid transparent; cursor:pointer; font-size:13.5px; font-weight:600; transition:all 0.18s; color:var(--muted); background:none; font-family:var(--font); text-align:left; width:100%; }
        .nav-item:hover { color:var(--text); background:#f8f9fe; border-color:var(--border); }
        .nav-item.active { color:var(--accent); background:var(--accent-light); border-color:rgba(91,94,244,0.18); }
        .nav-emoji { font-size:17px; }
        .nav-dot { margin-left:auto; width:6px; height:6px; border-radius:50%; background:var(--accent); }
        .sidebar-footer { padding:14px 12px; border-top:1px solid var(--border); flex-shrink:0; }
        .faculty-badge { display:flex; align-items:center; gap:10px; padding:12px 14px; background:#f8f9fe; border-radius:var(--radius-sm); border:1px solid var(--border); margin-bottom:10px; }
        .faculty-avatar { width:36px; height:36px; border-radius:10px; background:linear-gradient(135deg,var(--accent),#818cf8); display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; color:#fff; flex-shrink:0; }
        .faculty-name { font-size:13px; font-weight:700; color:var(--text); }
        .faculty-role { font-size:11px; color:var(--muted); margin-top:1px; }
        .logout-btn { width:100%; padding:10px; border-radius:var(--radius-sm); border:1px solid #fecaca; background:#fff5f5; color:#dc2626; cursor:pointer; font-size:13px; font-weight:600; font-family:var(--font); transition:all 0.2s; }
        .logout-btn:hover { background:#fee2e2; border-color:#fca5a5; }
        .main { flex:1; padding:36px 44px; overflow-y:auto; }
        .page-header { margin-bottom:28px; }
        .page-title { font-size:26px; font-weight:800; color:var(--text); }
        .page-sub { font-size:14px; color:var(--muted); margin-top:5px; }
        .card { background:var(--white); border:1px solid var(--border); border-radius:var(--radius); padding:24px; box-shadow:var(--shadow); }
        .stats-row { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:24px; }
        .stat-card { background:var(--white); border:1px solid var(--border); border-radius:var(--radius); padding:22px 24px; box-shadow:var(--shadow); position:relative; overflow:hidden; transition:all 0.2s; }
        .stat-card:hover { box-shadow:var(--shadow-md); transform:translateY(-2px); }
        .stat-card-accent { position:absolute; top:0; left:0; right:0; height:3px; border-radius:var(--radius) var(--radius) 0 0; }
        .stat-icon { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:22px; margin-bottom:14px; }
        .stat-value { font-size:36px; font-weight:800; line-height:1; }
        .stat-label { font-size:13px; color:var(--muted); margin-top:5px; font-weight:500; }
        .sod-card { background:linear-gradient(135deg,#fffbeb,#fef9c3); border:1px solid #fde68a; border-radius:var(--radius); padding:22px 28px; margin-bottom:20px; display:flex; align-items:center; gap:20px; box-shadow:0 4px 20px rgba(245,158,11,0.12); }
        .sod-icon { font-size:44px; }
        .sod-tag { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:#b45309; font-weight:700; }
        .sod-name { font-size:22px; font-weight:800; color:#92400e; margin-top:2px; }
        .sod-score { font-size:13px; color:#b45309; margin-top:3px; }
        .streak-banner { background:linear-gradient(135deg,#fff7ed,#fef3c7); border:1px solid #fed7aa; border-radius:var(--radius); padding:18px 24px; margin-bottom:20px; display:flex; align-items:center; gap:16px; box-shadow:0 4px 16px rgba(234,88,12,0.08); }
        .sec-label { font-size:11px; letter-spacing:1.5px; text-transform:uppercase; color:var(--faint); font-weight:700; margin-bottom:14px; padding-bottom:12px; border-bottom:1px solid var(--border); }
        .lb-row { display:flex; align-items:center; gap:14px; padding:15px 18px; border-radius:12px; border:1px solid var(--border); background:var(--white); margin-bottom:8px; transition:all 0.2s; box-shadow:var(--shadow); }
        .lb-row:hover { transform:translateX(3px); box-shadow:var(--shadow-md); }
        .lb-rank { font-size:22px; width:36px; text-align:center; }
        .lb-name { font-size:15px; font-weight:600; }
        .lb-bar-wrap { flex:1; height:6px; background:#f1f5f9; border-radius:3px; overflow:hidden; max-width:100px; }
        .lb-bar { height:100%; border-radius:3px; transition:width 0.6s ease; }
        .lb-score { font-size:24px; font-weight:800; }
        .lb-denom { font-size:11px; color:var(--faint); }
        .tier-pill { padding:4px 12px; border-radius:20px; font-size:11px; font-weight:700; white-space:nowrap; }
        .field-label { font-size:11px; letter-spacing:1px; text-transform:uppercase; color:var(--muted); font-weight:700; margin-bottom:7px; display:block; }
        .f-input { width:100%; background:var(--white); border:1.5px solid var(--border); border-radius:var(--radius-sm); padding:12px 14px; color:var(--text); font-size:14px; outline:none; transition:all 0.2s; font-family:var(--font); }
        .f-input::placeholder { color:var(--faint); }
        .f-input:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(91,94,244,0.1); }
        select.f-input option { background:#fff; color:var(--text); }
        .f-textarea { width:100%; background:var(--white); border:1.5px solid var(--border); border-radius:var(--radius-sm); padding:12px 14px; color:var(--text); font-size:14px; outline:none; transition:all 0.2s; font-family:var(--font); resize:vertical; line-height:1.65; }
        .f-textarea::placeholder { color:var(--faint); }
        .f-textarea:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(91,94,244,0.1); }
        .score-metric { display:flex; align-items:center; gap:14px; padding:14px 18px; border-radius:12px; border:1.5px solid var(--border); background:var(--white); transition:all 0.2s; }
        .score-metric:hover { border-color:var(--border-dark); box-shadow:var(--shadow); }
        .total-box { display:flex; align-items:center; justify-content:space-between; padding:20px 24px; border-radius:var(--radius-sm); border:1.5px solid var(--border); background:#fafbff; margin-bottom:18px; }
        .total-num { font-size:52px; font-weight:800; line-height:1; }
        .total-out { font-size:18px; color:var(--faint); font-weight:500; }
        .btn-primary { width:100%; padding:14px; border-radius:var(--radius-sm); border:none; cursor:pointer; font-weight:700; font-size:14px; background:linear-gradient(135deg,#5b5ef4,#818cf8); color:#fff; font-family:var(--font); transition:all 0.2s; box-shadow:0 4px 16px rgba(91,94,244,0.3); }
        .btn-primary:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(91,94,244,0.4); }
        .btn-gold { width:100%; padding:13px; border-radius:var(--radius-sm); border:none; cursor:pointer; font-weight:700; font-size:14px; background:linear-gradient(135deg,#f59e0b,#fbbf24); color:#78350f; font-family:var(--font); transition:all 0.2s; box-shadow:0 4px 16px rgba(245,158,11,0.25); }
        .btn-gold:hover { transform:translateY(-1px); box-shadow:0 8px 20px rgba(245,158,11,0.4); }
        .btn-add { padding:12px 20px; border-radius:var(--radius-sm); border:1.5px solid var(--accent); background:var(--accent-light); color:var(--accent); cursor:pointer; font-size:13px; font-weight:700; font-family:var(--font); white-space:nowrap; transition:all 0.2s; }
        .btn-add:hover { background:var(--accent); color:#fff; }
        .btn-del { background:#fff5f5; border:1px solid #fecaca; color:#dc2626; border-radius:8px; padding:8px 14px; cursor:pointer; font-size:13px; font-weight:600; font-family:var(--font); transition:all 0.2s; }
        .btn-del:hover { background:#fee2e2; }
        .student-card { background:var(--white); border:1px solid var(--border); border-radius:var(--radius); padding:18px 20px; display:flex; align-items:center; justify-content:space-between; box-shadow:var(--shadow); transition:all 0.2s; }
        .student-card:hover { box-shadow:var(--shadow-md); transform:translateY(-2px); }
        .s-avatar { width:46px; height:46px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:800; color:#fff; flex-shrink:0; }
        .avatar-edit-wrap { position:relative; cursor:pointer; flex-shrink:0; }
        .avatar-edit-btn { position:absolute; bottom:-3px; right:-3px; width:20px; height:20px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; font-size:10px; color:#fff; border:2px solid #fff; box-shadow:0 1px 4px rgba(91,94,244,0.4); pointer-events:none; }
        .avatar-edit-wrap:hover .avatar-edit-btn { background:#4338ca; }
        .reward-row { display:flex; align-items:center; gap:14px; padding:13px 16px; border-radius:10px; background:var(--white); border:1px solid var(--border); margin-bottom:8px; transition:all 0.2s; }
        .reward-row:hover { border-color:var(--border-dark); box-shadow:var(--shadow); }
        .period-banner { display:flex; align-items:center; gap:10px; padding:12px 18px; border-radius:10px; background:#eef0ff; border:1px solid #c7d2fe; margin-bottom:20px; font-size:13px; font-weight:600; color:#4338ca; }
        .analytics-row { background:var(--white); border:1px solid var(--border); border-radius:var(--radius); box-shadow:var(--shadow); overflow:hidden; margin-bottom:12px; transition:all 0.2s; }
        .analytics-row:hover { box-shadow:var(--shadow-md); }
        .analytics-header { display:flex; align-items:center; gap:16px; padding:18px 24px; cursor:pointer; transition:background 0.2s; }
        .analytics-header:hover { background:#fafbff; }
        .analytics-detail { border-top:1px solid var(--border); padding:20px 24px; background:#fafbff; }
        .cat-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:10px; }
        .cat-card { background:#fff; border:1px solid var(--border); border-radius:12px; padding:14px 16px; }
        .day-btn { padding:8px 14px; border-radius:9px; border:none; cursor:pointer; font-weight:700; font-size:13px; font-family:var(--font); transition:all 0.2s; }
        .mobile-bar { display:none; }
        .sidebar-visible { display:flex; }
        @media(max-width:768px){
          .sidebar-visible { display:none; }
          .mobile-bar { display:flex; position:fixed; top:0; left:0; right:0; z-index:50; background:rgba(255,255,255,0.95); backdrop-filter:blur(16px); border-bottom:1px solid var(--border); padding:14px 20px; align-items:center; justify-content:space-between; }
          .main { padding:16px 20px; padding-top:72px; }
          .stats-row { grid-template-columns:1fr 1fr; }
          .two-col { grid-template-columns:1fr!important; }
          .score-metric { flex-wrap:wrap; }
          .cat-grid { grid-template-columns:1fr 1fr; }
        }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        .fu  { animation:fadeUp 0.4s ease forwards; }
        .fu1 { animation-delay:0.05s; opacity:0; }
        .fu2 { animation-delay:0.10s; opacity:0; }
        .fu3 { animation-delay:0.15s; opacity:0; }
        @keyframes flicker { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }
        .streak-fire { display:inline-block; animation:flicker 1.2s ease-in-out infinite; }
      `}</style>

      <Toast toasts={toasts} removeToast={removeToast} />

      <div className="layout">

        {/* SIDEBAR */}
        <aside className="sidebar sidebar-visible">
          <div className="brand-zone">
            <img src="/logo.png" alt="Knowletive" className="brand-logo" />
            <div className="brand-tag">Faculty Portal</div>
          </div>
          <nav className="nav-area">
            <div className="nav-label">Navigation</div>
            {navTabs.map(t => (
              <button key={t.id} onClick={() => handleTabChange(t.id)} className={`nav-item ${tab === t.id ? "active" : ""}`}>
                <span className="nav-emoji">{t.icon}</span>
                {t.label}
                {tab === t.id && <span className="nav-dot" />}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="faculty-badge">
              <div className="faculty-avatar">AF</div>
              <div>
                <div className="faculty-name">Admin Faculty</div>
                <div className="faculty-role">Instructor</div>
              </div>
            </div>
            <button className="logout-btn" onClick={() => { localStorage.removeItem("faculty_auth"); localStorage.removeItem("faculty_tab"); router.push("/login") }}>
              🚪 Sign out
            </button>
          </div>
        </aside>

        {/* MOBILE HEADER */}
        <div className="mobile-bar">
          <img src="/logo.png" alt="Knowletive" style={{ height:100, objectFit:"contain" }} />
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background:"#f1f5f9", border:"1px solid var(--border)", borderRadius:8, padding:"8px 12px", cursor:"pointer", fontSize:18 }}>☰</button>
        </div>

        {/* MOBILE DRAWER */}
        {sidebarOpen && (
          <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,0.4)", display:"flex" }} onClick={() => setSidebarOpen(false)}>
            <div style={{ width:264, background:"#fff", height:"100%", padding:"80px 12px 24px", boxShadow:"4px 0 24px rgba(0,0,0,0.12)" }} onClick={e => e.stopPropagation()}>
              {navTabs.map(t => (
                <button key={t.id} onClick={() => { handleTabChange(t.id); setSidebarOpen(false) }} className={`nav-item ${tab === t.id ? "active" : ""}`} style={{ marginBottom:3 }}>
                  <span className="nav-emoji">{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <main className="main">

          {/* ══ DASHBOARD ══ */}
          {tab === "dashboard" && (
            <div style={{ maxWidth:880 }}>
              <div className="page-header fu">
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
                  <div>
                    <h1 className="page-title">Good day! 👋</h1>
                    <p className="page-sub">Here's your students' performance overview</p>
                  </div>
                  <div style={{ background:"#eef0ff", border:"1px solid #c7d2fe", borderRadius:10, padding:"8px 16px", fontSize:12, fontWeight:600, color:"#4338ca" }}>
                    📅 {new Date().toLocaleDateString("en-US",{ weekday:"short", month:"short", day:"numeric" })}
                  </div>
                </div>
              </div>
              <PeriodSelector active={dashPeriod} onChange={handleDashPeriod} />
              {topStreakStudent && topStreakDays > 0 && (
                <div className="streak-banner fu fu1">
                  <span className="streak-fire" style={{ fontSize:36 }}>🔥</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, letterSpacing:"1.5px", textTransform:"uppercase", color:"#9a3412", fontWeight:700 }}>Longest Active Streak</div>
                    <div style={{ fontSize:20, fontWeight:800, color:"#7c2d12", marginTop:2 }}>{topStreakStudent.name}</div>
                    <div style={{ fontSize:13, color:"#c2410c", marginTop:2 }}>Attended {topStreakDays} day{topStreakDays !== 1 ? "s" : ""} in a row 🏅</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:44, fontWeight:800, color:"#c2410c", lineHeight:1 }}>{topStreakDays}</div>
                    <div style={{ fontSize:12, color:"#9a3412", fontWeight:600 }}>day streak</div>
                  </div>
                </div>
              )}
              {studentOfDay && dashPeriod === "daily" && (
                <div className="sod-card fu fu1">
                  <span className="sod-icon">⭐</span>
                  <div>
                    <div className="sod-tag">✨ Student of the Day</div>
                    <div className="sod-name">{studentOfDay.student_of_the_day}</div>
                    <div className="sod-score">🎯 Score: <strong>{studentOfDay.score}</strong> / 100</div>
                  </div>
                  <div style={{ marginLeft:"auto", textAlign:"right" }}>
                    <div style={{ fontSize:48, fontWeight:800, color:"#d97706", lineHeight:1 }}>{studentOfDay.score}</div>
                    <div style={{ fontSize:12, color:"#b45309", fontWeight:600 }}>out of 100</div>
                  </div>
                </div>
              )}
              <div className="stats-row fu fu2">
                {[
                  { label:"Total Students",                    value:students.length,        icon:"👥", accent:"#6366f1", iconBg:"#eef0ff" },
                  { label:`Scored ${periodLabel(dashPeriod)}`, value:dashLeaderboard.length, icon:"✅", accent:"#10b981", iconBg:"#ecfdf5" },
                  { label:"Average Score",                     value:dashAvg,                icon:"📊", accent:"#f59e0b", iconBg:"#fffbeb" },
                ].map(st => (
                  <div key={st.label} className="stat-card">
                    <div className="stat-card-accent" style={{ background:st.accent }} />
                    <div className="stat-icon" style={{ background:st.iconBg }}>{st.icon}</div>
                    <div className="stat-value" style={{ color:st.accent }}>{st.value}</div>
                    <div className="stat-label">{st.label}</div>
                  </div>
                ))}
              </div>
              <div className="card fu fu3">
                <div className="sec-label">🏆 {periodLabel(dashPeriod)}'s Top Performers</div>
                <LeaderboardList data={dashLeaderboard.slice(0,5)} period={dashPeriod} streaks={streaks} />
              </div>
            </div>
          )}

          {/* ══ SCORE ENTRY ══ */}
          {tab === "score" && (
            <div style={{ maxWidth:"100%", paddingRight:0 }}>
              <ScoreEntryFullRange
                students={students}
                batchName="BCA 1st Year - A"
                onSaveAll={async (entries) => {
                  for (const e of entries) {
                    await submitScore(e)
                  }
                  fetchBase()
                  fetchLeaderboard(scorePeriod, "score")
                  fetchStreaks()
                  showToast("All scores saved! 🚀", "success")
                }}
              />
            </div>
          )}

          {/* ══ STUDENTS ══ */}
          {tab === "students" && (
            <div style={{ maxWidth:820 }}>
              <div className="page-header fu">
                <h1 className="page-title">👥 Students</h1>
                <p className="page-sub">Manage your student roster</p>
              </div>

              {/* Add New Student */}
              <div className="card fu fu1" style={{ marginBottom:24 }}>
                <div className="sec-label">➕ Add New Student</div>
                <div style={{ display:"flex", gap:12, flexWrap:"wrap" as const, alignItems:"flex-end" }}>
                  {/* Photo upload for new student */}
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
                    <div style={{ width:60, height:60, borderRadius:14, overflow:"hidden", border:"2px dashed var(--border)", background:"#f8f9fe", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", position:"relative" as const }}
                      onClick={() => document.getElementById("photo-upload")?.click()}>
                      {newPhoto ? (
                        <img src={newPhoto} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      ) : (
                        <span style={{ fontSize:24, color:"var(--faint)" }}>📷</span>
                      )}
                    </div>
                    <input id="photo-upload" type="file" accept="image/*" style={{ display:"none" }}
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        if (file.size > 500000) return showToast("Photo must be under 500KB", "warning")
                        const reader = new FileReader()
                        reader.onload = (ev) => setNewPhoto(ev.target?.result as string)
                        reader.readAsDataURL(file)
                      }}
                    />
                    <span style={{ fontSize:10, color:"var(--faint)", textAlign:"center" }}>Photo<br/>(optional)</span>
                  </div>
                  <input className="f-input" placeholder="Full name" value={newName}
                    onChange={e => setNewName(e.target.value)} style={{ flex:1, minWidth:150 }} />
                  <input className="f-input" placeholder="Email address" value={newEmail}
                    onChange={e => setNewEmail(e.target.value)} style={{ flex:1, minWidth:150 }} />
                  {activeBatches.length > 1 && (
                    <select className="f-input" style={{ minWidth: 160 }} value={selectedBatchId} onChange={e => setSelectedBatchId(e.target.value)}>
                      {activeBatches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  )}
                  <button className="btn-add" onClick={handleAddStudent}>+ Add Student</button>
                </div>
              </div>

              {/* Student Cards */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))", gap:14 }}>
                {students.map((s, i) => {
                  const [g1, g2] = avatarColors[i % avatarColors.length]
                  const t = tierInfo(s.level === "Pro" ? 90 : s.level === "Skilled" ? 75 : s.level === "Learner" ? 50 : 0)
                  const streak = streaks[s.id] || 0
                  return (
                    <div key={s.id} className="student-card fu" style={{ animationDelay:`${i * 0.04}s`, opacity:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:14 }}>

                        {/* ── Clickable avatar with edit badge ── */}
                        <div
                          className="avatar-edit-wrap"
                          onClick={() => document.getElementById(`photo-${s.id}`)?.click()}
                          title="Click to change photo"
                        >
                          <div
                            className="s-avatar"
                            style={{
                              background: `linear-gradient(135deg,${g1},${g2})`,
                              width: 46, height: 46, borderRadius: 12, overflow: "hidden",
                            }}
                          >
                            {s.photo ? (
                              <img src={s.photo} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt={s.name} />
                            ) : (
                              <span style={{ fontSize:18, fontWeight:800, color:"#fff" }}>
                                {s.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          {/* Pencil edit badge */}
                          <div className="avatar-edit-btn">✎</div>
                          {/* Streak fire badge (only when streak ≥ 3) */}
                          {streak >= 3 && (
                            <div style={{ position:"absolute", top:-6, left:-6, fontSize:13, lineHeight:1 }} title={`${streak} day streak`}>🔥</div>
                          )}
                          {/* Hidden file input per student */}
                          <input
                            id={`photo-${s.id}`}
                            type="file"
                            accept="image/*"
                            style={{ display:"none" }}
                            onChange={async e => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              if (file.size > 500000) return showToast("Photo must be under 500KB", "warning")
                              const reader = new FileReader()
                              reader.onload = async (ev) => {
                                const photo = ev.target?.result as string
                                try {
                                  await updateStudentPhoto(s.id, photo)
                                  fetchBase()
                                  showToast("Photo updated! ✅", "success")
                                } catch { showToast("Error updating photo", "error") }
                              }
                              reader.readAsDataURL(file)
                            }}
                          />
                        </div>

                        <div>
                          {editingId === s.id ? (
                            <input
                              className="f-input"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                            />
                          ) : (
                            <div style={{ fontSize:14, fontWeight:700, color:"var(--text)" }}>
                              {s.name}
                            </div>
                          )}    
                          <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>{s.email}</div>
                          <div style={{ display:"flex", gap:6, marginTop:6, flexWrap:"wrap" as const, alignItems:"center" }}>
                            <span className="tier-pill" style={{ background:t.bg, color:t.color, border:`1px solid ${t.border}`, fontSize:11 }}>{t.label}</span>
                            <StreakBadge streak={streak} />
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                      {editingId === s.id ? (
                        <button
                          onClick={async () => {
                            await updateStudent(s.id, {
                              name: editingName,
                              photo: s.photo,
                            })

                            await fetchBase()
                            setEditingId(null)
                          }}
                        >
                          💾 Save
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(s.id)
                            setEditingName(s.name)
                          }}
                        >
                          ✏️ Edit
                        </button>
                      )}

                      <button
                        className="btn-del"
                        onClick={() => deleteStudent(s.id).then(fetchBase)}
                      >
                        🗑 Remove
                      </button>
                    </div>
                      
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ══ LEADERBOARD ══ */}
          {tab === "leaderboard" && (
            <div style={{ maxWidth:700 }}>
              <div className="page-header fu">
                <h1 className="page-title">🏆 Leaderboard</h1>
                <p className="page-sub">Student rankings by period</p>
              </div>
              <PeriodSelector active={dashPeriod} onChange={handleDashPeriod} />
              <div className="fu fu1">
                <LeaderboardList data={dashLeaderboard} period={dashPeriod} streaks={streaks} />
              </div>
            </div>
          )}

          {/* ══ REWARDS ══ */}
          {tab === "rewards" && (
            <div style={{ maxWidth:880 }}>
              <div className="page-header fu">
                <h1 className="page-title">🎖️ Rewards & Feedback</h1>
                <p className="page-sub">Recognise achievements and guide student growth</p>
              </div>
              <PeriodSelector active={rewardPeriod} onChange={setRewardPeriod} />
              <div className="two-col fu fu1" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:24 }}>
                <div className="card">
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:"#fffbeb", border:"1px solid #fde68a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🏅</div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:16 }}>Give Award</div>
                      <div style={{ fontSize:12, color:"var(--muted)", marginTop:1 }}>Recognise student achievement</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                    <div><label className="field-label">Student</label>
                      <select className="f-input" value={rewardForm.student_id} onChange={e => setRewardForm({...rewardForm, student_id:e.target.value})}>
                        <option value="">— Select student —</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div><label className="field-label">Award Type</label>
                      <select className="f-input" value={rewardForm.type} onChange={e => setRewardForm({...rewardForm, type:e.target.value})}>
                        <option value="daily">🌟 Daily</option>
                        <option value="weekly">📅 Weekly</option>
                        <option value="monthly">🏆 Monthly</option>
                      </select>
                    </div>
                    <div><label className="field-label">Award Title</label>
                      <select className="f-input" value={rewardForm.title} onChange={e => setRewardForm({...rewardForm, title:e.target.value})}>
                        <option value="">— Select award —</option>
                        <option value="Student of the Day">⭐ Student of the Day</option>
                        <option value="Top Performer">🥇 Top Performer</option>
                        <option value="Most Improved">📈 Most Improved</option>
                        <option value="Best Speaker">🎤 Best Speaker</option>
                        <option value="Internship Star">🌟 Internship Star</option>
                        <option value="Project Leader">👑 Project Leader</option>
                      </select>
                    </div>
                    <button className="btn-gold" onClick={handleGiveReward}>🏅 Give Award</button>
                  </div>
                </div>
                <div className="card">
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:"#eef0ff", border:"1px solid #c7d2fe", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>💬</div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:16 }}>Personal Feedback</div>
                      <div style={{ fontSize:12, color:"var(--muted)", marginTop:1 }}>Guide students on improvement</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                    <div><label className="field-label">Student</label>
                      <select className="f-input" value={suggestionStudentId} onChange={e => setSuggestionStudentId(e.target.value)}>
                        <option value="">— Select student —</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div><label className="field-label">Feedback Message</label>
                      <textarea className="f-textarea" rows={5} placeholder="Mention strengths + areas to improve…" value={suggestion} onChange={e => setSuggestion(e.target.value)} />
                      <div style={{ fontSize:11, color:"var(--faint)", marginTop:5 }}>💡 Be specific — mention what they did well and what to work on</div>
                    </div>
                    <button className="btn-primary" onClick={handleSubmitSuggestion}>💬 Send Feedback</button>
                  </div>
                </div>
              </div>
              {rewards.filter((r:any) => r.type === rewardPeriod).length > 0 && (
                <div className="card fu fu2">
                  <div className="sec-label">🕒 {rewardPeriod.charAt(0).toUpperCase() + rewardPeriod.slice(1)} Awards</div>
                  {rewards.filter((r:any) => r.type === rewardPeriod).slice(0,10).map((r:any, i:number) => (
                    <div key={i} className="reward-row">
                      <span style={{ fontSize:22 }}>{r.type==="daily"?"⭐":r.type==="weekly"?"🏅":"🏆"}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:700 }}>{r.name}</div>
                        <div style={{ fontSize:12, color:"var(--muted)", marginTop:1 }}>{r.title}</div>
                      </div>       
                      <div style={{ textAlign:"right" }}>
                        <span className="tier-pill" style={{ background:r.type==="daily"?"#fffbeb":r.type==="weekly"?"#eff6ff":"#f5f3ff", color:r.type==="daily"?"#d97706":r.type==="weekly"?"#2563eb":"#7c3aed", border:`1px solid ${r.type==="daily"?"#fde68a":r.type==="weekly"?"#bfdbfe":"#ddd6fe"}`, fontSize:11 }}>
                          {r.type==="daily"?"🌟 Daily":r.type==="weekly"?"📅 Weekly":"🏆 Monthly"}
                        </span>
                        <div style={{ fontSize:11, color:"var(--faint)", marginTop:4 }}>{r.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ ATTENDANCE ══ */}
          {tab === "attendance" && (
            <div style={{ maxWidth:900 }}>
              <div className="page-header fu">
                <h1 className="page-title">✅ Attendance Tracker</h1>
              </div>
              <AttendanceTracker />
            </div>
          )}

          {/* ══ DAILY ACTIVITY ══ */}
          {tab === "activity" && (
            <div style={{ maxWidth:900 }}>
              <div className="page-header fu">
                <h1 className="page-title">⚡ Daily Activity</h1>
                <p className="page-sub">Track student participation in daily activities</p>
              </div>
              <DailyActivity />
            </div>
          )}

          {/* ══ STUDY MATERIAL ══ */}
          {tab === "study" && (
            <div style={{ maxWidth:900 }}>
              <div className="page-header fu">
                <h1 className="page-title">📚 Study Material</h1>
                <p className="page-sub">Track topics, videos, and practice programs</p>
              </div>
              <StudyMaterial />
            </div>
          )}

          {/* ══ PROJECT UPDATES ══ */}
          {tab === "projectupdates" && <ProjectUpdates />}

          {/* ══ INTERPERSONAL SKILLS ══ */}
          {tab === "interpersonal" && (
            <div style={{ maxWidth:900 }}>
              <div className="page-header fu">
                <h1 className="page-title">🎯 Interpersonal Skills</h1>
                <p className="page-sub">Weekly skill ratings per student</p>
              </div>
              <InterpersonalSkills />
            </div>
          )}

          {/* ══ ANALYTICS ══ */}
          {tab === "analytics" && (
            <div style={{ maxWidth:900 }}>
              <div className="page-header fu">
                <h1 className="page-title">📈 Performance Analytics</h1>
                <p className="page-sub">Average scores and category breakdown per student</p>
              </div>
              <div className="card fu fu1" style={{ marginBottom:24, padding:"18px 24px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                  <span style={{ fontSize:13, fontWeight:600, color:"var(--muted)" }}>Show averages for last:</span>
                  <div style={{ display:"flex", gap:6, background:"#f1f5f9", padding:4, borderRadius:12 }}>
                    {[4, 7, 14, 30].map(d => (
                      <button key={d} className="day-btn" onClick={() => { setAnalyticsDays(d); fetchAnalytics(d) }}
                        style={{ background: analyticsDays===d?"#fff":"transparent", color:analyticsDays===d?"#5b5ef4":"#94a3b8", boxShadow:analyticsDays===d?"0 2px 8px rgba(0,0,0,0.1)":"none" }}>
                        {d}d
                      </button>
                    ))}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginLeft:"auto" }}>
                    <input type="number" min={1} max={365} placeholder="Custom" value={customDays}
                      onChange={e => setCustomDays(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { const v = parseInt(customDays); if (v > 0) { setAnalyticsDays(v); fetchAnalytics(v) } } }}
                      style={{ width:90, padding:"9px 12px", borderRadius:10, border:"1.5px solid var(--border)", fontSize:13, fontFamily:"var(--font)", outline:"none", color:"var(--text)" }} />
                    <button onClick={() => { const v=parseInt(customDays); if(v>0){setAnalyticsDays(v);fetchAnalytics(v)} }}
                      style={{ padding:"9px 16px", borderRadius:10, border:"1.5px solid var(--accent)", background:"var(--accent-light)", color:"var(--accent)", cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"var(--font)" }}>
                      Apply
                    </button>
                  </div>
                </div>
              </div>
              <div className="stats-row fu fu2">
                {[
                  { label:"Total Students",             value:analytics.length,                          icon:"👥", accent:"#6366f1", iconBg:"#eef0ff" },
                  { label:"Active Students",             value:analytics.filter(a=>a.sessions>0).length, icon:"✅", accent:"#10b981", iconBg:"#ecfdf5" },
                  { label:`Class Avg (${analyticsDays}d)`, value:classAvg,                               icon:"📊", accent:"#f59e0b", iconBg:"#fffbeb" },
                ].map(s => (
                  <div key={s.label} className="stat-card">
                    <div className="stat-card-accent" style={{ background:s.accent }} />
                    <div className="stat-icon" style={{ background:s.iconBg }}>{s.icon}</div>
                    <div className="stat-value" style={{ color:s.accent }}>{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
              {analyticsLoading ? (
                <div className="card" style={{ textAlign:"center", padding:"48px" }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>⏳</div>
                  <p style={{ color:"var(--muted)" }}>Loading analytics...</p>
                </div>
              ) : (
                <div>
                  {analytics.map((a, i) => {
                    const t = tierInfo(a.avg_total)
                    const isExpanded = expandedStudent === a.id
                    const [g1,g2] = avatarColors[i % avatarColors.length]
                    const streak = streaks[a.id] || 0
                    return (
                      <div key={a.id} className="analytics-row fu" style={{ animationDelay:`${i*0.04}s`, opacity:0 }}>
                        <div className="analytics-header" onClick={() => setExpandedStudent(isExpanded ? null : a.id)}>
                          <div className="s-avatar" style={{ background:`linear-gradient(135deg,${g1},${g2})`, width:44, height:44, borderRadius:12, fontSize:18 }}>
                            {a.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontWeight:700, fontSize:15, color:"var(--text)" }}>{a.name}</div>
                            <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>{a.email}</div>
                            <div style={{ display:"flex", gap:8, marginTop:6, flexWrap:"wrap" as const, alignItems:"center" }}>
                              <span className="tier-pill" style={{ background:t.bg, color:t.color, border:`1px solid ${t.border}`, fontSize:11 }}>{t.label}</span>
                              <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, background:"#f1f5f9", color:"var(--muted)", fontWeight:600 }}>
                                📅 {a.sessions} session{a.sessions !== 1 ? "s" : ""} in {analyticsDays}d
                              </span>
                              <StreakBadge streak={streak} />
                            </div>
                          </div>
                          <div style={{ textAlign:"center", minWidth:90 }}>
                            {a.sessions > 0 ? (
                              <>
                                <div style={{ fontSize:34, fontWeight:800, color:t.color, lineHeight:1 }}>{a.avg_total}</div>
                                <div style={{ fontSize:11, color:"var(--faint)", marginTop:2 }}>avg / 100</div>
                                <div style={{ height:4, background:"#f1f5f9", borderRadius:99, overflow:"hidden", marginTop:6, width:80 }}>
                                  <div style={{ height:"100%", width:`${a.avg_total}%`, background:t.color, borderRadius:99 }} />
                                </div>
                              </>
                            ) : (
                              <div style={{ fontSize:13, color:"var(--faint)", fontWeight:500 }}>No data</div>
                            )}
                          </div>
                          <div style={{ fontSize:18, color:"var(--faint)", transform:isExpanded?"rotate(180deg)":"rotate(0deg)", transition:"transform 0.3s", marginLeft:8 }}>▾</div>
                        </div>
                        {isExpanded && (
                          <div className="analytics-detail">
                            {a.sessions > 0 ? (
                              <>
                                <div style={{ fontSize:12, fontWeight:700, color:"var(--faint)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:14 }}>
                                  Category Breakdown — {analyticsDays} day average
                                </div>
                                <div className="cat-grid">
                                  {analyticsCats.map(cat => {
                                    const val = a[cat.key]
                                    const pct = Math.round((val / cat.max) * 100)
                                    return (
                                      <div key={cat.key} className="cat-card">
                                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                                          <span style={{ fontSize:13, fontWeight:600, color:"var(--text)", display:"flex", alignItems:"center", gap:6 }}>{cat.icon} {cat.label}</span>
                                          <span style={{ fontSize:14, fontWeight:800, color:cat.color }}>{val}<span style={{ fontSize:11, color:"var(--faint)", fontWeight:400 }}>/{cat.max}</span></span>
                                        </div>
                                        <div style={{ height:6, background:"#f1f5f9", borderRadius:99, overflow:"hidden" }}>
                                          <div style={{ height:"100%", width:`${pct}%`, background:cat.color, borderRadius:99, transition:"width 0.6s" }} />
                                        </div>
                                        <div style={{ fontSize:11, color:"var(--faint)", marginTop:5 }}>{pct}% of max</div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </>
                            ) : (
                              <div style={{ textAlign:"center", padding:"24px" }}>
                                <div style={{ fontSize:32, marginBottom:8 }}>📭</div>
                                <p style={{ color:"var(--muted)", fontSize:14 }}>No scores in last {analyticsDays} days</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </>
  )
}