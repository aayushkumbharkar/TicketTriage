import { useState } from 'react'
import axios from 'axios'
import TicketDetail from './TicketDetail'

const API = 'http://localhost:8000'

// ── Loading skeleton while LLM is processing ──────────────────────────────
function SubmissionSkeleton() {
  return (
    <div className="animate-fade-in mt-8 rounded-2xl p-6 glass" style={{ border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="skeleton w-8 h-8 rounded-full" />
        <div className="skeleton w-48 h-5 rounded" />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-5">
        {[...Array(4)].map((_, i) => (
          <div key={i}>
            <div className="skeleton w-24 h-3 rounded mb-2" />
            <div className="skeleton w-full h-8 rounded" />
          </div>
        ))}
      </div>
      <div className="skeleton w-full h-3 rounded mb-2" />
      <div className="skeleton w-5/6 h-3 rounded mb-5" />
      <div className="skeleton w-full h-28 rounded" />
      <div className="flex gap-3 mt-4">
        <div className="skeleton w-36 h-9 rounded" />
        <div className="skeleton w-28 h-9 rounded" />
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
        subject:          form.subject.trim(),
        description:      form.description.trim(),
        submitter_email:  form.submitter_email.trim() || undefined,
      })
      setResult(data)
      setForm({ subject: '', description: '', submitter_email: '' })
    } catch (err) {
      const msg = err.response?.data?.detail || 'Something went wrong. Please try again.'
      setSubmitError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      {/* Page heading */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-1">New Support Ticket</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Describe your issue and our AI will classify it and draft a response instantly.
        </p>
      </div>

      {/* Form card */}
      <div className="rounded-2xl p-6 glass" style={{ border: '1px solid var(--border)' }}>
        <form onSubmit={handleSubmit} noValidate>
          {/* Subject */}
          <div className="mb-5">
            <label htmlFor="subject" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Subject <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              id="subject"
              name="subject"
              type="text"
              value={form.subject}
              onChange={handleChange}
              placeholder="e.g. Unable to export invoice PDF"
              className="input-field px-4 py-3"
              style={{ borderColor: errors.subject ? '#f87171' : undefined }}
              aria-describedby={errors.subject ? 'subject-error' : undefined}
            />
            {errors.subject && (
              <p id="subject-error" className="mt-1.5 text-xs" style={{ color: '#f87171' }}>{errors.subject}</p>
            )}
          </div>

          {/* Description */}
          <div className="mb-5">
            <label htmlFor="description" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Description <span style={{ color: '#f87171' }}>*</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={5}
              value={form.description}
              onChange={handleChange}
              placeholder="Describe the issue in detail — what you expected, what happened, and any steps to reproduce."
              className="input-field px-4 py-3 resize-none"
              style={{ borderColor: errors.description ? '#f87171' : undefined }}
              aria-describedby={errors.description ? 'description-error' : undefined}
            />
            {errors.description && (
              <p id="description-error" className="mt-1.5 text-xs" style={{ color: '#f87171' }}>{errors.description}</p>
            )}
          </div>

          {/* Email (optional) */}
          <div className="mb-6">
            <label htmlFor="submitter_email" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Your Email <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>(optional)</span>
            </label>
            <input
              id="submitter_email"
              name="submitter_email"
              type="email"
              value={form.submitter_email}
              onChange={handleChange}
              placeholder="you@company.com"
              className="input-field px-4 py-3"
            />
          </div>

          {/* Submit error */}
          {submitError && (
            <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
              ⚠ {submitError}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            id="btn-submit-ticket"
            disabled={loading}
            className="btn-primary w-full py-3 text-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Analysing with Gemini…
              </span>
            ) : 'Submit & Classify →'}
          </button>
        </form>
      </div>

      {/* Skeleton while loading */}
      {loading && <SubmissionSkeleton />}

      {/* Result */}
      {result && !loading && (
        <div className="mt-6 animate-slide-up">
          <div className="flex items-center gap-2 mb-4">
            <span style={{ color: '#4ade80', fontSize: '1.1rem' }}>✓</span>
            <span className="text-sm font-medium text-white">Ticket classified and stored</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
              {result.id.slice(0, 8)}…
            </span>
          </div>
          <TicketDetail ticket={result} onUpdate={setResult} />
        </div>
      )}
    </div>
  )
}
