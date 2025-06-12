# BWR Tools Backend

FastAPI backend for BWR plotting tools and research agent.

## Setup

1. **Install dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run the backend:**
   ```bash
   # Development mode with auto-reload
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   
   # Or using Python directly
   python main.py
   ```

## API Endpoints

### Health Check
- `GET /health` - Check if API is running

### Sessions
- `POST /api/sessions/create` - Create new session
- `GET /api/sessions/{session_id}` - Get session info
- `DELETE /api/sessions/{session_id}` - Delete session

### Data Management
- `POST /api/data/upload/{session_id}` - Upload CSV/Excel/Parquet file
- `POST /api/data/process/{session_id}` - Apply data processing

### Plot Generation
- `POST /api/plots/generate` - Generate plot
- `GET /api/plots/types` - Get available plot types
- `GET /api/plots/config/watermarks` - Get watermark options
- `GET /api/plots/export/{session_id}/{plot_id}` - Export plot

### DeFi Llama Integration
- `POST /api/defillama/{method}` - Call DeFi Llama API method
- `GET /api/defillama/methods` - List available methods

### Research Agent (WebSocket)
- `WS /ws/agent/{session_id}` - Connect to research agent

## Architecture

```
backend/
├── main.py              # FastAPI application
├── models.py            # Pydantic models
├── session_manager.py   # Session management
├── plot_service.py      # Plot generation using BWRPlots
├── data_service.py      # Data processing operations
├── agent_service.py     # Research agent logic
└── storage/            # Local file storage for sessions
```

## Integration with Frontend

The backend provides a REST API that the Next.js frontend can consume:

```javascript
// Example frontend API call
const response = await fetch('http://localhost:8000/api/plots/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    session_id: sessionId,
    plot_type: 'scatter',
    configuration: {
      title: 'My Chart',
      x_column: 'date',
      y_column: 'value'
    }
  })
});

const result = await response.json();
// result.plot_json contains Plotly figure data
```

## Migrating from Streamlit

This backend replaces the Streamlit app.py with proper API endpoints:

| Streamlit Feature | Backend Endpoint |
|------------------|-----------------|
| File upload | `POST /api/data/upload/{session_id}` |
| Data manipulation | `POST /api/data/process/{session_id}` |
| Plot generation | `POST /api/plots/generate` |
| DeFi Llama tab | `/api/defillama/*` endpoints |

## Production Deployment

For production, consider:

1. **Use Redis** for session storage instead of local files
2. **Add authentication** (JWT tokens, API keys)
3. **Use a process manager** (systemd, supervisor)
4. **Add monitoring** (Prometheus, Grafana)
5. **Deploy with Docker**:
   ```dockerfile
   FROM python:3.10-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   COPY . .
   CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
   ```