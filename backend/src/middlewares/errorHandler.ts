import { Request, Response, NextFunction } from "express";
import { AppError, ValidationError } from "../shared/errors";
import { getContext } from "../shared/context";
import multer from "multer";


export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  const { requestId } = getContext();

if (err instanceof multer.MulterError || err.message === "Only PDF files are allowed") {
    console.log(`[400] UPLOAD_ERROR: ${err.message} (requestId: ${requestId})`);
    return res.status(400).json({ success: false, code: "UPLOAD_ERROR", message: err.message, requestId });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      ...(err instanceof ValidationError && err.fields ? { errors: err.fields } : {}),
      requestId,
    });
  }

  console.error(err); // real logger comes later — fine for Phase 1
  res.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Something went wrong", requestId });
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}
