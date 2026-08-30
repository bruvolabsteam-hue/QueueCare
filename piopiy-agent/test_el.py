import asyncio
import os
from dotenv import load_dotenv
import elevenlabs
from elevenlabs.client import AsyncElevenLabs

load_dotenv()

async def test_elevenlabs():
    print("Testing ElevenLabs Voice ID...")
    try:
        client = AsyncElevenLabs(api_key=os.environ.get("ELEVENLABS_API_KEY"))
        # Test if the voice exists in the user's account by requesting voices
        response = await client.voices.get_all()
        voices = [v.voice_id for v in response.voices]
        if "21m00Tcm4TlvDq8ikWAM" in voices:
            print("Voice 21m00Tcm4TlvDq8ikWAM (Rachel) is available!")
        else:
            print("Voice NOT found in user's available voices. Available:", voices[:5])
    except Exception as e:
        print("ElevenLabs Error:", e)

if __name__ == "__main__":
    asyncio.run(test_elevenlabs())
