import { useState } from 'react'
import TicketForm from './components/TicketForm'
import TicketList from './components/TicketList'
import Analytics from './components/Analytics'

/* ── Icons (inline SVG — no external dependency) ── */
const IconTriageMark = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="18" height="18" rx="5" fill="var(--accent)" />
    <path
      d="M9 4L11.2 8.4H13.8L11.8 10.8L12.6 14L9 12L5.4 14L6.2 10.8L4.2 8.4H6.8L9 4Z"
      fill="white"
      strokeWidth="0"
    />
  </svg>
)

const IconSubmit = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12l7-7 7 7" />
  </svg>
)

const IconList = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
)

const IconAnalytics = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 20V10M12 20V4M6 20v-6" />
  </svg>
)

const NAV_ITEMS = [
  { id: 'submit',    label: 'Submit Ticket', icon: <IconSubmit /> },
  { id: 'tickets',   label: 'Ticket List',   icon: <IconList /> },
  { id: 'analytics', label: 'Analytics',     icon: <IconAnalytics /> },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('submit')

  return (
    <div className="flex min-h-screen antialiased" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      {/* ── Left Sidebar ── */}
      <aside
        style={{
          width: 210,
          minWidth: 210,
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '16px 10px',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <div>
          {/* Logo — distinct brand mark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', marginBottom: 20 }}>
            <IconTriageMark />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              TicketTriage
            </span>
          </div>

          {/* Navigation */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV_ITEMS.map(item => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '8px 10px',
                    borderRadius: 7,
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    border: 'none',
                    cursor: 'pointer',
                    transition: `background-color var(--duration-fast) var(--ease-out-quart), color var(--duration-fast) var(--ease-out-quart)`,
                    textAlign: 'left',
                    // Active: tinted background + accent text + left bar
                    backgroundColor: isActive ? 'var(--accent-faint)' : 'transparent',
                    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                    // Left accent bar via box-shadow (no extra DOM)
                    boxShadow: isActive ? 'inset 2px 0 0 var(--accent)' : 'none',
                  }}
                >
                  <span style={{ opacity: isActive ? 1 : 0.7, flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}>
                    {item.label}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Bottom version tag */}
        <div style={{ padding: '10px', borderTop: '1px solid var(--border)', marginTop: 8 }}>
          <span className="font-mono-data" style={{ fontSize: 10, color: 'var(--text-ghost)' }}>
            v1.0 · SQLite · Gemini
          </span>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, backgroundColor: 'var(--bg-base)' }}>

        {/* Top Header */}
        <header
          style={{
            height: 52,
            borderBottom: '1px solid var(--border)',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            backgroundColor: 'var(--bg-base)',
            zIndex: 10,
          }}
        >
          {/* Pill tab bar */}
          <div
            style={{
              backgroundColor: 'var(--bg-sidebar)',
              padding: '3px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            {NAV_ITEMS.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    border: 'none',
                    cursor: 'pointer',
                    transition: `background-color var(--duration-fast) var(--ease-out-quart), color var(--duration-fast) var(--ease-out-quart), box-shadow var(--duration-fast) var(--ease-out-quart)`,
                    backgroundColor: isActive ? 'var(--bg-raised)' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* API status chip with pulse ring */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {/* Pulse ring indicator */}
            <span style={{ position: 'relative', display: 'flex', width: 8, height: 8 }}>
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  backgroundColor: '#52C9A0',
                  opacity: 0.5,
                  animation: 'pulsePing 2s ease-in-out infinite',
                }}
              />
              <span
                style={{
                  position: 'relative',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#52C9A0',
                }}
              />
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>API Online</span>
          </div>
        </header>

        {/* Content Area — preserve component state across tab switching */}
        <main style={{ flex: 1, padding: 24, maxWidth: 1280, width: '100%', margin: '0 auto' }}>
          <div className="animate-fade-slide-up" style={{ display: activeTab === 'submit' ? 'block' : 'none' }}>
            <TicketForm />
          </div>
          <div className="animate-fade-slide-up" style={{ display: activeTab === 'tickets' ? 'block' : 'none' }}>
            <TicketList />
          </div>
          <div className="animate-fade-slide-up" style={{ display: activeTab === 'analytics' ? 'block' : 'none' }}>
            <Analytics />
          </div>
        </main>
      </div>
    </div>
  )
}
