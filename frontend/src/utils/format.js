import { format, parseISO, isValid } from 'date-fns'

export function formatCurrency(amount, { compact = false } = {}) {
  const value = Number(amount) || 0
  if (compact && Math.abs(value) >= 1_000_000) {
    return `Rs ${(value / 1_000_000).toFixed(1)}M`
  }
  if (compact && Math.abs(value) >= 1_000) {
    return `Rs ${(value / 1_000).toFixed(1)}K`
  }
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace('PKR', 'Rs')
}

export function formatNumber(value, decimals = 0) {
  return new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(value) || 0)
}

export function formatDate(value, pattern = 'dd MMM yyyy') {
  if (!value) return '—'
  const date = value instanceof Date ? value : parseISO(String(value))
  if (!isValid(date)) return '—'
  return format(date, pattern)
}

export function formatDateTime(value) {
  return formatDate(value, 'dd MMM yyyy, hh:mm a')
}

export const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card' },
  { value: 'online', label: 'Online' },
  { value: 'other', label: 'Other' },
]

export const projectStatuses = ['Planning', 'In Progress', 'On Hold', 'Completed']

export const poStatuses = ['Pending', 'Approved', 'Ordered', 'Cancelled', 'Received']