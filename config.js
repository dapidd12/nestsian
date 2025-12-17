// config.js - FIXED VERSION
const SUPABASE_URL = 'https://sfmktymfexzemypmbmcu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbWt0eW1mZXh6ZW15cG1ibWN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5OTY4OTgsImV4cCI6MjA4MTU3Mjg5OH0.tqd8WfYBn4a4yI45ohrbg0T_EVPEQYmaBi7nzxmrnk4';

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
  siteName: 'NestSian - Official Store',
  ownerName: 'NestSian',
  contact: {
    whatsapp: 'https://wa.me/6285185025316',
    telegram: 'https://t.me/dapidd_ae02',
    instagram: 'https://instagram.com/dapid_ae02'
  },
  whatsappNumber: '6285185025316',
  features: {
    lazyLoad: true,
    animations: true,
    adminPanel: true,
    dynamicQR: true,
    darkMode: true
  },
  defaultTheme: 'dark'
};

// Export untuk global access
window.CONFIG = CONFIG;
window.supabaseClient = supabaseClient;
window.ADMIN_PASSWORD = ADMIN_PASSWORD;

console.log('✅ Config loaded successfully');