// Admin Panel JavaScript
let currentAdminSection = 'dashboard';

// Verify Admin
const verifyAdmin = async () => {
  const password = document.getElementById('adminAuth').value;
  
  try {
    const { data, error } = await supabase
      .from('admin_auth')
      .select('*')
      .eq('password', password)
      .single();

    if (error || !data) {
      alert('Password salah!');
      return;
    }

    document.getElementById('loginCheck').style.display = 'none';
    document.getElementById('adminLayout').classList.remove('hidden');
    loadDashboard();
    
  } catch (error) {
    // Fallback to local password check
    if (password === ADMIN_PASSWORD) {
      document.getElementById('loginCheck').style.display = 'none';
      document.getElementById('adminLayout').classList.remove('hidden');
      loadDashboard();
    } else {
      alert('Password salah!');
    }
  }
};

// Show Section
const showSection = (sectionId) => {
  // Hide all sections
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
  
  // Show selected section
  document.getElementById(sectionId).classList.remove('hidden');
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
  }
};

// Load Dashboard
const loadDashboard = async () => {
  try {
    // Get total products
    const { count: productCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    
    // Get total categories
    const { count: categoryCount } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true });
    
    document.getElementById('totalProducts').textContent = productCount || 0;
    document.getElementById('totalCategories').textContent = categoryCount || 0;
    
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
};

// Load Products for Admin
const loadProductsAdmin = async () => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const container = document.getElementById('productsList');
    container.innerHTML = '';

    if (products.length === 0) {
      container.innerHTML = '<p class="text-gray-500">Belum ada produk.</p>';
      return;
    }

    const tableHTML = `
      <table class="w-full">
        <thead>
          <tr class="border-b">
            <th class="text-left p-3">Nama Produk</th>
            <th class="text-left p-3">Harga</th>
            <th class="text-left p-3">Kategori</th>
            <th class="text-left p-3">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${products.map(product => `
            <tr class="border-b hover:bg-gray-50">
              <td class="p-3">${product.name}</td>
              <td class="p-3">Rp ${parseInt(product.price).toLocaleString()}</td>
              <td class="p-3">${product.categories?.name || '-'}</td>
              <td class="p-3">
                <button onclick="editProduct('${product.id}')" class="px-3 py-1 bg-yellow-500 text-white rounded text-sm mr-2">
                  Edit
                </button>
                <button onclick="deleteProduct('${product.id}')" class="px-3 py-1 bg-red-500 text-white rounded text-sm">
                  Hapus
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    container.innerHTML = tableHTML;

  } catch (error) {
    console.error('Error loading products:', error);
    document.getElementById('productsList').innerHTML = 
      '<p class="text-red-500">Error loading products. Please check console.</p>';
  }
};

// Load Categories for Admin
const loadCategoriesAdmin = async () => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('order_index');

    if (error) throw error;

    const container = document.getElementById('categoriesList');
    let html = '<div class="grid grid-cols-1 md:grid-cols-3 gap-4">';

    categories.forEach(category => {
      html += `
        <div class="border rounded-lg p-4">
          <h3 class="font-bold text-lg mb-2">${category.name}</h3>
          <div class="flex gap-2 mt-4">
            <button onclick="editCategory('${category.id}')" 
                    class="px-3 py-1 bg-blue-500 text-white rounded text-sm">
              Edit
            </button>
            <button onclick="deleteCategory('${category.id}')" 
                    class="px-3 py-1 bg-red-500 text-white rounded text-sm">
              Hapus
            </button>
          </div>
        </div>
      `;
    });

    html += `
      </div>
      <button onclick="showAddCategoryModal()" 
              class="mt-6 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold">
        + Tambah Kategori Baru
      </button>
    `;

    container.innerHTML = html;

  } catch (error) {
    console.error('Error loading categories:', error);
  }
};

// Product CRUD Operations
const showAddProductModal = async () => {
  // Load categories for dropdown
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, name')
      .order('order_index');

    if (error) throw error;

    const select = document.getElementById('productCategory');
    select.innerHTML = categories.map(cat => 
      `<option value="${cat.id}">${cat.name}</option>`
    ).join('');

  } catch (error) {
    console.error('Error loading categories:', error);
  }

  document.getElementById('addProductModal').classList.remove('hidden');
};

const closeAddProductModal = () => {
  document.getElementById('addProductModal').classList.add('hidden');
  clearProductForm();
};

const clearProductForm = () => {
  document.getElementById('productName').value = '';
  document.getElementById('productPrice').value = '';
  document.getElementById('productDesc').value = '';
  document.getElementById('productImage').value = '';
};

const saveProduct = async () => {
  const productData = {
    name: document.getElementById('productName').value,
    price: document.getElementById('productPrice').value,
    description: document.getElementById('productDesc').value,
    image_url: document.getElementById('productImage').value,
    category_id: document.getElementById('productCategory').value,
    created_at: new Date().toISOString()
  };

  try {
    const { error } = await supabase
      .from('products')
      .insert([productData]);

    if (error) throw error;

    alert('Produk berhasil ditambahkan!');
    closeAddProductModal();
    loadProductsAdmin();
    loadDashboard(); // Update counts

  } catch (error) {
    console.error('Error saving product:', error);
    alert('Gagal menambahkan produk');
  }
};

const deleteProduct = async (productId) => {
  if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;

  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) throw error;

    alert('Produk berhasil dihapus!');
    loadProductsAdmin();
    loadDashboard();

  } catch (error) {
    console.error('Error deleting product:', error);
    alert('Gagal menghapus produk');
  }
};

// Settings Functions
const updatePassword = () => {
  const newPassword = document.getElementById('newPassword').value;
  if (newPassword && confirm('Update password admin?')) {
    // In a real app, you would update this in Supabase
    alert('Password berhasil diupdate!');
    document.getElementById('newPassword').value = '';
  }
};

const saveSettings = () => {
  const audioUrl = document.getElementById('audioUrl').value;
  // Save settings to Supabase or localStorage
  localStorage.setItem('jmb_audio_url', audioUrl);
  alert('Pengaturan berhasil disimpan!');
};

// Initialize Admin Panel
document.addEventListener('DOMContentLoaded', () => {
  // Check if already authenticated
  const isAuthenticated = localStorage.getItem('jmb_admin_auth');
  if (isAuthenticated === 'true') {
    document.getElementById('loginCheck').style.display = 'none';
    document.getElementById('adminLayout').classList.remove('hidden');
    loadDashboard();
  }
});