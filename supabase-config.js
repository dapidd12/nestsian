// Supabase Configuration for NestSian
const SUPABASE_CONFIG = {
    URL: 'https://fumkbpwwyolzthowbkus.supabase.co',
    KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1bWticHd3eW9senRob3dia3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MDM0ODIsImV4cCI6MjA4MTM3OTQ4Mn0.Lc-Jw_zDBbkXAgIw5NTOfX_dBPQpD42IpVxQ-2EvZ2I
'
};

class SupabaseService {
    constructor() {
        this.supabase = null;
        this.initialized = false;
        this.currentUser = null;
        this.init();
    }

    async init() {
        try {
            // Load Supabase client
            if (typeof supabase !== 'undefined') {
                this.supabase = supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);
                
                // Check connection
                const { data, error } = await this.supabase.from('products').select('count', { count: 'exact', head: true });
                
                if (error) {
                    console.warn('Supabase connection error, using fallback:', error.message);
                    this.setupFallbackMode();
                } else {
                    this.initialized = true;
                    console.log('Supabase connected successfully');
                    
                    // Check for existing session
                    const { data: { session } } = await this.supabase.auth.getSession();
                    if (session) {
                        this.currentUser = session.user;
                    }
                }
            } else {
                console.warn('Supabase client not available, using fallback mode');
                this.setupFallbackMode();
            }
        } catch (error) {
            console.error('Error initializing Supabase:', error);
            this.setupFallbackMode();
        }
    }

    setupFallbackMode() {
        // Create mock Supabase functions for fallback mode
        this.supabase = {
            from: (table) => ({
                select: (columns) => this.mockSelect(table, columns),
                insert: (data) => this.mockInsert(table, data),
                update: (data) => this.mockUpdate(table, data),
                delete: () => this.mockDelete(table),
                upsert: (data) => this.mockUpsert(table, data)
            }),
            auth: {
                signInWithPassword: (credentials) => this.mockSignIn(credentials),
                signOut: () => this.mockSignOut(),
                getSession: () => this.mockGetSession(),
                onAuthStateChange: (callback) => this.mockAuthStateChange(callback)
            },
            storage: {
                from: (bucket) => ({
                    upload: (path, file) => this.mockUpload(bucket, path, file),
                    getPublicUrl: (path) => this.mockGetPublicUrl(path)
                })
            }
        };
        this.initialized = false;
    }

    // Authentication Methods
    async signIn(email, password) {
        if (this.initialized) {
            try {
                const { data, error } = await this.supabase.auth.signInWithPassword({
                    email,
                    password
                });
                
                if (error) throw error;
                
                this.currentUser = data.user;
                return { success: true, user: data.user };
                
            } catch (error) {
                console.error('Sign in error:', error);
                return { success: false, error: error.message };
            }
        } else {
            // Mock authentication for fallback
            return this.mockSignIn({ email, password });
        }
    }

    async signOut() {
        if (this.initialized) {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
        }
        this.currentUser = null;
        localStorage.removeItem('nestsian_user');
    }

    async getCurrentUser() {
        if (this.initialized) {
            const { data: { user } } = await this.supabase.auth.getUser();
            return user;
        }
        return this.currentUser;
    }

    // Products Methods
    async getProducts(filters = {}) {
        try {
            if (this.initialized) {
                let query = this.supabase
                    .from('products')
                    .select(`
                        *,
                        categories(name, icon)
                    `);
                
                // Apply filters
                if (filters.category_id) {
                    query = query.eq('category_id', filters.category_id);
                }
                
                if (filters.featured !== undefined) {
                    query = query.eq('featured', filters.featured);
                }
                
                if (filters.search) {
                    query = query.ilike('name', `%${filters.search}%`);
                }
                
                const { data, error } = await query.order('created_at', { ascending: false });
                
                if (error) throw error;
                return data;
                
            } else {
                return this.getLocalProducts();
            }
        } catch (error) {
            console.error('Error getting products:', error);
            return this.getLocalProducts();
        }
    }

    async saveProduct(product) {
        try {
            if (this.initialized) {
                const { data, error } = await this.supabase
                    .from('products')
                    .upsert(product)
                    .select()
                    .single();
                
                if (error) throw error;
                return data;
                
            } else {
                return this.saveLocalProduct(product);
            }
        } catch (error) {
            console.error('Error saving product:', error);
            return this.saveLocalProduct(product);
        }
    }

    async deleteProduct(id) {
        try {
            if (this.initialized) {
                const { error } = await this.supabase
                    .from('products')
                    .delete()
                    .eq('id', id);
                
                if (error) throw error;
                
            } else {
                this.deleteLocalProduct(id);
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            this.deleteLocalProduct(id);
        }
    }

    // Categories Methods
    async getCategories() {
        try {
            if (this.initialized) {
                const { data, error } = await this.supabase
                    .from('categories')
                    .select('*')
                    .order('name');
                
                if (error) throw error;
                return data;
                
            } else {
                return this.getLocalCategories();
            }
        } catch (error) {
            console.error('Error getting categories:', error);
            return this.getLocalCategories();
        }
    }

    async saveCategory(category) {
        try {
            if (this.initialized) {
                const { data, error } = await this.supabase
                    .from('categories')
                    .upsert(category)
                    .select()
                    .single();
                
                if (error) throw error;
                return data;
                
            } else {
                return this.saveLocalCategory(category);
            }
        } catch (error) {
            console.error('Error saving category:', error);
            return this.saveLocalCategory(category);
        }
    }

    // Orders Methods
    async getOrders(filters = {}) {
        try {
            if (this.initialized) {
                let query = this.supabase
                    .from('orders')
                    .select(`
                        *,
                        order_items(
                            quantity,
                            price,
                            products(name, image_url)
                        )
                    `);
                
                if (filters.status) {
                    query = query.eq('status', filters.status);
                }
                
                if (filters.start_date && filters.end_date) {
                    query = query.gte('created_at', filters.start_date)
                               .lte('created_at', filters.end_date);
                }
                
                const { data, error } = await query.order('created_at', { ascending: false });
                
                if (error) throw error;
                return data;
                
            } else {
                return this.getLocalOrders();
            }
        } catch (error) {
            console.error('Error getting orders:', error);
            return this.getLocalOrders();
        }
    }

    async saveOrder(order) {
        try {
            if (this.initialized) {
                const { data, error } = await this.supabase
                    .from('orders')
                    .upsert(order)
                    .select()
                    .single();
                
                if (error) throw error;
                
                // Send Telegram notification
                await this.sendTelegramNotification(data);
                
                return data;
                
            } else {
                const savedOrder = this.saveLocalOrder(order);
                this.simulateTelegramNotification(savedOrder);
                return savedOrder;
            }
        } catch (error) {
            console.error('Error saving order:', error);
            const savedOrder = this.saveLocalOrder(order);
            this.simulateTelegramNotification(savedOrder);
            return savedOrder;
        }
    }

    // Customers Methods
    async getCustomers(search = '') {
        try {
            if (this.initialized) {
                let query = this.supabase
                    .from('customers')
                    .select('*');
                
                if (search) {
                    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
                }
                
                const { data, error } = await query.order('created_at', { ascending: false });
                
                if (error) throw error;
                return data;
                
            } else {
                return this.getLocalCustomers();
            }
        } catch (error) {
            console.error('Error getting customers:', error);
            return this.getLocalCustomers();
        }
    }

    // Settings Methods
    async getSettings() {
        try {
            if (this.initialized) {
                const { data, error } = await this.supabase
                    .from('settings')
                    .select('*');
                
                if (error) throw error;
                
                // Convert settings array to object
                const settings = {};
                data.forEach(item => {
                    try {
                        settings[item.key] = JSON.parse(item.value);
                    } catch {
                        settings[item.key] = item.value;
                    }
                });
                
                return settings;
                
            } else {
                return this.getLocalSettings();
            }
        } catch (error) {
            console.error('Error getting settings:', error);
            return this.getLocalSettings();
        }
    }

    async saveSetting(key, value) {
        try {
            if (this.initialized) {
                const { error } = await this.supabase
                    .from('settings')
                    .upsert({
                        key,
                        value: JSON.stringify(value)
                    });
                
                if (error) throw error;
                
            } else {
                this.saveLocalSetting(key, value);
            }
        } catch (error) {
            console.error('Error saving setting:', error);
            this.saveLocalSetting(key, value);
        }
    }

    // Statistics Methods
    async getDashboardStats() {
        try {
            if (this.initialized) {
                // Get total products
                const { count: totalProducts } = await this.supabase
                    .from('products')
                    .select('*', { count: 'exact', head: true });
                
                // Get today's orders
                const today = new Date().toISOString().split('T')[0];
                const { count: todayOrders } = await this.supabase
                    .from('orders')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', `${today}T00:00:00`)
                    .lte('created_at', `${today}T23:59:59`);
                
                // Get monthly revenue
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);
                
                const { data: monthlyOrders } = await this.supabase
                    .from('orders')
                    .select('total_amount')
                    .gte('created_at', startOfMonth.toISOString())
                    .eq('status', 'completed');
                
                const monthlyRevenue = monthlyOrders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
                
                // Get active customers (customers with orders in last 30 days)
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                
                const { data: recentCustomers } = await this.supabase
                    .from('orders')
                    .select('customer_email')
                    .gte('created_at', thirtyDaysAgo.toISOString())
                    .eq('status', 'completed');
                
                const uniqueCustomers = new Set(recentCustomers?.map(order => order.customer_email) || []);
                
                return {
                    totalProducts: totalProducts || 0,
                    todayOrders: todayOrders || 0,
                    monthlyRevenue: monthlyRevenue || 0,
                    activeCustomers: uniqueCustomers.size || 0
                };
                
            } else {
                return this.getLocalDashboardStats();
            }
        } catch (error) {
            console.error('Error getting dashboard stats:', error);
            return this.getLocalDashboardStats();
        }
    }

    // Telegram Notification
    async sendTelegramNotification(order) {
        const telegramConfig = CONFIG?.TELEGRAM || {};
        
        if (!telegramConfig.ENABLED || !telegramConfig.BOT_TOKEN || !telegramConfig.ADMIN_CHAT_ID) {
            return;
        }
        
        try {
            const message = `
🛒 *PESANAN BARU NESTSIAN*
━━━━━━━━━━━━━━━━━━
📦 *ID Pesanan:* ${order.id}
👤 *Pelanggan:* ${order.customer_name}
📞 *Telepon:* ${order.customer_phone}
📧 *Email:* ${order.customer_email}
━━━━━━━━━━━━━━━━━━
💳 *Total:* Rp ${order.total_amount?.toLocaleString() || '0'}
🔧 *Status:* ${order.status || 'Pending'}
━━━━━━━━━━━━━━━━━━
📅 *Tanggal:* ${new Date(order.created_at).toLocaleString('id-ID')}
            `;
            
            const url = `https://api.telegram.org/bot${telegramConfig.BOT_TOKEN}/sendMessage`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chat_id: telegramConfig.ADMIN_CHAT_ID,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });
            
            if (!response.ok) {
                console.error('Failed to send Telegram notification');
            }
        } catch (error) {
            console.error('Error sending Telegram notification:', error);
        }
    }

    // Mock Methods for Fallback Mode
    async mockSelect(table, columns = '*') {
        return new Promise((resolve) => {
            setTimeout(() => {
                const data = this.getMockData(table);
                resolve({ data, error: null });
            }, 300);
        });
    }

    async mockInsert(table, data) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockResponse = { 
                    id: Date.now(),
                    ...data,
                    created_at: new Date().toISOString()
                };
                resolve({ data: [mockResponse], error: null });
            }, 300);
        });
    }

    async mockSignIn(credentials) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const { email, password } = credentials;
                
                // Mock validation
                if (email === 'admin@nestsian.com' && password === 'admin123') {
                    const user = {
                        id: '1',
                        email: email,
                        role: 'superadmin'
                    };
                    this.currentUser = user;
                    
                    // Store in localStorage
                    localStorage.setItem('nestsian_user', JSON.stringify({
                        user,
                        timestamp: Date.now()
                    }));
                    
                    resolve({ success: true, user });
                } else {
                    resolve({ success: false, error: 'Invalid credentials' });
                }
            }, 500);
        });
    }

    getMockData(table) {
        const mockData = {
            products: this.getLocalProducts(),
            categories: this.getLocalCategories(),
            orders: this.getLocalOrders(),
            customers: this.getLocalCustomers(),
            settings: Object.entries(this.getLocalSettings()).map(([key, value]) => ({
                key,
                value: JSON.stringify(value)
            }))
        };

        return mockData[table] || [];
    }

    // Local Storage Methods (Fallback)
    getLocalProducts() {
        try {
            const products = JSON.parse(localStorage.getItem('nestsian_products') || '[]');
            if (!products.length) {
                // Initialize with sample data
                const sampleProducts = [
                    {
                        id: 1,
                        name: 'Security Panel Basic',
                        description: 'Basic security panel for small businesses',
                        price: 149000,
                        stock: 15,
                        category_id: 1,
                        image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
                        weight: 500,
                        featured: true,
                        created_at: new Date().toISOString()
                    },
                    {
                        id: 2,
                        name: 'Enterprise Firewall',
                        description: 'Advanced firewall solution for enterprises',
                        price: 499000,
                        stock: 8,
                        category_id: 2,
                        image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
                        weight: 1500,
                        featured: true,
                        created_at: new Date().toISOString()
                    }
                ];
                localStorage.setItem('nestsian_products', JSON.stringify(sampleProducts));
                return sampleProducts;
            }
            return products;
        } catch {
            return [];
        }
    }

    saveLocalProduct(product) {
        const products = this.getLocalProducts();
        
        if (product.id) {
            const index = products.findIndex(p => p.id === product.id);
            if (index !== -1) {
                products[index] = { ...products[index], ...product, updated_at: new Date().toISOString() };
            } else {
                products.push({ ...product, id: Date.now(), created_at: new Date().toISOString() });
            }
        } else {
            products.push({ ...product, id: Date.now(), created_at: new Date().toISOString() });
        }
        
        localStorage.setItem('nestsian_products', JSON.stringify(products));
        return product;
    }

    deleteLocalProduct(id) {
        const products = this.getLocalProducts();
        const updatedProducts = products.filter(p => p.id !== id);
        localStorage.setItem('nestsian_products', JSON.stringify(updatedProducts));
    }

    getLocalCategories() {
        try {
            const categories = JSON.parse(localStorage.getItem('nestsian_categories') || '[]');
            if (!categories.length) {
                const sampleCategories = [
                    { id: 1, name: 'Security', icon: 'fas fa-shield-alt', description: 'Security products' },
                    { id: 2, name: 'Networking', icon: 'fas fa-network-wired', description: 'Networking equipment' },
                    { id: 3, name: 'Software', icon: 'fas fa-code', description: 'Software solutions' }
                ];
                localStorage.setItem('nestsian_categories', JSON.stringify(sampleCategories));
                return sampleCategories;
            }
            return categories;
        } catch {
            return [];
        }
    }

    saveLocalCategory(category) {
        const categories = this.getLocalCategories();
        
        if (category.id) {
            const index = categories.findIndex(c => c.id === category.id);
            if (index !== -1) {
                categories[index] = category;
            } else {
                categories.push({ ...category, id: Date.now() });
            }
        } else {
            categories.push({ ...category, id: Date.now() });
        }
        
        localStorage.setItem('nestsian_categories', JSON.stringify(categories));
        return category;
    }

    getLocalOrders() {
        try {
            return JSON.parse(localStorage.getItem('nestsian_orders') || '[]');
        } catch {
            return [];
        }
    }

    saveLocalOrder(order) {
        const orders = this.getLocalOrders();
        
        if (order.id) {
            const index = orders.findIndex(o => o.id === order.id);
            if (index !== -1) {
                orders[index] = order;
            } else {
                orders.push({ ...order, id: `NS-${Date.now()}`, created_at: new Date().toISOString() });
            }
        } else {
            orders.push({ ...order, id: `NS-${Date.now()}`, created_at: new Date().toISOString() });
        }
        
        localStorage.setItem('nestsian_orders', JSON.stringify(orders));
        return order;
    }

    getLocalCustomers() {
        try {
            return JSON.parse(localStorage.getItem('nestsian_customers') || '[]');
        } catch {
            return [];
        }
    }

    getLocalSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('nestsian_settings') || '{}');
            
            // Ensure all required settings exist
            const defaultSettings = {
                website: {
                    name: 'NestSian',
                    slogan: 'Secure. Stable. Futuristic.',
                    description: 'Solusi keamanan dan teknologi modern untuk bisnis Anda.',
                    contact_email: 'info@nestsian.com',
                    contact_phone: '+62 21 1234 5678',
                    contact_address: 'Jl. Teknologi No. 123, Jakarta Selatan, Indonesia'
                },
                qris: {
                    merchant_name: 'NestSian Store',
                    merchant_id: 'ID.NESTSIAN.WWW',
                    city: 'Jakarta',
                    postal_code: '12345',
                    base_string: '00020101021126570011ID.DANA.WWW011893600915376904960002097690496000303UMI51440014ID.CO.QRIS.WWW0215ID10243512603270303UMI5204481453033605802ID5912NESTSIAN STORE6014JAKARTA SELATAN6105123456304'
                },
                maintenance: {
                    enabled: false,
                    message: 'Sistem sedang dalam pemeliharaan. Silakan kembali beberapa saat lagi.',
                    eta: null
                }
            };
            
            return { ...defaultSettings, ...settings };
        } catch {
            return defaultSettings;
        }
    }

    saveLocalSetting(key, value) {
        const settings = this.getLocalSettings();
        settings[key] = value;
        localStorage.setItem('nestsian_settings', JSON.stringify(settings));
    }

    getLocalDashboardStats() {
        const products = this.getLocalProducts();
        const orders = this.getLocalOrders();
        const today = new Date().toISOString().split('T')[0];
        
        const todayOrders = orders.filter(order => 
            order.created_at?.startsWith(today)
        ).length;
        
        const monthlyRevenue = orders
            .filter(order => {
                const orderDate = new Date(order.created_at);
                const now = new Date();
                return orderDate.getMonth() === now.getMonth() && 
                       orderDate.getFullYear() === now.getFullYear() &&
                       order.status === 'completed';
            })
            .reduce((sum, order) => sum + (order.total_amount || 0), 0);
        
        const uniqueCustomers = new Set(orders.map(order => order.customer_email).filter(Boolean));
        
        return {
            totalProducts: products.length,
            todayOrders,
            monthlyRevenue,
            activeCustomers: uniqueCustomers.size
        };
    }

    simulateTelegramNotification(order) {
        console.log('📱 Telegram Notification (Simulated):');
        console.log(`New Order: ${order.id}`);
        console.log(`Customer: ${order.customer_name}`);
        console.log(`Total: Rp ${order.total_amount?.toLocaleString() || '0'}`);
    }
}

// Initialize and export
window.supabaseService = new SupabaseService();
window.SUPABASE_CONFIG = SUPABASE_CONFIG;