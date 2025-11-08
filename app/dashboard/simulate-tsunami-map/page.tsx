import TsunamiSimulationMapPage from '../simulate-tsunami/map-page'
import Script from 'next/script'

// This page uses useSearchParams() for recording mode detection
export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <>
      {/* Set recording ready flag BEFORE React hydrates */}
      <Script id="recording-init" strategy="beforeInteractive">
        {`
          if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('record') === '1') {
              window.__RECORDING_READY__ = true;
              window.__RECORDING_EVENTS__ = [];
              console.log('📹 Early recording mode signal set');
            }
          }
        `}
      </Script>
      <TsunamiSimulationMapPage />
    </>
  )
}
