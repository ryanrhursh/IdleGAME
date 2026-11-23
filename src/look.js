// Art direction presets. 'classic' is the current look; the others are alternatives to compare.
// Pick one with ?look=diorama (or storybook, papercraft, cinematic) in the address, or save one in Settings later.
export const LOOKS = {
  classic: {
    name: 'Classic', ui: 'classic', rounded: false, shadows: false, steps: [80, 160, 220, 255], exposure: 1.05, lightMul: 1, sunMul: 1, fogMul: 1,
    inside: { bg: 0x120c22, plate: '#241a3c', sky: 0xffe8d8, ground: 0x4a3a6a, hemi: 1.5, sun: 0xfff0d8, sunI: 1.3 }, bloom: [0.45, 0.55, 0.7], grade: null,
  },
  diorama: {
    name: 'Miniature diorama', ui: 'diorama', rounded: true, shadows: true, steps: [110, 170, 215, 245, 255], exposure: 1.18, lightMul: 0.85, sunMul: 1.25, fogMul: 0.8,
    inside: { bg: 0x3a2a44, plate: '#4a3558', sky: 0xfff0dc, ground: 0x7a5a6a, hemi: 1.05, sun: 0xffd9a0, sunI: 2.6 }, bloom: [0.5, 0.6, 0.78],
    grade: { sat: 1.22, contrast: 1.07, tint: [1.04, 1.0, 0.93], vig: 0.35, grain: 0.02, tilt: 1.0, edge: 0, paper: 0 },
  },
  storybook: {
    name: 'Painterly storybook', ui: 'storybook', rounded: true, shadows: false, steps: [150, 190, 225, 255], exposure: 1.1, lightMul: 1.05, sunMul: 0.9, fogMul: 0.9,
    inside: { bg: 0x5a4a52, plate: '#6a5560', sky: 0xfff3dc, ground: 0x8a6a5a, hemi: 1.6, sun: 0xfff0d0, sunI: 1.0 }, bloom: [0.18, 0.6, 0.85],
    grade: { sat: 0.82, contrast: 0.98, tint: [1.05, 1.0, 0.9], vig: 0.45, grain: 0.05, tilt: 0, edge: 0.95, paper: 0.45 },
  },
  papercraft: {
    name: 'Layered papercraft', ui: 'paper', rounded: false, shadows: true, steps: [190, 255], exposure: 1.0, lightMul: 1.0, sunMul: 1.1, fogMul: 0.7,
    inside: { bg: 0xe9dcc4, plate: '#f4ead8', sky: 0xffffff, ground: 0xc8b8d8, hemi: 1.5, sun: 0xffffff, sunI: 1.4 }, bloom: [0.08, 0.5, 0.9],
    grade: { sat: 1.4, contrast: 1.1, tint: [1.0, 1.0, 1.0], vig: 0.15, grain: 0.015, tilt: 0, edge: 0, paper: 0.35 },
  },
  cinematic: {
    name: 'Moody cinematic', ui: 'cinema', rounded: true, shadows: true, steps: [40, 120, 210, 255], exposure: 0.95, lightMul: 0.6, sunMul: 0.9, fogMul: 1.5,
    inside: { bg: 0x0b0814, plate: '#1a1230', sky: 0x9aaae8, ground: 0x3a2a4a, hemi: 1.0, sun: 0xffb868, sunI: 2.8 }, bloom: [0.5, 0.7, 0.8],
    grade: { sat: 1.05, contrast: 1.22, tint: [1.0, 0.98, 1.04], vig: 0.65, grain: 0.06, tilt: 0, edge: 0, paper: 0 },
  },
};
let chosen = 'storybook';
try {
  const q = new URLSearchParams(location.search).get('look') || localStorage.getItem('marigold.look');
  if (q && LOOKS[q]) chosen = q;
} catch (e) { /* storage or location may be unavailable */ }
export const LOOK_ID = chosen;
export const LOOK = LOOKS[chosen];
export function saveLook(id) { try { localStorage.setItem('marigold.look', id); } catch (e) { /* ignore */ } }
