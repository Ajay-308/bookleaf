import { query } from "../db.js";

export async function findByEmail(email) {
  const result = await query("SELECT * FROM users WHERE LOWER(email)=LOWER($1)", [email]);
  return result.rows[0] || null;
}

export async function findById(id) {
  const result = await query("SELECT * FROM users WHERE id=$1", [id]);
  return result.rows[0] || null;
}

export async function findPublicById(id) {
  const result = await query("SELECT id,name,email FROM users WHERE id=$1", [id]);
  return result.rows[0] || null;
}
