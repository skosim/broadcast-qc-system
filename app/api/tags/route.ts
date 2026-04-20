import { NextResponse } from "next/server";
import { createTag } from "@/lib/repository";
import { createTagSchema } from "@/lib/validations/tag";

export async function POST(request: Request) {
  try {
    const payload = createTagSchema.parse(await request.json());
    const tag = await createTag(payload);

    return NextResponse.json({
      success: true,
      message: "Тег добавлен в справочник.",
      tagId: tag.id
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Не удалось создать тег."
      },
      { status: 400 }
    );
  }
}
