import { requireRoles } from "@/lib/auth-guard"
import EditEmployeeForm from "./client-form"

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRoles(["ADMIN", "HR_MANAGER"])
  const { id } = await params
  return <EditEmployeeForm employeeId={id} />
}
