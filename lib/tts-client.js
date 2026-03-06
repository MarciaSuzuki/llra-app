export function splitTextForTts(text, maxChunkLength = 900) {
  const normalized = (text || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return []

  const sentences = normalized.match(/[^.!?]+[.!?]*/g) || [normalized]
  const chunks = []
  let current = ''

  for (const rawSentence of sentences) {
    const sentence = rawSentence.trim()
    if (!sentence) continue

    const candidate = `${current} ${sentence}`.trim()
    if (candidate.length <= maxChunkLength) {
      current = candidate
      continue
    }

    if (current) chunks.push(current)

    if (sentence.length <= maxChunkLength) {
      current = sentence
      continue
    }

    const words = sentence.split(' ')
    let longChunk = ''
    for (const word of words) {
      const longCandidate = `${longChunk} ${word}`.trim()
      if (longCandidate.length <= maxChunkLength) {
        longChunk = longCandidate
      } else {
        if (longChunk) chunks.push(longChunk)
        longChunk = word
      }
    }

    current = longChunk
  }

  if (current) chunks.push(current)
  return chunks
}

async function parseErrorResponse(response) {
  let message = 'Unable to generate audio right now.'
  const contentType = response.headers.get('content-type') || ''

  try {
    if (contentType.includes('application/json')) {
      const data = await response.json()
      if (data?.error) message = data.error
    } else {
      const textError = await response.text()
      if (textError) message = textError.slice(0, 220)
    }
  } catch {
    // ignore parsing failures and use generic message
  }

  return message
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchTtsAudioBlob(text, options = {}) {
  const voicePreset = options.voicePreset || 'default'
  const maxAttempts = 3
  let lastError = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voicePreset }),
      })

      if (!response.ok) {
        const message = await parseErrorResponse(response)
        throw new Error(message)
      }

      return response.blob()
    } catch (error) {
      lastError = error
      if (attempt < maxAttempts) {
        await delay(attempt * 400)
      }
    }
  }

  throw lastError || new Error('Unable to generate audio right now.')
}
