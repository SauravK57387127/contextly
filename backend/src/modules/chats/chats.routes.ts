import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import * as chatsController from "./chats.controller";

const router = Router();
router.post("/", requireAuth, chatsController.create);
router.get("/", requireAuth, chatsController.list);
router.get("/:id", requireAuth, chatsController.getOne);
router.post("/:id/messages", requireAuth, chatsController.sendMessage);

export default router;
