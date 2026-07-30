import { useState } from 'react'
import axios from 'axios'
import {
  categoryBadgeClass,
  priorityBadgeClass,
  confidenceBadgeClass,
  statusBadgeClass
} from '../utils/badgeHelpers'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function TicketForm() {
  const [form, setForm] = useState({ subject: '', description: '', submitter_email: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [submitError, setSubmitError] = useState(null)
  
  // Editable reply state for result panel
  const [editableReply, setEditableReply] = useState('')
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
        subject:          form.subject.trim(),
        description:      form.description.trim(),
        submitter_email:  form.submitter_email.trim() || undefined,
      })
      setResult(data)
      setEditableReply(data.suggested_reply || '')
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
      setResult(prev => ({ ...prev, suggested_reply: data.suggested_reply }))
      setEditableReply(data.suggested_reply)
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
        is_edited: true
      })
      setResult(data)
    } catch {
      alert('Failed to save updated reply')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="w-full">
      {/* 2-Column Grid (1fr 1fr) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ── Left Card: Ticket Form ── */}
        <div className="bg-[#1A1D27] border border-[#1e2235] rounded-[10px] p-5 flex flex-col justify-between">
          <div>
            <div className="section-label">NEW TICKET</div>
            
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Subject */}
              <div>
                <label htmlFor="subject" className="block text-[11px] font-medium text-[#7B7F96] mb-1">
                  Subject <span className="text-[#f09595]">*</span>
                </label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  value={form.subject}
                  onChange={handleChange}
                  placeholder="e.g. Unable to export invoice to PDF"
                  className="tt-input"
                  style={{ borderColor: errors.subject ? '#E24B4A' : undefined }}
                />
                {errors.subject && (
                  <p className="mt-1 text-[11px] text-[#f09595]">{errors.subject}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-[11px] font-medium text-[#7B7F96] mb-1">
                  Description <span className="text-[#f09595]">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={5}
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Provide details about the issue, impact, and expected behavior..."
                  className="tt-input resize-none"
                  style={{ borderColor: errors.description ? '#E24B4A' : undefined }}
                />
                {errors.description && (
                  <p className="mt-1 text-[11px] text-[#f09595]">{errors.description}</p>
                )}
              </div>

              {/* Submitter Email */}
              <div>
                <label htmlFor="submitter_email" className="block text-[11px] font-medium text-[#7B7F96] mb-1">
                  Submitter Email <span className="text-[10px] text-[#3d4060]">(optional)</span>
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
                <div className="p-3 rounded-md bg-[rgba(226,75,74,0.12)] border border-[#E24B4A]/30 text-[#f09595] text-[12px]">
                  {submitError}
                </div>
              )}

              {/* Primary CTA Submit Button */}
              <button
                type="submit"
                id="btn-submit-ticket"
                disabled={loading}
                className="btn-primary w-full mt-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    <span>Analysing with Gemini...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    <span>Submit Ticket</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ── Right Card: Classification Result ── */}
        <div className="bg-[#1A1D27] border border-[#1e2235] rounded-[10px] p-5 flex flex-col justify-between">
          {result ? (
            <div className="space-y-4">
              {/* Header row */}
              <div className="flex items-center justify-between border-b border-[#1e2235] pb-3">
                <div className="section-label mb-0">CLASSIFICATION RESULT</div>
                <span className="font-mono-data text-[10px] text-[#6C63FF] bg-[rgba(108,99,255,0.1)] border border-[rgba(108,99,255,0.2)] px-2 py-0.5 rounded-[4px]">
                  {result.prompt_version || 'v1.0'}
                </span>
              </div>

              {/* 2x2 Grid of Mini Stat Boxes */}
              <div className="grid grid-cols-2 gap-3">
                {/* Category */}
                <div className="bg-[#0F1117] border border-[#1e2235] rounded-[6px] p-2.5 flex flex-col justify-center">
                  <span className="text-[10px] text-[#7B7F96] uppercase tracking-wider mb-1">Category</span>
                  <div>
                    <span className={categoryBadgeClass(result.category)}>
                      {result.category}
                    </span>
                  </div>
                </div>

                {/* Priority */}
                <div className="bg-[#0F1117] border border-[#1e2235] rounded-[6px] p-2.5 flex flex-col justify-center">
                  <span className="text-[10px] text-[#7B7F96] uppercase tracking-wider mb-1">Priority</span>
                  <div>
                    <span className={priorityBadgeClass(result.priority)}>
                      {result.priority}
                    </span>
                  </div>
                </div>

                {/* Confidence */}
                <div className="bg-[#0F1117] border border-[#1e2235] rounded-[6px] p-2.5 flex flex-col justify-center">
                  <span className="text-[10px] text-[#7B7F96] uppercase tracking-wider mb-1">Confidence</span>
                  <span className={confidenceBadgeClass(result.confidence)}>
                    {(result.confidence * 100).toFixed(0)}%
                  </span>
                </div>

                {/* Status */}
                <div className="bg-[#0F1117] border border-[#1e2235] rounded-[6px] p-2.5 flex flex-col justify-center">
                  <span className="text-[10px] text-[#7B7F96] uppercase tracking-wider mb-1">Status</span>
                  <div>
                    <span className={statusBadgeClass(result.status)}>
                      {result.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reasoning Box */}
              <div>
                <span className="text-[10px] text-[#7B7F96] uppercase tracking-wider block mb-1">Reasoning</span>
                <div className="bg-[#0F1117] border-l-2 border-l-[#6C63FF] border border-[#1e2235] border-l-0 rounded-r-[6px] p-3 text-[12px] text-[#c8cad8] leading-[1.5]">
                  {result.reasoning}
                </div>
              </div>

              {/* Reply Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[#7B7F96] uppercase tracking-wider">Suggested Reply</span>
                  {result.is_edited && (
                    <span className="font-mono-data text-[10px] text-[#FAC775]">Edited</span>
                  )}
                </div>
                <textarea
                  rows={5}
                  value={editableReply}
                  onChange={(e) => setEditableReply(e.target.value)}
                  className="tt-input resize-none text-[12px]"
                />
              </div>

              {/* Action Buttons (Ghost style) */}
              <div className="flex items-center justify-end gap-2 pt-2">
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
                  <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn-ghost text-[12px] text-[#6C63FF] border-[#6C63FF]/30 hover:border-[#6C63FF]"
                >
                  <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-center p-6 text-[#7B7F96]">
              <div className="w-10 h-10 rounded-full bg-[#13151f] border border-[#1e2235] flex items-center justify-center mb-3 text-[#6C63FF]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-[13px] font-medium text-[#E8E9F0] mb-1">Awaiting Ticket Submission</span>
              <p className="text-[11px] text-[#7B7F96] max-w-[240px]">
                Submit a new ticket on the left to trigger real-time Gemini AI triage and reply drafting.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
