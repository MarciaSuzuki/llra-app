import Anthropic from '@anthropic-ai/sdk'
import { getAllQuestions, getStories } from '../../lib/data'
import { getSupportedLanguage } from '../../lib/i18n'
import { getSession } from '../../lib/sessions'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function getLanguageName(language) {
  return language === 'pt' ? 'Brazilian Portuguese' : 'English'
}

function buildAssessmentSystem(language) {
  const stories = getStories(language)
  const languageName = getLanguageName(language)

  return `You are the Assessment Agent for the University of the Nations Graduate Readiness Assessment. You manage the student-facing conversation. You ask one question at a time, provide brief warm feedback, and guide the student through the assessment.

LANGUAGE:
- The session language is ${languageName}.
- Respond in ${languageName}.

STORIES (do not read aloud to student; use only for context):
${stories.A.title}
${stories.A.text}

${stories.B.title}
${stories.B.text}

RULES:
- Ask exactly one question at a time. Wait for a response before continuing.
- After the student answers, provide ONE brief sentence of warm feedback. Do not reveal a numeric score.
- Do not thank the student after each answer.
- Keep the tone natural and conversational, not overly polite or forced.
- If responding in Portuguese, do not use "obrigado(a)".
- Sound like a calm interviewer speaking with the student, not like a formal test administrator.
- Prefer simple spoken language over academic or evaluative phrasing.
- Keep all responses SHORT. One feedback sentence + the next question is ideal.
- Do not summarize the stories. If asked, say the stories were provided before the assessment.
- Be warm, professional, and encouraging. This assessment may be taken by people from oral cultures who are more comfortable with conversation than exams.
- If the student gives a blank or "I don't know" answer, respond briefly and move to the next question.`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { sessionId, message, questionIndex } = req.body

  if (!sessionId) return res.status(400).json({ error: 'sessionId required' })

  const session = await getSession(sessionId)
  if (!session) return res.status(404).json({ error: 'Session not found' })

  const language = getSupportedLanguage(session.language)
  const questions = getAllQuestions(language)
  const currentQuestion = questions[questionIndex]
  if (!currentQuestion) return res.status(400).json({ error: 'Invalid question index' })

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: buildAssessmentSystem(language),
      messages: [
        {
          role: 'user',
          content: `The student's name is ${session.studentName}. The current question is: "${currentQuestion.text}" (Question ID: ${currentQuestion.id}). The student answered: "${message}". Please provide brief feedback on their answer, then naturally transition to asking the next question if there is one. If this was the last question, thank them and let them know the assessment is complete.`,
        },
      ],
    })

    const agentResponse = response.content[0].text
    res.status(200).json({ response: agentResponse })
  } catch (err) {
    console.error('Assessment agent error:', err)
    res.status(500).json({ error: 'Assessment agent failed', details: err.message })
  }
}
