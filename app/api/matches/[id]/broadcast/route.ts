import { NextResponse } from "next/server";
import { updateMatchBroadcastReview } from "@/lib/services/match-sync.service";

export async function PATCH(request: Request, context: { params: { id: string } }) {
  try {
    const body = (await request.json()) as {
      action: "confirm" | "replace" | "reject";
      actorName?: string;
      broadcastUrl?: string;
      lock?: boolean;
    };

    const match = await updateMatchBroadcastReview({
      matchId: context.params.id,
      action: body.action,
      actorName: body.actorName,
      broadcastUrl: body.broadcastUrl,
      lock: body.lock
    });

    return NextResponse.json({
      message: "Привязка трансляции обновлена.",
      matchId: match.id
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Не удалось обновить привязку трансляции."
      },
      { status: 500 }
    );
  }
}
