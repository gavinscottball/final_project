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
            console.log("Session status:", data);

            // Proceed with fetching comments if logged in
            fetchComments();
        })
        .catch(err => {
            console.error("Error fetching session status:", err);
            alert("You must be logged in to view and post comments.");
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
    const commentList = document.getElementById("commentList");
    commentList.innerHTML = ""; // Clear existing comments

    if (comments.length === 0) {
        // Display a message if there are no comments
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = "No comments yet. Be the first to comment!";
        emptyMessage.style.textAlign = "center";
        emptyMessage.style.color = "#555";
        commentList.appendChild(emptyMessage);
        return;
    }

    comments.forEach(comment => {
        const li = document.createElement("li");
        li.classList.add("comment-item");

        const realNameSpan = document.createElement("span");
        realNameSpan.className = "comment-realname";
        realNameSpan.textContent = comment.realName;

        const usernameSpan = document.createElement("span");
        usernameSpan.className = "comment-username";
        usernameSpan.textContent = `(${comment.username})`;

        const textSpan = document.createElement("span");
        textSpan.className = "comment-text";
        textSpan.textContent = `: ${comment.text}`;

        const actionsDiv = document.createElement("div");
        actionsDiv.className = "comment-actions";

        const likeBtn = document.createElement("button");
        likeBtn.className = "like-button";
        likeBtn.textContent = `Like (${comment.likes})`;
        likeBtn.addEventListener("click", () => likeComment(comment.id));

        actionsDiv.appendChild(likeBtn);
        li.appendChild(realNameSpan);
        li.appendChild(usernameSpan);
        li.appendChild(textSpan);
        li.appendChild(actionsDiv);

        commentList.appendChild(li);
    });
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