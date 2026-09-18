import { authSchema } from "./auth.schema";
import * as authService from "./auth.service";
import { ValidationError, UnauthorizedError } from "../../shared/errors";
import { asyncHandler } from "../../middlewares/errorHandler";
import { config } from "../../config";

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.env === "production",
  sameSite: (config.env === "production" ? "none" : "lax") as "none" | "lax",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

function parseBody(body: unknown) {
  const result = authSchema.safeParse(body);
  if (!result.success) {
    const fields: Record<string, string> = {};
    result.error.issues.forEach((issue) => { fields[issue.path.join(".")] = issue.message; });
    throw new ValidationError("Validation failed", fields);
  }
  return result.data;
}

export const register = asyncHandler(async (req, res) => {
  const { email, password } = parseBody(req.body);
  const { accessToken, refreshToken, user } = await authService.registerUser(email, password);
  res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
  res.status(201).json({ success: true, data: { accessToken, user } });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = parseBody(req.body);
  const { accessToken, refreshToken, user } = await authService.loginUser(email, password);
  res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
  res.status(200).json({ success: true, data: { accessToken, user } });
});

export const refresh = asyncHandler(async (req, res) => {
  const rawToken = req.cookies.refreshToken;
  if (!rawToken) throw new UnauthorizedError("No session found");
  const { accessToken, user } = await authService.refreshAccessToken(rawToken);
  res.json({ success: true, data: { accessToken, user } });
});

export const logout = asyncHandler(async (req, res) => {
  const rawToken = req.cookies.refreshToken;
  if (rawToken) await authService.logoutUser(rawToken);
  res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
  res.json({ success: true, data: null });
});
