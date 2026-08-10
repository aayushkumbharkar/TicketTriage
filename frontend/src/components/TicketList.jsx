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
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}

/* ── Filter Pill Group ── */
function PillGroup({ label, options, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 11, color: 'var(--text-ghost)', fontWeight: 500, paddingRight: 2, whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`filter-pill ${value === opt ? 'filter-pill-active' : ''}`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

/* ── Skeleton rows while loading ── */
function SkeletonRows() {
  return (
    <>
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="animate-fade-slide-up"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.03)',
            gap: 12,
          }}
        >
          <div style={{ flex: '0 0 30%', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="skeleton" style={{ height: 13, width: '75%', borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 10, width: '50%', borderRadius: 4 }} />
          </div>
          <div className="skeleton" style={{ flex: '0 0 14%', height: 20, borderRadius: 4 }} />
          <div className="skeleton" style={{ flex: '0 0 12%', height: 20, borderRadius: 4 }} />
          <div className="skeleton" style={{ flex: '0 0 10%', height: 20, borderRadius: 4 }} />
          <div className="skeleton" style={{ flex: '0 0 12%', height: 20, borderRadius: 4 }} />
          <div className="skeleton" style={{ flex: '0 0 12%', height: 13, borderRadius: 4 }} />
        </div>
      ))}
    </>
  )
}

/* ── Empty State ── */
function EmptyState({ hasFilters }) {
  return (
    <div style={{
      padding: '56px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      gap: 10,
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        backgroundColor: 'var(--bg-raised)',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
        {hasFilters ? 'No tickets match your filters' : 'No tickets yet'}
      </p>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 220, lineHeight: 1.6 }}>
        {hasFilters
          ? 'Try adjusting the category, priority, or status filters above.'
          : 'Submit your first ticket from the Submit Ticket tab.'
        }
      </p>
    </div>
  )
}

export default function TicketList() {
  const [tickets, setTickets]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  // Filters
  const [category, setCategory]   = useState('All')
  const [priority, setPriority]   = useState('All')
  const [statusFilter, setStatus] = useState('All')
  const [searchQuery, setSearch]  = useState('')

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

  const filteredTickets = tickets.filter(t => {
    if (statusFilter !== 'All' && t.status !== statusFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const match = t.subject?.toLowerCase().includes(q) ||
                    t.submitter_email?.toLowerCase().includes(q) ||
                    t.id?.toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })

  const hasActiveFilters = category !== 'All' || priority !== 'All' || statusFilter !== 'All' || searchQuery.trim()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Filter Bar ── */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-panel)',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        {/* Search row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
            <svg
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by subject, email, or ID..."
              className="tt-input"
              style={{ paddingLeft: 30, fontSize: 12, paddingTop: 6, paddingBottom: 6 }}
            />
          </div>

          {/* Refresh button */}
          <button
            onClick={fetchTickets}
            className="btn-ghost"
            title="Refresh tickets"
            style={{ padding: '6px 10px', flexShrink: 0 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 4v6h6" /><path d="M23 20v-6h-6" /><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
            </svg>
          </button>

          {/* Ticket count */}
          {!loading && (
            <span className="font-mono-data" style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Pill filter rows */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <PillGroup label="Category" options={CATEGORIES} value={category} onChange={setCategory} />
          <div style={{ width: 1, height: 18, backgroundColor: 'var(--border)', flexShrink: 0 }} />
          <PillGroup label="Priority" options={PRIORITIES} value={priority} onChange={setPriority} />
          <div style={{ width: 1, height: 18, backgroundColor: 'var(--border)', flexShrink: 0 }} />
          <PillGroup label="Status" options={STATUSES} value={statusFilter} onChange={setStatus} />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 6,
          backgroundColor: 'rgba(226, 75, 74, 0.10)',
          border: '1px solid rgba(226, 75, 74, 0.25)',
          color: '#f09090',
          fontSize: 12,
        }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Table Card ── */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-panel)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <SkeletonRows />
        ) : filteredTickets.length === 0 ? (
          <EmptyState hasFilters={hasActiveFilters} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tt-table">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Subject</th>
                  <th style={{ width: '15%' }}>Category</th>
                  <th style={{ width: '12%' }}>Priority</th>
                  <th style={{ width: '11%' }}>Confidence</th>
                  <th style={{ width: '13%' }}>Status</th>
                  <th style={{ width: '15%' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((t, idx) => {
                  const isExpanded = expandedId === t.id
                  return (
                    <tr key={t.id} className="contents-group">
                      <td colSpan={6} style={{ padding: 0, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        {/* Main row — relative for the pseudo-element left bar */}
                        <div
                          className="animate-fade-slide-up table-row-hover-group"
                          onClick={() => setExpandedId(isExpanded ? null : t.id)}
                          style={{
                            animationDelay: `${idx * 20}ms`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 16px',
                            cursor: 'pointer',
                            position: 'relative',
                          }}
                        >
                          {/* Subject + email */}
                          <div style={{ flex: '0 0 30%', minWidth: 0, paddingRight: 12 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t.subject}
                            </div>
                            {t.submitter_email && (
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                                {t.submitter_email}
                              </div>
                            )}
                          </div>

                          {/* Category */}
                          <div style={{ flex: '0 0 15%' }}>
                            <span className={categoryBadgeClass(t.category)}>{t.category}</span>
                          </div>

                          {/* Priority */}
                          <div style={{ flex: '0 0 12%' }}>
                            <span className={priorityBadgeClass(t.priority)}>{t.priority}</span>
                          </div>

                          {/* Confidence */}
                          <div style={{ flex: '0 0 11%' }}>
                            <span className={confidenceBadgeClass(t.confidence)}>
                              {(t.confidence * 100).toFixed(0)}%
                            </span>
                          </div>

                          {/* Status */}
                          <div style={{ flex: '0 0 13%' }}>
                            <span className={statusBadgeClass(t.status)}>{t.status}</span>
                          </div>

                          {/* Created At */}
                          <div className="font-mono-data" style={{ flex: '0 0 15%', fontSize: 11, color: 'var(--text-muted)' }}>
                            {formatDate(t.created_at)}
                          </div>
                        </div>

                        {/* Expandable detail row */}
                        {isExpanded && (
                          <div className="animate-fade-in" style={{ padding: '0 16px 16px', backgroundColor: 'rgba(0,0,0,0.15)' }}>
                            <TicketDetail ticket={t} onUpdate={handleTicketUpdate} />
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
