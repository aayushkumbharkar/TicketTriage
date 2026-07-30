import { useState, useCallback } from 'react'
import axios from 'axios'

const API = 'http://localhost:8000'

// ── Helper: confidence badge class ──────────────────────────────────────────
export function confidenceBadgeClass(confidence) {
  if (confidence >= 0.8) return 'badge conf-high'
  if (confidence >= 0.5) return 'badge conf-medium'
  return 'badge conf-low'
}

// ── Helper: priority badge class ─────────────────────────────────────────────
export function priorityBadgeClass(priority) {
  if (priority === 'High')   return 'badge badge-high'
  if (priority === 'Medium') return 'badge badge-medium'
  return 'badge badge-low'
}

// ── Helper: category badge class ─────────────────────────────────────────────
export function categoryBadgeClass(category) {
  const map = { Billing: 'badge-billing', Bug: 'badge-bug', 'Feature Request': 'badge-feature', General: 'badge-general' }
  return `badge ${map[category] || 'badge-general'}`
}

export default function TicketDetail({ ticket, onUpdate }) {
  const [reply, setReply]             = useState(ticket.suggested_reply || '')
  const [isDirty, setIsDirty]         = useState(false)
  const [isSaving, setIsSaving]       = useState(false)
  const [isRegenerating, setIsRegen]  = useState(false)
  const [copied, setCopied]           = useState(false)
  const [regenError, setRegenError]   = useState(null)

  // ── Save edited reply ──────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!isDirty) return
    setIsSaving(true)
    try {
      const { data } = await axios.patch(`${API}/tickets/${ticket.id}`, {
        final_reply: reply,
        is_edited: true,
      })
      onUpdate?.(data)
      setIsDirty(false)
    } catch {
      // silent — save is best-effort
    } finally {
      setIsSaving(false)
    }
  }, [isDirty, reply, ticket.id, onUpdate])

  // ── Regenerate reply ───────────────────────────────────────────────────────
  const handleRegenerate = async () => {
    setIsRegen(true)
    setRegenError(null)
    try {
      const { data } = await axios.post(`${API}/tickets/${ticket.id}/regenerate`)
      setReply(data.suggested_reply)
      setIsDirty(false)
    } catch (err) {
      setRegenError(err.response?.data?.detail || 'Regeneration failed.')
    } finally {
      setIsRegen(false)
    }
  }

  // ── Copy to clipboard ──────────────────────────────────────────────────────
  const handleCopy = async () => {
    await navigator.clipboard.writeText(reply)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const t = ticket

  return (
    <div className="rounded-2xl p-6 glass animate-fade-in" style={{ border: '1px solid var(--border)' }}>
      {/* Classification row */}
      <div className="flex flex-wrap items-center gap-3 mb-5 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className={categoryBadgeClass(t.category)}>{t.category}</span>
        <span className={priorityBadgeClass(t.priority)}>{t.priority} Priority</span>
        <span className={confidenceBadgeClass(t.confidence)}>
          {Math.round(t.confidence * 100)}% confidence
        </span>
        <span className="ml-auto text-xs px-2 py-1 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
          {t.prompt_version}
        </span>
      </div>

      {/* Reasoning */}
      <div className="mb-5">
        <p className="text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>AI Reasoning</p>
        <p className="text-sm" style={{ color: '#cbd5e1', lineHeight: 1.6 }}>{t.reasoning}</p>
      </div>

      {/* Subject & description (compact) */}
      <div className="grid grid-cols-1 gap-3 mb-5 text-sm">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Subject</span>
          <p className="mt-0.5 text-white font-medium">{t.subject}</p>
        </div>
        {t.submitter_email && (
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Submitted by</span>
            <p className="mt-0.5" style={{ color: '#94a3b8' }}>{t.submitter_email}</p>
          </div>
        )}
      </div>

      {/* Suggested reply — editable */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Suggested Reply {t.is_edited && <span className="ml-2 normal-case text-yellow-400">· edited by human</span>}
          </p>
          {isDirty && (
            <span className="text-xs" style={{ color: '#fbbf24' }}>Unsaved changes</span>
          )}
        </div>
        <textarea
          id={`reply-${t.id}`}
          value={reply}
          onChange={e => { setReply(e.target.value); setIsDirty(true) }}
          onBlur={handleSave}
          rows={6}
          className="input-field px-4 py-3 resize-none text-sm"
          style={{ lineHeight: 1.65 }}
          placeholder="AI-generated reply will appear here…"
        />
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mt-2">
        <button
          id={`btn-save-${t.id}`}
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className="btn-primary text-sm px-4 py-2"
        >
          {isSaving ? 'Saving…' : 'Save Edit'}
        </button>

        <button
          id={`btn-regen-${t.id}`}
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="btn-secondary text-sm px-4 py-2"
        >
          {isRegenerating ? (
            <span className="flex items-center gap-1.5">
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Regenerating…
            </span>
          ) : '↺ Regenerate Reply'}
        </button>

        <button
          id={`btn-copy-${t.id}`}
          onClick={handleCopy}
          className="btn-secondary text-sm px-4 py-2"
        >
          {copied ? '✓ Copied!' : '⧉ Copy'}
        </button>
      </div>

      {regenError && (
        <p className="mt-3 text-xs" style={{ color: '#f87171' }}>⚠ {regenError}</p>
      )}
    </div>
  )
}
