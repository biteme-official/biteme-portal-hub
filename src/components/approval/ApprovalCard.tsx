import Link from "next/link";
import StatusBadge from "./StatusBadge";
import type { ApprovalRequest } from "@/lib/types/approval";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

export default function ApprovalCard({
  approval,
}: {
  approval: ApprovalRequest;
}) {
  const currentApprover = approval.approvalLine.find(
    (s) => s.status === "current"
  );

  return (
    <Link
      href={`/approval/${approval.id}`}
      className="block bg-white rounded-xl border border-border p-4 no-underline hover:shadow-md hover:border-accent/30 transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <StatusBadge status={approval.status} />
        <span className="text-xs text-text-secondary">
          {formatDistanceToNow(new Date(approval.createdAt), {
            addSuffix: true,
            locale: ko,
          })}
        </span>
      </div>

      <h3 className="text-sm font-semibold text-text-primary mb-1 line-clamp-1">
        {approval.isUrgent && (
          <span className="text-red-500 mr-1">[긴급]</span>
        )}
        {approval.title}
      </h3>

      <p className="text-xs text-text-secondary mb-3 line-clamp-1">
        {approval.description || "설명 없음"}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {approval.requester.photoURL ? (
            <img
              src={approval.requester.photoURL}
              alt={approval.requester.name}
              className="w-5 h-5 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center">
              {approval.requester.name[0]}
            </div>
          )}
          <span className="text-xs text-text-secondary">
            {approval.requester.name}
          </span>
        </div>

        {currentApprover && (
          <span className="text-[11px] text-accent font-medium">
            → {currentApprover.approver.name}
          </span>
        )}

        <span className="text-[11px] text-text-secondary bg-surface px-1.5 py-0.5 rounded">
          {approval.category}
        </span>
      </div>
    </Link>
  );
}
