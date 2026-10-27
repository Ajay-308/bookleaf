import { Router } from "express";
import { currentUser, login } from "../controllers/auth.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";
import { loginLimiter } from "../middleware/rate-limits.js";
import { validate } from "../middleware/validate.js";
import { loginSchema } from "../validation/schemas.js";

const router = Router();

router.post("/login", loginLimiter, validate(loginSchema), asyncHandler(login));
router.get("/me", authenticate, currentUser);

export default router;
