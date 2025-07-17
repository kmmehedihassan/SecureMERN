import threading
import time
import requests
import os
from collections import Counter

# Configuration
LOGIN_URL       = os.getenv("LOGIN_URL", "http://localhost:5002/api/auth/login")
DURATION_SEC    = 5 * 60       # 5 minutes
REQUESTS_PER_MIN= 1000         # total per minute
THREAD_COUNT    = 10
BAD_PASSWORD    = "000000"     # fake 2FA code
EMAIL_TEMPLATE  = "baduser{}@example.com"

# Shared counter
counts = Counter()

def worker(thread_id):
    session = requests.Session()
    end_time = time.time() + DURATION_SEC
    interval = 60.0 / (REQUESTS_PER_MIN / THREAD_COUNT)
    i = thread_id
    while time.time() < end_time:
        payload = {
            "email": EMAIL_TEMPLATE.format(i),
            "password": "wrongpassword",
            "twoFactorCode": BAD_PASSWORD
        }
        try:
            r = session.post(LOGIN_URL, json=payload, timeout=5)
            counts[r.status_code] += 1
        except Exception:
            counts["error"] += 1
        time.sleep(interval)
        i += THREAD_COUNT

if __name__ == "__main__":
    threads = []
    for t in range(THREAD_COUNT):
        th = threading.Thread(target=worker, args=(t,))
        th.start()
        threads.append(th)
    for th in threads:
        th.join()

    total = sum(counts.values())
    for code, ct in counts.items():
        print(f"{code}: {ct} ({ct/total*100:.1f}%)")
