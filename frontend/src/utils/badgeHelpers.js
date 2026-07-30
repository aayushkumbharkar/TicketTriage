// ── Shared Badge Helper Functions ──────────────────────────────────────────

export function confidenceBadgeClass(confidence) {
  if (confidence >= 0.8) return 'badge conf-high'
  if (confidence >= 0.5) return 'badge conf-medium'
  return 'badge conf-low'
}

export function priorityBadgeClass(priority) {
  if (priority === 'High')   return 'badge badge-high'
  if (priority === 'Medium') return 'badge badge-medium'
  return 'badge badge-low'
}

export function categoryBadgeClass(category) {
  const map = {
    Billing: 'badge-billing',
    Bug: 'badge-bug',
    'Feature Request': 'badge-feature',
    General: 'badge-general'
  }
  return `badge ${map[category] || 'badge-general'}`
}
