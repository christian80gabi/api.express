<div align="center">
  <img src="./public/logo.svg" alt="log">
</div>

# iContribute.ts
*A tiny **Express + TypeScript** server that returns the list of people who have contributed to this repository.*

> ⚡️ **Why?**  
> A quick, self‑documenting endpoint that anyone can call to see *who* made the project possible – no external services required.

---

## 🚀 Quick start

```bash
# 1️⃣ Clone & install
git clone https://github.com/christian80gabi/icontributors.ts.git
cd icontributors.ts
pnpm i          # or yarn install / npm i

# 2️⃣ Run locally (dev mode)
pnpm run dev    # opens http://localhost:3000

# 3️⃣ Call the API
curl http://localhost:3000/api/contributors
```

---

## 📦 Features

| Feature               | Description                                                                     | Status       |
|-----------------------|---------------------------------------------------------------------------------|--------------|
| **Git‑derived list**  | Reads the commit history (`git log`) and extracts *author* names & emails.      | ✅ Done      |
| **Custom entries**    | Add your own record by committing a JSON file in `contributors/your-name.json`. | 🔜 Upcoming  |
| **Docker‑ready**      | Quick container build for production.                                           | 🔜 Upcoming  |

---

## 📖 Overview

The server exposes a single endpoint:

```
GET /api/contributors
```

Response format (JSON array):

```json
[
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "avatar": "https://github.com/janedoe.png",
    "role": "Maintainer"
  },
  ...
]
```

*The `avatar` URL is built from the GitHub username when available.*

You can add your own data by creating a file under the **contributors/** folder and committing it.  
Example:

```json
// contributors/alex.json
{
  "name": "Alex Smith",
  "email": "alex@foo.bar",
  "avatar": "https://example.com/alex.png",
  "role": "Contributor"
}
```

When you push, the API will pick up the new entry automatically.

---

## 📦 Installation

```bash
# Clone repo
git clone https://github.com/you/icontributors.ts.git
cd icontributors.ts

# Install deps (Node ≥ 20)
npm i            # or yarn install / pnpm i

# Build TypeScript sources
npm run build
```

### 🐳 Docker

Build the image:

```bash
docker build -t icontribute-ts .
```

Run it (default listens on 3000):

```bash
docker run -p 3000:3000 icontribute-ts
```

---

## 📦 Usage

### API Call

```bash
curl http://localhost:3000/api/contributors
# or with fetch in JS:
fetch('/api/contributors').then(r => r.json()).then(console.log)
```

### Adding a custom contributor

1. Create `contributors/<your-name>.json` (see example above).  
2. Commit & push:

```bash
git add contributors/alex.json
git commit -m "Add Alex Smith"
git push origin main
```

The API will now include the new record on next request.

---

## 🛠️ Development

| Task | Command |
|------|---------|
| Start dev server (watch mode) | `pnpm run dev` |
| Run tests | `pnpm test` |
| Lint code | `pnpm run lint` |
| Generate the contributor list | `pnpm run collect:contributors` |

### Project structure

```
├─ src/
│  ├─ index.ts        # Express routes
│  ├─ git.ts          # Git log parser
│  └─ contributors.ts # Contributors Controller
├─ contributors/      # Contributor JSON files
└─ tests/             # Jest unit tests
```

---

## 🤝 Contributing

We welcome PRs that:

- Add new fields to the contributor schema
- Improve Git parsing or caching.
- Enhance Docker setup / CI.

Please follow these steps:

1. Fork → clone → create feature branch (`feat/add-field`).  
2. Run tests locally: `npm test`.  
3. Submit a PR with clear description and any relevant docs updates.

--- 

## Miscellaneous

### Using Vercel-cli

To develop locally:

```
npm install
vc dev
```

```
open http://localhost:3000
```

To build locally:

```
npm install
vc build
```

To deploy:

```
npm install
vc deploy
```
---

## 📄 License

Mozilla Public License Version 2.0 © 2025 [christian80gabi](https://christian80gabi.com) – see the full license in the [LICENSE](LICENSE) file.

---

> **Need help?** Open an issue or drop a message on the repo’s discussion page. Happy coding! 🚀
