import { Request, Response, NextFunction }  from "express";
import { AppError, ValidationError } from "../shared/errors";
import { getContext } from "../shared/context";

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  const { requestId } = getContext();

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      ...(err instance of ValidationError && err.fields ? { errors: err.fields } : {}),
      requestId,
    });
  }

  console.error(err);
  res.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Something went wrong", requestId })
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => fun(req, res, next).catch(next);
}
