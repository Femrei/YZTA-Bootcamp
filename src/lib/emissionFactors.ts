export const ELECTRICITY_KG_PER_KWH = 0.478;

export type TransportKey =
  | 'car_petrol'
  | 'car_diesel'
  | 'car_hybrid'
  | 'car_ev'
  | 'motorcycle'
  | 'bus'
  | 'minibus'
  | 'metro'
  | 'train'
  | 'plane_domestic'
  | 'walk_bike';

export interface TransportFactor {
  label: string;
  kg_per_km: number;
}

export const TRANSPORT_FACTORS: Record<TransportKey, TransportFactor> = {
  car_petrol:     { label: 'Otomobil (benzinli)',    kg_per_km: 0.171 },
  car_diesel:    { label: 'Otomobil (dizel)',       kg_per_km: 0.160 },
  car_hybrid:    { label: 'Otomobil (hibrit)',      kg_per_km: 0.110 },
  car_ev:        { label: 'Otomobil (elektrikli)',   kg_per_km: 0.072 },
  motorcycle:   { label: 'Motosiklet',              kg_per_km: 0.103 },
  bus:          { label: 'Otobüs',                 kg_per_km: 0.096 },
  minibus:      { label: 'Minibüs/Dolmuş',          kg_per_km: 0.105 },
  metro:        { label: 'Metro/Tramvay',          kg_per_km: 0.035 },
  train:        { label: 'Tren',                   kg_per_km: 0.041 },
  plane_domestic: { label: 'Uçak (iç hat)',         kg_per_km: 0.246 },
  walk_bike:    { label: 'Yürüyüş/Bisiklet',       kg_per_km: 0.0 },
};

export const EQUIVALENTS = {
  tree_year_kg: 21.0,
  car_km_kg: 0.171,
  coffee_cup_kg: 0.28,
  burger_kg: 2.5,
};

export const TURKEY_DAILY_AVG_KG = 14.8;
export const DEFAULT_DAILY_BUDGET_KG = 15.0;
