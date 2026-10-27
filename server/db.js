import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL || process.env.db;
if (!databaseUrl) {
  throw new Error("Set DATABASE_URL (or db for existing local environments).");
}

export const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrl } },
});

export async function connectDatabase() {
  await prisma.$connect();
}

export function jsonBook(book) {
  return {
    id: book.id,
    author_id: book.authorId,
    title: book.title,
    isbn: book.isbn,
    genre: book.genre,
    publication_date: book.publicationDate,
    status: book.status,
    mrp: book.mrp,
    author_royalty_per_copy: book.authorRoyaltyPerCopy,
    total_copies_sold: book.totalCopiesSold,
    total_royalty_earned: book.totalRoyaltyEarned,
    royalty_paid: book.royaltyPaid,
    royalty_pending: book.royaltyPending,
    last_royalty_payout_date: book.lastRoyaltyPayoutDate,
    print_partner: book.printPartner,
    available_on: book.availableOn,
  };
}
