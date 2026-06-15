import { notFound } from "next/navigation";
import { getDashboardBySlug, getDashboards } from "@/lib/dashboards";
import DashboardViewer from "@/components/DashboardViewer";

export function generateStaticParams() {
  return getDashboards().map((d) => ({ slug: d.slug }));
}

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return params.then(({ slug }) => {
    const dashboard = getDashboardBySlug(slug);
    return {
      title: dashboard
        ? `${dashboard.name} — BiteMe 포털`
        : "BiteMe 포털 허브",
    };
  });
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dashboard = getDashboardBySlug(slug);

  if (!dashboard) {
    notFound();
  }

  return <DashboardViewer dashboard={dashboard} />;
}
