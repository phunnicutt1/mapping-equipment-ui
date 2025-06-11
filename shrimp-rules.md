# BACnet Point Grouping UI Development Guidelines

## Project Overview

*   **Purpose**: Interactive web UI for grouping raw BACnet point data from SkySpark APIs into equipment types and instances
*   **Technology Stack**: Next.js 14 (App Router), TypeScript, React 18, Zustand, SWR, Tailwind CSS, Vitest
*   **Core Functions**: Data ingestion, auto-grouping, human-in-the-loop validation, draft management, equipment mapping
*   **Integration**: SkySpark API for BACnet data, TosiBox VPN connectivity for building automation systems

## Architecture Standards

### Project Structure

**MUST** follow Next.js 14 App Router structure:

```
grouping-UI/
├── app/                        # Next.js App Router pages
│   ├── layout.tsx             # Root layout with providers
│   ├── page.tsx               # Main grouping interface
│   ├── api/                   # API routes
│   │   ├── points/route.ts    # Points data endpoint
│   │   ├── save-draft/route.ts # Draft persistence
│   │   └── finalize/route.ts  # Final validation & publish
│   └── globals.css            # Global Tailwind styles
├── components/                 # Reusable UI components
│   ├── ui/                    # Base UI components
│   ├── grouping/              # Feature-specific components
│   └── dialogs/               # Modal components
├── lib/                       # Utility functions and configurations
│   ├── utils.ts              # UI utilities (existing)
│   ├── types.ts              # TypeScript interfaces
│   ├── mock-data.ts          # Development mock data
│   └── equipment-grouping.ts # Core grouping algorithms
├── store/                     # Zustand state management
│   └── grouping-store.ts     # Main application state
├── hooks/                     # Custom React hooks
└── __tests__/                 # Test files with Vitest
```

### TypeScript Configuration

**MUST** use strict TypeScript configuration with Next.js path mapping:

```typescript
// tsconfig.json requirements
{
  "extends": "next/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["components/*"],
      "@/lib/*": ["lib/*"],
      "@/store/*": ["store/*"],
      "@/hooks/*": ["hooks/*"]
    }
  }
}
```

### Required Dependencies

**MUST** include these exact dependencies in package.json:

```
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "zustand": "^4.4.0",
    "swr": "^2.2.0",
    "@heroicons/react": "^2.0.0",
    "tailwindcss": "^3.3.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@vitejs/plugin-react": "^4.0.0"
  }
}
```

## Data Model Standards

### Core TypeScript Interfaces

**MUST** define these interfaces in `lib/types.ts`:

```typescript
// Primary data structures from original specification
interface BACnetPoint {
  id: string;                    // unique SkySpark/BACnet identifier
  dis: string;                   // human-friendly name
  bacnetCur: string;            // present-value object ref
  kind: 'Number' | 'Bool' | 'Str'; // BACnet data types
  unit: string | null;          // engineering units
  vendor?: string;              // equipment vendor
  model?: string;               // equipment model
  equipRef?: string | null;     // FK to equipment instance
  fileName?: string;            // source file for pattern matching
  confidence?: number;          // auto-grouping confidence (0-1)
  status: 'suggested' | 'confirmed' | 'flagged' | 'manual';
}

interface EquipmentType {
  id: string;                   // unique type identifier
  name: string;                 // display name (e.g., "Air Handling Unit")
  pattern: RegExp;              // filename pattern for detection
  confidence: number;           // default confidence threshold
  pointPatterns: string[];      // expected point name patterns
  minPoints: number;            // minimum points for valid equipment
  maxPoints: number;            // maximum expected points
}

interface EquipmentInstance {
  id: string;                   // unique instance identifier
  name: string;                 // display name (e.g., "AHU-1")
  typeId: string;              // FK to EquipmentType
  pointCount: number;           // assigned points count
  confidence: number;           // grouping confidence score
  status: 'suggested' | 'confirmed' | 'flagged' | 'manual';
  points: BACnetPoint[];       // assigned points
}
```

### State Management Schema

**MUST** use Zustand store with this structure in `store/grouping-store.ts`:

```typescript
interface GroupingStore {
  // Data state
  points: BACnetPoint[];
  equipmentTypes: EquipmentType[];
  equipmentInstances: EquipmentInstance[];
  
  // UI state
  ui: {
    selectedPoints: Set<string>;
    filter: {
      search: string;
      kind: string[];
      unit: string[];
    };
    loading: boolean;
    error: string | null;
  };
  
  // Statistics
  stats: {
    totalPoints: number;
    assignedPoints: number;
    suggestedGroups: number;
    confirmedGroups: number;
  };
  
  // Actions
  loadData: () => Promise<void>;
  confirmPoint: (pointId: string, equipmentId: string) => void;
  flagPoint: (pointId: string) => void;
  assignPoints: (pointIds: string[], equipmentId: string) => void;
  createEquipment: (type: string, name: string) => string;
  saveDraft: () => Promise<void>;
  finalize: () => Promise<boolean>;
}
```

## Component Architecture Standards

### Component Organization

**MUST** organize components by feature and reusability:

```
components/
├── ui/                        # Base reusable components
│   ├── Button.tsx            # Styled button variants
│   ├── Badge.tsx             # Status badges
│   ├── Input.tsx             # Form inputs
│   ├── Modal.tsx             # Base modal component
│   └── Table.tsx             # Base table component
├── grouping/                  # Feature-specific components
│   ├── SuggestedGroups.tsx   # Auto-detected equipment panel
│   ├── UnassignedPoints.tsx  # Available points panel (existing)
│   ├── PointsTable.tsx       # Points data table
│   └── StatsPanel.tsx        # Statistics dashboard
└── dialogs/                   # Modal dialogs
    ├── CreateEquipmentDialog.tsx
    ├── AssignPointsDialog.tsx
    └── FinalizeDialog.tsx
```

### Component Standards

**MUST** follow these React component patterns:

*   Use TypeScript function components with explicit return types
*   Define props interfaces separately for reusability
*   Use forward refs for DOM elements that need ref access
*   Implement proper error boundaries for data fetching
*   Use React.memo for expensive list renders

**Example Component Pattern**:

```typescript
interface PointsTableProps {
  points: BACnetPoint[];
  showEquipmentColumn?: boolean;
  selectable?: boolean;
  compact?: boolean;
  onPointSelect?: (pointId: string) => void;
  onPointConfirm?: (pointId: string, equipmentId: string) => void;
}

export const PointsTable: React.FC<PointsTableProps> = ({
  points,
  showEquipmentColumn = true,
  selectable = false,
  compact = false,
  onPointSelect,
  onPointConfirm,
}) => {
  // Component implementation
};
```

### Missing Component Requirements

**MUST** implement these components to complete the existing `UnassignedPoints.tsx`:

1.  **PointsTable**: Reusable table for displaying BACnet points with sorting, selection, and actions
2.  **CreateEquipmentDialog**: Modal for manually creating new equipment instances
3.  **AssignPointsDialog**: Modal for bulk assignment of points to equipment
4.  **SuggestedGroups**: Collapsible cards showing auto-detected equipment with confidence scores

## API Integration Standards

### SkySpark API Patterns

**MUST** implement API routes with these patterns in `app/api/`:

```typescript
// app/api/points/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  
  // Fetch from SkySpark API or return mock data
  const response = await fetch(`${process.env.SKYSPARK_API_URL}/points`, {
    headers: {
      'Authorization': `Bearer ${process.env.SKYSPARK_API_TOKEN}`,
    },
  });
  
  return Response.json(await response.json());
}

// app/api/save-draft/route.ts
export async function POST(request: Request) {
  const data = await request.json();
  // Save current grouping state as draft
  return Response.json({ success: true, draftId: generateId() });
}
```

### Data Fetching Standards

**MUST** use SWR for all data fetching with these patterns:

```typescript
// hooks/use-points-data.ts
export function usePointsData(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    projectId ? `/api/points?projectId=${projectId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30 second cache
    }
  );
  
  return {
    points: data?.points || [],
    equipmentTypes: data?.equipmentTypes || [],
    equipmentInstances: data?.equipmentInstances || [],
    isLoading,
    error,
    refresh: mutate,
  };
}
```

## Equipment Grouping Algorithm Standards

### Auto-Detection Logic

**MUST** implement equipment detection in `lib/equipment-grouping.ts`:

```typescript
// Pattern-based equipment type detection
export function detectEquipmentType(points: BACnetPoint[]): EquipmentType | null {
  for (const type of equipmentTypes) {
    const matches = points.filter(p => 
      p.fileName && type.pattern.test(p.fileName)
    );
    
    if (matches.length >= type.minPoints) {
      return type;
    }
  }
  return null;
}

// Jaccard similarity for equipment instance grouping
export function calculateJaccardSimilarity(pointsA: string[], pointsB: string[]): number {
  const setA = new Set(pointsA.map(normalizePointName));
  const setB = new Set(pointsB.map(normalizePointName));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}
```

### Confidence Scoring Rules

**MUST** implement confidence scoring with these criteria:

*   **Pattern Match Quality**: 0.9 for exact pattern match, 0.7 for partial, 0.5 for fuzzy
*   **Point Count Appropriateness**: 1.0 if within expected range, linear decay outside
*   **Vendor/Model Consistency**: 0.9 for known vendor patterns, 0.6 for unknown
*   **Minimum Confidence Threshold**: 0.8 for auto-suggestion, 0.9 for auto-confirmation

### Point Normalization Standards

**MUST** normalize point names before grouping:

```typescript
export function normalizePointName(pointName: string): string {
  return pointName
    .toLowerCase()
    .replace(/[-_]/g, ' ')                    // Replace separators
    .replace(/\b(sp|stpt)\b/gi, 'setpoint')   // Expand abbreviations
    .replace(/\b(temp|tmp)\b/gi, 'temperature')
    .replace(/\b(cmd|ctl)\b/gi, 'command')
    .trim();
}
```

## UI/UX Standards

### Tailwind CSS Configuration

**MUST** extend Tailwind with custom design tokens:

```javascript
// tailwind.config.js
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
        },
        success: {
          50: '#f0f9f4',
          500: '#10b981',
          600: '#059669',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
        },
        danger: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
        },
      },
    },
  },
};
```

### Responsive Design Requirements

**MUST** implement responsive layouts with these breakpoints:

*   **Desktop-first approach**: Design for 1200px+ primary use case
*   **Tablet (768px-1199px)**: Stack panels vertically, maintain functionality
*   **Mobile (767px and below)**: Single column layout, simplified interactions

### Accessibility Standards

**MUST** implement these accessibility requirements:

*   Semantic HTML elements for screen readers
*   ARIA labels for interactive elements
*   Keyboard navigation support for all interactive elements
*   Color contrast ratios meeting WCAG AA standards
*   Focus management for modal dialogs
*   Screen reader announcements for dynamic content updates

### Status Indication Patterns

**MUST** use consistent status indicators:

```typescript
// Status badge configurations
const statusConfigs = {
  suggested: { color: 'primary', icon: 'SparklesIcon' },
  confirmed: { color: 'success', icon: 'CheckIcon' },
  flagged: { color: 'warning', icon: 'ExclamationTriangleIcon' },
  manual: { color: 'gray', icon: 'UserIcon' },
};
```

## Testing Standards

### Unit Testing Requirements

**MUST** implement tests with Vitest and React Testing Library:

```typescript
// __tests__/components/UnassignedPoints.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { UnassignedPoints } from '@/components/UnassignedPoints';

describe('UnassignedPoints', () => {
  it('filters points by search term', async () => {
    const mockPoints = createMockPoints();
    render(<UnassignedPoints />);
    
    const searchInput = screen.getByPlaceholderText(/search points/i);
    fireEvent.change(searchInput, { target: { value: 'temperature' } });
    
    await waitFor(() => {
      expect(screen.getByText(/filtered points/i)).toBeInTheDocument();
    });
  });
});
```

### Integration Testing Standards

**MUST** test complete user workflows:

*   Data loading and error states
*   Point selection and bulk operations
*   Equipment creation and assignment
*   Draft saving and validation
*   Finalization process with integrity checks

### Mock Data Requirements

**MUST** provide comprehensive mock data in `lib/mock-data.ts`:

```typescript
export const mockBACnetPoints: BACnetPoint[] = [
  {
    id: 'p1',
    dis: 'AHU-1 Supply Air Temperature',
    bacnetCur: '@p:project1:r:ahu1_sat',
    kind: 'Number',
    unit: '°F',
    vendor: 'Johnson Controls',
    model: 'VMA1400',
    fileName: 'AHU-1_ERV-1.trio.txt',
    status: 'suggested',
    confidence: 0.85,
  },
  // Additional mock data for testing scenarios
];
```

## File Organization Standards

### Multi-File Coordination Rules

**When modifying state management (**`**store/grouping-store.ts**`**)**:

*   **MUST** update corresponding TypeScript interfaces in `lib/types.ts`
*   **MUST** update any components using the modified state properties
*   **MUST** update API routes that interact with the changed data structures

**When adding new components**:

*   **MUST** add corresponding TypeScript interfaces
*   **MUST** export from appropriate index files for clean imports
*   **MUST** add to Storybook if component is reusable

**When modifying API routes**:

*   **MUST** update corresponding hook functions in `hooks/`
*   **MUST** update TypeScript interfaces for request/response types
*   **MUST** update mock data to match new API structure

### Import/Export Standards

**MUST** use consistent import/export patterns:

```typescript
// Preferred import style
import { BACnetPoint, EquipmentType } from '@/lib/types';
import { useGroupingStore } from '@/store/grouping-store';
import { cn, formatTimestamp } from '@/lib/utils';

// Component exports
export { UnassignedPoints } from './UnassignedPoints';
export type { UnassignedPointsProps } from './UnassignedPoints';
```

### Naming Conventions

**MUST** follow these naming standards:

*   **Files**: PascalCase for components (`PointsTable.tsx`), kebab-case for utilities (`equipment-grouping.ts`)
*   **Components**: PascalCase (`UnassignedPoints`)
*   **Functions**: camelCase (`calculateJaccardSimilarity`)
*   **Constants**: SCREAMING\_SNAKE\_CASE (`CONFIDENCE_THRESHOLD`)
*   **Types/Interfaces**: PascalCase (`BACnetPoint`)

## Development Workflow Standards

### Build and Development

**MUST** support these development commands:

```
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "type-check": "tsc --noEmit",
    "lint": "next lint"
  }
}
```

### Environment Configuration

**MUST** support development with mock data and production with SkySpark:

```
# .env.local for development
NEXT_PUBLIC_USE_MOCK_DATA=true

# .env.production for SkySpark integration
SKYSPARK_API_URL=https://your-skyspark-instance.com/api
SKYSPARK_API_TOKEN=your-bearer-token
NEXT_PUBLIC_USE_MOCK_DATA=false
```

### Error Handling Patterns

**MUST** implement consistent error handling:

```typescript
// API error handling
export class APIError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Component error boundaries
export class ErrorBoundary extends React.Component {
  // Handle component errors gracefully
}
```

## Performance Standards

### Optimization Requirements

**MUST** implement these performance optimizations:

*   Virtualization for large point lists (>1000 items)
*   Debounced search with 300ms delay
*   Memoization for expensive calculations (Jaccard similarity)
*   Pagination for equipment instances
*   Lazy loading for equipment details

### Bundle Size Constraints

**MUST** maintain reasonable bundle sizes:

*   Main bundle: \<500KB gzipped
*   Individual route chunks: \<200KB gzipped
*   Use dynamic imports for large dependencies
*   Tree-shake unused Heroicons

## AI Decision-Making Standards

### Component Creation Priority

**When creating missing components, follow this order**:

1.  **PointsTable**: Required by UnassignedPoints (highest priority)
2.  **Base UI components**: Button, Badge, Modal (foundation)
3.  **Zustand store**: State management (core functionality)
4.  **Dialog components**: CreateEquipmentDialog, AssignPointsDialog
5.  **SuggestedGroups**: Auto-detected equipment panel
6.  **API routes**: Data fetching and persistence

### Architectural Decision Guidelines

**When implementing state management**:

*   Use Zustand for complex state with many actions
*   Use local useState for component-specific UI state
*   Use SWR for server state management and caching

**When designing components**:

*   Prioritize composition over inheritance
*   Create reusable base components in `components/ui/`
*   Keep feature-specific components in `components/grouping/`

**When handling data transformation**:

*   Normalize data at the API boundary
*   Keep raw SkySpark data separate from UI state
*   Implement optimistic updates for better UX

## Prohibited Actions

### Architecture Violations

**PROHIBITED**: Creating components that directly call SkySpark APIs  
**PROHIBITED**: Mixing server-side and client-side data fetching patterns  
**PROHIBITED**: Using localStorage for critical application state  
**PROHIBITED**: Implementing state management outside of Zustand store  
**PROHIBITED**: Creating non-TypeScript files in the components directory

### Performance Anti-Patterns

**PROHIBITED**: Rendering large lists without virtualization  
**PROHIBITED**: Performing Jaccard similarity calculations in render functions  
**PROHIBITED**: Fetching all points data without pagination  
**PROHIBITED**: Creating new objects in render function dependencies

### UI/UX Violations

**PROHIBITED**: Using hardcoded colors instead of Tailwind tokens  
**PROHIBITED**: Creating non-responsive layouts  
**PROHIBITED**: Implementing interactions without keyboard navigation  
**PROHIBITED**: Missing loading states for async operations

### TypeScript Standards

**PROHIBITED**: Using `any` type except for third-party library integrations  
**PROHIBITED**: Creating interfaces without proper documentation  
**PROHIBITED**: Exporting implementation details from component modules  
**PROHIBITED**: Missing return type annotations for functions

## Integration Requirements

### Existing Code Compatibility

**MUST** maintain compatibility with existing files:

*   Extend `lib/utils.ts` without breaking existing exports
*   Use existing utility functions in new components
*   Follow established patterns from `components/unassigned_points.ts`
*   Maintain consistency with existing TypeScript interfaces

### Development Environment Setup

**MUST** ensure development environment includes:

*   Node.js 18+ for Next.js 14 compatibility
*   pnpm for consistent dependency management
*   VS Code with TypeScript and Tailwind extensions
*   Git hooks for pre-commit linting and type checking

This comprehensive development guide ensures consistent implementation of the BACnet Point Grouping UI while maintaining high code quality and developer experience standards.