package square

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNew(t *testing.T) {
	tests := map[string]struct {
		token   string
		sandbox bool
		wantURL string
	}{
		"production": {
			token:   "tok",
			sandbox: false,
			wantURL: productionBaseURL,
		},
		"sandbox": {
			token:   "tok",
			sandbox: true,
			wantURL: sandboxBaseURL,
		},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			c := New(tt.token, tt.sandbox)
			if c.baseURL != tt.wantURL {
				t.Errorf("want baseURL %q, got %q", tt.wantURL, c.baseURL)
			}
			if c.accessToken != tt.token {
				t.Errorf("want accessToken %q, got %q", tt.token, c.accessToken)
			}
		})
	}
}

func TestNewWithBaseURL(t *testing.T) {
	c := NewWithBaseURL("tok", "http://localhost:9999")
	if c.baseURL != "http://localhost:9999" {
		t.Errorf("want baseURL %q, got %q", "http://localhost:9999", c.baseURL)
	}
}

func TestListCatalogItems(t *testing.T) {
	tests := map[string]struct {
		handler      http.HandlerFunc
		wantItems    int
		wantVariants int
		wantErr      bool
	}{
		"returns items and variations": {
			handler: func(w http.ResponseWriter, r *http.Request) {
				json.NewEncoder(w).Encode(map[string]interface{}{
					"objects": []map[string]interface{}{
						{
							"id": "item-1", "type": "ITEM",
							"item_data": map[string]interface{}{
								"name": "art-001",
								"variations": []map[string]interface{}{
									{
										"id": "var-1", "type": "ITEM_VARIATION",
										"item_variation_data": map[string]interface{}{
											"item_id": "item-1",
											"name":    "art-001",
											"price_money": map[string]interface{}{
												"amount": 2500, "currency": "AUD",
											},
										},
									},
								},
							},
						},
					},
				})
			},
			wantItems:    1,
			wantVariants: 1,
		},
		"skips non-ITEM objects": {
			handler: func(w http.ResponseWriter, r *http.Request) {
				json.NewEncoder(w).Encode(map[string]interface{}{
					"objects": []map[string]interface{}{
						{"id": "cat-1", "type": "CATEGORY"},
					},
				})
			},
			wantItems:    0,
			wantVariants: 0,
		},
		"empty catalog": {
			handler: func(w http.ResponseWriter, r *http.Request) {
				json.NewEncoder(w).Encode(map[string]interface{}{"objects": []interface{}{}})
			},
			wantItems:    0,
			wantVariants: 0,
		},
		"square error response": {
			handler: func(w http.ResponseWriter, r *http.Request) {
				json.NewEncoder(w).Encode(map[string]interface{}{
					"errors": []map[string]interface{}{
						{"code": "UNAUTHORIZED", "detail": "invalid token"},
					},
				})
			},
			wantErr: true,
		},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			srv := httptest.NewServer(tt.handler)
			defer srv.Close()

			c := NewWithBaseURL("fake-token", srv.URL)
			items, variations, err := c.ListCatalogItems(context.Background())

			if tt.wantErr {
				if err == nil {
					t.Error("want error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(items) != tt.wantItems {
				t.Errorf("want %d items, got %d", tt.wantItems, len(items))
			}
			if len(variations) != tt.wantVariants {
				t.Errorf("want %d variations, got %d", tt.wantVariants, len(variations))
			}
		})
	}
}

func TestBatchRetrieveInventoryCounts(t *testing.T) {
	tests := map[string]struct {
		handler    http.HandlerFunc
		varIDs     []string
		wantCounts int
		wantErr    bool
	}{
		"returns counts": {
			handler: func(w http.ResponseWriter, r *http.Request) {
				json.NewEncoder(w).Encode(map[string]interface{}{
					"counts": []map[string]interface{}{
						{"catalog_object_id": "var-1", "state": "IN_STOCK", "quantity": "1"},
						{"catalog_object_id": "var-2", "state": "IN_STOCK", "quantity": "0"},
					},
				})
			},
			varIDs:     []string{"var-1", "var-2"},
			wantCounts: 2,
		},
		"empty counts": {
			handler: func(w http.ResponseWriter, r *http.Request) {
				json.NewEncoder(w).Encode(map[string]interface{}{"counts": []interface{}{}})
			},
			varIDs:     []string{"var-1"},
			wantCounts: 0,
		},
		"square error response": {
			handler: func(w http.ResponseWriter, r *http.Request) {
				json.NewEncoder(w).Encode(map[string]interface{}{
					"errors": []map[string]interface{}{
						{"code": "SERVICE_UNAVAILABLE", "detail": "try again later"},
					},
				})
			},
			varIDs:  []string{"var-1"},
			wantErr: true,
		},
		"sends correct variation ids in request": {
			handler: func(w http.ResponseWriter, r *http.Request) {
				var body struct {
					IDs []string `json:"catalog_object_ids"`
				}
				json.NewDecoder(r.Body).Decode(&body)
				if len(body.IDs) != 2 {
					w.WriteHeader(http.StatusBadRequest)
					return
				}
				json.NewEncoder(w).Encode(map[string]interface{}{"counts": []interface{}{}})
			},
			varIDs:     []string{"var-1", "var-2"},
			wantCounts: 0,
		},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			mux := http.NewServeMux()
			mux.HandleFunc("/v2/inventory/counts/batch-retrieve", tt.handler)
			srv := httptest.NewServer(mux)
			defer srv.Close()

			c := NewWithBaseURL("fake-token", srv.URL)
			counts, err := c.BatchRetrieveInventoryCounts(context.Background(), tt.varIDs)

			if tt.wantErr {
				if err == nil {
					t.Error("want error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(counts) != tt.wantCounts {
				t.Errorf("want %d counts, got %d", tt.wantCounts, len(counts))
			}
		})
	}
}
