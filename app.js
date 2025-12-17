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
      } else if (currentAudio.paused) {
        currentAudio.play();
        playBtn.textContent = 'Pause';
      } else {
        currentAudio.pause();
        playBtn.textContent = 'Play';
      }
    });

    stopBtn.addEventListener('click', () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        playBtn.textContent = 'Play';
      }
    });
  }
};

// Load Products from Supabase
const loadProducts = async () => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select(`
        id,
        name,
        products (
          id,
          name,
          price,
          description,
          image_url
        )
      `)
      .order('order_index');

    if (error) throw error;

    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '';

    categories.forEach(category => {
      const categoryCard = document.createElement('div');
      categoryCard.className = 'bg-gray-900 rounded-xl p-4 border border-blue-500 border-opacity-20 hover:border-opacity-40 transition-all hover:scale-105 cursor-pointer';
      categoryCard.setAttribute('data-aos', 'flip-up');
      categoryCard.setAttribute('data-category-id', category.id);
      
      categoryCard.innerHTML = `
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-bold text-lg text-blue-300">${category.name}</h4>
          <span class="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded-full">
            ${category.products.length} produk
          </span>
        </div>
        <div class="text-sm text-gray-400">
          Klik untuk melihat detail produk
        </div>
      `;

      categoryCard.addEventListener('click', () => showCategoryProducts(category));
      grid.appendChild(categoryCard);
    });

  } catch (error) {
    console.error('Error loading products:', error);
    showFallbackProducts();
  }
};

// Show Category Products Modal
const showCategoryProducts = (category) => {
  const modal = document.getElementById('productModal');
  const content = document.getElementById('productModalContent');
  
  let productsHTML = `
    <h3 class="text-2xl font-bold mb-6 text-blue-300">${category.name}</h3>
    <div class="space-y-4 max-h-96 overflow-y-auto pr-2">
  `;

  category.products.forEach(product => {
    productsHTML += `
      <div class="bg-gray-800 p-4 rounded-lg border border-blue-500 border-opacity-20">
        <div class="flex justify-between items-start mb-2">
          <h4 class="font-semibold">${product.name}</h4>
          <span class="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
            Rp ${parseInt(product.price).toLocaleString()}
          </span>
        </div>
        ${product.description ? `<p class="text-gray-400 text-sm mb-3">${product.description}</p>` : ''}
        ${product.image_url ? `
          <img src="${product.image_url}" alt="${product.name}" 
               class="w-full h-40 object-cover rounded-lg mb-3 opacity-0 transition-opacity duration-300"
               data-src="${product.image_url}"
               onload="this.classList.remove('opacity-0')">
        ` : ''}
        <button onclick="orderProduct('${product.name}', ${product.price})" 
                class="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">
          Pesan Sekarang
        </button>
      </div>
    `;
  });

  productsHTML += '</div>';
  content.innerHTML = productsHTML;
  modal.classList.remove('hidden');
  
  // Lazy load images in modal
  lazyLoadImages();
};

// Order Product Function
const orderProduct = (productName, price) => {
  const message = `Halo, saya ingin memesan produk:\n${productName}\nHarga: Rp ${parseInt(price).toLocaleString()}`;
  const whatsappUrl = `https://wa.me/6285161570297?text=${encodeURIComponent(message)}`;
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
    window.location.href = 'admin.html';
  } else {
    alert('Password salah!');
  }
};

// Fallback Products if Supabase fails
const showFallbackProducts = () => {
  const fallbackData = [
    { id: 1, name: 'HOSTING BOT LIST', products: [
      { name: '1 GB CPU 30%', price: 1000 },
      { name: '2 GB CPU 60%', price: 2000 }
    ]},
    { id: 2, name: 'LIST NOKOS', products: [
      { name: 'Nokos Indonesia', price: 5000 },
      { name: 'Nokos Philippines', price: 7000 }
    ]}
  ];

  const grid = document.getElementById('productsGrid');
  fallbackData.forEach(category => {
    const card = document.createElement('div');
    card.className = 'bg-gray-900 rounded-xl p-4 border border-blue-500 border-opacity-20';
    card.innerHTML = `
      <h4 class="font-bold text-lg text-blue-300 mb-2">${category.name}</h4>
      <p class="text-sm text-gray-400">Klik untuk melihat produk</p>
    `;
    card.onclick = () => showCategoryProducts(category);
    grid.appendChild(card);
  });
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize AOS
  AOS.init({
    duration: 1000,
    once: true,
    offset: 100
  });

  // Hide loading screen
  setTimeout(() => {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('main').classList.remove('hidden');
    
    // Initialize components
    initAudio();
    loadProducts();
    lazyLoadImages();
    
    // Admin login button
    document.getElementById('adminLoginBtn').addEventListener('click', showAdminLogin);
  }, 2000);
});