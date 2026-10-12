import type { APIRoute } from 'astro'
import crypto from 'crypto'
import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as dotenv from 'dotenv'

dotenv.config()

export const prerender = false

try {
  const apps = getApps()
  if (!apps || apps.length === 0) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const projectId = process.env.FIREBASE_PROJECT_ID || 'reportmaker-c9483'

    if (privateKey && clientEmail) {
      initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
    } else {
      initializeApp({ projectId })
    }
  }
} catch (e) {
  console.error('Firebase admin init error:', e)
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const bodyText = await request.text()
    const signature = request.headers.get('x-razorpay-signature')
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET

    // If webhook secret is set, verify signature
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(bodyText)
        .digest('hex')

      if (expectedSignature !== signature) {
        return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
          status: 400,
        })
      }
    }

    const event = JSON.parse(bodyText)
    const { event: eventType, payload } = event

    const db = getFirestore()

    if (eventType === 'subscription.charged') {
      const subscription = payload?.subscription?.entity
      const payment = payload?.payment?.entity
      const email = subscription?.notes?.email || payment?.email

      if (email) {
        const docRef = db.collection('users').doc(email.toLowerCase())
        const docSnap = await docRef.get()
        let expiryDate = new Date()

        if (docSnap.exists) {
          const currentValidUntil = docSnap.data()?.premiumValidUntil
          if (currentValidUntil && new Date(currentValidUntil) > new Date()) {
            expiryDate = new Date(currentValidUntil)
          }
        }
        expiryDate.setDate(expiryDate.getDate() + 30)

        await docRef.set(
          {
            isPremium: true,
            premiumValidUntil: expiryDate.toISOString(),
            subscriptionId: subscription?.id,
            subscriptionProvider: 'razorpay',
            subscriptionStatus: 'active',
            lastPaymentId: payment?.id,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        )
      }
    } else if (eventType === 'subscription.cancelled' || eventType === 'subscription.halted') {
      const subscription = payload?.subscription?.entity
      const email = subscription?.notes?.email

      if (email) {
        const docRef = db.collection('users').doc(email.toLowerCase())
        await docRef.set(
          {
            subscriptionStatus: subscription?.status || 'cancelled',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        )
      }
    }

    return new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
  } catch (err: any) {
    console.error('Razorpay webhook error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
