document.addEventListener('DOMContentLoaded', () => {
    // --- Cart State ---
    let cart = [];
    
    // Load cart from local storage if available
    const savedCart = localStorage.getItem('scienceSamplesCart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
        } catch (e) {
            cart = [];
        }
    }
    
    // UI Elements
    const cartCountEl = document.getElementById('cart-count');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalPriceEl = document.getElementById('cart-total-price');
    
    const cartSidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('overlay');
    const cartBtn = document.getElementById('cart-btn');
    const closeCartBtn = document.getElementById('close-cart');
    
    const toastContainer = document.getElementById('toast-container');
    const globalAudioPlayer = document.getElementById('global-audio-player');
    
    // --- Cart Actions ---
    
    function toggleCart() {
        cartSidebar.classList.toggle('open');
        overlay.classList.toggle('visible');
    }
    
    if(cartBtn) cartBtn.addEventListener('click', toggleCart);
    if(closeCartBtn) closeCartBtn.addEventListener('click', toggleCart);
    if(overlay) overlay.addEventListener('click', toggleCart);
    
    function updateCartUI() {
        // Save to local storage
        localStorage.setItem('scienceSamplesCart', JSON.stringify(cart));

        // Count
        if(cartCountEl) cartCountEl.textContent = cart.length;
        
        // Items
        if (cartItemsContainer) {
            cartItemsContainer.innerHTML = '';
            if (cart.length === 0) {
                cartItemsContainer.innerHTML = '<p class="empty-cart-msg">Your cart is empty.</p>';
            } else {
                cart.forEach(item => {
                    const itemEl = document.createElement('div');
                    itemEl.className = 'cart-item';
                    itemEl.innerHTML = `
                        <div class="item-info">
                            <h4>${item.name}</h4>
                            <span class="item-price">$${item.price.toFixed(2)}</span>
                        </div>
                        <button class="remove-btn" data-id="${item.id}">Remove</button>
                    `;
                    cartItemsContainer.appendChild(itemEl);
                });
            }
        }
        
        // Total
        const total = cart.reduce((sum, item) => sum + item.price, 0);
        if(cartTotalPriceEl) cartTotalPriceEl.textContent = `$${total.toFixed(2)}`;
        
        // Re-attach listeners to dynamic remove buttons
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idToRemove = e.target.getAttribute('data-id');
                removeFromCart(idToRemove);
            });
        });
    }

    // Initialize UI on load
    updateCartUI();
    
    function addToCart(item) {
        // Check if item already in cart
        if (cart.find(i => i.id === item.id)) {
            showToast(`${item.name} is already in the cart.`);
            return;
        }
        
        // If the item is a bundle, and there's individual stems, or vice versa, we'd normally handle logic here.
        // For simplicity, just add.
        cart.push(item);
        updateCartUI();
        showToast(`${item.name} added to cart!`);
    }
    
    function removeFromCart(id) {
        cart = cart.filter(item => item.id !== id);
        updateCartUI();
    }
    
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
    
    // Add event listeners to "Add to Cart" buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const name = e.target.getAttribute('data-name');
            const price = parseFloat(e.target.getAttribute('data-price'));
            
            addToCart({ id, name, price });
        });
    });
    
    // --- Synthetic Audio Player Logic ---
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioCtx;
    let currentlyPlayingBtn = null;
    let updateProgressInterval = null;
    let currentOscillators = [];
    let currentGainNode = null;
    let currentStartTime = 0;
    let currentDuration = 2.0;

    function stopCurrentSynthesis() {
        if (currentGainNode) {
            try { currentGainNode.gain.cancelScheduledValues(0); } catch(e){}
            try { currentGainNode.disconnect(); } catch(e){}
        }
        currentOscillators.forEach(osc => {
            try { osc.stop(); } catch(e){}
            try { osc.disconnect(); } catch(e){}
        });
        currentOscillators = [];
        if (updateProgressInterval) clearInterval(updateProgressInterval);
    }

    async function playSynthesis(type) {
        if (!audioCtx) audioCtx = new AudioContext();
        if (audioCtx.state === 'suspended') await audioCtx.resume();
        
        stopCurrentSynthesis();
        
        currentDuration = 2.0;
        currentStartTime = audioCtx.currentTime;
        const now = currentStartTime;
        
        currentGainNode = audioCtx.createGain();
        currentGainNode.connect(audioCtx.destination);

        if (type === 'pads') {
            currentGainNode.gain.setValueAtTime(0.01, now);
            currentGainNode.gain.linearRampToValueAtTime(0.6, now + 1.0);
            currentGainNode.gain.linearRampToValueAtTime(0.01, now + currentDuration);
        } else {
            currentGainNode.gain.setValueAtTime(0.6, now);
            currentGainNode.gain.exponentialRampToValueAtTime(0.01, now + currentDuration);
        }

        if (type === 'drums' || type === 'bundle-1') {
            const osc1 = audioCtx.createOscillator();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(150, now);
            osc1.frequency.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc1.connect(currentGainNode);
            osc1.start(now); 
            osc1.stop(now + currentDuration);
            currentOscillators.push(osc1);
            
            // Add a hi-hat noise burst for flavor
            const bufferSize = audioCtx.sampleRate * 0.1; // 100ms
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
            const noise = audioCtx.createBufferSource();
            noise.buffer = buffer;
            const noiseFilter = audioCtx.createBiquadFilter();
            noiseFilter.type = 'highpass';
            noiseFilter.frequency.value = 5000;
            noise.connect(noiseFilter).connect(currentGainNode);
            noise.start(now);
            currentOscillators.push(noise);

        } else if (type === 'bass') {
            const osc1 = audioCtx.createOscillator();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(55, now);
            osc1.connect(currentGainNode);
            osc1.start(now); 
            osc1.stop(now + currentDuration);
            currentOscillators.push(osc1);
        } else if (type === 'guitars') {
            const osc1 = audioCtx.createOscillator();
            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(220, now);
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1000, now);
            filter.frequency.linearRampToValueAtTime(200, now + currentDuration);
            osc1.connect(filter).connect(currentGainNode);
            osc1.start(now); 
            osc1.stop(now + currentDuration);
            currentOscillators.push(osc1);
        } else if (type === 'piano') {
            [440, 554, 659].forEach(freq => {
                const osc = audioCtx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now);
                osc.connect(currentGainNode);
                osc.start(now); 
                osc.stop(now + currentDuration);
                currentOscillators.push(osc);
            });
        } else if (type === 'pads') {
            [220, 277, 330, 440].forEach(freq => {
                const osc = audioCtx.createOscillator();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now);
                osc.connect(currentGainNode);
                osc.start(now); 
                osc.stop(now + currentDuration);
                currentOscillators.push(osc);
            });
        } else if (type === 'synths') {
            const osc1 = audioCtx.createOscillator();
            osc1.type = 'square';
            osc1.frequency.setValueAtTime(440, now);
            osc1.frequency.setValueAtTime(440, now + 0.2);
            osc1.frequency.linearRampToValueAtTime(880, now + 0.5);
            osc1.connect(currentGainNode);
            osc1.start(now); 
            osc1.stop(now + currentDuration);
            currentOscillators.push(osc1);
        }
    }

    document.querySelectorAll('.play-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const button = e.currentTarget;
            let src = button.getAttribute('data-src');
            // If the src is undefined, or missing, default to drums.
            let type = src ? src.split('/').pop().replace('.wav', '') : 'drums';
            
            const parent = button.closest('.audio-player');
            const progressEl = parent.querySelector('.progress');
            
            const playIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
            const pauseIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
            
            // Toggle pause/resume
            if (currentlyPlayingBtn === button && audioCtx) {
                if (audioCtx.state === 'running') {
                    await audioCtx.suspend();
                    button.innerHTML = playIcon;
                } else if (audioCtx.state === 'suspended') {
                    await audioCtx.resume();
                    button.innerHTML = pauseIcon;
                }
                return;
            }
            
            // Reset previous button
            if (currentlyPlayingBtn) {
                currentlyPlayingBtn.innerHTML = playIcon;
                const prevParent = currentlyPlayingBtn.closest('.audio-player');
                const prevProg = prevParent ? prevParent.querySelector('.progress') : null;
                if (prevProg) prevProg.style.width = '0%';
            }
            
            currentlyPlayingBtn = button;
            button.innerHTML = pauseIcon;
            
            await playSynthesis(type);
            
            if (progressEl) {                
                updateProgressInterval = setInterval(() => {
                    if (audioCtx.state === 'running') {
                        let elapsedTime = audioCtx.currentTime - currentStartTime;
                        let pct = (elapsedTime / currentDuration) * 100;
                        
                        if (pct >= 100) {
                            pct = 100;
                            button.innerHTML = playIcon;
                            progressEl.style.width = '0%';
                            clearInterval(updateProgressInterval);
                            stopCurrentSynthesis();
                        } else {
                            progressEl.style.width = `${pct}%`;
                        }
                    }
                }, 50);
            } else {
                setTimeout(() => {
                    button.innerHTML = playIcon;
                }, currentDuration * 1000);
            }
        });
    });
    
    document.querySelector('.checkout-btn').addEventListener('click', () => {
        if(cart.length === 0) {
            showToast("Your cart is empty.");
        } else {
            showToast("Proceeding to checkout mock...");
            setTimeout(() => {
                cart = [];
                updateCartUI();
                toggleCart();
                showToast("Order placed successfully!");
            }, 1000);
        }
    });
});
