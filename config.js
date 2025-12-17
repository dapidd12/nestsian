// config.js - FIXED
const SUPABASE_URL = 'https://xziodkamchgvnvmqfgow.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6aW9ka2FtY2hndm52bXFmZ293Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MDQ4ODQsImV4cCI6MjA4MTM4MDg4NH0.xTIAisFXgPlSA8Aw1G-GHVJztj9czB5Q-OUlleN-YQQ';

// Initialize Supabase client
let supabaseClient;
try {
  const { createClient } = window.supabase;
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('✅ Supabase client initialized');
} catch (error) {
  console.error('❌ Error initializing Supabase:', error);
  // Create a mock client for fallback
  supabaseClient = {
    from: () => ({
      select: () => Promise.resolve({ data: null, error: new Error('Supabase not initialized') }),
      insert: () => Promise.resolve({ error: new Error('Supabase not initialized') }),
      update: () => Promise.resolve({ error: new Error('Supabase not initialized') }),
      delete: () => Promise.resolve({ error: new Error('Supabase not initialized') })
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
    tiktok: 'https://tiktok.com/@dapid_ae02',
    instagram: 'https://instagram.com/dapid_ae02'
  },
  whatsappNumber: '6285185025316',
  audio: {
    url: 'https://files.catbox.moe/lzij2p.mp4',
    enabled: true
  },
  qris: {
    baseUrl: 'https://api.qrserver.com/v1/create-qr-code/',
    size: '300x300'
  },
  features: {
    lazyLoad: true,
    animations: true,
    adminPanel: true,
    dynamicQR: true,
    darkMode: true
  },
  defaultTheme: 'dark' // 'light' or 'dark'
};

// Export untuk global access
window.CONFIG = CONFIG;
window.supabaseClient = supabaseClient;
window.ADMIN_PASSWORD = ADMIN_PASSWORD;

console.log('✅ Config loaded successfully');