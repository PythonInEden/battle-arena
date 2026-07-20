// src/fortress/utils/assets.ts

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';

/**
 * 🛠️ Dynamic Monster Image Auto-Locator
 * Formats monster names and returns the corresponding Supabase storage WebP URL.
 * Example: "Ancient Red Dragon" -> "ancient_red_dragon.webp"
 */
export const getMonsterAssetUrl = (
  monsterName: string, 
  pose: 'normal' | 'win' | 'lost' = 'normal'
): string => {
  const cleanName = monsterName
   .toLowerCase()
   .trim()
   .replace(/\s+/g, '_'); // Replaces spaces with underscores cleanly without brackets

  const bucketPath = `${supabaseUrl}/storage/v1/object/public/hero-images`;

  if (pose === 'win') return `${bucketPath}/${cleanName}_pose_win.webp`;
  if (pose === 'lost') return `${bucketPath}/${cleanName}_pose_lost.webp`;

  return `${bucketPath}/${cleanName}.webp`;
};

/**
 * 🛡️ Class & Hero Avatar Auto-Locator
 * Reuses your pre-existing hero asset configurations inside App.tsx.
 */
export const getHeroAssetUrl = (
  className: string,
  type: 'avatar' | 'win' | 'lost' = 'avatar'
): string => {
  const cleanClass = className.toLowerCase().trim();
  const bucketPath = `${supabaseUrl}/storage/v1/object/public/hero-images`;

  if (type === 'avatar') return `${bucketPath}/${cleanClass}_avatar.webp`;
  if (type === 'win') return `${bucketPath}/${cleanClass}_pose_win.webp`;
  if (type === 'lost') return `${bucketPath}/${cleanClass}_pose_lost.webp`;

  return `${bucketPath}/${cleanClass}_avatar.webp`;
};