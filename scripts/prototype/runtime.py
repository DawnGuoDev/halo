#!/usr/bin/env python3
"""Prepare/check the isolated prototype toolchain; never changes global tools."""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
import sys
from safe_archive import unpack
import tempfile
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
UI = ROOT / 'ui'


def settings():
    package = json.loads((UI / 'package.json').read_text())
    requirement = package['engines']['node']
    if not re.fullmatch(r'>=\s*\d+\.\d+\.\d+', requirement):
        raise ValueError('Unsupported Node constraint; maintain the repository probe before acquiring tools')
    version = requirement.split('>=')[1].strip()
    match = re.fullmatch(r'pnpm@(\d+\.\d+\.\d+)', package['packageManager'])
    if not match:
        raise ValueError('Expected exact pnpm version in ui/package.json')
    system = {'Darwin': 'darwin', 'Linux': 'linux'}.get(platform.system())
    arch = {'arm64': 'arm64', 'aarch64': 'arm64', 'x86_64': 'x64', 'AMD64': 'x64'}.get(platform.machine())
    if not system or not arch:
        raise ValueError('Supported platforms: macOS/Linux, arm64/x64')
    cache = Path(os.environ.get('PROTOTYPE_TOOLS_DIR', ROOT / '.prototype/tools')).resolve()
    return version, match[1], system, arch, cache


def download(url, target):
    print('Downloading ' + url, file=sys.stderr, flush=True)
    with urllib.request.urlopen(url, timeout=60) as response, target.open('wb') as stream:
        started = last = time.monotonic()
        total = 0
        while True:
            chunk = response.read(256 * 1024)
            if not chunk:
                break
            stream.write(chunk)
            total += len(chunk)
            now = time.monotonic()
            if now - started > 180:
                raise ValueError('Tool download exceeded 180 seconds; preserve logs and diagnose connectivity')
            if now - last >= 15:
                print(f'Downloaded {total} bytes ({int(now-started)}s)', file=sys.stderr, flush=True)
                last = now


def tool_paths():
    version, pnpm, system, arch, cache = settings()
    selected = cache / 'selected.json'
    if selected.is_file():
        record = json.loads(selected.read_text())
        node = Path(record['node'])
        pnpm_path = Path(record['pnpm'])
        return node, pnpm_path, cache
    raise ValueError('Prototype tools absent; run bash scripts/prototype/setup.sh first')


def prepare():
    version, pnpm_version, system, arch, cache = settings()
    cache.mkdir(parents=True, exist_ok=True)
    node = shutil.which('node')
    candidates = ([Path(node)] if node else []) + sorted(cache.glob('node-v*/bin/node'), reverse=True)
    node = next((candidate for candidate in candidates if valid_node(candidate)), None)
    if node is None:
        with tempfile.TemporaryDirectory(dir=cache) as temp:
            index = Path(temp) / 'index.json'
            download('https://nodejs.org/dist/index.json', index)
            minimum = tuple(map(int, version.split('.')))
            releases = [r for r in json.loads(index.read_text()) if r.get('lts') and
                        tuple(map(int, r['version'][1:].split('.'))) >= minimum and
                        (f'osx-{arch}-tar' if system == 'darwin' else f'{system}-{arch}') in r.get('files', [])]
            if not releases:
                raise ValueError('No official LTS release satisfies repository engines.node')
            version = releases[0]['version'][1:]
        node_dir = cache / f'node-v{version}-{system}-{arch}'
    else:
        node_dir = node.parent.parent
    if node is None:
        with tempfile.TemporaryDirectory(dir=cache) as temp:
            temp = Path(temp)
            name = f'node-v{version}-{system}-{arch}.tar.gz'
            base = f'https://nodejs.org/dist/v{version}/'
            download(base + 'SHASUMS256.txt', temp / 'sums')
            expected = next((line.split()[0] for line in (temp / 'sums').read_text().splitlines()
                             if line.split()[-1] == name), None)
            if not expected:
                raise ValueError('Node archive missing from official checksum list')
            download(base + name, temp / name)
            if hashlib.sha256((temp / name).read_bytes()).hexdigest() != expected:
                raise ValueError('Node checksum mismatch')
            unpack(temp / name, temp / 'unpacked')
            (temp / 'unpacked' / node_dir.name).rename(node_dir)
        node = node_dir / 'bin/node'
    env = {**os.environ, 'PATH': str(node.parent) + os.pathsep + os.environ.get('PATH', '')}
    pnpm = shutil.which('pnpm', path=env['PATH'])
    if pnpm and tool_version(pnpm, env) == pnpm_version:
        entry = Path(pnpm)
        (cache / 'selected.json').write_text(json.dumps({'node': str(node), 'pnpm': str(entry)}))
        return check()
    pnpm_dir = cache / f'pnpm-{pnpm_version}-{system}-{arch}'
    if not pnpm_dir.exists():
        with tempfile.TemporaryDirectory(dir=cache) as temp:
            temp = Path(temp)
            download(f'https://registry.npmjs.org/pnpm/{pnpm_version}', temp / 'metadata')
            metadata = json.loads((temp / 'metadata').read_text())
            url = metadata['dist']['tarball']
            if url != f'https://registry.npmjs.org/pnpm/-/pnpm-{pnpm_version}.tgz':
                raise ValueError('Unexpected pnpm tarball origin')
            integrity = metadata['dist']['integrity']
            if not integrity.startswith('sha512-'):
                raise ValueError('Expected SHA512 npm integrity')
            download(url, temp / 'pnpm.tgz')
            actual = base64.b64encode(hashlib.sha512((temp / 'pnpm.tgz').read_bytes()).digest()).decode()
            if actual != integrity[len('sha512-'):]:
                raise ValueError('pnpm integrity mismatch')
            unpack(temp / 'pnpm.tgz', temp / 'unpacked')
            (temp / 'unpacked/package').rename(pnpm_dir)
    # Only prepare may invoke the official first-run downloader. Check/run are offline.
    if (pnpm_dir / 'bin/pnpm.mjs').is_file() and not (pnpm_dir / 'pnpm-native').is_file():
        subprocess.run([str(node), str(pnpm_dir / 'bin/pnpm.mjs'), '--version'],
                       cwd=UI, env=env, check=True, timeout=180)
    entry = pnpm_dir / 'pnpm-native'
    if not entry.is_file():
        entry = pnpm_dir / 'bin/pnpm.cjs'
    (cache / 'selected.json').write_text(json.dumps({'node': str(node), 'pnpm': str(entry)}))
    return check()


def tool_version(executable, env):
    try:
        return subprocess.check_output([str(executable), '--version'], cwd=UI, env=env, text=True,
                                       stderr=subprocess.DEVNULL, timeout=15).strip()
    except (OSError, subprocess.SubprocessError):
        return None


def valid_node(node):
    try:
        return subprocess.run([str(node), str(ROOT / 'scripts/prototype/probe-node.mjs')],
                              cwd=UI, capture_output=True, timeout=15).returncode == 0
    except (OSError, subprocess.SubprocessError):
        return False


def executables():
    node, entry, cache = tool_paths()
    if not node.is_file() or not entry.is_file():
        raise ValueError('Prototype tools absent; run bash scripts/prototype/setup.sh first')
    env = {**os.environ, 'PATH': str(node.parent) + os.pathsep + str(entry.parent) + os.pathsep + os.environ.get('PATH', ''),
           'COREPACK_ENABLE_DOWNLOAD_PROMPT': '0', 'COREPACK_ENABLE_NETWORK': '0'}
    return node, entry, env


def check():
    node, pnpm, env = executables()
    version, expected, _, _, _ = settings()
    actual_node = subprocess.check_output([str(node), '--version'], env=env, text=True, timeout=15).strip()
    actual_pnpm = subprocess.check_output([str(pnpm), '--version'], cwd=UI, env=env, text=True, timeout=15).strip()
    if not valid_node(node) or actual_pnpm != expected:
        raise ValueError(f'Tool mismatch: Node={actual_node}, pnpm={actual_pnpm}')
    subprocess.run([str(node), str(ROOT / 'scripts/prototype/probe-node.mjs')],
                   cwd=UI, env=env, check=True, timeout=15, stdout=subprocess.DEVNULL)
    return {'status': 'tools-ready', 'node': actual_node, 'pnpm': actual_pnpm,
            'scope': 'runtime-only; dependency install and build are separate'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['prepare', 'check', 'versions', 'run'])
    parser.add_argument('args', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    if args.mode == 'prepare':
        print(json.dumps(prepare()))
    elif args.mode in ('check', 'versions'):
        print(json.dumps(check()))
    else:
        check()
        argv = args.args[1:] if args.args[:1] == ['--'] else args.args
        if not argv:
            parser.error('run requires pnpm arguments')
        node, pnpm, env = executables()
        os.chdir(UI)
        os.execve(pnpm, [str(pnpm), *argv], env)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, subprocess.SubprocessError, KeyError) as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
