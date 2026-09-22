"use client"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface Props {
  data: any[]
}

const CATEGORIES = [
  { key: "avg_attendance", label: "Attendance", color: "#10b981" },
  { key: "avg_speak_up",   label: "Speak Up",   color: "#8b5cf6" },
  { key: "avg_activity",   label: "Activity",   color: "#f59e0b" },
  { key: "avg_technical",  label: "Technical",  color: "#3b82f6" },
  { key: "avg_behavior",   label: "Behavior",   color: "#ec4899" },
  { key: "avg_initiative", label: "Initiative", color: "#6366f1" },
]

export default function ClassTrendChart({ data, view }: Props & { view: "overall" | "category" }) {
  const chartData = data.map(d => ({
    ...d,
    dateLabel: new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }))

  if (chartData.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>📈</div>
        <p>Not enough score data yet to show a trend</p>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null
    return (
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 16px", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
        <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 8, fontSize: 13 }}>{label}</div>
        {payload.map((p: any) => (
          <div key={p.dataKey} style={{ fontSize: 12.5, color: p.color, fontWeight: 600, marginBottom: 3 }}>
            {p.name}: <span style={{ fontWeight: 800 }}>{p.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 5, right: 16, bottom: 5, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: "#94a3b8", fontFamily: "'Plus Jakarta Sans',sans-serif" }} axisLine={false} tickLine={false} />
        <YAxis domain={view === "overall" ? [0, 100] : [0, 30]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {view === "overall" ? (
          <Line type="monotone" dataKey="avg_total" name="Class Average" stroke="#5b5ef4" strokeWidth={3} dot={{ r: 4, fill: "#5b5ef4" }} activeDot={{ r: 6 }} />
        ) : (
          <>
            <Legend wrapperStyle={{ fontSize: 12, fontFamily: "'Plus Jakarta Sans',sans-serif" }} />
            {CATEGORIES.map(c => (
              <Line key={c.key} type="monotone" dataKey={c.key} name={c.label} stroke={c.color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            ))}
          </>
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}