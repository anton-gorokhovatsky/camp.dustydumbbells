#!/usr/bin/env python3
"""Download the published site's assets. Explicit maintenance command; not a build step."""
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from html import unescape
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen
import json
import re
import gzip

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "source/assets"
URL = re.compile(r"https?://[^\s<>\"'()\\]+")
HOSTS = {"static.tildacdn.com", "thb.tildacdn.com", "neo.tildacdn.com"}
EXTENSIONS = {".css", ".js", ".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".woff", ".woff2", ".ico"}


def resources(text):
    return {unescape(url) for url in URL.findall(text)
            if urlparse(url).hostname in HOSTS
            and Path(urlparse(url).path).suffix.lower() in EXTENSIONS}


def download(url):
    filename = sha256(url.encode()).hexdigest()[:12] + "-" + Path(urlparse(url).path).name
    target = ASSETS / filename
    if not target.exists():
        request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(request, timeout=45) as response:
            data = response.read()
        target.write_bytes(data)
    data = target.read_bytes()
    # Tilda may return a gzipped response even without Accept-Encoding.
    if data.startswith(b"\x1f\x8b"):
        data = gzip.decompress(data)
        target.write_bytes(data)
    return {"url": url, "file": filename, "bytes": len(data), "sha256": sha256(data).hexdigest()}


def main():
    ASSETS.mkdir(parents=True, exist_ok=True)
    pending = set()
    for page in (ROOT / "source/pages").glob("*.html"):
        pending |= resources(page.read_text())
    entries = {}
    # CSS carries the original font files and any additional image resources.
    # Dynamic third-party APIs, including Yandex Maps, retain their upstream URLs.
    while pending:
        with ThreadPoolExecutor(max_workers=8) as pool:
            for entry in pool.map(download, sorted(pending)):
                entries[entry["url"]] = entry
        pending = set()
        for entry in entries.values():
            if entry["file"].endswith(".css"):
                pending |= resources((ASSETS / entry["file"]).read_text())
        pending -= entries.keys()
    manifest = {"source": "https://camp.dustydumbbells.com/", "captured": "2026-10-07",
                "assets": sorted(entries.values(), key=lambda entry: entry["url"])}
    (ROOT / "source/manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(f"Saved {len(entries)} assets ({sum(e['bytes'] for e in entries.values()):,} bytes)")


if __name__ == "__main__":
    main()
