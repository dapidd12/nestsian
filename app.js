// app.js - Fix lengkap dengan QRIS Dinamis
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

  if (CONFIG.audio.enabled) {
    audioPanel.classList.remove('hidden');
    
    playBtn.addEventListener('click', () => {
      if (!currentAudio) {
        currentAudio = new Audio(CONFIG.audio.url);
        currentAudio.play();
        playBtn.textContent = 'Pause';
        playBtn.classList.remove('bg-blue-600');
        playBtn.classList.add('bg-yellow-600');
      } else if (currentAudio.paused) {
        currentAudio.play();
        playBtn.textContent = 'Pause';
        playBtn.classList.remove('bg-blue-600');
        playBtn.classList.add('bg-yellow-600');
      } else {
        currentAudio.pause();
        playBtn.textContent = 'Play';
        playBtn.classList.remove('bg-yellow-600');
        playBtn.classList.add('bg-blue-600');
      }
    });

    stopBtn.addEventListener('click', () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        playBtn.textContent = 'Play';
        playBtn.classList.remove('bg-yellow-600');
        playBtn.classList.add('bg-blue-600');
      }
    });
  }
};

// Load Products from Supabase - FIXED QUERY
const loadProducts = async () => {
  try {
    console.log('Loading products from Supabase...');
    
    // First get categories
    const { data: categories, error: catError } = await supabaseClient
      .from('categories')
      .select('id, name, description, icon, color')
      .eq('is_active', true)
      .order('order_index');

    if (catError) throw catError;
    
    console.log('Categories loaded:', categories);

    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '';

    if (!categories || categories.length === 0) {
      showFallbackProducts();
      return;
    }

    // For each category, get products
    for (const category of categories) {
      const { data: products, error: prodError } = await supabaseClient
        .from('products')
        .select('id, name, price, description, image_url, stock')
        .eq('category_id', category.id)
        .eq('is_active', true)
        .order('order_index');

      if (prodError) {
        console.error(`Error loading products for category ${category.name}:`, prodError);
        continue;
      }

      const categoryCard = document.createElement('div');
      categoryCard.className = 'bg-gray-900 rounded-xl p-4 border border-blue-500 border-opacity-20 hover:border-opacity-40 transition-all hover:scale-105 cursor-pointer';
      categoryCard.setAttribute('data-aos', 'flip-up');
      categoryCard.setAttribute('data-category-id', category.id);
      
      const productCount = products ? products.length : 0;
      
      categoryCard.innerHTML = `
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            ${category.icon ? `<span class="text-xl">${category.icon}</span>` : ''}
            <h4 class="font-bold text-lg" style="color: ${category.color || '#60a5fa'}">${category.name}</h4>
          </div>
          <span class="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded-full">
            ${productCount} produk
          </span>
        </div>
        ${category.description ? `<p class="text-sm text-gray-400 mb-2">${category.description}</p>` : ''}
        <div class="text-sm text-blue-300">
          Klik untuk melihat ${productCount} produk
        </div>
      `;

      categoryCard.addEventListener('click', () => showCategoryProducts(category, products || []));
      grid.appendChild(categoryCard);
    }

  } catch (error) {
    console.error('Error loading products:', error);
    showFallbackProducts();
  }
};

// Show Category Products Modal - DITAMBAH QRIS
const showCategoryProducts = (category, products) => {
  const modal = document.getElementById('productModal');
  const content = document.getElementById('productModalContent');
  
  let productsHTML = `
    <h3 class="text-2xl font-bold mb-6 text-blue-300">${category.name}</h3>
    <div class="space-y-4 max-h-96 overflow-y-auto pr-2">
  `;

  if (!products || products.length === 0) {
    productsHTML += `
      <div class="bg-gray-800 p-6 rounded-lg text-center">
        <p class="text-gray-400">Belum ada produk untuk kategori ini.</p>
      </div>
    `;
  } else {
    products.forEach(product => {
      const price = parseFloat(product.price) || 0;
      const formattedPrice = price.toLocaleString('id-ID');
      
      productsHTML += `
        <div class="bg-gray-800 p-4 rounded-lg border border-blue-500 border-opacity-20 product-item" data-product-id="${product.id}">
          <div class="flex justify-between items-start mb-2">
            <h4 class="font-semibold text-white">${product.name}</h4>
            <span class="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
              Rp ${formattedPrice}
            </span>
          </div>
          ${product.description ? `<p class="text-gray-400 text-sm mb-3">${product.description}</p>` : ''}
          ${product.stock !== undefined && product.stock >= 0 ? `
            <p class="text-sm mb-3 ${product.stock > 0 ? 'text-green-400' : 'text-red-400'}">
              Stok: ${product.stock > 0 ? product.stock + ' tersedia' : 'Habis'}
            </p>
          ` : ''}
          <div class="flex gap-2">
            <button onclick="orderProduct('${product.name.replace(/'/g, "\\'")}', ${price}, 'whatsapp')" 
                    class="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors">
              Pesan via WhatsApp
            </button>
            <button onclick="showPaymentOptions('${product.name.replace(/'/g, "\\'")}', ${price}, '${product.id}')" 
                    class="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors">
              Bayar Sekarang
            </button>
          </div>
        </div>
      `;
    });
  }

  productsHTML += '</div>';
  content.innerHTML = productsHTML;
  modal.classList.remove('hidden');
  
  lazyLoadImages();
};

// Fitur Baru: QRIS Dinamis
const showPaymentOptions = (productName, price, productId) => {
  const modal = document.getElementById('productModal');
  const content = document.getElementById('productModalContent');
  
  const formattedPrice = price.toLocaleString('id-ID');
  
  const paymentHTML = `
    <h3 class="text-2xl font-bold mb-6 text-blue-300">Pembayaran</h3>
    <div class="mb-4 p-4 bg-gray-800 rounded-lg">
      <h4 class="font-semibold text-white">${productName}</h4>
      <p class="text-2xl font-bold text-green-400 mt-2">Rp ${formattedPrice}</p>
    </div>
    
    <div class="space-y-3 mb-6">
      <h4 class="font-semibold text-blue-300">Pilih Metode Pembayaran:</h4>
      
      <button onclick="showQRISPayment(${price}, '${productName.replace(/'/g, "\\'")}', '${productId}')" 
              class="w-full p-4 bg-gradient-to-r from-purple-700 to-blue-700 hover:from-purple-800 hover:to-blue-800 rounded-lg text-left flex items-center justify-between transition-all">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <span class="text-2xl">💰</span>
          </div>
          <div>
            <div class="font-bold text-white">QRIS Dinamis</div>
            <div class="text-sm text-gray-300">Bayar dengan QRIS (otomatis sesuai harga)</div>
          </div>
        </div>
        <span class="text-white">→</span>
      </button>
      
      <button onclick="showManualPayment('${productName.replace(/'/g, "\\'")}', ${price})" 
              class="w-full p-4 bg-gradient-to-r from-green-700 to-emerald-700 hover:from-green-800 hover:to-emerald-800 rounded-lg text-left flex items-center justify-between transition-all">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <span class="text-2xl">💳</span>
          </div>
          <div>
            <div class="font-bold text-white">Transfer Manual</div>
            <div class="text-sm text-gray-300">DANA/GoPay/Bank Transfer</div>
          </div>
        </div>
        <span class="text-white">→</span>
      </button>
    </div>
    
    <div class="flex gap-3">
      <button onclick="showCategoryProducts({name: '${productName.substring(0, 20)}...'}, [])" 
              class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
        ← Kembali
      </button>
      <button onclick="orderProduct('${productName.replace(/'/g, "\\'")}', ${price}, 'whatsapp')" 
              class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">
        Tanya via WhatsApp
      </button>
    </div>
  `;
  
  content.innerHTML = paymentHTML;
};

// Fungsi QRIS Dinamis - Otomatis generate QR berdasarkan harga
const showQRISPayment = async (amount, productName, productId) => {
  const modal = document.getElementById('productModal');
  const content = document.getElementById('productModalContent');
  
  const formattedAmount = amount.toLocaleString('id-ID');
  
  // Generate QRIS dengan data dinamis
  // Method 1: Menggunakan API QR Server dengan data pembayaran
  const paymentData = {
    product: productName,
    amount: amount,
    productId: productId,
    timestamp: Date.now(),
    merchant: 'JMB STORE'
  };
  
  const encodedData = encodeURIComponent(JSON.stringify(paymentData));
  
  // QR Code untuk pembayaran (simulasi)
  // Di production, gunakan API seperti Midtrans/QRIS official
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedData}&format=png&color=0a192f&bgcolor=0ea5e9&margin=10`;
  
  const paymentHTML = `
    <div class="text-center">
      <h3 class="text-2xl font-bold mb-2 text-blue-300">QRIS Pembayaran</h3>
      <p class="text-gray-400 mb-4">Scan QR code berikut untuk membayar:</p>
      
      <div class="mb-4 p-4 bg-gray-800 rounded-lg inline-block">
        <h4 class="font-semibold text-white">${productName}</h4>
        <p class="text-2xl font-bold text-green-400 mt-2">Rp ${formattedAmount}</p>
      </div>
      
      <div class="bg-white p-4 rounded-xl inline-block mb-4">
        <img src="${qrCodeUrl}" 
             alt="QRIS Payment" 
             class="w-64 h-64 mx-auto rounded-lg"
             id="dynamicQRCode">
      </div>
      
      <div class="bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded-lg p-4 mb-4">
        <p class="text-yellow-300 text-sm">
          ⚠️ <strong>Perhatian:</strong> QR Code ini akan otomatis menyesuaikan dengan harga produk.
          Pastikan nominal pembayaran sesuai sebelum melakukan scan.
        </p>
      </div>
      
      <div class="grid grid-cols-2 gap-3 mb-6">
        <div class="bg-gray-800 p-3 rounded-lg">
          <div class="text-sm text-gray-400">Nominal</div>
          <div class="font-bold text-white">Rp ${formattedAmount}</div>
        </div>
        <div class="bg-gray-800 p-3 rounded-lg">
          <div class="text-sm text-gray-400">Kode Transaksi</div>
          <div class="font-bold text-blue-300">JMB-${Date.now().toString().slice(-6)}</div>
        </div>
      </div>
      
      <div class="space-y-3">
        <button onclick="downloadQRCode('${qrCodeUrl}', '${productName}')" 
                class="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold flex items-center justify-center gap-2">
          <span>⬇️</span> Download QR Code
        </button>
        
        <button onclick="copyPaymentData(${amount}, '${productName.replace(/'/g, "\\'")}')" 
                class="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold flex items-center justify-center gap-2">
          <span>📋</span> Salin Data Pembayaran
        </button>
        
        <button onclick="showPaymentOptions('${productName.replace(/'/g, "\\'")}', ${amount}, '${productId}')" 
                class="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg">
          ← Kembali ke Pilihan Bayar
        </button>
      </div>
    </div>
  `;
  
  content.innerHTML = paymentHTML;
  
  // Simpan transaksi ke localStorage untuk tracking
  saveTransaction(amount, productName, productId, 'qris');
};

// Fungsi untuk download QR Code
const downloadQRCode = (qrUrl, productName) => {
  const link = document.createElement('a');
  link.href = qrUrl;
  link.download = `QRIS-JMB-${productName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  alert('QR Code berhasil didownload!');
};

// Fungsi untuk copy data pembayaran
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
    alert('Data pembayaran berhasil disalin! Tempel di WhatsApp untuk konfirmasi.');
  }).catch(err => {
    console.error('Failed to copy:', err);
    alert('Gagal menyalin, silahkan copy manual.');
  });
};

// Fungsi untuk manual payment
const showManualPayment = (productName, price) => {
  const modal = document.getElementById('productModal');
  const content = document.getElementById('productModalContent');
  
  const formattedPrice = price.toLocaleString('id-ID');
  
  const manualPaymentHTML = `
    <h3 class="text-2xl font-bold mb-6 text-blue-300">Transfer Manual</h3>
    
    <div class="mb-6 p-4 bg-gray-800 rounded-lg">
      <h4 class="font-semibold text-white">${productName}</h4>
      <p class="text-2xl font-bold text-green-400 mt-2">Rp ${formattedPrice}</p>
    </div>
    
    <div class="space-y-4 mb-6">
      <div class="bg-gradient-to-r from-blue-900 to-blue-800 p-4 rounded-lg">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="text-xl">💙</span>
            <span class="font-bold">DANA</span>
          </div>
          <button onclick="copyToClipboard('085185025316')" class="text-sm bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded">
            Salin
          </button>
        </div>
        <p class="text-sm text-gray-300">085185025316</p>
        <p class="text-xs text-gray-400 mt-1">a.n. SYAIF OFFICIAL</p>
      </div>
      
      <div class="bg-gradient-to-r from-green-900 to-emerald-800 p-4 rounded-lg">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="text-xl">💚</span>
            <span class="font-bold">GoPay</span>
          </div>
          <button onclick="copyToClipboard('085185025316')" class="text-sm bg-green-600 hover:bg-green-700 px-3 py-1 rounded">
            Salin
          </button>
        </div>
        <p class="text-sm text-gray-300">085185025316</p>
        <p class="text-xs text-gray-400 mt-1">a.n. JMB STORE</p>
      </div>
      
      <div class="bg-gradient-to-r from-red-900 to-orange-800 p-4 rounded-lg">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="text-xl">🏦</span>
            <span class="font-bold">Bank Mandiri</span>
          </div>
          <button onclick="copyToClipboard('1100019933016')" class="text-sm bg-red-600 hover:bg-red-700 px-3 py-1 rounded">
            Salin
          </button>
        </div>
        <p class="text-sm text-gray-300">1100019933016</p>
        <p class="text-xs text-gray-400 mt-1">a.n. SYAIF</p>
      </div>
    </div>
    
    <div class="bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded-lg p-4 mb-6">
      <p class="text-yellow-300 text-sm">
        ⚠️ Transfer tepat sesuai nominal: <strong>Rp ${formattedPrice}</strong><br>
        Setelah transfer, kirim bukti ke WhatsApp kami.
      </p>
    </div>
    
    <div class="flex gap-3">
      <button onclick="showPaymentOptions('${productName.replace(/'/g, "\\'")}', ${price}, 'temp')" 
              class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
        ← Kembali
      </button>
      <button onclick="confirmManualPayment('${productName.replace(/'/g, "\\'")}', ${price})" 
              class="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">
        ✅ Saya Sudah Transfer
      </button>
    </div>
  `;
  
  content.innerHTML = manualPaymentHTML;
};

// Helper functions
const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    alert('Nomor berhasil disalin!');
  });
};

const confirmManualPayment = (productName, price) => {
  const formattedPrice = price.toLocaleString('id-ID');
  const message = `✅ Konfirmasi Pembayaran\n\nSaya sudah transfer untuk produk:\n${productName}\n\nNominal: Rp ${formattedPrice}\n\nMohon dicek dan diproses.`;
  const whatsappUrl = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
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
  
  console.log('Transaction saved:', transaction);
};

// Order Product Function - Updated
const orderProduct = (productName, price, method = 'whatsapp') => {
  const formattedPrice = price.toLocaleString('id-ID');
  let message = '';
  
  if (method === 'whatsapp') {
    message = `Halo JMB Store! 🛍️\n\nSaya ingin memesan produk:\n\n📦 *${productName}*\n💰 Harga: Rp ${formattedPrice}\n\nBisa dijelaskan lebih detail tentang produk ini?\n\nTerima kasih! 🙏`;
  }
  
  const whatsappUrl = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
};

// Close Product Modal
const closeProductModal = () => {
  document.getElementById('productModal').classList.add('hidden');
};

// Admin Panel Functions
const showAdminLogin = () => {
  document.getElementById('adminLoginModal').classList.remove('hidden');
};

const closeAdminLogin = () => {
  document.getElementById('adminLoginModal').classList.add('hidden');
  document.getElementById('adminPassword').value = '';
};

const adminLogin = () => {
  const password = document.getElementById('adminPassword').value;
  
  if (password === ADMIN_PASSWORD) {
    closeAdminLogin();
    localStorage.setItem('jmb_admin_auth', 'true');
    window.location.href = 'admin.html';
  } else {
    alert('Password salah!');
  }
};

// Fallback Products if Supabase fails
const showFallbackProducts = () => {
  const fallbackData = [
    { 
      id: 1, 
      name: 'HOSTING BOT LIST', 
      description: 'Hosting untuk bot Telegram',
      products: [
        { name: '1 GB CPU 30%', price: 1000, description: 'Hosting dengan resource 1GB' },
        { name: '2 GB CPU 60%', price: 2000, description: 'Hosting dengan resource 2GB' }
      ]
    },
    { 
      id: 2, 
      name: 'LIST NOKOS', 
      description: 'Nomor kosong berbagai negara',
      products: [
        { name: 'Nokos Indonesia', price: 5000, description: 'Nomor Indonesia fresh' },
        { name: 'Nokos Philippines', price: 7000, description: 'Nomor Philippines' }
      ]
    }
  ];

  const grid = document.getElementById('productsGrid');
  grid.innerHTML = '';
  
  fallbackData.forEach(category => {
    const card = document.createElement('div');
    card.className = 'bg-gray-900 rounded-xl p-4 border border-blue-500 border-opacity-20 hover:border-opacity-40 transition-all hover:scale-105 cursor-pointer';
    card.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-bold text-lg text-blue-300">${category.name}</h4>
        <span class="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded-full">
          ${category.products.length} produk
        </span>
      </div>
      ${category.description ? `<p class="text-sm text-gray-400 mb-2">${category.description}</p>` : ''}
      <div class="text-sm text-blue-300">
        Klik untuk melihat produk
      </div>
    `;
    card.onclick = () => showCategoryProducts(category, category.products);
    grid.appendChild(card);
  });
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize AOS
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 1000,
      once: true,
      offset: 100
    });
  }

  // Hide loading screen
  setTimeout(() => {
    const loading = document.getElementById('loading');
    const main = document.getElementById('main');
    
    if (loading) loading.style.display = 'none';
    if (main) main.classList.remove('hidden');
    
    // Initialize components
    initAudio();
    loadProducts();
    lazyLoadImages();
    
    // Admin login button
    const adminBtn = document.getElementById('adminLoginBtn');
    if (adminBtn) {
      adminBtn.addEventListener('click', showAdminLogin);
    }
  }, 2000);
});