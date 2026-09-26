import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../../middlewares/requireAuth";
import * as documentsController from "./documents.controller";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  timeout: 60000,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req: Express.Request, file: Express.Multer.File) => ({
    folder: "contextly-uploads",
    resource_type: "raw",
    public_id: `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "")}`,
  }) as any,
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") return cb(new Error("Only PDF files are allowed"));
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
