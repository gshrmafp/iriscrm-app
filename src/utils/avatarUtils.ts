const AVATAR_COLORS = [
  '#3B4ECC', '#7C3AED', '#059669', '#B45309',
  '#DC2626', '#0891B2', '#9333EA', '#92400E',
];

export function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function initials(name: string, maxParts = 2): string {
  return name
    .split(' ')
    .slice(0, maxParts)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase() || '?';
}
