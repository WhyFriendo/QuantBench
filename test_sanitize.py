import lm_eval
from backend.services.eval_service import sanitize_results
import traceback

print("Running evaluation...")
try:
    results = lm_eval.simple_evaluate(
        model="hf",
        model_args="pretrained=bartowski/microsoft_Phi-4-mini-instruct-GGUF,gguf_file=microsoft_Phi-4-mini-instruct-IQ2_M.gguf",
        tasks=["hellaswag"],
        limit=1,
    )
    print("Evaluation done. Sanitizing...")
    sanitized = sanitize_results(results)
    print("Sanitized successfully.")
except Exception as e:
    print(f"Error occurred: {e}")
    traceback.print_exc()

