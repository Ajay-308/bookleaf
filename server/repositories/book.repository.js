import { prisma, jsonBook } from "../db.js";

export async function listForAuthor(authorId) {
  const books = await prisma.book.findMany({
    where: { authorId },
    orderBy: { title: "asc" },
  });
  return books.map(jsonBook);
}

export async function findForAuthor(bookId, authorId) {
  return prisma.book.findFirst({
    where: { id: bookId, authorId },
    select: { id: true },
  });
}

export async function findById(bookId) {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  return book ? jsonBook(book) : null;
}
