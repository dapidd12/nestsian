// Configuration for NestSian
const CONFIG = {
    // System Configuration
    SYSTEM_NAME: 'NestSian',
    SYSTEM_VERSION: '1.0.0',
    SYSTEM_DESCRIPTION: 'Keamanan dan Teknologi Modern',
    
    // Database Schema
    DATABASE: {
        TABLES: {
            USERS: 'users',
            PRODUCTS: 'products',
            CATEGORIES: 'categories',
            ORDERS: 'orders',
            ORDER_ITEMS: 'order_items',
            CUSTOMERS: 'customers',
            SETTINGS: 'settings',
            CONTACT_MESSAGES: 'contact_messages',
            LOGS: 'system_logs'
        },
        SCHEMA: {
            users: `CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT,
                role TEXT DEFAULT 'staff',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )`,
            categories: `CREATE TABLE IF NOT EXISTS categories (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                icon TEXT DEFAULT 'fas fa-tag',
                description TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )`,
            products: `CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                price INTEGER NOT NULL,
                stock INTEGER DEFAULT 0,
                category_id INTEGER REFERENCES categories(id),
                image_url TEXT,
                weight INTEGER DEFAULT 0,
                featured BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )`,
            customers: `CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                address TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )`,
            orders: `CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                customer_name TEXT NOT NULL,
                customer_email TEXT,
                customer_phone TEXT,
                total_amount INTEGER NOT NULL,
                status TEXT DEFAULT 'pending',
                payment_method TEXT,
                shipping_address TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )`,
            order_items: `CREATE TABLE IF NOT EXISTS order_items (
                id SERIAL PRIMARY KEY,
                order_id TEXT REFERENCES orders(id),
                product_id INTEGER REFERENCES products(id),
                quantity INTEGER NOT NULL,
                price INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )`,
            settings: `CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP DEFAULT NOW()
            )`,
            contact_messages: `CREATE TABLE IF NOT EXISTS contact_messages (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                subject TEXT NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW()
            )`,
            system_logs: `CREATE TABLE IF NOT EXISTS system_logs (
                id SERIAL PRIMARY KEY,
                user_id UUID REFERENCES users(id),
                action TEXT NOT NULL,
                details JSONB,
                ip_address TEXT,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )`
        }
    },
    
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
    
    // QRIS Configuration
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
            { name: 'Security', icon: 'fas fa-shield-alt' },
            { name: 'Networking', icon: 'fas fa-network-wired' },
            { name: 'Software', icon: 'fas fa-code' },
            { name: 'Hardware', icon: 'fas fa-server' },
            { name: 'Service', icon: 'fas fa-concierge-bell' }
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
    
    // Security Configuration
    SECURITY: {
        SESSION_TIMEOUT: 3600,
        MAX_LOGIN_ATTEMPTS: 5,
        PASSWORD_MIN_LENGTH: 8,
        ENABLE_2FA: false
    }
};

// Database Initialization Helper
class DatabaseHelper {
    static async initializeDatabase() {
        try {
            console.log('Initializing database...');
            
            // Cek apakah supabaseService sudah ada
            if (!window.supabaseService) {
                console.warn('Supabase service not available');
                return;
            }
            
            const supabase = window.supabaseService.supabase;
            
            if (!supabase) {
                console.warn('Supabase client not available');
                return;
            }
            
            // Test connection first
            const { error: testError } = await supabase
                .from('products')
                .select('id')
                .limit(1);
            
            if (testError && testError.code !== 'PGRST116') {
                console.warn('Database connection test failed:', testError.message);
                return;
            }
            
            console.log('Database connection test passed');
            
            // Insert default categories if table exists and is empty
            try {
                const { data: categories, error: categoriesError } = await supabase
                    .from('categories')
                    .select('*')
                    .limit(1);
                
                if (categoriesError) {
                    console.warn('Categories table might not exist:', categoriesError.message);
                } else if (!categories || categories.length === 0) {
                    console.log('Inserting default categories...');
                    
                    for (const category of CONFIG.PRODUCT.DEFAULT_CATEGORIES) {
                        const { error: insertError } = await supabase
                            .from('categories')
                            .insert([category]);
                        
                        if (insertError) {
                            console.error('Error inserting category:', insertError);
                        }
                    }
                    console.log('Default categories inserted');
                }
            } catch (categoryError) {
                console.warn('Error checking/inserting categories:', categoryError);
            }
            
            console.log('Database initialization completed');
            
        } catch (error) {
            console.error('Error in database initialization:', error);
        }
    }
}

// Initialize database when ready
document.addEventListener('DOMContentLoaded', function() {
    // Tunggu supabaseService siap
    const checkService = setInterval(function() {
        if (window.supabaseService) {
            clearInterval(checkService);
            setTimeout(() => {
                DatabaseHelper.initializeDatabase();
            }, 1000);
        }
    }, 100);
});

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
    }
}

// Export for use in other files
window.CONFIG = CONFIG;
window.ConfigHelper = ConfigHelper;
window.DatabaseHelper = DatabaseHelper;
