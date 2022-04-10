#!/usr/bin/env bash
# coverts the raw markdown for courses to pdfs.

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

# vars.
repo=$(basename "$PWD") \
  || die "failed to retrieve repository name"

# build docker image.
docker build . -t "$repo" \
  || die "failed to build Dockerfile for $repo"

# # setup out directory.
# dir="public"
# if [[ -d "$dir" ]]; then
#   mkdir -p "$dir" \
#     || die "failed to create $dir"
# fi

# find directories that should generate pdfs.
contentDir="./content"
dirs=$(find "$contentDir" -mindepth 1 -maxdepth 1 -type d \
  -not -name 'store' -not -name 'stack' -not -name '404' -not -name 'docker*') \
  || die "failed to find directories under $contentDir that should generate pdfs"
[[ -z "$dirs" ]] \
  && die "no directories found under $contentDir that should generate pdfs"

# generate pdfs.
for dir in $dirs; do

  # does this directory have any files?
  files=$(find "$dir" -type f) \
    || die "failed to find files in $dir"
  [[ -z "$files" ]] && { continue; }
  files="$(<<< "$files" sort | tr '\n' ' ')"

  # generate pdf.
  # https://pandoc.org/demos.html
  name="${dir//$contentDir\//}"
  file="$name.pdf"
  docker run -it --rm \
    -w /app \
    -v "$PWD:/app" \
    "$repo" --toc -N --pdf-engine=xelatex --highlight-style zenburn --metadata title="$name" --metadata-file ./pdfs/metadata.yml -H ./pdfs/head.tex -o "$file" -V subparagraph $files \
    || die "failed to create $file using pandoc"
done

# # chown file.
# # FIXME is this really needed?
# sudo chown "$(whoami)" "$file" \
#   || die "failed to chown $file"
