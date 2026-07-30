import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import TicketDetail from './TicketDetail'
import {
  priorityBadgeClass,
  categoryBadgeClass,
  confidenceBadgeClass,
  statusBadgeClass
} from '../utils/badgeHelpers'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const CATEGORIES = ['All', 'Billing', 'Bug', 'Feature Request', 'General']
const PRIORITIES  = ['All', 'High', 'Medium', 'Low']
const STATUSES    = ['All', 'Open', 'In Progress', 'Resolved']

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function TicketList() {
  const [tickets, setTickets]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  // Filters state
  const [category, setCategory]     = useState('All')
  const [priority, setPriority]     = useState('All')
  const [statusFilter, setStatus]   = useState('All')
  const [searchQuery, setSearch]    = useState('')

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (category !== 'All') params.category = category
      if (priority !== 'All') params.priority = priority
      const { data } = await axios.get(`${API}/tickets`, { params })
      setTickets(data)
    } catch {
      setError('Failed to load tickets. Is the backend service running?')
    } finally {
      setLoading(false)
    }
  }, [category, priority])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  const handleTicketUpdate = (updated) => {
    setTickets(prev => prev.map(t => t.id === updated.id ? updated : t))
  }

  const handleDelete = async (e, ticketId) => {
    e.stopPropagation()
    if (!window.confirm('Delete this ticket permanently? This cannot be undone.')) return
    setDeletingId(ticketId)
    try {
      await axios.delete(`${API}/tickets/${ticketId}`)
      setTickets(prev => prev.filter(t => t.id !== ticketId))
      if (expandedId === ticketId) setExpandedId(null)
    } catch {
      alert('Failed to delete ticket. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  // Client-side filtering for status and search query
  const filteredTickets = tickets.filter(t => {
    if (statusFilter !== 'All' && t.status !== statusFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchSubject = t.subject?.toLowerCase().includes(q)
      const matchEmail = t.submitter_email?.toLowerCase().includes(q)
      const matchId = t.id?.toLowerCase().includes(q)
      if (!matchSubject && !matchEmail && !matchId) return false
    }
    return true
  })

  return (
    <div className="w-full space-y-4">
      {/* ── Filters Row Above Table ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1A1D27] p-3 rounded-[10px] border border-[#1e2235]">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tickets by subject, email, or ID..."
            className="tt-input text-[12px] pl-8 py-1.5"
          />
          <svg className="w-3.5 h-3.5 text-[#7B7F96] absolute left-2.5 top-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Dropdown */}
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="tt-input text-[12px] py-1.5 px-2.5 w-auto cursor-pointer"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c} className="bg-[#0F1117] text-[#E8E9F0]">
                {c === 'All' ? 'Category: All' : c}
              </option>
            ))}
          </select>

          {/* Priority Dropdown */}
          <select
            value={priority}
            onChange={e => setPriority(e.target.value)}
            className="tt-input text-[12px] py-1.5 px-2.5 w-auto cursor-pointer"
          >
            {PRIORITIES.map(p => (
              <option key={p} value={p} className="bg-[#0F1117] text-[#E8E9F0]">
                {p === 'All' ? 'Priority: All' : p}
              </option>
            ))}
          </select>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={e => setStatus(e.target.value)}
            className="tt-input text-[12px] py-1.5 px-2.5 w-auto cursor-pointer"
          >
            {STATUSES.map(s => (
              <option key={s} value={s} className="bg-[#0F1117] text-[#E8E9F0]">
                {s === 'All' ? 'Status: All' : s}
              </option>
            ))}
          </select>

          {/* Refresh Button */}
          <button
            onClick={fetchTickets}
            className="btn-ghost text-[12px] py-1.5 px-2.5"
            title="Refresh tickets"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3 rounded-[6px] bg-[rgba(226,75,74,0.12)] border border-[#E24B4A]/30 text-[#f09595] text-[12px]">
          ⚠ {error}
        </div>
      )}

      {/* ── Table Card ── */}
      <div className="bg-[#1A1D27] border border-[#1e2235] rounded-[10px] p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#7B7F96] text-[12px]">
            Loading ticket list...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-12 text-center text-[#7B7F96]">
            <p className="text-[13px] font-medium text-[#E8E9F0] mb-1">No tickets match your filter</p>
            <p className="text-[11px]">Try adjusting your search query or filter options.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tt-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map(t => {
                  const isExpanded = expandedId === t.id
                  return (
                    <tr key={t.id} className="contents-group">
                      <td colSpan={6} className="p-0 border-b border-[#13151f]">
                        {/* Main row */}
                        <div
                          onClick={() => setExpandedId(isExpanded ? null : t.id)}
                          className="table-row-interactive flex items-center justify-between px-4 py-2.5 hover:bg-[#1c1f30] transition-colors cursor-pointer"
                        >
                          {/* Subject column */}
                          <div className="w-[28%] min-w-[180px] pr-2">
                            <div className="text-[#E8E9F0] text-[13px] font-medium truncate">
                              {t.subject}
                            </div>
                            {t.submitter_email && (
                              <div className="text-[11px] text-[#7B7F96] truncate">
                                {t.submitter_email}
                              </div>
                            )}
                          </div>

                          {/* Category */}
                          <div className="w-[15%]">
                            <span className={categoryBadgeClass(t.category)}>
                              {t.category}
                            </span>
                          </div>

                          {/* Priority */}
                          <div className="w-[12%]">
                            <span className={priorityBadgeClass(t.priority)}>
                              {t.priority}
                            </span>
                          </div>

                          {/* Confidence */}
                          <div className="w-[11%]">
                            <span className={confidenceBadgeClass(t.confidence)}>
                              {(t.confidence * 100).toFixed(0)}%
                            </span>
                          </div>

                          {/* Status */}
                          <div className="w-[13%]">
                            <span className={statusBadgeClass(t.status)}>
                              {t.status}
                            </span>
                          </div>

                          {/* Created At */}
                          <div className="w-[13%] font-mono-data text-[12px] text-[#7B7F96]">
                            {formatDate(t.created_at)}
                          </div>

                          {/* Delete Action */}
                          <div className="w-[8%] flex justify-end">
                            <button
                              onClick={(e) => handleDelete(e, t.id)}
                              disabled={deletingId === t.id}
                              title="Delete ticket"
                              className="p-1.5 rounded-md text-[#7B7F96] hover:text-[#E24B4A] hover:bg-[rgba(226,75,74,0.12)] transition-colors disabled:opacity-40"
                            >
                              {deletingId === t.id ? (
                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Expandable detail row */}
                        {isExpanded && (
                          <div className="px-4 pb-4 bg-[#13151f]/40">
                            <TicketDetail
                              ticket={t}
                              onUpdate={handleTicketUpdate}
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
