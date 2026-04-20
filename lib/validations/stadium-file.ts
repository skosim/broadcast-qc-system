import { z } from "zod";

export const stadiumFileKindSchema = z.enum(["camera_plan", "gallery", "coordination", "other"]);

export const stadiumFileKindUpdateSchema = z.object({
  kind: stadiumFileKindSchema,
  actorName: z.string().max(120).optional().or(z.literal(""))
});

export type StadiumFileKindUpdateInput = z.infer<typeof stadiumFileKindUpdateSchema>;
