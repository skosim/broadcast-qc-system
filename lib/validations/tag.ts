import { z } from "zod";

export const createTagSchema = z.object({
  labelRu: z.string().min(1, "Введите название тега").max(120, "Название слишком длинное"),
  description: z.string().max(400, "Описание слишком длинное").optional().or(z.literal(""))
});
