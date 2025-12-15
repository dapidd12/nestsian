// NestSian - Main Application Logic
class NestSian {
    constructor() {
        this.init();
    }

    async init() {
        // Initialize AOS
        AOS.init({
            duration: 600,
            once: true,
            offset: 100
        });

        // Initialize Supabase
        await this.initSupabase();
        
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
            document.getElementById('loginModal').classList.remove('hidden');
        }, 1500);
    }

    async initSupabase() {
        // Supabase will be initialized from supabase-config.js
        if (typeof supabase === 'undefined') {
            console.error('Supabase not initialized');
            this.showError('Database connection failed. Running in offline mode.');
        }
    }

    async loadInitialData() {
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
    }

    initEventListeners() {
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
        
        // Maintenance Toggle
        document.getElementById('maintenanceToggle').addEventListener('change', (e) => this.toggleMaintenance(e));
        
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
        
        try {
            // In production, this would authenticate with Supabase
            // For demo, we'll use hardcoded credentials
            if (email === 'admin@nestsian.com' && password === 'admin123') {
                this.showSuccess('Login berhasil!');
                
                setTimeout(() => {
                    document.getElementById('loginModal').classList.add('hidden');
                    document.getElementById('mainLayout').classList.remove('hidden');
                    
                    // Initialize real-time updates
                    this.startRealtimeUpdates();
                }, 1000);
            } else {
                this.showError('Email atau password salah');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Terjadi kesalahan saat login');
        }
    }

    async loadDashboardStats() {
        try {
            // Simulate API call
            setTimeout(() => {
                document.getElementById('totalProducts').textContent = '24';
                document.getElementById('todayOrders').textContent = '8';
                document.getElementById('monthlyRevenue').textContent = 'Rp 12.450.000';
                document.getElementById('activeCustomers').textContent = '156';
                
                // Load recent orders
                this.loadRecentOrders();
            }, 500);
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    async loadProducts() {
        try {
            // Simulate loading products from database
            const products = [
                {
                    id: 1,
                    name: 'Security Panel Basic',
                    category: 'Security',
                    price: 149000,
                    stock: 15,
                    image: 'https://via.placeholder.com/100'
                },
                {
                    id: 2,
                    name: 'Enterprise Firewall',
                    category: 'Networking',
                    price: 499000,
                    stock: 8,
                    image: 'https://via.placeholder.com/100'
                },
                {
                    id: 3,
                    name: 'VPN Premium',
                    category: 'Security',
                    price: 89000,
                    stock: 45,
                    image: 'https://via.placeholder.com/100'
                }
            ];
            
            const productList = document.getElementById('productList');
            productList.innerHTML = '';
            
            products.forEach(product => {
                const row = document.createElement('tr');
                row.className = 'border-b border-dark-700';
                row.innerHTML = `
                    <td class="py-3">
                        <div class="flex items-center space-x-3">
                            <img src="${product.image}" alt="${product.name}" class="w-10 h-10 rounded-lg object-cover">
                            <span class="font-medium">${product.name}</span>
                        </div>
                    </td>
                    <td class="py-3 text-gray-300">${product.category}</td>
                    <td class="py-3 text-white font-medium">Rp ${product.price.toLocaleString()}</td>
                    <td class="py-3">
                        <span class="px-3 py-1 rounded-full text-sm ${product.stock > 10 ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}">
                            ${product.stock}
                        </span>
                    </td>
                    <td class="py-3">
                        <div class="flex space-x-2">
                            <button class="edit-product text-primary-400 hover:text-primary-300" data-id="${product.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="delete-product text-red-400 hover:text-red-300" data-id="${product.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                productList.appendChild(row);
            });
            
            // Add event listeners to edit/delete buttons
            document.querySelectorAll('.edit-product').forEach(btn => {
                btn.addEventListener('click', (e) => this.editProduct(e.target.closest('button').dataset.id));
            });
            
            document.querySelectorAll('.delete-product').forEach(btn => {
                btn.addEventListener('click', (e) => this.deleteProduct(e.target.closest('button').dataset.id));
            });
            
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    async saveProduct(e) {
        e.preventDefault();
        
        const name = document.getElementById('productName').value;
        const price = parseInt(document.getElementById('productPrice').value);
        const stock = parseInt(document.getElementById('productStock').value);
        
        if (!name || !price || !stock) {
            this.showError('Silakan isi semua field yang diperlukan');
            return;
        }
        
        try {
            // Simulate API call
            this.showSuccess('Produk berhasil disimpan!');
            
            // Reset form
            document.getElementById('productForm').reset();
            document.getElementById('saveProduct').textContent = 'Simpan Produk';
            document.getElementById('cancelEdit').classList.add('hidden');
            
            // Reload products
            await this.loadProducts();
            
        } catch (error) {
            console.error('Error saving product:', error);
            this.showError('Gagal menyimpan produk');
        }
    }

    async loadCategories() {
        try {
            const categories = [
                { id: 1, name: 'Security', icon: 'fas fa-shield-alt', productCount: 12 },
                { id: 2, name: 'Networking', icon: 'fas fa-network-wired', productCount: 8 },
                { id: 3, name: 'Software', icon: 'fas fa-code', productCount: 4 }
            ];
            
            const categoryList = document.getElementById('categoryList');
            categoryList.innerHTML = '';
            
            categories.forEach(category => {
                const item = document.createElement('div');
                item.className = 'flex items-center justify-between p-3 bg-dark-800 rounded-lg';
                item.innerHTML = `
                    <div class="flex items-center space-x-3">
                        <div class="text-primary-400">
                            <i class="${category.icon}"></i>
                        </div>
                        <div>
                            <h4 class="font-medium text-white">${category.name}</h4>
                            <p class="text-sm text-gray-400">${category.productCount} produk</p>
                        </div>
                    </div>
                    <div class="flex space-x-2">
                        <button class="text-gray-400 hover:text-white">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="text-red-400 hover:text-red-300">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                categoryList.appendChild(item);
            });
            
            // Populate category select in product form
            const categorySelect = document.getElementById('productCategory');
            categorySelect.innerHTML = '<option value="">Pilih Kategori</option>';
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                categorySelect.appendChild(option);
            });
            
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async loadOrders() {
        // Load orders logic
        const orders = [
            {
                id: 'NS-001',
                customer: 'John Doe',
                products: 'Security Panel',
                total: 149000,
                status: 'completed'
            },
            {
                id: 'NS-002',
                customer: 'Jane Smith',
                products: 'VPN Premium',
                total: 89000,
                status: 'processing'
            }
        ];
        
        this.updateOrderList(orders);
        this.updateRecentOrders(orders);
    }

    async loadQrisSettings() {
        try {
            // Load QRIS settings from database
            const settings = {
                merchantName: 'NestSian Store',
                merchantId: 'ID.NESTSIAN.WWW',
                city: 'Jakarta',
                postalCode: '12345',
                baseString: '00020101021126570011ID.DANA.WWW011893600915376904960002097690496000303UMI51440014ID.CO.QRIS.WWW0215ID10243512603270303UMI5204481453033605802ID5912NESTSIAN STORE6014JAKARTA SELATAN6105123456304'
            };
            
            document.getElementById('qrisMerchantName').value = settings.merchantName;
            document.getElementById('qrisMerchantId').value = settings.merchantId;
            document.getElementById('qrisCity').value = settings.city;
            document.getElementById('qrisPostalCode').value = settings.postalCode;
            document.getElementById('qrisBase').value = settings.baseString;
            
        } catch (error) {
            console.error('Error loading QRIS settings:', error);
        }
    }

    async generateQRIS() {
        const amount = document.getElementById('qrisAmount').value;
        const description = document.getElementById('qrisDescription').value;
        
        if (!amount) {
            this.showError('Silakan masukkan jumlah pembayaran');
            return;
        }
        
        try {
            // Generate QRIS string
            const qrisString = this.generateQrisString(amount, description);
            
            // Generate QR Code
            document.getElementById('qrcodePreview').innerHTML = '';
            new QRCode(document.getElementById('qrcodePreview'), {
                text: qrisString,
                width: 200,
                height: 200,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
            
            // Update preview info
            document.getElementById('previewAmount').textContent = `Rp ${parseInt(amount).toLocaleString()}`;
            document.getElementById('previewMerchant').textContent = document.getElementById('qrisMerchantName').value;
            document.getElementById('previewStatus').textContent = 'Aktif';
            document.getElementById('previewStatus').className = 'text-green-400 font-medium';
            
            // Enable buttons
            document.getElementById('downloadQr').disabled = false;
            document.getElementById('copyQr').disabled = false;
            
            // Start countdown
            this.startQRCountdown();
            
            this.showSuccess('QR Code berhasil digenerate!');
            
        } catch (error) {
            console.error('Error generating QRIS:', error);
            this.showError('Gagal generate QR Code');
        }
    }

    generateQrisString(amount, description) {
        // Simplified QRIS generation
        const base = document.getElementById('qrisBase').value.split('6304')[0];
        const amountTag = "54" + amount.length.toString().padStart(2, "0") + amount;
        const raw = base + amountTag + "6304";
        
        // Simplified CRC16 calculation
        const crc = this.crc16ccitt(raw);
        return raw + crc;
    }

    crc16ccitt(str) {
        let crc = 0xffff;
        for (let i = 0; i < str.length; i++) {
            crc ^= str.charCodeAt(i) << 8;
            for (let j = 0; j < 8; j++) {
                if ((crc & 0x8000) !== 0) {
                    crc = (crc << 1) ^ 0x1021;
                } else {
                    crc <<= 1;
                }
                crc &= 0xffff;
            }
        }
        return crc.toString(16).toUpperCase().padStart(4, "0");
    }

    startQRCountdown() {
        let timeLeft = 300; // 5 minutes in seconds
        
        const updateTimer = () => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            document.getElementById('countdownTimer').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                document.getElementById('previewStatus').textContent = 'Kedaluwarsa';
                document.getElementById('previewStatus').className = 'text-red-400 font-medium';
                document.getElementById('downloadQr').disabled = true;
                document.getElementById('copyQr').disabled = true;
            }
            timeLeft--;
        };
        
        updateTimer();
        const timer = setInterval(updateTimer, 1000);
    }

    downloadQR() {
        const canvas = document.querySelector('#qrcodePreview canvas');
        if (!canvas) {
            this.showError('Tidak ada QR Code untuk didownload');
            return;
        }
        
        const link = document.createElement('a');
        link.download = `qris-nestsian-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        this.showSuccess('QR Code berhasil didownload!');
    }

    async saveQrisSettings(e) {
        e.preventDefault();
        
        try {
            // Save QRIS settings to database
            const settings = {
                merchantName: document.getElementById('qrisMerchantName').value,
                merchantId: document.getElementById('qrisMerchantId').value,
                city: document.getElementById('qrisCity').value,
                postalCode: document.getElementById('qrisPostalCode').value,
                baseString: document.getElementById('qrisBase').value
            };
            
            this.showSuccess('Pengaturan QRIS berhasil disimpan!');
            
        } catch (error) {
            console.error('Error saving QRIS settings:', error);
            this.showError('Gagal menyimpan pengaturan QRIS');
        }
    }

    async checkMaintenanceMode() {
        try {
            // Check maintenance mode from database
            const maintenanceMode = false; // Replace with actual database check
            
            if (maintenanceMode) {
                document.getElementById('maintenanceMode').classList.remove('hidden');
                document.getElementById('loginModal').classList.add('hidden');
            }
        } catch (error) {
            console.error('Error checking maintenance mode:', error);
        }
    }

    async toggleMaintenance(e) {
        const enabled = e.target.checked;
        
        try {
            // Update maintenance mode in database
            if (enabled) {
                document.getElementById('maintenanceSettings').classList.remove('hidden');
                this.showSuccess('Mode maintenance diaktifkan');
            } else {
                document.getElementById('maintenanceSettings').classList.add('hidden');
                this.showSuccess('Mode maintenance dinonaktifkan');
            }
        } catch (error) {
            console.error('Error toggling maintenance:', error);
            this.showError('Gagal mengubah mode maintenance');
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('-translate-x-full');
    }

    switchSection(e) {
        e.preventDefault();
        
        // Update active link
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.classList.remove('active');
        });
        e.target.closest('.sidebar-link').classList.add('active');
        
        // Get target section
        const targetId = e.target.closest('.sidebar-link').getAttribute('href').substring(1);
        
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.add('hidden');
            section.classList.remove('active');
        });
        
        // Show target section
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
            targetSection.classList.add('active');
        }
        
        // Close sidebar on mobile
        if (window.innerWidth < 1024) {
            document.getElementById('sidebar').classList.add('-translate-x-full');
        }
    }

    showAdminPanel() {
        document.getElementById('adminPanelModal').classList.remove('hidden');
    }

    hideAdminPanel() {
        document.getElementById('adminPanelModal').classList.add('hidden');
    }

    showAdminTab(tabId) {
        // Hide all tab contents
        document.querySelectorAll('.admin-tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        // Show selected tab
        const tabContent = document.getElementById(`admin${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`);
        if (tabContent) {
            tabContent.classList.remove('hidden');
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
            
            document.getElementById('clock').textContent = timeString;
        };
        
        updateClock();
        setInterval(updateClock, 1000);
    }

    startRealtimeUpdates() {
        // Simulate real-time updates
        setInterval(() => {
            // Update order badge
            const badge = document.getElementById('orderBadge');
            const currentCount = parseInt(badge.textContent) || 0;
            if (currentCount < 5) {
                badge.textContent = currentCount + 1;
            }
        }, 30000);
    }

    showSuccess(message) {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        toastMessage.textContent = message;
        toast.className = toast.className.replace('bg-red-600', 'bg-green-600');
        toast.classList.remove('translate-y-10', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
        
        setTimeout(() => {
            toast.classList.add('translate-y-10', 'opacity-0');
            toast.classList.remove('translate-y-0', 'opacity-100');
        }, 3000);
    }

    showError(message) {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        toastMessage.textContent = message;
        toast.className = toast.className.replace('bg-green-600', 'bg-red-600');
        toast.classList.remove('translate-y-10', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
        
        setTimeout(() => {
            toast.classList.add('translate-y-10', 'opacity-0');
            toast.classList.remove('translate-y-0', 'opacity-100');
        }, 3000);
    }

    handleLogout() {
        if (confirm('Apakah Anda yakin ingin keluar?')) {
            document.getElementById('mainLayout').classList.add('hidden');
            document.getElementById('loginModal').classList.remove('hidden');
            this.showSuccess('Berhasil logout');
        }
    }

    updateOrderList(orders) {
        const orderList = document.getElementById('orderList');
        if (!orderList) return;
        
        orderList.innerHTML = '';
        
        orders.forEach(order => {
            const row = document.createElement('tr');
            row.className = 'border-b border-dark-700';
            row.innerHTML = `
                <td class="py-3 font-medium text-white">${order.id}</td>
                <td class="py-3 text-gray-300">${new Date().toLocaleDateString('id-ID')}</td>
                <td class="py-3 text-gray-300">${order.customer}</td>
                <td class="py-3 text-gray-300">${order.products}</td>
                <td class="py-3 text-white font-medium">Rp ${order.total.toLocaleString()}</td>
                <td class="py-3">
                    <span class="status-badge status-${order.status}">
                        ${order.status === 'completed' ? 'Selesai' : 
                          order.status === 'processing' ? 'Diproses' : 
                          order.status === 'pending' ? 'Pending' : 'Dibatalkan'}
                    </span>
                </td>
                <td class="py-3">
                    <button class="text-primary-400 hover:text-primary-300">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            orderList.appendChild(row);
        });
    }

    updateRecentOrders(orders) {
        const recentOrders = document.getElementById('recentOrders');
        if (!recentOrders) return;
        
        recentOrders.innerHTML = '';
        
        orders.slice(0, 5).forEach(order => {
            const row = document.createElement('tr');
            row.className = 'border-b border-dark-700';
            row.innerHTML = `
                <td class="py-3 font-medium text-white">${order.id}</td>
                <td class="py-3 text-gray-300">${order.customer}</td>
                <td class="py-3 text-gray-300">${order.products}</td>
                <td class="py-3 text-white font-medium">Rp ${order.total.toLocaleString()}</td>
                <td class="py-3">
                    <span class="status-badge status-${order.status}">
                        ${order.status === 'completed' ? 'Selesai' : 
                          order.status === 'processing' ? 'Diproses' : 'Pending'}
                    </span>
                </td>
            `;
            recentOrders.appendChild(row);
        });
    }

    editProduct(productId) {
        // Load product data and populate form
        document.getElementById('productName').value = `Product ${productId}`;
        document.getElementById('productPrice').value = 100000;
        document.getElementById('productStock').value = 10;
        document.getElementById('productDescription').value = 'Product description here';
        document.getElementById('productImage').value = 'https://via.placeholder.com/300';
        
        // Change button text
        document.getElementById('saveProduct').textContent = 'Update Produk';
        document.getElementById('cancelEdit').classList.remove('hidden');
        
        this.showSuccess('Mode edit diaktifkan');
    }

    cancelProductEdit() {
        document.getElementById('productForm').reset();
        document.getElementById('saveProduct').textContent = 'Simpan Produk';
        document.getElementById('cancelEdit').classList.add('hidden');
        this.showSuccess('Edit dibatalkan');
    }

    async deleteProduct(productId) {
        if (confirm(`Apakah Anda yakin ingin menghapus produk ID ${productId}?`)) {
            try {
                // Simulate API call
                this.showSuccess('Produk berhasil dihapus!');
                await this.loadProducts();
            } catch (error) {
                console.error('Error deleting product:', error);
                this.showError('Gagal menghapus produk');
            }
        }
    }

    async saveCategory(e) {
        e.preventDefault();
        
        const name = document.getElementById('categoryName').value;
        const icon = document.getElementById('categoryIcon').value;
        
        if (!name || !icon) {
            this.showError('Silakan isi nama dan icon kategori');
            return;
        }
        
        try {
            // Simulate API call
            this.showSuccess('Kategori berhasil ditambahkan!');
            document.getElementById('categoryForm').reset();
            await this.loadCategories();
            
        } catch (error) {
            console.error('Error saving category:', error);
            this.showError('Gagal menyimpan kategori');
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.nestSian = new NestSian();
});

// Anti-Inspect Element Protection
setInterval(() => {
    // Check for dev tools
    const widthThreshold = window.outerWidth - window.innerWidth > 160;
    const heightThreshold = window.outerHeight - window.innerHeight > 160;
    
    if (widthThreshold || heightThreshold) {
        document.body.innerHTML = '<h1 class="text-center text-red-500 p-10">Access Denied</h1>';
        window.location.href = 'about:blank';
    }
}, 1000);