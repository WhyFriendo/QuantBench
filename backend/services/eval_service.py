import os
import json
import uuid
import asyncio
from datetime import datetime
from typing import Dict, Any, List

# A simple in-memory store for evaluation statuses and results.
# In a real app, use a database (SQLite/Postgres).
runs: Dict[str, Dict[str, Any]] = {}

def get_available_tasks() -> List[str]:
    """Return a list of common lm_eval tasks."""
    # To keep it fast, we return a hardcoded curated list.
    # We could dynamically load using lm_eval.tasks.TaskManager() but it's slow to start.
    return [
        "hellaswag",
        "mmlu",
        "arc_challenge",
        "arc_easy",
        "truthfulqa_mc1",
        "truthfulqa_mc2",
        "winogrande",
        "gsm8k"
    ]

def run_evaluation_task(run_id: str, model_path: str, tasks: str, limit: int = None):
    """
    Run lm_eval evaluation. FastAPI BackgroundTasks will automatically run this in a thread pool.
    """
    runs[run_id]["status"] = "running"
    
    try:
        import lm_eval
        
        # Using simple evaluator for the GGUF backend.
        model_args = f"pretrained={model_path}"
        
        # Use simple evaluation
        results = lm_eval.simple_evaluate(
            model="hf-gguf",
            model_args=model_args,
            tasks=tasks.split(","),
            limit=limit,
            device="cpu", # Change to "cuda" if using GPU version
            batch_size="auto"
        )
        
        runs[run_id]["status"] = "completed"
        runs[run_id]["results"] = results
        runs[run_id]["completed_at"] = datetime.now().isoformat()
        
    except Exception as e:
        runs[run_id]["status"] = "failed"
        runs[run_id]["error"] = str(e)
        runs[run_id]["completed_at"] = datetime.now().isoformat()

def start_evaluation(model_path: str, tasks: List[str], limit: int = None, background_tasks = None) -> str:
    """Initialize a new run and return its ID."""
    run_id = str(uuid.uuid4())
    runs[run_id] = {
        "id": run_id,
        "model": model_path,
        "tasks": tasks,
        "status": "pending",
        "created_at": datetime.now().isoformat()
    }
    
    # Delegate to FastAPI's background thread worker pool
    if background_tasks:
        background_tasks.add_task(run_evaluation_task, run_id, model_path, ",".join(tasks), limit)
        
    return run_id

def get_run_status(run_id: str) -> Dict[str, Any]:
    if run_id not in runs:
        return {"error": "Run not found"}
    return runs[run_id]

def get_all_runs() -> List[Dict[str, Any]]:
    return list(runs.values())
