"""
FastAPI Backend for BWR Tools
Replaces the Streamlit app with a proper API backend
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from contextlib import asynccontextmanager
import os
import sys
from pathlib import Path
import pandas as pd
import numpy as np
import json
import io
from typing import Dict, Any, Optional, List
import uuid
from datetime import datetime
import traceback

# Add bwr_tools to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "src"))

from bwr_tools import BWRPlots
from bwr_tools.config import DEFAULT_BWR_CONFIG
from bwr_tools.defillama.api_wrapper import defi_llama

# Import our modules
from .models import (
    PlotRequest, 
    PlotResponse, 
    DataProcessingConfig,
    SessionInfo,
    DeFiLlamaRequest,
    AgentMessage
)
from .session_manager import SessionManager
from .plot_service import PlotService
from .data_service import DataService
from .agent_service import AgentService

# Initialize services
session_manager = SessionManager()
plot_service = PlotService()
data_service = DataService()
agent_service = AgentService()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    # Startup
    print("Starting BWR Tools Backend...")
    yield
    # Shutdown
    print("Shutting down BWR Tools Backend...")
    await session_manager.cleanup()

# Create FastAPI app
app = FastAPI(
    title="BWR Tools API",
    description="Backend API for BWR plotting tools and research agent",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Add your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Check if the API is running"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

# Session endpoints
@app.post("/api/sessions/create")
async def create_session():
    """Create a new session"""
    session_id = await session_manager.create_session()
    return {"session_id": session_id}

@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    """Get session information"""
    session = await session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session"""
    success = await session_manager.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session deleted"}

# Data upload endpoint
@app.post("/api/data/upload/{session_id}")
async def upload_data(session_id: str, file: UploadFile = File(...)):
    """Upload data file for a session"""
    # Validate session
    session = await session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Validate file type
    if not file.filename.endswith(('.csv', '.xlsx', '.xls', '.parquet')):
        raise HTTPException(status_code=400, detail="Unsupported file type")
    
    try:
        # Read file content
        content = await file.read()
        
        # Process file based on type
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(content))
        elif file.filename.endswith('.parquet'):
            df = pd.read_parquet(io.BytesIO(content))
        
        # Store data in session
        await session_manager.store_data(session_id, df)
        
        # Return data info
        return {
            "session_id": session_id,
            "filename": file.filename,
            "shape": list(df.shape),
            "columns": df.columns.tolist(),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "preview": df.head(10).to_dict(orient='records')
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")

# Data processing endpoints
@app.post("/api/data/process/{session_id}")
async def process_data(session_id: str, config: DataProcessingConfig):
    """Apply data processing to session data"""
    # Get session data
    df = await session_manager.get_data(session_id)
    if df is None:
        raise HTTPException(status_code=404, detail="No data found for session")
    
    try:
        # Apply processing
        processed_df = await data_service.process_data(df, config)
        
        # Store processed data
        await session_manager.store_processed_data(session_id, processed_df)
        
        return {
            "success": true,
            "shape": list(processed_df.shape),
            "columns": processed_df.columns.tolist(),
            "preview": processed_df.head(10).to_dict(orient='records')
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing data: {str(e)}")

# Plot generation endpoints
@app.post("/api/plots/generate")
async def generate_plot(request: PlotRequest) -> PlotResponse:
    """Generate a plot using BWR Tools"""
    try:
        # Get session data
        df = await session_manager.get_processed_data(request.session_id)
        if df is None:
            df = await session_manager.get_data(request.session_id)
        
        if df is None:
            raise HTTPException(status_code=404, detail="No data found for session")
        
        # Generate plot
        result = await plot_service.generate_plot(
            df=df,
            plot_type=request.plot_type,
            config=request.configuration
        )
        
        return PlotResponse(**result)
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Plot generation failed: {str(e)}")

@app.get("/api/plots/types")
async def get_plot_types():
    """Get available plot types and their configurations"""
    return plot_service.get_available_plot_types()

@app.get("/api/plots/config/watermarks")
async def get_watermark_options():
    """Get available watermark options"""
    return {
        "available_watermarks": list(DEFAULT_BWR_CONFIG["watermark"]["available_watermarks"].keys()),
        "default": DEFAULT_BWR_CONFIG["watermark"]["selected_watermark_key"]
    }

# DeFi Llama API endpoints
@app.post("/api/defillama/{method}")
async def call_defillama_api(method: str, request: DeFiLlamaRequest):
    """Call DeFi Llama API methods"""
    try:
        client = defi_llama()
        
        # Check if method exists
        if not hasattr(client, method):
            raise HTTPException(status_code=404, detail=f"Method '{method}' not found")
        
        # Call method with parameters
        func = getattr(client, method)
        result = func(**request.parameters)
        
        # Convert result to appropriate format
        if isinstance(result, pd.DataFrame):
            return {
                "type": "dataframe",
                "data": result.to_dict(orient='records'),
                "columns": result.columns.tolist(),
                "shape": list(result.shape)
            }
        elif isinstance(result, dict):
            return {
                "type": "dict",
                "data": result
            }
        else:
            return {
                "type": "other",
                "data": str(result)
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DeFi Llama API error: {str(e)}")

@app.get("/api/defillama/methods")
async def get_defillama_methods():
    """Get available DeFi Llama API methods"""
    client = defi_llama()
    methods = []
    
    for name in dir(client):
        if not name.startswith('_') and callable(getattr(client, name)):
            if name not in ['print_all_functions', 'name_to_slug']:
                func = getattr(client, name)
                # Get function signature
                import inspect
                sig = inspect.signature(func)
                params = {}
                for param_name, param in sig.parameters.items():
                    if param_name != 'self':
                        params[param_name] = {
                            'required': param.default == param.empty,
                            'default': None if param.default == param.empty else param.default,
                            'type': str(param.annotation) if param.annotation != param.empty else 'any'
                        }
                
                methods.append({
                    'name': name,
                    'display_name': ' '.join(word.capitalize() for word in name.split('_')),
                    'parameters': params,
                    'description': func.__doc__ or ''
                })
    
    return methods

# WebSocket endpoint for research agent
@app.websocket("/ws/agent/{session_id}")
async def agent_websocket(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for research agent interactions"""
    await websocket.accept()
    
    try:
        # Validate session
        session = await session_manager.get_session(session_id)
        if not session:
            await websocket.send_json({"error": "Session not found"})
            await websocket.close()
            return
        
        # Initialize agent for session
        agent = await agent_service.get_or_create_agent(session_id)
        
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            message = AgentMessage(**data)
            
            # Process message with agent
            async for response in agent_service.process_message(
                agent=agent,
                message=message,
                session_id=session_id
            ):
                await websocket.send_json(response)
                
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.send_json({"error": str(e)})
    finally:
        await agent_service.cleanup_agent(session_id)

# Static file serving for exported plots
@app.get("/api/plots/export/{session_id}/{plot_id}")
async def export_plot(session_id: str, plot_id: str, format: str = "html"):
    """Export plot in various formats"""
    plot_data = await session_manager.get_plot(session_id, plot_id)
    if not plot_data:
        raise HTTPException(status_code=404, detail="Plot not found")
    
    if format == "html":
        html_content = plot_data.get("html", "")
        return StreamingResponse(
            io.BytesIO(html_content.encode()),
            media_type="text/html",
            headers={"Content-Disposition": f"attachment; filename=plot_{plot_id}.html"}
        )
    elif format == "png":
        # TODO: Implement PNG export using plotly
        raise HTTPException(status_code=501, detail="PNG export not yet implemented")
    else:
        raise HTTPException(status_code=400, detail="Unsupported export format")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)