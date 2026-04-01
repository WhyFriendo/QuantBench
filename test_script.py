"""
Quick smoke-test: start a llama-cpp-python server and run lm_eval against it
using the built-in 'gguf' model backend.

Usage:
    python test_script.py
"""

import subprocess
import sys
import time
import urllib.request
from urllib.error import URLError

# ── Configuration ──────────────────────────────────────────────
REPO_ID   = "bartowski/microsoft_Phi-4-mini-instruct-GGUF"
GGUF_FILE = "microsoft_Phi-4-mini-instruct-IQ2_M.gguf"
HOST      = "127.0.0.1"
PORT      = "8002"
TASKS     = ["mmlu"]
LIMIT     = 10          # small limit for a quick smoke-test
# ───────────────────────────────────────────────────────────────

base_url = f"http://{HOST}:{PORT}"

# 1. Start the llama-cpp-python server
server_cmd = [
    sys.executable, "-m", "llama_cpp.server",
    "--hf_model_repo_id", REPO_ID,
    "--model", GGUF_FILE,
    "--host", HOST,
    "--port", PORT,
    "--n_gpu_layers", "-1",
]
print(f"Starting server: {' '.join(server_cmd)}")
# Let server output print to console so we can see loading progress / errors
server = subprocess.Popen(server_cmd)

# 2. Wait for the server to be ready
print("Waiting for the server to become ready...")
try:
    ready = False
    for attempt in range(90):   # up to 180 s
        # Check if the server process has crashed
        ret = server.poll()
        if ret is not None:
            raise RuntimeError(f"Server process exited with code {ret}")
        try:
            urllib.request.urlopen(f"{base_url}/v1/models")
            ready = True
            break
        except URLError:
            if attempt % 5 == 0:
                print(f"  ... still waiting ({attempt * 2}s elapsed)")
            time.sleep(2)

    if not ready:
        raise RuntimeError("Server did not become ready within 180 s")
    print("Server is ready!\n")

    # 3. Run lm_eval using the built-in 'gguf' backend
    import lm_eval
    from lm_eval.tasks import TaskManager
    import os

    # Optimization: only index the task directories we actually need,
    # instead of scanning all 13k+ YAML configs (which takes ~2 min on Windows).
    lm_eval_tasks_dir = os.path.join(
        os.path.dirname(os.path.abspath(lm_eval.tasks.__file__))
    )
    task_dirs = [os.path.join(lm_eval_tasks_dir, t) for t in TASKS]
    task_manager = TaskManager(
        include_path=task_dirs,
        include_defaults=False,
    )

    results = lm_eval.simple_evaluate(
        model="gguf",
        model_args=f"base_url={base_url}",
        tasks=TASKS,
        limit=LIMIT,
        batch_size=1,
        task_manager=task_manager,
    )

    # 4. Print results
    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    if "results" in results:
        for task_name, metrics in results["results"].items():
            print(f"\n  {task_name}:")
            for k, v in metrics.items():
                print(f"    {k}: {v}")
    else:
        print(results)

finally:
    # 5. Always clean up the server
    print("\nTerminating server...")
    server.terminate()
    try:
        server.wait(timeout=5)
    except subprocess.TimeoutExpired:
        server.kill()
    print("Done.")