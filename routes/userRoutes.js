const router = require('express').Router();
const controller = require('../controllers/userController');
const { guestOnly, requireLogin, requireAdmin } = require('../services/auth');

router.get('/login', guestOnly, controller.getLogin);
router.post('/login', guestOnly, controller.login);
router.post('/logout', controller.logout);
router.get('/register', guestOnly, controller.getRegistration);
router.post('/register', guestOnly, controller.register);
router.get('/users', requireLogin, requireAdmin, controller.getUsers);
router.post('/users/:id/role', requireLogin, requireAdmin, controller.changeRole);

module.exports = router;
