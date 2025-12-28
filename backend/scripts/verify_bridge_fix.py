import sys
import os
import requests
import time
import json

API_BASE = "http://localhost:8000"

def login():
    try:
        resp = requests.post(f"{API_BASE}/auth/login", json={
            "email": "admin@medos.com",
            "password": "admin123"
        })
        resp.raise_for_status()
        return resp.json()["access_token"]
    except requests.exceptions.RequestException as e:
        print(f"Login failed: {e}")
        if e.response:
            print(f"Response: {e.response.text}")
        sys.exit(1)

def verify():
    print(f"Targeting API: {API_BASE}")
    token = login()
    headers = {"Authorization": f"Bearer {token}"}
    print("Logged in successfully.")

    # 1. Simulate Fax Upload
    print("Simulating Fax Upload...")
    resp = requests.post(f"{API_BASE}/intake/fax-upload", params={"file_name": "verify_fix_test.pdf"}, headers=headers)
    resp.raise_for_status()
    item = resp.json()
    item_id = item["id"]
    print(f"Created Intake Item: {item_id}")

    # 2. Trigger Classify
    print("Triggering Classification...")
    resp = requests.post(f"{API_BASE}/intake/{item_id}/classify", headers=headers)
    resp.raise_for_status()
    
    # 3. Poll for Status
    print("Waiting for Classification (polling)...", end="", flush=True)
    max_retries = 20
    classified = False
    for _ in range(max_retries):
        resp = requests.get(f"{API_BASE}/intake/", headers=headers)
        items = resp.json()
        # Find our item
        target = next((i for i in items if i["id"] == item_id), None)
        if target and target["status"] == "classified":
            print(" Done!")
            classified = True
            break
        print(".", end="", flush=True)
        time.sleep(1)
    
    if not classified:
        print("\nTimeout waiting for classification. Is the worker running?")
        sys.exit(1)

    # 4. Bridge to Case
    print(f"Bridging Item {item_id}...")
    resp = requests.post(f"{API_BASE}/intake/{item_id}/bridge", headers=headers)
    
    if resp.status_code == 200:
        data = resp.json()
        print("\nSUCCESS: Bridge API returned 200 OK")
        print(f"Response: {json.dumps(data, indent=2)}")
        if data.get("status") == "bridged" and "verification_id" in data:
            print("Verification PASSED: Bridge functionality works.")
        else:
            print("Verification FAILED: Unexpected response format.")
    else:
        print("\nFAILURE: Bridge API failed")
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")
        sys.exit(1)

if __name__ == "__main__":
    verify()
