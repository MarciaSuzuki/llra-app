export function splitTextForTts(text, maxChunkLength = 1300) {
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

export async function fetchTtsAudioBlob(text) {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
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

    throw new Error(message)
  }

  return response.blob()
}
