package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/aws/aws-lambda-go/events"
	"github.com/rs/zerolog"

	"github.com/jmpa-io/jmpa.io/internal/square"
)

type handler struct {
	sq  *square.Client
	log zerolog.Logger
}

type response struct {
	Sold []string `json:"sold"`
}

// handle responds to API Gateway HTTP API (payload format 2.0) requests.
// GET /inventory → { "sold": ["art-004", "art-014"] }
//
// The sold list is derived from Square catalog items whose name matches the
// pattern "art-XXX" and whose IN_STOCK quantity is 0.
func (h *handler) handle(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	h.log.Info().Str("method", req.RequestContext.HTTP.Method).Str("path", req.RawPath).Msg("request")

	// CORS preflight.
	if req.RequestContext.HTTP.Method == "OPTIONS" {
		return corsOK(), nil
	}

	_, variations, err := h.sq.ListCatalogItems(ctx)
	if err != nil {
		h.log.Error().Err(err).Msg("list catalog items")
		return serverError(fmt.Sprintf("failed to list catalog: %v", err)), nil
	}

	if len(variations) == 0 {
		return jsonOK(response{Sold: []string{}}), nil
	}

	// Collect variation IDs to query inventory.
	varIDs := make([]string, len(variations))
	for i, v := range variations {
		varIDs[i] = v.ID
	}

	counts, err := h.sq.BatchRetrieveInventoryCounts(ctx, varIDs)
	if err != nil {
		h.log.Error().Err(err).Msg("retrieve inventory counts")
		return serverError(fmt.Sprintf("failed to retrieve inventory: %v", err)), nil
	}

	// Build a map: variationID → IN_STOCK quantity.
	inStock := map[string]int{}
	for _, c := range counts {
		q, err := strconv.Atoi(c.Quantity)
		if err != nil {
			continue
		}
		inStock[c.CatalogObjectID] = q
	}

	// An item is sold if its variation has IN_STOCK = 0 (or is absent from counts).
	// The item name in Square is the art ID (e.g. "art-004").
	sold := []string{}
	for _, v := range variations {
		qty, ok := inStock[v.ID]
		if !ok || qty == 0 {
			sold = append(sold, v.Name)
		}
	}

	h.log.Info().Int("total", len(variations)).Int("sold", len(sold)).Msg("inventory checked")
	return jsonOK(response{Sold: sold}), nil
}

func jsonOK(v interface{}) events.APIGatewayV2HTTPResponse {
	b, _ := json.Marshal(v)
	return events.APIGatewayV2HTTPResponse{
		StatusCode: 200,
		Headers: map[string]string{
			"Content-Type":                 "application/json",
			"Access-Control-Allow-Origin":  "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		},
		Body: string(b),
	}
}

func corsOK() events.APIGatewayV2HTTPResponse {
	return events.APIGatewayV2HTTPResponse{
		StatusCode: 204,
		Headers: map[string]string{
			"Access-Control-Allow-Origin":  "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		},
	}
}

func serverError(msg string) events.APIGatewayV2HTTPResponse {
	b, _ := json.Marshal(map[string]string{"error": msg})
	return events.APIGatewayV2HTTPResponse{
		StatusCode: 500,
		Headers:    map[string]string{"Content-Type": "application/json"},
		Body:       string(b),
	}
}
