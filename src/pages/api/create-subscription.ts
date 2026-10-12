import type { APIRoute } from 'astro'
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
    const { email, planId } = body

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required to purchase Premium.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check if user exists in Firestore
    const db = getFirestore()
    const docRef = db.collection('users').doc(email.toLowerCase())
    const docSnap = await docRef.get()

    if (!docSnap.exists) {
      return new Response(
        JSON.stringify({ error: 'Account not found. Please log in to the Paper Lab app first.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const userData = docSnap.data()
    if (userData && userData.isPremium) {
      if (userData.premiumValidUntil) {
        const expiry = new Date(userData.premiumValidUntil)
        if (expiry > new Date()) {
          const dateString = expiry.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
          return new Response(
            JSON.stringify({
              error: `You already have Premium access! It is valid until ${dateString}.`,
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        }
      } else {
        return new Response(
          JSON.stringify({ error: 'You already have Lifetime Premium access!' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    const keyId =
      import.meta.env.PUBLIC_RAZORPAY_KEY_ID ||
      process.env.PUBLIC_RAZORPAY_KEY_ID ||
      process.env.RAZORPAY_KEY_ID
    const keySecret = import.meta.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
      return new Response(JSON.stringify({ error: 'Razorpay configuration missing on server.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const targetPlanId =
      planId ||
      import.meta.env.RAZORPAY_PLAN_ID_INR ||
      process.env.RAZORPAY_PLAN_ID_INR ||
      'plan_TmbvTD9LHNr84K'

    const rzp = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })

    const subscription = await rzp.subscriptions.create({
      plan_id: targetPlanId,
      total_count: 120, // 10 years monthly cycles
      quantity: 1,
      customer_notify: 1,
      notes: {
        email: email.toLowerCase(),
      },
    })

    return new Response(
      JSON.stringify({
        subscription_id: subscription.id,
        key_id: keyId,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('Error creating subscription:', error)
    return new Response(
      JSON.stringify({
        error: error?.error?.description || error.message || 'Failed to create subscription',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
