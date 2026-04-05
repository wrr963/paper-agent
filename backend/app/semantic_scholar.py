import os
import requests
from typing import Dict, Any, List
from dotenv import load_dotenv

load_dotenv()

class SemanticScholarClient:
    def __init__(self):
        self.api_key = os.getenv("SEMANTIC_SCHOLAR_API_KEY")
        self.base_url = "https://api.semanticscholar.org/graph/v1"
        self.headers = {"x-api-key": self.api_key} if self.api_key and self.api_key != "your_s2_api_key_here" else {}

    def get_paper_by_title(self, title: str) -> Dict[str, Any]:
        """
        Searches Semantic Scholar by title and returns the best match with abstract and citation count.
        """
        url = f"{self.base_url}/paper/search"
        params = {
            "query": title,
            "limit": 1,
            "fields": "title,abstract,year,authors,citationCount,url,externalIds"
        }
        response = requests.get(url, headers=self.headers, params=params)
        if response.status_code == 200:
            data = response.json()
            if data.get("data"):
                return data["data"][0]
        return {}

def get_s2_client():
    return SemanticScholarClient()
