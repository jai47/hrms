import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

export function getApiKey(request: NextRequest): string | null {
  const headerKey = request.headers.get("x-api-key")
  if (headerKey) return headerKey

  const authorization = request.headers.get("authorization")
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7)
  }

  return null
}

export function isValidBiometricApiKey(key: string | null): boolean {
  const expected = process.env.BIOMETRIC_API_KEY
  if (!expected || !key) return false
  return key === expected
}

export function isValidCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return getApiKey(request) === secret
}

type AuthorizeOptions = {
  allowSession?: boolean
  roles?: string[]
}

export async function authorizeBiometricRequest(
  request: NextRequest,
  options: AuthorizeOptions = {}
): Promise<{ authorized: true; via: "api_key" | "session" } | { authorized: false }> {
  if (isValidBiometricApiKey(getApiKey(request))) {
    return { authorized: true, via: "api_key" }
  }

  if (options.allowSession) {
    const session = await auth()
    if (session?.user) {
      if (options.roles && !options.roles.includes(session.user.role)) {
        return { authorized: false }
      }
      return { authorized: true, via: "session" }
    }
  }

  return { authorized: false }
}
