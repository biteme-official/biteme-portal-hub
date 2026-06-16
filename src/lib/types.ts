export interface Category {
  id: string;
  label: string;
  icon: string;
  order: number;
}

export interface DashboardTab {
  id: string;
  label: string;
  path: string;
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
  tabs?: DashboardTab[];
}

export interface DashboardConfig {
  categories: Category[];
  dashboards: Dashboard[];
}
