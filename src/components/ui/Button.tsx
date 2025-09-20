import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import { colorTokens } from '../../design-tokens';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-orange-500 text-white hover:bg-orange-600 hover:shadow-sm focus-visible:ring-orange-500 border border-transparent',
        secondary: 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 hover:shadow-sm focus-visible:ring-zinc-600 border border-zinc-700 hover:border-zinc-600',
        outline: 'border border-zinc-600 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 hover:border-zinc-500 hover:shadow-sm',
        ghost: 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 border border-transparent hover:border-zinc-700',
        destructive: 'bg-red-500 text-white hover:bg-red-700 hover:shadow-sm focus-visible:ring-red-500',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-8',
        icon: 'h-10 w-10',
        iconSm: 'h-8 w-8',
        iconLg: 'h-12 w-12',
      },
      loading: {
        true: 'cursor-not-allowed',
        false: '',
      },
      state: {
        default: '',
        success: 'bg-green-600 hover:bg-green-700 text-white border-green-600',
        warning: 'bg-orange-600 hover:bg-orange-700 text-white border-orange-600',
        error: 'bg-red-600 hover:bg-red-700 text-white border-red-600',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      loading: false,
      state: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  loadingText?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, loadingText, children, state, disabled, ...props }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <button
        className={cn(buttonVariants({ variant, size, loading, state, className }))}
        disabled={isDisabled}
        ref={ref}
        {...props}
      >
        {loading && (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-current" />
        )}
        {loading ? loadingText || 'Loading...' : children}
      </button>
    );
  }
);

Button.displayName = 'Button';