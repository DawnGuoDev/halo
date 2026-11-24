import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

import preflight
import runtime
import safe_archive


class PreviewEnvironmentTests(unittest.TestCase):
    def test_recipe_install_rejects_recursive_setup(self):
        original = json.loads((runtime.ROOT / '.prototype/ui/environment.json').read_text())
        original['install'] = ['bash', '../scripts/prototype/setup.sh']
        with patch.object(preflight.environment, 'load', return_value=(original, runtime.ROOT, runtime.UI)):
            with self.assertRaisesRegex(ValueError, 'pnpm leaf'):
                preflight.validate(Path('unused.json'))

    def test_recipe_checks_probe_cwd_before_execution(self):
        original = json.loads((runtime.ROOT / '.prototype/ui/environment.json').read_text())
        original['probes'] = [['node', 'scripts/prototype/probe-node.mjs']]
        with patch.object(preflight.environment, 'load', return_value=(original, runtime.ROOT, runtime.UI)):
            with self.assertRaisesRegex(ValueError, 'relative to ui'):
                preflight.validate(Path('unused.json'))

    def test_check_missing_tools_never_prepares_or_downloads(self):
        with tempfile.TemporaryDirectory() as temp:
            cache = Path(temp)
            with patch.object(runtime, 'tool_paths', return_value=(cache/'node', cache/'pnpm', cache)), \
                 patch.object(runtime, 'download') as download:
                with self.assertRaisesRegex(ValueError, 'tools absent'):
                    runtime.check()
                download.assert_not_called()
                self.assertEqual(list(cache.iterdir()), [])

    def test_compatible_path_tools_are_reused_without_download(self):
        with tempfile.TemporaryDirectory() as temp:
            cache = Path(temp)
            with patch.object(runtime, 'settings', return_value=('24.11.0', '12.4.2', 'linux', 'x64', cache)), \
                 patch.object(runtime.shutil, 'which', side_effect=['/tools/node', '/tools/pnpm']), \
                 patch.object(runtime, 'valid_node', return_value=True), \
                 patch.object(runtime, 'tool_version', return_value='12.4.2'), \
                 patch.object(runtime, 'check', return_value={'status': 'tools-ready'}), \
                 patch.object(runtime, 'download') as download:
                runtime.prepare()
                download.assert_not_called()
                self.assertEqual(json.loads((cache/'selected.json').read_text())['node'], '/tools/node')

    def test_older_python_safe_fallback_extracts_regular_files_and_links(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            archive = root/'valid.tar'
            with tarfile.open(archive, 'w') as stream:
                member = tarfile.TarInfo('bin/tool')
                member.size = 1
                member.mode = 0o755
                stream.addfile(member, io.BytesIO(b'x'))
                link = tarfile.TarInfo('bin/alias')
                link.type = tarfile.SYMTYPE
                link.linkname = 'tool'
                stream.addfile(link)
            with patch.object(safe_archive, 'hasattr', return_value=False, create=True):
                safe_archive.unpack(archive, root/'out')
            self.assertEqual((root/'out/bin/alias').read_bytes(), b'x')
            self.assertTrue((root/'out/bin/tool').stat().st_mode & 0o100)

    def test_older_python_fallback_rejects_escape_and_symlink_parent(self):
        for name, link_target in [('../escaped', None), ('escape', '../../outside')]:
            with tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                archive = root/'bad.tar'
                with tarfile.open(archive, 'w') as stream:
                    item = tarfile.TarInfo(name)
                    if link_target:
                        item.type = tarfile.SYMTYPE
                        item.linkname = link_target
                    stream.addfile(item)
                with patch.object(safe_archive, 'hasattr', return_value=False, create=True):
                    with self.assertRaises(ValueError):
                        safe_archive.unpack(archive, root/'out')
                self.assertFalse((root/'escaped').exists())

    def test_archive_cannot_escape_cache(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            archive = root/'bad.tar.gz'
            with tarfile.open(archive, 'w:gz') as stream:
                member = tarfile.TarInfo('../escaped')
                member.size = 1
                stream.addfile(member, io.BytesIO(b'x'))
            with self.assertRaises(getattr(tarfile, 'FilterError', ValueError)):
                runtime.unpack(archive, root/'unpacked')
            self.assertFalse((root/'escaped').exists())


if __name__ == '__main__':
    unittest.main()
