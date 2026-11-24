#!/usr/bin/env python3
"""Fixed preview commands; tools/installation remain in setup.sh."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

from runtime import ROOT, UI, check, executables


def run(argv, env):
    subprocess.run([str(arg) for arg in argv], cwd=ROOT, env=env, check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['check', 'build', 'browser'])
    parser.add_argument('--adapter', choices=['auto', 'playwright', 'cdp'], default='auto')
    parser.add_argument('--executable', default=os.environ.get('PROTOTYPE_BROWSER'))
    parser.add_argument('--playwright-module', default=os.environ.get('PROTOTYPE_PLAYWRIGHT_MODULE'))
    args = parser.parse_args()
    print(json.dumps(check()), flush=True)
    node, _, env = executables()
    skill = Path(os.environ.get('PROTOTYPE_WORKBENCH', '')).resolve()
    if not (skill / 'scripts/build.py').is_file():
        parser.error('Set PROTOTYPE_WORKBENCH to the installed prototype-workbench skill root')
    config = ROOT / '.prototype/ui/final.json'
    if args.mode == 'check':
        run(['bash', 'scripts/prototype/ui.sh', 'exec', 'vue-tsc', '--noEmit', '-p', 'prototype/tsconfig.json'], env)
        run(['bash', 'scripts/prototype/ui.sh', 'exec', 'eslint', 'prototype/', '--max-warnings=0'], env)
        run(['bash', 'scripts/prototype/ui.sh', 'exec', 'vp', 'test', 'run', '--config', 'prototype/vitest.config.ts'], env)
    elif args.mode == 'build':
        run([sys.executable, skill / 'scripts/build.py', config, '--validate'], env)
        run([sys.executable, skill / 'scripts/build.py', config, '--ensure'], env)
    else:
        # Fail before opening a browser when the current build evidence is stale.
        run([sys.executable, skill / 'scripts/build.py', config, '--verify'], env)
        module = args.playwright_module
        if not module:
            resolved = subprocess.run([str(node), '-e', "console.log(require.resolve('playwright'))"],
                                      cwd=UI, env=env, capture_output=True, text=True, timeout=15)
            if resolved.returncode == 0:
                module = resolved.stdout.strip()
        adapter = args.adapter
        if adapter == 'auto':
            adapter = 'playwright' if module else 'cdp'
        if adapter == 'playwright' and not module:
            parser.error('No installed Playwright; supply --playwright-module or use the shared CDP adapter')
        browser = args.executable
        if not browser:
            browser = next((shutil.which(name) for name in ['chromium', 'chromium-browser', 'google-chrome']
                            if shutil.which(name)), None)
            mac = Path('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
            if not browser and mac.is_file():
                browser = str(mac)
        if not browser:
            parser.error('Supply --executable or PROTOTYPE_BROWSER; no browser will be downloaded')
        script = 'browser-check.mjs' if adapter == 'playwright' else 'browser-cdp.mjs'
        argv = [str(node), str(skill / 'scripts' / script), str(config), '--executable', browser]
        if adapter == 'playwright':
            argv += ['--playwright-module', module]
        run(argv, env)
        report = ROOT / '.workbench' / ('browser' if adapter == 'playwright' else 'browser-cdp') / 'report.json'
        run([str(node), skill / 'scripts/browser-report.mjs', config, report, '--require-full', '--require-business'], env)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, subprocess.SubprocessError) as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
