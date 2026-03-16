import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usersAPI } from '../api/users';
import { loansAPI } from '../api/loans';
import { useAuth } from '../context/AuthContext';

const UserProfile = () => {
  const { id } = useParams();
  const { isLibrarian } = useAuth();
  const [user, setUser] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState('default');
  const [sortDir, setSortDir] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isLibrarian()) {
      return;
    }
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const [userData, loansData] = await Promise.all([
        usersAPI.getById(id),
        usersAPI.getLoans(id),
      ]);
      setUser(userData);
      setLoans(loansData);
      setError('');
    } catch (err) {
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const totalFines = useMemo(() => {
    return loans.reduce((sum, loan) => sum + (loan.fine_amount || 0), 0);
  }, [loans]);

  const formatMoney = (value) => {
    const amount = Number(value || 0);
    return amount.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleBanToggle = async () => {
    if (!user) return;
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
      await loadProfile();
    } catch (err) {
      alert(err.response?.data?.detail || `Failed to ${action} user`);
    }
  };

  const sortLoans = (list) => {
    const sorted = [...list];
    sorted.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const getDateValue = (value) => (value ? new Date(value).getTime() : 0);
      if (sortKey === 'status') {
        return a.status.localeCompare(b.status) * dir;
      }
      if (sortKey === 'reservation_date') {
        return (getDateValue(a.reservation_date) - getDateValue(b.reservation_date)) * dir;
      }
      if (sortKey === 'pickup_deadline') {
        return (getDateValue(a.pickup_deadline) - getDateValue(b.pickup_deadline)) * dir;
      }
      if (sortKey === 'start_date') {
        return (getDateValue(a.start_date) - getDateValue(b.start_date)) * dir;
      }
      if (sortKey === 'due_date') {
        return (getDateValue(a.due_date) - getDateValue(b.due_date)) * dir;
      }
      if (sortKey === 'returned_at') {
        return (getDateValue(a.returned_at) - getDateValue(b.returned_at)) * dir;
      }
      if (sortKey === 'default') {
        const aKey = a.status === 'returned' ? getDateValue(a.returned_at) : getDateValue(a.due_date);
        const bKey = b.status === 'returned' ? getDateValue(b.returned_at) : getDateValue(b.due_date);
        return (aKey - bKey) * dir;
      }
      return 0;
    });
    return sorted;
  };

  const filteredLoans = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = loans.filter((loan) => {
      if (!term) return true;
      return loan.status.toLowerCase().includes(term);
    });
    return sortLoans(filtered);
  }, [loans, searchTerm, sortKey, sortDir]);

  const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString();
  };

  if (!isLibrarian()) {
    return <div style={styles.error}>Access denied. Librarian privileges required.</div>;
  }

  if (loading) {
    return <div style={styles.loading}>Loading user profile...</div>;
  }

  if (error) {
    return <div style={styles.error}>{error}</div>;
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>
          {user?.username} ({user?.full_name})
        </h1>
        <Link to="/admin" style={styles.backLink}>Back to Staff Panel</Link>
      </div>
      <div style={styles.summary}>
        <div>Total fines: {formatMoney(totalFines)}</div>
        <div>Card Number: {user?.id}</div>
        <button onClick={handleBanToggle} style={styles.banButton}>
          {user?.is_banned ? 'Unban User' : 'Ban User'}
        </button>
      </div>

      <div style={styles.controls}>
        <input
          type="text"
          placeholder="Search by status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} style={styles.select}>
          <option value="default">Default (due/returned)</option>
          <option value="reservation_date">Reservation Date</option>
          <option value="pickup_deadline">Pickup Deadline</option>
          <option value="start_date">Start Date</option>
          <option value="due_date">Due Date</option>
          <option value="returned_at">Returned At</option>
          <option value="status">Status</option>
        </select>
        <select value={sortDir} onChange={(e) => setSortDir(e.target.value)} style={styles.select}>
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>

      <div style={styles.table}>
        <table style={styles.tableElement}>
          <thead>
            <tr>
              <th>Loan ID</th>
              <th>Status</th>
              <th>Reserved</th>
              <th>Due</th>
              <th>Returned</th>
              <th>Fine</th>
            </tr>
          </thead>
          <tbody>
            {filteredLoans.map((loan) => (
              <tr key={loan.id}>
                <td>{loan.id}</td>
                <td>{loan.status}</td>
                <td>{formatDate(loan.reservation_date)}</td>
                <td>{formatDate(loan.due_date)}</td>
                <td>{formatDate(loan.returned_at)}</td>
                <td>{formatMoney(loan.fine_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  title: {
    color: '#2c3e50',
  },
  backLink: {
    textDecoration: 'none',
    color: '#3498db',
  },
  summary: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
  },
  banButton: {
    backgroundColor: '#8e44ad',
    color: '#fff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  controls: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  searchInput: {
    flex: 1,
    padding: '0.5rem',
    borderRadius: '4px',
    border: '1px solid #ddd',
  },
  select: {
    padding: '0.5rem',
    borderRadius: '4px',
  },
  table: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  tableElement: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  loading: {
    textAlign: 'center',
    padding: '2rem',
  },
  error: {
    backgroundColor: '#fee',
    color: '#c33',
    padding: '1rem',
    borderRadius: '4px',
  },
};

export default UserProfile;
