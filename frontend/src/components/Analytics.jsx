import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts'
import { priorityBadgeClass } from '../utils/badgeHelpers'

const API = 'http://localhost:8000'

const PRIORITY_COLORS = {
  High:   '#E24B4A',
  Medium: '#BA7517',
  Low:    '#1D9E75',
}

// ── KPI Card Component ─────────────────────────────────────────────────────
function KpiCard({ label, value }) {
  return (
    <div className="bg-[#1A1D27] border border-[#1e2235] rounded-[10px] p-[16px] flex flex-col justify-between">
      <span className="text-[11px] font-medium uppercase text-[#7B7F96] tracking-[0.06em] mb-2 block">
        {label}
      </span>
      <span className="font-mono-data text-[22px] text-[#FFFFFF] font-semibold leading-none">
        {value}
      </span>
    </div>
  )
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1A1D27] border border-[#1e2235] rounded-[6px] p-2.5 text-[12px] text-[#E8E9F0]">
      <p className="font-medium text-[#7B7F96] mb-1">{label || payload[0]?.name}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-mono-data" style={{ color: p.color || '#6C63FF' }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

// ── Custom Donut Label ─────────────────────────────────────────────────────
function DonutLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x}
      y={y}
      fill="#FFFFFF"
      textAnchor="middle"
      dominantBaseline="central"
      className="font-mono-data text-[11px] font-semibold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
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

  // Process data for charts
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
      <div className="p-4 rounded-[6px] bg-[rgba(226,75,74,0.12)] border border-[#E24B4A]/30 text-[#f09595] text-[12px]">
        ⚠ {error}
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="section-label mb-0">ANALYTICS DASHBOARD</div>
        <button
          onClick={fetchAnalytics}
          className="btn-ghost text-[12px] py-1 px-2.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* ── KPI Cards Row (4 Across) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Tickets"
          value={loading ? '...' : (data?.total_tickets ?? 0)}
        />
        <KpiCard
          label="Avg Confidence"
          value={loading ? '...' : `${Math.round((data?.avg_confidence ?? 0) * 100)}%`}
        />
        <KpiCard
          label="% Resolved"
          value={loading ? '...' : `${data?.pct_resolved ?? 0}%`}
        />
        <KpiCard
          label="Open Count"
          value={loading ? '...' : openCount}
        />
      </div>

      {/* ── Two Recharts Charts Below ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Bar Chart: Tickets by Category */}
        <div className="bg-[#1A1D27] border border-[#1e2235] rounded-[10px] p-5">
          <div className="section-label">TICKETS BY CATEGORY</div>
          
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#1e2235" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#7B7F96', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#7B7F96', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(108,99,255,0.08)' }} />
                <Bar dataKey="count" fill="#6C63FF" radius={[4, 4, 0, 0]}>
                  {categoryData.map((_, idx) => (
                    <Cell key={idx} fill="#6C63FF" className="hover:fill-[#a09df7] transition-colors" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Donut Chart: Tickets by Priority */}
        <div className="bg-[#1A1D27] border border-[#1e2235] rounded-[10px] p-5">
          <div className="section-label">TICKETS BY PRIORITY</div>
          
          <div className="h-[170px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  dataKey="value"
                  labelLine={false}
                  label={<DonutLabel />}
                >
                  {priorityData.map((entry) => (
                    <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] || '#6C63FF'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Custom Priority Legend */}
          <div className="flex items-center justify-center gap-3 pt-3 border-t border-[#1e2235]">
            {['High', 'Medium', 'Low'].map(p => (
              <span key={p} className={priorityBadgeClass(p)}>
                {p}
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* ── 3. Third Chart: Horizontal Bar of Avg Confidence Per Category ── */}
      <div className="bg-[#1A1D27] border border-[#1e2235] rounded-[10px] p-5">
        <div className="section-label">AVG CONFIDENCE PER CATEGORY</div>
        
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={confByCatData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid stroke="#1e2235" strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fill: '#7B7F96', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: '#7B7F96', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={110}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(108,99,255,0.08)' }} />
              <Bar dataKey="confidence" radius={[0, 4, 4, 0]}>
                {confByCatData.map((entry) => {
                  // Fill gradient logic per value from #6C63FF (low) to #5DCAA5 (high)
                  const fill = entry.confidence >= 80 ? '#5DCAA5' : entry.confidence >= 50 ? '#FAC775' : '#6C63FF'
                  return <Cell key={entry.name} fill={fill} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
