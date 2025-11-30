# MCP Integration Guide

MCP (Model Context Protocol) integration allows scripts to call external APIs for live data and advanced processing.

## Configuration

### Environment Setup

Create a `.env` file in the project root:

```bash
MCP_BASE_URL=https://api.example.com/mcp
MCP_AUTH_TYPE=bearer          # Options: none, bearer, api-key
MCP_AUTH_TOKEN=your-token-here
```

For the web app, create `packages/web/.env`:

```bash
VITE_MCP_BASE_URL=https://api.example.com/mcp
VITE_MCP_AUTH_TYPE=bearer
VITE_MCP_AUTH_TOKEN=your-token-here
```

### Authentication Types

#### None
No authentication header sent.

```bash
MCP_AUTH_TYPE=none
```

#### Bearer Token
Uses `Authorization: Bearer {token}` header.

```bash
MCP_AUTH_TYPE=bearer
MCP_AUTH_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### API Key
Uses `X-API-Key: {token}` header.

```bash
MCP_AUTH_TYPE=api-key
MCP_AUTH_TOKEN=sk_live_abcd1234...
```

## Creating MCP-Based Scripts

### Example: Currency Converter

```json
{
  "name": "Currency Converter",
  "description": "Convert amounts between different currencies",
  "tags": ["finance", "currency"],
  "triggerPhrases": [
    "convert currency",
    "exchange rate",
    "convert dollars to euros"
  ],
  "parameters": [
    {
      "name": "amount",
      "type": "number",
      "required": true,
      "prompt": "How much would you like to convert?"
    },
    {
      "name": "from",
      "type": "string",
      "required": true,
      "prompt": "From which currency? (e.g., USD)"
    },
    {
      "name": "to",
      "type": "string",
      "required": true,
      "prompt": "To which currency? (e.g., EUR)"
    }
  ],
  "executionType": "mcp",
  "mcpEndpoint": "/exchange-rates"
}
```

### Request Flow

1. User triggers script
2. Bot collects all parameters
3. Bot sends POST request to `{MCP_BASE_URL}{mcpEndpoint}`
4. Request body contains parameters as JSON:
   ```json
   {
     "amount": 100,
     "from": "USD",
     "to": "EUR"
   }
   ```
5. Bot formats and displays response

## Expected API Response Format

### Successful Response

```json
{
  "rates": {
    "EUR": 0.92
  },
  "timestamp": "2025-01-15T10:00:00Z"
}
```

The MCP client considers any 2xx status code as success and passes the response data to the script.

### Error Response

```json
{
  "error": "Invalid currency code: XYZ"
}
```

For non-2xx status codes, the error message is extracted from the response.

## Building MCP Endpoints

### Basic Endpoint Structure

```typescript
// Express.js example
app.post('/mcp/exchange-rates', async (req, res) => {
  try {
    const { amount, from, to } = req.body;

    // Validate inputs
    if (!amount || !from || !to) {
      return res.status(400).json({
        error: 'Missing required parameters'
      });
    }

    // Fetch exchange rate from external API
    const rate = await getExchangeRate(from, to);

    // Return formatted response
    res.json({
      rates: { [to]: rate },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});
```

### Authentication Middleware

```typescript
// Bearer token validation
function validateBearerToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);

  // Validate token (example)
  if (token !== process.env.EXPECTED_TOKEN) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  next();
}

app.post('/mcp/*', validateBearerToken, ...);
```

### Response Validation (Optional)

You can specify a JSON schema for response validation:

```typescript
// In script configuration
{
  ...
  "validateResponse": {
    "type": "object",
    "required": ["rates"],
    "properties": {
      "rates": { "type": "object" }
    }
  }
}
```

Note: Current implementation only validates top-level type. For production, use a full JSON schema validator like Ajv.

## Example Integrations

### Weather API

```json
{
  "name": "Weather Check",
  "description": "Check current weather for a location",
  "tags": ["weather"],
  "triggerPhrases": ["what's the weather", "check weather"],
  "parameters": [
    {
      "name": "location",
      "type": "string",
      "required": true,
      "prompt": "Which location?"
    }
  ],
  "executionType": "mcp",
  "mcpEndpoint": "/weather/current"
}
```

**API Endpoint:**
```typescript
app.post('/mcp/weather/current', async (req, res) => {
  const { location } = req.body;

  const weather = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${API_KEY}`
  ).then(r => r.json());

  res.json({
    temperature: weather.main.temp,
    condition: weather.weather[0].description,
    location: weather.name
  });
});
```

### Task Management

```json
{
  "name": "Add Task",
  "description": "Add a task to your todo list",
  "tags": ["productivity", "tasks"],
  "triggerPhrases": ["add task", "create task", "new todo"],
  "parameters": [
    {
      "name": "title",
      "type": "string",
      "required": true,
      "prompt": "What's the task?"
    },
    {
      "name": "dueDate",
      "type": "date",
      "required": false,
      "prompt": "When is it due? (optional)"
    }
  ],
  "executionType": "mcp",
  "mcpEndpoint": "/tasks/create"
}
```

**API Endpoint:**
```typescript
app.post('/mcp/tasks/create', async (req, res) => {
  const { title, dueDate } = req.body;

  const task = await db.tasks.create({
    title,
    dueDate: dueDate ? new Date(dueDate) : null,
    userId: req.user.id // From auth middleware
  });

  res.json({
    id: task.id,
    title: task.title,
    created: true
  });
});
```

## Advanced: Caching

To reduce API calls and improve performance:

```typescript
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

app.post('/mcp/exchange-rates', async (req, res) => {
  const { from, to } = req.body;
  const cacheKey = `${from}-${to}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json(cached.data);
  }

  // Fetch fresh data
  const rate = await getExchangeRate(from, to);
  const response = {
    rates: { [to]: rate },
    timestamp: new Date().toISOString()
  };

  // Update cache
  cache.set(cacheKey, {
    data: response,
    timestamp: Date.now()
  });

  res.json(response);
});
```

## Security Best Practices

### Rate Limiting
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/mcp', limiter);
```

### Input Validation
```typescript
import { z } from 'zod';

const ExchangeRateSchema = z.object({
  amount: z.number().positive(),
  from: z.string().length(3),
  to: z.string().length(3)
});

app.post('/mcp/exchange-rates', async (req, res) => {
  try {
    const validated = ExchangeRateSchema.parse(req.body);
    // Use validated data
  } catch (error) {
    return res.status(400).json({ error: 'Invalid input' });
  }
});
```

### CORS Configuration
```typescript
import cors from 'cors';

app.use('/mcp', cors({
  origin: process.env.ALLOWED_ORIGINS.split(','),
  credentials: true
}));
```

## Debugging MCP Calls

### Enable Debug Mode

In the web app, click "Show Debug" to see:
- MCP request details
- Response data
- Execution time
- Error messages

### Common Issues

**"MCP client not configured"**
- Check `.env` file exists
- Verify `VITE_MCP_BASE_URL` is set
- Restart dev server after changing .env

**"Request timeout"**
- Default timeout is 10 seconds
- Check API endpoint is responding
- Increase timeout if needed:
  ```typescript
  const mcpClient = new MCPClient({
    ...config,
    timeout: 30000 // 30 seconds
  });
  ```

**"Network error"**
- Check CORS configuration on API server
- Verify API URL is correct
- Check browser network tab for details

**401 Unauthorized**
- Verify `MCP_AUTH_TYPE` matches API expectations
- Check token is valid and not expired
- Confirm token has required permissions

## Testing MCP Endpoints

### Manual Testing with curl

```bash
# Bearer auth
curl -X POST https://api.example.com/mcp/exchange-rates \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "from": "USD", "to": "EUR"}'

# API key auth
curl -X POST https://api.example.com/mcp/weather/current \
  -H "X-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"location": "London"}'
```

### Automated Testing

```typescript
import { describe, it, expect } from 'vitest';
import { MCPClient } from '@otto-ai/core';

describe('MCP Exchange Rates', () => {
  const client = new MCPClient({
    baseUrl: 'https://api.example.com/mcp',
    authType: 'bearer',
    authToken: 'test-token',
    timeout: 5000
  });

  it('should convert USD to EUR', async () => {
    const result = await client.execute({
      endpoint: '/exchange-rates',
      method: 'POST',
      body: { amount: 100, from: 'USD', to: 'EUR' }
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('rates');
    expect(result.data.rates).toHaveProperty('EUR');
  });
});
```

## Production Deployment

### Environment Variables
- Use secrets management (AWS Secrets Manager, etc.)
- Never commit tokens to version control
- Rotate tokens regularly

### Monitoring
- Log all MCP calls with timestamps
- Track error rates and latency
- Set up alerts for failures

### Failover
- Implement retry logic for transient failures
- Provide fallback responses when API is down
- Cache responses when possible
