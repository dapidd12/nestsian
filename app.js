// NestSian - Main Application Logic
class NestSian {
    constructor() {
        this.currentEditingProductId = null;
        this.supabaseService = null;
        this.init();
    }

    async init() {
        // Initialize AOS
        AOS.init({
            duration: 600,
            once: true,
            offset: 100
        });

        // Initialize Supabase Service
        this.supabaseService = window.supabaseService;
        
        // Wait for Supabase initialization
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Load initial data
        await this.loadInitialData();
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Check maintenance mode
        await this.checkMaintenanceMode();
        
        // Start real-time clock
        this.startClock();
        
        // Hide loading screen
        setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
            // Show frontend website
            document.getElementById('frontend').classList.remove('hidden');
            this.loadFrontendProducts();
        }, 1500);
    }

    async loadInitialData() {
        try {
            // Load dashboard stats
            await this.loadDashboardStats();
            
            // Load products
            await this.loadProducts();
            
            // Load categories
            await this.loadCategories();
            
            // Load orders
            await this.loadOrders();
            
            // Load QRIS settings
            await this.loadQrisSettings();
            
            // Load customers
            await this.loadCustomers();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Gagal memuat data awal');
        }
    }

    initEventListeners() {
        // Frontend Events
        document.getElementById('loginBtn').addEventListener('click', () => {
            document.getElementById('loginModal').classList.remove('hidden');
        });
        
        // Contact Form
        document.getElementById('contactForm')?.addEventListener('submit', (e) => this.handleContactSubmit(e));
        
        // Login Form
        document.getElementById('loginSubmit').addEventListener('click', (e) => this.handleLogin(e));
        
        // Sidebar Toggle
        document.getElementById('sidebarToggle').addEventListener('click', () => this.toggleSidebar());
        
        // Sidebar Links
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', (e) => this.switchSection(e));
        });
        
        // Admin Panel
        document.getElementById('adminPanelBtn').addEventListener('click', () => this.showAdminPanel());
        document.getElementById('closeAdminPanel').addEventListener('click', () => this.hideAdminPanel());
        
        // Product Form
        document.getElementById('productForm').addEventListener('submit', (e) => this.saveProduct(e));
        document.getElementById('cancelEdit').addEventListener('click', () => this.cancelProductEdit());
        document.getElementById('searchProduct').addEventListener('input', (e) => this.searchProducts(e.target.value));
        
        // Category Form
        document.getElementById('categoryForm').addEventListener('submit', (e) => this.saveCategory(e));
        
        // QRIS Settings
        document.getElementById('qrisSettingsForm').addEventListener('submit', (e) => this.saveQrisSettings(e));
        
        // QRIS Generator
        document.getElementById('generateQris').addEventListener('click', () => this.generateQRIS());
        document.querySelectorAll('.quick-amount').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const amount = e.target.dataset.amount;
                document.getElementById('qrisAmount').value = amount;
            });
        });
        
        // Download QR
        document.getElementById('downloadQr').addEventListener('click', () => this.downloadQR());
        document.getElementById('copyQr').addEventListener('click', () => this.copyQRString());
        
        // Orders Filter
        document.getElementById('filterAll').addEventListener('click', () => this.filterOrders('all'));
        document.getElementById('filterPending').addEventListener('click', () => this.filterOrders('pending'));
        document.getElementById('filterProcessing').addEventListener('click', () => this.filterOrders('processing'));
        document.getElementById('filterCompleted').addEventListener('click', () => this.filterOrders('completed'));
        
        // Search Customers
        document.getElementById('searchCustomer').addEventListener('input', (e) => this.searchCustomers(e.target.value));
        
        // Reports
        document.getElementById('chartPeriod')?.addEventListener('change', (e) => this.updateSalesChart(e.target.value));
        document.getElementById('reportPeriod')?.addEventListener('change', (e) => this.updateReportDetails(e.target.value));
        
        // Website Settings
        document.getElementById('websiteSettingsForm')?.addEventListener('submit', (e) => this.saveWebsiteSettings(e));
        document.getElementById('heroSettingsForm')?.addEventListener('submit', (e) => this.saveHeroSettings(e));
        
        // System Settings
        document.getElementById('systemSettingsForm')?.addEventListener('submit', (e) => this.saveSystemSettings(e));
        
        // Maintenance Toggle
        document.getElementById('maintenanceToggle')?.addEventListener('change', (e) => this.toggleMaintenance(e));
        document.getElementById('saveMaintenance')?.addEventListener('click', () => this.saveMaintenanceSettings());
        
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            this.showError('Silakan isi email dan password');
            return;
        }
        
        const loginBtn = document.getElementById('loginSubmit');
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Memproses...';
        
        try {
            const result = await this.supabaseService.signIn(email, password);
            
            if (result.success) {
                this.showSuccess('Login berhasil!');
                
                setTimeout(() => {
                    document.getElementById('loginModal').classList.add('hidden');
                    document.getElementById('frontend').classList.add('hidden');
                    document.getElementById('mainLayout').classList.remove('hidden');
                    
                    // Initialize real-time updates
                    this.startRealtimeUpdates();
                }, 1000);
            } else {
                this.showError(result.error || 'Email atau password salah');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Terjadi kesalahan saat login');
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Masuk ke Dashboard';
        }
    }

    async loadFrontendProducts() {
        try {
            const products = await this.supabaseService.getProducts({ featured: true });
            const container = document.getElementById('frontendProducts');
            
            if (!container) return;
            
            container.innerHTML = '';
            
            products.slice(0, 6).forEach(product => {
                const category = product.categories;
                
                const productCard = document.createElement('div');
                productCard.className = 'bg-gradient-to-br from-dark-800 to-dark-900 rounded-2xl overflow-hidden border border-dark-700 hover:border-primary-500/50 transition-all duration-300 hover:scale-[1.02]';
                productCard.innerHTML = `
                    <div class="h-48 overflow-hidden">
                        <img src="${product.image_url}" alt="${product.name}" 
                             class="w-full h-full object-cover hover:scale-110 transition-transform duration-500">
                    </div>
                    <div class="p-6">
                        <div class="flex items-center justify-between mb-3">
                            <span class="px-3 py-1 bg-primary-900/30 text-primary-400 text-xs rounded-full">
                                ${category?.name || 'Uncategorized'}
                            </span>
                            <span class="text-lg font-bold text-white">Rp ${product.price.toLocaleString()}</span>
                        </div>
                        <h3 class="text-lg font-semibold text-white mb-2">${product.name}</h3>
                        <p class="text-gray-400 text-sm mb-4">${product.description}</p>
                        <div class="flex items-center justify-between">
                            <span class="text-sm ${product.stock > 5 ? 'text-green-400' : 'text-red-400'}">
                                <i class="fas fa-box mr-1"></i> ${product.stock} tersedia
                            </span>
                            <button class="px-4 py-2 bg-gradient-to-r from-primary-600 to-secondary-600 text-white text-sm rounded-lg hover:opacity-90 transition-all">
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

    async handleContactSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        if (!data.name || !data.email || !data.subject || !data.message) {
            this.showError('Silakan isi semua field');
            return;
        }
        
        try {
            // Save contact message to Supabase
            if (this.supabaseService.initialized) {
                const { error } = await this.supabaseService.supabase
                    .from('contact_messages')
                    .insert([{
                        name: data.name,
                        email: data.email,
                        subject: data.subject,
                        message: data.message,
                        created_at: new Date().toISOString()
                    }]);
                
                if (error) throw error;
            }
            
            this.showSuccess('Pesan Anda telah terkirim! Kami akan menghubungi Anda segera.');
            e.target.reset();
            
        } catch (error) {
            console.error('Error sending contact message:', error);
            this.showError('Gagal mengirim pesan');
        }
    }

    async loadDashboardStats() {
        try {
            const stats = await this.supabaseService.getDashboardStats();
            
            document.getElementById('totalProducts').textContent = stats.totalProducts;
            document.getElementById('todayOrders').textContent = stats.todayOrders;
            document.getElementById('monthlyRevenue').textContent = `Rp ${stats.monthlyRevenue.toLocaleString()}`;
            document.getElementById('activeCustomers').textContent = stats.activeCustomers;
            
            // Load recent orders
            await this.loadRecentOrders();
            
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    async loadProducts() {
        try {
            const products = await this.supabaseService.getProducts();
            
            const productList = document.getElementById('productList');
            if (!productList) return;
            
            productList.innerHTML = '';
            
            products.forEach(product => {
                const category = product.categories;
                
                const row = document.createElement('tr');
                row.className = 'border-b border-dark-700 hover:bg-dark-800/50 transition-colors';
                row.innerHTML = `
                    <td class="py-4">
                        <div class="flex items-center space-x-3">
                            <img src="${product.image_url}" alt="${product.name}" 
                                 class="w-12 h-12 rounded-lg object-cover">
                            <div>
                                <span class="font-medium text-white block">${product.name}</span>
                                <span class="text-xs text-gray-400 truncate max-w-[200px]">${product.description}</span>
                            </div>
                        </div>
                    </td>
                    <td class="py-4">
                        <span class="px-3 py-1 bg-dark-700 text-gray-300 rounded-full text-sm">
                            ${category?.name || 'Uncategorized'}
                        </span>
                    </td>
                    <td class="py-4 text-white font-medium">Rp ${product.price.toLocaleString()}</td>
                    <td class="py-4">
                        <span class="px-3 py-1 rounded-full text-sm ${product.stock > 10 ? 'bg-green-900/30 text-green-400' : 
                            product.stock > 0 ? 'bg-yellow-900/30 text-yellow-400' : 'bg-red-900/30 text-red-400'}">
                            ${product.stock}
                        </span>
                    </td>
                    <td class="py-4">
                        <div class="flex space-x-2">
                            <button class="edit-product text-primary-400 hover:text-primary-300 transition-colors" 
                                    data-id="${product.id}" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="delete-product text-red-400 hover:text-red-300 transition-colors" 
                                    data-id="${product.id}" title="Hapus">
                                <i class="fas fa-trash"></i>
                            </button>
                            <button class="feature-product text-yellow-400 hover:text-yellow-300 transition-colors" 
                                    data-id="${product.id}" title="${product.featured ? 'Unfeature' : 'Feature'}">
                                <i class="fas ${product.featured ? 'fa-star' : 'fa-star'}"></i>
                            </button>
                        </div>
                    </td>
                `;
                productList.appendChild(row);
            });
            
            // Add event listeners
            this.attachProductEventListeners();
            
        } catch (error) {
            console.error('Error loading products:', error);
            this.showError('Gagal memuat produk');
        }
    }

    attachProductEventListeners() {
        document.querySelectorAll('.edit-product').forEach(btn => {
            btn.addEventListener('click', (e) => this.editProduct(e.target.closest('button').dataset.id));
        });
        
        document.querySelectorAll('.delete-product').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteProduct(e.target.closest('button').dataset.id));
        });
        
        document.querySelectorAll('.feature-product').forEach(btn => {
            btn.addEventListener('click', (e) => this.toggleProductFeature(e.target.closest('button').dataset.id));
        });
    }

    async saveProduct(e) {
        e.preventDefault();
        
        const name = document.getElementById('productName').value;
        const categoryId = parseInt(document.getElementById('productCategory').value);
        const price = parseInt(document.getElementById('productPrice').value);
        const stock = parseInt(document.getElementById('productStock').value);
        const description = document.getElementById('productDescription').value;
        const image = document.getElementById('productImage').value;
        const weight = parseInt(document.getElementById('productWeight').value) || 0;
        
        if (!name || !categoryId || !price || !stock || !description || !image) {
            this.showError('Silakan isi semua field yang diperlukan');
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
            const product = products.find(p => p.id === parseInt(productId));
            
            if (!product) {
                this.showError('Produk tidak ditemukan');
                return;
            }
            
            // Populate form
            document.getElementById('productName').value = product.name;
            document.getElementById('productCategory').value = product.category_id;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productStock').value = product.stock;
            document.getElementById('productDescription').value = product.description;
            document.getElementById('productImage').value = product.image_url;
            document.getElementById('productWeight').value = product.weight || 0;
            
            // Change button text
            document.getElementById('saveProduct').textContent = 'Update Produk';
            document.getElementById('cancelEdit').classList.remove('hidden');
            
            // Store editing product ID
            this.currentEditingProductId = parseInt(productId);
            
            // Scroll to form
            document.getElementById('productName').scrollIntoView({ behavior: 'smooth' });
            
            this.showSuccess('Mode edit diaktifkan');
            
        } catch (error) {
            console.error('Error editing product:', error);
            this.showError('Gagal memuat data produk');
        }
    }

    resetProductForm() {
        document.getElementById('productForm').reset();
        document.getElementById('saveProduct').textContent = 'Simpan Produk';
        document.getElementById('cancelEdit').classList.add('hidden');
        this.currentEditingProductId = null;
    }

    async deleteProduct(productId) {
        if (!confirm(`Apakah Anda yakin ingin menghapus produk ini?`)) {
            return;
        }
        
        try {
            const products = await this.supabaseService.getProducts();
            const product = products.find(p => p.id === parseInt(productId));
            
            if (!product) {
                this.showError('Produk tidak ditemukan');
                return;
            }
            
            await this.supabaseService.deleteProduct(parseInt(productId));
            
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
            const product = products.find(p => p.id === parseInt(productId));
            
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

    async loadCategories() {
        try {
            const categories = await this.supabaseService.getCategories();
            
            // Update category list
            const categoryList = document.getElementById('categoryList');
            if (categoryList) {
                categoryList.innerHTML = '';
                
                categories.forEach(async (category) => {
                    const products = await this.supabaseService.getProducts({ category_id: category.id });
                    const productCount = products.length;
                    
                    const item = document.createElement('div');
                    item.className = 'flex items-center justify-between p-3 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors';
                    item.innerHTML = `
                        <div class="flex items-center space-x-3">
                            <div class="text-primary-400">
                                <i class="${category.icon}"></i>
                            </div>
                            <div>
                                <h4 class="font-medium text-white">${category.name}</h4>
                                <p class="text-sm text-gray-400">${productCount} produk</p>
                            </div>
                        </div>
                        <div class="flex space-x-2">
                            <button class="edit-category text-gray-400 hover:text-white transition-colors" data-id="${category.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="delete-category text-red-400 hover:text-red-300 transition-colors" data-id="${category.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                    categoryList.appendChild(item);
                });
            }
            
            // Populate category select in product form
            const categorySelect = document.getElementById('productCategory');
            if (categorySelect) {
                categorySelect.innerHTML = '<option value="">Pilih Kategori</option>';
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    categorySelect.appendChild(option);
                });
            }
            
        } catch (error) {
            console.error('Error loading categories:', error);
            this.showError('Gagal memuat kategori');
        }
    }

    async saveCategory(e) {
        e.preventDefault();
        
        const name = document.getElementById('categoryName').value;
        const icon = document.getElementById('categoryIcon').value;
        
        if (!name) {
            this.showError('Silakan isi nama kategori');
            return;
        }
        
        try {
            const categoryData = {
                name,
                icon: icon || 'fas fa-tag',
                description: ''
            };
            
            const savedCategory = await this.supabaseService.saveCategory(categoryData);
            
            this.showSuccess(`Kategori "${name}" berhasil ditambahkan!`);
            document.getElementById('categoryForm').reset();
            
            // Reload categories
            await this.loadCategories();
            
        } catch (error) {
            console.error('Error saving category:', error);
            this.showError('Gagal menyimpan kategori');
        }
    }

    async loadOrders() {
        try {
            const orders = await this.supabaseService.getOrders();
            this.updateOrderList(orders);
            this.updateRecentOrders(orders.slice(0, 5));
            
            // Update order badge
            const pendingOrders = orders.filter(o => o.status === 'pending').length;
            document.getElementById('orderBadge').textContent = pendingOrders;
            
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

    async loadCustomers() {
        try {
            const customers = await this.supabaseService.getCustomers();
            this.updateCustomerList(customers);
        } catch (error) {
            console.error('Error loading customers:', error);
            this.showError('Gagal memuat pelanggan');
        }
    }

    async loadQrisSettings() {
        try {
            const settings = await this.supabaseService.getSettings();
            const qrisSettings = settings.qris;
            
            if (qrisSettings) {
                document.getElementById('qrisMerchantName').value = qrisSettings.merchant_name || '';
                document.getElementById('qrisMerchantId').value = qrisSettings.merchant_id || '';
                document.getElementById('qrisCity').value = qrisSettings.city || '';
                document.getElementById('qrisPostalCode').value = qrisSettings.postal_code || '';
                document.getElementById('qrisBase').value = qrisSettings.base_string || '';
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
        const amount = document.getElementById('qrisAmount').value;
        const description = document.getElementById('qrisDescription').value;
        
        if (!amount || parseInt(amount) < 1000) {
            this.showError('Silakan masukkan jumlah pembayaran minimal Rp 1.000');
            return;
        }
        
        try {
            // Get QRIS settings
            const settings = await this.supabaseService.getSettings();
            const qrisSettings = settings.qris;
            
            // Generate QRIS string
            const qrisString = this.generateQrisString(amount, description, qrisSettings.base_string);
            
            // Clear previous QR code
            document.getElementById('qrcodePreview').innerHTML = '';
            
            // Generate new QR code
            new QRCode(document.getElementById('qrcodePreview'), {
                text: qrisString,
                width: 250,
                height: 250,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
            
            // Update preview info
            document.getElementById('previewAmount').textContent = `Rp ${parseInt(amount).toLocaleString()}`;
            document.getElementById('previewMerchant').textContent = qrisSettings.merchant_name;
            document.getElementById('previewStatus').textContent = 'Aktif';
            document.getElementById('previewStatus').className = 'text-green-400 font-medium';
            
            // Enable buttons
            document.getElementById('downloadQr').disabled = false;
            document.getElementById('copyQr').disabled = false;
            
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
        // This is a simplified QRIS generation
        // In production, use proper QRIS library
        
        if (!baseString) {
            baseString = '00020101021126570011ID.DANA.WWW011893600915376904960002097690496000303UMI51440014ID.CO.QRIS.WWW0215ID10243512603270303UMI5204481453033605802ID5912NESTSIAN STORE6014JAKARTA SELATAN6105123456304';
        }
        
        const amountFormatted = amount.padStart(13, '0');
        const rawString = `${baseString}54${amountFormatted.length.toString().padStart(2, '0')}${amountFormatted}6304`;
        
        // Calculate CRC16
        const crc = this.calculateCRC16(rawString);
        return rawString + crc;
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

    async checkMaintenanceMode() {
        try {
            const settings = await this.supabaseService.getSettings();
            const maintenance = settings.maintenance;
            
            if (maintenance?.enabled) {
                document.getElementById('maintenanceMode').classList.remove('hidden');
                document.getElementById('loginModal').classList.add('hidden');
                document.getElementById('frontend').classList.add('hidden');
                
                if (maintenance.eta) {
                    document.getElementById('maintenanceEta').textContent = 
                        new Date(maintenance.eta).toLocaleString('id-ID');
                }
                
                if (maintenance.message) {
                    document.querySelector('#maintenanceMode p').textContent = maintenance.message;
                }
            }
        } catch (error) {
            console.error('Error checking maintenance mode:', error);
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

    // ... (methods lainnya tetap sama seperti sebelumnya)

    async handleLogout() {
        if (confirm('Apakah Anda yakin ingin keluar?')) {
            try {
                await this.supabaseService.signOut();
                
                // Show frontend
                document.getElementById('mainLayout').classList.add('hidden');
                document.getElementById('frontend').classList.remove('hidden');
                
                this.showSuccess('Berhasil logout');
            } catch (error) {
                console.error('Logout error:', error);
                this.showError('Gagal logout');
            }
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.nestSian = new NestSian();
});