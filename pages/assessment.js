import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { getAllQuestions } from '../lib/data'
import { DEFAULT_LANGUAGE, SPEECH_RECOGNITION_LOCALES, getSupportedLanguage, getUiText } from '../lib/i18n'
import { fetchTtsAudioBlob, splitTextForTts } from '../lib/tts-client'

function getLevelForIndex(index) {
  if (index < 10) return 'remember'
  if (index < 20) return 'understand'
  return 'apply'
}

export default function Assessment() {
  const router = useRouter()
  const { session: sessionId, mode: initialMode } = router.query

  const [language, setLanguage] = useState(DEFAULT_LANGUAGE)
  const [languageReady, setLanguageReady] = useState(false)
  const [inputMode, setInputMode] = useState(initialMode || 'text')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState('intro')
  const [messages, setMessages] = useState([])
  const [userInput, setUserInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [speechInputSupported, setSpeechInputSupported] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [summaryData, setSummaryData] = useState(null)
  const [currentQuestionText, setCurrentQuestionText] = useState('')
  const [autoReadQuestions, setAutoReadQuestions] = useState(true)
  const [audioError, setAudioError] = useState('')

  const recognitionRef = useRef(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const audioElementRef = useRef(null)
  const playbackIdRef = useRef(0)
  const audioCacheRef = useRef(new Map())

  const introStartedRef = useRef(false)
  const questionPromptedRef = useRef('')

  const text = getUiText(language)
  const assessmentText = text.assessment
  const questions = useMemo(() => getAllQuestions(language), [language])
  const levelIntros = assessmentText.levelIntros

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, phase])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hasRecog = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
    setSpeechInputSupported(hasRecog)
  }, [])

  useEffect(() => {
    if (!router.isReady || typeof window === 'undefined') return

    const queryLanguage = Array.isArray(router.query.lang) ? router.query.lang[0] : router.query.lang
    const storedLanguage = window.localStorage.getItem('gra-language')
    const nextLanguage = getSupportedLanguage(queryLanguage || storedLanguage || DEFAULT_LANGUAGE)

    setLanguage(nextLanguage)
    setLanguageReady(true)
  }, [router.isReady, router.query.lang])

  useEffect(() => {
    if (!router.isReady || typeof window === 'undefined' || !languageReady) return

    window.localStorage.setItem('gra-language', language)

    const queryLanguage = Array.isArray(router.query.lang) ? router.query.lang[0] : router.query.lang
    if (queryLanguage !== language) {
      router.replace(
        {
          pathname: router.pathname,
          query: { ...router.query, lang: language },
        },
        undefined,
        { shallow: true }
      )
    }
  }, [language, languageReady, router])

  useEffect(() => {
    if (!initialMode) return
    if (initialMode === 'audio' && !speechInputSupported) {
      setInputMode('text')
      return
    }
    setInputMode(initialMode)
  }, [initialMode, speechInputSupported])

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
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  useEffect(() => {
    return () => {
      stopAudio()
      stopListening()
      for (const objectUrl of audioCacheRef.current.values()) {
        URL.revokeObjectURL(objectUrl)
      }
      audioCacheRef.current.clear()
    }
  }, [stopAudio, stopListening])

  const fetchChunkUrl = useCallback(async (chunk, voicePreset = 'question') => {
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

  const playText = useCallback(async (narrationText, options = {}) => {
    const voicePreset = options.voicePreset || 'question'
    stopAudio()
    setAudioError('')

    const playbackId = playbackIdRef.current
    const chunks = splitTextForTts(narrationText)
    if (!chunks.length) return false

    setIsPlayingAudio(true)

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
      }
      return true
    } catch (error) {
      if (playbackId === playbackIdRef.current) {
        setIsPlayingAudio(false)
        setAudioError(error.message || 'Audio playback failed.')
      }
      return false
    }
  }, [fetchChunkUrl, playChunkUrl, stopAudio])

  const addMessage = useCallback((role, content) => {
    setMessages((previous) => [...previous, { role, content, id: Date.now() + Math.random() }])
  }, [])

  const replayCurrentQuestion = useCallback(async () => {
    if (!currentQuestionText) return
    await playText(currentQuestionText, { voicePreset: 'question' })
  }, [currentQuestionText, playText])

  const startListening = useCallback(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRec) return

    const recognition = new SpeechRec()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = SPEECH_RECOGNITION_LOCALES[language] || SPEECH_RECOGNITION_LOCALES.en
    recognitionRef.current = recognition

    recognition.onstart = () => setIsListening(true)
    recognition.onresult = (event) => {
      const raw = Array.from(event.results).map((result) => result[0].transcript).join('')
      setTranscript(raw)
      setUserInput(raw)
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognition.start()
  }, [language])

  useEffect(() => {
    if (!sessionId || phase !== 'intro' || introStartedRef.current || !languageReady) return

    introStartedRef.current = true

    let cancelled = false

    const runIntro = async () => {
      addMessage('agent', assessmentText.intro)
      if (autoReadQuestions) {
        await playText(assessmentText.intro)
      }
      if (!cancelled) {
        setPhase('question')
      }
    }

    runIntro()

    return () => {
      cancelled = true
    }
  }, [sessionId, phase, languageReady, addMessage, assessmentText.intro, autoReadQuestions, playText])

  useEffect(() => {
    if (phase !== 'question' || !sessionId || !languageReady) return

    const cycleKey = `${sessionId}:${currentIndex}:${language}`
    if (questionPromptedRef.current === cycleKey) return
    questionPromptedRef.current = cycleKey

    let cancelled = false

    const runQuestionStep = async () => {
      const question = questions[currentIndex]
      if (!question) return

      const previousLevel = currentIndex > 0 ? getLevelForIndex(currentIndex - 1) : null
      const currentLevel = getLevelForIndex(currentIndex)

      if (previousLevel !== currentLevel && currentIndex > 0) {
        const transition = assessmentText.moveToLevel(levelIntros[currentLevel].title, levelIntros[currentLevel].desc)
        addMessage('level', transition)
        if (autoReadQuestions) {
          await playText(transition)
          if (cancelled) return
        }
      }

      const questionText = `${assessmentText.questionPrefix(currentIndex + 1, questions.length)}${question.text}`
      setCurrentQuestionText(questionText)
      addMessage('question', questionText)

      if (autoReadQuestions) {
        await playText(questionText)
      } else {
        inputRef.current?.focus()
      }
    }

    runQuestionStep()

    return () => {
      cancelled = true
    }
  }, [phase, sessionId, currentIndex, language, languageReady, questions, addMessage, assessmentText, levelIntros, autoReadQuestions, playText])

  async function finishAssessment() {
    setPhase('thinking')

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', sessionId, language }),
      })
      const data = await response.json()

      setSummaryData(data)
      addMessage('agent', data.studentSummary)
      if (autoReadQuestions) {
        await playText(data.studentSummary)
      }
    } catch {
      addMessage('agent', assessmentText.finishFallback)
      if (autoReadQuestions) {
        await playText(assessmentText.finishFallback)
      }
    }

    setPhase('complete')
  }

  async function submitAnswer(answerText) {
    const textInput = answerText ?? userInput
    if (!textInput.trim() && textInput !== '') return

    const question = questions[currentIndex]
    stopAudio()
    stopListening()

    addMessage('student', textInput || '(no response)')
    setUserInput('')
    setTranscript('')
    setPhase('thinking')

    let evaluation
    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionId: question.id,
          questionText: question.text,
          expectedElements: question.expectedElements,
          studentResponse: textInput,
          language,
        }),
      })
      evaluation = await response.json()
    } catch {
      evaluation = { score: 0, studentFeedback: assessmentText.thankYouAnswer }
    }

    const isLast = currentIndex >= questions.length - 1

    let agentText = evaluation.studentFeedback || assessmentText.thankYouAnswer
    if (isLast) {
      agentText += assessmentText.finalQuestionDone
    } else {
      agentText += assessmentText.continueNext
    }

    addMessage('agent', agentText)
    setPhase('feedback')

    if (autoReadQuestions) {
      await playText(agentText)
    }

    if (isLast) {
      await finishAssessment()
      return
    }

    setCurrentIndex((index) => index + 1)
    setPhase('question')
  }

  const progress = Math.round((currentIndex / questions.length) * 100)
  const languageLabel = language === 'pt' ? 'Português' : 'English'

  return (
    <>
      <Head>
        <title>{text.appName} - University of the Nations</title>
      </Head>

      <div className="min-h-screen bg-navy-950 flex flex-col">
        <header
          className="flex-shrink-0 px-4 py-3 flex items-center justify-between"
          style={{
            borderBottom: '1px solid rgba(201,168,76,0.1)',
            background: 'rgba(15,27,53,0.95)',
            backdropFilter: 'blur(10px)',
            position: 'sticky',
            top: 0,
            zIndex: 40,
          }}
        >
          <div className="flex items-center gap-3">
            <img src="/uofn-logo.png" alt="UofN" className="w-7 h-7 object-contain" style={{ filter: 'invert(1) sepia(1) saturate(0.5)' }} />
            <div className="hidden sm:block">
              <span className="text-gold-400 font-mono text-xs block">{text.appNameShort} · University of the Nations</span>
              <span className="text-navy-600 font-mono text-[10px] uppercase tracking-widest">{text.languageLabel}: {languageLabel}</span>
            </div>
          </div>

          <div className="flex-1 mx-6 max-w-xs">
            <div className="flex justify-between text-xs text-navy-600 font-mono mb-1">
              <span>{phase !== 'complete' ? assessmentText.questionCounter(currentIndex + 1, questions.length) : assessmentText.complete}</span>
              <span>{phase === 'complete' ? 100 : progress}%</span>
            </div>
            <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div
                className="h-1 rounded-full progress-fill"
                style={{
                  width: `${phase === 'complete' ? 100 : progress}%`,
                  background: 'linear-gradient(90deg, #c9a84c, #e8cc7a)',
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isPlayingAudio && (
              <div className="wave-bars mr-1">
                {[...Array(7)].map((_, index) => (
                  <div key={index} className="wave-bar" />
                ))}
              </div>
            )}

            {speechInputSupported && (
              <button
                onClick={() => {
                  stopAudio()
                  stopListening()
                  setInputMode((mode) => (mode === 'audio' ? 'text' : 'audio'))
                }}
                title={inputMode === 'audio' ? assessmentText.switchToTextMode : assessmentText.switchToVoiceMode}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{
                  background: inputMode === 'audio' ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)',
                  border: inputMode === 'audio' ? '1px solid rgba(201,168,76,0.4)' : '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {inputMode === 'audio' ? (
                  <svg className="w-4 h-4 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-parchment-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-2xl w-full mx-auto">
          {messages.map((message) => (
            <div key={message.id} className="message-enter">
              {message.role === 'level' && (
                <div className="text-center my-2">
                  <span
                    className="px-3 py-1 rounded-full text-xs font-mono text-gold-400"
                    style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}
                  >
                    {message.content}
                  </span>
                </div>
              )}

              {message.role === 'agent' && (
                <div className="flex gap-3 items-start">
                  <div
                    className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                    style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }}
                  >
                    <img src="/uofn-logo.png" alt="" className="w-5 h-5 object-contain" style={{ filter: 'invert(1) sepia(1) saturate(0.4)' }} />
                  </div>
                  <div
                    className="flex-1 px-4 py-3 rounded-2xl rounded-tl-sm font-body text-base leading-relaxed text-parchment-100"
                    style={{ background: 'rgba(26,40,71,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {message.content}
                  </div>
                </div>
              )}

              {message.role === 'question' && (
                <div className="flex gap-3 items-start">
                  <div
                    className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                    style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }}
                  >
                    <img src="/uofn-logo.png" alt="" className="w-5 h-5 object-contain" style={{ filter: 'invert(1) sepia(1) saturate(0.4)' }} />
                  </div>
                  <div
                    className="flex-1 px-4 py-3 rounded-2xl rounded-tl-sm font-body text-base leading-relaxed"
                    style={{ background: 'rgba(26,40,71,0.8)', border: '1px solid rgba(201,168,76,0.2)', color: '#f5f0e6' }}
                  >
                    {message.content}
                  </div>
                </div>
              )}

              {message.role === 'student' && (
                <div className="flex justify-end">
                  <div
                    className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tr-sm font-body text-base leading-relaxed text-navy-950"
                    style={{ background: 'linear-gradient(135deg, #d4aa4a, #c9a84c)' }}
                  >
                    {message.content}
                  </div>
                </div>
              )}
            </div>
          ))}

          {phase === 'thinking' && (
            <div className="flex gap-3 items-start message-enter">
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }}>
                <img src="/uofn-logo.png" alt="" className="w-5 h-5 object-contain" style={{ filter: 'invert(1) sepia(1) saturate(0.4)' }} />
              </div>
              <div className="px-4 py-4 rounded-2xl rounded-tl-sm flex gap-2 items-center" style={{ background: 'rgba(26,40,71,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="thinking-dot" />
                <div className="thinking-dot" />
                <div className="thinking-dot" />
              </div>
            </div>
          )}

          {phase === 'complete' && summaryData && (
            <div className="message-enter mt-4 p-5 rounded-2xl text-center" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)' }}>
              <p className="text-gold-400 font-mono text-xs mb-3">{assessmentText.assessmentComplete}</p>
              {summaryData.stats && (
                <div className="flex justify-center gap-4 mb-4">
                  {Object.entries(summaryData.stats.byLevel).map(([level, data]) => (
                    <div key={level} className="text-center">
                      <p className="text-parchment-100 font-display text-xl">
                        {data.score}
                        <span className="text-navy-600 text-sm">/{data.max}</span>
                      </p>
                      <p className="text-parchment-200 text-xs capitalize">{text.levels[level]}</p>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-parchment-200 text-sm">{assessmentText.resultsReviewed}</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {phase !== 'complete' && (
          <div className="flex-shrink-0 px-4 pb-6 pt-3 max-w-2xl w-full mx-auto" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {currentQuestionText && (
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  onClick={replayCurrentQuestion}
                  disabled={phase === 'thinking'}
                  className="px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-30"
                  style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', color: '#e8cc7a' }}
                >
                  {assessmentText.listenCurrentQuestion}
                </button>

                <button
                  onClick={() => setAutoReadQuestions((enabled) => !enabled)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#f5f0e6' }}
                >
                  {autoReadQuestions ? assessmentText.autoReadOn : assessmentText.autoReadOff}
                </button>
              </div>
            )}

            {audioError && (
              <div className="mb-3 p-3 rounded-lg text-sm text-gold-300" style={{ background: 'rgba(201,168,76,0.09)', border: '1px solid rgba(201,168,76,0.25)' }}>
                {audioError}
              </div>
            )}

            {inputMode === 'audio' && speechInputSupported ? (
              <div className="flex flex-col items-center gap-3">
                {isListening && (
                  <div className="wave-bars">
                    {[...Array(7)].map((_, index) => (
                      <div key={index} className="wave-bar" />
                    ))}
                  </div>
                )}

                {transcript && (
                  <div className="w-full px-4 py-2 rounded-xl text-sm text-parchment-200 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {transcript}
                  </div>
                )}

                <div className="flex gap-3 items-center">
                  {!isListening ? (
                    <button
                      onClick={startListening}
                      disabled={phase === 'thinking' || isPlayingAudio}
                      className="w-16 h-16 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                      style={{ background: 'linear-gradient(135deg, #c9a84c, #a8872e)', boxShadow: '0 4px 20px rgba(201,168,76,0.3)' }}
                    >
                      <svg className="w-7 h-7 text-navy-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={stopListening}
                      className="w-16 h-16 rounded-full flex items-center justify-center mic-pulse"
                      style={{ background: '#dc2626', boxShadow: '0 4px 20px rgba(220,38,38,0.4)' }}
                    >
                      <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </svg>
                    </button>
                  )}

                  {transcript && !isListening && (
                    <button
                      onClick={() => submitAnswer(transcript)}
                      disabled={phase === 'thinking'}
                      className="px-5 py-3 rounded-xl font-body text-sm font-semibold transition-all disabled:opacity-30 hover:brightness-110"
                      style={{ background: 'linear-gradient(135deg, #c9a84c, #a8872e)', color: '#060d1f' }}
                    >
                      {assessmentText.submitAnswer}
                    </button>
                  )}

                  {!isListening && !transcript && phase === 'question' && (
                    <button
                      onClick={() => submitAnswer('')}
                      className="px-4 py-2 rounded-lg text-xs font-mono text-navy-600 hover:text-parchment-200 transition-colors"
                      style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      {assessmentText.skip}
                    </button>
                  )}
                </div>

                <p className="text-navy-600 text-xs font-mono">
                  {isListening ? assessmentText.listeningNow : isPlayingAudio ? assessmentText.waitForAudio : assessmentText.tapMic}
                </p>
              </div>
            ) : (
              <>
                {inputMode === 'audio' && !speechInputSupported && (
                  <p className="mb-2 text-gold-400 text-xs font-mono">{assessmentText.voiceUnavailableSwitched}</p>
                )}

                <div className="flex gap-2">
                  <textarea
                    ref={inputRef}
                    value={userInput}
                    onChange={(event) => setUserInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        if (phase === 'question' || phase === 'feedback') submitAnswer()
                      }
                    }}
                    placeholder={assessmentText.typeAnswerPlaceholder}
                    disabled={phase === 'thinking'}
                    rows={2}
                    className="flex-1 px-4 py-3 rounded-xl font-body text-base bg-transparent text-parchment-100 placeholder-navy-600 focus:outline-none resize-none disabled:opacity-40 transition-all"
                    style={{ border: '1px solid rgba(201,168,76,0.2)', background: 'rgba(255,255,255,0.03)' }}
                  />

                  <button
                    onClick={() => submitAnswer()}
                    disabled={phase === 'thinking' || !userInput.trim()}
                    className="px-4 py-3 rounded-xl flex-shrink-0 transition-all disabled:opacity-30 hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #c9a84c, #a8872e)', color: '#060d1f' }}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}
