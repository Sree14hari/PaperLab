import type { APIRoute } from 'astro'
import crypto from 'crypto'
import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as dotenv from 'dotenv'

dotenv.config()

export const prerender = false

// Initialize Firebase Admin if not already initialized
try {
  const apps = getApps()
  if (!apps || apps.length === 0) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const projectId = process.env.FIREBASE_PROJECT_ID || 'reportmaker-c9483'

    if (privateKey && clientEmail) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      })
    } else {
      initializeApp({ projectId })
    }
  }
} catch (e) {
  console.error('Firebase admin init error:', e)
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-webhook-signature')
    const timestamp = request.headers.get('x-webhook-timestamp')

    if (!signature || !timestamp) {
      return new Response(JSON.stringify({ error: 'Missing webhook headers' }), { status: 400 })
    }

    const secret = import.meta.env.CASHFREESECRET || process.env.CASHFREESECRET

    // Verify Cashfree Webhook Signature
    const expectedSignature = crypto
      .createHmac('sha256', secret as string)
      .update(timestamp + rawBody)
      .digest('base64')

    if (expectedSignature !== signature) {
      console.error('Invalid Cashfree Webhook Signature')
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 })
    }

    const event = JSON.parse(rawBody)

    // Only process successful payments
    if (event.type === 'PAYMENT_SUCCESS_WEBHOOK') {
      const email = event.data?.customer_details?.customer_email

      if (!email) {
        return new Response(JSON.stringify({ error: 'No email found in webhook payload' }), {
          status: 400,
        })
      }

      // Update Firebase user document directly
      try {
        const db = getFirestore()
        const docRef = db.collection('users').doc(email.toLowerCase())

        // Calculate the date 30 days from now
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + 30)

        await docRef.set(
          {
            isPremium: true,
            premiumValidUntil: expiryDate.toISOString(),
          },
          { merge: true }
        )

        console.log(`Webhook successfully updated premium status for ${email}`)
      } catch (err) {
        console.error('Firebase update failed via webhook:', err)
        return new Response(JSON.stringify({ error: 'Failed to update database' }), { status: 500 })
      }
    }

    // Always return a 200 OK so Cashfree knows we received it
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error processing Cashfree webhook:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 })
  }
}
