# BrandCreator — WhatsApp Live Setup Runbook

এই runbook-টি BrandCreator-এর WhatsApp CRM ও Transactional Notification Layer-কে **Meta WhatsApp Cloud API** এবং ওয়েবহুকের সাথে লাইভ কানেক্ট করার প্রতিটি ধাপ বিস্তারিত ব্যাখ্যা করে।

---

## Prerequisites (যা যা প্রয়োজন)
1. একটি **Meta Developer Account** ([developers.facebook.com](https://developers.facebook.com/))।
2. একটি **Meta Business Account** (টোকেন ও পার্মানেন্ট আইডি ম্যানেজমেন্টের জন্য)।
3. একটি টেস্ট বা রিয়েল ফোন নাম্বার (যাতে WhatsApp সচল রয়েছে)।
4. লোকাল হোস্টকে ইন্টারনেটে এক্সপোজ করার জন্য একটি টানেলিং সার্ভিস (যেমন **ngrok** অথবা **Cloudflare Tunnel**)।

---

## Step 1: Meta App তৈরি ও WhatsApp প্রোডাক্ট সেটআপ

1. [Meta for Developers Dashboard](https://developers.facebook.com/apps/)-এ যান এবং **Create App** বাটনে ক্লিক করুন।
2. **App Type** হিসেবে **Other** সিলেক্ট করে **Next** করুন।
3. **App Category** হিসেবে **Business** সিলেক্ট করুন।
4. একটি সুন্দর App Name দিন (যেমন: `BrandCreator Engine`) এবং আপনার Meta Business Account-এর সাথে লিংক করে **Create App**-এ ক্লিক করুন।
5. আপনার অ্যাপের ড্যাশবোর্ডে আসার পর স্ক্রল ডাউন করে **WhatsApp** প্রোডাক্টটি খুঁজে বের করুন এবং **Set up** বাটনে ক্লিক করুন।

---

## Step 2: টেস্ট ফোন নাম্বার ও ক্রেডেন্সিয়াল সংগ্রহ

1. বাঁদিকের মেনু থেকে **WhatsApp** -> **API Setup**-এ যান।
2. এখানে Meta আপনাকে একটি **Temporary access token** এবং একটি **Phone number ID** ও **WhatsApp Business Account ID** প্রদান করবে:
   - **Phone Number ID:** এটি লোকাল ডিরেক্টরি থেকে রিকোয়েস্ট পাঠানোর সময় `WHATSAPP_PHONE_NUMBER_ID` হিসেবে ব্যবহৃত হবে।
   - **Access Token:** এটি সাময়িকভাবে টেস্টিংয়ের জন্য ব্যবহার করুন। 
   > [!IMPORTANT]
   > প্রোডাকশন ও পার্মানেন্ট ব্যবহারের জন্য আপনার Meta Business Settings থেকে **System User** তৈরি করে তার অধীনে একটি **System User Access Token** জেনারেট করে নিতে হবে, যা কখনো এক্সপায়ার হবে না।
3. নিচে **To** বক্সে আপনার নিজের পার্সোনাল হোয়াটসঅ্যাপ নাম্বারটি এড করুন এবং প্রথম টেস্ট মেসেজটি পাঠিয়ে ভেরিফাই করুন।

---

## Step 3: লোকাল টানেলিং সেটআপ (Tunneling with ngrok or Cloudflare)

যেহেতু Meta লোকাল হোস্ট অ্যাড্রেস (`localhost`) সাপোর্ট করে না, সেহেতু আমাদের একটি পাবলিক HTTPS ইউআরএল তৈরি করতে হবে।

### Option A: Using ngrok
1. ngrok ইনস্টল করুন এবং টার্মিনাল বা পাওয়ারশেলে রান করুন:
   ```bash
   ngrok http 5000
   ```
2. ngrok আপনাকে একটি পাবলিক ইউআরএল দেবে (যেমন: `https://abcd-123-456.ngrok-free.app`)।
3. আপনার ওয়েবহুক ইউআরএল হবে:  
   `https://abcd-123-456.ngrok-free.app/api/webhooks/whatsapp`

### Option B: Using Cloudflare Tunnel (cloudflared)
1. `cloudflared` ইনস্টল করে রান করুন:
   ```bash
   cloudflared tunnel --url http://localhost:5000
   ```
2. Cloudflare আপনাকে একটি ফ্রি র্যান্ডম সাবডোমেন ইউআরএল দেবে (যেমন: `https://your-random-subdomain.trycloudflare.com`)।
3. আপনার ওয়েবহুক ইউআরএল হবে:  
   `https://your-random-subdomain.trycloudflare.com/api/webhooks/whatsapp`

---

## Step 4: লোকাল `.env` ফাইল কনফিগারেশন

আপনার `bc_engine/.env` ফাইলে নিচের কি-গুলো যুক্ত করুন:

```env
# Enable live WhatsApp sending
WHATSAPP_ENABLED=true

# Meta credentials collected from Step 2
WHATSAPP_ACCESS_TOKEN=your_meta_system_user_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# Customize webhook verification token (must match Step 5)
WHATSAPP_VERIFY_TOKEN=brandcreator_verify_token

# (Optional) Verify Meta payload signature cryptographically
WHATSAPP_APP_SECRET=your_meta_app_secret

# Default API Version
WHATSAPP_API_VERSION=v20.0
```

ফাইলটি সেভ করুন এবং আপনার ব্যাকএন্ড ইঞ্জিন রিস্টার্ট করুন (`npm run dev` বা `node server.js`)।

---

## Step 5: Meta ড্যাশবোর্ডে ওয়েবহুক কনফিগারেশন

1. Meta Developer Console-এর বাঁদিকের মেনু থেকে **WhatsApp** -> **Configuration**-এ যান।
2. **Webhook** সেকশনে **Edit** বাটনে ক্লিক করুন।
3. **Callback URL** বক্সে আপনার পাবলিক টানেল ওয়েবহুক ইউআরএলটি পেস্ট করুন:  
   `https://<your-tunnel-domain>/api/webhooks/whatsapp`
4. **Verify Token** বক্সে আপনার `.env` ফাইলে সেট করা টোকেনটি লিখুন:  
   `brandcreator_verify_token`
5. **Verify and Save** বাটনে ক্লিক করুন। আপনার ব্যাকএন্ডে সাকসেস চ্যালেঞ্জ লগ দেখা যাবে এবং মেটা ইউআরএলটি সেভ করবে।
6. সফলভাবে সেভ হওয়ার পর **Webhook fields**-এর পাশে **Manage** বাটনে ক্লিক করুন।
7. নিচের ফিল্ডগুলোতে **Subscribe** করুন:
   - `messages` (ইনকামিং মেসেজ রিসিভ করার জন্য)
   - `messages` বা `message_deliveries` (মেসেজ ডেলিভারি, রিড ও ফেইল্ড স্ট্যাটাস ট্র্যাকিংয়ের জন্য)
8. **Done** বাটনে ক্লিক করুন।

---

## Step 6: রিয়েল-টাইম টেস্টিং গাইড

### Test 1: অর্ডার প্লেসমেন্ট টেস্টিং (Checkout)
1. BrandCreator Shop-এ যান।
2. প্রোডাক্ট কার্টে অ্যাড করুন এবং Checkout ড্রয়ারে আপনার হোয়াটসঅ্যাপ ভেরিফাইড ফোন নাম্বারটি টাইপ করুন (যেমন: `+88017XXXXXXXX` বা BD লোকাল ফরম্যাট `017XXXXXXXX`)।
3. **Reserve & Checkout** ক্লিক করুন।
4. **লোকাল ব্যাকএন্ড কনসোল লগ চেক করুন:**  
   `[whatsapp.send_attempt]` ও Meta API রিকোয়েস্ট দেখতে পাবেন।
5. আপনার রিয়েল হোয়াটসঅ্যাপে `order_confirmation` টেমপ্লেটের মেসেজটি তাৎক্ষণিকভাবে চলে আসবে।

### Test 2: পেমেন্ট কনফার্মেশন নোটিফিকেশন
1. কাস্টমার প্যানেল থেকে **Track Reservations**-এ যান।
2. অ্যাডমিন হিসেবে **Confirm (Dev)** বাটনে ক্লিক করুন (যা সরাসরি `confirmOrder` পেমেন্ট ফ্লো এক্সিকিউট করবে)।
3. হোয়াটসঅ্যাপে আপনার রিয়েল নাম্বারে `payment_verified` মেসেজটি রিসিভ হবে।

### Test 3: কাস্টমার রিপ্লাই ও ওয়েবহুক ট্র্যাকিং
1. আপনার ফোন থেকে হোয়াটসঅ্যাপে আসা ড্যাশবোর্ড মেসেজটিতে একটি রিপ্লাই পাঠান (যেমন: "Thanks, I received the order info").
2. অ্যাডমিন ড্যাশবোর্ডে যান এবং **WhatsApp CRM** ট্যাবটি সিলেক্ট করুন।
3. বাঁদিকের কাস্টমার লিস্টে আপনার ফোন নাম্বারটি দেখা যাবে। 
4. নাম্বারটি সিলেক্ট করলে মাঝখানের মেসেঞ্জার উইন্ডোতে আপনার পাঠানো রিপ্লাই মেসেজটি রিয়েল-টাইমে শো করবে।
5. ডানদিকের **Webhook Events Logs** প্যানেলে মেটার রিয়েল-টাইম `messages` পেলোড ট্র্যাকিং ও ডেটা স্ট্রিমিং দেখা যাবে।
