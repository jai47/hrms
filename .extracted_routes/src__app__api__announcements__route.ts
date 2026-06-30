import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { canManageSettings } from "@/lib/rbac"

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    const employee = await prisma.employee.findUnique({
      where: { id: session.user.id },
      select: { departmentId: true },
    })

    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        AND: [
          {
            OR: [
              { departmentId: null },
              ...(employee?.departmentId ? [{ departmentId: employee.departmentId }] : []),
            ],
          },
        ],
      },
      include: {
        author: { select: { firstName: true, lastName: true } },
        department: { select: { name: true } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 20,
    })

    return NextResponse.json({ announcements })
  } catch (error) {
    console.error("Error fetching announcements:", error)
    return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canManageSettings(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { title, content, departmentId, priority, expiresAt } = body

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 })
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        authorId: session.user.id,
        departmentId: departmentId || null,
        priority: priority || "NORMAL",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: {
        author: { select: { firstName: true, lastName: true } },
        department: { select: { name: true } },
      },
    })

    const targetEmployees = await prisma.employee.findMany({
      where: {
        employmentStatus: "ACTIVE",
        ...(departmentId ? { departmentId } : {}),
      },
      select: { id: true },
    })

    await Promise.all(
      targetEmployees.map((emp) =>
        prisma.notification.create({
          data: {
            employeeId: emp.id,
            title: "New Announcement",
            message: title.trim(),
            type: "SYSTEM",
            link: "/announcements",
          },
        })
      )
    )

    return NextResponse.json(announcement, { status: 201 })
  } catch (error) {
    console.error("Error creating announcement:", error)
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 })
  }
}
