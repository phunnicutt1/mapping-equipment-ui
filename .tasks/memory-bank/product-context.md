# Building Automation Point Grouping System

## Project Path
`/Users/Patrick/Sites/grouping-UI`

## Description
A Next.js application that transforms unstructured BACnet point data from SkySpark APIs into organized equipment insights through intelligent grouping and human-in-the-loop validation. This production-ready system processes real building automation data using a three-layer approach: data normalization, equipment detection, and interactive UI for manual validation. The system integrates directly with SkySpark servers while providing seamless fallback to mock data for development and offline scenarios.

## Objectives
- **Real SkySpark Integration**: Connect to live building automation servers with bearer token authentication
- **Data Processing**: Normalize and auto-group BACnet points using vendor/model patterns and point naming conventions
- **Equipment Detection**: Identify equipment instances using Jaccard similarity, filename patterns, and vendor/model matching
- **Human-in-the-Loop Workflow**: Provide interactive interface for reviewing, confirming, and manually adjusting equipment groupings
- **Real-time Analytics**: Display processing statistics, equipment distribution, and completion tracking with live data
- **Resilient Operation**: Maintain functionality during network outages with intelligent data source management

## Technologies
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript (strict mode)
- **State Management**: Zustand for global state, SWR for data fetching
- **Styling**: Tailwind CSS with custom design system and responsive component library
- **API Integration**: SkySpark REST API with bearer token authentication and timeout protection
- **Testing**: Vitest + React Testing Library + Jest DOM for comprehensive test coverage
- **Build Tools**: PostCSS, Autoprefixer, ESLint with Next.js optimizations
- **Icons**: Heroicons React for consistent iconography
- **Development**: Hot reload, TypeScript checking, automated testing, environment-based configuration

## Architecture

### Three-Layer Processing Approach
1. **Data Layer**: SkySpark API → data transformation → normalized BACnet points → auto-grouped using vendor/model patterns
2. **Processing Layer**: Equipment detection using Jaccard similarity + filename patterns + vendor matching with real building data
3. **UI Layer**: Interactive interface for human validation and manual adjustments with real-time feedback

### SkySpark Integration Architecture
- **Primary Data Source**: Live SkySpark server at `http://localhost:8081/api`
- **Authentication**: Bearer token security with environment variable configuration
- **Data Transformation**: SkySpark grid format → standardized BACnet point objects
- **Fallback System**: Automatic mock data when SkySpark unavailable
- **User Feedback**: Console messages indicate active data source and connection status

### State Management Flow
- Zustand store manages equipment groupings, point assignments, and UI state
- Real-time updates from SkySpark data with optimistic UI updates
- Draft persistence with validation and integrity checks
- Manual refresh capability for user-controlled data reloading

### Component Architecture
- **TopStatsPanel**: Real-time metrics display with equipment type distribution
- **LeftRail**: Upload controls, data statistics, console messages with connection status
- **MainPanel**: Equipment groups accordion with search, filtering, and real data visualization  
- **RightRail**: Insights panels and completion tracking with live statistics
- **UnassignedPointsDrawer**: Slide-in panel for point assignment with bulk operations

## Project Structure
```
/Users/Patrick/Sites/grouping-UI/
├── app/                    # Next.js 14 App Router
│   ├── api/               # API routes with SkySpark integration
│   │   ├── points/        # SkySpark data fetching with transformation
│   │   ├── saveDraft/     # Draft persistence
│   │   └── finalize/      # Validation and publishing
│   ├── layout.tsx         # Root layout with metadata
│   ├── page.tsx           # Main application with SkySpark loading
│   └── globals.css        # Global styles with Tailwind
├── components/            # React components
│   ├── ui/               # Reusable UI components (Card, Button, Badge)
│   ├── TopStatsPanel.tsx # Real-time metrics display
│   ├── LeftRail.tsx      # Settings and statistics sidebar
│   ├── MainPanel.tsx     # Equipment groups accordion
│   ├── RightRail.tsx     # Insights and analytics
│   └── UnassignedPointsDrawer.tsx # Point assignment interface
├── lib/                   # Core logic and utilities
│   ├── store.ts          # Zustand state management with SkySpark integration
│   ├── types.ts          # TypeScript interfaces
│   ├── utils.ts          # Equipment grouping algorithms
│   └── mock-data.ts      # Sample BACnet data for fallback
├── __tests__/            # Test suite with SkySpark integration tests
└── [config files]       # TypeScript, Tailwind, Vitest, environment setup
```

## Key Features Implemented

### SkySpark Integration ✅
- **Live API Connection**: Real-time data from building automation servers
- **Bearer Authentication**: Secure API access with environment-based token management
- **Data Transformation**: Automatic conversion from SkySpark grid format to BACnet points
- **Intelligent Fallback**: Seamless mock data when SkySpark unavailable
- **Manual Refresh**: User-controlled data reloading from SkySpark
- **Connection Status**: Real-time feedback about data source and connection health

### Equipment Detection ✅
- **Filename Pattern Matching**: AHU, VAV, Terminal Unit recognition from real building data
- **Vendor/Model Recognition**: Automatic identification of Johnson Controls, Siemens, Trane, etc.
- **Point Similarity Analysis**: Jaccard index for equipment grouping with real point configurations
- **Confidence Scoring**: Reliability metrics for auto-detected groups
- **Real-world Adaptation**: Handles diverse naming conventions from actual building systems

### Interactive UI ✅
- **Top Stats Panel**: Real-time display of total points, assigned points, completion %, equipment groups
- **Equipment Type Distribution**: Visual breakdown of detected equipment with color coding
- **Three-column Responsive Layout**: Desktop → tablet → mobile with progressive disclosure
- **Human Validation Workflow**: Confirm, flag, reject, and manually assign equipment groupings
- **Real-time Updates**: Live statistics and progress tracking as work progresses
- **Search and Filtering**: Advanced point and equipment discovery capabilities

### Data Management ✅
- **Draft Auto-save**: Periodic persistence of work in progress
- **Validation Engine**: Integrity checks before finalizing configurations
- **Error Handling**: Graceful recovery from network issues and data problems
- **Performance Optimization**: Efficient handling of large building datasets
- **User Feedback**: Comprehensive console logging and status messages

## Sample Data Integration

### Real SkySpark Data
The system now processes actual building automation data from SkySpark servers:
- **Live Equipment Detection**: Real AHUs, VAVs, Terminal Units from building systems
- **Authentic Vendor Recognition**: Actual manufacturer equipment (Johnson Controls, Siemens, Trane, etc.)
- **Real Point Configurations**: Diverse sensor and control point types from operating buildings
- **Variable Data Quality**: Handles inconsistent naming and missing metadata from real systems

### Mock Data Fallback
When SkySpark unavailable, comprehensive fallback data includes:
- **AHU-1**: 5 temperature/flow/fan control points (Johnson Controls VMA1400)
- **VAV Terminal Units**: Zone control points for VAV-101 & VAV-102 (Siemens POL909)
- **Terminal Units**: Valve and temperature sensors for TU-201
- **Vendor Patterns**: Demonstrates detection algorithms with known manufacturer patterns
- **Unstructured Points**: Miscellaneous sensors for manual assignment testing

## Production Readiness

### Security ✅
- **Bearer Token Authentication**: Secure API access to SkySpark servers
- **Environment Variable Management**: Sensitive data kept out of source code
- **Timeout Protection**: Prevention of hanging requests to external APIs
- **Error Boundary Implementation**: Graceful handling of unexpected failures

### Performance ✅
- **Efficient Data Processing**: Optimized algorithms for large building datasets
- **Responsive UI Updates**: Real-time feedback without blocking user interactions
- **Memory Management**: Proper cleanup and state management
- **Network Resilience**: Robust handling of connectivity issues

### Monitoring ✅
- **Comprehensive Logging**: Detailed console messages for debugging and monitoring
- **Connection Status Tracking**: Real-time awareness of SkySpark connectivity
- **Data Source Transparency**: Users always know if viewing real or mock data
- **Performance Metrics**: Built-in timing and success rate tracking

### Deployment Ready ✅
- **Environment Configuration**: Flexible setup for development, staging, production
- **Docker Compatibility**: Ready for containerized deployment
- **Health Checks**: API endpoints for monitoring system status
- **Documentation**: Complete setup and maintenance guides