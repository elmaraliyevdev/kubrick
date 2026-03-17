#!/usr/bin/env python3
"""
Test OpenAI client initialization
"""
import os
import sys
sys.path.append('.')

async def test_openai_client():
    """Test OpenAI client creation"""
    print("Testing OpenAI client initialization...")
    
    api_key = os.getenv('OPENAI_API_KEY')
    print(f"API key found: {bool(api_key and api_key != 'your_openai_api_key_here')}")
    
    if not api_key or api_key == 'your_openai_api_key_here':
        print("No valid API key found")
        return
    
    try:
        from openai import AsyncOpenAI
        print("OpenAI import successful")
        
        # Test different initialization approaches
        print("1. Testing basic initialization...")
        client = AsyncOpenAI(api_key=api_key)
        print("✅ Basic initialization successful")
        
        print("2. Testing with timeout...")
        client = AsyncOpenAI(api_key=api_key, timeout=30)
        print("✅ With timeout successful")
        
        print("3. Testing minimal call...")
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Say hello"}],
            max_tokens=10
        )
        print("✅ API call successful:", response.choices[0].message.content)
        
        # Clean up
        await client.close()
        print("✅ Client cleanup successful")
        
    except Exception as e:
        print(f"❌ OpenAI client test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_openai_client())