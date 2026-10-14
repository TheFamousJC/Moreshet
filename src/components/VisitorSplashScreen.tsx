import React from 'react';

export const VisitorSplashScreen: React.FC = () => (
  <div className="moreshet-splash fixed inset-0 z-[1100] flex items-center justify-center bg-white" role="status" aria-label="Opening Moreshet">
    <img src={`${import.meta.env.BASE_URL}moreshet-splash.jpg`} alt="Moreshet — Jewish Heritage in your Pocket" className="max-h-[100dvh] w-full max-w-[720px] object-contain" fetchPriority="high" />
  </div>
);
