import type { APIRoute } from 'astro'
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
      // Production: Initialize using environment variables
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      })
    } else {
      // Local dev: Fall back to GOOGLE_APPLICATION_CREDENTIALS (service-account.json)
      initializeApp({
        projectId,
      })
    }
  }
} catch (e) {
  console.error('Firebase admin init error:', e)
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json()
    const { order_id } = body

    if (!order_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
    }

    const appId = import.meta.env.CASHFREEAPPID || process.env.CASHFREEAPPID
    const secret = import.meta.env.CASHFREESECRET || process.env.CASHFREESECRET

    const isSandbox = appId.startsWith('TEST')
    const baseUrl = isSandbox ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg'

    const response = await fetch(`${baseUrl}/orders/${order_id}`, {
      method: 'GET',
      headers: {
        'x-api-version': '2023-08-01',
        'x-client-id': appId as string,
        'x-client-secret': secret as string,
      },
    })

    const payment = await response.json()

    if (payment.order_status === 'PAID') {
      const email = payment.customer_details?.customer_email

      if (!email) {
        return new Response(JSON.stringify({ error: 'No email associated with payment' }), {
          status: 400,
        })
      }

      // 2. Update Firebase user document directly
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
      } catch (err) {
        console.error('Firebase update failed:', err)
        return new Response(
          JSON.stringify({ error: 'Payment verified but failed to update status' }),
          { status: 500 }
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Payment verified successfully' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    } else {
      return new Response(JSON.stringify({ error: 'Payment not successful' }), { status: 400 })
    }
  } catch (error) {
    console.error('Error verifying payment:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 })
  }
}
