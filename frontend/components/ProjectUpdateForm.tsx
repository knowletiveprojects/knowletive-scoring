"use client"
import { useEffect, useState } from "react"
import { createProjectUpdate, getMyProjectUpdates } from "@/lib/api"

const nowDate = () => new Date().toISOString().split("T")[0]
const nowTime = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

// Converts ANY uploaded image (heic, png, webp, etc.) to a safe JPEG data URL via canvas.
// This guarantees the backend/Excel export can always read it.
const normalizeImageToJpeg = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const MAX_DIM = 1000
        let { width, height } = img
        if (width > MAX_DIM || height > MAX_DIM) {
          const scale = MAX_DIM / Math.max(width, height)
          width = Math.round(width * scale)
          height = Math.round(height * scale)
        }
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) return reject(new Error("Canvas not supported"))
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", 0.85))
      }
      img.onerror = () => reject(new Error("Could not read image — try a different photo (JPEG/PNG work best)"))
      img.src = ev.target?.result as string
    }
    reader.onerror = () => reject(new Error("Could not read file"))
    reader.readAsDataURL(file)
  })
}

export default function ProjectUpdateForm() {
  const [student, setStudent]   = useState<any>(null)
  const [updates, setUpdates]   = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast]       = useState<{ msg: string; type: string } | null>(null)

  const emptyForm = () => ({
    name: "",
    project_name: "",
    technology: "",
    date: nowDate(),
    time: nowTime(),
    image: "",
    github_link: "",
    deployment_link: "",
  })
  const [form, setForm] = useState(emptyForm())

  const showToast = (msg: string, type = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const s = localStorage.getItem("student")
    if (!s) return
    const parsed = JSON.parse(s)
    setStudent(parsed)
    setForm((f) => ({ ...f, name: parsed.name }))
    fetchUpdates(parsed.id)
  }, [])

  const fetchUpdates = async (id: number) => {
    try {
      const res = await getMyProjectUpdates(id)
      setUpdates(res.data)
    } catch {
      setUpdates([])
    }
  }

  const knownProjects = Array.from(new Set(updates.map((u: any) => u.project_name))).filter(Boolean)

  const handleProjectNameChange = (value: string) => {
    const match = updates.find((u: any) => u.project_name === value)
    setForm((f) => ({
      ...f,
      project_name: value,
      github_link: match ? (match.github_link || f.github_link) : f.github_link,
      deployment_link: match ? (match.deployment_link || f.deployment_link) : f.deployment_link,
    }))
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 8000000) { showToast("Image must be under 8MB", "warning"); return }
    try {
      const jpegDataUrl = await normalizeImageToJpeg(file)
      setForm((f) => ({ ...f, image: jpegDataUrl }))
    } catch (err: any) {
      showToast(err?.message || "Could not process image", "error")
    }
  }

  const handleSubmit = async () => {
    if (!student) return
    if (!form.project_name || !form.name) return showToast("Please fill in name and project name!", "warning")
    setSubmitting(true)
    try {
      await createProjectUpdate({ ...form, student_id: student.id })
      showToast("Update submitted! 🚀")
      setForm((f) => ({ ...emptyForm(), name: student.name, project_name: f.project_name, technology: f.technology, github_link: f.github_link, deployment_link: f.deployment_link }))
      fetchUpdates(student.id)
    } catch {
      showToast("Error submitting update", "error")
    }
    setSubmitting(false)
  }

  if (!student) return null

  return (
    <div className="card fade" style={{ padding: 22, marginBottom: 16, animationDelay: "0.03s" }}>
      <style>{`
        .pu-input { width:100%; padding:10px 12px; border-radius:9px; border:1.5px solid #e2e8f0; font-size:13px; font-family:'Plus Jakarta Sans',sans-serif; outline:none; color:#0f172a; }
        .pu-input:focus { border-color:#4f46e5; }
        .pu-label { font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; display:block; margin-bottom:6px; }
      `}</style>
      <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>
        📋 Daily Project Update
      </h2>

      {toast && (
        <div style={{
          padding: "8px 14px", borderRadius: 9, marginBottom: 14, fontSize: 12, fontWeight: 700,
          background: toast.type === "error" ? "#fef2f2" : toast.type === "warning" ? "#fffbeb" : "#f0fdf4",
          color: toast.type === "error" ? "#dc2626" : toast.type === "warning" ? "#b45309" : "#15803d",
        }}>{toast.msg}</div>
      )}

      {knownProjects.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <label className="pu-label">Quick Pick — Your Projects</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
            {knownProjects.map((p) => (
              <button key={p} type="button" onClick={() => handleProjectNameChange(p)} style={{
                padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${form.project_name === p ? "#4f46e5" : "#e2e8f0"}`,
                background: form.project_name === p ? "#eef2ff" : "#fff",
                color: form.project_name === p ? "#4f46e5" : "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>{p}</button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div>
          <label className="pu-label">Name</label>
          <input className="pu-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="pu-label">Project Name</label>
          <input className="pu-input" placeholder="e.g. Knowletive Scoring App" value={form.project_name}
            onChange={e => handleProjectNameChange(e.target.value)} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="pu-label">Technology / Topic Used Today</label>
          <input className="pu-input" placeholder="e.g. React, FastAPI, PostgreSQL" value={form.technology}
            onChange={e => setForm({ ...form, technology: e.target.value })} />
        </div>
        <div>
          <label className="pu-label">Date</label>
          <input className="pu-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
        </div>
        <div>
          <label className="pu-label">Time</label>
          <input className="pu-input" type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
        </div>
      </div>

      <details style={{ marginBottom: 16 }}>
        <summary style={{ fontSize: 12, fontWeight: 700, color: "#4f46e5", cursor: "pointer", marginBottom: 8 }}>
          🔗 GitHub / Deployment Links {(form.github_link || form.deployment_link) ? "(saved)" : "(optional — set once)"}
        </summary>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 10 }}>
          <div>
            <label className="pu-label">GitHub Link</label>
            <input className="pu-input" placeholder="https://github.com/..." value={form.github_link}
              onChange={e => setForm({ ...form, github_link: e.target.value })} />
          </div>
          <div>
            <label className="pu-label">Deployment Link</label>
            <input className="pu-input" placeholder="https://myapp.vercel.app" value={form.deployment_link}
              onChange={e => setForm({ ...form, deployment_link: e.target.value })} />
          </div>
        </div>
      </details>

      <div style={{ marginBottom: 16 }}>
        <label className="pu-label">Image of Today's Work</label>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <label style={{
            padding: "9px 16px", borderRadius: 9, border: "1.5px dashed #c7d2fe", background: "#eef2ff",
            color: "#4f46e5", fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>
            📷 Choose Image
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageChange} />
          </label>
          {form.image && (
            <img src={form.image} alt="preview" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", border: "1px solid #e2e8f0" }} />
          )}
        </div>
      </div>

      <button onClick={handleSubmit} disabled={submitting} style={{
        width: "100%", padding: 12, borderRadius: 10, border: "none", cursor: submitting ? "not-allowed" : "pointer",
        fontWeight: 700, fontSize: 14, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff",
        opacity: submitting ? 0.7 : 1,
      }}>
        {submitting ? "Submitting..." : "Submit Update 🚀"}
      </button>

      {updates.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
            Your Recent Updates
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {updates.slice(0, 5).map((u: any) => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "#f8fafc", border: "1px solid #f1f5f9" }}>
                {u.image && <img src={u.image} style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{u.project_name}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{u.date} · {u.time}</div>
                  {u.approved && (
                    <div style={{ fontSize: 11, color: "#059669", marginTop: 4, fontWeight: 600 }}>
                      "{u.faculty_remark}" — {u.reviewer_name || "Faculty"}
                    </div>
                  )}
                </div>
                {!u.approved && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", background: "#f1f5f9", padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" as const, flexShrink: 0 }}>
                    ⏳ Pending review
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}