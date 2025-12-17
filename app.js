// app.js - FIXED LENGKAP
// Lazy Load Images
const lazyLoadImages = () => {
  const images = document.querySelectorAll('img[data-src]');
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.classList.remove('opacity-0');
        observer.unobserve(img);
      }
    });
  });

  images.forEach(img => imageObserver.observe(img));
};

// Audio Control
let currentAudio = null;

const initAudio = () => {
  const audioPanel = document.getElementById('audioPanel');
  const playBtn = document.getElementById('playBtn');
  const stopBtn = document.getElementById('stopBtn');

  if (CONFIG.audio.enabled && CONFIG.audio.url) {
    audioPanel.classList.remove('hidden');
    
    playBtn.addEventListener('click', () => {
      if (!currentAudio) {
        currentAudio = new Audio(CONFIG.audio.url);
        currentAudio.play();
        playBtn.innerHTML = '<i class="fas fa-pause mr-2"></i>Pause';
        playBtn.classList.remove('bg-blue-600');
        playBtn.classList.add('bg-yellow-600');
      } else if (currentAudio.paused) {
        currentAudio.play();
        playBtn.innerHTML = '<i class="fas fa-pause mr-2"></i>Pause';
        playBtn.classList.remove('bg-blue-600');
        playBtn.classList.add('bg-yellow-600');
      } else {
        currentAudio.pause();
        playBtn.innerHTML = '<i class="fas fa-play mr-2"></i>Play';
        playBtn.classList.remove('bg-yellow-600');
        playBtn.classList.add('bg-blue-600');
      }
    });

    stopBtn.addEventListener('click', () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        playBtn.innerHTML = '<i class="fas fa-play mr-2"></i>Play';
        playBtn.classList.remove('bg-yellow-600');
        playBtn.classList.add('bg-blue-600');
      }
    });
  }
};

// Load Products from Supabase - FIXED
const loadProducts = async () => {
  try {
    console.log('🔄 Loading products from Supabase...');
    
    // First get categories
    const { data: categories, error: catError } = await window.supabaseClient
      .from('categories')
      .select('id, name, description, icon, color, order_index')
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (catError) {
      console.error('❌ Error loading categories:', catError);
      throw catError;
    }
    
    console.log(`✅ Loaded ${categories?.length || 0} categories`);

    const grid = document.getElementById('productsGrid');
    const productCountEl = document.getElementById('productCount');
    
    if (!grid) {
      console.error('❌ Products grid element not found');
      return;
    }

    grid.innerHTML = '';

    if (!categories || categories.length === 0) {
      console.log('⚠️ No categories found, showing fallback');
      showFallbackProducts();
      return;
    }

    let totalProducts = 0;

    // For each category, get products
    for (const category of categories) {
      const { data: products, error: prodError } = await window.supabaseClient
        .from('products')
        .select('id, name, price, description, image_url, stock, category_id')
        .eq('category_id', category.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (prodError) {
        console.error(`❌ Error loading products for category ${category.name}:`, prodError);
        continue;
      }

      const productCount = products ? products.length : 0;
      totalProducts += productCount;

      const categoryCard = document.createElement('div');
      categoryCard.className = 'bg-white dark:bg-gray-800 rounded-xl p-4 border border-blue-200 dark:border-blue-500 border-opacity-20 hover:border-opacity-40 transition-all hover:scale-105 cursor-pointer shadow hover:shadow-lg';
      categoryCard.setAttribute('data-aos', 'fade-up');
      categoryCard.setAttribute('data-category-id', category.id);
      
      categoryCard.innerHTML = `
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            ${category.icon ? `<span class="text-xl" style="color: ${category.color || '#3b82f6'}">${category.icon}</span>` : ''}
            <h4 class="font-bold text-lg" style="color: ${category.color || '#3b82f6'}">${category.name}</h4>
          </div>
          <span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
            ${productCount} produk
          </span>
        </div>
        ${category.description ? `<p class="text-sm text-gray-600 dark:text-gray-400 mb-3">${category.description}</p>` : ''}
        <div class="flex items-center justify-between">
          <span class="text-sm text-blue-600 dark:text-blue-300">
            Klik untuk melihat produk
          </span>
          <i class="fas fa-chevron-right text-blue-500"></i>
        </div>
      `;

      categoryCard.addEventListener('click', () => showCategoryProducts(category, products || []));
      grid.appendChild(categoryCard);
    }

    // Update product count
    if (productCountEl) {
      productCountEl.textContent = `${totalProducts} produk tersedia`;
    }

    // Show transaction history button if there are transactions
    const transactions = JSON.parse(localStorage.getItem('jmb_transactions') || '[]');
    if (transactions.length > 0) {
      document.getElementById('transactionHistoryBtn').classList.remove('hidden');
    }

  } catch (error) {
    console.error('❌ Error loading products:', error);
    showFallbackProducts();
  }
};

// Show Category Products Modal
const showCategoryProducts = (category, products) => {
  const modal = document.getElementById('productModal');
  const content = document.getElementById('productModalContent');
  
  let productsHTML = `
    <div class="flex items-center gap-3 mb-6">
      ${category.icon ? `<span class="text-2xl" style="color: ${category.color || '#3b82f6'}">${category.icon}</span>` : ''}
      <h3 class="text-2xl font-bold text-gray-800 dark:text-blue-300">${category.name}</h3>
    </div>
    <div class="space-y-4 max-h-96 overflow-y-auto pr-2">
  `;

  if (!products || products.length === 0) {
    productsHTML += `
      <div class="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg text-center">
        <i class="fas fa-box-open text-4xl text-gray-300 dark:text-gray-600 mb-3"></i>
        <p class="text-gray-500 dark:text-gray-400">Belum ada produk untuk kategori ini.</p>
      </div>
    `;
  } else {
    products.forEach(product => {
      const price = parseFloat(product.price) || 0;
      const formattedPrice = price.toLocaleString('id-ID');
      const stock = product.stock || 0;
      
      productsHTML += `
        <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-blue-500 border-opacity-20 product-item" data-product-id="${product.id}">
          <div class="flex justify-between items-start mb-2">
            <div class="flex-1">
              <h4 class="font-semibold text-gray-800 dark:text-white">${product.name}</h4>
              ${product.description ? `<p class="text-gray-600 dark:text-gray-400 text-sm mt-1">${product.description}</p>` : ''}
            </div>
            <span class="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-bold ml-2">
              Rp ${formattedPrice}
            </span>
          </div>
          
          ${stock >= 0 ? `
            <div class="mb-3">
              <div class="flex items-center gap-2 ${stock > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                <i class="fas fa-box${stock > 0 ? '' : '-open'}"></i>
                <span class="text-sm font-medium">Stok: ${stock > 0 ? `${stock} tersedia` : 'Habis'}</span>
              </div>
            </div>
          ` : ''}
          
          <div class="flex gap-2">
            <button onclick="orderProduct('${product.name.replace(/'/g, "\\'")}', ${price}, 'whatsapp')" 
                    class="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 rounded-lg font-semibold transition-colors text-white flex items-center justify-center gap-2">
              <i class="fab fa-whatsapp"></i>Pesan via WhatsApp
            </button>
            <button onclick="showPaymentOptions('${product.name.replace(/'/g, "\\'")}', ${price}, '${product.id}')" 
                    class="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg font-semibold transition-colors text-white flex items-center justify-center gap-2">
              <i class="fas fa-credit-card"></i>Bayar Sekarang
            </button>
          </div>
        </div>
      `;
    });
  }

  productsHTML += '</div>';
  content.innerHTML = productsHTML;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  
  lazyLoadImages();
};

// Payment Options
const showPaymentOptions = (productName, price, productId) => {
  const modal = document.getElementById('productModal');
  const content = document.getElementById('productModalContent');
  
  const formattedPrice = price.toLocaleString('id-ID');
  
  const paymentHTML = `
    <div class="mb-6">
      <button onclick="goBackToProducts()" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4 flex items-center gap-2">
        <i class="fas fa-arrow-left"></i>Kembali ke Produk
      </button>
      <h3 class="text-2xl font-bold text-gray-800 dark:text-blue-300 mb-4">Pilih Metode Pembayaran</h3>
    </div>
    
    <div class="mb-6 p-4 bg-blue-50 dark:bg-gray-800 rounded-lg">
      <h4 class="font-semibold text-gray-800 dark:text-white">${productName}</h4>
      <p class="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">Rp ${formattedPrice}</p>
    </div>
    
    <div class="space-y-3 mb-6">
      <button onclick="showQRISPayment(${price}, '${productName.replace(/'/g, "\\'")}', '${productId}')" 
              class="w-full p-4 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 dark:from-purple-700 dark:to-blue-800 dark:hover:from-purple-800 dark:hover:to-blue-900 rounded-lg text-left flex items-center justify-between transition-all text-white">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
            <i class="fas fa-qrcode text-2xl"></i>
          </div>
          <div>
            <div class="font-bold">QRIS Dinamis</div>
            <div class="text-sm opacity-90">Bayar dengan QRIS (otomatis sesuai harga)</div>
          </div>
        </div>
        <i class="fas fa-chevron-right"></i>
      </button>
      
      <button onclick="showManualPayment('${productName.replace(/'/g, "\\'")}', ${price})" 
              class="w-full p-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 dark:from-green-700 dark:to-emerald-800 dark:hover:from-green-800 dark:hover:to-emerald-900 rounded-lg text-left flex items-center justify-between transition-all text-white">
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
    
    <div class="bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
      <div class="flex items-start gap-3">
        <i class="fas fa-info-circle text-yellow-500 dark:text-yellow-300 mt-1"></i>
        <div>
          <p class="text-sm text-yellow-700 dark:text-yellow-300">
            <strong>Perhatian:</strong> Pastikan melakukan pembayaran sesuai nominal produk. 
            Setelah pembayaran, kirim bukti transfer ke WhatsApp kami.
          </p>
        </div>
      </div>
    </div>
  `;
  
  content.innerHTML = paymentHTML;
};

// Go back to products
const goBackToProducts = () => {
  // This will be handled by the back button in the modal
  const category = { name: 'Produk' };
  showCategoryProducts(category, []);
};

// QRIS Payment
const showQRISPayment = async (amount, productName, productId) => {
  const modal = document.getElementById('productModal');
  const content = document.getElementById('productModalContent');
  
  const formattedAmount = amount.toLocaleString('id-ID');
  
  // Generate payment data
  const paymentData = {
    product: productName,
    amount: amount,
    productId: productId,
    timestamp: Date.now(),
    merchant: 'JMB STORE',
    store: 'SYAIF OFFICIAL'
  };
  
  const encodedData = encodeURIComponent(JSON.stringify(paymentData));
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedData}&format=png&color=0a192f&bgcolor=0ea5e9&margin=10`;
  
  const paymentHTML = `
    <div class="text-center">
      <button onclick="showPaymentOptions('${productName.replace(/'/g, "\\'")}', ${amount}, '${productId}')" 
              class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4 flex items-center gap-2">
        <i class="fas fa-arrow-left"></i>Kembali ke Pilihan Bayar
      </button>
      
      <h3 class="text-2xl font-bold mb-2 text-gray-800 dark:text-blue-300">QRIS Pembayaran</h3>
      <p class="text-gray-600 dark:text-gray-300 mb-6">Scan QR code berikut untuk membayar:</p>
      
      <div class="mb-4 p-4 bg-blue-50 dark:bg-gray-800 rounded-lg inline-block">
        <h4 class="font-semibold text-gray-800 dark:text-white">${productName}</h4>
        <p class="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">Rp ${formattedAmount}</p>
      </div>
      
      <div class="bg-white p-6 rounded-xl inline-block mb-6 qris-pulse">
        <img src="${qrCodeUrl}" 
             alt="QRIS Payment" 
             class="w-64 h-64 mx-auto rounded-lg"
             id="dynamicQRCode">
      </div>
      
      <div class="grid grid-cols-2 gap-3 mb-6">
        <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
          <div class="text-sm text-gray-500 dark:text-gray-400">Nominal</div>
          <div class="font-bold text-gray-800 dark:text-white">Rp ${formattedAmount}</div>
        </div>
        <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
          <div class="text-sm text-gray-500 dark:text-gray-400">Kode Transaksi</div>
          <div class="font-bold text-blue-600 dark:text-blue-300">JMB-${Date.now().toString().slice(-6)}</div>
        </div>
      </div>
      
      <div class="space-y-3">
        <button onclick="downloadQRCode('${qrCodeUrl}', '${productName}')" 
                class="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 rounded-lg font-semibold flex items-center justify-center gap-2 text-white">
          <i class="fas fa-download"></i>Download QR Code
        </button>
        
        <button onclick="copyPaymentData(${amount}, '${productName.replace(/'/g, "\\'")}')" 
                class="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 rounded-lg font-semibold flex items-center justify-center gap-2 text-white">
          <i class="fas fa-copy"></i>Salin Data Pembayaran
        </button>
        
        <div class="bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 mt-4">
          <p class="text-xs text-yellow-700 dark:text-yellow-300 text-center">
            <i class="fas fa-exclamation-triangle mr-1"></i>
            Pastikan nominal pembayaran sesuai sebelum melakukan scan.
          </p>
        </div>
      </div>
    </div>
  `;
  
  content.innerHTML = paymentHTML;
  
  // Save transaction
  saveTransaction(amount, productName, productId, 'qris');
};

// Download QR Code
const downloadQRCode = (qrUrl, productName) => {
  const link = document.createElement('a');
  link.href = qrUrl;
  link.download = `QRIS-JMB-${productName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Show notification
  showNotification('QR Code berhasil didownload!', 'success');
};

// Copy Payment Data
const copyPaymentData = (amount, productName) => {
  const formattedAmount = amount.toLocaleString('id-ID');
  const paymentData = `
🔔 *PEMBAYARAN JMB STORE*
    
📦 Produk: ${productName}
💰 Total: Rp ${formattedAmount}
    
Silahkan transfer tepat sesuai nominal di atas ke QRIS yang tersedia.
    
Setelah transfer, kirim bukti ke WhatsApp: ${CONFIG.whatsappNumber}
    
Terima kasih! ✨
  `;
  
  navigator.clipboard.writeText(paymentData).then(() => {
    showNotification('Data pembayaran berhasil disalin!', 'success');
  }).catch(err => {
    console.error('Failed to copy:', err);
    showNotification('Gagal menyalin, silahkan copy manual.', 'error');
  });
};

// Show Notification
const showNotification = (message, type = 'info') => {
  // Remove existing notifications
  const existingNotif = document.querySelector('.custom-notification');
  if (existingNotif) existingNotif.remove();
  
  const notification = document.createElement('div');
  notification.className = `custom-notification fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 ${
    type === 'success' ? 'bg-green-500 text-white' :
    type === 'error' ? 'bg-red-500 text-white' :
    'bg-blue-500 text-white'
  }`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.classList.add('translate-x-0');
  }, 10);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.add('opacity-0', 'translate-x-full');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
};

// Manual Payment
const showManualPayment = (productName, price) => {
  const modal = document.getElementById('productModal');
  const content = document.getElementById('productModalContent');
  
  const formattedPrice = price.toLocaleString('id-ID');
  
  const manualPaymentHTML = `
    <div class="mb-6">
      <button onclick="showPaymentOptions('${productName.replace(/'/g, "\\'")}', ${price}, 'temp')" 
              class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4 flex items-center gap-2">
        <i class="fas fa-arrow-left"></i>Kembali ke Pilihan Bayar
      </button>
      <h3 class="text-2xl font-bold mb-6 text-gray-800 dark:text-blue-300">Transfer Manual</h3>
    </div>
    
    <div class="mb-6 p-4 bg-blue-50 dark:bg-gray-800 rounded-lg">
      <h4 class="font-semibold text-gray-800 dark:text-white">${productName}</h4>
      <p class="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">Rp ${formattedPrice}</p>
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
          <button onclick="copyToClipboard('085185025316')" class="text-sm bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 px-3 py-1 rounded text-white">
            Salin
          </button>
        </div>
        <p class="text-sm text-gray-700 dark:text-gray-300 font-mono">085185025316</p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">a.n. SYAIF OFFICIAL</p>
      </div>
      
      <div class="bg-gradient-to-r from-green-100 to-emerald-200 dark:from-green-900 dark:to-emerald-800 p-4 rounded-lg">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <i class="fab fa-google-wallet text-white text-xl"></i>
            </div>
            <span class="font-bold text-gray-800 dark:text-white">GoPay</span>
          </div>
          <button onclick="copyToClipboard('085185025316')" class="text-sm bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 px-3 py-1 rounded text-white">
            Salin
          </button>
        </div>
        <p class="text-sm text-gray-700 dark:text-gray-300 font-mono">085185025316</p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">a.n. JMB STORE</p>
      </div>
      
      <div class="bg-gradient-to-r from-red-100 to-orange-200 dark:from-red-900 dark:to-orange-800 p-4 rounded-lg">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
              <i class="fas fa-university text-white text-xl"></i>
            </div>
            <span class="font-bold text-gray-800 dark:text-white">Bank Mandiri</span>
          </div>
          <button onclick="copyToClipboard('1100019933016')" class="text-sm bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 px-3 py-1 rounded text-white">
            Salin
          </button>
        </div>
        <p class="text-sm text-gray-700 dark:text-gray-300 font-mono">1100019933016</p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">a.n. SYAIF</p>
      </div>
    </div>
    
    <div class="bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6">
      <div class="flex items-start gap-3">
        <i class="fas fa-exclamation-triangle text-yellow-500 dark:text-yellow-300 mt-1"></i>
        <div>
          <p class="text-yellow-700 dark:text-yellow-300 text-sm">
            <strong>Transfer tepat sesuai nominal: Rp ${formattedPrice}</strong><br>
            Setelah transfer, kirim bukti ke WhatsApp kami.
          </p>
        </div>
      </div>
    </div>
    
    <div class="flex gap-3">
      <button onclick="confirmManualPayment('${productName.replace(/'/g, "\\'")}', ${price})" 
              class="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 rounded-lg font-semibold text-white flex items-center justify-center gap-2">
        <i class="fas fa-check-circle"></i>Saya Sudah Transfer
      </button>
    </div>
  `;
  
  content.innerHTML = manualPaymentHTML;
};

// Helper functions
const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    showNotification('Nomor berhasil disalin!', 'success');
  }).catch(err => {
    console.error('Failed to copy:', err);
    showNotification('Gagal menyalin, silahkan copy manual.', 'error');
  });
};

const confirmManualPayment = (productName, price) => {
  const formattedPrice = price.toLocaleString('id-ID');
  const message = `✅ Konfirmasi Pembayaran\n\nSaya sudah transfer untuk produk:\n${productName}\n\nNominal: Rp ${formattedPrice}\n\nMohon dicek dan diproses.`;
  const whatsappUrl = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
  
  // Save transaction
  saveTransaction(price, productName, 'manual-' + Date.now(), 'manual');
};

// Save transaction to localStorage
const saveTransaction = (amount, productName, productId, method) => {
  const transaction = {
    id: 'trans-' + Date.now(),
    productName,
    amount,
    productId,
    method,
    timestamp: new Date().toISOString(),
    status: 'pending'
  };
  
  let transactions = JSON.parse(localStorage.getItem('jmb_transactions') || '[]');
  transactions.push(transaction);
  localStorage.setItem('jmb_transactions', JSON.stringify(transactions));
  
  // Show transaction history button
  document.getElementById('transactionHistoryBtn').classList.remove('hidden');
  
  console.log('Transaction saved:', transaction);
  showNotification('Transaksi berhasil disimpan!', 'success');
};

// Order Product Function
const orderProduct = (productName, price, method = 'whatsapp') => {
  const formattedPrice = price.toLocaleString('id-ID');
  let message = '';
  
  if (method === 'whatsapp') {
    message = `Halo JMB Store! 🛍️\n\nSaya ingin memesan produk:\n\n📦 *${productName}*\n💰 Harga: Rp ${formattedPrice}\n\nBisa dijelaskan lebih detail tentang produk ini?\n\nTerima kasih! 🙏`;
  }
  
  const whatsappUrl = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
  
  // Save inquiry
  saveTransaction(price, productName, 'inquiry-' + Date.now(), 'inquiry');
};

// Close Product Modal
const closeProductModal = () => {
  document.getElementById('productModal').classList.add('hidden');
  document.body.style.overflow = 'auto';
};

// Admin Panel Functions
const showAdminLogin = () => {
  document.getElementById('adminLoginModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
};

const closeAdminLogin = () => {
  document.getElementById('adminLoginModal').classList.add('hidden');
  document.getElementById('adminPassword').value = '';
  document.body.style.overflow = 'auto';
};

const adminLogin = () => {
  const password = document.getElementById('adminPassword').value;
  
  if (password === ADMIN_PASSWORD) {
    closeAdminLogin();
    localStorage.setItem('jmb_admin_auth', 'true');
    window.location.href = 'admin.html';
  } else {
    showNotification('Password salah!', 'error');
  }
};

// Fallback Products if Supabase fails
const showFallbackProducts = () => {
  const fallbackData = [
    { 
      id: 1, 
      name: 'HOSTING BOT', 
      description: 'Hosting untuk bot Telegram',
      icon: '🤖',
      color: '#3b82f6',
      products: [
        { id: 1, name: '1 GB CPU 30%', price: 100000, description: 'Hosting dengan resource 1GB', stock: 10 },
        { id: 2, name: '2 GB CPU 60%', price: 200000, description: 'Hosting dengan resource 2GB', stock: 5 }
      ]
    },
    { 
      id: 2, 
      name: 'LIST NOKOS', 
      description: 'Nomor kosong berbagai negara',
      icon: '📱',
      color: '#10b981',
      products: [
        { id: 3, name: 'Nokos Indonesia', price: 50000, description: 'Nomor Indonesia fresh', stock: 20 },
        { id: 4, name: 'Nokos Philippines', price: 70000, description: 'Nomor Philippines', stock: 15 }
      ]
    },
    { 
      id: 3, 
      name: 'AKUN PREMIUM', 
      description: 'Akun premium berbagai platform',
      icon: '⭐',
      color: '#f59e0b',
      products: [
        { id: 5, name: 'Spotify Premium', price: 25000, description: 'Akun Spotify Premium 1 bulan', stock: 30 },
        { id: 6, name: 'Netflix 4K', price: 35000, description: 'Akun Netflix 4K UHD', stock: 12 }
      ]
    }
  ];

  const grid = document.getElementById('productsGrid');
  const productCountEl = document.getElementById('productCount');
  
  if (!grid) return;
  
  grid.innerHTML = '';
  
  let totalProducts = 0;
  
  fallbackData.forEach(category => {
    const productCount = category.products.length;
    totalProducts += productCount;
    
    const card = document.createElement('div');
    card.className = 'bg-white dark:bg-gray-800 rounded-xl p-4 border border-blue-200 dark:border-blue-500 border-opacity-20 hover:border-opacity-40 transition-all hover:scale-105 cursor-pointer shadow hover:shadow-lg';
    card.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-3">
          <span class="text-xl" style="color: ${category.color}">${category.icon}</span>
          <h4 class="font-bold text-lg" style="color: ${category.color}">${category.name}</h4>
        </div>
        <span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
          ${productCount} produk
        </span>
      </div>
      ${category.description ? `<p class="text-sm text-gray-600 dark:text-gray-400 mb-3">${category.description}</p>` : ''}
      <div class="flex items-center justify-between">
        <span class="text-sm text-blue-600 dark:text-blue-300">
          Klik untuk melihat produk
        </span>
        <i class="fas fa-chevron-right text-blue-500"></i>
      </div>
    `;
    card.onclick = () => showCategoryProducts(category, category.products);
    grid.appendChild(card);
  });
  
  // Update product count
  if (productCountEl) {
    productCountEl.textContent = `${totalProducts} produk tersedia`;
  }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Initializing JMB Store...');
  
  // Initialize AOS
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 1000,
      once: true,
      offset: 100,
      disable: window.innerWidth < 768
    });
  }

  // Hide loading screen and show welcome modal
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
    
    // Show welcome modal on first visit
    showWelcomeModal();
    
    // Initialize components
    initAudio();
    loadProducts();
    lazyLoadImages();
    
    // Admin login button
    const adminBtn = document.getElementById('adminLoginBtn');
    if (adminBtn) {
      adminBtn.addEventListener('click', showAdminLogin);
    }
    
    console.log('✅ JMB Store initialized successfully');
  }, 2000);
});