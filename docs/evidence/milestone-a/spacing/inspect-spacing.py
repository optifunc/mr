"""Read native-size screenshots without editing them; requires Pillow."""
import json
from pathlib import Path

from PIL import Image

evidence = Path(__file__).resolve().parent
repo = evidence.parents[3]
sources = {"reference": repo / "docs/free-mind-references/FreeMind-reference-100dpi.png"}
for browser in ("chromium", "firefox", "webkit"):
    sources[f"before-{browser}"] = evidence.parent / f"100dpi/reference-{browser}.png"
    sources[f"after-{browser}"] = evidence / f"reference-{browser}.png"


def ink_rows(image, x1, y1, x2, y2):
    # Exclude gray branches and faint antialiasing; retain dark ClearType channels.
    return [y for y in range(y1, y2)
            if any(min(image.getpixel((x, y))) < 85 for x in range(x1, x2))]


def line_row(image, x1, x2, y1, y2):
    def strength(y):
        pixels = [image.getpixel((x, y)) for x in range(x1, x2)]
        return sum(100 < min(p) < 220 and max(p) - min(p) < 4 for p in pixels)
    return max(range(y1, y2), key=strength)


results = {}
for name, path in sources.items():
    im = Image.open(path).convert("RGB")
    child_bottom = max(ink_rows(im, 88, 160, 137, 179))
    child_line = line_row(im, 96, 130, 178, 184)
    n1_top = min(ink_rows(im, 340, 147, 364, 170))
    single_line = line_row(im, 340, 415, 140, 150)
    results[name] = {
        "source": str(path.relative_to(repo)), "size": im.size,
        "child2_last_ink_row": child_bottom, "child2_line_row": child_line,
        "child2_blank_rows_to_line": child_line - child_bottom - 1,
        "single_line_row": single_line, "n1_first_ink_row": n1_top,
        "single_line_blank_rows_to_n1": n1_top - single_line - 1,
    }
output = json.dumps(results, indent=2) + "\n"
(evidence / "ink-spacing.json").write_text(output)
print(output)
