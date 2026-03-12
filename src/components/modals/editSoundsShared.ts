import type { Sound, SoundCategory } from '../../types/sound';

// Backend sound data type (raw API response shape)
export interface BackendSound {
  id?: number | string;
  display_name?: string;
  name?: string;
  filename: string;
  contexts?: string[];
  isEnabled?: boolean;
  credit?: string;
  imageFile?: string;
  image_file?: string;
}

export interface SoundEdit extends Sound {
  filename: string;
  display_name?: string;
  contextEdits?: string[];
  creditEdits?: string;
}

// Maps UI category to backend soundsType value
export const SOUNDS_TYPE: Record<SoundCategory, string> = {
  background: 'backgroundMusic',
  ambiance: 'ambianceSounds',
  soundboard: 'soundboard',
};

// REST endpoint path for each category
export const ENDPOINT: Record<SoundCategory, string> = {
  background: '/backgroundMusic',
  ambiance: '/ambianceSounds',
  soundboard: '/soundboard',
};

export const BACKGROUND_INTENSITY_OPTIONS = ['calm', 'dynamic', 'intense'];

export const CONTEXT_OPTIONS: Record<SoundCategory, string[]> = {
  background: [
    'calm',
    'dynamic',
    'intense',
    'city',
    'forest',
    'mountain',
    'ocean',
    'space',
    'fantasy',
    'medieval',
    'modern',
    'sci-fi',
    'battle',
    'exploration',
    'mystery',
    'peaceful',
  ],
  ambiance: [
    'animal',
    'nature',
    'city',
    'fantasy',
    'medieval',
    'modern',
    'magic',
    'weather',
    'water',
    'fire',
    'battle',
    'peaceful',
    'horror',
    'sci-fi',
    'technology',
    'vehicle',
    'music',
    'voice',
    'indoor',
    'outdoor',
    'day',
    'night',
    'crowd',
    'market',
  ],
  soundboard: [
    'animal',
    'nature',
    'city',
    'fantasy',
    'medieval',
    'modern',
    'magic',
    'weather',
    'water',
    'fire',
    'battle',
    'peaceful',
    'horror',
    'sci-fi',
    'technology',
    'vehicle',
    'music',
    'voice',
    'weapon',
    'spell',
    'ui',
    'notification',
    'alert',
  ],
};

/** Map a raw backend payload to a SoundEdit ready for the UI */
export function mapBackendSound(sound: BackendSound, category: SoundCategory): SoundEdit {
  return {
    id: String(sound.id || sound.filename),
    name: sound.display_name || sound.name || sound.filename,
    filename: sound.filename,
    category,
    imageFile: sound.imageFile || sound.image_file,
    contexts: Array.isArray(sound.contexts) ? sound.contexts : [],
    credit: sound.credit || '',
    isEnabled: sound.isEnabled ?? true,
  };
}

/** Build the asset URL for previewing a sound */
export function getSoundAssetUrl(filename: string, category: SoundCategory): string {
  switch (category) {
    case 'background':
      return `/assets/background/${filename}`;
    case 'ambiance':
      return `/assets/ambiance/${filename}`;
    case 'soundboard':
      return `/assets/soundboard/${filename}`;
    default:
      return `/assets/${SOUNDS_TYPE[category]}/${filename}`;
  }
}
