/**
 * Composant Logo FleetMaster Pro
 * Logo avec pictogramme nœud connecté (style Linear/Vercel)
 */

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  href?: string;
  variant?: 'dark' | 'light' | 'auto';
}

const sizes = {
  sm: { icon: 24, text: 'text-lg' },
  md: { icon: 28, text: 'text-xl' },
  lg: { icon: 40, text: 'text-3xl' },
};

export function Logo({ 
  size = 'md', 
  showText = true, 
  className,
  href = '/',
  variant = 'auto'
}: LogoProps) {
  const { icon, text } = sizes[size];

  const content = (
    <div className={cn('flex items-center gap-2 transition-opacity hover:opacity-80', className)}>
      {/* Icon Logo - SVG inline pour meilleur contrôle */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Background */}
        <rect
          width="32"
          height="32"
          rx="8"
          className={cn(
            'transition-colors',
            variant === 'dark' && 'fill-[#0A0A0A]',
            variant === 'light' && 'fill-white',
            variant === 'auto' && 'fill-[#0A0A0A] dark:fill-white'
          )}
        />
        
        {/* Connected nodes - Icon content */}
        <g transform="translate(4, 4)">
          {/* Central node */}
          <circle
            cx="12"
            cy="12"
            r="4"
            className={cn(
              'transition-colors',
              variant === 'dark' && 'fill-white',
              variant === 'light' && 'fill-[#0A0A0A]',
              variant === 'auto' && 'fill-white dark:fill-[#0A0A0A]'
            )}
          />
          {/* Peripheral nodes */}
          {[
            { cx: 12, cy: 2 },
            { cx: 21, cy: 8 },
            { cx: 21, cy: 16 },
            { cx: 12, cy: 22 },
            { cx: 3, cy: 16 },
            { cx: 3, cy: 8 },
          ].map((pos, i) => (
            <circle
              key={i}
              cx={pos.cx}
              cy={pos.cy}
              r="2.5"
              className={cn(
                'transition-colors',
                variant === 'dark' && 'fill-white',
                variant === 'light' && 'fill-[#0A0A0A]',
                variant === 'auto' && 'fill-white dark:fill-[#0A0A0A]'
              )}
            />
          ))}
          {/* Connection lines */}
          {[
            'M12 12L12 4.5',
            'M12 12L18.5 8',
            'M12 12L18.5 16',
            'M12 12L12 19.5',
            'M12 12L5.5 16',
            'M12 12L5.5 8',
          ].map((d, i) => (
            <path
              key={i}
              d={d}
              strokeWidth="1.5"
              strokeLinecap="round"
              className={cn(
                'transition-colors',
                variant === 'dark' && 'stroke-white',
                variant === 'light' && 'stroke-[#0A0A0A]',
                variant === 'auto' && 'stroke-white dark:stroke-[#0A0A0A]'
              )}
            />
          ))}
        </g>
      </svg>

      {/* Text */}
      {showText && (
        <span
          className={cn(
            'font-bold tracking-tight transition-colors',
            text,
            variant === 'dark' && 'text-gray-900',
            variant === 'light' && 'text-white',
            variant === 'auto' && 'text-gray-900 dark:text-white'
          )}
        >
          FleetMaster
          <span className="text-primary"> Pro</span>
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-90 transition-opacity" aria-label="FleetMaster - Accueil">
        {content}
      </Link>
    );
  }

  return content;
}

// Logo icon only (for favicon-style usage)
export function LogoIcon({
  className,
  size = 32,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="FleetMaster"
    >
      <rect width="32" height="32" rx="8" className="fill-[#0A0A0A]" />
      <g transform="translate(4, 4)">
        <circle cx="12" cy="12" r="4" className="fill-white" />
        <circle cx="12" cy="2" r="2.5" className="fill-white" />
        <circle cx="21" cy="8" r="2.5" className="fill-white" />
        <circle cx="21" cy="16" r="2.5" className="fill-white" />
        <circle cx="12" cy="22" r="2.5" className="fill-white" />
        <circle cx="3" cy="16" r="2.5" className="fill-white" />
        <circle cx="3" cy="8" r="2.5" className="fill-white" />
        <path
          d="M12 12L12 4.5"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M12 12L18.5 8"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M12 12L18.5 16"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M12 12L12 19.5"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M12 12L5.5 16"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M12 12L5.5 8"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
