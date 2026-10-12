import type { APIRoute } from 'astro'
import crypto from 'crypto'
import Razorpay from 'razorpay'
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
    const body = await request.json()
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, email } = body

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return new Response(
        JSON.stringify({ error: 'Missing payment or subscription verification parameters.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const keySecret = import.meta.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET

    if (!keySecret) {
      return new Response(JSON.stringify({ error: 'Razorpay secret key not found.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Verify HMAC SHA256 signature: razorpay_payment_id + '|' + razorpay_subscription_id
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      console.error('Signature mismatch:', {
        expected: expectedSignature,
        received: razorpay_signature,
      })
      return new Response(
        JSON.stringify({ error: 'Invalid payment signature. Verification failed.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let userEmail = email
    // If email is not passed directly, fetch subscription from Razorpay to get notes.email
    if (!userEmail) {
      try {
        const keyId =
          import.meta.env.PUBLIC_RAZORPAY_KEY_ID ||
          process.env.PUBLIC_RAZORPAY_KEY_ID ||
          process.env.RAZORPAY_KEY_ID
        const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret })
        const subData = await rzp.subscriptions.fetch(razorpay_subscription_id)
        userEmail = subData.notes?.email
      } catch (err) {
        console.error('Error fetching subscription data from Razorpay:', err)
      }
    }

    if (!userEmail) {
      return new Response(JSON.stringify({ error: 'No user email linked to this subscription.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Update user document in Firestore
    const db = getFirestore()
    const docRef = db.collection('users').doc(userEmail.toLowerCase())

    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + 30)

    await docRef.set(
      {
        isPremium: true,
        premiumValidUntil: expiryDate.toISOString(),
        subscriptionId: razorpay_subscription_id,
        subscriptionProvider: 'razorpay',
        subscriptionStatus: 'active',
        lastPaymentId: razorpay_payment_id,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    )

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription verified and activated successfully!',
        validUntil: expiryDate.toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error verifying subscription:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
