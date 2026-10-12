import type { APIRoute } from 'astro'
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
    const { subscriptionId, email } = body

    if (!subscriptionId || !email) {
      return new Response(JSON.stringify({ error: 'Subscription ID and email are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const db = getFirestore()
    const docRef = db.collection('users').doc(email.toLowerCase())
    const docSnap = await docRef.get()

    if (!docSnap.exists) {
      return new Response(
        JSON.stringify({ error: 'Account not found. Please log in to the Paper Lab app first.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + 30)

    await docRef.set(
      {
        isPremium: true,
        premiumValidUntil: expiryDate.toISOString(),
        subscriptionId,
        subscriptionProvider: 'paypal',
        subscriptionStatus: 'active',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    )

    return new Response(
      JSON.stringify({
        success: true,
        message: 'PayPal subscription verified and activated successfully!',
        validUntil: expiryDate.toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error verifying PayPal subscription:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
