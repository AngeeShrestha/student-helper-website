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

// -------------------- AUTH GUARD --------------------
auth.onAuthStateChanged(async user => {

  // ❌ Not logged in
  if (!user && page !== "login") {
    window.location.replace("login.html");
    return;
  }

  // ❌ Logged in but trying login page
  if (user && page === "login") {
    window.location.replace("dashboard.html");
    return;
  }

  document.body.classList.add("auth-ready");
  if (!user) return;

  // ---------------- PROFILE CHECK ----------------
  const userRef = db.ref("users/" + user.uid);
  const snapshot = await userRef.once("value");

  // Create profile once
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

  // ---------------- USER PILL (NAME > EMAIL) ----------------
  const userPill = document.getElementById("user-pill");
  if (userPill) {
    userPill.textContent = profile.name || user.email;
  }

  // Force completion
  if (!profile.completed && page !== "edit-profile") {
    window.location.replace("edit-profile.html");
    return;
  }

  // Load tasks
  if (page === "dashboard") {
    loadTasks(user.uid);
  }

  // Load profile
  if (isProfileView || isProfileEdit) {
    loadProfile(user.uid);
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
  authForm.addEventListener("submit", async e => {
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
        <td>${task.deadline || "—"}</td>
        <td>${task.notes || "—"}</td>
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
  ref.once("value").then(snap => {
    ref.set(snap.val() === "Open" ? "Done" : "Open");
  });
}

function deleteTask(uid, id) {
  db.ref(`tasks/${uid}/${id}`).remove();
}

// -------------------- ADD TASK --------------------
const taskForm = document.getElementById("task-form");
if (taskForm) {
  taskForm.addEventListener("submit", async e => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    await db.ref("tasks/" + user.uid).push({
      title: document.getElementById("task-title").value,
      deadline: document.getElementById("task-deadline").value,
      notes: document.getElementById("task-notes").value,
      status: "Open",
      createdAt: Date.now()
    });

    taskForm.reset();
  });
}

// -------------------- PROFILE LOAD --------------------
function loadProfile(uid) {
  const ref = db.ref("users/" + uid);

  ref.on("value", snapshot => {
    const data = snapshot.val();
    if (!data) return;

    if (isProfileView) {
      document.getElementById("view-name").textContent = data.name || "—";
      document.getElementById("view-email").textContent = data.email;
      document.getElementById("view-grade").textContent = data.grade || "—";
      document.getElementById("view-phone").textContent = data.phone || "—";
      document.getElementById("view-uid").textContent = uid;
    }

    if (isProfileEdit) {
      document.getElementById("profile-name").value = data.name || "";
      document.getElementById("profile-email").value = data.email;
      document.getElementById("profile-grade").value = data.grade || "";
      document.getElementById("profile-phone").value = data.phone || "";
    }
  });
}

// -------------------- PROFILE SAVE --------------------
const profileForm = document.getElementById("profile-form");
const profileStatus = document.getElementById("profile-status");

if (profileForm) {
  profileForm.addEventListener("submit", async e => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    await db.ref("users/" + user.uid).update({
      name: document.getElementById("profile-name").value,
      grade: document.getElementById("profile-grade").value,
      phone: document.getElementById("profile-phone").value,
      completed: true,
      updatedAt: Date.now()
    });

    // ✅ Redirect after save
    window.location.replace("dashboard.html");
  });
}
