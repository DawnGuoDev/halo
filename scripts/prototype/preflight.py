#!/usr/bin/env python3
"""Read-only validation of this repository's preview recipe and command paths."""
import json
from pathlib import Path

import environment
from runtime import ROOT, settings


def validate(recipe):
    cfg, root, cwd = environment.load(recipe.resolve())
    if root != ROOT or cwd != ROOT / 'ui':
        raise ValueError('Recipe root/app must resolve to this repository and ui/')
    # This repository has one reviewed installation leaf. Never call setup from install.
    expected = ['bash', '../scripts/prototype/ui.sh', 'install', '--frozen-lockfile']
    if cfg['install'] != expected:
        raise ValueError('Install must call the ui.sh pnpm leaf, not setup.sh or another runner')
    for argv in cfg['probes']:
        for arg in argv[1:]:
            if arg.endswith(('.py', '.sh', '.mjs')) and not (cwd / arg).is_file():
                raise ValueError('Missing probe file relative to ui/: ' + arg)
    settings()
    return {'status': 'recipe-valid-not-installed', 'app': 'ui', 'installCwd': 'ui',
            'installLeaf': expected, 'scope': 'reviewed recipe only; not arbitrary shell cycle analysis'}


if __name__ == '__main__':
    print(json.dumps(validate(ROOT / '.prototype/ui/environment.json')))
