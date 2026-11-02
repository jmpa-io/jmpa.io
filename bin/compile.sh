#!/usr/bin/env bash
# compile the static website using docker + hugo.

# funcs.
die() { echo "$1" >&2; exit "${2:-1}"; }

# check pwd.
[[ ! -d .git ]] \
  && die "must be run from repository root directory"

# check deps.
deps=(docker)
for dep in "${deps[@]}"; do
  hash "$dep" 2>/dev/null || missing+=("$dep")
done
if [[ ${#missing[@]} -ne 0 ]]; then
  s=""; [[ ${#missing[@]} -gt 1 ]] && { s="s"; }
  die "missing dep${s}: ${missing[*]}"
fi

# check path, since there are permission issues without it.
path="public"
[[ -d "$path" ]] \
  || die "missing $path"
rm -rf "$path" \
  || die "failed to clear $path"

# compile website.
echo "##[group]Compiling static site"
docker run --rm \
  -w /app \
  -v "$PWD:/app" \
  klakegg/hugo:0.78.2-alpine \
  || die "failed to compile website"
echo "##[endgroup]"

# chown files
# FIXME is this really needed?
sudo chown -R "$(whoami)" "$path" \
  || die "failed to chown $path"
