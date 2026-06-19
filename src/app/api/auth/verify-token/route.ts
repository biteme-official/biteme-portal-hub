import { jwtVerify } from "jose";

const SECRET_KEY = process.env.SESSION_SECRET!;
const encodedKey = new TextEncoder().encode(SECRET_KEY);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    if (!token)
      return Response.json(
        { valid: false, error: "Token required" },
        { status: 400, headers: CORS_HEADERS }
      );

    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });

    if (payload.type !== "iframe")
      return Response.json(
        { valid: false, error: "Invalid token type" },
        { status: 400, headers: CORS_HEADERS }
      );

    return Response.json(
      {
        valid: true,
        user: {
          uid: payload.uid,
          email: payload.email,
          name: payload.name,
          slug: payload.slug,
          dashboardRole: payload.dashboardRole,
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch {
    return Response.json(
      { valid: false, error: "Invalid or expired token" },
      { status: 401, headers: CORS_HEADERS }
    );
  }
}
