export type ApprovalStatus =
  | "draft"
  | "pending"
  | "in_progress"
  | "approved"
  | "rejected"
  | "canceled";

export type StepStatus = "waiting" | "current" | "approved" | "rejected";

export type VoteType = "none" | "options" | "yesno";

export interface VoteOption {
  id: string;
  label: string;
  description?: string;
}

export type ApprovalCategory =
  | "사업/전략"
  | "마케팅/프로모션"
  | "제품/MD"
  | "구매/발주"
  | "운영/CS"
  | "구매요청"
  | "기타";

export interface UserRef {
  uid: string;
  name: string;
  email: string;
  department: string;
  photoURL: string | null;
}

export interface ApprovalStep {
  stepOrder: number;
  approver: UserRef;
  status: StepStatus;
  comment: string | null;
  decidedAt: string | null;
  delegatedFrom?: { uid: string; name: string };
  delegatedBy?: string;
  selectedOption?: string | null;
  yesNoVote?: boolean | null;
}

export interface Attachment {
  kind: "file" | "image" | "link";
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface Comment {
  id: string;
  author: UserRef;
  text: string;
  createdAt: string;
}

export interface ApprovalRequest {
  id: string;
  title: string;
  description: string;
  category: ApprovalCategory;
  isUrgent: boolean;
  requester: UserRef;
  status: ApprovalStatus;
  approvalLine: ApprovalStep[];
  currentStep: number;
  ccList: UserRef[];
  attachments: Attachment[];
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  completedAt: string | null;
  voteType: VoteType;
  voteOptions: VoteOption[];
}

export interface ApprovalFormData {
  title: string;
  description: string;
  category: ApprovalCategory;
  isUrgent: boolean;
  approvers: UserRef[];
  ccList: UserRef[];
  attachments: Attachment[];
  voteType?: VoteType;
  voteOptions?: VoteOption[];
}

export const APPROVAL_CATEGORIES: ApprovalCategory[] = [
  "사업/전략",
  "마케팅/프로모션",
  "제품/MD",
  "구매/발주",
  "구매요청",
  "운영/CS",
  "기타",
];

export const STATUS_LABELS: Record<ApprovalStatus, string> = {
  draft: "임시저장",
  pending: "대기중",
  in_progress: "진행중",
  approved: "승인완료",
  rejected: "반려",
  canceled: "취소됨",
};
