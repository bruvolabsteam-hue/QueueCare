import os
import asyncio
from dotenv import load_dotenv
from anthropic import AsyncAnthropic
from elevenlabs.client import AsyncElevenLabs
from deepgram import DeepgramClient

load_dotenv()

async def test_all():
    print("Testing Anthropic (Claude-3-Haiku)...")
    try:
        client = AsyncAnthropic(api_key=os.environ.get("CLAUDE_API_KEY"))
        msg = await client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=10,
            messages=[{"role": "user", "content": "Say hello!"}]
        )
        print("[SUCCESS] Claude Haiku is working! Reply:", msg.content[0].text)
    except Exception as e:
        print("[FAIL] Claude Haiku failed:", str(e))
        
    print("\nTesting Anthropic (Claude-3.5-Sonnet)...")
    try:
        client = AsyncAnthropic(api_key=os.environ.get("CLAUDE_API_KEY"))
        msg = await client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=10,
            messages=[{"role": "user", "content": "Say hello!"}]
        )
        print("[SUCCESS] Claude Sonnet is working! Reply:", msg.content[0].text)
    except Exception as e:
        print("[FAIL] Claude Sonnet failed:", str(e))
        
    print("\nTesting ElevenLabs...")
    try:
        el_client = AsyncElevenLabs(api_key=os.environ.get("ELEVENLABS_API_KEY"))
        # Just getting the voices list to verify auth
        voices = await el_client.voices.get_all()
        print("[SUCCESS] ElevenLabs is working! Found", len(voices.voices), "voices.")
    except Exception as e:
        print("[FAIL] ElevenLabs failed:", str(e))
        
    print("\nTesting Deepgram...")
    try:
        dg_client = DeepgramClient(os.environ.get("DEEPGRAM_API_KEY"))
        # Basic project list check (if auth works, this should not throw 401)
        res = dg_client.manage.get_projects()
        print("[SUCCESS] Deepgram is working!")
    except Exception as e:
        print("[FAIL] Deepgram failed:", str(e))

if __name__ == "__main__":
    asyncio.run(test_all())
