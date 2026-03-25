import os
import json
import uuid
import asyncio
import csv
from datetime import datetime
from typing import Dict, Any, List

#simple storage, for change later
runs: Dict[str, Dict[str, Any]] = {}

def sanitize_results(results: Any) -> Any:
    """Convert evaluation results to JSON-serializable format."""
    if isinstance(results, dict):
        return {k: sanitize_results(v) for k, v in results.items()}
    elif isinstance(results, list):
        return [sanitize_results(item) for item in results]
    elif isinstance(results, (str, int, float, bool, type(None))):
        return results
    else:
        # Convert non-serializable objects to strings
        return str(results)

def get_available_tasks() -> List[str]:
    """Return a list of common lm_eval tasks."""
    # To keep it fast, we return a hardcoded curated list.
    return [
        "mmlu",
        "mmlu_pro",
        "humaneval",
        "gsm8k",
        "ifeval",
        "hella_swag"
    ]

def get_configured_models() -> List[str]:
    """Read the list of models from models.txt."""
    models_file = "models.txt"
    if not os.path.exists(models_file):
        with open(models_file, "w") as f:
            f.write("# Add your models here, one per line\n")
            f.write("bartowski/microsoft_Phi-4-mini-instruct-GGUF,gguf_file=microsoft_Phi-4-mini-instruct-IQ2_M.gguf\n")
            
    with open(models_file, "r") as f:
        models = [line.strip() for line in f if line.strip() and not line.startswith("#")]
        
    if not models:
        # Fallback if file is empty
        models = ["bartowski/microsoft_Phi-4-mini-instruct-GGUF,quantization=gguf"]
    return models

def export_csv(all_results: list):
    """Export the benchmark results to a CSV file."""
    if not all_results: return
    filename = f"benchmark_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    with open(filename, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Model", "Task", "Metric", "Value"])
        for res in all_results:
            model = res["model"]
            results_dict = res["results"]
            for task, metrics in results_dict.items():
                if isinstance(metrics, dict):
                    for metric, value in metrics.items():
                        writer.writerow([model, task, metric, value])

def run_evaluation_batch(batch_run_ids: List[str], models: List[str], tasks: str, limit: int = 250):
    """
    Run lm_eval evaluation for multiple models in sequence.
    FastAPI BackgroundTasks will automatically run this in a thread pool.
    """
    all_results_for_csv = []
    os.environ["HF_ALLOW_CODE_EVAL"] = "1"
    
    for run_id, model_path in zip(batch_run_ids, models):
        runs[run_id]["status"] = "running"
        
        try:
            import lm_eval
            
            results = lm_eval.simple_evaluate(
                model="vllm",
                model_args=f"pretrained={model_path}",
                tasks=tasks.split(","),
                limit=limit,
                batch_size="auto"
            )
            print(results)
            
            sanitized = sanitize_results(results)
            runs[run_id]["status"] = "completed"
            runs[run_id]["results"] = sanitized
            runs[run_id]["completed_at"] = datetime.now().isoformat()
            
            if "results" in sanitized and isinstance(sanitized["results"], dict):
                all_results_for_csv.append({
                    "model": model_path,
                    "results": sanitized["results"]
                })
            
        except Exception as e:
            import traceback
            error_msg = traceback.format_exc()
            print(f"Evaluation error: {error_msg}")
            runs[run_id]["status"] = "failed"
            runs[run_id]["error"] = error_msg
            runs[run_id]["completed_at"] = datetime.now().isoformat()

    # Create the CSV export when all models are done
    export_csv(all_results_for_csv)

def start_evaluation(tasks: List[str], limit: int = None, background_tasks = None) -> str:
    """Initialize new runs for all configured models and return the first ID."""
    models = get_configured_models()
    batch_run_ids = []
    
    for model_path in models:
        run_id = str(uuid.uuid4())
        runs[run_id] = {
            "id": run_id,
            "model": model_path,
            "tasks": tasks,
            "status": "pending",
            "created_at": datetime.now().isoformat()
        }
        batch_run_ids.append(run_id)
    
    # Delegate to FastAPI's background thread worker pool
    if background_tasks and batch_run_ids:
        background_tasks.add_task(run_evaluation_batch, batch_run_ids, models, ",".join(tasks), limit)
        
    return batch_run_ids[0] if batch_run_ids else ""

def get_run_status(run_id: str) -> Dict[str, Any]:
    if run_id not in runs:
        return {"error": "Run not found"}
    return runs[run_id]

def get_all_runs() -> List[Dict[str, Any]]:
    return list(runs.values())
