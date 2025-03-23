// Login Page
if (document.getElementById('loginForm')) {
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const rollNo = document.getElementById('rollNo').value;
    const password = document.getElementById('password').value;
    const res = await fetch('/api/student/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rollNo, password }),
    });
    const data = await res.json();
    if (data.error) {
      document.getElementById('error').textContent = data.error;
    } else if (data.role === 'student') {
      localStorage.setItem('rollNo', data.rollNo);
      window.location.href = data.redirect;
    } else if (data.role === 'admin') {
      window.location.href = data.redirect;
    }
  });

  const togglePassword = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');
  togglePassword.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    togglePassword.classList.toggle('fa-eye');
    togglePassword.classList.toggle('fa-eye-slash');
  });
}

// Food Page
if (document.getElementById('menu')) {
  let cart = {};
  const rollNo = localStorage.getItem('rollNo');

  async function loadMenu() {
    const res = await fetch(`/api/student/food?rollNo=${rollNo}`);
    const data = await res.json();
    if (data.error) {
      document.getElementById('message').textContent = data.error;
      return;
    }

    const { menu, balance } = data;
    const menuDiv = document.getElementById('menu');
    menuDiv.innerHTML = '';
    for (let category in menu) {
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'col-md-4';
      categoryDiv.innerHTML = `<h4>${category}</h4>`;
      menu[category].forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'menu-item';
        itemDiv.innerHTML = `
          <p>${item.name} - ₹${item.price} (Stock: ${item.stock})</p>
          <button class="btn btn-sm btn-primary" onclick="addToCart('${item._id}', '${item.name}', '${category}', ${item.price})">Add</button>
        `;
        categoryDiv.appendChild(itemDiv);
      });
      menuDiv.appendChild(categoryDiv);
    }

    document.getElementById('studentBalance').textContent = `₹${balance}`;
  }

  // New: Load Transactions
  async function loadTransactions() {
    const res = await fetch(`/api/student/transactions?rollNo=${rollNo}`);
    const transactions = await res.json();
    const tbody = document.getElementById('transactionList');
    tbody.innerHTML = '';
    transactions.forEach(tx => {
      const tr = document.createElement('tr');
      tr.className = tx.type === 'order' ? 'table-danger' : 'table-success'; // Red for orders, green for top-ups
      tr.innerHTML = `
        <td>${tx.type === 'order' ? 'Expense (Order)' : 'Top-Up'}</td>
        <td>₹${Math.abs(tx.amount)}</td>
        <td>${new Date(tx.timestamp).toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  window.addToCart = (itemId, name, category, price) => {
    if (!cart[category]) cart[category] = [];
    const existing = cart[category].find(i => i.itemId === itemId);
    if (existing) existing.quantity++;
    else cart[category].push({ itemId, name, quantity: 1, price });
    updateCart();
  };

  window.reduceFromCart = (itemId, category) => {
    const categoryItems = cart[category];
    const item = categoryItems.find(i => i.itemId === itemId);
    if (item) {
      item.quantity--;
      if (item.quantity <= 0) {
        cart[category] = categoryItems.filter(i => i.itemId !== itemId);
        if (cart[category].length === 0) delete cart[category];
      }
      updateCart();
    }
  };

  function updateCart() {
    const cartDiv = document.getElementById('cart');
    cartDiv.innerHTML = '';
    let totalItems = 0;
    for (let category in cart) {
      cart[category].forEach(item => {
        totalItems += item.quantity;
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item';
        itemDiv.innerHTML = `
          <span>${item.name} (${category}) - ₹${item.price} x ${item.quantity}</span>
          <div class="button-group">
            <button class="btn btn-sm btn-warning" onclick="addToCart('${item.itemId}', '${item.name}', '${category}', ${item.price})">+</button>
            <button class="btn btn-sm btn-danger" onclick="reduceFromCart('${item.itemId}', '${category}')">-</button>
          </div>
        `;
        cartDiv.appendChild(itemDiv);
      });
    }
    document.getElementById('placeOrderBtn').disabled = totalItems === 0;
  }

  document.getElementById('placeOrderBtn').addEventListener('click', async () => {
    const orders = {};
    for (let category in cart) {
      orders[category] = cart[category].map(item => ({ itemId: item.itemId, quantity: item.quantity }));
    }
    const res = await fetch('/api/student/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rollNo, orders }),
    });
    const data = await res.json();
    if (data.error) {
      document.getElementById('message').textContent = data.error;
      if (data.redirect) setTimeout(() => window.location.href = data.redirect, 2000);
    } else {
      document.getElementById('message').textContent = 'Order placed! Refreshing...';
      setTimeout(() => {
        window.location.reload(); // Reload to update transactions
      }, 1000);
    }
  });
  // Existing code (fetch balance, menu, cart logic)...
  // Feedback submission
  document.getElementById('submitFeedbackBtn').addEventListener('click', async () => {
    const feedbackInput = document.getElementById('feedbackInput').value.trim();
    const feedbackMessage = document.getElementById('feedbackMessage');

    if (!feedbackInput) {
      feedbackMessage.className = 'text-danger mt-2';
      feedbackMessage.textContent = 'Please enter some feedback.';
      return;
    }

    try {
      const rollNo = localStorage.getItem('rollNo'); // Assuming rollNo is stored after login
      const response = await fetch('/submitFeedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollNo, feedback: feedbackInput })
      });

      const result = await response.json();
      if (response.ok) {
        feedbackMessage.className = 'text-success mt-2';
        feedbackMessage.textContent = 'Feedback submitted successfully!';
        document.getElementById('feedbackInput').value = ''; // Clear input
      } else {
        feedbackMessage.className = 'text-danger mt-2';
        feedbackMessage.textContent = result.message || 'Failed to submit feedback.';
      }
    } catch (error) {
      feedbackMessage.className = 'text-danger mt-2';
      feedbackMessage.textContent = 'Error submitting feedback.';
      console.error('Feedback submission error:', error);
    }

    // Clear message after 3 seconds
    setTimeout(() => {
      feedbackMessage.textContent = '';
    }, 3000);
  });
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('rollNo');
    window.location.href = '/index.html';
  });

  loadMenu();
  loadTransactions(); // Load transactions on page load
}
