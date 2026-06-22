import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import type { NotificationType } from "@/lib/types/notification";

const BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const PORTAL_URL =
  process.env.NEXT_PUBLIC_PORTAL_URL || "https://portal.biteme.co.kr";

const TYPE_EMOJI: Record<NotificationType, string> = {
  approval_submitted: "📋",
  approval_approved: "✅",
  approval_rejected: "❌",
  approval_canceled: "🚫",
  approval_comment: "💬",
  approval_reminder: "⏰",
  user_registered: "👤",
};

const TYPE_COLOR: Record<NotificationType, string> = {
  approval_submitted: "#FF6B35",
  approval_approved: "#22c55e",
  approval_rejected: "#ef4444",
  approval_canceled: "#6b7280",
  approval_comment: "#3b82f6",
  approval_reminder: "#f59e0b",
  user_registered: "#8b5cf6",
};

async function slackApi(method: string, body: Record<string, unknown>) {
  if (!BOT_TOKEN) return null;
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

const slackIdCache = new Map<string, string | null>();

async function getSlackUserId(email: string): Promise<string | null> {
  if (slackIdCache.has(email)) return slackIdCache.get(email)!;

  const db = getAdminDb();
  const snap = await db
    .collection("users")
    .where("email", "==", email)
    .limit(1)
    .get();
  if (!snap.empty) {
    const slackId = snap.docs[0].data().slackUserId;
    if (slackId) {
      slackIdCache.set(email, slackId);
      return slackId;
    }
  }

  const result = await slackApi("users.lookupByEmail", { email });
  const slackId = result?.ok ? result.user?.id : null;
  slackIdCache.set(email, slackId);

  if (slackId && !snap.empty) {
    snap.docs[0].ref.update({ slackUserId: slackId }).catch(() => {});
  }

  return slackId;
}

async function sendDm(slackUserId: string, blocks: unknown[], color: string) {
  const openRes = await slackApi("conversations.open", {
    users: slackUserId,
  });
  if (!openRes?.ok) return;

  await slackApi("chat.postMessage", {
    channel: openRes.channel.id,
    text: "",
    attachments: [{ color, blocks }],
  });
}

function buildBlocks(
  type: NotificationType,
  title: string,
  body: string,
  linkUrl: string
) {
  const emoji = TYPE_EMOJI[type];

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${emoji} *${title}*\n${body}`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "포털에서 확인" },
          url: linkUrl,
          style: "primary",
        },
      ],
    },
  ];
}

interface SlackDmParams {
  recipientEmails: string[];
  type: NotificationType;
  title: string;
  body: string;
  approvalId?: string;
  linkUrl?: string;
}

export async function sendSlackDm(params: SlackDmParams) {
  if (!BOT_TOKEN) return;

  const color = TYPE_COLOR[params.type];
  const link = params.linkUrl
    ? `${PORTAL_URL}${params.linkUrl}`
    : params.approvalId
      ? `${PORTAL_URL}/approval/${params.approvalId}`
      : PORTAL_URL;
  const blocks = buildBlocks(params.type, params.title, params.body, link);

  const results = await Promise.allSettled(
    params.recipientEmails.map(async (email) => {
      const slackId = await getSlackUserId(email);
      if (!slackId) return;
      await sendDm(slackId, blocks, color);
    })
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) {
    console.error(`Slack DM: ${failed}/${results.length} failed`);
  }
}

export async function sendSlackReminders(
  items: {
    id: string;
    title: string;
    requesterName: string;
    daysSince: number;
    approverEmail: string;
  }[]
) {
  if (!BOT_TOKEN || items.length === 0) return;

  const byApprover = new Map<string, typeof items>();
  for (const item of items) {
    const list = byApprover.get(item.approverEmail) || [];
    list.push(item);
    byApprover.set(item.approverEmail, list);
  }

  for (const [email, approverItems] of byApprover) {
    const slackId = await getSlackUserId(email);
    if (!slackId) continue;

    const lines = approverItems
      .map(
        (i) =>
          `• <${PORTAL_URL}/approval/${i.id}|${i.title}> — ${i.requesterName} (${i.daysSince}일 경과)`
      )
      .join("\n");

    const blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `⏰ *미결재 알림* — ${approverItems.length}건의 결재가 대기 중입니다.\n\n${lines}`,
        },
      },
    ];

    await sendDm(slackId, blocks, TYPE_COLOR.approval_reminder);
  }
}
