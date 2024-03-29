#!/usr/bin/env bash
# coverts the raw markdown for courses to pdfs.

# funcs.
die() { echo "$1" >&2; exit "${2:-1}"; }

# taken from: https://stackoverflow.com/questions/2495459/formatting-the-date-in-unix-to-include-suffix-on-day-st-nd-rd-and-th
daySuffix() {
  case $(date +%d) in
    1|21|31) echo "st";;
    2|22)    echo "nd";;
    3|23)    echo "rd";;
    *)       echo "th";;
  esac
}

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

# setup out directory.
outDir="public"
if [[ -d "$outDir" ]]; then
  mkdir -p "$outDir" \
    || die "failed to create $outDir"
fi

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
  files=$(find "$dir" -type f -not -name "*_index*") \
    || die "failed to find files in $dir"
  [[ -z "$files" ]] && { continue; }
  files="$(<<< "$files" sort | tr '\n' ' ')"

  # remove images from part-1.md and move it to _index.
  part1="$dir/part-1.md"
  index="$dir/_index.md"
  if [[ -f "$part1" && -f "$index" ]]; then

    # find + clean images from part-1.
    images=$(awk '/images: /{print $2}' "$part1") \
      || die "failed to find images in $part1"
    images=${images//\[/}         # remove [
    images=${images//\]/}         # remove ]
    rawImages="$images"

    # escape images.
    images=${images//\//\\\/}     # escape /s
    images=${images//\-/\\\-}     # escape -s
    images=${images//\./\\\.}     # escape .s
    images="![](static$images)"   # format.

    # find title.
    lineNumber=$(grep -n "title" "$index" | cut -d':' -f1) \
      || die "failed to find line number of title in $index"
    ((lineNumber++)) # incrementing because of | format.
    title=$(sed "${lineNumber}q;d" "$index" | tr -d ' ') \
      || die "failed to find title using sed for $index"

    # append images to title in _index.
    if ! grep -q "$rawImages" "$index"; then
      sed -i -z "s/$title/$images\n  $title/1" "$index" \
        || die "failed to add $part1 images to $index"
    fi
  fi

  # move titles to be headings in each file, since I can't figure out
  # how to do this with pandoc / latex at this time.
  for file in $files; do

    # find title.
    title=$(awk '/title/ {$1 = ""; print $0;}' "$file") \
      || die "failed to find title using awk for $file"
    # note the ending dot here adds the dot to the title.
    title=$(<<< "$title" rev | cut -d'.' -f2 | rev). \
      || die "failed to parse title for $file"
    [[ -z "$title" ]] \
      && die "failed to find a title for $file"

    # TODO do headings need to have a '#' prepended?

    # append title as heading, only if it hasn't been added already though.
    pattern="#$title"
    if ! grep -q "$pattern" "$file"; then
      sed -i -z "s/---/---\n$pattern/2" "$file" \
        || die "failed to append title as heading to $file"
    fi
  done

  # add _index file to files so it is last in the array.
  # NOTE: doing this becuase pandoc / LaTeX seems to be reading the last file given to it
  # for things like the title.
  if [[ -f "$index" ]]; then
    files="${files}${index}"
  fi

  # generate pdf.
  # https://pandoc.org/demos.html
  name="${dir//$contentDir\//}"
  file="$name.pdf"
  # shellcheck disable=SC2086
  docker run -it --rm \
    -w /app \
    -v "$PWD:/app" \
    --entrypoint pandoc \
    "$repo" \
      -f markdown \
      -t latex \
      --pdf-engine=xelatex \
      --table-of-contents \
      --file-scope \
      --number-sections \
      --standalone \
      --variable=subparagraph \
      --defaults /root/.config/pandoc/dracula.yaml \
      --metadata date="$(date "+%A %d$(daySuffix), %B %Y")" \
      --metadata-file ./pdfs/metadata.yml \
      --include-in-header ./pdfs/head.tex \
      --dpi=192 \
      -o "$outDir/$file" \
      $files \
    || die "failed to create $file using pandoc"
done
