// prints account creation shit to console

document.addEventListener("DOMContentLoaded", () => {
    const loginButton = document.getElementById("loginButton");
    const createButton = document.getElementById("createButton");
    const closeButton = document.getElementById("closeButton");
    const popupOverlay = document.getElementById("popupOverlay");
    const loginForm = document.querySelector(".login-form");
    const createAccountForm = document.getElementById("createAccountForm");

    loginButton.addEventListener("click", () => {
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
    });

    createButton.addEventListener("click", () => {
        popupOverlay.classList.remove("hidden");
        loginForm.classList.add("hidden");
    });

    closeButton.addEventListener("click", () => {
        popupOverlay.classList.add("hidden");
        loginForm.classList.remove("hidden");
    });

    createAccountForm.addEventListener("submit", (event) => {
        event.preventDefault();
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
        console.log("Picture Uploaded:", profilePicture && profilePicture.name ? profilePicture.name : "No File Uploaded");    });
});

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