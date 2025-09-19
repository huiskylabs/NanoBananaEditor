import React from 'react';
import { cn } from '../../utils/cn';
import { colorTokens } from '../../design-tokens';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 ring-offset-zinc-950 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 hover:border-zinc-500 focus-visible:border-yellow-400 disabled:cursor-not-allowed disabled:opacity-50 resize-none',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';