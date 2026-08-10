import re

log_path = r"C:\Users\Aayush\.gemini\antigravity-ide\brain\ba58b012-db13-4bce-a98e-a9decd1a4051\.system_generated\logs\transcript.jsonl"
found = set()

with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
    for line in f:
        # Match 'subject': '...' or "subject": "..."
        matches = re.findall(r"['\"]subject['\"]\s*:\s*['\"]([^'\"]+)['\"]", line)
        for m in matches:
            found.add(m)

print("Unique subjects found in logs:")
for i, s in enumerate(sorted(found), 1):
    print(f"{i}. {s}")
