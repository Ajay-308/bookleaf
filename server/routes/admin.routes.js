import { Router } from "express";
import { addMessage, generateDraft, getTicket, listTickets, updateTicket } from "../controllers/admin.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { aiLimiter } from "../middleware/rate-limits.js";
import { validate } from "../middleware/validate.js";
import { adminTicketQuerySchema, ticketMessageSchema, updateTicketSchema } from "../validation/schemas.js";

const router = Router();

router.use(authenticate, requireRole("admin"));
router.get("/tickets", validate(adminTicketQuerySchema, "query"), listTickets);
router.get("/tickets/:id", getTicket);
router.post("/tickets/:id/draft", aiLimiter, asyncHandler(generateDraft));
router.patch("/tickets/:id", validate(updateTicketSchema), updateTicket);
router.post("/tickets/:id/messages", validate(ticketMessageSchema), addMessage);

export default router;
