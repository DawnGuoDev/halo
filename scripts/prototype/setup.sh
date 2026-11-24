#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
python3 scripts/prototype/preflight.py
if [[ "${1:-}" == "--check" ]]; then
  python3 scripts/prototype/runtime.py check
  exec python3 scripts/prototype/environment.py validate --recipe .prototype/ui/environment.json
fi
python3 scripts/prototype/environment.py validate --recipe .prototype/ui/environment.json
python3 scripts/prototype/runtime.py prepare
exec python3 scripts/prototype/environment.py run \
  --recipe .prototype/ui/environment.json \
  --report .workbench/environment/install.json \
  --receipt .prototype/ui/evidence/environment.json "$@"
