import os
import httpx
from typing import List
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv

load_dotenv()

from .database import get_db
from .pdf_parser import get_pdf_parser, PDFParser
from .llm_pipeline import get_llm_pipeline, LLMPipeline

app = FastAPI(
    title="Paper Agent API",
    description="Backend API for the Paper Trail Agent Knowledge Base",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Paper Agent API"}

@app.post("/upload")
async def upload_paper(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    parser: PDFParser = Depends(get_pdf_parser),
    llm: LLMPipeline = Depends(get_llm_pipeline)
):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    file_path = f"/tmp/{file.filename}"
    os.makedirs("/tmp", exist_ok=True)
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
        
    try:
        text = parser.extract_text(file_path)
        metadata = parser.extract_metadata(file_path)
        analysis = llm.analyze_paper_text(text)
        
        return {
            "filename": file.filename,
            "metadata": metadata,
            "analysis": analysis
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

@app.post("/upload-batch")
async def upload_papers_batch(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    parser: PDFParser = Depends(get_pdf_parser),
    llm: LLMPipeline = Depends(get_llm_pipeline)
):
    """
    Upload multiple PDFs at once. Returns an array of results.
    """
    results = []
    for file in files:
        if not file.filename.endswith('.pdf'):
            results.append({"filename": file.filename, "error": "Not a PDF file"})
            continue
        
        file_path = f"/tmp/{file.filename}"
        os.makedirs("/tmp", exist_ok=True)
        
        try:
            with open(file_path, "wb") as f:
                content = await file.read()
                f.write(content)
            
            text = parser.extract_text(file_path)
            metadata = parser.extract_metadata(file_path)
            analysis = llm.analyze_paper_text(text)
            
            results.append({
                "filename": file.filename,
                "metadata": metadata,
                "analysis": analysis
            })
        except Exception as e:
            results.append({"filename": file.filename, "error": str(e)})
        finally:
            if os.path.exists(file_path):
                os.remove(file_path)
    
    return {"results": results}

@app.get("/papers/{paper_id}")
async def get_paper(paper_id: int):
    pass

@app.post("/find-relations")
async def find_relations(
    payload: dict,
    llm: LLMPipeline = Depends(get_llm_pipeline)
):
    new_paper = payload.get("new_paper", {})
    existing_papers = payload.get("existing_papers", [])
    relations = llm.find_relations(new_paper, existing_papers)
    return {"relations": relations}

@app.post("/analyze-abstract")
async def analyze_abstract(
    payload: dict,
    llm: LLMPipeline = Depends(get_llm_pipeline)
):
    """
    Analyze a short abstract text to extract method, novelty, limitations, keywords.
    Used for importing papers from external search results (no PDF needed).
    """
    abstract = payload.get("abstract", "")
    title = payload.get("title", "")
    text = f"Title: {title}\n\nAbstract: {abstract}" if abstract else f"Title: {title}"
    analysis = llm.analyze_paper_text(text)
    return {"analysis": analysis}

@app.post("/translate")
async def translate_text(
    payload: dict,
    llm: LLMPipeline = Depends(get_llm_pipeline)
):
    """
    Translates English abstract/text to Japanese on the fly.
    If text is empty, relies on title and authors to generate an artificial summary.
    """
    text = payload.get("text", "")
    title = payload.get("title", "")
    authors = payload.get("authors", "")
    
    if not text:
        # Fallback to LLM world knowledge
        summary = llm.generate_summary_from_title(title, authors)
        return {"translatedText": summary}
        
    translated = llm.translate_abstract_to_ja(text)
    return {"translatedText": translated}

@app.get("/search-papers")
async def search_papers(
    query: str = Query(..., description="Search query (keyword, title, or topic)"),
    limit: int = Query(10, ge=1, le=20)
):
    """
    Search for related papers using Semantic Scholar API (free, no key required for basic usage).
    Falls back to OpenAlex if Semantic Scholar fails.
    """
    papers = await _search_semantic_scholar(query, limit)
    if not papers:
        papers = await _search_openalex(query, limit)
    return {"results": papers, "source": "semantic_scholar" if papers else "none"}

async def _search_semantic_scholar(query: str, limit: int) -> list:
    """Search Semantic Scholar API (free tier, no API key needed)."""
    url = "https://api.semanticscholar.org/graph/v1/paper/search"
    params = {
        "query": query,
        "limit": limit,
        "fields": "title,abstract,year,authors,citationCount,url,externalIds"
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code != 200:
                print(f"Semantic Scholar API error: {resp.status_code}")
                return []
            data = resp.json()
            results = []
            for p in data.get("data", []):
                authors = ", ".join([a.get("name","") for a in (p.get("authors") or [])[:3]])
                if len((p.get("authors") or [])) > 3:
                    authors += " et al."
                
                # Build external link
                ext_ids = p.get("externalIds", {}) or {}
                doi = ext_ids.get("DOI")
                arxiv = ext_ids.get("ArXiv")
                link = p.get("url", "")
                if doi:
                    link = f"https://doi.org/{doi}"
                elif arxiv:
                    link = f"https://arxiv.org/abs/{arxiv}"
                
                results.append({
                    "title": p.get("title", ""),
                    "abstract": p.get("abstract") or "",
                    "year": p.get("year"),
                    "authors": authors,
                    "citations": p.get("citationCount", 0),
                    "url": link
                })
            return results
    except Exception as e:
        print(f"Semantic Scholar search failed: {e}")
        return []

async def _search_openalex(query: str, limit: int) -> list:
    """Fallback search using OpenAlex API (completely free, no key)."""
    url = "https://api.openalex.org/works"
    params = {
        "search": query,
        "per_page": limit,
        "select": "title,publication_year,authorships,cited_by_count,doi"
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code != 200:
                return []
            data = resp.json()
            results = []
            for w in data.get("results", []):
                authors_raw = w.get("authorships", [])
                authors = ", ".join([a.get("author",{}).get("display_name","") for a in authors_raw[:3]])
                if len(authors_raw) > 3:
                    authors += " et al."
                results.append({
                    "title": w.get("title", ""),
                    "abstract": "",
                    "year": w.get("publication_year"),
                    "authors": authors,
                    "citations": w.get("cited_by_count", 0),
                    "url": w.get("doi") or ""
                })
            return results
    except Exception as e:
        print(f"OpenAlex search failed: {e}")
        return []

@app.get("/graph")
async def get_citation_graph():
    pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
