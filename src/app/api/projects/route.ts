import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const projects = await prisma.project.findMany({
      include: {
        lead: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { issues: true, members: true } },
      },
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error("Error fetching projects:", error)
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { key, name, description, leadId, memberIds } = body

    if (!key || !name) {
      return NextResponse.json({ error: "Project key and name are required" }, { status: 400 })
    }

    const projectKey = String(key).toUpperCase().replace(/[^A-Z0-9]/g, "")
    if (projectKey.length < 2) {
      return NextResponse.json({ error: "Project key must be at least 2 characters" }, { status: 400 })
    }

    const existing = await prisma.project.findUnique({ where: { key: projectKey } })
    if (existing) {
      return NextResponse.json({ error: "Project key already exists" }, { status: 400 })
    }

    const resolvedLeadId = leadId || session.user.id
    const members: string[] = memberIds?.length ? memberIds : [session.user.id]
    const uniqueMembers = [...new Set([resolvedLeadId, ...members])]

    const project = await prisma.project.create({
      data: {
        key: projectKey,
        name,
        description,
        leadId: resolvedLeadId,
        members: {
          create: uniqueMembers.map((employeeId) => ({
            employeeId,
            role: employeeId === resolvedLeadId ? "LEAD" : "MEMBER",
          })),
        },
      },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { issues: true, members: true } },
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error("Error creating project:", error)
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
  }
}
