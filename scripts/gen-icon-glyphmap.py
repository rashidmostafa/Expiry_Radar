"""Generate a Material Symbols name -> codepoint map from the bundled font's ligature table."""
import json
import sys
from fontTools.ttLib import TTFont

font_path, out_path = sys.argv[1], sys.argv[2]
font = TTFont(font_path)
cmap = font.getBestCmap()
glyph_to_cp = {}
for cp, glyph in cmap.items():
    if cp >= 0xE000:  # private-use / supplementary icon codepoints only
        glyph_to_cp.setdefault(glyph, cp)
char_of = {g: chr(cp) for cp, g in cmap.items() if cp < 0x80}

mapping = {}
for lookup in font['GSUB'].table.LookupList.Lookup:
    for sub in lookup.SubTable:
        if sub.LookupType == 7:
            sub = sub.ExtSubTable
        if getattr(sub, 'LookupType', None) != 4:
            continue
        for first, ligs in sub.ligatures.items():
            for lig in ligs:
                comps = [first] + list(lig.Component)
                if not all(c in char_of for c in comps):
                    continue
                name = ''.join(char_of[c] for c in comps)
                cp = glyph_to_cp.get(lig.LigGlyph)
                if cp is not None and name.replace('_', '').isalnum():
                    mapping.setdefault(name, cp)

with open(out_path, 'w') as f:
    json.dump(dict(sorted(mapping.items())), f, separators=(',', ':'))
print(f'{len(mapping)} icons -> {out_path}')
