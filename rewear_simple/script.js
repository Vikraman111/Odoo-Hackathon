// Three.js Hero Animation
let scene, camera, renderer, particles;

function initHeroAnimation() {
    const canvas = document.getElementById('hero-canvas');
    const container = canvas.parentElement;
    
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, container.offsetWidth / container.offsetHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    
    // Create floating particles
    const geometry = new THREE.BufferGeometry();
    const particleCount = 100;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 20;
        positions[i + 1] = (Math.random() - 0.5) * 20;
        positions[i + 2] = (Math.random() - 0.5) * 20;
        
        colors[i] = Math.random() * 0.5 + 0.5;
        colors[i + 1] = Math.random() * 0.8 + 0.2;
        colors[i + 2] = Math.random() * 0.3 + 0.7;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
        size: 0.1,
        vertexColors: true,
        transparent: true,
        opacity: 0.6
    });
    
    particles = new THREE.Points(geometry, material);
    scene.add(particles);
    
    camera.position.z = 5;
    
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    
    if (particles) {
        particles.rotation.x += 0.001;
        particles.rotation.y += 0.002;
    }
    
    renderer.render(scene, camera);
}

// Modal Functions
function showLogin() {
    closeModal();
    document.getElementById('login-modal').classList.remove('hidden');
}

function showRegister() {
    closeModal();
    document.getElementById('register-modal').classList.remove('hidden');
}


function showBrowse() {
    if (currentUser) {
        window.location.href = 'browse.html';
    } else {
        showRegister();
    }
}

// Featured Items Data
const featuredItems = [
    {
        id: 1,
        title: "Vintage Denim Jacket",
        category: "Outerwear",
        size: "M",
        condition: "Excellent",
        points: 150,
        image: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=300&h=300&fit=crop"
    },
    {
        id: 2,
        title: "Floral Summer Dress",
        category: "Dresses",
        size: "S",
        condition: "Good",
        points: 120,
        image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300&h=300&fit=crop"
    },
    {
        id: 3,
        title: "Designer Sneakers",
        category: "Shoes",
        size: "9",
        condition: "Like New",
        points: 200,
        image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&h=300&fit=crop"
    },
    {
        id: 4,
        title: "Wool Winter Coat",
        category: "Outerwear",
        size: "L",
        condition: "Excellent",
        points: 180,
        image: "https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=300&h=300&fit=crop"
    }
];

// Populate Featured Items
function populateFeaturedItems() {
    const container = document.getElementById('featured-items');
    
    featuredItems.forEach(item => {
        const itemCard = document.createElement('div');
        itemCard.className = 'bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer';
        itemCard.innerHTML = `
            <img src="${item.image}" alt="${item.title}" class="w-full h-48 object-cover">
            <div class="p-4">
                <h3 class="font-semibold text-lg mb-2">${item.title}</h3>
                <div class="flex justify-between items-center text-sm text-gray-600 mb-2">
                    <span>${item.category}</span>
                    <span>Size ${item.size}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">${item.condition}</span>
                    <span class="font-bold text-green-600">${item.points} pts</span>
                </div>
            </div>
        `;
        
        itemCard.addEventListener('click', () => {
            showItemDetails(item);
        });
        
        container.appendChild(itemCard);
    });
}

function showItemDetails(item) {
    alert(`Item: ${item.title}\nCategory: ${item.category}\nSize: ${item.size}\nCondition: ${item.condition}\nPoints: ${item.points}\n\nFull item details page will be implemented in the complete version!`);
}

// Form Handlers
document.addEventListener('DOMContentLoaded', function() {
    // Initialize hero animation
    initHeroAnimation();
    
    // Populate featured items
    populateFeaturedItems();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (renderer && camera) {
            const container = document.getElementById('hero-canvas').parentElement;
            camera.aspect = container.offsetWidth / container.offsetHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.offsetWidth, container.offsetHeight);
        }
    });
    
    // Login form handler
    document.getElementById('login-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        try {
            await signInWithEmail(email, password);
            // Success handled by auth state observer
        } catch (error) {
            // Error handled by signInWithEmail function
        }
    });
    
    // Register form handler
    document.getElementById('register-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const location = document.getElementById('register-location').value;
        
        try {
            await createAccountWithEmail(email, password, name, location);
            // Success handled by auth state observer
        } catch (error) {
            // Error handled by createAccountWithEmail function
        }
    });
    
    // Close modal when clicking outside
    document.getElementById('login-modal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
    
    document.getElementById('register-modal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
});

// Redirect to dashboard if user is logged in
function showDashboard() {
    if (currentUser) {
        window.location.href = 'dashboard.html';
    } else {
        showLogin();
    }
}

// Clear form data when modal is closed
function closeModal() {
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('register-modal').classList.add('hidden');
    
    // Clear form data
    if (document.getElementById('login-form')) {
        document.getElementById('login-form').reset();
    }
    if (document.getElementById('register-form')) {
        document.getElementById('register-form').reset();
    }
    
    // Hide error messages
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    if (loginError) loginError.classList.add('hidden');
    if (registerError) registerError.classList.add('hidden');
    
    // Reset loading states
    hideLoadingState('login');
    hideLoadingState('register');
}

// Update hero section buttons based on auth state
function updateHeroButtons() {
    const startSwappingBtn = document.querySelector('button[onclick="showRegister()"]');
    const browseBtn = document.querySelector('button[onclick="showBrowse()"]');
    
    if (currentUser) {
        startSwappingBtn.textContent = 'Go to Dashboard';
        startSwappingBtn.setAttribute('onclick', 'showDashboard()');
    }
}

// Call updateHeroButtons when auth state changes
auth.onAuthStateChanged((user) => {
    updateHeroButtons();
});
