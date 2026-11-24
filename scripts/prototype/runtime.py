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
import tarfile
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
UI = ROOT / 'ui'


def settings():
    package = json.loads((UI / 'package.json').read_text())
    config = json.loads((ROOT / '.prototype/ui/toolchain.json').read_text())
    version = config['node']
    if not re.fullmatch(r'\d+\.\d+\.\d+', version):
        raise ValueError('Invalid pinned Node version')
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
        shutil.copyfileobj(response, stream)


def unpack(archive, destination):
    with tarfile.open(archive) as stream:
        # data filter rejects path escape and unsafe links, including symlink traversal.
        stream.extractall(destination, filter='data')


def tool_paths():
    version, pnpm, system, arch, cache = settings()
    return cache / f'node-v{version}-{system}-{arch}', cache / f'pnpm-{pnpm}-{system}-{arch}', cache


def prepare():
    version, pnpm_version, system, arch, cache = settings()
    node_dir, pnpm_dir, _ = tool_paths()
    cache.mkdir(parents=True, exist_ok=True)
    if not node_dir.exists():
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
            if actual != integrity.removeprefix('sha512-'):
                raise ValueError('pnpm integrity mismatch')
            unpack(temp / 'pnpm.tgz', temp / 'unpacked')
            (temp / 'unpacked/package').rename(pnpm_dir)
    # Only prepare may invoke the official first-run downloader. Check/run are offline.
    if not (pnpm_dir / 'pnpm-native').is_file():
        env = {**os.environ, 'PATH': str(node_dir / 'bin') + os.pathsep + os.environ.get('PATH', '')}
        subprocess.run([str(node_dir / 'bin/node'), str(pnpm_dir / 'bin/pnpm.mjs'), '--version'],
                       cwd=UI, env=env, check=True, timeout=180)
    return check()


def executables():
    node_dir, pnpm_dir, cache = tool_paths()
    node = node_dir / 'bin/node'
    package = pnpm_dir / 'package.json'
    if not node.is_file() or not package.is_file():
        raise ValueError('Prototype tools absent; run bash scripts/prototype/setup.sh first')
    entry = pnpm_dir / 'pnpm-native'
    if not entry.is_file() or not os.access(entry, os.X_OK):
        raise ValueError('Native pnpm absent; run setup.sh to complete official first-run preparation')
    env = {**os.environ, 'PATH': str(node.parent) + os.pathsep + str(pnpm_dir) + os.pathsep + os.environ.get('PATH', ''),
           'COREPACK_ENABLE_DOWNLOAD_PROMPT': '0'}
    return node, entry, env


def check():
    node, pnpm, env = executables()
    version, expected, _, _, _ = settings()
    actual_node = subprocess.check_output([str(node), '--version'], env=env, text=True, timeout=15).strip()
    actual_pnpm = subprocess.check_output([str(pnpm), '--version'], cwd=UI, env=env, text=True, timeout=15).strip()
    if actual_node != 'v' + version or actual_pnpm != expected:
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
