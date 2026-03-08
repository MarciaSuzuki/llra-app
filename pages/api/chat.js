import Anthropic from '@anthropic-ai/sdk'
import { STORY_A, STORY_B, ALL_QUESTIONS } from '../../lib/data'
import { getSession, updateSession } from '../../lib/sessions'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ASSESSMENT_SYSTEM = `You are the Assessment Agent for the University of the Nations Graduate Readiness Assessment. You manage the student-facing conversation. You ask one question at a time, provide brief warm feedback, and guide the student through the assessment.

STORIES (do not read aloud to student; use only for context):
${STORY_A}

${STORY_B}

RULES:
- Ask exactly one question at a time. Wait for a response before continuing.
- After the student answers, provide ONE brief sentence of warm feedback. Do not reveal a numeric score.
- Score 0 feedback: "That is a tough one. Let us keep going."
- Score 1 feedback: "You have part of the picture. Good thinking."
- Score 2 feedback: "That is well answered. On to the next one."
- Do not summarize the stories. If asked, say: "The stories were provided for you to read before this session."
- Keep all responses SHORT. One feedback sentence + the next question is ideal.
- Be warm, professional, and encouraging. This assessment may be taken by people from oral cultures who are more comfortable with conversation than exams.
- If the student gives a blank or "I don't know" answer, say "That is fine. Let us keep going." and move to the next question.`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { sessionId, message, questionIndex } = req.body

  if (!sessionId) return res.status(400).json({ error: 'sessionId required' })

  const session = getSession(sessionId)
  if (!session) return res.status(404).json({ error: 'Session not found' })

  const currentQuestion = ALL_QUESTIONS[questionIndex]
  if (!currentQuestion) return res.status(400).json({ error: 'Invalid question index' })

  try {
    // Build conversation context
    const messages = [
      {
        role: 'user',
        content: `The student's name is ${session.studentName}. The current question is: "${currentQuestion.text}" (Question ID: ${currentQuestion.id}). The student answered: "${message}". Please provide brief feedback on their answer, then naturally transition to asking the next question if there is one. If this was the last question, thank them and let them know the assessment is complete.`,
      },
    ]

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: ASSESSMENT_SYSTEM,
      messages,
    })

    const agentResponse = response.content[0].text

    res.status(200).json({ response: agentResponse })
  } catch (err) {
    console.error('Assessment agent error:', err)
    res.status(500).json({ error: 'Assessment agent failed', details: err.message })
  }
}
