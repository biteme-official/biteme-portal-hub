import { getStoreStatus } from "@/lib/knowledge-store";

export async function GET() {
  const status = await getStoreStatus();
  return Response.json(status);
}
