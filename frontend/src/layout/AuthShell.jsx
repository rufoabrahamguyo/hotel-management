import { HomeOutlined } from '@ant-design/icons';
import { propizy } from './propizyTokens';

/** Auth colors — same Hotely palette as the dashboard shell. */
export const authAccent = propizy.primary;
export const authAccentHover = propizy.primaryHover;
export const authCta = propizy.gold;
export const authCtaHover = '#c9a02e';
export const authCtaText = propizy.navy;
export const authText = propizy.text;
export const authMuted = propizy.muted;
export const authBorder = propizy.border;
export const authBg = propizy.bg;
export const authSurface = propizy.surface;

const HERO_IMAGE =
  'https://res.cloudinary.com/dkixvls0n/image/upload/v1784732051/type-entertainment-complex-popular-resort-with-pools-water-parks-turkey-with-more-than-5-million-visitors-year-amara-dolce-vita-luxury-hotel-resort-tekirova-kemer_ekeizm.jpg';

export function AuthBrandMark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 32 }}>
      <HomeOutlined style={{ color: propizy.gold, fontSize: 28 }} />
      <span style={{ fontSize: 28, fontWeight: 800, color: propizy.navy, letterSpacing: '-0.04em' }}>
        Hotely
      </span>
    </div>
  );
}

export default function AuthShell({ children, heroEyebrow, heroScript }) {
  return (
    <div
      className="auth-shell"
      style={{
        minHeight: '100%',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(420px, 560px)',
        background: authBg,
      }}
    >
      <div
        className="auth-hero"
        style={{
          display: 'none',
          position: 'relative',
          minHeight: '100vh',
          backgroundImage: `url(${HERO_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderBottomRightRadius: 120,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(12, 24, 41, 0.42)',
          }}
        />
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            height: '100%',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: 48,
            color: '#fff',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              border: `1.5px solid ${propizy.gold}`,
              display: 'grid',
              placeItems: 'center',
              marginBottom: 28,
            }}
          >
            <HomeOutlined style={{ fontSize: 22, color: propizy.gold }} />
          </div>
          <div
            style={{
              fontSize: 'clamp(0.95rem, 1.6vw, 1.15rem)',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              lineHeight: 1.55,
              maxWidth: 420,
            }}
          >
            {heroEyebrow}
          </div>
          <div
            style={{
              fontFamily: "'Great Vibes', cursive",
              fontSize: 'clamp(3.5rem, 7vw, 5rem)',
              lineHeight: 1.1,
              marginTop: 8,
              fontWeight: 400,
              color: propizy.gold,
            }}
          >
            {heroScript}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(36px, 6vw, 72px) clamp(36px, 5vw, 64px)',
          background: authSurface,
          overflowY: 'auto',
          borderLeft: `1px solid ${authBorder}`,
        }}
      >
        <div style={{ width: '100%', maxWidth: 420 }}>{children}</div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .auth-hero {
            display: block !important;
          }
        }
        @media (max-width: 899px) {
          .auth-shell {
            grid-template-columns: 1fr !important;
          }
          .auth-shell > div:last-of-type {
            border-left: none !important;
          }
        }
      `}</style>
    </div>
  );
}
