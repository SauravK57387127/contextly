import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // 10 attempts per 15 min per IP
    message: {
        success: false,
        code: "TOO_MANY_REQUESTS",
        message: "Too many attempts, try again later",
    },
});
