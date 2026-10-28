# FarMeter Dashboard 🌱

A web-based management dashboard for **FarMeter**, a waste collection and recycling management platform. The dashboard is designed to help administrators and operations managers monitor pickup requests, suppliers, collectors, and collection activity through a centralized interface.

## ✨ Features

- **Management Dashboard** — A centralized interface for monitoring waste collection operations.
- **Pickup Management** — Designed to display pickup requests, their status, waste type, estimated weight, and collection details.
- **Supplier Management** — Support for viewing supplier information.
- **Collector Management** — Support for viewing collector profiles and availability.
- **Role-Based Access** — Separate access paths for operations managers and administrators.
- **Authentication** — Supabase-powered email and password authentication, with email verification planned for registration.
- **Database Integration** — Connects to an existing Supabase project to work with FarMeter's data.
- **Responsive Interface** — Built with a modern web development stack.

> **Development status:** FarMeter Dashboard is under active development. Some screens may use demonstration data while authentication, database integration, and dashboard functionality are being completed.

## 🛠️ Tech Stack

| Technology   | Purpose                           |
| ------------ | --------------------------------- |
| React        | User interface                    |
| TypeScript   | Type-safe JavaScript              |
| Vite         | Development server and build tool |
| Supabase     | Database and authentication       |
| React Router | Client-side navigation            |
| Lucide React | Icons                             |
| Recharts     | Charts and data visualization     |

## 📋 Prerequisites

Before running the project, install:

- [Node.js](https://nodejs.org/) — preferably the current LTS version
- npm, included with Node.js
- A [Supabase](https://supabase.com/) project

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd YOUR_REPOSITORY
```

Replace the repository URL and folder name with your actual GitHub repository details.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project's root directory, alongside `package.json`.

Add your existing Supabase project credentials:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Get these values from your Supabase project's dashboard and API settings.

**Security notes:**

- Use the public publishable key or legacy `anon` key.
- Never expose a Supabase `service_role` key or secret key in frontend code.
- Do not commit `.env` or other files containing secrets to GitHub.
- Ensure `.env` is listed in `.gitignore`.

### 4. Start the development server

```bash
npm run dev
```

Vite will display a local URL in the terminal, usually:

```text
http://localhost:5173
```

Open that URL in your browser.

### 5. Build for production

```bash
npm run build
```

The production-ready files will be generated in the `dist/` directory.

To preview the production build locally:

```bash
npm run preview
```

## 🗄️ Supabase Database

FarMeter Dashboard is intended to connect to the existing FarMeter Supabase project rather than create a separate database.

The current database schema includes tables such as:

- `fm_pickups` — Pickup requests and collection details.
- `fm_pickup_status_history` — Pickup status changes.
- `fm_supplier_profiles` — Supplier profiles.
- `fm_collector_profiles` — Collector profiles.
- `user_roles` — User role assignments.

Additional tables, including `pickups` and `collector_profiles`, may exist for other or earlier application flows. Confirm which tables are actively used before integrating them into the dashboard.

### Database security

- Configure Row Level Security (RLS) policies for database tables.
- Restrict administrative operations to authorized administrators.
- Verify user roles on the server/database side, not only in the frontend.
- Do not allow users to assign themselves administrator privileges.
- Use the minimum database permissions required by each role.

**Note:** The dashboard's access controls must be backed by correctly configured Supabase policies. Hiding a page or button in React is not sufficient database security.

## 📁 Project Structure

The project is organized around a React application built with Vite. The structure may evolve as development continues.

```text
FarMeter-Dashboard/
├── public/              # Static assets
├── src/
│   ├── lib/             # Shared libraries and integrations
│   ├── auth/            # Authentication components
│   ├── App.tsx          # Application entry component
│   ├── App.css          # Application styles
│   └── main.tsx         # React entry point
├── .env                 # Local environment variables (not committed)
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

The listed folders and files may change as new modules are added.

## 🧑‍💻 Development Workflow

1. Create a feature branch for new functionality.
2. Make changes and test them locally.
3. Verify the production build using `npm run build`.
4. Commit and push your changes to GitHub.
5. Review changes before merging into the main branch.

## 🗺️ Roadmap

- [ ] Complete Supabase authentication and email verification.
- [ ] Implement secure manager and administrator access.
- [ ] Connect dashboard metrics to live database data.
- [ ] Add pickup search, filtering, and status tracking.
- [ ] Complete supplier and collector management views.
- [ ] Add operational charts and reporting.
- [ ] Improve responsive layouts and error handling.
- [ ] Test database permissions and RLS policies.
- [ ] Prepare the application for production deployment.

## 🤝 Contributing

Contributions, suggestions, and bug reports are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Open a pull request describing the changes.

## 🔐 Environment and Privacy

Never publish passwords, API secret keys, access tokens, private customer information, or other sensitive data in source code, issues, commits, or screenshots.

If credentials are accidentally committed, revoke or rotate them immediately.

## 📄 License

No license has been specified yet. Unless a license is added to this repository, reuse and redistribution are not automatically permitted.

---

**FarMeter Dashboard** — A centralized interface for waste collection operations and management.
