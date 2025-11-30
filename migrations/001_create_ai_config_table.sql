-- Migration: Create ai_config table for storing AI script generator prompts
-- This table allows users to customize the system prompt used for script generation

CREATE TABLE IF NOT EXISTS ai_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  system_prompt TEXT NOT NULL,
  gemini_model TEXT DEFAULT 'gemini-2.5-flash',
  claude_model TEXT DEFAULT 'claude-3-5-sonnet-20241022',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default prompt (matches the current SYSTEM_PROMPT in aiScriptGenerator.ts)
INSERT INTO ai_config (id, system_prompt) 
VALUES (
  'default',
  'You are an expert at creating automation scripts. Generate a script based on the user''s description.

The script should be returned as a JSON object with the following structure:
{
  "name": "Script Name",
  "description": "Brief description of what the script does",
  "tags": ["tag1", "tag2"],
  "triggerPhrases": ["phrase1", "phrase2", "phrase3"],
  "parameters": [
    {
      "name": "paramName",
      "type": "string|number|boolean|date",
      "required": true,
      "prompt": "What should I ask the user?"
    }
  ],
  "executionType": "local",
  "code": "JavaScript code that uses the parameters and returns a string result"
}

Important guidelines:
1. The code should be clean, sandboxed JavaScript that only uses Math, Date, and JSON globals
2. Parameters are available as variables in the code
3. The code MUST return a string (use return statement)
4. Create 3-4 relevant trigger phrases based on keywords from the user''s description
5. Analyze the user''s description for key concepts and add 2-4 relevant tags (e.g., "math", "finance", "time", "conversion", "calculation")
6. Look for keywords the user mentions and ensure trigger phrases include variations of those keywords
7. Keep parameter names simple and lowercase
8. The code should handle edge cases gracefully
9. Tags should be lowercase and relevant to the script''s domain/purpose

Example code format:
const result = someCalculation;
return `The result is ${result}`;

Return ONLY the JSON object, no additional text or explanation.'
)
ON CONFLICT (id) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_ai_config_timestamp
  BEFORE UPDATE ON ai_config
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_config_updated_at();

