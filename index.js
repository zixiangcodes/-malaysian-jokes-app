// ─── Firebase Imports ────────────────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getDatabase, ref, push, get, remove } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-database.js";

// ─── Firebase Configuration ───────────────────────────────────────────────────
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

// ─── Initialise Firebase ─────────────────────────────────────────────────────
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const jokesRef = ref(database, "jokes");

// ─── Select page DOM Elements ─────────────────────────────────────────────────
const generateRandomJokeButton = document.getElementById('generateRandomJokeButton');
const jokeDisplay = document.getElementById('joke-display');
const jokeForm = document.getElementById('jokeForm');
const jokeTitleInput = document.getElementById('jokeTitleInput');
const jokeContentInput = document.getElementById('jokeContentInput');
const jokeTitleCharCounter = document.getElementById('jokeTitleCharCounter');
const jokeContentCharCounter = document.getElementById('jokeContentCharCounter');

const successMessage = document.getElementById('successMessage');
const toggleFormButton = document.getElementById('toggleFormButton');
const shareAppButton = document.getElementById('shareAppButton');
const shareMessage = document.getElementById('shareMessage');
const jokeCounter = document.getElementById('jokeCounter');
const deleteJokeButton = document.getElementById('deleteJokeButton');
const deleteMessage = document.getElementById('deleteMessage');
const boundaryMessage = document.getElementById('boundaryMessage');

const prevJokeButton = document.getElementById('prevJokeButton');
const firstJokeButton = document.getElementById('firstJokeButton');
const lastJokeButton = document.getElementById('lastJokeButton');
const nextJokeButton = document.getElementById('nextJokeButton');

// ─── Constants ────────────────────────────────────────────────────────────────
const MIN_TITLE_LENGTH = 15;
const MAX_TITLE_LENGTH = 100;
const MIN_CONTENT_LENGTH = 50;
const MAX_CONTENT_LENGTH = 750;

// ─── State ────────────────────────────────────────────────────────────────────
let allJokes = [];        // Array of joke objects: { joke_title, joke_content }
let allJokesKeys = [];    // Corresponding Firebase keys
let currentJokeIndex = -1;
let hasUserInteracted = false;
let boundaryMessageTimeout = null;

const welcomeMessage = "Welcome, fellow Malaysians!\nClick on 'Random Joke' or 'Add a Joke' to start!";
const noJokesMessage = "Alamak, no jokes available yet! Add one lah!";

// ─── Toggle Add Joke Form ─────────────────────────────────────────────────────
toggleFormButton.addEventListener('click', () => {
    jokeForm.classList.toggle('hidden');
    if (jokeForm.classList.contains('hidden')) {
        toggleFormButton.textContent = '+ Add a Joke';
    } else {
        toggleFormButton.textContent = 'Hide Form';
        updateCharCounters();
    }
});

// ─── UI Helpers ───────────────────────────────────────────────────────────────
function showSuccessMessage() {
    successMessage.style.display = 'block';
    setTimeout(() => { successMessage.style.display = 'none'; }, 3000);
}

function showDeleteMessage() {
    if (!deleteMessage) return;
    deleteMessage.style.display = 'block';
    setTimeout(() => { deleteMessage.style.display = 'none'; }, 3000);
}

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
    setTimeout(() => { shareMessage.style.display = 'none'; }, 2500);
}

// ─── Character Counters ───────────────────────────────────────────────────────
function updateCharCounters() {
    updateTitleCharCounter();
    updateContentCharCounter();
}

function updateTitleCharCounter() {
    if (!jokeTitleInput || !jokeTitleCharCounter) return;
    const len = jokeTitleInput.value.length;
    jokeTitleCharCounter.textContent = `${len} / ${MAX_TITLE_LENGTH} characters (min: ${MIN_TITLE_LENGTH})`;

    if (len > MAX_TITLE_LENGTH) {
        jokeTitleCharCounter.style.color = '#CC0000'; // Red — over limit
    } else if (len >= MIN_TITLE_LENGTH) {
        jokeTitleCharCounter.style.color = '#0077b6'; // Blue — valid
    } else {
        jokeTitleCharCounter.style.color = '#495057'; // Grey — too short
    }
}

function updateContentCharCounter() {
    if (!jokeContentInput || !jokeContentCharCounter) return;
    const len = jokeContentInput.value.length;
    jokeContentCharCounter.textContent = `${len} / ${MAX_CONTENT_LENGTH} characters (min: ${MIN_CONTENT_LENGTH})`;

    if (len > MAX_CONTENT_LENGTH) {
        jokeContentCharCounter.style.color = '#CC0000'; // Red — over limit
    } else if (len >= MIN_CONTENT_LENGTH) {
        jokeContentCharCounter.style.color = '#0077b6'; // Blue — valid
    } else {
        jokeContentCharCounter.style.color = '#495057'; // Grey — too short
    }
}

// ─── Clipboard Helper ─────────────────────────────────────────────────────────
async function copyAppLinkToClipboard(link) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
        return true;
    }
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
jokeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    hasUserInteracted = true;

    if (isRateLimited()) return;

    if (!jokesRef) {
        showNoJokesMessage();
        return;
    }

    const newTitle = jokeTitleInput.value.trim();
    const newContent = jokeContentInput.value.trim();

    // Validate title
    if (newTitle === '') {
        showBoundaryMessage("⚠️ Walao! Cannot submit without a joke title lah!");
        return;
    }
    if (newTitle.length < MIN_TITLE_LENGTH) {
        showBoundaryMessage(`⚠️ Title too short lah! Minimum ${MIN_TITLE_LENGTH} characters.`);
        return;
    }
    if (newTitle.length > MAX_TITLE_LENGTH) {
        showBoundaryMessage(`⚠️ Title too long lah! Keep it under ${MAX_TITLE_LENGTH} characters.`);
        return;
    }

    // Validate content
    if (newContent === '') {
        showBoundaryMessage("⚠️ Walao! Mabuk? Cannot submit empty joke lah!");
        return;
    }
    if (newContent.length < MIN_CONTENT_LENGTH) {
        showBoundaryMessage(`⚠️ Joke too short lah! Minimum ${MIN_CONTENT_LENGTH} characters.`);
        return;
    }
    if (newContent.length > MAX_CONTENT_LENGTH) {
        showBoundaryMessage(`⚠️ Joke too long lah! Maximum ${MAX_CONTENT_LENGTH} characters.`);
        return;
    }

    // Zalgo Character Check
    const zalgoRegex = /[\u0300-\u036f\u0489]/;
    if (zalgoRegex.test(newTitle) || zalgoRegex.test(newContent)) {
        showBoundaryMessage("⚠️ Eh, no funny characters lah!");
        return;
    }

    const newJokeObj = {
        joke_title: newTitle,
        joke_content: newContent
    };

    push(jokesRef, newJokeObj)
        .then((pushRef) => {
            const newJokeKey = pushRef.key;
            jokeTitleInput.value = '';
            jokeContentInput.value = '';
            updateCharCounters();
            jokeForm.classList.add('hidden');
            toggleFormButton.textContent = '+ Add a Joke';
            showSuccessMessage();
            fetchJokes(newJokeKey); // Refresh and navigate to the new joke
        })
        .catch((error) => {
            console.error('Error adding joke:', error);
            if (error.code === 'PERMISSION_DENIED') {
                showBoundaryMessage("⚠️ Permission denied lah! Check your database rules.");
            } else {
                showBoundaryMessage("⚠️ Alamak, something went wrong. Try again lah!");
            }
        });
});

// ─── Fetch & Display ──────────────────────────────────────────────────────────

/**
 * Fetches all jokes from Firebase.
 * Each joke is now an object: { joke_title, joke_content }
 * @param {string|null} navigateToKey - If provided, navigates to that joke after fetch.
 */
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
                allJokes = Object.values(jokesData);    // Array of { joke_title, joke_content }
                allJokesKeys = Object.keys(jokesData);

                jokeCounter.textContent = `Total Jokes in Database: ${allJokes.length} `;

                if (navigateToKey !== null) {
                    const newIndex = allJokesKeys.indexOf(navigateToKey);
                    if (newIndex !== -1) {
                        currentJokeIndex = newIndex;
                        displayJoke();
                    } else if (currentJokeIndex === -1) {
                        displayRandomJoke();
                    }
                } else if (currentJokeIndex === -1) {
                    if (hasUserInteracted) {
                        displayRandomJoke();
                    } else {
                        jokeDisplay.textContent = welcomeMessage;
                    }
                } else {
                    // Re-render current joke (e.g. after a delete)
                    displayJoke();
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
            jokeDisplay.textContent = "⚠️ Eh, something went wrong. Try again lah!";
        });
}

// ─── Display Helpers ──────────────────────────────────────────────────────────

/**
 * Displays the joke at currentJokeIndex.
 * Renders both joke_title and joke_content from the joke object.
 */
function displayJoke() {
    if (currentJokeIndex >= 0 && currentJokeIndex < allJokes.length) {
        const joke = allJokes[currentJokeIndex];
        const title = joke.joke_title || '(No Title)';
        const content = joke.joke_content || '(No Content)';
        jokeDisplay.textContent = `#${currentJokeIndex + 1} — [${title}]\n${content} `;
    }
}

function displayRandomJoke() {
    if (allJokes.length > 0) {
        if (allJokes.length === 1) {
            currentJokeIndex = 0;
        } else {
            let randomIndex;
            do {
                randomIndex = Math.floor(Math.random() * allJokes.length);
            } while (randomIndex === currentJokeIndex);
            currentJokeIndex = randomIndex;
        }
        displayJoke();
    } else {
        showNoJokesMessage();
    }
}

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

function displayPreviousJoke() {
    if (allJokes.length > 0) {
        currentJokeIndex = (currentJokeIndex - 1 + allJokes.length) % allJokes.length;
        displayJoke();
    } else {
        showNoJokesMessage();
    }
}

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

                if (allJokes.length === 1) {
                    currentJokeIndex = -1;
                    jokeDisplay.textContent = noJokesMessage;
                } else if (currentJokeIndex >= allJokes.length - 1) {
                    currentJokeIndex = allJokes.length - 2;
                }

                fetchJokes();
            })
            .catch((error) => {
                console.error('Error deleting joke:', error);
                alert('Alamak, cannot delete. Try again lah!');
            });
    }
}

// ─── Event Listeners ──────────────────────────────────────────────────────────
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

jokeTitleInput.addEventListener('input', updateTitleCharCounter);
jokeContentInput.addEventListener('input', updateContentCharCounter);

if (shareAppButton) {
    const defaultShareButtonText = '🔗 Share Link';
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
    maxSubmissions: 5,
    windowMs: 30_000,
    storageKey: 'mjg_submissions'
};

function isRateLimited() {
    const now = Date.now();
    const raw = localStorage.getItem(RATE_LIMIT.storageKey);
    const timestamps = raw ? JSON.parse(raw) : [];
    const recent = timestamps.filter(t => now - t < RATE_LIMIT.windowMs);

    if (recent.length >= RATE_LIMIT.maxSubmissions) {
        const oldestMs = RATE_LIMIT.windowMs - (now - recent[0]);
        const secondsLeft = Math.ceil(oldestMs / 1000);
        showBoundaryMessage(`⚠️ Slow down lah! Try again in ${secondsLeft} s.`);
        return true;
    }

    recent.push(now);
    localStorage.setItem(RATE_LIMIT.storageKey, JSON.stringify(recent));
    return false;
}

// ─── Initialise ───────────────────────────────────────────────────────────────
jokeDisplay.textContent = welcomeMessage;
updateCharCounters();
fetchJokes();