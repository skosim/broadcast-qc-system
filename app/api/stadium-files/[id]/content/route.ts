import { stat, readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const file = await prisma.stadiumFile.findUnique({
    where: { id: params.id },
    select: {
      filePath: true,
      mimeType: true,
      originalName: true
    }
  });

  if (!file) {
    return new NextResponse("Файл не найден.", { status: 404 });
  }

  const absolutePath = path.isAbsolute(file.filePath)
    ? file.filePath
    : path.join(process.cwd(), file.filePath);

  try {
    await stat(absolutePath);
    const buffer = await readFile(absolutePath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.originalName)}"`,
        "Cache-Control": "public, max-age=3600"
      }
    });
  } catch {
    return new NextResponse("Файл недоступен для предпросмотра.", { status: 404 });
  }
}
