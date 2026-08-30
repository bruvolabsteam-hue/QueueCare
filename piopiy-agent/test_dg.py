import asyncio
import os
from dotenv import load_dotenv
from deepgram import DeepgramClient, LiveOptions

load_dotenv()

async def test_deepgram():
    print("Testing Deepgram Connection...")
    for lang in ["multi", "en-IN"]:
        try:
            dg_client = DeepgramClient(os.environ.get("DEEPGRAM_API_KEY"))
            options = LiveOptions(
                model="nova-2",
                language=lang
            )
            dg_connection = dg_client.listen.websocket.v("1")
            if dg_connection.start(options):
                print(f"Successfully connected with language={lang}")
                dg_connection.finish()
            else:
                print(f"Failed with language={lang}")
        except Exception as e:
            print(f"Deepgram Error with {lang}:", e)

if __name__ == "__main__":
    asyncio.run(test_deepgram())
