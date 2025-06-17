# Building Automation Point Grouping System

A Next.js application that transforms unstructured BACnet point data from SkySpark APIs into organized equipment insights through intelligent grouping and human-in-the-loop validation.

## 🏗️ Architecture Overview

This system processes BACnet point data using a three-layer approach:

1.  **Data Layer**: Raw BACnet points are normalized and auto-grouped using vendor/model patterns and point naming conventions
2.  **Processing Layer**: Equipment instances are detected using Jaccard similarity, filename patterns, and vendor/model matching
3.  **UI Layer**: Interactive interface for reviewing, confirming, and manually adjusting equipment groupings

**Key Technologies**: Next.js 14, TypeScript, Zustand, SWR, Tailwind CSS, Headless UI

## 🚀 Quick Start

### Prerequisites

*   Node.js 18+ and pnpm
*   Basic understanding of BACnet and building automation systems

### Installation

```
# Clone and install dependencies
git clone <repository-url>
cd building-automation-point-grouping
pnpm install

# Start development server
pnpm dev

# Visit http://localhost:3000
```

### Environment Variables

Create `.env.local` (optional for development):

```
# SkySpark API Configuration (for production)
SKYSPARK_API_URL=https://your-skyspark-instance.com/api
SKYSPARK_API_TOKEN=your-bearer-token

# Database Configuration (for production)
DATABASE_URL=postgresql://user:password@localhost:5432/building_automation

# Optional: Enable debug logging
DEBUG_EQUIPMENT_GROUPING=true
```

## 📋 Core Features

### 🤖 Automatic Equipment Detection

*   **Filename Pattern Matching**: Detects equipment types from file names (AHU-1.trio → Air Handling Unit)
*   **Vendor/Model Recognition**: Groups points by manufacturer patterns (Johnson Controls VMA1400)
*   **Point Similarity Analysis**: Uses Jaccard index to identify equipment with similar point configurations
*   **Confidence Scoring**: Provides reliability metrics for each auto-detected group

### 🎯 Human-in-the-Loop Workflow

*   **Suggested Groups Panel**: Collapsible cards showing auto-detected equipment with confidence scores
*   **Unassigned Points Panel**: Search, filter, and bulk assign remaining points
*   **Point Actions**: ✅ Confirm, ⚠️ Flag, 🗑️ Reject, ➕ Assign to equipment
*   **Validation & Publishing**: Integrity checks before finalizing configuration

### 📊 Real-time Analytics

*   **Processing Statistics**: Total points, equipment groups, assignment rates
*   **Equipment Distribution**: Visual breakdown by type (AHU, VAV, etc.)
*   **Console Logging**: System messages and validation warnings
*   **Completion Tracking**: Progress indicators and completion percentages

## 🔧 API Integration

### SkySpark Integration

The system connects to SkySpark via REST API to fetch normalized BACnet data:

```typescript
// Example API call to fetch points
GET /api/points?projectId=your-project-id

// Response format
{
  "success": true,
  "data": {
    "points": [...],
    "equipmentTypes": [...],
    "equipmentInstances": [...],
    "stats": {...}
  }
}
```

### Draft Management

All changes are auto-saved as drafts with validation:

```typescript
// Save current grouping state
POST /api/save-draft
{
  "points": [...],
  "equipmentInstances": [...],
  "action": { "type": "confirm", "pointId": "..." }
}

// Validate and publish final configuration
POST /api/finalize
{
  "draftId": "draft-uuid",
  "validateOnly": false
}
```

## 🎨 UI Components

### Equipment Grouping Interface

*   **SuggestedGroups**: Hierarchical view of auto-detected equipment types and instances
*   **UnassignedPoints**: Searchable table with bulk selection and filtering
*   **StatsPanel**: Real-time metrics and completion tracking
*   **ConsolePanel**: System logs with filterable message levels

### Interactive Dialogs

*   **FinalizeDialog**: Validation summary and publishing workflow
*   **CreateEquipmentDialog**: Manual equipment instance creation
*   **AssignPointsDialog**: Bulk point assignment to existing equipment
*   **ConfirmDialog**: Reusable confirmation prompts

## 🧠 Equipment Detection Logic

### Point Pattern Recognition

The system uses multiple strategies to identify equipment:

```typescript
// 1. Filename-based detection
const equipmentPatterns = {
  'ahu': /AHU|Air.*Hand|ERV/i,
  'vav': /VAV|Variable.*Air/i,
  'terminal-unit': /TU|Terminal.*Unit/i,
};

// 2. Vendor/model grouping
const vendorPatterns = [
  {
    vendor: 'Johnson Controls',
    modelPatterns: [/VMA\d+/i],
    equipmentTypes: ['ahu', 'control-valve'],
  },
];

// 3. Point similarity analysis using Jaccard index
function calculateJaccardSimilarity(pointsA: string[], pointsB: string[]): number {
  const setA = new Set(pointsA);
  const setB = new Set(pointsB);
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}
```

### Confidence Scoring

Equipment instances receive confidence scores based on:

*   **Pattern Match Quality**: How well the filename/points match expected patterns
*   **Point Count Appropriateness**: Whether point count fits equipment type expectations
*   **Vendor/Model Consistency**: Alignment with known manufacturer patterns

## 📝 Extending Point Mapping Rules

### Adding New Equipment Types

Edit `/lib/mock-data.ts` to add new equipment patterns:

```typescript
export const equipmentTypes: EquipmentType[] = [
  // Add new equipment type
  {
    id: 'heat-pump',
    name: 'Heat Pump Units',
    pattern: /HP|Heat.*Pump|heat.*pump/i,
    confidence: 0.85,
    pointPatterns: ['temp', 'pressure', 'mode', 'defrost'],
    minPoints: 3,
    maxPoints: 50,
  },
];
```

### Custom Vendor Recognition

Add new vendor patterns for auto-grouping:

```typescript
export const vendorModelPatterns = [
  {
    vendor: 'Trane',
    modelPatterns: [/TR\d+/i, /Trane\d+/i],
    equipmentTypes: ['ahu', 'heat-pump'],
  },
];
```

### Point Name Normalization

Customize point naming conventions in `/lib/equipment-grouping.ts`:

```typescript
function normalizePointName(pointName: string): string {
  return pointName
    .replace(/[-_]/g, ' ')           // Replace separators
    .replace(/\b(SP|STPT)\b/gi, 'Setpoint')  // Expand abbreviations
    .replace(/\b(TEMP|TMP)\b/gi, 'Temperature')
    .trim();
}
```

## 🧪 Testing

### Running Tests

```
# Run all tests
pnpm test

# Run with UI
pnpm test:ui

# Run specific test file
pnpm test equipment-grouping.test.ts
```

### Test Structure

```typescript
// Example test for equipment grouping logic
describe('Equipment Grouping', () => {
  it('should detect AHU from filename pattern', () => {
    const points = mockBACnetPoints.filter(p => 
      p.fileName === 'AHU-1_ERV-1.trio.txt'
    );
    const result = processEquipmentGrouping(points);
    
    expect(result.equipmentInstances).toHaveLength(1);
    expect(result.equipmentInstances[0].typeId).toBe('ahu');
  });
});
```

## 🚀 Deployment

### Production Build

```
# Build for production
pnpm build

# Start production server
pnpm start
```

### Environment Setup

For production deployment, configure:

1.  **SkySpark API**: Set `SKYSPARK_API_URL` and `SKYSPARK_API_TOKEN`
2.  **Database**: Configure `DATABASE_URL` for draft persistence
3.  **Auth**: Integrate with your authentication provider
4.  **Monitoring**: Add error tracking (e.g., Sentry, DataDog)

### Docker Deployment

```
FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

## 🤝 Contributing

### Development Workflow

1.  **Feature Development**: Create feature branch from `main`
2.  **Code Quality**: Run `pnpm lint` and `pnpm test`
3.  **Component Testing**: Use Storybook for UI component development
4.  **Integration Testing**: Test with mock SkySpark data

### Code Style

*   **TypeScript**: Strict mode enabled with comprehensive type checking
*   **ESLint**: Standard Next.js configuration with custom rules
*   **Prettier**: Consistent code formatting
*   **Tailwind**: Utility-first CSS with custom design system

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

*   **Documentation**: Check this README and inline code comments
*   **Issues**: Create GitHub issues for bugs and feature requests
*   **Discussions**: Use GitHub Discussions for questions and ideas

## 🔮 Roadmap

*   **Advanced ML Grouping**: TensorFlow.js for pattern recognition
*   **3D Visualization**: Three.js equipment hierarchy viewer
*   **Real-time Sync**: WebSocket updates from SkySpark
*   **Mobile App**: React Native companion app
*   **API Gateway**: GraphQL API for external integrations