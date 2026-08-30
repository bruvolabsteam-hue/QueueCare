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

response = requests.get(f"{SUPABASE_URL}/rest/v1/?apikey={SUPABASE_KEY}")
schema = response.json()

defs = schema.get("definitions", {})
print("Staff table columns:", list(defs.get("staff", {}).get("properties", {}).keys()))
print("Doctor Daily Settings columns:", list(defs.get("doctor_daily_settings", {}).get("properties", {}).keys()))
print("Clinics columns:", list(defs.get("clinics", {}).get("properties", {}).keys()))
