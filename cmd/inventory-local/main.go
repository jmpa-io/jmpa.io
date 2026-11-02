package main

import (
	"encoding/json"
	"net/http"
	"os"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"gopkg.in/yaml.v3"
)

type artEntry struct {
	ID   string `yaml:"id"`
	Sold bool   `yaml:"sold"`
}

func main() {
	zerolog.TimestampFieldName = "ts"
	zerolog.MessageFieldName = "msg"
	zerolog.SetGlobalLevel(zerolog.InfoLevel)

	artYML := os.Getenv("ART_YML")
	if artYML == "" {
		artYML = "data/art.yml"
	}

	addr := ":8788"
	if p := os.Getenv("PORT"); p != "" {
		addr = ":" + p
	}

	http.HandleFunc("/inventory", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		raw, err := os.ReadFile(artYML)
		if err != nil {
			log.Error().Err(err).Str("path", artYML).Msg("read art.yml")
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		var entries []artEntry
		if err := yaml.Unmarshal(raw, &entries); err != nil {
			log.Error().Err(err).Msg("parse art.yml")
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		sold := []string{}
		for _, e := range entries {
			if e.Sold {
				sold = append(sold, e.ID)
			}
		}

		log.Info().Int("sold", len(sold)).Msg("inventory")
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string][]string{"sold": sold})
	})

	log.Info().Str("addr", addr).Str("source", artYML).Msg("inventory-local starting")
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatal().Err(err).Msg("server failed")
	}
}
