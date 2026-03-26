import Anthropic from '@anthropic-ai/sdk'
import { getUiText, getSupportedLanguage } from '../../lib/i18n'
import { createSession, getAllSessions, getSession, getSessionStats, updateSession } from '../../lib/sessions'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function getLanguageName(language) {
  return language === 'pt' ? 'Brazilian Portuguese' : 'English'
}

function buildReportSystem(language) {
  const languageName = getLanguageName(language)

  return `You are the Report Agent for the University of the Nations Graduate Readiness Assessment. Given a complete scored session, produce two outputs separated by the delimiter "===ADMIN===".

LANGUAGE:
- Write both outputs in ${languageName}.
- Be warm and clear for the student summary.
- Be honest, concise, and specific for the administrator notes.
- Keep the student summary natural, not overly polite or repetitive.
- If writing in Portuguese and you include gratitude, use "obrigado" only. Do NOT use "obrigado(a)".

OUTPUT 1 (before ===ADMIN===): Student summary — 3-5 warm, encouraging sentences. Name one or two strengths and one area for growth. Do NOT include scores or numbers.

OUTPUT 2 (after ===ADMIN===): Administrator notes — 3-4 sentences of qualitative analysis covering: quality of reasoning, cross-story synthesis ability, any notable responses, and a brief recommendation note.`
}

export default async function handler(req, res) {
  const { method } = req

  if (method === 'GET') {
    const password = req.headers['x-admin-password']
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const sessions = await getAllSessions()
    return res.status(200).json({ sessions })
  }

  if (method === 'POST') {
    const { action, studentName, sessionId, inputMode, language: requestedLanguage } = req.body

    if (action === 'create') {
      if (!studentName) return res.status(400).json({ error: 'studentName required' })
      const language = getSupportedLanguage(requestedLanguage)
      const session = await createSession(studentName, { inputMode, language })
      return res.status(200).json({ sessionId: session.id })
    }

    if (action === 'complete') {
      if (!sessionId) return res.status(400).json({ error: 'sessionId required' })
      const session = await getSession(sessionId)
      if (!session) return res.status(404).json({ error: 'Session not found' })

      const language = getSupportedLanguage(requestedLanguage || session.language)
      const uiText = getUiText(language)
      const stats = getSessionStats(session)

      try {
        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
          system: buildReportSystem(language),
          messages: [{
            role: 'user',
            content: JSON.stringify({
              studentName: session.studentName,
              language,
              stats,
              adminNotes: session.adminNotes,
              responses: session.responses,
            }),
          }],
        })

        const raw = response.content[0].text
        const parts = raw.split('===ADMIN===')
        const studentSummary = parts[0]?.trim() || uiText.api.reportCompletedFallback
        const adminAnalysis = parts[1]?.trim() || uiText.api.reportAdminFallback

        await updateSession(sessionId, {
          completedAt: new Date().toISOString(),
          status: 'completed',
          language,
          report: { studentSummary, adminAnalysis, stats },
        })

        return res.status(200).json({ studentSummary, stats })
      } catch (err) {
        console.error('Report generation error:', err)
        await updateSession(sessionId, {
          completedAt: new Date().toISOString(),
          status: 'completed',
          language,
        })
        return res.status(200).json({ studentSummary: uiText.api.reportStudentFallback, stats })
      }
    }

    if (action === 'get') {
      const session = await getSession(sessionId)
      if (!session) return res.status(404).json({ error: 'Session not found' })
      return res.status(200).json({ session })
    }

    return res.status(400).json({ error: 'Unknown action' })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
