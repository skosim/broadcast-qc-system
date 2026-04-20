import { NextResponse } from "next/server";
import { syncBroadcastLinks } from "@/lib/services/match-sync.service";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { seasonSlug?: string };
    const job = await syncBroadcastLinks(body.seasonSlug);

    return NextResponse.json({
      message: "Ссылки на трансляции обновлены.",
      jobId: job.id
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Не удалось обновить ссылки на трансляции."
      },
      { status: 500 }
    );
  }
}
