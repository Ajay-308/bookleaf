import jwt from "jsonwebtoken";

const jwtSecret = process.env.JWT_SECRET;
if (process.env.NODE_ENV === "production" && (!jwtSecret || Buffer.byteLength(jwtSecret) < 32)) {
  throw new Error("Production requires a JWT_SECRET of at least 32 bytes.");
}
const secret = jwtSecret || "local-development-secret-change-before-deploy";

export function createToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, name: user.name }, secret, { expiresIn: "12h" });
}

export function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Sign in to continue." });
  try {
    req.user = jwt.verify(token, secret);
    next();
  } catch {
    return res.status(401).json({ error: "Your session has expired. Please sign in again." });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) return res.status(403).json({ error: "You do not have permission to do this." });
    next();
  };
}
