import requests
import time

url = "http://127.0.0.1:8000/api/runs"

payload = {
    "model_path": "bartowski/microsoft_Phi-4-mini-instruct-GGUF,gguf_file=microsoft_Phi-4-mini-instruct-IQ2_M.gguf",
    "tasks": ["hellaswag"],
    "limit": 1
}

print("Starting run...")
response = requests.post(url, json=payload)
if response.status_code != 200:
    print(f"Error starting run: {response.text}")
    exit(1)

run_id = response.json()["run_id"]
print(f"Run started with ID: {run_id}")

while True:
    res = requests.get(f"{url}/{run_id}")
    if res.status_code == 200:
        data = res.json()
        status = data.get("status")
        print(f"Status: {status}")
        if status in ["completed", "failed"]:
            print("Run finished!")
            if "error" in data:
                print("Error details:")
                print(data["error"])
            break
    else:
        print(f"Wait, error fetching run? {res.status_code} {res.text}")
        
    time.sleep(2)
