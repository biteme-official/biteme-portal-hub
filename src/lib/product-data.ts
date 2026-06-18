const FIREBASE_API_KEY = "AIzaSyBHFoGOyILOzMaaH0AkFriZEe6p5sbWPMY";
const PROJECT_ID = "md-dashboard-6fd45";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

let authCache: { token: string; expiresAt: number } | null = null;
let dataCache: { data: ProductSummary[]; fetchedAt: number } | null = null;
const DATA_TTL = 5 * 60 * 1000;

export interface ProductSummary {
  name: string;
  category: string;
  brand: string;
  skuType: string;
  releaseDate: string;
  arrivalDate: string;
  shootingDate: string;
  price: number;
  cost: number;
  regularPrice: number;
  totalOrderQty: number;
  isPriceConfirmed: boolean;
  isConfirmed: boolean;
  memo: string;
}

async function getAuthToken(): Promise<string> {
  if (authCache && Date.now() < authCache.expiresAt) {
    return authCache.token;
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true }),
    }
  );
  const data = await res.json();
  authCache = {
    token: data.idToken,
    expiresAt: Date.now() + 55 * 60 * 1000,
  };
  return data.idToken;
}

type FsVal = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  nullValue?: string;
  mapValue?: { fields: Record<string, FsVal> };
  arrayValue?: { values?: FsVal[] };
};

function parse(v: FsVal): unknown {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.mapValue?.fields) {
    return Object.fromEntries(
      Object.entries(v.mapValue.fields).map(([k, val]) => [k, parse(val)])
    );
  }
  if (v.arrayValue) {
    return (v.arrayValue.values ?? []).map(parse);
  }
  return null;
}

export async function fetchProductData(): Promise<ProductSummary[]> {
  if (dataCache && Date.now() - dataCache.fetchedAt < DATA_TTL) {
    return dataCache.data;
  }

  const token = await getAuthToken();
  const allDocs: ProductSummary[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${FIRESTORE_BASE}/skus`);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`Firestore ${res.status}: ${await res.text()}`);
    }

    const json = await res.json();
    pageToken = json.nextPageToken;

    for (const doc of json.documents ?? []) {
      const f = doc.fields as Record<string, FsVal> | undefined;
      if (!f) continue;
      const str = (key: string) => (f[key] ? (parse(f[key]) as string) : "") ?? "";
      const num = (key: string) => (f[key] ? (parse(f[key]) as number) : 0) ?? 0;
      const bool = (key: string) => (f[key] ? (parse(f[key]) as boolean) : false) ?? false;
      allDocs.push({
        name: str("name"),
        category: str("category"),
        brand: str("brand"),
        skuType: str("skuType"),
        releaseDate: str("releaseDate"),
        arrivalDate: str("arrivalDate"),
        shootingDate: str("shootingDate"),
        price: num("price"),
        cost: num("cost"),
        regularPrice: num("regularPrice"),
        totalOrderQty: num("totalOrderQty"),
        isPriceConfirmed: bool("isPriceConfirmed"),
        isConfirmed: bool("isConfirmed"),
        memo: str("memo"),
      });
    }
  } while (pageToken);

  dataCache = { data: allDocs, fetchedAt: Date.now() };
  return allDocs;
}
