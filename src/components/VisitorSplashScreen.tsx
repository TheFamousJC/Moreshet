import React from 'react';

export const VisitorSplashScreen: React.FC = () => (
  <div className="moreshet-splash fixed inset-0 z-[1100] flex items-center justify-center bg-[#f0f8ff] px-8" role="status" aria-label="Opening Moreshet">
    <div className="moreshet-splash-mark flex w-full max-w-[290px] flex-col items-center">
      <span className="moreshet-splash-halo" aria-hidden="true" />
      <img src={`${import.meta.env.BASE_URL}moreshet-logo.svg`} alt="Moreshet" className="relative w-full drop-shadow-xl" />
      <span className="moreshet-splash-line mt-5 h-1 w-20 rounded-full bg-[#3b9ed8]" aria-hidden="true" />
    </div>
  </div>
);
