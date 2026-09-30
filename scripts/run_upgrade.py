from pathlib import Path

source_path = Path('scripts/upgrade_hyperrealism.py')
source = source_path.read_text()
source = source.replace("rep(old_bg, \"\", 'old background UI')", "if old_bg in text:\n    text = text.replace(old_bg, '', 1)")
exec(compile(source, str(source_path), 'exec'))
