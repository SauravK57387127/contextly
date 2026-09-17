import { authSchema } from "./auth.schema";
import * as authService from "./auth.service";
import { ValidationError } from "../../shared/errors";
import { asyncHandler } from "../../middlewares/errorHandler";

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
  const { token, user } = await authService.registerUser(email, password);
  res.status(201).json({ success: true, data: { token, user } });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = parseBody(req.body);
  const { token, user } = await authService.loginUser(email, password);
  res.status(200).json({ success: true, data: { token, user } });
});
