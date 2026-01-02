# Conversation Allocation System

A robust backend service for managing conversation allocation to operators with cursor-based pagination, priority scoring, and grace period handling. Built with Node.js, Express, and PostgreSQL (Supabase).

## Features

- **Cursor-Based Pagination**: Efficient data retrieval with cursor-based pagination for conversations
- **Priority Scoring**: Dynamic priority calculation based on message count and waiting time
- **Auto & Manual Allocation**: Automatic allocation with priority or manual claim by operators
- **Grace Period**: Automatic handling when operators go offline
- **Multi-Tenant**: Full multi-tenant support with row-level security
- **Label Management**: Organize conversations with customizable labels
- **Real-time Ready**: Designed to work with Supabase Realtime for live updates
- **Role-Based Access**: Three roles - Operator, Manager, and Admin with different permissions

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL (Supabase)
- **Validation**: Joi
- **Logging**: Winston
- **Security**: Helmet, CORS

## Project Structure

```
Backend Assessment/
├── migrations/              # Database migrations
│   ├── 001_initial_schema.sql
│   └── 002_seed_data.sql
├── src/
│   ├── config/             # Configuration files
│   │   ├── index.js
│   │   ├── logger.js
│   │   └── database.js
│   ├── controllers/        # Request handlers
│   │   ├── conversationController.js
│   │   ├── operatorController.js
│   │   └── labelController.js
│   ├── services/           # Business logic
│   │   ├── conversationService.js
│   │   ├── operatorService.js
│   │   ├── labelService.js
│   │   └── gracePeriodService.js
│   ├── routes/             # API routes
│   │   ├── index.js
│   │   ├── conversationRoutes.js
│   │   ├── operatorRoutes.js
│   │   └── labelRoutes.js
│   ├── middleware/         # Custom middleware
│   │   ├── errorHandler.js
│   │   └── auth.js
│   ├── utils/              # Utilities
│   │   └── validators.js
│   ├── jobs/               # Background jobs
│   │   └── gracePeriodJob.js
│   ├── migrations/         # Migration runner
│   │   └── run.js
│   ├── app.js             # Express app setup
│   └── server.js          # Server entry point
├── .env.example           # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## Installation

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database (Supabase account recommended)
- npm or yarn package manager

### Steps

1. **Clone the repository**

```bash
cd Backend\ Assessment
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
```

Edit `.env` and fill in your database credentials:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

4. **Run database migrations**

```bash
npm run migrate
```

5. **Start the server**

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## Database Schema

### Core Tables

- **tenants**: Multi-tenant support with priority configuration
- **inboxes**: Phone number-based inboxes per tenant
- **operators**: Operator accounts with roles (OPERATOR, MANAGER, ADMIN)
- **conversations**: Conversation metadata with state management
- **operator_inbox_subscriptions**: Operator-inbox relationships
- **operator_status**: Real-time operator availability status
- **labels**: Inbox-specific labels for organization
- **conversation_labels**: Many-to-many relationship
- **grace_period_assignments**: Tracks grace periods for offline operators

### Conversation States

- **QUEUED**: Waiting for allocation
- **ALLOCATED**: Assigned to an operator
- **RESOLVED**: Completed and closed

### Operator Roles

- **OPERATOR**: Basic conversation management
- **MANAGER**: Can reassign and manage all conversations
- **ADMIN**: Full system access including configuration

## API Documentation

### Authentication

All endpoints require authentication via the `X-Operator-Id` header:

```
X-Operator-Id: 1
```

*Note: In production, replace this with JWT token authentication.*

### Base URL

```
http://localhost:3000/api/v1
```

### Endpoints

#### 1. List Conversations

```http
GET /conversations?limit=20&cursor=abc123&state=QUEUED&sort=priority
```

**Query Parameters:**
- `limit` (optional): Number of results (1-100, default: 20)
- `cursor` (optional): Pagination cursor from previous response
- `inbox_id` (optional): Filter by inbox
- `state` (optional): Filter by state (QUEUED, ALLOCATED, RESOLVED)
- `operator_id` (optional): Filter by assigned operator
- `label_id` (optional): Filter by label
- `sort` (optional): Sort order (priority, newest, oldest)

**Response:**
```json
{
  "status": "success",
  "data": {
    "conversations": [...],
    "next_cursor": "0.85|2024-01-15T10:30:00|42",
    "has_more": true
  },
  "meta": {
    "count": 20,
    "timestamp": "2024-01-15T12:00:00Z"
  }
}
```

#### 2. Auto-Allocate Conversation

```http
POST /conversations/allocate
Content-Type: application/json

{
  "operator_id": 1
}
```

Automatically allocates the highest priority conversation to the operator.

#### 3. Claim Conversation

```http
POST /conversations/claim
Content-Type: application/json

{
  "operator_id": 1,
  "conversation_id": 42
}
```

Manually claim a specific queued conversation.

#### 4. Resolve Conversation

```http
POST /conversations/resolve
Content-Type: application/json

{
  "conversation_id": 42
}
```

Mark a conversation as resolved. Only the assigned operator or manager/admin can resolve.

#### 5. Deallocate Conversation

```http
POST /conversations/deallocate
Content-Type: application/json

{
  "conversation_id": 42
}
```

Return an allocated conversation back to the queue. **Manager/Admin only.**

#### 6. Reassign Conversation

```http
POST /conversations/reassign
Content-Type: application/json

{
  "conversation_id": 42,
  "operator_id": 2
}
```

Reassign a conversation to another operator. **Manager/Admin only.**

#### 7. Move to Different Inbox

```http
POST /conversations/move-inbox
Content-Type: application/json

{
  "conversation_id": 42,
  "inbox_id": 3
}
```

Move a conversation to a different inbox within the same tenant. **Manager/Admin only.**

#### 8. Search by Phone Number

```http
GET /conversations/search?phone_number=+1234567890
```

Search conversations by exact phone number match.

#### 9. Update Operator Status

```http
PUT /operators/:operator_id/status
Content-Type: application/json

{
  "status": "AVAILABLE"
}
```

Update operator availability status (AVAILABLE or OFFLINE). Triggers grace period handling.

#### 10. Get Operator Status

```http
GET /operators/:operator_id/status
```

Retrieve current operator status.

#### 11. List Operators

```http
GET /operators
```

Get all operators for the tenant. **Manager/Admin only.**

#### 12. Get Operator Statistics

```http
GET /operators/:operator_id/stats
```

Get performance statistics for an operator.

#### 13. Label Management

```http
# List labels
GET /labels?inbox_id=1

# Create label
POST /labels
{
  "inbox_id": 1,
  "name": "Urgent",
  "color": "#FF0000",
  "created_by": 1
}

# Update label
PUT /labels/:label_id
{
  "name": "Very Urgent",
  "color": "#FF0000"
}

# Delete label
DELETE /labels/:label_id

# Attach label to conversation
POST /labels/attach
{
  "conversation_id": 42,
  "label_id": 1
}

# Detach label
POST /labels/detach
{
  "conversation_id": 42,
  "label_id": 1
}
```

## Priority Score Calculation

The priority score is calculated using a weighted formula:

```
priority_score = α × normalized_message_count + β × normalized_delay
```

Where:
- **α (alpha)**: Weight for message count (default: 0.4)
- **β (beta)**: Weight for waiting time (default: 0.6)
- **normalized_message_count**: Message count / 100 (capped at 1.0)
- **normalized_delay**: Minutes since last message / 1440 (24 hours, capped at 1.0)

Priority scores are automatically recalculated when:
- A conversation is deallocated
- Grace period expires
- Admin triggers manual recalculation

## Grace Period Mechanism

When an operator changes status to OFFLINE:

1. All their allocated conversations enter a grace period (default: 15 minutes)
2. Conversations remain assigned during the grace period
3. A background job checks every minute for expired grace periods
4. If the operator returns to AVAILABLE before expiration, grace periods are cancelled
5. If grace periods expire, conversations are returned to QUEUED state with updated priority scores

## Configuration

Key configuration options in `.env`:

```env
# Priority weights (must sum to ~1.0)
PRIORITY_ALPHA=0.4
PRIORITY_BETA=0.6

# Grace period duration
GRACE_PERIOD_MINUTES=15

# Pagination limits
DEFAULT_PAGE_LIMIT=20
MAX_PAGE_LIMIT=100
MAX_CONVERSATION_FETCH=100
```

## Cursor-Based Pagination

This system uses cursor-based pagination for efficient data retrieval:

### How It Works

1. **Initial Request**: No cursor parameter
2. **Response**: Contains `next_cursor` if more results exist
3. **Next Request**: Use `next_cursor` value in the next request
4. **Continue**: Repeat until `next_cursor` is null

### Cursor Format

For priority sorting:
```
priority_score|last_message_at|id
Example: 0.85|2024-01-15T10:30:00Z|42
```

For time-based sorting:
```
id
Example: 42
```

### Benefits

- Consistent results even with concurrent updates
- No offset drift problems
- Efficient database queries with indexed columns
- Works well with large datasets

## Background Jobs

### Grace Period Job

- **Frequency**: Every 1 minute
- **Function**: Processes expired grace periods and releases conversations
- **Automatic**: Starts with server
- **Graceful**: Stops during server shutdown

## Error Handling

All errors return a consistent format:

```json
{
  "status": "error",
  "message": "Error description",
  "errors": [
    {
      "field": "operator_id",
      "message": "\"operator_id\" is required"
    }
  ]
}
```

### HTTP Status Codes

- **200**: Success
- **201**: Created
- **400**: Bad Request (validation errors)
- **401**: Unauthorized
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **409**: Conflict (e.g., duplicate resource)
- **500**: Internal Server Error

## Testing

The system includes seed data for testing. After running migrations:

- Tenant: "Demo Tenant" (ID: 1)
- Operators: 4 operators with different roles
- Inboxes: 3 test inboxes
- Conversations: 7 sample conversations in different states
- Labels: 5 sample labels

### Test Operators

| ID | Email | Role | Status |
|----|-------|------|--------|
| 1 | operator1@example.com | OPERATOR | AVAILABLE |
| 2 | operator2@example.com | OPERATOR | AVAILABLE |
| 3 | manager@example.com | MANAGER | AVAILABLE |
| 4 | admin@example.com | ADMIN | AVAILABLE |

### Example Test Flow

```bash
# 1. Check health
curl http://localhost:3000/api/v1/health

# 2. Get queued conversations
curl -H "X-Operator-Id: 1" \
  "http://localhost:3000/api/v1/conversations?state=QUEUED&sort=priority"

# 3. Allocate next conversation
curl -X POST http://localhost:3000/api/v1/conversations/allocate \
  -H "X-Operator-Id: 1" \
  -H "Content-Type: application/json" \
  -d '{"operator_id": 1}'

# 4. Update operator status
curl -X PUT http://localhost:3000/api/v1/operators/1/status \
  -H "X-Operator-Id: 1" \
  -H "Content-Type: application/json" \
  -d '{"status": "OFFLINE"}'
```

## Performance Considerations

### Database Indexes

The schema includes optimized indexes for:
- State and tenant filtering
- Priority score and timestamp ordering
- Phone number lookups
- Grace period expiration checks

### Query Optimizations

- Cursor-based pagination prevents offset performance issues
- Row-level locking (`FOR UPDATE SKIP LOCKED`) prevents race conditions
- Limits on conversation fetch (max 100) for allocation queries
- Efficient use of PostgreSQL CTEs and subqueries

### Scalability

- Stateless API design allows horizontal scaling
- Background jobs can be distributed across multiple instances
- Database connection pooling for efficient resource usage
- Graceful shutdown ensures no data loss during deployments

## Security Best Practices

- ✅ Helmet.js for security headers
- ✅ Input validation with Joi
- ✅ Parameterized queries to prevent SQL injection
- ✅ Row-level security through tenant isolation
- ✅ Role-based access control
- ⚠️ **TODO**: Implement JWT authentication (currently using header-based)
- ⚠️ **TODO**: Add rate limiting
- ⚠️ **TODO**: Implement request signing

## Deployment

### Supabase Setup

1. Create a new Supabase project
2. Copy the connection string and API keys
3. Update `.env` file
4. Run migrations: `npm run migrate`

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure proper `DATABASE_URL`
- [ ] Set strong `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Configure `ALLOWED_ORIGINS` for CORS
- [ ] Set up logging aggregation
- [ ] Configure monitoring and alerts
- [ ] Set up automatic backups
- [ ] Implement JWT authentication
- [ ] Add rate limiting
- [ ] Set up CI/CD pipeline

## Monitoring

### Health Check

```http
GET /api/v1/health
```

Returns server status and timestamp.

### Logs

Logs are written to:
- Console (development)
- `logs/combined.log` (production)
- `logs/error.log` (production, errors only)

### Key Metrics to Monitor

- Active conversations per operator
- Average resolution time
- Grace period expirations
- API response times
- Database connection pool usage
- Background job execution time

## Troubleshooting

### Database Connection Issues

```bash
# Test database connection
node -e "const {Pool} = require('pg'); \
  const pool = new Pool({connectionString: process.env.DATABASE_URL}); \
  pool.query('SELECT NOW()').then(r => console.log('✓ Connected:', r.rows[0])).catch(e => console.error('✗ Error:', e.message));"
```

### Migration Issues

```bash
# Check applied migrations
psql $DATABASE_URL -c "SELECT * FROM pg_tables WHERE schemaname = 'public';"

# Rollback (if needed, manually drop tables)
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

### Port Already in Use

```bash
# Find and kill process on port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:3000 | xargs kill -9
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

ISC

## Support

For issues and questions:
- Create an issue on GitHub
- Email: support@example.com

---

**Built with ❤️ using Node.js, Express, and PostgreSQL**
