document.addEventListener("DOMContentLoaded", () => {
    fetch('/get-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        console.log('Profile data:', data); // Add this log
        if (data.username) {
            console.log('Loading user details')

            document.getElementById('usernameDisplay').textContent = data.username || 'N/A';
            document.getElementById('emailDisplay').textContent = data.email || 'N/A';
            document.getElementById('realNameDisplay').textContent = data.realName || 'N/A';
            document.getElementById('bioDisplay').textContent = data.bio || 'N/A';

            const profilePic = document.getElementById('profilePicture');
            if (data.profilePicture) {
                profilePic.src = `/uploads/${data.profilePicture}`;
            } else {
                profilePic.alt = 'No profile picture';
            }

            // Update the header username
            document.getElementById('loggedUser').textContent = data.username;
        } else {
            alert('You are not logged in.');
            window.location.href = '/login.html';
        }
    })
    .catch(err => console.error('Error fetching profile:', err));
});