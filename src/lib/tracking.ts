import { supabase } from './supabaseClient';
import {
  ELECTRICITY_KG_PER_KWH,
  TRANSPORT_FACTORS,
  type TransportKey,
} from './emissionFactors';
import type { Entry } from '../types';

export class TrackingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TrackingError';
  }
}

function validateAmount(amount: number, unit: string): number {
  if (isNaN(amount)) throw new TrackingError(`Geçersiz miktar: sayı bekleniyor (${unit}).`);
  if (amount <= 0) throw new TrackingError(`Miktar pozitif olmalı (${unit}).`);
  if (unit === 'km' && amount > 20000) throw new TrackingError('Tek girişte 20.000 km üstü kabul edilmiyor.');
  if (unit === 'kWh' && amount > 100000) throw new TrackingError('Tek girişte 100.000 kWh üstü kabul edilmiyor.');
  return amount;
}

export async function trackTransport(
  subtype: string,
  km: number,
  entryDate: string,
): Promise<Entry> {
  if (!(subtype in TRANSPORT_FACTORS)) throw new TrackingError(`Bilinmeyen araç tipi: ${subtype}`);
  km = validateAmount(km, 'km');

  const factor = TRANSPORT_FACTORS[subtype as TransportKey].kg_per_km;
  const co2 = Math.round(km * factor * 1000) / 1000;

  const { data, error } = await supabase
    .from('entries')
    .insert({
      entry_date: entryDate,
      category: 'transport',
      subtype,
      amount: km,
      unit: 'km',
      co2_kg: co2,
    })
    .select()
    .single();

  if (error) throw new Error('Kayıt eklenemedi.');
  return data as Entry;
}

export async function trackElectricity(
  kwh: number,
  entryDate: string,
): Promise<Entry> {
  kwh = validateAmount(kwh, 'kWh');
  const co2 = Math.round(kwh * ELECTRICITY_KG_PER_KWH * 1000) / 1000;

  const { data, error } = await supabase
    .from('entries')
    .insert({
      entry_date: entryDate,
      category: 'electricity',
      subtype: 'grid',
      amount: kwh,
      unit: 'kWh',
      co2_kg: co2,
    })
    .select()
    .single();

  if (error) throw new Error('Kayıt eklenemedi.');
  return data as Entry;
}

export async function deleteEntry(entryId: string): Promise<boolean> {
  const { error } = await supabase.from('entries').delete().eq('id', entryId);
  if (error) throw new Error('Kayıt silinemedi.');
  return true;
}

export async function fetchEntries(limit = 50): Promise<Entry[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error('Kayıtlar yüklenemedi.');
  return (data || []) as Entry[];
}

export async function fetchEntriesBetween(startDate: string, endDate: string): Promise<Entry[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .gte('entry_date', startDate)
    .lte('entry_date', endDate)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw new Error('Kayıtlar yüklenemedi.');
  return (data || []) as Entry[];
}
