// config.js
// Supabase Configuration
const SUPABASE_URL = 'https://xziodkamchgvnvmqfgow.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6aW9ka2FtY2hndm52bXFmZ293Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MDQ4ODQsImV4cCI6MjA4MTM4MDg4NH0.xTIAisFXgPlSA8Aw1G-GHVJztj9czB5Q-OUlleN-YQQ';

// Pastikan Supabase client diinisialisasi dengan benar
let supabase;
try {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (error) {
  console.error('Error initializing Supabase:', error);
  // Fallback client
  supabase = {
    from: () => ({ 
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ error: null }),
      update: () => Promise.resolve({ error: null }),
      delete: () => Promise.resolve({ error: null })
    })
  };
}

// Admin Configuration
const ADMIN_PASSWORD = 'admin123'; // Ganti dengan password yang aman

// App Configuration
const CONFIG = {
  siteName: 'SYAIF OFFICIAL - JMB STORE',
  ownerName: 'SYAIF',
  contact: {
    telegram: 'https://t.me/dapidd_ae02',
    whatsapp: 'https://wa.me/6285185025316',
    tiktok: 'https://tiktok.com/@dapid_ae02'
  },
  whatsappNumber: '6285185025316',
  audio: {
    url: 'https://files.catbox.moe/lzij2p.mp4',
    enabled: true
  },
  qris: {
    baseUrl: 'https://api.qrserver.com/v1/create-qr-code/',
    size: '300x300',
    // API Midtrans untuk QRIS dinamis (example)
    midtransApi: 'YOUR_MIDTRANS_API_KEY',
    midtransUrl: 'https://api.sandbox.midtrans.com/v2/charge'
  },
  features: {
    lazyLoad: true,
    animations: true,
    adminPanel: true,
    dynamicQR: true
  }
};

// Export untuk global access
window.CONFIG = CONFIG;
window.supabaseClient = supabase;
window.ADMIN_PASSWORD = ADMIN_PASSWORD;