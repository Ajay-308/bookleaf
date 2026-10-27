import { Router } from "express";
import { createTicket, getTicket, listBooks, listTickets } from "../controllers/author.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { ticketLimiter } from "../middleware/rate-limits.js";
import { validate } from "../middleware/validate.js";
import { createTicketSchema } from "../validation/schemas.js";

const router = Router();

router.use(authenticate, requireRole("author"));
router.get("/books", asyncHandler(listBooks));
router.post("/tickets", ticketLimiter, validate(createTicketSchema), asyncHandler(createTicket));
router.get("/tickets", asyncHandler(listTickets));
router.get("/tickets/:id", asyncHandler(getTicket));

export default router;
