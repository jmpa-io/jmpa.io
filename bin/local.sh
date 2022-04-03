#!/usr/bin/env bash
# run this repository inside a docker container.

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

# run container.
docker run --rm -it \
  -w /app \
  -v "$PWD:/app" \
  -p "1313:1313" \
  --entrypoint sh \
  klakegg/hugo:0.78.2-alpine \
  || die "failed to docker run"
