import { z } from "zod";

export const uploadMetadataSchema = z.object({
  clubId: z.string().min(1, "Выберите клуб"),
  comment: z
    .string()
    .max(600, "Комментарий слишком длинный")
    .optional()
    .or(z.literal(""))
});

export const uploadResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  fileId: z.string().optional()
});

export type UploadMetadataInput = z.infer<typeof uploadMetadataSchema>;
export type UploadResponse = z.infer<typeof uploadResponseSchema>;
