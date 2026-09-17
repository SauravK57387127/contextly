import { asyncHandler } from "../../middlewares/errorHandler";
import { getContext } from "../../shared/context";
import { ValidationError } from "../../shared/errors";
import * as documentsService from "./documents.service";

export const upload = asyncHandler(async (req, res) => {
  if (!req.file) throw new ValidationError("A file is required");

  const { userId } = getContext();
  const document = await documentsService.saveDocument(userId!, req.file);
  res.status(201).json({ success: true, data: document });
});
