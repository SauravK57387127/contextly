import argon2 from "argon2";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { pool } from "../../infrastructure/database/pool";
import { config } from "../../config";
import { ConflictError, UnauthorizedError } from "../../shared/errors";

function signAccessToken(userId: string) {
    return jwt.sign({ sub: userId }, config.auth.jwtSecret, {
        expiresIn: "15m",
    });
}

async function issueRefreshToken(userId: string) {
    const rawToken = crypto.randomBytes(40).toString("hex");
    const tokenHash = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await pool.query(
        "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
        [userId, tokenHash, expiresAt],
    );
    return rawToken;
}

export async function refreshAccessToken(rawToken: string) {
    const tokenHash = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");
    const result = await pool.query(
        "SELECT user_id, expires_at FROM refresh_tokens WHERE token_hash = $1",
        [tokenHash],
    );
    const row = result.rows[0];
    if (!row || new Date(row.expires_at) < new Date()) {
        throw new UnauthorizedError("Session expired, please log in again");
    }

    const userResult = await pool.query(
        "SELECT id, email FROM users WHERE id = $1",
        [row.user_id],
    );
    const user = userResult.rows[0];
    return { accessToken: signAccessToken(user.id), user };
}

export async function registerUser(email: string, password: string) {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
        email,
    ]);
    if (existing.rows.length > 0) {
        throw new ConflictError("Email already registered");
    }

    const passwordHash = await argon2.hash(password);

    const result = await pool.query(
        `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email`,
        [email, passwordHash],
    );
    console.log(`user: ${result.rows[0]}`);
    const user = result.rows[0];

    const accessToken = signAccessToken(user.id);
    const refreshToken = await issueRefreshToken(user.id);
    return { accessToken, refreshToken, user };
}

export async function loginUser(email: string, password: string) {
    const result = await pool.query(
        "SELECT id, email, password_hash FROM users WHERE email = $1",
        [email],
    );
    const user = result.rows[0];

    if (!user) throw new UnauthorizedError("Invalid email or password");

    const valid = await argon2.verify(user.password_hash, password);
    if (!valid) throw new UnauthorizedError("Invalid email or password");

    const accessToken = signAccessToken(user.id);
    const refreshToken = await issueRefreshToken(user.id);
    return {
        accessToken,
        refreshToken,
        user: { id: user.id, email: user.email },
    };
}

export async function logoutUser(rawToken: string) {
    const tokenHash = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");
    await pool.query("DELETE FROM refresh_tokens WHERE token_hash = $1", [
        tokenHash,
    ]);
}
