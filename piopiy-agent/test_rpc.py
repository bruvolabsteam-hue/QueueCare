import os
import asyncio
from supabase import create_client, Client

SUPABASE_URL = "https://oddvrnamlsenvftbnzic.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kZHZybmFtbHNlbnZmdGJuemljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzE4MjMxOCwiZXhwIjoyMDk4NzU4MzE4fQ.qVeu8Bn0DiqlNWHSMuahymclP2FgPGgKyiay7_ozFKw"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

async def test():
    print("Testing RPC call with Service Role Key...")
    try:
        clinic_id = "ffe805a9-c7bb-41ec-a88e-01ebae6331f8"
        patient_name = "Vinyas"
        phone = "+918310747226"
        
        rpc_res = supabase.rpc('generate_daily_token', {
            'p_clinic_id': clinic_id,
            'p_name': patient_name,
            'p_phone': phone,
            'p_registration_method': 'walk-in',
            'p_language': 'auto',
            'p_travel_category': 'here'
        }).execute()
        
        print(f"Success! Token returned: {rpc_res.data}")
    except Exception as e:
        print(f"RPC Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
