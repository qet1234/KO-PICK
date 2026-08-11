import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';

const SAVED_KEY = 'todaywhere:saved-places:v1';
const RECENT_KEY = 'todaywhere:recent-places:v1';
const MAX_SAVED = 100;
const MAX_RECENT = 30;
export const PLACE_LIBRARY_LOGIN_REQUIRED = '장소 저장과 최근 기록은 로그인이 필요합니다.';

export class PlaceLibraryLoginRequiredError extends Error {
  constructor() {
    super(PLACE_LIBRARY_LOGIN_REQUIRED);
    this.name = 'PlaceLibraryLoginRequiredError';
  }
}

export type LibraryPlace = {
  source: string;
  sourceId: string;
  placeName: string;
  category: string;
  region: string | null;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  savedAt?: string;
  viewedAt?: string;
};

export type LibraryPlaceInput = {
  id: string | number;
  name?: string;
  placeName?: string;
  category: string;
  region?: string | null;
  city?: string | null;
  address?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  imageUrl?: string | null;
  imageThumbnailUrl?: string | null;
  source?: string;
};

export type PlaceLibrary = { saved: LibraryPlace[]; recent: LibraryPlace[] };

function finiteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toLibraryPlace(place: LibraryPlaceInput): LibraryPlace {
  return {
    source: place.source?.trim() || 'tourapi',
    sourceId: String(place.id),
    placeName: (place.placeName ?? place.name ?? '').trim(),
    category: place.category.trim() || '장소',
    region: place.region?.trim() || null,
    city: place.city?.trim() || null,
    address: place.address?.trim() || null,
    latitude: finiteNumber(place.latitude),
    longitude: finiteNumber(place.longitude),
    imageUrl: (place.imageUrl ?? place.imageThumbnailUrl)?.trim() || null,
  };
}

export function libraryPlaceKey(place: Pick<LibraryPlace, 'source' | 'sourceId'>) {
  return `${place.source}:${place.sourceId}`;
}

async function read(key: string) {
  try {
    const value = JSON.parse((await AsyncStorage.getItem(key)) ?? '[]');
    return Array.isArray(value) ? value as LibraryPlace[] : [];
  } catch {
    return [];
  }
}

function unique(places: LibraryPlace[], limit: number, field: 'savedAt' | 'viewedAt') {
  const seen = new Set<string>();
  return [...places]
    .sort((left, right) => String(right[field] ?? '').localeCompare(String(left[field] ?? '')))
    .filter((place) => {
      const key = libraryPlaceKey(place);
      if (!place.sourceId || !place.placeName || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function baseRow(place: LibraryPlace, userId: string) {
  return {
    user_id: userId,
    place_source: place.source,
    place_id: place.sourceId,
    place_name: place.placeName,
    category: place.category,
    region: place.region,
    city: place.city,
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    image_url: place.imageUrl,
  };
}

function savedRow(place: LibraryPlace, userId: string) {
  return { ...baseRow(place, userId), saved_at: place.savedAt ?? new Date().toISOString() };
}

function recentRow(place: LibraryPlace, userId: string) {
  return { ...baseRow(place, userId), viewed_at: place.viewedAt ?? new Date().toISOString() };
}

function fromRow(value: Record<string, unknown>, recent: boolean): LibraryPlace {
  return {
    source: String(value.place_source ?? 'tourapi'),
    sourceId: String(value.place_id ?? ''),
    placeName: String(value.place_name ?? ''),
    category: String(value.category ?? '장소'),
    region: value.region ? String(value.region) : null,
    city: value.city ? String(value.city) : null,
    address: value.address ? String(value.address) : null,
    latitude: finiteNumber(value.latitude),
    longitude: finiteNumber(value.longitude),
    imageUrl: value.image_url ? String(value.image_url) : null,
    ...(recent ? { viewedAt: String(value.viewed_at ?? new Date().toISOString()) } : { savedAt: String(value.saved_at ?? new Date().toISOString()) }),
  };
}

export async function loadPlaceLibrary(): Promise<PlaceLibrary> {
  const [localSaved, localRecent, userResult] = await Promise.all([
    read(SAVED_KEY),
    read(RECENT_KEY),
    supabase.auth.getUser(),
  ]);
  const local = {
    saved: unique(localSaved, MAX_SAVED, 'savedAt'),
    recent: unique(localRecent, MAX_RECENT, 'viewedAt'),
  };
  const user = userResult.data.user;
  if (!user) return { saved: [], recent: [] };

  const [savedResult, recentResult] = await Promise.all([
    supabase.from('user_saved_places').select('*').order('saved_at', { ascending: false }).limit(MAX_SAVED),
    supabase.from('user_recent_places').select('*').order('viewed_at', { ascending: false }).limit(MAX_RECENT),
  ]);
  if (savedResult.error || recentResult.error) return local;

  const saved = unique([...local.saved, ...(savedResult.data ?? []).map((item) => fromRow(item, false))], MAX_SAVED, 'savedAt');
  const recent = unique([...local.recent, ...(recentResult.data ?? []).map((item) => fromRow(item, true))], MAX_RECENT, 'viewedAt');
  await Promise.all([AsyncStorage.setItem(SAVED_KEY, JSON.stringify(saved)), AsyncStorage.setItem(RECENT_KEY, JSON.stringify(recent))]);
  if (local.saved.length) void supabase.from('user_saved_places').upsert(local.saved.map((place) => savedRow(place, user.id)), { onConflict: 'user_id,place_source,place_id' });
  if (local.recent.length) void supabase.from('user_recent_places').upsert(local.recent.map((place) => recentRow(place, user.id)), { onConflict: 'user_id,place_source,place_id' });
  return { saved, recent };
}

export async function toggleSavedPlace(input: LibraryPlaceInput) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new PlaceLibraryLoginRequiredError();

  const place = toLibraryPlace(input);
  const current = unique(await read(SAVED_KEY), MAX_SAVED, 'savedAt');
  const key = libraryPlaceKey(place);
  const exists = current.some((item) => libraryPlaceKey(item) === key);
  const saved = exists
    ? current.filter((item) => libraryPlaceKey(item) !== key)
    : unique([{ ...place, savedAt: new Date().toISOString() }, ...current], MAX_SAVED, 'savedAt');
  await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(saved));

  if (exists) {
    await supabase.from('user_saved_places').delete().eq('user_id', data.user.id).eq('place_source', place.source).eq('place_id', place.sourceId);
  } else {
    await supabase.from('user_saved_places').upsert(savedRow({ ...place, savedAt: new Date().toISOString() }, data.user.id), { onConflict: 'user_id,place_source,place_id' });
  }
  return !exists;
}

export async function recordRecentPlace(input: LibraryPlaceInput) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return false;

  const place = { ...toLibraryPlace(input), viewedAt: new Date().toISOString() };
  const recent = unique([place, ...await read(RECENT_KEY)], MAX_RECENT, 'viewedAt');
  await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  await supabase.from('user_recent_places').upsert(recentRow(place, data.user.id), { onConflict: 'user_id,place_source,place_id' });
  return true;
}

export async function clearRecentPlaces() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new PlaceLibraryLoginRequiredError();

  await AsyncStorage.setItem(RECENT_KEY, '[]');
  await supabase.from('user_recent_places').delete().eq('user_id', data.user.id);
}
