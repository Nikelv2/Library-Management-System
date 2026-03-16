import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loansAPI } from '../api/loans';
import { booksAPI } from '../api/books';
import { useAuth } from '../context/AuthContext';
import './Loans.css';

const Loans = () => {
  const [loans, setLoans] = useState([]);
  const [books, setBooks] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isLibrarian } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState('default');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    loadLoans();
  }, []);

  const loadLoans = async () => {
    try {
      setLoading(true);
      const loansData = isLibrarian()
        ? await loansAPI.getAll()
        : await loansAPI.getMyLoans();
      
      setLoans(loansData);
      
      // Load book details for each loan
      const bookIds = [...new Set(loansData.map(loan => loan.book_id))];
      const booksData = {};
      for (const bookId of bookIds) {
        try {
          const book = await booksAPI.getById(bookId);
          booksData[bookId] = book;
        } catch (err) {
          console.error(`Failed to load book ${bookId}`);
        }
      }
      setBooks(booksData);
      setError('');
    } catch (err) {
      setError('Failed to load loans');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (loanId) => {
    try {
      await loansAPI.return(loanId);
      alert('Book returned successfully!');
      loadLoans();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to return book');
    }
  };

  const handleCancel = async (loanId) => {
    try {
      await loansAPI.cancel(loanId);
      alert('Reservation cancelled.');
      loadLoans();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to cancel reservation');
    }
  };

  const handlePickup = async (loanId) => {
    try {
      await loansAPI.confirmPickup(loanId);
      alert('Pickup confirmed successfully!');
      loadLoans();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to confirm pickup');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) {
      return '-';
    }
    return new Date(dateString).toLocaleDateString();
  };

  const formatMoney = (value) => {
    const amount = Number(value || 0);
    return amount.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const sortLoans = (list) => {
    const sorted = [...list];
    const direction = sortDir === 'asc' ? 1 : -1;
    const getDateValue = (value) => (value ? new Date(value).getTime() : 0);
    sorted.sort((a, b) => {
      if (sortKey === 'status') {
        return a.status.localeCompare(b.status) * direction;
      }
      if (sortKey === 'reservation_date') {
        return (getDateValue(a.reservation_date) - getDateValue(b.reservation_date)) * direction;
      }
      if (sortKey === 'pickup_deadline') {
        return (getDateValue(a.pickup_deadline) - getDateValue(b.pickup_deadline)) * direction;
      }
      if (sortKey === 'start_date') {
        return (getDateValue(a.start_date) - getDateValue(b.start_date)) * direction;
      }
      if (sortKey === 'due_date') {
        return (getDateValue(a.due_date) - getDateValue(b.due_date)) * direction;
      }
      if (sortKey === 'returned_at') {
        return (getDateValue(a.returned_at) - getDateValue(b.returned_at)) * direction;
      }
      if (sortKey === 'default') {
        const aKey = a.status === 'returned' ? getDateValue(a.returned_at) : getDateValue(a.due_date);
        const bKey = b.status === 'returned' ? getDateValue(b.returned_at) : getDateValue(b.due_date);
        return (aKey - bKey) * direction;
      }
      return 0;
    });
    return sorted;
  };

  const filteredLoans = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = loans.filter((loan) => {
      if (!term) {
        return true;
      }
      const book = books[loan.book_id];
      const bookMatch = book
        ? `${book.title} ${book.author}`.toLowerCase().includes(term)
        : false;
      const userMatch = loan.user
        ? `${loan.user.username} ${loan.user.full_name}`.toLowerCase().includes(term)
        : false;
      return (
        loan.status.toLowerCase().includes(term) ||
        bookMatch ||
        userMatch
      );
    });
    return sortLoans(filtered);
  }, [loans, books, searchTerm, sortKey, sortDir]);

  if (loading) {
    return <div style={styles.loading}>Loading loans...</div>;
  }

  return (
    <div>
      <h1 style={styles.title}>
        {isLibrarian() ? 'All Loans' : 'My Loans'}
      </h1>
      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.controls}>
        <input
          type="text"
          placeholder="Search loans by book, user, or status..."
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
      {filteredLoans.length === 0 ? (
        <div style={styles.empty}>No loans found</div>
      ) : (
        <div style={styles.table}>
          <table className="loans-table" style={styles.tableElement}>
            <thead>
              <tr>
                <th>Book</th>
                <th>Author</th>
                {isLibrarian() && <th>Borrower</th>}
                <th>Reserved</th>
                <th>Pickup Deadline</th>
                <th>Due Date</th>
                <th>Returned</th>
                <th>Fine</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLoans.map((loan) => {
                const book = books[loan.book_id];
                const showPickup = isLibrarian() && loan.status === 'reserved';
                const showReturn = isLibrarian() && (loan.status === 'active' || loan.status === 'overdue');
                const showCancel = !isLibrarian() && loan.status === 'reserved';
                return (
                  <tr key={loan.id}>
                    <td>{book ? book.title : 'Unknown'}</td>
                    <td>{book ? book.author : '-'}</td>
                {isLibrarian() && (
                      <td>
                        {loan.user ? (
                          <Link to={`/users/${loan.user_id}`} style={styles.profileLink}>
                            {loan.user.username} ({loan.user.full_name})
                          </Link>
                        ) : (
                          'Unknown user'
                        )}
                      </td>
                    )}
                    <td>{formatDate(loan.reservation_date)}</td>
                    <td>{formatDate(loan.pickup_deadline)}</td>
                    <td>{formatDate(loan.due_date)}</td>
                    <td>{formatDate(loan.returned_at)}</td>
                    <td>{formatMoney(loan.fine_amount)}</td>
                    <td>
                      <span style={loan.status === 'returned' ? styles.returned : styles.active}>
                        {loan.status}
                      </span>
                    </td>
                    <td>
                      {showPickup && (
                        <button
                          onClick={() => handlePickup(loan.id)}
                          style={styles.returnButton}
                        >
                          Confirm Pickup
                        </button>
                      )}
                      {showCancel && (
                        <button
                          onClick={() => handleCancel(loan.id)}
                          style={styles.cancelButton}
                        >
                          Cancel
                        </button>
                      )}
                      {showReturn && (
                        <button
                          onClick={() => handleReturn(loan.id)}
                          style={styles.returnButton}
                        >
                          Return
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const styles = {
  title: {
    marginBottom: '2rem',
    color: '#2c3e50',
  },
  table: {
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
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
  controls: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1rem',
    flexWrap: 'wrap',
  },
  searchInput: {
    flex: 1,
    padding: '0.5rem',
    borderRadius: '4px',
    border: '1px solid #ddd',
    minWidth: '220px',
  },
  select: {
    padding: '0.5rem',
    borderRadius: '4px',
    border: '1px solid #ddd',
  },
  profileLink: {
    color: '#2980b9',
    textDecoration: 'none',
    fontWeight: '500',
  },
  empty: {
    textAlign: 'center',
    padding: '2rem',
    color: '#7f8c8d',
  },
  returned: {
    color: '#27ae60',
    fontWeight: '500',
  },
  active: {
    color: '#e74c3c',
    fontWeight: '500',
  },
  returnButton: {
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '0.5rem',
  },
};

export default Loans;
