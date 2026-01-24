# SpecForge

> AI-powered specification and project management platform that transforms requirements into production-ready artifacts.

SpecForge is a collaborative platform for product teams to create, review, and export product specifications, API schemas, database designs, and code scaffolds using AI assistance.

## 🚀 Features

- **AI-Powered Generation**: Transform PRDs into API specs, database schemas, and code scaffolds
- **Collaborative Workflows**: Multi-role support (Admin, PM, Dev, Reviewer) with approval workflows
- **Version Control**: Track changes across all artifacts with full version history
- **Export System**: Generate and download specifications in multiple formats (Markdown, JSON, ZIP)
- **Real-time Updates**: Live polling and notifications for export status
- **Cloud Storage**: R2/S3-compatible storage for generated artifacts
- **Background Processing**: Queue-based processing with BullMQ and Redis

## 📁 Project Structure

```
specforge/
├── apps/
│   ├── api/          # Express.js backend API
│   ├── web/          # React + Vite frontend
│   └── worker/       # Background job processor
├── packages/
│   └── shared/       # Shared types and utilities
├── prisma/           # Database schema and migrations
└── tmp/              # Temporary export files
```

## 🛠️ Tech Stack

**Frontend:**

- React 18
- TypeScript
- Vite
- React Router

**Backend:**

- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- BullMQ + Redis (job queues)

**AI/LLM:**

- Google Gemini
- OpenAI (optional)
- Ollama (optional)

**Storage:**

- Cloudflare R2 / S3-compatible storage

## 📋 Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database
- Redis server (for background jobs)
- Cloudflare R2 or S3-compatible storage (for exports)
- AI Provider API key (Gemini, OpenAI, or Ollama)

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/specforge.git
cd specforge
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### 4. Set up the database

```bash
pnpm prisma migrate dev
```

### 5. Start development servers

```bash
pnpm dev
```

This starts:

- **Web**: http://localhost:5173
- **API**: http://localhost:4000
- **Worker**: Background job processor

## 📝 Environment Variables

See [`.env.example`](.env.example) for all required and optional environment variables.

Key variables:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` - JWT secrets for authentication
- `GEMINI_API_KEY` or `OPENAI_API_KEY` - AI provider API key
- `R2_*` - Cloudflare R2 storage credentials
- `WEB_ORIGIN` - Frontend URL for CORS

## 🔧 Development

### Build for production

```bash
pnpm build
```

### Run linting

```bash
pnpm lint
```

### Format code

```bash
pnpm format
```

### Database operations

```bash
# Create a new migration
pnpm prisma migrate dev --name your_migration_name

# Reset database (⚠️ development only)
pnpm prisma migrate reset

# Open Prisma Studio
pnpm prisma studio
```

## 📦 Workspace Structure

This is a pnpm monorepo with the following workspaces:

- **`@specforge/web`** - React frontend application
- **`@specforge/api`** - Express API server
- **`@specforge/worker`** - Background job processor
- **`@specforge/shared`** - Shared TypeScript types and utilities

## 🏗️ Key Features Explained

### Export System

- Generate exports in multiple formats (Markdown, JSON, ZIP)
- Background processing with status polling
- Direct download via R2 storage streaming
- Automatic filename handling

### Review Workflow

- Multi-step approval process
- Role-based permissions (Admin, PM, Dev, Reviewer)
- Version-based reviews
- Approval/rejection with comments

### AI Generation

- PRD → API Spec
- PRD → Database Schema
- API Spec → Code Scaffold
- Customizable prompts per organization

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Prisma](https://www.prisma.io/)
- UI inspired by modern product management tools
- Powered by AI models from Google Gemini and OpenAI

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

Built with ❤️ by the SpecForge team
