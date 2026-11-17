const prisma = require('../prisma/client');
const { saveUser } = require('../services/userService');
const bcrypt = require('bcryptjs');
const { signIn } = require('../services/auth');
const taskService = require('../services/taskService');

exports.getLogin = (req, res) => res.render('login', { error: null, email: '' });

exports.login = async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = req.body?.password;
  const user = await prisma.user.findUnique({ where: { email } });
  // Auch unbekannte Konten durchlaufen bcrypt: gleiche Meldung und ähnliche Laufzeit.
  const hash = user?.password || '$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
  const valid = await bcrypt.compare(typeof password === 'string' ? password : '', hash);
  if (!user || !valid) {
    return res.status(401).render('login', { error: 'E-Mail oder Passwort ist falsch.', email });
  }
  await signIn(req, user);
  res.redirect('/');
};

exports.logout = (req, res, next) => {
  req.session.destroy(error => {
    if (error) return next(error);
    res.clearCookie('connect.sid', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    res.redirect('/login');
  });
};

exports.getRegistration = (req, res) => {
  res.render('register', { error: null, email: '' });
};

exports.register = async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = req.body?.password;
  let error = '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 191) {
    error = 'Bitte gib eine gültige E-Mail-Adresse ein.';
  } else if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    error = 'Das Passwort muss mindestens 8 Zeichen und höchstens 72 Bytes haben.';
  }
  if (error) {
    return res.status(400).render('register', { error, email });
  }

  try {
    const user = await prisma.$transaction(async database => {
      const admin = await database.user.findFirst({ where: { role: 'admin' }, orderBy: { id: 'asc' } });
      if (!admin) {
        throw new Error('NO_ADMIN');
      }
      const user = await saveUser({ email, password }, database);
      const dueDate = new Date(new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' }));
      dueDate.setUTCDate(dueDate.getUTCDate() + 2);
      await taskService.createTask({
        title: 'Profilbild hochladen',
        description: 'Lade ein Profilbild für dein Benutzerkonto hoch.',
        dueDate,
        assigneeId: user.id
      }, admin, database);
      return user;
    });
    await signIn(req, user);
    res.redirect('/');
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).render('register', { error: 'Diese E-Mail-Adresse wird bereits verwendet.', email });
    }
    const message = error.message === 'NO_ADMIN'
      ? 'Es gibt keinen Admin. Bitte führe zuerst den Seed aus.'
      : 'Die Registrierung konnte nicht gespeichert werden. Bitte prüfe die Datenbank.';
    console.error('Registrierung:', error.code || error.name);
    res.status(503).render('register', { error: message, email });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, profileImage: true, role: true },
      orderBy: { id: 'asc' }
    });
    res.render('users', { users });
  } catch (error) {
    console.error('Benutzer laden:', error.code || error.name);
    res.status(503).send('Die Benutzer konnten nicht geladen werden. Bitte prüfe die Datenbank.');
  }
};

exports.changeRole = async (req, res) => {
  const id = Number(req.params.id);
  const role = req.body?.role;
  if (!Number.isSafeInteger(id) || id < 1 || !['admin', 'user'].includes(role)) {
    return res.status(400).send('Ungültiger Benutzer oder ungültige Rolle.');
  }
  try {
    const changed = await prisma.$transaction(async database => {
      const user = await database.user.findUnique({ where: { id } });
      if (user?.role === 'admin' && role === 'user' && await database.user.count({ where: { role: 'admin' } }) === 1) return false;
      await database.user.update({ where: { id }, data: { role } });
      return true;
    }, { isolationLevel: 'Serializable' });
    if (!changed) return res.status(409).send('Der letzte Admin darf nicht herabgestuft werden.');
    res.redirect('/users');
  } catch (error) {
    if (error.code === 'P2034') return res.status(409).send('Gleichzeitige Rollenänderung. Bitte erneut versuchen.');
    if (error.code === 'P2025') {
      return res.status(404).send('Diesen Benutzer gibt es nicht.');
    }
    console.error('Rolle ändern:', error.code || error.name);
    res.status(503).send('Die Rolle konnte nicht gespeichert werden.');
  }
};
