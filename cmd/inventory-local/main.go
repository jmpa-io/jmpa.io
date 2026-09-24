package main

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strconv"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/jmpa-io/jmpa.io/internal/square"
)

func main() {
	zerolog.TimestampFieldName = "ts"
	zerolog.MessageFieldName = "msg"
	level, err := zerolog.ParseLevel(os.Getenv("LOG_LEVEL"))
	if err != nil || level == zerolog.NoLevel {
		level = zerolog.InfoLevel
	}
	zerolog.SetGlobalLevel(level)

	accessToken := os.Getenv("SQUARE_ACCESS_TOKEN")
	if accessToken == "" {
		log.Fatal().Msg("SQUARE_ACCESS_TOKEN is not set")
	}

	sandbox := os.Getenv("SQUARE_SANDBOX") != "false"
	sq := square.New(accessToken, sandbox)

	addr := ":8787"
	if p := os.Getenv("PORT"); p != "" {
		addr = ":" + p
	}

	http.HandleFunc("/inventory", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		ctx := context.Background()
		_, variations, err := sq.ListCatalogItems(ctx)
		if err != nil {
			log.Error().Err(err).Msg("list catalog items")
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}

		sold := []string{}
		if len(variations) > 0 {
			varIDs := make([]string, len(variations))
			for i, v := range variations {
				varIDs[i] = v.ID
			}
			counts, err := sq.BatchRetrieveInventoryCounts(ctx, varIDs)
			if err != nil {
				log.Error().Err(err).Msg("retrieve inventory counts")
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
				return
			}
			inStock := map[string]int{}
			for _, c := range counts {
				q, err := strconv.Atoi(c.Quantity)
				if err != nil {
					continue
				}
				inStock[c.CatalogObjectID] = q
			}
			for _, v := range variations {
				qty, ok := inStock[v.ID]
				if !ok || qty == 0 {
					sold = append(sold, v.Name)
				}
			}
		}

		log.Info().Int("sold", len(sold)).Msg("inventory checked")
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string][]string{"sold": sold})
	})

	log.Info().Str("addr", addr).Bool("sandbox", sandbox).Msg("inventory server starting")
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatal().Err(err).Msg("server failed")
	}
}
