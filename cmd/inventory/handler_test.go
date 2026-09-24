package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/aws/aws-lambda-go/events"
	"github.com/rs/zerolog"

	"github.com/jmpa-io/jmpa.io/internal/square"
)

// fakeSquare builds an httptest.Server that mimics the Square API.
// catalog maps item name → variation ID.
// inStock maps variation ID → quantity (absent = 0).
func fakeSquare(t *testing.T, catalog map[string]string, inStock map[string]int) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()

	mux.HandleFunc("/v2/catalog/list", func(w http.ResponseWriter, r *http.Request) {
		var objects []map[string]interface{}
		for name, varID := range catalog {
			objects = append(objects, map[string]interface{}{
				"id":   "item-" + varID,
				"type": "ITEM",
				"item_data": map[string]interface{}{
					"name": name,
					"variations": []map[string]interface{}{
						{
							"id":   varID,
							"type": "ITEM_VARIATION",
							"item_variation_data": map[string]interface{}{
								"item_id": "item-" + varID,
								"name":    name,
							},
						},
					},
				},
			})
		}
		json.NewEncoder(w).Encode(map[string]interface{}{"objects": objects})
	})

	mux.HandleFunc("/v2/inventory/counts/batch-retrieve", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			CatalogObjectIDs []string `json:"catalog_object_ids"`
		}
		json.NewDecoder(r.Body).Decode(&req)

		var counts []map[string]interface{}
		for _, id := range req.CatalogObjectIDs {
			if qty, ok := inStock[id]; ok {
				counts = append(counts, map[string]interface{}{
					"catalog_object_id": id,
					"state":             "IN_STOCK",
					"quantity":          fmt.Sprint(qty),
				})
			}
		}
		json.NewEncoder(w).Encode(map[string]interface{}{"counts": counts})
	})

	return httptest.NewServer(mux)
}

// fakeSquareWithErrors builds an httptest.Server that returns Square API errors.
func fakeSquareWithErrors(t *testing.T, catalogErr, inventoryErr bool) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()

	mux.HandleFunc("/v2/catalog/list", func(w http.ResponseWriter, r *http.Request) {
		if catalogErr {
			json.NewEncoder(w).Encode(map[string]interface{}{
				"errors": []map[string]interface{}{
					{"code": "UNAUTHORIZED", "detail": "invalid token"},
				},
			})
			return
		}
		json.NewEncoder(w).Encode(map[string]interface{}{
			"objects": []map[string]interface{}{
				{
					"id": "item-var-001", "type": "ITEM",
					"item_data": map[string]interface{}{
						"name": "art-001",
						"variations": []map[string]interface{}{
							{
								"id": "var-001", "type": "ITEM_VARIATION",
								"item_variation_data": map[string]interface{}{
									"item_id": "item-var-001",
									"name":    "art-001",
								},
							},
						},
					},
				},
			},
		})
	})

	mux.HandleFunc("/v2/inventory/counts/batch-retrieve", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"errors": []map[string]interface{}{
				{"code": "SERVICE_UNAVAILABLE", "detail": "try again later"},
			},
		})
	})

	return httptest.NewServer(mux)
}

func getRequest() events.APIGatewayV2HTTPRequest {
	return events.APIGatewayV2HTTPRequest{
		RawPath: "/inventory",
		RequestContext: events.APIGatewayV2HTTPRequestContext{
			HTTP: events.APIGatewayV2HTTPRequestContextHTTPDescription{
				Method: "GET",
				Path:   "/inventory",
			},
		},
	}
}

func TestHandle_Inventory(t *testing.T) {
	tests := map[string]struct {
		srv        func(t *testing.T) *httptest.Server
		method     string
		wantStatus int
		wantSold   int
		wantIDs    []string
		wantCORS   bool
	}{
		"all available": {
			srv: func(t *testing.T) *httptest.Server {
				return fakeSquare(t,
					map[string]string{"art-001": "var-001", "art-002": "var-002"},
					map[string]int{"var-001": 1, "var-002": 1},
				)
			},
			wantStatus: 200,
			wantSold:   0,
		},
		"some sold - absent from counts": {
			srv: func(t *testing.T) *httptest.Server {
				return fakeSquare(t,
					map[string]string{"art-001": "var-001", "art-004": "var-004", "art-008": "var-008"},
					map[string]int{"var-001": 1},
				)
			},
			wantStatus: 200,
			wantSold:   2,
			wantIDs:    []string{"art-004", "art-008"},
		},
		"all sold - empty counts": {
			srv: func(t *testing.T) *httptest.Server {
				return fakeSquare(t,
					map[string]string{"art-001": "var-001", "art-002": "var-002"},
					map[string]int{},
				)
			},
			wantStatus: 200,
			wantSold:   2,
		},
		"sold - explicit zero quantity": {
			srv: func(t *testing.T) *httptest.Server {
				return fakeSquare(t,
					map[string]string{"art-001": "var-001", "art-002": "var-002"},
					map[string]int{"var-001": 1, "var-002": 0},
				)
			},
			wantStatus: 200,
			wantSold:   1,
			wantIDs:    []string{"art-002"},
		},
		"empty catalog": {
			srv: func(t *testing.T) *httptest.Server {
				return fakeSquare(t, map[string]string{}, map[string]int{})
			},
			wantStatus: 200,
			wantSold:   0,
		},
		"square catalog error": {
			srv: func(t *testing.T) *httptest.Server {
				return fakeSquareWithErrors(t, true, false)
			},
			wantStatus: 500,
		},
		"square inventory counts error": {
			srv: func(t *testing.T) *httptest.Server {
				return fakeSquareWithErrors(t, false, true)
			},
			wantStatus: 500,
		},
		"cors headers on success": {
			srv: func(t *testing.T) *httptest.Server {
				return fakeSquare(t, map[string]string{}, map[string]int{})
			},
			wantStatus: 200,
			wantCORS:   true,
		},
		"cors preflight options": {
			srv: func(t *testing.T) *httptest.Server {
				return fakeSquare(t, map[string]string{}, map[string]int{})
			},
			method:     "OPTIONS",
			wantStatus: 204,
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			srv := tt.srv(t)
			defer srv.Close()

			h := &handler{sq: square.NewWithBaseURL("fake-token", srv.URL), log: zerolog.Nop()}

			req := getRequest()
			if tt.method != "" {
				req.RequestContext.HTTP.Method = tt.method
			}

			resp, err := h.handle(context.Background(), req)
			if err != nil {
				t.Fatalf("handle() error: %v", err)
			}
			if resp.StatusCode != tt.wantStatus {
				t.Fatalf("want status %d, got %d (body: %s)", tt.wantStatus, resp.StatusCode, resp.Body)
			}

			if tt.wantCORS {
				if resp.Headers["Access-Control-Allow-Origin"] != "*" {
					t.Errorf("want CORS header *, got %q", resp.Headers["Access-Control-Allow-Origin"])
				}
			}

			// Only parse body for 200 responses.
			if resp.StatusCode != 200 {
				return
			}
			var body response
			if err := json.Unmarshal([]byte(resp.Body), &body); err != nil {
				t.Fatalf("unmarshal response: %v (body: %s)", err, resp.Body)
			}
			if tt.wantSold > 0 && len(body.Sold) != tt.wantSold {
				t.Errorf("want %d sold, got %v", tt.wantSold, body.Sold)
			}
			for _, id := range tt.wantIDs {
				found := false
				for _, s := range body.Sold {
					if s == id {
						found = true
						break
					}
				}
				if !found {
					t.Errorf("want %q in sold list, got %v", id, body.Sold)
				}
			}
		})
	}
}
