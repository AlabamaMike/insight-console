# Development Guide

Guide for setting up local development environment for DealInsights.ai.

## Quick Start

### 1. Prerequisites

```bash
# Required
node >= 18.0.0
npm >= 9.0.0

# Optional but recommended
docker
docker-compose
```

### 2. Clone and Install

```bash
git clone https://github.com/your-org/insight-console.git
cd insight-console

# Install backend dependencies
cd backend-workers
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Database Setup (Local)

**Option A: Using Docker**

```bash
# Start PostgreSQL with Docker Compose
docker-compose up -d

# Database will be available at:
# postgresql://postgres:postgres@localhost:5432/dealinsights
```

**Option B: Using Neon**

```bash
# Create free Neon database at https://neon.tech
# Copy connection string
export DATABASE_URL="postgresql://user:pass@host/database"
```

**Run Migrations**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run Alembic migrations
alembic upgrade head
```

### 4. Environment Variables

**Backend Workers (`backend-workers/.dev.vars`)**

```bash
# Copy example file
cp backend-workers/.env.example backend-workers/.dev.vars

# Edit with your values
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dealinsights
ANTHROPIC_API_KEY=sk-ant-xxxxx
JWT_SECRET=your-secret-key-at-least-32-chars
ENCRYPTION_KEY=your-encryption-key-at-least-32-chars
```

**Frontend (`frontend/.env.local`)**

```bash
# Copy example file
cp frontend/.env.example frontend/.env.local

# Default values should work
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_ENV=development
```

### 5. Start Development Servers

**Terminal 1: Backend Workers**

```bash
cd backend-workers
npm run dev

# Server will start at http://localhost:8787
```

**Terminal 2: Frontend**

```bash
cd frontend
npm run dev

# Server will start at http://localhost:3000
```

### 6. Test the Setup

```bash
# Test backend health
curl http://localhost:8787/health

# Open frontend in browser
open http://localhost:3000
```

## Development Workflow

### Running Tests

**Backend**

```bash
cd backend-workers
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

**Frontend**

```bash
cd frontend
npm test

# Watch mode
npm run test:watch
```

### Linting and Type Checking

**Backend**

```bash
cd backend-workers
npm run lint
npm run type-check
```

**Frontend**

```bash
cd frontend
npm run lint
npm run type-check
```

### Database Migrations

**Create New Migration**

```bash
cd backend
alembic revision -m "description of changes"

# Edit the generated file in backend/alembic/versions/
# Then apply it
alembic upgrade head
```

**Rollback Migration**

```bash
alembic downgrade -1  # Rollback one migration
alembic downgrade <revision>  # Rollback to specific version
```

### Working with R2 Locally

For local development, you can:

**Option A: Mock R2**
```typescript
// Workers already handle missing R2 in development
// Files will be stored locally in uploads/
```

**Option B: Use Cloudflare R2 Dev**
```bash
# Create dev bucket
wrangler r2 bucket create insight-console-docs-dev

# Update wrangler.toml
[env.development]
r2_buckets = [
  { binding = "DOCUMENTS", bucket_name = "insight-console-docs-dev" }
]
```

## Code Organization

```
insight-console/
├── backend/                 # Python/FastAPI (legacy, being phased out)
├── backend-workers/         # Cloudflare Workers backend (TypeScript)
│   ├── src/
│   │   ├── db/             # Drizzle ORM schema
│   │   ├── middleware/     # Auth, rate limiting, security
│   │   ├── routes/         # API endpoints
│   │   ├── schemas/        # Zod validation schemas
│   │   └── utils/          # Helpers (JWT, audit, R2)
│   └── migrations/         # SQL migrations
├── frontend/                # Next.js frontend
│   └── src/
│       ├── app/            # Next.js app router
│       ├── components/     # React components
│       └── lib/            # API client, utilities
└── docs/                   # Documentation
```

## Development Tips

### Hot Reload

Both frontend and backend support hot reload:
- Frontend: Changes auto-reload in browser
- Backend: Wrangler watches for file changes

### Debugging

**Backend (Workers)**

```bash
# Add console.log statements
console.log('Debug:', value)

# View in terminal running `npm run dev`
```

**Frontend**

```bash
# Use browser DevTools
# Or add console.log in components
```

### API Testing

Use curl or tools like Postman:

```bash
# Login (get token)
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Create deal (with token)
curl -X POST http://localhost:8787/api/deals \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Deal", "sector": "Technology"}'
```

### Database GUI

Use a PostgreSQL client:
- [pgAdmin](https://www.pgadmin.org/)
- [TablePlus](https://tableplus.com/)
- [DBeaver](https://dbeaver.io/)

Connection string from `.dev.vars`

## Common Issues

### Port Already in Use

```bash
# Find and kill process on port 8787
lsof -ti:8787 | xargs kill -9

# Or change port in wrangler.toml
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker ps  # If using Docker
psql $DATABASE_URL -c "SELECT 1"  # Test connection
```

### CORS Errors

Make sure frontend origin is in allowed list:
```typescript
// backend-workers/src/index.ts
configureCORS([
  'http://localhost:3000',
  'http://localhost:3001',
])
```

### Type Errors

```bash
# Regenerate types
cd backend-workers
npm run build

cd frontend
npm run type-check
```

## Best Practices

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "feat: add your feature"

# Push and create PR
git push origin feature/your-feature
```

### Commit Messages

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code refactoring
- `test:` Tests
- `chore:` Maintenance

### Code Style

- Use TypeScript strict mode
- Follow ESLint rules
- Write tests for new features
- Document complex logic

### Security

- Never commit secrets
- Use environment variables
- Test authentication flows
- Validate all inputs

## Additional Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Next.js Docs](https://nextjs.org/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Hono Framework Docs](https://hono.dev/)

## Getting Help

- Check existing issues
- Review documentation
- Ask in team chat
- Create GitHub issue
