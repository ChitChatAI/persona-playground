<h1 align="center">🎭 Persona Playground</h1>

<p align="center">
  <em>An interactive demo for experimenting with AI personas, tones, and side-by-side conversation comparisons.</em>
</p>

<hr>

<h2>📌 Overview</h2>
<p>
Persona Playground is a UI + backend demonstration for testing and comparing multiple AI personas in real time.  
Switch between characters like <strong>Samantha</strong> and <strong>Arin</strong>, or compare them to a vanilla GPT model.  
</p>

<h2>✨ Features</h2>
<ul>
  <li><strong>Side-by-Side Chat Panels</strong> – View multiple personas responding to the same input simultaneously.</li>
  <li><strong>Live Tone Detection</strong> – Automatically detects tone in each response (e.g., Optimistic, Calm, Technical).</li>
  <li><strong>Persona Switching</strong> – Toggle between personas instantly during a session.</li>
  <li><strong>Customizable Prompts</strong> – Modify instructions and personality traits on the fly.</li>
  <li><strong>Backend API</strong> – Powered by <code>FastAPI</code> and the OpenAI API.</li>
</ul>

<h2>🖼 Demo Layout</h2>
<ul>
  <li>Left Panel – Samantha or Arin (persona-driven UI)</li>
  <li>Right Panel – Vanilla GPT baseline</li>
  <li>Tone Indicators – Visual cue showing detected tone per response</li>
</ul>

<h2>🚀 Getting Started</h2>
<pre>
# Clone the repository
git clone https://github.com/ChitChatAI/persona-playground.git
cd persona-playground

# Install dependencies
pip install -r requirements.txt   # or your package manager

# Run the backend
uvicorn main:app --reload

# Open the frontend (served from FastAPI or your static hosting)
</pre>

<h2>⚙️ Tech Stack</h2>
<ul>
  <li><strong>Frontend:</strong> HTML, CSS (Bootstrap), JavaScript</li>
  <li><strong>Backend:</strong> FastAPI (Python)</li>
  <li><strong>AI Engine:</strong> OpenAI API</li>
</ul>

<h2>📜 License</h2>
<p>
This project is for demonstration purposes and not intended for production use.  
All AI personas and tone detection heuristics are examples and can be customized.
</p>
