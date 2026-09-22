import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { Request, Response, NextFunction } from "express";

interface RequestContext {
    requestId: string;
    userId: string | null;
}
export const requestContext = new AsyncLocalStorage<RequestContext>();
export const getContext = () =>
    requestContext.getStore() ?? { requestId: "unknown", userId: null };

export function contextMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    const context: RequestContext = { requestId: randomUUID(), userId: null };
    res.setHeader("X-Request-Id", context.requestId);
    requestContext.run(context, () => next());
}
