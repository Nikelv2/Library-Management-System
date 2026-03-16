import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { isAuthenticated, user, isLibrarian } = useAuth();

  return (
    <div style={styles.container}>
      <div style={styles.hero}>
        <h1 style={styles.title}>📚 Welcome to LibryFlow</h1>
        <p style={styles.subtitle}>
          A modern library management system
        </p>
        {!isAuthenticated ? (
          <div style={styles.actions}>
            <Link to="/login" style={styles.primaryButton}>
              Login
            </Link>
            <Link to="/register" style={styles.secondaryButton}>
              Register
            </Link>
          </div>
        ) : (
          <div style={styles.welcome}>
            <p style={styles.welcomeText}>
              Welcome back, {user?.full_name}!
            </p>
            <div style={styles.actions}>
              <Link to="/books" style={styles.primaryButton}>
                Browse Books
              </Link>
            {!isLibrarian() ? (
              <Link to="/loans" style={styles.secondaryButton}>
                My Loans
              </Link>
            ) : (
              <Link to="/loans" style={styles.secondaryButton}>
                All Loans
              </Link>
            )}
            </div>
          </div>
        )}
      </div>
      <div style={styles.features}>
        <div style={styles.feature}>
          <h3>📖 Book Management</h3>
          <p>Browse, search, and manage books in the library</p>
        </div>
        <div style={styles.feature}>
          <h3>🔄 Loan System</h3>
          <p>Borrow and return books with ease</p>
        </div>
        <div style={styles.feature}>
          <h3>👤 User Roles</h3>
          <p>Different access levels for members and librarians</p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    textAlign: 'center',
  },
  hero: {
    padding: '3rem 0',
    marginBottom: '3rem',
  },
  title: {
    fontSize: '3rem',
    color: '#2c3e50',
    marginBottom: '1rem',
  },
  subtitle: {
    fontSize: '1.5rem',
    color: '#7f8c8d',
    marginBottom: '2rem',
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#3498db',
    color: 'white',
    padding: '1rem 2rem',
    borderRadius: '4px',
    textDecoration: 'none',
    fontSize: '1.1rem',
    fontWeight: '500',
  },
  secondaryButton: {
    backgroundColor: '#95a5a6',
    color: 'white',
    padding: '1rem 2rem',
    borderRadius: '4px',
    textDecoration: 'none',
    fontSize: '1.1rem',
    fontWeight: '500',
  },
  welcome: {
    marginTop: '2rem',
  },
  welcomeText: {
    fontSize: '1.2rem',
    color: '#34495e',
    marginBottom: '1.5rem',
  },
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '2rem',
    marginTop: '3rem',
  },
  feature: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
};

export default Home;
