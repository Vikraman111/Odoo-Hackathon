// Simulated Firebase Auth for Hackathon Demo
// This provides the same interface as Firebase but works locally

// Mock Firebase Auth object
const auth = {
    currentUser: null,
    _observers: [],
    
    onAuthStateChanged(callback) {
        this._observers.push(callback);
        // Call immediately with current state
        setTimeout(() => callback(this.currentUser), 0);
        
        // Return unsubscribe function
        return () => {
            const index = this._observers.indexOf(callback);
            if (index > -1) this._observers.splice(index, 1);
        };
    },
    
    async signInWithEmailAndPassword(email, password) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if user exists in localStorage
        const users = JSON.parse(localStorage.getItem('rewear_users') || '{}');
        const user = users[email];
        
        if (!user) {
            throw { code: 'auth/user-not-found' };
        }
        
        if (user.password !== password) {
            throw { code: 'auth/wrong-password' };
        }
        
        // Create user object
        this.currentUser = {
            uid: user.uid,
            email: email,
            displayName: user.displayName,
            photoURL: user.photoURL || null
        };
        
        // Immediately save auth state to localStorage
        localStorage.setItem('rewear_auth_state', JSON.stringify({
            user: this.currentUser,
            timestamp: Date.now()
        }));
        
        // Notify observers
        this._observers.forEach(callback => callback(this.currentUser));
        
        return { user: this.currentUser };
    },
    
    async createUserWithEmailAndPassword(email, password) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Check if user already exists
        const users = JSON.parse(localStorage.getItem('rewear_users') || '{}');
        
        if (users[email]) {
            throw { code: 'auth/email-already-in-use' };
        }
        
        // Validate password
        if (password.length < 6) {
            throw { code: 'auth/weak-password' };
        }
        
        // Create new user
        const uid = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const newUser = {
            uid: uid,
            email: email,
            password: password, // In real app, this would be hashed
            displayName: '',
            photoURL: null,
            createdAt: new Date().toISOString()
        };
        
        users[email] = newUser;
        localStorage.setItem('rewear_users', JSON.stringify(users));
        
        // Set current user
        this.currentUser = {
            uid: uid,
            email: email,
            displayName: '',
            photoURL: null,
            updateProfile: async (profile) => {
                if (profile.displayName !== undefined) {
                    this.displayName = profile.displayName;
                    newUser.displayName = profile.displayName;
                    users[email] = newUser;
                    localStorage.setItem('rewear_users', JSON.stringify(users));
                }
            }
        };
        
        // Notify observers
        this._observers.forEach(callback => callback(this.currentUser));
        
        return { user: this.currentUser };
    },
    
    async signOut() {
        this.currentUser = null;
        // Clear auth state from localStorage
        localStorage.removeItem('rewear_auth_state');
        this._observers.forEach(callback => callback(null));
    }
};

// Mock Firestore
const db = {
    collection(name) {
        return {
            doc(id) {
                return {
                    async get() {
                        const data = JSON.parse(localStorage.getItem(`firestore_${name}_${id}`) || 'null');
                        return {
                            exists: data !== null,
                            data: () => data
                        };
                    },
                    async set(data) {
                        localStorage.setItem(`firestore_${name}_${id}`, JSON.stringify(data));
                    },
                    async update(data) {
                        const existing = JSON.parse(localStorage.getItem(`firestore_${name}_${id}`) || '{}');
                        const updated = { ...existing, ...data };
                        localStorage.setItem(`firestore_${name}_${id}`, JSON.stringify(updated));
                    }
                };
            }
        };
    }
};

// Mock Firebase namespace for compatibility
window.firebase = {
    firestore: {
        FieldValue: {
            serverTimestamp: () => new Date().toISOString()
        }
    }
};

// Global variables for current user
let currentUser = null;

// Cross-tab authentication sync
window.addEventListener('storage', function(e) {
    if (e.key === 'rewear_auth_state') {
        const authState = JSON.parse(e.newValue || 'null');
        if (authState && authState.user) {
            // User logged in from another tab
            auth.currentUser = authState.user;
            currentUser = authState.user;
            updateNavigation();
            console.log('User signed in from another tab:', authState.user.email);
        } else {
            // User logged out from another tab - only redirect if it's an actual logout, not a page transition
            const currentAuthState = JSON.parse(localStorage.getItem('rewear_auth_state') || 'null');
            if (!currentAuthState || !currentAuthState.user) {
                auth.currentUser = null;
                currentUser = null;
                updateNavigation();
                console.log('User signed out from another tab');
                
                // Redirect to home if on protected page
                if (window.location.pathname.includes('dashboard.html') || window.location.pathname.includes('browse.html')) {
                    window.location.href = 'index.html';
                }
            }
        }
    }
});

// Auth state observer
auth.onAuthStateChanged((user) => {
    currentUser = user;
    
    // Only sync auth state if user exists or if it's an intentional logout
    if (user) {
        localStorage.setItem('rewear_auth_state', JSON.stringify({
            user: user,
            timestamp: Date.now()
        }));
    } else {
        // Only clear localStorage if this is an intentional logout, not a page transition
        const existingAuthState = JSON.parse(localStorage.getItem('rewear_auth_state') || 'null');
        if (!existingAuthState || !existingAuthState.user) {
            localStorage.removeItem('rewear_auth_state');
        }
    }
    
    updateNavigation();
    
    if (user) {
        console.log('User signed in:', user.email);
        // User is signed in
        if (typeof closeModal === 'function') {
            closeModal();
        }
        
        // Save user data to Firestore if it's a new user
        saveUserToFirestore(user);
    } else {
        console.log('User signed out');
        // User is signed out
    }
});

// Initialize auth state from localStorage on page load
function initializeAuthState() {
    const authState = JSON.parse(localStorage.getItem('rewear_auth_state') || 'null');
    if (authState && authState.user && (Date.now() - authState.timestamp < 24 * 60 * 60 * 1000)) {
        // Auth state is less than 24 hours old, restore it
        auth.currentUser = authState.user;
        currentUser = authState.user;
        updateNavigation();
    }
}

// Call on page load
document.addEventListener('DOMContentLoaded', initializeAuthState);

// Update navigation based on auth state
function updateNavigation() {
    const navButtons = document.getElementById('nav-buttons');
    
    if (currentUser) {
        // User is logged in
        navButtons.innerHTML = `
            <a href="browse.html" class="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium">Browse</a>
            <a href="dashboard.html" class="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium">Dashboard</a>
            <div class="flex items-center space-x-2">
                <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span class="text-green-600 font-semibold text-sm">${currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : currentUser.email.charAt(0).toUpperCase()}</span>
                </div>
                <span class="text-sm font-medium text-gray-700">${currentUser.displayName || currentUser.email}</span>
                <button onclick="signOut()" class="text-gray-500 hover:text-gray-700 ml-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                    </svg>
                </button>
            </div>
        `;
    } else {
        // User is not logged in
        navButtons.innerHTML = `
            <button onclick="showLogin()" class="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium">Login</button>
            <button onclick="showRegister()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium">Sign Up</button>
        `;
    }
}

// Save user data to Firestore
async function saveUserToFirestore(user) {
    try {
        const userRef = db.collection('users').doc(user.uid);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            // New user, create profile
            await userRef.set({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || '',
                photoURL: user.photoURL || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                points: 100, // Starting points
                location: '',
                itemsListed: 0,
                successfulSwaps: 0
            });
            console.log('New user profile created');
        }
    } catch (error) {
        console.error('Error saving user to Firestore:', error);
    }
}

// Sign in with email and password
async function signInWithEmail(email, password) {
    try {
        showLoadingState('login');
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log('User signed in successfully');
        return userCredential.user;
    } catch (error) {
        console.error('Sign in error:', error);
        showError('login', getErrorMessage(error.code));
        throw error;
    } finally {
        hideLoadingState('login');
    }
}

// Create account with email and password
async function createAccountWithEmail(email, password, displayName, location) {
    try {
        showLoadingState('register');
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update user profile with display name
        if (displayName) {
            await user.updateProfile({
                displayName: displayName
            });
        }
        
        // Update user document in Firestore with additional info
        if (location) {
            const userRef = db.collection('users').doc(user.uid);
            await userRef.update({
                displayName: displayName || '',
                location: location
            });
        }
        
        console.log('Account created successfully');
        return user;
    } catch (error) {
        console.error('Account creation error:', error);
        showError('register', getErrorMessage(error.code));
        throw error;
    } finally {
        hideLoadingState('register');
    }
}

// Sign out
async function signOut() {
    try {
        await auth.signOut();
        console.log('User signed out successfully');
        // Redirect to home page
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Sign out error:', error);
    }
}

// Show loading state
function showLoadingState(formType) {
    const btn = document.getElementById(`${formType}-btn`);
    const btnText = document.getElementById(`${formType}-btn-text`);
    const spinner = document.getElementById(`${formType}-spinner`);
    
    btn.disabled = true;
    btn.classList.add('opacity-75', 'cursor-not-allowed');
    btnText.textContent = formType === 'login' ? 'Signing in...' : 'Creating account...';
    spinner.classList.remove('hidden');
}

// Hide loading state
function hideLoadingState(formType) {
    const btn = document.getElementById(`${formType}-btn`);
    const btnText = document.getElementById(`${formType}-btn-text`);
    const spinner = document.getElementById(`${formType}-spinner`);
    
    btn.disabled = false;
    btn.classList.remove('opacity-75', 'cursor-not-allowed');
    btnText.textContent = formType === 'login' ? 'Login' : 'Create Account';
    spinner.classList.add('hidden');
}

// Show error message
function showError(formType, message) {
    const errorDiv = document.getElementById(`${formType}-error`);
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    
    // Hide error after 5 seconds
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 5000);
}

// Get user-friendly error message
function getErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/user-not-found':
            return 'No account found with this email address.';
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
        case 'auth/email-already-in-use':
            return 'An account with this email already exists.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters long.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your connection.';
        default:
            return 'An error occurred. Please try again.';
    }
}

// Check if user is authenticated (for protected pages)
function requireAuth() {
    return new Promise((resolve, reject) => {
        // First check if we have a stored auth state
        const authState = JSON.parse(localStorage.getItem('rewear_auth_state') || 'null');
        
        if (authState && authState.user && (Date.now() - authState.timestamp < 24 * 60 * 60 * 1000)) {
            // We have a valid stored auth state, restore it immediately
            auth.currentUser = authState.user;
            currentUser = authState.user;
            console.log('Restored user from localStorage:', authState.user.email);
            
            // Update navigation immediately
            updateNavigation();
            
            resolve(authState.user);
            return;
        }
        
        // Check if auth is already initialized
        if (auth.currentUser) {
            console.log('User already authenticated:', auth.currentUser.email);
            resolve(auth.currentUser);
            return;
        }
        
        // No valid stored state, wait for auth state change with longer timeout
        let resolved = false;
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (resolved) return;
            resolved = true;
            unsubscribe();
            
            if (user) {
                console.log('User authenticated via auth state change:', user.email);
                resolve(user);
            } else {
                // Redirect to login
                console.log('User not authenticated, redirecting to home page');
                window.location.href = 'index.html';
                reject('User not authenticated');
            }
        });
        
        // Increased timeout from 1 second to 3 seconds for better reliability
        setTimeout(() => {
            if (resolved) return;
            resolved = true;
            unsubscribe();
            
            if (auth.currentUser) {
                console.log('User found via timeout fallback:', auth.currentUser.email);
                resolve(auth.currentUser);
            } else {
                console.log('Authentication timeout, redirecting to home page');
                window.location.href = 'index.html';
                reject('Authentication timeout');
            }
        }, 3000);
    });
}

// Get current user data from Firestore
async function getCurrentUserData() {
    if (!currentUser) return null;
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            return userDoc.data();
        }
        return null;
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
}

// Update user data in Firestore
async function updateUserData(data) {
    if (!currentUser) return;
    
    try {
        const userRef = db.collection('users').doc(currentUser.uid);
        await userRef.update(data);
        console.log('User data updated successfully');
    } catch (error) {
        console.error('Error updating user data:', error);
    }
}

// Save current user data (alias for updateUserData for compatibility)
async function saveCurrentUserData(data) {
    return await updateUserData(data);
}
