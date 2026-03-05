from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
from backend.services import eval_service

router = APIRouter()

class EvalRequest(BaseModel):
    model_path: str
    tasks: List[str]
    limit: Optional[int] = None

@router.get("/status")
def get_status():
    return {"status": "ok"}

@router.get("/tasks")
def list_tasks():
    """Get available benchmark tasks."""
    return {"tasks": eval_service.get_available_tasks()}

@router.post("/runs")
def start_run(request: EvalRequest, background_tasks: BackgroundTasks):
    """Start a new benchmark run."""
    run_id = eval_service.start_evaluation(request.model_path, request.tasks, request.limit, background_tasks)
    return {"run_id": run_id, "status": "pending"}

@router.get("/runs")
def get_runs():
    """Get all past and current runs."""
    return eval_service.get_all_runs()

@router.get("/runs/{run_id}")
def get_run(run_id: str):
    """Get the status and results of a specific run."""
    res = eval_service.get_run_status(run_id)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res
