import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Plus, FolderKanban, Users } from "lucide-react"
import { formatDate } from "@/lib/utils"

async function getProjects() {
  return prisma.project.findMany({
    include: {
      lead: { select: { firstName: true, lastName: true } },
      _count: { select: { issues: true, members: true } },
    },
    orderBy: { updatedAt: "desc" },
  })
}

const statusVariant: Record<string, "success" | "warning" | "secondary" | "default"> = {
  ACTIVE: "success",
  ON_HOLD: "warning",
  COMPLETED: "secondary",
  ARCHIVED: "secondary",
}

export default async function ProjectsPage() {
  const projects = await getProjects()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500">Manage projects and track tickets</p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderKanban className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-500 mb-4">Create a project to start assigning tickets to your team</p>
            <Link href="/projects/new">
              <Button>Create Project</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover:border-gray-300 transition-colors h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <p className="text-sm font-mono text-gray-500">{project.key}</p>
                    </div>
                    <Badge variant={statusVariant[project.status] || "secondary"}>
                      {project.status.replace("_", " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {project.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <FolderKanban className="h-4 w-4" />
                      {project._count.issues} issues
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {project._count.members} members
                    </span>
                  </div>
                  {project.lead && (
                    <p className="text-xs text-gray-400 mt-3">
                      Lead: {project.lead.firstName} {project.lead.lastName}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Updated {formatDate(project.updatedAt)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
