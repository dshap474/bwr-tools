# Migration Guide: Streamlit to Next.js + FastAPI

## Overview

This guide helps you migrate from the Streamlit app (`app.py`) to the new architecture:
- **Frontend**: Next.js (existing `/frontend` directory)
- **Backend**: FastAPI (`/backend` directory)

## Architecture Comparison

### Old Architecture (Streamlit)
```
User → Streamlit App → BWRPlots/DeFi API
         (app.py)
```

### New Architecture
```
User → Next.js Frontend → FastAPI Backend → BWRPlots/DeFi API
       (localhost:3000)    (localhost:8000)
```

## Step 1: Start the Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
# Backend runs on http://localhost:8000
```

## Step 2: Update Frontend API Calls

Replace the current approach of spawning Python processes with proper API calls:

### Old Approach (frontend/src/app/api/plots/generate/route.ts)
```typescript
// Spawning Python process
const python = spawn(pythonPath, [utilsPath, argsFile]);
```

### New Approach
```typescript
// frontend/src/lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function generatePlot(request: PlotRequest) {
  const response = await fetch(`${API_BASE_URL}/api/plots/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  
  if (!response.ok) {
    throw new Error(`Plot generation failed: ${response.statusText}`);
  }
  
  return response.json();
}
```

## Step 3: Update Frontend Components

### File Upload
```typescript
// frontend/src/hooks/useDataUpload.ts
export async function uploadData(sessionId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_BASE_URL}/api/data/upload/${sessionId}`, {
    method: 'POST',
    body: formData
  });
  
  return response.json();
}
```

### Plot Display
```typescript
// frontend/src/components/plotting/PlotDisplay.tsx
import Plot from 'react-plotly.js';

export function PlotDisplay({ plotData }) {
  if (!plotData?.plot_json) return null;
  
  return (
    <Plot
      data={plotData.plot_json.data}
      layout={plotData.plot_json.layout}
      config={{ responsive: true }}
    />
  );
}
```

## Step 4: Add WebSocket for Research Agent

```typescript
// frontend/src/hooks/useAgent.ts
export function useAgent(sessionId: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/agent/${sessionId}`);
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages(prev => [...prev, message]);
    };
    
    setSocket(ws);
    
    return () => ws.close();
  }, [sessionId]);
  
  const sendMessage = (content: string) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'user',
        content: content
      }));
    }
  };
  
  return { messages, sendMessage };
}
```

## Step 5: Environment Configuration

Create `.env.local` in your frontend:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Step 6: Update Frontend API Routes

Since we're using a separate backend, you can remove the Python spawning logic from your Next.js API routes. Instead, they can either:
1. Be removed entirely (call backend directly from frontend)
2. Act as a proxy to the backend (for additional security/transformation)

Example proxy approach:
```typescript
// frontend/src/app/api/plots/generate/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Forward to backend
  const response = await fetch('http://localhost:8000/api/plots/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  const data = await response.json();
  return NextResponse.json(data);
}
```

## Step 7: Deploy

### Development
```bash
# Terminal 1: Backend
cd backend
python main.py

# Terminal 2: Frontend
cd frontend
npm run dev
```

### Production
```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - CORS_ORIGINS=https://your-frontend-domain.com
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=https://your-backend-domain.com
```

## Benefits of New Architecture

1. **Performance**: No more spawning Python processes for each request
2. **Scalability**: Backend can be scaled independently
3. **Real-time**: WebSocket support for agent streaming
4. **Development**: Frontend and backend teams can work independently
5. **Testing**: Easier to test API endpoints
6. **Monitoring**: Standard HTTP metrics and logging
7. **Security**: Proper CORS, authentication can be added
8. **Caching**: Redis integration for session management

## Next Steps

1. Add authentication (JWT tokens)
2. Implement full LLM integration for research agent
3. Add data persistence (PostgreSQL)
4. Implement caching (Redis)
5. Add API rate limiting
6. Set up monitoring (Prometheus/Grafana)
7. Create CI/CD pipeline