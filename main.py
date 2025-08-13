import os
import logging
from fastapi import FastAPI, HTTPException, Form, Request
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from openai import OpenAI, OpenAIError
from dotenv import load_dotenv
from typing import Dict, List

# ========== Setup ==========
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

load_dotenv(dotenv_path=".env")
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    logger.error("No OpenAI API key provided in .env")
    raise Exception("API key missing")

client = OpenAI(api_key=api_key)
app = FastAPI()

static_dir = os.path.join(os.path.dirname(__file__), "static")
templates_dir = os.path.join(os.path.dirname(__file__), "templates")
sam_persona_dir = os.path.join(os.path.dirname(__file__), "personality/sam")
arin_persona_dir = os.path.join(os.path.dirname(__file__), "personality/arin")

app.mount("/static", StaticFiles(directory=static_dir), name="static")
templates = Jinja2Templates(directory=templates_dir)

# Optional in-memory session store
chat_sessions: Dict[str, List[Dict[str, str]]] = {}
MAX_HISTORY = 10

# ========== Load Persona ==========

def load_persona(persona_name: str = "samantha") -> str:
    """
    Loads the persona prompt for either 'samantha' or 'arin'.
    - For 'samantha', loads from sam_persona_dir and .txt files.
    - For 'arin', loads from arin_persona_dir and .md files.
    Appends all docs in the persona dir (except natural_behavior_prompt).
    """
    sections = []
    if persona_name.lower() == "arin":
        persona_dir = arin_persona_dir
        file_ext = ".md"
    else:
        persona_dir = sam_persona_dir
        file_ext = ".txt"
    # Append all docs in the persona dir (except natural_behavior_prompt)
    for filename in sorted(os.listdir(persona_dir)):
        if filename.endswith(file_ext) and not filename.startswith("natural_behavior_prompt"):
            file_path = os.path.join(persona_dir, filename)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content:
                    sections.append(content)
    # Try both .txt and .md for natural_behavior_prompt
    natural_behavior_prompt = ""
    for ext in [".txt", ".md"]:
        natural_behavior_path = os.path.join(persona_dir, f"natural_behavior_prompt{ext}")
        if os.path.exists(natural_behavior_path):
            with open(natural_behavior_path, "r", encoding="utf-8") as f:
                natural_behavior_prompt = f.read().strip()
            break
    # Only include the first 2 persona docs if too many tokens (to avoid 429 error)
    joined_sections = "\n\n".join(sections[:2]) if len(sections) > 2 else "\n\n".join(sections)
    persona_prompt = f"{natural_behavior_prompt}\n\n{joined_sections}".strip()
    if not persona_prompt:
        persona_prompt = "You are a helpful assistant."
    return persona_prompt

samantha_persona = load_persona("samantha")
arin_persona = load_persona("arin")

def get_recent_history(session_id: str) -> List[Dict[str, str]]:
    full_history = chat_sessions.get(session_id, [])
    return full_history[-MAX_HISTORY*2:]  # limit to last 10 messages


# ========== Routes ==========

@app.get("/", response_class=HTMLResponse)
async def serve_ui(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/chat")
async def chat_endpoint(
    message: str = Form(...),
    creativity: float = Form(0.85),
    session_id: str = Form("default")
):
    try:
        logger.info(f"Received message: {message} | session: {session_id} | creativity: {creativity}")

        # Get trimmed session history
        history = get_recent_history(session_id)
        # Use persona based on session_id (samantha or arin)
        if session_id == "arin":
            persona_prompt = arin_persona
        else:
            persona_prompt = samantha_persona
        messages = [{"role": "system", "content": persona_prompt}] + history

        # Handle /translate
        if message.startswith("/translate"):
            messages.append({
                "role": "system",
                "content": (
                    "You're rewriting chatbot responses to sound natural, like Samantha would say them — "
                    "casual, warm, and human. Keep all important info but make the tone effortless, flowing, and friendly."
                )
            })
            message = message.replace("/translate", "").strip()

        messages.append({"role": "user", "content": message})

        response = client.chat.completions.create(
            model="gpt-4o",
            temperature=creativity,
            top_p=0.95,
            messages=messages
        )

        reply = response.choices[0].message.content.strip()

        # Save to chat history
        chat_sessions[session_id] = history + [{"role": "user", "content": message}, {"role": "assistant", "content": reply}]
        if session_id == "arin":
            logger.info(f"Arin replied: {reply}")
        else:
            logger.info(f"{session_id.capitalize()} replied: {reply}")

        return JSONResponse(content={"reply": reply})

    except OpenAIError as e:
        logger.error(f"OpenAI API error: {e}")
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {e}")

    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")


# New endpoint for Vanilla GPT panel (no persona prompt)
@app.post("/vanilla")
async def vanilla_endpoint(
    message: str = Form(...),
    creativity: float = Form(0.85),
    session_id: str = Form("vanilla")
):
    try:
        logger.info(f"Vanilla GPT received message: {message} | session: {session_id} | creativity: {creativity}")

        # Get trimmed session history
        history = get_recent_history(session_id)
        messages = history.copy()  # No persona prompt

        messages.append({"role": "user", "content": message})

        response = client.chat.completions.create(
            model="gpt-4o",
            temperature=creativity,
            top_p=0.95,
            messages=messages
        )

        reply = response.choices[0].message.content.strip()

        # Save to chat history
        chat_sessions[session_id] = history + [{"role": "user", "content": message}, {"role": "assistant", "content": reply}]
        logger.info(f"Vanilla GPT replied: {reply}")

        return JSONResponse(content={"reply": reply})

    except OpenAIError as e:
        logger.error(f"OpenAI API error: {e}")
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {e}")

    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")


@app.post("/clear")
async def clear_chat(session_id: str = Form("default")):
    chat_sessions[session_id] = []
    logger.info(f"Cleared chat for session: {session_id}")
    return JSONResponse(content={"message": "Chat history cleared."})
