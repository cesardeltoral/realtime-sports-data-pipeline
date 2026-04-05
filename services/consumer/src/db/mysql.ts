import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function connectMySQL(): Promise<void> {
  await prisma.$connect();
  console.log("[MySQL] Connected via Prisma");
}

export async function disconnectMySQL(): Promise<void> {
  await prisma.$disconnect();
  console.log("[MySQL] Disconnected");
}
