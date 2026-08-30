"""Check the actual schema of the clinics table"""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Try to get column info by inserting just an ID
print("Testing with just id...")
try:
    res = supabase.table('clinics').upsert({'id': 'ffe805a9-c7bb-41ec-a88e-01ebae6331f8'}).execute()
    print(f"Success with just id: {res.data}")
except Exception as e:
    print(f"Error: {e}")

# Check what columns the RPC expects
print("\nChecking RPC generate_daily_token...")
try:
    res = supabase.rpc('generate_daily_token', {
        'p_clinic_id': 'ffe805a9-c7bb-41ec-a88e-01ebae6331f8',
        'p_name': 'Test',
        'p_phone': '+911234567890',
        'p_registration_method': 'walk_in'
    }).execute()
    print(f"RPC result: {res.data}")
except Exception as e:
    print(f"RPC error: {e}")

# Try selecting from information_schema  
print("\nChecking columns via RPC...")
try:
    res = supabase.rpc('get_table_columns', {'table_name': 'clinics'}).execute()
    print(f"Columns: {res.data}")
except Exception as e:
    # Try raw SQL approach
    print(f"Could not get columns via RPC: {e}")

# Just try inserting with different common column names
for col_name in ['clinic_name', 'title', 'display_name', 'label']:
    try:
        res = supabase.table('clinics').upsert({
            'id': 'ffe805a9-c7bb-41ec-a88e-01ebae6331f8',
            col_name: 'Bruvoflow Clinic'
        }).execute()
        print(f"Success with column '{col_name}': {res.data}")
        break
    except Exception as e:
        if 'Could not find' in str(e):
            print(f"Column '{col_name}' does not exist")
        else:
            print(f"Column '{col_name}' error: {e}")
