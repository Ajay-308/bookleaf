import { db } from "../db.js";

export function findByEmail(email) {
  return db.prepare("SELECT * FROM users WHERE email=?").get(email);
}

export function findById(id) {
  return db.prepare("SELECT * FROM users WHERE id=?").get(id);
}

export function findPublicById(id) {
  return db.prepare("SELECT id,name,email FROM users WHERE id=?").get(id);
}
