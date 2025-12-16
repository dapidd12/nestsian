// Supabase Configuration for NestSian - COMPLETE VERSION
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
            
            // Check if supabase library is loaded
            if (typeof supabase === 'undefined') {
                console.warn('Supabase JS library not loaded, using fallback mode');
                this.setupFallbackMode();
                return;
            }
            
            // Create client
            this.supabase = supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);
            
            // Test connection with timeout
            const timeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Connection timeout')), 5000)
            );
            
            try {
                const { error } = await Promise.race([
                    this.supabase.from('products').select('id', { count: 'exact', head: true }),
                    timeout
                ]);
                
                if (error) {
                    console.warn('Supabase connection error:', error.message);
                    this.setupFallbackMode();
                    return;
                }
                
                this.initialized = true;
                console.log('Supabase connected successfully');
                
                // Check for existing session (Supabase Auth)
                const { data: { session } } = await this.supabase.auth.getSession();
                if (session) {
                    this.currentUser = {
                        id: session.user.id,
                        email: session.user.email,
                        role: this.getUserRole(session.user),
                        name: session.user.user_metadata?.name || session.user.email
                    };
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

    getUserRole(user) {
        // Check user role from metadata or email
        if (user.email === 'admin@nestsian.com') return 'superadmin';
        if (user.email === 'staff@nestsian.com') return 'staff';
        return user.user_metadata?.role || 'staff';
    }

    setupFallbackMode() {
        console.log('Setting up fallback mode...');
        
        this.supabase = {
            from: (table) => this.createMockQueryBuilder(table),
            auth: {
                signInWithPassword: (credentials) => this.mockSignIn(credentials),
                signOut: () => this.mockSignOut(),
                getSession: () => this.mockGetSession(),
                getUser: () => this.mockGetUser(),
                onAuthStateChange: (callback) => this.mockAuthStateChange(callback)
            },
            rpc: (fn, params) => this.mockRpc(fn, params)
        };
        
        this.initialized = false;
        console.log('Fallback mode activated');
    }

    createMockQueryBuilder(table) {
        return {
            select: (columns = '*', options = {}) => this.mockSelect(table, columns, options),
            insert: (data, options) => this.mockInsert(table, data, options),
            update: (data) => this.mockUpdate(table, data),
            delete: () => this.mockDelete(table),
            upsert: (data) => this.mockUpsert(table, data),
            eq: (column, value) => ({ 
                select: (columns = '*') => this.mockSelect(table, columns, { where: { [column]: value } }),
                update: (data) => this.mockUpdate(table, data, { [column]: value }),
                delete: () => this.mockDelete(table, { [column]: value })
            }),
            gt: (column, value) => ({ select: (columns = '*') => this.mockSelect(table, columns, { where: { [column]: { gt: value } } }) }),
            gte: (column, value) => ({ select: (columns = '*') => this.mockSelect(table, columns, { where: { [column]: { gte: value } } }) }),
            lt: (column, value) => ({ select: (columns = '*') => this.mockSelect(table, columns, { where: { [column]: { lt: value } } }) }),
            lte: (column, value) => ({ select: (columns = '*') => this.mockSelect(table, columns, { where: { [column]: { lte: value } } }) }),
            ilike: (column, pattern) => ({ select: (columns = '*') => this.mockSelect(table, columns, { where: { [column]: { ilike: pattern } } }) }),
            or: (conditions) => ({ select: (columns = '*') => this.mockSelect(table, columns, { where: conditions }) }),
            order: (column, { ascending = true } = {}) => ({ 
                select: (columns = '*') => this.mockSelect(table, columns, { order: { column, ascending } })
            }),
            limit: (count) => ({ 
                select: (columns = '*') => this.mockSelect(table, columns, { limit: count })
            }),
            range: (start, end) => ({
                select: (columns = '*') => this.mockSelect(table, columns, { range: [start, end] })
            })
        };
    }

    // ==================== AUTHENTICATION METHODS ====================
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
                
                this.currentUser = {
                    id: data.user.id,
                    email: data.user.email,
                    role: this.getUserRole(data.user),
                    name: data.user.user_metadata?.name || data.user.email
                };
                
                // Store in localStorage
                localStorage.setItem('nestsian_user', JSON.stringify({
                    user: this.currentUser,
                    timestamp: Date.now()
                }));
                
                console.log('Sign in successful via Supabase');
                return { success: true, user: this.currentUser };
                
            } catch (error) {
                console.error('Sign in exception:', error);
                return { success: false, error: 'Authentication error' };
            }
        } else {
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
                if (user) {
                    return {
                        id: user.id,
                        email: user.email,
                        role: this.getUserRole(user),
                        name: user.user_metadata?.name || user.email
                    };
                }
                return null;
            } catch (error) {
                console.error('Get user error:', error);
                return null;
            }
        }
        return this.currentUser;
    }

    // ==================== PRODUCT METHODS ====================
    async getProducts(filters = {}, page = 1, limit = 10) {
        try {
            if (this.initialized) {
                let query = this.supabase
                    .from('products')
                    .select('*, categories!inner(name, icon, description)', { count: 'exact' });
                
                // Apply filters
                if (filters.category_id) {
                    query = query.eq('category_id', filters.category_id);
                }
                
                if (filters.featured !== undefined) {
                    query = query.eq('featured', filters.featured);
                }
                
                if (filters.search) {
                    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
                }
                
                if (filters.stock_low) {
                    query = query.lte('stock', 5).gt('stock', 0);
                }
                
                if (filters.stock_out) {
                    query = query.eq('stock', 0);
                }
                
                if (filters.is_active !== undefined) {
                    query = query.eq('is_active', filters.is_active);
                }
                
                // Apply pagination
                const start = (page - 1) * limit;
                query = query.range(start, start + limit - 1);
                
                // Apply ordering
                query = query.order('created_at', { ascending: false });
                
                const { data, error, count } = await query;
                
                if (error) {
                    console.error('Supabase getProducts error:', error);
                    throw error;
                }
                
                // Transform data to match expected format
                const transformedData = (data || []).map(product => ({
                    ...product,
                    categories: product.categories ? {
                        name: product.categories.name,
                        icon: product.categories.icon,
                        description: product.categories.description
                    } : { name: 'Uncategorized', icon: 'fas fa-tag' }
                }));
                
                return {
                    data: transformedData,
                    total: count || 0,
                    page,
                    limit,
                    totalPages: Math.ceil((count || 0) / limit)
                };
                
            } else {
                return this.getLocalProducts(filters, page, limit);
            }
        } catch (error) {
            console.error('Error getting products:', error);
            return this.getLocalProducts(filters, page, limit);
        }
    }

    async getProductById(id) {
        try {
            if (this.initialized) {
                const { data, error } = await this.supabase
                    .from('products')
                    .select('*, categories(name, icon, description)')
                    .eq('id', id)
                    .single();
                
                if (error) throw error;
                
                // Transform data
                const product = {
                    ...data,
                    categories: data.categories ? {
                        name: data.categories.name,
                        icon: data.categories.icon,
                        description: data.categories.description
                    } : { name: 'Uncategorized', icon: 'fas fa-tag' }
                };
                
                return product;
                
            } else {
                return this.getLocalProductById(id);
            }
        } catch (error) {
            console.error('Error getting product by ID:', error);
            return this.getLocalProductById(id);
        }
    }

    async saveProduct(product) {
        try {
            if (this.initialized) {
                const productData = {
                    name: product.name,
                    category_id: product.category_id,
                    price: product.price,
                    stock: product.stock,
                    description: product.description,
                    image_url: product.image_url,
                    weight: product.weight || 0,
                    featured: product.featured || false,
                    is_active: product.is_active !== undefined ? product.is_active : true,
                    updated_at: new Date().toISOString()
                };
                
                // Add slug if not provided
                if (!product.slug && product.name) {
                    productData.slug = product.name.toLowerCase()
                        .replace(/[^\w\s]/gi, '')
                        .replace(/\s+/g, '-');
                }
                
                if (product.id) {
                    // Update existing product
                    const { data, error } = await this.supabase
                        .from('products')
                        .update(productData)
                        .eq('id', product.id)
                        .select()
                        .single();
                    
                    if (error) throw error;
                    
                    // Log inventory change if stock changed
                    if (product.stock !== undefined) {
                        await this.logInventoryChange(product.id, 'adjustment', product.stock);
                    }
                    
                    return data;
                } else {
                    // Insert new product
                    productData.created_at = new Date().toISOString();
                    
                    const { data, error } = await this.supabase
                        .from('products')
                        .insert([productData])
                        .select()
                        .single();
                    
                    if (error) throw error;
                    return data;
                }
                
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

    async updateProductStock(id, quantity, type = 'adjustment', notes = '') {
        try {
            const product = await this.getProductById(id);
            if (!product) throw new Error('Product not found');
            
            const newStock = Math.max(0, product.stock + quantity);
            
            if (this.initialized) {
                const { error } = await this.supabase
                    .from('products')
                    .update({ 
                        stock: newStock,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id);
                
                if (error) throw error;
                
                // Log inventory change
                await this.logInventoryChange(id, type, quantity, notes);
                
            } else {
                this.updateLocalProductStock(id, newStock);
            }
            
            return { success: true, newStock };
        } catch (error) {
            console.error('Error updating product stock:', error);
            return { success: false, error: error.message };
        }
    }

    // ==================== CATEGORY METHODS ====================
    async getCategories() {
        try {
            if (this.initialized) {
                const { data, error } = await this.supabase
                    .from('categories')
                    .select('*')
                    .order('sort_order')
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
                const categoryData = {
                    name: category.name,
                    icon: category.icon || 'fas fa-tag',
                    description: category.description,
                    sort_order: category.sort_order || 0,
                    is_active: category.is_active !== undefined ? category.is_active : true,
                    updated_at: new Date().toISOString()
                };
                
                if (category.id) {
                    const { data, error } = await this.supabase
                        .from('categories')
                        .update(categoryData)
                        .eq('id', category.id)
                        .select()
                        .single();
                    
                    if (error) throw error;
                    return data;
                } else {
                    categoryData.created_at = new Date().toISOString();
                    
                    const { data, error } = await this.supabase
                        .from('categories')
                        .insert([categoryData])
                        .select()
                        .single();
                    
                    if (error) throw error;
                    return data;
                }
                
            } else {
                return this.saveLocalCategory(category);
            }
        } catch (error) {
            console.error('Error saving category:', error);
            return this.saveLocalCategory(category);
        }
    }

    async deleteCategory(id) {
        try {
            if (this.initialized) {
                // Check if category has products
                const { data: products, error: productsError } = await this.supabase
                    .from('products')
                    .select('id')
                    .eq('category_id', id)
                    .limit(1);
                
                if (productsError) throw productsError;
                
                if (products && products.length > 0) {
                    return { 
                        success: false, 
                        error: 'Kategori memiliki produk. Pindahkan produk terlebih dahulu.' 
                    };
                }
                
                const { error } = await this.supabase
                    .from('categories')
                    .delete()
                    .eq('id', id);
                
                if (error) throw error;
                return { success: true };
                
            } else {
                this.deleteLocalCategory(id);
                return { success: true };
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            this.deleteLocalCategory(id);
            return { success: false, error: error.message };
        }
    }

    // ==================== ORDER METHODS ====================
    async getOrders(filters = {}, page = 1, limit = 10) {
        try {
            if (this.initialized) {
                let query = this.supabase
                    .from('orders')
                    .select('*, order_items(*, products(name, price, image_url))', { count: 'exact' });
                
                if (filters.order_status) {
                    query = query.eq('order_status', filters.order_status);
                }
                
                if (filters.payment_status) {
                    query = query.eq('payment_status', filters.payment_status);
                }
                
                if (filters.start_date && filters.end_date) {
                    query = query.gte('created_at', filters.start_date)
                               .lte('created_at', filters.end_date);
                }
                
                if (filters.search) {
                    query = query.or(`id.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,customer_email.ilike.%${filters.search}%`);
                }
                
                // Apply pagination
                const start = (page - 1) * limit;
                query = query.range(start, start + limit - 1);
                
                query = query.order('created_at', { ascending: false });
                
                const { data, error, count } = await query;
                
                if (error) throw error;
                
                return {
                    data: data || [],
                    total: count || 0,
                    page,
                    limit,
                    totalPages: Math.ceil((count || 0) / limit)
                };
                
            } else {
                return this.getLocalOrders(filters, page, limit);
            }
        } catch (error) {
            console.error('Error getting orders:', error);
            return this.getLocalOrders(filters, page, limit);
        }
    }

    async getOrderById(id) {
        try {
            if (this.initialized) {
                const { data, error } = await this.supabase
                    .from('orders')
                    .select('*, order_items(*, products(name, price, image_url))')
                    .eq('id', id)
                    .single();
                
                if (error) throw error;
                return data;
                
            } else {
                return this.getLocalOrderById(id);
            }
        } catch (error) {
            console.error('Error getting order by ID:', error);
            return this.getLocalOrderById(id);
        }
    }

    async saveOrder(order) {
        try {
            const orderData = {
                customer_name: order.customer_name,
                customer_email: order.customer_email,
                customer_phone: order.customer_phone,
                shipping_address: order.shipping_address,
                subtotal: order.subtotal || 0,
                shipping_cost: order.shipping_cost || 0,
                total_amount: order.total_amount,
                payment_method: order.payment_method || 'qris',
                payment_status: 'pending',
                order_status: 'pending',
                notes: order.notes || '',
                updated_at: new Date().toISOString()
            };
            
            if (this.initialized) {
                if (order.id) {
                    // Update existing order
                    const { data, error } = await this.supabase
                        .from('orders')
                        .update(orderData)
                        .eq('id', order.id)
                        .select()
                        .single();
                    
                    if (error) throw error;
                    return data;
                    
                } else {
                    // Create new order with auto-generated ID
                    orderData.created_at = new Date().toISOString();
                    
                    const { data, error } = await this.supabase
                        .from('orders')
                        .insert([orderData])
                        .select()
                        .single();
                    
                    if (error) throw error;
                    
                    // Save order items if provided
                    if (order.order_items && order.order_items.length > 0) {
                        const orderItems = order.order_items.map(item => ({
                            order_id: data.id,
                            product_id: item.product_id,
                            product_name: item.product_name || `Product ${item.product_id}`,
                            quantity: item.quantity,
                            unit_price: item.price,
                            total_price: item.quantity * item.price,
                            created_at: new Date().toISOString()
                        }));
                        
                        const { error: itemsError } = await this.supabase
                            .from('order_items')
                            .insert(orderItems);
                        
                        if (itemsError) throw itemsError;
                        
                        // Update product stock
                        for (const item of order.order_items) {
                            await this.updateProductStock(
                                item.product_id, 
                                -item.quantity, 
                                'out',
                                `Order ${data.id}`
                            );
                        }
                    }
                    
                    // Create QRIS transaction if payment method is QRIS
                    if (order.payment_method === 'qris') {
                        await this.createQrisTransaction(data.id, order.total_amount, orderData.customer_name);
                    }
                    
                    // Send Telegram notification
                    await this.sendTelegramNotification(data);
                    
                    // Update customer statistics
                    await this.updateCustomerStatistics(order.customer_email, order.total_amount);
                    
                    return data;
                }
                
            } else {
                return this.saveLocalOrder(order);
            }
        } catch (error) {
            console.error('Error saving order:', error);
            return this.saveLocalOrder(order);
        }
    }

    async updateOrderStatus(id, status, paymentStatus = null) {
        try {
            if (this.initialized) {
                const updateData = { 
                    order_status: status,
                    updated_at: new Date().toISOString()
                };
                
                if (paymentStatus) {
                    updateData.payment_status = paymentStatus;
                    
                    // If payment is paid, update paid_at
                    if (paymentStatus === 'paid') {
                        updateData.paid_at = new Date().toISOString();
                    }
                }
                
                // If order is cancelled, restore product stock
                if (status === 'cancelled') {
                    const order = await this.getOrderById(id);
                    if (order && order.order_items) {
                        for (const item of order.order_items) {
                            await this.updateProductStock(
                                item.product_id,
                                item.quantity,
                                'return',
                                `Order ${id} cancelled`
                            );
                        }
                    }
                }
                
                const { error } = await this.supabase
                    .from('orders')
                    .update(updateData)
                    .eq('id', id);
                
                if (error) throw error;
                return { success: true };
                
            } else {
                this.updateLocalOrderStatus(id, status);
                return { success: true };
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteOrder(id) {
        try {
            if (this.initialized) {
                // Delete order items first
                await this.supabase
                    .from('order_items')
                    .delete()
                    .eq('order_id', id);
                
                // Delete QRIS transaction if exists
                await this.supabase
                    .from('qris_transactions')
                    .delete()
                    .eq('order_id', id);
                
                // Delete order
                const { error } = await this.supabase
                    .from('orders')
                    .delete()
                    .eq('id', id);
                
                if (error) throw error;
                return { success: true };
                
            } else {
                this.deleteLocalOrder(id);
                return { success: true };
            }
        } catch (error) {
            console.error('Error deleting order:', error);
            this.deleteLocalOrder(id);
            return { success: false, error: error.message };
        }
    }

    // ==================== CUSTOMER METHODS ====================
    async getCustomers(filters = {}, page = 1, limit = 10) {
        try {
            if (this.initialized) {
                let query = this.supabase
                    .from('customers')
                    .select('*', { count: 'exact' });
                
                if (filters.search) {
                    query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
                }
                
                if (filters.is_active !== undefined) {
                    query = query.eq('is_active', filters.is_active);
                }
                
                // Apply pagination
                const start = (page - 1) * limit;
                query = query.range(start, start + limit - 1);
                
                query = query.order('created_at', { ascending: false });
                
                const { data, error, count } = await query;
                
                if (error) throw error;
                
                return {
                    data: data || [],
                    total: count || 0,
                    page,
                    limit,
                    totalPages: Math.ceil((count || 0) / limit)
                };
                
            } else {
                return this.getLocalCustomers(filters, page, limit);
            }
        } catch (error) {
            console.error('Error getting customers:', error);
            return this.getLocalCustomers(filters, page, limit);
        }
    }

    async saveCustomer(customer) {
        try {
            if (this.initialized) {
                const customerData = {
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                    address: customer.address,
                    city: customer.city,
                    company: customer.company,
                    is_active: customer.is_active !== undefined ? customer.is_active : true,
                    updated_at: new Date().toISOString()
                };
                
                if (customer.id) {
                    const { data, error } = await this.supabase
                        .from('customers')
                        .update(customerData)
                        .eq('id', customer.id)
                        .select()
                        .single();
                    
                    if (error) throw error;
                    return data;
                } else {
                    customerData.created_at = new Date().toISOString();
                    
                    const { data, error } = await this.supabase
                        .from('customers')
                        .insert([customerData])
                        .select()
                        .single();
                    
                    if (error) throw error;
                    return data;
                }
                
            } else {
                return this.saveLocalCustomer(customer);
            }
        } catch (error) {
            console.error('Error saving customer:', error);
            return this.saveLocalCustomer(customer);
        }
    }

    async updateCustomerStatistics(email, amount) {
        try {
            if (!email || !this.initialized) return;
            
            // Find customer by email
            const { data: customers, error } = await this.supabase
                .from('customers')
                .select('*')
                .eq('email', email)
                .limit(1);
            
            if (error) throw error;
            
            if (customers && customers.length > 0) {
                const customer = customers[0];
                const updatedData = {
                    total_orders: (customer.total_orders || 0) + 1,
                    total_spent: (customer.total_spent || 0) + amount,
                    last_order_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                
                await this.supabase
                    .from('customers')
                    .update(updatedData)
                    .eq('id', customer.id);
            }
        } catch (error) {
            console.error('Error updating customer statistics:', error);
        }
    }

    // ==================== QRIS METHODS ====================
    async createQrisTransaction(orderId, amount, description = '') {
        try {
            if (this.initialized) {
                const qrisString = this.generateDynamicQrisString(amount, description);
                const transactionId = `QRIS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                
                const transactionData = {
                    order_id: orderId,
                    transaction_id: transactionId,
                    qris_string: qrisString,
                    amount: amount,
                    merchant_name: 'NestSian Store',
                    merchant_id: 'ID.NESTSIAN.WWW',
                    description: description || `Payment for order ${orderId}`,
                    status: 'pending',
                    expiration_time: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
                    created_at: new Date().toISOString()
                };
                
                const { data, error } = await this.supabase
                    .from('qris_transactions')
                    .insert([transactionData])
                    .select()
                    .single();
                
                if (error) throw error;
                return data;
                
            } else {
                return { 
                    transaction_id: `MOCK-QRIS-${Date.now()}`,
                    qris_string: 'MOCK_QRIS_STRING',
                    status: 'pending' 
                };
            }
        } catch (error) {
            console.error('Error creating QRIS transaction:', error);
            throw error;
        }
    }

    generateDynamicQrisString(amount, description = '') {
        // Get QRIS settings
        const settings = this.getLocalSettings();
        const qrisSettings = settings.qris || {
            merchant_name: 'NestSian Store',
            merchant_id: 'ID.NESTSIAN.WWW',
            base_string: '00020101021126570011ID.DANA.WWW011893600915376904960002097690496000303UMI51440014ID.CO.QRIS.WWW0215ID10243512603270303UMI5204481453033605802ID5912NESTSIAN STORE6014JAKARTA SELATAN6105123456304'
        };
        
        // Format amount (13 digits)
        const formattedAmount = amount.toString().padStart(13, '0');
        
        // Generate dynamic QRIS string based on EMVCO standard
        const qrisData = [
            { id: '00', value: '01' }, // Payload Format Indicator
            { id: '01', value: '12' }, // Point of Initiation Method
            { id: '26', value: [ // Merchant Account Information
                { id: '00', value: 'id.co.bri' }, // GUID
                { id: '01', value: qrisSettings.merchant_id || 'ID.NESTSIAN.WWW' }
            ]},
            { id: '52', value: '0000' }, // Merchant Category Code
            { id: '53', value: '360' }, // Transaction Currency (IDR)
            { id: '54', value: formattedAmount }, // Transaction Amount
            { id: '58', value: 'ID' }, // Country Code
            { id: '59', value: qrisSettings.merchant_name || 'NestSian Store' }, // Merchant Name
            { id: '60', value: qrisSettings.city || 'Jakarta' }, // Merchant City
            { id: '61', value: qrisSettings.postal_code || '12345' } // Postal Code
        ];
        
        // Build QRIS string
        let qrisString = '';
        qrisData.forEach(field => {
            if (Array.isArray(field.value)) {
                let subValue = '';
                field.value.forEach(subField => {
                    subValue += subField.id.padStart(2, '0') + 
                               subField.value.length.toString().padStart(2, '0') + 
                               subField.value;
                });
                qrisString += field.id + subValue.length.toString().padStart(2, '0') + subValue;
            } else {
                qrisString += field.id + 
                            field.value.length.toString().padStart(2, '0') + 
                            field.value;
            }
        });
        
        // Add CRC
        qrisString += '6304';
        const crc = this.calculateCRC16(qrisString);
        return qrisString + crc;
    }

    calculateCRC16(str) {
        let crc = 0xFFFF;
        for (let i = 0; i < str.length; i++) {
            crc ^= str.charCodeAt(i) << 8;
            for (let j = 0; j < 8; j++) {
                crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
            }
        }
        return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    }

    // ==================== TELEGRAM NOTIFICATION ====================
    async sendTelegramNotification(order) {
        try {
            const settings = await this.getSettings();
            const telegramConfig = settings.telegram || {};
            
            if (!telegramConfig.enabled || !telegramConfig.bot_token || !telegramConfig.admin_chat_id) {
                console.log('Telegram notifications disabled');
                return;
            }
            
            const message = this.formatTelegramMessage(order);
            const url = `https://api.telegram.org/bot${telegramConfig.bot_token}/sendMessage`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chat_id: telegramConfig.admin_chat_id,
                    text: message,
                    parse_mode: 'HTML',
                    disable_web_page_preview: true
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to send Telegram notification:', errorText);
            } else {
                console.log('Telegram notification sent successfully');
            }
        } catch (error) {
            console.error('Error sending Telegram notification:', error);
        }
    }

    formatTelegramMessage(order) {
        const statusEmoji = {
            'pending': '⏳',
            'processing': '🔄',
            'delivered': '✅',
            'cancelled': '❌',
            'shipped': '🚚'
        };
        
        const emoji = statusEmoji[order.order_status] || '📦';
        
        return `
<b>${emoji} PESANAN BARU - NESTSIAN</b>

📦 <b>ID Pesanan:</b> <code>${order.id}</code>
👤 <b>Pelanggan:</b> ${order.customer_name}
📞 <b>Telepon:</b> ${order.customer_phone || 'N/A'}
📧 <b>Email:</b> ${order.customer_email || 'N/A'}

📍 <b>Alamat:</b>
${order.shipping_address || 'N/A'}

💰 <b>Total:</b> Rp ${(order.total_amount || 0).toLocaleString()}
💳 <b>Metode Bayar:</b> ${order.payment_method || 'QRIS'}
📝 <b>Status:</b> ${order.order_status || 'Pending'}

🕐 <b>Waktu:</b> ${new Date(order.created_at || Date.now()).toLocaleString('id-ID')}

<i>Segera proses pesanan ini!</i>
        `.trim();
    }

    // ==================== INVENTORY LOG METHODS ====================
    async logInventoryChange(productId, type, quantity, notes = '') {
        try {
            if (this.initialized) {
                const product = await this.getProductById(productId);
                if (!product) return;
                
                const previousStock = product.stock - quantity;
                const newStock = product.stock;
                
                const logData = {
                    product_id: productId,
                    type: type,
                    quantity: Math.abs(quantity),
                    previous_stock: previousStock,
                    new_stock: newStock,
                    notes: notes,
                    created_at: new Date().toISOString()
                };
                
                const { error } = await this.supabase
                    .from('inventory_logs')
                    .insert([logData]);
                
                if (error) console.error('Error logging inventory change:', error);
            }
        } catch (error) {
            console.error('Error in logInventoryChange:', error);
        }
    }

    // ==================== SETTINGS METHODS ====================
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
                        value: JSON.stringify(value),
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'key'
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

    // ==================== STATISTICS METHODS ====================
    async getDashboardStats() {
        try {
            if (this.initialized) {
                // Get total products
                const { count: totalProducts, error: productsError } = await this.supabase
                    .from('products')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_active', true);
                
                if (productsError) throw productsError;
                
                // Get today's orders
                const today = new Date().toISOString().split('T')[0];
                const { count: todayOrders, error: ordersError } = await this.supabase
                    .from('orders')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', `${today}T00:00:00`)
                    .lte('created_at', `${today}T23:59:59`);
                
                if (ordersError) throw ordersError;
                
                // Get monthly revenue
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);
                
                const { data: monthlyOrders, error: revenueError } = await this.supabase
                    .from('orders')
                    .select('total_amount, order_status')
                    .gte('created_at', startOfMonth.toISOString())
                    .eq('order_status', 'delivered');
                
                if (revenueError) throw revenueError;
                
                const monthlyRevenue = monthlyOrders?.reduce((sum, order) => {
                    return sum + (order.total_amount || 0);
                }, 0) || 0;
                
                // Get active customers (customers with orders in last 30 days)
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                
                const { data: recentOrders, error: customersError } = await this.supabase
                    .from('orders')
                    .select('customer_email')
                    .gte('created_at', thirtyDaysAgo.toISOString())
                    .eq('order_status', 'delivered');
                
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

    async getSalesChartData(days = 7) {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            if (this.initialized) {
                const { data, error } = await this.supabase
                    .from('orders')
                    .select('created_at, total_amount, order_status')
                    .gte('created_at', startDate.toISOString())
                    .lte('created_at', endDate.toISOString())
                    .eq('order_status', 'delivered')
                    .order('created_at', { ascending: true });
                
                if (error) throw error;
                
                // Group by date
                const salesByDate = {};
                data?.forEach(order => {
                    const date = order.created_at.split('T')[0];
                    if (!salesByDate[date]) {
                        salesByDate[date] = 0;
                    }
                    salesByDate[date] += order.total_amount || 0;
                });
                
                // Create array of dates
                const dates = [];
                const amounts = [];
                const currentDate = new Date(startDate);
                
                while (currentDate <= endDate) {
                    const dateStr = currentDate.toISOString().split('T')[0];
                    dates.push(dateStr);
                    amounts.push(salesByDate[dateStr] || 0);
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                
                return { dates, amounts };
                
            } else {
                return this.getLocalSalesChartData(days);
            }
        } catch (error) {
            console.error('Error getting sales chart data:', error);
            return this.getLocalSalesChartData(days);
        }
    }

    async getTopProducts(limit = 5) {
        try {
            if (this.initialized) {
                const { data, error } = await this.supabase
                    .from('order_items')
                    .select('product_id, quantity, products(name, price, image_url)')
                    .limit(limit)
                    .order('quantity', { ascending: false });
                
                if (error) throw error;
                
                // Group by product and sum quantities
                const productMap = {};
                data?.forEach(item => {
                    const productId = item.product_id;
                    if (!productMap[productId]) {
                        productMap[productId] = {
                            ...item.products,
                            total_quantity: 0
                        };
                    }
                    productMap[productId].total_quantity += item.quantity || 0;
                });
                
                const topProducts = Object.values(productMap)
                    .sort((a, b) => b.total_quantity - a.total_quantity)
                    .slice(0, limit);
                
                return topProducts;
                
            } else {
                return this.getLocalTopProducts(limit);
            }
        } catch (error) {
            console.error('Error getting top products:', error);
            return this.getLocalTopProducts(limit);
        }
    }

    // ==================== CONTACT MESSAGES ====================
    async getContactMessages(filters = {}, page = 1, limit = 10) {
        try {
            if (this.initialized) {
                let query = this.supabase
                    .from('contact_messages')
                    .select('*', { count: 'exact' });
                
                if (filters.status) {
                    query = query.eq('status', filters.status);
                }
                
                if (filters.search) {
                    query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,subject.ilike.%${filters.search}%`);
                }
                
                // Apply pagination
                const start = (page - 1) * limit;
                query = query.range(start, start + limit - 1);
                
                query = query.order('created_at', { ascending: false });
                
                const { data, error, count } = await query;
                
                if (error) throw error;
                
                return {
                    data: data || [],
                    total: count || 0,
                    page,
                    limit,
                    totalPages: Math.ceil((count || 0) / limit)
                };
                
            } else {
                return this.getLocalContactMessages(filters, page, limit);
            }
        } catch (error) {
            console.error('Error getting contact messages:', error);
            return this.getLocalContactMessages(filters, page, limit);
        }
    }

    async saveContactMessage(message) {
        try {
            if (this.initialized) {
                const { data, error } = await this.supabase
                    .from('contact_messages')
                    .insert([{
                        name: message.name,
                        email: message.email,
                        phone: message.phone || '',
                        subject: message.subject,
                        message: message.message,
                        status: 'unread',
                        created_at: new Date().toISOString()
                    }])
                    .select()
                    .single();
                
                if (error) throw error;
                return data;
                
            } else {
                return this.saveLocalContactMessage(message);
            }
        } catch (error) {
            console.error('Error saving contact message:', error);
            return this.saveLocalContactMessage(message);
        }
    }

    async markContactMessageAsRead(id) {
        try {
            if (this.initialized) {
                const { error } = await this.supabase
                    .from('contact_messages')
                    .update({ 
                        status: 'read',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id);
                
                if (error) throw error;
                return { success: true };
                
            } else {
                this.markLocalContactMessageAsRead(id);
                return { success: true };
            }
        } catch (error) {
            console.error('Error marking contact message as read:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteContactMessage(id) {
        try {
            if (this.initialized) {
                const { error } = await this.supabase
                    .from('contact_messages')
                    .delete()
                    .eq('id', id);
                
                if (error) throw error;
                return { success: true };
                
            } else {
                this.deleteLocalContactMessage(id);
                return { success: true };
            }
        } catch (error) {
            console.error('Error deleting contact message:', error);
            return { success: false, error: error.message };
        }
    }

    // ==================== MOCK METHODS FOR FALLBACK MODE ====================
    async mockSelect(table, columns = '*', options = {}) {
        return new Promise((resolve) => {
            setTimeout(() => {
                let data = this.getMockData(table);
                
                // Apply filters
                if (options.where) {
                    Object.keys(options.where).forEach(key => {
                        const condition = options.where[key];
                        
                        if (typeof condition === 'object') {
                            if (condition.gt !== undefined) {
                                data = data.filter(item => item[key] > condition.gt);
                            }
                            if (condition.gte !== undefined) {
                                data = data.filter(item => item[key] >= condition.gte);
                            }
                            if (condition.lt !== undefined) {
                                data = data.filter(item => item[key] < condition.lt);
                            }
                            if (condition.lte !== undefined) {
                                data = data.filter(item => item[key] <= condition.lte);
                            }
                            if (condition.ilike !== undefined) {
                                const pattern = condition.ilike.replace(/%/g, '.*');
                                const regex = new RegExp(pattern, 'i');
                                data = data.filter(item => regex.test(item[key]));
                            }
                        } else {
                            data = data.filter(item => item[key] === condition);
                        }
                    });
                }
                
                // Apply ordering
                if (options.order) {
                    const { column, ascending = true } = options.order;
                    data.sort((a, b) => {
                        if (a[column] < b[column]) return ascending ? -1 : 1;
                        if (a[column] > b[column]) return ascending ? 1 : -1;
                        return 0;
                    });
                }
                
                // Apply limit
                if (options.limit) {
                    data = data.slice(0, options.limit);
                }
                
                // Apply count option
                if (options.count === 'exact' && options.head === true) {
                    resolve({ count: data.length, error: null });
                    return;
                }
                
                // Apply range
                if (options.range) {
                    const [start, end] = options.range;
                    data = data.slice(start, end + 1);
                }
                
                resolve({ 
                    data, 
                    error: null,
                    count: data.length
                });
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
                
                this.saveToLocalStorage(table, mockResponse);
                
                if (options && options.select && options.select === 'single') {
                    resolve({ data: mockResponse, error: null });
                } else {
                    resolve({ data: [mockResponse], error: null });
                }
            }, 300);
        });
    }

    async mockUpdate(table, data, where = null) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockResponse = { 
                    ...data, 
                    updated_at: new Date().toISOString()
                };
                
                this.updateInLocalStorage(table, mockResponse, where);
                resolve({ data: [mockResponse], error: null });
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
                
                this.saveToLocalStorage(table, mockResponse);
                resolve({ data: mockResponse, error: null });
            }, 300);
        });
    }

    async mockDelete(table, where = null) {
        return new Promise((resolve) => {
            setTimeout(() => {
                this.deleteFromLocalStorage(table, where);
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

    async mockGetUser() {
        return new Promise((resolve) => {
            setTimeout(() => {
                const storedUser = localStorage.getItem('nestsian_user');
                const user = storedUser ? JSON.parse(storedUser).user : null;
                resolve({ data: { user }, error: null });
            }, 100);
        });
    }

    mockAuthStateChange(callback) {
        setTimeout(() => {
            const storedUser = localStorage.getItem('nestsian_user');
            if (storedUser) {
                const { user } = JSON.parse(storedUser);
                callback('SIGNED_IN', { user });
            } else {
                callback('SIGNED_OUT', null);
            }
        }, 1000);
        
        return () => {};
    }

    // ==================== LOCAL STORAGE HELPERS ====================
    saveToLocalStorage(table, data) {
        const key = `nestsian_${table}`;
        const items = JSON.parse(localStorage.getItem(key) || '[]');
        
        if (data.id) {
            const index = items.findIndex(item => item.id === data.id);
            if (index !== -1) {
                items[index] = { ...items[index], ...data };
            } else {
                items.push(data);
            }
        } else {
            items.push({ ...data, id: Date.now() });
        }
        
        localStorage.setItem(key, JSON.stringify(items));
    }

    updateInLocalStorage(table, data, where = null) {
        const key = `nestsian_${table}`;
        const items = JSON.parse(localStorage.getItem(key) || '[]');
        
        if (where) {
            const keyName = Object.keys(where)[0];
            const value = where[keyName];
            const index = items.findIndex(item => item[keyName] === value);
            
            if (index !== -1) {
                items[index] = { ...items[index], ...data };
            }
        } else if (data.id) {
            const index = items.findIndex(item => item.id === data.id);
            if (index !== -1) {
                items[index] = { ...items[index], ...data };
            }
        }
        
        localStorage.setItem(key, JSON.stringify(items));
    }

    deleteFromLocalStorage(table, where = null) {
        const key = `nestsian_${table}`;
        let items = JSON.parse(localStorage.getItem(key) || '[]');
        
        if (where) {
            const keyName = Object.keys(where)[0];
            const value = where[keyName];
            items = items.filter(item => item[keyName] !== value);
        } else {
            items = [];
        }
        
        localStorage.setItem(key, JSON.stringify(items));
    }

    getMockData(table) {
        const mockData = {
            products: this.getLocalProducts().data,
            categories: this.getLocalCategories(),
            orders: this.getLocalOrders().data,
            customers: this.getLocalCustomers().data,
            settings: Object.entries(this.getLocalSettings()).map(([key, value]) => ({
                key,
                value: JSON.stringify(value)
            })),
            contact_messages: this.getLocalContactMessages().data,
            order_items: this.getLocalOrderItems(),
            qris_transactions: this.getLocalQrisTransactions()
        };

        return mockData[table] || [];
    }

    // ==================== LOCAL STORAGE METHODS ====================
    getLocalProducts(filters = {}, page = 1, limit = 10) {
        try {
            const products = JSON.parse(localStorage.getItem('nestsian_products') || '[]');
            let filteredProducts = [...products];
            
            // Apply filters
            if (filters.category_id) {
                filteredProducts = filteredProducts.filter(p => p.category_id == filters.category_id);
            }
            
            if (filters.featured !== undefined) {
                filteredProducts = filteredProducts.filter(p => p.featured == filters.featured);
            }
            
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                filteredProducts = filteredProducts.filter(p => 
                    p.name.toLowerCase().includes(searchTerm) || 
                    p.description.toLowerCase().includes(searchTerm)
                );
            }
            
            if (filters.stock_low) {
                filteredProducts = filteredProducts.filter(p => p.stock <= 5 && p.stock > 0);
            }
            
            if (filters.stock_out) {
                filteredProducts = filteredProducts.filter(p => p.stock === 0);
            }
            
            if (filters.is_active !== undefined) {
                filteredProducts = filteredProducts.filter(p => p.is_active == filters.is_active);
            }
            
            // Apply pagination
            const start = (page - 1) * limit;
            const end = start + limit;
            const paginatedProducts = filteredProducts.slice(start, end);
            
            // Get categories for each product
            const categories = this.getLocalCategories();
            paginatedProducts.forEach(product => {
                const category = categories.find(c => c.id == product.category_id);
                product.categories = category || { name: 'Uncategorized', icon: 'fas fa-tag' };
            });
            
            return {
                data: paginatedProducts,
                total: filteredProducts.length,
                page,
                limit,
                totalPages: Math.ceil(filteredProducts.length / limit)
            };
            
        } catch (error) {
            console.error('Error getting local products:', error);
            return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
        }
    }

    getLocalProductById(id) {
        try {
            const products = JSON.parse(localStorage.getItem('nestsian_products') || '[]');
            const product = products.find(p => p.id == id);
            
            if (product) {
                const categories = this.getLocalCategories();
                const category = categories.find(c => c.id == product.category_id);
                product.categories = category || { name: 'Uncategorized', icon: 'fas fa-tag' };
            }
            
            return product;
        } catch (error) {
            console.error('Error getting local product by ID:', error);
            return null;
        }
    }

    saveLocalProduct(product) {
        try {
            const products = JSON.parse(localStorage.getItem('nestsian_products') || '[]');
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
                    updated_at: new Date().toISOString(),
                    is_active: true
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
            const products = JSON.parse(localStorage.getItem('nestsian_products') || '[]');
            const updatedProducts = products.filter(p => p.id !== id);
            localStorage.setItem('nestsian_products', JSON.stringify(updatedProducts));
        } catch (error) {
            console.error('Error deleting local product:', error);
        }
    }

    updateLocalProductStock(id, newStock) {
        try {
            const products = JSON.parse(localStorage.getItem('nestsian_products') || '[]');
            const index = products.findIndex(p => p.id == id);
            
            if (index !== -1) {
                products[index].stock = newStock;
                products[index].updated_at = new Date().toISOString();
                localStorage.setItem('nestsian_products', JSON.stringify(products));
            }
        } catch (error) {
            console.error('Error updating local product stock:', error);
        }
    }

    getLocalCategories() {
        try {
            const categories = JSON.parse(localStorage.getItem('nestsian_categories') || '[]');
            if (!categories.length) {
                const sampleCategories = [
                    { id: 1, name: 'Security', icon: 'fas fa-shield-alt', description: 'Security products and solutions', sort_order: 1, is_active: true },
                    { id: 2, name: 'Networking', icon: 'fas fa-network-wired', description: 'Networking equipment and infrastructure', sort_order: 2, is_active: true },
                    { id: 3, name: 'Software', icon: 'fas fa-code', description: 'Software applications and tools', sort_order: 3, is_active: true },
                    { id: 4, name: 'Hardware', icon: 'fas fa-server', description: 'Hardware devices and equipment', sort_order: 4, is_active: true },
                    { id: 5, name: 'Service', icon: 'fas fa-concierge-bell', description: 'Professional services and support', sort_order: 5, is_active: true }
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
                    categories[index] = { ...categories[index], ...category };
                    updatedCategory = categories[index];
                } else {
                    updatedCategory = { ...category, id: Date.now(), is_active: true };
                    categories.push(updatedCategory);
                }
            } else {
                updatedCategory = { ...category, id: Date.now(), is_active: true };
                categories.push(updatedCategory);
            }
            
            localStorage.setItem('nestsian_categories', JSON.stringify(categories));
            return updatedCategory;
        } catch (error) {
            console.error('Error saving local category:', error);
            return category;
        }
    }

    deleteLocalCategory(id) {
        try {
            const categories = this.getLocalCategories();
            const updatedCategories = categories.filter(c => c.id !== id);
            localStorage.setItem('nestsian_categories', JSON.stringify(updatedCategories));
        } catch (error) {
            console.error('Error deleting local category:', error);
        }
    }

    getLocalOrders(filters = {}, page = 1, limit = 10) {
        try {
            const orders = JSON.parse(localStorage.getItem('nestsian_orders') || '[]');
            let filteredOrders = [...orders];
            
            // Apply filters
            if (filters.order_status) {
                filteredOrders = filteredOrders.filter(o => o.order_status === filters.order_status);
            }
            
            if (filters.payment_status) {
                filteredOrders = filteredOrders.filter(o => o.payment_status === filters.payment_status);
            }
            
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                filteredOrders = filteredOrders.filter(o => 
                    o.id.toLowerCase().includes(searchTerm) ||
                    o.customer_name.toLowerCase().includes(searchTerm) ||
                    o.customer_email.toLowerCase().includes(searchTerm)
                );
            }
            
            if (filters.start_date && filters.end_date) {
                filteredOrders = filteredOrders.filter(o => {
                    const orderDate = new Date(o.created_at);
                    const startDate = new Date(filters.start_date);
                    const endDate = new Date(filters.end_date);
                    return orderDate >= startDate && orderDate <= endDate;
                });
            }
            
            // Apply pagination
            const start = (page - 1) * limit;
            const end = start + limit;
            const paginatedOrders = filteredOrders.slice(start, end);
            
            return {
                data: paginatedOrders,
                total: filteredOrders.length,
                page,
                limit,
                totalPages: Math.ceil(filteredOrders.length / limit)
            };
        } catch (error) {
            console.error('Error getting local orders:', error);
            return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
        }
    }

    getLocalOrderById(id) {
        try {
            const orders = JSON.parse(localStorage.getItem('nestsian_orders') || '[]');
            return orders.find(o => o.id === id);
        } catch (error) {
            console.error('Error getting local order by ID:', error);
            return null;
        }
    }

    saveLocalOrder(order) {
        try {
            const orders = JSON.parse(localStorage.getItem('nestsian_orders') || '[]');
            let updatedOrder;
            
            if (order.id) {
                const index = orders.findIndex(o => o.id === order.id);
                if (index !== -1) {
                    orders[index] = { ...orders[index], ...order };
                    updatedOrder = orders[index];
                } else {
                    updatedOrder = { 
                        ...order, 
                        id: order.id,
                        created_at: order.created_at || new Date().toISOString(),
                        order_status: 'pending',
                        payment_status: 'pending'
                    };
                    orders.push(updatedOrder);
                }
            } else {
                updatedOrder = { 
                    ...order, 
                    id: `NS-${Date.now()}`,
                    created_at: new Date().toISOString(),
                    order_status: 'pending',
                    payment_status: 'pending'
                };
                orders.push(updatedOrder);
            }
            
            localStorage.setItem('nestsian_orders', JSON.stringify(orders));
            
            return updatedOrder;
        } catch (error) {
            console.error('Error saving local order:', error);
            return order;
        }
    }

    updateLocalOrderStatus(id, status) {
        try {
            const orders = JSON.parse(localStorage.getItem('nestsian_orders') || '[]');
            const index = orders.findIndex(o => o.id === id);
            
            if (index !== -1) {
                orders[index].order_status = status;
                orders[index].updated_at = new Date().toISOString();
                localStorage.setItem('nestsian_orders', JSON.stringify(orders));
            }
        } catch (error) {
            console.error('Error updating local order status:', error);
        }
    }

    deleteLocalOrder(id) {
        try {
            const orders = JSON.parse(localStorage.getItem('nestsian_orders') || '[]');
            const updatedOrders = orders.filter(o => o.id !== id);
            localStorage.setItem('nestsian_orders', JSON.stringify(updatedOrders));
        } catch (error) {
            console.error('Error deleting local order:', error);
        }
    }

    getLocalOrderItems() {
        try {
            return JSON.parse(localStorage.getItem('nestsian_order_items') || '[]');
        } catch (error) {
            console.error('Error getting local order items:', error);
            return [];
        }
    }

    getLocalCustomers(filters = {}, page = 1, limit = 10) {
        try {
            const customers = JSON.parse(localStorage.getItem('nestsian_customers') || '[]');
            let filteredCustomers = [...customers];
            
            // Apply filters
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                filteredCustomers = filteredCustomers.filter(c => 
                    c.name.toLowerCase().includes(searchTerm) ||
                    c.email.toLowerCase().includes(searchTerm) ||
                    c.phone.toLowerCase().includes(searchTerm)
                );
            }
            
            if (filters.is_active !== undefined) {
                filteredCustomers = filteredCustomers.filter(c => c.is_active == filters.is_active);
            }
            
            // Apply pagination
            const start = (page - 1) * limit;
            const end = start + limit;
            const paginatedCustomers = filteredCustomers.slice(start, end);
            
            return {
                data: paginatedCustomers,
                total: filteredCustomers.length,
                page,
                limit,
                totalPages: Math.ceil(filteredCustomers.length / limit)
            };
        } catch (error) {
            console.error('Error getting local customers:', error);
            return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
        }
    }

    saveLocalCustomer(customer) {
        try {
            const customers = JSON.parse(localStorage.getItem('nestsian_customers') || '[]');
            let updatedCustomer;
            
            if (customer.id) {
                const index = customers.findIndex(c => c.id === customer.id);
                if (index !== -1) {
                    customers[index] = { ...customers[index], ...customer };
                    updatedCustomer = customers[index];
                } else {
                    updatedCustomer = { ...customer, id: Date.now(), is_active: true };
                    customers.push(updatedCustomer);
                }
            } else {
                updatedCustomer = { ...customer, id: Date.now(), is_active: true };
                customers.push(updatedCustomer);
            }
            
            localStorage.setItem('nestsian_customers', JSON.stringify(customers));
            return updatedCustomer;
        } catch (error) {
            console.error('Error saving local customer:', error);
            return customer;
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
                telegram: {
                    enabled: false,
                    bot_token: '7810718543:AAH1GgEVfJ2Un4mqjZXDk1H1fLFKXPqorP8',
                    admin_chat_id: '5448509135'
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
                },
                hero: {
                    title: 'Keamanan Digital Terdepan untuk Bisnis Anda',
                    subtitle: 'NestSian menyediakan solusi keamanan dan teknologi modern untuk melindungi aset digital bisnis Anda.',
                    button1: 'Lihat Produk',
                    button2: 'Hubungi Kami',
                    features: [
                        { name: 'Keamanan Tingkat Tinggi', icon: 'fas fa-shield-alt' },
                        { name: 'Perform Optimal', icon: 'fas fa-bolt' },
                        { name: 'Support 24/7', icon: 'fas fa-headset' },
                        { name: 'Monitoring Real-time', icon: 'fas fa-chart-line' }
                    ]
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
            const products = this.getLocalProducts().data;
            const orders = this.getLocalOrders().data;
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
                           order.order_status === 'delivered';
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

    getLocalSalesChartData(days = 7) {
        try {
            const orders = this.getLocalOrders().data;
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            const salesByDate = {};
            orders.forEach(order => {
                if (order.order_status === 'delivered') {
                    const orderDate = new Date(order.created_at);
                    if (orderDate >= startDate && orderDate <= endDate) {
                        const dateStr = orderDate.toISOString().split('T')[0];
                        if (!salesByDate[dateStr]) {
                            salesByDate[dateStr] = 0;
                        }
                        salesByDate[dateStr] += order.total_amount || 0;
                    }
                }
            });
            
            const dates = [];
            const amounts = [];
            const currentDate = new Date(startDate);
            
            while (currentDate <= endDate) {
                const dateStr = currentDate.toISOString().split('T')[0];
                dates.push(dateStr);
                amounts.push(salesByDate[dateStr] || 0);
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            return { dates, amounts };
        } catch (error) {
            console.error('Error getting local sales chart data:', error);
            return { dates: [], amounts: [] };
        }
    }

    getLocalTopProducts(limit = 5) {
        try {
            const orderItems = this.getLocalOrderItems();
            const products = this.getLocalProducts().data;
            
            const productSales = {};
            orderItems.forEach(item => {
                if (!productSales[item.product_id]) {
                    productSales[item.product_id] = 0;
                }
                productSales[item.product_id] += item.quantity || 0;
            });
            
            const topProducts = Object.keys(productSales)
                .map(productId => {
                    const product = products.find(p => p.id == productId);
                    return {
                        ...product,
                        total_quantity: productSales[productId]
                    };
                })
                .sort((a, b) => b.total_quantity - a.total_quantity)
                .slice(0, limit);
            
            return topProducts;
        } catch (error) {
            console.error('Error getting local top products:', error);
            return [];
        }
    }

    getLocalContactMessages(filters = {}, page = 1, limit = 10) {
        try {
            const messages = JSON.parse(localStorage.getItem('nestsian_contact_messages') || '[]');
            let filteredMessages = [...messages];
            
            if (filters.status) {
                filteredMessages = filteredMessages.filter(m => m.status == filters.status);
            }
            
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                filteredMessages = filteredMessages.filter(m => 
                    m.name.toLowerCase().includes(searchTerm) ||
                    m.email.toLowerCase().includes(searchTerm) ||
                    m.subject.toLowerCase().includes(searchTerm)
                );
            }
            
            const start = (page - 1) * limit;
            const end = start + limit;
            const paginatedMessages = filteredMessages.slice(start, end);
            
            return {
                data: paginatedMessages,
                total: filteredMessages.length,
                page,
                limit,
                totalPages: Math.ceil(filteredMessages.length / limit)
            };
        } catch (error) {
            console.error('Error getting local contact messages:', error);
            return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
        }
    }

    saveLocalContactMessage(message) {
        try {
            const messages = JSON.parse(localStorage.getItem('nestsian_contact_messages') || '[]');
            const newMessage = {
                ...message,
                id: Date.now(),
                created_at: new Date().toISOString(),
                status: 'unread'
            };
            messages.push(newMessage);
            localStorage.setItem('nestsian_contact_messages', JSON.stringify(messages));
            return newMessage;
        } catch (error) {
            console.error('Error saving local contact message:', error);
            return message;
        }
    }

    markLocalContactMessageAsRead(id) {
        try {
            const messages = JSON.parse(localStorage.getItem('nestsian_contact_messages') || '[]');
            const index = messages.findIndex(m => m.id == id);
            if (index !== -1) {
                messages[index].status = 'read';
                localStorage.setItem('nestsian_contact_messages', JSON.stringify(messages));
            }
        } catch (error) {
            console.error('Error marking local contact message as read:', error);
        }
    }

    deleteLocalContactMessage(id) {
        try {
            const messages = JSON.parse(localStorage.getItem('nestsian_contact_messages') || '[]');
            const updatedMessages = messages.filter(m => m.id !== id);
            localStorage.setItem('nestsian_contact_messages', JSON.stringify(updatedMessages));
        } catch (error) {
            console.error('Error deleting local contact message:', error);
        }
    }

    getLocalQrisTransactions() {
        try {
            return JSON.parse(localStorage.getItem('nestsian_qris_transactions') || '[]');
        } catch (error) {
            console.error('Error getting local QRIS transactions:', error);
            return [];
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