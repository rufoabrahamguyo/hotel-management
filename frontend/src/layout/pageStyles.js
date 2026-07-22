import { propizy } from './propizyTokens';

/** Shared light page chrome for workspace screens. */
export const pageCardStyle = {
  background: propizy.surface,
  borderRadius: 14,
  border: `1px solid ${propizy.border}`,
  boxShadow: '0 2px 8px rgba(12, 24, 41, 0.04)',
};

export const pageHeaderStyle = {
  background: propizy.surface,
  borderBottom: `1px solid ${propizy.border}`,
  color: propizy.text,
};

export const pageWrapStyle = {
  padding: '28px clamp(18px, 3vw, 36px)',
  minHeight: '100%',
  color: propizy.text,
  background: propizy.bg,
};
