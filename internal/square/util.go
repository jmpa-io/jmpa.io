package square

import (
	"bytes"
	"io"
	"regexp"
	"strings"
)

var nonAlphanumeric = regexp.MustCompile(`[^a-z0-9]+`)

func sanitise(s string) string {
	return strings.Trim(nonAlphanumeric.ReplaceAllString(strings.ToLower(s), "-"), "-")
}

func newJSONReader(b []byte) io.Reader {
	return bytes.NewReader(b)
}
