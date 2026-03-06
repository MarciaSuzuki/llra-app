import Anthropic from '@anthropic-ai/sdk'
import { getSession, updateSession, getAllSessions, createSession, getSessionStats } from '../../lib/sessions'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const REPORT_SYSTEM = `You are the Report Agent for the University of the Nations Learning Level Readiness Assessment. Given a complete scored session, produce two outputs separated by the delimiter "===ADMIN===".

OUTPUT 1 (before ===ADMIN===): Student summary — 3-5 warm, encouraging sentences. Name one or two strengths, one area for growth. Do NOT include scores or numbers.

OUTPUT 2 (after ===ADMIN===): Administrator notes — 3-4 sentences of qualitative analysis covering: quality of reasoning, cross-story synthesis ability, any notable responses, and a brief recommendation note. Be honest and specific.`

export default async function handler(req, res) {
  const { method } = req

  // GET /api/sessions - list all sessions (admin)
  if (method === 'GET') {
    const password = req.headers['x-admin-password']
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const sessions = getAllSessions()
    return res.status(200).json({ sessions })
  }

  // POST /api/sessions - create or complete session
  if (method === 'POST') {
    const { action, studentName, sessionId, inputMode } = req.body

    if (action === 'create') {
      if (!studentName) return res.status(400).json({ error: 'studentName required' })
      const session = createSession(studentName)
      if (inputMode) updateSession(session.id, { inputMode })
      return res.status(200).json({ sessionId: session.id })
    }

    if (action === 'complete') {
      if (!sessionId) return res.status(400).json({ error: 'sessionId required' })
      const session = getSession(sessionId)
      if (!session) return res.status(404).json({ error: 'Session not found' })

      const stats = getSessionStats(session)

      // Generate report
      try {
        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
          system: REPORT_SYSTEM,
          messages: [{
            role: 'user',
            content: JSON.stringify({
              studentName: session.studentName,
              stats,
              adminNotes: session.adminNotes,
              responses: session.responses,
            }),
          }],
        })

        const raw = response.content[0].text
        const parts = raw.split('===ADMIN===')
        const studentSummary = parts[0]?.trim() || 'Assessment completed successfully.'
        const adminAnalysis = parts[1]?.trim() || 'No qualitative analysis generated.'

        updateSession(sessionId, {
          completedAt: new Date().toISOString(),
          status: 'completed',
          report: { studentSummary, adminAnalysis, stats },
        })

        return res.status(200).json({ studentSummary, stats })
      } catch (err) {
        console.error('Report generation error:', err)
        updateSession(sessionId, { completedAt: new Date().toISOString(), status: 'completed' })
        return res.status(200).json({ studentSummary: 'Thank you for completing the assessment. Your results will be reviewed by the admissions team.', stats })
      }
    }

    // GET session by ID
    if (action === 'get') {
      const session = getSession(sessionId)
      if (!session) return res.status(404).json({ error: 'Session not found' })
      return res.status(200).json({ session })
    }

    return res.status(400).json({ error: 'Unknown action' })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
