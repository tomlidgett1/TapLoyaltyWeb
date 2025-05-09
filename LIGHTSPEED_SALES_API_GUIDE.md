# Lightspeed Sales API Guide

This guide explains how to use the enhanced Lightspeed sales API endpoint to fetch more transactions with date filtering.

## API Endpoint

```
/api/lightspeed/sales
```

## Lightspeed V3 API Compatibility

This endpoint is compatible with Lightspeed's V3 API, which offers several improvements:

1. **Cursor-based Pagination**: Uses the recommended "next" URL approach for more efficient data retrieval
2. **JSON Encoded Parameters**: Properly formats parameters like `load_relations` as JSON arrays
3. **Improved Sorting**: Uses the V3 compatible sort parameters

The API automatically handles all the necessary V3 format requirements behind the scenes.

## Parameters

| Parameter | Description | Required | Default | Example |
|-----------|-------------|----------|---------|---------|
| merchantId | Your merchant ID | Yes | - | `XYZ123` |
| accountId | Your Lightspeed account ID (must be numeric) | Yes | - | `12345` |
| pages | Maximum number of pages to fetch (max 5) | No | 1 | `3` |
| startDate | Start date in YYYY-MM-DD format | No | - | `2023-01-01` |
| endDate | End date in YYYY-MM-DD format | No | - | `2023-12-31` |

## Pagination

The API uses Lightspeed V3's recommended cursor-based pagination method. This resolves the previous issue with the deprecated `offset` parameter. The API will:

1. Fetch the first page of sales data
2. Extract the "next" URL from the response
3. Use that URL for subsequent page requests
4. Continue until either:
   - The requested number of pages is reached
   - There are no more pages available (no "next" URL)
   - A page returns fewer items than the page size

## Examples

### 1. Fetch up to 3 pages of recent sales

```bash
curl "http://localhost:3000/api/lightspeed/sales?merchantId=YOUR_MERCHANT_ID&accountId=YOUR_ACCOUNT_ID&pages=3"
```

### 2. Fetch sales from 2022

```bash
curl "http://localhost:3000/api/lightspeed/sales?merchantId=YOUR_MERCHANT_ID&accountId=YOUR_ACCOUNT_ID&startDate=2022-01-01&endDate=2022-12-31"
```

### 3. Fetch all sales since the beginning of 2023 (up to 3 pages)

```bash
curl "http://localhost:3000/api/lightspeed/sales?merchantId=YOUR_MERCHANT_ID&accountId=YOUR_ACCOUNT_ID&pages=3&startDate=2023-01-01"
```

### 4. Fetch sales from the last 6 months (up to 5 pages)

```bash
curl "http://localhost:3000/api/lightspeed/sales?merchantId=YOUR_MERCHANT_ID&accountId=YOUR_ACCOUNT_ID&pages=5&startDate=2023-11-01"
```

## Response Format

The API returns a JSON response with the following structure:

```json
{
  "success": true,
  "sales": [...], // Array of processed sales
  "pagination": {
    "pagesFetched": 3, // Number of pages actually fetched
    "maxPages": 5, // Maximum number of pages requested
    "pageSize": 200, // Number of items per page
    "totalSales": 87, // Total number of sales (transactions) retrieved
    "totalRecords": 435, // Total number of sale line items processed
    "dateRange": "..." // Date range if specified, otherwise "all time"
  }
}
```

## Notes

- Each page fetches up to 200 sales line items, which typically group into about 30-40 distinct sales (transactions)
- With the maximum 5 pages, you can potentially fetch up to 1000 sales line items, which could be approximately 150-200 transactions
- Date filtering can significantly improve performance by limiting the amount of data fetched
- Sales are automatically saved to Firestore
- The pagination has been updated to use Lightspeed's recommended cursor-based method, improving reliability
- The API is compatible with Lightspeed V3, handling all formatting requirements automatically 