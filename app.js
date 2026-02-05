const firebaseConfig = {
  apiKey: "AIzaSyDrBNWO9jFvNFFbva4pJZl_Eh8AQ0-ETsk",
  authDomain: "student-helper-website-35df9.firebaseapp.com",
  projectId: "student-helper-website-35df9",
  storageBucket: "student-helper-website-35df9.firebasestorage.app",
  messagingSenderId: "993995737156",
  appId: "1:993995737156:web:662eedbde80e1880505411",
  measurementId: "G-D0MZ6ZXGPV"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

const authForm = document.getElementById("auth-form");
const signUpButton = document.getElementById("sign-up");
const signOutButton = document.getElementById("sign-out");
const authStatus = document.getElementById("auth-status");
const userPill = document.getElementById("user-pill");

const taskForm = document.getElementById("task-form");
const taskList = document.getElementById("task-list");

const titleInput = document.getElementById("task-title");
const deadlineInput = document.getElementById("task-deadline");
const notesInput = document.getElementById("task-notes");

const profileName = document.getElementById("profile-name");
const profileEmail = document.getElementById("profile-email");
const profileUid = document.getElementById("profile-uid");
const statTotal = document.getElementById("stat-total");
const statOpen = document.getElementById("stat-open");
const statCompleted = document.getElementById("stat-completed");

const pageType = document.body.dataset.page;
const requiresAuth = document.body.dataset.requiresAuth === "true";

let unsubscribeTasks = null;

const showStatus = (message, tone = "") => {
  if (!authStatus) return;
  authStatus.textContent = message;
  authStatus.style.color = tone === "success" ? "var(--success)" : "";
};

const renderEmptyState = (message) => {
  if (!taskList) return;
  taskList.innerHTML = `<tr><td colspan="5" class="empty">${message}</td></tr>`;
};

const renderTasks = (tasks) => {
  if (!taskList) return;
  if (tasks.length === 0) {
    renderEmptyState("No tasks yet. Add your first study task above.");
    return;
  }

  taskList.innerHTML = "";
  tasks.forEach((task) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${task.title}</td>
      <td>${task.deadline || "—"}</td>
      <td>${task.notes || "—"}</td>
      <td>${task.status}</td>
      <td>
        <div class="action-buttons">
          <button type="button" class="secondary" data-action="toggle" data-id="${task.id}">
            ${task.status === "Open" ? "Complete" : "Reopen"}
          </button>
          <button type="button" class="secondary" data-action="edit" data-id="${task.id}">
            Edit
          </button>
          <button type="button" class="danger" data-action="delete" data-id="${task.id}">
            Delete
          </button>
        </div>
      </td>
    `;
    taskList.appendChild(row);
  });
};

const subscribeToTasks = (userId) => {
  if (unsubscribeTasks) {
    unsubscribeTasks();
  }

  unsubscribeTasks = db
    .collection("tasks")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .onSnapshot((snapshot) => {
      const tasks = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      renderTasks(tasks);
      updateStats(tasks);
    });
};

const resetForm = () => {
  if (!titleInput || !deadlineInput || !notesInput) return;
  titleInput.value = "";
  deadlineInput.value = "";
  notesInput.value = "";
};

const ensureAuth = () => {
  const user = auth.currentUser;
  if (!user) {
    renderEmptyState("Sign in to load your tasks.");
    return null;
  }
  return user;
};

const updateStats = (tasks) => {
  if (!statTotal || !statOpen || !statCompleted) return;
  const total = tasks.length;
  const open = tasks.filter((task) => task.status === "Open").length;
  const completed = tasks.filter((task) => task.status === "Completed").length;
  statTotal.textContent = total;
  statOpen.textContent = open;
  statCompleted.textContent = completed;
};

const updateProfile = (user) => {
  if (!user) return;
  if (userPill) userPill.textContent = user.email;
  if (profileName) profileName.textContent = user.displayName || "Student";
  if (profileEmail) profileEmail.textContent = user.email;
  if (profileUid) profileUid.textContent = user.uid;
};

if (authForm) {
  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("auth-email").value;
    const password = document.getElementById("auth-password").value;

    try {
      await auth.signInWithEmailAndPassword(email, password);
      showStatus("Signed in successfully.", "success");
    } catch (error) {
      showStatus(error.message);
    }
  });
}

if (signUpButton) {
  signUpButton.addEventListener("click", async () => {
    const email = document.getElementById("auth-email").value;
    const password = document.getElementById("auth-password").value;

    try {
      await auth.createUserWithEmailAndPassword(email, password);
      showStatus("Account created. You're signed in!", "success");
    } catch (error) {
      showStatus(error.message);
    }
  });
}

if (signOutButton) {
  signOutButton.addEventListener("click", async () => {
    try {
      await auth.signOut();
      showStatus("Signed out.");
      if (pageType !== "login") {
        window.location.href = "login.html";
      }
    } catch (error) {
      showStatus(error.message);
    }
  });
}

auth.onAuthStateChanged((user) => {
  if (user) {
    updateProfile(user);
    if (pageType === "login") {
      window.location.href = "dashboard.html";
      return;
    }
    if (taskList) {
      subscribeToTasks(user.uid);
    }
    showStatus("Signed in.", "success");
  } else {
    if (userPill) userPill.textContent = "Guest";
    if (unsubscribeTasks) {
      unsubscribeTasks();
      unsubscribeTasks = null;
    }
    if (taskList) {
      renderEmptyState("Sign in to load your tasks.");
    }
    showStatus("Not signed in.");
    if (requiresAuth) {
      window.location.href = "login.html";
    }
  }
});

if (taskForm) {
  taskForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = ensureAuth();
    if (!user) return;

    const payload = {
      title: titleInput.value.trim(),
      deadline: deadlineInput.value,
      notes: notesInput.value.trim(),
      status: "Open",
      userId: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    if (!payload.title) {
      showStatus("Task title is required.");
      return;
    }

    try {
      await db.collection("tasks").add(payload);
      resetForm();
      showStatus("Task added.", "success");
    } catch (error) {
      showStatus(error.message);
    }
  });
}

if (taskList) {
  taskList.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;

    const { action, id } = target.dataset;
    if (!action || !id) return;

    const user = ensureAuth();
    if (!user) return;

    const docRef = db.collection("tasks").doc(id);

    try {
      if (action === "delete") {
        await docRef.delete();
        showStatus("Task deleted.", "success");
        return;
      }

      if (action === "toggle") {
        const doc = await docRef.get();
        if (!doc.exists) return;
        const nextStatus = doc.data().status === "Open" ? "Completed" : "Open";
        await docRef.update({ status: nextStatus });
        showStatus("Task updated.", "success");
        return;
      }

      if (action === "edit") {
        const title = prompt("Update the task title:");
        if (!title) return;
        const notes = prompt("Update notes (optional):");
        await docRef.update({ title, notes });
        showStatus("Task updated.", "success");
      }
    } catch (error) {
      showStatus(error.message);
    }
  });
}
