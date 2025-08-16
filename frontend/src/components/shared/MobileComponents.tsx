"use client";

import React from 'react';

// iPhone Frame Component using frame.svg with auto-alignment
export const MobileFrame: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  frameSize?: { width: number; height: number };
}> = ({ 
  children, 
  className = "",
  frameSize = { width: 375, height: 812 }
}) => (
  <div className={`relative mx-auto ${className}`} style={{ filter: 'drop-shadow(0 25px 50px rgba(0,0,0,0.25))' }}>
    <div className="relative transform scale-90" style={{ width: `${frameSize.width}px`, height: `${frameSize.height}px` }}>
      {/* Screen Content Area - positioned within frame bezels */}
      <div 
        className="absolute overflow-hidden"
        style={{ 
          top: '3%',
          left: '6%', 
          right: '6%',
          bottom: '3%',
          zIndex: 1,
          borderRadius: '25px'
        }}
      >
        <div className="h-full w-full relative">
          {/* Auto-align any images to fit screen area */}
          <div className="h-full w-full [&>img]:w-full [&>img]:h-full [&>img]:object-cover [&>img]:object-center">
            {children}
          </div>
        </div>
      </div>
      
      {/* iPhone Frame SVG - overlay on top */}
      <img 
        src="/frame.svg" 
        alt="iPhone Frame"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20"
        style={{ backgroundColor: 'transparent' }}
      />
    </div>
  </div>
);

// Sender iPhone Frame with baked-in status bar
export const SenderMobileFrame: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  frameSize?: { width: number; height: number };
}> = ({ 
  children, 
  className = "",
  frameSize = { width: 375, height: 812 }
}) => (
  <div className={`relative mx-auto ${className}`} style={{ filter: 'drop-shadow(0 25px 50px rgba(0,0,0,0.25))' }}>
    <div className="relative transform scale-90" style={{ width: `${frameSize.width}px`, height: `${frameSize.height}px` }}>
      {/* Screen Content Area - positioned within frame bezels */}
      <div 
        className="absolute overflow-hidden"
        style={{ 
          top: '3%',
          left: '6%', 
          right: '6%',
          bottom: '3%',
          zIndex: 1,
          borderRadius: '25px'
        }}
      >
        <div className="h-full w-full relative">
          {/* Auto-align any images to fit screen area */}
          <div className="h-full w-full [&>img]:w-full [&>img]:h-full [&>img]:object-cover [&>img]:object-center">
            {children}
          </div>
        </div>
      </div>
      
      {/* iPhone Frame SVG - overlay on top */}
      <img 
        src="/frame.svg" 
        alt="iPhone Frame"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20"
        style={{ backgroundColor: 'transparent' }}
      />
      
      {/* Status Bar baked into frame - non-interactive overlay */}
      <div 
        className="absolute pointer-events-none z-30"
        style={{ 
          top: '3%',
          left: '6%', 
          
        }}
      >
        <img 
          src="/statusbar.svg" 
          alt="iOS Status Bar"
          className="w-full h-full object-contain pointer-events-none"
        />
      </div>
    </div>
  </div>
);

// iOS Status Bar Component using statusbar.svg
export const IOSStatusBar: React.FC<{ 
  className?: string;
}> = ({ 
  className = ""
}) => (
  <div className={`absolute top-0 left-0 right-0 z-40 ${className}`}>
    <img 
      src="/statusbar.svg" 
      alt="iOS Status Bar"
      className="w-full h-auto object-contain"
    />
  </div>
);

// iOS Notification Bar Component using notification_bar.svg
export const IOSNotificationBar: React.FC<{ 
  message: string;
  className?: string;
  show?: boolean;
}> = ({ 
  message,
  className = "",
  show = true
}) => (
  show ? (
    <div className={`absolute top-12 left-6 right-6 z-30 animate-slide-down ${className}`}>
      <div className="relative">
        <img 
          src="/notification_bar.svg" 
          alt="iOS Notification Bar"
          className="w-full h-auto object-contain"
        />
        {/* Dynamic text overlay on the notification bar */}
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <p className="text-white text-sm font-medium text-center">
            {message}
          </p>
        </div>
      </div>
    </div>
  ) : null
);

// Pure React/CSS iOS-style Notification Banner (no external SVG)
export const IOSNotificationBanner: React.FC<{
  title?: string;
  message: string;
  iconSrc?: string; // kept for backward compatibility
  avatarSrc?: string; // large leading circular icon
  badgeSrc?: string; // small overlay badge icon
  timestampText?: string;
  className?: string;
  mode?: 'light' | 'dark';
  blur?: number; // backdrop blur in px
  opacity?: number; // container background opacity 0..1
  saturate?: number; // backdrop saturation multiplier (e.g. 1.8)
  contrast?: number; // backdrop contrast multiplier (e.g. 1.05)
  tint?: string; // optional css color to tint the material (e.g. 'rgba(255,255,255,0.12)')
  borderOpacity?: number; // hairline border opacity
}> = ({
  title = 'TrueMoney',
  message,
  iconSrc = '/logotrue.webp',
  avatarSrc,
  badgeSrc,
  timestampText = 'now',
  className = '',
  mode = 'dark',
  blur = 20,
  opacity,
  saturate = 1.8,
  contrast = 1.05,
  tint,
  borderOpacity
}) => {
  const isLight = mode === 'light';

  const al = typeof opacity === 'number' ? opacity : (isLight ? 0.9 : 0.85);

  const containerStyle: React.CSSProperties = {
    height: '72px',
    backdropFilter: `blur(${blur}px) saturate(${saturate}) contrast(${contrast})`,
    WebkitBackdropFilter: `blur(${blur}px) saturate(${saturate}) contrast(${contrast})`,
    background: isLight ? `rgba(255,255,255,${al})` : `rgba(28,28,30,${al})`,
    boxShadow: isLight ? '0 6px 20px rgba(0,0,0,0.10)' : '0 8px 24px rgba(0,0,0,0.35)',
    border: `1px solid ${isLight ? `rgba(255,255,255,${typeof borderOpacity==='number'?borderOpacity:0.35})` : `rgba(255,255,255,${typeof borderOpacity==='number'?borderOpacity:0.18})`}`
  };

  const hairlineShadow = isLight
    ? 'inset 0 1px 0 rgba(0,0,0,0.06)'
    : 'inset 0 1px 0 rgba(255,255,255,0.06)';

  const iconBg = isLight ? 'rgba(120,120,128,0.16)' : 'rgba(255,255,255,0.15)';

  const titleColor = isLight ? 'rgba(0,0,0,0.90)' : 'rgba(255,255,255,1)';
  const messageColor = isLight ? 'rgba(60,60,67,0.80)' : 'rgba(235,235,245,0.80)';
  const timestampColor = isLight ? 'rgba(60,60,67,0.60)' : 'rgba(235,235,245,0.60)';

  return (
    <div
      className={`relative mx-1 rounded-3xl overflow-hidden ${className}`}
      style={containerStyle}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: hairlineShadow }}></div>
      {/* subtle radial gloss + optional tint to mimic iOS material */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: [
          isLight
            ? 'radial-gradient(120% 80% at 50% -20%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 60%)'
            : 'radial-gradient(120% 80% at 50% -20%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 60%)',
          tint || ''
        ].filter(Boolean).join(', ')
      }} />
      <div className="h-full w-full flex items-center px-4 gap-3">
        {/* Leading circular avatar with optional badge */}
        <div className="relative shrink-0">
          <div
            className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center"
            style={{ background: iconBg }}
          >
            {avatarSrc || iconSrc ? (
              <img src={avatarSrc || iconSrc} alt={title} className="w-11 h-11 object-cover" />
            ) : (
              <div className="w-6 h-6 rounded" style={{ background: isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.6)' }} />
            )}
          </div>
          {badgeSrc && (
            <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-md overflow-hidden border border-white/80 bg-white">
              <img src={badgeSrc} alt="badge" className="w-full h-full object-contain" />
            </div>
          )}
        </div>
        <div
          className="flex-1 min-w-0"
          style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif" }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[15px] font-semibold truncate" style={{ color: titleColor }}>{title}</span>
            <span className="text-[11px] shrink-0" style={{ color: timestampColor }}>{timestampText}</span>
          </div>
          <p className="text-[14px] leading-tight truncate" style={{ color: messageColor }}>{message}</p>
        </div>
      </div>
    </div>
  );
};

// Quick Amount Buttons Component
export const QuickAmountButtons: React.FC<{
  amounts: string[];
  onAmountSelect: (amount: string) => void;
  disabled?: boolean;
}> = ({ amounts, onAmountSelect, disabled = false }) => (
  <div className="grid grid-cols-3 gap-3">
    {amounts.map((amount) => (
      <button
        key={amount}
        onClick={() => onAmountSelect(amount)}
        className="py-3 px-4 bg-gray-100 rounded-xl font-medium text-gray-700 hover:bg-gray-200 transition-all duration-200 ios-button-press active:bg-gray-300"
        disabled={disabled}
      >
        ₿{amount}
      </button>
    ))}
  </div>
);

// Transfer Button Component
export const TransferButton: React.FC<{
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  loadingText?: string;
  children: React.ReactNode;
}> = ({ onClick, loading, disabled, loadingText, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-200 ios-button-press ios-haptic relative overflow-hidden ${
      disabled
        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
        : 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg hover:shadow-xl active:shadow-md'
    }`}
  >
    {loading ? (
      <div className="flex items-center justify-center space-x-2">
        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
        <span>{loadingText || 'Processing...'}</span>
      </div>
    ) : (
      children
    )}
  </button>
);

// User Profile Header Component
export const UserProfileHeader: React.FC<{
  user: {
    name: string;
    phone: string;
    avatar: string;
  };
  balance: string;
  balanceLoading: boolean;
}> = ({ user, balance, balanceLoading }) => (
  <div className="px-6 pb-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/30">
          <div className="w-full h-full bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold">{user.avatar}</span>
          </div>
        </div>
        <div>
          <h2 className="text-white font-bold text-lg">{user.name}</h2>
          <p className="text-orange-100 text-sm">{user.phone}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-orange-100 text-xs">Balance</p>
        <p className="text-white font-bold text-lg">
          {balanceLoading ? '...' : `₿${balance}`}
        </p>
      </div>
    </div>
  </div>
);

// Input Field Component
export const InputField: React.FC<{
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  prefix?: string;
  type?: string;
  className?: string;
}> = ({ 
  label, 
  placeholder, 
  value, 
  onChange, 
  disabled = false, 
  prefix,
  type = "text",
  className = ""
}) => (
  <div className="space-y-2">
    <label className="text-gray-700 font-medium">{label}</label>
    <div className="relative">
      {prefix && (
        <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-xl">
          {prefix}
        </span>
      )}
      <input
        type={type}
        placeholder={placeholder}
        className={`w-full ${prefix ? 'pl-12 pr-4' : 'px-4'} py-4 border-2 border-gray-200 rounded-2xl focus:border-orange-500 focus:outline-none ${className}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  </div>
);

// App Icon Component
export const AppIcon: React.FC<{
  name: string;
  color?: string;
  icon: string;
  gradient?: boolean;
}> = ({ name, color = 'bg-gray-500', icon, gradient = false }) => (
  <div className="flex flex-col items-center space-y-2">
    <div className={`w-14 h-14 ${gradient ? 'bg-gradient-to-r from-orange-500 to-red-500' : color} rounded-2xl flex items-center justify-center shadow-lg ios-button-press transform transition-transform duration-200 hover:scale-105 active:scale-95`}>
      <span className="text-white text-xl font-bold">{icon}</span>
    </div>
    <span className="text-xs text-gray-700 text-center">{name}</span>
  </div>
);