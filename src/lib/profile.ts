import { supabase } from './supabaseClient'
import { DEFAULT_DAILY_BUDGET_KG } from './emissionFactors'

export interface Profile {
  id: string
  daily_budget_kg: number
  created_at: string
}

const FALLBACK: Profile = {
  id: 'local',
  daily_budget_kg: DEFAULT_DAILY_BUDGET_KG,
  created_at: new Date().toISOString(),
}

export async function fetchProfile(): Promise<Profile> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as Profile | null) ?? FALLBACK
}

export async function saveBudget(budgetKg: number): Promise<Profile> {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ daily_budget_kg: budgetKg })
      .eq('id', (existing as { id: string }).id)
      .select()
      .single()
    if (error) throw new Error('Bütçe güncellenemedi.')
    return data as Profile
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert({ daily_budget_kg: budgetKg })
    .select()
    .single()
  if (error) throw new Error('Bütçe kaydedilemedi.')
  return data as Profile
}
