from pathlib import Path

path = Path('src/App.tsx')
text = path.read_text()

# Idempotent: do nothing if the timeless collection is already present.
if "id: 'timeless01'" in text:
    raise SystemExit(0)

marker = "\n];\n\nconst SCENE_FAMILIES = {"
if marker not in text:
    raise SystemExit('OUTFITS array closing marker not found')

all_categories = "['military-base', 'saudi-outdoor', 'car', 'living-room', 'bedroom', 'gym']"
physics = "['fitted long-sleeve dress shirt with sharp tailored shoulder and torso fit', 'shirt hem cleanly tucked into trousers with realistic waist compression and slight fabric blousing above waistband', 'clean black leather belt under natural buckle tension around the waist', 'belt loops carrying subtle localized tension', 'tailored trousers with clean crease lines and realistic hip and knee folds', 'crisp collar and cuff structure']"

outfits = f"""
  {{ id: 'timeless01', labelAR: 'قميص كحلي مع بنطلون رمادي', category: {all_categories}, prompt: 'fitted long-sleeve deep navy blue dress shirt tucked neatly into medium grey tailored trousers with a clean black leather belt', physics: {physics} }},
  {{ id: 'timeless02', labelAR: 'قميص أزرق فاتح مع بنطلون كحلي', category: {all_categories}, prompt: 'fitted long-sleeve light blue dress shirt tucked neatly into deep navy tailored trousers with a clean black leather belt', physics: {physics} }},
  {{ id: 'timeless03', labelAR: 'قميص أبيض مع بنطلون بيج', category: {all_categories}, prompt: 'fitted long-sleeve crisp white dress shirt tucked neatly into beige khaki tailored trousers with a clean black leather belt', physics: {physics} }},
  {{ id: 'timeless04', labelAR: 'قميص زيتي مع بنطلون بني', category: {all_categories}, prompt: 'fitted long-sleeve olive green dress shirt tucked neatly into rich brown tailored trousers with a clean black leather belt', physics: {physics} }},
  {{ id: 'timeless05', labelAR: 'قميص أسود مع بنطلون فحمي', category: {all_categories}, prompt: 'fitted long-sleeve solid black dress shirt tucked neatly into dark charcoal tailored trousers with a clean black leather belt', physics: {physics} }},
  {{ id: 'timeless06', labelAR: 'قميص بيج جملي مع بنطلون أبيض', category: {all_categories}, prompt: 'fitted long-sleeve camel beige dress shirt tucked neatly into clean white tailored trousers with a clean black leather belt', physics: {physics} }},
  {{ id: 'timeless07', labelAR: 'قميص رمادي مع بنطلون أسود', category: {all_categories}, prompt: 'fitted long-sleeve medium grey dress shirt tucked neatly into solid black tailored trousers with a clean black leather belt', physics: {physics} }},
  {{ id: 'timeless08', labelAR: 'قميص أخضر مريمي مع بنطلون كريمي', category: {all_categories}, prompt: 'fitted long-sleeve muted sage green dress shirt tucked neatly into cream tailored trousers with a clean black leather belt', physics: {physics} }},
  {{ id: 'timeless09', labelAR: 'قميص وردي فاتح مع بنطلون رمادي فحمي', category: {all_categories}, prompt: 'fitted long-sleeve soft pastel pink dress shirt tucked neatly into charcoal grey tailored trousers with a clean black leather belt', physics: {physics} }},
  {{ id: 'timeless10', labelAR: 'قميص أبيض مع بنطلون كحلي', category: {all_categories}, prompt: 'fitted long-sleeve crisp white dress shirt tucked neatly into deep navy blue tailored trousers with a clean black leather belt', physics: {physics} }},
  {{ id: 'timeless11', labelAR: 'قميص عنابي مع بنطلون رمادي', category: {all_categories}, prompt: 'fitted long-sleeve deep burgundy dress shirt tucked neatly into medium grey tailored trousers with a clean black leather belt', physics: {physics} }},
  {{ id: 'timeless12', labelAR: 'قميص أسود مع بنطلون بيج فاتح', category: {all_categories}, prompt: 'fitted long-sleeve solid black dress shirt tucked neatly into light beige tailored trousers with a clean black leather belt', physics: {physics} }},
  {{ id: 'timeless13', labelAR: 'قميص أزرق فولاذي مع بنطلون كاكي', category: {all_categories}, prompt: 'fitted long-sleeve steel blue dress shirt tucked neatly into khaki tailored trousers with a clean black leather belt', physics: {physics} }},
  {{ id: 'timeless14', labelAR: 'قميص أبيض مع بنطلون زيتي', category: {all_categories}, prompt: 'fitted long-sleeve crisp white dress shirt tucked neatly into olive green tailored trousers with a clean black leather belt', physics: {physics} }},
  {{ id: 'timeless15', labelAR: 'قميص فحمي مع بنطلون رمادي فاتح', category: {all_categories}, prompt: 'fitted long-sleeve dark charcoal dress shirt tucked neatly into light grey tailored trousers with a clean black leather belt', physics: {physics} }}
"""

# Add a comma to the previous final outfit, then append the timeless collection.
outfits_start = text.index('const OUTFITS = [')
marker_index = text.index(marker, outfits_start)
before = text[:marker_index]
after = text[marker_index:]

trimmed = before.rstrip()
if not trimmed.endswith('}'):
    raise SystemExit('Unexpected OUTFITS array ending')

text = trimmed + ',' + outfits + after
path.write_text(text)
print('Added 15 timeless colour combination outfits to OUTFITS.')
