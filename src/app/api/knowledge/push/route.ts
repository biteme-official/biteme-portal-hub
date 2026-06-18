import { writeSummary } from "@/lib/knowledge-store";
import type { SourceId, DataSummary } from "@/lib/data-sources/types";

const VALID_SOURCES: SourceId[] = ["product", "smartstore", "b2b"];

export async function POST(req: Request) {
  const secret = process.env.KNOWLEDGE_PUSH_SECRET;
  if (!secret) {
    return Response.json(
      { error: "KNOWLEDGE_PUSH_SECRET이 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { sourceId, summary } = body as {
    sourceId: SourceId;
    summary: DataSummary;
  };

  if (!VALID_SOURCES.includes(sourceId)) {
    return Response.json({ error: `Invalid sourceId: ${sourceId}` }, { status: 400 });
  }

  if (!summary?.meta || !summary?.narrative || !summary?.kpis) {
    return Response.json({ error: "Invalid summary format" }, { status: 400 });
  }

  await writeSummary(sourceId, summary);

  return Response.json({
    ok: true,
    sourceId,
    updatedAt: new Date().toISOString(),
  });
}
