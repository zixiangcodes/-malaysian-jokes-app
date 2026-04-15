// ─── Firebase Imports ────────────────────────────────────────────────────────
// import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"
// import { getDatabase, ref, push, get, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js"
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getDatabase, ref, push, get, remove } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-database.js";

// ─── Firebase Configuration ───────────────────────────────────────────────────
// Your web app's Firebase configuration
// 🔒 Security reminder: restrict this API key to your domain in Google Cloud Console
// https://console.cloud.google.com/apis/credentials

const firebaseConfig = {
    apiKey: "AIzaSyDbHkH9Sqj9enyEtgRcbluEKUb6Rj2gQLw",
    authDomain: "malaysian-jokes-app.firebaseapp.com",
    databaseURL: "https://malaysian-jokes-app-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "malaysian-jokes-app",
    storageBucket: "malaysian-jokes-app.firebasestorage.app",
    messagingSenderId: "68086689421",
    appId: "1:68086689421:web:5dcc1d92ce47d08610fcc4"
};

// Example (use your own values; do not commit secrets):
// const firebaseConfig = {
//     apiKey: "<your-api-key>",
//     authDomain: "<your-auth-domain>",
//     databaseURL: "<your-database-url>",
//     projectId: "<your-project-id>",
//     storageBucket: "<your-storage-bucket>",
//     messagingSenderId: "<your-messaging-sender-id>",
//     appId: "<your-app-id>"
// };

// ─── Initialise Firebase ─────────────────────────────────────────────────────
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const jokesRef = ref(database, "jokes");

// if (missingFirebaseVars.length === 0) {
//     app = initializeApp(firebaseConfig);
//     database = getDatabase(app);
//     jokesRef = ref(database, "jokes");
// } else {
//     const missingList = missingFirebaseVars.map(([name]) => name).join(', ');
//     console.error(`Missing Firebase config variables: ${missingList}`);
// }

// ─── Select page DOM Elements ─────────────────────────────────────────────────────────────
const generateRandomJokeButton = document.getElementById('generateRandomJokeButton');
const jokeDisplay = document.getElementById('joke-display');
const jokeForm = document.getElementById('jokeForm');
const jokeInput = document.getElementById('jokeInput');
const successMessage = document.getElementById('successMessage');
const toggleFormButton = document.getElementById('toggleFormButton');
const shareAppButton = document.getElementById('shareAppButton');
const shareMessage = document.getElementById('shareMessage');
const jokeCounter = document.getElementById('jokeCounter');
const deleteJokeButton = document.getElementById('deleteJokeButton');
const deleteMessage = document.getElementById('deleteMessage');
const boundaryMessage = document.getElementById('boundaryMessage');

// Select the navigation buttons from HTML (with corrected IDs)
const prevJokeButton = document.getElementById('prevJokeButton');
const firstJokeButton = document.getElementById('firstJokeButton');
const lastJokeButton = document.getElementById('lastJokeButton');
const nextJokeButton = document.getElementById('nextJokeButton');

// ─── State ────────────────────────────────────────────────────────────────────
// Variables to keep track of jokes
let allJokes = [];
let currentJokeIndex = -1;
const welcomeMessage = "Welcome, fellow Malaysians!\nClick on 'Random Joke' or 'Add a Joke' to start!";
const noJokesMessage = "Alamak, no jokes available yet! Add one lah!";
let hasUserInteracted = false;
// Variable to store the Firebase keys alongside the values
let allJokesKeys = [];
// Variable to set boundary message (first or last jokes) as null first, to clear it when buttons are clicked.
let boundaryMessageTimeout = null;

// ─── FUNCTIONS ───────────────────────────────────────────────────────────────

// ─── Toggle Add Joke Form ─────────────────────────────────────────────────────

// Function to show/hide the submission form
toggleFormButton.addEventListener('click', () => {
    jokeForm.classList.toggle('hidden');
    if (jokeForm.classList.contains('hidden')) {
        toggleFormButton.textContent = 'Add a Joke';
    } else {
        toggleFormButton.textContent = 'Hide Form';
    }
});

// ─── UI Helpers ───────────────────────────────────────────────────────────────

// Function to show the success message for 3 seconds
function showSuccessMessage() {
    successMessage.style.display = 'block';
    setTimeout(() => {
        successMessage.style.display = 'none';
    }, 3000);
}

// Function to show the delete success message for 3 seconds
function showDeleteMessage() {
    deleteMessage.style.display = 'block';
    setTimeout(() => {
        deleteMessage.style.display = 'none';
    }, 3000);
}

// Shows message for users
function showBoundaryMessage(message) {
    boundaryMessage.textContent = message;
    boundaryMessage.style.display = 'block';

    clearTimeout(boundaryMessageTimeout);
    boundaryMessageTimeout = setTimeout(() => {
        boundaryMessage.style.display = 'none';
    }, 3000);
}

function showNoJokesMessage() {
    jokeDisplay.textContent = hasUserInteracted ? noJokesMessage : welcomeMessage;
}

function showShareMessage(message, isError = false) {
    if (!shareMessage) return;
    shareMessage.textContent = message;
    shareMessage.style.display = 'block';
    shareMessage.style.color = isError ? '#CC0000' : '#0077b6';

    setTimeout(() => {
        shareMessage.style.display = 'none';
    }, 2500);
}

async function copyAppLinkToClipboard(link) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
        return true;
    }

    // Fallback for older/non-secure contexts.
    const textArea = document.createElement('textarea');
    textArea.value = link;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();

    let isCopied = false;
    try {
        isCopied = document.execCommand('copy');
    } finally {
        document.body.removeChild(textArea);
    }
    return isCopied;
}

// ─── Add Joke ─────────────────────────────────────────────────────────────────
// Function to handle add new jokes via form submission
jokeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    hasUserInteracted = true;

    if (isRateLimited()) return; // Check rate limit before allowing submission

    if (!jokesRef) {
        showNoJokesMessage();
        return;
    }

    const newJoke = jokeInput.value.trim();

    if (newJoke !== '') {
        push(jokesRef, newJoke)
            .then((pushRef) => {
                const newJokeKey = pushRef.key;
                jokeInput.value = '';
                jokeForm.classList.add('hidden');
                toggleFormButton.textContent = 'Add a Joke';
                showSuccessMessage();
                fetchJokes(newJokeKey); // Refresh and navigate to the new jokes
            })
            .catch((error) => {
                console.error('Error adding joke:', error);
                if (error.code === 'PERMISSION_DENIED') {
                    showBoundaryMessage("⚠️ Joke must be between 100 and 500 characters lah!");
                } else {
                    showBoundaryMessage("⚠️ Alamak, something went wrong. Try again lah!");
                }
            });
    }
});

// ─── Fetch & Display ──────────────────────────────────────────────────────────

/**
 * Fetches all jokes from Firebase in a single call.
 * Also updates the joke counter from the same snapshot (no extra DB read).
 * @param {string|null} navigateToKey - If provided, navigates to that joke after fetch.
 */
// // Function to update the counter
// function updateJokeCounter() {
//     get(jokesRef).then((snapshot) => {
//         if (snapshot.exists()) {
//             const jokesData = snapshot.val();
//             const count = Object.keys(jokesData).length;
//             jokeCounter.textContent = `Total Jokes in Database: ${count}`;
//         } else {
//             jokeCounter.textContent = 'Total Jokes in Database: 0';
//         }
//     }).catch((error) => {
//         console.error('Error fetching joke count:', error);
//     });
// }
// Call this function when the page loads
// updateJokeCounter();

// Function to fetch jokes data from Firebase (stores both keys and values)
// Optional: navigateToKey - when provided (e.g. after creating new jokes), navigate to that joke
function fetchJokes(navigateToKey = null) {
    if (!jokesRef) {
        allJokes = [];
        allJokesKeys = [];
        currentJokeIndex = -1;
        showNoJokesMessage();
        jokeCounter.textContent = 'Total Jokes in Database: 0';
        return;
    }

    get(jokesRef)
        .then((snapshot) => {
            if (snapshot.exists()) {
                const jokesData = snapshot.val();
                allJokes = Object.values(jokesData);
                allJokesKeys = Object.keys(jokesData);

                // ✅ Counter updated from the same snapshot — no extra Firebase call
                jokeCounter.textContent = `Total Jokes in Database: ${allJokes.length}`;

                if (navigateToKey !== null) {
                    const newIndex = allJokesKeys.indexOf(navigateToKey);
                    if (newIndex !== -1) {
                        currentJokeIndex = newIndex;
                        displayJoke();
                    } else if (currentJokeIndex === -1) {
                        displayRandomJoke();
                    }
                } else if (currentJokeIndex === -1) {
                    // Keep welcome message on first load; only show a random joke
                    // after explicit user interaction.
                    if (hasUserInteracted) {
                        displayRandomJoke();
                    } else {
                        jokeDisplay.textContent = welcomeMessage;
                    }
                }
            } else {
                allJokes = [];
                allJokesKeys = [];
                currentJokeIndex = -1;
                showNoJokesMessage();
                jokeCounter.textContent = 'Total Jokes in Database: 0';
            }
        })
        .catch((error) => {
            console.error('Error fetching jokes:', error);
            jokeDisplay.textContent = "⚠️Eh, something went wrong. Try again lah!";
        });
}

// Function to display a random joke
function displayRandomJoke() {
    if (allJokes.length > 0) {
        if (allJokes.length === 1) {
            currentJokeIndex = 0;
        } else {
            let randomIndex = Math.floor(Math.random() * allJokes.length);
            while (randomIndex === currentJokeIndex) {
                randomIndex = Math.floor(Math.random() * allJokes.length);
            }
            currentJokeIndex = randomIndex;
        }
        displayJoke();
    } else {
        showNoJokesMessage();
    }
}

// Function to display the first joke (FIXED: was using assignment instead of comparison)
function displayFirstJoke() {
    if (allJokes.length > 0) {
        if (currentJokeIndex === 0) {
            showBoundaryMessage("⚠️ Eh, you're already at the first joke lah!");
            return;
        }
        currentJokeIndex = 0;
        displayJoke();
    } else {
        showNoJokesMessage();
    }
}

// Function to display the last joke
function displayLastJoke() {
    if (allJokes.length > 0) {
        if (currentJokeIndex === allJokes.length - 1) {
            showBoundaryMessage("⚠️ Eh, you're already at the last joke lah!");
            return;
        }
        currentJokeIndex = allJokes.length - 1;
        displayJoke();
    } else {
        showNoJokesMessage();
    }
}

// Function to display the current joke
function displayJoke() {
    if (currentJokeIndex >= 0 && currentJokeIndex < allJokes.length) {
        const joke = allJokes[currentJokeIndex];
        jokeDisplay.textContent = `#${currentJokeIndex + 1}: ${joke}`;
    }
}

// Function to display the previous joke
function displayPreviousJoke() {
    if (allJokes.length > 0) {
        currentJokeIndex = (currentJokeIndex - 1 + allJokes.length) % allJokes.length;
        displayJoke();
    } else {
        showNoJokesMessage();
    }
}

// Function to display the next joke
function displayNextJoke() {
    if (allJokes.length > 0) {
        currentJokeIndex = (currentJokeIndex + 1) % allJokes.length;
        displayJoke();
    } else {
        showNoJokesMessage();
    }
}

// ─── Delete Joke ──────────────────────────────────────────────────────────────
// 🔒 Delete button is commented out in HTML for V1.0 (admin only)
// This logic is kept here and ready for when it's re-enabled.

// Function to delete the current joke
function deleteCurrentJoke() {
    if (!jokesRef) {
        showNoJokesMessage();
        return;
    }

    if (currentJokeIndex >= 0 && currentJokeIndex < allJokes.length) {
        const isConfirmed = confirm("Confirm delete this joke ah?");
        if (!isConfirmed) return;

        const keyToDelete = allJokesKeys[currentJokeIndex];
        const jokeRef = ref(database, `jokes/${keyToDelete}`);

        remove(jokeRef)
            .then(() => {
                showDeleteMessage();

                // Adjust currentJokeIndex after deletion
                if (allJokes.length === 1) {
                    // If this was the last joke
                    currentJokeIndex = -1;
                    jokeDisplay.textContent = "Alamak, no jokes yet! Add one lah!";
                } else if (currentJokeIndex >= allJokes.length - 1) {
                    // If we deleted the last joke, go to the previous one
                    currentJokeIndex = allJokes.length - 2;
                }
                // If we deleted a joke in the middle, currentJokeIndex stays the same
                // which will now point to the next joke

                fetchJokes(); // ✅ displayJoke() happens inside fetchJokes() — no setTimeout needed
            })
            .catch((error) => {
                console.error('Error deleting joke:', error);
                alert('Alamak, cannot delete. Try again lah!');
            });
    }
}

// ─── Event Listeners ──────────────────────────────────────────────────────────
// Add click event listeners to the buttons
generateRandomJokeButton.addEventListener('click', () => {
    hasUserInteracted = true;
    displayRandomJoke();
});
firstJokeButton.addEventListener('click', () => {
    hasUserInteracted = true;
    displayFirstJoke();
});
lastJokeButton.addEventListener('click', () => {
    hasUserInteracted = true;
    displayLastJoke();
});
prevJokeButton.addEventListener('click', () => {
    hasUserInteracted = true;
    displayPreviousJoke();
});
nextJokeButton.addEventListener('click', () => {
    hasUserInteracted = true;
    displayNextJoke();
});
if (shareAppButton) {
    const defaultShareButtonText = '🔗 Share App';
    shareAppButton.addEventListener('click', async () => {
        const appLink = window.location.href;
        try {
            const copied = await copyAppLinkToClipboard(appLink);
            if (!copied) throw new Error('Copy command failed');

            shareAppButton.textContent = '✅ Link Copied!';
            shareAppButton.classList.add('copied');
            showShareMessage('Link copied. Share it with your friends lah!');
        } catch (error) {
            console.error('Error copying share link:', error);
            showShareMessage('⚠️ Cannot copy now. Please copy URL manually.', true);
        }

        setTimeout(() => {
            shareAppButton.textContent = defaultShareButtonText;
            shareAppButton.classList.remove('copied');
        }, 2200);
    });
}
if (deleteJokeButton) {
    deleteJokeButton.addEventListener('click', () => {
        hasUserInteracted = true;
        deleteCurrentJoke();
    });
}

// ─── Rate Limiter (Client-side) ───────────────────────────────────────────────
const RATE_LIMIT = {
    maxSubmissions: 5,   // max jokes
    windowMs: 30_000,    // per 30 seconds
    storageKey: 'mjg_submissions'
};

function isRateLimited() {
    const now = Date.now();
    const raw = localStorage.getItem(RATE_LIMIT.storageKey);
    const timestamps = raw ? JSON.parse(raw) : [];

    // Keep only timestamps within the current window
    const recent = timestamps.filter(t => now - t < RATE_LIMIT.windowMs);

    if (recent.length >= RATE_LIMIT.maxSubmissions) {
        const oldestMs = RATE_LIMIT.windowMs - (now - recent[0]);
        const secondsLeft = Math.ceil(oldestMs / 1000);
        showBoundaryMessage(`⚠️ Slow down lah! Try again in ${secondsLeft}s.`);
        return true;
    }

    // Record this submission attempt
    recent.push(now);
    localStorage.setItem(RATE_LIMIT.storageKey, JSON.stringify(recent));
    return false;
}

// ─── Initialise ───────────────────────────────────────────────────────────────
// Render the default welcome text immediately on load.
jokeDisplay.textContent = welcomeMessage;
// Fetch jokes when the page loads
fetchJokes();