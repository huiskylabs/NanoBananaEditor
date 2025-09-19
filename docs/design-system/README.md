# AI Image Editor Design System

A Lexica-inspired design system built with TypeScript, Tailwind CSS, and semantic design tokens.

## Overview

This design system provides a consistent, scalable foundation for the AI Image Editor application. It features:

- **Semantic Design Tokens** - Centralized color, spacing, and typography definitions
- **Component Library** - Reusable UI components with consistent variants
- **Lexica-Inspired Aesthetic** - Clean, artistic, compact design language
- **TypeScript Support** - Full type safety for design tokens and components
- **Tailwind Integration** - Optimized for utility-first CSS development

## Architecture

### Design Tokens

Located in `/src/design-tokens/`, the system provides three categories of tokens:

#### Colors (`colors.ts`)
Semantic color definitions following the zinc palette:

```typescript
// Surface colors - for backgrounds and containers
surface: {
  primary: 'zinc-950',      // Main app background
  secondary: 'zinc-900',    // Panel backgrounds
  tertiary: 'zinc-800',     // Card/component backgrounds
  elevated: 'zinc-700',     // Hover states
}

// Text colors - for readability hierarchy
text: {
  primary: 'zinc-100',      // Main headings
  secondary: 'zinc-200',    // Secondary headings
  tertiary: 'zinc-300',     // Body text
  muted: 'zinc-400',        // Placeholder text
}
```

#### Spacing (`spacing.ts`)
Consistent spacing scale and component-specific spacing:

```typescript
scale: {
  xs: '0.5',    // 8px
  sm: '0.75',   // 12px
  md: '1',      // 16px
  lg: '1.5',    // 24px
  xl: '2',      // 32px
}
```

#### Typography (`typography.ts`)
Font sizes, weights, and semantic text styles:

```typescript
heading: {
  h1: 'text-2xl font-bold',
  h2: 'text-xl font-semibold',
  h3: 'text-lg font-semibold',
}
```

### Component System

All components use design tokens and provide consistent variants:

#### Button Component
Enhanced with multiple variants and states:

```typescript
// Variants
variant: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'
size: 'default' | 'sm' | 'lg' | 'icon' | 'iconSm' | 'iconLg'
state: 'default' | 'success' | 'warning' | 'error'
loading: boolean
```

Example usage:
```tsx
<Button
  variant="secondary"
  size="lg"
  loading={isSubmitting}
  loadingText="Generating..."
>
  Generate Image
</Button>
```

#### Input & Textarea
Consistent form elements with semantic tokens:

```tsx
<Input placeholder="Enter prompt..." />
<Textarea placeholder="Describe your image..." />
```

## Usage Guidelines

### Importing Design Tokens

```typescript
import { colorTokens, spacingTokens, typographyTokens } from '@/design-tokens';
```

### Creating New Components

1. **Use Design Tokens**: Always reference semantic tokens instead of hardcoded values
2. **Follow Naming Conventions**: Use descriptive, semantic names
3. **Provide Variants**: Include size, state, and visual variants
4. **Type Safety**: Export proper TypeScript interfaces

Example:
```typescript
import { colorTokens } from '@/design-tokens';

const cardVariants = cva(
  `bg-${colorTokens.surface.secondary} border border-${colorTokens.surface.border}`,
  {
    variants: {
      padding: {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      }
    }
  }
);
```

### Color Usage

- **Surface Colors**: Use for backgrounds, containers, borders
- **Text Colors**: Follow hierarchy (primary → secondary → tertiary → muted)
- **Interactive Colors**: Use for buttons, links, focus states
- **Status Colors**: Use for success, warning, error feedback

### Spacing Usage

- **Layout Spacing**: Use `xl`, `2xl`, `3xl` for major layout gaps
- **Component Spacing**: Use `sm`, `md`, `lg` for internal padding
- **Item Spacing**: Use `xs`, `sm` for minimal gaps

## Best Practices

### ✅ Do

- Use semantic tokens instead of hardcoded Tailwind classes
- Follow the established color hierarchy
- Maintain consistent spacing patterns
- Provide accessible focus states
- Include loading and error states for interactive components

### ❌ Don't

- Hardcode color values or zinc classes directly
- Skip component variants for different use cases
- Break the established visual hierarchy
- Remove accessibility features

## Contributing

When adding new tokens or components:

1. Update the appropriate token file in `/src/design-tokens/`
2. Export new tokens from the main index file
3. Update component variants to use new tokens
4. Add documentation and usage examples
5. Test across different themes and states

## Lexica Inspiration

This design system draws inspiration from [Lexica.art](https://lexica.art) for:

- **Clean Aesthetics**: Minimal, focused interface design
- **Compact Layout**: Dense information presentation without clutter
- **Sophisticated Colors**: Zinc-based palette with subtle gradients
- **Artistic Focus**: Design that emphasizes content over chrome