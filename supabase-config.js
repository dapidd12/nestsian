// Supabase Configuration for NestSian
class SupabaseService {
    constructor() {
        this.supabase = null;
        this.initialized = false;
        this.init();
    }

    async init() {
        try {
            // Supabase configuration
            const supabaseUrl = 'https://lnqyomaylfxpignwgssr.supabase.co';
            const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxucXlvbWF5bGZ4cGlnbndnc3NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3OTUxMzgsImV4cCI6MjA4MTM3MTEzOH0.SNkjGvBIaPUqwyocgxMHnCgIBr-0ri0qay_hUrBkCpk';
            
            // Check if Supabase is available
            if (typeof supabase !== 'undefined') {
                this.supabase = supabase.createClient(supabaseUrl, supabaseKey);
                this.initialized = true;
                console.log('Supabase initialized successfully');
            } else {
                console.warn('Supabase not available, running in offline mode');
                this.setupOfflineMode();
            }
        } catch (error) {
            console.error('Error initializing Supabase:', error);
            this.setupOfflineMode();
        }
    }

    setupOfflineMode() {
        // Create mock Supabase functions for offline mode
        this.supabase = {
            from: (table) => ({
                select: () => this.mockSelect(table),
                insert: (data) => this.mockInsert(table, data),
                update: (data) => this.mockUpdate(table, data),
                delete: () => this.mockDelete(table),
                upsert: (data) => this.mockUpsert(table, data)
            }),
            auth: {
                signIn: () => Promise.resolve({ data: { user: { id: 1, email: 'admin@nestsian.com' } }, error: null }),
                signOut: () => Promise.resolve({ error: null })
            }
        };
        this.initialized = false;
    }

    async mockSelect(table) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const data = this.getMockData(table);
                resolve({ data, error: null });
            }, 500);
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
            }, 500);
        });
    }

    async mockUpdate(table, data) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ data: [data], error: null });
            }, 500);
        });
    }

    async mockDelete(table) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ data: [], error: null });
            }, 500);
        });
    }

    async mockUpsert(table, data) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockResponse = { 
                    id: data.id || Date.now(),
                    ...data,
                    updated_at: new Date().toISOString()
                };
                resolve({ data: [mockResponse], error: null });
            }, 500);
        });
    }

    getMockData(table) {
        const mockData = {
            products: [
                {
                    id: 1,
                    name: 'Security Panel Basic',
                    description: 'Basic security panel for small businesses',
                    price: 149000,
                    stock: 15,
                    category_id: 1,
                    image_url: 'https://via.placeholder.com/300',
                    weight: 500,
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T00:00:00Z'
                },
                {
                    id: 2,
                    name: 'Enterprise Firewall',
                    description: 'Advanced firewall solution for enterprises',
                    price: 499000,
                    stock: 8,
                    category_id: 2,
                    image_url: 'https://via.placeholder.com/300',
                    weight: 1500,
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T00:00:00Z'
                }
            ],
            categories: [
                { id: 1, name: 'Security', icon: 'fas fa-shield-alt', description: 'Security products' },
                { id: 2, name: 'Networking', icon: 'fas fa-network-wired', description: 'Networking equipment' }
            ],
            orders: [
                {
                    id: 'NS-001',
                    customer_name: 'John Doe',
                    customer_email: 'john@example.com',
                    customer_phone: '+628123456789',
                    total_amount: 149000,
                    status: 'completed',
                    payment_method: 'QRIS',
                    created_at: new Date().toISOString(),
                    items: [
                        { product_id: 1, quantity: 1, price: 149000 }
                    ]
                }
            ],
            settings: [
                {
                    key: 'qris_settings',
                    value: JSON.stringify({
                        merchant_name: 'NestSian Store',
                        merchant_id: 'ID.NESTSIAN.WWW',
                        city: 'Jakarta',
                        postal_code: '12345',
                        base_string: '00020101021126570011ID.DANA.WWW011893600915376904960002097690496000303UMI51440014ID.CO.QRIS.WWW0215ID10243512603270303UMI5204481453033605802ID5912NESTSIAN STORE6014JAKARTA SELATAN6105123456304'
                    })
                },
                {
                    key: 'maintenance_mode',
                    value: JSON.stringify({
                        enabled: false,
                        message: 'Sistem sedang dalam pemeliharaan',
                        eta: null
                    })
                }
            ]
        };

        return mockData[table] || [];
    }

    // Public methods
    async getProducts() {
        if (this.initialized) {
            const { data, error } = await this.supabase
                .from('products')
                .select('*');
            
            if (error) throw error;
            return data;
        } else {
            const { data } = await this.mockSelect('products');
            return data;
        }
    }

    async saveProduct(product) {
        if (this.initialized) {
            const { data, error } = await this.supabase
                .from('products')
                .upsert(product);
            
            if (error) throw error;
            return data;
        } else {
            const { data } = await this.mockUpsert('products', product);
            return data;
        }
    }

    async deleteProduct(id) {
        if (this.initialized) {
            const { error } = await this.supabase
                .from('products')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
        } else {
            await this.mockDelete('products');
        }
    }

    async getCategories() {
        if (this.initialized) {
            const { data, error } = await this.supabase
                .from('categories')
                .select('*');
            
            if (error) throw error;
            return data;
        } else {
            const { data } = await this.mockSelect('categories');
            return data;
        }
    }

    async saveCategory(category) {
        if (this.initialized) {
            const { data, error } = await this.supabase
                .from('categories')
                .upsert(category);
            
            if (error) throw error;
            return data;
        } else {
            const { data } = await this.mockUpsert('categories', category);
            return data;
        }
    }

    async getOrders() {
        if (this.initialized) {
            const { data, error } = await this.supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data;
        } else {
            const { data } = await this.mockSelect('orders');
            return data;
        }
    }

    async saveOrder(order) {
        if (this.initialized) {
            const { data, error } = await this.supabase
                .from('orders')
                .upsert(order);
            
            if (error) throw error;
            
            // Send Telegram notification if enabled
            await this.sendTelegramNotification(order);
            
            return data;
        } else {
            const { data } = await this.mockUpsert('orders', order);
            
            // Simulate Telegram notification
            this.simulateTelegramNotification(order);
            
            return data;
        }
    }

    async getSettings() {
        if (this.initialized) {
            const { data, error } = await this.supabase
                .from('settings')
                .select('*');
            
            if (error) throw error;
            return data;
        } else {
            const { data } = await this.mockSelect('settings');
            return data;
        }
    }

    async saveSetting(key, value) {
        if (this.initialized) {
            const { data, error } = await this.supabase
                .from('settings')
                .upsert({ key, value: JSON.stringify(value) });
            
            if (error) throw error;
            return data;
        } else {
            const { data } = await this.mockUpsert('settings', { key, value: JSON.stringify(value) });
            return data;
        }
    }

    async sendTelegramNotification(order) {
        const telegramConfig = CONFIG.TELEGRAM;
        
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
💳 *Total:* Rp ${order.total_amount.toLocaleString()}
🔧 *Status:* ${order.status}
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

    simulateTelegramNotification(order) {
        console.log('📱 Telegram Notification (Simulated):');
        console.log(`New Order: ${order.id}`);
        console.log(`Customer: ${order.customer_name}`);
        console.log(`Total: Rp ${order.total_amount.toLocaleString()}`);
    }
}

// Initialize and export
window.supabaseService = new SupabaseService();