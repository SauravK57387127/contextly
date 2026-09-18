import "dotenv/config";

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`)
  return value;
}

export const config = {
  env: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  db: { connectionString: required("DATABASE_URL") },
  auth: { jwtSecret: required("JWT_SECRET") },
frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
};
