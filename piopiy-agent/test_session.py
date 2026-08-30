import asyncio
import os
from agent import create_session

async def test_session():
    print("Testing create_session...")
    try:
        await create_session("dummy_agent", "dummy_call", "918792256999", "123456")
        print("Success!")
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_session())
