/**
 * @file server.js
 * @description This file contains the main logic for the profile page
 * 
 * @authors [Gavin Ball, Joshua Stambaugh]
 */

document.addEventListener("DOMContentLoaded", () => {
    // Verify session and update the header
    checkSession();

    // Load profile details
    document.addEventListener('userLoggedIn', (event) => {
        const user = event.detail;
        loadProfile(user); // Load profile with user details
    });

    // Fallback to fetch profile data directly if userLoggedIn event is missed
    if (document.readyState === 'complete') {
        fetchProfileFromServer();
    }
});

/**
 * Function loadProfile - Loads the profile of a user
 * @param user, the logged in user
 * @returns none
 */

function loadProfile(user) {
    if (user) {
        document.getElementById('usernameDisplay').textContent = user.username || 'N/A';
        document.getElementById('emailDisplay').textContent = user.email || 'N/A';
        document.getElementById('realNameDisplay').textContent = user.realName || 'N/A';
        document.getElementById('bioDisplay').textContent = user.bio || 'N/A';

        const profilePicture = document.getElementById('profilePicture');
        if (user.profilePicture) {
            profilePicture.src = `${user.profilePicture}`;
            profilePicture.alt = `${user.username}'s profile picture`;
        } else {
            profilePicture.alt = 'No profile picture available';
        }
    }
}


/**
 * Function fetchProfileFromServer - Fetches the user's profile
 * @param none
 * @returns none
 */
function fetchProfileFromServer() {
    fetch('/get-profile', {
        method: 'POST',
        credentials: 'include', // Ensure session cookies are sent
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error('Unauthorized');
            }
            return response.json();
        })
        .then((data) => {
            loadProfile(data); // Load and display the fetched profile data
        })
        .catch((err) => {
            console.error('Error fetching profile data:', err);
            window.location.href = '/login.html'; // Redirect if unauthorized
        });
}


// Edit profile
document.getElementById('editProfileButton').addEventListener('click', () => {
    // Toggle bio editing
    document.getElementById('bioDisplay').style.display = 'none';
    document.getElementById('bioInput').style.display = 'inline';
    document.getElementById('bioInput').value = document.getElementById('bioDisplay').textContent;

    // Toggle profile picture editing
    const profilePicture = document.getElementById('profilePicture');
    const profilePictureSelect = document.getElementById('profilePictureSelect');
    profilePicture.style.display = 'none';
    profilePictureSelect.style.display = 'inline';
    profilePictureSelect.value = profilePicture.src.split('/').pop(); // Preselect the current picture

    // Toggle buttons
    document.getElementById('editProfileButton').style.display = 'none';
    document.getElementById('saveProfileButton').style.display = 'inline';
});

// Save profile
document.getElementById('saveProfileButton').addEventListener('click', () => {
    const newBio = document.getElementById('bioInput').value;
    const newPicture = document.getElementById('profilePictureSelect').value;

    fetch('/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bio: newBio, picture: newPicture }),
    })
        .then(response => {
            if (!response.ok) throw new Error('Failed to update profile');
            return response.json();
        })
        .then(() => {
            // Update bio display
            const bioDisplay = document.getElementById('bioDisplay');
            bioDisplay.textContent = newBio;
            bioDisplay.style.display = 'inline';

            const bioInput = document.getElementById('bioInput');
            bioInput.style.display = 'none';

            // Update profile picture display
            const profilePicture = document.getElementById('profilePicture');
            const profilePictureSelect = document.getElementById('profilePictureSelect');
            profilePicture.src = `${newPicture}`;
            profilePicture.style.display = 'inline';
            profilePictureSelect.style.display = 'none';

            // Toggle buttons
            document.getElementById('editProfileButton').style.display = 'inline';
            document.getElementById('saveProfileButton').style.display = 'none';
        })
        .catch(err => {
            console.error('Error updating profile:', err);
            alert('Unable to save changes. Please try again.');
        });
});

// Logout button
document.getElementById('logoutButton').addEventListener('click', () => {
    // Call the logout function from client.js
    logoutUser();
});