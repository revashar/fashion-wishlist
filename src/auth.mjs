import bcrypt from 'bcryptjs';
import { User } from './db.mjs';
import express from 'express';
import { showRegister, register, showLogin, login, logout, requireLogin } from './auth.mjs';

app.get('/register', showRegister);
app.post('/register', express.urlencoded({ extended: true }), register);

app.get('/login', showLogin);
app.post('/login', express.urlencoded({ extended: true }), login);

app.get('/logout', logout);

// Protect wishlist and add-item routes
app.get('/wishlist', requireLogin, async (req, res) => {
  const user = await User.findById(req.session.userId).populate('wishlist').lean();
  res.render('wishlist', { title: `${user.username}'s Wishlist`, items: user.wishlist });
});

export const showRegister = (req, res) => {
  res.render('register', { title: 'Register' });
};

export const register = async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    const user = await User.create({ username, email, password: hashedPassword });
    req.session.userId = user._id;
    res.redirect('/wishlist');
  } catch (err) {
    res.status(400).render('register', { error: 'Username or email already in use' });
  }
};

export const showLogin = (req, res) => {
  res.render('login', { title: 'Login' });
};

export const login = async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (!user) return res.status(400).render('login', { error: 'Invalid Credentials' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).render('login', { error: 'Invalid Credentials' });

  req.session.userId = user._id;
  res.redirect('/wishlist');
};

export const logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
};

export const requireLogin = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};
