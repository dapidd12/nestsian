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
    
    // Theme Configuration - UPDATED FOR CONSISTENCY
    THEME: {
        COLORS: {
            primary: '#0080ff',
            secondary: '#0ea5e9',
            accent: '#d946ef',
            success: '#10b981',
            warning: '#f59e0b',
            danger: '#ef4444',
            info: '#3b82f6'
        },
        DARK: {
            50: '#f8fafc',
            100: '#f1f5f9',
            200: '#e2e8f0',
            300: '#cbd5e1',
            400: '#94a3b8',
            500: '#64748b',
            600: '#475569',
            700: '#334155',
            800: '#1e293b',
            900: '#0f172a',
            950: '#020617'
        },
        GRADIENTS: {
            primary: 'linear-gradient(45deg, #0080ff, #0ea5e9)',
            secondary: 'linear-gradient(45deg, #475569, #64748b)',
            success: 'linear-gradient(45deg, #10b981, #34d399)',
            danger: 'linear-gradient(45deg, #ef4444, #f87171)',
            warning: 'linear-gradient(45deg, #f59e0b, #fbbf24)',
            accent: 'linear-gradient(45deg, #d946ef, #e879f9)'
        }
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
            { id: 1, name: 'Security', icon: 'fas fa-shield-alt', description: 'Security products and solutions' },
            { id: 2, name: 'Networking', icon: 'fas fa-network-wired', description: 'Networking equipment and infrastructure' },
            { id: 3, name: 'Software', icon: 'fas fa-code', description: 'Software applications and tools' },
            { id: 4, name: 'Hardware', icon: 'fas fa-server', description: 'Hardware devices and equipment' },
            { id: 5, name: 'Service', icon: 'fas fa-concierge-bell', description: 'Professional services and support' }
        ],
        STOCK: {
            LOW_THRESHOLD: 5,
            CRITICAL_THRESHOLD: 2,
            IN_STOCK_COLOR: '#10b981',
            LOW_STOCK_COLOR: '#f59e0b',
            OUT_OF_STOCK_COLOR: '#ef4444'
        },
        CURRENCY: 'IDR',
        CURRENCY_SYMBOL: 'Rp'
    },
    
    // Order Configuration - UPDATED FOR CONSISTENCY
    ORDER: {
        STATUSES: {
            pending: 'pending',
            processing: 'processing',
            completed: 'completed',
            cancelled: 'cancelled'
        },
        STATUS_LABELS: {
            pending: 'Pending',
            processing: 'Processing',
            completed: 'Completed',
            cancelled: 'Cancelled'
        },
        STATUS_COLORS: {
            pending: '#f59e0b',
            processing: '#3b82f6',
            completed: '#10b981',
            cancelled: '#ef4444'
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
    },
    
    // UI Configuration - NEW SECTION FOR CONSISTENCY
    UI: {
        BORDER_RADIUS: {
            sm: '6px',
            md: '10px',
            lg: '16px',
            xl: '20px',
            full: '9999px'
        },
        SPACING: {
            1: '4px',
            2: '8px',
            3: '12px',
            4: '16px',
            5: '20px',
            6: '24px',
            8: '32px',
            10: '40px'
        },
        SHADOWS: {
            sm: '0 1px 3px rgba(0, 0, 0, 0.12)',
            md: '0 4px 6px rgba(0, 0, 0, 0.1)',
            lg: '0 10px 25px rgba(0, 0, 0, 0.15)',
            xl: '0 20px 40px rgba(0, 0, 0, 0.2)',
            primary: '0 8px 25px rgba(0, 128, 255, 0.3)'
        },
        FONT_SIZES: {
            xs: '12px',
            sm: '14px',
            base: '16px',
            lg: '18px',
            xl: '20px',
            '2xl': '24px',
            '3xl': '30px',
            '4xl': '36px'
        },
        Z_INDEX: {
            dropdown: 1000,
            sticky: 1020,
            fixed: 1030,
            modalBackdrop: 1040,
            modal: 1050,
            popover: 1060,
            tooltip: 1070,
            toast: 1080
        },
        ANIMATIONS: {
            fast: '150ms',
            normal: '300ms',
            slow: '500ms',
            slower: '750ms'
        }
    }
};

// Database Initialization Helper
class DatabaseHelper {
    static async initializeDatabase() {
        try {
            console.log('Initializing database...');
            
            if (!window.supabaseService) {
                console.warn('Supabase service not available');
                return;
            }
            
            const supabase = window.supabaseService.supabase;
            
            if (!supabase) {
                console.warn('Supabase client not available');
                return;
            }
            
            // Test connection
            const { error: testError } = await supabase
                .from('products')
                .select('id')
                .limit(1);
            
            if (testError && testError.code !== 'PGRST116') {
                console.warn('Database connection test failed:', testError.message);
                return;
            }
            
            console.log('Database connection test passed');
            
            // Insert default categories if empty
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
    const checkService = setInterval(function() {
        if (window.supabaseService) {
            clearInterval(checkService);
            setTimeout(() => {
                DatabaseHelper.initializeDatabase();
            }, 1000);
        }
    }, 100);
});

// Configuration Helper Class
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
    
    static getThemeColor(name) {
        return CONFIG.THEME.COLORS[name] || CONFIG.THEME.COLORS.primary;
    }
    
    static getStatusColor(status) {
        return CONFIG.ORDER.STATUS_COLORS[status] || CONFIG.THEME.COLORS.warning;
    }
    
    static getStatusLabel(status) {
        return CONFIG.ORDER.STATUS_LABELS[status] || 'Unknown';
    }
    
    static getStockColor(stock) {
        if (stock === 0) return CONFIG.PRODUCT.STOCK.OUT_OF_STOCK_COLOR;
        if (stock <= CONFIG.PRODUCT.STOCK.CRITICAL_THRESHOLD) return CONFIG.THEME.COLORS.danger;
        if (stock <= CONFIG.PRODUCT.STOCK.LOW_THRESHOLD) return CONFIG.THEME.COLORS.warning;
        return CONFIG.PRODUCT.STOCK.IN_STOCK_COLOR;
    }
    
    static formatCurrency(amount) {
        if (!amount) amount = 0;
        return `${CONFIG.PRODUCT.CURRENCY_SYMBOL} ${amount.toLocaleString('id-ID')}`;
    }
}

// Export for use in other files
window.CONFIG = CONFIG;
window.ConfigHelper = ConfigHelper;
window.DatabaseHelper = DatabaseHelper;