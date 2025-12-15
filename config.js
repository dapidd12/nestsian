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
        SCHEMA: `
            -- Users Table
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT,
                role TEXT DEFAULT 'staff',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            -- Categories Table
            CREATE TABLE IF NOT EXISTS categories (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                icon TEXT DEFAULT 'fas fa-tag',
                description TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            -- Products Table
            CREATE TABLE IF NOT EXISTS products (
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
            );

            -- Customers Table
            CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                address TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );

            -- Orders Table
            CREATE TABLE IF NOT EXISTS orders (
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
            );

            -- Order Items Table
            CREATE TABLE IF NOT EXISTS order_items (
                id SERIAL PRIMARY KEY,
                order_id TEXT REFERENCES orders(id),
                product_id INTEGER REFERENCES products(id),
                quantity INTEGER NOT NULL,
                price INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );

            -- Settings Table
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP DEFAULT NOW()
            );

            -- Contact Messages Table
            CREATE TABLE IF NOT EXISTS contact_messages (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                subject TEXT NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW()
            );

            -- System Logs Table
            CREATE TABLE IF NOT EXISTS system_logs (
                id SERIAL PRIMARY KEY,
                user_id UUID REFERENCES users(id),
                action TEXT NOT NULL,
                details JSONB,
                ip_address TEXT,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `
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
            const supabase = supabaseService.supabase;
            
            if (!supabase || !supabaseService.initialized) {
                console.warn('Supabase not available for database initialization');
                return;
            }
            
            // Create tables if they don't exist
            const tables = CONFIG.DATABASE.TABLES;
            
            for (const [tableName, sql] of Object.entries(CONFIG.DATABASE.SCHEMA)) {
                try {
                    const { error } = await supabase.rpc('exec_sql', { sql });
                    if (error && !error.message.includes('already exists')) {
                        console.error(`Error creating table ${tableName}:`, error);
                    }
                } catch (error) {
                    console.error(`Error initializing table ${tableName}:`, error);
                }
            }
            
            // Insert default categories if empty
            const { data: existingCategories } = await supabase
                .from('categories')
                .select('id')
                .limit(1);
            
            if (!existingCategories || existingCategories.length === 0) {
                for (const category of CONFIG.PRODUCT.DEFAULT_CATEGORIES) {
                    await supabase
                        .from('categories')
                        .insert([category]);
                }
                console.log('Default categories inserted');
            }
            
            // Insert default settings if empty
            const { data: existingSettings } = await supabase
                .from('settings')
                .select('key')
                .limit(1);
            
            if (!existingSettings || existingSettings.length === 0) {
                const defaultSettings = [
                    { key: 'website', value: JSON.stringify({
                        name: 'NestSian',
                        slogan: 'Secure. Stable. Futuristic.',
                        description: 'Solusi keamanan dan teknologi modern untuk bisnis Anda.',
                        contact_email: 'info@nestsian.com',
                        contact_phone: '+62 21 1234 5678',
                        contact_address: 'Jl. Teknologi No. 123, Jakarta Selatan, Indonesia'
                    })},
                    { key: 'qris', value: JSON.stringify({
                        merchant_name: 'NestSian Store',
                        merchant_id: 'ID.NESTSIAN.WWW',
                        city: 'Jakarta',
                        postal_code: '12345',
                        base_string: '00020101021126570011ID.DANA.WWW011893600915376904960002097690496000303UMI51440014ID.CO.QRIS.WWW0215ID10243512603270303UMI5204481453033605802ID5912NESTSIAN STORE6014JAKARTA SELATAN6105123456304'
                    })},
                    { key: 'maintenance', value: JSON.stringify({
                        enabled: false,
                        message: 'Sistem sedang dalam pemeliharaan. Silakan kembali beberapa saat lagi.',
                        eta: null
                    })},
                    { key: 'system', value: JSON.stringify({
                        name: 'NestSian',
                        logo: 'logo.jpg',
                        timezone: 'Asia/Jakarta',
                        currency: 'IDR'
                    })}
                ];
                
                for (const setting of defaultSettings) {
                    await supabase
                        .from('settings')
                        .insert([setting]);
                }
                console.log('Default settings inserted');
            }
            
            console.log('Database initialized successfully');
            
        } catch (error) {
            console.error('Error initializing database:', error);
        }
    }
}

// Initialize database when Supabase is ready
setTimeout(() => {
    if (window.supabaseService?.initialized) {
        DatabaseHelper.initializeDatabase();
    }
}, 2000);

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