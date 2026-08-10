import { ImageResponse } from 'next/og';

// Generated at build time rather than shipped as a binary asset. Next's file
// convention wires this into both `openGraph.images` and the Twitter card, so
// no metadata hand-wiring is needed in layout.tsx or page.tsx.
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'TalentMesh Solutions — Recruitment & Staffing Agency in Ahmedabad, India';

export default function OpengraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '72px 80px',
                    background: 'linear-gradient(135deg, #0f172a 0%, #020617 100%)',
                    fontFamily: 'sans-serif',
                }}
            >
                {/* Brand blue glow, echoing the site's --gradient-primary */}
                <div
                    style={{
                        position: 'absolute',
                        top: -260,
                        right: -180,
                        width: 720,
                        height: 720,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(0,123,255,0.42) 0%, rgba(0,123,255,0) 68%)',
                        display: 'flex',
                    }}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div
                        style={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            background: '#2196f3',
                            display: 'flex',
                        }}
                    />
                    <div
                        style={{
                            color: '#90caf9',
                            fontSize: 26,
                            letterSpacing: 4,
                            textTransform: 'uppercase',
                            display: 'flex',
                        }}
                    >
                        TalentMesh Solutions
                    </div>
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        color: '#ffffff',
                        fontSize: 74,
                        fontWeight: 700,
                        lineHeight: 1.1,
                        letterSpacing: -2,
                    }}
                >
                    <div style={{ display: 'flex' }}>Your trusted hiring partner</div>
                    <div style={{ display: 'flex', color: '#4da3ff' }}>
                        for a high-performing workforce.
                    </div>
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 20,
                        color: 'rgba(255,255,255,0.62)',
                        fontSize: 26,
                    }}
                >
                    <div style={{ display: 'flex' }}>Recruitment &amp; Staffing</div>
                    <div style={{ display: 'flex' }}>·</div>
                    <div style={{ display: 'flex' }}>Ahmedabad, India</div>
                    <div style={{ display: 'flex' }}>·</div>
                    <div style={{ display: 'flex' }}>talentmeshsolutions.com</div>
                </div>
            </div>
        ),
        size
    );
}
