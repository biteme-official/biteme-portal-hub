import { getSession } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

const TEST_APPROVALS = [
  {
    title: "[구매요청] 마케팅 촬영 장비 구매",
    description:
      "2026년 하반기 콘텐츠 촬영용 장비 구매 요청입니다.\n\n- Sony A7IV 바디 1대\n- 50mm f/1.4 렌즈 1개\n- 삼각대 + 조명세트\n\n총 예상 금액: 4,200,000원",
    category: "구매요청",
    isUrgent: false,
    requesterName: "박준혁",
    requesterDept: "MKT팀",
  },
  {
    title: "[긴급] 일본 출장 경비 정산",
    description:
      "2026.06.10~06.13 도쿄 파트너사 미팅 출장 경비 정산\n\n- 항공: 680,000원\n- 숙박(3박): 450,000원\n- 교통/식비: 280,000원\n\n합계: 1,410,000원\n\n영수증 별첨",
    category: "기타",
    isUrgent: true,
    requesterName: "최유진",
    requesterDept: "해외팀",
  },
  {
    title: "6월 MKT 콘텐츠 예산 집행 요청",
    description: "6월 인스타그램/블로그 콘텐츠 제작 예산 집행 요청\n\n- 인플루언서 협찬 3건: 1,800,000원\n- 촬영 스튜디오 대관: 500,000원\n- 영상 편집 외주: 700,000원\n\n합계: 3,000,000원",
    category: "마케팅/프로모션",
    isUrgent: false,
    requesterName: "이서연",
    requesterDept: "MKT팀",
  },
  {
    title: "[구매요청] AWS 서버 증설 비용 승인",
    description:
      "트래픽 증가에 따른 AWS 인프라 증설 요청\n\n- EC2 t3.xlarge 2대 추가 (월 $320)\n- RDS 스토리지 500GB → 1TB (월 $80 증가)\n- CloudFront 대역폭 확대\n\n월 추가 비용: 약 $400 (≈ 550,000원)",
    category: "구매요청",
    isUrgent: false,
    requesterName: "김민수",
    requesterDept: "플랫폼팀",
  },
];

export async function POST() {
  const session = await getSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminDb();
  const currentUser = await db.collection("users").doc(session.uid).get();
  if (!currentUser.exists)
    return Response.json({ error: "User not found" }, { status: 404 });

  const cu = currentUser.data()!;
  const approverRef = {
    uid: cu.uid,
    name: cu.name,
    email: cu.email,
    department: cu.department || "",
    photoURL: cu.photoURL || null,
  };

  const created: string[] = [];

  for (const t of TEST_APPROVALS) {
    const docRef = db.collection("approvals").doc();

    const fakeRequester = {
      uid: `test-${t.requesterName}`,
      name: t.requesterName,
      email: `${t.requesterName}@biteme.co.kr`,
      department: t.requesterDept,
      photoURL: null,
    };

    const approvalLine = [
      {
        stepOrder: 1,
        approver: approverRef,
        status: "current",
        comment: null,
        decidedAt: null,
      },
    ];

    await docRef.set({
      title: t.title,
      description: t.description,
      category: t.category,
      isUrgent: t.isUrgent,
      requester: fakeRequester,
      status: "pending",
      approvalLine,
      currentStep: 1,
      ccList: [],
      attachments: [],
      comments: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      submittedAt: FieldValue.serverTimestamp(),
      completedAt: null,
    });

    created.push(docRef.id);
  }

  return Response.json({
    message: `테스트 결재 ${created.length}건 생성 완료`,
    ids: created,
  });
}
