// Configuration for NestSian
const CONFIG = {
    // System Configuration
    SYSTEM_NAME: 'NestSian',
    SYSTEM_VERSION: '1.0.0',
    SYSTEM_DESCRIPTION: 'Keamanan dan Teknologi Modern',
    
    // Theme Configuration
    THEME: {
        PRIMARY_COLOR: '#0080ff',
        SECONDARY_COLOR: '#0ea5e9',
        ACCENT_COLOR: '#d946ef',
        DARK_BG: '#0f172a',
        LIGHT_BG: '#1e293b'
    },
    
    // API Configuration
    API: {
        BASE_URL: '/api',
        TIMEOUT: 30000,
        RETRY_ATTEMPTS: 3
    },
    
    // QRIS Configuration (Default)
    QRIS: {
        DEFAULT_MERCHANT_NAME: 'NestSian Store',
        DEFAULT_MERCHANT_ID: 'ID.NESTSIAN.WWW',
        DEFAULT_CITY: 'Jakarta',
        DEFAULT_POSTAL_CODE: '12345',
        TIMEOUT_MINUTES: 5,
        DEFAULT_AMOUNTS: [10000, 50000, 100000, 500000]
    },
    
    // Product Configuration
    PRODUCT: {
        DEFAULT_CATEGORIES: [
            { id: 1, name: 'Security', icon: 'fas fa-shield-alt' },
            { id: 2, name: 'Networking', icon: 'fas fa-network-wired' },
            { id: 3, name: 'Software', icon: 'fas fa-code' },
            { id: 4, name: 'Hardware', icon: 'fas fa-server' },
            { id: 5, name: 'Service', icon: 'fas fa-concierge-bell' }
        ],
        STOCK_LOW_THRESHOLD: 5,
        STOCK_CRITICAL_THRESHOLD: 2
    },
    
    // Order Configuration
    ORDER: {
        STATUSES: {
            PENDING: 'pending',
            PROCESSING: 'processing',
            COMPLETED: 'completed',
            CANCELLED: 'cancelled'
        },
        PAYMENT_METHODS: ['QRIS', 'Transfer Bank', 'E-Wallet', 'Cash'],
        SHIPPING_METHODS: ['Regular', 'Express', 'Same Day']
    },
    
    // Telegram Bot Configuration
    TELEGRAM: {
        BOT_TOKEN: '7810718543:AAH1GgEVfJ2Un4mqjZXDk1H1fLFKXPqorP8',
        ADMIN_CHAT_ID: '5448509135',
        ENABLED: false
    },
    
    // Maintenance Mode
    MAINTENANCE: {
        ENABLED: false,
        MESSAGE: 'Sistem sedang dalam pemeliharaan. Silakan kembali beberapa saat lagi.',
        ETA: null
    },
    
    // Security Configuration
    SECURITY: {
        SESSION_TIMEOUT: 3600, // 1 hour in seconds
        MAX_LOGIN_ATTEMPTS: 5,
        PASSWORD_MIN_LENGTH: 8,
        ENABLE_2FA: false
    }
};

// Utility Functions
class ConfigHelper {
    static get(key, defaultValue = null) {
        const keys = key.split('.');
        let value = CONFIG;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultValue;
            }
        }
        
        return value;
    }
    
    static set(key, value) {
        const keys = key.split('.');
        let config = CONFIG;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!(k in config) || typeof config[k] !== 'object') {
                config[k] = {};
            }
            config = config[k];
        }
        
        config[keys[keys.length - 1]] = value;
        
        // Save to localStorage for persistence
        this.saveToStorage();
    }
    
    static saveToStorage() {
        try {
            localStorage.setItem('nestsian_config', JSON.stringify(CONFIG));
        } catch (error) {
            console.error('Error saving config to storage:', error);
        }
    }
    
    static loadFromStorage() {
        try {
            const saved = localStorage.getItem('nestsian_config');
            if (saved) {
                Object.assign(CONFIG, JSON.parse(saved));
            }
        } catch (error) {
            console.error('Error loading config from storage:', error);
        }
    }
    
    static resetToDefaults() {
        // Reset specific config sections
        CONFIG.QRIS = {
            DEFAULT_MERCHANT_NAME: 'NestSian Store',
            DEFAULT_MERCHANT_ID: 'ID.NESTSIAN.WWW',
            DEFAULT_CITY: 'Jakarta',
            DEFAULT_POSTAL_CODE: '12345',
            TIMEOUT_MINUTES: 5,
            DEFAULT_AMOUNTS: [10000, 50000, 100000, 500000]
        };
        
        CONFIG.MAINTENANCE = {
            ENABLED: false,
            MESSAGE: 'Sistem sedang dalam pemeliharaan. Silakan kembali beberapa saat lagi.',
            ETA: null
        };
        
        this.saveToStorage();
    }
}

// Initialize config from storage
ConfigHelper.loadFromStorage();

// Export for use in other files
window.CONFIG = CONFIG;
window.ConfigHelper = ConfigHelper;