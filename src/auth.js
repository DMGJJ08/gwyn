// Auth System - Local Profile & Cloud-Ready Mock Setup
(function() {
  const STORAGE_KEY = 'gwyn_auth_accounts';
  const SESSION_KEY = 'gwyn_current_user';

  // State
  window.currentUser = null;

  // Retrieve accounts from local mock database
  function getAccounts() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const accounts = data ? JSON.parse(data) : {};
      
      // Pre-register default Developer account or force update password if old
      if (!accounts['developer'] || accounts['developer'].password === 'admin') {
        accounts['developer'] = {
          username: 'Developer',
          email: 'admin@gwyn.com',
          password: 'gwynadmin',
          saveData: accounts['developer'] ? accounts['developer'].saveData : null
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
      }
      return accounts;
    } catch (e) {
      console.error("Failed to parse accounts:", e);
      return {};
    }
  }

  // Save accounts database
  function saveAccounts(accounts) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  }

  // Register a new user
  window.authRegister = function(username, email, password) {
    if (!username || username.trim() === '') {
      return { success: false, message: 'Username cannot be empty.' };
    }
    if (!email || !email.includes('@') || !email.includes('.')) {
      return { success: false, message: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 4) {
      return { success: false, message: 'Password must be at least 4 characters.' };
    }

    const cleanUsername = username.trim().toLowerCase();
    
    // Restrict public registration of developer and admin accounts
    if (cleanUsername === 'developer' || cleanUsername === 'admin') {
      return { success: false, message: 'This username is reserved.' };
    }
    const cleanEmail = email.trim().toLowerCase();
    const accounts = getAccounts();

    if (accounts[cleanUsername]) {
      return { success: false, message: 'Username already exists.' };
    }

    // Check if email already registered to another account
    for (const key in accounts) {
      if (accounts[key].email === cleanEmail) {
        return { success: false, message: 'Email address already registered.' };
      }
    }

    // Create user entry
    accounts[cleanUsername] = {
      username: username.trim(), // Preserve casing
      email: cleanEmail,
      password: password, // In a real cloud DB, this is encrypted/managed by Firebase Auth
      saveData: null
    };

    saveAccounts(accounts);
    return { success: true, message: 'Registration successful!' };
  };

  // Login a user
  window.authLogin = function(username, password) {
    if (!username || !password) {
      return { success: false, message: 'Please enter both username and password.' };
    }

    const cleanUsername = username.trim().toLowerCase();
    const accounts = getAccounts();

    const user = accounts[cleanUsername];
    if (!user || user.password !== password) {
      return { success: false, message: 'Invalid username or password.' };
    }

    // Set active session
    window.currentUser = user.username;
    localStorage.setItem(SESSION_KEY, user.username);
    return { success: true, user: user };
  };

  // Logout
  window.authLogout = function() {
    window.currentUser = null;
    localStorage.removeItem(SESSION_KEY);
    // Reload page to reset state safely
    location.reload();
  };

  // Save game progress to user profile
  window.authSaveGameData = function(data) {
    if (!window.currentUser) return;
    const cleanUsername = window.currentUser.toLowerCase();
    const accounts = getAccounts();

    if (accounts[cleanUsername]) {
      accounts[cleanUsername].saveData = data;
      saveAccounts(accounts);
      // Fallback local save
      localStorage.setItem('gwyn_save_data', JSON.stringify(data));
    }
  };

  // Load game progress from user profile
  window.authLoadGameData = function() {
    if (!window.currentUser) return null;
    const cleanUsername = window.currentUser.toLowerCase();
    const accounts = getAccounts();

    return accounts[cleanUsername] ? accounts[cleanUsername].saveData : null;
  };

  // Recover/Retrieve Password
  window.authRecoverPassword = function(username, email) {
    if (!username || !email) {
      return { success: false, message: 'Please enter both username and email.' };
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const accounts = getAccounts();

    const user = accounts[cleanUsername];
    if (!user || user.email !== cleanEmail) {
      return { success: false, message: 'No matching user found with those credentials.' };
    }

    // In a real cloud DB, this triggers a Firebase reset password email.
    // For local mock testing, we return a success alert and tell them their password!
    return { 
      success: true, 
      message: `Reset email sent to ${user.email}! (Test Key: Your password is "${user.password}")` 
    };
  };

  // Check existing session on boot
  window.authCheckSession = function() {
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      window.currentUser = savedSession;
      return true;
    }
    return false;
  };
})();
