import { put, head } from "@vercel/blob";
import type { SourceId, DataSummary } from "./data-sources/types";

const BLOB_PREFIX = "knowledge/";
const CACHE_TTL = 5 * 60 * 1000;

const cache = new Map<SourceId, { data: DataSummary; fetchedAt: number }>();

export async function writeSummary(
  sourceId: SourceId,
  summary: DataSummary
): Promise<void> {
  const path = `${BLOB_PREFIX}${sourceId}.json`;
  await put(path, JSON.stringify(summary), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
  cache.set(sourceId, { data: summary, fetchedAt: Date.now() });
}

export async function readSummary(
  sourceId: SourceId
): Promise<DataSummary | null> {
  const cached = cache.get(sourceId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.data;
  }

  try {
    const path = `${BLOB_PREFIX}${sourceId}.json`;
    const blob = await head(path);
    if (!blob) return null;

    const res = await fetch(blob.url);
    if (!res.ok) return null;

    const data: DataSummary = await res.json();
    cache.set(sourceId, { data, fetchedAt: Date.now() });
    return data;
  } catch {
    return null;
  }
}

export async function readAllSummaries(): Promise<
  Partial<Record<SourceId, DataSummary>>
> {
  const sources: SourceId[] = ["product", "smartstore", "b2b"];
  const results: Partial<Record<SourceId, DataSummary>> = {};

  await Promise.all(
    sources.map(async (id) => {
      const summary = await readSummary(id);
      if (summary) results[id] = summary;
    })
  );

  return results;
}

export async function getStoreStatus(): Promise<
  Record<SourceId, { lastUpdated: string; recordCount: number } | null>
> {
  const sources: SourceId[] = ["product", "smartstore", "b2b"];
  const status: Record<
    SourceId,
    { lastUpdated: string; recordCount: number } | null
  > = { product: null, smartstore: null, b2b: null };

  await Promise.all(
    sources.map(async (id) => {
      const summary = await readSummary(id);
      if (summary) {
        status[id] = {
          lastUpdated: summary.meta.lastUpdated,
          recordCount: summary.meta.recordCount,
        };
      }
    })
  );

  return status;
}
