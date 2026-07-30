import { useState } from 'react'
import TicketForm from './components/TicketForm'
import TicketList from './components/TicketList'
import Analytics from './components/Analytics'

const TABS = [
  { id: 'submit',    label: 'Submit Ticket',  icon: '✦' },
  { id: 'tickets',   label: 'Ticket List',    icon: '≡' },
  { id: 'analytics', label: 'Analytics',      icon: '◈' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('submit')

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* ── Header ── */}
      <header className="border-b" style={{ borderColor: 'var(--border)', background: 'rgba(15,17,23,0.95)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}
            >
              TT
            </div>
            <div>
              <h1 className="text-base font-700 text-white leading-tight" style={{ fontWeight: 700 }}>TicketTriage</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>AI Support Intelligence</p>
            </div>
          </div>

          {/* Nav tabs */}
          <nav className="flex items-center gap-1" style={{ background: 'var(--bg-surface)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border)' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
                style={{
                  color: activeTab === tab.id ? '#fff' : 'var(--text-muted)',
                  background: activeTab === tab.id
                    ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                    : 'transparent',
                  boxShadow: activeTab === tab.id ? '0 2px 12px rgba(99,102,241,0.35)' : 'none',
                }}
              >
                <span className="text-xs">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Status indicator */}
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            API Connected
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'submit'    && <TicketForm />}
        {activeTab === 'tickets'   && <TicketList />}
        {activeTab === 'analytics' && <Analytics />}
      </main>

      {/* ── Footer ── */}
      <footer className="text-center py-6 text-xs" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
        TicketTriage · AI-powered support triage · Built with Gemini Flash + FastAPI
      </footer>
    </div>
  )
}
