# Mapping Equipment UI - Development Guidelines

This document provides AI-specific development standards for the Mapping Equipment UI project. All AI agents MUST adhere to these rules to ensure consistency, quality, and maintainability.

## 1\. Project Overview

*   **Purpose**: Interactive web UI for grouping raw BACnet point data from SkySpark APIs into equipment hierarchies.
*   **Technology Stack**: Next.js 14 (App Router), TypeScript, React 18, Zustand, SWR, Tailwind CSS, Framer Motion, Vitest.
*   **Core Functions**: Data ingestion from SkySpark, automatic equipment detection, human-in-the-loop validation, equipment templating, and draft management.

## 2\. Architecture Standards

### 2.1. Project Structure

The project follows the Next.js 14 App Router structure. **MUST** adhere to this layout:

```
mapping-equipment-ui/
├── app/                        # Next.js App Router pages and APIs
│   ├── layout.tsx              # Root application layout
│   ├── page.tsx                # Main UI page
│   └── api/                    # API routes
│       ├── points/route.ts     # Fetches and processes SkySpark data
│       ├── saveDraft/route.ts  # Persists draft state
│       └── finalize/route.ts   # Validates and publishes final configuration
├── components/                 # React components
│   ├── ui/                     # Generic, reusable UI components (e.g., Card, Button)
│   ├── MainPanel.tsx           # Core panel for displaying equipment
│   ├── LeftRail.tsx            # Left sidebar component
│   ├── RightRail.tsx           # Right sidebar component
│   └── ...                     # Other feature-specific components
├── lib/                        # Core logic, types, and state
│   ├── store.ts                # Zustand global state management
│   ├── types.ts                # Core TypeScript interfaces
│   ├── utils.ts                # Equipment grouping algorithms and helpers
│   ├── skyspark-api.ts         # SkySpark API interaction logic
│   └── mock-data.ts            # Mock data for development
├── __tests__/                  # Vitest test files
└── ...                         # Root configuration files
```

### 2.2. TypeScript Configuration

**MUST** use the strict TypeScript configuration defined in `tsconfig.json`. Note the path aliases:

```
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 2.3. Key Dependencies

**MUST** use the following dependencies. Do not introduce new libraries without a strong justification.

*   `next`, `react`, `react-dom`
*   `typescript`
*   `zustand` (state management)
*   `swr` (data fetching)
*   `@heroicons/react` (icons)
*   `framer-motion` (animations)
*   `tailwindcss`
*   `vitest`, `@testing-library/react` (testing)

## 3\. Data Model & State Management

### 3.1. Core TypeScript Interfaces

All core data structures are defined in `lib/types.ts`. **MUST** use and extend these interfaces as needed.

```typescript
// lib/types.ts

// Represents a single BACnet point from SkySpark
export interface BACnetPoint {
  id: string;
  dis: string;
  // ... other properties
  status?: 'unassigned' | 'suggested' | 'confirmed' | 'flagged';
  equipRef?: string | null;
}

// Represents a type of equipment (e.g., AHU, VAV)
export interface EquipmentType {
  id: string;
  name: string;
  // ... other properties
}

// Represents a specific instance of an equipment type
export interface EquipmentInstance {
  id: string;
  name: string;
  typeId: string;
  confidence: number;
  status: 'suggested' | 'confirmed' | 'needs-review';
  pointIds: string[];
}

// Represents a reusable equipment template
export interface EquipmentTemplate {
  id:string;
  name: string;
  pointSignature: PointSignature[];
  // ... other properties
}
```

### 3.2. State Management with Zustand

Global state **MUST** be managed in `lib/store.ts` using Zustand.

*   **State Structure**: The `GroupingState` interface in `lib/types.ts` defines the store's shape.
*   **Actions**: All state modifications **MUST** be implemented as actions within the `create` function in `lib/store.ts`. Components should not modify state directly.
*   **Selectors**: Use selectors within components to subscribe to specific state slices, preventing unnecessary re-renders.

```typescript
// lib/store.ts
export const useGroupingStore = create<GroupingState & GroupingActions>((set, get) => ({
  // Initial state properties...
  points: [],
  equipmentInstances: [],
  templates: [],
  
  // Actions...
  loadPoints: (points) => { /* ... */ },
  confirmEquipment: (equipmentId) => { /* ... */ },
  createTemplate: (equipmentId) => { /* ... */ },
  saveDraft: async () => { /* ... */ },
  
  // MUST include a check for completion status
  checkCompletion: () => {
    const { equipmentInstances } = get();
    const allConfirmed = equipmentInstances.every(eq => eq.status === 'confirmed');
    if (allConfirmed && equipmentInstances.length > 0) {
      set({ showCelebration: true, isComplete: true });
    }
  }
}));
```

## 4\. Component Architecture

### 4.1. Component Design

*   **Compound Components**: **MUST** use the compound component pattern for complex UI elements like `Card`. This enhances readability and API design.
*   **Client Components**: All interactive components **MUST** use the `'use client';` directive.
*   **Props**: Define props interfaces clearly for every component.

## 5\. API Integration

### 5.1. SkySpark API

*   The primary data endpoint is `app/api/points/route.ts`.
*   This endpoint is responsible for connecting to the SkySpark API, fetching raw data, parsing the Zinc format, transforming it into the `BACnetPoint` structure, and handling fallback to mock data.
*   **DO NOT** add business logic to this file. Transformation logic should be in `lib/skyspark-parser.ts` or similar.

### 5.2. Data Fetching in UI

*   Data fetching in the UI is initiated in `app/page.tsx`'s `useEffect` hook.
*   It calls the `/api/points` endpoint and loads the result into the Zustand store via the `loadPoints` action.
*   **DO NOT** call `fetch` from child components. All data should flow from the central store.

## 6\. Core Business Logic

### 6.1. Equipment Grouping

*   The core grouping algorithms are located in `lib/utils.ts`.
*   `**processEquipmentGrouping**`: This is the main function that orchestrates the grouping process.
*   **Detection Strategies**: The logic uses filename patterns (`detectEquipmentFromFilename`) and Jaccard similarity (`calculateJaccardSimilarity`) to group points.
*   **MUST** update the `equipmentTypes` array in `lib/utils.ts` to add or modify equipment detection rules.

### 6.2. Equipment Templating

*   Users can create an `EquipmentTemplate` from a confirmed `EquipmentInstance`.
*   The `createTemplate` action in `lib/store.ts` handles this.
*   Templates are used to find and configure similar, unconfirmed equipment instances.

## 7\. UI/UX Standards

### 7.1. Styling with Tailwind CSS

*   **MUST** use Tailwind CSS utility classes for all styling.
*   **DO NOT** write custom CSS in `.css` files unless absolutely necessary.
*   **Color System**: Colors for equipment types are generated dynamically. The `tailwind.config.js` `safelist` **MUST** be updated if new colors are added to ensure they are not purged during the build process.

### 7.2. Animation & User Feedback

*   Animations **MUST** be implemented using `framer-motion`.
*   The `SuccessCelebration` component (`components/SuccessCelebration.tsx`) is a key feedback mechanism. It is triggered when `showCelebration` is set to `true` in the Zustand store.
*   **MUST** call the `checkCompletion` action after any state change that could result in all equipment being confirmed (e.g., `confirmEquipment`, `assignPoints`).

## 8\. Development Workflow

### 8.1. Adding a New Equipment Type

1.  **Update** `**lib/utils.ts**`: Add a new `EquipmentType` definition to the `equipmentTypes` array, including its `id`, `name`, `pattern` (RegExp), and point heuristics.
2.  **Update** `**tailwind.config.js**`: If you introduce a new color for the equipment type, add the corresponding `border-l-` and `bg-` classes to the `safelist`.
3.  **Test**: Verify that the new equipment type is correctly detected and displayed.

### 8.2. Modifying State

1.  **Update** `**lib/types.ts**`: Modify the `GroupingState` or related interfaces.
2.  **Update** `**lib/store.ts**`: Implement a new action or update an existing one to handle the new state logic.
3.  **Update Components**: Modify any components that consume or interact with the changed state.

## 9\. Prohibited Actions

*   **PROHIBITED**: Modifying state directly from a component. **MUST** use a Zustand action.
*   **PROHIBITED**: Fetching data from any component other than the main page loader. Data must flow through the store.
*   **PROHIBITED**: Using hardcoded colors or styles. **MUST** use Tailwind CSS utility classes and theme values.
*   **PROHIBITED**: Introducing new global state outside of `lib/store.ts`.
*   **PROHIBITED**: Writing business logic (e.g., grouping algorithms) inside components. This logic belongs in `lib/`.
*   **PROHIBITED**: Using the `any` type. Define explicit types in `lib/types.ts`.

```
<Card>
  <Card.Header>
    <Card.Title>My Equipment</Card.Title>
  </Card.Header>
  <Card.Content>Details...</Card.Content>
</Card>
```