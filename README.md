# Scrave

**One API call. Pixel-perfect output. Zero infrastructure.**

Scrave is a developer-first SaaS API that provides high-quality screenshot (PNG/JPEG) and PDF generation from any public URL. Built on headless Chromium (Playwright), it offers a simple REST API, API key authentication, and built-in rate limiting and quotas.

## Features

- **Screenshot API**: Capture full-page or specific viewport screenshots of any public URL.
- **PDF Generation**: Turn HTML pages into formatted PDFs (A4, Letter, custom margins).
- **Zero Infrastructure**: We manage the headless browsers (Playwright); you just send a URL.
- **Developer-First Auth**: Secure hash-based API key authentication.
- **Reliable Architecture**: Built-in concurrency pools, crash recovery, and SSRF protection.

---

## Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- Playwright browsers installed locally.

### 2. Installation

Clone the repo and install dependencies:

```bash
git clone https://github.com/your-username/Scrave.git
cd Scrave
npm install
```

### 3. Setup Environment

Create your environment file:
```bash
cp .env.example .env
```
*(Update `.env` with a secure `JWT_SECRET` and Stripe keys if enabling billing.)*

### 4. Install Browsers
Scrave requires Playwright's Chromium binary to render pages:
```bash
npx playwright install chromium
```

### 5. Run the Server
```bash
npm start
```
The API will be available at `http://localhost:3000`.

---

## API Summary

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/v1/health` | No | System health check |
| `POST` | `/auth/register` | No | Create account & get API key |
| `POST` | `/auth/login` | No | Login to manage keys |
| `POST` | `/api/v1/screenshot` | **Yes** (`x-api-key`) | Capture URL as image |
| `POST` | `/api/v1/pdf` | **Yes** (`x-api-key`) | Generate PDF from URL |
| `GET` | `/api/v1/usage` | **Yes** (`x-api-key`) | Check tier limits & usage |

---

## Testing

Run the full Jest test suite containing unit tests covering validation, authentication, usage services, and more:

```bash
npm test
```

For integration tests specifically:
```bash
npm run test:integration
```

---

## Documentation

Comprehensive documentation lives in the `/docs` folder:
1. [ABOUT_SCRAVE.md](./docs/ABOUT_SCRAVE.md) - Full product and feature guide
2. [PRD.md](./docs/PRD.md) - Product Requirements Specification
3. [DESIGN_AND_ARCHITECTURE.md](./docs/DESIGN_AND_ARCHITECTURE.md) - Architectural specs and DB diagrams
4. [TEST_CASES.md](./docs/TEST_CASES.md) - Detailed test matrices

---

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to set up for active development, linting, and submitting pull requests.

## License
ISC
