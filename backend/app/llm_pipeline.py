import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

class LLMPipeline:
    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key or api_key == "your_gemini_api_key_here":
            print("Warning: GOOGLE_API_KEY not set. LLM features will fail.")
            self.model = None
        else:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel("gemini-2.5-flash")

    def analyze_paper_text(self, text: str) -> dict:
        """
        Extracts novelty, limitations, method, AND keywords from the paper text.
        Keywords are used for semantic link generation between papers.
        """
        if not self.model:
            return {"error": "LLM not initialized"}
        
        try:
            safe_text = text[:30000] 
            
            prompt = (
                "You are an expert academic researcher. Read the following paper text and extract:\n"
                "1. The core methodology (method)\n"
                "2. The core novelty\n"
                "3. The limitations\n"
                "4. 5-10 key technical terms/concepts that characterize this paper (keywords)\n\n"
                "Summarize method, novelty, and limitations in Japanese.\n"
                "For keywords, use English technical terms that would be shared across related papers "
                "(e.g. 'transformer', 'attention mechanism', 'reinforcement learning', 'GAN', 'CNN', "
                "'natural language processing', 'computer vision', 'optimization', 'pre-training', etc.).\n\n"
                "Respond strictly with a valid JSON object matching exactly this format:\n"
                '{\"method\": \"...\", \"novelty\": \"...\", \"limitations\": \"...\", \"keywords\": [\"term1\", \"term2\", ...]}\n\n'
                "Do not output markdown code blocks or any other text, just raw JSON.\n\n"
                f"Paper Text:\n\n{safe_text}"
            )
            
            response = self.model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(temperature=0)
            )
            raw_json = response.text.replace("```json", "").replace("```", "").strip()
            return json.loads(raw_json)
        except Exception as e:
            return {"error": str(e)}

    def find_relations(self, new_paper: dict, existing_papers: list) -> list:
        """
        Given a newly uploaded paper and a list of existing papers (each with keywords, title, method),
        uses LLM to determine which existing papers have genuine semantic connections.
        Returns a list of { target_id, label, strength } for papers that are truly related.
        """
        if not self.model or not existing_papers:
            return []
        
        try:
            # Build a compact summary of existing papers for the LLM
            existing_summaries = []
            for p in existing_papers:
                kw = ", ".join(p.get("keywords", [])) if p.get("keywords") else "N/A"
                existing_summaries.append(
                    f'  - ID: "{p["id"]}", Title: "{p.get("title","Untitled")}", '
                    f'Keywords: [{kw}], Method: "{p.get("method","N/A")}"'
                )
            existing_block = "\n".join(existing_summaries)
            
            new_kw = ", ".join(new_paper.get("keywords", [])) if new_paper.get("keywords") else "N/A"
            
            prompt = (
                "You are an academic expert. A new paper has been added to a research library.\n"
                "Determine which of the existing papers have GENUINE semantic connections "
                "to this new paper based on shared methodology, domain, techniques, or research topic.\n\n"
                "IMPORTANT RULES:\n"
                "- Only connect papers that share specific technical concepts, methodologies, or domains.\n"
                "- Do NOT connect papers that are in completely different fields.\n"
                "- If no existing paper is related, return an empty array [].\n"
                "- For each connection, provide:\n"
                "  - target_id: the ID of the related existing paper\n"
                "  - label: a short Japanese description of the relationship (e.g. '同一の手法を使用', '比較対象', '手法を拡張', '同一研究領域')\n"
                "  - strength: 1-5 integer (5=very strong connection, 1=weak/tangential)\n"
                "  - relation_type: one of ['similarity', 'difference', 'extension', 'baseline', 'neutral']\n"
                "  - reason: a concise Japanese sentence explaining specifically what is similar or different.\n\n"
                f"NEW PAPER:\n"
                f'  Title: "{new_paper.get("title","Untitled")}"\n'
                f"  Keywords: [{new_kw}]\n"
                f'  Method: "{new_paper.get("method","N/A")}"\n\n'
                f"EXISTING PAPERS:\n{existing_block}\n\n"
                "Respond strictly with a JSON array. Example: "
                '[{"target_id": "usr_123", "label": "同一の手法を使用", "strength": 4, "relation_type": "similarity", "reason": "両論文ともTransformerベースのアテンション機構を採用しているため。"}]\n'
                "If no relations exist, respond with: []\n"
                "Do not output markdown code blocks or any other text, just raw JSON array."
            )
            
            response = self.model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(temperature=0)
            )
            raw = response.text.replace("```json", "").replace("```", "").strip()
            relations = json.loads(raw)
            
            # Validate: only keep relations pointing to valid existing IDs
            valid_ids = {p["id"] for p in existing_papers}
            return [r for r in relations if r.get("target_id") in valid_ids]
        except Exception as e:
            print(f"find_relations error: {e}")
            return []

    def translate_abstract_to_ja(self, abstract: str) -> str:
        """
        Translates an academic abstract to Japanese and summarizes it gently.
        """
        if not self.model or not abstract:
            return ""
        try:
            prompt = (
                "You are an expert academic translator. Translate and summarize the following academic abstract into clear, professional Japanese.\n"
                "Make it easy to read, highlighting the core problem, proposed method, and results if present. Do NOT include any English remaining unless it's a specific technical term.\n\n"
                f"Abstract:\n{abstract}"
            )
            response = self.model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(temperature=0)
            )
            return response.text.strip()
        except Exception as e:
            print(f"translate_abstract_to_ja error: {e}")
            return "翻訳中にエラーが発生しました。"

    def generate_summary_from_title(self, title: str, authors: str) -> str:
        """
        Uses LLM's world knowledge to generate a summary when abstract is missing.
        """
        if not self.model or not title:
            return "概要データが提供されておらず、タイトル情報も不足しています。"
        try:
            prompt = (
                "You are an expert academic AI assistant. The user wants to know the summary of the following academic paper, but the abstract is missing from the database.\n"
                f"Title: {title}\n"
                f"Authors: {authors}\n\n"
                "Based on your extensive training data, please generate a highly accurate and concise summary of this paper IN JAPANESE.\n"
                "Detail what it proposes, its core methodology, and main contributions.\n"
                "If you are not certain about this exact paper, generate a highly educated guess on what it is likely about, "
                "BUT clearly state at the beginning: '※データベースに概要がなく、AIによる推測要約を含みます。'."
            )
            response = self.model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(temperature=0)
            )
            return response.text.strip()
        except Exception as e:
            print(f"generate_summary_from_title error: {e}")
            return "要約の生成に失敗しました。"

    def analyze_citation_context(self, text_chunk: str, cited_paper_title: str) -> str:
        if not self.model:
            return "LLM not initialized"
        try:
            prompt = f"Analyze the citation context. Why did the author cite '{cited_paper_title}' in the following text? (e.g. Used as baseline, Improved upon, General background). Keep it very brief.\n\nText Context:\n\n{text_chunk}"
            response = self.model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(temperature=0)
            )
            return response.text
        except Exception as e:
            return str(e)

def get_llm_pipeline():
    return LLMPipeline()
