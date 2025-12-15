// Supabase Configuration for NestSian
const SUPABASE_CONFIG = {
    URL: 'https://fumkbpwwyolzthowbkus.supabase.co',
    KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1bWticHd3eW9senRob3dia3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MDM0ODIsImV4cCI6MjA4MTM3OTQ4Mn0.Lc-Jw_zDBbkXAgIw5NTOfX_dBPQpD42IpVxQ-2EvZ2I'
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
            console.log('Initializing Supabase service...');
            
            // Cek apakah supabase library sudah dimuat
            if (typeof supabase === 'undefined') {
                console.warn('Supabase JS library not loaded, using fallback mode');
                this.setupFallbackMode();
                return;
            }
            
            // Create client
            this.supabase = supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);
            
            // Test connection dengan timeout
            const timeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Connection timeout')), 3000)
            );
            
            const connectionTest = this.supabase.from('products').select('id', { count: 'exact', head: true });
            
            try {
                await Promise.race([connectionTest, timeout]);
                const { error } = await connectionTest;
                
                if (error && !error.message.includes('does not exist')) {
                    console.warn('Supabase connection error:', error.message);
                    this.setupFallbackMode();
                    return;
                }
                
                this.initialized = true;
                console.log('Supabase connected successfully');
                
                // Check for existing session
                const { data: { session } } = await this.supabase.auth.getSession();
                if (session) {
                    this.currentUser = session.user;
                    console.log('User session found:', this.currentUser.email);
                }
                
            } catch (error) {
                console.warn('Supabase connection failed, using fallback mode:', error.message);
                this.setupFallbackMode();
            }
            
        } catch (error) {
            console.error('Error initializing Supabase:', error);
            this.setupFallbackMode();
        }
    }

    setupFallbackMode() {
        console.log('Setting up fallback mode...');
        
        // Create mock Supabase functions
        this.supabase = {
            from: (table) => ({
                select: (columns, options) => this.mockSelect(table, columns, options),
                insert: (data, options) => this.mockInsert(table, data, options),
                update: (data) => this.mockUpdate(table, data),
                delete: () => this.mockDelete(table),
                upsert: (data) => this.mockUpsert(table, data),
                eq: (column, value) => ({ select: () => this.mockSelect(table, '*', { where: { [column]: value } }) }),
                gte: (column, value) => ({ select: () => this.mockSelect(table, '*', { where: { [column]: { gte: value } } }) }),
                lte: (column, value) => ({ select: () => this.mockSelect(table, '*', { where: { [column]: { lte: value } } }) }),
                ilike: (column, pattern) => ({ select: () => this.mockSelect(table, '*', { where: { [column]: { ilike: pattern } } }) }),
                or: (conditions) => ({ select: () => this.mockSelect(table, '*', { where: conditions }) }),
                order: (column, options) => ({ select: () => this.mockSelect(table, '*', { order: { column, options } }) })
            }),
            auth: {
                signInWithPassword: (credentials) => this.mockSignIn(credentials),
                signOut: () => this.mockSignOut(),
                getSession: () => this.mockGetSession(),
                getUser: () => this.mockGetSession(),
                onAuthStateChange: (callback) => this.mockAuthStateChange(callback)
            },
            rpc: (fn, params) => this.mockRpc(fn, params)
        };
        
        this.initialized = false;
        console.log('Fallback mode activated');
    }

    // Authentication Methods
    async signIn(email, password) {
        console.log('Sign in attempt:', email);
        
        if (this.initialized && this.supabase.auth) {
            try {
                const { data, error } = await this.supabase.auth.signInWithPassword({
                    email,
                    password
                });
                
                if (error) {
                    console.error('Sign in error:', error);
                    return { success: false, error: error.message };
                }
                
                this.currentUser = data.user;
                console.log('Sign in successful via Supabase');
                return { success: true, user: data.user };
                
            } catch (error) {
                console.error('Sign in exception:', error);
                return { success: false, error: 'Authentication error' };
            }
        } else {
            // Mock authentication for fallback
            return await this.mockSignIn({ email, password });
        }
    }

    async signOut() {
        console.log('Signing out...');
        
        if (this.initialized && this.supabase.auth) {
            try {
                const { error } = await this.supabase.auth.signOut();
                if (error) console.error('Sign out error:', error);
            } catch (error) {
                console.error('Sign out exception:', error);
            }
        }
        
        this.currentUser = null;
        localStorage.removeItem('nestsian_user');
        console.log('Sign out successful');
    }

    async getCurrentUser() {
        if (this.initialized && this.supabase.auth) {
            try {
                const { data: { user } } = await this.supabase.auth.getUser();
                return user;
            } catch (error) {
                console.error('Get user error:', error);
                return null;
            }
        }
        return this.currentUser;
    }

    // Products Methods
    async getProducts(filters = {}) {
        try {
            if (this.initialized) {
                let query = this.supabase
                    .from('products')
                    .select('*, categories(name, icon)');
                
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
                
                if (error) {
                    console.error('Supabase getProducts error:', error);
                    throw error;
                }
                return data || [];
                
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
                return { success: true };
                
            } else {
                this.deleteLocalProduct(id);
                return { success: true };
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            this.deleteLocalProduct(id);
            return { success: false, error: error.message };
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
                return data || [];
                
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
                    .select('*');
                
                if (filters.status) {
                    query = query.eq('status', filters.status);
                }
                
                if (filters.start_date && filters.end_date) {
                    query = query.gte('created_at', filters.start_date)
                               .lte('created_at', filters.end_date);
                }
                
                const { data, error } = await query.order('created_at', { ascending: false });
                
                if (error) throw error;
                return data || [];
                
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
                return data || [];
                
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
                if (data) {
                    data.forEach(item => {
                        try {
                            settings[item.key] = JSON.parse(item.value);
                        } catch {
                            settings[item.key] = item.value;
                        }
                    });
                }
                
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
                return { success: true };
                
            } else {
                this.saveLocalSetting(key, value);
                return { success: true };
            }
        } catch (error) {
            console.error('Error saving setting:', error);
            this.saveLocalSetting(key, value);
            return { success: false, error: error.message };
        }
    }

    // Statistics Methods
    async getDashboardStats() {
        try {
            if (this.initialized) {
                // Get total products
                const { count: totalProducts, error: productsError } = await this.supabase
                    .from('products')
                    .select('*', { count: 'exact', head: true });
                
                if (productsError) throw productsError;
                
                // Get today's orders
                const today = new Date().toISOString().split('T')[0];
                const { count: todayOrders, error: ordersError } = await this.supabase
                    .from('orders')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', `${today}T00:00:00`)
                    .lte('created_at', `${today}T23:59:59`);
                
                if (ordersError) throw ordersError;
                
                // Get monthly revenue (sederhana)
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);
                
                const { data: monthlyOrders, error: revenueError } = await this.supabase
                    .from('orders')
                    .select('total_amount, status')
                    .gte('created_at', startOfMonth.toISOString());
                
                if (revenueError) throw revenueError;
                
                const monthlyRevenue = monthlyOrders?.reduce((sum, order) => {
                    if (order.status === 'completed') {
                        return sum + (order.total_amount || 0);
                    }
                    return sum;
                }, 0) || 0;
                
                // Get active customers
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                
                const { data: recentOrders, error: customersError } = await this.supabase
                    .from('orders')
                    .select('customer_email, status')
                    .gte('created_at', thirtyDaysAgo.toISOString())
                    .eq('status', 'completed');
                
                if (customersError) throw customersError;
                
                const uniqueCustomers = new Set(recentOrders?.map(order => order.customer_email).filter(Boolean) || []);
                
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
        const telegramConfig = window.CONFIG?.TELEGRAM || {};
        
        if (!telegramConfig.ENABLED || !telegramConfig.BOT_TOKEN || !telegramConfig.ADMIN_CHAT_ID) {
            console.log('Telegram notifications disabled');
            return;
        }
        
        try {
            const message = `
🛒 *PESANAN BARU NESTSIAN*
━━━━━━━━━━━━━━━━━━
📦 *ID Pesanan:* ${order.id || 'N/A'}
👤 *Pelanggan:* ${order.customer_name || 'N/A'}
📞 *Telepon:* ${order.customer_phone || 'N/A'}
📧 *Email:* ${order.customer_email || 'N/A'}
━━━━━━━━━━━━━━━━━━
💳 *Total:* Rp ${(order.total_amount || 0).toLocaleString()}
🔧 *Status:* ${order.status || 'Pending'}
━━━━━━━━━━━━━━━━━━
📅 *Tanggal:* ${new Date(order.created_at || Date.now()).toLocaleString('id-ID')}
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
                console.error('Failed to send Telegram notification:', await response.text());
            } else {
                console.log('Telegram notification sent');
            }
        } catch (error) {
            console.error('Error sending Telegram notification:', error);
        }
    }

    // Mock Methods for Fallback Mode
    async mockSelect(table, columns = '*', options = {}) {
        return new Promise((resolve) => {
            setTimeout(() => {
                let data = this.getMockData(table);
                
                // Apply simple filtering (basic mock)
                if (options && options.where) {
                    const where = options.where;
                    Object.keys(where).forEach(key => {
                        if (where[key] && typeof where[key] === 'object') {
                            if (where[key].gte) {
                                data = data.filter(item => item[key] >= where[key].gte);
                            }
                            if (where[key].lte) {
                                data = data.filter(item => item[key] <= where[key].lte);
                            }
                            if (where[key].ilike) {
                                const pattern = where[key].ilike.replace(/%/g, '.*');
                                const regex = new RegExp(pattern, 'i');
                                data = data.filter(item => regex.test(item[key]));
                            }
                        } else {
                            data = data.filter(item => item[key] === where[key]);
                        }
                    });
                }
                
                // Apply count option
                if (options && options.count === 'exact' && options.head === true) {
                    resolve({ count: data.length, error: null });
                    return;
                }
                
                resolve({ data, error: null });
            }, 300);
        });
    }

    async mockInsert(table, data, options) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockResponse = { 
                    id: Math.floor(Math.random() * 100000),
                    ...data,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                
                if (options && options.select && options.select === 'single') {
                    resolve({ data: mockResponse, error: null });
                } else {
                    resolve({ data: [mockResponse], error: null });
                }
            }, 300);
        });
    }

    async mockUpsert(table, data) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockResponse = { 
                    id: data.id || Math.floor(Math.random() * 100000),
                    ...data,
                    updated_at: new Date().toISOString()
                };
                resolve({ data: mockResponse, error: null });
            }, 300);
        });
    }

    async mockUpdate(table, data) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ data: [data], error: null });
            }, 300);
        });
    }

    async mockDelete(table) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ data: null, error: null });
            }, 300);
        });
    }

    async mockRpc(fn, params) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ data: null, error: null });
            }, 300);
        });
    }

    async mockSignIn(credentials) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const { email, password } = credentials;
                
                // Mock validation
                if ((email === 'admin@nestsian.com' && password === 'admin123') || 
                    (email === 'staff@nestsian.com' && password === 'staff123')) {
                    const user = {
                        id: '1',
                        email: email,
                        role: email === 'admin@nestsian.com' ? 'superadmin' : 'staff',
                        name: email === 'admin@nestsian.com' ? 'Super Admin' : 'Staff User'
                    };
                    this.currentUser = user;
                    
                    // Store in localStorage
                    localStorage.setItem('nestsian_user', JSON.stringify({
                        user,
                        timestamp: Date.now()
                    }));
                    
                    console.log('Mock sign in successful:', email);
                    resolve({ success: true, user });
                } else {
                    console.log('Mock sign in failed:', email);
                    resolve({ success: false, error: 'Email atau password salah' });
                }
            }, 500);
        });
    }

    async mockSignOut() {
        return new Promise((resolve) => {
            setTimeout(() => {
                this.currentUser = null;
                localStorage.removeItem('nestsian_user');
                resolve({ error: null });
            }, 200);
        });
    }

    async mockGetSession() {
        return new Promise((resolve) => {
            setTimeout(() => {
                const storedUser = localStorage.getItem('nestsian_user');
                const session = storedUser ? { user: JSON.parse(storedUser).user } : null;
                resolve({ data: { session }, error: null });
            }, 100);
        });
    }

    mockAuthStateChange(callback) {
        // Simple mock for auth state changes
        setTimeout(() => {
            const storedUser = localStorage.getItem('nestsian_user');
            if (storedUser) {
                const { user } = JSON.parse(storedUser);
                callback('SIGNED_IN', { user });
            } else {
                callback('SIGNED_OUT', null);
            }
        }, 1000);
        
        // Return unsubscribe function
        return () => {};
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
                        description: 'Basic security panel for small businesses with real-time monitoring',
                        price: 149000,
                        stock: 15,
                        category_id: 1,
                        image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
                        weight: 500,
                        featured: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        categories: { name: 'Security', icon: 'fas fa-shield-alt' }
                    },
                    {
                        id: 2,
                        name: 'Enterprise Firewall',
                        description: 'Advanced firewall solution for enterprise networks with threat protection',
                        price: 499000,
                        stock: 8,
                        category_id: 2,
                        image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
                        weight: 1500,
                        featured: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        categories: { name: 'Networking', icon: 'fas fa-network-wired' }
                    },
                    {
                        id: 3,
                        name: 'VPN Premium',
                        description: 'Secure VPN connection for remote workers with unlimited bandwidth',
                        price: 89000,
                        stock: 45,
                        category_id: 1,
                        image_url: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
                        weight: 0,
                        featured: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        categories: { name: 'Security', icon: 'fas fa-shield-alt' }
                    }
                ];
                localStorage.setItem('nestsian_products', JSON.stringify(sampleProducts));
                return sampleProducts;
            }
            return products;
        } catch (error) {
            console.error('Error getting local products:', error);
            return [];
        }
    }

    saveLocalProduct(product) {
        try {
            const products = this.getLocalProducts();
            let updatedProduct;
            
            if (product.id) {
                const index = products.findIndex(p => p.id === product.id);
                if (index !== -1) {
                    products[index] = { 
                        ...products[index], 
                        ...product, 
                        updated_at: new Date().toISOString() 
                    };
                    updatedProduct = products[index];
                } else {
                    updatedProduct = { 
                        ...product, 
                        id: Date.now(), 
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                    products.push(updatedProduct);
                }
            } else {
                updatedProduct = { 
                    ...product, 
                    id: Date.now(), 
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                products.push(updatedProduct);
            }
            
            localStorage.setItem('nestsian_products', JSON.stringify(products));
            return updatedProduct;
        } catch (error) {
            console.error('Error saving local product:', error);
            return product;
        }
    }

    deleteLocalProduct(id) {
        try {
            const products = this.getLocalProducts();
            const updatedProducts = products.filter(p => p.id !== id);
            localStorage.setItem('nestsian_products', JSON.stringify(updatedProducts));
        } catch (error) {
            console.error('Error deleting local product:', error);
        }
    }

    getLocalCategories() {
        try {
            const categories = JSON.parse(localStorage.getItem('nestsian_categories') || '[]');
            if (!categories.length) {
                const sampleCategories = [
                    { id: 1, name: 'Security', icon: 'fas fa-shield-alt', description: 'Security products and solutions' },
                    { id: 2, name: 'Networking', icon: 'fas fa-network-wired', description: 'Networking equipment and infrastructure' },
                    { id: 3, name: 'Software', icon: 'fas fa-code', description: 'Software applications and tools' },
                    { id: 4, name: 'Hardware', icon: 'fas fa-server', description: 'Hardware devices and equipment' },
                    { id: 5, name: 'Service', icon: 'fas fa-concierge-bell', description: 'Professional services and support' }
                ];
                localStorage.setItem('nestsian_categories', JSON.stringify(sampleCategories));
                return sampleCategories;
            }
            return categories;
        } catch (error) {
            console.error('Error getting local categories:', error);
            return [];
        }
    }

    saveLocalCategory(category) {
        try {
            const categories = this.getLocalCategories();
            let updatedCategory;
            
            if (category.id) {
                const index = categories.findIndex(c => c.id === category.id);
                if (index !== -1) {
                    categories[index] = category;
                    updatedCategory = categories[index];
                } else {
                    updatedCategory = { ...category, id: Date.now() };
                    categories.push(updatedCategory);
                }
            } else {
                updatedCategory = { ...category, id: Date.now() };
                categories.push(updatedCategory);
            }
            
            localStorage.setItem('nestsian_categories', JSON.stringify(categories));
            return updatedCategory;
        } catch (error) {
            console.error('Error saving local category:', error);
            return category;
        }
    }

    getLocalOrders() {
        try {
            const orders = JSON.parse(localStorage.getItem('nestsian_orders') || '[]');
            if (!orders.length) {
                const sampleOrders = [
                    {
                        id: 'NS-20240115-0001',
                        customer_name: 'John Doe',
                        customer_email: 'john.doe@example.com',
                        customer_phone: '+628123456789',
                        total_amount: 164000,
                        status: 'completed',
                        payment_method: 'qris',
                        shipping_address: 'Jl. Sudirman No. 123, Jakarta',
                        created_at: new Date('2024-01-15').toISOString(),
                        updated_at: new Date('2024-01-15').toISOString(),
                        order_items: [
                            { product_name: 'Security Panel Basic', quantity: 1, price: 149000 }
                        ]
                    },
                    {
                        id: 'NS-20240116-0001',
                        customer_name: 'Jane Smith',
                        customer_email: 'jane.smith@example.com',
                        customer_phone: '+628987654321',
                        total_amount: 499000,
                        status: 'processing',
                        payment_method: 'bank_transfer',
                        shipping_address: 'Jl. Thamrin No. 456, Jakarta',
                        created_at: new Date('2024-01-16').toISOString(),
                        updated_at: new Date('2024-01-16').toISOString(),
                        order_items: [
                            { product_name: 'Enterprise Firewall', quantity: 1, price: 499000 }
                        ]
                    },
                    {
                        id: 'NS-20240117-0001',
                        customer_name: 'Bob Johnson',
                        customer_email: 'bob.johnson@example.com',
                        customer_phone: '+628111223344',
                        total_amount: 104000,
                        status: 'pending',
                        payment_method: 'qris',
                        shipping_address: 'Jl. Gatot Subroto No. 789, Bandung',
                        created_at: new Date('2024-01-17').toISOString(),
                        updated_at: new Date('2024-01-17').toISOString(),
                        order_items: [
                            { product_name: 'VPN Premium', quantity: 1, price: 89000 }
                        ]
                    }
                ];
                localStorage.setItem('nestsian_orders', JSON.stringify(sampleOrders));
                return sampleOrders;
            }
            return orders;
        } catch (error) {
            console.error('Error getting local orders:', error);
            return [];
        }
    }

    saveLocalOrder(order) {
        try {
            const orders = this.getLocalOrders();
            let updatedOrder;
            
            if (order.id) {
                const index = orders.findIndex(o => o.id === order.id);
                if (index !== -1) {
                    orders[index] = order;
                    updatedOrder = orders[index];
                } else {
                    updatedOrder = { 
                        ...order, 
                        id: `NS-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${orders.length + 1}`,
                        created_at: new Date().toISOString()
                    };
                    orders.push(updatedOrder);
                }
            } else {
                updatedOrder = { 
                    ...order, 
                    id: `NS-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${orders.length + 1}`,
                    created_at: new Date().toISOString()
                };
                orders.push(updatedOrder);
            }
            
            localStorage.setItem('nestsian_orders', JSON.stringify(updatedOrder));
            return updatedOrder;
        } catch (error) {
            console.error('Error saving local order:', error);
            return order;
        }
    }

    getLocalCustomers() {
        try {
            const customers = JSON.parse(localStorage.getItem('nestsian_customers') || '[]');
            if (!customers.length) {
                const sampleCustomers = [
                    {
                        id: 1,
                        name: 'John Doe',
                        email: 'john.doe@example.com',
                        phone: '+628123456789',
                        address: 'Jl. Sudirman No. 123, Jakarta',
                        total_orders: 2,
                        total_spent: 263000,
                        is_active: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    },
                    {
                        id: 2,
                        name: 'Jane Smith',
                        email: 'jane.smith@example.com',
                        phone: '+628987654321',
                        address: 'Jl. Thamrin No. 456, Jakarta',
                        total_orders: 1,
                        total_spent: 499000,
                        is_active: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    },
                    {
                        id: 3,
                        name: 'Bob Johnson',
                        email: 'bob.johnson@example.com',
                        phone: '+628111223344',
                        address: 'Jl. Gatot Subroto No. 789, Bandung',
                        total_orders: 1,
                        total_spent: 104000,
                        is_active: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                ];
                localStorage.setItem('nestsian_customers', JSON.stringify(sampleCustomers));
                return sampleCustomers;
            }
            return customers;
        } catch (error) {
            console.error('Error getting local customers:', error);
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
                },
                system: {
                    name: 'NestSian',
                    logo: 'logo.jpg',
                    timezone: 'Asia/Jakarta',
                    currency: 'IDR'
                }
            };
            
            return { ...defaultSettings, ...settings };
        } catch (error) {
            console.error('Error getting local settings:', error);
            return defaultSettings;
        }
    }

    saveLocalSetting(key, value) {
        try {
            const settings = this.getLocalSettings();
            settings[key] = value;
            localStorage.setItem('nestsian_settings', JSON.stringify(settings));
        } catch (error) {
            console.error('Error saving local setting:', error);
        }
    }

    getLocalDashboardStats() {
        try {
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
        } catch (error) {
            console.error('Error getting local dashboard stats:', error);
            return {
                totalProducts: 0,
                todayOrders: 0,
                monthlyRevenue: 0,
                activeCustomers: 0
            };
        }
    }

    simulateTelegramNotification(order) {
        console.log('📱 Telegram Notification (Simulated):');
        console.log(`New Order: ${order.id}`);
        console.log(`Customer: ${order.customer_name}`);
        console.log(`Total: Rp ${order.total_amount?.toLocaleString() || '0'}`);
        console.log('---');
    }
}

// Initialize and export
window.supabaseService = new SupabaseService();
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
