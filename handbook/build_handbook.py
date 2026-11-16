"""Makes the SCAFFApps Suite handbook: release/SCAFFApps-Suite-Handbook-<version>.pdf, its only copy (the name the
SCAFFApps Suite looks for; attached to the GitHub release).

    python handbook\\build_handbook.py              retake the pictures, then print
    python handbook\\build_handbook.py --no-shots   print with the pictures as they are
    python handbook\\build_handbook.py --preview    also a PNG of every page, in handbook\\preview

The pictures are taken from the Suite itself, run from this folder's source in a test profile of its own, with a
stand-in for GitHub (newer versions of the apps and of the Suite, with their handbooks) and a made-up list of installed
apps (Multi Screens a version behind, Smart Snap up to date, Instant Share not installed): never this computer's own.
Needs the app's node_modules (npm install), Python with playwright, pillow and pypdfium2, and Microsoft Edge. The
layout and every word are in handbook.html, in the SCAFFApps brochure style; kit.py, brochure.css and handbook.css are
the same in every SCAFFApps app.
"""
import argparse
import json
import shutil
import sys
import tempfile
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
import kit  # noqa: E402

IMG = HERE / "img"
VERSION = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]

# the stand-in releases: repository, its app's name, the newer version, its notes
NEWER = [
    ("multi-screens", "Multi Screens", "1.8.2", "The handbook in the SCAFFApps style; scrollbars in the SCAFFApps colours; Settings fits the window."),
    ("smart-snap", "Smart Snap", "1.1.2", "The handbook in the SCAFFApps style; scrollbars in the SCAFFApps colours."),
    ("instant-share", "Instant Share", "1.3.4", "The handbook in the SCAFFApps style; Settings in columns, without scrolling."),
    ("scaffapps-suite", "SCAFFApps Suite", "1.0.2", "Its own handbook; scrollbars in the SCAFFApps colours; the home view fits a small laptop."),
]


def stand_in(folder):
    """GitHub's latest release of each app and of the Suite, each with its installer and its handbook and both their
    checksums (made up, matching: the files are never downloaded)."""
    for repo, name, version, line in NEWER:
        base = name.replace(" ", "-")
        files = [(f"{base}-Setup-{version}.exe", 78 * 1048576, "b" * 64), (f"{base}-Handbook-{version}.pdf", 3 * 1048576, "c" * 64)]
        table = "\n".join(f"| `{f}` | {s / 1048576:.1f} MB | `{h.upper()}` |" for f, s, h in files)
        notes = f"## {version}\n\n{line}\n\n### Downloads\n\n| File | Size | SHA-256 |\n|---|---|---|\n{table}\n\n### Changed\n\n- {line}\n"
        d = Path(folder) / "repos" / "Rady193" / repo / "releases"
        d.mkdir(parents=True, exist_ok=True)
        (d / "latest").write_text(json.dumps({
            "tag_name": f"v{version}", "name": f"{name} {version}", "body": notes, "published_at": "2026-11-17T09:00:00Z",
            "html_url": f"https://github.com/Rady193/{repo}/releases/tag/v{version}",
            "assets": [{"name": f, "size": s, "digest": f"sha256:{h}",
                        "browser_download_url": f"https://github.com/Rady193/{repo}/releases/download/v{version}/{f}"}
                       for f, s, h in files]}), encoding="utf-8")
    return folder


def installed_list(work):
    """The apps on this made-up computer: Multi Screens a version behind, Smart Snap up to date, Instant Share not
    installed (each "program" an empty file, in a folder of the test's own)."""
    out = []
    for name, version in (("Multi Screens", "1.8.1"), ("Smart Snap", "1.1.2")):
        folder = work / "apps" / name
        folder.mkdir(parents=True, exist_ok=True)
        (folder / f"{name}.exe").write_bytes(b"")
        out.append({"DisplayName": f"{name} {version}", "DisplayVersion": version, "InstallLocation": str(folder),
                    "UninstallString": f'"{folder / ("Uninstall " + name + ".exe")}" /currentuser'})
    path = work / "installed.json"
    path.write_text(json.dumps(out), encoding="utf-8")
    return path


def view(w, name, wait=1.2):
    w.js(f"document.querySelector('[data-view=\"{name}\"]').click()")
    time.sleep(wait)


def main_session(work, api):
    env = kit.registration(work / "registration.json", "suite", VERSION)
    env.update(SUITE_GITHUB_API=api, SUITE_INSTALLED_JSON=str(installed_list(work)))
    port = kit.free_port()
    proc = kit.start_electron(ROOT, work / "profile", port, env)
    try:
        w = kit.window(port, "index.html")
        w.front()
        time.sleep(3)
        try:
            w.wait("!/Checking/.test(document.body.innerText) && /ready|available|Up to date/.test(document.querySelector('#cards').innerText)", 60)
        except TimeoutError:
            print("!! the Suite was still checking the stand-in")
        time.sleep(1)
        # the pictures in both appearances, mixed through the handbook: first the dark ones
        view(w, "home")
        w.shot(IMG / "view-home.png")
        w.shot(IMG / "cards.png", kit_pad(w.rect("#cards"), 10))
        view(w, "updates")
        w.shot(IMG / "view-updates.png")
        view(w, "settings")
        w.shot(IMG / "view-settings.png")
        # then the light ones
        w.js("document.getElementById('tbTheme').click()")
        time.sleep(0.8)
        view(w, "home")
        w.shot(IMG / "view-home-light.png")
        w.shot(IMG / "hero.png", kit_pad(w.rect(".hero"), 8))          # the scaffold and its tag
        w.shot(IMG / "rail-card.png", kit_pad(w.rect(".suite-card"), 10))
        # an app's ⋯ menu
        w.js("document.querySelector('[data-menu=\"multi-screens\"]').click()")
        time.sleep(0.6)
        card, menu = w.rect('.card[data-app="multi-screens"]'), w.rect(".menu")
        w.shot(IMG / "card-menu.png", union(card, menu, p=12))
        w.key("Escape", keycode=27)
        w.js("document.body.click()")
        time.sleep(0.4)
        view(w, "books")
        w.shot(IMG / "view-books.png")
        w.js("document.getElementById('tbTheme').click()")
        w.close()
    finally:
        kit.stop(proc)


def kit_pad(r, p=14):
    return {"x": max(r["x"] - p, 0), "y": max(r["y"] - p, 0), "width": r["w"] + 2 * p, "height": r["h"] + 2 * p}


def union(*rs, p=14):
    x1, y1 = min(r["x"] for r in rs), min(r["y"] for r in rs)
    x2, y2 = max(r["x"] + r["w"] for r in rs), max(r["y"] + r["h"] for r in rs)
    return kit_pad({"x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1}, p)


def signup_session(work):
    """The first start on a Windows account: the sign-up window."""
    env = kit.registration(work / "registration-new.json", "suite", VERSION, registered=False)
    env.update(SUITE_GITHUB_API="http://127.0.0.1:1")
    port = kit.free_port()
    proc = kit.start_electron(ROOT, work / "profile-new", port, env)
    try:
        w = kit.window(port, "registration.html")
        w.front()
        time.sleep(1)
        w.shot(IMG / "signup.png")
        w.close()
    finally:
        kit.stop(proc)


def shots(only=None):
    work = Path(tempfile.mkdtemp(prefix="suite-handbook-"))
    try:
        with kit.Serve(stand_in(work / "github")) as api:
            for name, run in [("main", lambda: main_session(work, api.url.rstrip("/"))),
                              ("signup", lambda: signup_session(work)),
                              # the back cover, the same in every SCAFFApps handbook: the apps' icons, the Suite's views
                              ("family", lambda: (kit.family_icons(IMG, ROOT.parent), kit.suite_pictures(IMG, ROOT.parent)))]:
                if only and name not in only:
                    continue
                print(f"pictures: {name}", flush=True)
                run()
    finally:
        shutil.rmtree(work, ignore_errors=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-shots", action="store_true")
    ap.add_argument("--only", nargs="*", help="main, signup, family")
    ap.add_argument("--preview", action="store_true")
    ap.add_argument("--chromium", help="a Chromium to print with, instead of Edge")
    a = ap.parse_args()
    if not a.no_shots:
        shots(a.only)
    # printed in handbook/build (never open anywhere), then moved into release/, named for the release: the only
    # copy (the name the SCAFFApps Suite looks for, attached to the GitHub release)
    (HERE / "build").mkdir(exist_ok=True)
    pdf = kit.print_pdf(HERE / "handbook.html", HERE / "build" / "SCAFFApps Suite Handbook.pdf",
                        HERE / "preview" if a.preview else None, chromium=a.chromium)
    kit.to_release(pdf, ROOT / "release" / f"SCAFFApps-Suite-Handbook-{VERSION}.pdf")
    # release/ keeps only the newest handbook; the earlier ones stay on their GitHub releases
    newest = tuple(int(x) for x in VERSION.split("."))
    for old in (ROOT / "release").glob("SCAFFApps-Suite-Handbook-*.pdf"):
        v = old.stem.rsplit("-", 1)[-1]
        if v.replace(".", "").isdigit() and tuple(int(x) for x in v.split(".")) < newest:
            old.unlink(missing_ok=True)
            print(f"removed the older {old.name}")


if __name__ == "__main__":
    main()
