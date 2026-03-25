from fastapi import FastAPI
import lm_eval

eval_resullts: dict[str, dict] = {}


def run_evaluation():
    try:
        model_name = "gpt2"
        results = lm_eval.simple_evaluate(
            model="hf",
            model_args = f"pretrained={model_name},dtype=float32",
            tasks=["hellaswag", "arc_easy"],
            num_fewshot=5,
            batch_size=8,
            device="cuda",
)
        eval_resullts[model_name] = results["results"]
    except Exception as e:
        print(f"An error occurred during evaluation: {e}")

app = FastAPI()


@app.post("/eval")
def evaluate():
    run_evaluation()
    return {"message": "Evaluation completed", "results": eval_resullts}

print(eval_resullts)