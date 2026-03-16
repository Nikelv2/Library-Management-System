import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children }) => {
  const { user, logout, isLibrarian, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <nav style={styles.navbar}>
        <div style={styles.navContent}>
          <Link to="/" style={styles.logo}>
            📚 LibryFlow
          </Link>
          <div style={styles.navLinks}>
            <Link to="/books" style={styles.navLink}>Books</Link>
            {!isLibrarian() && (
              <Link to="/loans" style={styles.navLink}>My Loans</Link>
            )}
            {isLibrarian() && (
              <>
                <Link to="/books/new" style={styles.navLink}>Add Book</Link>
                <Link to="/loans" style={styles.navLink}>All Loans</Link>
              </>
            )}
            {isAdmin() ? (
              <Link to="/admin" style={styles.navLink}>Admin Panel</Link>
            ) : (
              isLibrarian() && <Link to="/admin" style={styles.navLink}>Staff Panel</Link>
            )}
            {user ? (
              <div style={styles.userSection}>
                <span style={styles.userName}>
                  {user.full_name} ({user.role})
                </span>
                <button onClick={handleLogout} style={styles.logoutBtn}>
                  Logout
                </button>
              </div>
            ) : (
              <Link to="/login" style={styles.navLink}>Login</Link>
            )}
          </div>
        </div>
      </nav>
      <main style={styles.main}>{children}</main>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  navbar: {
    backgroundColor: '#2c3e50',
    color: 'white',
    padding: '1rem 2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  navContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: 'white',
    textDecoration: 'none',
  },
  navLinks: {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'center',
  },
  navLink: {
    color: 'white',
    textDecoration: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  userName: {
    fontSize: '0.9rem',
    color: '#ecf0f1',
  },
  logoutBtn: {
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  main: {
    flex: 1,
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
    padding: '2rem',
  },
};

export default Layout;
