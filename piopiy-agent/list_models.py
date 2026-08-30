import os
import asyncio
from dotenv import load_dotenv
from anthropic import AsyncAnthropic

load_dotenv()

async def list_models():
    client = AsyncAnthropic(api_key=os.environ.get("CLAUDE_API_KEY"))
    try:
        models = await client.models.list()
        print("Available models:")
        for m in models.data:
            print("-", m.id)
    except Exception as e:
        print("Failed to list models:", str(e))

if __name__ == "__main__":
    asyncio.run(list_models())
