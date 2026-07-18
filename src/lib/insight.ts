import { supabase } from './supabaseClient';
import { fetchEntriesBetween } from './tracking';
import { EQUIVALENTS, TRANSPORT_FACTORS, TURKEY_DAILY_AVG_KG } from './emissionFactors';
import type { Entry, Insight, Equivalents, TrendPoint } from '../types';

const LABELS: Record<string, string> = {
  transport: 'ulaşım',
  electricity: 'elektrik',
};

function sum(entries: Entry[]): number {
  return Math.round(entries.reduce((acc, e) => acc + e.co2_kg, 0) * 100) / 100;
}

function byCategory(entries: Entry[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of entries) out[e.category] = Math.round(((out[e.category] || 0) + e.co2_kg) * 100) / 100;
  return out;
}

function bySubtype(entries: Entry[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of entries) out[e.subtype] = Math.round(((out[e.subtype] || 0) + e.co2_kg) * 100) / 100;
  const sorted = Object.entries(out).sort((a, b) => b[1] - a[1]);
  const result: Record<string, number> = {};
  for (const [k, v] of sorted) result[k] = v;
  return result;
}

function equivalents(totalKg: number): Equivalents {
  return {
    trees_year: Math.round((totalKg / EQUIVALENTS.tree_year_kg) * 10) / 10,
    car_km: Math.round(totalKg / EQUIVALENTS.car_km_kg),
    coffee_cups: Math.round(totalKg / EQUIVALENTS.coffee_cup_kg),
  };
}

function buildTrend(allEntries: Entry[]): TrendPoint[] {
  const series: Record<string, Record<string, number>> = {};
  for (const e of allEntries) {
    if (!series[e.entry_date]) series[e.entry_date] = {};
    series[e.entry_date][e.category] = Math.round(((series[e.entry_date][e.category] || 0) + e.co2_kg) * 100) / 100;
  }
  return Object.entries(series)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({
      date,
      transport: v.transport || 0,
      electricity: v.electricity || 0,
      total: Math.round(((v.transport || 0) + (v.electricity || 0)) * 100) / 100,
    }));
}

export async function streakDays(): Promise<number> {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 365);
  const startStr = start.toISOString().slice(0, 10);

  const [entriesRes, tasksRes] = await Promise.all([
    supabase.from('entries').select('entry_date').gte('entry_date', startStr),
    supabase.from('tasks').select('task_date').eq('done', true).gte('task_date', startStr),
  ]);

  const days = new Set<string>();
  for (const e of entriesRes.data || []) days.add(e.entry_date);
  for (const t of tasksRes.data || []) days.add(t.task_date);

  let streak = 0;
  const cursor = new Date(today);
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export async function analyze(): Promise<Insight> {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const prevWeekStart = new Date(today);
  prevWeekStart.setDate(prevWeekStart.getDate() - 13);
  const prevWeekStartStr = prevWeekStart.toISOString().slice(0, 10);
  const prevWeekEnd = new Date(today);
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);
  const prevWeekEndStr = prevWeekEnd.toISOString().slice(0, 10);
  const monthStart = new Date(today);
  monthStart.setDate(monthStart.getDate() - 29);
  const monthStartStr = monthStart.toISOString().slice(0, 10);

  const [week, prevWeek, month, todayEntries, monthEntries] = await Promise.all([
    fetchEntriesBetween(weekStartStr, todayStr),
    fetchEntriesBetween(prevWeekStartStr, prevWeekEndStr),
    fetchEntriesBetween(monthStartStr, todayStr),
    fetchEntriesBetween(todayStr, todayStr),
    fetchEntriesBetween(monthStartStr, todayStr),
  ]);

  const weekTotal = sum(week);
  const prevTotal = sum(prevWeek);
  const monthTotal = sum(month);
  const todayTotal = sum(todayEntries);
  const cats = byCategory(week);
  const subs = bySubtype(week);
  const trend = buildTrend(monthEntries);

  let changePct: number | null = null;
  if (prevTotal > 0) changePct = Math.round(((weekTotal - prevTotal) / prevTotal) * 1000) / 10;

  const topCategory = Object.keys(cats).length > 0
    ? Object.entries(cats).sort((a, b) => b[1] - a[1])[0][0]
    : null;
  const topSubtype = Object.keys(subs).length > 0 ? Object.keys(subs)[0] : null;

  let summary: string;
  if (week.length === 0) {
    summary = 'Bu hafta henüz veri girmediniz. Ulaşım veya elektrik girişi yaptığınızda size özel içgörüler burada görünecek.';
  } else {
    const parts: string[] = [`Bu hafta toplam ${weekTotal} kg CO₂e ürettiniz.`];
    if (topCategory) {
      const share = weekTotal ? Math.round((cats[topCategory] / weekTotal) * 100) : 0;
      parts.push(`En büyük payı %${share} ile ${LABELS[topCategory] || topCategory} alıyor.`);
      if (topSubtype && topSubtype in TRANSPORT_FACTORS) {
        parts.push(`Öne çıkan kalem: ${TRANSPORT_FACTORS[topSubtype as keyof typeof TRANSPORT_FACTORS].label.toLowerCase()}.`);
      }
    }
    if (changePct !== null) {
      if (changePct > 5) parts.push(`Geçen haftaya göre %${Math.abs(changePct)} artış var — küçük bir rota değişikliği iyi gelebilir.`);
      else if (changePct < -5) parts.push(`Geçen haftaya göre %${Math.abs(changePct)} azalttınız, harika gidiyorsunuz! 🌱`);
      else parts.push('Geçen haftayla benzer seviyedesiniz.');
    }
    summary = parts.join(' ');
  }

  const dailyAvg = Math.round((weekTotal / 7) * 100) / 100;
  const vsTurkeyPct = dailyAvg ? Math.round((dailyAvg / TURKEY_DAILY_AVG_KG) * 100) : 0;
  const streak = await streakDays();

  return {
    summary,
    today_total_kg: todayTotal,
    week_total_kg: weekTotal,
    prev_week_total_kg: prevTotal,
    month_total_kg: monthTotal,
    week_change_pct: changePct,
    daily_avg_kg: dailyAvg,
    turkey_daily_avg_kg: TURKEY_DAILY_AVG_KG,
    vs_turkey_pct: vsTurkeyPct,
    by_category: cats,
    by_subtype: subs,
    top_category: topCategory,
    top_subtype: topSubtype,
    trend,
    equivalents: equivalents(weekTotal),
    streak_days: streak,
  };
}
