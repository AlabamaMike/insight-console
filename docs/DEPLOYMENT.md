# DealInsights.ai Deployment Guide

Complete guide for deploying DealInsights.ai to production using Cloudflare Workers and Vercel.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Cloudflare Workers Backend](#cloudflare-workers-backend)
- [Vercel Frontend](#vercel-frontend)
- [Domain Configuration](#domain-configuration)
- [Post-Deployment](#post-deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Accounts
- Cloudflare account (Workers, R2, KV, Hyperdrive)
- Vercel account
- Neon PostgreSQL account
- GitHub account (for CI/CD)

### Required Tools
```bash
# Install Node.js 18+
node --version  # Should be 18.x or higher

# Install Wrangler CLI
npm install -g wrangler

# Install Vercel CLI
npm install -g vercel

# Authenticate with Cloudflare
wrangler login

# Authenticate with Vercel
vercel login
```

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/insight-console.git
cd insight-console
```

### 2. Install Dependencies

```bash
# Backend Workers
cd backend-workers
npm install

# Frontend
cd ../frontend
npm install
```

## Database Setup

### 1. Create Neon PostgreSQL Database

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project: `dealinsights-production`
3. Note the connection string (starts with `postgresql://`)

### 2. Run Database Migrations

```bash
cd backend
# Copy connection string to environment
export DATABASE_URL="postgresql://user:pass@host/database"

# Run migrations using Alembic
alembic upgrade head
```

### 3. Create Audit Logs Table

```bash
# Run the audit logs migration
psql $DATABASE_URL -f backend-workers/migrations/001_create_audit_logs.sql
```

## Cloudflare Workers Backend

### 1. Create R2 Bucket

```bash
cd backend-workers

# Create production R2 bucket
wrangler r2 bucket create insight-console-docs-prod

# Configure CORS (see docs/r2-bucket-setup.md)
```

### 2. Create KV Namespace

```bash
# Create KV namespace for sessions/rate limiting
wrangler kv:namespace create "SESSIONS" --env production

# Note the ID returned, update wrangler.toml
```

### 3. Create Hyperdrive Connection

```bash
# Create Hyperdrive connection to Neon
wrangler hyperdrive create dealinsights-db \
  --connection-string="postgresql://user:pass@host/database"

# Note the ID returned, update wrangler.toml
```

### 4. Set Secrets

```bash
# Database URL (via Hyperdrive)
wrangler secret put DATABASE_URL --env production
# Enter: postgresql://user:pass@host/database

# Anthropic API Key
wrangler secret put ANTHROPIC_API_KEY --env production
# Enter: sk-ant-xxxxx

# JWT Secret (generate a random string)
wrangler secret put JWT_SECRET --env production
# Enter: [random-64-char-string]

# Encryption Key
wrangler secret put ENCRYPTION_KEY --env production
# Enter: [random-64-char-string]
```

### 5. Update wrangler.toml

Edit `backend-workers/wrangler.toml`:

```toml
[env.production]
vars = { ENVIRONMENT = "production" }
r2_buckets = [
  { binding = "DOCUMENTS", bucket_name = "insight-console-docs-prod" }
]
kv_namespaces = [
  { binding = "SESSIONS", id = "YOUR_KV_NAMESPACE_ID" }
]
hyperdrive = [
  { binding = "DATABASE", id = "YOUR_HYPERDRIVE_ID" }
]
```

### 6. Deploy Backend

```bash
cd backend-workers
npm run deploy:production
```

### 7. Get Workers URL

```bash
# Workers will be deployed to:
# https://insight-console-api.YOUR_SUBDOMAIN.workers.dev
```

## Vercel Frontend

### 1. Create Vercel Project

```bash
cd frontend
vercel link
# Follow prompts to create new project
```

### 2. Set Environment Variables

```bash
# Set API URL
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://api.dealinsights.ai

# Set environment
vercel env add NEXT_PUBLIC_ENV production
# Enter: production
```

### 3. Deploy Frontend

```bash
vercel --prod
```

## Domain Configuration

### 1. Configure Custom Domain for Workers

In Cloudflare Dashboard:
1. Go to Workers & Pages
2. Select `insight-console-api`
3. Go to Settings > Triggers
4. Add custom domain: `api.dealinsights.ai`

### 2. Configure Custom Domain for Vercel

In Vercel Dashboard:
1. Go to your project settings
2. Go to Domains
3. Add domain: `dealinsights.ai`
4. Follow DNS configuration instructions

### 3. Update DNS (Cloudflare)

In Cloudflare DNS:
```
Type    Name     Content
CNAME   @        cname.vercel-dns.com
CNAME   www      cname.vercel-dns.com
AAAA    api      [Workers IPv6 address]
```

### 4. SSL/TLS Settings

In Cloudflare SSL/TLS:
- Set mode to **Full (strict)**
- Enable **Always Use HTTPS**
- Set Minimum TLS Version to **1.3**
- Enable **HSTS**

## Post-Deployment

### 1. Verify Deployments

```bash
# Test backend
curl https://api.dealinsights.ai/health

# Test frontend
curl https://dealinsights.ai
```

### 2. Run Smoke Tests

```bash
# Create test deal
curl -X POST https://api.dealinsights.ai/api/deals \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Deal", "sector": "Technology"}'

# Verify response
```

### 3. Monitor Logs

```bash
# Watch Workers logs
wrangler tail --env production

# Watch Vercel logs
vercel logs
```

### 4. Set Up Monitoring

Configure alerts in:
- Cloudflare Analytics
- Vercel Analytics
- Database monitoring (Neon Console)

## CI/CD with GitHub Actions

The repository includes GitHub Actions workflows for automated deployment:

### Required GitHub Secrets

Add these secrets in GitHub repository settings:

```
CLOUDFLARE_API_TOKEN          # Cloudflare API token
CLOUDFLARE_ACCOUNT_ID         # Cloudflare account ID
VERCEL_TOKEN                  # Vercel token
VERCEL_ORG_ID                 # Vercel organization ID
VERCEL_PROJECT_ID             # Vercel project ID
```

### Automatic Deployment

Pushes to `main` branch will automatically:
1. Run tests
2. Deploy backend to Cloudflare Workers
3. Deploy frontend to Vercel
4. Run smoke tests

## Troubleshooting

### Backend Issues

**Workers not deploying:**
```bash
# Check Wrangler config
wrangler whoami

# Verify secrets
wrangler secret list --env production

# Check logs
wrangler tail --env production
```

**Database connection errors:**
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Verify Hyperdrive
wrangler hyperdrive list
```

**R2 upload failures:**
```bash
# Verify bucket exists
wrangler r2 bucket list

# Check CORS configuration
wrangler r2 bucket cors get insight-console-docs-prod
```

### Frontend Issues

**Build failures:**
```bash
# Clear cache and rebuild
cd frontend
rm -rf .next node_modules
npm install
npm run build
```

**API connection errors:**
```bash
# Verify environment variables
vercel env ls

# Check CORS configuration
curl -H "Origin: https://dealinsights.ai" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS https://api.dealinsights.ai/api/deals
```

### Security Issues

**CORS errors:**
- Verify origin is in allowed list (backend-workers/src/index.ts)
- Check Cloudflare SSL/TLS mode is "Full (strict)"

**Rate limiting:**
```bash
# Check KV namespace
wrangler kv:namespace list

# View rate limit data
wrangler kv:key list --namespace-id=YOUR_KV_ID
```

## Rollback Procedure

### Backend Rollback

```bash
cd backend-workers
wrangler rollback --env production
```

### Frontend Rollback

In Vercel Dashboard:
1. Go to Deployments
2. Find previous deployment
3. Click "Promote to Production"

### Database Rollback

```bash
# Rollback one migration
cd backend
alembic downgrade -1

# Rollback to specific version
alembic downgrade <revision>
```

## Performance Optimization

### Backend

- Enable Cloudflare caching for static endpoints
- Use Hyperdrive for connection pooling
- Monitor Workers CPU time

### Frontend

- Enable Vercel Edge Network
- Configure ISR for static pages
- Optimize images with Next.js Image

### Database

- Add indexes for slow queries
- Enable Neon autoscaling
- Review query performance

## Security Checklist

- [ ] All secrets properly configured
- [ ] HTTPS enforced (HSTS enabled)
- [ ] CORS configured correctly
- [ ] Rate limiting active
- [ ] Audit logging working
- [ ] Firm isolation tested
- [ ] Document encryption verified
- [ ] No secrets in code/logs

## Cost Monitoring

Monitor costs in:
- Cloudflare Dashboard (Workers, R2, KV)
- Vercel Dashboard
- Neon Console

Set up budget alerts:
```bash
# Example monthly budget: $100
# Workers: $30
# R2: $10
# Neon: $50
# Vercel: $20
```

## Support

For issues:
1. Check logs (Wrangler, Vercel)
2. Review documentation
3. Check GitHub Issues
4. Contact support

## Next Steps

After deployment:
1. Set up monitoring dashboards
2. Configure backup procedures
3. Document runbooks
4. Train team on deployment process
5. Schedule security audit
