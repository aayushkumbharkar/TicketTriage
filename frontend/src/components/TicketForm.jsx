import { useState } from 'react'
import axios from 'axios'
import {
  categoryBadgeClass,
  priorityBadgeClass,
  confidenceBadgeClass,
  statusBadgeClass
} from '../utils/badgeHelpers'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/* ── Skeleton placeholder for result panel while loading ── */
function ResultSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0' }}>
      {/* Metadata strip skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="skeleton" style={{ height: 10, width: '60%', borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 22, borderRadius: 4 }} />
          </div>
        ))}
      </div>
      {/* Reasoning skeleton */}
      <div>
        <div className="skeleton" style={{ height: 10, width: '25%', borderRadius: 4, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 72, borderRadius: 6 }} />
      </div>
      {/* Reply skeleton */}
      <div>
        <div className="skeleton" style={{ height: 10, width: '30%', borderRadius: 4, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 100, borderRadius: 6 }} />
      </div>
    </div>
  )
}

export default function TicketForm() {
  const [form, setForm] = useState({ subject: '', description: '', submitter_email: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [submitError, setSubmitError] = useState(null)

  // Editable reply state
  const [editableReply, setEditableReply] = useState('')
  const [originalReply, setOriginalReply] = useState('')  // tracks the AI-generated baseline
  const [isSaving, setIsSaving] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  const validate = () => {
    const errs = {}
    if (!form.subject.trim())     errs.subject     = 'Subject is required.'
    if (!form.description.trim()) errs.description = 'Description is required.'
    return errs
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError(null)
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    setResult(null)

    try {
      const { data } = await axios.post(`${API}/tickets`, {
        subject:         form.subject.trim(),
        description:     form.description.trim(),
        submitter_email: form.submitter_email.trim() || undefined,
      })
      setResult(data)
      setEditableReply(data.suggested_reply || '')
      setOriginalReply(data.suggested_reply || '')  // preserve the AI original
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to submit ticket. Please try again.'
      setSubmitError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = async () => {
    if (!result) return
    setIsRegenerating(true)
    try {
      const { data } = await axios.post(`${API}/tickets/${result.id}/regenerate`)
      setResult(prev => ({ ...prev, suggested_reply: data.suggested_reply, is_edited: false }))
      setEditableReply(data.suggested_reply)
      setOriginalReply(data.suggested_reply)  // new AI reply becomes the new baseline
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to regenerate reply')
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleCopy = () => {
    if (!editableReply) return
    navigator.clipboard.writeText(editableReply)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const handleSave = async () => {
    if (!result) return
    setIsSaving(true)
    try {
      const { data } = await axios.patch(`${API}/tickets/${result.id}`, {
        final_reply: editableReply,
        is_edited: true,
        status: 'In Progress'
      })
      setResult(data)
    } catch {
      alert('Failed to save updated reply')
    } finally {
      setIsSaving(false)
    }
  }

  const panelStyle = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-panel)',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

      {/* ── Left Panel: Ticket Form ── */}
      <div style={panelStyle}>
        {/* Panel title — no uppercase eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12l7-7 7 7" />
            </svg>
            <span className="panel-title">New Ticket</span>
          </div>
          {(form.subject || form.description || result) && (
            <button
              type="button"
              onClick={() => {
                setForm({ subject: '', description: '', submitter_email: '' })
                setResult(null)
                setEditableReply('')
                setOriginalReply('')
                setErrors({})
              }}
              className="btn-ghost"
              style={{ fontSize: 11, padding: '3px 8px' }}
            >
              Reset Form
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Subject */}
          <div>
            <label htmlFor="subject" style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>
              Subject <span style={{ color: '#f09090' }}>*</span>
            </label>
            <input
              id="subject"
              name="subject"
              type="text"
              value={form.subject}
              onChange={handleChange}
              placeholder="e.g. Unable to export invoice to PDF"
              className="tt-input"
              style={{ borderColor: errors.subject ? 'var(--color-high)' : undefined }}
            />
            {errors.subject && (
              <p style={{ marginTop: 4, fontSize: 11, color: '#f09090' }}>{errors.subject}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>
              Description <span style={{ color: '#f09090' }}>*</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={6}
              value={form.description}
              onChange={handleChange}
              placeholder="Provide details about the issue, impact, and expected behavior..."
              className="tt-input"
              style={{ resize: 'none', borderColor: errors.description ? 'var(--color-high)' : undefined }}
            />
            {errors.description && (
              <p style={{ marginTop: 4, fontSize: 11, color: '#f09090' }}>{errors.description}</p>
            )}
          </div>

          {/* Submitter Email */}
          <div>
            <label htmlFor="submitter_email" style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>
              Submitter Email{' '}
              <span style={{ fontSize: 10, color: 'var(--text-ghost)' }}>(optional)</span>
            </label>
            <input
              id="submitter_email"
              name="submitter_email"
              type="email"
              value={form.submitter_email}
              onChange={handleChange}
              placeholder="user@example.com"
              className="tt-input"
            />
          </div>

          {submitError && (
            <div style={{
              padding: '10px 12px',
              borderRadius: 6,
              backgroundColor: 'rgba(226, 75, 74, 0.10)',
              border: '1px solid rgba(226, 75, 74, 0.25)',
              color: '#f09090',
              fontSize: 12,
            }}>
              {submitError}
            </div>
          )}

          {/* Submit CTA */}
          <button
            type="submit"
            id="btn-submit-ticket"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', marginTop: 2 }}
          >
            {loading ? (
              <>
                <svg style={{ animation: 'spin 1s linear infinite', width: 15, height: 15 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                </svg>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <span>Analysing with Gemini...</span>
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <span>Submit Ticket</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* ── Right Panel: Classification Result ── */}
      <div style={panelStyle}>
        {loading ? (
          /* Skeleton mimics result shape */
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              <div className="skeleton" style={{ width: 16, height: 16, borderRadius: 4 }} />
              <div className="skeleton" style={{ width: 140, height: 14, borderRadius: 4 }} />
            </div>
            <ResultSkeleton />
          </>
        ) : result ? (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Panel header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="panel-title">Classification Result</span>
              </div>
              <span
                className="font-mono-data"
                style={{
                  fontSize: 10,
                  color: 'var(--accent)',
                  backgroundColor: 'var(--accent-faint)',
                  border: '1px solid rgba(79,110,247,0.2)',
                  padding: '2px 7px',
                  borderRadius: 4,
                }}
              >
                {result.prompt_version || 'v1.0'}
              </span>
            </div>

            {/* ── Flat metadata strip (4 columns) — no nested cards ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 0,
              backgroundColor: 'var(--bg-base)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-control)',
              overflow: 'hidden',
            }}>
              {/* Category */}
              <div style={{ padding: '10px 12px', borderRight: '1px solid var(--border)' }}>
                <div className="data-label" style={{ marginBottom: 6 }}>Category</div>
                <span className={categoryBadgeClass(result.category)}>{result.category}</span>
              </div>
              {/* Priority */}
              <div style={{ padding: '10px 12px', borderRight: '1px solid var(--border)' }}>
                <div className="data-label" style={{ marginBottom: 6 }}>Priority</div>
                <span className={priorityBadgeClass(result.priority)}>{result.priority}</span>
              </div>
              {/* Confidence */}
              <div style={{ padding: '10px 12px', borderRight: '1px solid var(--border)' }}>
                <div className="data-label" style={{ marginBottom: 6 }}>Confidence</div>
                <span className={confidenceBadgeClass(result.confidence)}>
                  {(result.confidence * 100).toFixed(0)}%
                </span>
              </div>
              {/* Status */}
              <div style={{ padding: '10px 12px' }}>
                <div className="data-label" style={{ marginBottom: 6 }}>Status</div>
                <span className={statusBadgeClass(result.status)}>{result.status}</span>
              </div>
            </div>

            {/* Reasoning — focal block */}
            <div>
              <div className="data-label" style={{ marginBottom: 6 }}>Reasoning</div>
              <div className="reasoning-block">{result.reasoning}</div>
            </div>

            {/* Reply Textarea */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                {result.is_edited ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#52C9A0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="data-label" style={{ color: '#52C9A0' }}>Final Reply (Saved)</span>
                  </div>
                ) : (
                  <div className="data-label">Suggested Reply</div>
                )}
                {editableReply !== originalReply && !result.is_edited && (
                  <span className="font-mono-data" style={{ fontSize: 10, color: '#FAC775' }}>Unsaved changes</span>
                )}
              </div>

              {/* Show original AI reply as reference when an edited version exists */}
              {result.is_edited && originalReply && editableReply !== originalReply && (
                <div style={{ marginBottom: 8 }}>
                  <div className="data-label" style={{ marginBottom: 4, color: 'var(--text-ghost)' }}>Original AI Suggestion</div>
                  <div style={{
                    padding: '8px 10px',
                    backgroundColor: 'var(--bg-base)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    maxHeight: 100,
                    overflowY: 'auto',
                  }}>
                    {originalReply}
                  </div>
                </div>
              )}

              <textarea
                rows={6}
                value={editableReply}
                onChange={(e) => {
                  setEditableReply(e.target.value)
                  if (result && result.status === 'Open') {
                    setResult(prev => ({ ...prev, status: 'In Progress' }))
                  }
                }}
                className="tt-input font-mono-data"
                style={{
                  resize: 'none',
                  fontSize: 12,
                  borderColor: result.is_edited && editableReply === (result.final_reply || originalReply)
                    ? 'rgba(82,201,160,0.35)' : undefined,
                }}
              />
              {/* Character count */}
              <div style={{ textAlign: 'right', fontSize: 10, color: 'var(--text-ghost)', marginTop: 3 }}>
                {editableReply.length} chars
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
              <button type="button" onClick={handleRegenerate} disabled={isRegenerating} className="btn-ghost" style={{ fontSize: 12 }}>
                <svg style={{ width: 13, height: 13, ...(isRegenerating ? { animation: 'spin 1s linear infinite' } : {}) }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 4v6h6" /><path d="M23 20v-6h-6" /><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
                </svg>
                <span>{isRegenerating ? 'Regenerating...' : 'Regenerate'}</span>
              </button>

              <button type="button" onClick={handleCopy} className="btn-ghost" style={{ fontSize: 12 }}>
                <svg style={{ width: 13, height: 13 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="btn-ghost"
                style={{ fontSize: 12, color: 'var(--accent)', borderColor: 'rgba(79,110,247,0.35)' }}
              >
                <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Empty state — awaiting submission */
          <div style={{
            flex: 1,
            minHeight: 400,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: 24,
            gap: 12,
          }}>
            {/* Icon cluster */}
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: 'var(--bg-raised)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 4,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                Awaiting Ticket Submission
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 240, margin: '0 auto', lineHeight: 1.6 }}>
                Submit a ticket on the left — Gemini will classify and draft a reply in seconds.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
