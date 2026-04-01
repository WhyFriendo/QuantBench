"""Quick script to identify where the startup time is being spent."""
import time

print("Timing imports and startup...")

t0 = time.time()
import llama_cpp
t1 = time.time()
print(f"  import llama_cpp:  {t1 - t0:.1f}s")

t2 = time.time()
import lm_eval
t3 = time.time()
print(f"  import lm_eval:    {t3 - t2:.1f}s")

# Check if CUDA is available for llama.cpp
t4 = time.time()
try:
    import llama_cpp.llama_cpp as lib
    print(f"  llama_cpp backend loaded")
except Exception as e:
    print(f"  llama_cpp backend error: {e}")
t5 = time.time()
print(f"  backend check:     {t5 - t4:.1f}s")

# Check torch CUDA
try:
    import torch
    print(f"  torch.cuda.is_available(): {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"  GPU: {torch.cuda.get_device_name(0)}")
except ImportError:
    print("  torch not installed")

print(f"\nTotal import time: {time.time() - t0:.1f}s")
