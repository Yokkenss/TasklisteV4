const prisma = require('../prisma/client');

exports.guestOnly = (req, res, next) => req.user ? res.redirect('/') : next();
exports.requireLogin = (req, res, next) => req.user ? next() : res.redirect('/login');
exports.requireAdmin = (req, res, next) => req.user.role === 'admin' ? next() : res.status(403).send('Nur für Administratoren.');

exports.loadUser = async (req, res, next) => {
  req.user = req.session.userId
    ? await prisma.user.findUnique({ where: { id: req.session.userId }, select: { id: true, email: true, role: true } })
    : null;
  if (!req.user) delete req.session.userId;
  res.locals.currentUser = req.user;
  res.set('Cache-Control', 'no-store');
  next();
};

// Eine gemeinsame Anmeldung für Login und Registrierung.
exports.signIn = async (req, user) => {
  await new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
  req.session.userId = user.id;
  await new Promise((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
};
