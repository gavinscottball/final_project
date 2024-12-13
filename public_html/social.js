// javascript for comments

document.addEventListener("DOMContentLoaded", () => {
    // Check session status
    
    fetch('/session', { credentials: 'include' })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error("User not logged in");
            }
        })
        .then(data => {

            // Proceed with fetching comments if logged in
            fetchComments();
        })
        .catch(err => {
            console.error("Error fetching session status:", err);
        });
    
    // Add event listener for posting comments
    document.getElementById("addCommentBtn").addEventListener("click", () => {
        const commentInput = document.getElementById("commentInput");
        const commentText = commentInput.value.trim();

        if (commentText) {
            postComment(commentText);
            commentInput.value = ""; // Clear input field
        } else {
            alert("Comment cannot be empty.");
        }
    });

    document.getElementById("sortLikesBtn").addEventListener("click", () => sortComments("likes"));
    document.getElementById("sortNewestBtn").addEventListener("click", () => sortComments("newest"));
});

// Fetch comments from the server
function fetchComments() {
    fetch('/getComments', { credentials: 'include' })
    .then(response => response.json())
    .then(comments => renderComments(comments))
    .catch(err => console.error("Error fetching comments:", err));
}

// Post a new comment
function postComment(commentText) {
    fetch('/postComment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // Corrected typo
        credentials: 'include', // Include cookies
        body: JSON.stringify({ comment: commentText })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                fetchComments(); // Refresh comments after posting
            } else {
                alert(data.error || "Error posting comment.");
            }
        })
        .catch(err => console.error("Error posting comment:", err));
}


function renderComments(comments) {
    const commentList = document.getElementById('commentList');
    commentList.innerHTML = '';

    comments.forEach(comment => {
        const li = document.createElement('li');
        li.classList.add('comment-item');
        li.setAttribute('data-id', comment.id);

        // Comment content
        const realNameSpan = document.createElement('span');
        realNameSpan.className = 'comment-realname';
        realNameSpan.textContent = comment.realName;

        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'comment-username';
        usernameSpan.textContent = `@${comment.username}`;

        const textSpan = document.createElement('span');
        textSpan.className = 'comment-text';
        textSpan.textContent = comment.text;

        // Actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'comment-actions';

        const likeBtn = document.createElement('button');
        likeBtn.className = 'like-button';
        likeBtn.textContent = `Like (${comment.likes})`;
        likeBtn.addEventListener('click', () => likeComment(comment.id));

        actionsDiv.appendChild(likeBtn);
        li.appendChild(realNameSpan);
        li.appendChild(usernameSpan);
        li.appendChild(textSpan);
        li.appendChild(actionsDiv);

        // Replies
        const repliesContainer = document.createElement('ul');
        repliesContainer.classList.add('replies-container');
        comment.replies?.forEach(reply => {
            const replyLi = document.createElement('li');
            replyLi.classList.add('comment-reply');

            const replyText = document.createElement('span');
            replyText.className = 'comment-text';
            replyText.textContent = `@${reply.username}: ${reply.text}`;

            replyLi.appendChild(replyText);
            repliesContainer.appendChild(replyLi);
        });

        li.appendChild(repliesContainer);

        // Reply form
        const replyForm = document.createElement('form');
        replyForm.className = 'reply-form';
        replyForm.innerHTML = `
            <input type="text" class="reply-input" placeholder="Write a reply...">
            <button type="submit">Reply</button>
        `;
        replyForm.addEventListener('submit', event => submitReply(event, comment.id));

        li.appendChild(replyForm);
        commentList.appendChild(li);
    });
}

function showReplyForm(commentId) {
    const commentElement = document.querySelector(`[data-id='${commentId}']`);
    const replyForm = commentElement.querySelector('.reply-form');
    replyForm.classList.remove('hidden');
}

function postReply(parentCommentId, replyText) {
    fetch('/postReply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ commentId: parentCommentId, text: replyText })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            fetchComments(); // Refresh comments to include the new reply
        } else {
            alert(data.error || 'Error posting reply.');
        }
    })
    .catch(err => console.error('Error posting reply:', err));
}

function submitReply(event, commentId) {
    event.preventDefault();

    const commentElement = document.querySelector(`[data-id='${commentId}']`);
    const replyInput = commentElement.querySelector('.reply-input');

    const replyText = replyInput.value.trim();
    if (!replyText) {
        alert('Reply text cannot be empty!');
        return;
    }

    postReply(commentId, replyText);
    replyInput.value = ''; // Clear input
}

// Like a comment
function likeComment(commentId) {
    fetch(`/likeComment/${commentId}`, {
        method: 'POST',
        credentials: 'include'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                fetchComments(); // Refresh comments after liking
            } else {
                alert(data.error || "Error liking comment.");
            }
        })
        .catch(err => console.error("Error liking comment:", err));
}

// Sort comments
function sortComments(sortBy) {
    fetch(`/getComments?sort=${sortBy}`, { credentials: 'include' })
        .then(response => response.json())
        .then(comments => renderComments(comments))
        .catch(err => console.error("Error sorting comments:", err));
}
















// Javascript for leaderboard
let leaderboardPolling;

document.addEventListener("DOMContentLoaded", () => {
    fetchLeaderboard();
    leaderboardPolling = setInterval(fetchLeaderboard, 5000); // Poll every 5 seconds
});


// Add a new entry to the leaderboard
function addLeaderboardEntry(player, score, time) {
    const leaderboardTableBody = document.querySelector("#leaderboardTable tbody");

    // Create an array of current players
    const players = Array.from(leaderboardTableBody.children).map(row => {
        const cells = row.children;
        return {
            name: cells[1].textContent,
            score: parseInt(cells[2].textContent, 10),
            time: parseFloat(cells[3].textContent) // Parse time as a float
        };
    });

    // Add the new player
    players.push({ name: player, score, time });

    // Sort players by score (descending) and time (ascending as a tiebreaker)
    players.sort((a, b) => b.score - a.score || a.time - b.time);

    // Clear the table and rebuild it
    leaderboardTableBody.innerHTML = "";
    players.forEach((player, index) => {
        const newRow = document.createElement("tr");

        const positionCell = document.createElement("td");
        positionCell.textContent = index + 1; // Rank based on sorted order

        const playerCell = document.createElement("td");
        playerCell.textContent = player.name;

        const scoreCell = document.createElement("td");
        scoreCell.textContent = player.score;

        const timeCell = document.createElement("td");
        timeCell.textContent = player.time.toFixed(2); // Format time to 2 decimal places

        newRow.appendChild(positionCell);
        newRow.appendChild(playerCell);
        newRow.appendChild(scoreCell);
        newRow.appendChild(timeCell);

        leaderboardTableBody.appendChild(newRow);
    });
}

async function fetchLeaderboard() {
    try {
        const response = await fetch('/get-leaderboard');
        if (!response.ok) {
            throw new Error('Failed to fetch leaderboard');
        }

        const leaderboard = await response.json();

        displayLeaderboard(leaderboard);
    } catch (err) {
        console.error('Error fetching leaderboard:', err);
    }
}

function displayLeaderboard(leaderboard) {
    const leaderboardTableBody = document.querySelector("#leaderboardTable tbody");
    leaderboardTableBody.innerHTML = ""; // Clear existing content

    leaderboard.forEach((entry, index) => {
        const row = document.createElement("tr");

        const positionCell = document.createElement("td");
        positionCell.textContent = index + 1;

        const usernameCell = document.createElement("td");
        usernameCell.textContent = entry.username;

        const scoreCell = document.createElement("td");
        scoreCell.textContent = entry.score;

        const timeCell = document.createElement("td");
        timeCell.textContent = entry.time.toFixed(2); // Format time to 2 decimal places

        row.appendChild(positionCell);
        row.appendChild(usernameCell);
        row.appendChild(scoreCell);
        row.appendChild(timeCell);

        leaderboardTableBody.appendChild(row);
    });
}




