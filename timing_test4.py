"""Profile what happens during get_task_dict to find the remaining bottleneck."""
import time
import os
import logging

# Enable detailed logging to see what's happening
logging.basicConfig(level=logging.DEBUG, format='%(name)s - %(message)s')

t0 = time.time()
import lm_eval
from lm_eval.tasks import TaskManager
t1 = time.time()
print(f"\n  Imports: {t1 - t0:.1f}s")

TASKS = ["mmlu"]
lm_eval_tasks_dir = os.path.dirname(os.path.abspath(lm_eval.tasks.__file__))
task_dirs = [os.path.join(lm_eval_tasks_dir, t) for t in TASKS]

t2 = time.time()
task_manager = TaskManager(include_path=task_dirs, include_defaults=False)
t3 = time.time()
print(f"  TaskManager init: {t3 - t2:.1f}s")

print(f"\n  Starting get_task_dict... (this takes ~66s)")
t4 = time.time()
task_dict = lm_eval.tasks.get_task_dict(TASKS, task_manager=task_manager)
t5 = time.time()
print(f"\n  get_task_dict: {t5 - t4:.1f}s")
