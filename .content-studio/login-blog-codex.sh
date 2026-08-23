#!/bin/zsh
# Sign a second Codex/ChatGPT account in for blog posts only.
# Does not change ~/.codex (your coding login).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export CODEX_HOME="$ROOT/.content-studio/codex-home"
CODEX="${CONTENT_STUDIO_CODEX_BIN:-/Applications/ChatGPT.app/Contents/Resources/codex}"
mkdir -p "$CODEX_HOME"
if [[ ! -f "$CODEX_HOME/config.toml" ]]; then
  cat > "$CODEX_HOME/config.toml" <<'EOF'
model = "gpt-5.6-luna"
model_reasoning_effort = "high"
EOF
fi
echo "CODEX_HOME=$CODEX_HOME"
echo "This login is only for blog generation."
exec "$CODEX" login
