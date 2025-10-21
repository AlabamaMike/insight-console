# DealInsights.ai API - Cloudflare Workers Backend

TypeScript backend API built with Hono framework, running on Cloudflare Workers.

## Tech Stack

- **Runtime:** Cloudflare Workers
- **Framework:** Hono (Express-like API)
- **Database:** Neon PostgreSQL via Hyperdrive
- **ORM:** Drizzle
- **Storage:** Cloudflare R2
- **Authentication:** JWT

## Prerequisites

- Node.js 18+
- Cloudflare account
- Wrangler CLI: `npm install -g wrangler`

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .dev.vars
# Edit .dev.vars with your actual credentials
```

3. Run development server:
```bash
npm run dev
```

The API will be available at `http://localhost:8787`

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Deployment

### Development
```bash
npm run deploy
```

### Production
```bash
npm run deploy:production
```

## Project Structure

```
backend-workers/
├── src/
│   ├── index.ts           # Main app entry point
│   ├── types.ts           # TypeScript type definitions
│   ├── middleware/        # Authentication, logging, etc.
│   ├── routes/            # API route handlers
│   ├── db/                # Database schema and queries
│   ├── services/          # Business logic
│   └── utils/             # Helper functions
├── migrations/            # SQL migrations
├── wrangler.toml          # Cloudflare Workers config
├── package.json
└── tsconfig.json
```

## Environment Variables

See `.env.example` for required environment variables.

In production, set secrets using:
```bash
wrangler secret put DATABASE_URL
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put JWT_SECRET
wrangler secret put ENCRYPTION_KEY
```

## API Documentation

### Health Check
- `GET /health` - Returns service status

### Endpoints (to be implemented)
- `/api/auth/*` - Authentication
- `/api/deals/*` - Deal management
- `/api/documents/*` - Document upload/download
- `/api/workflows/*` - AI workflow execution

## Security Features

- JWT-based authentication
- Firm-level data isolation
- Audit logging for all operations
- Encrypted document storage
- Rate limiting
- CORS protection

## License

MIT
