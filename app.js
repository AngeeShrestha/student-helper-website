// -------------------- Firebase Config --------------------
const firebaseConfig = {
  apiKey: "AIzaSyDrBNWO9jFvNFFbva4pJZl_Eh8AQ0-ETsk",
  authDomain: "student-helper-website-35df9.firebaseapp.com",
  projectId: "student-helper-website-35df9",
  storageBucket: "student-helper-website-35df9.firebasestorage.app",
  messagingSenderId: "993995737156",
  appId: "1:993995737156:web:662eedbde80e1880505411"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.database();

auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// -------------------- PAGE INFO --------------------
const page = document.body.dataset.page;

// -------------------- AUTH GUARD (GLOBAL) --------------------
auth.onAuthStateChanged(user => {
  // ❌ Not logged in → block everything except login
  if (!user && page !== "login") {
    window.location.replace("login.html");
    return;
  }

  // ✅ Logged in → never allow login page
  if (user && page === "login") {
    window.location.replace("dashboard.html");
    return;
  }

  // Show page ONLY after auth confirmed
  document.body.classList.add("auth-ready");

  // Show user email (no guest)
  const userPill = document.getElementById("user-pill");
  if (user && userPill) {
    userPill.textContent = user.email;
  }

  // Load tasks only where needed
  if (user && page === "dashboard") {
    loadTasks(user.uid);
  }

  if (user && page === "profile") {
    document.getElementById("profile-email").textContent = user.email;
    document.getElementById("profile-uid").textContent = user.uid;
  }
});

// -------------------- LOGIN --------------------
const authForm = document.getElementById("auth-form");
const emailInput = document.getElementById("auth-email");
const passwordInput = document.getElementById("auth-password");
const signUpBtn = document.getElementById("sign-up");
const signOutBtn = document.getElementById("sign-out");
const statusText = document.getElementById("auth-status");

if (authForm) {
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await auth.signInWithEmailAndPassword(
        emailInput.value,
        passwordInput.value
      );
      window.location.replace("dashboard.html");
    } catch (err) {
      statusText.textContent = err.message;
    }
  });
}

if (signUpBtn) {
  signUpBtn.addEventListener("click", async () => {
    try {
      await auth.createUserWithEmailAndPassword(
        emailInput.value,
        passwordInput.value
      );
      statusText.textContent = "Account created. Please sign in.";
    } catch (err) {
      statusText.textContent = err.message;
    }
  });
}

// -------------------- SIGN OUT --------------------
if (signOutBtn) {
  signOutBtn.addEventListener("click", async () => {
    await auth.signOut();
    window.location.replace("login.html");
  });
}

// -------------------- TASKS --------------------
function loadTasks(uid) {
  const taskList = document.getElementById("task-list");
  const ref = db.ref(`tasks/${uid}`);

  ref.on("value", snapshot => {
    const data = snapshot.val();
    taskList.innerHTML = "";

    if (!data) {
      taskList.innerHTML = `<tr><td colspan="5">No tasks yet</td></tr>`;
      return;
    }

    Object.entries(data).forEach(([id, task]) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${task.title}</td>
        <td>${task.deadline || "—"}</td>
        <td>${task.notes || "—"}</td>
        <td>${task.status}</td>
        <td>
          <button data-id="${id}" data-action="toggle">Toggle</button>
          <button data-id="${id}" data-action="delete">Delete</button>
        </td>
      `;
      taskList.appendChild(row);
    });
  });
}

// -------------------- ADD TASK --------------------
const taskForm = document.getElementById("task-form");
if (taskForm) {
  taskForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    await db.ref(`tasks/${user.uid}`).push({
      title: document.getElementById("task-title").value,
      deadline: document.getElementById("task-deadline").value,
      notes: document.getElementById("task-notes").value,
      status: "Open",
      createdAt: Date.now()
    });

    taskForm.reset();
  });
}
