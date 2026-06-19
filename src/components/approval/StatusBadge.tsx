import type { ApprovalStatus } from "@/lib/types/approval";
import { STATUS_LABELS } from "@/lib/types/approval";

const statusStyles: Record<ApprovalStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  pending: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
  canceled: "bg-gray-100 text-gray-500",
};

export default function StatusBadge({ status }: { status: ApprovalStatus }) {
  return (
    <span
      className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusStyles[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
