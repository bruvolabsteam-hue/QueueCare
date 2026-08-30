import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

response = requests.get(f"{SUPABASE_URL}/rest/v1/", headers=headers)
schema = response.json()

print("Available Tables/Endpoints:")
for key in schema.get('paths', {}).keys():
    if key.startswith('/') and 'rpc' not in key:
        print("-", key)
