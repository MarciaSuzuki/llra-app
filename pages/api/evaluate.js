import Anthropic from '@anthropic-ai/sdk'
import { getSession, updateSession } from '../../lib/sessions'
import { getLevelForQuestion } from '../../lib/data'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const EVAL_SYSTEM = `You are the Evaluation Agent for the University of the Nations Graduate Readiness Assessment. You evaluate student responses and return structured JSON only.

SCORING RUBRIC:
- Score 0: Incorrect or off-topic. Response does not address the question.
- Score 1: Partial. Captures some key elements but misses others, or is vague.
- Score 2: Complete. Accurately addresses the core of the question.

For Apply-level questions (IDs starting with A):
- If the response draws on only ONE story, maximum score is 1.
- Score 2 requires specific references to events from BOTH stories.

OUTPUT: Return ONLY valid JSON, no preamble, no markdown.
{
  "score": 0 | 1 | 2,
  "studentFeedback": "one warm brief sentence for the student",
  "adminNote": "one sentence on reasoning quality for the administrator"
}`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { sessionId, questionId, questionText, expectedElements, studentResponse } = req.body

  if (!sessionId || !questionId) return res.status(400).json({ error: 'sessionId and questionId required' })

  const session = getSession(sessionId)
  if (!session) return res.status(404).json({ error: 'Session not found' })

  const level = getLevelForQuestion(questionId)

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: EVAL_SYSTEM,
      messages: [{
        role: 'user',
        content: JSON.stringify({
          level,
          question_number: questionId,
          question_text: questionText,
          expected_elements: expectedElements,
          student_response: studentResponse || '[no response given]',
        }),
      }],
    })

    let evaluation
    try {
      const raw = response.content[0].text.trim()
      const clean = raw.replace(/```json|```/g, '').trim()
      evaluation = JSON.parse(clean)
    } catch {
      evaluation = { score: 0, studentFeedback: 'Thank you for your answer.', adminNote: 'Evaluation parsing failed.' }
    }

    // Store in session
    const updatedScores = { ...session.scores, [questionId]: evaluation.score }
    const updatedAdminNotes = { ...session.adminNotes, [questionId]: evaluation.adminNote }
    const updatedStudentFeedback = { ...session.studentFeedback, [questionId]: evaluation.studentFeedback }
    const updatedResponses = { ...session.responses, [questionId]: studentResponse }

    updateSession(sessionId, {
      scores: updatedScores,
      adminNotes: updatedAdminNotes,
      studentFeedback: updatedStudentFeedback,
      responses: updatedResponses,
    })

    res.status(200).json(evaluation)
  } catch (err) {
    console.error('Evaluation agent error:', err)
    res.status(500).json({ error: 'Evaluation failed', details: err.message })
  }
}
