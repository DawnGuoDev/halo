#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
: "${PROTOTYPE_WORKBENCH:?Set PROTOTYPE_WORKBENCH to the prototype-workbench skill root}"
python3 "$PROTOTYPE_WORKBENCH/scripts/export-preview.py" \
  --dist "$ROOT/.prototype/ui/output/native" \
  --entry prototype/preview/post-list.html \
  --out "$ROOT/.prototype/ui/output/final/index.html"
