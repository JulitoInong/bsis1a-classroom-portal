// ========================================
// GOOGLE AUTH
// ========================================

const googleSignInBtn = document.getElementById("googleSignInBtn");
const googleSignOutBtn = document.getElementById("googleSignOutBtn");
const googleAuthTitle = document.getElementById("googleAuthTitle");
const googleAuthText = document.getElementById("googleAuthText");
const googleProfile = document.getElementById("googleProfile");
const googleAvatar = document.getElementById("googleAvatar");
const googleProfileName = document.getElementById("googleProfileName");
const googleProfileEmail = document.getElementById("googleProfileEmail");

let currentAuthUser = null;
let currentAvatarUrl = null;

if (googleSignInBtn) {
    googleSignInBtn.addEventListener("click", signInWithGoogle);
}

if (googleSignOutBtn) {
    googleSignOutBtn.addEventListener("click", signOutGoogle);
}

async function signInWithGoogle() {
    setGoogleLoading(true);
    clearAuthMessage();

    const redirectTo = window.location.href.split("#")[0].split("?")[0];

    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo
        }
    });

    if (error) {
        console.error("Google sign-in error:", error);
        setGoogleLoading(false);
        showMessage("Google sign-in could not be started. Please try again.", "error");
    }
}

async function signOutGoogle() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Google sign-out error:", error);
        showMessage("Could not sign out. Please try again.", "error");
        return;
    }

    applyAuthUser(null);
}

async function handleAuthSession(session) {
    const user = session?.user || null;
    applyAuthUser(user);

    if (user && !form?.dataset.submitting) {
        const metadata = user.user_metadata || {};
        const email = user.email || "";
        const name = metadata.full_name || metadata.name || "";

        if (name && !fullNameInput.value.trim()) {
            fullNameInput.value = name;
        }

        if (email && !gmailInput.value.trim()) {
            gmailInput.value = email;
        }

        showMessage("Google account connected. Complete your Student No. and birthday, then submit.", "success");
    }
}

function applyAuthUser(user) {
    currentAuthUser = user;
    currentAvatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

    if (!googleSignInBtn || !googleSignOutBtn) return;

    const connected = Boolean(user);

    googleSignInBtn.hidden = connected;
    googleSignOutBtn.hidden = !connected;

    if (connected) {
        googleAuthTitle.textContent = "Google account connected";
        googleAuthText.textContent = "Your Google name and Gmail can be used for this student profile.";
        googleProfile.hidden = false;
        googleProfileName.textContent =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            "Google account";
        googleProfileEmail.textContent = user.email || "No email returned";

        if (currentAvatarUrl) {
            googleAvatar.src = currentAvatarUrl;
            googleAvatar.alt = `${googleProfileName.textContent} profile photo`;
            googleAvatar.hidden = false;
        } else {
            googleAvatar.hidden = true;
        }
    } else {
        googleAuthTitle.textContent = "Sign in with Google";
        googleAuthText.textContent = "Use your Google account to securely connect your student profile.";
        googleProfile.hidden = true;
        googleAvatar.hidden = true;
    }

    setGoogleLoading(false);
}

function setGoogleLoading(isLoading) {
    if (!googleSignInBtn) return;
    googleSignInBtn.disabled = isLoading;
    googleSignInBtn.classList.toggle("loading", isLoading);
}

function clearAuthMessage() {
    if (!message) return;
    message.className = "message";
    message.textContent = "";
}

(async function initializeGoogleAuth() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        console.error("Unable to read Supabase Auth session:", error);
        return;
    }

    await handleAuthSession(data.session);

    supabaseClient.auth.onAuthStateChange((_event, session) => {
        handleAuthSession(session);
    });
})();

// ========================================
// ELEMENTS
// ========================================

const form = document.getElementById("studentForm");
const studentNoInput = document.getElementById("studentNo");
const fullNameInput = document.getElementById("fullName");
const birthdayInput = document.getElementById("birthday");
const gmailInput = document.getElementById("gmail");
const submitBtn = document.getElementById("submitBtn");
const message = document.getElementById("message");
const submissionStatus = document.getElementById("submissionStatus");

// ========================================
// FORM SUBMISSION
// ========================================

if (form) {
    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const studentNo = cleanStudentNo(studentNoInput.value);
        const name = cleanName(fullNameInput.value);
        const birthday = birthdayInput.value;
        const gmail = cleanGmail(gmailInput.value);
        const normalizedName = normalizeName(name);

        const nameWords = name.split(" ").filter(Boolean);

        if (!studentNo) {
            showMessage("Please enter your Student No.", "error");
            studentNoInput.focus();
            return;
        }

        if (!name) {
            showMessage("Please enter your full name.", "error");
            fullNameInput.focus();
            return;
        }

        if (nameWords.length < 2) {
            showMessage("Please enter your complete name.", "error");
            fullNameInput.focus();
            return;
        }

        if (!birthday) {
            showMessage("Please enter your birthday.", "error");
            birthdayInput.focus();
            return;
        }

        if (isFutureDate(birthday)) {
            showMessage("Birthday cannot be a future date.", "error");
            birthdayInput.focus();
            return;
        }

        if (!isValidGmail(gmail)) {
            showMessage("Please enter a valid Gmail address.", "error");
            gmailInput.focus();
            return;
        }

        setLoading(true);
        form.dataset.submitting = "true";

        try {
            // Check the three identifiers before insert for clearer messages.
            const [studentNoResult, gmailResult, nameResult] = await Promise.all([
                supabaseClient
                    .from("students")
                    .select("id")
                    .eq("student_no", studentNo)
                    .limit(1),
                supabaseClient
                    .from("students")
                    .select("id")
                    .ilike("gmail", gmail)
                    .limit(1),
                supabaseClient
                    .from("students")
                    .select("id")
                    .eq("normalized_name", normalizedName)
                    .limit(1)
            ]);

            if (studentNoResult.error || gmailResult.error || nameResult.error) {
                console.error(
                    studentNoResult.error,
                    gmailResult.error,
                    nameResult.error
                );
                showMessage("We could not verify the information. Please try again.", "error");
                return;
            }

            if (studentNoResult.data?.length) {
                showMessage("This Student No. has already been submitted.", "error");
                studentNoInput.focus();
                return;
            }

            if (gmailResult.data?.length) {
                showMessage("This Gmail address has already been submitted.", "error");
                gmailInput.focus();
                return;
            }

            if (nameResult.data?.length) {
                showMessage("This name has already been submitted.", "error");
                fullNameInput.focus();
                return;
            }

            const { error: insertError } = await supabaseClient
                .from("students")
                .insert({
                    student_no: studentNo,
                    full_name: name,
                    birthday,
                    gmail,
                    normalized_name: normalizedName,
                    auth_user_id: currentAuthUser?.id || null,
                    avatar_url: currentAvatarUrl || null
                });

            if (insertError) {
                console.error(insertError);

                // Database unique indexes remain the final duplicate safeguard.
                if (insertError.code === "23505") {
                    showMessage("A student record with the same Student No., Gmail, or name already exists.", "error");
                } else {
                    showMessage("Something went wrong while submitting. Please try again.", "error");
                }

                return;
            }

            form.reset();
            showSubmissionSuccess();
        } finally {
            setLoading(false);
            delete form.dataset.submitting;
        }
    });
}

// ========================================
// HELPERS
// ========================================

function cleanStudentNo(value) {
    return value.trim().replace(/\s+/g, " ");
}

function cleanName(value) {
    return value.trim().replace(/\s+/g, " ");
}

function normalizeName(value) {
    // Case, punctuation, and repeated spaces are normalized.
    // Words themselves are not altered, so "D. Cruz" and "Dela Cruz"
    // remain different names.
    return value
        .toLowerCase()
        .normalize("NFKC")
        .replace(/[.,/#!$%^&*;:{}=_`~()\-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function cleanGmail(value) {
    return value.trim().toLowerCase();
}

function isValidGmail(value) {
    return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@gmail\.com$/.test(value);
}

function isFutureDate(value) {
    const selected = new Date(`${value}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selected > today;
}

function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.classList.toggle("loading", isLoading);
}

function showSubmissionSuccess() {
    if (!submissionStatus) return;

    submissionStatus.hidden = false;
    submissionStatus.classList.remove("show");

    requestAnimationFrame(() => {
        submissionStatus.classList.add("show");
    });

    submissionStatus.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}

function showMessage(text, type) {
    message.textContent = text;
    message.className = `message show ${type}`;

    clearTimeout(showMessage.timer);
    showMessage.timer = setTimeout(() => {
        message.className = "message";
    }, 4000);
}
