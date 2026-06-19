import { Check, X, Clock, CircleDot } from "lucide-react";
import type { ApprovalStep } from "@/lib/types/approval";

const stepConfig = {
  waiting: {
    icon: Clock,
    color: "text-gray-400",
    bg: "bg-gray-100",
    line: "bg-gray-200",
  },
  current: {
    icon: CircleDot,
    color: "text-accent",
    bg: "bg-accent/10",
    line: "bg-accent/30",
  },
  approved: {
    icon: Check,
    color: "text-green-600",
    bg: "bg-green-100",
    line: "bg-green-300",
  },
  rejected: {
    icon: X,
    color: "text-red-600",
    bg: "bg-red-100",
    line: "bg-red-300",
  },
};

export default function ApprovalTimeline({
  steps,
}: {
  steps: ApprovalStep[];
}) {
  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const config = stepConfig[step.status];
        const Icon = config.icon;
        const isLast = i === steps.length - 1;

        return (
          <div key={step.stepOrder} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${config.bg}`}
              >
                <Icon size={14} className={config.color} />
              </div>
              {!isLast && (
                <div className={`w-0.5 h-full min-h-8 ${config.line}`} />
              )}
            </div>

            <div className="pb-6 flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                {step.approver.photoURL ? (
                  <img
                    src={step.approver.photoURL}
                    alt={step.approver.name}
                    className="w-5 h-5 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-surface text-text-secondary text-[10px] font-bold flex items-center justify-center">
                    {step.approver.name[0]}
                  </div>
                )}
                <span className="text-sm font-medium text-text-primary">
                  {step.approver.name}
                </span>
                {step.approver.department && (
                  <span className="text-xs text-text-secondary">
                    {step.approver.department}
                  </span>
                )}
              </div>

              <p className={`text-xs ${config.color} mb-1`}>
                {step.status === "waiting" && "대기중"}
                {step.status === "current" && "결재 대기"}
                {step.status === "approved" && "승인"}
                {step.status === "rejected" && "반려"}
                {step.decidedAt && (
                  <span className="text-text-secondary ml-1">
                    · {new Date(step.decidedAt).toLocaleString("ko-KR")}
                  </span>
                )}
              </p>

              {step.comment && (
                <p className="text-xs text-text-secondary bg-surface rounded-lg px-3 py-2 mt-1">
                  &quot;{step.comment}&quot;
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
