# Insight Console Frontend

Modern React/Next.js frontend for the Insight Console PE deal analysis platform.

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Beautiful icons
- **Axios** - HTTP client for API calls

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build

```bash
npm run build
npm start
```

## Features

### Dashboard
- View all deals
- Create new deals
- Deal status indicators

### Deal Detail Page
- Document upload interface
- Workflow execution and monitoring
- Real-time progress tracking

### Synthesis Report
- Executive summary
- Investment recommendations with confidence scores
- Deal scoring across dimensions
- Key insights and opportunities
- Risk assessment
- Value creation levers
- Actionable next steps

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── deals/[id]/        # Deal detail page
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Homepage/dashboard
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── CreateDealButton.tsx
│   ├── DealList.tsx
│   ├── DocumentUpload.tsx
│   ├── WorkflowList.tsx
│   └── SynthesisReport.tsx
├── lib/                   # Utilities
│   └── api.ts            # API client
└── types/                 # TypeScript types
    └── index.ts          # Type definitions
```

## API Integration

The frontend connects to the FastAPI backend at `NEXT_PUBLIC_API_URL`.

### Available Endpoints

- `GET /api/deals` - List all deals
- `POST /api/deals` - Create new deal
- `POST /api/deals/{id}/documents` - Upload document
- `POST /api/deals/{id}/analysis/start` - Start analysis
- `GET /api/deals/{id}/analysis/workflows` - Get workflows
- `POST /api/deals/{id}/analysis/workflows/{id}/execute` - Execute workflow
- `POST /api/deals/{id}/synthesis/generate` - Generate synthesis
- `GET /api/deals/{id}/synthesis` - Get synthesis report

## Dark Mode

The app supports dark mode based on system preferences.
