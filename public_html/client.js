/**
 * @file client.js
 * @description This file contains the logic for user logins and new account creation.
 * 
 * @authors [Gavin Ball, Joshua Stambaugh]
 */

// ======================== Initial Setup ========================
document.addEventListener("DOMContentLoaded", () => {
    checkSession(); // Verify user session and update UI
    initAccountHandlers(); // Initialize login, registration, and logout functionality
});

// ======================== Session Management ========================
/**
 * Check the user's session and update the UI accordingly.
 */
function checkSession() {
    fetch('/session', {
        method: 'GET',
        credentials: 'include', // Ensure cookies are sent
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error('User is not logged in');
            }
            return response.json();
        })
        .then((user) => {
            // Update loggedUser element in the header
            const loggedUserElement = document.getElementById('loggedUser');
            if (loggedUserElement) {
                loggedUserElement.textContent = `${user.username}'s Account`;
                loggedUserElement.href = '/profile.html';
            }

            // Broadcast user data to other scripts
            document.dispatchEvent(new CustomEvent('userLoggedIn', { detail: user }));
        })
        .catch(() => {
            // Redirect to login page if not logged in
            if (window.location.pathname !== '/login.html') {
                window.location.href = '/login.html';
            }
        });
}

/**
 * Log the user out of the server and clear session data.
 */
function logoutUser() {
    fetch('/logout', {
        method: 'POST',
        credentials: 'include', // Include session cookies
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(response => {
            if (response.ok) {
                localStorage.removeItem('userToken');
                sessionStorage.removeItem('loggedInUser');
                window.location.href = 'index.html'; // Redirect to the homepage
            } else {
                console.error('Failed to log out');
            }
        })
        .catch(error => {
            console.error('Error during logout:', error);
        });
}

// ======================== Event Handlers ========================
/**
 * Initialize event listeners for account management buttons and forms.
 */
function initAccountHandlers() {
    const loginButton = document.getElementById("loginButton");
    const createButton = document.getElementById("createButton");
    const closeButton = document.getElementById("closeButton");
    const popupOverlay = document.getElementById("popupOverlay");
    const loginForm = document.querySelector(".login-form");
    const createAccountForm = document.getElementById("createAccountForm");

    if (loginButton) {
        loginButton.addEventListener("click", handleLogin);
    }

    if (createButton) {
        createButton.addEventListener("click", () => {
            popupOverlay.classList.remove("hidden");
            loginForm.classList.add("hidden");
        });
    }

    if (closeButton) {
        closeButton.addEventListener("click", () => {
            popupOverlay.classList.add("hidden");
            loginForm.classList.remove("hidden");
        });
    }

    if (createAccountForm) {
        createAccountForm.addEventListener("submit", handleCreateAccount);
    }

    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
        logoutButton.addEventListener("click", logoutUser);
    }
}

// ======================== Login and Registration ========================
/**
 * Handle login button click to log a user into the server.
 */
function handleLogin() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const output = document.getElementById("output");

    if (username && password) {
        login(username, password);
    } else {
        output.textContent = "Please enter both username and password.";
    }
}

/**
 * Handle account creation form submission.
 * @param {Event} event - The form submit event.
 */
function handleCreateAccount(event) {
    event.preventDefault();
    const formData = new FormData(event.target);

    fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: formData.get('new-username'),
            password: formData.get('new-password'),
            email: formData.get('email'),
            real_name: formData.get('real-name'),
            picture: formData.get('profile-picture'),
            bio: formData.get('profile-bio')
        })
    })
        .then((response) => {
            if (response.ok) {
                return response.json();
            } else {
                return response.json().then((data) => {
                    throw new Error(data.message || 'Error creating account');
                });
            }
        })
        .then((data) => {
            alert(data.message || 'Account creation successful!');
            const popupOverlay = document.getElementById("popupOverlay");
            const loginForm = document.querySelector(".login-form");
            popupOverlay.classList.add("hidden");
            loginForm.classList.remove("hidden");
        })
        .catch((err) => {
            console.error('Account creation error:', err);
            alert(err.message || 'Error creating account, please try again.');
        });
}

/**
 * Log a user into the site.
 * @param {string} username - The user's username.
 * @param {string} password - The user's password.
 */
function login(username, password) {
    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    })
        .then((response) => {
            return response.json().then((data) => ({ data, response }));
        })
        .then(({ data, response }) => {
            const output = document.getElementById("output");
            if (response.ok) {
                output.textContent = data.message;
                window.location.href = '/about.html'; // Redirect to a logged-in page
            } else {
                output.textContent = data.message || 'Login failed';
            }
        })
        .catch((err) => {
            console.error('Login error:', err);
            const output = document.getElementById("output");
            output.textContent = 'Error logging in, please try again.';
        });
}

// ======================== Profile Management ========================
/**
 * Save a user's profile details to the server.
 * @param {string} username - The username.
 * @param {string} email - The user's email.
 * @param {string} name - The user's real name.
 * @param {string} picture - The user's profile picture.
 * @param {string} bio - The user's bio.
 */
function saveDetails(username, email, name, picture, bio) {
    fetch('/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: username,
            email: email || '',
            name: name || '',
            picture: picture || null,
            bio: bio || ''
        })
    })
        .then((response) => response.json())
        .catch((err) => console.error('Error saving account details:', err));
}

// ======================== Miscellaneous ========================
// Profile picture preview logic.
document.addEventListener("DOMContentLoaded", () => {
    const profilePictureSelect = document.getElementById("profilePicture");
    const profilePicturePreview = document.getElementById("profilePicturePreview");

    if (profilePictureSelect && profilePicturePreview) {
        profilePictureSelect.addEventListener("change", (event) => {
            const selectedAvatar = event.target.value;
            if (selectedAvatar) {
                profilePicturePreview.src = selectedAvatar;
            }
        });
    }

    // Password validation logic
    const form = document.getElementById("createAccountForm");
    const newPassword = document.getElementById("newPassword");
    const confirmPassword = document.getElementById("confirmPassword");

    if (form && newPassword && confirmPassword) {
        form.addEventListener("submit", (event) => {
            if (newPassword.value !== confirmPassword.value) {
                event.preventDefault();
                alert("Passwords do not match. Please re-enter them.");
            }
        });

        confirmPassword.addEventListener("input", () => {
            if (newPassword.value !== confirmPassword.value) {
                confirmPassword.setCustomValidity("Passwords do not match.");
            } else {
                confirmPassword.setCustomValidity("");
            }
        });
    }
});