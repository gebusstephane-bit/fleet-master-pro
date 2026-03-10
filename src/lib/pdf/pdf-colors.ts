/**
 * Palette de couleurs FleetMaster Pro — PDF
 * Toutes les couleurs normalisées 0-1 pour pdf-lib
 */

import { rgb, RGB } from 'pdf-lib';

export function hexToRgb(hex: string): RGB {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

export const C = {
  // Marque
  primary:        hexToRgb('#1E3A5F'),
  primaryLight:   hexToRgb('#2D5A9B'),
  primaryBg:      hexToRgb('#EFF6FF'),

  // Succès (conforme)
  success:        hexToRgb('#16A34A'),
  successBg:      hexToRgb('#F0FDF4'),
  successBorder:  hexToRgb('#86EFAC'),

  // Attention (à renouveler)
  warning:        hexToRgb('#D97706'),
  warningBg:      hexToRgb('#FFFBEB'),
  warningBorder:  hexToRgb('#FCD34D'),
  warningText:    hexToRgb('#92400E'),

  // Danger (expiré)
  danger:         hexToRgb('#DC2626'),
  dangerBg:       hexToRgb('#FEF2F2'),
  dangerBorder:   hexToRgb('#FCA5A5'),
  dangerText:     hexToRgb('#991B1B'),

  // Info
  info:           hexToRgb('#3B82F6'),
  infoBg:         hexToRgb('#EFF6FF'),
  infoText:       hexToRgb('#1D4ED8'),

  // Neutres
  neutral:        hexToRgb('#64748B'),
  neutralLight:   hexToRgb('#94A3B8'),
  neutralBg:      hexToRgb('#F8FAFC'),
  border:         hexToRgb('#E2E8F0'),
  text:           hexToRgb('#1E293B'),
  textSecondary:  hexToRgb('#374151'),
  successText:    hexToRgb('#166534'),

  white:          rgb(1, 1, 1),
  black:          rgb(0, 0, 0),
};

export type StatusType = 'valid' | 'warning' | 'expired' | 'missing';

export function getStatusColors(status: StatusType): { bg: RGB; text: RGB; border: RGB } {
  switch (status) {
    case 'valid':   return { bg: C.successBg,  text: C.successText, border: C.successBorder };
    case 'warning': return { bg: C.warningBg,  text: C.warningText, border: C.warningBorder };
    case 'expired': return { bg: C.dangerBg,   text: C.dangerText,  border: C.dangerBorder };
    default:        return { bg: C.neutralBg,  text: C.neutralLight, border: C.border };
  }
}

export function getScoreColor(score: number): RGB {
  if (score >= 90) return C.success;
  if (score >= 70) return C.warning;
  return C.danger;
}
