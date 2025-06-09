# Decision Log

## Decision 1: State Management Architecture
- **Date:** June 8, 2025
- **Context:** Need centralized state management for complex equipment grouping workflow with real-time updates and draft persistence
- **Decision:** Use Zustand for global state management instead of React Context or Redux
- **Alternatives Considered:** 
  - React Context + useReducer (simpler but less performant for frequent updates)
  - Redux Toolkit (more boilerplate, overkill for this application size)
  - SWR + local state (good for server state but insufficient for complex UI state)
- **Consequences:** 
  - ✅ Simple, TypeScript-friendly API with minimal boilerplate
  - ✅ Excellent performance with selective subscriptions
  - ✅ Easy integration with async operations (API calls, auto-save)
  - ⚠️ Less ecosystem tooling compared to Redux

## Decision 2: Equipment Detection Algorithm Strategy
- **Date:** June 8, 2025  
- **Context:** Need reliable method to automatically group BACnet points into equipment instances from unstructured data
- **Decision:** Multi-layered approach: filename pattern matching → vendor/model recognition → Jaccard similarity analysis
- **Alternatives Considered:**
  - Pure ML approach (requires training data we don't have)
  - Manual rules only (not scalable across different vendors)
  - String similarity only (insufficient for complex equipment types)
- **Consequences:**
  - ✅ High accuracy on structured filenames (AHU-1.trio → Air Handling Unit)
  - ✅ Vendor-specific pattern recognition (Johnson Controls VMA1400)
  - ✅ Flexible similarity matching for point configurations
  - ⚠️ May require tuning confidence thresholds for different datasets

## Decision 3: UI Component Architecture
- **Date:** June 8, 2025
- **Context:** Need reusable, consistent UI components that match building automation industry patterns
- **Decision:** Custom component library with Tailwind CSS using compound component pattern (Card.Header, Card.Content)
- **Alternatives Considered:**
  - Third-party UI library (Material-UI, Chakra) - would require customization for domain-specific needs
  - Headless UI only - would require building all visual components from scratch
  - CSS modules instead of Tailwind - less utility-first approach
- **Consequences:**
  - ✅ Full control over styling and behavior
  - ✅ Consistent design system with domain-specific patterns
  - ✅ Easy to extend and customize for specific requirements
  - ⚠️ More initial development time than using pre-built library

## Decision 4: API Design Pattern
- **Date:** June 8, 2025
- **Context:** Need API structure that supports draft workflow, validation, and eventual SkySpark integration
- **Decision:** RESTful API with dedicated endpoints for each workflow step (/api/points, /api/saveDraft, /api/finalize)
- **Alternatives Considered:**
  - Single endpoint with action parameter - less RESTful, harder to cache
  - GraphQL - overkill for this use case, adds complexity
  - Direct SkySpark integration - would couple frontend tightly to SkySpark specifics
- **Consequences:**
  - ✅ Clear separation of concerns for each workflow step
  - ✅ Easy to mock for development and testing
  - ✅ Simple to replace with real SkySpark integration later
  - ✅ Follows REST conventions for caching and HTTP semantics

## Decision 5: PostCSS Configuration Fix
- **Date:** June 8, 2025
- **Context:** Tailwind CSS styles not being applied due to incorrect PostCSS configuration
- **Decision:** Fix PostCSS config to properly declare tailwindcss and autoprefixer plugins
- **Problem:** PostCSS config file contained Tailwind configuration instead of PostCSS plugin configuration
- **Solution:** 
```js
// Fixed: postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```
- **Consequences:**
  - ✅ Tailwind CSS now properly processes and applies styles
  - ✅ Autoprefixer handles vendor prefixes automatically
  - ✅ Development experience improved with proper CSS hot reloading

## Decision 6: Mock Data Design
- **Date:** June 8, 2025
- **Context:** Need realistic sample data that demonstrates equipment detection capabilities across different vendors and equipment types
- **Decision:** Create comprehensive mock dataset with real vendor patterns and equipment hierarchies
- **Details:**
  - Johnson Controls VMA1400 equipment (AHU-1)
  - Siemens POL909 equipment (VAV terminals) 
  - Mixed equipment types (AHU, VAV, Terminal Units)
  - Realistic point naming conventions
  - Unstructured points for manual assignment testing
- **Consequences:**
  - ✅ Demonstrates full capability of equipment detection algorithms
  - ✅ Provides realistic testing scenario for users
  - ✅ Shows both successful auto-detection and manual assignment workflows
  - ✅ Easy to extend with additional vendor patterns

## Decision 7: Responsive Design Strategy
- **Date:** June 8, 2025
- **Context:** Need interface that works on desktop (primary) but gracefully degrades to tablet and mobile
- **Decision:** Three-column desktop → two-column tablet → single-column mobile with progressive disclosure
- **Implementation:**
  - Desktop: Left rail + Main panel + Right rail
  - Tablet: Collapsible left rail + Main panel + Right rail  
  - Mobile: Single column with drawer for unassigned points
- **Consequences:**
  - ✅ Optimal use of screen real estate on each device type
  - ✅ Progressive disclosure keeps complex workflows manageable
  - ✅ Touch-friendly interface on mobile devices
  - ⚠️ Some advanced features may require desktop for optimal experience

## Decision 8: SkySpark Integration Architecture
- **Date:** June 8, 2025
- **Context:** Need to connect to real SkySpark server while maintaining development flexibility and error resilience
- **Decision:** Hybrid data source with intelligent fallback: SkySpark primary → Mock data fallback → User notification
- **Alternatives Considered:**
  - SkySpark only (would break development when server unavailable)
  - Mock data only (wouldn't demonstrate real-world capability)
  - Manual toggle (puts burden on user to manage data sources)
- **Implementation Details:**
  - Environment-based SkySpark configuration
  - Bearer token authentication with timeout protection
  - Automatic data transformation from SkySpark grid format
  - Seamless fallback with user feedback in console
- **Consequences:**
  - ✅ Works with real building automation data when available
  - ✅ Continues functioning during SkySpark outages or development
  - ✅ Clear user feedback about active data source
  - ✅ Easy to deploy in different environments

## Decision 9: SkySpark Data Transformation Strategy
- **Date:** June 8, 2025
- **Context:** SkySpark returns data in grid format with different structure than our BACnet point interface
- **Decision:** Server-side transformation with vendor detection and filename generation
- **Transformation Pipeline:**
  - Extract core fields: id, dis, kind, unit from SkySpark rows
  - Generate vendor information from point names using pattern matching
  - Create realistic filenames based on navName and equipment patterns
  - Normalize data types to Number/Bool/Str format
  - Preserve original SkySpark metadata for debugging
- **Alternatives Considered:**
  - Client-side transformation (would expose SkySpark format to frontend)
  - Raw pass-through (would require frontend to handle multiple data formats)
  - Pre-processing in SkySpark (would require custom SkySpark functions)
- **Consequences:**
  - ✅ Clean separation between SkySpark specifics and application logic
  - ✅ Consistent data format regardless of source (SkySpark vs mock)
  - ✅ Vendor detection works with real equipment naming conventions
  - ✅ Easy to debug with logging of transformation process

## Decision 10: Top Stats Panel Design
- **Date:** June 8, 2025
- **Context:** User requested informational panel showing equipment types, counts, and point statistics
- **Decision:** Dedicated TopStatsPanel component with real-time data binding and equipment type distribution
- **Design Elements:**
  - 4-column grid: Total Points, Assigned Points, Completion %, Equipment Groups
  - Equipment type distribution with color-coded indicators
  - Real-time updates based on Zustand store state
  - Responsive design (2-column mobile, 4-column desktop)
- **Alternatives Considered:**
  - Integrate into existing components (would clutter existing layouts)
  - Static information panel (wouldn't reflect real-time changes)
  - Sidebar stats only (less prominent for key metrics)
- **Consequences:**
  - ✅ Prominent display of key project metrics
  - ✅ Visual equipment type breakdown aids understanding
  - ✅ Real-time updates provide immediate feedback
  - ✅ Responsive design works across device types

## Decision 11: Manual Data Refresh Implementation
- **Date:** June 8, 2025
- **Context:** Need user control over when to reload data from SkySpark, especially during development and testing
- **Decision:** Add "Refresh Data" button in header with loading state and error handling
- **Implementation:**
  - Button triggers same API flow as initial load
  - Loading state prevents multiple simultaneous requests
  - Console messages inform user of refresh results
  - Maintains existing auto-save and other functionality
- **Alternatives Considered:**
  - Automatic refresh interval (could interfere with user work)
  - Page refresh (would lose unsaved work)
  - No manual refresh (would require page reload to get fresh data)
- **Consequences:**
  - ✅ User control over data freshness
  - ✅ Useful for development and testing scenarios
  - ✅ Clear feedback about refresh operation results
  - ✅ Maintains application state during refresh