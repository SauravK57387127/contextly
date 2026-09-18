import { asyncHandler } from "../../middlewares/errorHandler";
import { getContext } from "../../shared/context";
import { ValidationError } from "../../shared/errors";
import * as documentsService from "./documents.service";

export const list = asyncHandler(async (req, res) => {
  const { userId } = getContext();
  const documents = await documentsService.listDocuments(userId!);
  res.json({ success: true, data: documents });
});

export const upload = asyncHandler(async (req, res) => {
  if (!req.file) throw new ValidationError("A file is required");

  const { userId } = getContext();
  const document = await documentsService.saveDocument(userId!, req.file);
  res.status(201).json({ success: true, data: document });
});

export const remove = asyncHandler(async (req, res) => {
  const { userId } = getContext();
  await documentsService.deleteDocument(req.params.id, userId!);
  res.status(200).json({ success: true, data: null });
});
