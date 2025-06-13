# System Patterns

## Architecture Patterns

### State Management Pattern

**Zustand Store with Structured Actions**

```typescript
// Pattern: Centralized state with typed actions
export const useGroupingStore = create<GroupingState & GroupingActions>((set, get) => ({
  // State properties
  points: [],
  equipmentInstances: [],
  
  // Actions that modify state with error handling
  loadPoints: (points) => {
    set({ isProcessing: true });
    try {
      const processed = processEquipmentGrouping(points);
      set({ ...processed, isProcessing: false });
      get().addConsoleMessage({
        level: 'success',
        message: `Processed ${points.length} points`
      });
    } catch (error) {
      set({ isProcessing: false });
      get().addConsoleMessage({
        level: 'error',
        message: `Error: ${error.message}`
      });
    }
  }
}));
```

**Benefits:**

*   Single source of truth with comprehensive error handling
*   TypeScript safety with clear action contracts
*   Real-time user feedback through console messages
*   Optimal performance with selective subscriptions

### SkySpark API Integration Pattern

**Hybrid Data Source with Intelligent Fallback**

```typescript
// Pattern: Primary source → Fallback → User notification
export async function GET() {
  try {
    const skysparkUrl = process.env.SKYSPARK_API_URL;
    const skysparkToken = process.env.SKYSPARK_API_TOKEN;

    if (!skysparkUrl || !skysparkToken) {
      return NextResponse.json({
        success: true,
        data: mockBACnetPoints,
        source: 'mock'
      });
    }

    const response = await fetch(`${skysparkUrl}/read?filter=point`, {
      headers: {
        'Authorization': `Bearer ${skysparkToken}`,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`SkySpark API error: ${response.status}`);
    }

    const skysparkData = await response.json();
    const transformedPoints = transformSkysparkData(skysparkData);

    return NextResponse.json({
      success: true,
      data: transformedPoints,
      source: 'skyspark'
    });

  } catch (error) {
    return NextResponse.json({
      success: true,
      data: mockBACnetPoints,
      source: 'mock_fallback',
      error: error.message
    });
  }
}
```

**Benefits:**

*   Seamless operation regardless of SkySpark availability
*   Clear user feedback about active data source
*   Environment-based configuration for different deployments
*   Robust error handling with timeout protection

### Data Transformation Pipeline Pattern

**SkySpark Grid to BACnet Point Conversion**

```typescript
// Pattern: Server-side transformation with vendor detection
function transformSkysparkData(skysparkData: any) {
  if (!skysparkData.rows || !Array.isArray(skysparkData.rows)) {
    console.warn('Invalid SkySpark data format');
    return mockBACnetPoints;
  }

  return skysparkData.rows.map((row: any, index: number) => {
    const id = row.id?.val || `point-${index}`;
    const dis = row.dis?.val || row.dis || `Point ${index + 1}`;
    const kind = normalizeKind(row.kind?.val || row.kind || 'Number');
    const unit = row.unit?.val || row.unit || null;
    
    // Extract vendor/model from real equipment names
    const vendor = extractVendorFromName(dis);
    const fileName = determineFileName(row.navName?.val || '', dis);

    return {
      id, dis, kind, unit, vendor,
      bacnetCur: row.bacnetCur?.val || id,
      equipRef: null,
      fileName,
      status: 'unassigned' as const
    };
  });
}
```

**Benefits:**

*   Handles real-world data inconsistencies
*   Preserves equipment vendor information
*   Generates realistic filenames for grouping
*   Provides debugging information for data quality issues

### Equipment Detection Pipeline Pattern

**Multi-Stage Processing with Confidence Scoring**

```typescript
// Pattern: Layered detection with real-world adaptations
export function processEquipmentGrouping(points: BACnetPoint[]) {
  const equipmentInstances: EquipmentInstance[] = [];
  const groups = groupPointsByEquipment(points);
  
  groups.forEach((groupPoints, key) => {
    const [fileName, typeId] = key.split('-');
    const equipmentName = fileName.replace(/\.(trio|txt)$/, '');
    
    const equipment: EquipmentInstance = {
      id: `${typeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: equipmentName,
      typeId,
      confidence: calculateConfidence(groupPoints, typeId),
      status: 'suggested',
      pointIds: groupPoints.map(p => p.id),
      fileName
    };
    
    equipmentInstances.push(equipment);
  });
  
  return { points: updatedPoints, equipmentTypes, equipmentInstances, stats };
}
```

**Benefits:**

*   Works with both SkySpark and mock data
*   Adapts to real-world equipment naming variations
*   Provides confidence scoring for user decision making
*   Extensible for new equipment types and vendors

## Code Patterns

### Real-time Stats Component Pattern

**Live Data Binding with Equipment Distribution**

```typescript
// Pattern: Component that reflects real-time store state
export function TopStatsPanel() {
  const { points, equipmentInstances, equipmentTypes } = useGroupingStore();

  // Calculate real-time metrics
  const equipmentTypeDistribution = equipmentTypes.map(type => {
    const instancesOfType = equipmentInstances.filter(eq => eq.typeId === type.id);
    return {
      id: type.id,
      name: type.name,
      count: instancesOfType.length,
      points: instancesOfType.reduce((sum, eq) => sum + eq.pointIds.length, 0)
    };
  }).filter(type => type.count > 0);

  const totalPoints = points.length;
  const assignedPoints = points.filter(p => p.equipRef).length;
  const completionPercentage = totalPoints > 0 
    ? Math.round((assignedPoints / totalPoints) * 100) 
    : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      <MetricCard value={totalPoints} label="Total Points" color="blue" />
      <MetricCard value={assignedPoints} label="Assigned" color="green" />
      <MetricCard value={`${completionPercentage}%`} label="Complete" color="purple" />
      <MetricCard value={equipmentInstances.length} label="Equipment Groups" color="orange" />
    </div>
  );
}
```

**Benefits:**

*   Real-time updates without manual refresh
*   Visual equipment type breakdown
*   Responsive grid layout for all screen sizes
*   Clear metric visualization with color coding

### API Client Pattern with Source Detection

**Data Loading with User Feedback**

```typescript
// Pattern: API integration with source transparency
const loadDataFromAPI = async () => {
  try {
    const response = await fetch('/api/points');
    const result = await response.json();
    
    if (result.success) {
      // Provide clear feedback about data source
      const sourceMessage = result.source === 'skyspark' 
        ? `Connected to SkySpark API - loaded ${result.data.length} points`
        : result.source === 'mock_fallback'
        ? `SkySpark connection failed (${result.error}), using mock data`
        : `Using mock data - ${result.data.length} points loaded`;
        
      // Delay to ensure store is ready for console messages
      setTimeout(() => {
        useGroupingStore.getState().addConsoleMessage({
          level: result.source === 'skyspark' ? 'success' : 'warning',
          message: sourceMessage
        });
      }, 100);
      
      loadPoints(result.data);
    }
  } catch (error) {
    console.error('Error loading data:', error);
    loadPoints(mockBACnetPoints);
  }
};
```

**Benefits:**

*   Transparent data source communication
*   Graceful error handling with fallback
*   User feedback through console messaging system
*   Consistent API response handling

### Vendor Detection Pattern

**Real-world Equipment Recognition**

```typescript
// Pattern: Pattern matching for equipment vendor identification
function extractVendorFromName(name: string): string | undefined {
  const vendorPatterns = [
    { pattern: /johnson|jci|vma/i, vendor: 'Johnson Controls' },
    { pattern: /siemens|pol/i, vendor: 'Siemens' },
    { pattern: /trane|tr\d/i, vendor: 'Trane' },
    { pattern: /honeywell/i, vendor: 'Honeywell' },
    { pattern: /schneider/i, vendor: 'Schneider Electric' }
  ];

  for (const { pattern, vendor } of vendorPatterns) {
    if (pattern.test(name)) {
      return vendor;
    }
  }
  return undefined;
}

// Pattern: Equipment filename generation from real data
function determineFileName(navName: string, dis: string): string {
  const name = navName || dis;
  
  const equipPatterns = [
    /AHU[-_]?\d+/i,
    /VAV[-_]?\d+/i,
    /TU[-_]?\d+/i,
    /FC[-_]?\d+/i,
    /ERV[-_]?\d+/i
  ];

  for (const pattern of equipPatterns) {
    const match = name.match(pattern);
    if (match) {
      return `${match[0]}.trio.txt`;
    }
  }
  
  return 'misc_points.trio';
}
```

**Benefits:**

*   Handles real-world equipment naming variations
*   Extensible for new vendor patterns
*   Provides realistic equipment grouping
*   Works with both structured and unstructured data

### Component Composition Pattern

**Compound Components with TypeScript Safety**

```typescript
// Pattern: Main component with sub-components as static properties
export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

Card.Header = function CardHeader({ children }: CardHeaderProps) {
  return <div className="px-6 py-4 border-b border-gray-200">{children}</div>;
};

Card.Content = function CardContent({ children }: CardContentProps) {
  return <div className="px-6 py-4">{children}</div>;
};
```

**Usage:**

```
<Card>
  <Card.Header>
    <Card.Title>Equipment Groups</Card.Title>
  </Card.Header>
  <Card.Content>
    {/* Real-time equipment data display */}
  </Card.Content>
</Card>
```

**Benefits:**

*   Intuitive API matching domain semantics
*   Prevents component misuse
*   Consistent styling across application
*   TypeScript ensures correct composition

## Documentation Patterns

### API Integration Documentation

**Environment-based Configuration with Examples**

```typescript
/**
 * SkySpark API integration with intelligent fallback
 * 
 * Environment Variables:
 * - SKYSPARK_API_URL: SkySpark server URL (e.g., http://localhost:8081/api)
 * - SKYSPARK_API_TOKEN: Bearer token for authentication
 * 
 * Data Flow:
 * 1. Attempt SkySpark connection with bearer auth
 * 2. Transform SkySpark grid format to BACnet points
 * 3. Fall back to mock data if SkySpark unavailable
 * 4. Provide user feedback about active data source
 * 
 * @example
 * ```typescript
 * // API automatically selects best data source
 * const response = await fetch('/api/points');
 * const result = await response.json();
 * 
 * console.log('Data source:', result.source); // 'skyspark' | 'mock' | 'mock_fallback'
 * console.log('Points loaded:', result.data.length);
 * ```
 */
```

### Real-time Component Documentation

**Live Data Integration Patterns**

```typescript
/**
 * TopStatsPanel - Real-time metrics display
 * 
 * Automatically updates when underlying data changes through Zustand store.
 * Displays equipment type distribution with color-coded indicators.
 * 
 * Features:
 * - Responsive grid layout (2-col mobile, 4-col desktop)
 * - Equipment type breakdown with instance counts
 * - Real-time completion percentage calculation
 * - Visual color coding for different equipment types
 * 
 * @example
 * ```tsx
 * // Component automatically reflects current data state
 * <TopStatsPanel />
 * ```
 */
```

## Testing Patterns

### SkySpark Integration Testing

**API Integration with Mock Fallback Testing**

```typescript
describe('SkySpark API Integration', () => {
  it('should connect to SkySpark when available', async () => {
    // Mock successful SkySpark response
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        rows: [
          { id: { val: 'test-1' }, dis: { val: 'Test Point' }, kind: { val: 'Number' } }
        ]
      })
    });

    const response = await fetch('/api/points');
    const result = await response.json();

    expect(result.source).toBe('skyspark');
    expect(result.data).toHaveLength(1);
  });

  it('should fallback to mock data when SkySpark unavailable', async () => {
    // Mock SkySpark failure
    global.fetch = jest.fn().mockRejectedValue(new Error('Connection failed'));

    const response = await fetch('/api/points');
    const result = await response.json();

    expect(result.source).toBe('mock_fallback');
    expect(result.error).toBeDefined();
  });
});
```

### Real-time Component Testing

**Live Data Update Verification**

```typescript
describe('TopStatsPanel', () => {
  it('should update metrics when points are assigned', () => {
    const { result } = renderHook(() => useGroupingStore());
    
    // Initial state
    expect(result.current.stats.assignedPoints).toBe(0);
    
    // Assign points to equipment
    act(() => {
      result.current.assignPoints(['point-1', 'point-2'], 'equipment-1');
    });
    
    // Verify stats updated
    expect(result.current.stats.assignedPoints).toBe(2);
  });
});
```

## Error Handling Patterns

### Comprehensive API Error Management

**Network Resilience with User Feedback**

```typescript
// Pattern: Multi-layer error handling with user communication
const handleApiOperation = async (operation: string) => {
  try {
    const result = await apiCall();
    
    // Success feedback
    addConsoleMessage({
      level: 'success',
      message: `${operation} completed successfully`
    });
    
    return result;
  } catch (error) {
    // Network or API errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      addConsoleMessage({
        level: 'error',
        message: `Network error during ${operation}: Check SkySpark server connection`
      });
    } else {
      addConsoleMessage({
        level: 'error',
        message: `${operation} failed: ${error.message}`
      });
    }
    
    // Fallback to safe state
    return null;
  }
};
```

**Benefits:**

*   Specific error messages for different failure types
*   User-friendly feedback through console system
*   Graceful degradation to safe application state
*   Network-aware error handling for API integrations