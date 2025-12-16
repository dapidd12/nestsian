// NestSian - Main Application Logic (FULLY FIXED VERSION)
class NestSian {
    constructor() {
        this.currentEditingProductId = null;
        this.currentEditingCategoryId = null;
        this.supabaseService = null;
        this.currentUser = null;
        this.qrCountdownInterval = null;
        this.currentCart = [];
        this.currentProductPage = 1;
        this.currentOrderPage = 1;
        this.currentCustomerPage = 1;
        this.currentProducts = [];
        this.currentOrders = [];
        this.currentCustomers = [];
        this.productsPerPage = 10;
        this.ordersPerPage = 10;
        this.customersPerPage = 10;
        this.chart = null;
        this.isOnline = true;
        this.init();
    }

    async init() {
        console.log('Initializing NestSian application...');
        
        // Initialize AOS if available
        if (typeof AOS !== 'undefined') {
            AOS.init({
                duration: 600,
                once: true,
                offset: 100
            });
        }
        
        // Initialize Supabase Service
        this.supabaseService = window.supabaseService;
        
        // Set loading timeout
        const loadingTimeout = setTimeout(() => {
            console.log('Loading timeout reached, showing frontend');
            this.hideLoading();
        }, 5000);
        
        // Check for existing session
        await this.checkExistingSession();
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Start real-time clock
        this.startClock();
        
        // Load cart from localStorage
        this.loadCart();
        
        // Wait for services to initialize
        const initInterval = setInterval(() => {
            if (this.supabaseService) {
                clearInterval(initInterval);
                clearTimeout(loadingTimeout);
                
                // Check online status
                this.isOnline = this.supabaseService.initialized;
                console.log('Online status:', this.isOnline);
                
                // Load initial data
                this.loadInitialData().then(() => {
                    this.hideLoading();
                }).catch(error => {
                    console.error('Error loading initial data:', error);
                    this.hideLoading();
                });
            }
        }, 100);
    }
    
    hideLoading() {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        // Show frontend if not logged in
        const frontendElement = document.getElementById('frontend');
        const mainLayoutElement = document.getElementById('mainLayout');
        
        if (this.currentUser) {
            if (frontendElement) frontendElement.classList.add('hidden');
            if (mainLayoutElement) mainLayoutElement.classList.remove('hidden');
        } else {
            if (frontendElement) frontendElement.classList.remove('hidden');
            if (mainLayoutElement) mainLayoutElement.classList.add('hidden');
            this.loadFrontendProducts();
        }
    }

    async checkExistingSession() {
        try {
            // Check localStorage for existing session
            const storedUser = localStorage.getItem('nestsian_user');
            if (storedUser) {
                const { user, timestamp } = JSON.parse(storedUser);
                // Check if session is not expired (24 hours)
                if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
                    this.currentUser = user;
                    console.log('User session restored from localStorage:', user.email);
                } else {
                    localStorage.removeItem('nestsian_user');
                    console.log('User session expired');
                }
            }
            
            // Check Supabase session if available
            if (this.supabaseService?.initialized) {
                const user = await this.supabaseService.getCurrentUser();
                if (user) {
                    this.currentUser = user;
                    console.log('User session found in Supabase:', user.email);
                }
            }
        } catch (error) {
            console.error('Error checking session:', error);
        }
    }

    async loadInitialData() {
        try {
            console.log('Loading initial data...');
            
            // Only load dashboard data if user is logged in
            if (this.currentUser) {
                await this.loadDashboardStats();
                await this.loadProducts();
                await this.loadCategories();
                await this.loadOrders();
                await this.loadQrisSettings();
                await this.loadCustomers();
                await this.loadSettings();
            }
            
            // Always load frontend products
            await this.loadFrontendProducts();
            
            console.log('Initial data loaded successfully');
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Gagal memuat data awal');
        }
    }

    initEventListeners() {
        console.log('Initializing event listeners...');
        
        // Frontend Events
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                document.getElementById('loginModal').classList.remove('hidden');
            });
        }
        
        const cartBtn = document.getElementById('cartBtn');
        if (cartBtn) {
            cartBtn.addEventListener('click', () => this.showCartModal());
        }
        
        const loadMoreProducts = document.getElementById('loadMoreProducts');
        if (loadMoreProducts) {
            loadMoreProducts.addEventListener('click', () => this.loadMoreFrontendProducts());
        }
        
        // Contact Form
        const contactForm = document.getElementById('contactForm');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => this.handleContactSubmit(e));
        }
        
        // Login Form
        const loginSubmit = document.getElementById('loginSubmit');
        if (loginSubmit) {
            loginSubmit.addEventListener('click', (e) => this.handleLogin(e));
        }
        
        // Close Login Modal
        const closeLoginModal = document.getElementById('closeLoginModal');
        if (closeLoginModal) {
            closeLoginModal.addEventListener('click', () => {
                document.getElementById('loginModal').classList.add('hidden');
            });
        }
        
        // Sidebar Toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }
        
        // Sidebar Links - FIXED: Gunakan event delegation
        document.getElementById('sidebar')?.addEventListener('click', (e) => {
            const link = e.target.closest('.sidebar-link');
            if (link) {
                this.switchSection(e);
            }
        });
        
        // Admin Panel
        const adminPanelBtn = document.getElementById('adminPanelBtn');
        if (adminPanelBtn) {
            adminPanelBtn.addEventListener('click', () => this.showAdminPanel());
        }
        
        const closeAdminPanel = document.getElementById('closeAdminPanel');
        if (closeAdminPanel) {
            closeAdminPanel.addEventListener('click', () => this.hideAdminPanel());
        }
        
        // Product Form
        const productForm = document.getElementById('productForm');
        if (productForm) {
            productForm.addEventListener('submit', (e) => this.saveProduct(e));
        }
        
        const resetProduct = document.getElementById('resetProduct');
        if (resetProduct) {
            resetProduct.addEventListener('click', () => this.resetProductForm());
        }
        
        const previewImage = document.getElementById('previewImage');
        if (previewImage) {
            previewImage.addEventListener('click', () => this.previewProductImage());
        }
        
        const searchProduct = document.getElementById('searchProduct');
        if (searchProduct) {
            searchProduct.addEventListener('input', (e) => this.searchProducts(e.target.value));
        }
        
        // Category Form
        const categoryForm = document.getElementById('categoryForm');
        if (categoryForm) {
            categoryForm.addEventListener('submit', (e) => this.saveCategory(e));
        }
        
        const resetCategory = document.getElementById('resetCategory');
        if (resetCategory) {
            resetCategory.addEventListener('click', () => this.resetCategoryForm());
        }
        
        // QRIS Settings
        const qrisSettingsForm = document.getElementById('qrisSettingsForm');
        if (qrisSettingsForm) {
            qrisSettingsForm.addEventListener('submit', (e) => this.saveQrisSettings(e));
        }
        
        // QRIS Generator
        const generateQris = document.getElementById('generateQris');
        if (generateQris) {
            generateQris.addEventListener('click', () => this.generateQRIS());
        }
        
        // Quick Amount Buttons
        document.querySelectorAll('.quick-amount').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const amount = e.target.dataset.amount;
                document.getElementById('qrisAmount').value = amount;
            });
        });
        
        // Download QR
        const downloadQr = document.getElementById('downloadQr');
        if (downloadQr) {
            downloadQr.addEventListener('click', () => this.downloadQR());
        }
        
        const copyQr = document.getElementById('copyQr');
        if (copyQr) {
            copyQr.addEventListener('click', () => this.copyQRString());
        }
        
        // Orders Filter - FIXED: Gunakan event delegation
        document.getElementById('ordersTab')?.addEventListener('click', (e) => {
            const filterBtn = e.target.closest('[id^="filter"]');
            if (filterBtn) {
                const filterType = filterBtn.id.replace('filter', '').toLowerCase();
                this.filterOrders(filterType);
            }
        });
        
        // Search Customers
        const searchCustomer = document.getElementById('searchCustomer');
        if (searchCustomer) {
            searchCustomer.addEventListener('input', (e) => this.searchCustomers(e.target.value));
        }
        
        // Reports
        const chartPeriod = document.getElementById('chartPeriod');
        if (chartPeriod) {
            chartPeriod.addEventListener('change', (e) => this.updateSalesChart(parseInt(e.target.value)));
        }
        
        const reportPeriod = document.getElementById('reportPeriod');
        if (reportPeriod) {
            reportPeriod.addEventListener('change', (e) => this.updateReportDetails(e.target.value));
        }
        
        // Website Settings
        const websiteSettingsForm = document.getElementById('websiteSettingsForm');
        if (websiteSettingsForm) {
            websiteSettingsForm.addEventListener('submit', (e) => this.saveWebsiteSettings(e));
        }
        
        // Hero Settings
        const heroSettingsForm = document.getElementById('heroSettingsForm');
        if (heroSettingsForm) {
            heroSettingsForm.addEventListener('submit', (e) => this.saveHeroSettings(e));
        }
        
        // System Settings
        const systemSettingsForm = document.getElementById('systemSettingsForm');
        if (systemSettingsForm) {
            systemSettingsForm.addEventListener('submit', (e) => this.saveSystemSettings(e));
        }
        
        // Maintenance Toggle
        const maintenanceToggle = document.getElementById('maintenanceToggle');
        if (maintenanceToggle) {
            maintenanceToggle.addEventListener('change', (e) => this.toggleMaintenance(e));
        }
        
        const saveMaintenance = document.getElementById('saveMaintenance');
        if (saveMaintenance) {
            saveMaintenance.addEventListener('click', () => this.saveMaintenanceSettings());
        }
        
        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
        
        // Checkout
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => this.showCheckoutModal());
        }
        
        const checkoutForm = document.getElementById('checkoutForm');
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', (e) => this.handleCheckout(e));
        }
        
        // Close Checkout Modal
        const closeCheckoutModal = document.getElementById('closeCheckoutModal');
        if (closeCheckoutModal) {
            closeCheckoutModal.addEventListener('click', () => this.hideCheckoutModal());
        }
        
        // Close Cart Modal
        const closeCartModal = document.getElementById('closeCartModal');
        if (closeCartModal) {
            closeCartModal.addEventListener('click', () => this.hideCartModal());
        }
        
        // Refresh Preview
        const refreshPreview = document.getElementById('refreshPreview');
        if (refreshPreview) {
            refreshPreview.addEventListener('click', () => this.refreshWebsitePreview());
        }
        
        // Close modals on outside click
        document.addEventListener('click', (e) => {
            const modals = [
                { id: 'loginModal', closeOnOutside: true },
                { id: 'adminPanelModal', closeOnOutside: true },
                { id: 'cartModal', closeOnOutside: true },
                { id: 'checkoutModal', closeOnOutside: true },
                { id: 'imagePreviewModal', closeOnOutside: true },
                { id: 'orderDetailsModal', closeOnOutside: true }
            ];
            
            modals.forEach(modal => {
                const modalElement = document.getElementById(modal.id);
                if (modalElement && !modalElement.classList.contains('hidden')) {
                    const isClickInside = modalElement.contains(e.target);
                    const isTriggerButton = e.target.id === modal.id.replace('Modal', 'Btn');
                    
                    if (!isClickInside && !isTriggerButton && modal.closeOnOutside) {
                        modalElement.classList.add('hidden');
                    }
                }
            });
        });
        
        console.log('Event listeners initialized');
    }

    // ==================== AUTHENTICATION ====================
    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            this.showError('Silakan isi email dan password');
            return;
        }
        
        const loginBtn = document.getElementById('loginSubmit');
        const originalText = loginBtn.innerHTML;
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Memproses...';
        
        try {
            const result = await this.supabaseService.signIn(email, password);
            
            if (result.success) {
                this.showSuccess('Login berhasil!');
                this.currentUser = result.user;
                
                // Store in localStorage
                localStorage.setItem('nestsian_user', JSON.stringify({
                    user: result.user,
                    timestamp: Date.now()
                }));
                
                setTimeout(() => {
                    document.getElementById('loginModal').classList.add('hidden');
                    document.getElementById('frontend').classList.add('hidden');
                    document.getElementById('mainLayout').classList.remove('hidden');
                    
                    // Clear login form
                    document.getElementById('loginEmail').value = '';
                    document.getElementById('loginPassword').value = '';
                    
                    // Load dashboard data
                    this.loadDashboardStats();
                    this.loadProducts();
                    this.loadCategories();
                    this.loadOrders();
                    
                }, 1000);
            } else {
                this.showError(result.error || 'Email atau password salah');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Terjadi kesalahan saat login');
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = originalText;
        }
    }

    async handleLogout() {
        if (confirm('Apakah Anda yakin ingin keluar?')) {
            try {
                await this.supabaseService.signOut();
                this.currentUser = null;
                localStorage.removeItem('nestsian_user');
                
                // Show frontend
                document.getElementById('mainLayout').classList.add('hidden');
                document.getElementById('frontend').classList.remove('hidden');
                
                // Reset forms
                this.resetProductForm();
                
                this.showSuccess('Berhasil logout');
            } catch (error) {
                console.error('Logout error:', error);
                this.showError('Gagal logout');
            }
        }
    }

    // ==================== DASHBOARD ====================
    async loadDashboardStats() {
        try {
            const stats = await this.supabaseService.getDashboardStats();
            
            // Update stats cards
            const totalProductsElement = document.getElementById('totalProducts');
            const todayOrdersElement = document.getElementById('todayOrders');
            const monthlyRevenueElement = document.getElementById('monthlyRevenue');
            const activeCustomersElement = document.getElementById('activeCustomers');
            
            if (totalProductsElement) totalProductsElement.textContent = stats.totalProducts || 0;
            if (todayOrdersElement) todayOrdersElement.textContent = stats.todayOrders || 0;
            if (monthlyRevenueElement) monthlyRevenueElement.textContent = `Rp ${(stats.monthlyRevenue || 0).toLocaleString()}`;
            if (activeCustomersElement) activeCustomersElement.textContent = stats.activeCustomers || 0;
            
            // Load recent orders
            await this.loadRecentOrders();
            
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            this.showError('Gagal memuat statistik dashboard');
        }
    }

    async loadRecentOrders() {
        try {
            const result = await this.supabaseService.getOrders({}, 1, 5);
            this.updateRecentOrders(result.data);
        } catch (error) {
            console.error('Error loading recent orders:', error);
        }
    }

    updateRecentOrders(orders) {
        const recentOrders = document.getElementById('recentOrders');
        if (!recentOrders) return;
        
        recentOrders.innerHTML = '';
        
        if (!orders || orders.length === 0) {
            recentOrders.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4 text-gray-400">
                        Tidak ada pesanan baru
                    </td>
                </tr>
            `;
            return;
        }
        
        orders.forEach(order => {
            const statusClass = {
                'pending': 'bg-yellow-900/30 text-yellow-400',
                'processing': 'bg-blue-900/30 text-blue-400',
                'completed': 'bg-green-900/30 text-green-400',
                'delivered': 'bg-green-900/30 text-green-400',
                'cancelled': 'bg-red-900/30 text-red-400',
                'confirmed': 'bg-blue-900/30 text-blue-400'
            }[order.status] || 'bg-gray-900/30 text-gray-400';
            
            const row = document.createElement('tr');
            row.className = 'border-b border-dark-700 hover:bg-dark-800/50';
            row.innerHTML = `
                <td class="py-3">
                    <span class="text-sm text-primary-400 font-medium">${order.id || 'N/A'}</span>
                </td>
                <td class="py-3 text-gray-300">${order.customer_name || 'Tidak ada nama'}</td>
                <td class="py-3 font-medium text-white">
                    Rp ${(order.total_amount || 0).toLocaleString()}
                </td>
                <td class="py-3">
                    <span class="px-2 py-1 rounded-full text-xs ${statusClass} capitalize">
                        ${order.status || 'pending'}
                    </span>
                </td>
                <td class="py-3 text-gray-300 text-sm">
                    ${order.created_at ? new Date(order.created_at).toLocaleDateString('id-ID') : 'N/A'}
                </td>
            `;
            recentOrders.appendChild(row);
        });
    }

    // ==================== PRODUCTS MANAGEMENT ====================
    async loadProducts(page = 1) {
        try {
            this.currentProductPage = page;
            const searchTerm = document.getElementById('searchProduct')?.value || '';
            
            const filters = {};
            if (searchTerm) {
                filters.search = searchTerm;
            }
            
            const result = await this.supabaseService.getProducts(filters, page, this.productsPerPage);
            this.currentProducts = result;
            this.updateProductList(result.data);
            this.updateProductPagination(result.totalPages, page);
            
            // Update product count
            const productCount = document.getElementById('productCount');
            if (productCount) {
                productCount.textContent = result.total;
            }
            
        } catch (error) {
            console.error('Error loading products:', error);
            this.showError('Gagal memuat produk');
        }
    }

    async loadFrontendProducts() {
        try {
            const result = await this.supabaseService.getProducts({ featured: true }, 1, 12);
            this.updateFrontendProducts(result.data);
        } catch (error) {
            console.error('Error loading frontend products:', error);
        }
    }

    async loadMoreFrontendProducts() {
        try {
            const currentCount = document.querySelectorAll('#frontendProducts .product-card').length;
            const result = await this.supabaseService.getProducts({}, Math.floor(currentCount / 6) + 1, 6);
            
            if (result.data.length > 0) {
                this.appendFrontendProducts(result.data);
            } else {
                document.getElementById('loadMoreProducts').disabled = true;
                this.showInfo('Semua produk telah dimuat');
            }
        } catch (error) {
            console.error('Error loading more products:', error);
        }
    }

    updateFrontendProducts(products) {
        const container = document.getElementById('frontendProducts');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!products || products.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-box-open text-4xl text-gray-500 mb-4"></i>
                    <p class="text-gray-400">Tidak ada produk tersedia</p>
                </div>
            `;
            return;
        }
        
        products.forEach(product => {
            const category = product.categories || {};
            const productCard = this.createProductCard(product, category, false);
            container.appendChild(productCard);
        });
    }

    appendFrontendProducts(products) {
        const container = document.getElementById('frontendProducts');
        if (!container) return;
        
        products.forEach(product => {
            const category = product.categories || {};
            const productCard = this.createProductCard(product, category, false);
            container.appendChild(productCard);
        });
    }

    createProductCard(product, category, isAdmin = true) {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.dataset.id = product.id;
        
        if (isAdmin) {
            productCard.innerHTML = `
                <div class="overflow-hidden h-48">
                    <img src="${product.image_url}" alt="${product.name}" 
                         class="product-image w-full h-full object-cover hover:scale-105 transition-transform duration-300">
                </div>
                <div class="product-content">
                    <div class="flex items-center justify-between mb-3">
                        <span class="product-category badge badge-primary">
                            ${category.name || 'Uncategorized'}
                        </span>
                        <span class="product-price font-bold text-white">
                            Rp ${(product.price || 0).toLocaleString()}
                        </span>
                    </div>
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-description truncate">${product.description || 'Tidak ada deskripsi'}</p>
                    <div class="product-footer mt-3">
                        <span class="product-stock ${product.stock > 5 ? 'in-stock' : product.stock > 0 ? 'low-stock' : 'out-of-stock'}">
                            <i class="fas fa-box mr-1"></i> ${product.stock || 0} tersedia
                        </span>
                        <div class="flex space-x-2">
                            <button class="btn btn-sm btn-outline edit-product" data-id="${product.id}" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger delete-product" data-id="${product.id}" title="Hapus">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            productCard.innerHTML = `
                <div class="overflow-hidden h-48">
                    <img src="${product.image_url}" alt="${product.name}" 
                         class="product-image w-full h-full object-cover hover:scale-105 transition-transform duration-300">
                </div>
                <div class="product-content">
                    <div class="flex items-center justify-between mb-3">
                        <span class="product-category badge badge-primary">
                            ${category.name || 'Uncategorized'}
                        </span>
                        <span class="product-price font-bold text-white">
                            Rp ${(product.price || 0).toLocaleString()}
                        </span>
                    </div>
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-description truncate">${product.description || 'Tidak ada deskripsi'}</p>
                    <div class="product-footer mt-3">
                        <span class="product-stock ${product.stock > 5 ? 'in-stock' : product.stock > 0 ? 'low-stock' : 'out-of-stock'}">
                            <i class="fas fa-box mr-1"></i> ${product.stock || 0} tersedia
                        </span>
                        <button class="btn btn-primary btn-sm add-to-cart" data-id="${product.id}">
                            <i class="fas fa-cart-plus mr-2"></i>Tambah
                        </button>
                    </div>
                </div>
            `;
        }
        
        return productCard;
    }

    updateProductList(products) {
        const productList = document.getElementById('productList');
        if (!productList) return;
        
        productList.innerHTML = '';
        
        if (!products || products.length === 0) {
            productList.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-8 text-gray-400">
                        <i class="fas fa-box-open text-4xl mb-4"></i>
                        <p>Tidak ada produk tersedia</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        products.forEach(product => {
            const category = product.categories || {};
            
            const row = document.createElement('tr');
            row.className = 'hover:bg-dark-800/50 transition-colors';
            row.dataset.id = product.id;
            row.innerHTML = `
                <td class="py-4">
                    <div class="flex items-center space-x-3">
                        <img src="${product.image_url}" alt="${product.name}" 
                             class="w-12 h-12 rounded-lg object-cover">
                        <div>
                            <span class="font-medium text-white block">${product.name}</span>
                            <span class="text-xs text-gray-400 truncate max-w-[200px]">
                                ${product.description || 'Tidak ada deskripsi'}
                            </span>
                        </div>
                    </div>
                </td>
                <td class="py-4">
                    <span class="badge badge-primary">
                        ${category.name || 'Uncategorized'}
                    </span>
                </td>
                <td class="py-4 text-white font-medium">
                    Rp ${(product.price || 0).toLocaleString()}
                </td>
                <td class="py-4">
                    <span class="product-stock ${product.stock > 10 ? 'in-stock' : product.stock > 0 ? 'low-stock' : 'out-of-stock'}">
                        ${product.stock || 0}
                    </span>
                </td>
                <td class="py-4">
                    <div class="flex space-x-2">
                        <button class="btn btn-sm btn-outline edit-product-btn" data-id="${product.id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-product-btn" data-id="${product.id}" title="Hapus">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="btn btn-sm ${product.featured ? 'btn-warning' : 'btn-secondary'} feature-product-btn" 
                                data-id="${product.id}" 
                                title="${product.featured ? 'Unfeature' : 'Feature'}">
                            <i class="fas ${product.featured ? 'fa-star' : 'fa-star'}"></i>
                        </button>
                    </div>
                </td>
            `;
            productList.appendChild(row);
        });
        
        // Attach event listeners using event delegation
        this.attachProductEventListeners();
    }

    attachProductEventListeners() {
        const productList = document.getElementById('productList');
        if (!productList) return;
        
        // Use event delegation for better performance
        productList.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;
            
            const productId = target.dataset.id;
            
            if (target.classList.contains('edit-product-btn')) {
                e.preventDefault();
                this.editProduct(productId);
            } else if (target.classList.contains('delete-product-btn')) {
                e.preventDefault();
                this.deleteProduct(productId);
            } else if (target.classList.contains('feature-product-btn')) {
                e.preventDefault();
                this.toggleProductFeature(productId);
            }
        });
        
        // Also attach to frontend products
        const frontendProducts = document.getElementById('frontendProducts');
        if (frontendProducts) {
            frontendProducts.addEventListener('click', (e) => {
                const target = e.target.closest('.add-to-cart');
                if (target) {
                    e.preventDefault();
                    const productId = target.dataset.id;
                    this.addToCart(productId);
                }
            });
        }
    }

    updateProductPagination(totalPages, currentPage) {
        const pagination = document.getElementById('productPagination');
        if (!pagination) return;
        
        pagination.innerHTML = '';
        
        if (totalPages <= 1) return;
        
        // Previous button
        const prevButton = document.createElement('button');
        prevButton.className = `pagination-btn ${currentPage === 1 ? 'disabled' : ''}`;
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                this.loadProducts(currentPage - 1);
            }
        });
        pagination.appendChild(prevButton);
        
        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
            pageButton.textContent = i;
            pageButton.addEventListener('click', () => {
                if (i !== currentPage) {
                    this.loadProducts(i);
                }
            });
            pagination.appendChild(pageButton);
        }
        
        // Next button
        const nextButton = document.createElement('button');
        nextButton.className = `pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`;
        nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                this.loadProducts(currentPage + 1);
            }
        });
        pagination.appendChild(nextButton);
    }

    async saveProduct(e) {
        e.preventDefault();
        
        const productId = document.getElementById('productId').value;
        const name = document.getElementById('productName').value.trim();
        const categoryId = parseInt(document.getElementById('productCategory').value);
        const price = parseInt(document.getElementById('productPrice').value);
        const stock = parseInt(document.getElementById('productStock').value);
        const description = document.getElementById('productDescription').value.trim();
        const image = document.getElementById('productImage').value.trim();
        const weight = parseInt(document.getElementById('productWeight').value) || 0;
        const featured = document.getElementById('productFeatured').checked;
        
        // Validation
        if (!name) {
            this.showError('Nama produk wajib diisi');
            return;
        }
        
        if (!categoryId || isNaN(categoryId)) {
            this.showError('Kategori wajib dipilih');
            return;
        }
        
        if (!price || isNaN(price) || price < 0) {
            this.showError('Harga harus angka positif');
            return;
        }
        
        if (stock < 0 || isNaN(stock)) {
            this.showError('Stok tidak valid');
            return;
        }
        
        if (!image) {
            this.showError('URL gambar wajib diisi');
            return;
        }
        
        try {
            const productData = {
                name,
                category_id: categoryId,
                price,
                stock,
                description,
                image_url: image,
                weight,
                featured
            };
            
            if (productId) {
                productData.id = productId;
            }
            
            const saveBtn = document.getElementById('saveProduct');
            const originalText = saveBtn.innerHTML;
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Menyimpan...';
            
            const savedProduct = await this.supabaseService.saveProduct(productData);
            
            this.showSuccess(`Produk "${name}" berhasil ${productId ? 'diperbarui' : 'disimpan'}!`);
            
            // Reset form
            this.resetProductForm();
            
            // Reload products
            await this.loadProducts(this.currentProductPage);
            
            // Update frontend products if featured
            this.loadFrontendProducts();
            
        } catch (error) {
            console.error('Error saving product:', error);
            this.showError('Gagal menyimpan produk: ' + error.message);
        } finally {
            const saveBtn = document.getElementById('saveProduct');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = productId ? '<i class="fas fa-save mr-2"></i>Update Produk' : '<i class="fas fa-save mr-2"></i>Simpan Produk';
            }
        }
    }

    async editProduct(productId) {
        try {
            const product = await this.supabaseService.getProductById(productId);
            
            if (!product) {
                this.showError('Produk tidak ditemukan');
                return;
            }
            
            // Populate form
            document.getElementById('productId').value = product.id;
            document.getElementById('productName').value = product.name;
            document.getElementById('productCategory').value = product.category_id || '';
            document.getElementById('productPrice').value = product.price || 0;
            document.getElementById('productStock').value = product.stock || 0;
            document.getElementById('productDescription').value = product.description || '';
            document.getElementById('productImage').value = product.image_url || '';
            document.getElementById('productWeight').value = product.weight || 0;
            document.getElementById('productFeatured').checked = product.featured || false;
            
            // Change button text
            const saveButton = document.getElementById('saveProduct');
            if (saveButton) {
                saveButton.innerHTML = '<i class="fas fa-save mr-2"></i>Update Produk';
            }
            
            // Scroll to form
            document.getElementById('productName').scrollIntoView({ behavior: 'smooth' });
            
            this.showSuccess('Mode edit diaktifkan');
            
        } catch (error) {
            console.error('Error editing product:', error);
            this.showError('Gagal memuat data produk');
        }
    }

    resetProductForm() {
        const form = document.getElementById('productForm');
        if (form) {
            form.reset();
            document.getElementById('productId').value = '';
        }
        
        const saveButton = document.getElementById('saveProduct');
        if (saveButton) {
            saveButton.innerHTML = '<i class="fas fa-save mr-2"></i>Simpan Produk';
        }
        
        const previewImageSrc = document.getElementById('previewImageSrc');
        if (previewImageSrc) {
            previewImageSrc.src = '';
        }
    }

    async deleteProduct(productId) {
        if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
            return;
        }
        
        try {
            const product = await this.supabaseService.getProductById(productId);
            
            if (!product) {
                this.showError('Produk tidak ditemukan');
                return;
            }
            
            const result = await this.supabaseService.deleteProduct(productId);
            
            if (result.success) {
                this.showSuccess(`Produk "${product.name}" berhasil dihapus!`);
                
                // Reload products
                await this.loadProducts(this.currentProductPage);
                
                // Update frontend if featured
                if (product.featured) {
                    this.loadFrontendProducts();
                }
            } else {
                this.showError(result.error || 'Gagal menghapus produk');
            }
            
        } catch (error) {
            console.error('Error deleting product:', error);
            this.showError('Gagal menghapus produk: ' + error.message);
        }
    }

    async toggleProductFeature(productId) {
        try {
            const product = await this.supabaseService.getProductById(productId);
            
            if (!product) {
                this.showError('Produk tidak ditemukan');
                return;
            }
            
            const updatedProduct = {
                ...product,
                featured: !product.featured
            };
            
            await this.supabaseService.saveProduct(updatedProduct);
            
            this.showSuccess(`Produk ${updatedProduct.featured ? 'ditampilkan' : 'disembunyikan'} di halaman depan`);
            
            // Reload products
            await this.loadProducts(this.currentProductPage);
            
            // Update frontend
            this.loadFrontendProducts();
            
        } catch (error) {
            console.error('Error toggling product feature:', error);
            this.showError('Gagal mengubah status produk');
        }
    }

    searchProducts(searchTerm) {
        this.loadProducts(1);
    }

    previewProductImage() {
        const imageUrl = document.getElementById('productImage').value;
        if (!imageUrl) {
            this.showError('Silakan masukkan URL gambar terlebih dahulu');
            return;
        }
        
        const previewImageSrc = document.getElementById('previewImageSrc');
        if (previewImageSrc) {
            previewImageSrc.src = imageUrl;
            previewImageSrc.onerror = () => {
                this.showError('Gagal memuat gambar. Pastikan URL valid.');
                previewImageSrc.src = '';
            };
        }
        
        document.getElementById('imagePreviewModal').classList.remove('hidden');
    }

    hideImagePreview() {
        document.getElementById('imagePreviewModal').classList.add('hidden');
    }

    // ==================== CATEGORIES MANAGEMENT ====================
    async loadCategories() {
        try {
            const categories = await this.supabaseService.getCategories();
            this.updateCategoryList(categories);
            this.populateCategorySelect(categories);
        } catch (error) {
            console.error('Error loading categories:', error);
            this.showError('Gagal memuat kategori');
        }
    }

    updateCategoryList(categories) {
        const categoryList = document.getElementById('categoryList');
        const categoriesGrid = document.getElementById('categoriesGrid');
        
        if (!categoryList && !categoriesGrid) return;
        
        if (categoryList) {
            categoryList.innerHTML = '';
        }
        
        if (categoriesGrid) {
            categoriesGrid.innerHTML = '';
        }
        
        if (!categories || categories.length === 0) {
            const emptyMessage = `
                <div class="col-span-full text-center py-8 text-gray-400">
                    <i class="fas fa-tags text-4xl mb-4"></i>
                    <p>Tidak ada kategori tersedia</p>
                </div>
            `;
            
            if (categoryList) {
                categoryList.innerHTML = emptyMessage;
            }
            if (categoriesGrid) {
                categoriesGrid.innerHTML = emptyMessage;
            }
            return;
        }
        
        // Update category list in admin panel
        if (categoryList) {
            categories.forEach(async (category) => {
                const item = document.createElement('div');
                item.className = 'card mb-3';
                item.innerHTML = `
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="stats-icon">
                                <i class="${category.icon || 'fas fa-tag'}"></i>
                            </div>
                            <div>
                                <h4 class="font-medium text-white">${category.name}</h4>
                                <p class="text-sm text-gray-400">${category.product_count || 0} produk</p>
                                ${category.description ? `<p class="text-xs text-gray-500 mt-1">${category.description}</p>` : ''}
                            </div>
                        </div>
                        <div class="flex space-x-2">
                            <button class="btn btn-sm btn-outline edit-category-btn" data-id="${category.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger delete-category-btn" data-id="${category.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
                categoryList.appendChild(item);
            });
        }
        
        // Update categories grid in categories section
        if (categoriesGrid) {
            categories.forEach(category => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <div class="text-center">
                        <div class="stats-icon mx-auto mb-4">
                            <i class="${category.icon || 'fas fa-tag'} text-2xl"></i>
                        </div>
                        <h3 class="text-lg font-semibold text-white mb-2">${category.name}</h3>
                        ${category.description ? `<p class="text-gray-400 text-sm mb-4">${category.description}</p>` : ''}
                        <button class="btn btn-sm btn-outline edit-category-btn" data-id="${category.id}">
                            <i class="fas fa-edit mr-2"></i>Edit
                        </button>
                    </div>
                `;
                categoriesGrid.appendChild(card);
            });
        }
        
        // Attach event listeners using event delegation
        this.attachCategoryEventListeners();
    }

    populateCategorySelect(categories) {
        const categorySelect = document.getElementById('productCategory');
        if (!categorySelect) return;
        
        categorySelect.innerHTML = '<option value="">Pilih Kategori</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    }

    attachCategoryEventListeners() {
        // Event delegation for category buttons
        document.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;
            
            const categoryId = target.dataset.id;
            
            if (target.classList.contains('edit-category-btn')) {
                e.preventDefault();
                this.editCategory(categoryId);
            } else if (target.classList.contains('delete-category-btn')) {
                e.preventDefault();
                this.deleteCategory(categoryId);
            }
        });
    }

    async saveCategory(e) {
        e.preventDefault();
        
        const categoryId = document.getElementById('categoryId').value;
        const name = document.getElementById('categoryName').value.trim();
        const icon = document.getElementById('categoryIcon').value.trim() || 'fas fa-tag';
        const description = document.getElementById('categoryDescription').value.trim();
        
        if (!name) {
            this.showError('Nama kategori wajib diisi');
            return;
        }
        
        try {
            const categoryData = {
                name,
                icon,
                description
            };
            
            if (categoryId) {
                categoryData.id = categoryId;
            }
            
            await this.supabaseService.saveCategory(categoryData);
            
            this.showSuccess(`Kategori "${name}" berhasil ${categoryId ? 'diperbarui' : 'ditambahkan'}!`);
            
            // Reset form
            this.resetCategoryForm();
            
            // Reload categories
            await this.loadCategories();
            
            // Reload products to update category select
            await this.loadProducts(this.currentProductPage);
            
        } catch (error) {
            console.error('Error saving category:', error);
            this.showError('Gagal menyimpan kategori');
        }
    }

    async editCategory(categoryId) {
        try {
            const categories = await this.supabaseService.getCategories();
            const category = categories.find(c => c.id == categoryId);
            
            if (!category) {
                this.showError('Kategori tidak ditemukan');
                return;
            }
            
            // Populate form
            document.getElementById('categoryId').value = category.id;
            document.getElementById('categoryName').value = category.name;
            document.getElementById('categoryIcon').value = category.icon || 'fas fa-tag';
            document.getElementById('categoryDescription').value = category.description || '';
            
            this.showSuccess('Mode edit kategori diaktifkan');
            
        } catch (error) {
            console.error('Error editing category:', error);
            this.showError('Gagal memuat data kategori');
        }
    }

    resetCategoryForm() {
        const form = document.getElementById('categoryForm');
        if (form) {
            form.reset();
            document.getElementById('categoryId').value = '';
        }
    }

    async deleteCategory(categoryId) {
        if (!confirm('Apakah Anda yakin ingin menghapus kategori ini? Produk dalam kategori ini akan kehilangan kategori.')) {
            return;
        }
        
        try {
            const result = await this.supabaseService.deleteCategory(categoryId);
            
            if (result.success) {
                this.showSuccess('Kategori berhasil dihapus!');
                await this.loadCategories();
            } else {
                this.showError(result.error || 'Gagal menghapus kategori');
            }
            
        } catch (error) {
            console.error('Error deleting category:', error);
            this.showError('Gagal menghapus kategori: ' + error.message);
        }
    }

    // ==================== ORDERS MANAGEMENT ====================
    async loadOrders(page = 1, status = 'all') {
        try {
            this.currentOrderPage = page;
            
            const filters = {};
            if (status !== 'all') {
                filters.status = status;
            }
            
            const result = await this.supabaseService.getOrders(filters, page, this.ordersPerPage);
            this.currentOrders = result;
            this.updateOrderList(result.data);
            this.updateOrderPagination(result.totalPages, page);
            this.updateOrderBadge(result.data);
            
            // Update order count
            const orderCount = document.getElementById('orderCount');
            if (orderCount) {
                orderCount.textContent = result.total;
            }
            
        } catch (error) {
            console.error('Error loading orders:', error);
            this.showError('Gagal memuat pesanan');
        }
    }

    updateOrderList(orders) {
        const orderList = document.getElementById('orderList');
        if (!orderList) return;
        
        orderList.innerHTML = '';
        
        if (!orders || orders.length === 0) {
            orderList.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-8 text-gray-400">
                        <i class="fas fa-shopping-cart text-4xl mb-4"></i>
                        <p>Tidak ada pesanan</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        orders.forEach(order => {
            const statusClass = {
                'pending': 'status-pending',
                'processing': 'status-processing',
                'completed': 'status-completed',
                'delivered': 'status-delivered',
                'cancelled': 'status-cancelled',
                'confirmed': 'status-confirmed'
            }[order.status] || 'status-pending';
            
            const itemCount = order.order_items?.length || 0;
            const firstItem = order.order_items?.[0]?.product_name || 
                            order.order_items?.[0]?.products?.name || 
                            'Produk';
            const productText = itemCount > 1 ? `${firstItem} +${itemCount - 1} lainnya` : firstItem;
            
            const row = document.createElement('tr');
            row.className = 'hover:bg-dark-800/50 transition-colors';
            row.innerHTML = `
                <td class="py-4">
                    <span class="font-medium text-primary-400">${order.id}</span>
                </td>
                <td class="py-4 text-gray-300">
                    ${new Date(order.created_at).toLocaleDateString('id-ID')}
                </td>
                <td class="py-4">
                    <div>
                        <div class="font-medium text-white">${order.customer_name}</div>
                        <div class="text-sm text-gray-400">${order.customer_phone || ''}</div>
                    </div>
                </td>
                <td class="py-4 text-gray-300">
                    ${productText}
                </td>
                <td class="py-4 font-bold text-white">
                    Rp ${(order.total_amount || 0).toLocaleString()}
                </td>
                <td class="py-4">
                    <span class="status-badge ${statusClass} capitalize">
                        ${order.status}
                    </span>
                </td>
                <td class="py-4">
                    <div class="flex space-x-2">
                        <button class="btn btn-sm btn-outline view-order-btn" data-id="${order.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-primary update-order-btn" data-id="${order.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            `;
            orderList.appendChild(row);
        });
        
        // Attach event listeners
        this.attachOrderEventListeners();
    }

    updateOrderPagination(totalPages, currentPage) {
        const pagination = document.getElementById('orderPagination');
        if (!pagination) return;
        
        pagination.innerHTML = '';
        
        if (totalPages <= 1) return;
        
        // Previous button
        const prevButton = document.createElement('button');
        prevButton.className = `pagination-btn ${currentPage === 1 ? 'disabled' : ''}`;
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                this.loadOrders(currentPage - 1, this.getCurrentOrderFilter());
            }
        });
        pagination.appendChild(prevButton);
        
        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
            pageButton.textContent = i;
            pageButton.addEventListener('click', () => {
                if (i !== currentPage) {
                    this.loadOrders(i, this.getCurrentOrderFilter());
                }
            });
            pagination.appendChild(pageButton);
        }
        
        // Next button
        const nextButton = document.createElement('button');
        nextButton.className = `pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`;
        nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                this.loadOrders(currentPage + 1, this.getCurrentOrderFilter());
            }
        });
        pagination.appendChild(nextButton);
    }

    getCurrentOrderFilter() {
        const activeFilter = document.querySelector('#ordersTab .btn-primary');
        if (activeFilter) {
            const filterId = activeFilter.id;
            if (filterId === 'filterPending') return 'pending';
            if (filterId === 'filterProcessing') return 'processing';
            if (filterId === 'filterCompleted') return 'completed';
            if (filterId === 'filterCancelled') return 'cancelled';
            if (filterId === 'filterDelivered') return 'delivered';
        }
        return 'all';
    }

    updateOrderBadge(orders) {
        const orderBadge = document.getElementById('orderBadge');
        if (!orderBadge) return;
        
        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        orderBadge.textContent = pendingOrders;
        
        if (pendingOrders > 0) {
            orderBadge.classList.add('important-pulse');
        } else {
            orderBadge.classList.remove('important-pulse');
        }
    }

    attachOrderEventListeners() {
        const orderList = document.getElementById('orderList');
        if (!orderList) return;
        
        orderList.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;
            
            const orderId = target.dataset.id;
            
            if (target.classList.contains('view-order-btn')) {
                e.preventDefault();
                this.viewOrderDetails(orderId);
            } else if (target.classList.contains('update-order-btn')) {
                e.preventDefault();
                this.updateOrderStatus(orderId);
            }
        });
    }

    filterOrders(status) {
        // Update button styles
        const buttons = ['filterAll', 'filterPending', 'filterProcessing', 'filterCompleted', 'filterCancelled', 'filterDelivered'];
        buttons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                if (btnId === `filter${status.charAt(0).toUpperCase() + status.slice(1)}` || 
                    (status === 'all' && btnId === 'filterAll')) {
                    btn.classList.remove('bg-dark-700', 'text-gray-300');
                    btn.classList.add('bg-primary-600', 'text-white');
                } else {
                    btn.classList.remove('bg-primary-600', 'text-white');
                    btn.classList.add('bg-dark-700', 'text-gray-300');
                }
            }
        });
        
        // Load orders with filter
        this.loadOrders(1, status);
    }

    async viewOrderDetails(orderId) {
        try {
            const order = await this.supabaseService.getOrderById(orderId);
            
            if (!order) {
                this.showError('Pesanan tidak ditemukan');
                return;
            }
            
            const orderDetailsContent = document.getElementById('orderDetailsContent');
            if (!orderDetailsContent) return;
            
            // Format order items
            let orderItemsHtml = '';
            let totalItems = 0;
            let subtotal = 0;
            
            if (order.order_items && order.order_items.length > 0) {
                orderItemsHtml = `
                    <h4 class="font-medium text-white mb-3">Item Pesanan</h4>
                    <div class="space-y-2">
                        ${order.order_items.map(item => {
                            const itemTotal = (item.quantity || 0) * (item.price || 0);
                            totalItems += item.quantity || 0;
                            subtotal += itemTotal;
                            
                            return `
                                <div class="flex justify-between items-center p-3 bg-dark-800 rounded-lg">
                                    <div class="flex items-center space-x-3">
                                        ${item.product?.image_url ? `
                                            <img src="${item.product.image_url}" alt="${item.product.name}" 
                                                 class="w-12 h-12 rounded-lg object-cover">
                                        ` : ''}
                                        <div>
                                            <p class="font-medium text-white">${item.product?.name || item.product_name || 'Produk'}</p>
                                            <p class="text-sm text-gray-400">${item.quantity || 0} x Rp ${(item.price || 0).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <p class="font-bold text-white">Rp ${itemTotal.toLocaleString()}</p>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            }
            
            orderDetailsContent.innerHTML = `
                <div class="space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 class="font-medium text-white mb-3">Informasi Pelanggan</h4>
                            <div class="space-y-2">
                                <p><span class="text-gray-400">Nama:</span> <span class="text-white">${order.customer_name}</span></p>
                                <p><span class="text-gray-400">Email:</span> <span class="text-white">${order.customer_email || '-'}</span></p>
                                <p><span class="text-gray-400">Telepon:</span> <span class="text-white">${order.customer_phone || '-'}</span></p>
                            </div>
                        </div>
                        <div>
                            <h4 class="font-medium text-white mb-3">Informasi Pesanan</h4>
                            <div class="space-y-2">
                                <p><span class="text-gray-400">ID Pesanan:</span> <span class="text-primary-400">${order.id}</span></p>
                                <p><span class="text-gray-400">Tanggal:</span> <span class="text-white">${new Date(order.created_at).toLocaleString('id-ID')}</span></p>
                                <p><span class="text-gray-400">Status:</span> <span class="status-badge status-${order.status}">${order.status}</span></p>
                                <p><span class="text-gray-400">Metode Pembayaran:</span> <span class="text-white">${order.payment_method || '-'}</span></p>
                                <p><span class="text-gray-400">Total Item:</span> <span class="text-white">${totalItems} item</span></p>
                            </div>
                        </div>
                    </div>
                    
                    ${order.shipping_address ? `
                    <div>
                        <h4 class="font-medium text-white mb-3">Alamat Pengiriman</h4>
                        <p class="text-white p-3 bg-dark-800 rounded-lg">${order.shipping_address}</p>
                    </div>
                    ` : ''}
                    
                    ${order.notes ? `
                    <div>
                        <h4 class="font-medium text-white mb-3">Catatan</h4>
                        <p class="text-white p-3 bg-dark-800 rounded-lg">${order.notes}</p>
                    </div>
                    ` : ''}
                    
                    ${orderItemsHtml}
                    
                    <div class="pt-4 border-t border-dark-700">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-gray-400">Subtotal (${totalItems} item):</span>
                            <span class="text-white">Rp ${subtotal.toLocaleString()}</span>
                        </div>
                        ${order.shipping_cost ? `
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-gray-400">Biaya Pengiriman:</span>
                            <span class="text-white">Rp ${order.shipping_cost.toLocaleString()}</span>
                        </div>
                        ` : ''}
                        ${order.discount ? `
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-gray-400">Diskon:</span>
                            <span class="text-green-400">- Rp ${order.discount.toLocaleString()}</span>
                        </div>
                        ` : ''}
                        <div class="flex justify-between items-center pt-4 border-t border-dark-700">
                            <span class="text-xl font-bold text-white">Total:</span>
                            <span class="text-2xl font-bold text-primary-400">Rp ${(order.total_amount || 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('orderDetailsModal').classList.remove('hidden');
            
        } catch (error) {
            console.error('Error viewing order details:', error);
            this.showError('Gagal memuat detail pesanan');
        }
    }

    hideOrderDetails() {
        document.getElementById('orderDetailsModal').classList.add('hidden');
    }

    async updateOrderStatus(orderId) {
        try {
            const order = await this.supabaseService.getOrderById(orderId);
            
            if (!order) {
                this.showError('Pesanan tidak ditemukan');
                return;
            }
            
            const statuses = ['pending', 'confirmed', 'processing', 'completed', 'delivered', 'cancelled'];
            const currentStatusIndex = statuses.indexOf(order.status);
            const nextStatus = statuses[currentStatusIndex + 1] || statuses[0];
            
            if (confirm(`Ubah status pesanan ${order.id} dari "${order.status}" menjadi "${nextStatus}"?`)) {
                const result = await this.supabaseService.updateOrderStatus(orderId, nextStatus);
                
                if (result.success) {
                    this.showSuccess(`Status pesanan berhasil diubah menjadi ${nextStatus}`);
                    await this.loadOrders(this.currentOrderPage, this.getCurrentOrderFilter());
                } else {
                    this.showError(result.error || 'Gagal mengubah status pesanan');
                }
            }
            
        } catch (error) {
            console.error('Error updating order status:', error);
            this.showError('Gagal mengubah status pesanan');
        }
    }

    // ==================== CUSTOMERS MANAGEMENT ====================
    async loadCustomers(page = 1) {
        try {
            this.currentCustomerPage = page;
            const searchTerm = document.getElementById('searchCustomer')?.value || '';
            
            const filters = {};
            if (searchTerm) {
                filters.search = searchTerm;
            }
            
            const result = await this.supabaseService.getCustomers(filters, page, this.customersPerPage);
            this.currentCustomers = result;
            this.updateCustomerList(result.data);
            this.updateCustomerPagination(result.totalPages, page);
            
            // Update customer count
            const customerCount = document.getElementById('customerCount');
            if (customerCount) {
                customerCount.textContent = result.total;
            }
            
        } catch (error) {
            console.error('Error loading customers:', error);
            this.showError('Gagal memuat pelanggan');
        }
    }

    updateCustomerList(customers) {
        const customerList = document.getElementById('customerList');
        if (!customerList) return;
        
        customerList.innerHTML = '';
        
        if (!customers || customers.length === 0) {
            customerList.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-8 text-gray-400">
                        <i class="fas fa-users text-4xl mb-4"></i>
                        <p>Tidak ada pelanggan</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        customers.forEach(customer => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-dark-800/50 transition-colors';
            row.innerHTML = `
                <td class="py-4 font-medium text-white">${customer.name}</td>
                <td class="py-4 text-gray-300">${customer.email || '-'}</td>
                <td class="py-4 text-gray-300">${customer.phone || '-'}</td>
                <td class="py-4 font-medium text-white">
                    ${customer.total_orders || 0} pesanan
                </td>
                <td class="py-4">
                    <span class="badge ${customer.is_active ? 'badge-success' : 'badge-danger'}">
                        ${customer.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                </td>
                <td class="py-4">
                    <div class="flex space-x-2">
                        <button class="btn btn-sm btn-outline view-customer-btn" data-id="${customer.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-primary edit-customer-btn" data-id="${customer.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            `;
            customerList.appendChild(row);
        });
        
        // Attach event listeners
        this.attachCustomerEventListeners();
    }

    updateCustomerPagination(totalPages, currentPage) {
        const pagination = document.getElementById('customerPagination');
        if (!pagination) return;
        
        pagination.innerHTML = '';
        
        if (totalPages <= 1) return;
        
        // Previous button
        const prevButton = document.createElement('button');
        prevButton.className = `pagination-btn ${currentPage === 1 ? 'disabled' : ''}`;
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                this.loadCustomers(currentPage - 1);
            }
        });
        pagination.appendChild(prevButton);
        
        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
            pageButton.textContent = i;
            pageButton.addEventListener('click', () => {
                if (i !== currentPage) {
                    this.loadCustomers(i);
                }
            });
            pagination.appendChild(pageButton);
        }
        
        // Next button
        const nextButton = document.createElement('button');
        nextButton.className = `pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`;
        nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                this.loadCustomers(currentPage + 1);
            }
        });
        pagination.appendChild(nextButton);
    }

    searchCustomers(searchTerm) {
        this.loadCustomers(1);
    }

    attachCustomerEventListeners() {
        const customerList = document.getElementById('customerList');
        if (!customerList) return;
        
        customerList.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;
            
            const customerId = target.dataset.id;
            
            if (target.classList.contains('view-customer-btn')) {
                e.preventDefault();
                this.viewCustomerDetails(customerId);
            } else if (target.classList.contains('edit-customer-btn')) {
                e.preventDefault();
                this.editCustomer(customerId);
            }
        });
    }

    async viewCustomerDetails(customerId) {
        try {
            const result = await this.supabaseService.getCustomers({}, 1, 1000);
            const customer = result.data.find(c => c.id == customerId);
            
            if (!customer) {
                this.showError('Pelanggan tidak ditemukan');
                return;
            }
            
            // Get customer orders
            const orders = await this.supabaseService.getOrders({ search: customer.email || customer.name });
            
            let ordersHtml = '';
            if (orders.data && orders.data.length > 0) {
                ordersHtml = `
                    <h4 class="font-medium text-white mb-3">Riwayat Pesanan</h4>
                    <div class="space-y-2">
                        ${orders.data.slice(0, 5).map(order => `
                            <div class="flex justify-between items-center p-3 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors cursor-pointer view-order-btn" data-id="${order.id}">
                                <div>
                                    <p class="font-medium text-white">${order.id}</p>
                                    <p class="text-sm text-gray-400">${new Date(order.created_at).toLocaleDateString('id-ID')}</p>
                                </div>
                                <div class="text-right">
                                    <p class="font-bold text-white">Rp ${(order.total_amount || 0).toLocaleString()}</p>
                                    <span class="status-badge status-${order.status}">${order.status}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
            
            const modalContent = `
                <div class="space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 class="font-medium text-white mb-3">Informasi Pelanggan</h4>
                            <div class="space-y-2">
                                <p><span class="text-gray-400">Nama:</span> <span class="text-white">${customer.name}</span></p>
                                <p><span class="text-gray-400">Email:</span> <span class="text-white">${customer.email || '-'}</span></p>
                                <p><span class="text-gray-400">Telepon:</span> <span class="text-white">${customer.phone || '-'}</span></p>
                                <p><span class="text-gray-400">Alamat:</span> <span class="text-white">${customer.address || '-'}</span></p>
                            </div>
                        </div>
                        <div>
                            <h4 class="font-medium text-white mb-3">Statistik</h4>
                            <div class="space-y-2">
                                <p><span class="text-gray-400">Total Pesanan:</span> <span class="text-white">${customer.total_orders || 0}</span></p>
                                <p><span class="text-gray-400">Total Belanja:</span> <span class="text-white">Rp ${(customer.total_spent || 0).toLocaleString()}</span></p>
                                <p><span class="text-gray-400">Status:</span> <span class="badge ${customer.is_active ? 'badge-success' : 'badge-danger'}">${customer.is_active ? 'Aktif' : 'Nonaktif'}</span></p>
                                <p><span class="text-gray-400">Bergabung:</span> <span class="text-white">${new Date(customer.created_at).toLocaleDateString('id-ID')}</span></p>
                            </div>
                        </div>
                    </div>
                    ${ordersHtml}
                </div>
            `;
            
            const modal = this.showModal('Detail Pelanggan', modalContent);
            
            // Add click event to order items
            setTimeout(() => {
                modal.querySelectorAll('.view-order-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const orderId = btn.dataset.id;
                        modal.remove();
                        this.viewOrderDetails(orderId);
                    });
                });
            }, 100);
            
        } catch (error) {
            console.error('Error viewing customer details:', error);
            this.showError('Gagal memuat detail pelanggan');
        }
    }

    async editCustomer(customerId) {
        try {
            const result = await this.supabaseService.getCustomers({}, 1, 1000);
            const customer = result.data.find(c => c.id == customerId);
            
            if (!customer) {
                this.showError('Pelanggan tidak ditemukan');
                return;
            }
            
            const modalContent = `
                <form id="editCustomerForm" class="space-y-4">
                    <input type="hidden" name="id" value="${customer.id}">
                    <div class="form-group">
                        <label class="form-label">Nama Lengkap *</label>
                        <input type="text" name="name" value="${customer.name}" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" name="email" value="${customer.email || ''}" class="form-control">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Telepon</label>
                        <input type="tel" name="phone" value="${customer.phone || ''}" class="form-control">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Alamat</label>
                        <textarea name="address" rows="3" class="form-control">${customer.address || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="custom-checkbox">
                            <input type="checkbox" name="is_active" ${customer.is_active ? 'checked' : ''}>
                            <span class="checkbox-box"></span>
                            <span>Pelanggan Aktif</span>
                        </label>
                    </div>
                    <div class="flex space-x-3">
                        <button type="submit" class="btn btn-primary flex-1">
                            <i class="fas fa-save mr-2"></i>Simpan
                        </button>
                        <button type="button" class="btn btn-outline flex-1" onclick="this.closest('.modal').remove()">
                            Batal
                        </button>
                    </div>
                </form>
            `;
            
            const modal = this.showModal('Edit Pelanggan', modalContent);
            
            // Add form submit event
            modal.querySelector('#editCustomerForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const customerData = {
                    id: formData.get('id'),
                    name: formData.get('name'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    address: formData.get('address'),
                    is_active: formData.get('is_active') === 'on'
                };
                
                try {
                    await this.supabaseService.saveCustomer(customerData);
                    this.showSuccess('Data pelanggan berhasil diperbarui');
                    this.loadCustomers(this.currentCustomerPage);
                    modal.remove();
                } catch (error) {
                    console.error('Error updating customer:', error);
                    this.showError('Gagal memperbarui data pelanggan');
                }
            });
            
        } catch (error) {
            console.error('Error editing customer:', error);
            this.showError('Gagal memuat data pelanggan');
        }
    }

    // ==================== QRIS MANAGEMENT ====================
    async loadQrisSettings() {
        try {
            const settings = await this.supabaseService.getSettings();
            const qrisSettings = settings.qris;
            
            if (qrisSettings) {
                const merchantName = document.getElementById('qrisMerchantName');
                const merchantId = document.getElementById('qrisMerchantId');
                const city = document.getElementById('qrisCity');
                const postalCode = document.getElementById('qrisPostalCode');
                const base = document.getElementById('qrisBase');
                
                if (merchantName) merchantName.value = qrisSettings.merchant_name || '';
                if (merchantId) merchantId.value = qrisSettings.merchant_id || '';
                if (city) city.value = qrisSettings.city || '';
                if (postalCode) postalCode.value = qrisSettings.postal_code || '';
                if (base) base.value = qrisSettings.base_string || '';
            }
        } catch (error) {
            console.error('Error loading QRIS settings:', error);
        }
    }

    async saveQrisSettings(e) {
        e.preventDefault();
        
        try {
            const qrisSettings = {
                merchant_name: document.getElementById('qrisMerchantName').value,
                merchant_id: document.getElementById('qrisMerchantId').value,
                city: document.getElementById('qrisCity').value,
                postal_code: document.getElementById('qrisPostalCode').value,
                base_string: document.getElementById('qrisBase').value
            };
            
            await this.supabaseService.saveSetting('qris', qrisSettings);
            
            this.showSuccess('Pengaturan QRIS berhasil disimpan!');
            
        } catch (error) {
            console.error('Error saving QRIS settings:', error);
            this.showError('Gagal menyimpan pengaturan QRIS');
        }
    }

    async generateQRIS() {
        const amountInput = document.getElementById('qrisAmount');
        const descriptionInput = document.getElementById('qrisDescription');
        
        if (!amountInput || !descriptionInput) {
            this.showError('Form QRIS tidak ditemukan');
            return;
        }
        
        const amount = amountInput.value;
        const description = descriptionInput.value;
        
        if (!amount || parseInt(amount) < 1000) {
            this.showError('Silakan masukkan jumlah pembayaran minimal Rp 1.000');
            return;
        }
        
        try {
            // Get QRIS settings
            const settings = await this.supabaseService.getSettings();
            const qrisSettings = settings.qris || {
                merchant_name: 'NestSian Store',
                merchant_id: 'ID.NESTSIAN.WWW',
                base_string: '00020101021126570011ID.DANA.WWW011893600915376904960002097690496000303UMI51440014ID.CO.QRIS.WWW0215ID10243512603270303UMI5204481453033605802ID5912NESTSIAN STORE6014JAKARTA SELATAN6105123456304'
            };
            
            // Generate QRIS string
            const qrisString = this.generateQrisString(amount, description, qrisSettings.base_string);
            
            // Clear previous QR code
            const qrcodePreview = document.getElementById('qrcodePreview');
            if (qrcodePreview) {
                qrcodePreview.innerHTML = '';
            }
            
            // Check if QRCode library is available
            if (typeof QRCode === 'undefined') {
                this.showError('QR Code library tidak tersedia');
                return;
            }
            
            // Generate new QR code
            new QRCode(qrcodePreview, {
                text: qrisString,
                width: 250,
                height: 250,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
            
            // Update preview info
            const previewAmount = document.getElementById('previewAmount');
            const previewMerchant = document.getElementById('previewMerchant');
            const previewStatus = document.getElementById('previewStatus');
            
            if (previewAmount) previewAmount.textContent = `Rp ${parseInt(amount).toLocaleString()}`;
            if (previewMerchant) previewMerchant.textContent = qrisSettings.merchant_name;
            if (previewStatus) {
                previewStatus.textContent = 'Aktif';
                previewStatus.className = 'text-green-400 font-medium';
            }
            
            // Enable buttons
            const downloadQr = document.getElementById('downloadQr');
            const copyQr = document.getElementById('copyQr');
            
            if (downloadQr) {
                downloadQr.disabled = false;
            }
            
            if (copyQr) {
                copyQr.disabled = false;
            }
            
            // Store QR data
            localStorage.setItem('last_qr_data', JSON.stringify({
                string: qrisString,
                amount: amount,
                merchant: qrisSettings.merchant_name,
                timestamp: Date.now()
            }));
            
            // Start countdown
            this.startQRCountdown();
            
            this.showSuccess('QR Code berhasil digenerate!');
            
        } catch (error) {
            console.error('Error generating QRIS:', error);
            this.showError('Gagal generate QR Code');
        }
    }

    generateQrisString(amount, description, baseString) {
        // Simplified QRIS generation
        // In production, use proper QRIS library
        
        if (!baseString) {
            baseString = '00020101021126570011ID.DANA.WWW011893600915376904960002097690496000303UMI51440014ID.CO.QRIS.WWW0215ID10243512603270303UMI5204481453033605802ID5912NESTSIAN STORE6014JAKARTA SELATAN6105123456304';
        }
        
        const amountFormatted = amount.toString().padStart(13, '0');
        const rawString = `${baseString}54${amountFormatted.length.toString().padStart(2, '0')}${amountFormatted}6304`;
        
        // Calculate CRC16 (simplified)
        const crc = this.calculateCRC16(rawString);
        return rawString + crc;
    }

    calculateCRC16(str) {
        // Simplified CRC16 calculation
        let crc = 0xFFFF;
        for (let i = 0; i < str.length; i++) {
            crc ^= str.charCodeAt(i) << 8;
            for (let j = 0; j < 8; j++) {
                crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
            }
        }
        return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    }

    startQRCountdown() {
        if (this.qrCountdownInterval) {
            clearInterval(this.qrCountdownInterval);
        }
        
        let timeLeft = 300; // 5 minutes in seconds
        const timerElement = document.getElementById('countdownTimer');
        
        if (!timerElement) return;
        
        const updateTimer = () => {
            if (timeLeft <= 0) {
                clearInterval(this.qrCountdownInterval);
                timerElement.textContent = '00:00';
                
                const previewStatus = document.getElementById('previewStatus');
                if (previewStatus) {
                    previewStatus.textContent = 'Kedaluwarsa';
                    previewStatus.className = 'text-red-400 font-medium';
                }
                
                // Disable buttons
                const downloadQr = document.getElementById('downloadQr');
                const copyQr = document.getElementById('copyQr');
                
                if (downloadQr) downloadQr.disabled = true;
                if (copyQr) copyQr.disabled = true;
                
                return;
            }
            
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            timeLeft--;
        };
        
        updateTimer();
        this.qrCountdownInterval = setInterval(updateTimer, 1000);
    }

    downloadQR() {
        const canvas = document.querySelector('#qrcodePreview canvas');
        if (!canvas) {
            this.showError('QR Code tidak ditemukan');
            return;
        }
        
        try {
            const link = document.createElement('a');
            link.download = `qris-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            this.showSuccess('QR Code berhasil diunduh');
        } catch (error) {
            console.error('Error downloading QR:', error);
            this.showError('Gagal mengunduh QR Code');
        }
    }

    copyQRString() {
        try {
            const lastQRData = JSON.parse(localStorage.getItem('last_qr_data') || '{}');
            if (!lastQRData.string) {
                this.showError('Tidak ada QR string yang tersedia');
                return;
            }
            
            navigator.clipboard.writeText(lastQRData.string)
                .then(() => {
                    this.showSuccess('QR string berhasil disalin ke clipboard');
                })
                .catch(() => {
                    // Fallback for older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = lastQRData.string;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    this.showSuccess('QR string berhasil disalin');
                });
        } catch (error) {
            console.error('Error copying QR string:', error);
            this.showError('Gagal menyalin QR string');
        }
    }

    // ==================== SETTINGS MANAGEMENT ====================
    async loadSettings() {
        try {
            const settings = await this.supabaseService.getSettings();
            
            // Website settings
            if (settings.website) {
                const websiteName = document.getElementById('websiteName');
                const websiteSlogan = document.getElementById('websiteSlogan');
                const websiteDescription = document.getElementById('websiteDescription');
                const contactEmail = document.getElementById('contactEmail');
                const contactPhone = document.getElementById('contactPhone');
                const contactAddress = document.getElementById('contactAddress');
                
                if (websiteName) websiteName.value = settings.website.name || '';
                if (websiteSlogan) websiteSlogan.value = settings.website.slogan || '';
                if (websiteDescription) websiteDescription.value = settings.website.description || '';
                if (contactEmail) contactEmail.value = settings.website.contact_email || '';
                if (contactPhone) contactPhone.value = settings.website.contact_phone || '';
                if (contactAddress) contactAddress.value = settings.website.contact_address || '';
            }
            
            // System settings
            if (settings.system) {
                const systemName = document.getElementById('systemName');
                const systemLogo = document.getElementById('systemLogo');
                const systemTimezone = document.getElementById('systemTimezone');
                const systemCurrency = document.getElementById('systemCurrency');
                
                if (systemName) systemName.value = settings.system.name || '';
                if (systemLogo) systemLogo.value = settings.system.logo || '';
                if (systemTimezone) systemTimezone.value = settings.system.timezone || '';
                if (systemCurrency) systemCurrency.value = settings.system.currency || '';
            }
            
            // Hero settings
            if (settings.hero) {
                const heroTitle = document.getElementById('heroTitle');
                const heroSubtitle = document.getElementById('heroSubtitle');
                const heroButton1 = document.getElementById('heroButton1');
                const heroButton2 = document.getElementById('heroButton2');
                
                if (heroTitle) heroTitle.value = settings.hero.title || '';
                if (heroSubtitle) heroSubtitle.value = settings.hero.subtitle || '';
                if (heroButton1) heroButton1.value = settings.hero.button1 || '';
                if (heroButton2) heroButton2.value = settings.hero.button2 || '';
                
                const heroFeatures = document.getElementById('heroFeatures');
                if (heroFeatures && settings.hero.features) {
                    heroFeatures.innerHTML = '';
                    settings.hero.features.forEach((feature, index) => {
                        const featureHtml = `
                            <div class="grid grid-cols-2 gap-3 mb-3">
                                <input type="text" name="feature_name_${index}" value="${feature.name}" 
                                       class="form-control text-sm" placeholder="Nama Fitur">
                                <input type="text" name="feature_icon_${index}" value="${feature.icon}" 
                                       class="form-control text-sm" placeholder="fas fa-icon">
                            </div>
                        `;
                        heroFeatures.innerHTML += featureHtml;
                    });
                }
            }
            
            // Maintenance settings
            if (settings.maintenance) {
                const maintenanceToggle = document.getElementById('maintenanceToggle');
                const maintenanceMessage = document.getElementById('maintenanceMessage');
                const maintenanceEtaInput = document.getElementById('maintenanceEtaInput');
                
                if (maintenanceToggle) maintenanceToggle.checked = settings.maintenance.enabled || false;
                if (maintenanceMessage) maintenanceMessage.value = settings.maintenance.message || '';
                
                if (settings.maintenance.eta && maintenanceEtaInput) {
                    const etaDate = new Date(settings.maintenance.eta);
                    maintenanceEtaInput.value = etaDate.toISOString().slice(0, 16);
                }
                
                this.toggleMaintenance({ target: maintenanceToggle });
            }
            
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async saveWebsiteSettings(e) {
        e.preventDefault();
        
        try {
            const websiteSettings = {
                name: document.getElementById('websiteName').value,
                slogan: document.getElementById('websiteSlogan').value,
                description: document.getElementById('websiteDescription').value,
                contact_email: document.getElementById('contactEmail').value,
                contact_phone: document.getElementById('contactPhone').value,
                contact_address: document.getElementById('contactAddress').value
            };
            
            await this.supabaseService.saveSetting('website', websiteSettings);
            
            this.showSuccess('Pengaturan website berhasil disimpan!');
            
        } catch (error) {
            console.error('Error saving website settings:', error);
            this.showError('Gagal menyimpan pengaturan website');
        }
    }

    async saveSystemSettings(e) {
        e.preventDefault();
        
        try {
            const systemSettings = {
                name: document.getElementById('systemName').value,
                logo: document.getElementById('systemLogo').value,
                timezone: document.getElementById('systemTimezone').value,
                currency: document.getElementById('systemCurrency').value
            };
            
            await this.supabaseService.saveSetting('system', systemSettings);
            
            this.showSuccess('Pengaturan sistem berhasil disimpan!');
            
        } catch (error) {
            console.error('Error saving system settings:', error);
            this.showError('Gagal menyimpan pengaturan sistem');
        }
    }

    async saveHeroSettings(e) {
        e.preventDefault();
        
        try {
            const heroFeatures = [];
            const featureInputs = document.querySelectorAll('#heroFeatures input');
            
            for (let i = 0; i < featureInputs.length; i += 2) {
                const nameInput = featureInputs[i];
                const iconInput = featureInputs[i + 1];
                
                if (nameInput && iconInput && nameInput.value && iconInput.value) {
                    heroFeatures.push({
                        name: nameInput.value,
                        icon: iconInput.value
                    });
                }
            }
            
            const heroSettings = {
                title: document.getElementById('heroTitle').value,
                subtitle: document.getElementById('heroSubtitle').value,
                button1: document.getElementById('heroButton1').value,
                button2: document.getElementById('heroButton2').value,
                features: heroFeatures
            };
            
            await this.supabaseService.saveSetting('hero', heroSettings);
            
            this.showSuccess('Hero section berhasil diperbarui!');
            
        } catch (error) {
            console.error('Error saving hero settings:', error);
            this.showError('Gagal menyimpan pengaturan hero');
        }
    }

    toggleMaintenance(e) {
        const settingsDiv = document.getElementById('maintenanceSettings');
        if (!settingsDiv) return;
        
        if (e.target.checked) {
            settingsDiv.classList.remove('hidden');
        } else {
            settingsDiv.classList.add('hidden');
        }
    }

    async saveMaintenanceSettings() {
        try {
            const maintenanceSettings = {
                enabled: document.getElementById('maintenanceToggle').checked,
                message: document.getElementById('maintenanceMessage').value,
                eta: document.getElementById('maintenanceEtaInput').value || null
            };
            
            await this.supabaseService.saveSetting('maintenance', maintenanceSettings);
            
            this.showSuccess('Pengaturan maintenance berhasil disimpan!');
            
        } catch (error) {
            console.error('Error saving maintenance settings:', error);
            this.showError('Gagal menyimpan pengaturan maintenance');
        }
    }

    refreshWebsitePreview() {
        const previewFrame = document.getElementById('websitePreview');
        if (previewFrame) {
            previewFrame.src = window.location.href.split('#')[0] + '?preview=' + Date.now();
        }
    }

    // ==================== SHOPPING CART ====================
    loadCart() {
        try {
            const cart = JSON.parse(localStorage.getItem('nestsian_cart') || '[]');
            this.currentCart = cart;
            this.updateCartCount();
        } catch (error) {
            console.error('Error loading cart:', error);
            this.currentCart = [];
        }
    }

    saveCart() {
        try {
            localStorage.setItem('nestsian_cart', JSON.stringify(this.currentCart));
            this.updateCartCount();
        } catch (error) {
            console.error('Error saving cart:', error);
        }
    }

    async addToCart(productId) {
        try {
            const product = await this.supabaseService.getProductById(productId);
            
            if (!product) {
                this.showError('Produk tidak ditemukan');
                return;
            }
            
            if (product.stock < 1) {
                this.showError('Stok produk habis');
                return;
            }
            
            // Check if product already in cart
            const existingItem = this.currentCart.find(item => item.id == product.id);
            
            if (existingItem) {
                if (existingItem.quantity >= product.stock) {
                    this.showError('Stok tidak mencukupi');
                    return;
                }
                existingItem.quantity += 1;
            } else {
                this.currentCart.push({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image_url: product.image_url,
                    quantity: 1,
                    stock: product.stock
                });
            }
            
            this.saveCart();
            this.showSuccess(`${product.name} ditambahkan ke keranjang`);
            
        } catch (error) {
            console.error('Error adding to cart:', error);
            this.showError('Gagal menambahkan ke keranjang');
        }
    }

    removeFromCart(productId) {
        this.currentCart = this.currentCart.filter(item => item.id != productId);
        this.saveCart();
        this.updateCartModal();
    }

    updateCartQuantity(productId, quantity) {
        const item = this.currentCart.find(item => item.id == productId);
        if (item) {
            if (quantity < 1) {
                this.removeFromCart(productId);
            } else if (quantity <= item.stock) {
                item.quantity = quantity;
                this.saveCart();
                this.updateCartModal();
            } else {
                this.showError('Stok tidak mencukupi');
            }
        }
    }

    updateCartCount() {
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            const totalItems = this.currentCart.reduce((sum, item) => sum + item.quantity, 0);
            cartCount.textContent = totalItems;
            cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    }

    showCartModal() {
        this.updateCartModal();
        document.getElementById('cartModal').classList.remove('hidden');
    }

    hideCartModal() {
        document.getElementById('cartModal').classList.add('hidden');
    }

    updateCartModal() {
        const cartItems = document.getElementById('cartItems');
        const cartTotal = document.getElementById('cartTotal');
        const checkoutBtn = document.getElementById('checkoutBtn');
        const emptyCart = document.getElementById('emptyCart');
        const cartContent = document.getElementById('cartContent');
        
        if (!cartItems || !cartTotal || !checkoutBtn || !emptyCart || !cartContent) return;
        
        if (this.currentCart.length === 0) {
            emptyCart.classList.remove('hidden');
            cartContent.classList.add('hidden');
            cartTotal.textContent = 'Rp 0';
            checkoutBtn.disabled = true;
            return;
        }
        
        emptyCart.classList.add('hidden');
        cartContent.classList.remove('hidden');
        
        let total = 0;
        cartItems.innerHTML = '';
        
        this.currentCart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            
            const cartItem = document.createElement('div');
            cartItem.className = 'flex items-center space-x-4 p-4 bg-dark-800 rounded-lg mb-3';
            cartItem.innerHTML = `
                <img src="${item.image_url}" alt="${item.name}" class="w-16 h-16 rounded-lg object-cover">
                <div class="flex-1">
                    <h4 class="font-medium text-white">${item.name}</h4>
                    <p class="text-primary-400 font-bold">Rp ${item.price.toLocaleString()}</p>
                </div>
                <div class="flex items-center space-x-3">
                    <button class="btn btn-sm btn-outline decrease-quantity-btn" data-id="${item.id}">
                        <i class="fas fa-minus"></i>
                    </button>
                    <span class="text-white font-medium w-8 text-center">${item.quantity}</span>
                    <button class="btn btn-sm btn-outline increase-quantity-btn" data-id="${item.id}">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="btn btn-sm btn-danger remove-item-btn" data-id="${item.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            cartItems.appendChild(cartItem);
        });
        
        cartTotal.textContent = `Rp ${total.toLocaleString()}`;
        checkoutBtn.disabled = false;
        
        // Add event listeners using event delegation
        cartItems.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;
            
            const productId = target.dataset.id;
            const item = this.currentCart.find(item => item.id == productId);
            
            if (target.classList.contains('decrease-quantity-btn') && item) {
                this.updateCartQuantity(item.id, item.quantity - 1);
            } else if (target.classList.contains('increase-quantity-btn') && item) {
                this.updateCartQuantity(item.id, item.quantity + 1);
            } else if (target.classList.contains('remove-item-btn') && item) {
                this.removeFromCart(item.id);
            }
        });
    }

    showCheckoutModal() {
        if (this.currentCart.length === 0) {
            this.showError('Keranjang belanja kosong');
            return;
        }
        
        // Pre-fill customer data if available
        const storedUser = localStorage.getItem('nestsian_user');
        if (storedUser) {
            const { user } = JSON.parse(storedUser);
            document.getElementById('checkoutName').value = user.name || '';
            document.getElementById('checkoutEmail').value = user.email || '';
        }
        
        document.getElementById('checkoutModal').classList.remove('hidden');
    }

    hideCheckoutModal() {
        document.getElementById('checkoutModal').classList.add('hidden');
    }

    async handleCheckout(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Validation
        if (!data.name || !data.email || !data.phone || !data.address) {
            this.showError('Silakan isi semua field yang wajib diisi');
            return;
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            this.showError('Format email tidak valid');
            return;
        }
        
        try {
            // Calculate total
            const total = this.currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            
            // Create order
            const order = {
                customer_name: data.name,
                customer_email: data.email,
                customer_phone: data.phone,
                total_amount: total,
                status: 'pending',
                payment_method: data.payment_method,
                shipping_address: data.address,
                notes: data.notes || '',
                order_items: this.currentCart.map(item => ({
                    product_id: item.id,
                    product_name: item.name,
                    quantity: item.quantity,
                    price: item.price
                }))
            };
            
            const saveBtn = form.querySelector('button[type="submit"]');
            const originalText = saveBtn.innerHTML;
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Memproses...';
            
            const savedOrder = await this.supabaseService.saveOrder(order);
            
            if (savedOrder) {
                // Clear cart
                this.currentCart = [];
                this.saveCart();
                this.updateCartCount();
                
                // Hide modals
                this.hideCartModal();
                this.hideCheckoutModal();
                
                // Reset form
                form.reset();
                
                // Show success message
                this.showSuccess('Pesanan berhasil dibuat! ID Pesanan: ' + savedOrder.id);
                
                // If logged in, reload orders
                if (this.currentUser) {
                    this.loadOrders();
                }
            } else {
                throw new Error('Gagal menyimpan pesanan');
            }
            
        } catch (error) {
            console.error('Error processing checkout:', error);
            this.showError('Gagal memproses pesanan. Silakan coba lagi.');
        } finally {
            const saveBtn = form.querySelector('button[type="submit"]');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = 'Proses Pesanan';
            }
        }
    }

    // ==================== REPORTS & ANALYTICS ====================
    async updateSalesChart(days = 7) {
        try {
            const chartData = await this.supabaseService.getSalesChartData(days);
            
            const canvas = document.getElementById('salesChartCanvas');
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart
            if (this.chart) {
                this.chart.destroy();
            }
            
            // Create new chart
            this.chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: chartData.dates.map(date => new Date(date).toLocaleDateString('id-ID', { 
                        month: 'short', 
                        day: 'numeric' 
                    })),
                    datasets: [{
                        label: 'Penjualan (Rp)',
                        data: chartData.amounts,
                        borderColor: '#0080ff',
                        backgroundColor: 'rgba(0, 128, 255, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: '#94a3b8'
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                color: 'rgba(51, 65, 85, 0.3)'
                            },
                            ticks: {
                                color: '#94a3b8'
                            }
                        },
                        y: {
                            grid: {
                                color: 'rgba(51, 65, 85, 0.3)'
                            },
                            ticks: {
                                color: '#94a3b8',
                                callback: function(value) {
                                    return 'Rp ' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
            
        } catch (error) {
            console.error('Error updating sales chart:', error);
            const chartContainer = document.getElementById('salesChart');
            if (chartContainer) {
                chartContainer.innerHTML = `
                    <div class="chart-placeholder">
                        <div class="text-center">
                            <i class="fas fa-chart-line text-4xl mb-4 text-gray-500"></i>
                            <p class="text-gray-400">Gagal memuat data chart</p>
                        </div>
                    </div>
                `;
            }
        }
    }

    async updateTopProducts() {
        try {
            const topProducts = await this.supabaseService.getTopProducts(5);
            const container = document.getElementById('topProducts');
            
            if (!container) return;
            
            container.innerHTML = '';
            
            if (!topProducts || topProducts.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-8 text-gray-400">
                        <i class="fas fa-star text-4xl mb-4"></i>
                        <p>Belum ada data produk terlaris</p>
                    </div>
                `;
                return;
            }
            
            topProducts.forEach((product, index) => {
                const rankColors = ['bg-yellow-500', 'bg-gray-400', 'bg-orange-500'];
                const rankColor = rankColors[index] || 'bg-dark-600';
                
                const item = document.createElement('div');
                item.className = 'flex items-center space-x-4 p-3 bg-dark-800 rounded-lg mb-2';
                item.innerHTML = `
                    <div class="w-10 h-10 rounded-full ${rankColor} flex items-center justify-center text-white font-bold">
                        ${index + 1}
                    </div>
                    <div class="flex-1">
                        <h4 class="font-medium text-white">${product.name}</h4>
                        <p class="text-sm text-gray-400">Terjual: ${product.total_quantity || 0}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-primary-400 font-bold">Rp ${product.price.toLocaleString()}</p>
                    </div>
                `;
                container.appendChild(item);
            });
            
        } catch (error) {
            console.error('Error updating top products:', error);
        }
    }

    async updateReportDetails(period) {
        try {
            const filters = {};
            const now = new Date();
            
            switch (period) {
                case 'today':
                    filters.start_date = now.toISOString().split('T')[0];
                    filters.end_date = now.toISOString().split('T')[0];
                    break;
                case 'week':
                    const weekAgo = new Date(now);
                    weekAgo.setDate(now.getDate() - 7);
                    filters.start_date = weekAgo.toISOString().split('T')[0];
                    filters.end_date = now.toISOString().split('T')[0];
                    break;
                case 'month':
                    const monthAgo = new Date(now);
                    monthAgo.setMonth(now.getMonth() - 1);
                    filters.start_date = monthAgo.toISOString().split('T')[0];
                    filters.end_date = now.toISOString().split('T')[0];
                    break;
                case 'quarter':
                    const quarterAgo = new Date(now);
                    quarterAgo.setMonth(now.getMonth() - 3);
                    filters.start_date = quarterAgo.toISOString().split('T')[0];
                    filters.end_date = now.toISOString().split('T')[0];
                    break;
            }
            
            const result = await this.supabaseService.getOrders(filters, 1, 50);
            this.updateReportTable(result.data);
            
        } catch (error) {
            console.error('Error updating report details:', error);
        }
    }

    updateReportTable(orders) {
        const reportDetails = document.getElementById('reportDetails');
        if (!reportDetails) return;
        
        reportDetails.innerHTML = '';
        
        if (!orders || orders.length === 0) {
            reportDetails.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-8 text-gray-400">
                        <i class="fas fa-file-alt text-4xl mb-4"></i>
                        <p>Tidak ada data laporan untuk periode ini</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        orders.forEach(order => {
            const statusClass = {
                'pending': 'bg-yellow-900/30 text-yellow-400',
                'processing': 'bg-blue-900/30 text-blue-400',
                'completed': 'bg-green-900/30 text-green-400',
                'delivered': 'bg-green-900/30 text-green-400',
                'cancelled': 'bg-red-900/30 text-red-400'
            }[order.status] || 'bg-gray-900/30 text-gray-400';
            
            const row = document.createElement('tr');
            row.className = 'border-b border-dark-700 hover:bg-dark-800/50';
            row.innerHTML = `
                <td class="py-3 text-gray-300">
                    ${new Date(order.created_at).toLocaleDateString('id-ID')}
                </td>
                <td class="py-3">
                    <span class="text-sm text-primary-400 font-medium">${order.id}</span>
                </td>
                <td class="py-3 text-gray-300">${order.customer_name}</td>
                <td class="py-3 text-gray-300">${order.order_items?.length || 1} item</td>
                <td class="py-3 text-gray-300">Rp ${(order.total_amount || 0).toLocaleString()}</td>
                <td class="py-3">
                    <span class="px-2 py-1 rounded-full text-xs ${statusClass} capitalize">
                        ${order.status}
                    </span>
                </td>
            `;
            reportDetails.appendChild(row);
        });
    }

    // ==================== CONTACT FORM ====================
    async handleContactSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Validation
        if (!data.name || !data.email || !data.subject || !data.message) {
            this.showError('Silakan isi semua field yang wajib diisi');
            return;
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            this.showError('Format email tidak valid');
            return;
        }
        
        try {
            await this.supabaseService.saveContactMessage(data);
            
            this.showSuccess('Pesan Anda telah terkirim! Kami akan menghubungi Anda segera.');
            form.reset();
            
        } catch (error) {
            console.error('Error sending contact message:', error);
            this.showError('Gagal mengirim pesan. Silakan coba lagi.');
        }
    }

    // ==================== UI HELPERS ====================
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('-translate-x-full');
        }
    }

    switchSection(e) {
        e.preventDefault();
        const targetId = e.currentTarget.getAttribute('href')?.substring(1);
        if (!targetId) return;
        
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.add('hidden');
        });
        
        // Remove active class from all links
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Show target section
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
            e.currentTarget.classList.add('active');
            
            // Load section-specific data
            switch(targetId) {
                case 'dashboard':
                    this.loadDashboardStats();
                    break;
                case 'products':
                    this.loadProducts();
                    this.loadCategories();
                    break;
                case 'categories':
                    this.loadCategories();
                    break;
                case 'orders':
                    this.loadOrders();
                    break;
                case 'customers':
                    this.loadCustomers();
                    break;
                case 'qris':
                    this.loadQrisSettings();
                    break;
                case 'reports':
                    this.updateSalesChart(7);
                    this.updateTopProducts();
                    this.updateReportDetails('week');
                    break;
                case 'frontend':
                    this.loadSettings();
                    this.refreshWebsitePreview();
                    break;
            }
        }
        
        // Close sidebar on mobile
        if (window.innerWidth < 1024) {
            this.toggleSidebar();
        }
    }

    showAdminPanel() {
        const modal = document.getElementById('adminPanelModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    hideAdminPanel() {
        const modal = document.getElementById('adminPanelModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    showAdminTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.admin-tab-content').forEach(tab => {
            tab.classList.add('hidden');
        });
        
        // Show selected tab
        const targetTab = document.getElementById(`admin${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
        if (targetTab) {
            targetTab.classList.remove('hidden');
        }
    }

    startClock() {
        const updateClock = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const dateString = now.toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            const clockElement = document.getElementById('clock');
            if (clockElement) {
                clockElement.innerHTML = `
                    <div class="text-sm text-gray-400">${dateString}</div>
                    <div class="font-mono font-bold text-white text-xl">${timeString}</div>
                `;
            }
        };
        
        updateClock();
        setInterval(updateClock, 1000);
    }

    showModal(title, content) {
        // Remove existing modal
        const existingModal = document.querySelector('.custom-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create modal container
        const modalContainer = document.createElement('div');
        modalContainer.className = 'custom-modal fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4';
        modalContainer.innerHTML = `
            <div class="bg-dark-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                <div class="flex items-center justify-between p-4 border-b border-dark-700">
                    <h3 class="text-xl font-semibold text-white">${title}</h3>
                    <button class="text-gray-400 hover:text-white close-modal-btn">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    ${content}
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(modalContainer);
        
        // Add event listeners
        modalContainer.querySelector('.close-modal-btn').addEventListener('click', () => {
            modalContainer.remove();
        });
        
        // Close on outside click
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) {
                modalContainer.remove();
            }
        });
        
        return modalContainer;
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showInfo(message) {
        this.showToast(message, 'info');
    }

    showToast(message, type = 'info') {
        // Remove existing toast
        const existingToast = document.querySelector('.custom-toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create toast
        const toast = document.createElement('div');
        toast.className = `custom-toast fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 ${
            type === 'success' ? 'bg-green-900/90 text-green-100 border border-green-700' :
            type === 'error' ? 'bg-red-900/90 text-red-100 border border-red-700' :
            'bg-blue-900/90 text-blue-100 border border-blue-700'
        }`;
        
        const icon = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'info': 'fa-info-circle'
        }[type];
        
        toast.innerHTML = `
            <i class="fas ${icon} text-xl"></i>
            <div>
                <p class="font-medium">${message}</p>
            </div>
            <button class="ml-4 text-gray-300 hover:text-white close-toast-btn">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to document
        document.body.appendChild(toast);
        
        // Add close button event
        toast.querySelector('.close-toast-btn').addEventListener('click', () => {
            toast.remove();
        });
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.nestSian = new NestSian();
});

// Global error handler
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    
    // Show user-friendly error message
    const errorMessage = e.error?.message || 'Terjadi kesalahan dalam aplikasi';
    if (window.nestSian) {
        window.nestSian.showError(errorMessage);
    }
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    
    // Show user-friendly error message
    const errorMessage = e.reason?.message || 'Terjadi kesalahan dalam aplikasi';
    if (window.nestSian) {
        window.nestSian.showError(errorMessage);
    }
});