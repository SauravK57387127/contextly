export class AppError extends Error {
  constructor(public statusCode: number, public code: string, message: string) {
    super(message);
  }
}
export class ValidationError extends AppError {
  constructor(message: string, public fields?: Record<string, string>) {
    super(400, "VALIDATION_FAILED", message);
  }
}
export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") { super(401, "UNAUTHORIZED", message); }
}
export class NotFoundError extends AppError {
  constructor(resource: string) { super(404, "NOT_FOUND", `${resource} not found`); }
}
export class ConflictError extends AppError {
  constructor(message: string) { super(409, "CONFLICT", message); }
}
