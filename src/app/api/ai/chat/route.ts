import { anthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages } from "ai";
import { readAllSummaries } from "@/lib/knowledge-store";
import { routeSources, needsApprovalContext } from "@/lib/source-router";
import { buildSystemPrompt } from "@/lib/prompt-builder";
import { collectAndSummarizeProduct } from "@/lib/data-sources/product-collector";
import { writeSummary } from "@/lib/knowledge-store";
import { buildApprovalContext } from "@/lib/data-sources/approval-context";
import { getSession } from "@/lib/auth/session";

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const { messages } = await req.json();
  const modelMessages = await convertToModelMessages(messages);

  const lastUserMsg = [...messages]
    .reverse()
    .find((m: { role: string }) => m.role === "user");
  const userText =
    lastUserMsg?.parts
      ?.filter((p: { type: string }) => p.type === "text")
      .map((p: { text: string }) => p.text)
      .join("") ??
    lastUserMsg?.content ??
    "";

  const selectedSources = routeSources(userText);

  let summaries = await readAllSummaries();

  if (!summaries.product && selectedSources.includes("product")) {
    try {
      const productSummary = await collectAndSummarizeProduct();
      await writeSummary("product", productSummary);
      summaries = { ...summaries, product: productSummary };
    } catch (e) {
      console.error("Product fallback collection error:", e);
    }
  }

  let approvalContext: string | undefined;
  if (needsApprovalContext(userText)) {
    try {
      const session = await getSession();
      approvalContext = await buildApprovalContext(session?.uid);
    } catch (e) {
      console.error("Approval context error:", e);
    }
  }

  const systemPrompt = buildSystemPrompt(
    summaries,
    selectedSources,
    approvalContext
  );

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: systemPrompt,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
