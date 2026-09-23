# CyberMonitor GH — OSINT Investigation & Intelligence Platform

A deep open-source intelligence (OSINT) and search application designed for broad public web investigations, entity discovery, identity validation, and domain intelligence.

---

## 1. What This Application Does

The OSINT Investigation Platform allows intelligence analysts, investigators, and researchers to perform deep, multi-stage public web searches for names, usernames, and domain names.

Rather than relying on basic keyword searches or a few predefined social sites, the platform:
- Performs broad public web discovery across blogs, developer sites, personal portfolios (e.g. `kingdev-aa.vercel.app`), news outlets, and institutional databases.
- Validates identity relevance using name matching algorithms, location signals, and affiliation checks.
- Discovers personal and official websites, extracting public details (title, description, social links, technology stack) without copying full articles.
- Conducts dedicated **Domain Investigations** with DNS lookup (A, MX, NS, TXT records), web server header analysis, technology stack detection, indexed page discovery, and domain suggestions for partial queries (e.g., `campuscart` $\rightarrow$ `campuscart.shop`).
- Groups intelligence into structured tabs and saves investigation history securely to Firebase Firestore.

---

## 2. Main Features

- **Multi-Stage Deep Search Engine**: 4-stage pipeline (Exact Identity, Platform Sweeps, Broad Web Sweeps, Deep Verification).
- **Personal & Portfolio Website Discovery**: Finds standalone developer portfolios and personal sites hosted on custom domains or services like Vercel, Netlify, and GitHub Pages.
- **Dedicated Domain Search Architecture**: Separate model, WHOIS/DNS lookup, technology stack detection, page discovery, and domain-specific tabs.
- **Partial Domain Suggestions**: Automatic domain extension probing (`.shop`, `.com`, `.store`, `.net`, `.io`) for unformatted entries.
- **Identity Cluster Matching**: Groups multi-result findings into probable public identity clusters with confidence scores and evidence checklists.
- **Tab Grouping & Categorization**: Categorizes data into Overview, Profiles, Activity, Associations, Websites, News & Mentions, and Sources.
- **Persistent Session & Notifications**: System notifications for completed investigations, rescans, and deep searches. Session persists across browser reloads.

---

## 3. Project Structure

The project follows a clean monorepo architecture:

```
osint-app/
├── frontend/             # React + Vite TypeScript Single Page Application
├── backend/              # Node.js + Express TypeScript Search & OSINT Server
├── landing-page/         # Public Marketing Web Site
├── firestore.rules       # Firebase Firestore Security Rules
├── package.json          # Root workspace scripts runner
└── README.md             # Platform Documentation
```

---

## 4. Frontend Folder

Located in `frontend/src/`:

```
frontend/src/
├── components/
│   ├── layout/           # Topbar, Sidebar, MobileNav, Layout, NotificationDropdown
│   ├── search/           # CoilingSnakeLoader, PossibleIdentitiesView, NewInvestigationForm
│   ├── ui/               # Toast, PlatformIcon, ConfidenceBadge
│   └── investigations/   # ProfileHeader, KeyInfoPanel, DomainInvestigationView, tabs/
├── context/
│   ├── NotificationContext.tsx   # Persistent in-app notifications
│   └── ThemeContext.tsx          # Dark / Light theme toggle
├── firebase/
│   ├── config.ts         # Firebase App & Auth initialization
│   ├── auth.ts           # Authentication helpers (SignIn, SignUp, SignOut)
│   └── firestore.ts      # Database CRUD for User Profiles & Investigations
├── pages/
│   ├── Dashboard/        # Hero search & recent investigation feed
│   ├── NewInvestigation/ # Search submission & identity cluster selector
│   ├── Investigation/    # Detail view for person and domain investigations
│   ├── People/           # Saved target people registry
│   ├── Sources/          # OSINT provider status & registry
│   ├── Settings/         # User profile settings & theme configuration
│   ├── Help/             # Knowledge base & user manual
│   └── Auth/             # Login & Registration page
├── routes/
│   └── ProtectedRoute.tsx # Auth protection wrapper for app routes
├── styles/               # CSS stylesheets
└── types/                # TypeScript interface definitions (investigation.ts, discovery.ts)
```

---

## 5. Backend Folder

Located in `backend/src/`:

```
backend/src/
├── controllers/
│   ├── searchController.ts           # OSINT search & rescan API endpoint handlers
│   └── usernameDiscoveryController.ts # Username availability SSE stream controller
├── routes/
│   └── searchRoutes.ts               # Express API routing table (/api/search, /api/investigations/rescan)
├── services/
│   ├── intelligence/
│   │   ├── confidenceScorer.ts       # Confidence score calculator
│   │   ├── entityAnalyzer.ts         # Identity clustering, summary & profile extraction
│   │   ├── queryGenerator.ts         # Multi-variation web query generator
│   │   ├── queryNormalizer.ts        # Input cleaning & normalization
│   │   ├── relevanceEngine.ts        # Item relevance scoring & URL validation
│   │   ├── trackingEngine.ts         # Rescan diff & change tracker
│   │   ├── urlValidator.ts           # URL normalization & domain extraction
│   │   └── usernameDiscoveryService.ts# Live platform username checker
│   └── search/
│       ├── baseProvider.ts           # Abstract base class for search providers
│       ├── deepSearchEngine.ts       # 4-Stage deep search coordinator
│       ├── domainInvestigationService.ts # Dedicated Domain OSINT & DNS engine
│       ├── domainProvider.ts         # DNS (A, MX, NS, TXT) & HTTP header provider
│       ├── githubProvider.ts         # GitHub public API provider
│       ├── platformRegistry.ts       # Registry of 30+ platform patterns
│       ├── rssWebFeedProvider.ts     # Web feed provider
│       ├── serpApiProvider.ts        # SerpApi Google Search engine interface
│       ├── socialProvider.ts         # Social platform search provider
│       ├── tieredQueryEngine.ts       # Tiered query execution strategy
│       ├── usernameProvider.ts       # Username provider
│       └── wikipediaProvider.ts     # Wikipedia / Wikidata API provider
├── types/
│   ├── discovery.ts                  # Username discovery types
│   ├── intelligence.ts               # Intelligence activity & association types
│   └── search.ts                     # Search query & result item interfaces
└── server.ts                         # Express server entry point & CORS configuration
```

---

## 6. Important Files

- `backend/src/server.ts`: Configures Express middleware, CORS, and API routes.
- `backend/src/controllers/searchController.ts`: Handles search requests, routing name/username queries to `DeepSearchEngine` and domain queries to `DomainInvestigationService`.
- `backend/src/services/search/deepSearchEngine.ts`: Coordinates multi-stage deep web sweeps for names and usernames.
- `backend/src/services/search/domainInvestigationService.ts`: Performs DNS resolution, WHOIS inspection, web tech detection, page discovery, and domain suggestions.
- `backend/src/services/intelligence/entityAnalyzer.ts`: Clusters raw search findings into structured identities and builds human-readable dossiers.
- `frontend/src/App.tsx`: Manages persistent user authentication, session state across reloads, and application routes.
- `frontend/src/components/investigations/DomainInvestigationView.tsx`: Displays domain investigations with dedicated tabs (Overview, Website, Domain, Technology, Pages, News, Sources).

---

## 7. Authentication

Authentication is handled via Firebase Auth on the frontend (`frontend/src/firebase/auth.ts`) with fallback for Guest/Demo access.
- User session state is stored in `localStorage` under `osint_user_session`.
- When a user refreshes the browser, `App.tsx` reads the saved session and keeps the user on their exact page/tab without redirecting to `/auth`.

---

## 8. Firebase / Firestore

Firestore is used for persistent storage:
- `users`: Stores user profile data (displayName, email, role, createdAt).
- `investigations`: Stores full investigation records associated with `createdBy: userId`.

Firestore rules (`firestore.rules`) restrict access so users can only read and write their own data.

---

## 9. Investigation System

Investigations represent saved intelligence dossiers created when a search completes.
Each investigation record includes:
- Target profile details (name, role, location, avatar).
- Results count breakdown (profiles, websites, activities, associations, sources).
- Categorized findings lists.
- Notes and audit scan history for rescans.

---

## 10. Name Search

Name investigations (e.g. `Kingsley Anaab`) execute broad web queries and platform sweeps:
1. Generates exact and contextual queries (`"Kingsley Anaab"`, `"Kingsley Anaab" portfolio OR developer`).
2. Discovers social profiles (LinkedIn, GitHub, Twitter) and personal websites (`kingdev-aa.vercel.app`).
3. Evaluates relevance using name token matching and location signals.
4. Categorizes findings into Profiles, Websites, Activity, Associations, News, and Sources.

---

## 11. Username Search

Username investigations (e.g. `@developer` or `user123`) perform deep cross-platform sweeps:
1. Generates clean username variations (exact, lowercase, dot, underscore, hyphen, trailing numbers).
2. Probes platform APIs and web search indices for public user accounts.
3. Distinguishes confirmed profile matches from public mentions.

---

## 12. Domain Search

Domain investigations (e.g. `campuscart.shop` or partial `campuscart`) use a dedicated Domain Investigation Architecture:
1. Probes common TLDs (`.shop`, `.com`, `.store`, `.net`, `.io`) for unformatted entries.
2. Resolves DNS records (A, MX, NS, TXT).
3. Inspects HTTP/HTTPS headers, status codes, server software, and SSL encryption.
4. Detects web technology stack (Next.js, React, WordPress, Nginx, Cloudflare, Shopify).
5. Discovers indexed public pages (Home, About, Contact, Products, Blog, Pricing).
6. Displays data in a dedicated UI view with domain-specific tabs.

---

## 13. Search Query Generator

`backend/src/services/intelligence/queryGenerator.ts` generates optimized search strings:
- `"Target Name"`
- `"Target Name" portfolio OR "personal website" OR developer`
- `"Target Name" (site:vercel.app OR site:netlify.app OR site:github.io)`
- `"Target Name" news OR interview OR article`

---

## 14. SerpApi Integration

SerpApi (`backend/src/services/search/serpApiProvider.ts`) is the primary search engine backend interface:
- **Role**: Executes Google web searches server-side using the secret `SERPAPI_KEY`.
- **Backend Only**: Never called directly from the frontend to keep API keys secure.
- **Output**: Returns organic search results, titles, snippets, and page URLs.

---

## 15. Other APIs and Data Sources

| Source | What It Provides | Used For |
| :--- | :--- | :--- |
| **SerpApi** | Public Google search results & indexed pages | Broad web, news, and profile discovery |
| **Node.js DNS (`dns.promises`)** | A, MX, NS, TXT DNS records | Domain IP addresses, mail servers, nameservers |
| **HTTP Inspection (`https`/`http`)** | Headers, status codes, HTML metadata | Server software, SSL verification, page titles |
| **GitHub REST API** | Public developer profiles & repositories | Developer profile verification |
| **Wikipedia API** | Knowledge base articles & summaries | Public figure background information |
| **Firebase Auth & Firestore** | Authentication & database storage | User accounts & persistent investigations |

---

## 16. Result Filtering

`backend/src/services/intelligence/relevanceEngine.ts` filters search noise:
- Validates URLs and extracts clean canonical domains.
- Scores items based on target name match, domain authority, and snippet context.
- Rejects generic search directory pages, broken links, and unrelated names.

---

## 17. Identity Matching

`backend/src/services/intelligence/entityAnalyzer.ts` evaluates identity relevance:
- Evaluates name token overlap (exact phrase match vs partial token match).
- Checks location and organization alignment.
- Generates evidence checklists (Matching name, Matching location, Matching organization, Matching username).

---

## 18. Result Deduplication

`backend/src/services/intelligence/urlValidator.ts` normalizes URLs (removing tracking parameters, trailing slashes, and protocol variations) to ensure identical pages are never duplicated across tabs.

---

## 19. Information Extraction

When a webpage or personal site is discovered, the backend extracts:
- Page Title and Meta Description.
- Detected Brand Name and Category.
- Public Contact or Social Links mentioned in HTML metadata.
- Technology signatures (frameworks, web servers, analytics).

---

## 20. AI Summary Generation

`EntityAnalyzer.generatePersonSummary` and `DomainInvestigationService.generateDomainSummary` synthesize raw facts into structured, human-readable executive summaries.

---

## 21. Tab Classification

Findings are categorized based on item type and domain analysis:
- **Profiles**: Verified social and professional user accounts (LinkedIn, GitHub, Twitter).
- **Websites**: Standalone personal portfolios, official sites, and developer homepages.
- **Activity**: Published articles, posts, videos, and media appearances.
- **Associations**: Companies, universities, and public affiliations.
- **News**: Press mentions and news articles.
- **Sources**: Supporting evidence citations.

---

## 22. Firestore Data Flow

```
Frontend Search Request ──> Backend Search Pipeline ──> Formatted Investigation Object ──> Firestore Database ──> Saved Feed
```

---

## 23. Search Flow

```
User Input ──> Frontend API Request ──> Backend Controller ──> DeepSearchEngine ──> SerpApi / Providers ──> Relevance Engine ──> Entity Analyzer ──> Frontend Response
```

---

## 24. Domain Investigation Flow

```
Domain Input ──> SearchController ──> DomainInvestigationService ──> DNS Lookup + HTTP Probing ──> SerpApi Page Discovery ──> Tech Stack Detection ──> DomainInvestigationView
```

---

## 25. Security

- Private API keys (`SERPAPI_KEY`, `GITHUB_TOKEN`) are kept strictly on the backend in `backend/.env`.
- CORS is configured in `backend/src/server.ts` to only allow authorized frontend origins.
- Firestore Security Rules enforce document-level ownership (`request.auth.uid == userId`).

---

## 26. Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
SERPAPI_KEY=your_serpapi_key_here
GITHUB_TOKEN=optional_github_token
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000/api
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

## 27. Error Handling

- API errors return clean JSON responses (`{ error: "Description" }`).
- Search timeouts fallback gracefully without crashing the application.
- UI displays distinct states for **No results found** vs **Search failed**.

---

## 28. Data Persistence

User investigations and notes are stored in Firebase Firestore and cached in `sessionStorage` / `localStorage` to preserve state across browser reloads.

---

## 29. How to Run the Application

### Option A: Run Entire Platform (Root Workspace)
```bash
npm install
npm run dev
```

### Option B: Run Individually
```bash
# Terminal 1: Backend Server
cd backend
npm install
npm run dev

# Terminal 2: Frontend Application
cd frontend
npm install
npm run dev
```

The frontend will run at `http://localhost:5173` and the backend at `http://localhost:5000`.

---

## 30. How to Add a New Search Provider

1. Create a new provider class in `backend/src/services/search/MyProvider.ts` extending `BaseSearchProvider`.
2. Implement the `search(query: OSINTQuery): Promise<NormalizedResultItem[]>` method.
3. Register the provider in `backend/src/controllers/searchController.ts`.

---

## 31. Known Limitations

- Domain WHOIS registration dates rely on DNS records and public search indices when direct WHOIS port 43 is blocked by network firewalls.
- Rate limits apply based on configured SerpApi key quotas.

---

## 32. Future Improvements

- Additional breach database checking services.
- Real-time PDF report export with custom branding.
- Enhanced graph visualizer for identity associations.
#   O S I N T - A P P  
 