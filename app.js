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

// -------------------- DOM --------------------
const page = document.body.dataset.page;

const authForm = document.getElementById("auth-form");
const emailInput = document.getElementById("auth-email");
const passwordInput = document.getElementById("auth-password");
const signUpBtn = document.getElementById("sign-up");
const signOutBtn = document.getElementById("sign-out");
const statusText = document.getElementById("auth-status");

const taskForm = document.getElementById("task-form");
const taskList = document.getElementById("task-list");
const titleInput = document.getElementById("task-title");
const deadlineInput = document.getElementById("task-deadline");
const notesInput = document.getElementById("task-notes");

// -------------------- AUTH --------------------
auth.onAuthStateChanged(user => {
  if (page === "dashboard") {
    if (!user) {
      window.location.href = "login.html";
    } else {
      loadTasks(user.uid);
    }
  }
});

// -------------------- LOGIN --------------------
if (authForm) {
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await auth.signInWithEmailAndPassword(
        emailInput.value,
        passwordInput.value
      );
      window.location.href = "dashboard.html";
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
      statusText.textContent = "Account created. You can sign in now.";
    } catch (err) {
      statusText.textContent = err.message;
    }
  });
}

// -------------------- SIGN OUT --------------------
if (signOutBtn) {
  signOutBtn.addEventListener("click", async () => {
    await auth.signOut();
    window.location.href = "login.html";
  });
}

// -------------------- TASKS --------------------
function loadTasks(uid) {
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
if (taskForm) {
  taskForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    await db.ref(`tasks/${user.uid}`).push({
      title: titleInput.value,
      deadline: deadlineInput.value,
      notes: notesInput.value,
      status: "Open",
      createdAt: Date.now()
    });

    taskForm.reset();
  });
}

// -------------------- TASK ACTIONS --------------------
if (taskList) {
  taskList.addEventListener("click", async (e) => {
    if (!(e.target instanceof HTMLButtonElement)) return;

    const user = auth.currentUser;
    if (!user) return;

    const id = e.target.dataset.id;
    const action = e.target.dataset.action;
    const ref = db.ref(`tasks/${user.uid}/${id}`);

    if (action === "delete") {
      await ref.remove();
    }

    if (action === "toggle") {
      const snap = await ref.get();
      const next = snap.val().status === "Open" ? "Completed" : "Open";
      await ref.update({ status: next });
    }
  });
}
