// ── Shared Badge Helper Functions matching Design System Specification ──────

export function priorityBadgeClass(priority) {
  if (priority === 'High')   return 'badge-priority badge-priority-high'
  if (priority === 'Medium') return 'badge-priority badge-priority-medium'
  return 'badge-priority badge-priority-low'
}

export function categoryBadgeClass(category) {
  const map = {
    Bug: 'badge-category badge-category-bug',
    Billing: 'badge-category badge-category-billing',
    'Feature Request': 'badge-category badge-category-feature',
    General: 'badge-category badge-category-general'
  }
  return map[category] || 'badge-category badge-category-general'
}

export function confidenceBadgeClass(confidence) {
  if (confidence >= 0.8) return 'badge-confidence badge-confidence-high'
  if (confidence >= 0.5) return 'badge-confidence badge-confidence-medium'
  return 'badge-confidence badge-confidence-low'
}

export function statusBadgeClass(status) {
  if (status === 'Resolved') return 'badge-status badge-status-resolved'
  if (status === 'In Progress') return 'badge-status badge-status-inprogress'
  return 'badge-status badge-status-open'
}
