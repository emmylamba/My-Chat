// ========================================
// FIREBASE IMPORTS
// ========================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    updateProfile,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    setDoc,
    serverTimestamp
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

const container =
    document.getElementById("container");

const registerButton =
    document.getElementById("register");

const loginButton =
    document.getElementById("login");

const loginForm =
    document.getElementById("loginForm");

const registerForm =
    document.getElementById("registerForm");

const forgotPassword =
    document.getElementById("forgotPassword");


// ========================================
// SHOW REGISTER
// ========================================

if (registerButton) {

    registerButton.addEventListener(
        "click",
        () => {

            if (container) {

                container.classList.add(
                    "register-mode"
                );

            }

        }
    );

}


// ========================================
// SHOW LOGIN
// ========================================

if (loginButton) {

    loginButton.addEventListener(
        "click",
        () => {

            if (container) {

                container.classList.remove(
                    "register-mode"
                );

            }

        }
    );

}


// ========================================
// REGISTER
// ========================================

if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            const usernameInput =
                document.getElementById(
                    "registerUsername"
                );

            const emailInput =
                document.getElementById(
                    "registerEmail"
                );

            const passwordInput =
                document.getElementById(
                    "registerPassword"
                );

            const username =
                usernameInput
                    ? usernameInput.value.trim()
                    : "";

            const email =
                emailInput
                    ? emailInput.value.trim()
                    : "";

            const password =
                passwordInput
                    ? passwordInput.value
                    : "";


            if (!username) {

                alert(
                    "Please enter a username."
                );

                return;

            }


            if (!email) {

                alert(
                    "Please enter your email."
                );

                return;

            }


            if (password.length < 6) {

                alert(
                    "Password must be at least 6 characters."
                );

                return;

            }


            try {

                // CREATE ACCOUNT

                const userCredential =
                    await createUserWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                const user =
                    userCredential.user;


                // SAVE USERNAME TO FIREBASE AUTH

                await updateProfile(
                    user,
                    {
                        displayName:
                            username
                    }
                );


                // SAVE USER TO FIRESTORE

                await setDoc(
                    doc(
                        db,
                        "users",
                        user.uid
                    ),
                    {
                        uid:
                            user.uid,

                        username:
                            username,

                        email:
                            email,

                        createdAt:
                            serverTimestamp()
                    }
                );


                // SEND EMAIL VERIFICATION

                await sendEmailVerification(
                    user
                );


                alert(
                    "Registration successful! " +
                    "A verification email has been sent " +
                    "to your email address."
                );


                registerForm.reset();


                // GO TO HOME PAGE

                window.location.href =
                    "home.html";


            } catch (error) {

                console.error(
                    "Registration error:",
                    error
                );


                if (
                    error.code ===
                    "auth/email-already-in-use"
                ) {

                    alert(
                        "This email is already registered."
                    );

                }

                else if (
                    error.code ===
                    "auth/invalid-email"
                ) {

                    alert(
                        "Please enter a valid email address."
                    );

                }

                else if (
                    error.code ===
                    "auth/weak-password"
                ) {

                    alert(
                        "Password must be at least 6 characters."
                    );

                }

                else {

                    alert(
                        error.message
                    );

                }

            }

        }
    );

}


// ========================================
// LOGIN
// ========================================

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            const emailInput =
                document.getElementById(
                    "loginEmail"
                );

            const passwordInput =
                document.getElementById(
                    "loginPassword"
                );

            const email =
                emailInput
                    ? emailInput.value.trim()
                    : "";

            const password =
                passwordInput
                    ? passwordInput.value
                    : "";


            if (!email || !password) {

                alert(
                    "Please enter your email and password."
                );

                return;

            }


            try {

                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


                window.location.href =
                    "home.html";


            } catch (error) {

                console.error(
                    "Login error:",
                    error
                );


                if (
                    error.code ===
                    "auth/invalid-credential"
                ) {

                    alert(
                        "Incorrect email or password."
                    );

                }

                else if (
                    error.code ===
                    "auth/user-not-found"
                ) {

                    alert(
                        "No account was found with this email."
                    );

                }

                else if (
                    error.code ===
                    "auth/wrong-password"
                ) {

                    alert(
                        "Incorrect password."
                    );

                }

                else {

                    alert(
                        error.message
                    );

                }

            }

        }
    );

}


// ========================================
// FORGOT PASSWORD
// ========================================

if (forgotPassword) {

    forgotPassword.addEventListener(
        "click",
        async (event) => {

            event.preventDefault();

            const email =
                prompt(
                    "Enter your email address:"
                );


            if (!email) {
                return;
            }


            try {

                await sendPasswordResetEmail(
                    auth,
                    email.trim()
                );


                alert(
                    "Password reset email sent. " +
                    "Check your inbox."
                );


            } catch (error) {

                console.error(
                    "Password reset error:",
                    error
                );


                alert(
                    error.message
                );

            }

        }
    );

}