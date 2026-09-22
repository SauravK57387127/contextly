import { Router } from "express";
import multer from "multer";
import path from "path";
import { requireAuth } from "../../middlewares/requireAuth";
import * as documentsController from "./documents.controller";

const storage = multer.diskStorage({
    destination: (req, file, cb) =>
        cb(null, path.join(__dirname, "../../../uploads")),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== "application/pdf")
            return cb(new Error("Only PDF files are allowed"));
        cb(null, true);
    },
});

const router = Router();
router.get("/", requireAuth, documentsController.list);

router.post(
    "/",
    requireAuth,
    upload.single("file"),
    documentsController.upload,
);
router.delete("/:id", requireAuth, documentsController.remove);

export default router;
