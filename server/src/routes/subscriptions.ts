import { Express, Request, Response } from "express";
import { makePointifyRequest } from "../config.js";

export function registerSubscriptionRoutes(app: Express) {
  // Create/renew subscription
  app.post("/api/subscriptions/:id", async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const {
        shops,
        email,
        phonenumber,
        package: packageId,
        paymentType,
        shop,
        amount
      } = req.body;

      // Validate required fields
      if (!userId || !shops || !email || !packageId || !paymentType || !amount) {
        return res.status(400).json({
          error: "Missing required fields: userId (in URL), shops, email, package, paymentType, amount"
        });
      }

      // Prepare payload for Pointify API
      const subscriptionPayload = {
        userId,
        shops,
        email,
        phonenumber,
        package: packageId,
        paymentType,
        shop,
        amount
      };

      console.log('Creating subscription with payload:', subscriptionPayload);

      // Make request to Pointify API
      const subscriptionData = await makePointifyRequest('/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionPayload)
      });
      console.log('Subscription created successfully:', subscriptionData);

      res.status(200).json(subscriptionData);
    } catch (error) {
      console.error('Subscription creation error:', error);
      res.status(500).json({
        error: 'Failed to create subscription',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get user subscriptions
  app.get("/api/subscriptions/user/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const subscriptions = await makePointifyRequest(`/subscriptions/user/${userId}`, {
        method: 'GET'
      });

      res.status(200).json(subscriptions);
    } catch (error) {
      console.error('Error fetching user subscriptions:', error);
      res.status(500).json({
        error: 'Failed to fetch subscriptions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get subscription by ID
  app.get("/api/subscriptions/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const subscription = await makePointifyRequest(`/subscriptions/${id}`, {
        method: 'GET'
      });

      res.status(200).json(subscription);
    } catch (error) {
      console.error('Error fetching subscription:', error);
      res.status(500).json({
        error: 'Failed to fetch subscription',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Confirm payment
  app.post("/api/payment/confirm", async (req: Request, res: Response) => {
    try {
      const { subscriptionid, shopid, shops } = req.body;

      if (!subscriptionid || !shopid || !shops) {
        return res.status(400).json({
          error: 'Missing required fields: subscriptionid, shopid, shops'
        });
      }

      const confirmPayload = {
        subscriptionid,
        shopid,
        shops
      };

      console.log('Confirming payment with payload:', confirmPayload);

      const confirmationResult = await makePointifyRequest('/payment/subscribe/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(confirmPayload)
      });

      console.log('Payment confirmation result:', confirmationResult);
      res.status(200).json(confirmationResult);
    } catch (error) {
      console.error('Error confirming payment:', error);
      res.status(500).json({
        error: 'Failed to confirm payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Resend M-Pesa push notification
  app.post("/api/payment/resend", async (req: Request, res: Response) => {
    try {
      const { subscriptionid, phonenumber, amount } = req.body;

      console.log('Resend request received:', { subscriptionid, phonenumber, amount });

      if (!subscriptionid || !phonenumber || typeof amount === 'undefined') {
        return res.status(400).json({
          error: 'Missing required fields: subscriptionid, phonenumber, amount'
        });
      }

      console.log('Creating new subscription request to trigger fresh M-Pesa push');
      
      // Get the original subscription to recreate the request
      const originalSubscription = await makePointifyRequest(`/subscriptions/${subscriptionid}`, {
        method: 'GET'
      });
      
      console.log('Original subscription data:', originalSubscription);
      
      // Validate that we have the required data
      if (!originalSubscription.userId || !originalSubscription.packageId) {
        throw new Error('Missing required subscription data from original subscription');
      }
      
      const recreatePayload = {
        userId: originalSubscription.userId,
        shops: originalSubscription.shops || [],
        email: originalSubscription.email || '',
        phonenumber: phonenumber,
        package: originalSubscription.packageId,
        paymentType: 'mpesa',
        shop: originalSubscription.shop,
        amount: amount
      };
      
      console.log('Recreating subscription with payload:', recreatePayload);
      
      const resendResult = await makePointifyRequest('/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recreatePayload)
      });
      
      console.log('New subscription creation result:', resendResult);
      
      // If successful, update the response to indicate a new subscription was created
      if (resendResult.subscriptionid && resendResult.message === 'waiting') {
        const finalResult = {
          status: true,
          message: 'New payment request sent to your phone',
          newSubscriptionId: resendResult.subscriptionid
        };
        console.log('M-Pesa resend result:', finalResult);
        res.status(200).json(finalResult);
      } else {
        console.log('M-Pesa resend result:', resendResult);
        res.status(200).json(resendResult);
      }
    } catch (error) {
      console.error('Error resending M-Pesa push notification:', error);
      res.status(500).json({
        error: 'Failed to resend push notification',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}