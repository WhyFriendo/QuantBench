"""Verify the optimized TaskManager approach loads only MMLU tasks quickly."""
import time
import os

print("=== Optimized TaskManager test ===")
t0 = time.time()
import lm_eval
from lm_eval.tasks import TaskManager
t1 = time.time()
print(f"  Imports: {t1 - t0:.1f}s")

TASKS = ["mmlu"]

# Only index the mmlu directory
lm_eval_tasks_dir = os.path.dirname(os.path.abspath(lm_eval.tasks.__file__))
task_dirs = [os.path.join(lm_eval_tasks_dir, t) for t in TASKS]
print(f"  Scanning: {task_dirs}")

t2 = time.time()
task_manager = TaskManager(include_path=task_dirs, include_defaults=False)
t3 = time.time()
print(f"  TaskManager init: {t3 - t2:.1f}s (was ~96s with defaults)")

t4 = time.time()
task_dict = lm_eval.tasks.get_task_dict(TASKS, task_manager=task_manager)
t5 = time.time()
print(f"  get_task_dict:    {t5 - t4:.1f}s (was ~66s with defaults)")

print(f"\n  Total:            {t5 - t0:.1f}s")
print(f"  Indexed tasks:    {len(task_manager.all_tasks)}")
print("  Done!")
