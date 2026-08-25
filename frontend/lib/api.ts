import axios from "axios"

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
})

// Students
export const getStudents = (batchId?: number) =>
  API.get("/students/", { params: batchId ? { batch_id: batchId } : {} })
export const createStudent = (data: { name: string; email: string; photo?: string; batch_id: number }) =>
  API.post("/students/", data)
export const deleteStudent = (id: number) => API.delete(`/students/${id}`)
export const studentLogin = (email: string) =>
  API.post(`/students/login?email=${email}`)
export const updateStudentPhoto = (id: number, photo: string) =>
  API.patch(`/students/${id}/photo`, { photo })
export const updateStudent = (
  id: number,
  data: {
    name: string
    photo?: string
  }
) => API.put(`/students/${id}`, data)

// Scores
export const submitScore = (data: any) => API.post("/scores/", data)
export const getLeaderboard = (batchId?: number) =>
  API.get("/scores/leaderboard/today", { params: batchId ? { batch_id: batchId } : {} })
export const getWeeklyLeaderboard = (batchId?: number) =>
  API.get("/scores/leaderboard/weekly", { params: batchId ? { batch_id: batchId } : {} })
export const getMonthlyLeaderboard = (batchId?: number) =>
  API.get("/scores/leaderboard/monthly", { params: batchId ? { batch_id: batchId } : {} })
export const getStudentOfDay = (batchId?: number) =>
  API.get("/scores/student-of-the-day", { params: batchId ? { batch_id: batchId } : {} })


// Batches
export const getBatches = () => API.get("/batches/")
export const getActiveBatches = () => API.get("/batches/active")
export const createBatch = (data: { name: string }) => API.post("/batches/", data)
export const endBatch = (id: number) => API.patch(`/batches/${id}/end`)

// Project Updates
export const createProjectUpdate = (data: any) => API.post("/project-updates/", data)
export const getMyProjectUpdates = (studentId: number) => API.get(`/project-updates/student/${studentId}`)
export const getAllProjectUpdates = () => API.get("/project-updates/all")
export const approveProjectUpdate = (id: number, remark?: string, reviewer_name?: string) =>
  API.patch(`/project-updates/${id}/approve`, { remark, reviewer_name })

export const getWeeklyScores = (studentId: number) =>
  API.get(`/scores/weekly/${studentId}`)
export const getMyScores = (studentId: number) =>
  API.get(`/scores/my-scores/${studentId}`)

// Rewards
export const giveReward = (data: any) =>
  API.post("/students/rewards/give", data)
export const getStudentRewards = (studentId: number) =>
  API.get(`/students/rewards/student/${studentId}`)
export const getAllRewards = () => API.get("/students/rewards/all")

// Averages & Streaks
export const getAllAverages = (days: number, batchId?: number) =>
  API.get("/scores/averages/all", { params: batchId ? { days, batch_id: batchId } : { days } })
export const getStudentAverage = (studentId: number, days: number) =>
  API.get(`/scores/average/${studentId}?days=${days}`)
export const getStudentStreak = (studentId: number) =>
  API.get(`/scores/streak/${studentId}`)
export const getAllStreaks = (batchId?: number) =>
  API.get("/scores/streaks/all", { params: batchId ? { batch_id: batchId } : {} })

// Google Sheet attendance fetch
export const fetchAttendanceFromSheet = async (sheetId: string) => {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`
  const response = await fetch(url)
  const csv = await response.text()
  return parseAttendanceCSV(csv)
}

export const parseAttendanceCSV = (csv: string) => {
  const lines = csv.split("\n").filter(l => l.trim())
  const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""))

  const students = lines.slice(1).map(line => {
    const cols = line.split(",").map(c => c.trim().replace(/"/g, ""))
    const name = cols[0]
    const attendance: Record<string, string> = {}
    headers.slice(1).forEach((day, i) => {
      attendance[day] = cols[i + 1] || ""
    })
    const totalDays = headers.slice(1).length
    const presentDays = Object.values(attendance).filter(v =>
      v.toLowerCase() === "p" || v.toLowerCase() === "present" || v === "1"
    ).length
    return {
      name,
      attendance,
      totalDays,
      presentDays,
      percentage: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
    }
  }).filter(s => s.name)

  return { headers: headers.slice(1), students }
}

// Attendance
export const getAllAttendance = (batchId?: number) =>
  API.get("/attendance/", { params: batchId ? { batch_id: batchId } : {} })
export const getAttendanceByDate = (date: string, batchId?: number) =>
  API.get(`/attendance/date/${date}`, { params: batchId ? { batch_id: batchId } : {} })
export const getAttendanceSummary = (batchId?: number) =>
  API.get("/attendance/summary", { params: batchId ? { batch_id: batchId } : {} })

// Daily Activity
export const createActivity = (data: { date: string; name: string }) =>
  API.post("/activities/", data)
export const getActivities = (date: string) =>
  API.get(`/activities/?date=${date}`)
export const markActivityStatus = (data: { activity_id: number; student_name: string; status: "Y" | "N" | "" }) =>
  API.post("/activities/mark", data)
export const getActivityHistory = () =>
  API.get("/activities/history")

// Study Material
export const createStudyEntry = (data: {
  date: string
  topic_name: string
  video_recorded: string
  video_access: string
  programs_given: number
  programs_submitted: number
  notes: string[]
}) => API.post("/study/", data)
export const getStudyEntries = () => API.get("/study/")
export const updateStudyEntry = (id: number, data: any) =>
  API.put(`/study/${id}`, data)
export const deleteStudyEntry = (id: number) =>
  API.delete(`/study/${id}`)

// Interpersonal Skills
export const createSkillEntry = (data: {
  week: number
  student_name: string
  communication: number
  dressing: number
  gestures: number
  time_management: number
  posture: number
  teamwork: number
  confidence: number
  leadership: number
}) => API.post("/skills/", data)
export const getSkillEntries = () => API.get("/skills/")
export const getSkillsByStudent = (studentName: string) =>
  API.get(`/skills/student/${studentName}`)
export const getSkillsByWeek = (week: number) =>
  API.get(`/skills/week/${week}`)
export const updateSkillEntry = (id: number, data: any) =>
  API.put(`/skills/${id}`, data)
export const deleteSkillEntry = (id: number) =>
  API.delete(`/skills/${id}`)