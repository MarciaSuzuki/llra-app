import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { STORY_A, STORY_B } from '../lib/data'

const STORY_META = {
  A: {
    title: 'Story A: "The School of Fish That Forgot It Knew How to Swim"',
    intro: 'Now listening to Story A. The School of Fish That Forgot It Knew How to Swim.',
    text: STORY_A,
  },
  B: {
    title: 'Story B: "The Porang Whisper"',
    intro: 'Now listening to Story B. The Porang Whisper.',
    text: STORY_B,
  },
}

function buildSpeechChunks(text, maxLength = 220) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return []

  const sentenceParts = normalized.match(/[^.!?]+[.!?]*/g) || [normalized]
  const chunks = []
  let current = ''

  for (const part of sentenceParts) {
    const sentence = part.trim()
    if (!sentence) continue

    if ((current + ' ' + sentence).trim().length <= maxLength) {
      current = (current + ' ' + sentence).trim()
      continue
    }

    if (current) chunks.push(current)

    if (sentence.length <= maxLength) {
      current = sentence
      continue
    }

    const words = sentence.split(' ')
    let longChunk = ''

    for (const word of words) {
      if ((longChunk + ' ' + word).trim().length <= maxLength) {
        longChunk = (longChunk + ' ' + word).trim()
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

export default function Home() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [inputMode, setInputMode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('welcome') // welcome | stories | mode | name

  const [storyAReviewed, setStoryAReviewed] = useState(false)
  const [storyBReviewed, setStoryBReviewed] = useState(false)
  const [storyANotes, setStoryANotes] = useState('')
  const [storyBNotes, setStoryBNotes] = useState('')

  const [speechOutputSupported, setSpeechOutputSupported] = useState(false)
  const [speechInputSupported, setSpeechInputSupported] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [playingStory, setPlayingStory] = useState(null)

  const synthRef = useRef(null)

  const storiesReviewed = storyAReviewed && storyBReviewed

  useEffect(() => {
    if (typeof window === 'undefined') return

    const hasSpeechOutput = 'speechSynthesis' in window
    const hasSpeechInput = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window

    setSpeechOutputSupported(hasSpeechOutput)
    setSpeechInputSupported(hasSpeechInput)

    if (hasSpeechOutput) synthRef.current = window.speechSynthesis
  }, [])

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel()
    setIsSpeaking(false)
    setPlayingStory(null)
  }, [])

  useEffect(() => {
    return () => stopSpeaking()
  }, [stopSpeaking])

  const speakText = useCallback((text, storyKey = null) => {
    if (!synthRef.current) return

    stopSpeaking()

    const chunks = buildSpeechChunks(text)
    if (!chunks.length) return

    setIsSpeaking(true)
    setPlayingStory(storyKey)

    let i = 0
    const speakNext = () => {
      const chunk = chunks[i]
      if (!chunk) {
        setIsSpeaking(false)
        setPlayingStory(null)
        return
      }

      const utterance = new SpeechSynthesisUtterance(chunk)
      utterance.rate = 0.95
      utterance.pitch = 1.0
      utterance.volume = 1.0

      const voices = synthRef.current.getVoices()
      const preferredVoice = voices.find((voice) =>
        voice.name.includes('Samantha') ||
        voice.name.includes('Google US English') ||
        voice.name.includes('Karen') ||
        voice.name.includes('Daniel') ||
        voice.lang === 'en-US'
      )
      if (preferredVoice) utterance.voice = preferredVoice

      utterance.onend = () => {
        i += 1
        speakNext()
      }

      utterance.onerror = () => {
        setIsSpeaking(false)
        setPlayingStory(null)
      }

      synthRef.current.speak(utterance)
    }

    speakNext()
  }, [stopSpeaking])

  function playStory(storyKey) {
    const story = STORY_META[storyKey]
    if (!story) return
    speakText(`${story.intro} ${story.text}`, storyKey)
  }

  async function startAssessment() {
    if (!name.trim() || !inputMode) return

    setLoading(true)
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', studentName: name.trim(), inputMode }),
      })

      const data = await res.json()
      if (data.sessionId) {
        router.push(`/assessment?session=${data.sessionId}&mode=${inputMode}`)
      } else {
        setLoading(false)
      }
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const storyCards = [
    {
      key: 'A',
      reviewed: storyAReviewed,
      setReviewed: setStoryAReviewed,
      notes: storyANotes,
      setNotes: setStoryANotes,
    },
    {
      key: 'B',
      reviewed: storyBReviewed,
      setReviewed: setStoryBReviewed,
      notes: storyBNotes,
      setNotes: setStoryBNotes,
    },
  ]

  return (
    <>
      <Head>
        <title>Learning Level Readiness Assessment - University of the Nations</title>
        <meta name="description" content="Graduate readiness assessment for the University of the Nations" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-navy-950 relative overflow-hidden flex items-center justify-center px-4 py-12">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)' }}
          />
        </div>

        <div className={`relative z-10 w-full ${step === 'stories' ? 'max-w-6xl' : 'max-w-lg'}`}>
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
                    This assessment measures how well you understood and can apply two stories.
                  </p>
                  <div
                    className="mb-6 p-4 rounded-xl text-left"
                    style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)' }}
                  >
                    <p className="text-gold-400 text-sm font-mono mb-2">IMPORTANT - HOW THIS WORKS</p>
                    <ul className="space-y-2">
                      <li className="text-parchment-100 text-sm">1. You must carefully study both stories first.</li>
                      <li className="text-parchment-100 text-sm">2. Every assessment question is based on these two stories.</li>
                      <li className="text-parchment-100 text-sm">3. You may listen to each story as many times as you need.</li>
                      <li className="text-parchment-100 text-sm">4. You may read the stories and take notes before starting.</li>
                      <li className="text-parchment-100 text-sm">5. During the test, questions can be listened to and answered by voice or text.</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => setStep('stories')}
                    className="w-full py-4 rounded-xl font-body text-lg font-semibold transition-all duration-200 hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #c9a84c, #a8872e)', color: '#060d1f' }}
                  >
                    Open Story Study Room
                  </button>
                </div>
              )}

              {step === 'stories' && (
                <div className="message-enter">
                  <div className="mb-5 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.18)' }}>
                    <p className="text-parchment-100 text-base font-semibold mb-1">Study both stories before the test</p>
                    <p className="text-parchment-200 text-sm">
                      Read each story carefully, listen as many times as needed, and write notes if helpful. You can only continue after marking both stories as reviewed.
                    </p>
                    {!speechOutputSupported && (
                      <p className="mt-3 text-sm text-gold-400">
                        Story audio playback is not available in this browser. Use Chrome, Edge, or Safari for full audio support.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {storyCards.map((card) => {
                      const story = STORY_META[card.key]
                      const isCurrentStoryPlaying = isSpeaking && playingStory === card.key

                      return (
                        <div
                          key={card.key}
                          className="rounded-xl p-4"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.18)' }}
                        >
                          <h2 className="text-parchment-100 font-display text-lg leading-snug mb-3">{story.title}</h2>

                          <div className="flex gap-2 mb-3">
                            <button
                              onClick={() => playStory(card.key)}
                              disabled={!speechOutputSupported}
                              className="px-3 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-35"
                              style={{ background: 'linear-gradient(135deg, #c9a84c, #a8872e)', color: '#060d1f' }}
                            >
                              {isCurrentStoryPlaying ? 'Listening...' : 'Listen to Story'}
                            </button>

                            <button
                              onClick={stopSpeaking}
                              disabled={!isCurrentStoryPlaying}
                              className="px-3 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-35"
                              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#f5f0e6' }}
                            >
                              Stop
                            </button>
                          </div>

                          <div
                            className="rounded-lg p-3 mb-3 max-h-56 overflow-y-auto text-sm leading-relaxed text-parchment-100"
                            style={{ background: 'rgba(7, 13, 31, 0.55)', border: '1px solid rgba(255,255,255,0.08)' }}
                          >
                            {story.text}
                          </div>

                          <textarea
                            value={card.notes}
                            onChange={(e) => card.setNotes(e.target.value)}
                            rows={3}
                            placeholder="Optional notes for this story..."
                            className="w-full px-3 py-2 mb-3 rounded-lg text-sm bg-transparent text-parchment-100 placeholder-navy-600 focus:outline-none resize-y"
                            style={{ border: '1px solid rgba(201,168,76,0.2)', background: 'rgba(255,255,255,0.03)' }}
                          />

                          <label className="flex items-start gap-2 text-sm text-parchment-100">
                            <input
                              type="checkbox"
                              checked={card.reviewed}
                              onChange={(e) => card.setReviewed(e.target.checked)}
                              className="mt-1"
                            />
                            I have carefully studied this story and I am ready for questions based on it.
                          </label>
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    <button
                      onClick={() => setStep('welcome')}
                      className="sm:w-auto w-full px-5 py-3 rounded-xl text-sm font-semibold"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#d5dbe7' }}
                    >
                      Back
                    </button>
                    <button
                      onClick={() => {
                        stopSpeaking()
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
                    Every question can be listened to. You can answer by voice or text, and switch during the assessment.
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
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(201,168,76,0.15)' }}>
                          <svg className="w-6 h-6 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-gold-300 font-semibold font-body text-lg">Speak my answers</p>
                          <p className="text-parchment-200 text-sm">Use microphone input for answers.</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setInputMode('text')
                        setStep('name')
                      }}
                      className="w-full p-4 rounded-xl text-left transition-all duration-200"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <svg className="w-6 h-6 text-parchment-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-parchment-100 font-semibold font-body text-lg">Type my answers</p>
                          <p className="text-parchment-200 text-sm">Use keyboard input for answers.</p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {!speechInputSupported && (
                    <p className="mt-4 text-sm text-gold-400 text-center">
                      Voice answering is not available in this browser. You can continue in text mode.
                    </p>
                  )}

                  <button
                    onClick={() => setStep('stories')}
                    className="mt-5 w-full py-3 rounded-xl font-body text-sm font-semibold"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#d5dbe7' }}
                  >
                    Back to Story Study Room
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
