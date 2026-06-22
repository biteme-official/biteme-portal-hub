import { getAdminDb } from "@/lib/firebase/admin";
import { slackApi, sendUserApprovedDm } from "@/lib/notifications/slack";
import crypto from "crypto";

const SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || "";

function verifySlackRequest(
  body: string,
  timestamp: string,
  signature: string
): boolean {
  if (!SIGNING_SECRET) return true;
  const fiveMinAgo = Math.floor(Date.now() / 1000) - 300;
  if (parseInt(timestamp) < fiveMinAgo) return false;

  const sigBasestring = `v0:${timestamp}:${body}`;
  const mySignature =
    "v0=" +
    crypto
      .createHmac("sha256", SIGNING_SECRET)
      .update(sigBasestring)
      .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(signature)
  );
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const timestamp = request.headers.get("x-slack-request-timestamp") || "";
  const signature = request.headers.get("x-slack-signature") || "";

  if (SIGNING_SECRET && !verifySlackRequest(rawBody, timestamp, signature)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  const payloadStr = params.get("payload");
  if (!payloadStr) {
    return new Response("Missing payload", { status: 400 });
  }

  const payload = JSON.parse(payloadStr);

  if (payload.type === "block_actions") {
    const action = payload.actions?.[0];

    if (action?.action_id === "approve_user") {
      const targetUid = action.value;
      const db = getAdminDb();
      const userRef = db.collection("users").doc(targetUid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return Response.json({ text: "사용자를 찾을 수 없습니다." });
      }

      const userData = userDoc.data()!;

      if (userData.isActive) {
        await slackApi("chat.update", {
          channel: payload.channel.id,
          ts: payload.message.ts,
          text: "",
          attachments: [
            {
              color: "#22c55e",
              blocks: [
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: `✅ *승인 완료* — ${userData.name}(${userData.email})님은 이미 승인된 사용자입니다.`,
                  },
                },
              ],
            },
          ],
        });
        return new Response("", { status: 200 });
      }

      await userRef.update({ isActive: true });

      const approverName = payload.user?.name || payload.user?.username || "관리자";
      await slackApi("chat.update", {
        channel: payload.channel.id,
        ts: payload.message.ts,
        text: "",
        attachments: [
          {
            color: "#22c55e",
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `✅ *승인 완료* — ${userData.name}(${userData.email})님이 ${approverName}에 의해 승인되었습니다.`,
                },
              },
            ],
          },
        ],
      });

      sendUserApprovedDm(userData.email, userData.name).catch((e) =>
        console.error("Approved DM error:", e)
      );

      return new Response("", { status: 200 });
    }
  }

  return new Response("", { status: 200 });
}
