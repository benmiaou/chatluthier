export interface Sound {
  id: string;
  name: string;
  filename: string | null;
  category: string;
  imageFile?: string;
  credit?: string;
  creditUrl?: string;
  display_name?: string;
  contexts?: string[];
  isEnabled?: boolean;
  /** External provider fields — only present when isExternal is true */
  isExternal?: boolean;
  provider?: ExternalProvider;
  providerTrackId?: string;
  artist?: string;
  title?: string;
  album?: string;
  durationMs?: number;
  thumbnailUrl?: string;
  previewUrl?: string;
  permalinkUrl?: string;
}

/** Returns true if a background music sound matches the given category (contexts are tuples) */
export function bgMatchesCategory(sound: Sound, category: BackgroundMusicCategory): boolean {
  if (category === 'all') {
    return true;
  }
  if (!sound.contexts?.length) {
    return false;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (sound.contexts as any[]).some(([cat]: [string, string]) => cat === category);
}

/**
 * Returns true if a sound has at least one tuple where BOTH intensity and context match.
 * This is the correct way to filter — prevents a sound with [dynamic,nature]+[calm,test]
 * from appearing under "dynamic" when filtering by context "test".
 */
export function bgMatchesCategoryAndContext(
  sound: Sound,
  category: BackgroundMusicCategory,
  context: string
): boolean {
  const allContext = context.toLowerCase() === 'all';
  const allCategory = category === 'all';

  if (!sound.contexts?.length) {
    return allContext && allCategory;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (sound.contexts as any[]).some(([cat, scene]: [string, string]) => {
    const categoryMatch = allCategory || cat === category;
    const contextMatch = allContext || scene.toLowerCase() === context.toLowerCase();
    return categoryMatch && contextMatch;
  });
}

/** Returns scene labels from a background music sound's tuple contexts */
export function bgScenes(sound: Sound): string[] {
  if (!sound.contexts?.length) {
    return [];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (sound.contexts as any[]).map(([, scene]: [string, string]) => scene);
}

export type SoundCategory = 'background' | 'ambiance' | 'soundboard';

export type BackgroundMusicCategory = 'calm' | 'dynamic' | 'intense' | 'all';

export type ExternalProvider = 'spotify' | 'deezer' | 'soundcloud';

// Runtime object for BackgroundMusicCategory values
export const BackgroundMusicCategories = {
  CALM: 'calm' as BackgroundMusicCategory,
  DYNAMIC: 'dynamic' as BackgroundMusicCategory,
  INTENSE: 'intense' as BackgroundMusicCategory,
  ALL: 'all' as BackgroundMusicCategory,
};
