import os
from dotenv import load_dotenv
from openai import OpenAI, OpenAIError

# Load environment variables
load_dotenv(dotenv_path="../.env")

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPEN_API_KEY"))

def list_models():
    try:
        response = client.models.list()
        print("Available models:")
        for model in response.data:
            print(f"- {model.id}")
    except OpenAIError as e:
        print(f"An OpenAI error occurred: {e}")
    except Exception as e:
        print(f"A general error occurred: {e}")

def test_gpt4o():
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "system", "content": "Test connection to gpt-4o"}],
            max_tokens=5
        )
        print("Successfully connected to gpt-4o.")
        print("Response snippet:", response.choices[0].message.content)
    except OpenAIError as e:
        print(f"An OpenAI error occurred (gpt-4o): {e}")
    except Exception as e:
        print(f"A general error occurred (gpt-4o): {e}")

if __name__ == "__main__":
    list_models()
    test_gpt4o()
