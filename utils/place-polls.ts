import { createClient } from "@/utils/supabase/client";
import type { LibraryPlace } from "@/utils/place-library";

export interface SharedPollCandidate {
  id: string;
  position: number;
  placeName: string;
  category: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  voteCount: number;
  votedByMe: boolean;
}

export interface SharedPlacePoll {
  id: string;
  title: string;
  status: "open" | "closed";
  createdAt: string;
  closesAt: string;
  selectedCandidateId: string | null;
  candidates: SharedPollCandidate[];
  error?: string;
}

function pollError(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return fallback;
}

export async function createPlacePoll(title: string, candidates: LibraryPlace[]) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_place_poll", {
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
  if (error) throw new Error(pollError(error, "함께 고르기를 만들지 못했습니다."));
  const result = data as { token?: string; pollId?: string } | null;
  if (!result?.token) throw new Error("공유 링크를 만들지 못했습니다.");
  return { token: result.token, pollId: result.pollId ?? "" };
}

export async function getSharedPlacePoll(token: string, voterToken: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_shared_place_poll", {
    p_token: token,
    p_voter_token: voterToken,
  });
  if (error) throw new Error(pollError(error, "투표를 불러오지 못했습니다."));
  const poll = data as SharedPlacePoll | null;
  if (!poll || poll.error) throw new Error(poll?.error ?? "투표를 찾을 수 없습니다.");
  return poll;
}

export async function voteSharedPlacePoll(
  token: string,
  candidateId: string,
  voterToken: string,
  displayName: string,
) {
  const supabase = createClient();
  const { error } = await supabase.rpc("vote_shared_place_poll", {
    p_token: token,
    p_candidate_id: candidateId,
    p_voter_token: voterToken,
    p_display_name: displayName,
  });
  if (error) throw new Error(pollError(error, "투표하지 못했습니다."));
}

export function getOrCreatePollVoterToken() {
  const key = "todaywhere:poll-voter:v1";
  let token = window.localStorage.getItem(key);
  if (!token) {
    const bytes = new Uint8Array(20);
    window.crypto.getRandomValues(bytes);
    token = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
    window.localStorage.setItem(key, token);
  }
  return token;
}
