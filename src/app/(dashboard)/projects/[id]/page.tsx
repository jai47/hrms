import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Plus, ArrowLeft, List } from "lucide-react"
import { formatIssueKey } from "@/lib/projects"
import { getIssuePriorityColor, getIssueStatusColor, getIssueTypeColor } from "@/lib/utils"
import { ProjectBoard, SprintListPanel } from "./client-components"

async function getProject(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      lead: { select: { firstName: true, lastName: true } },
      members: {
        include: {
          employee: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      sprints: {
        include: { _count: { select: { issues: true } } },
        orderBy: { startDate: "desc" },
      },
      issues: {
        include: {
          assignee: { select: { firstName: true, lastName: true } },
        },
        orderBy: { issueNumber: "desc" },
      },
    },
  })
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = await getProject(id)

  if (!project) notFound()

  const openIssues = project.issues.filter((i) => i.status !== "DONE").length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/projects" className="p-2 hover:bg-gray-100 rounded-lg mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              <Badge variant="outline" className="font-mono">{project.key}</Badge>
            </div>
            {project.description && (
              <p className="text-gray-500 max-w-2xl">{project.description}</p>
            )}
            <div className="flex gap-4 mt-2 text-sm text-gray-500">
              <span>{project.issues.length} total issues</span>
              <span>{openIssues} open</span>
              {project.lead && (
                <span>
                  Lead: {project.lead.firstName} {project.lead.lastName}
                </span>
              )}
            </div>
          </div>
        </div>
        <Link href={`/projects/${id}/issues/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Issue
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sprint Planning</CardTitle>
        </CardHeader>
        <CardContent>
          <SprintListPanel
            projectId={project.id}
            sprints={project.sprints.map((s) => ({
              ...s,
              startDate: s.startDate.toISOString(),
              endDate: s.endDate.toISOString(),
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Board
          </CardTitle>
        </CardHeader>
        <CardContent>
          {project.issues.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-4">No issues yet. Create the first ticket for this project.</p>
              <Link href={`/projects/${id}/issues/new`}>
                <Button>Create Issue</Button>
              </Link>
            </div>
          ) : (
            <ProjectBoard
              projectId={project.id}
              projectKey={project.key}
              issues={project.issues}
            />
          )}
        </CardContent>
      </Card>

      {project.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Key</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Title</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Type</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Priority</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Assignee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {project.issues.map((issue) => (
                    <tr key={issue.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 text-sm font-mono">
                        <Link
                          href={`/projects/${id}/issues/${issue.id}`}
                          className="text-primary hover:underline"
                        >
                          {formatIssueKey(project.key, issue.issueNumber)}
                        </Link>
                      </td>
                      <td className="py-2 px-3 text-sm">{issue.title}</td>
                      <td className="py-2 px-3">
                        <Badge className={getIssueTypeColor(issue.type)}>{issue.type}</Badge>
                      </td>
                      <td className="py-2 px-3">
                        <Badge className={getIssueStatusColor(issue.status)}>
                          {issue.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">
                        <Badge className={getIssuePriorityColor(issue.priority)}>
                          {issue.priority}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-sm text-gray-600">
                        {issue.assignee
                          ? `${issue.assignee.firstName} ${issue.assignee.lastName}`
                          : "Unassigned"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
