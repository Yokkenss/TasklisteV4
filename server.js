require('dotenv').config({ quiet: true });
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET fehlt in der Umgebung.');

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 2 * 60 * 60 * 1000, secure: process.env.NODE_ENV === 'production' }
}));

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(require('./services/auth').loadUser);
app.use('/', require('./routes/userRoutes'));
app.use('/', require('./routes/taskRoutes'));

app.use((error, req, res, next) => {
  console.error(error.code || error.name);
  res.status(503).send('Die Anfrage konnte nicht verarbeitet werden. Bitte versuche es später erneut.');
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log('Server running at http://localhost:' + port));
}

module.exports = app;
