import { z } from "zod";

export const createIssueSchema = z.object({
  clubId: z.string().min(1, "Выберите клуб"),
  tagId: z.string().optional().or(z.literal("")),
  rawDescription: z.string().max(4000, "Описание слишком длинное").optional().or(z.literal("")),
  createdBy: z.string().max(120, "Поле 'кто внес' слишком длинное").optional().or(z.literal("")),
  sourceReference: z.string().url("Укажите корректную ссылку").optional().or(z.literal(""))
});

export const resolveIssueSchema = z.object({
  resolvedBy: z.string().min(1, "Укажите, кто подтвердил решение"),
  resolutionType: z.string().max(120, "Тип решения слишком длинный").optional().or(z.literal("")),
  resolutionComment: z.string().max(2000, "Комментарий слишком длинный").optional().or(z.literal("")),
  resolutionSource: z.string().url("Укажите корректную ссылку").optional().or(z.literal(""))
});
