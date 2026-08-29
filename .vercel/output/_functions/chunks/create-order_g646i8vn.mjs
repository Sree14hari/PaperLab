import Razorpay from 'razorpay';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config();
const prerender = false;
try {
  const apps = getApps();
  if (!apps || apps.length === 0) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const projectId = process.env.FIREBASE_PROJECT_ID || "reportmaker-c9483";
    if (privateKey && clientEmail) {
      initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    } else {
      initializeApp({ projectId });
    }
  }
} catch (e) {
  console.error("Firebase admin init error:", e);
}
const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const { amount, currency, receipt, email } = body;
    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required to purchase Premium." }), { status: 400 });
    }
    const db = getFirestore();
    const docRef = db.collection("users").doc(email.toLowerCase());
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return new Response(JSON.stringify({ error: "Account not found. Please log in to the Paper Lab app first." }), { status: 404 });
    }
    const userData = docSnap.data();
    if (userData && userData.isPremium) {
      if (userData.premiumValidUntil) {
        const expiry = new Date(userData.premiumValidUntil);
        if (expiry > /* @__PURE__ */ new Date()) {
          const dateString = expiry.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
          return new Response(JSON.stringify({ error: `You already have Premium access! It is valid until ${dateString}.` }), { status: 400 });
        }
      } else {
        return new Response(JSON.stringify({ error: `You already have Lifetime Premium access!` }), { status: 400 });
      }
    }
    if (!amount || amount < 100) {
      return new Response(JSON.stringify({ error: "Invalid amount. Minimum 100 paise." }), { status: 400 });
    }
    const key_id = "rzp_live_TNIlLPJmt09CfO";
    const key_secret = "dHTDjSSGhs5qZuuZPkcpGI5K";
    if (!key_id || !key_secret) ;
    const instance = new Razorpay({ key_id, key_secret });
    const options = {
      amount,
      // amount in smallest currency unit (paise)
      currency: currency || "INR",
      receipt: receipt || "receipt#1"
    };
    const order = await instance.orders.create(options);
    return new Response(JSON.stringify(order), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
