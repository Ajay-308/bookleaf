import { prisma } from "../db.js";

export async function findByEmail(email) {
  return prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
}

export async function findById(id) {
  return prisma.user.findUnique({ where: { id } });
}

export async function findPublicById(id) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true },
  });
}
