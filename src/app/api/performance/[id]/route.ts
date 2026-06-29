import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const performance = await prisma.performance.findUnique({
      where: { id },
      include: {
        employee: true,
        reviewer: true,
        kpis: true,
      },
    })

    if (!performance) {
      return NextResponse.json({ error: "Performance review not found" }, { status: 404 })
    }

    return NextResponse.json(performance)
  } catch (error) {
    console.error("Error fetching performance review:", error)
    return NextResponse.json(
      { error: "Failed to fetch performance review" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const { kpis, ...data } = body

    const performance = await prisma.performance.update({
      where: { id },
      data: {
        ...data,
        reviewDate: data.reviewDate ? new Date(data.reviewDate) : undefined,
        kpis: kpis
          ? {
              deleteMany: {},
              create: kpis.map((kpi: any) => ({
                name: kpi.name,
                target: kpi.target,
                actual: kpi.actual,
                weight: kpi.weight || 1,
                rating: kpi.rating,
              })),
            }
          : undefined,
      },
      include: {
        employee: true,
        reviewer: true,
        kpis: true,
      },
    })

    return NextResponse.json(performance)
  } catch (error) {
    console.error("Error updating performance review:", error)
    return NextResponse.json(
      { error: "Failed to update performance review" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    await prisma.performance.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting performance review:", error)
    return NextResponse.json(
      { error: "Failed to delete performance review" },
      { status: 500 }
    )
  }
}