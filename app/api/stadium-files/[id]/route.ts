import { NextResponse } from "next/server";
import { updateStadiumFileKind } from "@/lib/repository";
import { stadiumFileKindUpdateSchema } from "@/lib/validations/stadium-file";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = stadiumFileKindUpdateSchema.parse(await request.json());
    const updated = await updateStadiumFileKind({
      fileId: params.id,
      kind: body.kind,
      actorName: body.actorName || undefined
    });

    return NextResponse.json({
      success: true,
      message: "Тип файла обновлён.",
      file: {
        id: updated.id,
        kind: updated.kind
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Не удалось обновить тип файла."
      },
      { status: 400 }
    );
  }
}
