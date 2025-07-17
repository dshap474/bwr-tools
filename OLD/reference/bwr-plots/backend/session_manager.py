"""
Session management for the FastAPI backend
Handles data storage and retrieval for user sessions
"""

import os
import json
import uuid
from datetime import datetime, timedelta
from pathlib import Path
import pandas as pd
from typing import Optional, Dict, Any, List
import aiofiles
import asyncio
from contextlib import asynccontextmanager


class SessionManager:
    """Manages user sessions and associated data"""
    
    def __init__(self, storage_path: str = "./storage/sessions"):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        self.sessions: Dict[str, Dict[str, Any]] = {}
        self._cleanup_task = None
        
    async def create_session(self) -> str:
        """Create a new session"""
        session_id = f"session_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:8]}"
        
        session_info = {
            "session_id": session_id,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "has_data": False,
            "has_processed_data": False,
            "data_shape": None,
            "data_columns": None,
            "plots": [],
            "metadata": {}
        }
        
        # Store in memory
        self.sessions[session_id] = session_info
        
        # Create session directory
        session_dir = self.storage_path / session_id
        session_dir.mkdir(exist_ok=True)
        
        # Save session metadata
        await self._save_session_metadata(session_id, session_info)
        
        return session_id
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session information"""
        # Check memory first
        if session_id in self.sessions:
            return self.sessions[session_id]
        
        # Try to load from disk
        session_file = self.storage_path / session_id / "session.json"
        if session_file.exists():
            async with aiofiles.open(session_file, 'r') as f:
                content = await f.read()
                session_info = json.loads(content)
                self.sessions[session_id] = session_info
                return session_info
        
        return None
    
    async def update_session(self, session_id: str, updates: Dict[str, Any]):
        """Update session information"""
        session = await self.get_session(session_id)
        if not session:
            return False
        
        session.update(updates)
        session["updated_at"] = datetime.utcnow().isoformat()
        
        await self._save_session_metadata(session_id, session)
        return True
    
    async def delete_session(self, session_id: str) -> bool:
        """Delete a session and all associated data"""
        # Remove from memory
        if session_id in self.sessions:
            del self.sessions[session_id]
        
        # Remove from disk
        session_dir = self.storage_path / session_id
        if session_dir.exists():
            import shutil
            shutil.rmtree(session_dir)
            return True
        
        return False
    
    async def store_data(self, session_id: str, df: pd.DataFrame):
        """Store raw data for a session"""
        session_dir = self.storage_path / session_id
        data_file = session_dir / "data.parquet"
        
        # Save data
        df.to_parquet(data_file)
        
        # Update session info
        await self.update_session(session_id, {
            "has_data": True,
            "data_shape": list(df.shape),
            "data_columns": df.columns.tolist()
        })
    
    async def store_processed_data(self, session_id: str, df: pd.DataFrame):
        """Store processed data for a session"""
        session_dir = self.storage_path / session_id
        data_file = session_dir / "processed_data.parquet"
        
        # Save data
        df.to_parquet(data_file)
        
        # Update session info
        await self.update_session(session_id, {
            "has_processed_data": True,
            "processed_shape": list(df.shape),
            "processed_columns": df.columns.tolist()
        })
    
    async def get_data(self, session_id: str) -> Optional[pd.DataFrame]:
        """Get raw data for a session"""
        session_dir = self.storage_path / session_id
        data_file = session_dir / "data.parquet"
        
        if data_file.exists():
            return pd.read_parquet(data_file)
        
        return None
    
    async def get_processed_data(self, session_id: str) -> Optional[pd.DataFrame]:
        """Get processed data for a session"""
        session_dir = self.storage_path / session_id
        data_file = session_dir / "processed_data.parquet"
        
        if data_file.exists():
            return pd.read_parquet(data_file)
        
        return None
    
    async def store_plot(self, session_id: str, plot_id: str, plot_data: Dict[str, Any]):
        """Store plot data for a session"""
        session_dir = self.storage_path / session_id / "plots"
        session_dir.mkdir(exist_ok=True)
        
        plot_file = session_dir / f"{plot_id}.json"
        
        async with aiofiles.open(plot_file, 'w') as f:
            await f.write(json.dumps(plot_data))
        
        # Update session plots list
        session = await self.get_session(session_id)
        if session and plot_id not in session.get("plots", []):
            session["plots"].append(plot_id)
            await self.update_session(session_id, {"plots": session["plots"]})
    
    async def get_plot(self, session_id: str, plot_id: str) -> Optional[Dict[str, Any]]:
        """Get plot data for a session"""
        plot_file = self.storage_path / session_id / "plots" / f"{plot_id}.json"
        
        if plot_file.exists():
            async with aiofiles.open(plot_file, 'r') as f:
                content = await f.read()
                return json.loads(content)
        
        return None
    
    async def cleanup_old_sessions(self, max_age_hours: int = 24):
        """Clean up sessions older than max_age_hours"""
        cutoff_time = datetime.utcnow() - timedelta(hours=max_age_hours)
        
        for session_dir in self.storage_path.iterdir():
            if session_dir.is_dir():
                session_file = session_dir / "session.json"
                if session_file.exists():
                    try:
                        async with aiofiles.open(session_file, 'r') as f:
                            content = await f.read()
                            session_info = json.loads(content)
                        
                        created_at = datetime.fromisoformat(session_info["created_at"])
                        if created_at < cutoff_time:
                            await self.delete_session(session_info["session_id"])
                            print(f"Cleaned up old session: {session_info['session_id']}")
                    except Exception as e:
                        print(f"Error cleaning up session {session_dir.name}: {e}")
    
    async def start_cleanup_task(self):
        """Start periodic cleanup task"""
        async def cleanup_loop():
            while True:
                try:
                    await self.cleanup_old_sessions()
                except Exception as e:
                    print(f"Error in cleanup task: {e}")
                await asyncio.sleep(3600)  # Run every hour
        
        self._cleanup_task = asyncio.create_task(cleanup_loop())
    
    async def cleanup(self):
        """Clean up resources"""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
    
    async def _save_session_metadata(self, session_id: str, session_info: Dict[str, Any]):
        """Save session metadata to disk"""
        session_file = self.storage_path / session_id / "session.json"
        
        async with aiofiles.open(session_file, 'w') as f:
            await f.write(json.dumps(session_info, indent=2))