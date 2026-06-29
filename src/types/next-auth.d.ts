import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      employeeId?: string | null
      departmentId?: string | null
    } & DefaultSession["user"]
  }

  interface User {
    role: string
    employeeId?: string | null
    departmentId?: string | null
  }
}
