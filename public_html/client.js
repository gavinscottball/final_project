/**  once the database is set up then we can finish this and the social page so that we can associate users with comments and scores
You may need to move some of the elements outside of fucntions so move whatever you need to and I can make it look nice later
*/
document.addEventListener("DOMContentLoaded", () => {
    // Initialize all event listeners and functionality
    initAccountHandlers();
    initCommentSection();
});

/** Account Handling Functions */
function initAccountHandlers() {
    const loginButton = document.getElementById("loginButton");
    const createButton = document.getElementById("createButton");
    const closeButton = document.getElementById("closeButton");
    const popupOverlay = document.getElementById("popupOverlay");
    const loginForm = document.querySelector(".login-form");
    const createAccountForm = document.getElementById("createAccountForm");

    /**
     * Basically reads as "if a login button exists"
     * 
     * makes sure that this can only run if there is a login button on the page
     * allows you to work with multiple pages in the same js file
     */
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
}

// all the user login input is here
function handleLogin() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const output = document.getElementById("output");

    if (username && password) {
        login(username, password);
    } else {
        output.textContent = "Please enter both username and password.";
    }

    console.log("Login Attempt:");
    console.log("Username:", username);
    console.log("Password:", password);
}

// all the user input in account creation is here
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
    .then(response => {
        if (response.ok) {
            // If the response is successful, proceed with processing
            return response.json().then(data => {
                console.log('Account created');

                // Call saveDetails after confirming account registration
                saveDetails(
                    formData.get('new-username'),
                    formData.get('email'),
                    formData.get('real-name'),
                    null, // Replace with the actual picture logic
                    formData.get('profile-bio')
                );

                alert(data.message || 'Account creation successful!');
                const popupOverlay = document.getElementById("popupOverlay");
                const loginForm = document.querySelector(".login-form");
                popupOverlay.classList.add("hidden");
                loginForm.classList.remove("hidden");
            });
        } else {
            // Handle non-200 responses (e.g., 400 errors)
            return response.json().then(data => {
                throw new Error(data.message || 'Error creating account');
            });
        }
    })
    .catch(err => {
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
            picture: picture || null, // Use null if no picture
            bio: bio || ''
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Account details saved:', data);
    })
    .catch(err => console.error('Error saving account details:', err));
}


function login(username, password) {
    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    })
    .then((response) => {
        // Parse the response as JSON
        return response.json().then((data) => ({ data, response }));
    })
    .then(({ data, response }) => {
        const output = document.getElementById("output");
        if (response.ok) {
            output.textContent = data.message;
            // Redirect to game.html
            window.location.href = '/game.html';
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










/** Comment Section Functions - Will need to store comments into the database and associate with user accounts
 * we should come back to this tomorrow when users and the database is together
 */
function initCommentSection() {
    const commentInput = document.getElementById("commentInput");
    const addCommentBtn = document.getElementById("addCommentBtn");
    const sortLikesBtn = document.getElementById("sortLikesBtn");
    const sortNewestBtn = document.getElementById("sortNewestBtn");
    const commentList = document.getElementById("commentList");


    let comments = [];
    /** this should have all the comments in it arranged as an array similar to this
    {
        "text": "hello world",
        "likes": 0,
        "timestamp": 1733962874535
    }
    */
    

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

    // DELETE THIS LATER: Check the log when adding a comment to see comments
    console.log(comments)
    
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