export type Category = 'transport' | 'electricity';

export interface Entry {
  id: string;
  user_id: string;
  entry_date: string;
  category: Category;
  subtype: string;
  amount: number;
  unit: string;
  co2_kg: number;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  text: string;
  done: boolean;
  task_date: string;
  created_at: string;
}

export interface Profile {
  id: string;
  daily_budget_kg: number;
  created_at: string;
}

export interface TrendPoint {
  date: string;
  transport: number;
  electricity: number;
  total: number;
}

export interface Equivalents {
  trees_year: number;
  car_km: number;
  coffee_cups: number;
}

export interface Insight {
  summary: string;
  today_total_kg: number;
  week_total_kg: number;
  prev_week_total_kg: number;
  month_total_kg: number;
  week_change_pct: number | null;
  daily_avg_kg: number;
  turkey_daily_avg_kg: number;
  vs_turkey_pct: number;
  by_category: Record<string, number>;
  by_subtype: Record<string, number>;
  top_category: string | null;
  top_subtype: string | null;
  trend: TrendPoint[];
  equivalents: Equivalents;
  streak_days: number;
}

export interface CoachResult {
  provider: 'gemini' | 'openai' | 'rule_based';
  tips: Task[];
}
