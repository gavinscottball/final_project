/**
 * @file server.js
 * @description This file contains the logic for user logins and new account creation
 * 
 * @authors [Gavin Ball, Joshua Stambaugh]
 */

// Runs on page load
document.addEventListener("DOMContentLoaded", () => {
    checkSession(); // Verify user session and update UI
    initAccountHandlers(); // Initialize login, registration, and logout functionality
});

/**
 * Function checkSession - Checks the user's session
 * @param none
 * @returns none
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

// Check session on DOMContentLoaded
document.addEventListener('DOMContentLoaded', checkSession);

// Call checkSession when the page loads
document.addEventListener('DOMContentLoaded', checkSession);

/**
 * Function logoutUser - Logs the user out of the server
 * @param none
 * @returns none
 */

function logoutUser() {
    // Send a POST request to the server to log out the user
    fetch('/logout', {
        method: 'POST',
        credentials: 'include', // Include session cookies
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(response => {
            if (response.ok) {
                // Clear session data (if any stored on the client-side)
                localStorage.removeItem('userToken');
                sessionStorage.removeItem('loggedInUser');

                // Redirect the user to the login or welcome page
                window.location.href = 'index.html'; // Update this path as needed
            } else {
                console.error('Failed to log out');
            }
        })
        .catch(error => {
            console.error('Error during logout:', error);
        });
}

/**
 * Function initAccountHandlers - Initialization of event listeners
 * @param none
 * @returns none
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
        logoutButton.addEventListener("click", logout);
    }
}

/**
 * Function handleLogin - Logs a user into the server
 * @param none
 * @returns none
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
 * Function handleCreateAccount - Registers a new user
 * @param event, account creation event
 * @returns none
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
            picture: formData.get('profile-picture'), // Handle profile picture logic here
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
 * Function saveDetails - Saves a user's profile details
 * @param username, email, name, picture, bio are all a user's profile details
 * @returns none
 */

function saveDetails(username, email, name, picture, bio) {

    fetch('/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: username,
            email: email || '',
            name: name || '',
            picture: picture || null, // Use null if no picture provided
            bio: bio || ''
        })
    })
        .then((response) => response.json())
        .then((data) => {
            console.log('Account details saved:', data);
        })
        .catch((err) => console.error('Error saving account details:', err));
}

/**
 * Function login - Logs a user into the site
 * @param username and password, the user's login details
 * @returns none
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





document.addEventListener("DOMContentLoaded", () => {
    // Profile Picture Preview Logic
    const profilePictureSelect = document.getElementById("profilePicture");
    const profilePicturePreview = document.getElementById("profilePicturePreview");

    if (profilePictureSelect && profilePicturePreview) {
        profilePictureSelect.addEventListener("change", (event) => {
            const selectedAvatar = event.target.value; // Get the selected avatar's file path
            if (selectedAvatar) {
                profilePicturePreview.src = selectedAvatar; // Update the preview image
            }
        });
    } else {
        console.error("Profile picture select or preview element not found.");
    }

    // Password Validation Logic
    const form = document.getElementById("createAccountForm");
    const newPassword = document.getElementById("newPassword");
    const confirmPassword = document.getElementById("confirmPassword");

    if (form && newPassword && confirmPassword) {
        // Add a 'submit' event listener to validate passwords
        form.addEventListener("submit", (event) => {
            if (newPassword.value !== confirmPassword.value) {
                event.preventDefault(); // Prevent form submission
                alert("Passwords do not match. Please re-enter them.");
            }
        });

        // Optional: Add real-time feedback for password confirmation
        confirmPassword.addEventListener("input", () => {
            if (newPassword.value !== confirmPassword.value) {
                confirmPassword.setCustomValidity("Passwords do not match.");
            } else {
                confirmPassword.setCustomValidity(""); // Clear the error
            }
        });
    } else {
        console.error("Form or password fields not found.");
    }
});

