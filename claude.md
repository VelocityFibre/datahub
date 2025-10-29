# VelocityFibre DataHub

## Overview
Central data hub for organizing, connecting, and synchronizing data from multiple sources to a centralized Neon PostgreSQL database. This hub serves as the single source of truth for all Velocity Fibre data, enabling Power BI analytics and FibreFlow app integration.

## Architecture

### Core Components

#### 1. Data Sources
- **SharePoint** - Excel spreadsheets for project data (starting with Lawley project)
- **Future Sources** - Additional sources to be added as needed

#### 2. Data Connectors
Located in `/connectors/` - each connector handles:
- Authentication and connection to specific data source
- Data extraction and transformation
- Error handling and retry logic
- Change detection for incremental updates

#### 3. Sync Engine
Located in `/sync/` - orchestrates:
- Scheduled data synchronization
- Data validation and transformation
- Conflict resolution
- Audit logging

#### 4. Neon Database (Centralized Storage)
- **Database Name**: neondb
- **Host**: ep-dry-night-a9qyh4sj-pooler.gwc.azure.neon.tech
- **Region**: Azure (gwc.azure)
- **Endpoint**: ep-dry-night-a9qyh4sj
- **Connection Mode**: Pooler (optimized connection pooling)
- **User**: neondb_owner
- **Client**: @neondatabase/serverless (direct SQL queries, no ORM)

#### 5. API Layer
Located in `/api/` - provides:
- RESTful endpoints for Power BI integration
- GraphQL endpoints for FibreFlow app
- Authentication and authorization
- Rate limiting and caching

## Data Flow

```
Data Sources (SharePoint, etc.)
        ↓
    Connectors (Extract & Transform)
        ↓
    Sync Engine (Validate & Load)
        ↓
    Neon Database (Centralized Storage)
        ↓
    ┌───────────────┬───────────────┐
    ↓               ↓               ↓
Power BI API   FibreFlow API   Direct Access
```

## Project Structure

```
VelocityFibre_DataHub/
├── config/              # Configuration files
│   ├── database.config.ts
│   ├── connectors.config.ts
│   └── sync.config.ts
├── connectors/          # Data source connectors
│   ├── sharepoint/
│   │   ├── client.ts
│   │   ├── lawley.connector.ts
│   │   └── auth.ts
│   └── [future connectors]/
├── sync/                # Synchronization engine
│   ├── engine.ts
│   ├── scheduler.ts
│   └── transformers/
├── api/                 # API endpoints
│   ├── powerbi/
│   │   └── routes.ts
│   ├── fibreflow/
│   │   └── routes.ts
│   └── middleware/
├── database/            # Database utilities
│   ├── client.ts
│   ├── migrations/
│   └── schemas/
├── utils/               # Shared utilities
│   ├── logger.ts
│   ├── validators.ts
│   └── error-handler.ts
├── .env.local           # Environment variables
├── package.json
├── tsconfig.json
└── claude.md           # This file
```

## Implementation Plan

### Phase 1: Foundation (Current)
1. ✅ Project structure setup
2. ⏳ Neon database connection configuration
3. ⏳ Environment variables setup
4. ⏳ Basic utilities (logging, error handling)

### Phase 2: First Data Flow - Lawley Project (SharePoint)
1. ⏳ SharePoint authentication setup
2. ⏳ SharePoint connector for Lawley data
3. ⏳ Data transformation logic
4. ⏳ Database schema for Lawley project
5. ⏳ Sync service implementation
6. ⏳ Test and validate data flow

### Phase 3: API Layer
1. Power BI API endpoints
2. Authentication and security
3. Query optimization
4. Documentation

### Phase 4: FibreFlow Integration
1. GraphQL/REST API for FibreFlow
2. Real-time data updates (webhooks/polling)
3. Caching layer

### Phase 5: Expansion
1. Additional data sources
2. Advanced analytics
3. Data quality monitoring
4. Automated alerts

## First Data Source: Lawley Project (SharePoint)

**Source**: https://blitzfibre.sharepoint.com/:x:/s/Velocity_Manco/EYUuwgdZJ39LjbyDziL-tSEB8RhpBfIeQSXxEcBlzSkt6Q?e=6K38ZN

**Purpose**: Sync Lawley project data from SharePoint Excel to Neon database

**Data Points to Extract**:
- Project metrics
- Timeline information
- Resource allocation
- Status updates
- Financial data

**Sync Frequency**: TBD (hourly, daily, or on-demand)

## Environment Variables Required

```env
# Neon Database
NEON_DATABASE_URL=postgresql://neondb_owner:npg_aRNLhZc1G2CD@ep-dry-night-a9qyh4sj-pooler.gwc.azure.neon.tech/neondb?sslmode=require&channel_binding=require

# SharePoint
SHAREPOINT_CLIENT_ID=
SHAREPOINT_CLIENT_SECRET=
SHAREPOINT_TENANT_ID=
SHAREPOINT_SITE_URL=https://blitzfibre.sharepoint.com/sites/Velocity_Manco

# API
API_PORT=3000
API_SECRET_KEY=

# Sync
SYNC_SCHEDULE=0 */1 * * *  # Every hour
LOG_LEVEL=info
```

## Power BI Integration

The API will expose endpoints that Power BI can connect to:

- `/api/powerbi/lawley/summary` - Project summary data
- `/api/powerbi/lawley/timeline` - Timeline and milestones
- `/api/powerbi/lawley/resources` - Resource allocation
- `/api/powerbi/lawley/financials` - Financial metrics

These endpoints will return data in formats optimized for Power BI consumption (JSON, CSV, or OData).

## FibreFlow App Integration

FibreFlow (deployed on Vercel) will connect via:
- RESTful API endpoints
- GraphQL queries (optional)
- Server-side API routes in Next.js
- Real-time updates via webhooks/polling

## Technology Stack

- **Runtime**: Node.js / TypeScript
- **Database Client**: @neondatabase/serverless
- **SharePoint**: @pnp/sp / Microsoft Graph API
- **API Framework**: Express.js or Next.js API routes
- **Scheduling**: node-cron or similar
- **Logging**: Winston or Pino
- **Validation**: Zod or Yup
- **Testing**: Jest + Supertest

## Security Considerations

1. **Authentication**: OAuth 2.0 for SharePoint, API keys for Power BI
2. **Encryption**: TLS/SSL for all connections
3. **Secrets Management**: Environment variables, never committed to git
4. **Database**: Connection pooling, prepared statements
5. **API**: Rate limiting, input validation, CORS configuration
6. **Audit Trail**: Log all data modifications

## Monitoring & Logging

- Sync job success/failure tracking
- Data quality metrics
- API performance monitoring
- Error alerting
- Audit logs for data changes

## Next Steps

1. Set up SharePoint authentication credentials
2. Fetch and analyze Lawley spreadsheet structure
3. Design database schema based on spreadsheet
4. Implement first connector and sync
5. Create initial API endpoints
6. Test end-to-end flow

## Notes

- Project uses direct SQL queries (no ORM) as per existing neon/config/database.config.ts pattern
- FibreFlow app is already built and deployed on Vercel
- MD (Managing Director) needs Power BI access to view data
- Start with Lawley project as proof of concept, then expand to other data sources
