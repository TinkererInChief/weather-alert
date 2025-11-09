import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Emergency Alert Command Center'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #0b1642 45%, #0ea5e9 100%)',
          color: '#fff',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(60% 60% at 20% 10%, rgba(239,68,68,0.15), transparent 60%), radial-gradient(55% 55% at 80% 80%, rgba(59,130,246,0.2), transparent 60%)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 999,
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 30px rgba(239,68,68,0.35)',
              fontSize: 46,
              fontWeight: 800,
            }}
          >
            EA
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: -0.5 }}>Emergency Alert Command Center</div>
            <div style={{ fontSize: 26, color: 'rgba(255,255,255,0.85)' }}>
              Real-time earthquake & tsunami monitoring with multi-channel alerts
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 36,
            display: 'flex',
            gap: 16,
            opacity: 0.9,
            fontSize: 22,
          }}
        >
          <div style={{ padding: '10px 16px', background: 'rgba(15,23,42,0.45)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)' }}>
            Tsunami Simulation
          </div>
          <div style={{ padding: '10px 16px', background: 'rgba(15,23,42,0.45)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)' }}>
            Vessel Tracking
          </div>
          <div style={{ padding: '10px 16px', background: 'rgba(15,23,42,0.45)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)' }}>
            Intelligent Alerts
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 28, right: 36, fontSize: 20, color: 'rgba(255,255,255,0.9)' }}>
          www.tsunami-alerts.com
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
