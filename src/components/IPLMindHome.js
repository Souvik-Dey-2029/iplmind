"use client";

import React from 'react';
import ThemeSwitcher from './ThemeSwitcher';
import { useTheme } from './ThemeProvider';

const HOME_BG = {
  light: 'radial-gradient(circle at top right, rgba(29, 80, 49, 0.15) 0%, transparent 70%), radial-gradient(circle at bottom left, rgba(253, 129, 0, 0.1) 0%, transparent 60%), #f8faf5',
  dark: 'radial-gradient(circle at top right, rgba(125, 216, 154, 0.06) 0%, transparent 70%), radial-gradient(circle at bottom left, rgba(255, 155, 46, 0.04) 0%, transparent 60%), #0f1210',
  ipl: 'radial-gradient(circle at top right, rgba(0, 229, 255, 0.08) 0%, transparent 60%), radial-gradient(circle at bottom left, rgba(123, 47, 247, 0.06) 0%, transparent 50%), #0a0e1a',
};

/**
 * IPLMindHome - Landing page component.
 * Uses inline styles to exactly match the Stitch-generated design,
 * bypassing Tailwind v4 theme mapping issues.
 */
export default function IPLMindHome({ onStartGame }) {
  const { theme } = useTheme();
  return (
    <div style={{
      background: HOME_BG[theme] || HOME_BG.light,
      minHeight: '100vh',
      color: 'var(--text, #191c19)',
      overflowX: 'hidden',
      transition: 'background 0.4s ease',
    }}>

      {/* ===== Top Navigation ===== */}
      <header style={{
        background: 'var(--bg-header, rgba(248, 250, 245, 0.6))',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--border-light, rgba(255,255,255,0.2))',
        boxShadow: '0 1px 3px var(--shadow, rgba(0,0,0,0.04))',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        transition: 'background 0.3s ease',
      }}>
          <nav style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            maxWidth: 1280,
            margin: '0 auto',
            padding: '12px 16px',
          }}>
          {/* Logo */}
            <div style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 'clamp(28px, 5vw, 40px)',
              fontWeight: 800,
              color: 'var(--primary, #00361a)',
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
            }}>
              IPL Genius
            </div>

          {/* Nav Links (desktop) */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <a href="#" onClick={(e) => e.preventDefault()} style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              color: '#954a00',
              textDecoration: 'none',
              fontSize: 16,
            }}>Predict</a>
            <a href="#" onClick={(e) => e.preventDefault()} style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 500,
              color: '#414942',
              textDecoration: 'none',
              fontSize: 16,
            }}>Leaderboard</a>
            <a href="#" onClick={(e) => e.preventDefault()} style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 500,
              color: '#414942',
              textDecoration: 'none',
              fontSize: 16,
            }}>History</a>
          </div>

            {/* Icon Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ThemeSwitcher />
            </div>
        </nav>
      </header>

      {/* ===== Hero Section ===== */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(24px, 4vw, 48px) clamp(12px, 3vw, 24px)' }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '70vh',
          textAlign: 'center',
        }}>

          {/* Background circles and floating decorations */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'visible' }}>
            {/* Large circle ring */}
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%) scale(1.5)',
              width: '80%',
              aspectRatio: '1',
              border: '1px solid rgba(0,54,26,0.05)',
              borderRadius: '50%',
            }} />
            {/* Medium circle ring */}
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%) scale(1.25)',
              width: '60%',
              aspectRatio: '1',
              border: '1px solid rgba(253,129,0,0.1)',
              borderRadius: '50%',
            }} />

            {/* Floating Cricket Ball */}
            <div className="floating" style={{
              position: 'absolute',
              top: 0,
              right: '15%',
            }}>
              <div style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(to bottom right, #ba1a1a, #fd8100)',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: 'rotate(12deg)',
              }}>
                {/* Seam line */}
                <div style={{
                  width: '100%',
                  height: 2,
                  background: 'rgba(255,255,255,0.4)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                }} />
              </div>
            </div>

            {/* Floating Stumps */}
            <div className="floating" style={{
              position: 'absolute',
              bottom: 40,
              left: '10%',
              animationDelay: '-2s',
            }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end' }}>
                <div style={{
                  width: 12,
                  height: 128,
                  background: 'rgba(26,77,46,0.4)',
                  borderRadius: 9999,
                  transform: 'rotate(-5deg)',
                }} />
                <div style={{
                  width: 12,
                  height: 144,
                  background: 'rgba(26,77,46,0.4)',
                  borderRadius: 9999,
                }} />
                <div style={{
                  width: 12,
                  height: 128,
                  background: 'rgba(26,77,46,0.4)',
                  borderRadius: 9999,
                  transform: 'rotate(5deg)',
                }} />
              </div>
            </div>

            {/* Decorative blur */}
            <div style={{
              position: 'absolute',
              top: '25%',
              left: '25%',
              width: 384,
              height: 384,
              background: 'rgba(157,211,170,0.1)',
              borderRadius: '50%',
              filter: 'blur(100px)',
              zIndex: -1,
            }} />
          </div>

          {/* Hero Text Content */}
          <div style={{ maxWidth: 768, position: 'relative', zIndex: 1 }}>
            {/* Main Heading */}
            <h1 style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 'clamp(32px, 5vw, 64px)',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: 'var(--primary, #00361a)',
              margin: 0,
            }}>
              Think of any <br />
              <span style={{ color: 'var(--accent, #fd8100)' }}>IPL player.</span>
            </h1>

            {/* Sub text */}
            <p style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 'clamp(15px, 2vw, 18px)',
              lineHeight: 1.6,
              color: 'var(--text-muted, #414942)',
              maxWidth: 560,
              margin: '24px auto 0',
            }}>
              Pick a legendary veteran or a rising star. Answer a few questions and let the AI cook. Can you beat the machine?
            </p>

            {/* Start Game Button */}
            <div style={{ paddingTop: 8 }}>
              <button
                onClick={onStartGame}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '24px 48px',
                  background: 'linear-gradient(to right, #fd8100, #954a00)',
                  color: '#ffffff',
                  fontFamily: "'Syne', sans-serif",
                  fontSize: 24,
                  fontWeight: 600,
                  lineHeight: 1.3,
                  borderRadius: 16,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 10px 25px -5px rgba(253,129,0,0.4)',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  marginTop: 16,
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <span style={{ position: 'relative', zIndex: 1 }}>Start Game</span>
                <span
                  className="material-symbols-outlined"
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    fontSize: 24,
                    fontVariationSettings: "'FILL' 1",
                  }}
                >play_arrow</span>
              </button>
            </div>

            {/* User Avatars */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              paddingTop: 24,
            }}>
              <div style={{ display: 'flex' }}>
                <div style={avatarStyle('#1a4d2e')}>
                  <img
                    alt="User"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAcmeG1iNkzzgvUpT9ezgagOEcBkofx1WEIS7hs6bo18Z-XkqiY682vbZYDqca7Sk72JfZDs1bj5UzqbenA1c4w4Kt5BYWJLisnd9PDABZRyVtsN-TvOisAMKOgEWitMKN6yjMYaA4HsoMe8cP09gxR_FAojtuwymEy1_js7D59K7HpCdnIiFR0Hy3wAyTEKhfqigg-TiDhYqzqHBMrsFznebwlgq2_edXuR9EVJsiufaiaxZdiP-OLnu2fZ6U7jN808mbz720OSmI"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ ...avatarStyle('#fd8100'), marginLeft: -16 }}>
                  <img
                    alt="User"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCqENsD9rn_gBJJLU4nlhGkUAzsIAFWtRrdR9_662-zU-thn91Vsf9JbfoJn0g3Gb1ZStYWMsLv8TZcYiOxiLD4aoE6e9xntvJ-rpsbE4wbyMwN4PRvrC5KftQbDNu5i0sTqQ8zX8PkEg-Nf776MLjizPIyVCPL8NZl4w-MJ1ISPMgUx2jbyLjZosrp-LkyRmzfeEe0ZDCSWWvkGZBipxsL1Zl6DakezdwRWLYwYsMbv_8UYF97ndsV3mDrH4-Fsf0rQ_iEMHERMIM"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{
                  ...avatarStyle('#e7e9e4'),
                  marginLeft: -16,
                  color: '#00361a',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: 12,
                }}>+2k</div>
              </div>
              <p style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 12,
                fontWeight: 700,
                lineHeight: 1.2,
                color: '#717971',
                margin: 0,
              }}>Players guessing right now</p>
            </div>
          </div>
        </div>

        {/* ===== Bento Grid Section ===== */}
        <section style={{ marginTop: 48 }}>
          <div className="bento-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: 24,
          }}>

            {/* Large Card: Live Data */}
            <div className="bento-card-lg bento-card-content" style={{
              gridColumn: 'span 8',
              background: '#f3f4ef',
              borderRadius: 16,
              padding: 24,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 32,
              border: '1px solid rgba(193,201,191,0.2)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              overflow: 'hidden',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 12px',
                  background: 'rgba(147,242,242,0.3)',
                  color: '#004f4f',
                  borderRadius: 9999,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>bolt</span>
                  LIVE DATA
                </div>
                <h3 style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: 24,
                  fontWeight: 600,
                  lineHeight: 1.3,
                  color: '#00361a',
                  margin: '16px 0 8px',
                }}>Powered by 15 Years of IPL Stats</h3>
                <p style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 16,
                  lineHeight: 1.6,
                  color: '#414942',
                  margin: 0,
                }}>
                  Our neural network digests every ball bowled, every run scored, and every boundary hit since 2008. It&apos;s almost impossible to win.
                </p>
              </div>
              {/* Chart visual */}
              <div style={{
                width: 256,
                height: 192,
                background: '#1a4d2e',
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0,
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, opacity: 0.4 }}>
                  <div style={{ height: 96, width: 16, background: '#93f2f2', borderRadius: 9999 }} className="animate-pulse" />
                  <div style={{ height: 128, width: 16, background: '#93f2f2', borderRadius: 9999, animationDelay: '75ms' }} className="animate-pulse" />
                  <div style={{ height: 80, width: 16, background: '#93f2f2', borderRadius: 9999, animationDelay: '150ms' }} className="animate-pulse" />
                  <div style={{ height: 112, width: 16, background: '#93f2f2', borderRadius: 9999, animationDelay: '300ms' }} className="animate-pulse" />
                </div>
                <span
                  className="material-symbols-outlined"
                  style={{
                    position: 'absolute',
                    color: 'white',
                    fontSize: 64,
                    fontVariationSettings: "'FILL' 1",
                  }}
                >insights</span>
              </div>
            </div>

            {/* Small Card: Global Leaderboard */}
            <div className="bento-card-sm" style={{
              gridColumn: 'span 4',
              background: 'rgba(255,255,255,0.45)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{
                width: 48,
                height: 48,
                background: 'rgba(253,129,0,0.1)',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                color: '#fd8100',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32 }}>emoji_events</span>
              </div>
              <h3 style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 24,
                fontWeight: 600,
                lineHeight: 1.3,
                color: '#00361a',
                margin: '0 0 8px',
              }}>Global Leaderboard</h3>
              <p style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 16,
                lineHeight: 1.6,
                color: '#414942',
                margin: 0,
              }}>
                Compete with cricket fans worldwide. Can you trick the AI more times than anyone else?
              </p>
            </div>

            {/* Social Play Card */}
            <div className="bento-card-sm" style={{
              gridColumn: 'span 4',
              background: '#00361a',
              color: '#ffffff',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              overflow: 'hidden',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to bottom right, rgba(255,255,255,0.1), transparent)',
              }} />
              <div>
                <h3 style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: 24,
                  fontWeight: 600,
                  lineHeight: 1.3,
                  margin: '0 0 8px',
                }}>Social Play</h3>
                <p style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 16,
                  lineHeight: 1.6,
                  margin: 0,
                }}>Challenge your friends and share your winning streaks on social media.</p>
              </div>
              <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 80, color: 'rgba(255,255,255,0.1)' }}>share</span>
              </div>
            </div>

            {/* Stats Card */}
            <div className="bento-card-lg" style={{
              gridColumn: 'span 8',
              background: '#e1e3de',
              borderRadius: 16,
              padding: 24,
              border: '1px solid rgba(193,201,191,0.3)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}>
              <div className="bento-stats-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 24,
                textAlign: 'center',
              }}>
                <div>
                  <div style={statNumberStyle('#00361a')}>500+</div>
                  <div style={statLabelStyle}>PLAYERS</div>
                </div>
                <div>
                  <div style={statNumberStyle('#fd8100')}>1M+</div>
                  <div style={statLabelStyle}>GUESSES</div>
                </div>
                <div>
                  <div style={statNumberStyle('#00361a')}>98%</div>
                  <div style={statLabelStyle}>ACCURACY</div>
                </div>
                <div>
                  <div style={statNumberStyle('#fd8100')}>24/7</div>
                  <div style={statLabelStyle}>LIVE OPS</div>
                </div>
              </div>
            </div>

          </div>
        </section>
      </main>

      {/* Spacer */}
      <div style={{ height: 48 }} />

      {/* Responsive CSS is in globals.css */}
    </div>
  );
}

/* ===== Style constants ===== */

// Icon button style (header)
const iconBtnStyle = {
  padding: 8,
  borderRadius: 9999,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

// Avatar circle style
function avatarStyle(bg) {
  return {
    width: 48,
    height: 48,
    borderRadius: '50%',
    border: '2px solid #f8faf5',
    background: bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: 700,
  };
}

// Stats number style
function statNumberStyle(color) {
  return {
    fontFamily: "'Syne', sans-serif",
    fontSize: 'clamp(32px, 4vw, 64px)',
    fontWeight: 800,
    lineHeight: 1.1,
    letterSpacing: '-0.02em',
    color,
  };
}

// Stats label style
const statLabelStyle = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.4,
  color: '#717971',
  marginTop: 4,
};
