'use strict';

const { Board, BoardMember, Column, Task, ActionLog } = require('../src/models');
const {
  resetDb, createUser, api, createBoard, createTask, taskUrl,
} = require('./helpers');

beforeEach(resetDb);

const columnsUrl = (board) => `/api/boards/${board.id}/columns`;

/** Позиции задач колонки, отсортированные по позиции: [['Title', 0], ...] */
const positions = async (column) =>
  (await Task.findAll({ where: { column_id: column.id }, order: [['position', 'ASC']] }))
    .map((t) => [t.title, t.position]);

describe('boards', () => {
  test('creating a board makes the creator its admin and adds the default columns', async () => {
    const owner = await createUser();

    const res = await api('post', '/api/boards', owner).send({ title: 'Roadmap', description: 'Q4' });

    expect(res.status).toBe(201);
    const boardId = res.body.data.id;

    const membership = await BoardMember.findOne({ where: { board_id: boardId, user_id: owner.id } });
    expect(membership.role).toBe('admin');

    const columns = await Column.findAll({ where: { board_id: boardId }, order: [['position', 'ASC']] });
    expect(columns.map((c) => [c.title, c.position])).toEqual([
      ['To Do', 0], ['In Progress', 1], ['Done', 2],
    ]);
  });

  test.each([
    ['empty title', { title: '' }],
    ['title longer than 100 chars', { title: 'x'.repeat(101) }],
    ['invalid background color', { title: 'Ok', background_color: 'blue' }],
  ])('rejects %s with 422', async (_name, body) => {
    const owner = await createUser();

    const res = await api('post', '/api/boards', owner).send(body);

    expect(res.status).toBe(422);
    expect(await Board.count()).toBe(0);
  });

  test('GET /api/boards paginates', async () => {
    const owner = await createUser();
    for (const title of ['A', 'B', 'C']) await createBoard(owner, { title });

    const page1 = await api('get', '/api/boards?limit=2&page=1', owner);
    const page2 = await api('get', '/api/boards?limit=2&page=2', owner);

    expect(page1.body.data).toHaveLength(2);
    expect(page1.body.pagination).toMatchObject({ total: 3, page: 1, limit: 2, totalPages: 2, hasNextPage: true });
    expect(page2.body.data).toHaveLength(1);
    expect(page2.body.pagination.hasNextPage).toBe(false);
  });

  test('GET /api/boards/:id returns members and columns', async () => {
    const owner = await createUser();
    const { board } = await createBoard(owner);

    const res = await api('get', `/api/boards/${board.id}`, owner);

    expect(res.status).toBe(200);
    expect(res.body.data.columns).toHaveLength(3);
    expect(res.body.data.members).toHaveLength(1);
    expect(res.body.data.members[0].user.id).toBe(owner.id);
    expect(JSON.stringify(res.body)).not.toContain('password_hash');
  });

  test('returns 404 for an unknown board (global admin)', async () => {
    const siteAdmin = await createUser({ role: 'admin' });

    const res = await api('get', '/api/boards/33333333-3333-4333-8333-333333333333', siteAdmin);

    expect(res.status).toBe(404);
  });
});

describe('columns', () => {
  test('a new column is appended at the end', async () => {
    const owner = await createUser();
    const { board } = await createBoard(owner);

    const res = await api('post', columnsUrl(board), owner).send({ title: 'Review' });

    expect(res.status).toBe(201);
    expect(res.body.data.position).toBe(3);
  });

  test('rejects an empty column title with 422', async () => {
    const owner = await createUser();
    const { board } = await createBoard(owner);

    expect((await api('post', columnsUrl(board), owner).send({ title: '' })).status).toBe(422);
  });

  test('can be renamed', async () => {
    const owner = await createUser();
    const { board, columns } = await createBoard(owner);

    const res = await api('put', `${columnsUrl(board)}/${columns[0].id}`, owner).send({ title: 'Backlog' });

    expect(res.status).toBe(200);
    expect((await Column.findByPk(columns[0].id)).title).toBe('Backlog');
  });

  test('moving a column reorders the others', async () => {
    const owner = await createUser();
    const { board, columns } = await createBoard(owner);

    const res = await api('patch', `${columnsUrl(board)}/${columns[0].id}/move`, owner).send({ position: 2 });

    expect(res.status).toBe(200);
    const ordered = await Column.findAll({ where: { board_id: board.id }, order: [['position', 'ASC']] });
    expect(ordered.map((c) => c.title)).toEqual(['In Progress', 'Done', 'To Do']);
    expect(ordered.map((c) => c.position)).toEqual([0, 1, 2]);
  });

  test('deleting a column deletes its tasks', async () => {
    const owner = await createUser();
    const { board, columns } = await createBoard(owner);
    await createTask(owner, board, columns[0]);

    const res = await api('delete', `${columnsUrl(board)}/${columns[0].id}`, owner);

    expect(res.status).toBe(200);
    expect(await Column.findByPk(columns[0].id)).toBeNull();
    expect(await Task.count()).toBe(0);
  });

  test('returns 404 for an unknown column', async () => {
    const owner = await createUser();
    const { board } = await createBoard(owner);

    const res = await api('put', `${columnsUrl(board)}/44444444-4444-4444-8444-444444444444`, owner).send({ title: 'x' });

    expect(res.status).toBe(404);
  });
});

describe('tasks', () => {
  test('creating tasks assigns increasing positions and default priority', async () => {
    const owner = await createUser();
    const { board, columns } = await createBoard(owner);

    const first = await createTask(owner, board, columns[0], { title: 'First' });
    const second = await createTask(owner, board, columns[0], { title: 'Second' });

    expect(first).toMatchObject({ title: 'First', position: 0, priority: 'medium', created_by: owner.id });
    expect(second.position).toBe(1);
  });

  test('creation is recorded in the task history (and the assignment, if any)', async () => {
    const owner = await createUser();
    const assignee = await createUser({ username: 'assignee' });
    const { board, columns } = await createBoard(owner);

    const task = await createTask(owner, board, columns[0], { assignee_id: assignee.id });

    const actions = (await ActionLog.findAll({ where: { task_id: task.id } })).map((l) => l.action).sort();
    expect(actions).toEqual(['assigned', 'created']);
  });

  test.each([
    ['missing title', { title: '' }],
    ['invalid priority', { title: 'Ok', priority: 'urgent' }],
    ['invalid due date', { title: 'Ok', due_date: 'tomorrow' }],
    ['invalid assignee id', { title: 'Ok', assignee_id: 'not-a-uuid' }],
  ])('rejects %s with 422', async (_name, body) => {
    const owner = await createUser();
    const { board, columns } = await createBoard(owner);

    const res = await api('post', `${columnsUrl(board)}/${columns[0].id}/tasks`, owner).send(body);

    expect(res.status).toBe(422);
    expect(await Task.count()).toBe(0);
  });

  test('updating a task records each change in the history', async () => {
    const owner = await createUser();
    const { board, columns } = await createBoard(owner);
    const task = await createTask(owner, board, columns[0], { title: 'Old' });

    const res = await api('put', taskUrl(board, columns[0], task), owner)
      .send({ title: 'New', priority: 'high' });

    expect(res.status).toBe(200);
    const logs = await ActionLog.findAll({ where: { task_id: task.id, action: ['title_changed', 'priority_changed'] } });
    const byAction = Object.fromEntries(logs.map((l) => [l.action, l.payload]));
    expect(byAction.title_changed).toEqual({ from: 'Old', to: 'New' });
    expect(byAction.priority_changed).toEqual({ from: 'medium', to: 'high' });
  });

  test('GET task returns comments and history', async () => {
    const owner = await createUser();
    const { board, columns } = await createBoard(owner);
    const task = await createTask(owner, board, columns[0]);
    await api('post', taskUrl(board, columns[0], task, '/comments'), owner).send({ body: 'hello' });

    const res = await api('get', taskUrl(board, columns[0], task), owner);

    expect(res.status).toBe(200);
    expect(res.body.data.comments).toHaveLength(1);
    expect(res.body.data.comments[0].author.id).toBe(owner.id);
    expect(res.body.data.history.length).toBeGreaterThanOrEqual(2); // created + commented
  });

  test('returns 404 for an unknown task', async () => {
    const owner = await createUser();
    const { board, columns } = await createBoard(owner);

    const res = await api('get', `${columnsUrl(board)}/${columns[0].id}/tasks/55555555-5555-4555-8555-555555555555`, owner);

    expect(res.status).toBe(404);
  });

  test('the task list can be filtered by priority and paginated', async () => {
    const owner = await createUser();
    const { board, columns } = await createBoard(owner);
    await createTask(owner, board, columns[0], { title: 'Low', priority: 'low' });
    await createTask(owner, board, columns[0], { title: 'High 1', priority: 'high' });
    await createTask(owner, board, columns[0], { title: 'High 2', priority: 'high' });
    const url = `${columnsUrl(board)}/${columns[0].id}/tasks`;

    const high = await api('get', `${url}?priority=high`, owner);
    const paged = await api('get', `${url}?limit=2`, owner);

    expect(high.body.data.map((t) => t.title).sort()).toEqual(['High 1', 'High 2']);
    expect(paged.body.data).toHaveLength(2);
    expect(paged.body.pagination.total).toBe(3);
  });
});

describe('moving tasks', () => {
  const threeTasksAndOne = async () => {
    const owner = await createUser();
    const { board, columns } = await createBoard(owner);
    const t0 = await createTask(owner, board, columns[0], { title: 'T0' });
    const t1 = await createTask(owner, board, columns[0], { title: 'T1' });
    const t2 = await createTask(owner, board, columns[0], { title: 'T2' });
    const other = await createTask(owner, board, columns[1], { title: 'Other' });
    return { owner, board, columns, t0, t1, t2, other };
  };

  test('between columns: closes the gap in the source and makes room in the target', async () => {
    const { owner, board, columns, t0 } = await threeTasksAndOne();

    const res = await api('patch', taskUrl(board, columns[0], t0, '/move'), owner)
      .send({ column_id: columns[1].id, position: 0 });

    expect(res.status).toBe(200);
    expect(await positions(columns[0])).toEqual([['T1', 0], ['T2', 1]]);
    expect(await positions(columns[1])).toEqual([['T0', 0], ['Other', 1]]);
  });

  test('between columns: is recorded in the history with column names', async () => {
    const { owner, board, columns, t0 } = await threeTasksAndOne();

    await api('patch', taskUrl(board, columns[0], t0, '/move'), owner)
      .send({ column_id: columns[1].id, position: 0 });

    const log = await ActionLog.findOne({ where: { task_id: t0.id, action: 'moved' } });
    expect(log.payload).toEqual({ from: 'To Do', to: 'In Progress' });
  });

  test('within a column: moving down shifts the others up', async () => {
    const { owner, board, columns, t0 } = await threeTasksAndOne();

    await api('patch', taskUrl(board, columns[0], t0, '/move'), owner)
      .send({ column_id: columns[0].id, position: 2 });

    expect(await positions(columns[0])).toEqual([['T1', 0], ['T2', 1], ['T0', 2]]);
  });

  test('within a column: moving up shifts the others down', async () => {
    const { owner, board, columns, t2 } = await threeTasksAndOne();

    await api('patch', taskUrl(board, columns[0], t2, '/move'), owner)
      .send({ column_id: columns[0].id, position: 0 });

    expect(await positions(columns[0])).toEqual([['T2', 0], ['T0', 1], ['T1', 2]]);
  });

  test.each([
    ['missing column', { position: 0 }],
    ['invalid column id', { column_id: 'x', position: 0 }],
    ['negative position', { column_id: '66666666-6666-4666-8666-666666666666', position: -1 }],
  ])('rejects %s with 422', async (_name, body) => {
    const { owner, board, columns, t0 } = await threeTasksAndOne();

    const res = await api('patch', taskUrl(board, columns[0], t0, '/move'), owner).send(body);

    expect(res.status).toBe(422);
  });
});

describe('comments', () => {
  test('adding a comment returns it with its author and records it in the history', async () => {
    const owner = await createUser({ username: 'commenter' });
    const { board, columns } = await createBoard(owner);
    const task = await createTask(owner, board, columns[0]);

    const res = await api('post', taskUrl(board, columns[0], task, '/comments'), owner).send({ body: 'Looks good' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ body: 'Looks good', author: { username: 'commenter' } });
    expect(await ActionLog.count({ where: { task_id: task.id, action: 'commented' } })).toBe(1);
  });

  test('rejects an empty comment with 422', async () => {
    const owner = await createUser();
    const { board, columns } = await createBoard(owner);
    const task = await createTask(owner, board, columns[0]);

    const res = await api('post', taskUrl(board, columns[0], task, '/comments'), owner).send({ body: '   ' });

    expect(res.status).toBe(422);
  });

  test('the history endpoint lists the actions with pagination', async () => {
    const owner = await createUser();
    const { board, columns } = await createBoard(owner);
    const task = await createTask(owner, board, columns[0]);
    await api('post', taskUrl(board, columns[0], task, '/comments'), owner).send({ body: 'a' });

    const res = await api('get', taskUrl(board, columns[0], task, '/history'), owner);

    expect(res.status).toBe(200);
    expect(res.body.data.map((l) => l.action).sort()).toEqual(['commented', 'created']);
    expect(res.body.pagination.total).toBe(2);
  });
});
