const DEFAULT_MODEL_ID = 'eleven_multilingual_v2'

function normalizeModelId(rawValue) {
  if (!rawValue || typeof rawValue !== 'string') return DEFAULT_MODEL_ID

  const trimmed = rawValue.trim().replace(/^['"`]+|['"`]+$/g, '')
  const firstToken = trimmed.match(/^[A-Za-z0-9_.-]+/)?.[0]

  return firstToken || DEFAULT_MODEL_ID
}

function resolveVoiceId(voicePreset) {
  const defaultVoice = process.env.ELEVENLABS_VOICE_ID
  const storyAVoice = process.env.ELEVENLABS_VOICE_ID_STORY_A
  const storyBVoice = process.env.ELEVENLABS_VOICE_ID_STORY_B
  const questionVoice = process.env.ELEVENLABS_VOICE_ID_QUESTION

  if (voicePreset === 'story_a') return storyAVoice || defaultVoice
  if (voicePreset === 'story_b') return storyBVoice || defaultVoice
  if (voicePreset === 'question') return questionVoice || defaultVoice
  return defaultVoice
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ELEVENLABS_API_KEY
  const modelId = normalizeModelId(process.env.ELEVENLABS_MODEL_ID)
  const { text, voicePreset } = req.body || {}
  const voiceId = resolveVoiceId(voicePreset)

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required.' })
  }

  if (!apiKey) {
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY is not configured.' })
  }

  if (!voiceId) {
    return res.status(500).json({ error: 'ELEVENLABS_VOICE_ID is not configured.' })
  }

  const cleanText = text.replace(/\s+/g, ' ').trim()
  if (!cleanText) {
    return res.status(400).json({ error: 'Text is empty.' })
  }

  try {
    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?optimize_streaming_latency=1`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: modelId,
        output_format: 'mp3_44100_128',
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.78,
          style: 0.22,
          use_speaker_boost: true,
          speed: 0.96,
        },
      }),
    })

    if (!elevenRes.ok) {
      const errorText = await elevenRes.text()
      return res.status(502).json({
        error: `ElevenLabs request failed (${elevenRes.status}). ${errorText?.slice(0, 240) || ''}`,
      })
    }

    const audioBuffer = Buffer.from(await elevenRes.arrayBuffer())

    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).send(audioBuffer)
  } catch (error) {
    return res.status(500).json({ error: `Audio generation failed: ${error.message}` })
  }
}
