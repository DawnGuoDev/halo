#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
python3 scripts/prototype/environment.py validate --recipe .prototype/ui/environment.json
exec python3 scripts/prototype/environment.py run \
  --recipe .prototype/ui/environment.json \
  --report .workbench/environment/install.json \
  --receipt .prototype/ui/evidence/environment.json "$@"
