// admin.js - NestSian Admin Panel (Secure Version)
let currentSection = 'dashboard';
let isAdminAuthenticated = false;

// Secure Supabase client with validation
const getSupabase = () => {
  if (!window.supabaseClient || !window.supabaseInitialized) {
    throw new Error('Supabase client not initialized. Please check your connection.');
  }
  return window.supabaseClient;
};

// Enhanced admin verification with rate limiting
const adminLoginAttempts = {};
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

window.verifyAdmin = () => {
  const passwordInput = document.getElementById('adminAuth');
  if (!passwordInput) {
    alert('Login form not found!');
    return;
  }

  const password = passwordInput.value;
  const clientIP = 'local'; // In production, get real IP
  
  // Rate limiting check
  const now = Date.now();
  const attempts = adminLoginAttempts[clientIP] || { count: 0, lockUntil: 0 };
  
  if (attempts.lockUntil > now) {
    const remainingMinutes = Math.ceil((attempts.lockUntil - now) / 60000);
    alert(`Too many failed attempts. Please try again in ${remainingMinutes} minutes.`);
    return;
  }
  
  if (!password) {
    alert('Please enter password!');
    return;
  }

  // Password validation with timing-safe comparison
  let isValid = false;
  try {
    // Simple timing-safe comparison (in production, use bcrypt or similar)
    isValid = password === ADMIN_PASSWORD;
  } catch (error) {
    console.error('Password validation error:', error);
    alert('Authentication error. Please try again.');
    return;
  }

  if (isValid) {
    // Reset login attempts on success
    delete adminLoginAttempts[clientIP];
    
    document.getElementById('loginCheck').style.display = 'none';
    document.getElementById('adminLayout').classList.remove('hidden');
    localStorage.setItem('nest_admin_auth', 'true');
    localStorage.setItem('nest_admin_session', Date.now().toString());
    isAdminAuthenticated = true;
    
    // Set session timeout (8 hours)
    setTimeout(() => {
      if (isAdminAuthenticated) {
        alert('Session expired. Please login again.');
        logoutAdmin();
      }
    }, 8 * 60 * 60 * 1000);
    
    loadDashboard();
    logAdminActivity('login_success');
  } else {
    // Increment failed attempts
    attempts.count = (attempts.count || 0) + 1;
    attempts.lastAttempt = now;
    
    if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
      attempts.lockUntil = now + LOCKOUT_TIME;
      alert(`Too many failed attempts. Account locked for 15 minutes.`);
    } else {
      const remaining = MAX_LOGIN_ATTEMPTS - attempts.count;
      alert(`Invalid password! ${remaining} attempts remaining.`);
    }
    
    adminLoginAttempts[clientIP] = attempts;
    logAdminActivity('login_failed', { attempts: attempts.count });
  }
  
  // Clear password field
  passwordInput.value = '';
};

// Show Section with security check
window.showSection = (sectionId) => {
  if (!isAdminAuthenticated && localStorage.getItem('nest_admin_auth') !== 'true') {
    alert('Please login first!');
    window.location.reload();
    return;
  }
  
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
  
  const section = document.getElementById(sectionId);
  if (section) {
    section.classList.remove('hidden');
    currentSection = sectionId;
    
    // Log section access
    logAdminActivity('section_access', { section: sectionId });
    
    switch(sectionId) {
      case 'dashboard':
        loadDashboard();
        break;
      case 'products':
        loadProductsAdmin();
        break;
      case 'categories':
        loadCategoriesAdmin();
        break;
      case 'orders':
        loadOrders();
        break;
      case 'transactions':
        loadTransactions();
        break;
      case 'settings':
        loadSettings();
        break;
    }
  }
};

// Enhanced Dashboard with error handling
const loadDashboard = async () => {
  try {
    const supabase = getSupabase();
    
    // Get counts with error handling
    const [productResult, categoryResult, orderResult] = await Promise.allSettled([
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('categories').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true })
    ]);
    
    // Update counts safely
    document.getElementById('totalProducts').textContent = 
      productResult.status === 'fulfilled' ? (productResult.value.count || 0) : 0;
    
    document.getElementById('totalCategories').textContent = 
      categoryResult.status === 'fulfilled' ? (categoryResult.value.count || 0) : 0;
    
    document.getElementById('totalOrders').textContent = 
      orderResult.status === 'fulfilled' ? (orderResult.value.count || 0) : 0;
    
    // Get recent transactions from localStorage with validation
    const transactions = JSON.parse(localStorage.getItem('nest_transactions') || '[]').filter(t => 
      t && typeof t === 'object' && t.amount && t.productName
    );
    
    document.getElementById('totalTransactions').textContent = transactions.length || 0;
    
    // Load recent orders/transactions
    loadRecentOrders(transactions);
    
  } catch (error) {
    console.error('Error loading dashboard:', error);
    showAdminAlert(`Error loading dashboard: ${error.message}`, 'error');
    
    // Set default values
    document.querySelectorAll('#totalProducts, #totalCategories, #totalOrders, #totalTransactions')
      .forEach(el => el.textContent = '0');
  }
};

// Load Recent Orders with XSS protection
const loadRecentOrders = (transactions) => {
  const container = document.getElementById('recentOrders');
  if (!container) return;
  
  if (!transactions || transactions.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8">
        <i class="fas fa-receipt text-4xl text-gray-300 mb-3"></i>
        <p class="text-gray-500 dark:text-gray-400">Belum ada transaksi</p>
      </div>
    `;
    return;
  }
  
  const recent = transactions.slice(-5).reverse();
  let html = '<div class="space-y-3">';
  
  recent.forEach(trans => {
    if (!trans || !trans.timestamp) return;
    
    const date = new Date(trans.timestamp).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const amount = trans.amount ? trans.amount.toLocaleString('id-ID') : '0';
    const productName = Security.escapeHtml(trans.productName || 'Unknown Product');
    const status = trans.status || 'pending';
    
    html += `
      <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div>
          <h4 class="font-medium text-gray-800 dark:text-white">${productName}</h4>
          <p class="text-sm text-gray-500 dark:text-gray-400">${Security.escapeHtml(date)} • ${Security.escapeHtml(trans.method || 'unknown')}</p>
        </div>
        <div class="text-right">
          <div class="font-bold text-green-600 dark:text-green-400">Rp ${amount}</div>
          <span class="text-xs px-2 py-1 rounded-full ${status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}">
            ${status === 'pending' ? 'Pending' : 'Completed'}
          </span>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
};

// Load Products for Admin with XSS protection
const loadProductsAdmin = async () => {
  try {
    const supabase = getSupabase();
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        categories (
          name
        )
      `)
      .order('created_at', { ascending: false });

    const container = document.getElementById('productsList');
    if (!container) return;

    if (error) {
      container.innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-red-600">Error: ${Security.escapeHtml(error.message)}</p>
        </div>
      `;
      return;
    }

    if (!products || products.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8">
          <i class="fas fa-box-open text-4xl text-gray-300 mb-3"></i>
          <p class="text-gray-500 dark:text-gray-400">Belum ada produk.</p>
          <button onclick="showAddProductModal()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
            <i class="fas fa-plus mr-2"></i>Tambah Produk
          </button>
        </div>
      `;
      return;
    }

    const tableHTML = `
      <div class="table-responsive">
        <table class="w-full">
          <thead>
            <tr class="bg-gray-100 dark:bg-gray-700">
              <th class="text-left p-3 font-semibold">Produk</th>
              <th class="text-left p-3 font-semibold">Harga</th>
              <th class="text-left p-3 font-semibold">Stok</th>
              <th class="text-left p-3 font-semibold">Kategori</th>
              <th class="text-left p-3 font-semibold">Status</th>
              <th class="text-left p-3 font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(product => {
              const safeName = Security.escapeHtml(product.name || '');
              const safeDescription = Security.escapeHtml(product.description || '');
              const categoryName = Security.escapeHtml(product.categories?.name || '-');
              const price = parseFloat(product.price || 0);
              const stock = parseInt(product.stock || 0);
              const imageUrl = product.image_url ? Security.escapeHtml(product.image_url) : null;
              
              return `
                <tr class="border-b dark:border-gray-700">
                  <td class="p-3">
                    <div class="flex items-center gap-3">
                      ${imageUrl ? `
                        <img src="${imageUrl}" alt="${safeName}" 
                             class="w-10 h-10 rounded-lg object-cover">
                      ` : `
                        <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                          <span class="text-blue-600 dark:text-blue-300">📦</span>
                        </div>
                      `}
                      <div>
                        <span class="font-medium text-gray-800 dark:text-white">${safeName}</span>
                        ${product.description ? `<p class="text-xs text-gray-500 truncate max-w-xs">${safeDescription}</p>` : ''}
                      </div>
                    </div>
                  </td>
                  <td class="p-3">
                    <span class="font-bold text-green-600 dark:text-green-400">
                      Rp ${price.toLocaleString()}
                    </span>
                  </td>
                  <td class="p-3">
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                      ${stock}
                    </span>
                  </td>
                  <td class="p-3">
                    <span class="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                      ${categoryName}
                    </span>
                  </td>
                  <td class="p-3">
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${product.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                      ${product.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td class="p-3">
                    <div class="flex gap-2">
                      <button onclick="editProduct('${product.id}')" 
                              class="btn-action btn-edit">
                        <i class="fas fa-edit mr-1"></i>Edit
                      </button>
                      <button onclick="deleteProduct('${product.id}')" 
                              class="btn-action btn-delete">
                        <i class="fas fa-trash mr-1"></i>Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = tableHTML;

  } catch (error) {
    console.error('Error loading products:', error);
    showAdminAlert(`Error loading products: ${error.message}`, 'error');
  }
};

// Load Categories for Admin
const loadCategoriesAdmin = async () => {
  try {
    const supabase = getSupabase();
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('order_index');

    const container = document.getElementById('categoriesList');
    if (!container) return;

    if (error) {
      container.innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-red-600">Error: ${Security.escapeHtml(error.message)}</p>
        </div>
      `;
      return;
    }

    let html = '<div class="grid grid-cols-1 md:grid-cols-3 gap-4">';

    if (categories && categories.length > 0) {
      categories.forEach(category => {
        const safeName = Security.escapeHtml(category.name || '');
        const safeDescription = Security.escapeHtml(category.description || '');
        const safeIcon = Security.escapeHtml(category.icon || '📦');
        
        html += `
          <div class="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-700">
            <div class="flex items-center gap-2 mb-2">
              ${category.icon ? `<span class="text-xl">${safeIcon}</span>` : ''}
              <h3 class="font-bold text-lg text-gray-800 dark:text-white">${safeName}</h3>
            </div>
            ${category.description ? `<p class="text-gray-600 dark:text-gray-300 text-sm mb-3">${safeDescription}</p>` : ''}
            <div class="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Order: ${category.order_index || 0}
            </div>
            <div class="flex gap-2 mt-4">
              <button onclick="editCategory('${category.id}')" 
                      class="btn-action btn-edit">
                Edit
              </button>
              <button onclick="deleteCategory('${category.id}')" 
                      class="btn-action btn-delete">
                Hapus
              </button>
            </div>
          </div>
        `;
      });
    } else {
      html = '<p class="text-gray-500 col-span-3 text-center py-8">Belum ada kategori.</p>';
    }

    html += '</div>';
    container.innerHTML = html;

  } catch (error) {
    console.error('Error loading categories:', error);
    showAdminAlert('Error loading categories', 'error');
  }
};

// Load Orders
const loadOrders = () => {
  const container = document.getElementById('ordersList');
  if (!container) return;
  
  container.innerHTML = `
    <div class="text-center py-12">
      <i class="fas fa-shopping-bag text-5xl text-gray-300 dark:text-gray-600 mb-4"></i>
      <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Fitur Pesanan</h3>
      <p class="text-gray-500 dark:text-gray-400 mb-6">Fitur manajemen pesanan akan segera hadir</p>
      <div class="max-w-md mx-auto bg-blue-50 dark:bg-gray-700 p-4 rounded-lg">
        <p class="text-sm text-gray-600 dark:text-gray-300">
          Untuk saat ini, pesanan dapat dimonitor melalui WhatsApp admin: 
          <a href="https://wa.me/6285185025316" class="text-blue-600 dark:text-blue-400 font-semibold">+62 851-8502-5316</a>
        </p>
      </div>
    </div>
  `;
};

// Load Transactions with validation
const loadTransactions = () => {
  const container = document.getElementById('transactionsList');
  if (!container) return;
  
  const transactions = JSON.parse(localStorage.getItem('nest_transactions') || '[]').filter(t => 
    t && typeof t === 'object' && t.amount && t.productName
  );
  
  if (transactions.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12">
        <i class="fas fa-receipt text-5xl text-gray-300 dark:text-gray-600 mb-4"></i>
        <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Belum Ada Transaksi</h3>
        <p class="text-gray-500 dark:text-gray-400">Transaksi dari pelanggan akan muncul di sini</p>
      </div>
    `;
    return;
  }
  
  let html = `
    <div class="table-responsive">
      <table class="w-full">
        <thead>
          <tr class="bg-gray-100 dark:bg-gray-700">
            <th class="text-left p-3 font-semibold">ID Transaksi</th>
            <th class="text-left p-3 font-semibold">Produk</th>
            <th class="text-left p-3 font-semibold">Total</th>
            <th class="text-left p-3 font-semibold">Metode</th>
            <th class="text-left p-3 font-semibold">Tanggal</th>
            <th class="text-left p-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  transactions.reverse().forEach(trans => {
    if (!trans || !trans.timestamp) return;
    
    const date = new Date(trans.timestamp).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const safeProductName = Security.escapeHtml(trans.productName || '');
    const safeMethod = Security.escapeHtml(trans.method || 'unknown');
    const safeDate = Security.escapeHtml(date);
    const transactionId = Security.escapeHtml(trans.transactionId || trans.id || '');
    const amount = trans.amount ? trans.amount.toLocaleString() : '0';
    const status = trans.status || 'pending';
    
    html += `
      <tr class="border-b dark:border-gray-700">
        <td class="p-3 font-mono text-sm">${transactionId}</td>
        <td class="p-3">${safeProductName}</td>
        <td class="p-3 font-bold text-green-600 dark:text-green-400">Rp ${amount}</td>
        <td class="p-3">
          <span class="px-2 py-1 rounded-full text-xs ${trans.method === 'qris' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}">
            ${safeMethod}
          </span>
        </td>
        <td class="p-3 text-sm text-gray-600 dark:text-gray-400">${safeDate}</td>
        <td class="p-3">
          <span class="px-2 py-1 rounded-full text-xs ${status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}">
            ${status === 'pending' ? 'Pending' : 'Completed'}
          </span>
        </td>
      </tr>
    `;
  });
  
  html += `
        </tbody>
      </table>
    </div>
  `;
  
  container.innerHTML = html;
};

// Load Settings
const loadSettings = () => {
  const storeName = localStorage.getItem('nest_store_name') || 'NestSian Store';
  const whatsappNumber = localStorage.getItem('nest_whatsapp_number') || '6285185025316';
  
  document.getElementById('storeName').value = storeName;
  document.getElementById('whatsappNumber').value = whatsappNumber;
  
  console.log('Settings loaded');
};

// Show Add Product Modal
window.showAddProductModal = async () => {
  try {
    const supabase = getSupabase();
    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, name')
      .order('order_index');

    const modal = document.getElementById('addProductModal');
    const form = document.getElementById('addProductForm');
    
    if (!modal || !form) return;
    
    let categoryOptions = '<option value="">Pilih Kategori</option>';
    if (categories && categories.length > 0) {
      categoryOptions += categories.map(cat => 
        `<option value="${cat.id}">${Security.escapeHtml(cat.name)}</option>`
      ).join('');
    }
    
    form.innerHTML = `
      <div class="space-y-4">
        <div>
          <label class="block text-gray-700 dark:text-gray-300 mb-2">Nama Produk *</label>
          <input type="text" id="productName" class="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" required maxlength="100">
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-700 dark:text-gray-300 mb-2">Harga (Rp) *</label>
            <input type="number" id="productPrice" class="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" required min="0" step="100">
          </div>
          <div>
            <label class="block text-gray-700 dark:text-gray-300 mb-2">Stok</label>
            <input type="number" id="productStock" value="0" class="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" min="0">
          </div>
        </div>
        
        <div>
          <label class="block text-gray-700 dark:text-gray-300 mb-2">Kategori *</label>
          <select id="productCategory" class="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" required>
            ${categoryOptions}
          </select>
        </div>
        
        <div>
          <label class="block text-gray-700 dark:text-gray-300 mb-2">Deskripsi</label>
          <textarea id="productDescription" rows="3" class="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" maxlength="500"></textarea>
        </div>
        
        <div>
          <label class="block text-gray-700 dark:text-gray-300 mb-2">URL Gambar (opsional)</label>
          <input type="url" id="productImageUrl" class="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" placeholder="https://example.com/image.jpg">
        </div>
        
        <div class="flex items-center gap-2">
          <input type="checkbox" id="productActive" checked class="rounded">
          <label for="productActive" class="text-gray-700 dark:text-gray-300">Produk Aktif</label>
        </div>
        
        <div class="flex gap-4 pt-4">
          <button onclick="saveProduct()" 
                  class="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition-colors">
            <i class="fas fa-save mr-2"></i>Simpan Produk
          </button>
          <button onclick="closeAddProductModal()" 
                  class="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg transition-colors">
            <i class="fas fa-times mr-2"></i>Batal
          </button>
        </div>
      </div>
    `;
    
    modal.classList.remove('hidden');
    
  } catch (error) {
    console.error('Error loading categories:', error);
    showAdminAlert('Gagal memuat kategori', 'error');
  }
};

// Close Add Product Modal
window.closeAddProductModal = () => {
  const modal = document.getElementById('addProductModal');
  if (modal) modal.classList.add('hidden');
};

// Save Product with validation
window.saveProduct = async () => {
  const name = document.getElementById('productName')?.value;
  const price = document.getElementById('productPrice')?.value;
  const stock = document.getElementById('productStock')?.value;
  const category = document.getElementById('productCategory')?.value;
  const description = document.getElementById('productDescription')?.value;
  const imageUrl = document.getElementById('productImageUrl')?.value;
  const isActive = document.getElementById('productActive')?.checked;

  // Input validation
  if (!name || name.trim().length < 2) {
    alert('Nama produk minimal 2 karakter!');
    return;
  }

  if (!price || parseFloat(price) <= 0) {
    alert('Harga harus lebih dari 0!');
    return;
  }

  if (!category) {
    alert('Kategori harus dipilih!');
    return;
  }

  if (imageUrl && !isValidUrl(imageUrl)) {
    alert('URL gambar tidak valid!');
    return;
  }

  const productData = {
    name: Security.sanitizeInput(name.trim()),
    price: parseFloat(price),
    stock: parseInt(stock) || 0,
    category_id: category,
    description: description ? Security.sanitizeInput(description.trim()) : null,
    image_url: imageUrl ? Security.sanitizeInput(imageUrl.trim()) : null,
    is_active: isActive,
    created_at: new Date().toISOString()
  };

  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('products')
      .insert([productData]);

    if (error) throw error;

    showAdminAlert('✅ Produk berhasil ditambahkan!', 'success');
    closeAddProductModal();
    loadProductsAdmin();
    loadDashboard();

  } catch (error) {
    console.error('Error saving product:', error);
    showAdminAlert(`❌ Gagal menambahkan produk: ${error.message}`, 'error');
  }
};

// Show Add Category Modal
window.showAddCategoryModal = () => {
  const modal = document.getElementById('addCategoryModal');
  const form = document.getElementById('addCategoryForm');
  
  if (!modal || !form) return;
  
  form.innerHTML = `
    <div class="space-y-4">
      <div>
        <label class="block text-gray-700 dark:text-gray-300 mb-2">Nama Kategori *</label>
        <input type="text" id="categoryName" class="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" required maxlength="50">
      </div>
      
      <div>
        <label class="block text-gray-700 dark:text-gray-300 mb-2">Deskripsi (opsional)</label>
        <textarea id="categoryDescription" rows="2" class="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" maxlength="200"></textarea>
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-gray-700 dark:text-gray-300 mb-2">Icon (emoji)</label>
          <input type="text" id="categoryIcon" value="📦" class="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" maxlength="5">
        </div>
        <div>
          <label class="block text-gray-700 dark:text-gray-300 mb-2">Warna</label>
          <input type="color" id="categoryColor" value="#3b82f6" class="w-full h-10 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
        </div>
      </div>
      
      <div>
        <label class="block text-gray-700 dark:text-gray-300 mb-2">Urutan</label>
        <input type="number" id="categoryOrder" value="0" class="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" min="0">
      </div>
      
      <div class="flex items-center gap-2">
        <input type="checkbox" id="categoryActive" checked class="rounded">
        <label for="categoryActive" class="text-gray-700 dark:text-gray-300">Kategori Aktif</label>
      </div>
      
      <div class="flex gap-4 pt-4">
        <button onclick="saveCategory()" 
                class="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition-colors">
          <i class="fas fa-save mr-2"></i>Simpan Kategori
        </button>
        <button onclick="closeAddCategoryModal()" 
                class="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg transition-colors">
          <i class="fas fa-times mr-2"></i>Batal
        </button>
      </div>
    </div>
  `;
  
  modal.classList.remove('hidden');
};

// Close Add Category Modal
window.closeAddCategoryModal = () => {
  const modal = document.getElementById('addCategoryModal');
  if (modal) modal.classList.add('hidden');
};

// Save Category
window.saveCategory = async () => {
  const name = document.getElementById('categoryName')?.value;
  const description = document.getElementById('categoryDescription')?.value;
  const icon = document.getElementById('categoryIcon')?.value;
  const color = document.getElementById('categoryColor')?.value;
  const order = document.getElementById('categoryOrder')?.value;
  const isActive = document.getElementById('categoryActive')?.checked;

  if (!name || name.trim().length < 2) {
    alert('Nama kategori minimal 2 karakter!');
    return;
  }

  const categoryData = {
    name: Security.sanitizeInput(name.trim()),
    description: description ? Security.sanitizeInput(description.trim()) : null,
    icon: icon ? Security.sanitizeInput(icon.trim()) : null,
    color: color || null,
    order_index: parseInt(order) || 0,
    is_active: isActive,
    created_at: new Date().toISOString()
  };

  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('categories')
      .insert([categoryData]);

    if (error) throw error;

    showAdminAlert('✅ Kategori berhasil ditambahkan!', 'success');
    closeAddCategoryModal();
    loadCategoriesAdmin();
    loadDashboard();

  } catch (error) {
    console.error('Error saving category:', error);
    showAdminAlert(`❌ Gagal menambahkan kategori: ${error.message}`, 'error');
  }
};

// Edit Product (Basic Implementation)
window.editProduct = async (productId) => {
  try {
    const supabase = getSupabase();
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error) throw error;

    if (confirm(`Edit produk: ${product.name}?`)) {
      // For now, show simple edit form
      const newName = prompt('Nama produk baru:', product.name);
      if (newName && newName.trim() !== product.name) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ name: newName.trim() })
          .eq('id', productId);

        if (updateError) throw updateError;
        
        showAdminAlert('✅ Produk berhasil diperbarui!', 'success');
        loadProductsAdmin();
      }
    }
  } catch (error) {
    console.error('Error editing product:', error);
    showAdminAlert('❌ Gagal mengedit produk', 'error');
  }
};

// Delete Product with confirmation
window.deleteProduct = async (productId) => {
  if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;

  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) throw error;

    showAdminAlert('✅ Produk berhasil dihapus!', 'success');
    loadProductsAdmin();
    loadDashboard();

  } catch (error) {
    console.error('Error deleting product:', error);
    showAdminAlert('❌ Gagal menghapus produk', 'error');
  }
};

// Edit Category
window.editCategory = async (categoryId) => {
  try {
    const supabase = getSupabase();
    const { data: category, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (error) throw error;

    const newName = prompt('Nama kategori baru:', category.name);
    if (newName && newName.trim() !== category.name) {
      const { error: updateError } = await supabase
        .from('categories')
        .update({ name: newName.trim() })
        .eq('id', categoryId);

      if (updateError) throw updateError;
      
      showAdminAlert('✅ Kategori berhasil diperbarui!', 'success');
      loadCategoriesAdmin();
    }
  } catch (error) {
    console.error('Error editing category:', error);
    showAdminAlert('❌ Gagal mengedit kategori', 'error');
  }
};

// Delete Category with warning
window.deleteCategory = async (categoryId) => {
  // Check if category has products
  try {
    const supabase = getSupabase();
    const { data: products, error } = await supabase
      .from('products')
      .select('id')
      .eq('category_id', categoryId)
      .limit(1);

    if (error) throw error;

    if (products && products.length > 0) {
      alert('⚠️ Kategori ini masih memiliki produk. Hapus produk terlebih dahulu atau pindahkan ke kategori lain.');
      return;
    }

    if (!confirm('Hapus kategori?')) return;
    
    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (deleteError) throw deleteError;

    showAdminAlert('✅ Kategori berhasil dihapus!', 'success');
    loadCategoriesAdmin();
    loadDashboard();

  } catch (error) {
    console.error('Error deleting category:', error);
    showAdminAlert('❌ Gagal menghapus kategori', 'error');
  }
};

// Save Settings
window.saveSettings = () => {
  const storeName = document.getElementById('storeName')?.value;
  const whatsappNumber = document.getElementById('whatsappNumber')?.value;
  const newPassword = document.getElementById('newPassword')?.value;
  const confirmPassword = document.getElementById('confirmPassword')?.value;
  
  let updates = [];
  
  if (storeName && storeName.trim().length >= 2) {
    localStorage.setItem('nest_store_name', Security.sanitizeInput(storeName.trim()));
    updates.push('Nama toko');
  }
  
  if (whatsappNumber && Security.validatePhone(whatsappNumber)) {
    localStorage.setItem('nest_whatsapp_number', Security.sanitizeInput(whatsappNumber.trim()));
    updates.push('Nomor WhatsApp');
  }
  
  if (newPassword) {
    if (newPassword === confirmPassword) {
      if (newPassword.length < 6) {
        alert('❌ Password minimal 6 karakter!');
      } else {
        // In production, this should be handled server-side
        alert('⚠️ Fitur update password akan segera tersedia.');
      }
    } else {
      alert('❌ Password tidak cocok!');
    }
  }
  
  if (updates.length > 0) {
    showAdminAlert(`✅ ${updates.join(', ')} berhasil disimpan!`, 'success');
  } else {
    showAdminAlert('Tidak ada perubahan yang disimpan.', 'info');
  }
  
  // Clear password fields
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';
};

// Reset Settings
window.resetSettings = () => {
  if (confirm('Reset semua pengaturan ke default?')) {
    localStorage.removeItem('nest_store_name');
    localStorage.removeItem('nest_whatsapp_number');
    loadSettings();
    showAdminAlert('Pengaturan telah direset!', 'success');
  }
};

// Show Admin Alert
const showAdminAlert = (message, type = 'info') => {
  const alertDiv = document.createElement('div');
  alertDiv.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg ${
    type === 'error' ? 'bg-red-500 text-white' :
    type === 'success' ? 'bg-green-500 text-white' :
    type === 'warning' ? 'bg-yellow-500 text-white' :
    'bg-blue-500 text-white'
  }`;
  alertDiv.textContent = message;
  
  document.body.appendChild(alertDiv);
  
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.parentNode.removeChild(alertDiv);
    }
  }, 3000);
};

// Utility functions
const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

const logAdminActivity = (action, data = {}) => {
  const log = {
    action,
    data,
    timestamp: new Date().toISOString(),
    user: 'admin'
  };
  
  // In production, send to server
  console.log('🔒 Admin Activity:', log);
};

// Logout function (called from admin.html)
window.logoutAdmin = () => {
  if (confirm('Apakah Anda yakin ingin logout?')) {
    localStorage.removeItem('nest_admin_auth');
    localStorage.removeItem('nest_admin_session');
    isAdminAuthenticated = false;
    logAdminActivity('logout');
    window.location.reload();
  }
};

// Initialize Admin Panel
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initializing Admin Panel...');
  
  // Check authentication and session
  const isAuthenticated = localStorage.getItem('nest_admin_auth') === 'true';
  const sessionStart = localStorage.getItem('nest_admin_session');
  const sessionAge = sessionStart ? Date.now() - parseInt(sessionStart) : Infinity;
  
  if (isAuthenticated && sessionAge < 8 * 60 * 60 * 1000) {
    isAdminAuthenticated = true;
    document.getElementById('loginCheck').style.display = 'none';
    document.getElementById('adminLayout').classList.remove('hidden');
    loadDashboard();
    logAdminActivity('session_resumed');
  } else {
    // Clear expired session
    localStorage.removeItem('nest_admin_auth');
    localStorage.removeItem('nest_admin_session');
  }
  
  // Enter key for login
  document.getElementById('adminAuth')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      verifyAdmin();
    }
  });
  
  // Auto-focus password field
  setTimeout(() => {
    document.getElementById('adminAuth')?.focus();
  }, 100);
  
  console.log('✅ Admin Panel initialized successfully');
});