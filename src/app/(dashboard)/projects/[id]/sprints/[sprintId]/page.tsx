import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"
import { SprintPlanningBoard } from "./client-components"

async function getSprintData(projectId: string, sprintId: string) {
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: {
      project: { select: { id: true, key: true, name: true } },
      issues: {
        include: {
          assignee: { select: { firstName: true, lastName: true } },
        },
        orderBy: { issueNumber: "asc" },
      },
    },
  })

  if (!sprint || sprint.projectId !== projectId) return null

  const backlog = await prisma.issue.findMany({
    where: {
      projectId,
      OR: [{ sprintId: null }, { sprintId: { not: sprintId } }],
    },
    include: {
      assignee: { select: { firstName: true, lastName: true } },
    },
    orderBy: { issueNumber: "desc" },
  })

  return { sprint, backlog }
}

export default async function SprintPlanningPage({
  params,
}: {
  params: Promise<{ id: string; sprintId: string }>
}) {
  const { id: projectId, sprintId } = await params
  const data = await getSprintData(projectId, sprintId)

  if (!data) notFound()

  const { sprint, backlog } = data

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Link href={`/projects/${projectId}`} className="p-2 hover:bg-gray-100 rounded-lg mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{sprint.name}</h1>
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
          <p className="text-gray-500">
            {sprint.project.name} · {formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}
          </p>
          {sprint.goal && <p className="text-sm text-gray-600 mt-2">Goal: {sprint.goal}</p>}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sprint Planning</CardTitle>
        </CardHeader>
        <CardContent>
          <SprintPlanningBoard
            sprintId={sprint.id}
            projectId={projectId}
            projectKey={sprint.project.key}
            sprintIssues={sprint.issues}
            backlogIssues={backlog}
          />
        </CardContent>
      </Card>
    </div>
  )
}
