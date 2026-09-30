from pathlib import Path

app_path = Path('src/App.tsx')
current = app_path.read_text()

# Safe to run before every dev/build: if the upgrade is already present, do nothing.
if "type BackgroundDynamics = 'empty' | 'casual' | 'busy';" in current and "hasGlasses: boolean;" in current and "framingImperfection: FramingImperfection;" in current:
    raise SystemExit(0)

source_path = Path('scripts/upgrade_hyperrealism.py')
source = source_path.read_text()
source = source.replace("rep(old_bg, \"\", 'old background UI')", "if old_bg in text:\n    text = text.replace(old_bg, '', 1)")
exec(compile(source, str(source_path), 'exec'))
