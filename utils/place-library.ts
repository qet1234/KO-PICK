import { createClient } from "@/utils/supabase/client";

export const PLACE_LIBRARY_EVENT = "todaywhere:place-library";

const SAVED_KEY = "todaywhere:saved-places:v1";
const RECENT_KEY = "todaywhere:recent-places:v1";
const MAX_SAVED = 100;
const MAX_RECENT = 30;

export interface LibraryPlace {
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
}

export interface PlaceLibrary {
  saved: LibraryPlace[];
  recent: LibraryPlace[];
}

export interface LibraryPlaceInput {
  id: number | string;
  name?: string;
  placeName?: string;
  category: string;
  region?: string | null;
  city?: string | null;
  address?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  imageUrl?: string | null;
  source?: string;
}

function browserAvailable() {
  return typeof window !== "undefined";
}

function finiteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseStored(key: string) {
  if (!browserAvailable()) return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? (value as LibraryPlace[]) : [];
  } catch {
    return [];
  }
}

function writeStored(key: string, places: LibraryPlace[]) {
  if (!browserAvailable()) return;
  window.localStorage.setItem(key, JSON.stringify(places));
}

function placeKey(place: Pick<LibraryPlace, "source" | "sourceId">) {
  return `${place.source}:${place.sourceId}`;
}

function uniquePlaces(places: LibraryPlace[], limit: number, dateField: "savedAt" | "viewedAt") {
  const sorted = [...places].sort((left, right) =>
    String(right[dateField] ?? "").localeCompare(String(left[dateField] ?? ""))
  );
  const seen = new Set<string>();
  return sorted.filter((place) => {
    const key = placeKey(place);
    if (!place.sourceId || !place.placeName || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

function emitLibraryChange() {
  if (browserAvailable()) window.dispatchEvent(new Event(PLACE_LIBRARY_EVENT));
}

export function toLibraryPlace(place: LibraryPlaceInput): LibraryPlace {
  return {
    source: place.source?.trim() || "tourapi",
    sourceId: String(place.id),
    placeName: (place.placeName ?? place.name ?? "").trim(),
    category: place.category.trim() || "장소",
    region: place.region?.trim() || null,
    city: place.city?.trim() || null,
    address: place.address?.trim() || null,
    latitude: finiteNumber(place.latitude),
    longitude: finiteNumber(place.longitude),
    imageUrl: place.imageUrl?.trim() || null,
  };
}

function fromSavedRow(row: Record<string, unknown>): LibraryPlace {
  return {
    source: String(row.place_source ?? "tourapi"),
    sourceId: String(row.place_id ?? ""),
    placeName: String(row.place_name ?? ""),
    category: String(row.category ?? "장소"),
    region: row.region ? String(row.region) : null,
    city: row.city ? String(row.city) : null,
    address: row.address ? String(row.address) : null,
    latitude: finiteNumber(row.latitude),
    longitude: finiteNumber(row.longitude),
    imageUrl: row.image_url ? String(row.image_url) : null,
    savedAt: String(row.saved_at ?? new Date().toISOString()),
  };
}

function fromRecentRow(row: Record<string, unknown>): LibraryPlace {
  return {
    ...fromSavedRow(row),
    savedAt: undefined,
    viewedAt: String(row.viewed_at ?? new Date().toISOString()),
  };
}

function savedRow(userId: string, place: LibraryPlace) {
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
    saved_at: place.savedAt ?? new Date().toISOString(),
  };
}

function recentRow(userId: string, place: LibraryPlace) {
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
    viewed_at: place.viewedAt ?? new Date().toISOString(),
  };
}

async function currentUser() {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    return { supabase, user: data.user };
  } catch {
    return { supabase: null, user: null };
  }
}

export function localPlaceLibrary(): PlaceLibrary {
  return {
    saved: uniquePlaces(parseStored(SAVED_KEY), MAX_SAVED, "savedAt"),
    recent: uniquePlaces(parseStored(RECENT_KEY), MAX_RECENT, "viewedAt"),
  };
}

export async function loadPlaceLibrary(): Promise<PlaceLibrary> {
  const local = localPlaceLibrary();
  const { supabase, user } = await currentUser();
  if (!supabase || !user) return local;

  const [savedResult, recentResult] = await Promise.all([
    supabase.from("user_saved_places").select("*").order("saved_at", { ascending: false }).limit(MAX_SAVED),
    supabase.from("user_recent_places").select("*").order("viewed_at", { ascending: false }).limit(MAX_RECENT),
  ]);

  if (savedResult.error || recentResult.error) return local;

  const saved = uniquePlaces(
    [...local.saved, ...(savedResult.data ?? []).map((row) => fromSavedRow(row))],
    MAX_SAVED,
    "savedAt",
  );
  const recent = uniquePlaces(
    [...local.recent, ...(recentResult.data ?? []).map((row) => fromRecentRow(row))],
    MAX_RECENT,
    "viewedAt",
  );

  writeStored(SAVED_KEY, saved);
  writeStored(RECENT_KEY, recent);

  if (local.saved.length > 0) {
    void supabase.from("user_saved_places").upsert(
      local.saved.map((place) => savedRow(user.id, place)),
      { onConflict: "user_id,place_source,place_id" },
    );
  }
  if (local.recent.length > 0) {
    void supabase.from("user_recent_places").upsert(
      local.recent.map((place) => recentRow(user.id, place)),
      { onConflict: "user_id,place_source,place_id" },
    );
  }

  return { saved, recent };
}

export async function toggleSavedPlace(input: LibraryPlaceInput) {
  const place = toLibraryPlace(input);
  const current = localPlaceLibrary().saved;
  const key = placeKey(place);
  const alreadySaved = current.some((item) => placeKey(item) === key);
  const saved = alreadySaved
    ? current.filter((item) => placeKey(item) !== key)
    : uniquePlaces([{ ...place, savedAt: new Date().toISOString() }, ...current], MAX_SAVED, "savedAt");

  writeStored(SAVED_KEY, saved);
  emitLibraryChange();

  const { supabase, user } = await currentUser();
  if (supabase && user) {
    if (alreadySaved) {
      await supabase.from("user_saved_places").delete()
        .eq("user_id", user.id).eq("place_source", place.source).eq("place_id", place.sourceId);
    } else {
      await supabase.from("user_saved_places").upsert(
        savedRow(user.id, { ...place, savedAt: new Date().toISOString() }),
        { onConflict: "user_id,place_source,place_id" },
      );
    }
  }

  return !alreadySaved;
}

export async function recordRecentPlace(input: LibraryPlaceInput) {
  const place = { ...toLibraryPlace(input), viewedAt: new Date().toISOString() };
  const recent = uniquePlaces([place, ...localPlaceLibrary().recent], MAX_RECENT, "viewedAt");
  writeStored(RECENT_KEY, recent);
  emitLibraryChange();

  const { supabase, user } = await currentUser();
  if (supabase && user) {
    await supabase.from("user_recent_places").upsert(recentRow(user.id, place), {
      onConflict: "user_id,place_source,place_id",
    });
  }
}

export async function clearRecentPlaces() {
  writeStored(RECENT_KEY, []);
  emitLibraryChange();
  const { supabase, user } = await currentUser();
  if (supabase && user) {
    await supabase.from("user_recent_places").delete().eq("user_id", user.id);
  }
}

export function libraryPlaceKey(place: Pick<LibraryPlace, "source" | "sourceId">) {
  return placeKey(place);
}
