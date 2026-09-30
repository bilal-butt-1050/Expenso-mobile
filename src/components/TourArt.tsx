/* eslint-disable no-restricted-syntax -- illustration palette, not UI colour (W2) */
// The onboarding tour's four illustrations. Their gradients and highlights are artwork, so they
// don't come from src/theme; every UI colour still does.
import React from "react";
import Svg, { Path, Rect, Circle, Defs, LinearGradient, Stop } from "react-native-svg";

export function CashflowVector() {
  return (
    <Svg width={110} height={110} viewBox="0 0 110 110" fill="none">
      <Defs>
        <LinearGradient id="cfCardGrad" x1="10" y1="20" x2="100" y2="90" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#818CF8" />
          <Stop offset="100%" stopColor="#4F46E5" />
        </LinearGradient>
        <LinearGradient id="cfCoinGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#34D399" />
          <Stop offset="100%" stopColor="#059669" />
        </LinearGradient>
      </Defs>
      <Circle cx="55" cy="55" r="48" fill="rgba(99, 102, 241, 0.12)" />
      <Rect x="20" y="24" width="70" height="44" rx="10" fill="#312E81" opacity="0.6" />
      <Rect x="15" y="36" width="76" height="48" rx="10" fill="url(#cfCardGrad)" />
      <Rect x="23" y="46" width="14" height="10" rx="3" fill="#C7D2FE" opacity="0.8" />
      <Rect x="23" y="66" width="30" height="4" rx="2" fill="#FFFFFF" opacity="0.5" />
      <Rect x="58" y="66" width="22" height="4" rx="2" fill="#FFFFFF" opacity="0.3" />
      <Circle cx="82" cy="74" r="15" fill="url(#cfCoinGrad)" />
      <Path d="M76 74L80 78L88 70" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function BudgetVector() {
  return (
    <Svg width={110} height={110} viewBox="0 0 110 110" fill="none">
      <Defs>
        <LinearGradient id="bgRingGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#A78BFA" />
          <Stop offset="100%" stopColor="#6366F1" />
        </LinearGradient>
      </Defs>
      <Circle cx="55" cy="55" r="48" fill="rgba(99, 102, 241, 0.12)" />
      <Circle cx="55" cy="55" r="36" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="8" strokeDasharray="170 60" />
      <Circle
        cx="55"
        cy="55"
        r="36"
        stroke="url(#bgRingGrad)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray="140 100"
        transform="rotate(-90 55 55)"
      />
      <Circle cx="55" cy="55" r="16" fill="#1E1B4B" stroke="#6366F1" strokeWidth="2" />
      <Circle cx="55" cy="55" r="6" fill="#A78BFA" />
      <Circle cx="89" cy="40" r="5" fill="#38BDF8" />
    </Svg>
  );
}

export function LoansVector() {
  return (
    <Svg width={110} height={110} viewBox="0 0 110 110" fill="none">
      <Defs>
        <LinearGradient id="loanBlueGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#60A5FA" />
          <Stop offset="100%" stopColor="#2563EB" />
        </LinearGradient>
        <LinearGradient id="loanAmberGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#FBBF24" />
          <Stop offset="100%" stopColor="#D97706" />
        </LinearGradient>
      </Defs>
      <Circle cx="55" cy="55" r="48" fill="rgba(59, 130, 246, 0.1)" />
      <Rect x="20" y="32" width="32" height="46" rx="16" fill="url(#loanBlueGrad)" opacity="0.9" />
      <Circle cx="36" cy="46" r="6" fill="#FFFFFF" />
      <Path d="M28 66C28 60 44 60 44 66" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      <Rect x="58" y="32" width="32" height="46" rx="16" fill="url(#loanAmberGrad)" opacity="0.9" />
      <Circle cx="74" cy="46" r="6" fill="#FFFFFF" />
      <Path d="M66 66C66 60 82 60 82 66" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M40 24C48 20 62 20 70 24" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
      <Path d="M70 86C62 90 48 90 40 86" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function ClarityVector() {
  return (
    <Svg width={110} height={110} viewBox="0 0 110 110" fill="none">
      <Defs>
        <LinearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#818CF8" />
          <Stop offset="100%" stopColor="#4338CA" />
        </LinearGradient>
      </Defs>
      <Circle cx="55" cy="55" r="48" fill="rgba(99, 102, 241, 0.12)" />
      <Path
        d="M55 22L78 32V53C78 68 68 81 55 86C42 81 32 68 32 53V32L55 22Z"
        fill="url(#shieldGrad)"
      />
      <Path
        d="M55 26L74 34.5V53C74 65.5 65.5 76.5 55 81C44.5 76.5 36 65.5 36 53V34.5L55 26Z"
        stroke="rgba(255, 255, 255, 0.25)"
        strokeWidth="1.5"
      />
      <Path
        d="M45 54L52 61L66 47"
        stroke="#FFFFFF"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
