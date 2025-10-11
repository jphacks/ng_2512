**QA4 Performance/SLO Dashboard**

- Goal: p95 latency ≤ 150 ms for KNN k=20 and AI endpoints.
- Artifacts: `scripts/qa/bench_qa4.py` produces JSON + Markdown under `development_flow/logs/qa4`.

Run
- Python: `python scripts/qa/bench_qa4.py --mode all` (no deps required)
- KNN only: `python scripts/qa/bench_qa4.py --mode knn --vectors 1000 --queries 200`
- API only: `python scripts/qa/bench_qa4.py --mode api --rounds 100`

Notes
- API bench uses Flask `test_client()` to avoid network and relies on in-repo defaults (`AI_API_KEY=dev-key`, `AI_API_SECRET=dev-secret`).
- Outputs:
  - `development_flow/logs/qa4/results.json`
  - `development_flow/logs/qa4/report.md`

