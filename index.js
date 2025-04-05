require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true, // Allow all origins
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Framer Subscription Checker API is running' });
});

// Success page endpoint
app.get('/success', async (req, res) => {
  console.log('Success page accessed via GET');
  console.log('Query params:', req.query);
  
  const { session_id } = req.query;
  
  if (!session_id) {
    console.log('No session_id provided');
    return res.status(400).send('Session ID is required');
  }
  
  try {
    console.log('Retrieving session:', session_id);
    const session = await stripe.checkout.sessions.retrieve(session_id);
    console.log('Session retrieved:', session.id);
    
    if (!session.subscription) {
      console.log('No subscription found in session');
      return res.status(400).send('No subscription found');
    }
    
    console.log('Retrieving subscription:', session.subscription);
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    console.log('Subscription retrieved:', subscription.id);
    
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Subscription Success</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              text-align: center;
            }
            .license-code {
              background: #f5f5f5;
              padding: 20px;
              border-radius: 5px;
              margin: 20px 0;
              font-family: monospace;
              font-size: 18px;
              word-break: break-all;
            }
            .copy-button {
              background: #0070f3;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              cursor: pointer;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <h1>Thank you for your subscription!</h1>
          <p>Your subscription license code is:</p>
          <div class="license-code" id="licenseCode">${subscription.id}</div>
          <button class="copy-button" onclick="copyToClipboard()">Copy License Code</button>
          <p>Please save this code. You'll need it to activate your Framer plugin.</p>
          <script>
            function copyToClipboard() {
              const licenseCode = document.getElementById('licenseCode').textContent;
              navigator.clipboard.writeText(licenseCode).then(() => {
                alert('License code copied to clipboard!');
              });
            }
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error in success page:', error);
    res.status(500).send(`Error retrieving subscription details: ${error.message}`);
  }
});

// Add POST handler for success page
app.post('/success', async (req, res) => {
  console.log('Success page accessed via POST');
  console.log('Body:', req.body);
  
  const { session_id } = req.body;
  
  if (!session_id) {
    console.log('No session_id provided');
    return res.status(400).send('Session ID is required');
  }
  
  try {
    console.log('Retrieving session:', session_id);
    const session = await stripe.checkout.sessions.retrieve(session_id);
    console.log('Session retrieved:', session.id);
    
    if (!session.subscription) {
      console.log('No subscription found in session');
      return res.status(400).send('No subscription found');
    }
    
    console.log('Retrieving subscription:', session.subscription);
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    console.log('Subscription retrieved:', subscription.id);
    
    res.json({
      success: true,
      licenseCode: subscription.id
    });
  } catch (error) {
    console.error('Error in success page:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
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