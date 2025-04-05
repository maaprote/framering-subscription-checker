# Framer Subscription Checker

A Node.js and Express application for validating Framer plugin subscriptions using Stripe.

## Features

- Subscription validation endpoint
- Stripe webhook integration
- CORS enabled for Framer plugin integration
- Environment variable configuration

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   PORT=3000
   ```
4. Start the server:
   ```bash
   npm start
   ```

## API Endpoints

### Health Check
- `GET /`
  - Returns the status of the API

### Subscription Validation
- `POST /validate-subscription`
  - Request body: `{ "subscriptionId": "sub_xxx" }`
  - Returns subscription status and details

### Webhook
- `POST /webhook`
  - Handles Stripe webhook events
  - Requires Stripe signature verification

## Deployment

This application is designed to be deployed on Vercel's free tier. Make sure to set up the environment variables in your Vercel project settings.

## Usage in Framer Plugin

To validate a subscription in your Framer plugin, make a POST request to the `/validate-subscription` endpoint with the subscription ID:

```javascript
const response = await fetch('YOUR_API_URL/validate-subscription', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    subscriptionId: 'sub_xxx'
  })
});

const data = await response.json();
if (data.valid) {
  // Subscription is active
} else {
  // Subscription is not active
}
``` 