import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { UnauthorizedError } from "../shared/errors";
import { getContext } from "../shared/context";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        throw new UnauthorizedError();
    }

    const token = header.slice("Bearer ".length);

    try {
        const payload = jwt.verify(token, config.auth.jwtSecret) as {
            sub: string;
        };
        const context = getContext();
        context.userId = payload.sub;
        next();
    } catch {
        throw new UnauthorizedError("Invalid or expired token");
    }
}
