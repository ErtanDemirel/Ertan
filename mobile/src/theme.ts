export const colors = {
  primary: '#4f46e5',       // indigo (Poliza benzeri canlı mor-mavi)
  primaryDark: '#3730a3',
  primaryLight: '#eef2ff',
  accent: '#7c3aed',
  bg: '#f4f5fb',
  card: '#ffffff',
  text: '#0f172a',
  subtext: '#334155',
  muted: '#64748b',
  faint: '#94a3b8',
  border: '#e6e8f0',
  success: '#16a34a',
  successBg: '#dcfce7',
  danger: '#dc2626',
  dangerBg: '#fee2e2',
  warning: '#d97706',
  warningBg: '#fef3c7',
  info: '#0ea5e9',
  infoBg: '#e0f2fe',
};

/** Yumuşak/tutarlı boşluk ölçeği. */
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

/** Köşe yarıçapları. */
export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };

/** Hafif kart gölgesi (iOS + Android). */
export const shadow = {
  shadowColor: '#1e293b',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

/** Aksан/rozet renk paleti (hub kutuları vb. için). */
export const tints = [
  { fg: '#4f46e5', bg: '#eef2ff' },
  { fg: '#0ea5e9', bg: '#e0f2fe' },
  { fg: '#16a34a', bg: '#dcfce7' },
  { fg: '#d97706', bg: '#fef3c7' },
  { fg: '#db2777', bg: '#fce7f3' },
  { fg: '#7c3aed', bg: '#f3e8ff' },
  { fg: '#0891b2', bg: '#cffafe' },
  { fg: '#dc2626', bg: '#fee2e2' },
];
