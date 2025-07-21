import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {}

export const LogoIcon: React.FC<IconProps> = (props) => (
  <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="8" cy="12" r="3" />
    <circle cx="16" cy="12" r="3" />
  </svg>
);
