// Supabase Configuration
const SUPABASE_URL = 'https://xziodkamchgvnvmqfgow.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6aW9ka2FtY2hndm52bXFmZ293Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MDQ4ODQsImV4cCI6MjA4MTM4MDg4NH0.xTIAisFXgPlSA8Aw1G-GHVJztj9czB5Q-OUlleN-YQQ';

// Initialize Supabase Client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  audio: {
    url: 'https://files.catbox.moe/lzij2p.mp4',
    enabled: true
  },
  features: {
    lazyLoad: true,
    animations: true,
    adminPanel: true
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { supabase, ADMIN_PASSWORD, CONFIG };
}