// ========================================
// FIREBASE IMPORTS
// ========================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    doc,
    getDoc,
    setDoc,
    addDoc,
    query,
    orderBy,
    where,
    onSnapshot,
    serverTimestamp,
    increment,
    updateDoc,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


// ========================================
// FIREBASE CONFIG
// ========================================

const firebaseConfig = {
    apiKey: "AIzaSyBuQMRqnInephgksp_MHuM3V8BqG5R4hTs",
    authDomain: "my-chat-8b2d2.firebaseapp.com",
    projectId: "my-chat-8b2d2",
    storageBucket: "my-chat-8b2d2.firebasestorage.app",
    messagingSenderId: "148118230371",
    appId: "1:148118230371:web:098935e26c267c3e596f56",
    measurementId: "G-KYFSGCL3GG"
};


// ========================================
// INITIALIZE FIREBASE
// ========================================

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// ========================================
// HTML ELEMENTS
// ========================================

const myUsername = document.getElementById("myUsername");
const myAvatar = document.getElementById("myAvatar");
const myStatus = document.getElementById("myStatus");

const usersList = document.getElementById("usersList");
const searchUsers = document.getElementById("searchUsers");

const welcomeScreen = document.getElementById("welcomeScreen");
const chatContainer = document.getElementById("chatContainer");

const chatUsername = document.getElementById("chatUsername");
const chatAvatar = document.getElementById("chatAvatar");
const chatStatus = document.getElementById("chatStatus");

const messages = document.getElementById("messages");

const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");

const logoutButton = document.getElementById("logoutButton");
const backButton = document.getElementById("backButton");


// ========================================
// VARIABLES
// ========================================

let currentUser = null;
let selectedUser = null;

let unsubscribeUsers = null;
let unsubscribeChats = null;
let unsubscribeMessages = null;
let unsubscribeSelectedUser = null;

let allUsers = [];
let conversations = {};
let presenceInterval = null;


// ========================================
// AUTHENTICATION
// ========================================

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        window.location.href = "index.html";
        return;
    }

    currentUser = user;

    try {

        const userRef = doc(
            db,
            "users",
            user.uid
        );

        let userSnapshot = await getDoc(userRef);

        if (!userSnapshot.exists()) {

            const username =
                user.displayName ||
                (
                    user.email
                        ? user.email.split("@")[0]
                        : "User"
                );

            await setDoc(userRef, {
                uid: user.uid,
                username: username,
                email: user.email || "",
                online: true,
                lastSeen: serverTimestamp(),
                createdAt: serverTimestamp()
            });

            userSnapshot = await getDoc(userRef);
        } else {
            // Mark current user as online
            await setDoc(userRef, {
                online: true,
                lastSeen: serverTimestamp()
            }, { merge: true });
        }

        const profile = userSnapshot.data();

        const username =
            profile.username ||
            (
                user.email
                    ? user.email.split("@")[0]
                    : "User"
            );

        if (myUsername) {
            myUsername.textContent = username;
        }

        if (myAvatar) {
            myAvatar.textContent =
                username.charAt(0).toUpperCase();
        }

        if (myStatus) {
            myStatus.textContent = "Online";
            myStatus.style.color = "#16a34a";
        }

        // Keep presence alive while the tab is open
        startPresenceHeartbeat();

        loadUsers();
        loadConversations();

    } catch (error) {

        console.error(
            "Authentication error:",
            error
        );

    }

});


// ========================================
// PRESENCE (ONLINE / OFFLINE)
// ========================================

async function setUserOnline(isOnline) {

    if (!currentUser) return;

    try {
        await setDoc(
            doc(db, "users", currentUser.uid),
            {
                online: isOnline,
                lastSeen: serverTimestamp()
            },
            { merge: true }
        );
    } catch (error) {
        console.error("Presence update error:", error);
    }

}

function startPresenceHeartbeat() {

    // Clear previous interval if any
    if (presenceInterval) {
        clearInterval(presenceInterval);
    }

    // Refresh "online" every 25 seconds
    presenceInterval = setInterval(() => {
        setUserOnline(true);
    }, 25000);

    // When the user leaves the page
    window.addEventListener("beforeunload", () => {
        setUserOnline(false);
    });

    // When tab becomes hidden / visible
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
            setUserOnline(false);
        } else {
            setUserOnline(true);
        }
    });

}


function formatLastSeen(timestamp) {

    if (!timestamp) return "Offline";

    try {
        const date = timestamp.toDate();
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;

        return date.toLocaleDateString([], {
            month: "short",
            day: "numeric"
        });
    } catch {
        return "Offline";
    }

}


function updateChatStatus(userData) {

    if (!chatStatus) return;

    if (userData && userData.online === true) {
        chatStatus.textContent = "Online";
        chatStatus.style.color = "#16a34a";
    } else {
        const lastSeenText = formatLastSeen(userData?.lastSeen);
        chatStatus.textContent = lastSeenText === "Just now"
            ? "Last seen just now"
            : `Last seen ${lastSeenText}`;
        chatStatus.style.color = "#888";
    }

}


// ========================================
// LOAD ALL USERS
// ========================================

function loadUsers() {

    if (unsubscribeUsers) {
        unsubscribeUsers();
    }

    unsubscribeUsers = onSnapshot(
        collection(db, "users"),

        (snapshot) => {

            allUsers = [];

            snapshot.forEach((userDoc) => {

                const user = userDoc.data();

                if (
                    user.uid &&
                    currentUser &&
                    user.uid !== currentUser.uid
                ) {

                    allUsers.push(user);

                }

            });

            renderUsers();

        },

        (error) => {

            console.error(
                "Users error:",
                error
            );

        }
    );

}


// ========================================
// LOAD CONVERSATIONS
// ========================================

function loadConversations() {

    if (unsubscribeChats) {
        unsubscribeChats();
    }

    const chatsQuery = query(
        collection(db, "chats"),
        where(
            "participants",
            "array-contains",
            currentUser.uid
        )
    );

    unsubscribeChats = onSnapshot(
        chatsQuery,

        (snapshot) => {

            conversations = {};

            snapshot.forEach((chatDoc) => {

                const chat = chatDoc.data();

                if (
                    !chat.participants ||
                    !Array.isArray(chat.participants)
                ) {
                    return;
                }

                const otherUserId =
                    chat.participants.find(
                        (uid) =>
                            uid !== currentUser.uid
                    );

                if (otherUserId) {

                    conversations[otherUserId] = {
                        ...chat,
                        chatId: chatDoc.id
                    };

                }

            });

            renderUsers();

        },

        (error) => {

            console.error(
                "Conversation error:",
                error
            );

        }
    );

}


// ========================================
// RENDER USERS
// ========================================

function renderUsers() {

    if (!usersList) {
        return;
    }

    usersList.innerHTML = "";

    const searchText =
        searchUsers
            ? searchUsers.value
                .toLowerCase()
                .trim()
            : "";

    const sortedUsers =
        [...allUsers].sort((a, b) => {

            const chatA =
                conversations[a.uid];

            const chatB =
                conversations[b.uid];

            const timeA =
                getTimestamp(
                    chatA?.lastMessageAt
                );

            const timeB =
                getTimestamp(
                    chatB?.lastMessageAt
                );

            return timeB - timeA;

        });

    let visibleUsers = 0;

    sortedUsers.forEach((user) => {

        const username =
            user.username ||
            user.email ||
            "User";

        if (
            !username
                .toLowerCase()
                .includes(searchText)
        ) {
            return;
        }

        visibleUsers++;

        createUserElement(user);

    });

    if (visibleUsers === 0) {

        usersList.innerHTML = `
            <div class="loading">
                No other users yet.
            </div>
        `;

    }

}


// ========================================
// CREATE USER ITEM
// ========================================

function createUserElement(user) {

    const userItem =
        document.createElement("div");

    userItem.className = "user-item";

    userItem.dataset.uid = user.uid;

    const username =
        user.username ||
        user.email ||
        "User";

    const firstLetter =
        username
            .charAt(0)
            .toUpperCase();

    const conversation =
        conversations[user.uid];

    let lastMessage =
        "Click to start chatting";

    let unreadCount = 0;

    if (conversation) {

        if (conversation.lastMessage) {

            lastMessage =
                conversation.lastMessage;

        }

        if (
            conversation.unreadFor &&
            conversation.unreadFor[currentUser.uid]
        ) {

            unreadCount =
                Number(
                    conversation.unreadFor[
                        currentUser.uid
                    ]
                ) || 0;

        }

    }


    // UNREAD STYLE

    if (unreadCount > 0) {

        userItem.classList.add(
            "has-unread"
        );

    }


    // ACTIVE CHAT

    if (
        selectedUser &&
        selectedUser.uid === user.uid
    ) {

        userItem.classList.add(
            "active"
        );

    }


    userItem.innerHTML = `

        <div class="avatar">
            ${escapeHtml(firstLetter)}
        </div>

        <div class="user-content">

            <div class="user-top">

                <h3>
                    ${escapeHtml(username)}
                </h3>

                ${
                    unreadCount > 0
                        ? `
                            <span class="unread-badge">
                                ${
                                    unreadCount > 99
                                        ? "99+"
                                        : unreadCount
                                }
                            </span>
                        `
                        : ""
                }

            </div>

            <p class="last-message">
                ${escapeHtml(lastMessage)}
            </p>

        </div>

    `;


    userItem.addEventListener(
        "click",
        () => openChat(user)
    );


    usersList.appendChild(
        userItem
    );

}


// ========================================
// OPEN CHAT
// ========================================

async function openChat(user) {

    selectedUser = user;

    if (welcomeScreen) {
        welcomeScreen.style.display = "none";
    }

    if (chatContainer) {
        chatContainer.style.display = "flex";
    }

    const chatApp = document.querySelector(".chat-app");
    if (chatApp) {
        chatApp.classList.add("chat-open");
    }

    const username =
        user.username ||
        user.email ||
        "User";

    if (chatUsername) {
        chatUsername.textContent = username;
    }

    if (chatAvatar) {
        chatAvatar.textContent =
            username.charAt(0).toUpperCase();
    }

    // Show initial status from the user object we already have
    updateChatStatus(user);

    // Live presence listener for the selected user
    if (unsubscribeSelectedUser) {
        unsubscribeSelectedUser();
        unsubscribeSelectedUser = null;
    }

    unsubscribeSelectedUser = onSnapshot(
        doc(db, "users", user.uid),
        (snap) => {
            if (snap.exists()) {
                updateChatStatus(snap.data());
            } else {
                updateChatStatus(null);
            }
        },
        (error) => {
            console.error("Selected user presence error:", error);
        }
    );

    const chatId = getChatId();
    if (!chatId) return;

    try {

        const chatRef = doc(db, "chats", chatId);

        // Ensure the chat document exists
        await setDoc(
            chatRef,
            {
                participants: [
                    currentUser.uid,
                    selectedUser.uid
                ]
            },
            { merge: true }
        );

        // Reset my unread count
        await setDoc(
            chatRef,
            {
                [`unreadFor.${currentUser.uid}`]: 0
            },
            { merge: true }
        );

        await markMessagesAsRead(chatId);

        renderUsers();

    } catch (error) {
        console.error("Open chat error:", error);
        alert("Could not open chat: " + (error.message || error.code || "Unknown error"));
    }

    loadMessages();

    setTimeout(() => {
        if (messageInput) {
            messageInput.focus();
        }
        scrollToBottom();
        updateKeyboardHeight();
    }, 300);

}
// ========================================
// MARK MESSAGES AS READ
// ========================================

async function markMessagesAsRead(chatId) {

    if (!currentUser || !chatId) {
        return;
    }

    // 1. Optimistic UI update (clears badge immediately)
    if (selectedUser && conversations[selectedUser.uid]) {
        conversations[selectedUser.uid] = {
            ...conversations[selectedUser.uid],
            unreadFor: {
                ...(conversations[selectedUser.uid].unreadFor || {}),
                [currentUser.uid]: 0
            }
        };
        renderUsers();          // ← badge disappears right away
    }

    try {
        const chatRef = doc(db, "chats", chatId);

        // 2. Reset unread counter in Firestore
        await setDoc(
            chatRef,
            {
                [`unreadFor.${currentUser.uid}`]: 0
            },
            { merge: true }
        );

        // 3. Mark individual messages as read
        const messagesRef = collection(db, "chats", chatId, "messages");

        const unreadQuery = query(
            messagesRef,
            where("receiverId", "==", currentUser.uid)
        );

        const snapshot = await getDocs(unreadQuery);

        const updates = [];

        snapshot.forEach((messageDoc) => {
            const message = messageDoc.data();

            if (!message.readAt) {
                updates.push(
                    updateDoc(messageDoc.ref, {
                        readAt: serverTimestamp()
                    })
                );
            }
        });

        if (updates.length > 0) {
            await Promise.all(updates);
        }

    } catch (error) {
        console.error("Mark messages as read error:", error);
        // Optional: you could re-fetch conversations here if you want
    }
}

// ========================================
// GET CHAT ID
// ========================================

function getChatId() {

    if (
        !currentUser ||
        !selectedUser
    ) {

        return null;

    }

    return [
        currentUser.uid,
        selectedUser.uid
    ]
        .sort()
        .join("_");

}


// ========================================
// LOAD MESSAGES
// ========================================

function loadMessages() {

    if (unsubscribeMessages) {

        unsubscribeMessages();

    }

    const chatId =
        getChatId();

    if (!chatId) {
        return;
    }


    const messagesRef =
        collection(
            db,
            "chats",
            chatId,
            "messages"
        );


    const messagesQuery =
        query(
            messagesRef,
            orderBy(
                "createdAt",
                "asc"
            )
        );


    unsubscribeMessages =
        onSnapshot(

            messagesQuery,

            async (snapshot) => {

                if (messages) {

                    messages.innerHTML = "";

                }

                let hasUnreadReceived = false;

                snapshot.forEach(
                    (messageDoc) => {

                        const data = messageDoc.data();

                        displayMessage(data);

                        if (
                            data.receiverId === currentUser.uid &&
                            !data.readAt
                        ) {
                            hasUnreadReceived = true;
                        }

                    }
                );


                scrollToBottom();


                // Only mark as read if there are unread
                // received messages (avoids extra writes
                // on every snapshot after already read).

                if (selectedUser && hasUnreadReceived) {

                    await markMessagesAsRead(
                        chatId
                    );

                }

            },

            (error) => {

                console.error(
                    "Messages error:",
                    error
                );

            }

        );

}


// ========================================
// DISPLAY MESSAGE
// ========================================

function displayMessage(message) {

    if (!messages) {
        return;
    }


    const messageElement =
        document.createElement("div");


    const isSent =
        message.senderId ===
        currentUser.uid;


    messageElement.className =
        isSent
            ? "message sent"
            : "message received";


    const textElement =
        document.createElement("div");


    textElement.className =
        "message-text";


    textElement.textContent =
        message.text || "";


    const bottomElement =
        document.createElement("div");


    bottomElement.className =
        "message-bottom";


    const timeElement =
        document.createElement("span");


    timeElement.className =
        "message-time";


    if (message.createdAt) {

        try {

            timeElement.textContent =
                message.createdAt
                    .toDate()
           .toLocaleTimeString(
                        [],
                        {
                            hour: "2-digit",
                            minute: "2-digit"
                        }
                    );

        } catch {

            timeElement.textContent =
                "";

        }

    }


    bottomElement.appendChild(
        timeElement
    );


    // ====================================
    // READ RECEIPT
    // ====================================

    if (isSent) {

        const receipt =
            document.createElement("span");

        receipt.className =
            "message-status";


        if (message.readAt) {

            receipt.textContent =
                "✓✓";

            receipt.classList.add(
                "read"
            );

            receipt.title =
                "Read";

        } else {

            receipt.textContent =
                "✓";

            receipt.title =
                "Sent";

        }


        bottomElement.appendChild(
            receipt
        );

    }


    messageElement.appendChild(
        textElement
    );

    messageElement.appendChild(
        bottomElement
    );


    messages.appendChild(
        messageElement
    );

}


// ========================================
// SEND MESSAGE
// ========================================

if (messageForm) {

    messageForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            if (!currentUser) {
                alert("You are not logged in.");
                return;
            }

            if (!selectedUser) {
                alert("Select someone to chat with first.");
                return;
            }

            const text = messageInput
                ? messageInput.value.trim()
                : "";

            if (!text) {
                return;
            }

            const chatId = getChatId();

            if (!chatId) {
                alert("Chat ID could not be created.");
                return;
            }

            // Disable the form briefly to prevent double-send
            const submitBtn = messageForm.querySelector("button");
            if (submitBtn) submitBtn.disabled = true;
            if (messageInput) messageInput.disabled = true;

            try {

                const chatRef = doc(db, "chats", chatId);

                // 1. Ensure chat document exists + update metadata
                await setDoc(
                    chatRef,
                    {
                        participants: [
                            currentUser.uid,
                            selectedUser.uid
                        ],
                        lastMessage: text,
                        lastMessageAt: serverTimestamp(),
                        lastSenderId: currentUser.uid,
                        [`unreadFor.${currentUser.uid}`]: 0
                    },
                    { merge: true }
                );

                // Increment the other user's unread count
                await updateDoc(chatRef, {
                    [`unreadFor.${selectedUser.uid}`]: increment(1)
                });

                // 2. Save the actual message
                await addDoc(
                    collection(db, "chats", chatId, "messages"),
                    {
                        text: text,
                        senderId: currentUser.uid,
                        receiverId: selectedUser.uid,
                        createdAt: serverTimestamp(),
                        readAt: null
                    }
                );

                // Clear input
                if (messageInput) {
                    messageInput.value = "";
                    messageInput.focus();
                }

                scrollToBottom();

            } catch (error) {

                console.error("Send message error:", error);

                // Show the real Firebase error so you can fix rules/indexes
                const msg = error.code
                    ? `${error.code}: ${error.message}`
                    : (error.message || "Unknown error");

                alert("Message could not be sent.\n\n" + msg);

            } finally {

                if (submitBtn) submitBtn.disabled = false;
                if (messageInput) messageInput.disabled = false;

            }

        }
    );

}


// ========================================
// SEARCH
// ========================================

if (searchUsers) {

    searchUsers.addEventListener(
        "input",
        () => {

            renderUsers();

        }
    );

}


// ========================================
// SCROLL
// ========================================

function scrollToBottom() {

    if (!messages) {
        return;
    }

    requestAnimationFrame(() => {

        messages.scrollTop =
            messages.scrollHeight;

    });

}


// ========================================
// MOBILE KEYBOARD
// ========================================

function updateKeyboardHeight() {

    if (!window.visualViewport) {
        return;
    }


    const viewport =
        window.visualViewport;


    const keyboardHeight =
        Math.max(
            0,
            window.innerHeight -
            viewport.height -
            viewport.offsetTop
        );


    document.documentElement.style.setProperty(
        "--keyboard-height",
        `${keyboardHeight}px`
    );


    scrollToBottom();

}


if (window.visualViewport) {

    window.visualViewport.addEventListener(
        "resize",
        updateKeyboardHeight
    );


    window.visualViewport.addEventListener(
        "scroll",
        updateKeyboardHeight
    );

}


if (messageInput) {

    messageInput.addEventListener(
        "focus",
        () => {

            updateKeyboardHeight();

            setTimeout(
                updateKeyboardHeight,
                300
            );

            setTimeout(
                scrollToBottom,
                500
            );

        }
    );


    messageInput.addEventListener(
        "input",
        updateKeyboardHeight
    );


    messageInput.addEventListener(
        "blur",
        () => {

            setTimeout(
                () => {

                    document.documentElement
                        .style
                        .setProperty(
                            "--keyboard-height",
                            "0px"
                        );

                },
                200
            );

        }
    );

}


// ========================================
// BACK BUTTON (MOBILE)
// ========================================

if (backButton) {

    backButton.addEventListener(
        "click",
        () => {

            selectedUser = null;

            if (unsubscribeMessages) {
                unsubscribeMessages();
                unsubscribeMessages = null;
            }

            if (unsubscribeSelectedUser) {
                unsubscribeSelectedUser();
                unsubscribeSelectedUser = null;
            }

            if (chatContainer) {
                chatContainer.style.display = "none";
            }

            if (welcomeScreen) {
                welcomeScreen.style.display = "flex";
            }

            const chatApp =
                document.querySelector(".chat-app");

            if (chatApp) {
                chatApp.classList.remove("chat-open");
            }

            // Clear active state in user list
            renderUsers();

        }
    );

}


// ========================================
// LOGOUT
// ========================================

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async () => {

            try {

                // Mark offline before signing out
                await setUserOnline(false);

                if (presenceInterval) {
                    clearInterval(presenceInterval);
                    presenceInterval = null;
                }

                if (unsubscribeMessages) {
                    unsubscribeMessages();
                }

                if (unsubscribeUsers) {
                    unsubscribeUsers();
                }

                if (unsubscribeChats) {
                    unsubscribeChats();
                }

                if (unsubscribeSelectedUser) {
                    unsubscribeSelectedUser();
                }

                await signOut(auth);

                window.location.href = "index.html";

            } catch (error) {

                console.error(
                    "Logout error:",
                    error
                );


                alert(
                    "Could not log out. Please try again."
                );

            }

        }
    );

}


// ========================================
// HELPERS
// ========================================

function getTimestamp(timestamp) {

    if (!timestamp) {
        return 0;
    }

    try {

        return timestamp.toMillis();

    } catch {

        return 0;

    }

}


function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}
