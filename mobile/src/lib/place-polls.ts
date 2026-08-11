import type { LibraryPlace } from '@/lib/place-library';
import { supabase } from '@/lib/supabase';

export async function createPlacePoll(title: string, candidates: LibraryPlace[]) {
  const { data, error } = await supabase.rpc('create_place_poll', {
    p_title: title,
    p_candidates: candidates.map((place) => ({
      source: place.source,
      sourceId: place.sourceId,
      placeName: place.placeName,
      category: place.category,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      imageUrl: place.imageUrl,
    })),
  });
  if (error) throw new Error(error.message || '함께 고르기를 만들지 못했습니다.');
  const result = data as { token?: string; pollId?: string } | null;
  if (!result?.token) throw new Error('공유 링크를 만들지 못했습니다.');
  return { token: result.token, pollId: result.pollId ?? '' };
}
