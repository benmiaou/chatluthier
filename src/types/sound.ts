export interface Sound {
  id: string;
  name: string;
  filename: string;
  category: string;
  imageFile?: string;
  credit?: string;
  creditUrl?: string;
  /** ambiance/soundboard: string[]; backgroundMusic: [category, scene][] stored as unknown[] */
  contexts?: string[];
  isEnabled?: boolean;
}

/** Returns true if a background music sound matches the given category (contexts are tuples) */
export function bgMatchesCategory(sound: Sound, category: BackgroundMusicCategory): boolean {
  if (category === 'all') return true;
  if (!sound.contexts?.length) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (sound.contexts as any[]).some(([cat]: [string, string]) => cat === category);
}

/** Returns scene labels from a background music sound's tuple contexts */
export function bgScenes(sound: Sound): string[] {
  if (!sound.contexts?.length) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (sound.contexts as any[]).map(([, scene]: [string, string]) => scene);
}

export type SoundCategory = 'background' | 'ambiance' | 'soundboard';

export type BackgroundMusicCategory = 'calm' | 'dynamic' | 'intense' | 'all';

// Runtime object for BackgroundMusicCategory values
export const BackgroundMusicCategories = {
  CALM: 'calm' as BackgroundMusicCategory,
  DYNAMIC: 'dynamic' as BackgroundMusicCategory,
  INTENSE: 'intense' as BackgroundMusicCategory,
  ALL: 'all' as BackgroundMusicCategory
};
