import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { pool } from "../../infrastructure/database/pool";
import { config } from "../../config";
import { ConflictError, UnauthorizedError } from "../../shared/errors";

function signToken(userId: string) {
  return jwt.sign({ sub: userId }, config.auth.jwtSecret, { expiresIn: "7d" });
}

export async function registerUser(email: string, password: string) {
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length > 0) {
    throw new ConflictError("Email already registered");
  }

  const passwordHash = await argon2.hash(password);

  const result = await pool.query(
    `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email`,
    [email, passwordHash]
  );
  console.log(`user: ${result.rows[0]}`)
  const user = result.rows[0];

  return { token: signToken(user.id), user };
}

export async function loginUser(email: string, password: string) {
  const result = await pool.query("SELECT id, email, password_hash FROM users WHERE email = $1", [email]);
  const user = result.rows[0];

  if (!user) throw new UnauthorizedError("Invalid email or password");

  const valid = await argon2.verify(user.password_hash, password);
  if (!valid) throw new UnauthorizedError("Invalid email or password");

  return { token: signToken(user.id), user: { id: user.id, email: user.email } };
}
