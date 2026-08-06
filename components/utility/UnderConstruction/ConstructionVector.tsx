import React from 'react';

const ConstructionVector = () => (
    <svg width="800" height="500" viewBox="0 0 800 500" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="monitorGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#F8FAFC" />
            </linearGradient>
            <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>

        {/* Skyline (Faded) */}
        <rect x="100" y="320" width="60" height="130" fill="#E2E8F0" opacity="0.3" />
        <rect x="180" y="280" width="50" height="170" fill="#E2E8F0" opacity="0.2" />
        <rect x="650" y="300" width="70" height="150" fill="#E2E8F0" opacity="0.3" />

        {/* Central High-Tech Monitor */}
        <rect x="280" y="150" width="240" height="160" rx="12" fill="url(#monitorGrad)" stroke="#1E293B" strokeWidth="3" />
        <rect x="295" y="165" width="210" height="130" rx="6" fill="#F0F7FF" stroke="#007BFF" strokeWidth="1" strokeDasharray="4 4" />
        <path d="M360 310 L440 310 L460 400 L340 400 Z" fill="#F1F5F9" stroke="#1E293B" strokeWidth="3" />
        <line x1="330" y1="400" x2="470" y2="400" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
        <circle cx="400" cy="302" r="5" fill="#007BFF" filter="url(#softGlow)" />

        {/* Large Professional Crane */}
        <path d="M220 450 L220 80 L580 80" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
        <path d="M220 120 L580 120" stroke="#1E293B" strokeWidth="2" strokeDasharray="10 5" />
        <rect x="190" y="100" width="60" height="120" rx="10" fill="white" stroke="#007BFF" strokeWidth="3" />
        <line x1="205" y1="130" x2="235" y2="130" stroke="#007BFF" strokeWidth="2" />
        <line x1="205" y1="150" x2="235" y2="150" stroke="#007BFF" strokeWidth="2" />

        {/* Crane Hook over Monitor */}
        <line x1="550" y1="80" x2="550" y2="180" stroke="#1E293B" strokeWidth="2" />
        <path d="M535 180 C535 195 565 195 565 180" stroke="#007BFF" strokeWidth="3" fill="none" strokeLinecap="round" />

        {/* Detailed Excavator */}
        <rect x="40" y="380" width="140" height="70" rx="12" fill="white" stroke="#1E293B" strokeWidth="3" />
        <rect x="50" y="430" width="120" height="20" rx="10" fill="#1E293B" />
        {[60, 90, 120, 150].map(x => (
            <circle key={x} cx={x} cy={440} r="6" fill="#007BFF" />
        ))}
        <rect x="70" y="340" width="80" height="40" rx="8" fill="#F0F7FF" stroke="#007BFF" strokeWidth="2" />
        <path d="M150 360 L240 330 L260 400 L210 420" stroke="#1E293B" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M260 400 L300 440 L240 450" fill="#007BFF" fillOpacity="0.1" stroke="#1E293B" strokeWidth="2" />

        {/* Detailed Truck */}
        <rect x="580" y="390" width="160" height="60" rx="6" fill="white" stroke="#1E293B" strokeWidth="3" />
        <rect x="585" y="350" width="90" height="40" rx="6" fill="#F0F7FF" stroke="#007BFF" strokeWidth="2" />
        <rect x="680" y="350" width="55" height="40" rx="2" stroke="#1E293B" strokeWidth="1" strokeDasharray="5 3" />
        {[610, 650, 715].map(x => (
            <g key={x}>
                <circle cx={x} cy={445} r="14" fill="#1E293B" />
                <circle cx={x} cy={445} r="6" fill="white" />
            </g>
        ))}

        {/* Industrial Ground Decor */}
        <line x1="0" y1="450" x2="800" y2="450" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
        <path d="M0 450 L800 450" stroke="#E2E8F0" strokeWidth="10" strokeDasharray="2 20" transform="translate(0, 15)" />
    </svg>
);

export default ConstructionVector;
