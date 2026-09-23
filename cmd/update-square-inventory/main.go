package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"gopkg.in/yaml.v3"

	"github.com/jmpa-io/jmpa.io/internal/square"
)

// Version is set at build time via -ldflags "-X main.Version=<commit>".
var Version string

func init() {
	zerolog.TimestampFieldName = "ts"
	zerolog.MessageFieldName = "msg"
	zerolog.SetGlobalLevel(zerolog.InfoLevel)
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})
}

// artEntry mirrors the structure of each item in data/art.yml.
type artEntry struct {
	ID          string   `yaml:"id"`
	Title       string   `yaml:"title"`
	Description string   `yaml:"description"`
	Medium      string   `yaml:"medium"`
	Size        string   `yaml:"size"`
	Price       string   `yaml:"price"`
	Image       string   `yaml:"image"`
	Images      []string `yaml:"images,omitempty"`
	Link        string   `yaml:"link"`
	Sold        bool     `yaml:"sold"`
}

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	if Version != "" {
		log.Info().Str("version", Version).Msg("starting")
	}

	accessToken := os.Getenv("SQUARE_ACCESS_TOKEN")
	if accessToken == "" {
		log.Fatal().Msg("SQUARE_ACCESS_TOKEN is not set")
	}
	sandbox := os.Getenv("SQUARE_SANDBOX") == "true"

	artYML := os.Getenv("ART_YML")
	if artYML == "" {
		artYML = "data/art.yml"
	}

	sq := square.New(accessToken, sandbox)

	// Resolve the Square location ID.
	locationID, err := sq.FirstActiveLocationID(ctx)
	if err != nil {
		log.Fatal().Err(err).Msg("get location id")
	}
	log.Info().Str("location_id", locationID).Msg("using Square location")

	// Read art.yml.
	raw, err := os.ReadFile(artYML)
	if err != nil {
		log.Fatal().Err(err).Str("file", artYML).Msg("read art.yml")
	}
	var entries []artEntry
	if err := yaml.Unmarshal(raw, &entries); err != nil {
		log.Fatal().Err(err).Msg("parse art.yml")
	}

	changed := 0
	for i, entry := range entries {
		if isRealLink(entry.Link) {
			log.Info().Str("id", entry.ID).Str("link", entry.Link).Msg("already has real link, skipping")
			continue
		}
		if entry.Sold {
			log.Info().Str("id", entry.ID).Msg("sold, skipping link creation")
			continue
		}

		price, err := parseAUD(entry.Price)
		if err != nil {
			log.Warn().Err(err).Str("id", entry.ID).Str("price", entry.Price).Msg("could not parse price, skipping")
			continue
		}

		desc := fmt.Sprintf("%s — %s, %s", entry.Description, entry.Medium, entry.Size)
		idempotencyKey := fmt.Sprintf("jmpa-%s-seed", entry.ID)

		log.Info().Str("id", entry.ID).Str("title", entry.Title).Int64("price_aud", price).Msg("creating payment link")
		link, err := sq.CreatePaymentLinkWithLocation(ctx, idempotencyKey, entry.ID, desc, price, locationID)
		if err != nil {
			log.Error().Err(err).Str("id", entry.ID).Msg("create payment link failed")
			continue
		}
		log.Info().Str("id", entry.ID).Str("link", link).Msg("payment link created")
		entries[i].Link = link
		changed++
	}

	if changed == 0 {
		log.Info().Msg("no changes — all entries already have real Square links")
		return
	}

	// Write back to art.yml.
	out, err := yaml.Marshal(entries)
	if err != nil {
		log.Fatal().Err(err).Msg("marshal art.yml")
	}
	if err := os.WriteFile(artYML, out, 0644); err != nil {
		log.Fatal().Err(err).Str("file", artYML).Msg("write art.yml")
	}
	log.Info().Int("changed", changed).Str("file", artYML).Msg("art.yml updated with real Square links")
}

// isRealLink returns true if the link is not a placeholder.
func isRealLink(link string) bool {
	return link != "" && !strings.Contains(link, "placeholder")
}

// parseAUD parses a price string like "$25 AUD" into integer dollars.
func parseAUD(s string) (int64, error) {
	s = strings.TrimPrefix(s, "$")
	s = strings.TrimSuffix(s, " AUD")
	s = strings.TrimSpace(s)
	v, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("parse price %q: %w", s, err)
	}
	return v, nil
}
