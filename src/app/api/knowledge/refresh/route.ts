import { writeSummary } from "@/lib/knowledge-store";
import { collectAndSummarizeProduct } from "@/lib/data-sources/product-collector";
import type { SourceId } from "@/lib/data-sources/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const sources: SourceId[] = body.sources || ["product", "smartstore"];
  const results: Record<string, { ok: boolean; error?: string }> = {};

  if (sources.includes("product")) {
    try {
      const summary = await collectAndSummarizeProduct();
      await writeSummary("product", summary);
      results.product = { ok: true };
    } catch (e) {
      results.product = {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  if (sources.includes("smartstore")) {
    results.smartstore = {
      ok: false,
      error:
        "스마트스토어는 IP 화이트리스트 제한으로 /api/knowledge/push를 통해 업데이트해야 합니다.",
    };
  }

  return Response.json(results);
}
