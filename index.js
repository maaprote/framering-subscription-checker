require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Framer Subscription Checker API is running' });
});

// Subscription validation endpoint
app.post('/validate-subscription', async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ 
        valid: false, 
        message: 'Subscription ID is required' 
      });
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    if (subscription.status === 'active') {
      return res.json({ 
        valid: true, 
        message: 'Subscription is active',
        subscription: {
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
        }
      });
    }

    return res.json({ 
      valid: false, 
      message: 'Subscription is not active',
      subscription: {
        status: subscription.status
      }
    });

  } catch (error) {
    console.error('Error validating subscription:', error);
    return res.status(500).json({ 
      valid: false, 
      message: 'Error validating subscription',
      error: error.message 
    });
  }
});

// Webhook endpoint for Stripe events
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      // Handle subscription updates
      const subscription = event.data.object;
      console.log(`Subscription ${subscription.id} was ${event.type}`);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 