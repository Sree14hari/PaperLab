import crypto from 'crypto';
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
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey
        })
      });
    } else {
      initializeApp({
        projectId
      });
    }
  }
} catch (e) {
  console.error("Firebase admin init error:", e);
}
const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }
    const secret = "dHTDjSSGhs5qZuuZPkcpGI5K";
    const hmacBody = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac("sha256", secret).update(hmacBody.toString()).digest("hex");
    const isAuthentic = expectedSignature === razorpay_signature;
    if (isAuthentic) {
      const key_id = "rzp_live_TNIlLPJmt09CfO";
      const instance = new Razorpay({
        key_id,
        key_secret: secret
      });
      const payment = await instance.payments.fetch(razorpay_payment_id);
      const email = payment.email;
      if (!email) {
        return new Response(JSON.stringify({ error: "No email associated with payment" }), { status: 400 });
      }
      try {
        const db = getFirestore();
        const docRef = db.collection("users").doc(email.toLowerCase());
        const expiryDate = /* @__PURE__ */ new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        await docRef.set({
          isPremium: true,
          premiumValidUntil: expiryDate.toISOString()
        }, { merge: true });
      } catch (err) {
        console.error("Firebase update failed:", err);
        return new Response(JSON.stringify({ error: "Payment verified but failed to update status" }), { status: 500 });
      }
      return new Response(JSON.stringify({ success: true, message: "Payment verified successfully" }), { status: 200, headers: { "Content-Type": "application/json" } });
    } else {
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
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
