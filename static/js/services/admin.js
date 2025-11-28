// Admin Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
  // Initialize toast
  const toastEl = document.getElementById('adminToast');
  const toast = new bootstrap.Toast(toastEl);
  
  function showToast(title, message, type = 'success') {
    document.getElementById('toastTitle').textContent = title;
    document.getElementById('toastMessage').textContent = message;
    toastEl.classList.remove('bg-success', 'bg-danger', 'bg-warning');
    if (type === 'success') toastEl.classList.add('bg-success', 'text-white');
    else if (type === 'error') toastEl.classList.add('bg-danger', 'text-white');
    else if (type === 'warning') toastEl.classList.add('bg-warning');
    toast.show();
  }

  // Load users data
  function loadUsers() {
    fetch('/api/admin/users')
      .then(response => response.json())
      .then(data => {
        document.getElementById('usersLoading').style.display = 'none';
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';
        
        if (data.status === 'success' && data.data) {
          data.data.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
              <td>${user.id}</td>
              <td>${user.username}</td>
              <td>${user.email}</td>
              <td>${user.created_at || 'N/A'}</td>
              <td>
                <button class="btn btn-sm btn-primary btn-action me-1" onclick="editUser(${user.id}, '${user.username}', '${user.email}')">
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn btn-sm btn-danger btn-action" onclick="deleteUser(${user.id}, '${user.username}')">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </td>
            `;
            tbody.appendChild(row);
          });
        }
      })
      .catch(error => {
        console.error('Error loading users:', error);
        document.getElementById('usersLoading').innerHTML = '<p class="text-danger">Error loading users</p>';
      });
  }

  // Load transactions data
  function loadTransactions() {
    fetch('/api/admin/transactions')
      .then(response => response.json())
      .then(data => {
        document.getElementById('transactionsLoading').style.display = 'none';
        const tbody = document.getElementById('transactionsTableBody');
        tbody.innerHTML = '';
        
        if (data.status === 'success' && data.data) {
          data.data.forEach(trans => {
            const row = document.createElement('tr');
            row.innerHTML = `
              <td>${trans.id}</td>
              <td>${trans.date || 'N/A'}</td>
              <td>${trans.name}</td>
              <td>${trans.room}</td>
              <td>${trans.movie}</td>
              <td>${trans.sits}</td>
              <td>₱${trans.amount}</td>
              <td><small>${trans.barcode}</small></td>
              <td>
                <button class="btn btn-sm btn-primary btn-action me-1" onclick='editTransaction(${JSON.stringify(trans)})'>
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn btn-sm btn-danger btn-action" onclick="deleteTransaction(${trans.id})">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </td>
            `;
            tbody.appendChild(row);
          });
        }
      })
      .catch(error => {
        console.error('Error loading transactions:', error);
        document.getElementById('transactionsLoading').innerHTML = '<p class="text-danger">Error loading transactions</p>';
      });
  }

  // Initial load
  loadUsers();
  loadTransactions();

  // Search functionality for users
  document.getElementById('userSearch').addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#usersTableBody tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
  });

  // Search functionality for transactions
  document.getElementById('transactionSearch').addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#transactionsTableBody tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
  });

  // Save new user
  document.getElementById('saveUserBtn').addEventListener('click', function() {
    const username = document.getElementById('newUsername').value;
    const email = document.getElementById('newEmail').value;
    const password = document.getElementById('newPassword').value;

    if (!username || !email || !password) {
      showToast('Error', 'All fields are required', 'error');
      return;
    }

    fetch('/api/admin/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    })
    .then(response => response.json())
    .then(data => {
      if (data.status === 'success') {
        showToast('Success', 'User created successfully', 'success');
        bootstrap.Modal.getInstance(document.getElementById('addUserModal')).hide();
        document.getElementById('addUserForm').reset();
        loadUsers();
      } else {
        showToast('Error', data.message, 'error');
      }
    })
    .catch(error => {
      showToast('Error', 'Failed to create user', 'error');
    });
  });

  // Update user
  document.getElementById('updateUserBtn').addEventListener('click', function() {
    const id = document.getElementById('editUserId').value;
    const username = document.getElementById('editUsername').value;
    const email = document.getElementById('editEmail').value;
    const password = document.getElementById('editPassword').value;

    fetch('/api/admin/users/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, username, email, password })
    })
    .then(response => response.json())
    .then(data => {
      if (data.status === 'success') {
        showToast('Success', 'User updated successfully', 'success');
        bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
        loadUsers();
      } else {
        showToast('Error', data.message, 'error');
      }
    })
    .catch(error => {
      showToast('Error', 'Failed to update user', 'error');
    });
  });

  // Confirm delete user
  document.getElementById('confirmDeleteUserBtn').addEventListener('click', function() {
    const id = document.getElementById('deleteUserId').value;

    fetch('/api/admin/users/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    .then(response => response.json())
    .then(data => {
      if (data.status === 'success') {
        showToast('Success', 'User deleted successfully', 'success');
        bootstrap.Modal.getInstance(document.getElementById('deleteUserModal')).hide();
        loadUsers();
      } else {
        showToast('Error', data.message, 'error');
      }
    })
    .catch(error => {
      showToast('Error', 'Failed to delete user', 'error');
    });
  });

  // Save new transaction
  document.getElementById('saveTransactionBtn').addEventListener('click', function() {
    const data = {
      date: document.getElementById('newTransDate').value,
      name: document.getElementById('newTransName').value,
      room: document.getElementById('newTransRoom').value,
      movie: document.getElementById('newTransMovie').value,
      sits: document.getElementById('newTransSeats').value,
      amount: document.getElementById('newTransAmount').value,
      barcode: document.getElementById('newTransBarcode').value
    };

    fetch('/api/admin/transactions/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
      if (result.status === 'success') {
        showToast('Success', 'Transaction created successfully', 'success');
        bootstrap.Modal.getInstance(document.getElementById('addTransactionModal')).hide();
        document.getElementById('addTransactionForm').reset();
        loadTransactions();
      } else {
        showToast('Error', result.message, 'error');
      }
    })
    .catch(error => {
      showToast('Error', 'Failed to create transaction', 'error');
    });
  });

  // Update transaction
  document.getElementById('updateTransactionBtn').addEventListener('click', function() {
    const data = {
      id: document.getElementById('editTransId').value,
      date: document.getElementById('editTransDate').value,
      name: document.getElementById('editTransName').value,
      room: document.getElementById('editTransRoom').value,
      movie: document.getElementById('editTransMovie').value,
      sits: document.getElementById('editTransSeats').value,
      amount: document.getElementById('editTransAmount').value,
      barcode: document.getElementById('editTransBarcode').value
    };

    fetch('/api/admin/transactions/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
      if (result.status === 'success') {
        showToast('Success', 'Transaction updated successfully', 'success');
        bootstrap.Modal.getInstance(document.getElementById('editTransactionModal')).hide();
        loadTransactions();
      } else {
        showToast('Error', result.message, 'error');
      }
    })
    .catch(error => {
      showToast('Error', 'Failed to update transaction', 'error');
    });
  });

  // Confirm delete transaction
  document.getElementById('confirmDeleteTransactionBtn').addEventListener('click', function() {
    const id = document.getElementById('deleteTransactionId').value;

    fetch('/api/admin/transactions/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    .then(response => response.json())
    .then(data => {
      if (data.status === 'success') {
        showToast('Success', 'Transaction deleted successfully', 'success');
        bootstrap.Modal.getInstance(document.getElementById('deleteTransactionModal')).hide();
        loadTransactions();
      } else {
        showToast('Error', data.message, 'error');
      }
    })
    .catch(error => {
      showToast('Error', 'Failed to delete transaction', 'error');
    });
  });

  // Make functions globally accessible
  window.editUser = function(id, username, email) {
    document.getElementById('editUserId').value = id;
    document.getElementById('editUsername').value = username;
    document.getElementById('editEmail').value = email;
    document.getElementById('editPassword').value = '';
    new bootstrap.Modal(document.getElementById('editUserModal')).show();
  };

  window.deleteUser = function(id, username) {
    document.getElementById('deleteUserId').value = id;
    document.getElementById('deleteUserName').textContent = username;
    new bootstrap.Modal(document.getElementById('deleteUserModal')).show();
  };

  window.editTransaction = function(trans) {
    document.getElementById('editTransId').value = trans.id;
    document.getElementById('editTransDate').value = trans.date || '';
    document.getElementById('editTransName').value = trans.name;
    document.getElementById('editTransRoom').value = trans.room;
    document.getElementById('editTransMovie').value = trans.movie;
    document.getElementById('editTransSeats').value = trans.sits;
    document.getElementById('editTransAmount').value = trans.amount;
    document.getElementById('editTransBarcode').value = trans.barcode;
    new bootstrap.Modal(document.getElementById('editTransactionModal')).show();
  };

  window.deleteTransaction = function(id) {
    document.getElementById('deleteTransactionId').value = id;
    document.getElementById('deleteTransId').textContent = '#' + id;
    new bootstrap.Modal(document.getElementById('deleteTransactionModal')).show();
  };
});
