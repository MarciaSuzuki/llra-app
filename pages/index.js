import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Image from 'next/image'

export default function Home() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [hasReadStories, setHasReadStories] = useState(null)
  const [inputMode, setInputMode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('welcome') // welcome | mode | name | confirm

  async function startAssessment() {
    if (!name.trim()) return
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
      }
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Learning Level Readiness Assessment — University of the Nations</title>
        <meta name="description" content="Graduate readiness assessment for the University of the Nations" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Background */}
      <div className="min-h-screen bg-navy-950 relative overflow-hidden flex items-center justify-center px-4 py-12">
        {/* Decorative radial glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)' }} />
        </div>

        <div className="relative z-10 w-full max-w-lg">
          {/* Card */}
          <div className="rounded-2xl overflow-hidden" style={{
            background: 'linear-gradient(145deg, #1a2847, #0f1b35)',
            border: '1px solid rgba(201,168,76,0.2)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(201,168,76,0.1)',
          }}>

            {/* Header */}
            <div className="px-8 pt-10 pb-6 text-center" style={{ borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
              <div className="flex justify-center mb-5">
                <div className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.2)' }}>
                  <img src="/uofn-logo.png" alt="University of the Nations" className="w-16 h-16 object-contain" style={{ filter: 'invert(1) sepia(1) saturate(0.5) hue-rotate(10deg)' }} />
                </div>
              </div>
              <p className="text-gold-400 text-xs font-mono tracking-widest uppercase mb-2">University of the Nations · YWAM</p>
              <h1 className="font-display text-2xl text-parchment-100 leading-tight">
                Learning Level<br />Readiness Assessment
              </h1>
            </div>

            {/* Content area */}
            <div className="px-8 py-8">

              {/* STEP: Welcome */}
              {step === 'welcome' && (
                <div className="message-enter text-center">
                  <p className="font-body text-parchment-200 text-lg leading-relaxed mb-8">
                    Welcome. This assessment explores how well you have understood and can apply the two stories you were asked to read before this session.
                  </p>
                  <div className="mb-6 p-4 rounded-xl text-left" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)' }}>
                    <p className="text-gold-400 text-sm font-mono mb-2">BEFORE YOU BEGIN</p>
                    <p className="text-parchment-200 text-sm">Have you read both stories?</p>
                    <ul className="mt-2 space-y-1">
                      <li className="text-parchment-100 text-sm">• Story A: <em>"The School of Fish That Forgot It Knew How to Swim"</em></li>
                      <li className="text-parchment-100 text-sm">• Story B: <em>"The Porang Whisper"</em></li>
                    </ul>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setHasReadStories(false)}
                      className="flex-1 py-3 rounded-xl font-body text-base transition-all duration-200"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}>
                      Not yet
                    </button>
                    <button onClick={() => { setHasReadStories(true); setStep('mode') }}
                      className="flex-1 py-3 rounded-xl font-body text-base font-semibold transition-all duration-200 hover:brightness-110"
                      style={{ background: 'linear-gradient(135deg, #c9a84c, #a8872e)', color: '#060d1f' }}>
                      Yes, I have read both
                    </button>
                  </div>
                  {hasReadStories === false && (
                    <p className="mt-4 text-sm text-gold-400">Please read both stories before returning for the assessment.</p>
                  )}
                </div>
              )}

              {/* STEP: Mode selection */}
              {step === 'mode' && (
                <div className="message-enter">
                  <p className="font-display text-parchment-100 text-xl text-center mb-2">How would you like to respond?</p>
                  <p className="text-parchment-200 text-center text-sm mb-6">You can speak your answers aloud or type them. You may switch at any time during the assessment.</p>
                  <div className="space-y-3">
                    <button onClick={() => { setInputMode('audio'); setStep('name') }}
                      className="w-full p-4 rounded-xl text-left transition-all duration-200 hover:brightness-110 group"
                      style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)' }}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(201,168,76,0.15)' }}>
                          <svg className="w-6 h-6 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-gold-300 font-semibold font-body text-lg">Speak my answers</p>
                          <p className="text-parchment-200 text-sm">Questions are read aloud. Respond using your voice.</p>
                        </div>
                      </div>
                    </button>
                    <button onClick={() => { setInputMode('text'); setStep('name') }}
                      className="w-full p-4 rounded-xl text-left transition-all duration-200 hover:brightness-110"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <svg className="w-6 h-6 text-parchment-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-parchment-100 font-semibold font-body text-lg">Type my answers</p>
                          <p className="text-parchment-200 text-sm">Read questions on screen and type your responses.</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP: Name */}
              {step === 'name' && (
                <div className="message-enter">
                  <p className="font-display text-parchment-100 text-xl text-center mb-6">What is your name?</p>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && name.trim() && startAssessment()}
                    placeholder="Enter your full name"
                    className="w-full px-5 py-4 rounded-xl font-body text-lg bg-transparent text-parchment-100 placeholder-navy-600 focus:outline-none transition-all"
                    style={{ border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(255,255,255,0.03)' }}
                    autoFocus
                  />
                  <button
                    onClick={startAssessment}
                    disabled={!name.trim() || loading}
                    className="mt-4 w-full py-4 rounded-xl font-body text-lg font-semibold transition-all duration-200 disabled:opacity-40 hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #c9a84c, #a8872e)', color: '#060d1f' }}>
                    {loading ? 'Starting…' : 'Begin Assessment →'}
                  </button>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="px-8 pb-6 text-center">
              <p className="text-navy-600 text-xs font-mono">
                30 questions · ~40 minutes · Results reviewed by human administrator
              </p>
              <button onClick={() => router.push('/admin')}
                className="mt-3 text-xs text-navy-600 hover:text-gold-500 transition-colors font-mono">
                Administrator login →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
