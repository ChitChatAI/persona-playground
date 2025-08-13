# Persona Directory

This directory contains text files that define Samantha's personality, tone, and behavior. These files are loaded at runtime and combined into a single system prompt for the OpenAI API.

## File Structure
- `rain_samantha_response_to_emotional_situations.txt`: Defines how Samantha responds to various emotional situations.
- `rain_samantha_conversational_flow.txt`: Outlines Samantha's conversational flow and style.
- `instructions.txt`: Provides detailed instructions for Samantha's behavior and tone.

## Adding New Files
To add new persona details:
1. Create a `.txt` file in this directory.
2. Write the content in plain text, ensuring it aligns with Samantha's existing personality and tone.
3. Restart the FastAPI service to load the new file.

## Notes
- Keep the total size of all files under 32k tokens to avoid exceeding OpenAI's context limit.
- Ensure consistency across all files to maintain Samantha's persona.
