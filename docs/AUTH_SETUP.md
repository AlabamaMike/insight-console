# Magic Link Authentication Setup

## Overview

This project uses passwordless authentication via magic links. Users receive a time-limited login link via email instead of using passwords.

## Local Development

### Backend Setup

1. Navigate to backend-workers:
   ```bash
   cd backend-workers
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (copy from example):
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your values:
   ```
   DATABASE_URL=your_neon_database_url
   JWT_SECRET=your_secret_key_here
   FRONTEND_URL=http://localhost:3000
   ENVIRONMENT=development
   ```

5. Run database migrations:
   ```bash
   npm run db:push
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

Backend will be running at `http://localhost:8787`

**In development mode**, magic links are logged to the console instead of being emailed.

### Frontend Setup

1. Navigate to frontend:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   ```

4. Update `.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8787
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

Frontend will be running at `http://localhost:3000`

## Testing Magic Link Flow

1. Go to `http://localhost:3000/auth/login`
2. Enter your email address
3. Check the backend console logs for the magic link URL
4. Copy the URL and paste it into your browser
5. You should be logged in and redirected to the dashboard

## Production Setup

### Email Service (Resend)

1. Sign up for [Resend](https://resend.com)
2. Add and verify your domain
3. Get your API key
4. Add to production environment:
   ```
   RESEND_API_KEY=your_api_key
   FROM_EMAIL=noreply@yourdomain.com
   ENVIRONMENT=production
   ```

### Security Checklist

- [ ] Set strong `JWT_SECRET` (use `openssl rand -base64 32`)
- [ ] Configure CORS to only allow your frontend domain
- [ ] Set up SPF/DKIM records for email domain
- [ ] Use HTTPS in production (magic links over HTTP are insecure)
- [ ] Configure rate limiting in production (consider KV or Durable Objects)
- [ ] Monitor failed login attempts

## API Endpoints

- `POST /auth/request-magic-link` - Request a magic link
- `GET /auth/verify-magic-link?token=xxx&email=xxx` - Verify and login
- `POST /auth/refresh` - Refresh access token

## Troubleshooting

### "Too many requests" error
- Rate limit is 3 requests per email per hour
- Wait for the cooldown period or clear rate limit (development only)

### Magic link expired
- Links expire after 15 minutes
- Request a new magic link

### Email not sending (production)
- Verify Resend API key is correct
- Check domain verification in Resend dashboard
- Review Cloudflare Workers logs for email errors
