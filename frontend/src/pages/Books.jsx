import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { booksAPI } from '../api/books';
import { loansAPI } from '../api/loans';
import { usersAPI } from '../api/users';
import { useAuth } from '../context/AuthContext';

const Books = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { isLibrarian } = useAuth();

  useEffect(() => {
    loadBooks();
    if (isLibrarian()) {
      usersAPI.getAll().catch(() => {});
    }
  }, []);

  const loadBooks = async (search = null) => {
    try {
      setLoading(true);
      const data = await booksAPI.getAll(0, 100, search);
      setBooks(data);
      setError('');
    } catch (err) {
      setError('Failed to load books');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadBooks(searchTerm || null);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    loadBooks();
  };

  const handleReserve = async (bookId) => {
    try {
      await loansAPI.reserve(bookId);
      alert('Book reserved successfully!');
      loadBooks();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reserve book');
    }
  };

  const handleDelete = async (bookId) => {
    if (!window.confirm('Are you sure you want to delete this book?')) {
      return;
    }
    try {
      await booksAPI.delete(bookId);
      alert('Book deleted successfully!');
      loadBooks();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete book');
    }
  };

  const handleAssign = async (bookId) => {
    const cardNumber = window.prompt('Enter user card number (ID) to assign loan:');
    if (!cardNumber) {
      return;
    }
    const userId = Number(cardNumber);
    if (!Number.isInteger(userId)) {
      alert('Invalid card number');
      return;
    }
    try {
      await loansAPI.assign(bookId, userId);
      alert('Loan assigned successfully!');
      loadBooks();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to assign loan');
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading books...</div>;
  }

  return (
    <div>
      <div style={styles.header}>
        <h1>Books</h1>
        {isLibrarian() && (
          <Link to="/books/new" style={styles.addButton}>
            + Add New Book
          </Link>
        )}
      </div>
      <form onSubmit={handleSearch} style={styles.searchForm}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by title or author..."
          style={styles.searchInput}
        />
        <button type="submit" style={styles.searchButton}>
          Search
        </button>
        {searchTerm && (
          <button
            type="button"
            onClick={handleClearSearch}
            style={styles.clearButton}
          >
            Clear
          </button>
        )}
      </form>
      {error && <div style={styles.error}>{error}</div>}
      {books.length === 0 ? (
        <div style={styles.empty}>No books available</div>
      ) : (
        <div style={styles.grid}>
          {books.map((book) => (
            <div key={book.id} style={styles.card}>
              <h3 style={styles.title}>{book.title}</h3>
              <p style={styles.author}>by {book.author}</p>
              <p style={styles.isbn}>ISBN: {book.isbn}</p>
              {book.description && (
                <p style={styles.description}>{book.description}</p>
              )}
              <div style={styles.status}>
                Status: {book.available_copies > 0 ? (
                  <span style={styles.available}>Available</span>
                ) : (
                  <span style={styles.unavailable}>Unavailable</span>
                )}
                <div style={styles.copyInfo}>
                  Available: {book.available_copies} / Total: {book.total_copies}
                </div>
              </div>
              <div style={styles.actions}>
                {book.available_copies > 0 && !isLibrarian() && (
                  <button
                    onClick={() => handleReserve(book.id)}
                    style={styles.borrowBtn}
                  >
                    Reserve
                  </button>
                )}
                {isLibrarian() && (
                  <>
                    <Link
                      to={`/books/${book.id}/edit`}
                      style={styles.editBtn}
                    >
                      Edit
                    </Link>
                    {book.available_copies > 0 && (
                      <button
                        onClick={() => handleAssign(book.id)}
                        style={styles.assignBtn}
                      >
                        Assign Loan
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(book.id)}
                      style={styles.deleteBtn}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  addButton: {
    backgroundColor: '#27ae60',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    textDecoration: 'none',
    fontWeight: '500',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    marginBottom: '0.5rem',
    color: '#2c3e50',
  },
  author: {
    color: '#7f8c8d',
    marginBottom: '0.5rem',
  },
  isbn: {
    fontSize: '0.9rem',
    color: '#95a5a6',
    marginBottom: '0.5rem',
  },
  description: {
    color: '#34495e',
    marginBottom: '1rem',
    flex: 1,
  },
  status: {
    marginBottom: '1rem',
    fontWeight: '500',
  },
  copyInfo: {
    fontSize: '0.85rem',
    color: '#7f8c8d',
    marginTop: '0.25rem',
  },
  available: {
    color: '#27ae60',
  },
  unavailable: {
    color: '#e74c3c',
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
  },
  borrowBtn: {
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    flex: 1,
  },
  editBtn: {
    backgroundColor: '#f39c12',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    textDecoration: 'none',
    textAlign: 'center',
    flex: 1,
  },
  deleteBtn: {
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    flex: 1,
  },
  assignBtn: {
    backgroundColor: '#8e44ad',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    flex: 1,
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
  empty: {
    textAlign: 'center',
    padding: '2rem',
    color: '#7f8c8d',
  },
  searchForm: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
  },
  searchButton: {
    backgroundColor: '#3498db',
    color: 'white',
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  clearButton: {
    backgroundColor: '#95a5a6',
    color: 'white',
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
};

export default Books;
