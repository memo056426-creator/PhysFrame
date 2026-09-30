from pathlib import Path

path = Path('src/App.tsx')
text = path.read_text()

skin_rules = (
    "ZERO digital skin smoothing, zero airbrushing, unpolished raw human skin, "
    "clearly visible enlarged micro-pores, subtle microscopic skin texture irregularities, "
    "fine expression lines around eyes and mouth, completely unpowdered skin with natural uncorrected texture"
)

eye_rules = (
    "slightly realistic tired eyes, natural imperfect eyelashes that clump together randomly, "
    "subtle natural dark circles under eyes, unglamorous real-world facial expression"
)

# Apply anti-beautification texture rules to every realism mode.
base_marker = "  derived.skinResponse += ', subtle subsurface scattering visible on ears and nose tip, micro-specular highlights on forehead and nose bridge from natural skin oils';"
if skin_rules not in text:
    if base_marker not in text:
        raise SystemExit('skinResponse base marker not found')
    replacement = (
        base_marker
        + f"\n  derived.skinResponse += ', {skin_rules}';"
        + f"\n  derived.skinResponse += ', {eye_rules}';"
    )
    text = text.replace(base_marker, replacement, 1)

# Anti-AI mode gets an additional hard constraint layer, not just descriptive texture language.
anti_marker = "    derived.realismConstraints.push('NO impossible room-wide ambient fill light', 'NO perfectly white-balanced lighting, allow natural color casts', 'NO artificial denoising');"
anti_constraint = (
    "    derived.realismConstraints.push('NO impossible room-wide ambient fill light', "
    "'NO perfectly white-balanced lighting, allow natural color casts', 'NO artificial denoising', "
    "'ZERO digital skin smoothing or airbrushing', "
    "'preserve visible pores, fine lines, dark circles, eyelash irregularity, and uncorrected skin texture', "
    "'NO beauty-filter eye enlargement, glowing eyes, or doll-like facial cleanup');"
)
if "NO beauty-filter eye enlargement" not in text:
    if anti_marker not in text:
        raise SystemExit('anti-ai-raw constraint marker not found')
    text = text.replace(anti_marker, anti_constraint, 1)

# Expand the centralized negative-prompt builder created by hair_lock_patch.py.
negative_anchor = "    'altered hairline'"
negative_expansion = """    'altered hairline',
    'plastic skin',
    'waxy skin',
    'airbrushed',
    'digital smoothing',
    'beauty filter',
    'flawless skin',
    'makeup',
    'glass skin',
    'cinematic skin',
    'perfect eyelashes',
    'glowing eyes',
    'doll-like appearance',
    'photorealistic render look'"""
if "    'plastic skin'," not in text:
    if negative_anchor not in text:
        raise SystemExit('buildNegativeConstraints hair anchor not found')
    text = text.replace(negative_anchor, negative_expansion, 1)

path.write_text(text)
print('Anti-beautification patch applied successfully.')
