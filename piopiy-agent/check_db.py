"""Quick script to check and setup the Supabase database for Bruvoflow"""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("=" * 50)
print("CHECKING BRUVOFLOW DATABASE")
print("=" * 50)

# Check clinics table
try:
    res = supabase.table('clinics').select('*').execute()
    print(f"\nClinics table: {len(res.data)} rows")
    for row in res.data:
        print(f"   {row}")
except Exception as e:
    print(f"Clinics error: {e}")

# Check patients table
try:
    res = supabase.table('patients').select('*').limit(5).execute()
    print(f"\nPatients table: {len(res.data)} rows (showing max 5)")
    for row in res.data:
        print(f"   {row}")
except Exception as e:
    print(f"Patients error: {e}")

# Check staff table
try:
    res = supabase.table('staff').select('*').execute()
    print(f"\nStaff table: {len(res.data)} rows")
    for row in res.data:
        print(f"   {row}")
except Exception as e:
    print(f"Staff error: {e}")

# Check doctor_daily_settings table
try:
    res = supabase.table('doctor_daily_settings').select('*').execute()
    print(f"\nDoctor Daily Settings: {len(res.data)} rows")
    for row in res.data:
        print(f"   {row}")
except Exception as e:
    print(f"Doctor Daily Settings error: {e}")

print("\n" + "=" * 50)
