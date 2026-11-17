const taskService = require('../services/taskService');

const taskTimeZone = 'Europe/Zurich';

function getToday() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: taskTimeZone });
}

exports.getAllTasks = async (req, res) => {
  try {
    const tasks = await taskService.getTasks(req.user);
    const users = await taskService.getAssignees(req.user);
    res.render('index', { tasks, users });
  } catch (error) {
    console.error('Aufgaben laden:', error.code || error.name);
    res.status(503).send('Aufgaben konnten nicht geladen werden. Bitte prüfe die Datenbank.');
  }
};

exports.getNewTaskForm = (req, res) => {
  res.render('new-Task', { minDueDate: getToday() });
};

exports.createTask = async (req, res) => {
  if (req.user.role !== 'admin' && req.body?.assigneeId !== undefined) {
    return res.status(403).send('Nur Admins dürfen Aufgaben zuweisen.');
  }
  const { title, description = '', dueDate } = req.body || {};
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 191 ||
      typeof description !== 'string' || description.trim().length > 191 ||
      typeof dueDate !== 'string' || !dueDate) {
    return res.status(400).send('Bitte gib einen Titel und ein Datum ein. Texte dürfen höchstens 191 Zeichen haben.');
  }

  const date = new Date(dueDate + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== dueDate || dueDate < getToday()) {
    return res.status(400).send('Bitte wähle ein gültiges Datum ab heute.');
  }

  try {
    await taskService.createTask({ title: title.trim(), description: description.trim(), dueDate: date }, req.user);
    res.redirect('/');
  } catch (error) {
    console.error('Aufgabe speichern:', error.code || error.name);
    res.status(503).send('Die Aufgabe konnte nicht gespeichert werden. Bitte prüfe die Datenbank.');
  }
};

exports.completeTask = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).send('Ungültige Aufgaben-ID.');
  }
  try {
    await taskService.completeTask(id, req.user);
    res.redirect('/');
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).send('Diese Aufgabe gibt es nicht.');
    }
    console.error('Aufgabe erledigen:', error.code || error.name);
    res.status(503).send('Die Aufgabe konnte nicht aktualisiert werden.');
  }
};

exports.deleteTask = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).send('Ungültige Aufgaben-ID.');
  }
  try {
    await taskService.deleteTask(id, req.user);
    res.redirect('/');
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).send('Diese Aufgabe gibt es nicht.');
    }
    console.error('Aufgabe löschen:', error.code || error.name);
    res.status(503).send('Die Aufgabe konnte nicht gelöscht werden.');
  }
};

exports.assignTask = async (req, res) => {
  const id = Number(req.params.id);
  const value = req.body?.assigneeId;
  if (!Number.isSafeInteger(id) || id < 1 || typeof value !== 'string') {
    return res.status(400).send('Ungültige Aufgabe oder Zuweisung.');
  }
  const assigneeId = value === '' ? null : Number(value);
  if (assigneeId !== null && (!/^\d+$/.test(value) || !Number.isSafeInteger(assigneeId) || assigneeId < 1)) {
    return res.status(400).send('Ungültiger Benutzer.');
  }
  try {
    await taskService.assignTask(id, assigneeId);
    res.redirect('/');
  } catch (error) {
    if (error.code === 'P2025' || error.code === 'P2003') {
      return res.status(404).send('Aufgabe oder Benutzer nicht gefunden.');
    }
    console.error('Aufgabe zuweisen:', error.code || error.name);
    res.status(503).send('Die Zuweisung konnte nicht gespeichert werden.');
  }
};
