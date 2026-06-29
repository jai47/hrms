import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@company.com"
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Admin@123"

async function main() {
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10)

  await prisma.employee.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      password: hashedPassword,
      role: "ADMIN",
      employmentStatus: "ACTIVE",
    },
    create: {
      employeeId: "EMP001",
      firstName: "System",
      lastName: "Admin",
      email: ADMIN_EMAIL,
      password: hashedPassword,
      position: "Administrator",
      role: "ADMIN",
      employmentStatus: "ACTIVE",
    },
  })

  console.log(`Seed complete. Admin login: ${ADMIN_EMAIL}`)
}

main()
  .catch((error) => {
    console.error("Seed failed:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
