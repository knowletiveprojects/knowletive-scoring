"use client"
import { useState, useEffect } from "react"
import { getStudents } from "@/lib/api"

type Student = { id: number; name: string }

type ActivityStatus = "Y" | "N" | ""
// ActivityMap: date -> activityName -> studentId (as string) -> status
type ActivityMap = Record<string, Record<string, Record<string, ActivityStatus>>>

const TOTAL_DAYS = 90
const ACTIVITY_KEY = "da_activity_v1"

const today = () => new Date().toISOString().split("T")[0]
const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })

const CYCLE: ActivityStatus[] = ["Y", "N", ""]

const actStyle = (s: ActivityStatus) => {
  if (s === "Y") return { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" }
  if (s === "N") return { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" }
  return { bg: "#f8f9fe", color: "#cbd5e1", border: "#e5e9f5" }
}

const avatarColors = [
  ["#667eea","#764ba2"],["#f093fb","#f5576c"],["#4facfe","#00f2fe"],
  ["#43e97b","#38f9d7"],["#fa709a","#fee140"],["#30cfd0","#667eea"],
  ["#a18cd1","#fbc2eb"],["#5b5ef4","#818cf8"],
]

export default function DailyActivity() {
  const [students, setStudents] = useState<Student[]>([])
  const [activities, setActivities] = useState<ActivityMap>({})
  const [actDate, setActDate] = useState(today())
  const [actName, setActName] = useState("")
  const [newActName, setNewActName] = useState("")
  const [view, setView] = useState<"entry" | "history">("entry")
  const [loading, setLoading] = useState(true)

  // Load students from backend API
  useEffect(() => {
    getStudents()
      .then(res => setStudents(res.data.map((s: any) => ({ id: s.id, name: s.name }))))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false))
  }, [])

  // Load activity data from localStorage
  useEffect(() => {
    try {
      const a = localStorage.getItem(ACTIVITY_KEY)
      if (a) setActivities(JSON.parse(a))
    } catch {}
  }, [])

  const persistActivities = (a: ActivityMap) => {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(a))
  }

  const addActivity = () => {
    const name = newActName.trim()
    if (!name) return
    const updAc: ActivityMap = {
      ...activities,
      [actDate]: {
        ...(activities[actDate] || {}),
        [name]: activities[actDate]?.[name] || {},
      },
    }
    setActivities(updAc)
    setActName(name)
    setNewActName("")
    persistActivities(updAc)
  }

  const renameActivity = (oldName: string) => {
    const newName = prompt("Rename activity:", oldName)
    if (!newName || newName.trim() === oldName || !newName.trim()) return
    const updAc = { ...activities }
    updAc[actDate][newName.trim()] = updAc[actDate][oldName]
    delete updAc[actDate][oldName]
    setActivities(updAc)
    setActName(newName.trim())
    persistActivities(updAc)
  }

  const deleteActivity = (name: string) => {
    if (!confirm(`Delete activity "${name}"?`)) return
    const updAc = { ...activities }
    delete updAc[actDate][name]
    setActivities(updAc)
    if (actName === name) setActName("")
    persistActivities(updAc)
  }

  const cycleStatus = (studentId: number) => {
    if (!actName) return
    const key = String(studentId)
    const current = (activities[actDate]?.[actName]?.[key] || "") as ActivityStatus
    const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length]
    const updAc: ActivityMap = {
      ...activities,
      [actDate]: {
        ...(activities[actDate] || {}),
        [actName]: {
          ...(activities[actDate]?.[actName] || {}),
          [key]: next,
        },
      },
    }
    setActivities(updAc)
    persistActivities(updAc)
  }

  const markAll = (status: ActivityStatus) => {
    if (!actName) return
    const updAc: ActivityMap = {
      ...activities,
      [actDate]: {
        ...(activities[actDate] || {}),
        [actName]: Object.fromEntries(students.map(s => [String(s.id), status])),
      },
    }
    setActivities(updAc)
    persistActivities(updAc)
  }

  const activitiesOnDate = Object.keys(activities[actDate] || {})
  const allDates = Object.keys(activities).sort().reverse()
  const totalActivities = allDates.reduce((sum, d) => sum + Object.keys(activities[d] || {}).length, 0)

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>

      {/* Entry / History toggle */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 6, background: "#f1f5f9", padding: 4, borderRadius: 12 }}>
          {([["entry","📝 Entry"],["history","📋 History"]] as const).map(([v,l]) => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "8px 16px", borderRadius: 9, border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: 13, fontFamily: "inherit",
              background: view === v ? "#fff" : "transparent",
              color: view === v ? "#5b5ef4" : "#94a3b8",
              boxShadow: view === v ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.2s",
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Total Students",   value: loading ? "..." : students.length, icon: "👥", color: "#6366f1", bg: "#eef0ff" },
          { label: "Total Activities", value: totalActivities,                   icon: "⚡", color: "#059669", bg: "#ecfdf5" },
          { label: "Days Tracked",     value: `${allDates.length} / ${TOTAL_DAYS}`, icon: "📅", color: "#d97706", bg: "#fffbeb" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", border: "1px solid #e5e9f5", borderRadius: 16, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: s.color, borderRadius: "16px 16px 0 0" }} />
            <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginBottom: 10 }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Students list — read only from backend */}
      <div style={{ background: "#fff", border: "1px solid #e5e9f5", borderRadius: 14, padding: 18, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 12 }}>
          👤 Students ({loading ? "..." : students.length})
          <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, marginLeft: 10 }}>Manage students in the Students tab</span>
        </div>
        {loading ? (
          <div style={{ fontSize: 13, color: "#94a3b8" }}>Loading students...</div>
        ) : students.length === 0 ? (
          <div style={{ fontSize: 13, color: "#94a3b8" }}>No students found. Add them in the Students tab first.</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {students.map((student, i) => {
              const [g1,g2] = avatarColors[i % avatarColors.length]
              return (
                <div key={student.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 10px", borderRadius: 20, border: "1px solid #e5e9f5", background: "#fafbff", fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: `linear-gradient(135deg,${g1},${g2})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff" }}>
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  {student.name}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ══ ENTRY VIEW ══ */}
      {view === "entry" && (
        <>
          {/* Date + Activity controls */}
          <div style={{ background: "#fff", border: "1px solid #e5e9f5", borderRadius: 14, padding: 18, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "1px", textTransform: "uppercase" as const, display: "block", marginBottom: 6 }}>Date</label>
                <input type="date" value={actDate} onChange={e => { setActDate(e.target.value); setActName("") }}
                  style={{ padding: "10px 14px", border: "1.5px solid #e5e9f5", borderRadius: 10, fontSize: 14, fontFamily: "inherit", outline: "none", color: "#0f172a" }} />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "1px", textTransform: "uppercase" as const, display: "block", marginBottom: 6 }}>Activity Name</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={newActName} onChange={e => setNewActName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addActivity()}
                    placeholder="e.g. Group Discussion, Presentation..."
                    style={{ flex: 1, padding: "10px 14px", border: "1.5px solid #e5e9f5", borderRadius: 10, fontSize: 14, fontFamily: "inherit", outline: "none", color: "#0f172a" }} />
                  <button onClick={addActivity} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#5b5ef4,#818cf8)", color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap" as const }}>+ Add</button>
                </div>
              </div>
            </div>

            {/* Activity tabs with edit + delete */}
            {activitiesOnDate.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: 8 }}>
                  Activities on {fmtDate(actDate)}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {activitiesOnDate.map(a => (
                    <div key={a} style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "5px 10px 5px 14px", borderRadius: 20,
                      border: `1.5px solid ${actName === a ? "#5b5ef4" : "#e5e9f5"}`,
                      background: actName === a ? "#eef0ff" : "#fff",
                    }}>
                      {/* Select activity */}
                      <span onClick={() => setActName(a)} style={{
                        cursor: "pointer", fontWeight: 700, fontSize: 13,
                        color: actName === a ? "#5b5ef4" : "#64748b",
                        userSelect: "none" as const,
                      }}>{a}</span>

                      {/* Edit / Rename */}
                      <button
                        onClick={() => renameActivity(a)}
                        title="Rename activity"
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, padding: "0 3px", color: "#94a3b8", lineHeight: 1 }}>
                        ✏️
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => deleteActivity(a)}
                        title="Delete activity"
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: "0 3px", color: "#fca5a5", lineHeight: 1, fontWeight: 700 }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {students.length === 0 ? (
            <div style={{ background: "#fff", border: "1px solid #e5e9f5", borderRadius: 16, padding: "60px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
              <p style={{ color: "#64748b", fontSize: 15 }}>{loading ? "Loading students..." : "No students found. Add them in the Students tab first."}</p>
            </div>
          ) : !actName ? (
            <div style={{ background: "#fff", border: "1px solid #e5e9f5", borderRadius: 16, padding: "60px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⚡</div>
              <p style={{ color: "#64748b", fontSize: 15 }}>Enter an activity name above and click Add</p>
            </div>
          ) : (
            <>
              {/* Mark all buttons */}
              <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>Mark all as:</span>
                <button onClick={() => markAll("Y")} style={{ padding: "8px 16px", borderRadius: 9, border: "1.5px solid #a7f3d0", background: "#ecfdf5", color: "#059669", fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>✅ All Participated</button>
                <button onClick={() => markAll("N")} style={{ padding: "8px 16px", borderRadius: 9, border: "1.5px solid #fecaca", background: "#fef2f2", color: "#dc2626", fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>❌ All Did Not</button>
                <button onClick={() => markAll("")}  style={{ padding: "8px 16px", borderRadius: 9, border: "1.5px solid #e5e9f5", background: "#f8f9fe", color: "#64748b", fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>✕ Clear All</button>
                <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: "auto" }}>Click cell to toggle Y → N → clear</span>
              </div>

              {/* Activity table */}
              <div style={{ background: "#fff", border: "1px solid #e5e9f5", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8f9fe" }}>
                      <th style={{ padding: "12px 20px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: 12, borderBottom: "1px solid #e5e9f5", minWidth: 200 }}>STUDENT</th>
                      <th style={{ padding: "12px 20px", textAlign: "center", fontWeight: 700, color: "#475569", fontSize: 12, borderBottom: "1px solid #e5e9f5" }}>ACTIVITY: {actName}</th>
                      <th style={{ padding: "12px 20px", textAlign: "center", fontWeight: 700, color: "#475569", fontSize: 12, borderBottom: "1px solid #e5e9f5", minWidth: 100 }}>DATE</th>
                      <th style={{ padding: "12px 20px", textAlign: "center", fontWeight: 700, color: "#475569", fontSize: 12, borderBottom: "1px solid #e5e9f5", minWidth: 90 }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, i) => {
                      const s = (activities[actDate]?.[actName]?.[String(student.id)] || "") as ActivityStatus
                      const st = actStyle(s)
                      const [g1,g2] = avatarColors[i % avatarColors.length]
                      return (
                        <tr key={student.id} style={{ borderBottom: "1px solid #f1f5f9" }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fafbff"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                          <td style={{ padding: "12px 20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg,${g1},${g2})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff" }}>
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontWeight: 600, color: "#0f172a" }}>{student.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: "12px 20px", textAlign: "center", color: "#64748b", fontWeight: 500 }}>{actName}</td>
                          <td style={{ padding: "12px 20px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>{fmtDate(actDate)}</td>
                          <td style={{ padding: "12px 20px", textAlign: "center" }}>
                            <div onClick={() => cycleStatus(student.id)}
                              style={{ width: 40, height: 40, borderRadius: 10, background: st.bg, border: `2px solid ${st.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: st.color, cursor: "pointer", margin: "0 auto", transition: "all 0.15s", userSelect: "none" as const }}>
                              {s || "—"}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#f8f9fe", borderTop: "2px solid #e5e9f5" }}>
                      <td style={{ padding: "12px 20px", fontWeight: 700, fontSize: 13, color: "#475569" }}>TOTAL</td>
                      <td colSpan={2} />
                      <td style={{ padding: "12px 20px", textAlign: "center" }}>
                        <span style={{ color: "#059669", fontWeight: 700, fontSize: 14 }}>Y: {students.filter(st => activities[actDate]?.[actName]?.[String(st.id)] === "Y").length}</span>
                        <span style={{ color: "#94a3b8", margin: "0 8px" }}>·</span>
                        <span style={{ color: "#dc2626", fontWeight: 700, fontSize: 14 }}>N: {students.filter(st => activities[actDate]?.[actName]?.[String(st.id)] === "N").length}</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* ══ HISTORY VIEW ══ */}
      {view === "history" && (
        <>
          {allDates.length === 0 ? (
            <div style={{ background: "#fff", border: "1px solid #e5e9f5", borderRadius: 16, padding: "60px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <p style={{ color: "#64748b", fontSize: 15 }}>No activity records yet</p>
            </div>
          ) : (
            <>
              {/* Student summary table */}
              {students.length > 0 && (
                <div style={{ background: "#fff", border: "1px solid #e5e9f5", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 20 }}>
                  <div style={{ padding: "14px 20px", background: "#f8f9fe", borderBottom: "1px solid #e5e9f5", fontWeight: 700, fontSize: 12, color: "#475569", letterSpacing: "1px", textTransform: "uppercase" as const }}>
                    Overall Participation Summary
                  </div>
                  <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#fafbff" }}>
                        <th style={{ padding: "10px 20px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: 12, borderBottom: "1px solid #f1f5f9" }}>STUDENT</th>
                        <th style={{ padding: "10px 20px", textAlign: "center", fontWeight: 700, color: "#059669", fontSize: 12, borderBottom: "1px solid #f1f5f9" }}>Y (Participated)</th>
                        <th style={{ padding: "10px 20px", textAlign: "center", fontWeight: 700, color: "#dc2626", fontSize: 12, borderBottom: "1px solid #f1f5f9" }}>N (Did Not)</th>
                        <th style={{ padding: "10px 20px", textAlign: "center", fontWeight: 700, color: "#5b5ef4", fontSize: 12, borderBottom: "1px solid #f1f5f9" }}>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, i) => {
                        let Y = 0, N = 0
                        const key = String(student.id)
                        allDates.forEach(d => {
                          Object.keys(activities[d] || {}).forEach(a => {
                            const s = activities[d][a][key]
                            if (s === "Y") Y++
                            if (s === "N") N++
                          })
                        })
                        const pct = (Y + N) > 0 ? Math.round((Y / (Y + N)) * 100) : 0
                        const pctColor = pct >= 90 ? "#059669" : pct >= 75 ? "#2563eb" : pct >= 50 ? "#d97706" : "#dc2626"
                        const [g1,g2] = avatarColors[i % avatarColors.length]
                        return (
                          <tr key={student.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "10px 20px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg,${g1},${g2})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff" }}>{student.name.charAt(0).toUpperCase()}</div>
                                <span style={{ fontWeight: 600, color: "#0f172a" }}>{student.name}</span>
                              </div>
                            </td>
                            <td style={{ padding: "10px 20px", textAlign: "center", fontWeight: 700, color: "#059669", fontSize: 14 }}>{Y}</td>
                            <td style={{ padding: "10px 20px", textAlign: "center", fontWeight: 700, color: "#dc2626", fontSize: 14 }}>{N}</td>
                            <td style={{ padding: "10px 20px", textAlign: "center" }}>
                              <span style={{ fontWeight: 800, color: pctColor, fontSize: 14 }}>{pct}%</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Past records by date */}
              {allDates.map(d => (
                <div key={d} style={{ background: "#fff", border: "1px solid #e5e9f5", borderRadius: 14, marginBottom: 14, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div style={{ padding: "12px 20px", background: "#f8f9fe", borderBottom: "1px solid #e5e9f5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>📅 {fmtDate(d)}</span>
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>{Object.keys(activities[d] || {}).length} activit{Object.keys(activities[d] || {}).length === 1 ? "y" : "ies"}</span>
                  </div>
                  {Object.keys(activities[d] || {}).map(aName => {
                    const Y = students.filter(st => activities[d]?.[aName]?.[String(st.id)] === "Y").length
                    const N = students.filter(st => activities[d]?.[aName]?.[String(st.id)] === "N").length
                    return (
                      <div key={aName} onClick={() => { setActDate(d); setActName(aName); setView("entry") }}
                        style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 20px", borderBottom: "1px solid #f8f9fe", cursor: "pointer", transition: "background 0.15s" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fafbff"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: "#eef0ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚡</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{aName}</div>
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{Y + N} marked · {students.length - Y - N} pending</div>
                        </div>
                        <span style={{ padding: "4px 12px", borderRadius: 20, background: "#ecfdf5", color: "#059669", fontWeight: 700, fontSize: 13, border: "1px solid #a7f3d0" }}>Y: {Y}</span>
                        <span style={{ padding: "4px 12px", borderRadius: 20, background: "#fef2f2", color: "#dc2626", fontWeight: 700, fontSize: 13, border: "1px solid #fecaca" }}>N: {N}</span>
                        <span style={{ fontSize: 16, color: "#94a3b8" }}>›</span>
                      </div>
                    )
                  })}
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  )
}