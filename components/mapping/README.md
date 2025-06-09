# BACnet Equipment & Point Mapping Interface

## Overview

This document outlines the comprehensive UI/UX design for an intelligent BACnet equipment and point mapping interface. The system transforms raw BACnet point data into structured equipment definitions through a three-phase progressive workflow that emphasizes **confidence-driven UI states** and **progressive task completion**.

## Design Philosophy

### Core Principles

**Progressive Task Completion**: The interface becomes simpler and less cluttered as users successfully confirm mappings, maintaining focus on remaining ambiguities.

**Confidence-Driven Visual Hierarchy**: High-confidence suggestions are visually distinct (green) and can be bulk-confirmed, while low-confidence items demand individual attention.

**Context-Aware Bulk Operations**: The system intelligently suggests bulk actions based on patterns, reducing repetitive work while maintaining accuracy.

**Immediate Visual Feedback**: Every action provides instant visual confirmation, building user confidence in the system's reliability.

## Three-Phase Workflow Architecture

### Phase 1: Equipment Instance Validation

**Goal**: Validate backend-proposed equipment instances grouped from raw BACnet points.

**Layout**: Two-panel interface with confidence-based grouping

*   **Left Panel**: Proposed instances grouped by confidence (High/Medium/Low)
*   **Right Panel**: Raw point details for selected instance

**Key Features**:

*   **Bulk Confirmation**: "Confirm All High-Confidence" for rapid processing
*   **Progressive Disclosure**: Confirmed instances fade/collapse to reduce clutter
*   **Individual Actions**: Confirm, edit name, merge instances, split points
*   **Visual Confidence Indicators**: Green (high), yellow (medium), red (low/needs review)

### Phase 2: Equipment Type Definition

**Goal**: Group confirmed instances into reusable equipment types based on point similarity.

**Layout**: Similar to Phase 1 with type-focused operations

*   **Left Panel**: Confirmed instances with auto-suggested type groupings
*   **Right Panel**: Type details and instance membership

**Key Features**:

*   **Automatic Type Suggestions**: Jaccard similarity analysis proposes equipment types
*   **Equipment Class Selection**: Choose from predefined templates (VAV-Reheat, AHU-MultiZone)
*   **Custom Type Creation**: Project-specific naming and customization
*   **Type Validation**: Ensure instance consistency before proceeding

### Phase 3: Point Mapping Matrix (Primary Component)

**Goal**: Map raw points to standardized equipment point definitions with bulk efficiency.

**Layout**: Sophisticated matrix interface with bulk mapping tools

*   **Rows**: Standard point definitions from equipment class template
*   **Columns**: Equipment instances within selected type
*   **Cells**: Mapping status with visual state indicators

**Cell States**:

*   **Auto-mapped (Green)**: High confidence automatic mapping with validation option
*   **Unmapped (Yellow)**: Requires user attention with suggested mappings
*   **Missing (Red)**: Required point not found in instance
*   **Manual (Blue)**: User-confirmed mapping with confidence score

**Bulk Mapping Workflow**:

1.  **Row Selection**: Click ⚡ icon on standard point row
2.  **Rule Generation**: System suggests pattern-based mapping rule
3.  **Rule Refinement**: User can modify suggested rule with preview
4.  **Bulk Application**: Apply rule across all instances in row
5.  **Individual Override**: Fine-tune specific mappings as needed

## Component Architecture

### State Management Strategy

Uses `useReducer` pattern with TypeScript for each phase:

```typescript
// Phase-specific state interfaces
interface Phase1State {
  proposedInstances: ProposedInstance[];
  confirmedInstances: ConfirmedInstance[];
  selectedInstanceId?: string;
  bulkSelections: Set<string>;
  filterBy: 'all' | 'high' | 'medium' | 'low';
}

// Action-based state updates
type Phase1Action = 
  | { type: 'CONFIRM_INSTANCE'; instanceId: string }
  | { type: 'BULK_CONFIRM'; instanceIds: string[] }
  | { type: 'MERGE_INSTANCES'; instanceIds: string[] }
  // ... additional actions
```

### Data Flow Architecture

```typescript
// Raw backend data structure
interface ProposedInstance {
  id: string;
  name: string; // e.g., "VAV-101"
  confidence: number; // 0-1 scale
  confidenceLevel: 'high' | 'medium' | 'low';
  rawPoints: RawPoint[];
  derivedFrom: 'pattern' | 'grouping' | 'manual';
  metadata: {
    commonIdentifier?: string;
    sourceCount?: number;
    similarityScore?: number;
  };
}

// Mapping matrix cell state
interface MappingCell {
  instanceId: string;
  standardPointId: string;
  mappedPoint?: MappedPoint;
  status: 'auto-mapped' | 'unmapped' | 'missing' | 'manual';
  availableRawPoints: RawPoint[];
}
```

## Implementation Details

### Phase 3: Point Mapping Matrix (Detailed)

The most complex component features:

**Matrix Rendering**:

*   Sticky headers for navigation during scrolling
*   Responsive cell sizing with minimum widths
*   Color-coded status indicators for immediate visual feedback
*   Confidence percentages for validation transparency

**Bulk Mapping Engine**:

*   Pattern-based rule generation (e.g., `contains "ZN-T" or contains "ZONE_TEMP"`)
*   Real-time preview of rule matches across instances
*   Regex-based rule evaluation with error handling
*   Undo/redo capability for bulk operations

**Individual Mapping**:

*   Dropdown selection of available raw points per cell
*   Smart filtering based on point characteristics (unit, kind, name patterns)
*   Confidence scoring for manual mappings
*   Validation feedback for mismatched units or types

### User Experience Optimizations

**Progressive Enhancement**:

*   High-confidence mappings pre-selected but editable
*   Completed rows visually minimized to maintain focus
*   Success animations for bulk confirmations
*   Clear progress indicators throughout workflow

**Error Prevention**:

*   Type validation before allowing progression between phases
*   Required point highlighting for missing mappings
*   Confirmation dialogs for destructive actions (merge, split)
*   Auto-save functionality with manual save options

**Accessibility Features**:

*   Full keyboard navigation support
*   Screen reader announcements for state changes
*   High contrast mode compatibility
*   Focus management during modal interactions

## Sample Data Structure

```
{
  "proposedInstances": [
    {
      "id": "proposed_001",
      "name": "VAV-101",
      "confidence": 0.95,
      "confidenceLevel": "high",
      "rawPoints": [
        {
          "id": "raw_001",
          "bacnetDis": "VAV-101.ZN-T",
          "bacnetCur": "VAV-101_Zone_Temp",
          "unit": "°F",
          "kind": "Number",
          "bacnetConnRef": "VAV-101"
        }
      ],
      "derivedFrom": "pattern",
      "metadata": {
        "commonIdentifier": "VAV-101",
        "sourceCount": 4,
        "similarityScore": 0.92
      }
    }
  ]
}
```

## Integration Requirements

### Backend Dependencies

*   Equipment detection algorithm with confidence scoring
*   Point similarity analysis using Jaccard index
*   Pattern matching for vendor-specific naming conventions
*   Real-time validation and integrity checking

### API Endpoints

*   `GET /api/proposed-instances` - Initial instance proposals
*   `POST /api/confirm-instances` - Instance validation results
*   `GET /api/equipment-classes` - Standard equipment templates
*   `POST /api/save-mappings` - Final mapping persistence
*   `POST /api/validate-mappings` - Pre-submission validation

### Performance Considerations

*   Lazy loading for large equipment datasets
*   Virtualized rendering for matrix with 100+ instances
*   Debounced search and filtering operations
*   Optimistic UI updates with error rollback
*   Background auto-save with conflict resolution

## Testing Strategy

### Component Testing

*   Individual phase component isolation
*   State reducer logic validation
*   User interaction simulation (clicks, drags, selections)
*   Error boundary testing for malformed data

### Integration Testing

*   Cross-phase data flow validation
*   API integration with mock backends
*   Performance testing with large datasets
*   Accessibility compliance verification

### User Acceptance Testing

*   Task completion time measurement
*   Error rate analysis for bulk operations
*   User satisfaction surveys
*   Comparison with existing manual processes

## Deployment & Maintenance

### Development Environment

*   TypeScript strict mode for type safety
*   ESLint configuration for code quality
*   Storybook for component documentation
*   Jest + React Testing Library for unit tests

### Production Readiness

*   Error tracking with Sentry or similar
*   Performance monitoring with Web Vitals
*   User analytics for workflow optimization
*   A/B testing framework for UX improvements

This comprehensive design transforms the complex task of BACnet point mapping into an intuitive, efficient workflow that scales from small installations to large commercial buildings while maintaining accuracy and user confidence throughout the process.