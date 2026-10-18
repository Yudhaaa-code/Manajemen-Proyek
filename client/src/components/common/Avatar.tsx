import React from 'react';

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  avatarUrl,
  size = 'md',
  className = '',
}) => {
  const getInitials = (str: string) => {
    if (!str) return 'U';
    const parts = str.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  const sizeClasses = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  }[size];

  // Pick deterministic soft gradient based on name string
  const colors = [
    'from-indigo-500 to-indigo-700 text-white',
    'from-slate-600 to-slate-800 text-white',
    'from-violet-500 to-purple-700 text-white',
    'from-sky-500 to-blue-700 text-white',
    'from-emerald-500 to-teal-700 text-white',
  ];
  const charCodeSum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const colorClass = colors[charCodeSum % colors.length];

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        title={name}
        className={`${sizeClasses} rounded-full object-cover border border-white/80 shadow-sm shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      title={name}
      className={`${sizeClasses} rounded-full bg-gradient-to-tr ${colorClass} font-semibold flex items-center justify-center border border-white/80 shadow-sm shrink-0 tracking-wider select-none ${className}`}
    >
      {getInitials(name)}
    </div>
  );
};
