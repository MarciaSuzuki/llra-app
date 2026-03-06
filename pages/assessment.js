import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { ALL_QUESTIONS } from '../lib/data'

const LEVEL_INTROS = {
  remember: {
    title: 'Level 1 — Remember',
    desc: 'Questions about what happened in Story A.',
    badge: 'bg-blue-900/30 text-blue-300 border-blue-500/30',
  },
  understand: {
    title: 'Level 2 — Understand',
    desc: 'Questions about meaning and interpretation in Story A.',
    badge: 'bg-purple-900/30 text-purple-300 border-purple-500/30',
  },
  apply: {
    title: 'Level 3 — Apply',
    desc: 'Questions connecting both stories.',
    badge: 'bg-gold-500/10 text-gold-300 border-gold-500/30',
  },
}

function getLevelForIndex(index) {
  if (index < 10) return 'remember'
  if (index < 20) return 'understand'
  return 'apply'
}

export default function Assessment() {
  const router = useRouter()
  const { session: sessionId, mode: initialMode } = router.query

  // ── State ──────────────────────────────────────────────────────────────────
  const [inputMode, setInputMode] = useState(initialMode || 'text')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState('intro') // intro | question | thinking | feedback | complete
  const [messages, setMessages] = useState([])
  const [userInput, setUserInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechOutputSupported, setSpeechOutputSupported] = useState(false)
  const [speechInputSupported, setSpeechInputSupported] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [summaryData, setSummaryData] = useState(null)
  const [currentQuestionText, setCurrentQuestionText] = useState('')
  const [autoReadQuestions, setAutoReadQuestions] = useState(true)

  const recognitionRef = useRef(null)
  const synthRef = useRef(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // ── Scroll to bottom ───────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, phase])

  // ── Init audio support ─────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSpeech = 'speechSynthesis' in window
      const hasRecog = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
      setSpeechOutputSupported(hasSpeech)
      setSpeechInputSupported(hasRecog)
      if (hasSpeech) synthRef.current = window.speechSynthesis
    }
  }, [])

  // ── Sync inputMode from query ──────────────────────────────────────────────
  useEffect(() => {
    if (!initialMode) return
    if (initialMode === 'audio' && !speechInputSupported) {
      setInputMode('text')
      return
    }
    setInputMode(initialMode)
  }, [initialMode, speechInputSupported])

  // ── TTS: speak text ────────────────────────────────────────────────────────
  const speak = useCallback((text, onEnd) => {
    if (!synthRef.current) { onEnd?.(); return }
    synthRef.current.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.rate = 0.92
    utter.pitch = 1.0
    utter.volume = 1.0
    // Prefer a natural voice
    const voices = synthRef.current.getVoices()
    const preferred = voices.find(v =>
      v.name.includes('Samantha') || v.name.includes('Google US English') ||
      v.name.includes('Karen') || v.name.includes('Daniel') || v.lang === 'en-US'
    )
    if (preferred) utter.voice = preferred
    utter.onstart = () => setIsSpeaking(true)
    utter.onend = () => { setIsSpeaking(false); onEnd?.() }
    utter.onerror = () => { setIsSpeaking(false); onEnd?.() }
    synthRef.current.speak(utter)
  }, [])

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel()
    setIsSpeaking(false)
  }, [])

  // ── STT: start recording ───────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRec) return

    const recognition = new SpeechRec()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognitionRef.current = recognition

    recognition.onstart = () => setIsListening(true)
    recognition.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('')
      setTranscript(t)
      setUserInput(t)
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognition.start()
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  const replayCurrentQuestion = useCallback(() => {
    if (!currentQuestionText || !speechOutputSupported) return
    speak(currentQuestionText)
  }, [currentQuestionText, speechOutputSupported, speak])

  // ── Add a message to chat ──────────────────────────────────────────────────
  const addMessage = useCallback((role, content) => {
    setMessages(prev => [...prev, { role, content, id: Date.now() + Math.random() }])
  }, [])

  // ── Start the assessment ───────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId || phase !== 'intro') return
    const intro = `Welcome! I am here to guide you through the assessment. We will go through three levels of questions — Remember, Understand, and Apply. I will ask one question at a time and give you brief feedback after each answer. Are you ready to begin?`
    addMessage('agent', intro)
    if (speechOutputSupported && (inputMode === 'audio' || autoReadQuestions)) {
      setTimeout(() => speak(intro, () => setPhase('question')), 600)
    } else {
      setPhase('question')
    }
  }, [sessionId, phase, addMessage, speak, inputMode, speechOutputSupported, autoReadQuestions])

  // ── Ask the current question ───────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'question' || !sessionId) return

    const question = ALL_QUESTIONS[currentIndex]
    if (!question) return

    const prevLevel = currentIndex > 0 ? getLevelForIndex(currentIndex - 1) : null
    const currLevel = getLevelForIndex(currentIndex)

    // Show level transition card
    if (prevLevel !== currLevel && currentIndex > 0) {
      const info = LEVEL_INTROS[currLevel]
      const transMsg = `Now moving to ${info.title}. ${info.desc}`
      addMessage('level', transMsg)
      if (speechOutputSupported && (inputMode === 'audio' || autoReadQuestions)) {
        speak(transMsg, () => {
          askQuestion(question)
        })
      } else {
        setTimeout(() => { askQuestion(question) }, 1800)
      }
    } else {
      askQuestion(question)
    }
  }, [phase, currentIndex, sessionId, addMessage, inputMode, speak, speechOutputSupported, autoReadQuestions]) // eslint-disable-line

  function askQuestion(question) {
    const prefix = `Question ${currentIndex + 1} of ${ALL_QUESTIONS.length}. `
    const fullText = prefix + question.text
    setCurrentQuestionText(fullText)
    addMessage('question', fullText)
    if (speechOutputSupported && (inputMode === 'audio' || autoReadQuestions)) {
      speak(fullText)
    } else {
      inputRef.current?.focus()
    }
  }

  // ── Submit answer ──────────────────────────────────────────────────────────
  async function submitAnswer(answerText) {
    const text = answerText || userInput
    if (!text.trim() && text !== '') return

    const question = ALL_QUESTIONS[currentIndex]
    stopSpeaking()
    stopListening()

    addMessage('student', text || '(no response)')
    setUserInput('')
    setTranscript('')
    setPhase('thinking')

    // Evaluate
    let evaluation = null
    try {
      const evalRes = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionId: question.id,
          questionText: question.text,
          expectedElements: question.expectedElements,
          studentResponse: text,
        }),
      })
      evaluation = await evalRes.json()
    } catch {
      evaluation = { score: 0, studentFeedback: 'Thank you for your answer.' }
    }

    // Get agent response text
    let agentText = evaluation.studentFeedback || 'Thank you for your answer.'

    // Determine if there's a next question
    const isLast = currentIndex >= ALL_QUESTIONS.length - 1
    if (!isLast) {
      const nextQuestion = ALL_QUESTIONS[currentIndex + 1]
      const nextLevel = getLevelForIndex(currentIndex + 1)
      const currLevel = getLevelForIndex(currentIndex)
      if (nextLevel !== currLevel) {
        // Level transition handled by useEffect above
      } else {
        agentText += ` Here is your next question: ${nextQuestion.text}`
      }
    } else {
      agentText += ' That was the final question. Well done for completing the assessment!'
    }

    addMessage('agent', agentText)
    setPhase('feedback')

    if (speechOutputSupported && (inputMode === 'audio' || autoReadQuestions)) {
      speak(agentText, () => {
        if (isLast) {
          finishAssessment()
        } else {
          setCurrentIndex(i => i + 1)
          setPhase('question')
        }
      })
    } else {
      setTimeout(() => {
        if (isLast) {
          finishAssessment()
        } else {
          setCurrentIndex(i => i + 1)
          setPhase('question')
        }
      }, 800)
    }
  }

  // ── Finish and generate report ─────────────────────────────────────────────
  async function finishAssessment() {
    setPhase('thinking')
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', sessionId }),
      })
      const data = await res.json()
      setSummaryData(data)
      addMessage('agent', data.studentSummary)
      if (speechOutputSupported && (inputMode === 'audio' || autoReadQuestions)) speak(data.studentSummary)
    } catch {
      addMessage('agent', 'Thank you for completing the assessment. Your results will be reviewed by the admissions team.')
    }
    setPhase('complete')
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const progress = Math.round((currentIndex / ALL_QUESTIONS.length) * 100)

  return (
    <>
      <Head>
        <title>Assessment — University of the Nations</title>
      </Head>

      <div className="min-h-screen bg-navy-950 flex flex-col">
        {/* Top bar */}
        <header className="flex-shrink-0 px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.1)', background: 'rgba(15,27,53,0.95)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 40 }}>
          <div className="flex items-center gap-3">
            <img src="/uofn-logo.png" alt="UofN" className="w-7 h-7 object-contain" style={{ filter: 'invert(1) sepia(1) saturate(0.5)' }} />
            <span className="text-gold-400 font-mono text-xs hidden sm:block">LLRA · University of the Nations</span>
          </div>

          {/* Progress */}
          <div className="flex-1 mx-6 max-w-xs">
            <div className="flex justify-between text-xs text-navy-600 font-mono mb-1">
              <span>{phase !== 'complete' ? `Q${currentIndex + 1}/${ALL_QUESTIONS.length}` : 'Complete'}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div className="h-1 rounded-full progress-fill" style={{
                width: `${phase === 'complete' ? 100 : progress}%`,
                background: 'linear-gradient(90deg, #c9a84c, #e8cc7a)'
              }} />
            </div>
          </div>

          {/* Mode toggle + speaking indicator */}
          <div className="flex items-center gap-2">
            {isSpeaking && (
              <div className="wave-bars mr-1">
                {[...Array(7)].map((_, i) => <div key={i} className="wave-bar" />)}
              </div>
            )}
            {speechInputSupported && (
              <button
                onClick={() => { stopSpeaking(); stopListening(); setInputMode(m => m === 'audio' ? 'text' : 'audio') }}
                title={inputMode === 'audio' ? 'Switch to text mode' : 'Switch to audio mode'}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{
                  background: inputMode === 'audio' ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)',
                  border: inputMode === 'audio' ? '1px solid rgba(201,168,76,0.4)' : '1px solid rgba(255,255,255,0.1)',
                }}>
                {inputMode === 'audio'
                  ? <svg className="w-4 h-4 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
                  : <svg className="w-4 h-4 text-parchment-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                }
              </button>
            )}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-2xl w-full mx-auto">

          {messages.map((msg) => (
            <div key={msg.id} className="message-enter">
              {msg.role === 'level' && (
                <div className="text-center my-2">
                  <span className="px-3 py-1 rounded-full text-xs font-mono text-gold-400"
                    style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                    {msg.content}
                  </span>
                </div>
              )}

              {msg.role === 'agent' && (
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                    style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }}>
                    <img src="/uofn-logo.png" alt="" className="w-5 h-5 object-contain" style={{ filter: 'invert(1) sepia(1) saturate(0.4)' }} />
                  </div>
                  <div className="flex-1 px-4 py-3 rounded-2xl rounded-tl-sm font-body text-base leading-relaxed text-parchment-100"
                    style={{ background: 'rgba(26,40,71,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {msg.content}
                  </div>
                </div>
              )}

              {msg.role === 'question' && (
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                    style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }}>
                    <img src="/uofn-logo.png" alt="" className="w-5 h-5 object-contain" style={{ filter: 'invert(1) sepia(1) saturate(0.4)' }} />
                  </div>
                  <div className="flex-1 px-4 py-3 rounded-2xl rounded-tl-sm font-body text-base leading-relaxed"
                    style={{ background: 'rgba(26,40,71,0.8)', border: '1px solid rgba(201,168,76,0.2)', color: '#f5f0e6' }}>
                    {msg.content}
                  </div>
                </div>
              )}

              {msg.role === 'student' && (
                <div className="flex justify-end">
                  <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tr-sm font-body text-base leading-relaxed text-navy-950"
                    style={{ background: 'linear-gradient(135deg, #d4aa4a, #c9a84c)' }}>
                    {msg.content}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Thinking indicator */}
          {phase === 'thinking' && (
            <div className="flex gap-3 items-start message-enter">
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }}>
                <img src="/uofn-logo.png" alt="" className="w-5 h-5 object-contain" style={{ filter: 'invert(1) sepia(1) saturate(0.4)' }} />
              </div>
              <div className="px-4 py-4 rounded-2xl rounded-tl-sm flex gap-2 items-center"
                style={{ background: 'rgba(26,40,71,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="thinking-dot" />
                <div className="thinking-dot" />
                <div className="thinking-dot" />
              </div>
            </div>
          )}

          {/* Complete state */}
          {phase === 'complete' && summaryData && (
            <div className="message-enter mt-4 p-5 rounded-2xl text-center"
              style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)' }}>
              <p className="text-gold-400 font-mono text-xs mb-3">ASSESSMENT COMPLETE</p>
              {summaryData.stats && (
                <div className="flex justify-center gap-4 mb-4">
                  {Object.entries(summaryData.stats.byLevel).map(([level, data]) => (
                    <div key={level} className="text-center">
                      <p className="text-parchment-100 font-display text-xl">{data.score}<span className="text-navy-600 text-sm">/{data.max}</span></p>
                      <p className="text-parchment-200 text-xs capitalize">{level}</p>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-parchment-200 text-sm">Your results will be reviewed by the admissions team. Thank you for your time.</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        {phase !== 'complete' && (
          <div className="flex-shrink-0 px-4 pb-6 pt-3 max-w-2xl w-full mx-auto"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>

            {speechOutputSupported && currentQuestionText && (
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  onClick={replayCurrentQuestion}
                  disabled={phase === 'thinking'}
                  className="px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-30"
                  style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', color: '#e8cc7a' }}>
                  Listen to current question
                </button>
                <button
                  onClick={() => setAutoReadQuestions(enabled => !enabled)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#f5f0e6' }}>
                  {autoReadQuestions ? 'Auto-read: On' : 'Auto-read: Off'}
                </button>
              </div>
            )}

            {inputMode === 'audio' && speechInputSupported ? (
              /* ── AUDIO INPUT ── */
              <div className="flex flex-col items-center gap-3">
                {isListening && (
                  <div className="wave-bars">
                    {[...Array(7)].map((_, i) => <div key={i} className="wave-bar" />)}
                  </div>
                )}
                {transcript && (
                  <div className="w-full px-4 py-2 rounded-xl text-sm text-parchment-200 text-center"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {transcript}
                  </div>
                )}
                <div className="flex gap-3 items-center">
                  {!isListening ? (
                    <button
                      onClick={startListening}
                      disabled={phase === 'thinking' || isSpeaking}
                      className="w-16 h-16 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                      style={{ background: 'linear-gradient(135deg, #c9a84c, #a8872e)', boxShadow: '0 4px 20px rgba(201,168,76,0.3)' }}>
                      <svg className="w-7 h-7 text-navy-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={stopListening}
                      className="w-16 h-16 rounded-full flex items-center justify-center mic-pulse"
                      style={{ background: '#dc2626', boxShadow: '0 4px 20px rgba(220,38,38,0.4)' }}>
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
                      style={{ background: 'linear-gradient(135deg, #c9a84c, #a8872e)', color: '#060d1f' }}>
                      Submit Answer →
                    </button>
                  )}
                  {!isListening && !transcript && phase === 'question' && (
                    <button
                      onClick={() => submitAnswer('')}
                      className="px-4 py-2 rounded-lg text-xs font-mono text-navy-600 hover:text-parchment-200 transition-colors"
                      style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                      Skip
                    </button>
                  )}
                </div>
                <p className="text-navy-600 text-xs font-mono">
                  {isListening ? 'Listening... tap stop when done' : isSpeaking ? 'Please wait for the question...' : 'Tap microphone to speak your answer'}
                </p>
              </div>
            ) : (
              /* ── TEXT INPUT ── */
              <>
                {inputMode === 'audio' && !speechInputSupported && (
                  <p className="mb-2 text-gold-400 text-xs font-mono">Voice input is not available in this browser. Switched to text input.</p>
                )}
                <div className="flex gap-2">
                  <textarea
                    ref={inputRef}
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        if (phase === 'question' || phase === 'feedback') submitAnswer()
                      }
                    }}
                    placeholder="Type your answer here... (Enter to submit)"
                    disabled={phase === 'thinking'}
                    rows={2}
                    className="flex-1 px-4 py-3 rounded-xl font-body text-base bg-transparent text-parchment-100 placeholder-navy-600 focus:outline-none resize-none disabled:opacity-40 transition-all"
                    style={{ border: '1px solid rgba(201,168,76,0.2)', background: 'rgba(255,255,255,0.03)' }}
                  />
                  <button
                    onClick={() => submitAnswer()}
                    disabled={phase === 'thinking' || !userInput.trim()}
                    className="px-4 py-3 rounded-xl flex-shrink-0 transition-all disabled:opacity-30 hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #c9a84c, #a8872e)', color: '#060d1f' }}>
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
