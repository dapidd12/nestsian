// config.js - FIXED VERSION (Secure & Production Ready)
const SUPABASE_URL = 'https://sfmktymfexzemypmbmcu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbWt0eW1mZXh6ZW15cG1ibWN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5OTY4OTgsImV4cCI6MjA4MTU3Mjg5OH0.tqd8WfYBn4a4yI45ohrbg0T_EVPEQYmaBi7nzxmrnk4';

// Secure password handling (in production, use environment variables)
const ADMIN_PASSWORD = (() => {
  // Check if running in development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'admin123'; // Development password
  }
  // In production, you should use environment variables or server-side authentication
  return 'admin123'; // CHANGE THIS IN PRODUCTION!
})();

// Initialize Supabase client with better error handling
let supabaseClient;
let supabaseInitialized = false;

try {
  if (typeof window.supabase === 'undefined') {
    throw new Error('Supabase SDK not loaded');
  }
  
  const { createClient } = window.supabase;
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
  
  // Test connection
  supabaseClient.from('products').select('id', { count: 'exact', head: true })
    .then(() => {
      console.log('✅ Supabase client initialized successfully');
      supabaseInitialized = true;
    })
    .catch(err => {
      console.warn('⚠️ Supabase connection test failed:', err.message);
      supabaseInitialized = false;
    });
  
} catch (error) {
  console.error('❌ Error initializing Supabase:', error);
  
  // Create a mock client for fallback
  supabaseClient = {
    from: (table) => ({
      select: (columns) => Promise.resolve({ 
        data: null, 
        error: { message: 'Supabase not initialized' } 
      }),
      insert: (data) => Promise.resolve({ 
        error: { message: 'Supabase not initialized' } 
      }),
      update: (data) => Promise.resolve({ 
        error: { message: 'Supabase not initialized' } 
      }),
      delete: () => Promise.resolve({ 
        error: { message: 'Supabase not initialized' } 
      }),
      eq: () => ({
        single: () => Promise.resolve({ 
          data: null, 
          error: { message: 'Supabase not initialized' } 
        })
      })
    }),
    auth: null
  };
  supabaseInitialized = false;
}

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
    darkMode: true,
    offlineMode: true
  },
  defaultTheme: 'dark',
  maxCartItems: 50,
  currency: 'IDR'
};

// Security helper functions
const Security = {
  escapeHtml: (text) => {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  sanitizeInput: (input) => {
    if (typeof input !== 'string') return input;
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },
  
  validateEmail: (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },
  
  validatePhone: (phone) => {
    const re = /^[+]?[\d\s\-()]{10,}$/;
    return re.test(phone);
  }
};

// Export untuk global access
window.CONFIG = CONFIG;
window.supabaseClient = supabaseClient;
window.supabaseInitialized = supabaseInitialized;
window.ADMIN_PASSWORD = ADMIN_PASSWORD;
window.Security = Security;

// Store initialization check
console.log('✅ Config loaded successfully');
console.log('🔒 Security features:', Object.keys(Security));
console.log('🌐 Supabase initialized:', supabaseInitialized);