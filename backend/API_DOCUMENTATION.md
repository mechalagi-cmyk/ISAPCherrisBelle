# CherrisBelle REST API — Starter Documentation

**Base URL (local):** `http://localhost:3000`  
**Content-Type:** `application/json` for JSON request bodies  
**Authentication:** Protected endpoints require `Authorization: Bearer <token>`.

> This documentation describes the starter backend in this folder. It uses in-memory data for learning/testing, so records reset when the server restarts. It is not production-ready.

## Common response format

Success:
```json
{ "success": true, "data": {} }
```

Error:
```json
{ "success": false, "error": "Human-readable error message." }
```

## Endpoints

| Method | Endpoint | Auth | Purpose | Success |
|---|---|---:|---|---:|
| GET | `/api/health` | No | Check server status | 200 |
| GET | `/api/products` | No | List products; optional `?category=Cardigan` | 200 |
| GET | `/api/products/:id` | No | Product details | 200 |
| POST | `/api/auth/register` | No | Create an account | 201 |
| POST | `/api/auth/login` | No | Login and receive a JWT | 200 |
| GET | `/api/cart` | Yes | Get current user's cart | 200 |
| POST | `/api/cart/items` | Yes | Add a product/size/quantity | 201 |
| PATCH | `/api/cart/items/:productId` | Yes | Change quantity; size is in JSON body | 200 |
| DELETE | `/api/cart/items/:productId?size=M` | Yes | Remove a product/size from cart | 200 |
| POST | `/api/orders` | Yes | Create an order from non-empty cart | 201 |
| GET | `/api/orders` | Yes | List current user's orders | 200 |
| POST | `/api/pickups` | Yes | Schedule a pickup | 201 |
| GET | `/api/pickups` | Yes | List current user's pickups | 200 |

## 1. Products

### GET `/api/products`
Optional query parameter: `category` (string).

Example response:
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Pink Cardigan", "price": 250000, "category": "Cardigan", "sizes": ["S", "M", "L"], "stock": 10 }
  ]
}
```

### GET `/api/products/:id`
Path parameter: `id` (integer).
- `200`: product found
- `400`: ID is not an integer
- `404`: product does not exist

## 2. Accounts

### POST `/api/auth/register`
Request body:
```json
{
  "fullName": "Sample Customer",
  "username": "sample_user",
  "email": "sample@example.com",
  "password": "secret123",
  "confirmPassword": "secret123"
}
```
Rules: required fields; valid email; password at least 6 characters; confirmation must match when supplied; email and username must be unique.
- `201`: account created
- `400`: missing/invalid input
- `409`: email or username already exists

Passwords are hashed before being stored in the starter process memory.

### POST `/api/auth/login`
Request body:
```json
{ "email": "sample@example.com", "password": "secret123" }
```
- `200`: returns user summary and JWT token
- `400`: missing email/password
- `401`: credentials incorrect

## 3. Cart

All cart endpoints require a JWT.

### POST `/api/cart/items`
Request body:
```json
{ "productId": 1, "size": "M", "quantity": 2 }
```
`quantity` defaults to `1` if omitted. Product size must be available; quantity must be a positive integer and cannot exceed the stock limit.
- `201`: item added
- `400`: invalid size/quantity or stock limit exceeded
- `401`: missing/invalid token
- `404`: product not found

### PATCH `/api/cart/items/:productId`
Request body:
```json
{ "size": "M", "quantity": 3 }
```
- `200`: quantity updated
- `400`: invalid ID/quantity or stock limit exceeded
- `404`: matching cart item not found

### DELETE `/api/cart/items/:productId?size=M`
- `200`: item removed
- `400`: invalid product ID
- `404`: matching cart item not found

### GET `/api/cart`
Returns `items`, `subtotal`, and `itemCount`.

## 4. Orders

### POST `/api/orders`
Requires an authenticated user with a non-empty cart.
Request body:
```json
{
  "paymentMethod": "Bank Transfer",
  "paymentAccount": "Sample payment reference",
  "notes": "Please confirm payment"
}
```
- `201`: order created with status `PENDING_PAYMENT`; cart is cleared
- `400`: empty cart or missing payment fields
- `401`: missing/invalid token

This starter API records order information only; it does not process real payments.

### GET `/api/orders`
Returns orders belonging to the authenticated user only.

## 5. Pickup

### POST `/api/pickups`
Request body:
```json
{
  "orderId": 1,
  "name": "Sample Customer",
  "date": "2026-12-01",
  "time": "14:00",
  "notes": "Will bring order confirmation"
}
```
`orderId` is optional, but when provided it must belong to the current user. Allowed time values: `10:00`, `12:00`, `14:00`, `16:00`. Date cannot be in the past.
- `201`: pickup scheduled
- `400`: missing/invalid name, date, or time
- `404`: supplied order does not exist for this account
- `401`: missing/invalid token

### GET `/api/pickups`
Returns pickups belonging to the authenticated user only.

## Status codes used

- `200 OK`: request succeeded
- `201 Created`: resource created
- `400 Bad Request`: invalid input/business rule violation
- `401 Unauthorized`: authentication is missing or invalid
- `404 Not Found`: resource/endpoint not found
- `409 Conflict`: duplicate account details
- `500 Internal Server Error`: unexpected server error

## Setup

1. Copy `.env.example` to `.env`.
2. Set `JWT_SECRET` to a long random value.
3. Run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:3000/api/health`.

For testing, use Postman or curl. Register and log in first, then copy the returned JWT into the Bearer Token authorization setting for protected endpoints.
