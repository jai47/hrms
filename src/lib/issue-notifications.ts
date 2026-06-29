import { prisma } from "@/lib/prisma"
import { sendEmail, getAppUrl } from "@/lib/email"
import { formatIssueKey } from "@/lib/projects"
import { getSetting } from "@/lib/settings"

async function isEmailNotificationsEnabled(): Promise<boolean> {
  const setting = await getSetting("emailNotifications")
  return setting !== "false"
}

export async function notifyIssueAssignment(input: {
  assigneeId: string
  projectId: string
  projectKey: string
  issueId: string
  issueNumber: number
  title: string
  assignedByName?: string
}): Promise<void> {
  const issueKey = formatIssueKey(input.projectKey, input.issueNumber)
  const link = `/projects/${input.projectId}/issues/${input.issueId}`

  await prisma.notification.create({
    data: {
      employeeId: input.assigneeId,
      title: "Issue Assigned",
      message: `You were assigned ${issueKey}: ${input.title}`,
      type: "ISSUE_ASSIGNED",
      link,
    },
  })

  const emailEnabled = await isEmailNotificationsEnabled()
  if (!emailEnabled) return

  const assignee = await prisma.employee.findUnique({
    where: { id: input.assigneeId },
    select: { email: true, firstName: true, lastName: true },
  })

  if (!assignee?.email) return

  const appUrl = getAppUrl()
  const issueUrl = `${appUrl}${link}`
  const assigner = input.assignedByName ? ` by ${input.assignedByName}` : ""

  await sendEmail({
    to: assignee.email,
    subject: `[${input.projectKey}] Assigned: ${issueKey} — ${input.title}`,
    text: `Hi ${assignee.firstName},\n\nYou have been assigned ${issueKey}: ${input.title}${assigner}.\n\nView issue: ${issueUrl}`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px;">
        <h2 style="color: #111;">New issue assigned to you</h2>
        <p>Hi ${assignee.firstName},</p>
        <p>You have been assigned <strong>${issueKey}</strong>${assigner}:</p>
        <p style="font-size: 16px; font-weight: 600;">${input.title}</p>
        <p>
          <a href="${issueUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 16px; border-radius: 6px; text-decoration: none;">
            View Issue
          </a>
        </p>
        <p style="color: #666; font-size: 12px;">HRMS Project Management</p>
      </div>
    `,
  })
}
