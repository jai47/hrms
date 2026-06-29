export function formatIssueKey(projectKey: string, issueNumber: number): string {
  return `${projectKey}-${issueNumber}`
}

export const ISSUE_STATUSES = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
] as const

export const ISSUE_PRIORITIES = [
  "LOWEST",
  "LOW",
  "MEDIUM",
  "HIGH",
  "HIGHEST",
] as const

export const ISSUE_TYPES = ["TASK", "BUG", "STORY", "EPIC"] as const
