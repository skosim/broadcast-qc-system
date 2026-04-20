import { NextResponse } from "next/server";
import { createBroadcastIssue } from "@/lib/repository";
import { createIssueSchema } from "@/lib/validations/issue";

export async function POST(request: Request) {
  try {
    const payload = createIssueSchema.parse(await request.json());
    const issue = await createBroadcastIssue(payload);

    return NextResponse.json({
      success: true,
      message: "Проблема трансляции добавлена.",
      issueId: issue.id
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Не удалось создать проблему."
      },
      { status: 400 }
    );
  }
}
