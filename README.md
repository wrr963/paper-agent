# Paper Agent

Knowledge management system for academic research papers. Upload PDFs, extract structured insights with AI, visualize citation networks, and search for related work — all in one place.

## Features

- **PDF Upload & Analysis** — Extract methodology, novelty, limitations, and keywords from papers using Gemini
- **Batch Upload** — Process multiple PDFs in a single request
- **Knowledge Graph** — Force-directed visualization of citation networks and paper relationships
- **Paper Search** — Find related papers via Semantic Scholar and OpenAlex (both free, no key required for basic use)
- **Abstract Translation** — Translate English abstracts to Japanese with Gemini
- **Semantic Relations** — Auto-detect relationships between papers based on shared keywords and methodologies
- **Survey Matrix** — Side-by-side comparison of papers by methodology, novelty, and limitations
- **Bilingual UI** — Japanese / English interface

## Architecture

```
paper-agent/
├── backend/    FastAPI + SQLAlchemy (SQLite) + Gemini
├── frontend/   Next.js 16 (App Router), Tailwind CSS v4
└── docker-compose.yml  (optional Neo4j + PostgreSQL services)
```

The frontend communicates with the backend over HTTP. Default ports: frontend `3000`, backend `8000`.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI 0.110, Uvicorn |
| AI | Google Gemini API (`google-generativeai`) |
| PDF Parsing | PyMuPDF (fitz), PyPDF |
| Database | SQLite via SQLAlchemy 2 (default) |
| External Search | Semantic Scholar API, OpenAlex API |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Graph Visualization | Force-Graph 2D/3D, Framer Motion |

## Prerequisites

- Python 3.10+
- Node.js 18+
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

## Getting Started

### Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# → Edit .env and set your GOOGLE_API_KEY

# Start the API server
uvicorn app.main:app --reload
```

The API will be available at [http://localhost:8000](http://localhost:8000).

### Frontend

```bash
cd frontend

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create `backend/.env` from `backend/.env.example`:

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_API_KEY` | Yes | Google Gemini API key |
| `DATABASE_URL` | No | SQLAlchemy DB URL. Defaults to `sqlite:///./paper_agent.db` |
| `SEMANTIC_SCHOLAR_API_KEY` | No | Increases Semantic Scholar rate limits |
| `PINECONE_API_KEY` | No | Enables vector-similarity search (optional feature) |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/upload` | Upload and analyze a single PDF |
| `POST` | `/upload-batch` | Upload and analyze multiple PDFs |
| `GET` | `/papers/{paper_id}` | Retrieve paper details |
| `POST` | `/find-relations` | Find semantic connections between papers |
| `POST` | `/analyze-abstract` | Analyze an abstract without a PDF |
| `POST` | `/translate` | Translate abstract to Japanese or generate summary |
| `GET` | `/search-papers` | Search for papers via Semantic Scholar / OpenAlex |
| `GET` | `/graph` | Return citation network graph data |

## Project Structure

```
backend/
├── app/
│   ├── main.py               # FastAPI app and route definitions
│   ├── llm_pipeline.py       # Gemini prompts and response parsing
│   ├── pdf_parser.py         # PDF text and metadata extraction
│   ├── database.py           # SQLAlchemy models and CRUD helpers
│   ├── semantic_scholar.py   # Semantic Scholar / OpenAlex API client
│   ├── neo4j_client.py       # (Optional) Neo4j citation graph client
│   └── pinecone_client.py    # (Optional) Pinecone vector search client
└── requirements.txt

frontend/
└── src/
    ├── app/
    │   └── page.tsx          # Main UI
    └── components/
        ├── CitationGraph.tsx  # Force-Graph visualization
        └── SurveyMatrix.tsx   # Paper comparison matrix
```

## Optional: Docker Services

A `docker-compose.yml` is included for running Neo4j and PostgreSQL locally if you need graph database or relational storage beyond SQLite:

```bash
docker compose up -d
```

Then set `DATABASE_URL` and `NEO4J_*` variables in `backend/.env` accordingly.
