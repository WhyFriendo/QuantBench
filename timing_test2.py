"""Check what's cached and where the time goes in the full test_script flow."""
import time
import os

# Check if model is already cached
print("=== Checking HuggingFace cache for the GGUF model ===")
try:
    from huggingface_hub import hf_hub_download, try_to_load_from_cache
    
    REPO_ID = "bartowski/microsoft_Phi-4-mini-instruct-GGUF"
    GGUF_FILE = "microsoft_Phi-4-mini-instruct-IQ2_M.gguf"
    
    cached = try_to_load_from_cache(REPO_ID, GGUF_FILE)
    if cached and isinstance(cached, str):
        size_gb = os.path.getsize(cached) / (1024**3)
        print(f"  Model IS cached at: {cached}")
        print(f"  Size: {size_gb:.2f} GB")
    else:
        print(f"  Model is NOT cached - will need to download!")
        print(f"  This is likely why it takes so long.")
except Exception as e:
    print(f"  Error checking cache: {e}")

# Check lm_eval task data
print("\n=== Checking lm_eval task data ===")
try:
    t = time.time()
    import lm_eval.tasks
    manager = lm_eval.tasks.TaskManager()
    print(f"  TaskManager init: {time.time()-t:.1f}s")
    
    # Check if MMLU data needs downloading
    t = time.time()
    task_dict = lm_eval.tasks.get_task_dict(["mmlu"], task_manager=manager)
    print(f"  MMLU task load: {time.time()-t:.1f}s")
except Exception as e:
    print(f"  Error: {e}")

print("\nDone!")
