// Simple in-memory session store (works for demo; replace with Vercel KV or Supabase for production)
// Sessions persist while the server is running.

const sessions = new Map()

export function createSession(studentName) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const session = {
    id,
    studentName,
    startedAt: new Date().toISOString(),
    completedAt: null,
    scores: {},           // { R1: 0|1|2, U3: 0|1|2, ... }
    adminNotes: {},       // { R1: "...", ... }
    studentFeedback: {},  // { R1: "...", ... }
    responses: {},        // { R1: "student response text", ... }
    currentQuestionIndex: 0,
    status: 'in_progress', // in_progress | completed | abandoned
    inputMode: 'text',     // text | audio
    report: null,
  }
  sessions.set(id, session)
  return session
}

export function getSession(id) {
  return sessions.get(id) || null
}

export function updateSession(id, updates) {
  const session = sessions.get(id)
  if (!session) return null
  const updated = { ...session, ...updates }
  sessions.set(id, updated)
  return updated
}

export function getAllSessions() {
  return Array.from(sessions.values()).sort(
    (a, b) => new Date(b.startedAt) - new Date(a.startedAt)
  )
}

export function getSessionStats(session) {
  const scores = Object.values(session.scores)
  const total = scores.reduce((sum, s) => sum + s, 0)
  const maxPossible = Object.keys(session.scores).length * 2

  const rememberScores = Object.entries(session.scores)
    .filter(([k]) => k.startsWith('R'))
    .map(([, v]) => v)
  const understandScores = Object.entries(session.scores)
    .filter(([k]) => k.startsWith('U'))
    .map(([, v]) => v)
  const applyScores = Object.entries(session.scores)
    .filter(([k]) => k.startsWith('A'))
    .map(([, v]) => v)

  const rememberTotal = rememberScores.reduce((s, v) => s + v, 0)
  const understandTotal = understandScores.reduce((s, v) => s + v, 0)
  const applyTotal = applyScores.reduce((s, v) => s + v, 0)

  const percentage = maxPossible > 0 ? Math.round((total / 60) * 100) : 0

  let band = 'Developing'
  if (percentage >= 85) band = 'Exceeding'
  else if (percentage >= 70) band = 'Meeting'
  else if (percentage >= 50) band = 'Approaching'

  return {
    total,
    maxPossible: 60,
    percentage,
    band,
    byLevel: {
      remember: { score: rememberTotal, max: 20 },
      understand: { score: understandTotal, max: 20 },
      apply: { score: applyTotal, max: 20 },
    },
  }
}
