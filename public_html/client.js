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

// all the user inpuit in account creation is here
function handleCreateAccount(event) {
    event.preventDefault();
    const createAccountForm = event.target;
    const formData = new FormData(createAccountForm);
    const username = formData.get("new-username");
    const email = formData.get("email");
    const realName = formData.get("real-name");
    const profilePicture = formData.get("profile-picture");
    const profileBio = formData.get("profile-bio");
    const password = formData.get("new-password");
    const confirmPassword = formData.get("confirm-password");

    console.log("Create Account Form:");
    console.log("Username:", username);
    console.log("Email:", email);
    console.log("Real Name:", realName);
    console.log("Profile Bio:", profileBio);
    console.log("Password:", password);
    console.log("Confirm Password:", confirmPassword);
    console.log(
        "Picture Uploaded:",
        profilePicture && profilePicture.name ? profilePicture.name : "No File Uploaded"
    );
}

function login(username, password) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", `/login/${encodeURIComponent(username)}/${encodeURIComponent(password)}`, true);
    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
            const output = document.getElementById("output");
            if (xhr.status === 200) {
                output.textContent = xhr.responseText;
            } else {
                output.textContent = `Error: ${xhr.statusText}`;
            }
        }
    };
    xhr.send();
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