# Decision Log

## Decision 1
- **Date:** [Date]
- **Context:** [Context]
- **Decision:** [Decision]
- **Alternatives Considered:** [Alternatives]
- **Consequences:** [Consequences]

## Decision 2
- **Date:** [Date]
- **Context:** [Context]
- **Decision:** [Decision]
- **Alternatives Considered:** [Alternatives]
- **Consequences:** [Consequences]

## Properties Display Implementation Strategy
- **Date:** 2025-06-10 1:11:25 AM
- **Author:** Unknown User
- **Context:** User wants to replace comma-separated properties list with visual tags using Tagify library or similar. Properties section currently shows BACnet marker tags like 'point, writable, cmd' as plain text. Need to implement 6 allowed markers: bacnetPoint, cmd, cur, his, point, writable according to Project Haystack standards.
- **Decision:** Will create a custom React component that displays tags without adding heavy Tagify dependency. Will use Tailwind CSS to create tag-like visual components that match modern UI patterns. Will implement tag validation according to Project Haystack rules.
- **Alternatives Considered:** 
  - Use full Tagify library
  - Use React-Select with tags mode
  - Create custom tag component
  - Use existing Badge components
- **Consequences:** 
  - Lighter bundle size with custom solution
  - Better integration with existing Tailwind CSS
  - Full control over tag appearance and behavior
  - No external dependency management needed
