import React from 'react';

export const VisitorSplashScreen: React.FC = () => (
  <div className="tudela-splash fixed inset-0 z-[1100] flex items-center justify-center bg-[#f7f0e5] px-8" role="status" aria-label="Opening Tudela Global">
    <div className="tudela-splash-mark flex w-full max-w-[290px] flex-col items-center">
      <span className="tudela-splash-halo" aria-hidden="true" />
      <img src="/tudela-global-logo.png" alt="Tudela Global" className="relative w-full drop-shadow-xl" />
      <span className="tudela-splash-line mt-5 h-1 w-20 rounded-full bg-[#c98a3b]" aria-hidden="true" />
    </div>
  </div>
);
