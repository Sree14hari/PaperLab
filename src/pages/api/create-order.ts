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
    const { amount, currency, email } = body

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required to purchase Premium.' }), {
        status: 400,
      })
    }

    // Check if user exists in Firestore
    const db = getFirestore()
    const docRef = db.collection('users').doc(email.toLowerCase())
    const docSnap = await docRef.get()

    if (!docSnap.exists) {
      return new Response(
        JSON.stringify({ error: 'Account not found. Please log in to the Paper Lab app first.' }),
        { status: 404 }
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
            { status: 400 }
          )
        }
      } else {
        // Legacy premium users (lifetime)
        return new Response(
          JSON.stringify({ error: `You already have Lifetime Premium access!` }),
          { status: 400 }
        )
      }
    }

    if (!amount || amount < 1) {
      return new Response(JSON.stringify({ error: 'Invalid amount.' }), { status: 400 })
    }

    const appId = import.meta.env.CASHFREEAPPID || process.env.CASHFREEAPPID
    const secret = import.meta.env.CASHFREESECRET || process.env.CASHFREESECRET

    if (!appId || !secret) {
      return new Response(JSON.stringify({ error: `Cashfree keys missing` }), { status: 500 })
    }

    const isSandbox = appId.startsWith('TEST')
    const baseUrl = isSandbox ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg'
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    const response = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': appId,
        'x-client-secret': secret,
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: amount,
        order_currency: currency || 'INR',
        customer_details: {
          customer_id: email.replace(/[^a-zA-Z0-9]/g, '_'),
          customer_email: email,
          customer_phone: '9999999999',
        },
      }),
    })

    const order = await response.json()

    if (!response.ok) {
      console.error('Cashfree order creation error:', order)
      return new Response(JSON.stringify({ error: order.message || 'Failed to create order' }), {
        status: 500,
      })
    }

    return new Response(JSON.stringify(order), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Error creating order:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 })
  }
}
