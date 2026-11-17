const express = require('express');
const router = express.Router();
const controller = require('../controllers/taskController');
const { requireLogin, requireAdmin } = require('../services/auth');

router.use(requireLogin);

router.get('/', controller.getAllTasks);
router.get('/tasks/new', controller.getNewTaskForm);
router.post('/tasks', controller.createTask);
router.post('/tasks/:id/complete', controller.completeTask);
router.post('/tasks/:id/delete', controller.deleteTask);
router.post('/tasks/:id/assign', requireAdmin, controller.assignTask);

module.exports = router;
