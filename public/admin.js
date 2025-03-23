if (document.getElementById('itemList')) {
  async function loadItems() {
    const res = await fetch('/api/admin/items');
    const items = await res.json();
    const tbody = document.getElementById('itemList');
    tbody.innerHTML = '';
    items.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.name}</td>
        <td>${item.category}</td>
        <td><input type="number" value="${item.price}" id="price-${item._id}" class="form-control w-75"></td>
        <td><input type="number" value="${item.stock}" id="stock-${item._id}" class="form-control w-75"></td>
        <td>
          <button class="btn btn-sm btn-success" onclick="updateItem('${item._id}')">Update</button>
          <button class="btn btn-sm btn-danger" onclick="deleteItem('${item._id}')">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
  // Existing code (fetch users, items, transactions)...
  // Load Transactions
  async function loadTransactions() {
    try {
      console.log('Fetching transactions...');
      const response = await fetch('/api/admin/transactions', { // Changed to /api/admin/transactions
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('Response status:', response.status);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  
      const transactions = await response.json();
      console.log('Transactions data:', transactions);
  
      const transactionsTable = document.getElementById('transactionsTable');
      transactionsTable.innerHTML = '';
  
      transactions.forEach(tx => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${tx.rollNo}</td>
          <td>${tx.items.map(item => `${item.name} x${item.quantity}`).join(', ')}</td>
          <td>₹${tx.totalAmount}</td> <!-- Changed total to totalAmount to match Order schema -->
          <td>${new Date(tx.timestamp || tx.date).toLocaleString()}</td> <!-- Handle timestamp or date -->
        `;
        transactionsTable.appendChild(row);
      });
    } catch (error) {
      console.error('Error loading transactions:', error.message);
    }
  }

  // Load Feedback
  async function loadFeedback() {
    try {
      const response = await fetch('/getFeedback', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const feedbackList = await response.json();

      const feedbackTable = document.getElementById('feedbackTable');
      feedbackTable.innerHTML = '';

      feedbackList.forEach(feedback => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${feedback.rollNo}</td>
          <td>${feedback.feedback}</td>
          <td>${new Date(feedback.date).toLocaleString()}</td>
        `;
        feedbackTable.appendChild(row);
      });
    } catch (error) {
      console.error('Error loading feedback:', error);
    }
  }

  // Toggle Dropdown
  function toggleDropdown(contentId) {
    const content = document.getElementById(contentId);
    if (content.style.display === 'none' || content.style.display === '') {
      content.style.display = 'block';
    } else {
      content.style.display = 'none';
    }
  }
  document.getElementById('clearFeedbackBtn').addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear all feedback? This cannot be undone.')) {
      try {
        const response = await fetch('/clearFeedback', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
  
        if (response.ok) {
          loadFeedback(); // Refresh the feedback table
          alert('Feedback cleared successfully!');
        } else {
          alert('Failed to clear feedback: ' + result.message);
        }
      } catch (error) {
        console.error('Error clearing feedback:', error);
        alert('Error clearing feedback.');
      }
    }
  });
  document.addEventListener('DOMContentLoaded', () => {
    loadTransactions();
    loadFeedback();
  });
  document.getElementById('addStudentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const rollNo = document.getElementById('studentRollNo').value;
    const password = document.getElementById('studentPassword').value;
    const name = document.getElementById('studentName').value;
    const balance = parseFloat(document.getElementById('studentBalance').value);

    const res = await fetch('/api/admin/add-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rollNo, password, name, balance }),
    });
    const data = await res.json();
    document.getElementById('message').textContent = data.error || data.message;
    if (!data.error) e.target.reset();
  });

  // Toggle Password Visibility for Add Student
  const toggleStudentPassword = document.getElementById('toggleStudentPassword');
  const studentPasswordInput = document.getElementById('studentPassword');
  toggleStudentPassword.addEventListener('click', () => {
    const type = studentPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    studentPasswordInput.setAttribute('type', type);
    toggleStudentPassword.classList.toggle('fa-eye');
    toggleStudentPassword.classList.toggle('fa-eye-slash');
  });

  document.getElementById('updateBalanceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const rollNo = document.getElementById('updateRollNo').value;
    const amount = document.getElementById('updateAmount').value;

    const res = await fetch('/api/admin/update-balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rollNo, amount }),
    });
    const data = await res.json();
    document.getElementById('message').textContent = data.error || data.message;
    if (!data.error) e.target.reset();
  });

  document.getElementById('addItemForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('itemName').value;
    const category = document.getElementById('itemCategory').value;
    const price = parseFloat(document.getElementById('itemPrice').value);
    const stock = parseInt(document.getElementById('itemStock').value);
    const res = await fetch('/api/admin/add-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category, price, stock }),
    });
    const data = await res.json();
    document.getElementById('message').textContent = data.message;
    e.target.reset();
    loadItems();
  });
  window.updateItem = async (id) => {
    try {
      console.log('Updating item with ID:', id);
  
      const price = parseFloat(document.getElementById(`price-${id}`).value);
      const stock = parseInt(document.getElementById(`stock-${id}`).value);
      console.log('Parsed values:', { price, stock });
  
      if (isNaN(price) || isNaN(stock)) {
        throw new Error('Price or stock is not a valid number');
      }
  
      // Fetch current stock
      const itemsResponse = await fetch('/api/admin/items');
      if (!itemsResponse.ok) {
        throw new Error(`Failed to fetch items: ${itemsResponse.status}`);
      }
      const items = await itemsResponse.json();
      const currentItem = items.find(item => item._id.toString() === id); // Ensure ID comparison works
      if (!currentItem) {
        throw new Error('Item not found in fetched data');
      }
      const currentStock = currentItem.stock;
      console.log('Current stock:', currentStock);
  
      // Update stock
      const stockResponse = await fetch(`/api/admin/restock/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: stock - currentStock })
      });
      if (!stockResponse.ok) {
        const errorData = await stockResponse.json();
        throw new Error(`Stock update failed: ${errorData.error || stockResponse.status}`);
      }
      const stockData = await stockResponse.json();
      console.log('Stock update response:', stockData);
  
      // Update price
      const priceResponse = await fetch(`/api/admin/update-price/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price })
      });
      if (!priceResponse.ok) {
        const errorData = await priceResponse.json();
        throw new Error(`Price update failed: ${errorData.error || priceResponse.status}`);
      }
      const priceData = await priceResponse.json();
      console.log('Price update response:', priceData);
  
      document.getElementById('message').textContent = 'Item updated successfully';
      loadItems();
    } catch (error) {
      console.error('Error updating item:', error.message);
      document.getElementById('message').textContent = `Error updating item: ${error.message}`;
    }
  };
  
  window.deleteItem = async (id) => {
    const res = await fetch(`/api/admin/delete-item/${id}`, { method: 'DELETE' });
    const data = await res.json();
    document.getElementById('message').textContent = data.message;
    loadItems();
  };

  document.getElementById('logoutBtn').addEventListener('click', () => {
    window.location.href = '/index.html';
  });
  loadItems();
  loadTransactions();
}