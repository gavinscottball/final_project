/** client.js - Handles user sessions, account management, and comments functionality */

// Runs on page load
document.addEventListener("DOMContentLoaded", () => {
    checkSession(); // Verify user session and update UI
    initAccountHandlers(); // Initialize login, registration, and logout functionality
    initCommentSection(); // Initialize comment handling for pages with comment sections
});

// Function to check user session
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
                loggedUserElement.textContent = user.username;
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

function logout() {
    fetch('/logout', {
        method: 'POST',
        credentials: 'include', // Send session cookies
    })
        .then((response) => {
            if (response.ok) {
                window.location.href = '/login.html'; // Redirect after logout
            } else {
                alert('Error logging out. Please try again.');
            }
        })
        .catch((error) => {
            console.error('Logout error:', error);
        });
}

/** Account Handling Functions */
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

function handleCreateAccount(event) {
    event.preventDefault();
    const formData = new FormData(event.target);

    fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: formData.get('new-username'),
            password: formData.get('new-password')
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
            saveDetails(
                formData.get('new-username'),
                formData.get('email'),
                formData.get('real-name'),
                null, // Handle profile picture logic here
                formData.get('profile-bio')
            );

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
                window.location.href = '/game.html'; // Redirect to a logged-in page
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

/** Comment Section Functions */
function initCommentSection() {
    const commentInput = document.getElementById("commentInput");
    const addCommentBtn = document.getElementById("addCommentBtn");
    const sortLikesBtn = document.getElementById("sortLikesBtn");
    const sortNewestBtn = document.getElementById("sortNewestBtn");
    const commentList = document.getElementById("commentList");

    let comments = [];

    if (addCommentBtn) {
        addCommentBtn.addEventListener("click", () => addComment(commentInput, comments, commentList));
    }

    if (sortLikesBtn) {
        sortLikesBtn.addEventListener("click", () => sortComments(comments, "likes", commentList));
    }

    if (sortNewestBtn) {
        sortNewestBtn.addEventListener("click", () => sortComments(comments, "newest", commentList));
    }
}

function addComment(inputElement, comments, commentList) {
    const text = inputElement.value.trim();
    if (!text) return;

    comments.push({ text, likes: 0, timestamp: Date.now() });
    inputElement.value = "";
    renderComments(comments, commentList);
}

function sortComments(comments, type, commentList) {
    if (type === "likes") {
        comments.sort((a, b) => b.likes - a.likes);
    } else if (type === "newest") {
        comments.sort((a, b) => b.timestamp - a.timestamp);
    }
    renderComments(comments, commentList);
}

function renderComments(comments, commentList) {
    if (!commentList) return;

    commentList.innerHTML = "";
    comments.forEach((comment, index) => {
        const commentEl = document.createElement("li");
        commentEl.className = "comment";

        const contentEl = document.createElement("p");
        contentEl.textContent = comment.text;

        const actionsEl = document.createElement("div");
        actionsEl.className = "comment-actions";

        const likeBtn = document.createElement("button");
        likeBtn.className = "like-button";
        likeBtn.textContent = `Like (${comment.likes})`;
        likeBtn.addEventListener("click", () => {
            comments[index].likes++;
            renderComments(comments, commentList);
        });

        actionsEl.appendChild(likeBtn);
        commentEl.appendChild(contentEl);
        commentEl.appendChild(actionsEl);

        commentList.appendChild(commentEl);
    });
}