import type { Sound, ExternalProvider } from '../types/sound';
import type { ExternalSoundPayload } from '../contexts/SocketContext';

export interface ProviderSearchResult {
  trackId: string;
  artist: string;
  title: string;
  album?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  permalinkUrl?: string;
}

export interface ProviderSearchFns {
  spotify?: (query: string) => Promise<ProviderSearchResult[]>;
  deezer?: (query: string) => Promise<ProviderSearchResult[]>;
  soundcloud?: (query: string) => Promise<ProviderSearchResult[]>;
}

function buildSound(
  provider: ExternalProvider,
  trackId: string,
  artist: string,
  title: string,
  album?: string,
  thumbnailUrl?: string,
  previewUrl?: string,
  permalinkUrl?: string
): Sound {
  return {
    id: `ext_recv_${provider}_${trackId}`,
    name: `${artist} – ${title}`,
    filename: null,
    category: 'background',
    isExternal: true,
    provider,
    providerTrackId: trackId,
    artist,
    title,
    album,
    thumbnailUrl,
    previewUrl,
    permalinkUrl,
  };
}

/**
 * Pure resolution logic for cross-provider WebSocket fallback.
 *
 * Given a received ExternalSoundPayload:
 * - If the sender's provider is in connectedProviders → build Sound from payload directly
 * - Otherwise → search in the first available connected provider, return Sound from that result
 * - Returns null if no provider is available or search yields no results
 *
 * Does NOT call playExternal — that is the caller's responsibility.
 */
export async function resolveExternalSound(
  payload: ExternalSoundPayload,
  connectedProviders: ExternalProvider[],
  searchFns: ProviderSearchFns
): Promise<Sound | null> {
  const senderProvider = payload.provider;
  const query = [payload.artist, payload.title].filter(Boolean).join(' ');

  // Same provider available → play directly using sender's track ID
  if (connectedProviders.includes(senderProvider)) {
    return buildSound(
      senderProvider,
      payload.trackId,
      payload.artist ?? '',
      payload.title ?? '',
      payload.album,
      payload.thumbnailUrl,
      payload.previewUrl
    );
  }

  // No provider connected at all, or no query to search with
  if (connectedProviders.length === 0 || !query) {
    return null;
  }

  const fallbackProvider = connectedProviders[0];
  const searchFn = searchFns[fallbackProvider];
  if (!searchFn) {
    return null;
  }

  try {
    const results = await searchFn(query);
    const hit = results[0];
    if (!hit) {
      return null;
    }
    return buildSound(
      fallbackProvider,
      hit.trackId,
      hit.artist,
      hit.title,
      hit.album,
      hit.thumbnailUrl,
      hit.previewUrl,
      hit.permalinkUrl
    );
  } catch {
    return null;
  }
}
