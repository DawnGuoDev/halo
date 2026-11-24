#!/usr/bin/env python3
"""Inspect install metadata or run an explicit reviewed, repository-owned sandbox recipe."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import signal
import subprocess
import sys
import time
from urllib.parse import urlsplit

LOCKS = ('pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lock', 'bun.lockb')
ENV = {'npm_config_registry', 'NPM_CONFIG_REGISTRY', 'COREPACK_ENABLE_DOWNLOAD_PROMPT', 'CI'}
SECRET = re.compile(r'(?i)(token|password|secret|authorization|_auth)')


def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + '.tmp')
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n'); tmp.replace(path)


def inside(root, name):
    p = (root / name).resolve()
    if not p.is_relative_to(root): raise ValueError('Path escapes recipe root: ' + name)
    return p


def safe_url(value):
    u = urlsplit(value)
    if u.scheme not in ('https', 'http') or not u.hostname or u.username or u.password or u.query or u.fragment:
        raise ValueError('Registry must be an HTTP(S) URL without credentials/query/fragment')
    return value


def inspect(app):
    p = json.loads((app / 'package.json').read_text())
    locks, hosts, npmrc = {}, set(), []
    for name in LOCKS:
        file = app / name
        if file.is_file():
            raw = file.read_bytes(); locks[name] = hashlib.sha256(raw).hexdigest()
            text = raw.decode(errors='replace')
            hosts.update(re.findall(r'https?://([^/\s\"\x27]+)', text))
            hosts.update(re.findall(r'((?:registry\.)?[a-zA-Z0-9.-]+\.(?:com|org|net))\+', text))
    for parent in [app, *app.parents]:
        f = parent / '.npmrc'
        if f.is_file():
            for line in f.read_text().splitlines():
                if SECRET.search(line): continue
                if re.match(r'\s*(?:@[\w.-]+:)?registry\s*=', line):
                    value = line.split('=', 1)[1].strip()
                    try: safe_url(value); npmrc.append({'key': line.split('=', 1)[0].strip(), 'value': value})
                    except ValueError: npmrc.append({'key': 'registry', 'value': '[credentials or variables omitted]'})
        if (parent / '.git').exists(): break
    safe_hosts = sorted(h for h in hosts if re.fullmatch(r'[a-zA-Z0-9.-]+(?::\d+)?', h))
    return {'status': 'inspected-not-installed', 'packageManager': p.get('packageManager'), 'engines': p.get('engines', {}),
            'locks': locks, 'registryHostsInLocks': safe_hosts, 'repositoryRegistrySettings': npmrc,
            'note': 'Inspect actual failing dependency metadata/tarball URL before changing registry. npm does not consume pnpm locks.'}


def load(path):
    cfg = json.loads(path.read_text()); root = (path.parent / cfg['root']).resolve()
    cwd = inside(root, cfg['app'])
    if not (cwd / 'package.json').is_file(): raise ValueError('Recipe app lacks package.json')
    for k in ('inputs', 'probes', 'install'):
        if not cfg.get(k): raise ValueError('Missing recipe field: ' + k)
    for argv in [*cfg['probes'], cfg['install']]:
        if not isinstance(argv, list) or not argv or not all(isinstance(v, str) and v for v in argv):
            raise ValueError('Recipe commands require nonempty argv arrays')
        if any(SECRET.search(v) or '${' in v or '$WORKBENCH' in v for v in argv):
            raise ValueError('Do not store credentials or unresolved shell variables in recipe argv')
        for v in argv:
            if v.startswith(('https://', 'http://')): safe_url(v)
            if '--registry=' in v: safe_url(v.split('=', 1)[1])
    for k, v in cfg.get('env', {}).items():
        if k not in ENV or not isinstance(v, str): raise ValueError('Unsupported recipe environment key: ' + k)
        if 'registry' in k.lower(): safe_url(v)
    for name in cfg['inputs']:
        if not inside(root, name).is_file(): raise ValueError('Missing recipe input: ' + name)
    return cfg, root, cwd


def hashes(root, inputs):
    return {name: hashlib.sha256(inside(root, name).read_bytes()).hexdigest() for name in inputs}


def stop(proc):
    try: os.killpg(proc.pid, signal.SIGTERM)
    except ProcessLookupError: return
    try: proc.wait(timeout=3)
    except subprocess.TimeoutExpired: os.killpg(proc.pid, signal.SIGKILL); proc.wait()


def run(path, report_path, idle=180, timeout=600, receipt=None):
    cfg, root, cwd = load(path); before = hashes(root, cfg['inputs'])
    env = {**os.environ, **cfg.get('env', {})}; probes = []
    for argv in cfg['probes']:
        p = subprocess.run(argv, cwd=cwd, env=env, capture_output=True, text=True, timeout=15)
        if p.returncode: raise ValueError('Environment version/check probe failed: ' + argv[0])
        value = p.stdout.strip()
        # Probes must be version-only. Never emit arbitrary environment/context dumps.
        if len(value) > 300 or SECRET.search(value): raise ValueError('Probe must emit bounded version-only output')
        probes.append({'argv': argv, 'output': value})
    report_path.parent.mkdir(parents=True, exist_ok=True)
    log = report_path.with_suffix('.log'); start = time.monotonic(); last = start; last_size = 0; heartbeat = start
    result = {'status': 'running', 'recipeHash': hashlib.sha256(path.read_bytes()).hexdigest(), 'inputs': before,
              'probes': probes, 'platform': {'system': platform.system(), 'machine': platform.machine()},
              'log': str(log), 'signals': 'log byte changes; progress signal only, not proof of success'}
    save(report_path, result)
    with log.open('w') as stream:
        try:
            proc = subprocess.Popen(cfg['install'], cwd=cwd, env=env, stdout=stream, stderr=subprocess.STDOUT, start_new_session=True)
        except OSError as exc:
            stream.write(str(exc)); result.update(status='failed', exitCode=127)
            save(report_path, result); return result
        while proc.poll() is None:
            now = time.monotonic(); size = log.stat().st_size
            if size != last_size: last = now; last_size = size
            if now - heartbeat >= 30:
                heartbeat = now
                print(json.dumps({'status': 'install-running', 'seconds': round(now-start), 'logBytes': size, 'silentSeconds': round(now-last)}), flush=True)
            if now-start > timeout or now-last > idle:
                stop(proc)
                result['status'] = 'idle-stopped' if now-last > idle else 'timeout'
                result['exitCode'] = 124; break
            time.sleep(min(1, idle/4))
        else:
            result['exitCode'] = proc.returncode
            result['status'] = 'passed' if proc.returncode == 0 else 'failed'
    result['seconds'] = round(time.monotonic()-start, 3)
    if hashes(root, cfg['inputs']) != before:
        result.update(status='inputs-changed', exitCode=1)
    save(report_path, result)
    if receipt and result['status'] == 'passed':
        # Portable evidence: no log/session paths, secrets, environment dump or node_modules.
        save(receipt, {k: v for k, v in result.items() if k not in ('log', 'signals')} |
             {'scope': 'install-and-version-probes-only', 'note': 'New sandbox must rerun recipe; this is historical evidence, not current readiness.'})
    return result


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('mode', choices=['inspect', 'validate', 'run']); p.add_argument('--app', type=Path)
    p.add_argument('--recipe', type=Path); p.add_argument('--report', type=Path); p.add_argument('--receipt', type=Path)
    p.add_argument('--idle-seconds', type=int, default=180); p.add_argument('--timeout', type=int, default=600)
    a = p.parse_args()
    if not 1 <= a.idle_seconds <= 3600 or not 1 <= a.timeout <= 3600: p.error('Timeouts must be 1..3600 seconds')
    if a.mode == 'inspect':
        if not a.app: p.error('--app required')
        result = inspect(a.app.resolve())
    else:
        if not a.recipe: p.error('--recipe required')
        cfg, root, cwd = load(a.recipe.resolve())
        if a.mode == 'validate': result = {'status': 'recipe-valid-not-executed', 'cwd': str(cwd), 'inputs': hashes(root, cfg['inputs'])}
        else:
            if not a.report: p.error('--report required')
            result = run(a.recipe.resolve(), a.report.resolve(), a.idle_seconds, a.timeout, a.receipt)
    print(json.dumps(result, ensure_ascii=False))
    return 0 if result['status'] in ('passed', 'inspected-not-installed', 'recipe-valid-not-executed') else 1


if __name__ == '__main__':
    try: sys.exit(main())
    except (ValueError, OSError, KeyError, subprocess.SubprocessError) as exc: raise SystemExit(str(exc))
