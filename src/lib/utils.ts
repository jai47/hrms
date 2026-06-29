import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function formatTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount)
}

export function calculateWorkHours(checkIn: Date | string, checkOut: Date | string): number {
  const start = new Date(checkIn)
  const end = new Date(checkOut)
  const diffMs = end.getTime() - start.getTime()
  return diffMs / (1000 * 60 * 60)
}

export function getAttendanceStatusColor(status: string): string {
  switch (status) {
    case "PRESENT":
      return "bg-green-100 text-green-800"
    case "LATE":
      return "bg-yellow-100 text-yellow-800"
    case "ABSENT":
      return "bg-red-100 text-red-800"
    case "EARLY_LEAVE":
      return "bg-orange-100 text-orange-800"
    case "HALF_DAY":
      return "bg-blue-100 text-blue-800"
    case "ON_LEAVE":
      return "bg-purple-100 text-purple-800"
    case "HOLIDAY":
      return "bg-gray-100 text-gray-800"
    case "REMOTE":
      return "bg-indigo-100 text-indigo-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export function getLeaveStatusColor(status: string): string {
  switch (status) {
    case "APPROVED":
      return "bg-green-100 text-green-800"
    case "PENDING":
      return "bg-yellow-100 text-yellow-800"
    case "REJECTED":
      return "bg-red-100 text-red-800"
    case "CANCELLED":
      return "bg-gray-100 text-gray-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export function getPerformanceRatingColor(rating: string): string {
  switch (rating) {
    case "EXCEEDS_EXPECTATIONS":
      return "bg-green-100 text-green-800"
    case "MEETS_EXPECTATIONS":
      return "bg-blue-100 text-blue-800"
    case "BELOW_EXPECTATIONS":
      return "bg-yellow-100 text-yellow-800"
    case "NEEDS_IMPROVEMENT":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function getIssueStatusColor(status: string): string {
  switch (status) {
    case "BACKLOG":
      return "bg-gray-100 text-gray-800"
    case "TODO":
      return "bg-slate-100 text-slate-800"
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-800"
    case "IN_REVIEW":
      return "bg-purple-100 text-purple-800"
    case "DONE":
      return "bg-green-100 text-green-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export function getIssuePriorityColor(priority: string): string {
  switch (priority) {
    case "LOWEST":
    case "LOW":
      return "bg-gray-100 text-gray-700"
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-800"
    case "HIGH":
      return "bg-orange-100 text-orange-800"
    case "HIGHEST":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export function getIssueTypeColor(type: string): string {
  switch (type) {
    case "BUG":
      return "bg-red-100 text-red-800"
    case "STORY":
      return "bg-green-100 text-green-800"
    case "EPIC":
      return "bg-purple-100 text-purple-800"
    default:
      return "bg-blue-100 text-blue-800"
  }
}