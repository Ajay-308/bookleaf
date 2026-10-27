import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDatabase, prisma } from "./db.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const sample = JSON.parse(fs.readFileSync(path.join(here, "data", "bookleaf_sample_data.json"), "utf8"));
if (process.env.NODE_ENV === "production" && (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12)) {
  throw new Error("Production seeding requires ADMIN_PASSWORD with at least 12 characters.");
}

try {
  await connectDatabase();
  const passwordHash = await bcrypt.hash("Author123!", 10);
  const adminHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || "Admin123!", 10);

  await prisma.$transaction(async (transaction) => {
    await transaction.user.createMany({
      data: sample.authors.map((author) => ({
        id: author.author_id,
        name: author.name,
        email: author.email,
        passwordHash,
        role: "author",
        phone: author.phone || null,
        city: author.city || null,
        joinedDate: author.joined_date || null,
      })),
      skipDuplicates: true,
    });

    await transaction.book.createMany({
      data: sample.authors.flatMap((author) => author.books.map((book) => ({
        id: book.book_id,
        authorId: author.author_id,
        title: book.title,
        isbn: book.isbn,
        genre: book.genre,
        publicationDate: book.publication_date || null,
        status: book.status,
        mrp: book.mrp,
        authorRoyaltyPerCopy: book.author_royalty_per_copy,
        totalCopiesSold: book.total_copies_sold,
        totalRoyaltyEarned: book.total_royalty_earned,
        royaltyPaid: book.royalty_paid,
        royaltyPending: book.royalty_pending,
        lastRoyaltyPayoutDate: book.last_royalty_payout_date || null,
        printPartner: book.print_partner || null,
        availableOn: book.available_on || [],
      }))),
      skipDuplicates: true,
    });

    await transaction.user.createMany({
      data: [{
        id: "ADMIN001",
        name: "BookLeaf Support",
        email: "admin@bookleaf.local",
        passwordHash: adminHash,
        role: "admin",
      }],
      skipDuplicates: true,
    });
  });

  const [authors, books] = await Promise.all([
    prisma.user.count({ where: { role: "author" } }),
    prisma.book.count(),
  ]);
  console.log(`Seeded ${authors} authors and ${books} books.`);
} finally {
  await prisma.$disconnect();
}
