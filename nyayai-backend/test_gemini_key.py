import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")
print(f"Testing API Key: {api_key[:10]}...{api_key[-5:] if api_key else ''}")

if not api_key or "REPLACE" in api_key:
    print("Error: GOOGLE_API_KEY is not set correctly in .env file.")
    exit(1)

genai.configure(api_key=api_key)

try:
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content("Say 'Gemini is working!'")
    print("\nSuccess! Response from Gemini:")
    print(response.text)
except Exception as e:
    print("\nError: Gemini API call failed.")
    print(str(e))
    exit(1)
