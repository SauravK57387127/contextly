import { Router } from "express";
import multer from "multer";
import path from "path";
import { requireAuth } from "../../middlewares/requireAuth";
import * as documentsController from "./documents.controller";

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../../../uploads")),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

const router = Router();
router.post("/", requireAuth, upload.single("file"), documentsController.upload);

export default router;
