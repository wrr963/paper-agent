import os
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv()

class VectorDBClient:
    def __init__(self):
        api_key = os.getenv("PINECONE_API_KEY")
        if not api_key or api_key == "your_pinecone_api_key_here":
            self.pc = None
            print("Pinecone API key not found. Vector DB features are disabled.")
        else:
            self.pc = Pinecone(api_key=api_key)
            self.index_name = "paper-index"
    
    def get_index(self):
        if self.pc:
            return self.pc.Index(self.index_name)
        return None

def get_vector_db():
    return VectorDBClient()
