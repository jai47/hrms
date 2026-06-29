import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: projectId } = await params

    const sprints = await prisma.sprint.findMany({
      where: { projectId },
      include: {
        _count: { select: { issues: true } },
        issues: {
          select: {
            id: true,
            issueNumber: true,
            title: true,
            status: true,
            priority: true,
            assignee: { select: { firstName: true, lastName: true } },
          },
          orderBy: { issueNumber: "asc" },
        },
      },
      orderBy: { startDate: "desc" },
    })

    return NextResponse.json(sprints)
  } catch (error) {
    console.error("Error fetching sprints:", error)
    return NextResponse.json({ error: "Failed to fetch sprints" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: projectId } = await params
    const body = await request.json()
    const { name, goal, startDate, endDate, status } = body

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Name, start date, and end date are required" },
        { status: 400 }
      )
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    if (status === "ACTIVE") {
      await prisma.sprint.updateMany({
        where: { projectId, status: "ACTIVE" },
        data: { status: "PLANNED" },
      })
    }

    const sprint = await prisma.sprint.create({
      data: {
        projectId,
        name,
        goal,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: status || "PLANNED",
      },
      include: { _count: { select: { issues: true } } },
    })

    return NextResponse.json(sprint, { status: 201 })
  } catch (error) {
    console.error("Error creating sprint:", error)
    return NextResponse.json({ error: "Failed to create sprint" }, { status: 500 })
  }
}
