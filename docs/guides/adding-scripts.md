# Adding Scripts

This guide covers how to create and configure scripts for the Automation Companion.

## Using the Script Editor UI

1. Click the **Scripts** button in the top-right corner
2. Click **+ New** to create a new script
3. Fill in the required fields (see below)
4. Click **Save**

## Script Configuration

### Basic Information

**Name** (required)
- Human-readable name shown in the script list
- Example: "BMI Calculator", "Weather Checker"

**Description** (required)
- Used for intent matching
- Should describe what the script does
- Example: "Calculate body mass index from weight and height"

**Tags** (comma-separated)
- Keywords for categorization and intent matching
- Example: "health, calculator, fitness"

**Trigger Phrases** (one per line)
- Exact phrases that should trigger this script
- More phrases = better matching
- Example:
  ```
  calculate my bmi
  what's my body mass index
  check my bmi
  ```

### Execution Type

Choose between three execution modes:

#### Local (JavaScript)
Run code directly in the browser/app.

**Use cases:**
- Simple calculations
- Data transformations
- Formatting text
- No external API needed

**Code Editor:**
- Write vanilla JavaScript
- Access parameters as variables
- Return the result
- Example:
  ```javascript
  const bmi = weight / ((height / 100) ** 2);
  const rounded = Math.round(bmi * 10) / 10;
  return `Your BMI is ${rounded}`;
  ```

**Available globals:**
- `Math`, `Date`, `JSON`
- All parameter variables
- No `console`, `require`, `import`, `process`, `window`, etc.

**Security:**
- Code is sandboxed
- 5-second timeout
- No filesystem/network access

#### MCP (External API)
Call an external API endpoint.

**Use cases:**
- Fetch live data (weather, stocks, etc.)
- Submit data to external services
- Complex processing on a server

**MCP Endpoint:**
- Relative path to the MCP base URL
- Example: `/exchange-rates`, `/weather/current`

**MCP Configuration:**
- Set in `.env` file (see [MCP Integration](../integration/mcp-integration.md))

#### Gemini Chat (Conversational AI)
Have a conversation with Gemini AI with context awareness.

**Use cases:**
- Answering questions with AI
- Having multi-turn conversations
- Getting information or explanations
- General AI assistance

**Features:**
- Maintains conversation history across exchanges
- Automatically resets after 3 back-and-forth turns
- Uses Gemini 2.5 Flash model
- Shares API key with AI Script Generator

**Configuration:**
- Requires Gemini API key (configured via AI Script Generator)
- No additional configuration needed
- No code required - handled by the system

**Example:**
```json
{
  "name": "Ask Gemini",
  "executionType": "gemini-chat",
  "parameters": [
    {
      "name": "question",
      "type": "string",
      "required": true,
      "prompt": "What would you like to ask?"
    }
  ]
}
```

### Parameters

Parameters are values the script needs to run.

**Add parameters** with the **+ Add Parameter** button.

For each parameter:

**Name** (required)
- Variable name used in code
- Lowercase, no spaces
- Example: `weight`, `city_name`, `date`

**Type** (required)
- `string`: Text values
- `number`: Integers or decimals
- `boolean`: true/false
- `date`: Date values

**Required**
- Check if this parameter must be provided
- User will be prompted if missing

**Prompt** (required)
- Question to ask the user
- Include units for clarity
- Example: "What's your weight in kilograms?"

## Script Examples

### Example 1: Simple Calculation

```json
{
  "name": "Tip Calculator",
  "description": "Calculate tip amount for a bill",
  "tags": ["calculator", "money", "dining"],
  "triggerPhrases": [
    "calculate tip",
    "how much to tip",
    "tip calculator"
  ],
  "parameters": [
    {
      "name": "bill",
      "type": "number",
      "required": true,
      "prompt": "What's the bill amount?"
    },
    {
      "name": "percent",
      "type": "number",
      "required": true,
      "prompt": "What tip percentage? (e.g., 15, 18, 20)"
    }
  ],
  "executionType": "local",
  "code": "const tip = bill * (percent / 100);\nconst total = bill + tip;\nreturn `Tip: $${tip.toFixed(2)}\\nTotal: $${total.toFixed(2)}`;"
}
```

### Example 2: Text Formatting

```json
{
  "name": "Title Case Converter",
  "description": "Convert text to title case",
  "tags": ["text", "formatting", "utility"],
  "triggerPhrases": [
    "convert to title case",
    "title case",
    "capitalize words"
  ],
  "parameters": [
    {
      "name": "text",
      "type": "string",
      "required": true,
      "prompt": "What text should I convert?"
    }
  ],
  "executionType": "local",
  "code": "return text.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');"
}
```

### Example 3: Date Calculation

```json
{
  "name": "Days Until",
  "description": "Calculate days until a future date",
  "tags": ["date", "calculator", "countdown"],
  "triggerPhrases": [
    "days until",
    "how many days until",
    "countdown to"
  ],
  "parameters": [
    {
      "name": "targetDate",
      "type": "date",
      "required": true,
      "prompt": "What date? (YYYY-MM-DD)"
    }
  ],
  "executionType": "local",
  "code": "const now = new Date();\nconst target = new Date(targetDate);\nconst diffTime = target - now;\nconst diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));\nreturn `${diffDays} days until ${target.toLocaleDateString()}`;"
}
```

### Example 4: MCP Integration

```json
{
  "name": "Random Quote",
  "description": "Get a random inspirational quote",
  "tags": ["quotes", "inspiration"],
  "triggerPhrases": [
    "random quote",
    "inspire me",
    "quote of the day"
  ],
  "parameters": [],
  "executionType": "mcp",
  "mcpEndpoint": "/quotes/random"
}
```

### Example 5: Gemini Conversational AI

```json
{
  "name": "Ask Gemini",
  "description": "Have a conversation with Gemini AI to answer questions, get information, or discuss topics. Supports up to 3 back-and-forth exchanges.",
  "tags": ["ai", "gemini", "assistant", "question", "chat"],
  "triggerPhrases": [
    "ask gemini",
    "gemini",
    "hey gemini",
    "ask ai",
    "question for gemini",
    "chat with gemini"
  ],
  "parameters": [
    {
      "name": "question",
      "type": "string",
      "required": true,
      "prompt": "What would you like to ask?"
    }
  ],
  "executionType": "gemini-chat"
}
```

**How it works:**
- First question: "ask gemini what is quantum computing?"
- Follow-up: "what are some applications?" (uses conversation context)
- After 3 exchanges, conversation automatically resets
- Requires Gemini API key from AI Script Generator

## Best Practices

### Trigger Phrases
- ✅ Use natural variations: "calculate my bmi", "what's my bmi", "check my bmi"
- ✅ Include common misspellings if applicable
- ✅ Add 3-5 phrases minimum
- ❌ Don't use overly generic phrases: "calculate", "check"

### Descriptions
- ✅ Be specific: "Calculate body mass index from weight and height"
- ✅ Mention key entities: "weather", "currency", "date"
- ❌ Don't be vague: "A useful calculator"

### Parameters
- ✅ Include units in prompts: "weight in kilograms"
- ✅ Give examples: "percentage (e.g., 15, 18, 20)"
- ✅ Make optional params clear: "blockers (or type 'none')"
- ❌ Don't assume user knows technical names

### Code
- ✅ Return strings for user-friendly messages
- ✅ Format numbers nicely: `toFixed(2)`
- ✅ Handle edge cases: division by zero, empty strings
- ❌ Don't use `console.log` (it won't work)
- ❌ Don't try to access external resources

## Testing Your Script

1. **Enable Debug Mode** in settings
2. **Trigger the script** with one of your phrases
3. **Check the Debug Panel** to see:
   - Confidence score (should be > 0.7)
   - Matched script ID
   - Collected parameters
4. **Iterate**:
   - Add more trigger phrases if confidence is low
   - Adjust parameter prompts if users are confused
   - Fix code if execution fails

## Importing/Exporting Scripts

### Export All Scripts
```javascript
// In browser console:
const storage = useConversationStore.getState().scriptStorage;
const json = storage.exportToJSON();
console.log(json);
// Copy and save to a file
```

### Import Scripts
```javascript
// In browser console:
const storage = useConversationStore.getState().scriptStorage;
const json = '...'; // Paste your JSON here
storage.importFromJSON(json);
```

Or use the seed data file:
```bash
# Edit seed-data/scripts.json
# Refresh the app (scripts load on startup)
```

## Troubleshooting

### "I couldn't find that script"
- Check trigger phrases match your input
- Enable debug mode to see confidence scores
- Add more trigger phrases or adjust description

### "Missing required parameters"
- Ensure all required params are marked correctly
- Check parameter names match code variables

### "Execution failed"
- Check code syntax in the editor
- Ensure you're not using forbidden functions
- Add error handling in your code:
  ```javascript
  if (!weight || !height) {
    return "Invalid input";
  }
  ```

### Low confidence scores
- Add more diverse trigger phrases
- Include important keywords in description
- Use relevant tags

## Advanced: Multi-Step Scripts

For complex workflows, create multiple scripts that chain together:

```json
// Script 1: Data Collection
{
  "name": "Start Expense Report",
  "triggerPhrases": ["new expense report"],
  "parameters": [...],
  "code": "return 'Expense report started. Next: Add expense items.'"
}

// Script 2: Add Items
{
  "name": "Add Expense",
  "triggerPhrases": ["add expense"],
  "parameters": [...],
  "code": "// Store in localStorage\nreturn 'Expense added.'"
}

// Script 3: Finalize
{
  "name": "Finalize Expense Report",
  "triggerPhrases": ["finish expense report"],
  "code": "// Read from localStorage, format, return summary"
}
```

For state persistence across scripts, use `localStorage` in browser:
```javascript
// Save
localStorage.setItem('myKey', JSON.stringify(data));

// Load
const data = JSON.parse(localStorage.getItem('myKey') || '{}');
```
