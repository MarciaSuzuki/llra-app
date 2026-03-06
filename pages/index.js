import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { STORY_A, STORY_B } from '../lib/data'
import { splitTextForTts, fetchTtsAudioBlob } from '../lib/tts-client'

const STORY_META = {
  A: {
    key: 'A',
    title: 'The School of Fish That Forgot It Knew How to Swim',
    subtitle: 'Story A',
    text: STORY_A,
  },
  B: {
    key: 'B',
    title: 'The Porang Whisper',
    subtitle: 'Story B',
    text: STORY_B,
  },
}

function getStoryParagraphs(storyText) {
  return storyText
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .filter((paragraph) => !/^Story\s+[AB]:/i.test(paragraph))
}

export default function Home() {
  const router = useRouter()

  const [step, setStep] = useState('welcome') // welcome | stories | mode | name
  const [inputMode, setInputMode] = useState(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const [activeStoryKey, setActiveStoryKey] = useState('A')
  const [storyAReviewed, setStoryAReviewed] = useState(false)
  const [storyBReviewed, setStoryBReviewed] = useState(false)
  const [storyANotes, setStoryANotes] = useState('')
  const [storyBNotes, setStoryBNotes] = useState('')

  const [speechInputSupported, setSpeechInputSupported] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [playingStoryKey, setPlayingStoryKey] = useState(null)
  const [audioError, setAudioError] = useState('')

  const audioElementRef = useRef(null)
  const playbackIdRef = useRef(0)
  const audioCacheRef = useRef(new Map())

  const stories = useMemo(() => ({
    A: { ...STORY_META.A, paragraphs: getStoryParagraphs(STORY_META.A.text) },
    B: { ...STORY_META.B, paragraphs: getStoryParagraphs(STORY_META.B.text) },
  }), [])

  const storiesReviewed = storyAReviewed && storyBReviewed
  const activeStory = stories[activeStoryKey]
  const activeStoryReviewed = activeStoryKey === 'A' ? storyAReviewed : storyBReviewed
  const activeStoryNotes = activeStoryKey === 'A' ? storyANotes : storyBNotes

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hasSpeechInput = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
    setSpeechInputSupported(hasSpeechInput)
  }, [])

  const stopAudio = useCallback(() => {
    playbackIdRef.current += 1

    const activeAudio = audioElementRef.current
    if (activeAudio) {
      activeAudio.pause()
      activeAudio.currentTime = 0
      activeAudio.onended = null
      activeAudio.onerror = null
      activeAudio.onpause = null
      audioElementRef.current = null
    }

    setIsPlayingAudio(false)
    setPlayingStoryKey(null)
  }, [])

  useEffect(() => {
    return () => {
      stopAudio()
      for (const objectUrl of audioCacheRef.current.values()) {
        URL.revokeObjectURL(objectUrl)
      }
      audioCacheRef.current.clear()
    }
  }, [stopAudio])

  const fetchChunkUrl = useCallback(async (chunk, voicePreset = 'default') => {
    const cacheKey = `${voicePreset}::${chunk}`
    const cached = audioCacheRef.current.get(cacheKey)
    if (cached) return cached

    const blob = await fetchTtsAudioBlob(chunk, { voicePreset })
    const objectUrl = URL.createObjectURL(blob)
    audioCacheRef.current.set(cacheKey, objectUrl)
    return objectUrl
  }, [])

  const playChunkUrl = useCallback((url, playbackId) => {
    return new Promise((resolve, reject) => {
      if (playbackId !== playbackIdRef.current) {
        resolve(false)
        return
      }

      const audio = new Audio(url)
      audioElementRef.current = audio

      let settled = false
      const finish = (result, error = null) => {
        if (settled) return
        settled = true
        audio.onended = null
        audio.onerror = null
        audio.onpause = null
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      }

      audio.onended = () => finish(true)
      audio.onerror = () => finish(false, new Error('Unable to play generated audio.'))
      audio.onpause = () => {
        if (playbackId !== playbackIdRef.current) finish(false)
      }

      audio.play().catch(() => {
        finish(false, new Error('Audio playback was blocked by the browser. Please tap Listen again.'))
      })
    })
  }, [])

  const playText = useCallback(async (text, options = {}) => {
    const storyKey = options.storyKey || null
    const voicePreset = options.voicePreset || 'default'
    stopAudio()
    setAudioError('')

    const playbackId = playbackIdRef.current
    const chunks = splitTextForTts(text)
    if (!chunks.length) return false

    setIsPlayingAudio(true)
    setPlayingStoryKey(storyKey)

    const chunkUrlPromises = new Array(chunks.length)
    const prefetchAhead = 4
    const ensurePrefetch = (index) => {
      if (index < 0 || index >= chunks.length) return
      if (chunkUrlPromises[index]) return
      chunkUrlPromises[index] = fetchChunkUrl(chunks[index], voicePreset)
    }

    try {
      for (let index = 0; index < chunks.length; index += 1) {
        for (let next = index; next <= index + prefetchAhead; next += 1) {
          ensurePrefetch(next)
        }

        if (playbackId !== playbackIdRef.current) return false
        const chunkUrl = await chunkUrlPromises[index]
        const played = await playChunkUrl(chunkUrl, playbackId)
        if (!played) return false
      }

      if (playbackId === playbackIdRef.current) {
        setIsPlayingAudio(false)
        setPlayingStoryKey(null)
      }
      return true
    } catch (error) {
      if (playbackId === playbackIdRef.current) {
        setIsPlayingAudio(false)
        setPlayingStoryKey(null)
        setAudioError(error.message || 'Audio playback failed.')
      }
      return false
    }
  }, [fetchChunkUrl, playChunkUrl, stopAudio])

  async function playStoryAudio(storyKey) {
    const story = stories[storyKey]
    if (!story) return

    const narration = `${story.subtitle}. ${story.title}. ${story.paragraphs.join(' ')}`
    await playText(narration, {
      storyKey,
      voicePreset: storyKey === 'B' ? 'story_b' : 'story_a',
    })
  }

  async function startAssessment() {
    if (!name.trim() || !inputMode) return

    setLoading(true)
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', studentName: name.trim(), inputMode }),
      })

      const data = await response.json()
      if (data.sessionId) {
        router.push(`/assessment?session=${data.sessionId}&mode=${inputMode}`)
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error(error)
      setLoading(false)
    }
  }

  function setActiveStoryNotes(value) {
    if (activeStoryKey === 'A') {
      setStoryANotes(value)
    } else {
      setStoryBNotes(value)
    }
  }

  function setReviewedForActiveStory(checked) {
    if (activeStoryKey === 'A') {
      setStoryAReviewed(checked)
    } else {
      setStoryBReviewed(checked)
    }
  }

  return (
    <>
      <Head>
        <title>Learning Level Readiness Assessment - University of the Nations</title>
        <meta name="description" content="Graduate readiness assessment for the University of the Nations" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-navy-950 relative overflow-hidden flex items-center justify-center px-4 py-10">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)' }}
          />
        </div>

        <div className={`relative z-10 w-full ${step === 'stories' ? 'max-w-5xl' : 'max-w-lg'}`}>
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #1a2847, #0f1b35)',
              border: '1px solid rgba(201,168,76,0.2)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(201,168,76,0.1)',
            }}
          >
            <div className="px-8 pt-10 pb-6 text-center" style={{ borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
              <div className="flex justify-center mb-5">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.2)' }}
                >
                  <img
                    src="/uofn-logo.png"
                    alt="University of the Nations"
                    className="w-16 h-16 object-contain"
                    style={{ filter: 'invert(1) sepia(1) saturate(0.5) hue-rotate(10deg)' }}
                  />
                </div>
              </div>
              <p className="text-gold-400 text-xs font-mono tracking-widest uppercase mb-2">University of the Nations - YWAM</p>
              <h1 className="font-display text-2xl text-parchment-100 leading-tight">
                Learning Level
                <br />
                Readiness Assessment
              </h1>
            </div>

            <div className="px-8 py-8">
              {step === 'welcome' && (
                <div className="message-enter text-center">
                  <p className="font-body text-parchment-100 text-lg leading-relaxed mb-6">
                    Before the test, you will prepare by studying two stories carefully.
                  </p>

                  <div
                    className="mb-6 p-4 rounded-xl text-left"
                    style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)' }}
                  >
                    <p className="text-gold-400 text-sm font-mono mb-2">ASSESSMENT PROCESS</p>
                    <ul className="space-y-2">
                      <li className="text-parchment-100 text-sm">1. Study both stories first. Every question in the test is based on these stories.</li>
                      <li className="text-parchment-100 text-sm">2. You can read the stories and listen to them as many times as needed.</li>
                      <li className="text-parchment-100 text-sm">3. You can take personal notes while preparing.</li>
                      <li className="text-parchment-100 text-sm">4. During the assessment, you can listen to each question and answer by voice or text.</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => setStep('stories')}
                    className="w-full py-4 rounded-xl font-body text-lg font-semibold transition-all duration-200 hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #c9a84c, #a8872e)', color: '#060d1f' }}
                  >
                    Start Story Preparation
                  </button>
                </div>
              )}

              {step === 'stories' && (
                <div className="message-enter">
                  <div className="mb-5 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.18)' }}>
                    <p className="text-parchment-100 text-base font-semibold mb-1">Study room</p>
                    <p className="text-parchment-200 text-sm">
                      Read and listen carefully. You can replay each story as many times as needed. Mark both stories as reviewed to continue.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {['A', 'B'].map((key) => {
                      const isActive = activeStoryKey === key
                      const isReviewed = key === 'A' ? storyAReviewed : storyBReviewed
                      const story = stories[key]

                      return (
                        <button
                          key={key}
                          onClick={() => {
                            stopAudio()
                            setActiveStoryKey(key)
                          }}
                          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                          style={{
                            background: isActive ? 'rgba(201,168,76,0.16)' : 'rgba(255,255,255,0.05)',
                            border: isActive ? '1px solid rgba(201,168,76,0.45)' : '1px solid rgba(255,255,255,0.12)',
                            color: isActive ? '#e8cc7a' : '#f5f0e6',
                          }}
                        >
                          {story.subtitle} {isReviewed ? '(Reviewed)' : ''}
                        </button>
                      )
                    })}
                  </div>

                  <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.18)' }}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                      <div>
                        <p className="text-gold-400 text-xs font-mono tracking-wide uppercase">{activeStory.subtitle}</p>
                        <h2 className="text-parchment-100 font-display text-2xl leading-snug">{activeStory.title}</h2>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => playStoryAudio(activeStoryKey)}
                          disabled={isPlayingAudio && playingStoryKey === activeStoryKey}
                          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-45"
                          style={{ background: 'linear-gradient(135deg, #c9a84c, #a8872e)', color: '#060d1f' }}
                        >
                          {isPlayingAudio && playingStoryKey === activeStoryKey ? 'Playing...' : 'Listen'}
                        </button>
                        <button
                          onClick={stopAudio}
                          disabled={!isPlayingAudio}
                          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-45"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#f5f0e6' }}
                        >
                          Stop
                        </button>
                      </div>
                    </div>

                    {audioError && (
                      <div className="mb-4 p-3 rounded-lg text-sm text-gold-300" style={{ background: 'rgba(201,168,76,0.09)', border: '1px solid rgba(201,168,76,0.25)' }}>
                        {audioError}
                      </div>
                    )}

                    <article
                      className="rounded-lg p-5 max-h-[360px] overflow-y-auto"
                      style={{ background: 'rgba(7,13,31,0.55)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <div className="space-y-5">
                        {activeStory.paragraphs.map((paragraph, index) => (
                          <p key={`${activeStory.key}-${index}`} className="text-[15px] leading-8 text-parchment-100">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </article>

                    <div className="mt-4">
                      <label className="block text-parchment-200 text-sm mb-2">Optional notes for {activeStory.subtitle}</label>
                      <textarea
                        value={activeStoryNotes}
                        onChange={(e) => setActiveStoryNotes(e.target.value)}
                        rows={3}
                        placeholder="Write your notes here..."
                        className="w-full px-3 py-2 rounded-lg text-sm bg-transparent text-parchment-100 placeholder-navy-600 focus:outline-none resize-y"
                        style={{ border: '1px solid rgba(201,168,76,0.2)', background: 'rgba(255,255,255,0.03)' }}
                      />
                    </div>

                    <label className="mt-4 flex items-start gap-2 text-sm text-parchment-100">
                      <input
                        type="checkbox"
                        checked={activeStoryReviewed}
                        onChange={(e) => setReviewedForActiveStory(e.target.checked)}
                        className="mt-1"
                      />
                      I have carefully studied this story and I am ready to be assessed on it.
                    </label>
                  </div>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-lg px-3 py-2 text-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: '#f5f0e6' }}>
                      Story A status: {storyAReviewed ? 'Reviewed' : 'Not reviewed yet'}
                    </div>
                    <div className="rounded-lg px-3 py-2 text-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: '#f5f0e6' }}>
                      Story B status: {storyBReviewed ? 'Reviewed' : 'Not reviewed yet'}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    <button
                      onClick={() => {
                        stopAudio()
                        setStep('welcome')
                      }}
                      className="sm:w-auto w-full px-5 py-3 rounded-xl text-sm font-semibold"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#d5dbe7' }}
                    >
                      Back
                    </button>

                    <button
                      onClick={() => {
                        stopAudio()
                        setStep('mode')
                      }}
                      disabled={!storiesReviewed}
                      className="flex-1 py-3 rounded-xl font-body text-base font-semibold transition-all duration-200 disabled:opacity-40 hover:brightness-110"
                      style={{ background: 'linear-gradient(135deg, #c9a84c, #a8872e)', color: '#060d1f' }}
                    >
                      Continue to Response Mode
                    </button>
                  </div>
                </div>
              )}

              {step === 'mode' && (
                <div className="message-enter">
                  <p className="font-display text-parchment-100 text-xl text-center mb-2">Choose your default answer mode</p>
                  <p className="text-parchment-200 text-center text-sm mb-6">
                    Questions can be listened to during the test. You can answer by voice or text and switch modes later.
                  </p>

                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        if (!speechInputSupported) return
                        setInputMode('audio')
                        setStep('name')
                      }}
                      disabled={!speechInputSupported}
                      className="w-full p-4 rounded-xl text-left transition-all duration-200 disabled:opacity-35"
                      style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)' }}
                    >
                      <p className="text-gold-300 font-semibold font-body text-lg">Speak my answers</p>
                      <p className="text-parchment-200 text-sm">Use the microphone to answer.</p>
                    </button>

                    <button
                      onClick={() => {
                        setInputMode('text')
                        setStep('name')
                      }}
                      className="w-full p-4 rounded-xl text-left transition-all duration-200"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <p className="text-parchment-100 font-semibold font-body text-lg">Type my answers</p>
                      <p className="text-parchment-200 text-sm">Use the keyboard to answer.</p>
                    </button>
                  </div>

                  {!speechInputSupported && (
                    <p className="mt-4 text-sm text-gold-400 text-center">
                      Voice input is not available in this browser. You can continue in text mode.
                    </p>
                  )}

                  <button
                    onClick={() => setStep('stories')}
                    className="mt-5 w-full py-3 rounded-xl font-body text-sm font-semibold"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#d5dbe7' }}
                  >
                    Back to Story Preparation
                  </button>
                </div>
              )}

              {step === 'name' && (
                <div className="message-enter">
                  <p className="font-display text-parchment-100 text-xl text-center mb-6">What is your name?</p>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && name.trim() && startAssessment()}
                    placeholder="Enter your full name"
                    className="w-full px-5 py-4 rounded-xl font-body text-lg bg-transparent text-parchment-100 placeholder-navy-600 focus:outline-none transition-all"
                    style={{ border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(255,255,255,0.03)' }}
                    autoFocus
                  />

                  <button
                    onClick={startAssessment}
                    disabled={!name.trim() || loading}
                    className="mt-4 w-full py-4 rounded-xl font-body text-lg font-semibold transition-all duration-200 disabled:opacity-40 hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #c9a84c, #a8872e)', color: '#060d1f' }}
                  >
                    {loading ? 'Starting...' : 'Begin Assessment ->'}
                  </button>

                  <button
                    onClick={() => setStep('mode')}
                    className="mt-3 w-full py-3 rounded-xl font-body text-sm font-semibold"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#d5dbe7' }}
                  >
                    Back to Response Mode
                  </button>
                </div>
              )}
            </div>

            <div className="px-8 pb-6 text-center">
              <p className="text-navy-600 text-xs font-mono">30 questions · ~40 minutes · Results reviewed by human administrator</p>
              <button onClick={() => router.push('/admin')} className="mt-3 text-xs text-navy-600 hover:text-gold-500 transition-colors font-mono">
                Administrator login {'->'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
