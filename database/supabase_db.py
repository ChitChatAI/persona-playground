from typing import Optional, List
from ..supabase.client import get_supabase_client

def insert_data(table: str, data: dict) -> Optional[dict]:
    try:
        response = get_supabase_client().table(table).insert(data).execute()
        return response
    except Exception as e:
        print(f"Error inserting data: {e}")
        return None

def get_data(table: str, filters: dict = {}) -> Optional[List[dict]]:
    try:
        query = get_supabase_client().table(table).select("*")
        for key, value in filters.items():
            query = query.eq(key, value)
        response = query.execute()
        return response.get("data", [])
    except Exception as e:
        print(f"Error retrieving data: {e}")
        return None

def delete_data(table: str, filters: dict) -> Optional[dict]:
    try:
        query = get_supabase_client().table(table)
        for key, value in filters.items():
            query = query.eq(key, value)
        response = query.delete().execute()
        return response
    except Exception as e:
        print(f"Error deleting data: {e}")
        return None
