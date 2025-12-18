// app.js - NestSian Store - SECURE VERSION
let cart = [];
let currentProduct = null;
let isAppInitialized = false;

// Initialize Cart
const initCart = () => {
  try {
    // Load cart from localStorage with validation
    const cartData = localStorage.getItem('nest_cart');
    if (cartData) {
      cart = JSON.parse(cartData);
      // Validate cart items
      cart = cart.filter(item => 
        item && 
        item.id && 
        item.name && 
        typeof item.price === 'number' && 
        typeof item.quantity === 'number' &&
        item.quantity > 0
      );
    }
    updateCartCount();
    document.getElementById('cartBtn')?.addEventListener('click', showCart);
  } catch (error) {
    console.error('Error initializing cart:', error);
    cart = [];
    localStorage.removeItem('nest_cart');
  }
};

// Update Cart Count
const updateCartCount = () => {
  const cartBtn = document.getElementById('cartBtn');
  if (cartBtn) {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartBtn.innerHTML = `
      <i class="fas fa-shopping-cart mr-2"></i>
      Keranjang 
      ${totalItems > 0 ? `<span class="notification-badge"></span>` : ''}
      ${totalItems > 0 ? `(${totalItems})` : ''}
    `;
  }
};

// Show Cart Modal
const showCart = () => {
  const modal = document.getElementById('cartModal');
  const content = document.getElementById('cartContent');
  const totalEl = document.getElementById('cartTotal');
  
  if (!modal || !content || !totalEl) return;
  
  if (cart.length === 0) {
    content.innerHTML = `
      <div class="text-center py-8">
        <div class="text-4xl mb-4 text-gray-300 dark:text-gray-600">
          <i class="fas fa-shopping-cart"></i>
        </div>
        <p class="text-gray-500 dark:text-gray-400">Keranjang belanja kosong</p>
        <p class="text-sm text-gray-400 dark:text-gray-500 mt-2">Tambahkan produk untuk memulai belanja</p>
      </div>
    `;
    totalEl.textContent = 'Rp 0';
  } else {
    let total = 0;
    let html = '<div class="space-y-4">';
    
    cart.forEach((item, index) => {
      const itemTotal = item.price * item.quantity;
      total += itemTotal;
      const safeName = Security.escapeHtml(item.name || 'Unknown Product');
      
      html += `
        <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <i class="fas fa-box text-gray-400"></i>
            </div>
            <div>
              <h4 class="font-semibold text-gray-800 dark:text-white">${safeName}</h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">Rp ${item.price.toLocaleString()} × ${item.quantity}</p>
              <div class="flex items-center gap-2 mt-2">
                <button onclick="updateCartQuantity(${index}, ${item.quantity - 1})" 
                        class="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600">
                  <i class="fas fa-minus text-xs"></i>
                </button>
                <span class="w-8 text-center">${item.quantity}</span>
                <button onclick="updateCartQuantity(${index}, ${item.quantity + 1})" 
                        class="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600">
                  <i class="fas fa-plus text-xs"></i>
                </button>
              </div>
            </div>
          </div>
          <div class="text-right">
            <div class="font-bold text-blue-600 dark:text-blue-400">Rp ${itemTotal.toLocaleString()}</div>
            <button onclick="removeFromCart(${index})" 
                    class="mt-2 text-sm text-red-500 hover:text-red-700">
              <i class="fas fa-trash mr-1"></i>Hapus
            </button>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    content.innerHTML = html;
    totalEl.textContent = `Rp ${total.toLocaleString()}`;
  }
  
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
};

// Close Cart
const closeCart = () => {
  document.getElementById('cartModal').classList.add('hidden');
  document.body.style.overflow = 'auto';
};

// Update Cart Quantity
const updateCartQuantity = (index, newQuantity) => {
  if (newQuantity < 1) {
    removeFromCart(index);
    return;
  }
  
  // Validate index
  if (index < 0 || index >= cart.length) {
    showNotification('Item tidak ditemukan', 'error');
    return;
  }
  
  // Check stock
  const product = cart[index];
  if (product.maxStock && newQuantity > product.maxStock) {
    showNotification('Stok tidak mencukupi!', 'error');
    return;
  }
  
  // Limit max quantity
  if (newQuantity > 99) {
    showNotification('Maksimal 99 item per produk', 'error');
    return;
  }
  
  cart[index].quantity = newQuantity;
  saveCart();
  showCart();
};

// Remove from Cart
const removeFromCart = (index) => {
  if (index < 0 || index >= cart.length) {
    showNotification('Item tidak ditemukan', 'error');
    return;
  }
  
  cart.splice(index, 1);
  saveCart();
  showCart();
  updateCartCount();
};

// Save Cart to LocalStorage
const saveCart = () => {
  try {
    localStorage.setItem('nest_cart', JSON.stringify(cart));
    updateCartCount();
  } catch (error) {
    console.error('Error saving cart:', error);
    showNotification('Gagal menyimpan keranjang', 'error');
  }
};

// Add to Cart with validation
const addToCart = (product, quantity = 1) => {
  // Validate input
  if (!product || !product.id || !product.name || typeof product.price !== 'number') {
    showNotification('Produk tidak valid', 'error');
    return false;
  }
  
  if (quantity < 1 || quantity > 99) {
    showNotification('Jumlah tidak valid', 'error');
    return false;
  }
  
  // Check if cart has too many items
  if (cart.length >= CONFIG.maxCartItems) {
    showNotification(`Maksimal ${CONFIG.maxCartItems} item di keranjang`, 'error');
    return false;
  }
  
  // Check if product already in cart
  const existingIndex = cart.findIndex(item => item.id === product.id);
  
  if (existingIndex > -1) {
    const newQuantity = cart[existingIndex].quantity + quantity;
    
    // Check stock
    if (product.stock && newQuantity > product.stock) {
      showNotification('Stok tidak mencukupi!', 'error');
      return false;
    }
    
    // Check max quantity
    if (newQuantity > 99) {
      showNotification('Maksimal 99 item per produk', 'error');
      return false;
    }
    
    cart[existingIndex].quantity = newQuantity;
  } else {
    // Check stock
    if (product.stock && quantity > product.stock) {
      showNotification('Stok tidak mencukupi!', 'error');
      return false;
    }
    
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: quantity,
      maxStock: product.stock
    });
  }
  
  saveCart();
  const safeName = Security.escapeHtml(product.name);
  showNotification(`${safeName} ditambahkan ke keranjang!`, 'success');
  return true;
};

// Checkout Cart
const checkoutCart = () => {
  if (cart.length === 0) {
    showNotification('Keranjang belanja kosong!', 'error');
    return;
  }
  
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const productNames = cart.map(item => {
    const safeName = Security.escapeHtml(item.name);
    return `${safeName} (${item.quantity}x)`;
  }).join(', ');
  
  showPaymentOptions(productNames, total, 'cart-checkout');
};

// Show Notification
const showNotification = (message, type = 'info') => {
  const container = document.getElementById('notificationContainer');
  if (!container) return;
  
  const notification = document.createElement('div');
  notification.className = `custom-notification mb-3 ${
    type === 'success' ? 'bg-green-500' : 
    type === 'error' ? 'bg-red-500' : 
    'bg-blue-500'
  } text-white`;
  notification.innerHTML = `
    <div class="flex items-center justify-between p-4 rounded-lg shadow-lg">
      <div class="flex items-center gap-3">
        ${type === 'success' ? '<i class="fas fa-check-circle"></i>' : 
          type === 'error' ? '<i class="fas fa-exclamation-circle"></i>' : 
          '<i class="fas fa-info-circle"></i>'}
        <span>${Security.escapeHtml(message)}</span>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="ml-4 hover:opacity-80">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;
  
  container.appendChild(notification);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 3000);
};

// Load Products with error handling
const loadProducts = async () => {
  try {
    console.log('🔄 Loading products...');
    
    // Load categories first
    let categories = [];
    try {
      const { data: catData, error: catError } = await window.supabaseClient
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('order_index');
      
      if (catError) throw catError;
      categories = catData || [];
    } catch (catErr) {
      console.warn('⚠️ Failed to load categories:', catErr.message);
    }
    
    // Load products
    let products = [];
    try {
      const { data: prodData, error: prodError } = await window.supabaseClient
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (prodError) throw prodError;
      products = prodData || [];
    } catch (prodErr) {
      console.error('❌ Error loading products:', prodErr);
      if (window.supabaseInitialized) {
        showNotification('Gagal memuat produk dari server', 'error');
      }
    }
    
    const grid = document.getElementById('productsGrid');
    const countEl = document.getElementById('productCount');
    const categoriesSection = document.getElementById('categoriesSection');
    const categoriesGrid = document.getElementById('categoriesGrid');
    
    if (!grid || !countEl) return;
    
    // Show categories if available
    if (categories.length > 0 && categoriesSection && categoriesGrid) {
      categoriesSection.classList.remove('hidden');
      categoriesGrid.innerHTML = categories.map(cat => {
        const safeName = Security.escapeHtml(cat.name || '');
        const safeDescription = Security.escapeHtml(cat.description || '');
        const safeIcon = Security.escapeHtml(cat.icon || '📦');
        const color = cat.color || 'from-blue-500 to-blue-600';
        
        return `
          <div class="bg-gradient-to-br ${color} p-6 rounded-xl text-white text-center cursor-pointer hover:scale-105 transition-transform" 
               onclick="filterByCategory(${cat.id})">
            <div class="text-3xl mb-3">${safeIcon}</div>
            <h4 class="font-bold mb-2">${safeName}</h4>
            ${cat.description ? `<p class="text-sm opacity-90">${safeDescription}</p>` : ''}
          </div>
        `;
      }).join('');
    }
    
    // Display products
    if (products.length === 0 && window.supabaseInitialized) {
      grid.innerHTML = `
        <div class="col-span-3 text-center py-12">
          <i class="fas fa-box-open text-4xl text-gray-300 mb-4"></i>
          <p class="text-gray-500 dark:text-gray-400">Belum ada produk tersedia</p>
          ${!window.supabaseInitialized ? `
            <p class="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
              <i class="fas fa-exclamation-triangle mr-1"></i>
              Mode offline - koneksi database terputus
            </p>
          ` : ''}
        </div>
      `;
      countEl.textContent = '0 produk';
      return;
    }
    
    // If no products from Supabase, use fallback
    if (products.length === 0) {
      showFallbackProducts();
      return;
    }
    
    displayProducts(products, categories);
    countEl.textContent = `${products.length} produk tersedia`;
    
    // Setup search functionality
    setupSearch(products);
    
  } catch (error) {
    console.error('❌ Error in loadProducts:', error);
    showFallbackProducts();
  }
};

// Display Products (Helper function)
const displayProducts = (products, categories = []) => {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  
  let html = '';
  
  products.forEach(product => {
    const price = parseFloat(product.price) || 0;
    const stock = parseInt(product.stock) || 0;
    const safeName = Security.escapeHtml(product.name || '');
    const safeDescription = Security.escapeHtml(product.description || '');
    const category = categories.find(c => c.id === product.category_id);
    const safeCategoryName = category ? Security.escapeHtml(category.name) : '';
    
    html += `
      <div class="product-card bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
        <div class="p-6">
          ${product.image_url ? `
            <img src="${Security.escapeHtml(product.image_url)}" 
                 alt="${safeName}" 
                 class="w-full h-48 object-cover rounded-lg mb-4"
                 onerror="this.src='https://via.placeholder.com/400x300?text=Product+Image'">
          ` : `
            <div class="w-full h-48 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-4">
              <i class="fas fa-box text-white text-4xl"></i>
            </div>
          `}
          
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1">
              <h3 class="font-bold text-lg text-gray-800 dark:text-white mb-1">${safeName}</h3>
              ${safeCategoryName ? `<span class="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded">${safeCategoryName}</span>` : ''}
            </div>
            <div class="text-right">
              <div class="price-tag">Rp ${price.toLocaleString()}</div>
              <div class="stock-badge ${stock > 10 ? 'stock-in' : stock > 0 ? 'stock-low' : 'stock-out'} mt-1">
                ${stock > 0 ? `${stock} stok` : 'Habis'}
              </div>
            </div>
          </div>
          
          ${product.description ? `
            <p class="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
              ${safeDescription}
            </p>
          ` : ''}
          
          <div class="flex gap-2">
            <button onclick="showProductDetail('${product.id}')" 
                    class="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors">
              <i class="fas fa-eye mr-2"></i>Detail
            </button>
            <button onclick="addToCartFromProduct(${product.id}, '${safeName.replace(/'/g, "\\'")}', ${price}, ${stock})" 
                    ${stock === 0 ? 'disabled' : ''}
                    class="flex-1 px-4 py-2 ${stock === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700'} rounded-lg text-white font-semibold transition-colors">
              <i class="fas fa-cart-plus mr-2"></i>${stock === 0 ? 'Habis' : 'Beli'}
            </button>
          </div>
        </div>
      </div>
    `;
  });
  
  grid.innerHTML = html;
};

// Helper function for add to cart from product display
window.addToCartFromProduct = (productId, productName, price, stock) => {
  const product = {
    id: productId,
    name: productName,
    price: price,
    stock: stock
  };
  addToCart(product);
};

// Show Product Detail
const showProductDetail = async (productId) => {
  try {
    const { data: product, error } = await window.supabaseClient
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();
    
    if (error) throw error;
    
    currentProduct = product;
    
    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('productDetailContent');
    
    if (!modal || !content) return;
    
    const price = parseFloat(product.price) || 0;
    const stock = parseInt(product.stock) || 0;
    const safeName = Security.escapeHtml(product.name || '');
    const safeDescription = Security.escapeHtml(product.description || 'Tidak ada deskripsi');
    
    content.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          ${product.image_url ? `
            <img src="${Security.escapeHtml(product.image_url)}" 
                 alt="${safeName}" 
                 class="product-detail-img w-full"
                 onerror="this.src='https://via.placeholder.com/600x400?text=Product+Image'">
          ` : `
            <div class="product-detail-img bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <i class="fas fa-box text-white text-8xl"></i>
            </div>
          `}
          
          <div class="grid grid-cols-2 gap-4 mt-4">
            <div class="bg-blue-50 dark:bg-gray-800 p-4 rounded-lg">
              <div class="text-sm text-gray-600 dark:text-gray-400">Status</div>
              <div class="font-bold ${stock > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                ${stock > 0 ? 'Ready Stock' : 'Stok Habis'}
              </div>
            </div>
            <div class="bg-blue-50 dark:bg-gray-800 p-4 rounded-lg">
              <div class="text-sm text-gray-600 dark:text-gray-400">Stok Tersedia</div>
              <div class="font-bold text-gray-800 dark:text-white">${stock} unit</div>
            </div>
          </div>
        </div>
        
        <div>
          <h2 class="text-3xl font-bold text-gray-800 dark:text-white mb-4">${safeName}</h2>
          
          <div class="price-tag text-4xl mb-6">Rp ${price.toLocaleString()}</div>
          
          <div class="mb-6">
            <h3 class="font-bold text-gray-800 dark:text-white mb-2">Deskripsi Produk:</h3>
            <p class="text-gray-700 dark:text-gray-300">${safeDescription}</p>
          </div>
          
          <div class="mb-6">
            <h3 class="font-bold text-gray-800 dark:text-white mb-2">Detail:</h3>
            <ul class="text-gray-700 dark:text-gray-300 space-y-2">
              <li><i class="fas fa-check text-green-500 mr-2"></i>Produk Original 100%</li>
              <li><i class="fas fa-check text-green-500 mr-2"></i>Garansi Support 24/7</li>
              <li><i class="fas fa-check text-green-500 mr-2"></i>Instant Delivery setelah bayar</li>
            </ul>
          </div>
          
          <div class="space-y-4">
            ${stock > 0 ? `
              <div class="flex items-center gap-4">
                <label class="text-gray-700 dark:text-gray-300">Jumlah:</label>
                <div class="flex items-center gap-2">
                  <button onclick="updateDetailQuantity(-1)" class="w-10 h-10 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600">
                    <i class="fas fa-minus"></i>
                  </button>
                  <span id="detailQuantity" class="w-12 text-center text-xl font-bold">1</span>
                  <button onclick="updateDetailQuantity(1)" class="w-10 h-10 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600">
                    <i class="fas fa-plus"></i>
                  </button>
                  <span class="text-sm text-gray-500 ml-4">Stok: ${stock}</span>
                </div>
              </div>
              
              <div class="grid grid-cols-2 gap-3">
                <button onclick="addToCartFromDetail()" 
                        class="px-6 py-3 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg text-white font-bold transition-colors flex items-center justify-center gap-2">
                  <i class="fas fa-cart-plus"></i>Tambahkan
                </button>
                <button onclick="buyNow()" 
                        class="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg text-white font-bold transition-colors flex items-center justify-center gap-2">
                  <i class="fas fa-bolt"></i>Beli Sekarang
                </button>
              </div>
            ` : `
              <div class="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 p-4 rounded-lg text-center">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                Stok produk habis. Silahkan hubungi admin untuk pre-order.
              </div>
            `}
          </div>
        </div>
      </div>
    `;
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
  } catch (error) {
    console.error('Error loading product detail:', error);
    showNotification('Gagal memuat detail produk', 'error');
  }
};

// Update Detail Quantity
const updateDetailQuantity = (change) => {
  const quantityEl = document.getElementById('detailQuantity');
  if (!quantityEl || !currentProduct) return;
  
  let quantity = parseInt(quantityEl.textContent) + change;
  const stock = parseInt(currentProduct.stock) || 0;
  
  if (quantity < 1) quantity = 1;
  if (quantity > stock) {
    showNotification(`Stok hanya tersedia ${stock} unit`, 'error');
    quantity = stock;
  }
  
  quantityEl.textContent = quantity;
};

// Add to Cart from Detail
const addToCartFromDetail = () => {
  if (!currentProduct) return;
  
  const quantityEl = document.getElementById('detailQuantity');
  const quantity = quantityEl ? parseInt(quantityEl.textContent) : 1;
  
  const added = addToCart({
    id: currentProduct.id,
    name: currentProduct.name,
    price: parseFloat(currentProduct.price) || 0,
    stock: parseInt(currentProduct.stock) || 0
  }, quantity);
  
  if (added) {
    closeProductDetail();
  }
};

// Buy Now
const buyNow = () => {
  if (!currentProduct) return;
  
  const quantityEl = document.getElementById('detailQuantity');
  const quantity = quantityEl ? parseInt(quantityEl.textContent) : 1;
  const total = (parseFloat(currentProduct.price) || 0) * quantity;
  const safeName = Security.escapeHtml(currentProduct.name);
  
  showPaymentOptions(`${safeName} (${quantity}x)`, total, currentProduct.id);
  closeProductDetail();
};

// Close Product Detail
const closeProductDetail = () => {
  document.getElementById('productDetailModal').classList.add('hidden');
  document.body.style.overflow = 'auto';
  currentProduct = null;
};

// Show Payment Options
const showPaymentOptions = (productName, amount, productId) => {
  const modal = document.getElementById('paymentModal');
  const content = document.getElementById('paymentContent');
  
  if (!modal || !content) return;
  
  const formattedAmount = amount.toLocaleString('id-ID');
  
  content.innerHTML = `
    <div class="text-center">
      <h3 class="text-2xl font-bold mb-2 text-gray-800 dark:text-blue-300">Pilih Metode Bayar</h3>
      <p class="text-gray-600 dark:text-gray-300 mb-6">Total: <span class="font-bold text-green-600 dark:text-green-400">Rp ${formattedAmount}</span></p>
      
      <div class="space-y-3 mb-6">
        <button onclick="showQRISPayment(${amount}, '${Security.escapeHtml(productName).replace(/'/g, "\\'")}', '${productId}')" 
                class="w-full p-4 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 rounded-lg text-left flex items-center justify-between transition-all text-white">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <i class="fas fa-qrcode text-2xl"></i>
            </div>
            <div>
              <div class="font-bold">QRIS Dinamis</div>
              <div class="text-sm opacity-90">Scan QR Code untuk bayar</div>
            </div>
          </div>
          <i class="fas fa-chevron-right"></i>
        </button>
        
        <button onclick="showManualPayment('${Security.escapeHtml(productName).replace(/'/g, "\\'")}', ${amount})" 
                class="w-full p-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg text-left flex items-center justify-between transition-all text-white">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <i class="fas fa-wallet text-2xl"></i>
            </div>
            <div>
              <div class="font-bold">Transfer Manual</div>
              <div class="text-sm opacity-90">DANA/GoPay/Bank Transfer</div>
            </div>
          </div>
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
      
      <div class="bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6">
        <p class="text-sm text-yellow-700 dark:text-yellow-300 text-center">
          <i class="fas fa-exclamation-triangle mr-1"></i>
          Pastikan nominal pembayaran sesuai: <strong>Rp ${formattedAmount}</strong>
        </p>
      </div>
      
      <button onclick="closePayment()" 
              class="w-full px-6 py-3 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg font-semibold transition-colors text-gray-800 dark:text-gray-200">
        <i class="fas fa-times mr-2"></i>Batal
      </button>
    </div>
  `;
  
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
};

// Show QRIS Payment
const showQRISPayment = (amount, productName, productId) => {
  const modal = document.getElementById('paymentModal');
  const content = document.getElementById('paymentContent');
  
  if (!modal || !content) return;
  
  const formattedAmount = amount.toLocaleString('id-ID');
  const transactionId = `NS${Date.now().toString().slice(-8)}`;
  
  // Generate QRIS data
  const qrisData = {
    merchant: 'NestSian Store',
    transaction_id: transactionId,
    amount: amount,
    product: productName,
    timestamp: new Date().toISOString()
  };
  
  const encodedData = encodeURIComponent(JSON.stringify(qrisData));
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedData}&format=png&color=0a192f&bgcolor=0ea5e9&margin=10`;
  
  content.innerHTML = `
    <div class="text-center">
      <button onclick="showPaymentOptions('${productName.replace(/'/g, "\\'")}', ${amount}, '${productId}')" 
              class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4 flex items-center gap-2">
        <i class="fas fa-arrow-left"></i>Kembali
      </button>
      
      <h3 class="text-2xl font-bold mb-4 text-gray-800 dark:text-blue-300">QRIS Pembayaran</h3>
      
      <div class="mb-4 p-4 bg-blue-50 dark:bg-gray-800 rounded-lg inline-block">
        <div class="text-sm text-gray-600 dark:text-gray-400">Total Pembayaran</div>
        <div class="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">Rp ${formattedAmount}</div>
      </div>
      
      <div class="qr-container qris-pulse inline-block mb-6">
        <img src="${qrCodeUrl}" 
             alt="QRIS Payment" 
             class="w-64 h-64"
             id="dynamicQRCode">
      </div>
      
      <div class="grid grid-cols-2 gap-3 mb-6">
        <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
          <div class="text-sm text-gray-500 dark:text-gray-400">Kode Transaksi</div>
          <div class="font-bold text-blue-600 dark:text-blue-300">${transactionId}</div>
        </div>
        <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
          <div class="text-sm text-gray-500 dark:text-gray-400">Status</div>
          <div class="font-bold text-yellow-600 dark:text-yellow-400">Menunggu Bayar</div>
        </div>
      </div>
      
      <div class="space-y-3">
        <button onclick="downloadQRCode('${qrCodeUrl}', '${productName}')" 
                class="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 rounded-lg font-semibold flex items-center justify-center gap-2 text-white">
          <i class="fas fa-download"></i>Download QR Code
        </button>
        
        <button onclick="copyPaymentData(${amount}, '${productName.replace(/'/g, "\\'")}', '${transactionId}')" 
                class="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 rounded-lg font-semibold flex items-center justify-center gap-2 text-white">
          <i class="fas fa-copy"></i>Salin Data Pembayaran
        </button>
        
        <button onclick="confirmPayment(${amount}, '${productName.replace(/'/g, "\\'")}', '${transactionId}')" 
                class="w-full px-4 py-3 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 rounded-lg font-semibold flex items-center justify-center gap-2 text-white">
          <i class="fas fa-check-circle"></i>Konfirmasi Pembayaran
        </button>
      </div>
    </div>
  `;
  
  // Save transaction
  saveTransaction(amount, productName, productId, 'qris', transactionId);
};

// Show Manual Payment
const showManualPayment = (productName, amount) => {
  const modal = document.getElementById('paymentModal');
  const content = document.getElementById('paymentContent');
  
  if (!modal || !content) return;
  
  const formattedAmount = amount.toLocaleString('id-ID');
  const transactionId = `NS${Date.now().toString().slice(-8)}`;
  const safeProductName = Security.escapeHtml(productName);
  
  content.innerHTML = `
    <div class="text-center">
      <button onclick="showPaymentOptions('${productName.replace(/'/g, "\\'")}', ${amount}, 'temp')" 
              class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4 flex items-center gap-2">
        <i class="fas fa-arrow-left"></i>Kembali
      </button>
      
      <h3 class="text-2xl font-bold mb-6 text-gray-800 dark:text-blue-300">Transfer Manual</h3>
      
      <div class="mb-6 p-4 bg-blue-50 dark:bg-gray-800 rounded-lg">
        <h4 class="font-semibold text-gray-800 dark:text-white">${safeProductName}</h4>
        <p class="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">Rp ${formattedAmount}</p>
      </div>
      
      <div class="space-y-4 mb-6">
        <div class="bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 p-4 rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <i class="fab fa-dana text-white text-xl"></i>
              </div>
              <span class="font-bold text-gray-800 dark:text-white">DANA</span>
            </div>
            <button onclick="copyToClipboard('085185025316')" class="text-sm bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded text-white">
              Salin
            </button>
          </div>
          <p class="text-sm text-gray-700 dark:text-gray-300 font-mono">085185025316</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">a.n. NESTSIAN STORE</p>
        </div>
        
        <div class="bg-gradient-to-r from-green-100 to-emerald-200 dark:from-green-900 dark:to-emerald-800 p-4 rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <i class="fab fa-google-wallet text-white text-xl"></i>
              </div>
              <span class="font-bold text-gray-800 dark:text-white">GoPay</span>
            </div>
            <button onclick="copyToClipboard('085185025316')" class="text-sm bg-green-500 hover:bg-green-600 px-3 py-1 rounded text-white">
              Salin
            </button>
          </div>
          <p class="text-sm text-gray-700 dark:text-gray-300 font-mono">085185025316</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">a.n. NESTSIAN STORE</p>
        </div>
      </div>
      
      <div class="bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6">
        <p class="text-yellow-700 dark:text-yellow-300 text-sm">
          <strong>Transfer tepat sesuai nominal: Rp ${formattedAmount}</strong><br>
          Setelah transfer, klik tombol "Konfirmasi Pembayaran" di bawah.
        </p>
      </div>
      
      <div class="space-y-3">
        <button onclick="confirmManualPayment('${productName.replace(/'/g, "\\'")}', ${amount}, '${transactionId}')" 
                class="w-full px-6 py-3 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 rounded-lg font-semibold text-white flex items-center justify-center gap-2">
          <i class="fas fa-check-circle"></i>Konfirmasi Pembayaran
        </button>
        
        <button onclick="closePayment()" 
                class="w-full px-6 py-3 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg font-semibold text-gray-800 dark:text-gray-200">
          <i class="fas fa-times mr-2"></i>Batal
        </button>
      </div>
    </div>
  `;
  
  // Save transaction
  saveTransaction(amount, productName, 'manual', 'manual', transactionId);
};

// Copy to Clipboard
const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    showNotification('Berhasil disalin!', 'success');
  }).catch(err => {
    console.error('Failed to copy:', err);
    showNotification('Gagal menyalin', 'error');
  });
};

// Download QR Code
const downloadQRCode = (qrUrl, productName) => {
  const link = document.createElement('a');
  link.href = qrUrl;
  link.download = `QRIS-${productName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showNotification('QR Code berhasil didownload!', 'success');
};

// Copy Payment Data
const copyPaymentData = (amount, productName, transactionId) => {
  const formattedAmount = amount.toLocaleString('id-ID');
  const safeProductName = Security.escapeHtml(productName);
  const paymentData = `
🔔 *KONFIRMASI PEMBAYARAN NESTSIAN STORE*
    
📦 Produk: ${safeProductName}
💰 Total: Rp ${formattedAmount}
📋 Kode Transaksi: ${transactionId}
    
Saya sudah melakukan pembayaran sebesar Rp ${formattedAmount}
Mohon dicek dan diproses.
    
Terima kasih! ✨
  `;
  
  navigator.clipboard.writeText(paymentData).then(() => {
    showNotification('Data pembayaran berhasil disalin!', 'success');
  }).catch(err => {
    console.error('Failed to copy:', err);
    showNotification('Gagal menyalin, silahkan copy manual.', 'error');
  });
};

// Confirm Payment
const confirmPayment = (amount, productName, transactionId) => {
  const formattedAmount = amount.toLocaleString('id-ID');
  const safeProductName = Security.escapeHtml(productName);
  const message = `Halo NestSian Store! 🛍️\n\nSaya ingin konfirmasi pembayaran:\n\n📦 Produk: ${safeProductName}\n💰 Total: Rp ${formattedAmount}\n📋 Kode Transaksi: ${transactionId}\n\nSaya sudah melakukan pembayaran via QRIS.\nMohon dicek dan diproses.\n\nTerima kasih! 🙏`;
  const whatsappUrl = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
  
  closePayment();
  showNotification('Silahkan konfirmasi via WhatsApp', 'success');
};

// Confirm Manual Payment
const confirmManualPayment = (productName, amount, transactionId) => {
  const formattedAmount = amount.toLocaleString('id-ID');
  const safeProductName = Security.escapeHtml(productName);
  const message = `Halo NestSian Store! 🛍️\n\nSaya ingin konfirmasi pembayaran:\n\n📦 Produk: ${safeProductName}\n💰 Total: Rp ${formattedAmount}\n📋 Kode Transaksi: ${transactionId}\n\nSaya sudah melakukan transfer manual.\nMohon dicek dan diproses.\n\nTerima kasih! 🙏`;
  const whatsappUrl = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
  
  closePayment();
  showNotification('Silahkan konfirmasi via WhatsApp', 'success');
};

// Close Payment
const closePayment = () => {
  const modal = document.getElementById('paymentModal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
  }
};

// Save Transaction
const saveTransaction = (amount, productName, productId, method, transactionId) => {
  try {
    const transaction = {
      id: transactionId || 'trans-' + Date.now(),
      productName: Security.escapeHtml(productName),
      amount: amount,
      productId: productId,
      method: method,
      transactionId: transactionId || '',
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    let transactions = JSON.parse(localStorage.getItem('nest_transactions') || '[]');
    transactions.push(transaction);
    
    // Limit stored transactions to 100
    if (transactions.length > 100) {
      transactions = transactions.slice(-100);
    }
    
    localStorage.setItem('nest_transactions', JSON.stringify(transactions));
    
    console.log('Transaction saved:', transaction);
  } catch (error) {
    console.error('Error saving transaction:', error);
  }
};

// Setup Search
const setupSearch = (products) => {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;
  
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    
    searchTimeout = setTimeout(() => {
      const searchTerm = e.target.value.toLowerCase().trim();
      const grid = document.getElementById('productsGrid');
      const countEl = document.getElementById('productCount');
      
      if (!grid || !countEl) return;
      
      if (!searchTerm) {
        loadProducts();
        return;
      }
      
      const filtered = products.filter(product => {
        const nameMatch = product.name && product.name.toLowerCase().includes(searchTerm);
        const descMatch = product.description && product.description.toLowerCase().includes(searchTerm);
        return nameMatch || descMatch;
      });
      
      if (filtered.length === 0) {
        grid.innerHTML = `
          <div class="col-span-3 text-center py-12">
            <i class="fas fa-search text-4xl text-gray-300 mb-4"></i>
            <p class="text-gray-500 dark:text-gray-400">Produk tidak ditemukan</p>
            <p class="text-sm text-gray-400 dark:text-gray-500 mt-2">Coba kata kunci lain</p>
          </div>
        `;
        countEl.textContent = '0 produk ditemukan';
      } else {
        displayProducts(filtered);
        countEl.textContent = `${filtered.length} produk ditemukan`;
      }
    }, 300);
  });
};

// Filter by Category
window.filterByCategory = (categoryId) => {
  // Implement category filtering
  showNotification('Fitur filter kategori akan segera tersedia', 'info');
};

// Fallback Products
const showFallbackProducts = () => {
  const fallbackProducts = [
    {
      id: 1,
      name: 'Hosting Bot Premium',
      price: 100000,
      description: 'Hosting khusus untuk bot Telegram dengan resource optimal',
      stock: 10,
      image_url: null
    },
    {
      id: 2,
      name: 'Akun Spotify Family',
      price: 35000,
      description: 'Akun Spotify Premium 1 bulan garansi 30 hari',
      stock: 25,
      image_url: null
    },
    {
      id: 3,
      name: 'Nokos Indonesia Fresh',
      price: 50000,
      description: 'Nomor kosong Indonesia untuk verifikasi',
      stock: 15,
      image_url: null
    },
    {
      id: 4,
      name: 'Netflix 4K UHD',
      price: 45000,
      description: 'Akun Netflix premium kualitas 4K',
      stock: 8,
      image_url: null
    },
    {
      id: 5,
      name: 'Script Website E-commerce',
      price: 250000,
      description: 'Script lengkap website toko online',
      stock: 5,
      image_url: null
    },
    {
      id: 6,
      name: 'Panel SMM Reseller',
      price: 150000,
      description: 'Panel Social Media Marketing untuk reseller',
      stock: 12,
      image_url: null
    }
  ];
  
  const grid = document.getElementById('productsGrid');
  const countEl = document.getElementById('productCount');
  
  if (!grid || !countEl) return;
  
  displayProducts(fallbackProducts);
  countEl.textContent = `${fallbackProducts.length} produk (offline mode)`;
  
  showNotification('Mode offline: Menampilkan produk contoh', 'info');
};

// Admin Functions
const showAdminLogin = () => {
  document.getElementById('adminLoginModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  setTimeout(() => {
    document.getElementById('adminPassword')?.focus();
  }, 100);
};

const closeAdminLogin = () => {
  document.getElementById('adminLoginModal').classList.add('hidden');
  document.getElementById('adminPassword').value = '';
  document.body.style.overflow = 'auto';
};

const adminLogin = () => {
  const password = document.getElementById('adminPassword').value;
  
  // Basic validation
  if (!password) {
    showNotification('Masukkan password!', 'error');
    return;
  }
  
  // In production, this should be done server-side with hashing
  if (password === ADMIN_PASSWORD) {
    closeAdminLogin();
    localStorage.setItem('nest_admin_auth', 'true');
    window.location.href = 'admin.html';
  } else {
    showNotification('Password salah!', 'error');
  }
};

// Theme Toggle
const initTheme = () => {
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  
  if (!themeToggle || !themeIcon) return;
  
  // Check saved theme
  const savedTheme = localStorage.getItem('nest_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add('dark');
    themeIcon.classList.remove('fa-sun');
    themeIcon.classList.add('fa-moon');
  } else {
    document.documentElement.classList.remove('dark');
    themeIcon.classList.remove('fa-moon');
    themeIcon.classList.add('fa-sun');
  }
  
  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('nest_theme', isDark ? 'dark' : 'light');
    
    if (isDark) {
      themeIcon.classList.remove('fa-sun');
      themeIcon.classList.add('fa-moon');
    } else {
      themeIcon.classList.remove('fa-moon');
      themeIcon.classList.add('fa-sun');
    }
  });
};

// Clear expired data
const clearExpiredData = () => {
  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  
  try {
    // Clear old cart items
    const cartData = localStorage.getItem('nest_cart');
    if (cartData) {
      const cart = JSON.parse(cartData);
      if (Array.isArray(cart)) {
        const freshCart = cart.filter(item => {
          if (item.timestamp) {
            return new Date(item.timestamp).getTime() > oneWeekAgo;
          }
          return true;
        });
        if (freshCart.length !== cart.length) {
          localStorage.setItem('nest_cart', JSON.stringify(freshCart));
        }
      }
    }
  } catch (error) {
    console.error('Error clearing expired data:', error);
  }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  if (isAppInitialized) return;
  
  console.log('🚀 Initializing NestSian Store...');
  
  // Clear expired data
  clearExpiredData();
  
  // Initialize theme
  initTheme();
  
  // Hide loading screen
  setTimeout(() => {
    const loading = document.getElementById('loading');
    const main = document.getElementById('main');
    
    if (loading) {
      loading.style.opacity = '0';
      setTimeout(() => {
        loading.style.display = 'none';
      }, 500);
    }
    
    if (main) {
      main.classList.remove('hidden');
      setTimeout(() => {
        main.style.opacity = '1';
      }, 100);
    }
    
    // Initialize components
    initCart();
    loadProducts();
    
    // Admin login button
    const adminBtn = document.getElementById('adminLoginBtn');
    if (adminBtn) {
      adminBtn.addEventListener('click', showAdminLogin);
    }
    
    // Close modals on ESC or outside click
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeCart();
        closePayment();
        closeProductDetail();
        closeAdminLogin();
      }
    });
    
    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
      const modals = ['cartModal', 'paymentModal', 'productDetailModal', 'adminLoginModal'];
      modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal && !modal.classList.contains('hidden') && e.target === modal) {
          switch(modalId) {
            case 'cartModal': closeCart(); break;
            case 'paymentModal': closePayment(); break;
            case 'productDetailModal': closeProductDetail(); break;
            case 'adminLoginModal': closeAdminLogin(); break;
          }
        }
      });
    });
    
    isAppInitialized = true;
    console.log('✅ NestSian Store initialized successfully');
  }, 1000);
});

// Add error handling for uncaught errors
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
  showNotification('Terjadi kesalahan pada aplikasi', 'error');
});

// Add offline/online detection
window.addEventListener('online', () => {
  showNotification('Koneksi internet pulih', 'success');
  if (isAppInitialized) {
    loadProducts();
  }
});

window.addEventListener('offline', () => {
  showNotification('Anda sedang offline', 'warning');
});