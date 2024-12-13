/**
 * @file social.js
 * @description This file contains the logic comments on the leaderboard
 * 
 * @authors [Gavin Ball, Joshua Stambaugh]
 */


document.addEventListener("DOMContentLoaded", () => {
    // Check session status

/**
 * Fetch request to '/session', { credentials: 'include' } - [Purpose of request]
 * @param url Endpoint URL
 * @param options Fetch options (headers, body, etc.)
 * @returns Promise resolving with the response
 */

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
/**
 * Function fetchComments - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

function fetchComments() {
    fetch(`/getComments?sort=${currentSortBy}`, { credentials: 'include' })
        .then(response => response.json())
        .then(comments => renderComments(comments))
        .catch(err => console.error("Error fetching comments:", err));
}

// Post a new comment
/**
 * Function postComment - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

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


/**
 * Function renderComments - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
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
        renderReplies(comment.replies, repliesContainer); // Render replies using the new function
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

function renderReplies(replies, container) {
    container.innerHTML = ''; // Clear existing replies

    replies?.forEach(reply => {
        const replyLi = document.createElement('li');
        replyLi.classList.add('comment-reply');

        // Create a span for the username
        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'comment-username';
        usernameSpan.textContent = `@${reply.username}: `;
        usernameSpan.style.color = 'rgb(233, 45, 134)'; // Set color for the username

        // Create a span for the reply text
        const replyTextSpan = document.createElement('span');
        replyTextSpan.className = 'comment-text';
        replyTextSpan.textContent = reply.text;
        replyTextSpan.style.color = 'white'; // Set color for the reply text

        // Append both spans to the reply list item
        replyLi.appendChild(usernameSpan);
        replyLi.appendChild(replyTextSpan);
        container.appendChild(replyLi);
    });
}

/**
 * Function showReplyForm - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

function showReplyForm(commentId) {
    const commentElement = document.querySelector(`[data-id='${commentId}']`);
    const replyForm = commentElement.querySelector('.reply-form');
    replyForm.classList.remove('hidden');
}

/**
 * Function postReply - [Describe functionality here]
 * @param [param_name] [Description]
 * @returns [Return value description]
 */

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
                fetchComments(); // Refresh comments while maintaining current sorting
            } else {
                alert(data.error || 'Error posting reply.');
            }
        })
        .catch(err => console.error('Error posting reply:', err));
}

/**
 * Function submitReply - SUbmission for a reply to an existing comment
 * @param event, commentId
 * @returns none
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
 * Function likeComment - Functions to like a comment
 * @param commentId, the unique id for a comment
 * @returns none
 */

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

/**
 * Function sortComments - Sorts the comments
 * @param sortBy, how the comments should be sorted
 * @returns none
 */

function sortComments(sortBy) {
    currentSortBy = sortBy; // Update the global sorting state
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


/**
 * Function addLeaderboardEntry - Adds a new entry to the leaderboard
 * @param player, score, time are leaderboard entry details
 * @returns none
 */

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

/**
 * Function displayLeaderboard - Gets the leaderboard from the database
 * @param none
 * @returns none
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
 * Function displayLeaderboard - Displays the player leaderboard
 * @param leaderboard, the database object
 * @returns none
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
        timeCell.textContent = entry.time.toFixed(2); // Format time to 2 decimal places

        row.appendChild(positionCell);
        row.appendChild(usernameCell);
        row.appendChild(scoreCell);
        row.appendChild(timeCell);

        leaderboardTableBody.appendChild(row);
    });
}



