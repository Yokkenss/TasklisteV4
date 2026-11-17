const prisma = require('../prisma/client');

const taskScope = user => user.role === 'admin' ? {} : { OR: [{ creatorId: user.id }, { assigneeId: user.id }] };

exports.getTasks = user => prisma.task.findMany({
  where: taskScope(user),
  include: {
    creator: { select: { email: true } },
    assignee: { select: { email: true } }
  },
  orderBy: [{ done: 'asc' }, { dueDate: 'asc' }, { id: 'asc' }]
});

exports.getAssignees = user => user.role === 'admin' ? prisma.user.findMany({
  select: { id: true, email: true },
  orderBy: { email: 'asc' }
}) : [];

exports.createTask = (data, user, database = prisma) => database.task.create({
  data: { ...data, creatorId: user.id }
});

exports.completeTask = (id, user) => prisma.task.update({
  where: { id, ...taskScope(user) }, data: { done: true }
});

exports.deleteTask = (id, user) => prisma.task.delete({ where: { id, ...taskScope(user) } });

exports.assignTask = (id, assigneeId) => prisma.task.update({ where: { id }, data: { assigneeId } });
