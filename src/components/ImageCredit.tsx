import React from 'react';

interface ImageCreditProps {
  credit?: string;
  sourceUrl?: string;
  licenseName?: string;
  licenseUrl?: string;
  className?: string;
}

export const ImageCredit: React.FC<ImageCreditProps> = ({ credit, sourceUrl, licenseName, licenseUrl, className = '' }) => {
  if (!credit) return null;
  return <p className={`text-[9px] leading-relaxed text-slate-500 ${className}`}>
    {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer" className="underline">{credit}</a> : credit}
    {licenseName && <>{' · '}{licenseUrl ? <a href={licenseUrl} target="_blank" rel="noreferrer" className="underline">{licenseName}</a> : licenseName}</>}
  </p>;
};
