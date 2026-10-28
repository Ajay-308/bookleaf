import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";

process.env.DATABASE_URL = "postgresql://bookleaf_test:bookleaf_test@localhost:5432/bookleaf_test";
process.env.JWT_SECRET = "bookleaf-api-integration-test-secret-0123456789";
process.env.GROQ_API_KEY = "integration-test-key";

const [{ default: app }, { prisma }] = await Promise.all([
  import("./app.js"),
  import("./db.js"),
]);

test("HTTP API supports the author-to-admin ticket lifecycle and enforces access rules", async (t) => {
  const author = {
    id: "author-test",
    name: "Priya Sharma",
    email: "priya.sharma@email.com",
    passwordHash: await bcrypt.hash("Author123!", 4),
    role: "author",
  };
  const otherAuthor = {
    id: "author-other",
    name: "Other Author",
    email: "other@email.com",
    passwordHash: await bcrypt.hash("Other123!", 4),
    role: "author",
  };
  const admin = {
    id: "admin-test",
    name: "BookLeaf Support",
    email: "admin@bookleaf.local",
    passwordHash: await bcrypt.hash("Admin123!", 4),
    role: "admin",
  };
  const users = [author, otherAuthor, admin];
  const books = [{
    id: "book-test",
    authorId: author.id,
    title: "Whispers of the Ganges",
    isbn: "9780000000001",
    genre: "Literary Fiction",
    publicationDate: "2025-01-01",
    status: "Published & Live",
    mrp: 299,
    authorRoyaltyPerCopy: 40,
    totalCopiesSold: 25,
    totalRoyaltyEarned: 1000,
    royaltyPaid: 0,
    royaltyPending: 1000,
    lastRoyaltyPayoutDate: null,
    printPartner: null,
    availableOn: [],
  }];
  const tickets = [];
  const messages = [];

  const hydrateTicket = (ticket) => ({
    ...ticket,
    author: users.find((user) => user.id === ticket.authorId),
    book: books.find((book) => book.id === ticket.bookId) || null,
    messages: messages
      .filter((message) => message.ticketId === ticket.id)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((message) => ({
        ...message,
        author: users.find((user) => user.id === message.authorId),
      })),
  });

  const stub = (target, methodName, implementation) => {
    Object.defineProperty(target, methodName, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: implementation,
    });
    t.after(() => { delete target[methodName]; });
  };

  stub(prisma.user, "findFirst", async ({ where }) =>
    users.find((user) => user.email.toLowerCase() === where.email.equals.toLowerCase()) || null);
  stub(prisma.user, "findUnique", async ({ where }) =>
    users.find((user) => user.id === where.id) || null);
  stub(prisma.book, "findMany", async ({ where }) =>
    books.filter((book) => book.authorId === where.authorId));
  stub(prisma.book, "findFirst", async ({ where }) =>
    books.find((book) => book.id === where.id && book.authorId === where.authorId) || null);
  stub(prisma.ticket, "create", async ({ data }) => {
    tickets.push(data);
    return data;
  });
  stub(prisma.ticket, "findMany", async ({ where = {} }) => tickets
    .filter((ticket) => !where.authorId || ticket.authorId === where.authorId)
    .filter((ticket) => !where.status || ticket.status === where.status)
    .filter((ticket) => !where.category || ticket.category === where.category)
    .filter((ticket) => !where.priority || ticket.priority === where.priority)
    .map(hydrateTicket));
  stub(prisma.ticket, "findFirst", async ({ where }) => {
    const ticket = tickets.find((item) => item.id === where.id && item.authorId === where.authorId);
    return ticket ? hydrateTicket(ticket) : null;
  });
  stub(prisma.ticket, "findUnique", async ({ where }) => {
    const ticket = tickets.find((item) => item.id === where.id);
    return ticket ? hydrateTicket(ticket) : null;
  });
  stub(prisma.ticket, "update", async ({ where, data }) => {
    const ticket = tickets.find((item) => item.id === where.id);
    if (!ticket) throw new Error("Ticket not found in test store.");
    Object.assign(ticket, data);
    return ticket;
  });
  stub(prisma.message, "create", async ({ data }) => {
    messages.push(data);
    return data;
  });
  stub(prisma, "$transaction", async (callback) => callback({
    message: prisma.message,
    ticket: prisma.ticket,
  }));

  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = async (input, options) => {
    const url = typeof input === "string" ? input : input.url;
    if (url === "https://api.groq.com/openai/v1/chat/completions") {
      return new Response("rate limited", { status: 429 });
    }
    return nativeFetch(input, options);
  };
  t.after(() => { globalThis.fetch = nativeFetch; });

  const request = async (path, { token, ...options } = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    const body = await response.json();
    return { status: response.status, body };
  };
  const login = async (email, password) => {
    const result = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    assert.equal(result.status, 200);
    return result.body.token;
  };

  assert.deepEqual(await request("/api/health"), { status: 200, body: { ok: true } });
  assert.equal((await request("/api/books")).status, 401);
  assert.equal((await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "not-an-email", password: "" }),
  })).status, 400);
  assert.equal((await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: author.email, password: "incorrect" }),
  })).status, 401);

  const authorToken = await login(author.email, "Author123!");
  const otherAuthorToken = await login(otherAuthor.email, "Other123!");
  const adminToken = await login(admin.email, "Admin123!");

  const currentUser = await request("/api/auth/me", { token: authorToken });
  assert.equal(currentUser.body.user.id, author.id);
  assert.equal("passwordHash" in currentUser.body.user, false);

  const authorBooks = await request("/api/books", { token: authorToken });
  assert.equal(authorBooks.status, 200);
  assert.equal(authorBooks.body.books.length, 1);
  assert.equal(authorBooks.body.books[0].title, books[0].title);

  const invalidBook = await request("/api/tickets", {
    token: authorToken,
    method: "POST",
    body: JSON.stringify({
      bookId: "another-authors-book",
      subject: "Royalty payment",
      description: "I have not received my royalty payment.",
    }),
  });
  assert.equal(invalidBook.status, 400);
  assert.match(invalidBook.body.error, /Choose one of your books/);

  const createResult = await request("/api/tickets", {
    token: authorToken,
    method: "POST",
    body: JSON.stringify({
      bookId: books[0].id,
      subject: "Royalty payment missing",
      description: "I have not received royalties for several months.",
    }),
  });
  assert.equal(createResult.status, 201);
  const ticketId = createResult.body.ticket.id;
  assert.equal(createResult.body.ticket.category, "Royalty & Payments");
  assert.equal(createResult.body.ticket.priority, "High");
  assert.equal(createResult.body.ticket.status, "Open");

  assert.equal((await request("/api/admin/tickets", { token: authorToken })).status, 403);
  assert.equal((await request(`/api/tickets/${ticketId}`, { token: otherAuthorToken })).status, 404);
  assert.equal((await request("/api/admin/tickets?status=not-a-status", { token: adminToken })).status, 400);

  const adminQueue = await request("/api/admin/tickets?priority=High", { token: adminToken });
  assert.equal(adminQueue.status, 200);
  assert.equal(adminQueue.body.tickets.length, 1);
  assert.equal(adminQueue.body.tickets[0].id, ticketId);

  const generatedDraft = await request(`/api/admin/tickets/${ticketId}/draft`, {
    token: adminToken,
    method: "POST",
  });
  assert.equal(generatedDraft.status, 200);
  assert.equal(generatedDraft.body.aiUnavailable, true);
  assert.match(generatedDraft.body.draft, /Hi Priya,/);

  const updateResult = await request(`/api/admin/tickets/${ticketId}`, {
    token: adminToken,
    method: "PATCH",
    body: JSON.stringify({
      status: "In Progress",
      category: "General Inquiry",
      priority: "Medium",
      assignToMe: true,
    }),
  });
  assert.equal(updateResult.status, 200);
  assert.equal(updateResult.body.ticket.status, "In Progress");
  assert.equal(updateResult.body.ticket.category, "General Inquiry");
  assert.equal(updateResult.body.ticket.priority, "Medium");
  assert.equal(updateResult.body.ticket.assigned_to, admin.id);

  const internalResult = await request(`/api/admin/tickets/${ticketId}/messages`, {
    token: adminToken,
    method: "POST",
    body: JSON.stringify({ body: "Checking the payout details.", visibility: "internal" }),
  });
  assert.equal(internalResult.status, 201);
  assert.equal(internalResult.body.ticket.messages.length, 1);
  assert.equal(internalResult.body.ticket.messages[0].visibility, "internal");

  const adminTicket = await request(`/api/admin/tickets/${ticketId}`, { token: adminToken });
  assert.equal(adminTicket.status, 200);
  assert.equal(adminTicket.body.ticket.messages[0].body, "Checking the payout details.");

  const authorTicketBeforeReply = await request(`/api/tickets/${ticketId}`, { token: authorToken });
  assert.equal(authorTicketBeforeReply.status, 200);
  assert.equal(authorTicketBeforeReply.body.ticket.messages.length, 0);

  const publicReply = await request(`/api/admin/tickets/${ticketId}/messages`, {
    token: adminToken,
    method: "POST",
    body: JSON.stringify({ body: "We will review this and update you within 48 hours.", visibility: "public" }),
  });
  assert.equal(publicReply.status, 201);
  assert.equal(publicReply.body.ticket.messages.length, 2);

  const authorTickets = await request("/api/tickets", { token: authorToken });
  assert.equal(authorTickets.status, 200);
  assert.equal(authorTickets.body.tickets.length, 1);
  assert.equal(authorTickets.body.tickets[0].status, "In Progress");
  assert.deepEqual(
    authorTickets.body.tickets[0].messages.map((message) => message.body),
    ["We will review this and update you within 48 hours."],
  );
});
