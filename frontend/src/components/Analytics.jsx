import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts'
import { priorityBadgeClass } from '../utils/badgeHelpers'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const PRIORITY_COLORS = {
  High:   '#E24B4A',
  Medium: '#E8A830',
  Low:    '#52C9A0',
}

// Category → accent colour mapping (matched to badge system)
const CATEGORY_COLORS = {
  Bug:               '#4F6EF7',
  Billing:           '#D4537E',
  'Feature Request': '#378ADD',
  General:           '#888780',
}

// ── KPI Card with accent top border ──────────────────────────────────────────
function KpiCard({ label, value, accent = 'var(--accent)' }) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-panel)',
      borderTop: `2px solid ${accent}`,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.07em' }}>
        {label}
      </span>
      <span className="font-mono-data" style={{ fontSize: 24, color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1 }}>
        {value}
      </span>
    </div>
  )
}

// ── Chart Panel ───────────────────────────────────────────────────────────────
function ChartPanel({ title, children }) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-panel)',
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
        {title}
      </span>
      {children}
    </div>
  )
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      backgroundColor: 'var(--bg-raised)',
      border: '1px solid var(--border-strong)',
      borderRadius: 6,
      padding: '8px 12px',
      fontSize: 12,
      color: 'var(--text-primary)',
      boxShadow: 'var(--shadow-panel)',
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
        {label || payload[0]?.name}
      </p>
      {payload.map((p, i) => (
        <p key={i} className="font-mono-data" style={{ color: p.color || 'var(--accent)' }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

// ── Custom Donut Label ────────────────────────────────────────────────────────
function DonutLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.06) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central"
      style={{ fontSize: 11, fontWeight: 600, fontFamily: 'Geist Mono, JetBrains Mono, monospace' }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

// ── KPI Skeleton ──────────────────────────────────────────────────────────────
function KpiSkeleton() {
  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-panel)',
      borderTop: '2px solid var(--border)',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <div className="skeleton" style={{ height: 10, width: '60%', borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 24, width: '40%', borderRadius: 4 }} />
    </div>
  )
}

export default function Analytics() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: res } = await axios.get(`${API}/analytics`)
      setData(res)
    } catch {
      setError('Failed to load analytics data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAnalytics() }, [])

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

  const openCount = data
    ? (data.tickets_by_priority ? Object.values(data.tickets_by_priority).reduce((a, b) => a + b, 0) : 0)
    : 0

  if (error) {
    return (
      <div style={{
        padding: '10px 14px',
        borderRadius: 6,
        backgroundColor: 'rgba(226,75,74,0.10)',
        border: '1px solid rgba(226,75,74,0.25)',
        color: '#f09090',
        fontSize: 12,
      }}>
        ⚠ {error}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Page Header (no uppercase eyebrow) ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Analytics
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Classification performance and ticket distribution
          </p>
        </div>
        <button onClick={fetchAnalytics} className="btn-ghost" style={{ fontSize: 12 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4v6h6" /><path d="M23 20v-6h-6" /><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* ── KPI Cards (4 across) — each with distinct accent top border ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {loading ? (
          [...Array(4)].map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <KpiCard label="Total Tickets"    value={data?.total_tickets ?? 0}                           accent="var(--accent)" />
            <KpiCard label="Avg Confidence"   value={`${Math.round((data?.avg_confidence ?? 0) * 100)}%`} accent="#52C9A0" />
            <KpiCard label="% Resolved"       value={`${data?.pct_resolved ?? 0}%`}                       accent="#E8A830" />
            <KpiCard label="Total Volume"     value={openCount}                                           accent="#E24B4A" />
          </>
        )}
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* 1. Bar Chart: Tickets by Category */}
        <ChartPanel title="Tickets by Category">
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'Geist, Inter, sans-serif' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(79,110,247,0.06)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {categoryData.map((entry, idx) => (
                    <Cell key={idx} fill={CATEGORY_COLORS[entry.name] || 'var(--accent)'} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        {/* 2. Donut Chart: Tickets by Priority */}
        <ChartPanel title="Tickets by Priority">
          <div style={{ height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={76}
                  dataKey="value"
                  labelLine={false}
                  label={<DonutLabel />}
                >
                  {priorityData.map((entry) => (
                    <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] || 'var(--accent)'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Priority legend */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            {['High', 'Medium', 'Low'].map(p => (
              <span key={p} className={priorityBadgeClass(p)}>{p}</span>
            ))}
          </div>
        </ChartPanel>

      </div>

      {/* ── 3. Horizontal Bar: Avg Confidence by Category ── */}
      <ChartPanel title="Avg Confidence per Category">
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={confByCatData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'Geist, Inter, sans-serif' }}
                axisLine={false}
                tickLine={false}
                width={115}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(79,110,247,0.06)' }} />
              <Bar dataKey="confidence" radius={[0, 4, 4, 0]}>
                {confByCatData.map((entry) => {
                  const fill = entry.confidence >= 80 ? '#52C9A0'
                             : entry.confidence >= 50 ? '#E8A830'
                             : '#E24B4A'
                  return <Cell key={entry.name} fill={fill} fillOpacity={0.9} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartPanel>

    </div>
  )
}
