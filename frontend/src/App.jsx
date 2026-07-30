import { useState } from 'react'
import TicketForm from './components/TicketForm'
import TicketList from './components/TicketList'
import Analytics from './components/Analytics'

const NAV_ITEMS = [
  {
    id: 'submit',
    label: 'Submit Ticket',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    )
  },
  {
    id: 'tickets',
    label: 'Ticket List',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    )
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('submit')

  return (
    <div className="flex min-h-screen bg-[#0F1117] text-[#E8E9F0] font-sans antialiased">
      {/* ── Left Sidebar (200px fixed width) ── */}
      <aside className="w-[200px] min-w-[200px] bg-[#13151f] border-r border-[#1e2235] flex flex-col justify-between p-4 sticky top-0 h-screen">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-2 py-3 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#6C63FF] shrink-0" />
            <span className="text-[15px] font-semibold text-[#E8E9F0] tracking-tight">TicketTriage</span>
          </div>

          {/* Navigation items */}
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map(item => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors ${
                    isActive
                      ? 'bg-[#1c1f30] text-[#E8E9F0]'
                      : 'text-[#7B7F96] hover:text-[#E8E9F0] hover:bg-[#1A1D27]/50'
                  }`}
                >
                  <span className={isActive ? 'text-[#6C63FF]' : 'text-[#7B7F96]'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Bottom Sidebar Version Tag */}
        <div className="px-3 py-2 border-t border-[#1e2235]/50">
          <span className="font-mono-data text-[10px] text-[#3d4060]">
            v1.0 · SQLite
          </span>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0F1117]">
        {/* Top Header with Pill Tabs */}
        <header className="h-14 border-b border-[#1e2235] px-6 flex items-center justify-between sticky top-0 bg-[#0F1117] z-10">
          <div className="bg-[#13151f] p-1 rounded-md border border-[#1e2235] flex items-center gap-1">
            {NAV_ITEMS.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                    isActive
                      ? 'bg-[#1A1D27] text-[#E8E9F0]'
                      : 'text-[#7B7F96] hover:text-[#E8E9F0]'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#7B7F96]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5DCAA5]" />
            <span>API Online</span>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {activeTab === 'submit'    && <TicketForm />}
          {activeTab === 'tickets'   && <TicketList />}
          {activeTab === 'analytics' && <Analytics />}
        </main>
      </div>
    </div>
  )
}
