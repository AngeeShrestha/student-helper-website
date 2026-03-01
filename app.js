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

  if (!user && page !== "login") {
    window.location.replace("login.html");
    return;
  }

  if (user && page === "login") {
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

  if (!profile.completed && page !== "edit-profile") {
    window.location.replace("edit-profile.html");
    return;
  }

  // Dashboard task list
  if (page === "dashboard") {
    loadTasks(user.uid);
  }

  // Profile pages
  if (isProfileView || isProfileEdit) {
    loadProfile(user.uid);
  }

  // ✅ Attach statistics listener ONCE (proper place)
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

// -------------------- TASK LIST (Dashboard) --------------------
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

// -------------------- PROFILE LOAD --------------------
function loadProfile(uid) {
  const ref = db.ref("users/" + uid);

  ref.on("value", snapshot => {
    const data = snapshot.val();
    if (!data) return;

    const user = auth.currentUser;
    if (!user) return;

    if (isProfileView) {
      document.getElementById("view-name").textContent = data.name || "—";
      document.getElementById("view-email").textContent = data.email;
      document.getElementById("view-grade").textContent = data.grade || "—";
      document.getElementById("view-phone").textContent = data.phone || "—";
      document.getElementById("view-uid").textContent = uid;

      const badge = document.getElementById("email-badge");
      if (badge) {
        badge.textContent = user.emailVerified ? "Verified ✔" : "Not Verified";
        badge.className = user.emailVerified ? "badge success" : "badge danger";
      }

      const memberSince = document.getElementById("member-since");
      const lastLogin = document.getElementById("last-login");

      if (memberSince) {
        memberSince.textContent =
          new Date(user.metadata.creationTime).toLocaleDateString();
      }

      if (lastLogin) {
        lastLogin.textContent =
          new Date(user.metadata.lastSignInTime).toLocaleDateString();
      }
    }

    if (isProfileEdit) {
      document.getElementById("profile-name").value = data.name || "";
      document.getElementById("profile-email").value = data.email;
      document.getElementById("profile-grade").value = data.grade || "";
      document.getElementById("profile-phone").value = data.phone || "";
    }
  });
}

// -------------------- ✅ TASK STATISTICS (Proper Real-Time Version) --------------------
function loadTaskStats(uid) {
  const ref = db.ref("tasks/" + uid);

  ref.on("value", snapshot => {
    const data = snapshot.val();

    let total = 0;
    let open = 0;
    let done = 0;

    if (data) {
      Object.values(data).forEach(task => {
        total++;
        if (task.status === "Open") open++;
        if (task.status === "Done") done++;
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