// admin.js - NestSian Admin Panel
let currentSection = 'dashboard';

// Get Supabase client
const getSupabase = () => {
  return window.supabaseClient || supabaseClient;
};

// Verify Admin
window.verifyAdmin = () => {
  const password = document.getElementById('adminAuth')?.value;
  
  if (!password) {
    alert('Masukkan password!');
    return;
  }

  if (password === ADMIN_PASSWORD) {
    document.getElementById('loginCheck').style.display = 'none';
    document.getElementById('adminLayout').classList.remove('hidden');
    localStorage.setItem('nest_admin_auth', 'true');
    loadDashboard();
  } else {
    alert('Password salah!');
  }
};

// Show Section
window.showSection = (sectionId) => {
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
  
  const section = document.getElementById(sectionId);
  if (section) {
    section.classList.remove('hidden');
    currentSection = sectionId;
    
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

// Load Dashboard
const loadDashboard = async () => {
  try {
    const supabase = getSupabase();
    
    // Get counts
    const { count: productCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    
    const { count: categoryCount } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true });
    
    const { count: orderCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });
    
    // Get recent transactions from localStorage
    const transactions = JSON.parse(localStorage.getItem('nest_transactions') || '[]');
    
    // Update counts
    document.getElementById('totalProducts').textContent = productCount || 0;
    document.getElementById('totalCategories').textContent = categoryCount || 0;
    document.getElementById('totalOrders').textContent = orderCount || 0;
    document.getElementById('totalTransactions').textContent = transactions.length || 0;
    
    // Load recent orders/transactions
    loadRecentOrders(transactions);
    
  } catch (error) {
    console.error('Error loading dashboard:', error);
    showAdminAlert('Error loading dashboard', 'error');
  }
};

// Load Recent Orders
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
    const date = new Date(trans.timestamp).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const amount = trans.amount.toLocaleString('id-ID');
    
    html += `
      <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div>
          <h4 class="font-medium text-gray-800 dark:text-white">${trans.productName}</h4>
          <p class="text-sm text-gray-500 dark:text-gray-400">${date} • ${trans.method}</p>
        </div>
        <div class="text-right">
          <div class="font-bold text-green-600 dark:text-green-400">Rp ${amount}</div>
          <span class="text-xs px-2 py-1 rounded-full ${trans.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}">
            ${trans.status === 'pending' ? 'Pending' : 'Completed'}
          </span>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
};

// Load Products for Admin
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
          <p class="text-red-600">Error: ${error.message}</p>
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
            ${products.map(product => `
              <tr class="border-b dark:border-gray-700">
                <td class="p-3">
                  <div class="flex items-center gap-3">
                    ${product.image_url ? `
                      <img src="${product.image_url}" alt="${product.name}" 
                           class="w-10 h-10 rounded-lg object-cover">
                    ` : `
                      <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                        <span class="text-blue-600 dark:text-blue-300">📦</span>
                      </div>
                    `}
                    <div>
                      <span class="font-medium text-gray-800 dark:text-white">${product.name}</span>
                      ${product.description ? `<p class="text-xs text-gray-500 truncate max-w-xs">${product.description}</p>` : ''}
                    </div>
                  </div>
                </td>
                <td class="p-3">
                  <span class="font-bold text-green-600 dark:text-green-400">
                    Rp ${parseInt(product.price || 0).toLocaleString()}
                  </span>
                </td>
                <td class="p-3">
                  <span class="px-2 py-1 rounded-full text-xs font-medium ${product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${product.stock || 0}
                  </span>
                </td>
                <td class="p-3">
                  <span class="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                    ${product.categories?.name || '-'}
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
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = tableHTML;

  } catch (error) {
    console.error('Error loading products:', error);
    showAdminAlert('Error loading products', 'error');
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
          <p class="text-red-600">Error: ${error.message}</p>
        </div>
      `;
      return;
    }

    let html = '<div class="grid grid-cols-1 md:grid-cols-3 gap-4">';

    if (categories && categories.length > 0) {
      categories.forEach(category => {
        html += `
          <div class="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-700">
            <div class="flex items-center gap-2 mb-2">
              ${category.icon ? `<span class="text-xl">${category.icon}</span>` : ''}
              <h3 class="font-bold text-lg text-gray-800 dark:text-white">${category.name}</h3>
            </div>
            ${category.description ? `<p class="text-gray-600 dark:text-gray-300 text-sm mb-3">${category.description}</p>` : ''}
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

// Load Transactions
const loadTransactions = () => {
  const container = document.getElementById('transactionsList');
  if (!container) return;
  
  const transactions = JSON.parse(localStorage.getItem('nest_transactions') || '[]');
  
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
    const date = new Date(trans.timestamp).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    html += `
      <tr class="border-b dark:border-gray-700">
        <td class="p-3 font-mono text-sm">${trans.transactionId || trans.id}</td>
        <td class="p-3">${trans.productName}</td>
        <td class="p-3 font-bold text-green-600 dark:text-green-400">Rp ${trans.amount.toLocaleString()}</td>
        <td class="p-3">
          <span class="px-2 py-1 rounded-full text-xs ${trans.method === 'qris' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}">
            ${trans.method}
          </span>
        </td>
        <td class="p-3 text-sm text-gray-600 dark:text-gray-400">${date}</td>
        <td class="p-3">
          <span class="px-2 py-1 rounded-full text-xs ${trans.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}">
            ${trans.status === 'pending' ? 'Pending' : 'Completed'}
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
  // Settings are already loaded in HTML
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
      categoryOptions += categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
    }
    
    form.innerHTML = `
      <div class="space-y-4">
        <div>
          <label class="block text-gray-700 dark:text-gray-300 mb-2">Nama Produk</label>
          <input type="text" id="productName" class="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" required>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-700 dark:text-gray-300 mb-2">Harga (Rp)</label>
            <input type="number" id="productPrice" class="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" required>
          </div>
          <div>
            <label class="block text-gray-700 dark:text-gray-300 mb-2">Stok</label>
            <input type="number" id="productStock" value="0" class="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
          </div>
        </div>
        
        <div>
          <label class="block text-gray-700 dark:text-gray-300 mb-2">Kategori</label>
          <select id="productCategory" class="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
            ${categoryOptions}
          </select>
        </div>
        
        <div>
          <label class="block text-gray-700 dark:text-gray-300 mb-2">Deskripsi</label>
          <textarea id="productDescription" rows="3" class="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"></textarea>
        </div>
        
        <div>
          <label class="block text-gray-700 dark:text-gray-300 mb-2">URL Gambar (opsional)</label>
          <input type="text" id="productImageUrl" class="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
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
    alert('Gagal memuat kategori');
  }
};

// Close Add Product Modal
window.closeAddProductModal = () => {
  const modal = document.getElementById('addProductModal');
  if (modal) modal.classList.add('hidden');
};

// Save Product
window.saveProduct = async () => {
  const name = document.getElementById('productName')?.value;
  const price = document.getElementById('productPrice')?.value;
  const stock = document.getElementById('productStock')?.value;
  const category = document.getElementById('productCategory')?.value;
  const description = document.getElementById('productDescription')?.value;
  const imageUrl = document.getElementById('productImageUrl')?.value;
  const isActive = document.getElementById('productActive')?.checked;

  if (!name || !price || !category) {
    alert('Nama, harga, dan kategori harus diisi!');
    return;
  }

  const productData = {
    name,
    price: parseFloat(price),
    stock: parseInt(stock) || 0,
    category_id: category,
    description: description || null,
    image_url: imageUrl || null,
    is_active: isActive,
    created_at: new Date().toISOString()
  };

  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('products')
      .insert([productData]);

    if (error) throw error;

    alert('✅ Produk berhasil ditambahkan!');
    closeAddProductModal();
    loadProductsAdmin();
    loadDashboard();

  } catch (error) {
    console.error('Error saving product:', error);
    alert('❌ Gagal menambahkan produk: ' + error.message);
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
        <label class="block text-gray-700 dark:text-gray-300 mb-2">Nama Kategori</label>
        <input type="text" id="categoryName" class="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" required>
      </div>
      
      <div>
        <label class="block text-gray-700 dark:text-gray-300 mb-2">Deskripsi (opsional)</label>
        <textarea id="categoryDescription" rows="2" class="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"></textarea>
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-gray-700 dark:text-gray-300 mb-2">Icon (emoji)</label>
          <input type="text" id="categoryIcon" value="📦" class="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
        </div>
        <div>
          <label class="block text-gray-700 dark:text-gray-300 mb-2">Warna</label>
          <input type="color" id="categoryColor" value="#3b82f6" class="w-full h-10 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
        </div>
      </div>
      
      <div>
        <label class="block text-gray-700 dark:text-gray-300 mb-2">Urutan</label>
        <input type="number" id="categoryOrder" value="0" class="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
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

  if (!name) {
    alert('Nama kategori harus diisi!');
    return;
  }

  const categoryData = {
    name,
    description: description || null,
    icon: icon || null,
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

    alert('✅ Kategori berhasil ditambahkan!');
    closeAddCategoryModal();
    loadCategoriesAdmin();
    loadDashboard();

  } catch (error) {
    console.error('Error saving category:', error);
    alert('❌ Gagal menambahkan kategori: ' + error.message);
  }
};

// Edit Product
window.editProduct = (productId) => {
  alert(`Fitur edit produk ${productId} akan segera tersedia.`);
  // TODO: Implement edit product functionality
};

// Delete Product
window.deleteProduct = async (productId) => {
  if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;

  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) throw error;

    alert('✅ Produk berhasil dihapus!');
    loadProductsAdmin();
    loadDashboard();

  } catch (error) {
    console.error('Error deleting product:', error);
    alert('❌ Gagal menghapus produk: ' + error.message);
  }
};

// Edit Category
window.editCategory = (categoryId) => {
  alert(`Fitur edit kategori ${categoryId} akan segera tersedia.`);
  // TODO: Implement edit category functionality
};

// Delete Category
window.deleteCategory = async (categoryId) => {
  if (!confirm('Hapus kategori akan menghapus semua produk di dalamnya. Lanjutkan?')) return;
  
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) throw error;

    alert('✅ Kategori berhasil dihapus!');
    loadCategoriesAdmin();
    loadDashboard();

  } catch (error) {
    console.error('Error deleting category:', error);
    alert('❌ Gagal menghapus kategori: ' + error.message);
  }
};

// Save Settings
window.saveSettings = () => {
  const storeName = document.getElementById('storeName')?.value;
  const whatsappNumber = document.getElementById('whatsappNumber')?.value;
  const newPassword = document.getElementById('newPassword')?.value;
  const confirmPassword = document.getElementById('confirmPassword')?.value;
  
  let updates = [];
  
  if (storeName) {
    localStorage.setItem('nest_store_name', storeName);
    updates.push('Nama toko');
  }
  
  if (whatsappNumber) {
    localStorage.setItem('nest_whatsapp_number', whatsappNumber);
    updates.push('Nomor WhatsApp');
  }
  
  if (newPassword && confirmPassword) {
    if (newPassword === confirmPassword) {
      alert('⚠️ Fitur update password akan segera tersedia.');
    } else {
      alert('❌ Password tidak cocok!');
    }
  }
  
  if (updates.length > 0) {
    alert(`✅ ${updates.join(', ')} berhasil disimpan!`);
  } else {
    alert('Tidak ada perubahan yang disimpan.');
  }
};

// Reset Settings
window.resetSettings = () => {
  if (confirm('Reset semua pengaturan ke default?')) {
    localStorage.removeItem('nest_store_name');
    localStorage.removeItem('nest_whatsapp_number');
    loadSettings();
    alert('Pengaturan telah direset!');
  }
};

// Show Admin Alert
const showAdminAlert = (message, type = 'info') => {
  const alertDiv = document.createElement('div');
  alertDiv.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg ${
    type === 'error' ? 'bg-red-500 text-white' :
    type === 'success' ? 'bg-green-500 text-white' :
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

// Initialize Admin Panel
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initializing Admin Panel...');
  
  // Check authentication
  const isAuthenticated = localStorage.getItem('nest_admin_auth') === 'true';
  if (isAuthenticated) {
    document.getElementById('loginCheck').style.display = 'none';
    document.getElementById('adminLayout').classList.remove('hidden');
    loadDashboard();
  }
  
  // Enter key for login
  document.getElementById('adminAuth')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      verifyAdmin();
    }
  });
  
  console.log('✅ Admin Panel initialized successfully');
});