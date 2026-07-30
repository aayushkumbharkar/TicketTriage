import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import TicketDetail from './TicketDetail'
import { priorityBadgeClass, categoryBadgeClass, confidenceBadgeClass } from '../utils/badgeHelpers'

const API = 'http://localhost:8000'

const CATEGORIES = ['All', 'Billing', 'Bug', 'Feature Request', 'General']
const PRIORITIES  = ['All', 'High', 'Medium', 'Low']
const STATUSES    = ['Open', 'In Progress', 'Resolved']

function StatusSelect({ ticketId, current, onChange }) {
  const [value, setValue]   = useState(current)
  const [saving, setSaving] = useState(false)

  const statusStyle = {
    Open:        'status-open',
    'In Progress': 'status-inprogress',
    Resolved:    'status-resolved',
  }

  const handleChange = async (e) => {
    const next = e.target.value
    setValue(next)
    setSaving(true)
    try {
      await axios.patch(`${API}/tickets/${ticketId}`, { status: next })
      onChange?.(ticketId, next)
    } catch {
      setValue(current)
    } finally {
      setSaving(false)
    }
  }

  return (
    <select
      id={`status-${ticketId}`}
      value={value}
      onChange={handleChange}
      disabled={saving}
      onClick={e => e.stopPropagation()}
      className={`text-xs font-medium rounded-full px-3 py-1 border-0 cursor-pointer ${statusStyle[value]}`}
      style={{ background: 'transparent', outline: 'none', WebkitAppearance: 'none' }}
    >
      {STATUSES.map(s => <option key={s} value={s} style={{ background: '#1e2130', color: '#f1f5f9' }}>{s}</option>)}
    </select>
  )
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function TicketList() {
  const [tickets, setTickets]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [category, setCategory]     = useState('All')
  const [priority, setPriority]     = useState('All')

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (category !== 'All') params.category = category
      if (priority !== 'All') params.priority  = priority
      const { data } = await axios.get(`${API}/tickets`, { params })
      setTickets(data)
    } catch {
      setError('Failed to load tickets. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [category, priority])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  const handleStatusChange = (id, newStatus) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t))
  }

  const handleTicketUpdate = (updated) => {
    setTickets(prev => prev.map(t => t.id === updated.id ? updated : t))
  }

  return (
    <div className="animate-slide-up">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-0.5">Ticket List</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {loading ? 'Loading…' : `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div>
            <label htmlFor="filter-category" className="sr-only">Category</label>
            <select
              id="filter-category"
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="text-sm rounded-lg px-3 py-2 border cursor-pointer"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', borderColor: 'var(--border)', outline: 'none' }}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="filter-priority" className="sr-only">Priority</label>
            <select
              id="filter-priority"
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="text-sm rounded-lg px-3 py-2 border cursor-pointer"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', borderColor: 'var(--border)', outline: 'none' }}
            >
              {PRIORITIES.map(p => <option key={p} value={p}>{p === 'All' ? 'All Priorities' : p}</option>)}
            </select>
          </div>

          <button
            id="btn-refresh-tickets"
            onClick={fetchTickets}
            className="btn-secondary text-sm px-3 py-2"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl p-4 mb-4 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
          ⚠ {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && tickets.length === 0 && (
        <div className="text-center py-20 rounded-2xl glass" style={{ border: '1px solid var(--border)' }}>
          <div className="text-4xl mb-3">📭</div>
          <p className="text-white font-medium mb-1">No tickets found</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {category !== 'All' || priority !== 'All' ? 'Try clearing your filters.' : 'Submit your first ticket to get started.'}
          </p>
        </div>
      )}

      {/* Table */}
      {!error && tickets.length > 0 && (
        <div className="rounded-2xl overflow-hidden glass" style={{ border: '1px solid var(--border)' }}>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 220 }}>Subject</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <>
                    <tr
                      key={t.id}
                      onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                      className={expandedId === t.id ? 'expanded' : ''}
                      style={{ transition: 'background 0.15s' }}
                    >
                      <td>
                        <div className="font-medium text-white truncate max-w-xs">{t.subject}</div>
                        {t.submitter_email && (
                          <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{t.submitter_email}</div>
                        )}
                      </td>
                      <td><span className={categoryBadgeClass(t.category)}>{t.category}</span></td>
                      <td><span className={priorityBadgeClass(t.priority)}>{t.priority}</span></td>
                      <td>
                        <span className={confidenceBadgeClass(t.confidence)}>
                          {Math.round(t.confidence * 100)}%
                        </span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <StatusSelect
                          ticketId={t.id}
                          current={t.status}
                          onChange={handleStatusChange}
                        />
                      </td>
                      <td className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(t.created_at)}
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {expandedId === t.id && (
                      <tr key={`${t.id}-detail`}>
                        <td colSpan={6} style={{ padding: '0 16px 16px' }}>
                          <TicketDetail
                            ticket={t}
                            onUpdate={updated => {
                              handleTicketUpdate(updated)
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Loading skeleton table */}
      {loading && (
        <div className="rounded-2xl overflow-hidden glass" style={{ border: '1px solid var(--border)' }}>
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="skeleton h-5 rounded" style={{ width: '30%' }} />
                <div className="skeleton h-5 rounded" style={{ width: '12%' }} />
                <div className="skeleton h-5 rounded" style={{ width: '12%' }} />
                <div className="skeleton h-5 rounded" style={{ width: '10%' }} />
                <div className="skeleton h-5 rounded" style={{ width: '12%' }} />
                <div className="skeleton h-4 rounded" style={{ width: '15%' }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
