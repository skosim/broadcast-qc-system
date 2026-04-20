import { NextResponse } from "next/server";
import { resolveBroadcastIssue } from "@/lib/repository";
import { resolveIssueSchema } from "@/lib/validations/issue";

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const payload = resolveIssueSchema.parse(await request.json());
    const issue = await resolveBroadcastIssue({
      issueId: context.params.id,
      ...payload
    });

    return NextResponse.json({
      success: true,
      message: "Проблема помечена решенной.",
      issueId: issue.id
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Не удалось обновить статус."
      },
      { status: 400 }
    );
  }
}
