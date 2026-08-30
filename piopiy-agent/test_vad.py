import asyncio
from piopiy.voice_agent import VoiceAgent
from piopiy.services.deepgram.stt import DeepgramSTTService
from piopiy.services.anthropic.llm import AnthropicLLMService
from piopiy.services.elevenlabs.tts import ElevenLabsTTSService

async def test_vad():
    agent = VoiceAgent(instructions="hi", greeting="hello")
    stt = DeepgramSTTService(api_key="dummy")
    llm = AnthropicLLMService(api_key="dummy", model="dummy")
    tts = ElevenLabsTTSService(api_key="dummy", voice_id="dummy")
    
    print("Trying to run Action with vad=True...")
    try:
        await agent.Action(stt=stt, llm=llm, tts=tts, vad=True)
        print("Success!")
    except Exception as e:
        print("Exception:", str(e))

asyncio.run(test_vad())
