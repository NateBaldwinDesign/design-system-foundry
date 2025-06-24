import React from 'react';

const TokenIcon: React.FC<{ size?: number }> = ({ size = 24  }) => {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 16V8C20.9996 7.64927 20.9071 7.30481 20.7315 7.00116C20.556 6.69752 20.3037 6.44536 20 6.27L13 2.27C12.696 2.09446 12.3511 2.00205 12 2.00205C11.6489 2.00205 11.304 2.09446 11 2.27L4 6.27C3.69626 6.44536 3.44398 6.69752 3.26846 7.00116C3.09294 7.30481 3.00036 7.64927 3 8V16C3.00036 16.3507 3.09294 16.6952 3.26846 16.9988C3.44398 17.3025 3.69626 17.5546 4 17.73L11 21.73C11.304 21.9055 11.6489 21.998 12 21.998C12.3511 21.998 12.696 21.9055 13 21.73L20 17.73C20.3037 17.5546 20.556 17.3025 20.7315 16.9988C20.9071 16.6952 20.9996 16.3507 21 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2"/>
            <line x1="3.03381" y1="6.55748" x2="9.05547" y2="10.468" stroke="currentColor" strokeWidth="2"/>
            <line y1="-1" x2="7.18" y2="-1" transform="matrix(-0.838671 0.544639 0.544639 0.838671 21.5108 7.39615)" stroke="currentColor" strokeWidth="2"/>
            <line x1="12" y1="16.1429" x2="12" y2="21.6525" stroke="currentColor" strokeWidth="2"/>
        </svg>

    )
}

export default TokenIcon;