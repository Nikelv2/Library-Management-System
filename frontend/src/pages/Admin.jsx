import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../api/admin';
import { usersAPI } from '../api/users';
import { settingsAPI } from '../api/settings';
import { useAuth } from '../context/AuthContext';

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [settings, setSettings] = useState({
    pickup_window_days: 2,
    standard_loan_days: 30,
    daily_fine_amount: '0,10',
  });
  const [settingsMessage, setSettingsMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { isAdmin, isLibrarian } = useAuth();

  useEffect(() => {
    if (isLibrarian()) {
      loadUsers();
      loadSettings();
    }
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = isAdmin() ? await adminAPI.getAllUsers() : await usersAPI.getAll();
      setUsers(data);
      setError('');
    } catch (err) {
      setError('Failed to load users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async (userId) => {
    if (!window.confirm('Promote this user to librarian?')) {
      return;
    }
    try {
      await adminAPI.promoteToLibrarian(userId);
      alert('User promoted to librarian successfully!');
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to promote user');
    }
  };

  const handleDemote = async (userId) => {
    if (!window.confirm('Demote this librarian to member?')) {
      return;
    }
    try {
      await adminAPI.demoteToMember(userId);
      alert('User demoted to member successfully!');
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to demote user');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    try {
      await adminAPI.changePassword(
        passwordForm.oldPassword,
        passwordForm.newPassword
      );
      setPasswordSuccess('Password changed successfully!');
      setPasswordForm({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      setPasswordError(err.response?.data?.detail || 'Failed to change password');
    }
  };

  const handleBanToggle = async (user) => {
    const action = user.is_banned ? 'unban' : 'ban';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }
    try {
      if (user.is_banned) {
        await usersAPI.unban(user.id);
      } else {
        await usersAPI.ban(user.id);
      }
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || `Failed to ${action} user`);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user account? This cannot be undone.')) {
      return;
    }
    try {
      await adminAPI.deleteUser(userId);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleResetPassword = async (userId) => {
    const newPassword = window.prompt('Enter a new password (min 6 chars):');
    if (!newPassword) {
      return;
    }
    try {
      await adminAPI.changeUserPassword(userId, newPassword);
      alert('Password updated successfully.');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update password');
    }
  };

  const loadSettings = async () => {
    try {
      const data = await settingsAPI.get();
      setSettings({
        pickup_window_days: data.pickup_window_days,
        standard_loan_days: data.standard_loan_days,
        daily_fine_amount: Number(data.daily_fine_amount).toFixed(2).replace('.', ','),
      });
    } catch (err) {
      setSettingsMessage('Failed to load settings');
    }
  };

  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: name === 'daily_fine_amount' ? value.replace(/[^\d,]/g, '') : value,
    }));
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setSettingsMessage('');
    try {
      const fineValue = Number(String(settings.daily_fine_amount).replace(',', '.'));
      await settingsAPI.update({
        pickup_window_days: Number(settings.pickup_window_days),
        standard_loan_days: Number(settings.standard_loan_days),
        daily_fine_amount: fineValue,
      });
      setSettingsMessage('Settings updated.');
    } catch (err) {
      setSettingsMessage(err.response?.data?.detail || 'Failed to update settings');
    }
  };

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return users;
    }
    return users.filter((user) => {
      return (
        user.username.toLowerCase().includes(term) ||
        user.full_name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        String(user.id).includes(term)
      );
    });
  }, [users, searchTerm]);

  if (!isLibrarian()) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Access denied. Librarian privileges required.</div>
      </div>
    );
  }

  if (loading) {
    return <div style={styles.loading}>Loading users...</div>;
  }

  return (
    <div>
      <h1 style={styles.title}>Staff Panel</h1>
      {error && <div style={styles.error}>{error}</div>}

      {isAdmin() && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Change Admin Password</h2>
          <form onSubmit={handlePasswordChange} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Current Password</label>
              <input
                type="password"
                value={passwordForm.oldPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, oldPassword: e.target.value })
                }
                required
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>New Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                }
                required
                minLength={6}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    confirmPassword: e.target.value,
                  })
                }
                required
                minLength={6}
                style={styles.input}
              />
            </div>
            {passwordError && (
              <div style={styles.errorMessage}>{passwordError}</div>
            )}
            {passwordSuccess && (
              <div style={styles.successMessage}>{passwordSuccess}</div>
            )}
            <button type="submit" style={styles.submitButton}>
              Change Password
            </button>
          </form>
        </div>
      )}

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Loan Settings</h2>
        <form onSubmit={handleSettingsSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Pickup Window (days)</label>
            <input
              type="number"
              name="pickup_window_days"
              value={settings.pickup_window_days}
              onChange={handleSettingsChange}
              min={1}
              max={14}
              required
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Standard Loan Days</label>
            <input
              type="number"
              name="standard_loan_days"
              value={settings.standard_loan_days}
              onChange={handleSettingsChange}
              min={1}
              max={120}
              required
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Daily Fine Amount</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="^[0-9]+([,\\.][0-9]{0,2})?$"
              name="daily_fine_amount"
              value={settings.daily_fine_amount}
              onChange={handleSettingsChange}
              required
              style={styles.input}
            />
          </div>
          {settingsMessage && (
            <div style={styles.infoMessage}>{settingsMessage}</div>
          )}
          <button type="submit" style={styles.submitButton}>
            Save Settings
          </button>
        </form>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>User Management</h2>
        <input
          type="text"
          placeholder="Search users by username, name, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <div style={styles.table}>
          <table className="admin-table" style={styles.tableElement}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Full Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Reservation Access</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.full_name}</td>
                  <td>
                    <span
                      style={
                        user.role === 'admin'
                          ? styles.adminBadge
                          : user.role === 'librarian'
                          ? styles.librarianBadge
                          : styles.memberBadge
                      }
                    >
                      {user.role}
                    </span>
                  </td>
                  <td>
                    {user.is_active ? (
                      <span style={styles.activeBadge}>Active</span>
                    ) : (
                      <span style={styles.inactiveBadge}>Inactive</span>
                    )}
                  </td>
                  <td>
                    {user.is_banned ? (
                      <span style={styles.inactiveBadge}>Banned</span>
                    ) : (
                      <span style={styles.activeBadge}>Allowed</span>
                    )}
                  </td>
                  <td>
                    <Link to={`/users/${user.id}`} style={styles.profileLink}>
                      View Profile
                    </Link>
                    {isAdmin() && user.role === 'member' && (
                      <button
                        onClick={() => handlePromote(user.id)}
                        style={styles.promoteButton}
                      >
                        Promote to Librarian
                      </button>
                    )}
                    {isAdmin() && user.role === 'librarian' && (
                      <button
                        onClick={() => handleDemote(user.id)}
                        style={styles.demoteButton}
                      >
                        Demote to Member
                      </button>
                    )}
                    {user.role !== 'admin' && (
                      <button
                        onClick={() => handleBanToggle(user)}
                        style={styles.banButton}
                      >
                        {user.is_banned ? 'Unban' : 'Ban'}
                      </button>
                    )}
                    {isAdmin() && user.role !== 'admin' && (
                      <button
                        onClick={() => handleDelete(user.id)}
                        style={styles.deleteButton}
                      >
                        Delete
                      </button>
                    )}
                    {isAdmin() && user.role !== 'admin' && (
                      <button
                        onClick={() => handleResetPassword(user.id)}
                        style={styles.resetButton}
                      >
                        Reset Password
                      </button>
                    )}
                    {user.role === 'admin' && (
                      <span style={styles.noAction}>Cannot modify admin</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '2rem',
  },
  title: {
    marginBottom: '2rem',
    color: '#2c3e50',
  },
  section: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '2rem',
  },
  sectionTitle: {
    marginBottom: '1.5rem',
    color: '#34495e',
    borderBottom: '2px solid #3498db',
    paddingBottom: '0.5rem',
  },
  form: {
    maxWidth: '500px',
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    marginBottom: '1rem',
  },
  formGroup: {
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    color: '#34495e',
    fontWeight: '500',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
  },
  submitButton: {
    backgroundColor: '#27ae60',
    color: 'white',
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    marginTop: '1rem',
  },
  errorMessage: {
    backgroundColor: '#fee',
    color: '#c33',
    padding: '0.75rem',
    borderRadius: '4px',
    marginTop: '0.5rem',
  },
  successMessage: {
    backgroundColor: '#efe',
    color: '#3c3',
    padding: '0.75rem',
    borderRadius: '4px',
    marginTop: '0.5rem',
  },
  infoMessage: {
    backgroundColor: '#eef6ff',
    color: '#2c3e50',
    padding: '0.75rem',
    borderRadius: '4px',
    marginTop: '0.5rem',
  },
  table: {
    overflowX: 'auto',
  },
  tableElement: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  loading: {
    textAlign: 'center',
    padding: '2rem',
    fontSize: '1.2rem',
  },
  error: {
    backgroundColor: '#fee',
    color: '#c33',
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1rem',
  },
  adminBadge: {
    backgroundColor: '#e74c3c',
    color: 'white',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '500',
  },
  librarianBadge: {
    backgroundColor: '#f39c12',
    color: 'white',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '500',
  },
  memberBadge: {
    backgroundColor: '#3498db',
    color: 'white',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '500',
  },
  activeBadge: {
    color: '#27ae60',
    fontWeight: '500',
  },
  inactiveBadge: {
    color: '#e74c3c',
    fontWeight: '500',
  },
  promoteButton: {
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  demoteButton: {
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  banButton: {
    backgroundColor: '#8e44ad',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    marginLeft: '0.5rem',
  },
  deleteButton: {
    backgroundColor: '#c0392b',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    marginLeft: '0.5rem',
  },
  resetButton: {
    backgroundColor: '#16a085',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    marginLeft: '0.5rem',
  },
  noAction: {
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  profileLink: {
    marginRight: '0.5rem',
    color: '#2980b9',
    textDecoration: 'none',
    fontWeight: '500',
  },
};

// Add table styles
const tableStyles = `
  .admin-table thead tr {
    background-color: #34495e;
    color: white;
  }
  .admin-table thead th {
    padding: 1rem;
    text-align: left;
  }
  .admin-table tbody tr {
    border-bottom: 1px solid #ecf0f1;
  }
  .admin-table tbody tr:hover {
    background-color: #f8f9fa;
  }
  .admin-table tbody td {
    padding: 1rem;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = tableStyles;
  document.head.appendChild(styleSheet);
}

export default Admin;
