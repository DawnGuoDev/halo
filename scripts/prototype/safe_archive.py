"""Safe extraction without requiring a particular Python minor version."""
import os
from pathlib import Path
import shutil
import tarfile


def unpack(archive, destination):
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=True)
    with tarfile.open(archive) as stream:
        if hasattr(tarfile, 'data_filter'):
            stream.extractall(destination, filter='data')
            return
        # Older Python: validate the complete archive before creating anything.
        root = destination.resolve()
        members = stream.getmembers()
        links = {item.name.rstrip('/') for item in members if item.issym() or item.islnk()}
        seen = set()
        for item in members:
            path = Path(item.name)
            if path.is_absolute() or '..' in path.parts or item.name in seen:
                raise ValueError('Unsafe or duplicate archive path: ' + item.name)
            seen.add(item.name)
            if any(str(parent) in links for parent in path.parents):
                raise ValueError('Archive writes through a link: ' + item.name)
            target = (root / path).resolve()
            if target != root and root not in target.parents:
                raise ValueError('Archive escapes extraction directory')
            if not (item.isdir() or item.isfile() or item.issym() or item.islnk()):
                raise ValueError('Unsupported archive entry')
            if item.issym() or item.islnk():
                link = Path(item.linkname)
                base = target.parent if item.issym() else root
                resolved = (base / link).resolve()
                if link.is_absolute() or resolved == root or root not in resolved.parents:
                    raise ValueError('Unsafe archive link')
                if item.islnk() and not any(m.name == item.linkname and m.isfile() for m in members):
                    raise ValueError('Hard link must target a regular archive file')
        for item in members:
            target = root / item.name
            if item.isdir():
                target.mkdir(parents=True, exist_ok=True)
            elif item.isfile():
                target.parent.mkdir(parents=True, exist_ok=True)
                with stream.extractfile(item) as source, target.open('xb') as output:
                    shutil.copyfileobj(source, output)
                target.chmod(item.mode & 0o777)
        for item in members:
            target = root / item.name
            if item.issym() or item.islnk():
                target.parent.mkdir(parents=True, exist_ok=True)
                if item.issym():
                    target.symlink_to(item.linkname)
                else:
                    os.link(root / item.linkname, target)
