CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "city" TEXT,
    "joined_date" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_role_check" CHECK ("role" IN ('author', 'admin'))
);

CREATE UNIQUE INDEX "users_email_unique_ci" ON "users" (LOWER("email"));

CREATE TABLE "books" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isbn" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "publication_date" TEXT,
    "status" TEXT NOT NULL,
    "mrp" DOUBLE PRECISION,
    "author_royalty_per_copy" DOUBLE PRECISION,
    "total_copies_sold" INTEGER NOT NULL DEFAULT 0,
    "total_royalty_earned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "royalty_paid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "royalty_pending" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_royalty_payout_date" TEXT,
    "print_partner" TEXT,
    "available_on" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "book_id" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "assigned_to" TEXT,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,
    "ai_error" TEXT,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" TEXT NOT NULL,
    "created_at" TEXT NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "messages_visibility_check" CHECK ("visibility" IN ('public', 'internal'))
);

CREATE INDEX "tickets_status_priority_created"
    ON "tickets"("status", "priority", "created_at");
CREATE INDEX "messages_ticket_created"
    ON "messages"("ticket_id", "created_at");

ALTER TABLE "books"
    ADD CONSTRAINT "books_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "tickets"
    ADD CONSTRAINT "tickets_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "users"("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "tickets"
    ADD CONSTRAINT "tickets_assigned_to_fkey"
    FOREIGN KEY ("assigned_to") REFERENCES "users"("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "tickets"
    ADD CONSTRAINT "tickets_book_id_fkey"
    FOREIGN KEY ("book_id") REFERENCES "books"("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "messages"
    ADD CONSTRAINT "messages_ticket_id_fkey"
    FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "messages"
    ADD CONSTRAINT "messages_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "users"("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;
