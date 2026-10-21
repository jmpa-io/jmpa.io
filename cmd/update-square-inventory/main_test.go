package main

import "testing"

func TestIsRealLink(t *testing.T) {
	tests := map[string]struct {
		link string
		want bool
	}{
		"empty":              {link: "", want: false},
		"placeholder":        {link: "https://example.com/placeholder", want: false},
		"placeholder prefix": {link: "placeholder", want: false},
		"real square link":   {link: "https://square.link/u/abc123", want: true},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			got := isRealLink(tt.link)
			if got != tt.want {
				t.Errorf("isRealLink(%q) = %v, want %v", tt.link, got, tt.want)
			}
		})
	}
}

func TestParseAUD(t *testing.T) {
	tests := map[string]struct {
		price   string
		want    int64
		wantErr bool
	}{
		"dollars and suffix": {price: "$25 AUD", want: 25},
		"no suffix":          {price: "$25", want: 25},
		"no dollar sign":     {price: "25 AUD", want: 25},
		"bare number":        {price: "25", want: 25},
		"zero":               {price: "$0 AUD", want: 0},
		"not a number":       {price: "free", wantErr: true},
		"empty":              {price: "", wantErr: true},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			got, err := parseAUD(tt.price)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("parseAUD(%q) want error, got nil (value %d)", tt.price, got)
				}
				return
			}
			if err != nil {
				t.Fatalf("parseAUD(%q) unexpected error: %v", tt.price, err)
			}
			if got != tt.want {
				t.Errorf("parseAUD(%q) = %d, want %d", tt.price, got, tt.want)
			}
		})
	}
}
