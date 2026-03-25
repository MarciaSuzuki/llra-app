import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { DEFAULT_LANGUAGE, LANGUAGE_OPTIONS, formatSessionDate, getBandLabel, getInputModeLabel, getSupportedLanguage, getUiText } from '../lib/i18n'

const BAND_STYLES = {
  Developing: 'band-developing',
  Approaching: 'band-approaching',
  Meeting: 'band-meeting',
  Exceeding: 'band-exceeding',
}

function LanguageSwitcher({ language, onChange, label, compact = false }) {
  return (
    <div className={`flex ${compact ? 'items-center gap-2' : 'flex-col items-center gap-2'}`}>
      <p className="text-navy-600 text-[11px] font-mono tracking-widest uppercase">{label}</p>
      <div
        className="inline-flex rounded-full p-1"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {LANGUAGE_OPTIONS.map((option) => {
          const isActive = language === option.value
          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: isActive ? 'rgba(201,168,76,0.18)' : 'transparent',
                color: isActive ? '#e8cc7a' : '#d5dbe7',
              }}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ScoreBar({ score, max, color = '#c9a84c' }) {
  const pct = max > 0 ? (score / max) * 100 : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-parchment-200 text-xs font-mono w-12 text-right">{score}/{max}</span>
    </div>
  )
}

function SessionCard({ session, onExpand, expanded, language, text }) {
  const stats = session.report?.stats
  const band = stats?.band || '—'
  const adminText = text.admin

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{ background: 'rgba(26,40,71,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <button className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors" onClick={onExpand}>
        <div className="flex items-center gap-4">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-display text-sm font-bold text-navy-950"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #a8872e)' }}
          >
            {session.studentName?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-parchment-100 font-body font-semibold">{session.studentName}</p>
            <p className="text-navy-600 text-xs font-mono">
              {formatSessionDate(session.startedAt, language)} · {getInputModeLabel(session.inputMode, language)} · {adminText.languageBadge}: {adminText.sessionLanguage(session.language || 'en')}
              {session.completedAt ? '' : ` · ${adminText.inProgressBadge.toLowerCase()}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {stats && (
            <>
              <span className="font-mono text-sm text-parchment-100">{stats.total}<span className="text-navy-600">/60</span></span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${BAND_STYLES[band] || ''}`}>{getBandLabel(band, language)}</span>
            </>
          )}
          {!session.completedAt && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-mono"
              style={{ background: 'rgba(234,179,8,0.1)', color: '#fde047', border: '1px solid rgba(234,179,8,0.2)' }}
            >
              {adminText.inProgressBadge}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-navy-600 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {stats && (
            <div className="mt-4 space-y-2">
              <p className="text-gold-400 text-xs font-mono mb-3">{adminText.scoresByLevel}</p>
              <div>
                <div className="flex justify-between text-xs text-parchment-200 mb-1">
                  <span>{text.levels.remember}</span>
                </div>
                <ScoreBar score={stats.byLevel.remember.score} max={20} color="#60a5fa" />
              </div>
              <div>
                <div className="flex justify-between text-xs text-parchment-200 mb-1">
                  <span>{text.levels.understand}</span>
                </div>
                <ScoreBar score={stats.byLevel.understand.score} max={20} color="#a78bfa" />
              </div>
              <div>
                <div className="flex justify-between text-xs text-parchment-200 mb-1">
                  <span>{text.levels.apply}</span>
                </div>
                <ScoreBar score={stats.byLevel.apply.score} max={20} color="#c9a84c" />
              </div>
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-parchment-100 font-semibold">{adminText.total}</span>
                  <span className="text-parchment-100 font-mono">{stats.percentage}%</span>
                </div>
                <ScoreBar score={stats.total} max={60} />
              </div>
            </div>
          )}

          {session.report?.adminAnalysis && (
            <div className="mt-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-gold-400 text-xs font-mono mb-2">{adminText.adminNotes}</p>
              <p className="text-parchment-200 text-sm font-body leading-relaxed">{session.report.adminAnalysis}</p>
            </div>
          )}

          <div className="mt-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-gold-400 text-xs font-mono mb-3">{adminText.recommendation}</p>
            <div className="space-y-2">
              {adminText.recommendations.map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name={`rec-${session.id}`} className="accent-gold-500" />
                  <span className="text-parchment-200 text-sm">{option}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Admin() {
  const router = useRouter()
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE)
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [error, setError] = useState('')
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [filter, setFilter] = useState('all')

  const text = getUiText(language)
  const adminText = text.admin

  useEffect(() => {
    if (!router.isReady || typeof window === 'undefined') return

    const queryLanguage = Array.isArray(router.query.lang) ? router.query.lang[0] : router.query.lang
    const storedLanguage = window.localStorage.getItem('gra-language')
    const nextLanguage = getSupportedLanguage(queryLanguage || storedLanguage || DEFAULT_LANGUAGE)

    setLanguage(nextLanguage)
  }, [router.isReady, router.query.lang])

  useEffect(() => {
    if (!router.isReady || typeof window === 'undefined') return

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
  }, [language, router])

  async function login() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/sessions', {
        headers: { 'x-admin-password': password },
      })
      if (res.status === 401) {
        setError(adminText.incorrectPassword)
        setLoading(false)
        return
      }
      const data = await res.json()
      setSessions(data.sessions || [])
      setAuthed(true)
    } catch {
      setError(adminText.couldNotConnect)
    }
    setLoading(false)
  }

  async function refresh() {
    if (!authed) return
    const res = await fetch('/api/sessions', { headers: { 'x-admin-password': password } })
    const data = await res.json()
    setSessions(data.sessions || [])
  }

  const filtered = sessions.filter((session) => {
    if (filter === 'completed') return session.status === 'completed'
    if (filter === 'in_progress') return session.status !== 'completed'
    return true
  })

  const stats = {
    total: sessions.length,
    completed: sessions.filter((session) => session.status === 'completed').length,
    avgScore: (() => {
      const completedSessions = sessions.filter((session) => session.report?.stats)
      if (!completedSessions.length) return '—'
      return Math.round(completedSessions.reduce((sum, session) => sum + session.report.stats.total, 0) / completedSessions.length)
    })(),
    audio: sessions.filter((session) => session.inputMode === 'audio').length,
  }

  if (!authed) {
    return (
      <>
        <Head><title>{adminText.dashboardTitle}</title></Head>
        <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: 'linear-gradient(145deg, #1a2847, #0f1b35)', border: '1px solid rgba(201,168,76,0.2)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}
          >
            <div className="px-8 pt-8 pb-6 text-center" style={{ borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
              <img src="/uofn-logo.png" alt="UofN" className="w-14 h-14 mx-auto mb-4 object-contain" style={{ filter: 'invert(1) sepia(1) saturate(0.5)' }} />
              <p className="text-gold-400 text-xs font-mono tracking-widest uppercase mb-1">{adminText.accessTitle}</p>
              <h1 className="font-display text-xl text-parchment-100">{adminText.dashboardTitle}</h1>
            </div>
            <div className="px-8 py-6">
              <LanguageSwitcher language={language} onChange={setLanguage} label={text.languageLabel} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && login()}
                placeholder={adminText.enterPassword}
                className="w-full px-4 py-3 rounded-xl font-body text-base bg-transparent text-parchment-100 placeholder-navy-600 focus:outline-none"
                style={{ border: '1px solid rgba(201,168,76,0.25)', background: 'rgba(255,255,255,0.03)' }}
                autoFocus
              />
              {error && <p className="text-red-400 text-sm mt-2 font-mono">{error}</p>}
              <button
                onClick={login}
                disabled={loading || !password}
                className="mt-4 w-full py-3 rounded-xl font-body font-semibold transition-all disabled:opacity-40 hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #c9a84c, #a8872e)', color: '#060d1f' }}
              >
                {loading ? adminText.signingIn : adminText.signIn}
              </button>
              <button onClick={() => router.push('/')} className="mt-3 w-full text-center text-xs text-navy-600 hover:text-gold-500 transition-colors font-mono">
                ← {adminText.backToAssessment}
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head><title>{adminText.dashboardTitle}</title></Head>
      <div className="min-h-screen bg-navy-950">
        <header
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.1)', background: 'rgba(15,27,53,0.95)', position: 'sticky', top: 0, zIndex: 40 }}
        >
          <div className="flex items-center gap-3">
            <img src="/uofn-logo.png" alt="UofN" className="w-8 h-8 object-contain" style={{ filter: 'invert(1) sepia(1) saturate(0.5)' }} />
            <div>
              <p className="text-parchment-100 font-display text-base">{adminText.dashboardTitle}</p>
              <p className="text-navy-600 text-xs font-mono">University of the Nations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher language={language} onChange={setLanguage} label={text.languageLabel} compact />
            <button
              onClick={refresh}
              className="px-3 py-1.5 rounded-lg text-xs font-mono text-parchment-200 hover:text-gold-400 transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {adminText.refresh}
            </button>
            <button
              onClick={() => router.push({ pathname: '/', query: { lang: language } })}
              className="px-3 py-1.5 rounded-lg text-xs font-mono text-parchment-200 hover:text-gold-400 transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {adminText.assessmentLink} →
            </button>
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { label: adminText.totalSessions, value: stats.total },
              { label: adminText.completed, value: stats.completed },
              { label: adminText.averageScore, value: stats.avgScore === '—' ? '—' : `${stats.avgScore}/60` },
              { label: adminText.audioMode, value: stats.audio },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="p-4 rounded-xl text-center"
                style={{ background: 'rgba(26,40,71,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <p className="text-parchment-100 font-display text-2xl">{value}</p>
                <p className="text-navy-600 text-xs font-mono mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mb-4">
            {['all', 'completed', 'in_progress'].map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className="px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
                style={{
                  background: filter === value ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
                  border: filter === value ? '1px solid rgba(201,168,76,0.3)' : '1px solid rgba(255,255,255,0.07)',
                  color: filter === value ? '#d4aa4a' : '#9ca3af',
                }}
              >
                {adminText.filters[value]}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="text-center py-12 text-navy-600 font-mono text-sm">
                {adminText.noSessions}
              </div>
            )}
            {filtered.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                expanded={expanded === session.id}
                onExpand={() => setExpanded(expanded === session.id ? null : session.id)}
                language={language}
                text={text}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
