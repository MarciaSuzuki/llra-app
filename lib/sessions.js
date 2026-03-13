import { get, list, put } from '@vercel/blob'

const SESSION_PREFIX = 'sessions/'

// Local in-memory fallback for development or when Blob storage is not configured.
const sessions = new Map()

function isBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

function getSessionPath(id) {
  return `${SESSION_PREFIX}${id}.json`
}

async function readJsonBlob(pathname) {
  const blob = await get(pathname, { access: 'private' })
  if (!blob || blob.statusCode !== 200) return null

  const raw = await new Response(blob.stream).text()
  return JSON.parse(raw)
}

async function writeSessionBlob(session) {
  await put(getSessionPath(session.id), JSON.stringify(session), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  })
}

async function loadSessionsFromBlobStore() {
  const allBlobs = []
  let cursor

  do {
    const page = await list({
      cursor,
      limit: 1000,
      mode: 'expanded',
      prefix: SESSION_PREFIX,
    })

    allBlobs.push(...page.blobs)
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)

  const loaded = await Promise.all(
    allBlobs.map(async (blob) => {
      try {
        return await readJsonBlob(blob.pathname)
      } catch (error) {
        console.error(`Could not read session blob ${blob.pathname}:`, error)
        return null
      }
    })
  )

  return loaded
    .filter(Boolean)
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
}

export async function createSession(studentName) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const session = {
    id,
    studentName,
    startedAt: new Date().toISOString(),
    completedAt: null,
    scores: {},
    adminNotes: {},
    studentFeedback: {},
    responses: {},
    currentQuestionIndex: 0,
    status: 'in_progress',
    inputMode: 'text',
    report: null,
  }

  sessions.set(id, session)

  if (isBlobConfigured()) {
    await writeSessionBlob(session)
  }

  return session
}

export async function getSession(id) {
  if (!id) return null

  if (!isBlobConfigured()) {
    return sessions.get(id) || null
  }

  try {
    const session = await readJsonBlob(getSessionPath(id))
    if (session) sessions.set(id, session)
    return session
  } catch (error) {
    console.error(`Could not load session ${id}:`, error)
    return null
  }
}

export async function updateSession(id, updates) {
  const session = await getSession(id)
  if (!session) return null

  const updated = { ...session, ...updates }
  sessions.set(id, updated)

  if (isBlobConfigured()) {
    await writeSessionBlob(updated)
  }

  return updated
}

export async function getAllSessions() {
  if (!isBlobConfigured()) {
    return Array.from(sessions.values()).sort(
      (a, b) => new Date(b.startedAt) - new Date(a.startedAt)
    )
  }

  try {
    const loaded = await loadSessionsFromBlobStore()
    for (const session of loaded) {
      sessions.set(session.id, session)
    }
    return loaded
  } catch (error) {
    console.error('Could not list persisted sessions:', error)
    return Array.from(sessions.values()).sort(
      (a, b) => new Date(b.startedAt) - new Date(a.startedAt)
    )
  }
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
