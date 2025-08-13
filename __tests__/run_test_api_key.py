import os
from openai import OpenAI
from openai import OpenAIError
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path="../.env")

# Initialize OpenAI client
api_key = os.getenv("OPEN_API_KEY")
if not api_key:
    print("No valid API key provided. Please set OPEN_API_KEY in your .env file.")
    exit(1)
print("API Key:", api_key)
client = OpenAI(api_key=api_key)

def list_models():
    try:
        response = client.models.list()
        print("Available models:")
        for model in response.data:
            print(f"- {model.id}")
    except OpenAIError as e:
        print(f"OpenAI error: {e}")
    except Exception as e:
        print(f"General error: {e}")

if __name__ == "__main__":
    list_models()
