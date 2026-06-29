import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatIssueKey } from "@/lib/projects"
import {
  formatDate,
  getIssuePriorityColor,
  getIssueStatusColor,
  getIssueTypeColor,
} from "@/lib/utils"
import { IssueDetailClient } from "./client-components"

async function getIssue(issueId: string) {
  return prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      project: { select: { id: true, key: true, name: true } },
      assignee: { select: { id: true, firstName: true, lastName: true } },
      reporter: { select: { firstName: true, lastName: true } },
      comments: {
        include: { author: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "asc" },
      },
      timeEntries: {
        include: { employee: { select: { firstName: true, lastName: true } } },
        orderBy: { date: "desc" },
      },
    },
  })
}

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string; issueId: string }>
}) {
  const { id: projectId, issueId } = await params
  const issue = await getIssue(issueId)

  if (!issue || issue.projectId !== projectId) notFound()

  const totalLoggedHours = issue.timeEntries.reduce((sum, e) => sum + e.hours, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Link href={`/projects/${projectId}`} className="p-2 hover:bg-gray-100 rounded-lg mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-mono text-sm text-gray-500">
              {formatIssueKey(issue.project.key, issue.issueNumber)}
            </span>
            <Badge className={getIssueTypeColor(issue.type)}>{issue.type}</Badge>
            <Badge className={getIssueStatusColor(issue.status)}>
              {issue.status.replace("_", " ")}
            </Badge>
            <Badge className={getIssuePriorityColor(issue.priority)}>{issue.priority}</Badge>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{issue.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {issue.project.name} · Reported by {issue.reporter.firstName} {issue.reporter.lastName}
            {issue.assignee && (
              <> · Assigned to {issue.assignee.firstName} {issue.assignee.lastName}</>
            )}
            {issue.dueDate && <> · Due {formatDate(issue.dueDate)}</>}
          </p>
        </div>
      </div>

      <IssueDetailClient
        issueId={issue.id}
        projectId={projectId}
        initial={{
          title: issue.title,
          description: issue.description,
          type: issue.type,
          status: issue.status,
          priority: issue.priority,
          assigneeId: issue.assigneeId,
          dueDate: issue.dueDate?.toISOString() ?? null,
          estimatedHours: issue.estimatedHours,
          comments: issue.comments.map((c) => ({
            ...c,
            createdAt: c.createdAt.toISOString(),
          })),
          timeEntries: issue.timeEntries.map((e) => ({
            ...e,
            date: e.date.toISOString(),
          })),
          totalLoggedHours,
        }}
      />
    </div>
  )
}
