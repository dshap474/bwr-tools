"""
Research agent service for autonomous data analysis and visualization
"""

import asyncio
from typing import Dict, Any, Optional, List, AsyncGenerator
import json
from datetime import datetime
import pandas as pd
from dataclasses import dataclass, field

from .models import AgentMessage, AgentResponse
from .session_manager import SessionManager
from .plot_service import PlotService
from .data_service import DataService
from bwr_tools.defillama.api_wrapper import defi_llama


@dataclass
class ResearchAgent:
    """Research agent for a specific session"""
    session_id: str
    created_at: datetime = field(default_factory=datetime.utcnow)
    context: List[Dict[str, Any]] = field(default_factory=list)
    tools: Dict[str, Any] = field(default_factory=dict)
    
    def add_message(self, message: AgentMessage):
        """Add message to context"""
        self.context.append({
            "timestamp": datetime.utcnow().isoformat(),
            "type": message.type,
            "content": message.content,
            "metadata": message.metadata
        })


class AgentService:
    """Service managing research agents"""
    
    def __init__(self):
        self.agents: Dict[str, ResearchAgent] = {}
        self.session_manager = SessionManager()
        self.plot_service = PlotService()
        self.data_service = DataService()
        self.defi_client = defi_llama()
    
    async def get_or_create_agent(self, session_id: str) -> ResearchAgent:
        """Get existing agent or create new one for session"""
        if session_id not in self.agents:
            agent = ResearchAgent(
                session_id=session_id,
                tools={
                    "plot": self.plot_service,
                    "data": self.data_service,
                    "defi": self.defi_client,
                    "session": self.session_manager
                }
            )
            self.agents[session_id] = agent
        
        return self.agents[session_id]
    
    async def process_message(
        self,
        agent: ResearchAgent,
        message: AgentMessage,
        session_id: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Process a message and yield responses"""
        
        # Add message to agent context
        agent.add_message(message)
        
        # Simple echo implementation for now
        # TODO: Integrate with LLM (LangChain, OpenAI, Anthropic, etc.)
        
        yield {
            "type": "thinking",
            "content": "Processing your request...",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Simulate processing
        await asyncio.sleep(1)
        
        # Example: If user asks for data summary
        if "summary" in message.content.lower() or "describe" in message.content.lower():
            df = await self.session_manager.get_data(session_id)
            if df is not None:
                summary = await self._generate_data_summary(df)
                yield {
                    "type": "result",
                    "content": summary,
                    "timestamp": datetime.utcnow().isoformat()
                }
            else:
                yield {
                    "type": "result",
                    "content": "No data uploaded yet. Please upload a dataset first.",
                    "timestamp": datetime.utcnow().isoformat()
                }
        
        # Example: If user asks for a plot
        elif "plot" in message.content.lower() or "chart" in message.content.lower():
            yield {
                "type": "tool_call",
                "content": "Generating visualization...",
                "tool": "plot",
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # TODO: Extract plot parameters from message
            # For now, return a suggestion
            yield {
                "type": "result",
                "content": "To generate a plot, please specify:\n- Plot type (line, bar, scatter, etc.)\n- X and Y columns\n- Any additional configuration",
                "timestamp": datetime.utcnow().isoformat()
            }
        
        # Example: DeFi data request
        elif "defi" in message.content.lower() or "tvl" in message.content.lower():
            yield {
                "type": "tool_call",
                "content": "Fetching DeFi data...",
                "tool": "defi_llama",
                "timestamp": datetime.utcnow().isoformat()
            }
            
            try:
                # Example: Get TVL for all protocols
                tvl_data = self.defi_client.get_all_protocols_tvl()
                if isinstance(tvl_data, pd.DataFrame) and not tvl_data.empty:
                    # Store in session
                    await self.session_manager.store_data(session_id, tvl_data)
                    
                    yield {
                        "type": "result",
                        "content": f"Fetched TVL data for {len(tvl_data)} protocols. Data has been loaded into your session.",
                        "metadata": {
                            "rows": len(tvl_data),
                            "columns": tvl_data.columns.tolist()
                        },
                        "timestamp": datetime.utcnow().isoformat()
                    }
                else:
                    yield {
                        "type": "error",
                        "content": "Failed to fetch DeFi data",
                        "timestamp": datetime.utcnow().isoformat()
                    }
            except Exception as e:
                yield {
                    "type": "error",
                    "content": f"Error fetching DeFi data: {str(e)}",
                    "timestamp": datetime.utcnow().isoformat()
                }
        
        else:
            # Default response
            yield {
                "type": "result",
                "content": f"I understand you said: '{message.content}'. I'm a research agent that can help you analyze data, create visualizations, and fetch DeFi data. Try asking me to:\n- Describe your data\n- Create a plot\n- Fetch DeFi TVL data",
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def _generate_data_summary(self, df: pd.DataFrame) -> str:
        """Generate a summary of the dataframe"""
        summary_parts = [
            f"**Data Summary**",
            f"- Shape: {df.shape[0]} rows × {df.shape[1]} columns",
            f"- Columns: {', '.join(df.columns[:5])}" + (" ..." if len(df.columns) > 5 else ""),
            f"- Memory usage: {df.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB",
            ""
        ]
        
        # Add column types
        dtypes_summary = df.dtypes.value_counts()
        summary_parts.append("**Column Types:**")
        for dtype, count in dtypes_summary.items():
            summary_parts.append(f"- {dtype}: {count} columns")
        summary_parts.append("")
        
        # Add numeric summary
        numeric_cols = df.select_dtypes(include=['number']).columns
        if len(numeric_cols) > 0:
            summary_parts.append("**Numeric Columns Summary:**")
            for col in numeric_cols[:3]:  # Show first 3
                summary_parts.append(f"- {col}: min={df[col].min():.2f}, max={df[col].max():.2f}, mean={df[col].mean():.2f}")
            if len(numeric_cols) > 3:
                summary_parts.append(f"- ... and {len(numeric_cols) - 3} more numeric columns")
        
        return "\n".join(summary_parts)
    
    async def cleanup_agent(self, session_id: str):
        """Clean up agent resources"""
        if session_id in self.agents:
            del self.agents[session_id]
    
    async def get_agent_context(self, session_id: str) -> List[Dict[str, Any]]:
        """Get agent conversation context"""
        agent = self.agents.get(session_id)
        if agent:
            return agent.context
        return []