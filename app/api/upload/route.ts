import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { createManualStadiumFile } from "@/lib/repository";
import { uploadMetadataSchema, uploadResponseSchema } from "@/lib/validations/upload";

const fileKindLabels: Record<string, string> = {
  camera_plan: "камерплан",
  gallery: "фото стадиона",
  coordination: "согласование",
  other: "прочий материал"
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const metadata = uploadMetadataSchema.parse({
      clubId: formData.get("clubId"),
      comment: formData.get("comment")
    });

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        uploadResponseSchema.parse({
          success: false,
          message: "Выберите файл для загрузки."
        }),
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "storage", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const timestamp = Date.now();
    const safeName = file.name.replace(/\s+/g, "-").toLowerCase();
    const filename = `${timestamp}-${safeName}`;
    const absolutePath = path.join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(absolutePath, buffer);

    const stadiumFile = await createManualStadiumFile({
      clubId: metadata.clubId,
      filename,
      originalName: file.name,
      filePath: path.join("storage", "uploads", filename),
      mimeType: file.type || "application/octet-stream",
      comment: metadata.comment || undefined
    });

    return NextResponse.json(
      uploadResponseSchema.parse({
        success: true,
        message: metadata.comment
          ? `Файл загружен и автоматически определён как «${fileKindLabels[stadiumFile.kind] ?? stadiumFile.kind}». Создан черновик обработки: ${metadata.comment}`
          : `Файл загружен и автоматически определён как «${fileKindLabels[stadiumFile.kind] ?? stadiumFile.kind}». Создан черновик обработки для ручного подтверждения.`,
        fileId: stadiumFile.id
      })
    );
  } catch (error) {
    return NextResponse.json(
      uploadResponseSchema.parse({
        success: false,
        message: error instanceof Error ? error.message : "Не удалось загрузить файл."
      }),
      { status: 500 }
    );
  }
}
