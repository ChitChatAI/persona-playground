import os
import re
import time
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from fastapi import (
    FastAPI,
    HTTPException,
    Form,
    Request,
    UploadFile,
    File,
)
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from openai import OpenAI, OpenAIError
from dotenv import load_dotenv

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

BASE_DIR = Path(__file__).resolve().parent
static_dir = BASE_DIR / "static"
templates_dir = BASE_DIR / "templates"

# Dynamic persona root (uploads + current pointer live here)
persona_root = BASE_DIR / "personality"

app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")
templates = Jinja2Templates(directory=str(templates_dir))

# Optional in-memory session store
chat_sessions: Dict[str, List[Dict[str, str]]] = {}
MAX_HISTORY = 10

ALLOWED_EXTS = {".txt", ".md"}
MAX_FILE_BYTES = 200 * 1024  # 200KB per file

# ========== Persona Manager ==========

def _slugify(name: str) -> str:
    """Safe folder name for persona IDs."""
    name = name.strip().lower()
    name = re.sub(r"[^a-z0-9-_]+", "-", name)
    name = re.sub(r"-{2,}", "-", name).strip("-")
    return name or "persona"

def _read_text(path: Path) -> str:
    with path.open("r", encoding="utf-8", errors="ignore") as f:
        return f.read().strip()

def _valid_file(upload: UploadFile) -> Tuple[bool, str]:
    ext = Path(upload.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTS:
        return False, f"Only .txt and .md allowed (got {ext or 'no extension'})"
    return True, ""

class PersonaManager:
    """
    - Each persona lives in personality/<persona_name>/
    - Uploads go to personality/<persona_name>/uploads/<ts>/
    - We mirror the latest upload batch into personality/<persona_name>/current/
    - load_persona_text() pulls:
        natural_behavior_prompt.(txt|md) from current (or base) + up to 2 more docs
    """
    def __init__(self, root: Path):
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def base_dir_for(self, persona_name: str) -> Path:
        return self.root / persona_name

    def current_dir_for(self, persona_name: str) -> Path:
        return self.base_dir_for(persona_name) / "current"

    def uploads_dir_for(self, persona_name: str) -> Path:
        return self.base_dir_for(persona_name) / "uploads"

    def list_personas(self) -> Dict[str, Dict[str, List[str]]]:
        results: Dict[str, Dict[str, List[str]]] = {}
        if not self.root.exists():
            return results
        for p in self.root.iterdir():
            if not p.is_dir():
                continue
            current = self.current_dir_for(p.name)
            base_files = [f.name for f in p.glob("*.txt")] + [f.name for f in p.glob("*.md")]
            current_files = [f.name for f in current.glob("*") if f.is_file()] if current.exists() else []
            results[p.name] = {
                "current_files": sorted(current_files),
                "base_files": sorted(base_files),
            }
        return results

    def _ensure_persona_dirs(self, persona_name: str) -> None:
        self.base_dir_for(persona_name).mkdir(parents=True, exist_ok=True)
        self.uploads_dir_for(persona_name).mkdir(parents=True, exist_ok=True)

    def save_uploads(self, persona_name: str, files: List[UploadFile]) -> List[str]:
        persona_name = _slugify(persona_name)
        self._ensure_persona_dirs(persona_name)

        ts = str(int(time.time()))
        target_batch = self.uploads_dir_for(persona_name) / ts
        target_batch.mkdir(parents=True, exist_ok=True)

        saved: List[str] = []
        for up in files:
            ok, msg = _valid_file(up)
            if not ok:
                raise HTTPException(status_code=400, detail=msg)
            content = up.file.read()
            if len(content) > MAX_FILE_BYTES:
                raise HTTPException(status_code=400, detail=f"{up.filename} exceeds {MAX_FILE_BYTES} bytes")
            fname = _slugify(Path(up.filename).stem) + Path(up.filename).suffix.lower()
            out_path = target_batch / fname
            with out_path.open("wb") as f:
                f.write(content)
            saved.append(out_path.name)

        # Mirror latest batch into personality/<persona>/current
        current = self.current_dir_for(persona_name)
        if current.exists():
            for f in current.iterdir():
                if f.is_file():
                    f.unlink()
        else:
            current.mkdir(parents=True, exist_ok=True)
        for f in target_batch.iterdir():
            if f.is_file():
                (current / f.name).write_bytes(f.read_bytes())

        return saved

    def _gather_docs(self, persona_name: str) -> List[Path]:
        persona_dir = self.base_dir_for(persona_name)
        current = self.current_dir_for(persona_name)
        docs: List[Path] = []
        if current.exists():
            docs.extend(sorted([p for p in current.iterdir() if p.suffix.lower() in ALLOWED_EXTS and p.is_file()]))
        base_candidates = sorted([p for p in persona_dir.iterdir() if p.suffix.lower() in ALLOWED_EXTS and p.is_file()])
        current_names = {p.name for p in docs}
        for p in base_candidates:
            if p.name not in current_names:
                docs.append(p)
        return docs

    def load_persona_text(self, persona_name: str) -> str:
        persona_name = _slugify(persona_name)
        docs = self._gather_docs(persona_name)

        nbp: Optional[Path] = None
        others: List[Path] = []
        for p in docs:
            if p.stem == "natural_behavior_prompt":
                nbp = p
            else:
                others.append(p)

        sections: List[str] = []
        if nbp and nbp.exists():
            sections.append(_read_text(nbp))
        for p in others[:2]:
            txt = _read_text(p)
            if txt:
                sections.append(txt)

        persona_prompt = "\n\n".join([s for s in sections if s]).strip()
        return persona_prompt or "You are a helpful assistant."

persona_manager = PersonaManager(persona_root)

def load_persona(persona_name: str) -> str:
    # Always treat as dynamic folder name now
    persona_manager._ensure_persona_dirs(persona_name)
    return persona_manager.load_persona_text(persona_name)

def get_recent_history(session_id: str) -> List[Dict[str, str]]:
    full_history = chat_sessions.get(session_id, [])
    return full_history[-MAX_HISTORY * 2:]  # last 10 user+assistant messages

# ========== Routes ==========

@app.get("/", response_class=HTMLResponse)
async def serve_ui(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/upload_persona")
async def upload_persona(
    persona_name: str = Form(...),
    files: List[UploadFile] = File(...)
):
    persona_name = _slugify(persona_name)
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    saved = persona_manager.save_uploads(persona_name, files)
    logger.info(f"Saved {len(saved)} files for persona '{persona_name}': {saved}")

    listing = persona_manager.list_personas().get(persona_name, {})
    return JSONResponse({
        "persona": persona_name,
        "saved_files": saved,
        "active_current_files": listing.get("current_files", []),
        "base_files": listing.get("base_files", [])
    })

@app.get("/personas")
async def list_personas():
    return JSONResponse(persona_manager.list_personas())

@app.post("/chat")
async def chat_endpoint(
    message: str = Form(...),
    creativity: float = Form(0.85),
    session_id: str = Form("default"),
    persona_name: str = Form("persona"),
):
    """
    Left panel (Persona). Uses dynamic persona_name uploaded by the user.
    """
    try:
        logger.info(f"[Persona:{persona_name}] msg: {message} | session: {session_id} | creativity: {creativity}")

        history = get_recent_history(session_id)
        persona_prompt = load_persona(persona_name)
        messages = [{"role": "system", "content": persona_prompt}] + history
        messages.append({"role": "user", "content": message})

        response = client.chat.completions.create(
            model="gpt-4o",
            temperature=creativity,
            top_p=0.95,
            messages=messages
        )
        reply = (response.choices[0].message.content or "").strip()

        chat_sessions[session_id] = history + [
            {"role": "user", "content": message},
            {"role": "assistant", "content": reply}
        ]

        logger.info(f"[Persona:{persona_name}] reply: {reply[:120]}{'...' if len(reply) > 120 else ''}")
        return JSONResponse(content={"reply": reply, "persona_name": persona_name})

    except OpenAIError as e:
        logger.error(f"OpenAI API error: {e}")
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {e}")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

@app.post("/vanilla")
async def vanilla_endpoint(
    message: str = Form(...),
    creativity: float = Form(0.85),
    session_id: str = Form("vanilla")
):
    """
    Right panel (Vanilla). No persona system message.
    """
    try:
        logger.info(f"[Vanilla] msg: {message} | session: {session_id} | creativity: {creativity}")
        history = get_recent_history(session_id)
        messages = history.copy()
        messages.append({"role": "user", "content": message})

        response = client.chat.completions.create(
            model="gpt-4o",
            temperature=creativity,
            top_p=0.95,
            messages=messages
        )
        reply = (response.choices[0].message.content or "").strip()

        chat_sessions[session_id] = history + [
            {"role": "user", "content": message},
            {"role": "assistant", "content": reply}
        ]
        logger.info(f"[Vanilla] reply: {reply[:120]}{'...' if len(reply) > 120 else ''}")
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

if __name__ == "__main__":
    import uvicorn
    PORT = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=PORT,
        reload=True
    )
