import { getAdminDb } from "@/lib/firebase/admin";
import { slackApi, sendUserApprovedDm } from "@/lib/notifications/slack";
import crypto from "crypto";

const SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || "";

const DIVISIONS: Record<string, string[]> = {
  "CEO 직속": ["전략기획팀", "MKT팀", "해외팀"],
  "COO 본부": ["경영지원팀", "플랫폼팀", "브랜드팀", "CS팀"],
  "CPO 본부": ["상품기획팀", "패션팀", "디자인팀"],
};

const DIVISION_OPTIONS = Object.keys(DIVISIONS).map((d) => ({
  text: { type: "plain_text", text: d },
  value: d,
}));

const TEAM_OPTION_GROUPS = Object.entries(DIVISIONS).map(([div, teams]) => ({
  label: { type: "plain_text", text: div },
  options: teams.map((t) => ({
    text: { type: "plain_text", text: t },
    value: t,
  })),
}));

const POSITION_OPTIONS = ["사원", "팀장", "본부장", "대표"].map((p) => ({
  text: { type: "plain_text", text: p },
  value: p,
}));

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

      const privateMetadata = JSON.stringify({
        targetUid,
        channelId: payload.channel.id,
        messageTs: payload.message.ts,
      });

      await slackApi("views.open", {
        trigger_id: payload.trigger_id,
        view: {
          type: "modal",
          callback_id: "approve_user_modal",
          title: { type: "plain_text", text: "사용자 승인" },
          submit: { type: "plain_text", text: "승인" },
          close: { type: "plain_text", text: "취소" },
          private_metadata: privateMetadata,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `👤 *${userData.name}* (${userData.email})`,
              },
            },
            { type: "divider" },
            {
              type: "input",
              block_id: "division_block",
              label: { type: "plain_text", text: "본부" },
              element: {
                type: "static_select",
                action_id: "division",
                placeholder: { type: "plain_text", text: "선택" },
                options: DIVISION_OPTIONS,
              },
            },
            {
              type: "input",
              block_id: "team_block",
              label: { type: "plain_text", text: "팀" },
              optional: true,
              element: {
                type: "static_select",
                action_id: "team",
                placeholder: { type: "plain_text", text: "선택 (없으면 비워두세요)" },
                option_groups: TEAM_OPTION_GROUPS,
              },
            },
            {
              type: "input",
              block_id: "position_block",
              label: { type: "plain_text", text: "직책" },
              element: {
                type: "static_select",
                action_id: "position",
                placeholder: { type: "plain_text", text: "선택" },
                options: POSITION_OPTIONS,
              },
            },
            {
              type: "input",
              block_id: "slack_id_block",
              label: { type: "plain_text", text: "Slack ID" },
              optional: true,
              element: {
                type: "plain_text_input",
                action_id: "slack_id",
                placeholder: {
                  type: "plain_text",
                  text: "U0XXXXXXXXX (프로필 > 더보기 > 멤버 ID 복사)",
                },
              },
            },
          ],
        },
      });

      return new Response("", { status: 200 });
    }
  }

  if (payload.type === "view_submission") {
    if (payload.view.callback_id === "approve_user_modal") {
      const meta = JSON.parse(payload.view.private_metadata);
      const values = payload.view.state.values;

      const division =
        values.division_block?.division?.selected_option?.value || "";
      const team =
        values.team_block?.team?.selected_option?.value || "";
      const position =
        values.position_block?.position?.selected_option?.value || "";
      const slackUserId =
        values.slack_id_block?.slack_id?.value?.trim() || null;

      const db = getAdminDb();
      const userRef = db.collection("users").doc(meta.targetUid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return Response.json({
          response_action: "errors",
          errors: { division_block: "사용자를 찾을 수 없습니다." },
        });
      }

      const userData = userDoc.data()!;

      const updateData: Record<string, unknown> = {
        isActive: true,
        division,
        department: team,
        position,
      };
      if (slackUserId) updateData.slackUserId = slackUserId;

      await userRef.update(updateData);

      const approverName =
        payload.user?.name || payload.user?.username || "관리자";
      const orgLabel = [division, team, position].filter(Boolean).join(" · ");

      await slackApi("chat.update", {
        channel: meta.channelId,
        ts: meta.messageTs,
        text: "",
        attachments: [
          {
            color: "#22c55e",
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `✅ *승인 완료* — ${userData.name}(${userData.email})님이 ${approverName}에 의해 승인되었습니다.\n📋 ${orgLabel}`,
                },
              },
            ],
          },
        ],
      });

      await sendUserApprovedDm(userData.email, userData.name).catch((e) =>
        console.error("Approved DM error:", e)
      );

      return new Response("", { status: 200 });
    }
  }

  return new Response("", { status: 200 });
}
