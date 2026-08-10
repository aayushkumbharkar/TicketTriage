import { useState, useCallback, useEffect } from 'react'
import axios from 'axios'
import {
  confidenceBadgeClass,
  priorityBadgeClass,
  categoryBadgeClass,
  statusBadgeClass,
} from '../utils/badgeHelpers'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const STATUSES = ['Open', 'In Progress', 'Resolved']

export default function TicketDetail({ ticket, onUpdate }) {
  const [reply, setReply]                   = useState(ticket.final_reply || ticket.suggested_reply || '')
  const [status, setStatus]                 = useState(ticket.status || 'Open')
  const [isDirty, setIsDirty]               = useState(false)
  const [isSaving, setIsSaving]             = useState(false)
  const [isStatusSaving, setStatusSaving]   = useState(false)
  const [isRegenerating, setIsRegen]        = useState(false)
  const [copied, setCopied]                 = useState(false)
  const [regenError, setRegenError]         = useState(null)
  const [saveError, setSaveError]           = useState(null)

  // Sync reply when ticket prop updates from outside (regenerate / parent refresh)
  // Only sync if user hasn't started editing locally
  useEffect(() => {
    if (!isDirty) {
      setReply(ticket.final_reply || ticket.suggested_reply || '')
    }
  }, [ticket.final_reply, ticket.suggested_reply, isDirty])

  // Always sync status from parent
  useEffect(() => {
    setStatus(ticket.status || 'Open')
  }, [ticket.status])

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus)
    setStatusSaving(true)
    setSaveError(null)
    try {
      const { data } = await axios.patch(`${API}/tickets/${ticket.id}`, {
        status: newStatus,
      })
      onUpdate?.(data)
    } catch {
      setSaveError('Failed to update status. Please try again.')
      setStatus(ticket.status) // revert on error
    } finally {
      setStatusSaving(false)
    }
  }

  const handleSave = useCallback(async () => {
    if (!isDirty) return
    setIsSaving(true)
    setSaveError(null)
    try {
      const { data } = await axios.patch(`${API}/tickets/${ticket.id}`, {
        final_reply: reply,
        is_edited: true,
        status: 'In Progress',
      })
      onUpdate?.(data)
      setIsDirty(false)
    } catch {
      setSaveError('Failed to save reply. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }, [isDirty, reply, ticket.id, onUpdate])

  const handleRegenerate = async () => {
    setIsRegen(true)
    setRegenError(null)
    setIsDirty(false)
    try {
      const { data } = await axios.post(`${API}/tickets/${ticket.id}/regenerate`)
      setReply(data.suggested_reply)
      onUpdate?.({ ...ticket, suggested_reply: data.suggested_reply, final_reply: null })
    } catch (err) {
      setRegenError(
        err.response?.data?.detail ||
        'Regeneration failed — ensure GEMINI_API_KEY is set on the backend.'
      )
    } finally {
      setIsRegen(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(reply)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const t = ticket

  return (
    <div className="bg-[#0F1117] border border-[#1e2235] rounded-[8px] p-4 text-[13px] my-2 space-y-3">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e2235] pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={categoryBadgeClass(t.category)}>{t.category}</span>
          <span className={priorityBadgeClass(t.priority)}>{t.priority}</span>
          <span className={confidenceBadgeClass(t.confidence)}>
            {(t.confidence * 100).toFixed(0)}% confidence
          </span>
        </div>

        <span className="font-mono-data text-[10px] text-[#6C63FF] bg-[rgba(108,99,255,0.1)] border border-[rgba(108,99,255,0.2)] px-2 py-0.5 rounded-[4px]">
          {t.prompt_version || 'v1.0'}
        </span>
      </div>

      {/* Dynamic Status Display & Selector */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-[#7B7F96] uppercase tracking-wider">Status</span>
        <div className="flex items-center gap-2">
          <span className={statusBadgeClass(status)}>
            {status}
          </span>
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={isStatusSaving}
            className="tt-input text-[11px] py-1 px-2.5 w-auto cursor-pointer border-[#1e2235] bg-[#13151f]"
          >
            {STATUSES.map(s => (
              <option key={s} value={s} className="bg-[#0F1117] text-[#E8E9F0]">
                {s}
              </option>
            ))}
          </select>
          {isStatusSaving && (
            <svg className="w-3.5 h-3.5 text-[#6C63FF] animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <span className="text-[10px] text-[#7B7F96] uppercase tracking-wider block mb-1">Full Description</span>
        <p className="text-[#c8cad8] bg-[#13151f] p-3 rounded-[6px] border border-[#1e2235] text-[12px] whitespace-pre-wrap">
          {t.description}
        </p>
      </div>

      {/* Reasoning */}
      <div>
        <span className="text-[10px] text-[#7B7F96] uppercase tracking-wider block mb-1">AI Reasoning</span>
        <div className="bg-[#13151f] border-l-2 border-l-[#6C63FF] p-3 rounded-r-[6px] text-[12px] text-[#c8cad8]">
          {t.reasoning}
        </div>
      </div>

      {/* Reply textarea */}
      <div>
        <div className="flex items-center justify-between mb-1">
          {t.is_edited ? (
            <span className="flex items-center gap-1.5 text-[10px] text-[#52C9A0] uppercase tracking-wider font-semibold">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Final Reply (Saved)
            </span>
          ) : (
            <span className="text-[10px] text-[#7B7F96] uppercase tracking-wider">Suggested Reply</span>
          )}
          {isDirty && <span className="font-mono-data text-[10px] text-[#FAC775]">Unsaved changes</span>}
        </div>
        <textarea
          rows={4}
          value={reply}
          onChange={e => {
            setReply(e.target.value)
            setIsDirty(true)
            if (status === 'Open') {
              setStatus('In Progress')
            }
          }}
          className="tt-input text-[12px] resize-none"
          style={t.is_edited && !isDirty ? { borderColor: 'rgba(82,201,160,0.35)' } : {}}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="btn-ghost text-[12px]"
        >
          <svg className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{isRegenerating ? 'Regenerating...' : 'Regenerate'}</span>
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className="btn-ghost text-[12px]"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className="btn-ghost text-[12px] text-[#6C63FF] border-[#6C63FF]/30 hover:border-[#6C63FF]"
        >
          <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      {regenError && (
        <p className="text-[11px] text-[#f09595]">⚠ {regenError}</p>
      )}
      {saveError && (
        <p className="text-[11px] text-[#f09595]">⚠ {saveError}</p>
      )}
    </div>
  )
}

