import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

import preflight
import runtime


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

    def test_archive_cannot_escape_cache(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            archive = root/'bad.tar.gz'
            with tarfile.open(archive, 'w:gz') as stream:
                member = tarfile.TarInfo('../escaped')
                member.size = 1
                stream.addfile(member, io.BytesIO(b'x'))
            with self.assertRaises(tarfile.FilterError):
                runtime.unpack(archive, root/'unpacked')
            self.assertFalse((root/'escaped').exists())


if __name__ == '__main__':
    unittest.main()
