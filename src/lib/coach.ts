import { supabase } from './supabaseClient';
import type { Insight, Task } from '../types';

const SYSTEM_PROMPT = `Sen CarbOn adlı bir karbon ayak izi koçusun. Görevin,
kullanıcının haftalık verilerine bakarak TAM 3 adet kısa, somut ve bugün
uygulanabilir öneri üretmek.

Kurallar:
- Türkçe yaz. Samimi, motive edici, jargonsuz bir dil kullan.
- Her öneri tek cümle olsun ve mümkünse tahmini kazanımı kg CO₂e olarak belirt.
- Kullanıcının EN ÇOK etkilendiği alana odaklan.
- Suçlayıcı olma; küçük ve gerçekçi adımlar öner.
- SADECE şu JSON formatında yanıt ver, başka hiçbir şey yazma:
{"tips": ["öneri 1", "öneri 2", "öneri 3"]}`;

function ruleBased(insight: Insight): string[] {
  const tips: string[] = [];
  const subs = insight.by_subtype || {};
  const topCat = insight.top_category;
  const weekTotal = insight.week_total_kg || 0;

  const carKg = Object.entries(subs)
    .filter(([k]) => k.startsWith('car_') || k === 'motorcycle')
    .reduce((acc, [, v]) => acc + v, 0);

  if (carKg > 0) {
    const save = Math.round(carKg * 0.3 * 10) / 10;
    tips.push(`Bu hafta 2 kısa araba yolculuğunu toplu taşıma veya bisikletle değiştirin — yaklaşık ${save} kg CO₂e kazanç.`);
  }
  if (topCat === 'electricity' || subs.grid > 0) {
    tips.push('Kullanmadığınız cihazları bekleme modunda bırakmayın; prizden çekmek aylık 8–12 kWh (≈4–6 kg CO₂e) tasarruf sağlar.');
  }
  if ('plane_domestic' in subs) {
    tips.push('Bir sonraki şehirlerarası yolculuk için treni değerlendirin — km başına ucağa göre yaklaşık 6 kat daha az emisyon.');
  }
  if (weekTotal === 0) {
    tips.length = 0;
    tips.push('Bugünkü ilk ulaşım verinizi girin; koçunuz alışkanlıklarınızı tanımaya başlasın.');
    tips.push('Elektrik faturanızdaki kWh değerini ekleyin, evinizin ayak izini görün.');
    tips.push('Kısa mesafelerde yürümeyi deneyin — hem sıfır emisyon hem iyi bir başlangıç.');
  }
  const defaults = [
    'Çamaşır makinesini 30°C\'de ve tam dolu çalıştırın — yıkama başına ~0.6 kg CO₂e kazanç.',
    'Haftada bir günü \'arabasız gün\' ilan edin; küçük rutinler büyük fark yaratır.',
    'Aydınlatmada hâlâ akkor ampul varsa LED\'e geçin — ampul başına yılda ~25 kg CO₂e.',
    'Kombiyi/klimayı 1 derece kısmak yıllık enerji tüketimini %5–8 azaltır.',
  ];
  for (const d of defaults) {
    if (tips.length >= 3) break;
    if (!tips.includes(d)) tips.push(d);
  }
  return tips.slice(0, 3);
}

async function callEdgeFunction(insight: Insight): Promise<{ tips: string[]; provider: string } | null> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const url = `${supabaseUrl}/functions/v1/coach`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        insight,
        systemPrompt: SYSTEM_PROMPT,
      }),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.tips && Array.isArray(data.tips) && data.tips.length >= 3) {
      return { tips: data.tips.slice(0, 3), provider: data.provider || 'rule_based' };
    }
    return null;
  } catch {
    return null;
  }
}

export async function generateTips(insight: Insight): Promise<{ provider: string; tips: Task[] }> {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Delete old undone tasks for today
  await supabase.from('tasks').delete().eq('task_date', todayStr).eq('done', false);

  // Try LLM via edge function first
  const llmResult = await callEdgeFunction(insight);

  let tipTexts: string[];
  let provider: string;

  if (llmResult) {
    tipTexts = llmResult.tips;
    provider = llmResult.provider;
  } else {
    tipTexts = ruleBased(insight);
    provider = 'rule_based';
  }

  // Save tasks to DB
  const rows = tipTexts.map((text) => ({
    text,
    done: false,
    task_date: todayStr,
  }));

  const { data, error } = await supabase.from('tasks').insert(rows).select();
  if (error || !data) {
    // If save fails, return unsaved tips
    return {
      provider,
      tips: tipTexts.map((text, i) => ({
        id: `temp-${i}`,
        user_id: '',
        text,
        done: false,
        task_date: todayStr,
        created_at: new Date().toISOString(),
      })) as Task[],
    };
  }

  return { provider, tips: data as Task[] };
}

export async function fetchTasksForDay(): Promise<Task[]> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('task_date', todayStr)
    .order('created_at', { ascending: true });

  if (error) return [];
  return (data || []) as Task[];
}

export async function completeTask(taskId: string): Promise<boolean> {
  const { error } = await supabase.from('tasks').update({ done: true }).eq('id', taskId);
  if (error) throw new Error('Görev güncellenemedi.');
  return true;
}
