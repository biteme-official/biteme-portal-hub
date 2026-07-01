"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  ShoppingBag,
  Building2,
  Package,
  TrendingUp,
  Tag,
  Target,
  Globe,
  MoreHorizontal,
  Archive,
  Home,
  Sparkles,
  ClipboardCheck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  getCategories,
  getDashboardsByCategory,
  getArchivedDashboards,
} from "@/lib/dashboards";
import { useAuth } from "@/contexts/AuthContext";
import { useMobileSidebar } from "@/contexts/MobileSidebarContext";

const iconMap: Record<string, LucideIcon> = {
  ShoppingBag,
  Building2,
  Package,
  TrendingUp,
  Tag,
  Target,
  Globe,
  MoreHorizontal,
};

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isOpen, close } = useMobileSidebar();
  const categories = getCategories();
  const archived = getArchivedDashboards();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={close}
        />
      )}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-border flex flex-col z-50 overflow-y-auto transition-transform duration-200 md:static md:w-60 md:shrink-0 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-3 md:hidden">
          <span className="text-sm font-bold text-text-primary">메뉴</span>
          <button
            onClick={close}
            className="p-1.5 rounded-lg hover:bg-surface text-text-secondary"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-3 space-y-1">
          <Link
            href="/"
            onClick={close}
            className={`flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-lg text-sm no-underline transition-colors ${
              pathname === "/"
                ? "bg-accent-light text-accent font-semibold"
                : "text-text-secondary hover:bg-surface"
            }`}
          >
            <Home size={16} />
            <span>홈</span>
          </Link>
        <Link
          href="/ai"
          onClick={close}
          className={`flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-lg text-sm no-underline transition-colors ${
            pathname === "/ai"
              ? "bg-accent-light text-accent font-semibold"
              : "text-text-secondary hover:bg-surface"
          }`}
        >
          <Sparkles size={16} />
          <span>AI 어시스턴트</span>
        </Link>
        <Link
          href="/approval"
          onClick={close}
          className={`flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-lg text-sm no-underline transition-colors ${
            pathname.startsWith("/approval")
              ? "bg-accent-light text-accent font-semibold"
              : "text-text-secondary hover:bg-surface"
          }`}
        >
          <ClipboardCheck size={16} />
          <span>전자결재</span>
        </Link>
        {user?.role === "admin" && (
          <Link
            href="/admin/users"
            onClick={close}
            className={`flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-lg text-sm no-underline transition-colors ${
              pathname.startsWith("/admin")
                ? "bg-accent-light text-accent font-semibold"
                : "text-text-secondary hover:bg-surface"
            }`}
          >
            <Users size={16} />
            <span>사용자 관리</span>
          </Link>
        )}
      </div>

      <div className="flex-1 px-3 pb-3">
        {categories.map((cat) => {
          const Icon = iconMap[cat.icon] || MoreHorizontal;
          const dashboards = getDashboardsByCategory(cat.id).filter(
            (d) =>
              d.status === "active" &&
              (!d.visiblePositions ||
                user?.role === "admin" ||
                (user?.position && d.visiblePositions.includes(user.position)))
          );

          return (
            <div key={cat.id} className="mb-1">
              <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                <Icon size={14} />
                <span>{cat.label}</span>
                {dashboards.length > 0 && (
                  <span className="ml-auto text-[10px] bg-surface rounded-full px-1.5 py-0.5">
                    {dashboards.length}
                  </span>
                )}
              </div>

              {dashboards.length === 0 ? (
                <div className="px-3 py-1.5 text-xs text-text-secondary/50 italic">
                  등록된 항목 없음
                </div>
              ) : (
                dashboards.map((d) => {
                  const isActive = pathname === `/dashboard/${d.slug}`;
                  return (
                    <Link
                      key={d.slug}
                      href={`/dashboard/${d.slug}`}
                      onClick={close}
                      className={`block px-3 py-2 md:py-1.5 ml-5 rounded-md text-sm no-underline transition-colors ${
                        isActive
                          ? "bg-accent-light text-accent font-medium"
                          : "text-text-primary hover:bg-surface"
                      }`}
                    >
                      {d.name}
                    </Link>
                  );
                })
              )}
            </div>
          );
        })}

        {archived.length > 0 && (
          <>
            <div className="border-t border-border my-3" />
            <div className="mb-1">
              <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                <Archive size={14} />
                <span>아카이브</span>
                <span className="ml-auto text-[10px] bg-surface rounded-full px-1.5 py-0.5">
                  {archived.length}
                </span>
              </div>
              {archived.map((d) => {
                const isActive = pathname === `/dashboard/${d.slug}`;
                return (
                  <Link
                    key={d.slug}
                    href={`/dashboard/${d.slug}`}
                    onClick={close}
                    className={`block px-3 py-2 md:py-1.5 ml-5 rounded-md text-sm no-underline transition-colors opacity-60 ${
                      isActive
                        ? "bg-accent-light text-accent font-medium opacity-100"
                        : "text-text-primary hover:bg-surface"
                    }`}
                  >
                    {d.name}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
      </aside>
    </>
  );
}
