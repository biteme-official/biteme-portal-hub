export interface Category {
  id: string;
  label: string;
  icon: string;
  order: number;
}

export interface Dashboard {
  slug: string;
  name: string;
  description: string;
  category: string;
  path: string;
  type: "iframe" | "external";
  status: "active" | "archive";
  owner: string;
  tags: string[];
  github?: string;
  roles?: string[];
  roleLabels?: Record<string, string>;
}

export interface DashboardConfig {
  categories: Category[];
  dashboards: Dashboard[];
}
