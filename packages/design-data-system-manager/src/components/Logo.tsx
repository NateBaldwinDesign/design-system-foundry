import React from 'react';

/**
 * Logo component for the Design Data System Manager sidebar.
 * The SVG path uses 'currentColor' for fill, so the color can be controlled via CSS.
 */
const Logo: React.FC<{ size?: number; color?: string }> = ({ size = 40, color = 'inherit' }) => (
  <span style={{ display: 'inline-block', color }}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Logo"
    >
      <path
        d="M10.4902 1.35589C11.4183 0.820116 12.5621 0.820141 13.4902 1.35589L20.4492 5.37444C21.3774 5.9103 21.9491 6.90039 21.9492 7.9721V16.0082C21.9492 17.08 21.3774 18.07 20.4492 18.6059L13.5 22.6186V15.6987C14.9656 15.1052 15.9998 13.669 16 11.9907C16 9.78154 14.2091 7.99065 12 7.99065C9.79088 7.99065 8.00002 9.78154 8 11.9907C8.00017 13.669 9.03444 15.1052 10.5 15.6987V22.6293C10.4968 22.6275 10.4934 22.6263 10.4902 22.6244L3.53125 18.6059C2.60305 18.07 2.03125 17.08 2.03125 16.0082V7.9721C2.03133 6.90039 2.60311 5.9103 3.53125 5.37444L10.4902 1.35589Z"
        fill="currentColor" // CSS annotation: use currentColor
      />
    </svg>
  </span>
);

export default Logo; 