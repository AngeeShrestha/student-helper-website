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
const isProfileView = page === "profile";
const isProfileEdit = page === "edit-profile";
const publicPages = new Set(["home", "login", "register"]);

// -------------------- AUTH GUARD --------------------
auth.onAuthStateChanged(async user => {
  if (!user && !publicPages.has(page)) {
    window.location.replace("login.html");
    return;
  }

  if (user && (page === "login" || page === "register")) {
    window.location.replace("dashboard.html");
    return;
  }

  document.body.classList.add("auth-ready");
  if (!user) return;

  const userRef = db.ref("users/" + user.uid);
  const snapshot = await userRef.once("value");

  if (!snapshot.exists()) {
    await userRef.set({
      name: "",
      email: user.email,
      grade: "",
      phone: "",
      completed: false,
      createdAt: Date.now()
    });

    window.location.replace("edit-profile.html");
    return;
  }

  const profile = snapshot.val();

  const userPill = document.getElementById("user-pill");
  if (userPill) {
    userPill.textContent = profile.name || user.email;
  }

  const welcomeText = document.getElementById("welcome-text");
  if (welcomeText) {
    welcomeText.textContent = `Welcome back, ${profile.name || user.email}`;
  }

  if (!profile.completed && page !== "edit-profile") {
    window.location.replace("edit-profile.html");
    return;
  }

  if (page === "dashboard") {
    loadTasks(user.uid);
  }

  if (isProfileView || isProfileEdit) {
    loadProfile(user.uid);
  }

  if (isProfileView) {
    loadTaskStats(user.uid);
  }
});

// -------------------- SIGN OUT --------------------
const signOutBtn = document.getElementById("sign-out");
if (signOutBtn) {
  signOutBtn.addEventListener("click", async () => {
    await auth.signOut();
    window.location.replace("login.html");
  });
}

// -------------------- AUTH FORMS --------------------
const authStatus = document.getElementById("auth-status");
const authForm = document.getElementById("auth-form");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const signUpBtn = document.getElementById("sign-up");

if (authForm && page === "login") {
  authForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!authEmail || !authPassword) return;

    const email = authEmail.value.trim();
    const password = authPassword.value;
    if (authStatus) authStatus.textContent = "Signing in...";

    try {
      await auth.signInWithEmailAndPassword(email, password);
      if (authStatus) authStatus.textContent = "Sign in successful. Redirecting...";
    } catch (error) {
      if (authStatus) authStatus.textContent = error.message;
    }
  });
}

if (signUpBtn && page === "login") {
  signUpBtn.addEventListener("click", () => {
    window.location.href = "register.html";
  });
}

const registerForm = document.getElementById("register-form");
const registerName = document.getElementById("register-name");
const registerEmail = document.getElementById("register-email");
const registerPassword = document.getElementById("register-password");
const registerConfirmPassword = document.getElementById("register-confirm-password");

if (registerForm && page === "register") {
  registerForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!registerEmail || !registerPassword || !registerConfirmPassword) return;

    const name = registerName ? registerName.value.trim() : "";
    const email = registerEmail.value.trim();
    const password = registerPassword.value;
    const confirmPassword = registerConfirmPassword.value;

    if (password !== confirmPassword) {
      if (authStatus) authStatus.textContent = "Passwords do not match.";
      return;
    }

    if (authStatus) authStatus.textContent = "Creating account...";

    try {
      const credentials = await auth.createUserWithEmailAndPassword(email, password);
      const user = credentials.user;
      if (!user) throw new Error("Unable to create user.");

      await db.ref("users/" + user.uid).set({
        name,
        email: user.email,
        grade: "",
        phone: "",
        completed: false,
        createdAt: Date.now()
      });

      window.location.replace("edit-profile.html");
    } catch (error) {
      if (authStatus) authStatus.textContent = error.message;
    }
  });
}

// -------------------- TASK LIST --------------------
function loadTasks(uid) {
  const taskList = document.getElementById("task-list");
  if (!taskList) return;

  const ref = db.ref("tasks/" + uid);

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
        <td>${task.deadline || "-"}</td>
        <td>${task.notes || "-"}</td>
        <td>${task.status}</td>
        <td>
          <button onclick="toggleTask('${uid}','${id}')">Toggle</button>
          <button onclick="deleteTask('${uid}','${id}')">Delete</button>
        </td>
      `;
      taskList.appendChild(row);
    });
  });
}

function toggleTask(uid, id) {
  const ref = db.ref(`tasks/${uid}/${id}/status`);
  ref.once("value").then(snapshot => {
    ref.set(snapshot.val() === "Open" ? "Done" : "Open");
  });
}

function deleteTask(uid, id) {
  db.ref(`tasks/${uid}/${id}`).remove();
}

const taskForm = document.getElementById("task-form");
if (taskForm && page === "dashboard") {
  taskForm.addEventListener("submit", async event => {
    event.preventDefault();

    const user = auth.currentUser;
    if (!user) return;

    const titleInput = document.getElementById("task-title");
    const deadlineInput = document.getElementById("task-deadline");
    const notesInput = document.getElementById("task-notes");
    if (!titleInput || !deadlineInput || !notesInput) return;

    const title = titleInput.value.trim();
    if (!title) return;

    try {
      await db.ref(`tasks/${user.uid}`).push({
        title,
        deadline: deadlineInput.value || "",
        notes: notesInput.value.trim(),
        status: "Open",
        createdAt: Date.now()
      });
      taskForm.reset();
      if (authStatus) authStatus.textContent = "Task added.";
    } catch (error) {
      if (authStatus) authStatus.textContent = error.message;
    }
  });
}

// -------------------- PROFILE LOAD --------------------
function loadProfile(uid) {
  const ref = db.ref("users/" + uid);

  ref.on("value", snapshot => {
    const data = snapshot.val();
    if (!data) return;

    const user = auth.currentUser;
    if (!user) return;

    if (isProfileView) {
      document.getElementById("view-name").textContent = data.name || "-";
      document.getElementById("view-email").textContent = data.email || "-";
      document.getElementById("view-grade").textContent = data.grade || "-";
      document.getElementById("view-phone").textContent = data.phone || "-";
      document.getElementById("view-uid").textContent = uid;

      const badge = document.getElementById("email-badge");
      if (badge) {
        badge.textContent = user.emailVerified ? "Verified" : "Not Verified";
        badge.className = user.emailVerified ? "badge success" : "badge danger";
      }

      const memberSince = document.getElementById("member-since");
      const lastLogin = document.getElementById("last-login");

      if (memberSince) {
        memberSince.textContent = new Date(user.metadata.creationTime).toLocaleDateString();
      }
      if (lastLogin) {
        lastLogin.textContent = new Date(user.metadata.lastSignInTime).toLocaleDateString();
      }
    }

    if (isProfileEdit) {
      document.getElementById("profile-name").value = data.name || "";
      document.getElementById("profile-email").value = data.email || "";
      document.getElementById("profile-grade").value = data.grade || "";
      document.getElementById("profile-phone").value = data.phone || "";
    }
  });
}

const profileForm = document.getElementById("profile-form");
if (profileForm && isProfileEdit) {
  profileForm.addEventListener("submit", async event => {
    event.preventDefault();

    const user = auth.currentUser;
    if (!user) return;

    const nameInput = document.getElementById("profile-name");
    const gradeInput = document.getElementById("profile-grade");
    const phoneInput = document.getElementById("profile-phone");
    if (!nameInput || !gradeInput || !phoneInput) return;

    const name = nameInput.value.trim();
    const grade = gradeInput.value.trim();
    const phone = phoneInput.value.trim();

    try {
      await db.ref(`users/${user.uid}`).update({
        name,
        grade,
        phone,
        completed: Boolean(name)
      });
      window.location.replace("profile.html");
    } catch (error) {
      if (authStatus) authStatus.textContent = error.message;
    }
  });
}

// -------------------- TASK STATS --------------------
function loadTaskStats(uid) {
  const ref = db.ref("tasks/" + uid);

  ref.on("value", snapshot => {
    const data = snapshot.val();
    let total = 0;
    let open = 0;
    let done = 0;

    if (data) {
      Object.values(data).forEach(task => {
        total += 1;
        if (task.status === "Open") open += 1;
        if (task.status === "Done") done += 1;
      });
    }

    const totalEl = document.getElementById("stat-total");
    const openEl = document.getElementById("stat-open");
    const doneEl = document.getElementById("stat-done");

    if (totalEl) totalEl.textContent = total;
    if (openEl) openEl.textContent = open;
    if (doneEl) doneEl.textContent = done;
  });
}
