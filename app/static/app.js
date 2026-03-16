const API_BASE = "http://localhost:8000";

const elements = {
  loginForm: document.getElementById("login-form"),
  loginUsername: document.getElementById("login-username"),
  loginPassword: document.getElementById("login-password"),
  loginError: document.getElementById("login-error"),
  logoutBtn: document.getElementById("logout-btn"),
  userInfo: document.getElementById("user-info"),
  booksList: document.getElementById("books-list"),
  myLoans: document.getElementById("my-loans"),
  pendingReservations: document.getElementById("pending-reservations"),
  activeLoans: document.getElementById("active-loans"),
  settingsForm: document.getElementById("settings-form"),
  pickupWindow: document.getElementById("pickup-window"),
  loanDays: document.getElementById("loan-days"),
  dailyFine: document.getElementById("daily-fine"),
  settingsMessage: document.getElementById("settings-message"),
};

const getToken = () => localStorage.getItem("token");
const setToken = (token) => localStorage.setItem("token", token);
const clearToken = () => localStorage.removeItem("token");

const request = async (path, options = {}) => {
  const headers = options.headers || {};
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let detail = "Request failed";
    try {
      const data = await response.json();
      detail = data.detail || detail;
    } catch (err) {
      // ignore
    }
    throw new Error(detail);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
};

const formatDate = (value) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
};

const formatMoney = (value) => {
  const amount = Number(value || 0);
  return amount.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const refreshUI = async () => {
  elements.loginError.textContent = "";
  elements.settingsMessage.textContent = "";

  let user = null;
  try {
    user = await request("/api/auth/me");
  } catch (err) {
    elements.userInfo.textContent = "Not logged in";
    renderBooks([]);
    renderLoans([], elements.myLoans);
    renderLoans([], elements.pendingReservations);
    renderLoans([], elements.activeLoans);
    return;
  }

  elements.userInfo.textContent = `Logged in as ${user.username} (${user.role})`;
  await loadBooks(user);
  await loadLoans(user);
  if (user.role === "librarian" || user.role === "admin") {
    await loadSettings();
  }
};

const loadBooks = async (user) => {
  const books = await request("/api/books");
  renderBooks(books, user);
};

const renderBooks = (books, user = null) => {
  elements.booksList.innerHTML = "";
  if (!books.length) {
    elements.booksList.innerHTML = "<p>No books found.</p>";
    return;
  }
  books.forEach((book) => {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <strong>${book.title}</strong>
      <div>${book.author}</div>
      <div>ISBN: ${book.isbn}</div>
      <div>Status: ${book.is_available ? "Available" : "Unavailable"}</div>
    `;
    if (user?.role === "member" && book.is_available) {
      const btn = document.createElement("button");
      btn.textContent = "Reserve";
      btn.onclick = async () => {
        await request("/api/loans/reserve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ book_id: book.id }),
        });
        await refreshUI();
      };
      item.appendChild(btn);
    }
    elements.booksList.appendChild(item);
  });
};

const loadLoans = async (user) => {
  const myLoans = await request("/api/loans/my-loans");
  renderLoans(myLoans, elements.myLoans);

  if (user.role === "librarian" || user.role === "admin") {
    const allLoans = await request("/api/loans");
    renderLoans(
      allLoans.filter((loan) => loan.status === "reserved"),
      elements.pendingReservations,
      true
    );
    renderLoans(
      allLoans.filter((loan) => loan.status === "active" || loan.status === "overdue"),
      elements.activeLoans,
      true
    );
  }
};

const renderLoans = (loans, container, librarianActions = false) => {
  container.innerHTML = "";
  if (!loans.length) {
    container.innerHTML = "<p>No loans found.</p>";
    return;
  }

  loans.forEach((loan) => {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <strong>Loan #${loan.id}</strong>
      <div>Status: ${loan.status}</div>
      <div>Reserved: ${formatDate(loan.reservation_date)}</div>
      <div>Pickup by: ${formatDate(loan.pickup_deadline)}</div>
      <div>Due: ${formatDate(loan.due_date)}</div>
      <div>Fine: ${formatMoney(loan.fine_amount)}</div>
    `;

    if (librarianActions && loan.status === "reserved") {
      const btn = document.createElement("button");
      btn.textContent = "Confirm Pickup";
      btn.onclick = async () => {
        await request(`/api/loans/${loan.id}/pickup`, { method: "POST" });
        await refreshUI();
      };
      item.appendChild(btn);
    }

    if (!librarianActions && loan.status === "reserved") {
      const btn = document.createElement("button");
      btn.textContent = "Cancel";
      btn.className = "secondary";
      btn.onclick = async () => {
        await request(`/api/loans/${loan.id}/cancel`, { method: "POST" });
        await refreshUI();
      };
      item.appendChild(btn);
    }

    if (librarianActions && (loan.status === "active" || loan.status === "overdue")) {
      const btn = document.createElement("button");
      btn.textContent = "Return";
      btn.className = "secondary";
      btn.onclick = async () => {
        await showFineAndReturn(loan);
      };
      item.appendChild(btn);
    }
    container.appendChild(item);
  });
};

const showFineAndReturn = async (loan) => {
  if (loan.due_date) {
    const dueDate = new Date(loan.due_date);
    const today = new Date();
    if (today > dueDate) {
      const settings = await request("/api/settings");
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysLate = Math.ceil((today - dueDate) / msPerDay);
      const fine = (daysLate * settings.daily_fine_amount).toFixed(2);
      const proceed = window.confirm(`This loan is overdue. Estimated fine: ${fine}. Continue?`);
      if (!proceed) return;
    }
  }
  await request(`/api/loans/${loan.id}/return`, { method: "POST" });
  await refreshUI();
};

const loadSettings = async () => {
  const settings = await request("/api/settings");
  elements.pickupWindow.value = settings.pickup_window_days;
  elements.loanDays.value = settings.standard_loan_days;
  elements.dailyFine.value = settings.daily_fine_amount;
};

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  elements.loginError.textContent = "";
  const username = elements.loginUsername.value;
  const password = elements.loginPassword.value;

  const formData = new URLSearchParams();
  formData.append("username", username);
  formData.append("password", password);

  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail || "Login failed");
    }
    const data = await response.json();
    setToken(data.access_token);
    await refreshUI();
  } catch (err) {
    elements.loginError.textContent = err.message;
  }
});

elements.logoutBtn.addEventListener("click", async () => {
  clearToken();
  await refreshUI();
});

elements.settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await request("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pickup_window_days: Number(elements.pickupWindow.value),
        standard_loan_days: Number(elements.loanDays.value),
        daily_fine_amount: Number(elements.dailyFine.value),
      }),
    });
    elements.settingsMessage.textContent = "Settings updated.";
  } catch (err) {
    elements.settingsMessage.textContent = err.message;
  }
});

refreshUI();
