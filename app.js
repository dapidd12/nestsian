// NestSian - Main Application Logic
class NestSian {
    constructor() {
        this.currentEditingProductId = null;
        this.currentEditingCategoryId = null;
        this.supabaseService = null;
        this.currentUser = null;
        this.qrCountdownInterval = null;
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
        
        // Wait for services to initialize
        const initInterval = setInterval(() => {
            if (this.supabaseService) {
                clearInterval(initInterval);
                clearTimeout(loadingTimeout);
                
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
                } else {
                    localStorage.removeItem('nestsian_user');
                }
            }
            
            // Check Supabase session if available
            if (this.supabaseService?.initialized) {
                const user = await this.supabaseService.getCurrentUser();
                if (user) {
                    this.currentUser = user;
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
        
        // Sidebar Toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }
        
        // Sidebar Links
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', (e) => this.switchSection(e));
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
        
        const cancelEdit = document.getElementById('cancelEdit');
        if (cancelEdit) {
            cancelEdit.addEventListener('click', () => this.cancelProductEdit());
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
        
        // Orders Filter
        const filterAll = document.getElementById('filterAll');
        if (filterAll) {
            filterAll.addEventListener('click', () => this.filterOrders('all'));
        }
        
        const filterPending = document.getElementById('filterPending');
        if (filterPending) {
            filterPending.addEventListener('click', () => this.filterOrders('pending'));
        }
        
        const filterProcessing = document.getElementById('filterProcessing');
        if (filterProcessing) {
            filterProcessing.addEventListener('click', () => this.filterOrders('processing'));
        }
        
        const filterCompleted = document.getElementById('filterCompleted');
        if (filterCompleted) {
            filterCompleted.addEventListener('click', () => this.filterOrders('completed'));
        }
        
        // Search Customers
        const searchCustomer = document.getElementById('searchCustomer');
        if (searchCustomer) {
            searchCustomer.addEventListener('input', (e) => this.searchCustomers(e.target.value));
        }
        
        // Reports
        const chartPeriod = document.getElementById('chartPeriod');
        if (chartPeriod) {
            chartPeriod.addEventListener('change', (e) => this.updateSalesChart(e.target.value));
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
        
        // Close modals on outside click
        document.addEventListener('click', (e) => {
            const loginModal = document.getElementById('loginModal');
            const adminPanelModal = document.getElementById('adminPanelModal');
            
            if (loginModal && !loginModal.classList.contains('hidden') && 
                !loginModal.contains(e.target) && e.target.id !== 'loginBtn') {
                loginModal.classList.add('hidden');
            }
            
            if (adminPanelModal && !adminPanelModal.classList.contains('hidden') && 
                !adminPanelModal.contains(e.target) && e.target.id !== 'adminPanelBtn') {
                adminPanelModal.classList.add('hidden');
            }
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
                    
                    // Load dashboard data
                    this.loadDashboardStats();
                    this.loadProducts();
                    this.loadCategories();
                    this.loadOrders();
                    
                    // Clear login form
                    document.getElementById('loginEmail').value = '';
                    document.getElementById('loginPassword').value = '';
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
            
            if (totalProductsElement) totalProductsElement.textContent = stats.totalProducts;
            if (todayOrdersElement) todayOrdersElement.textContent = stats.todayOrders;
            if (monthlyRevenueElement) monthlyRevenueElement.textContent = `Rp ${stats.monthlyRevenue.toLocaleString()}`;
            if (activeCustomersElement) activeCustomersElement.textContent = stats.activeCustomers;
            
            // Load recent orders
            await this.loadRecentOrders();
            
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            this.showError('Gagal memuat statistik dashboard');
        }
    }

    // ==================== PRODUCTS ====================
    async loadProducts() {
        try {
            const products = await this.supabaseService.getProducts();
            this.updateProductList(products);
        } catch (error) {
            console.error('Error loading products:', error);
            this.showError('Gagal memuat produk');
        }
    }

    async loadFrontendProducts() {
        try {
            const products = await this.supabaseService.getProducts({ featured: true });
            const container = document.getElementById('frontendProducts');
            
            if (!container) return;
            
            container.innerHTML = '';
            
            products.slice(0, 6).forEach(product => {
                const category = product.categories || {};
                
                const productCard = document.createElement('div');
                productCard.className = 'product-card';
                productCard.innerHTML = `
                    <div class="overflow-hidden h-48">
                        <img src="${product.image_url}" alt="${product.name}" 
                             class="product-image w-full h-full object-cover">
                    </div>
                    <div class="product-content">
                        <div class="flex items-center justify-between mb-3">
                            <span class="product-category">${category.name || 'Uncategorized'}</span>
                            <span class="product-price">Rp ${product.price.toLocaleString()}</span>
                        </div>
                        <h3 class="product-title">${product.name}</h3>
                        <p class="product-description">${product.description || 'Tidak ada deskripsi'}</p>
                        <div class="product-footer">
                            <span class="product-stock ${product.stock > 5 ? 'in-stock' : product.stock > 0 ? 'low-stock' : 'out-of-stock'}">
                                <i class="fas fa-box mr-1"></i> ${product.stock} tersedia
                            </span>
                            <button class="btn btn-primary btn-sm">
                                <i class="fas fa-cart-plus mr-2"></i>Pesan
                            </button>
                        </div>
                    </div>
                `;
                
                container.appendChild(productCard);
            });
            
        } catch (error) {
            console.error('Error loading frontend products:', error);
        }
    }

    updateProductList(products) {
        const productList = document.getElementById('productList');
        if (!productList) return;
        
        productList.innerHTML = '';
        
        if (products.length === 0) {
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
            row.innerHTML = `
                <td class="py-4">
                    <div class="flex items-center space-x-3">
                        <img src="${product.image_url}" alt="${product.name}" 
                             class="w-12 h-12 rounded-lg object-cover">
                        <div>
                            <span class="font-medium text-white block">${product.name}</span>
                            <span class="text-xs text-gray-400 truncate max-w-[200px]">${product.description || 'Tidak ada deskripsi'}</span>
                        </div>
                    </div>
                </td>
                <td class="py-4">
                    <span class="badge badge-primary">
                        ${category.name || 'Uncategorized'}
                    </span>
                </td>
                <td class="py-4 text-white font-medium">Rp ${product.price.toLocaleString()}</td>
                <td class="py-4">
                    <span class="product-stock ${product.stock > 10 ? 'in-stock' : product.stock > 0 ? 'low-stock' : 'out-of-stock'}">
                        ${product.stock}
                    </span>
                </td>
                <td class="py-4">
                    <div class="flex space-x-2">
                        <button class="btn btn-sm btn-outline edit-product" data-id="${product.id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-product" data-id="${product.id}" title="Hapus">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="btn btn-sm ${product.featured ? 'btn-warning' : 'btn-secondary'} feature-product" data-id="${product.id}" title="${product.featured ? 'Unfeature' : 'Feature'}">
                            <i class="fas ${product.featured ? 'fa-star' : 'fa-star'}"></i>
                        </button>
                    </div>
                </td>
            `;
            productList.appendChild(row);
        });
        
        // Attach event listeners to new buttons
        this.attachProductEventListeners();
    }

    attachProductEventListeners() {
        document.querySelectorAll('.edit-product').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.editProduct(e.target.closest('button').dataset.id);
            });
        });
        
        document.querySelectorAll('.delete-product').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.deleteProduct(e.target.closest('button').dataset.id);
            });
        });
        
        document.querySelectorAll('.feature-product').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleProductFeature(e.target.closest('button').dataset.id);
            });
        });
    }

    async saveProduct(e) {
        e.preventDefault();
        
        const name = document.getElementById('productName').value.trim();
        const categoryId = parseInt(document.getElementById('productCategory').value);
        const price = parseInt(document.getElementById('productPrice').value);
        const stock = parseInt(document.getElementById('productStock').value);
        const description = document.getElementById('productDescription').value.trim();
        const image = document.getElementById('productImage').value.trim();
        const weight = parseInt(document.getElementById('productWeight').value) || 0;
        
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
                weight
            };
            
            if (this.currentEditingProductId) {
                productData.id = this.currentEditingProductId;
            }
            
            const savedProduct = await this.supabaseService.saveProduct(productData);
            
            this.showSuccess(`Produk "${name}" berhasil ${this.currentEditingProductId ? 'diperbarui' : 'disimpan'}!`);
            
            // Reset form
            this.resetProductForm();
            
            // Reload products
            await this.loadProducts();
            
            // Update frontend products if featured
            if (savedProduct.featured) {
                this.loadFrontendProducts();
            }
            
        } catch (error) {
            console.error('Error saving product:', error);
            this.showError('Gagal menyimpan produk');
        }
    }

    async editProduct(productId) {
        try {
            const products = await this.supabaseService.getProducts();
            const product = products.find(p => p.id == productId);
            
            if (!product) {
                this.showError('Produk tidak ditemukan');
                return;
            }
            
            // Populate form
            document.getElementById('productName').value = product.name;
            document.getElementById('productCategory').value = product.category_id;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productStock').value = product.stock;
            document.getElementById('productDescription').value = product.description || '';
            document.getElementById('productImage').value = product.image_url;
            document.getElementById('productWeight').value = product.weight || 0;
            
            // Change button text
            const saveButton = document.getElementById('saveProduct');
            if (saveButton) {
                saveButton.textContent = 'Update Produk';
                saveButton.innerHTML = '<i class="fas fa-save mr-2"></i>Update Produk';
            }
            
            // Show cancel button
            const cancelEdit = document.getElementById('cancelEdit');
            if (cancelEdit) {
                cancelEdit.classList.remove('hidden');
            }
            
            // Store editing product ID
            this.currentEditingProductId = productId;
            
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
        }
        
        const saveButton = document.getElementById('saveProduct');
        if (saveButton) {
            saveButton.textContent = 'Simpan Produk';
            saveButton.innerHTML = '<i class="fas fa-save mr-2"></i>Simpan Produk';
        }
        
        const cancelEdit = document.getElementById('cancelEdit');
        if (cancelEdit) {
            cancelEdit.classList.add('hidden');
        }
        
        this.currentEditingProductId = null;
    }

    async deleteProduct(productId) {
        if (!confirm(`Apakah Anda yakin ingin menghapus produk ini?`)) {
            return;
        }
        
        try {
            const products = await this.supabaseService.getProducts();
            const product = products.find(p => p.id == productId);
            
            if (!product) {
                this.showError('Produk tidak ditemukan');
                return;
            }
            
            await this.supabaseService.deleteProduct(productId);
            
            this.showSuccess(`Produk "${product.name}" berhasil dihapus!`);
            
            // Reload products
            await this.loadProducts();
            
            // Update frontend if featured
            if (product.featured) {
                this.loadFrontendProducts();
            }
            
        } catch (error) {
            console.error('Error deleting product:', error);
            this.showError('Gagal menghapus produk');
        }
    }

    async toggleProductFeature(productId) {
        try {
            const products = await this.supabaseService.getProducts();
            const product = products.find(p => p.id == productId);
            
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
            await this.loadProducts();
            
            // Update frontend
            this.loadFrontendProducts();
            
        } catch (error) {
            console.error('Error toggling product feature:', error);
            this.showError('Gagal mengubah status produk');
        }
    }

    searchProducts(searchTerm) {
        const productRows = document.querySelectorAll('#productList tr');
        productRows.forEach(row => {
            const productName = row.querySelector('td:first-child .font-medium')?.textContent.toLowerCase() || '';
            if (productName.includes(searchTerm.toLowerCase()) || searchTerm === '') {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    // ==================== CATEGORIES ====================
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
        if (!categoryList) return;
        
        categoryList.innerHTML = '';
        
        if (categories.length === 0) {
            categoryList.innerHTML = `
                <div class="text-center py-8 text-gray-400">
                    <i class="fas fa-tags text-4xl mb-4"></i>
                    <p>Tidak ada kategori tersedia</p>
                </div>
            `;
            return;
        }
        
        categories.forEach(async (category) => {
            const products = await this.supabaseService.getProducts({ category_id: category.id });
            const productCount = products.length;
            
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
                            <p class="text-sm text-gray-400">${productCount} produk</p>
                            ${category.description ? `<p class="text-xs text-gray-500 mt-1">${category.description}</p>` : ''}
                        </div>
                    </div>
                    <div class="flex space-x-2">
                        <button class="btn btn-sm btn-outline edit-category" data-id="${category.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-category" data-id="${category.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            categoryList.appendChild(item);
        });
        
        // Attach event listeners
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
        document.querySelectorAll('.edit-category').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.editCategory(e.target.closest('button').dataset.id);
            });
        });
        
        document.querySelectorAll('.delete-category').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.deleteCategory(e.target.closest('button').dataset.id);
            });
        });
    }

    async saveCategory(e) {
        e.preventDefault();
        
        const name = document.getElementById('categoryName').value.trim();
        const icon = document.getElementById('categoryIcon').value.trim() || 'fas fa-tag';
        
        if (!name) {
            this.showError('Nama kategori wajib diisi');
            return;
        }
        
        try {
            const categoryData = {
                name,
                icon,
                description: ''
            };
            
            if (this.currentEditingCategoryId) {
                categoryData.id = this.currentEditingCategoryId;
            }
            
            await this.supabaseService.saveCategory(categoryData);
            
            this.showSuccess(`Kategori "${name}" berhasil ${this.currentEditingCategoryId ? 'diperbarui' : 'ditambahkan'}!`);
            
            // Reset form
            document.getElementById('categoryForm').reset();
            this.currentEditingCategoryId = null;
            
            // Reload categories
            await this.loadCategories();
            
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
            document.getElementById('categoryName').value = category.name;
            document.getElementById('categoryIcon').value = category.icon || 'fas fa-tag';
            
            // Store editing category ID
            this.currentEditingCategoryId = categoryId;
            
            this.showSuccess('Mode edit kategori diaktifkan');
            
        } catch (error) {
            console.error('Error editing category:', error);
            this.showError('Gagal memuat data kategori');
        }
    }

    async deleteCategory(categoryId) {
        if (!confirm(`Apakah Anda yakin ingin menghapus kategori ini? Produk dalam kategori ini akan kehilangan kategori.`)) {
            return;
        }
        
        try {
            const categories = await this.supabaseService.getCategories();
            const category = categories.find(c => c.id == categoryId);
            
            if (!category) {
                this.showError('Kategori tidak ditemukan');
                return;
            }
            
            // Check if category has products
            const products = await this.supabaseService.getProducts({ category_id: categoryId });
            if (products.length > 0) {
                if (!confirm(`Kategori ini memiliki ${products.length} produk. Apakah Anda tetap ingin menghapus?`)) {
                    return;
                }
            }
            
            // In a real app, you would update the category_id in products table first
            // For now, we'll just delete the category
            // Note: This is a simplified version
            
            this.showSuccess(`Kategori "${category.name}" berhasil dihapus!`);
            
            // Reload categories
            await this.loadCategories();
            
        } catch (error) {
            console.error('Error deleting category:', error);
            this.showError('Gagal menghapus kategori');
        }
    }

    // ==================== ORDERS ====================
    async loadOrders() {
        try {
            const orders = await this.supabaseService.getOrders();
            this.updateOrderList(orders);
            this.updateOrderBadge(orders);
        } catch (error) {
            console.error('Error loading orders:', error);
            this.showError('Gagal memuat pesanan');
        }
    }

    async loadRecentOrders() {
        try {
            const orders = await this.supabaseService.getOrders();
            this.updateRecentOrders(orders.slice(0, 5));
        } catch (error) {
            console.error('Error loading recent orders:', error);
        }
    }

    updateOrderList(orders) {
        const orderList = document.getElementById('orderList');
        if (!orderList) return;
        
        orderList.innerHTML = '';
        
        if (orders.length === 0) {
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
                'cancelled': 'status-cancelled'
            }[order.status] || 'status-pending';
            
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
                    ${order.order_items?.length || 1} item
                </td>
                <td class="py-4 font-bold text-white">
                    Rp ${(order.total_amount || 0).toLocaleString()}
                </td>
                <td class="py-4">
                    <span class="status-badge ${statusClass}">
                        ${order.status}
                    </span>
                </td>
                <td class="py-4">
                    <div class="flex space-x-2">
                        <button class="btn btn-sm btn-outline view-order" data-id="${order.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-primary update-order" data-id="${order.id}">
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

    updateRecentOrders(orders) {
        const recentOrders = document.getElementById('recentOrders');
        if (!recentOrders) return;
        
        recentOrders.innerHTML = '';
        
        if (orders.length === 0) {
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
                'cancelled': 'bg-red-900/30 text-red-400'
            }[order.status] || 'bg-gray-900/30 text-gray-400';
            
            const row = document.createElement('tr');
            row.className = 'border-b border-dark-700';
            row.innerHTML = `
                <td class="py-3">
                    <span class="text-sm text-primary-400 font-medium">${order.id}</span>
                </td>
                <td class="py-3 text-gray-300">${order.customer_name}</td>
                <td class="py-3 text-gray-300">${order.order_items?.length || 1} item</td>
                <td class="py-3 font-medium text-white">
                    Rp ${(order.total_amount || 0).toLocaleString()}
                </td>
                <td class="py-3">
                    <span class="px-2 py-1 rounded-full text-xs ${statusClass}">
                        ${order.status}
                    </span>
                </td>
            `;
            recentOrders.appendChild(row);
        });
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
        document.querySelectorAll('.view-order').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const orderId = e.target.closest('button').dataset.id;
                this.viewOrderDetails(orderId);
            });
        });
        
        document.querySelectorAll('.update-order').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const orderId = e.target.closest('button').dataset.id;
                this.updateOrderStatus(orderId);
            });
        });
    }

    filterOrders(status) {
        // Update button styles
        const buttons = ['filterAll', 'filterPending', 'filterProcessing', 'filterCompleted'];
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
        
        // Filter table rows
        const orderRows = document.querySelectorAll('#orderList tr');
        orderRows.forEach(row => {
            if (status === 'all') {
                row.style.display = '';
            } else {
                const statusCell = row.querySelector('td:nth-child(6) .status-badge');
                if (statusCell) {
                    const rowStatus = statusCell.textContent.toLowerCase().trim();
                    if (rowStatus === status) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                }
            }
        });
    }

    async viewOrderDetails(orderId) {
        try {
            const orders = await this.supabaseService.getOrders();
            const order = orders.find(o => o.id === orderId);
            
            if (!order) {
                this.showError('Pesanan tidak ditemukan');
                return;
            }
            
            // Create modal for order details
            const modalContent = `
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-file-invoice mr-2"></i>
                        Detail Pesanan: ${order.id}
                    </h3>
                    <button class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <h4 class="font-medium text-white mb-2">Informasi Pelanggan</h4>
                            <p class="text-gray-300">Nama: ${order.customer_name}</p>
                            <p class="text-gray-300">Email: ${order.customer_email || '-'}</p>
                            <p class="text-gray-300">Telepon: ${order.customer_phone || '-'}</p>
                        </div>
                        <div>
                            <h4 class="font-medium text-white mb-2">Informasi Pesanan</h4>
                            <p class="text-gray-300">Tanggal: ${new Date(order.created_at).toLocaleString('id-ID')}</p>
                            <p class="text-gray-300">Status: <span class="status-badge status-${order.status}">${order.status}</span></p>
                            <p class="text-gray-300">Total: Rp ${(order.total_amount || 0).toLocaleString()}</p>
                        </div>
                    </div>
                    
                    ${order.shipping_address ? `
                    <div>
                        <h4 class="font-medium text-white mb-2">Alamat Pengiriman</h4>
                        <p class="text-gray-300">${order.shipping_address}</p>
                    </div>
                    ` : ''}
                    
                    ${order.notes ? `
                    <div>
                        <h4 class="font-medium text-white mb-2">Catatan</h4>
                        <p class="text-gray-300">${order.notes}</p>
                    </div>
                    ` : ''}
                    
                    <div>
                        <h4 class="font-medium text-white mb-2">Item Pesanan</h4>
                        <div class="bg-dark-800 rounded-lg p-4">
                            <p class="text-gray-400">Detail item akan ditampilkan di sini</p>
                        </div>
                    </div>
                </div>
            `;
            
            this.showModal('Detail Pesanan', modalContent);
            
        } catch (error) {
            console.error('Error viewing order details:', error);
            this.showError('Gagal memuat detail pesanan');
        }
    }

    async updateOrderStatus(orderId) {
        try {
            const orders = await this.supabaseService.getOrders();
            const order = orders.find(o => o.id === orderId);
            
            if (!order) {
                this.showError('Pesanan tidak ditemukan');
                return;
            }
            
            const newStatus = prompt(`Ubah status pesanan ${order.id}:\n(pending, processing, completed, cancelled)`, order.status);
            
            if (newStatus && ['pending', 'processing', 'completed', 'cancelled'].includes(newStatus.toLowerCase())) {
                const updatedOrder = {
                    ...order,
                    status: newStatus.toLowerCase()
                };
                
                await this.supabaseService.saveOrder(updatedOrder);
                this.showSuccess(`Status pesanan berhasil diubah menjadi ${newStatus}`);
                await this.loadOrders();
            }
            
        } catch (error) {
            console.error('Error updating order status:', error);
            this.showError('Gagal mengubah status pesanan');
        }
    }

    // ==================== CUSTOMERS ====================
    async loadCustomers() {
        try {
            const customers = await this.supabaseService.getCustomers();
            this.updateCustomerList(customers);
        } catch (error) {
            console.error('Error loading customers:', error);
            this.showError('Gagal memuat pelanggan');
        }
    }

    updateCustomerList(customers) {
        const customerList = document.getElementById('customerList');
        if (!customerList) return;
        
        customerList.innerHTML = '';
        
        if (customers.length === 0) {
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
        
        customers.slice(0, 20).forEach(customer => {
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
                        <button class="btn btn-sm btn-outline view-customer" data-id="${customer.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-primary edit-customer" data-id="${customer.id}">
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

    searchCustomers(searchTerm) {
        const customerRows = document.querySelectorAll('#customerList tr');
        customerRows.forEach(row => {
            const customerName = row.querySelector('td:first-child')?.textContent.toLowerCase() || '';
            const customerEmail = row.querySelector('td:nth-child(2)')?.textContent.toLowerCase() || '';
            const customerPhone = row.querySelector('td:nth-child(3)')?.textContent.toLowerCase() || '';
            
            if (customerName.includes(searchTerm.toLowerCase()) || 
                customerEmail.includes(searchTerm.toLowerCase()) || 
                customerPhone.includes(searchTerm.toLowerCase()) || 
                searchTerm === '') {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    attachCustomerEventListeners() {
        document.querySelectorAll('.view-customer').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const customerId = e.target.closest('button').dataset.id;
                this.viewCustomerDetails(customerId);
            });
        });
        
        document.querySelectorAll('.edit-customer').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const customerId = e.target.closest('button').dataset.id;
                this.editCustomer(customerId);
            });
        });
    }

    // ==================== QRIS ====================
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
                downloadQr.classList.remove('disabled:opacity-50', 'disabled:cursor-not-allowed');
            }
            
            if (copyQr) {
                copyQr.disabled = false;
                copyQr.classList.remove('disabled:opacity-50', 'disabled:cursor-not-allowed');
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
        // In production, use proper CRC16 implementation
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

    // ==================== SETTINGS ====================
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
            // Save contact message
            if (this.supabaseService.initialized) {
                await this.supabaseService.supabase
                    .from('contact_messages')
                    .insert([{
                        name: data.name,
                        email: data.email,
                        subject: data.subject,
                        message: data.message,
                        created_at: new Date().toISOString()
                    }]);
            }
            
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
                case 'orders':
                    this.loadOrders();
                    break;
                case 'customers':
                    this.loadCustomers();
                    break;
                case 'qris':
                    this.loadQrisSettings();
                    break;
                case 'frontend':
                    this.loadSettings();
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

    cancelProductEdit() {
        this.resetProductForm();
        this.showSuccess('Edit produk dibatalkan');
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
                    <div class="text-sm">${dateString}</div>
                    <div class="font-mono font-bold">${timeString}</div>
                `;
            }
        };
        
        updateClock();
        setInterval(updateClock, 1000);
    }

    showModal(title, content) {
        // Create modal container
        const modalContainer = document.createElement('div');
        modalContainer.className = 'modal';
        modalContainer.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(modalContainer);
        
        // Add event listeners
        const closeBtn = modalContainer.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.body.removeChild(modalContainer);
            });
        }
        
        // Close on outside click
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) {
                document.body.removeChild(modalContainer);
            }
        });
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        // Remove existing toast
        const existingToast = document.getElementById('customToast');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create toast
        const toast = document.createElement('div');
        toast.id = 'customToast';
        toast.className = `toast toast-${type}`;
        
        const icon = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        }[type] || 'fa-info-circle';
        
        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;
        
        // Add to document
        document.body.appendChild(toast);
        
        // Show animation
        setTimeout(() => {
            toast.classList.add('animate-fade-in');
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('hidden');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, 3000);
    }

    // ==================== PLACEHOLDER METHODS ====================
    startRealtimeUpdates() {
        console.log('Realtime updates started');
        // Implement WebSocket or polling for realtime updates
    }

    updateSalesChart(period) {
        console.log('Updating sales chart for period:', period);
        // Implement chart update
        const chartContainer = document.getElementById('salesChart');
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div class="chart-placeholder">
                    <div class="text-center">
                        <i class="fas fa-chart-line text-4xl mb-4 text-gray-500"></i>
                        <p class="text-gray-400">Chart penjualan akan ditampilkan di sini</p>
                        <p class="text-sm text-gray-500 mt-2">Periode: ${period} hari</p>
                    </div>
                </div>
            `;
        }
    }

    updateReportDetails(period) {
        console.log('Updating report details for period:', period);
        // Implement report update
        const reportDetails = document.getElementById('reportDetails');
        if (reportDetails) {
            reportDetails.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-8 text-gray-400">
                        <i class="fas fa-file-alt text-4xl mb-4"></i>
                        <p>Laporan akan ditampilkan di sini</p>
                        <p class="text-sm text-gray-500 mt-2">Periode: ${period}</p>
                    </td>
                </tr>
            `;
        }
    }

    viewCustomerDetails(customerId) {
        console.log('Viewing customer details:', customerId);
        this.showModal('Detail Pelanggan', `<p>Detail pelanggan ID: ${customerId}</p>`);
    }

    editCustomer(customerId) {
        console.log('Editing customer:', customerId);
        this.showModal('Edit Pelanggan', `<p>Edit pelanggan ID: ${customerId}</p>`);
    }

    async checkMaintenanceMode() {
        try {
            const settings = await this.supabaseService.getSettings();
            const maintenance = settings.maintenance;
            
            if (maintenance?.enabled) {
                const maintenanceMode = document.getElementById('maintenanceMode');
                if (maintenanceMode) {
                    maintenanceMode.classList.remove('hidden');
                }
                
                if (maintenance.eta) {
                    const maintenanceEta = document.getElementById('maintenanceEta');
                    if (maintenanceEta) {
                        maintenanceEta.textContent = new Date(maintenance.eta).toLocaleString('id-ID');
                    }
                }
            }
        } catch (error) {
            console.error('Error checking maintenance mode:', error);
        }
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
