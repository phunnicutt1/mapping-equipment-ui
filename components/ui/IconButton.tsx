import React from 'react';
import { Tooltip } from './Tooltip';

interface IconButtonProps {
  icon: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  tooltip: string;
  variant?: 'confirm' | 'unassign' | 'flag' | 'default';
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}

export function IconButton({ 
  icon, 
  onClick, 
  tooltip, 
  variant = 'default', 
  size = 'sm',
  disabled = false,
  className = ''
}: IconButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1';
  
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm'
  };
  
  const variantClasses = {
    confirm: 'bg-green-100 text-green-700 hover:bg-green-200 focus:ring-green-500 border border-green-300',
    unassign: 'bg-orange-100 text-orange-700 hover:bg-orange-200 focus:ring-orange-500 border border-orange-300',
    flag: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 focus:ring-yellow-500 border border-yellow-300',
    default: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 border border-gray-300'
  };
  
  const disabledClasses = 'opacity-50 cursor-not-allowed hover:bg-current';
  
  const buttonClasses = `
    ${baseClasses} 
    ${sizeClasses[size]} 
    ${disabled ? disabledClasses : variantClasses[variant]}
    ${className}
  `.trim();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onClick(e);
    }
  };

  return (
    <Tooltip content={tooltip}>
      <button
        type="button"
        className={buttonClasses}
        onClick={handleClick}
        disabled={disabled}
        aria-label={tooltip}
      >
        {icon}
      </button>
    </Tooltip>
  );
} 