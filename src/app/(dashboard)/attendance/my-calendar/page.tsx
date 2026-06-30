import { auth } from "@/lib/auth"
import { AttendanceCalendar } from "@/components/attendance/attendance-calendar"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function MyCalendarPage() {
  const session = await auth()

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Calendar</h1>
          <p className="text-gray-500">Your monthly attendance overview</p>
        </div>
        <Link href="/attendance/records">
          <Button variant="outline" size="sm">
            Full Records
          </Button>
        </Link>
      </div>

      <AttendanceCalendar employeeId={session?.user?.id} />
    </div>
  )
}
