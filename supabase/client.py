from supabase import create_client, Client
from threading import Lock
import os
from typing import Optional

class SupabaseClient:
    _instance: Optional[Client] = None
    _lock: Lock = Lock()

    @classmethod
    def get_instance(cls) -> Client:
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:  # Double-checked locking
                    supabase_url = os.getenv("SUPABASE_URL")
                    supabase_key = os.getenv("SUPABASE_KEY")
                    if not supabase_url or not supabase_key:
                        raise ValueError("Supabase URL or Key is not set in environment variables.")
                    cls._instance = create_client(supabase_url, supabase_key)
        return cls._instance

# Dependency for FastAPI
def get_supabase_client() -> Client:
    try:
        return SupabaseClient.get_instance()
    except Exception as e:
        raise RuntimeError(f"Failed to initialize Supabase client: {e}")
