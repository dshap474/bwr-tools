<<<<<<< HEAD
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

BWR-tools is a Python library (published as `bwr-tools` on PyPI) for creating Blockworks Research branded data visualizations. It wraps Plotly for charts and AG-Grid for interactive tables, providing consistent styling for financial and cryptocurrency data visualization.

## Commands

### Development Setup
```bash
# Install dependencies using Poetry
poetry install

# Install in development mode
pip install -e .
```

### Running Examples
```bash
# Run individual example
python examples/demo_scatter.py

# Run all examples
python examples/run_all_examples.py

# Run Streamlit demo app
streamlit run app.py
```

### Testing
```bash
# Run tests (limited test coverage)
poetry run pytest
```

## Architecture

### Core Structure
- **Main Class**: `BWRPlots` in `src/bwr_tools/core.py` - Factory for all chart types
- **Chart Modules**: Individual modules in `src/bwr_tools/charts/` for each chart type
- **Configuration**: Centralized in `config.py` with hierarchical, mergeable configs
- **Package Name**: The package is published as `bwr_tools` and the directory is also `bwr_tools`

### Key Patterns
1. **Factory Pattern**: BWRPlots class creates all chart types through dedicated methods
2. **Configuration Merging**: Each chart method accepts config overrides that merge with defaults
3. **Consistent Interface**: All chart methods follow similar parameter patterns (data, config, output options)

### Chart Types
- `scatter()`: Line/scatter plots with optional dual Y-axis
- `point_scatter()`: Scatter plots without connecting lines
- `metric_share_area()`: Normalized stacked area charts (100% stacked)
- `bar()`, `grouped_bar()`, `stacked_bar()`, `horizontal_bar()`: Various bar chart types
- `plotly_table()`: Static tables with Plotly
- `aggrid_table()`: Interactive tables for Streamlit apps

### Special Features
- **Branding**: Extensive BWR/BWA branding options (colors, fonts, watermarks, backgrounds)
- **Auto-scaling**: Y-axis values automatically formatted with K/M/B suffixes
- **DeFi Llama Integration**: Built-in API wrapper for crypto/DeFi data
- **Output Options**: Save as HTML, auto-open in browser, CDN support for smaller files
=======
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Commands

### Development
```bash
# Development server (DO NOT USE port 4000 - start on 4001+)
PORT=4001 npm run dev

# Type checking & linting (run frequently)
npx tsc --noEmit && npm run lint

# Testing
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report

# Code quality
npm run format            # Format with Prettier
npm run format:check      # Check formatting
npm run build             # Production build

# Bundle analysis
ANALYZE=true npm run build
```

### Key Project Rules
- **Port usage**: Never use port 4000, start on 4001 or higher
- **TypeScript strict mode**: Always enabled, no `any` types
- **Import organization**: Use `@/*` path aliases for src imports
- **Component structure**: Hooks first, handlers next, early returns, then render

## Architecture Overview

### Tech Stack
- **Next.js 15**: App Router with TypeScript
- **Styling**: Tailwind CSS + CSS custom properties
- **UI Components**: Radix UI + shadcn/ui (New York style)
- **State**: Custom hooks + discriminated unions
- **Testing**: Jest + Testing Library
- **Type Safety**: Strict TypeScript throughout

### Project Structure
```
src/
├── app/           # Next.js App Router (pages, layouts, API routes)
├── components/    # Reusable UI components
│   ├── ui/        # shadcn/ui base components
│   └── header/    # Feature-specific components
├── features/      # Feature-based organization (auth, etc.)
├── hooks/         # Custom React hooks
├── lib/           # Utility libraries and configs
└── utils/         # Pure utility functions
```

### Component Patterns

**Standard Component Structure**:
```typescript
interface ComponentProps {
  className?: string
  // Explicit prop types (never use any)
}

export function Component({ className, ...props }: ComponentProps) {
  // 1. Hooks at top
  // 2. Event handlers
  // 3. Early returns (loading/error states)
  // 4. Main render
}
```

**Key Patterns**:
- **Compound components**: Complex UI compositions (Button with variants)
- **Forward refs**: All reusable components support ref forwarding
- **Class merging**: Use `cn()` utility for conditional Tailwind classes
- **Type-safe variants**: Class Variance Authority (CVA) for component variants

### State Management

**Patterns Used**:
- **Custom hooks**: Logic abstraction (`useAuth`, etc.)
- **Discriminated unions**: Type-safe action/state patterns
- **Local state**: useState for component-level state
- **Client persistence**: localStorage for session data

**State Pattern Example**:
```typescript
export type ActionType =
  | { type: 'LOADING' }
  | { type: 'SUCCESS'; payload: Data }
  | { type: 'ERROR'; payload: string }
```

### API Integration

**Centralized API Layer**:
- Location: `src/lib/api.ts`
- Pattern: Type-safe generic responses `ApiResponse<T>`
- Error handling: Custom `ApiError` class
- Methods: `api.get<T>()`, `api.post<T>()` with type inference

### Design System

**Tailwind Configuration**:
- **Color system**: HSL-based CSS custom properties
- **Dark mode**: Automatic via CSS custom properties
- **Design tokens**: Semantic naming (primary, secondary, muted)
- **Responsive**: Mobile-first approach

**Component Library**:
- **Base**: shadcn/ui New York style
- **Foundation**: Radix UI for accessibility
- **Customization**: `components.json` for configuration

### TypeScript Rules

**Strict Configuration**:
- No `any` types - use `unknown` with type guards
- Explicit interfaces for all props and API responses
- Discriminated unions for state management
- Generic utilities for type safety

**Path Aliases**:
```json
{
  "@/*": ["./src/*"]
}
```

### Testing Approach

**Setup**:
- Jest with Next.js integration
- Testing Library for component testing
- Setup file: `jest.setup.js`
- Path aliases configured for tests

**Patterns**:
- Component isolation with mocking
- Accessibility testing helpers
- User interaction testing over implementation details

### Development Workflow

**Code Quality**:
- ESLint + Prettier integration
- Husky pre-commit hooks (if configured)
- TypeScript strict mode for maximum safety
- Format on save recommended

**File Organization**:
- Index files for clean imports: `components/ui/index.ts`
- Feature-based grouping in `features/`
- Utility functions in dedicated `utils/` directory
- Custom hooks in `hooks/` directory

### Common Utilities

**Essential Functions**:
- `cn()`: Class merging utility (clsx + tailwind-merge)
- `api.*`: Type-safe API client methods
- Path constants: `ROUTES` object in `lib/constants.ts`
- Date formatting: Internationalization-aware utilities

### Key Dependencies

**Core**:
- `next`: ^15.4.1 (App Router)
- `react`: ^19.1.0
- `typescript`: ^5.8.3

**UI/Styling**:
- `tailwindcss`: ^4.1.11
- `@radix-ui/react-*`: Accessible primitives
- `class-variance-authority`: Type-safe variants
- `clsx` + `tailwind-merge`: Class utilities

**Development**:
- `jest` + `@testing-library/react`: Testing
- `eslint` + `prettier`: Code quality

## Non-Obvious Behaviors

1. **Port Collision**: Default dev server port 4000 conflicts with other services
2. **CSS Custom Properties**: Dark mode handled via CSS variables, not Tailwind classes
3. **Path Aliases**: `@/*` imports must use TypeScript path mapping
4. **shadcn/ui**: Components copied into codebase, not npm dependencies
5. **App Router**: Uses Next.js 15 App Router, not Pages Router patterns
6. **Strict TypeScript**: Zero tolerance for `any` types or loose typing

## Debugging Common Issues

```bash
# Type errors
npx tsc --noEmit --watch

# Import resolution issues
# Check tsconfig.json paths and baseUrl

# Tailwind classes not working
# Verify path in tailwind.config.ts content array

# Component not styled
# Check if using cn() utility for class merging
```
>>>>>>> a329ee7 (Update all changes - 2025-07-17 10:44:26)
