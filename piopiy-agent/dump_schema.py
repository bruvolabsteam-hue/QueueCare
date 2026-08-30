import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_ANON_KEY")

response = requests.get(f"{url}/rest/v1/?apikey={key}")
with open("schema.json", "w") as f:
    json.dump(response.json(), f, indent=2)
