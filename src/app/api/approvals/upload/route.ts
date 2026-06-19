import { getSession } from "@/lib/auth/session";
import { put } from "@vercel/blob";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "파일이 필요합니다." }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return Response.json({ error: "파일 크기는 10MB 이하만 가능합니다." }, { status: 400 });
    }

    const blob = await put(`approval-attachments/${Date.now()}-${file.name}`, file, {
      access: "public",
    });

    const isImage = file.type.startsWith("image/");
    return Response.json({
      kind: isImage ? "image" : "file",
      name: file.name,
      url: blob.url,
      size: file.size,
      type: file.type,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return Response.json({ error: "업로드 실패" }, { status: 500 });
  }
}
