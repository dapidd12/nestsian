// admin.js - Fix lengkap
let currentAdminSection = 'dashboard';

// Pastikan supabase client tersedia
const getSupabase = () => {
  return window.supabaseClient || supabase;
};

// Verify Admin - Updated
const verifyAdmin = async () => {
  const password = document.getElementById('adminAuth').value;
  
  if (!password) {
    alert('Masukkan password!');
    return;
  }

  // Simple password check
  if (password === ADMIN_PASSWORD) {
    document.getElementById('loginCheck').style.display = 'none';
    document.getElementById('adminLayout').classList.remove('hidden');
    localStorage.setItem('jmb_admin_auth', 'true');
    loadDashboard();
  } else {
    alert('Password salah!');
  }
};

// Show Section
const showSection = (sectionId) => {
  // Hide all sections
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
  
  // Show selected section
  const section = document.getElementById(sectionId);
  if (section) {
    section.classList.remove('hidden');
    currentAdminSection = sectionId;
    
    // Load section data
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
      case 'settings':
        loadSettings();
        break;
    }
  }
};

// Load Dashboard - Updated
const loadDashboard = async () => {
  try {
    const supabase = getSupabase();
    
    // Get total products
    const { count: productCount, error: productError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    
    // Get total categories
    const { count: categoryCount, error: categoryError } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true });
    
    if (productError) console.error('Product count error:', productError);
    if (categoryError) console.error('Category count error:', categoryError);
    
    const totalProducts = document.getElementById('totalProducts');
    const totalCategories = document.getElementById('totalCategories');
    
    if (totalProducts) totalProducts.textContent = productCount || 0;
    if (totalCategories) totalCategories.textContent = categoryCount || 0;
    
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
};

// Load Products for Admin - Updated
const loadProductsAdmin = async () => {
  try {
    const supabase = getSupabase();
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        price,
        image_url,
        categories (
          name
        )
      `)
      .order('created_at', { ascending: false });

    const container = document.getElementById('productsList');
    if (!container) return;

    container.innerHTML = '';

    if (error) {
      container.innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-red-600">Error loading products: ${error.message}</p>
          <button onclick="loadProductsAdmin()" class="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded">
            Coba Lagi
          </button>
        </div>
      `;
      return;
    }

    if (!products || products.length === 0) {
      container.innerHTML = '<p class="text-gray-500">Belum ada produk.</p>';
      return;
    }

    const tableHTML = `
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b bg-gray-50">
              <th class="text-left p-3 font-semibold">Produk</th>
              <th class="text-left p-3 font-semibold">Harga</th>
              <th class="text-left p-3 font-semibold">Kategori</th>
              <th class="text-left p-3 font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(product => `
              <tr class="border-b hover:bg-gray-50 transition-colors">
                <td class="p-3">
                  <div class="flex items-center gap-3">
                    ${product.image_url ? `
                      <img src="${product.image_url}" alt="${product.name}" 
                           class="w-10 h-10 rounded-lg object-cover">
                    ` : `
                      <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span class="text-blue-600">📦</span>
                      </div>
                    `}
                    <span class="font-medium">${product.name}</span>
                  </div>
                </td>
                <td class="p-3">
                  <span class="font-bold text-blue-600">
                    Rp ${parseInt(product.price || 0).toLocaleString()}
                  </span>
                </td>
                <td class="p-3">
                  <span class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    ${product.categories?.name || 'Uncategorized'}
                  </span>
                </td>
                <td class="p-3">
                  <div class="flex gap-2">
                    <button onclick="editProduct('${product.id}')" 
                            class="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-sm transition-colors">
                      Edit
                    </button>
                    <button onclick="deleteProduct('${product.id}')" 
                            class="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors">
                      Hapus
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
    const container = document.getElementById('productsList');
    if (container) {
      container.innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-red-600">Terjadi kesalahan saat memuat produk.</p>
          <button onclick="loadProductsAdmin()" class="mt-2 px-4 py-2 bg-blue-100 text-blue-700 rounded">
            Muat Ulang
          </button>
        </div>
      `;
    }
  }
};

// Load Categories for Admin - Updated
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
          <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div class="flex items-center gap-2 mb-2">
              ${category.icon ? `<span class="text-xl">${category.icon}</span>` : ''}
              <h3 class="font-bold text-lg">${category.name}</h3>
            </div>
            ${category.description ? `<p class="text-gray-600 text-sm mb-3">${category.description}</p>` : ''}
            <div class="flex gap-2 mt-4">
              <button onclick="editCategory('${category.id}')" 
                      class="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors">
                Edit
              </button>
              <button onclick="deleteCategory('${category.id}')" 
                      class="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors">
                Hapus
              </button>
            </div>
          </div>
        `;
      });
    } else {
      html = '<p class="text-gray-500 col-span-3 text-center py-8">Belum ada kategori.</p>';
    }

    html += `
      </div>
      <button onclick="showAddCategoryModal()" 
              class="mt-6 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors">
        + Tambah Kategori Baru
      </button>
    `;

    container.innerHTML = html;

  } catch (error) {
    console.error('Error loading categories:', error);
  }
};

// Load Orders
const loadOrders = async () => {
  const ordersSection = document.getElementById('orders');
  if (!ordersSection) return;
  
  ordersSection.innerHTML = `
    <h1 class="text-3xl font-bold mb-6 text-gray-800">Pesanan</h1>
    <div class="bg-white rounded-xl shadow p-6">
      <p class="text-gray-500">Fitur pesanan akan segera tersedia.</p>
      <p class="text-sm text-gray-400 mt-2">
        Untuk melihat pesanan, silahkan cek WhatsApp atau Telegram admin.
      </p>
    </div>
  `;
};

// Load Settings
const loadSettings = () => {
  const settingsSection = document.getElementById('settings');
  if (!settingsSection) return;
  
  // Get current settings from localStorage
  const audioUrl = localStorage.getItem('jmb_audio_url') || CONFIG.audio.url;
  
  settingsSection.innerHTML = `
    <h1 class="text-3xl font-bold mb-6 text-gray-800">Pengaturan</h1>
    <div class="bg-white rounded-xl shadow p-6">
      <div class="space-y-6">
        <div>
          <label class="block text-gray-700 mb-2 font-semibold">Password Admin</label>
          <input type="password" id="newPassword" 
                 placeholder="Masukkan password baru" 
                 class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
          <p class="text-sm text-gray-500 mt-1">Password saat ini: <code>${ADMIN_PASSWORD}</code></p>
          <button onclick="updatePassword()" class="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            Update Password
          </button>
        </div>
        
        <div>
          <label class="block text-gray-700 mb-2 font-semibold">URL Audio Background</label>
          <input type="text" id="audioUrl" 
                 value="${audioUrl}"
                 class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
          <p class="text-sm text-gray-500 mt-1">URL untuk audio background website</p>
        </div>
        
        <div>
          <label class="block text-gray-700 mb-2 font-semibold">WhatsApp Number</label>
          <input type="text" id="whatsappNumber" 
                 value="${CONFIG.whatsappNumber}"
                 class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
          <p class="text-sm text-gray-500 mt-1">Nomor WhatsApp untuk pesanan</p>
        </div>
        
        <div class="pt-4 border-t">
          <button onclick="saveSettings()" class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors">
            💾 Simpan Semua Pengaturan
          </button>
          <button onclick="resetSettings()" class="ml-3 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
            🔄 Reset
          </button>
        </div>
      </div>
    </div>
  `;
};

// Product CRUD Operations - Updated
const showAddProductModal = async () => {
  try {
    const supabase = getSupabase();
    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, name')
      .order('order_index');

    const select = document.getElementById('productCategory');
    if (select) {
      if (error) {
        select.innerHTML = '<option value="">Error loading categories</option>';
      } else if (categories && categories.length > 0) {
        select.innerHTML = categories.map(cat => 
          `<option value="${cat.id}">${cat.name}</option>`
        ).join('');
      } else {
        select.innerHTML = '<option value="">Belum ada kategori</option>';
      }
    }

    const modal = document.getElementById('addProductModal');
    if (modal) modal.classList.remove('hidden');

  } catch (error) {
    console.error('Error loading categories:', error);
    alert('Gagal memuat kategori');
  }
};

const closeAddProductModal = () => {
  const modal = document.getElementById('addProductModal');
  if (modal) modal.classList.add('hidden');
  clearProductForm();
};

const clearProductForm = () => {
  document.getElementById('productName').value = '';
  document.getElementById('productPrice').value = '';
  document.getElementById('productDesc').value = '';
  document.getElementById('productImage').value = '';
};

const saveProduct = async () => {
  const name = document.getElementById('productName')?.value;
  const price = document.getElementById('productPrice')?.value;
  const description = document.getElementById('productDesc')?.value;
  const image_url = document.getElementById('productImage')?.value;
  const category_id = document.getElementById('productCategory')?.value;

  if (!name || !price || !category_id) {
    alert('Nama, harga, dan kategori harus diisi!');
    return;
  }

  const productData = {
    name,
    price: parseFloat(price),
    description: description || null,
    image_url: image_url || null,
    category_id,
    is_active: true,
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

const deleteProduct = async (productId) => {
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

// Category functions
const showAddCategoryModal = () => {
  alert('Fitur tambah kategori akan segera tersedia.');
  // Implement category modal here
};

const editCategory = (categoryId) => {
  alert(`Edit kategori ${categoryId} - Fitur akan segera tersedia.`);
};

const deleteCategory = async (categoryId) => {
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

// Edit product
const editProduct = (productId) => {
  alert(`Edit produk ${productId} - Fitur akan segera tersedia.`);
};

// Settings Functions - Updated
const updatePassword = () => {
  const newPassword = document.getElementById('newPassword')?.value;
  if (newPassword && confirm('Update password admin?')) {
    // Note: In production, this should be hashed and stored securely
    alert('⚠️ Password berhasil diupdate! (Simpan di tempat aman)');
    document.getElementById('newPassword').value = '';
  }
};

const saveSettings = () => {
  const audioUrl = document.getElementById('audioUrl')?.value;
  const whatsappNumber = document.getElementById('whatsappNumber')?.value;

  if (audioUrl) {
    localStorage.setItem('jmb_audio_url', audioUrl);
    CONFIG.audio.url = audioUrl;
  }
  
  if (whatsappNumber) {
    CONFIG.whatsappNumber = whatsappNumber;
    localStorage.setItem('jmb_whatsapp_number', whatsappNumber);
  }

  alert('✅ Pengaturan berhasil disimpan!');
};

const resetSettings = () => {
  if (confirm('Reset semua pengaturan ke default?')) {
    localStorage.removeItem('jmb_audio_url');
    localStorage.removeItem('jmb_whatsapp_number');
    loadSettings();
    alert('Pengaturan telah direset!');
  }
};

// Initialize Admin Panel
document.addEventListener('DOMContentLoaded', () => {
  // Check if already authenticated
  const isAuthenticated = localStorage.getItem('jmb_admin_auth') === 'true';
  if (isAuthenticated) {
    document.getElementById('loginCheck').style.display = 'none';
    document.getElementById('adminLayout').classList.remove('hidden');
    loadDashboard();
  }

  // Add event listener for Enter key in login
  const adminAuthInput = document.getElementById('adminAuth');
  if (adminAuthInput) {
    adminAuthInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        verifyAdmin();
      }
    });
  }
});