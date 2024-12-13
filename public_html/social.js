/**
 * @file social.js
 * @description This file contains the logic for comments on the leaderboard.
 * 
 * @authors [Gavin Ball, Joshua Stambaugh]
 */

// ======================== Initial Setup ========================
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
            fetchComments(); // Fetch comments if logged in
        })
        .catch(err => {
            console.error("Error fetching session status:", err);
        });

    // Add event listeners for buttons
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

// ======================== Comment Fetching ========================
/**
 * Fetch comments from the server.
 */
function fetchComments() {
    fetch(`/getComments?sort=${currentSortBy}`, { credentials: 'include' })
        .then(response => response.json())
        .then(comments => renderComments(comments))
        .catch(err => console.error("Error fetching comments:", err));
}

// ======================== Comment Posting ========================
/**
 * Post a new comment to the server.
 * @param {string} commentText - The comment text to post.
 */
async function postComment(commentText) {
    fetch('/postComment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comment: commentText })
    })
        .then(response => response.json())
        .then(() => {
            fetchComments(); // Refresh comments after posting
        })
        .catch(err => console.error("Error posting comment:", err));
}

// ======================== Comment Rendering ========================
/**
 * Render comments on the page.
 * @param {Array} comments - List of comments to render.
 */
let currentSortBy = 'newest'; // Default sorting
function renderComments(comments) {
    const commentList = document.getElementById('commentList');
    commentList.innerHTML = ''; // Clear existing comments
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

        // Replies container
        const repliesContainer = document.createElement('ul');
        repliesContainer.classList.add('replies-container');
        renderReplies(comment.replies, repliesContainer); // Render replies
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

/**
 * Render replies for a comment.
 * @param {Array} replies - List of replies to render.
 * @param {HTMLElement} container - Container for replies.
 */
function renderReplies(replies, container) {
    container.innerHTML = ''; // Clear existing replies
    replies?.forEach(reply => {
        const replyLi = document.createElement('li');
        replyLi.classList.add('comment-reply');

        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'comment-username';
        usernameSpan.textContent = `@${reply.username}: `;
        usernameSpan.style.color = 'rgb(233, 45, 134)'; // Set color for the username

        const replyTextSpan = document.createElement('span');
        replyTextSpan.className = 'comment-text';
        replyTextSpan.textContent = reply.text;
        replyTextSpan.style.color = 'white'; // Set color for the reply text

        replyLi.appendChild(usernameSpan);
        replyLi.appendChild(replyTextSpan);
        container.appendChild(replyLi);
    });
}

// ======================== Reply Handling ========================
/**
 * Submit a reply to a comment.
 * @param {Event} event - The submit event.
 * @param {number} commentId - The ID of the comment to reply to.
 */
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

/**
 * Post a reply to the server.
 * @param {number} parentCommentId - The ID of the parent comment.
 * @param {string} replyText - The reply text.
 */
async function postReply(parentCommentId, replyText) {
    fetch('/postReply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ commentId: parentCommentId, text: replyText })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                fetchComments(); // Refresh comments
            } else {
                alert(data.error || 'Error posting reply.');
            }
        })
        .catch(err => console.error('Error posting reply:', err));
}

// ======================== Comment Actions ========================
/**
 * Like a comment.
 * @param {number} commentId - The ID of the comment to like.
 */
function likeComment(commentId) {
    fetch('/likeComment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: commentId }),
        credentials: 'include',
    })
        .then(response => {
            if (response.ok) {
                fetchComments(); // Refresh comments
                return response.json();
            } else {
                throw new Error('You have already liked this comment');
            }
        })
        .catch(err => {
            alert(err.message);
        });
}

/**
 * Sort comments based on a criterion.
 * @param {string} sortBy - The criterion to sort by (e.g., "likes", "newest").
 */
function sortComments(sortBy) {
    currentSortBy = sortBy; // Update global sort state
    fetch(`/getComments?sort=${sortBy}`, { credentials: 'include' })
        .then(response => response.json())
        .then(comments => renderComments(comments))
        .catch(err => console.error("Error sorting comments:", err));
}

// ======================== Leaderboard Handling ========================
document.addEventListener("DOMContentLoaded", () => {
    fetchLeaderboard();
    leaderboardPolling = setInterval(fetchLeaderboard, 5000); // Poll every 5 seconds
});

/**
 * Fetch the leaderboard from the server.
 */
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

/**
 * Display the leaderboard on the page.
 * @param {Array} leaderboard - The leaderboard data.
 */
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
        timeCell.textContent = entry.time.toFixed(2);

        row.appendChild(positionCell);
        row.appendChild(usernameCell);
        row.appendChild(scoreCell);
        row.appendChild(timeCell);

        leaderboardTableBody.appendChild(row);
    });
}