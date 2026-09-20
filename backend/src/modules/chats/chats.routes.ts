import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import * as chatsController from "./chats.controller";

const router = Router();
router.post("/", requireAuth, chatsController.create);
router.get("/", requireAuth, chatsController.list);
router.get("/:id", requireAuth, chatsController.getOne);
router.post("/:id/messages", requireAuth, chatsController.sendMessage);

router.post("/test-retrieval", requireAuth, async (req, res) => {
  const { retrieveRelevantChunks } = await import("./retrieval");
  const results = await retrieveRelevantChunks(req.body.question, req.body.document_id);
  res.json({ success: true, data: results });
});

export default router;
