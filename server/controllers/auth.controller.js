import bcrypt from "bcryptjs";
import { createToken } from "../middleware/auth.js";
import * as userRepository from "../repositories/user.repository.js";

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function login(req, res) {
  const { email, password } = req.validated.body;
  const user = userRepository.findByEmail(email.trim());
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "Email or password is incorrect." });
  }
  res.json({ token: createToken(user), user: publicUser(user) });
}

export function currentUser(req, res) {
  const user = userRepository.findById(req.user.sub);
  if (!user) return res.status(401).json({ error: "Account no longer exists." });
  res.json({ user: publicUser(user) });
}
