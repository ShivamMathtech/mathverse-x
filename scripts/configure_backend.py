"""Create a private local API token once; never overwrite existing configuration."""
from pathlib import Path
import secrets
root = Path(__file__).resolve().parents[1]
env_file = root / 'backend' / '.env'
if not env_file.exists():
    env_file.write_text('MATHVERSE_API_TOKEN=' + secrets.token_urlsafe(32) + '\nCORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173\n', encoding='utf-8')
    try:
        env_file.chmod(0o600)
    except OSError:
        pass
    print('Created backend/.env. Copy its API token into the application Settings when connecting Python.')
else:
    print('Using the existing backend/.env configuration.')
