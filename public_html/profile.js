/** profile.js - Handles profile page functionality */

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

    // Initialize profile update functionality
    initProfileUpdate();
});

/** Load profile data using user details */
function loadProfile(user) {
    if (user) {
        document.getElementById('usernameDisplay').textContent = user.username || 'N/A';
        document.getElementById('emailDisplay').textContent = user.email || 'N/A';
        document.getElementById('realNameDisplay').textContent = user.realName || 'N/A';
        document.getElementById('bioDisplay').textContent = user.bio || 'N/A';

        const profilePicture = document.getElementById('profilePicture');
        if (user.profilePicture) {
            profilePicture.src = `/uploads/${user.profilePicture}`;
            profilePicture.alt = `${user.username}'s profile picture`;
        } else {
            profilePicture.alt = 'No profile picture available';
        }
    }
}

/** Fetch profile data from the server */
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
            loadProfile(data);
        })
        .catch((err) => {
            console.error('Error fetching profile data:', err);
            window.location.href = '/login.html'; // Redirect if unauthorized
        });
}

/** Initialize profile update functionality */
function initProfileUpdate() {
    const profileForm = document.getElementById('profileForm');

    if (profileForm) {
        profileForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const formData = new FormData(profileForm);

            const updatedData = {
                email: formData.get('email'),
                name: formData.get('real-name'),
                picture: null, // Update picture logic can go here if implemented
                bio: formData.get('bio'),
            };

            updateProfile(updatedData);
        });
    }
}

/** Update user profile information */
function updateProfile(data) {
    fetch('/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Ensure session cookies are sent
        body: JSON.stringify(data),
    })
        .then((response) => {
            if (response.ok) {
                alert('Profile updated successfully!');
                fetchProfileFromServer(); // Refresh profile data
            } else {
                return response.json().then((data) => {
                    throw new Error(data.message || 'Error updating profile');
                });
            }
        })
        .catch((err) => {
            console.error('Error updating profile:', err);
            alert(err.message || 'Unable to update profile. Please try again.');
        });
}

document.getElementById('logoutButton').addEventListener('click', () => {
    // Call the logout function from client.js
    logoutUser();
});