import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'

const API = 'http://localhost:8000'

// ── Color palettes ──────────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  Billing:         '#a78bfa',
  Bug:             '#f87171',
  'Feature Request': '#60a5fa',
  General:         '#9ca3af',
}

const PRIORITY_COLORS = {
  High:   '#f87171',
  Medium: '#fbbf24',
  Low:    '#4ade80',
}

// ── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color }) {
  return (
    <div className="rounded-xl p-5 glass" style={{ border: '1px solid var(--border)' }}>
      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-3xl font-bold" style={{ color: color || 'var(--text-primary)' }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  )
}

// ── Custom tooltip for charts ────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-4 py-2.5 text-sm" style={{ background: '#1e2130', border: '1px solid rgba(255,255,255,0.08)', color: '#f1f5f9' }}>
      <p className="font-medium mb-1">{label || payload[0]?.name}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <strong>{typeof p.value === 'number' && p.value < 2 ? `${Math.round(p.value * 100)}%` : p.value}</strong>
        </p>
      ))}
    </div>
  )
}

// ── Custom pie label ─────────────────────────────────────────────────────────
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) {
  if (percent < 0.06) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {Math.round(percent * 100)}%
    </text>
  )
}

export default function Analytics() {
  const [data, setData]     = useState(null)
  const [loading, setLoad]  = useState(true)
  const [error, setError]   = useState(null)

  const fetchAnalytics = async () => {
    setLoad(true)
    setError(null)
    try {
      const { data: res } = await axios.get(`${API}/analytics`)
      setData(res)
    } catch {
      setError('Failed to load analytics. Is the backend running?')
    } finally {
      setLoad(false)
    }
  }

  useEffect(() => { fetchAnalytics() }, [])

  // Build chart data structures
  const categoryData = data
    ? Object.entries(data.tickets_by_category).map(([name, count]) => ({ name, count }))
    : []

  const priorityData = data
    ? Object.entries(data.tickets_by_priority).map(([name, value]) => ({ name, value }))
    : []

  const confByCatData = data
    ? Object.entries(data.avg_confidence_by_category).map(([name, avg]) => ({
        name,
        confidence: Math.round(avg * 100),
      }))
    : []

  if (error) {
    return (
      <div className="animate-slide-up text-center py-20">
        <p className="text-sm" style={{ color: '#f87171' }}>⚠ {error}</p>
      </div>
    )
  }

  return (
    <div className="animate-slide-up">
      {/* Page heading */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-0.5">Analytics</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Real-time ticket intelligence</p>
        </div>
        <button
          id="btn-refresh-analytics"
          onClick={fetchAnalytics}
          className="btn-secondary text-sm px-4 py-2"
        >
          ↻ Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl p-5 glass" style={{ border: '1px solid var(--border)', height: 110 }}>
              <div className="skeleton h-3 w-24 rounded mb-3" />
              <div className="skeleton h-8 w-20 rounded" />
            </div>
          ))
        ) : data ? (
          <>
            <KpiCard
              label="Total Tickets"
              value={data.total_tickets}
              sub="all time"
              color="#818cf8"
            />
            <KpiCard
              label="Avg Confidence"
              value={`${Math.round(data.avg_confidence * 100)}%`}
              sub="across all classifications"
              color={data.avg_confidence >= 0.8 ? '#4ade80' : data.avg_confidence >= 0.5 ? '#fbbf24' : '#f87171'}
            />
            <KpiCard
              label="Resolved"
              value={`${data.pct_resolved}%`}
              sub="of all tickets"
              color="#4ade80"
            />
          </>
        ) : null}
      </div>

      {/* Charts grid */}
      {!loading && data && data.total_tickets === 0 && (
        <div className="text-center py-20 rounded-2xl glass" style={{ border: '1px solid var(--border)' }}>
          <div className="text-4xl mb-3">📊</div>
          <p className="text-white font-medium mb-1">No data yet</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Submit tickets to see analytics.</p>
        </div>
      )}

      {!loading && data && data.total_tickets > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tickets by Category */}
          <div className="rounded-2xl p-6 glass" style={{ border: '1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold mb-1 text-white">Tickets by Category</h3>
            <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>Volume distribution across ticket types</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#8892a4', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8892a4', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {categoryData.map((entry) => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#818cf8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tickets by Priority — donut */}
          <div className="rounded-2xl p-6 glass" style={{ border: '1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold mb-1 text-white">Tickets by Priority</h3>
            <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>Proportion of High / Medium / Low priority tickets</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  dataKey="value"
                  labelLine={false}
                  label={<PieLabel />}
                >
                  {priorityData.map((entry) => (
                    <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] || '#818cf8'} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span style={{ color: '#8892a4', fontSize: 12 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Avg confidence by category — horizontal bar */}
          <div className="rounded-2xl p-6 glass lg:col-span-2" style={{ border: '1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold mb-1 text-white">Average Confidence by Category</h3>
            <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
              How confidently the AI classifies each ticket type — lower scores surface categories worth reviewing
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={confByCatData} layout="vertical" margin={{ top: 0, right: 24, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fill: '#8892a4', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: '#8892a4', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={110}
                />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Avg Confidence']}
                  contentStyle={{ background: '#1e2130', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f1f5f9' }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="confidence" radius={[0, 6, 6, 0]}>
                  {confByCatData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={
                        entry.confidence >= 80 ? '#4ade80'
                        : entry.confidence >= 50 ? '#fbbf24'
                        : '#f87171'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
