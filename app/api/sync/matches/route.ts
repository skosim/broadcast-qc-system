import { NextResponse } from "next/server";
import { syncMatchesFromFnl } from "@/lib/services/match-sync.service";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { seasonSlug?: string };
    const job = await syncMatchesFromFnl(body.seasonSlug);

    return NextResponse.json({
      message: "Матчи из ФНЛ обновлены.",
      jobId: job.id
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Не удалось обновить матчи."
      },
      { status: 500 }
    );
  }
}
