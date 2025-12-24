import requests
import json
import time
import sys

BASE_URL = "http://localhost:8000"
EMAIL = "admin@demo.com"
PASSWORD = "password123"

def main():
    print(f"Logging in as {EMAIL}...")
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        sys.exit(1)
    
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Login successful.")

    print("Fetching verifications...")
    resp = requests.get(f"{BASE_URL}/verifications", headers=headers)
    if resp.status_code != 200:
        print(f"List failed: {resp.text}")
        sys.exit(1)
    
    verifications = resp.json()
    print(f"Found {len(verifications)} verifications.")
    if not verifications:
        print("No verifications found to test.")
        sys.exit(0)
    
    # Pick the first one
    v = verifications[0]
    vid = v["id"]
    print(f"Testing verification ID: {vid}, Status: {v['status']}")

    if v["status"] == "pending":
        print("Verification is pending. Triggering run...")
        resp = requests.post(f"{BASE_URL}/verifications/{vid}/run", headers=headers)
        if resp.status_code != 200:
            print(f"Run failed: {resp.text}")
            sys.exit(1)
        print("Run triggered.")
        
        # Poll for status change
        for i in range(10):
            time.sleep(2)
            resp = requests.get(f"{BASE_URL}/verifications/{vid}", headers=headers)
            v = resp.json()
            print(f"poll {i+1}: status={v['status']}")
            if v["status"] != "pending" and v["status"] != "running":
                break
        
        print(f"Final Status: {v['status']}")
    
    # Check Summary
    print("Fetching summary...")
    resp = requests.get(f"{BASE_URL}/verifications/{vid}/summary", headers=headers)
    if resp.status_code == 200:
        summary = resp.json()
        print(f"Summary Fields: {len(summary.get('fields', []))}")
        for field in summary.get('fields', []):
            print(f" - {field['field_name']}: {field['value_json']} (Confidence: {field['confidence']})")
    else:
        print(f"Summary fetch failed: {resp.text}")

    # Check Audit
    print("Fetching audit log...")
    resp = requests.get(f"{BASE_URL}/audit/verifications/{vid}", headers=headers)
    # Actually route is /audit?verification_id=... probably?
    # Let's check audit route definition
    
    # Finalize
    print("Finalizing verification...")
    resp = requests.post(f"{BASE_URL}/verifications/{vid}/finalize", headers=headers)
    if resp.status_code == 200:
        print("Finalize triggered.")
    else:
        print(f"Finalize failed: {resp.text}")
        sys.exit(1)

    # Poll for report
    print("Waiting for report generation...")
    for i in range(10):
        time.sleep(2)
        resp = requests.get(f"{BASE_URL}/verifications/{vid}/report", headers=headers)
        if resp.status_code == 200:
            print(f"Report URL: {resp.json().get('download_url')}")
            break
        elif resp.status_code == 404:
            print(f"poll {i+1}: report not ready")
        else:
            print(f"Report check failed: {resp.text}")
            break
    else:
        print("Report generation timed out.")


if __name__ == "__main__":
    main()
