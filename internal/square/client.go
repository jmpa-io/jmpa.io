package square

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const (
	productionBaseURL = "https://connect.squareup.com"
	sandboxBaseURL    = "https://connect.squareupsandbox.com"
)

// Client is a minimal Square API client.
type Client struct {
	accessToken string
	baseURL     string
	http        *http.Client
}

// New returns a Square client. Set sandbox=true for the sandbox environment.
func New(accessToken string, sandbox bool) *Client {
	base := productionBaseURL
	if sandbox {
		base = sandboxBaseURL
	}
	return &Client{
		accessToken: accessToken,
		baseURL:     base,
		http:        &http.Client{Timeout: 10 * time.Second},
	}
}

// NewWithBaseURL returns a Square client pointed at a custom base URL.
// Intended for tests — point it at an httptest.Server instead of Square.
func NewWithBaseURL(accessToken, baseURL string) *Client {
	return &Client{
		accessToken: accessToken,
		baseURL:     baseURL,
		http:        &http.Client{Timeout: 10 * time.Second},
	}
}

func (c *Client) do(ctx context.Context, method, path string, body io.Reader) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.accessToken)
	req.Header.Set("Square-Version", "2024-01-18")
	req.Header.Set("Content-Type", "application/json")
	return c.http.Do(req)
}

// CatalogItem represents a Square catalog item relevant to us.
type CatalogItem struct {
	ID   string
	Name string
}

// CatalogItemVariation holds the variation (price + inventory tracking ID).
type CatalogItemVariation struct {
	ID            string
	ItemID        string
	Name          string
	PriceMoney    int64  // amount in cents
	PriceCurrency string // e.g. "AUD"
}

type listCatalogResponse struct {
	Objects []struct {
		ID   string `json:"id"`
		Type string `json:"type"`
		ItemData *struct {
			Name       string `json:"name"`
			Variations []struct {
				ID   string `json:"id"`
				Type string `json:"type"`
				ItemVariationData *struct {
					ItemID     string `json:"item_id"`
					Name       string `json:"name"`
					PriceMoney *struct {
						Amount   int64  `json:"amount"`
						Currency string `json:"currency"`
					} `json:"price_money"`
				} `json:"item_variation_data"`
			} `json:"variations"`
		} `json:"item_data"`
	} `json:"objects"`
	Cursor string `json:"cursor"`
	Errors []struct {
		Code   string `json:"code"`
		Detail string `json:"detail"`
	} `json:"errors"`
}

// ListCatalogItems returns all ITEM-type catalog objects.
func (c *Client) ListCatalogItems(ctx context.Context) ([]CatalogItem, []CatalogItemVariation, error) {
	var items []CatalogItem
	var variations []CatalogItemVariation
	cursor := ""
	for {
		path := "/v2/catalog/list?types=ITEM"
		if cursor != "" {
			path += "&cursor=" + cursor
		}
		resp, err := c.do(ctx, http.MethodGet, path, nil)
		if err != nil {
			return nil, nil, fmt.Errorf("list catalog: %w", err)
		}
		defer resp.Body.Close()

		var r listCatalogResponse
		if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
			return nil, nil, fmt.Errorf("decode catalog: %w", err)
		}
		if len(r.Errors) > 0 {
			return nil, nil, fmt.Errorf("square error: %s: %s", r.Errors[0].Code, r.Errors[0].Detail)
		}
		for _, obj := range r.Objects {
			if obj.Type != "ITEM" || obj.ItemData == nil {
				continue
			}
			items = append(items, CatalogItem{ID: obj.ID, Name: obj.ItemData.Name})
			for _, v := range obj.ItemData.Variations {
				if v.Type != "ITEM_VARIATION" || v.ItemVariationData == nil {
					continue
				}
				vd := v.ItemVariationData
				var amount int64
				var currency string
				if vd.PriceMoney != nil {
					amount = vd.PriceMoney.Amount
					currency = vd.PriceMoney.Currency
				}
				variations = append(variations, CatalogItemVariation{
					ID:            v.ID,
					ItemID:        obj.ID,
					Name:          obj.ItemData.Name,
					PriceMoney:    amount,
					PriceCurrency: currency,
				})
			}
		}
		if r.Cursor == "" {
			break
		}
		cursor = r.Cursor
	}
	return items, variations, nil
}

type inventoryCountsResponse struct {
	Counts []struct {
		CatalogObjectID string `json:"catalog_object_id"`
		State           string `json:"state"`
		Quantity        string `json:"quantity"`
	} `json:"counts"`
	Cursor string `json:"cursor"`
	Errors []struct {
		Code   string `json:"code"`
		Detail string `json:"detail"`
	} `json:"errors"`
}

// InventoryCount holds the quantity at the given state for a catalog object.
type InventoryCount struct {
	CatalogObjectID string
	State           string
	Quantity        string
}

// BatchRetrieveInventoryCounts retrieves inventory counts for the given variation IDs.
func (c *Client) BatchRetrieveInventoryCounts(ctx context.Context, variationIDs []string) ([]InventoryCount, error) {
	var counts []InventoryCount
	cursor := ""
	for {
		payload := map[string]interface{}{
			"catalog_object_ids": variationIDs,
			"states":             []string{"IN_STOCK"},
		}
		if cursor != "" {
			payload["cursor"] = cursor
		}
		b, _ := json.Marshal(payload)
		resp, err := c.do(ctx, http.MethodPost, "/v2/inventory/counts/batch-retrieve",
			newJSONReader(b))
		if err != nil {
			return nil, fmt.Errorf("batch retrieve inventory: %w", err)
		}
		defer resp.Body.Close()

		var r inventoryCountsResponse
		if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
			return nil, fmt.Errorf("decode inventory: %w", err)
		}
		if len(r.Errors) > 0 {
			return nil, fmt.Errorf("square error: %s: %s", r.Errors[0].Code, r.Errors[0].Detail)
		}
		counts = append(counts, toInventoryCounts(r.Counts)...)
		if r.Cursor == "" {
			break
		}
		cursor = r.Cursor
	}
	return counts, nil
}

func toInventoryCounts(raw []struct {
	CatalogObjectID string `json:"catalog_object_id"`
	State           string `json:"state"`
	Quantity        string `json:"quantity"`
}) []InventoryCount {
	out := make([]InventoryCount, len(raw))
	for i, r := range raw {
		out[i] = InventoryCount{
			CatalogObjectID: r.CatalogObjectID,
			State:           r.State,
			Quantity:        r.Quantity,
		}
	}
	return out
}

type createPaymentLinkResponse struct {
	PaymentLink *struct {
		ID      string `json:"id"`
		URL     string `json:"url"`
		OrderID string `json:"order_id"`
	} `json:"payment_link"`
	Errors []struct {
		Code   string `json:"code"`
		Detail string `json:"detail"`
	} `json:"errors"`
}

// CreatePaymentLink creates a Square-hosted payment link for a single item.
// priceAUD is the price in Australian dollars (e.g. 25 for $25 AUD).
// quantity should be 1 for original paintings.
func (c *Client) CreatePaymentLink(ctx context.Context, name, description string, priceAUD int64) (string, error) {
	payload := map[string]interface{}{
		"idempotency_key": fmt.Sprintf("jmpa-%s-%d", sanitise(name), priceAUD),
		"quick_pay": map[string]interface{}{
			"name": name,
			"price_money": map[string]interface{}{
				"amount":   priceAUD * 100, // cents
				"currency": "AUD",
			},
			"location_id": "__LOCATION_ID__", // replaced at runtime by handler
		},
		"checkout_options": map[string]interface{}{
			"allow_tipping":          false,
			"redirect_url":           "https://jmpa.io/art",
			"ask_for_shipping_address": true,
		},
		"description": description,
	}
	b, _ := json.Marshal(payload)
	resp, err := c.do(ctx, http.MethodPost, "/v2/online-checkout/payment-links", newJSONReader(b))
	if err != nil {
		return "", fmt.Errorf("create payment link: %w", err)
	}
	defer resp.Body.Close()

	var r createPaymentLinkResponse
	if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
		return "", fmt.Errorf("decode payment link: %w", err)
	}
	if len(r.Errors) > 0 {
		return "", fmt.Errorf("square error: %s: %s", r.Errors[0].Code, r.Errors[0].Detail)
	}
	if r.PaymentLink == nil {
		return "", fmt.Errorf("no payment link returned")
	}
	return r.PaymentLink.URL, nil
}

// CreatePaymentLinkWithLocation is like CreatePaymentLink but takes an explicit location ID.
func (c *Client) CreatePaymentLinkWithLocation(ctx context.Context, idempotencyKey, name, description string, priceAUD int64, locationID string) (string, error) {
	payload := map[string]interface{}{
		"idempotency_key": idempotencyKey,
		"quick_pay": map[string]interface{}{
			"name": name,
			"price_money": map[string]interface{}{
				"amount":   priceAUD * 100,
				"currency": "AUD",
			},
			"location_id": locationID,
		},
		"checkout_options": map[string]interface{}{
			"allow_tipping":            false,
			"redirect_url":             "https://jmpa.io/art",
			"ask_for_shipping_address": true,
		},
		"description": description,
	}
	b, _ := json.Marshal(payload)
	resp, err := c.do(ctx, http.MethodPost, "/v2/online-checkout/payment-links", newJSONReader(b))
	if err != nil {
		return "", fmt.Errorf("create payment link: %w", err)
	}
	defer resp.Body.Close()

	var r createPaymentLinkResponse
	if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
		return "", fmt.Errorf("decode payment link: %w", err)
	}
	if len(r.Errors) > 0 {
		return "", fmt.Errorf("square error: %s: %s", r.Errors[0].Code, r.Errors[0].Detail)
	}
	if r.PaymentLink == nil {
		return "", fmt.Errorf("no payment link returned")
	}
	return r.PaymentLink.URL, nil
}

type listLocationsResponse struct {
	Locations []struct {
		ID     string `json:"id"`
		Name   string `json:"name"`
		Status string `json:"status"`
	} `json:"locations"`
	Errors []struct {
		Code   string `json:"code"`
		Detail string `json:"detail"`
	} `json:"errors"`
}

// FirstActiveLocationID returns the ID of the first active Square location.
func (c *Client) FirstActiveLocationID(ctx context.Context) (string, error) {
	resp, err := c.do(ctx, http.MethodGet, "/v2/locations", nil)
	if err != nil {
		return "", fmt.Errorf("list locations: %w", err)
	}
	defer resp.Body.Close()

	var r listLocationsResponse
	if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
		return "", fmt.Errorf("decode locations: %w", err)
	}
	if len(r.Errors) > 0 {
		return "", fmt.Errorf("square error: %s: %s", r.Errors[0].Code, r.Errors[0].Detail)
	}
	for _, loc := range r.Locations {
		if loc.Status == "ACTIVE" {
			return loc.ID, nil
		}
	}
	return "", fmt.Errorf("no active Square location found")
}
