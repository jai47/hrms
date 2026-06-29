"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { ISSUE_STATUSES, formatIssueKey } from "@/lib/projects"
import {
  getIssuePriorityColor,
  getIssueTypeColor,
} from "@/lib/utils"
import { GripVertical } from "lucide-react"

type Issue = {
  id: string
  issueNumber: number
  title: string
  type: string
  status: string
  priority: string
  assignee: { firstName: string; lastName: string } | null
}

const statusLabels: Record<string, string> = {
  BACKLOG: "Backlog",
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
}

function IssueCard({
  issue,
  projectId,
  projectKey,
  isDragging,
  onDragStart,
}: {
  issue: Issue
  projectId: string
  projectKey: string
  isDragging: boolean
  onDragStart: (e: React.DragEvent, issueId: string) => void
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, issue.id)}
      className={`bg-white rounded-lg border p-3 shadow-sm cursor-grab active:cursor-grabbing transition-opacity ${
        isDragging ? "opacity-50 border-primary" : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <Link
            href={`/projects/${projectId}/issues/${issue.id}`}
            className="block"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          >
            <p className="text-xs font-mono text-gray-500 mb-1">
              {formatIssueKey(projectKey, issue.issueNumber)}
            </p>
            <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
              {issue.title}
            </p>
          </Link>
          <div className="flex flex-wrap gap-1 mb-2">
            <Badge className={getIssueTypeColor(issue.type)}>{issue.type}</Badge>
            <Badge className={getIssuePriorityColor(issue.priority)}>
              {issue.priority}
            </Badge>
          </div>
          {issue.assignee && (
            <p className="text-xs text-gray-500">
              {issue.assignee.firstName} {issue.assignee.lastName}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function ProjectBoard({
  projectId,
  projectKey,
  issues: initialIssues,
}: {
  projectId: string
  projectKey: string
  issues: Issue[]
}) {
  const router = useRouter()
  const [issues, setIssues] = useState(initialIssues)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setIssues(initialIssues)
  }, [initialIssues])

  const handleDragStart = useCallback((e: React.DragEvent, issueId: string) => {
    e.dataTransfer.setData("text/issue-id", issueId)
    e.dataTransfer.effectAllowed = "move"
    setDraggingId(issueId)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggingId(null)
    setDropTarget(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, status: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDropTarget(status)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent, newStatus: string) => {
      e.preventDefault()
      setDropTarget(null)
      setDraggingId(null)

      const issueId = e.dataTransfer.getData("text/issue-id")
      if (!issueId) return

      const issue = issues.find((i) => i.id === issueId)
      if (!issue || issue.status === newStatus) return

      const previous = issues
      setIssues((prev) =>
        prev.map((i) => (i.id === issueId ? { ...i, status: newStatus } : i))
      )
      setSaving(true)

      try {
        const response = await fetch(`/api/issues/${issueId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        })
        if (!response.ok) {
          setIssues(previous)
        } else {
          router.refresh()
        }
      } catch {
        setIssues(previous)
      } finally {
        setSaving(false)
      }
    },
    [issues, router]
  )

  return (
    <div>
      {saving && (
        <p className="text-xs text-gray-500 mb-2">Saving...</p>
      )}
      <p className="text-xs text-gray-500 mb-3">
        Drag cards between columns to update status
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {ISSUE_STATUSES.map((status) => {
          const columnIssues = issues.filter((i) => i.status === status)
          const isTarget = dropTarget === status
          return (
            <div
              key={status}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={() => setDropTarget(null)}
              onDrop={(e) => handleDrop(e, status)}
              className={`rounded-lg p-3 min-w-[220px] min-h-[120px] transition-colors ${
                isTarget ? "bg-blue-50 ring-2 ring-blue-300" : "bg-gray-100"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">{statusLabels[status]}</h3>
                <Badge variant="secondary" className="text-xs">
                  {columnIssues.length}
                </Badge>
              </div>
              <div className="space-y-2" onDragEnd={handleDragEnd}>
                {columnIssues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    projectId={projectId}
                    projectKey={projectKey}
                    isDragging={draggingId === issue.id}
                    onDragStart={handleDragStart}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function SprintListPanel({
  projectId,
  sprints,
}: {
  projectId: string
  sprints: Array<{
    id: string
    name: string
    status: string
    startDate: string
    endDate: string
    _count: { issues: number }
  }>
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState("")
  const [goal, setGoal] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const createSprint = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/sprints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, goal, startDate, endDate, status: "PLANNED" }),
      })
      if (response.ok) {
        setShowForm(false)
        setName("")
        setGoal("")
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  const activateSprint = async (sprintId: string) => {
    await fetch(`/api/sprints/${sprintId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ACTIVE" }),
    })
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Sprints</h3>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="text-sm text-primary hover:underline"
        >
          {showForm ? "Cancel" : "+ New Sprint"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createSprint} className="border rounded-lg p-4 space-y-3 bg-gray-50">
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Sprint name (e.g. Sprint 1)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Sprint goal (optional)"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              className="border rounded px-3 py-2 text-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <input
              type="date"
              className="border rounded px-3 py-2 text-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium"
          >
            Create Sprint
          </button>
        </form>
      )}

      {sprints.length === 0 ? (
        <p className="text-sm text-gray-500">No sprints yet. Create one to plan work in iterations.</p>
      ) : (
        <div className="space-y-2">
          {sprints.map((sprint) => (
            <div
              key={sprint.id}
              className="flex items-center justify-between border rounded-lg p-3 hover:bg-gray-50"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/projects/${projectId}/sprints/${sprint.id}`}
                    className="font-medium text-gray-900 hover:underline"
                  >
                    {sprint.name}
                  </Link>
                  <Badge
                    variant={
                      sprint.status === "ACTIVE"
                        ? "success"
                        : sprint.status === "COMPLETED"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {sprint.status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(sprint.startDate).toLocaleDateString()} –{" "}
                  {new Date(sprint.endDate).toLocaleDateString()} · {sprint._count.issues} issues
                </p>
              </div>
              {sprint.status !== "ACTIVE" && sprint.status !== "COMPLETED" && (
                <button
                  type="button"
                  onClick={() => activateSprint(sprint.id)}
                  className="text-xs text-primary hover:underline shrink-0"
                >
                  Start Sprint
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
