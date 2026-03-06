import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

const BAND_STYLES = {
  Developing:  'band-developing',
  Approaching: 'band-approaching',
  Meeting:     'band-meeting',
  Exceeding:   'band-exceeding',
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

function SessionCard({ session, onExpand, expanded }) {
  const stats = session.report?.stats
  const band = stats?.band || '—'

  return (
    <div className="rounded-xl overflow-hidden transition-all duration-200"
      style={{ background: 'rgba(26,40,71,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <button className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
        onClick={onExpand}>
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-display text-sm font-bold text-navy-950"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #a8872e)' }}>
            {session.studentName?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-parchment-100 font-body font-semibold">{session.studentName}</p>
            <p className="text-navy-600 text-xs font-mono">
              {new Date(session.startedAt).toLocaleDateString()} · {session.inputMode === 'audio' ? '🎙 audio' : '⌨ text'}
              {session.completedAt ? '' : ' · in progress'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {stats && (
            <>
              <span className="font-mono text-sm text-parchment-100">{stats.total}<span className="text-navy-600">/60</span></span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${BAND_STYLES[band] || ''}`}>{band}</span>
            </>
          )}
          {!session.completedAt && (
            <span className="px-2 py-0.5 rounded-full text-xs font-mono"
              style={{ background: 'rgba(234,179,8,0.1)', color: '#fde047', border: '1px solid rgba(234,179,8,0.2)' }}>
              In Progress
            </span>
          )}
          <svg className={`w-4 h-4 text-navy-600 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {stats && (
            <div className="mt-4 space-y-2">
              <p className="text-gold-400 text-xs font-mono mb-3">SCORES BY LEVEL</p>
              <div>
                <div className="flex justify-between text-xs text-parchment-200 mb-1">
                  <span>Remember</span>
                </div>
                <ScoreBar score={stats.byLevel.remember.score} max={20} color="#60a5fa" />
              </div>
              <div>
                <div className="flex justify-between text-xs text-parchment-200 mb-1">
                  <span>Understand</span>
                </div>
                <ScoreBar score={stats.byLevel.understand.score} max={20} color="#a78bfa" />
              </div>
              <div>
                <div className="flex justify-between text-xs text-parchment-200 mb-1">
                  <span>Apply</span>
                </div>
                <ScoreBar score={stats.byLevel.apply.score} max={20} color="#c9a84c" />
              </div>
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-parchment-100 font-semibold">Total</span>
                  <span className="text-parchment-100 font-mono">{stats.percentage}%</span>
                </div>
                <ScoreBar score={stats.total} max={60} />
              </div>
            </div>
          )}

          {session.report?.adminAnalysis && (
            <div className="mt-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-gold-400 text-xs font-mono mb-2">ADMINISTRATOR NOTES</p>
              <p className="text-parchment-200 text-sm font-body leading-relaxed">{session.report.adminAnalysis}</p>
            </div>
          )}

          {/* Recommendation checkboxes */}
          <div className="mt-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-gold-400 text-xs font-mono mb-3">RECOMMENDATION (administrator decision)</p>
            <div className="space-y-2">
              {['Recommend for admission', 'Recommend with conditions', 'Do not recommend at this time'].map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name={`rec-${session.id}`} className="accent-gold-500" />
                  <span className="text-parchment-200 text-sm">{opt}</span>
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
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [error, setError] = useState('')
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [filter, setFilter] = useState('all') // all | completed | in_progress

  async function login() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/sessions', {
        headers: { 'x-admin-password': password },
      })
      if (res.status === 401) { setError('Incorrect password.'); setLoading(false); return }
      const data = await res.json()
      setSessions(data.sessions || [])
      setAuthed(true)
    } catch {
      setError('Could not connect. Please try again.')
    }
    setLoading(false)
  }

  async function refresh() {
    if (!authed) return
    const res = await fetch('/api/sessions', { headers: { 'x-admin-password': password } })
    const data = await res.json()
    setSessions(data.sessions || [])
  }

  const filtered = sessions.filter(s => {
    if (filter === 'completed') return s.status === 'completed'
    if (filter === 'in_progress') return s.status !== 'completed'
    return true
  })

  const stats = {
    total: sessions.length,
    completed: sessions.filter(s => s.status === 'completed').length,
    avgScore: (() => {
      const done = sessions.filter(s => s.report?.stats)
      if (!done.length) return '—'
      return Math.round(done.reduce((sum, s) => sum + s.report.stats.total, 0) / done.length)
    })(),
    audio: sessions.filter(s => s.inputMode === 'audio').length,
  }

  if (!authed) {
    return (
      <>
        <Head><title>Admin — LLRA</title></Head>
        <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
          <div className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: 'linear-gradient(145deg, #1a2847, #0f1b35)', border: '1px solid rgba(201,168,76,0.2)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
            <div className="px-8 pt-8 pb-6 text-center" style={{ borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
              <img src="/uofn-logo.png" alt="UofN" className="w-14 h-14 mx-auto mb-4 object-contain" style={{ filter: 'invert(1) sepia(1) saturate(0.5)' }} />
              <p className="text-gold-400 text-xs font-mono tracking-widest uppercase mb-1">Administrator Access</p>
              <h1 className="font-display text-xl text-parchment-100">LLRA Dashboard</h1>
            </div>
            <div className="px-8 py-6">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && login()}
                placeholder="Enter admin password"
                className="w-full px-4 py-3 rounded-xl font-body text-base bg-transparent text-parchment-100 placeholder-navy-600 focus:outline-none"
                style={{ border: '1px solid rgba(201,168,76,0.25)', background: 'rgba(255,255,255,0.03)' }}
                autoFocus
              />
              {error && <p className="text-red-400 text-sm mt-2 font-mono">{error}</p>}
              <button onClick={login} disabled={loading || !password}
                className="mt-4 w-full py-3 rounded-xl font-body font-semibold transition-all disabled:opacity-40 hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #c9a84c, #a8872e)', color: '#060d1f' }}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
              <button onClick={() => router.push('/')} className="mt-3 w-full text-center text-xs text-navy-600 hover:text-gold-500 transition-colors font-mono">
                ← Back to assessment
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head><title>Admin Dashboard — LLRA</title></Head>
      <div className="min-h-screen bg-navy-950">
        {/* Header */}
        <header className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.1)', background: 'rgba(15,27,53,0.95)', position: 'sticky', top: 0, zIndex: 40 }}>
          <div className="flex items-center gap-3">
            <img src="/uofn-logo.png" alt="UofN" className="w-8 h-8 object-contain" style={{ filter: 'invert(1) sepia(1) saturate(0.5)' }} />
            <div>
              <p className="text-parchment-100 font-display text-base">LLRA Dashboard</p>
              <p className="text-navy-600 text-xs font-mono">University of the Nations</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={refresh} className="px-3 py-1.5 rounded-lg text-xs font-mono text-parchment-200 hover:text-gold-400 transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              Refresh
            </button>
            <button onClick={() => router.push('/')} className="px-3 py-1.5 rounded-lg text-xs font-mono text-parchment-200 hover:text-gold-400 transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              Assessment →
            </button>
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { label: 'Total Sessions', value: stats.total },
              { label: 'Completed', value: stats.completed },
              { label: 'Avg Score', value: stats.avgScore === '—' ? '—' : `${stats.avgScore}/60` },
              { label: 'Audio Mode', value: stats.audio },
            ].map(({ label, value }) => (
              <div key={label} className="p-4 rounded-xl text-center"
                style={{ background: 'rgba(26,40,71,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-parchment-100 font-display text-2xl">{value}</p>
                <p className="text-navy-600 text-xs font-mono mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-4">
            {['all', 'completed', 'in_progress'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
                style={{
                  background: filter === f ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
                  border: filter === f ? '1px solid rgba(201,168,76,0.3)' : '1px solid rgba(255,255,255,0.07)',
                  color: filter === f ? '#d4aa4a' : '#9ca3af',
                }}>
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Session list */}
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="text-center py-12 text-navy-600 font-mono text-sm">
                No sessions found.
              </div>
            )}
            {filtered.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                expanded={expanded === session.id}
                onExpand={() => setExpanded(expanded === session.id ? null : session.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
