'use strict';

const { Board, BoardMember, Column, Task, Comment } = require('../src/models');
const { requireRole } = require('../src/middleware/rbac');
const {
  resetDb, createUser, api, createBoard, addMember, createTask, taskUrl,
} = require('./helpers');

beforeEach(resetDb);

/** Доска с владельцем, обычным участником, соадмином, посторонним и глобальным админом. */
const setup = async () => {
  const owner = await createUser({ username: 'owner' });
  const member = await createUser({ username: 'member' });
  const coAdmin = await createUser({ username: 'coadmin' });
  const stranger = await createUser({ username: 'stranger' });
  const siteAdmin = await createUser({ username: 'siteadmin', role: 'admin' });

  const { board, columns } = await createBoard(owner, { title: 'Board A' });
  await addMember(board, member, 'member');
  await addMember(board, coAdmin, 'admin');

  return { owner, member, coAdmin, stranger, siteAdmin, board, columns };
};

describe('authentication is required', () => {
  test.each([
    ['get', '/api/boards'],
    ['post', '/api/boards'],
    ['get', '/api/boards/00000000-0000-4000-8000-000000000000'],
    ['get', '/api/boards/00000000-0000-4000-8000-000000000000/columns'],
    ['get', '/api/users?search=ab'],
    ['get', '/api/auth/me'],
  ])('%s %s without a token returns 401', async (method, url) => {
    const res = await api(method, url);

    expect(res.status).toBe(401);
  });
});

describe('global roles: requireRole()', () => {
  const run = (role, ...required) => {
    const next = jest.fn();
    requireRole(...required)({ user: { role } }, {}, next);
    return next.mock.calls[0][0];
  };

  test('allows a role equal to or above the required one', () => {
    expect(run('user', 'user')).toBeUndefined();
    expect(run('moderator', 'moderator')).toBeUndefined();
    expect(run('admin', 'moderator')).toBeUndefined();
    expect(run('admin', 'admin')).toBeUndefined();
  });

  test('rejects a role below the required one with 403', () => {
    const error = run('user', 'moderator');
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
    expect(run('moderator', 'admin').statusCode).toBe(403);
  });

  test('an unknown role has no access', () => {
    expect(run('hacker', 'user').statusCode).toBe(403);
  });
});

describe('board access', () => {
  test('a member can read the board, a stranger cannot', async () => {
    const { owner, member, stranger, board } = await setup();

    expect((await api('get', `/api/boards/${board.id}`, owner)).status).toBe(200);
    expect((await api('get', `/api/boards/${board.id}`, member)).status).toBe(200);

    const denied = await api('get', `/api/boards/${board.id}`, stranger);
    expect(denied.status).toBe(403);
    expect(denied.body.code).toBe('NOT_BOARD_MEMBER');
  });

  test('a global admin can read any board', async () => {
    const { siteAdmin, board } = await setup();

    expect((await api('get', `/api/boards/${board.id}`, siteAdmin)).status).toBe(200);
  });

  test('the board list contains only boards the user is a member of', async () => {
    const { owner, member, stranger } = await setup();

    expect((await api('get', '/api/boards', owner)).body.data).toHaveLength(1);
    expect((await api('get', '/api/boards', member)).body.data).toHaveLength(1);
    expect((await api('get', '/api/boards', stranger)).body.data).toHaveLength(0);
  });

  test('only board admins can update a board', async () => {
    const { owner, member, stranger, coAdmin, board } = await setup();
    const url = `/api/boards/${board.id}`;

    expect((await api('put', url, owner).send({ title: 'Renamed' })).status).toBe(200);
    expect((await api('put', url, coAdmin).send({ title: 'Renamed by co-admin' })).status).toBe(200);

    const asMember = await api('put', url, member).send({ title: 'Hacked' });
    expect(asMember.status).toBe(403);
    expect(asMember.body.code).toBe('FORBIDDEN');
    expect((await api('put', url, stranger).send({ title: 'Hacked' })).status).toBe(403);

    expect((await Board.findByPk(board.id)).title).toBe('Renamed by co-admin');
  });

  test('a stranger cannot update or delete a board, and the board stays intact', async () => {
    const { stranger, board } = await setup();

    expect((await api('delete', `/api/boards/${board.id}`, stranger)).status).toBe(403);
    expect(await Board.findByPk(board.id)).not.toBeNull();
  });
});

describe('deleting a board', () => {
  test('a regular member cannot delete it', async () => {
    const { member, board } = await setup();

    expect((await api('delete', `/api/boards/${board.id}`, member)).status).toBe(403);
    expect(await Board.findByPk(board.id)).not.toBeNull();
  });

  test('a board admin who is not the owner cannot delete it', async () => {
    const { coAdmin, board } = await setup();

    const res = await api('delete', `/api/boards/${board.id}`, coAdmin);

    expect(res.status).toBe(403);
    expect(await Board.findByPk(board.id)).not.toBeNull();
  });

  test('the owner can delete it, with columns removed by cascade', async () => {
    const { owner, board } = await setup();

    const res = await api('delete', `/api/boards/${board.id}`, owner);

    expect(res.status).toBe(200);
    expect(await Board.findByPk(board.id)).toBeNull();
    expect(await Column.count({ where: { board_id: board.id } })).toBe(0);
    expect(await BoardMember.count({ where: { board_id: board.id } })).toBe(0);
  });

  test('a global admin can delete any board', async () => {
    const { siteAdmin, board } = await setup();

    expect((await api('delete', `/api/boards/${board.id}`, siteAdmin)).status).toBe(200);
    expect(await Board.findByPk(board.id)).toBeNull();
  });
});

describe('board members', () => {
  test('a board admin can add a member, a regular member cannot', async () => {
    const { owner, member, stranger, board } = await setup();
    const url = `/api/boards/${board.id}/members`;

    const denied = await api('post', url, member).send({ userId: stranger.id });
    expect(denied.status).toBe(403);
    expect(await BoardMember.count({ where: { user_id: stranger.id } })).toBe(0);

    const added = await api('post', url, owner).send({ userId: stranger.id });
    expect(added.status).toBe(201);
    expect(added.body.data.member.role).toBe('member');
  });

  test('a newly added member gets access to the board', async () => {
    const { owner, stranger, board } = await setup();
    expect((await api('get', `/api/boards/${board.id}`, stranger)).status).toBe(403);

    await api('post', `/api/boards/${board.id}/members`, owner).send({ userId: stranger.id });

    expect((await api('get', `/api/boards/${board.id}`, stranger)).status).toBe(200);
  });

  test('adding the same user twice returns 409', async () => {
    const { owner, member, board } = await setup();

    const res = await api('post', `/api/boards/${board.id}/members`, owner).send({ userId: member.id });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ALREADY_MEMBER');
  });

  test('adding an unknown user returns 404, an invalid role returns 422', async () => {
    const { owner, stranger, board } = await setup();
    const url = `/api/boards/${board.id}/members`;

    expect((await api('post', url, owner).send({ userId: '11111111-1111-4111-8111-111111111111' })).status).toBe(404);
    expect((await api('post', url, owner).send({ userId: stranger.id, role: 'superuser' })).status).toBe(422);
  });

  test('removing a member revokes their access; the owner cannot be removed', async () => {
    const { owner, member, coAdmin, board } = await setup();

    const ownerRemoval = await api('delete', `/api/boards/${board.id}/members/${owner.id}`, coAdmin);
    expect(ownerRemoval.status).toBe(400);
    expect(ownerRemoval.body.code).toBe('CANNOT_REMOVE_OWNER');

    expect((await api('delete', `/api/boards/${board.id}/members/${member.id}`, owner)).status).toBe(200);
    expect((await api('get', `/api/boards/${board.id}`, member)).status).toBe(403);
  });

  test('a regular member cannot remove other members', async () => {
    const { member, coAdmin, board } = await setup();

    const res = await api('delete', `/api/boards/${board.id}/members/${coAdmin.id}`, member);

    expect(res.status).toBe(403);
    expect(await BoardMember.count({ where: { user_id: coAdmin.id } })).toBe(1);
  });

  test('removing a member of a board that does not exist returns 404 for a global admin', async () => {
    const { siteAdmin, member } = await setup();

    const res = await api(
      'delete',
      `/api/boards/22222222-2222-4222-8222-222222222222/members/${member.id}`,
      siteAdmin
    );

    expect(res.status).toBe(404);
  });
});

describe('columns and tasks: who can do what', () => {
  test('only board admins manage columns; every member can read them', async () => {
    const { owner, member, stranger, board, columns } = await setup();
    const url = `/api/boards/${board.id}/columns`;

    expect((await api('get', url, member)).status).toBe(200);
    expect((await api('get', url, stranger)).status).toBe(403);

    expect((await api('post', url, member).send({ title: 'Nope' })).status).toBe(403);
    expect((await api('put', `${url}/${columns[0].id}`, member).send({ title: 'Nope' })).status).toBe(403);
    expect((await api('delete', `${url}/${columns[0].id}`, member)).status).toBe(403);
    expect((await api('post', url, owner).send({ title: 'Review' })).status).toBe(201);
  });

  test('every member can create tasks, a stranger cannot', async () => {
    const { member, stranger, board, columns } = await setup();
    const url = `/api/boards/${board.id}/columns/${columns[0].id}/tasks`;

    expect((await api('post', url, member).send({ title: 'Mine' })).status).toBe(201);

    const denied = await api('post', url, stranger).send({ title: 'Intruder' });
    expect(denied.status).toBe(403);
    expect(await Task.count()).toBe(1);
  });

  test('a stranger cannot read tasks, comments or history', async () => {
    const { owner, stranger, board, columns } = await setup();
    const task = await createTask(owner, board, columns[0]);

    expect((await api('get', `/api/boards/${board.id}/columns/${columns[0].id}/tasks`, stranger)).status).toBe(403);
    expect((await api('get', taskUrl(board, columns[0], task), stranger)).status).toBe(403);
    expect((await api('get', taskUrl(board, columns[0], task, '/history'), stranger)).status).toBe(403);
    expect((await api('post', taskUrl(board, columns[0], task, '/comments'), stranger).send({ body: 'hi' })).status).toBe(403);
  });

  test('a task can be deleted by its creator or a board admin, but not by another member', async () => {
    const { owner, member, coAdmin, board, columns } = await setup();
    const otherMember = await createUser();
    await addMember(board, otherMember);

    const byMember = await createTask(member, board, columns[0], { title: 'By member' });
    const byOwner = await createTask(owner, board, columns[0], { title: 'By owner' });

    // чужую задачу обычный участник удалить не может
    const denied = await api('delete', taskUrl(board, columns[0], byOwner), member);
    expect(denied.status).toBe(403);
    expect((await api('delete', taskUrl(board, columns[0], byMember), otherMember)).status).toBe(403);
    expect(await Task.count()).toBe(2);

    // создатель и админ доски — могут
    expect((await api('delete', taskUrl(board, columns[0], byMember), member)).status).toBe(200);
    expect((await api('delete', taskUrl(board, columns[0], byOwner), coAdmin)).status).toBe(200);
    expect(await Task.count()).toBe(0);
  });

  test('comments can be deleted by their author or a global admin only', async () => {
    const { owner, member, siteAdmin, board, columns } = await setup();
    const task = await createTask(owner, board, columns[0]);
    const add = async () =>
      (await api('post', taskUrl(board, columns[0], task, '/comments'), member).send({ body: 'note' })).body.data;

    const first = await add();
    const denied = await api('delete', taskUrl(board, columns[0], task, `/comments/${first.id}`), owner);
    expect(denied.status).toBe(403);
    expect(await Comment.count()).toBe(1);

    expect((await api('delete', taskUrl(board, columns[0], task, `/comments/${first.id}`), member)).status).toBe(200);

    const second = await add();
    expect((await api('delete', taskUrl(board, columns[0], task, `/comments/${second.id}`), siteAdmin)).status).toBe(200);
    expect(await Comment.count()).toBe(0);
  });
});

describe('isolation between boards (a member of board B must not touch board A)', () => {
  /** Жертва владеет доской A с задачей и комментарием, атакующий — админ только своей доски B. */
  const twoBoards = async () => {
    const victim = await createUser({ username: 'victim' });
    const attacker = await createUser({ username: 'attacker' });

    const a = await createBoard(victim, { title: 'Secret board A' });
    const b = await createBoard(attacker, { title: 'Attacker board B' });

    const taskA = await createTask(victim, a.board, a.columns[0], { title: 'Secret task' });
    const taskB = await createTask(attacker, b.board, b.columns[0], { title: 'My task' });
    const commentA = (await api('post', taskUrl(a.board, a.columns[0], taskA, '/comments'), victim)
      .send({ body: 'private note' })).body.data;

    return { victim, attacker, a, b, taskA, taskB, commentA };
  };

  test('cannot list tasks of a column that belongs to another board', async () => {
    const { attacker, a, b } = await twoBoards();

    const res = await api('get', `/api/boards/${b.board.id}/columns/${a.columns[0].id}/tasks`, attacker);

    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('Secret task');
  });

  test('cannot read a task of another board', async () => {
    const { attacker, b, taskA } = await twoBoards();

    const res = await api('get', taskUrl(b.board, b.columns[0], taskA), attacker);

    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('Secret task');
  });

  test('cannot read the history of a task of another board', async () => {
    const { attacker, b, taskA } = await twoBoards();

    const res = await api('get', taskUrl(b.board, b.columns[0], taskA, '/history'), attacker);

    expect(res.status).toBe(404);
  });

  test('cannot update a task of another board', async () => {
    const { attacker, b, taskA } = await twoBoards();

    const res = await api('put', taskUrl(b.board, b.columns[0], taskA), attacker).send({ title: 'Hacked' });

    expect(res.status).toBe(404);
    expect((await Task.findByPk(taskA.id)).title).toBe('Secret task');
  });

  test('cannot delete a task of another board', async () => {
    const { attacker, b, taskA } = await twoBoards();

    const res = await api('delete', taskUrl(b.board, b.columns[0], taskA), attacker);

    expect(res.status).toBe(404);
    expect(await Task.findByPk(taskA.id)).not.toBeNull();
  });

  test('cannot comment on a task of another board', async () => {
    const { attacker, b, taskA } = await twoBoards();

    const res = await api('post', taskUrl(b.board, b.columns[0], taskA, '/comments'), attacker).send({ body: 'spam' });

    expect(res.status).toBe(404);
    expect(await Comment.count({ where: { task_id: taskA.id } })).toBe(1);
  });

  test('cannot delete a comment of another board', async () => {
    const { attacker, b, taskB, commentA } = await twoBoards();

    const res = await api('delete', taskUrl(b.board, b.columns[0], taskB, `/comments/${commentA.id}`), attacker);

    expect(res.status).toBe(404);
    expect(await Comment.findByPk(commentA.id)).not.toBeNull();
  });

  test('cannot create a task in a column of another board', async () => {
    const { attacker, a, b } = await twoBoards();

    const res = await api('post', `/api/boards/${b.board.id}/columns/${a.columns[0].id}/tasks`, attacker)
      .send({ title: 'Injected' });

    expect(res.status).toBe(404);
    expect(await Task.count({ where: { title: 'Injected' } })).toBe(0);
  });

  test('cannot move own task into a column of another board', async () => {
    const { attacker, a, b, taskB } = await twoBoards();

    const res = await api('patch', taskUrl(b.board, b.columns[0], taskB, '/move'), attacker)
      .send({ column_id: a.columns[1].id, position: 0 });

    expect(res.status).toBe(404);
    expect((await Task.findByPk(taskB.id)).column_id).toBe(b.columns[0].id);
  });

  test('cannot rename or delete a column of another board', async () => {
    const { attacker, a, b } = await twoBoards();
    const url = `/api/boards/${b.board.id}/columns/${a.columns[0].id}`;

    expect((await api('put', url, attacker).send({ title: 'Hacked' })).status).toBe(404);
    expect((await Column.findByPk(a.columns[0].id)).title).toBe('To Do');

    expect((await api('delete', url, attacker)).status).toBe(404);
    expect(await Column.findByPk(a.columns[0].id)).not.toBeNull();
  });

  test('cannot move a column of another board', async () => {
    const { attacker, a, b } = await twoBoards();

    const res = await api('patch', `/api/boards/${b.board.id}/columns/${a.columns[0].id}/move`, attacker)
      .send({ position: 2 });

    expect(res.status).toBe(404);
    expect((await Column.findByPk(a.columns[0].id)).position).toBe(0);
  });

  test('a user can still work normally on their own board', async () => {
    const { attacker, b, taskB } = await twoBoards();

    expect((await api('put', taskUrl(b.board, b.columns[0], taskB), attacker).send({ title: 'Renamed' })).status).toBe(200);
    expect((await api('patch', taskUrl(b.board, b.columns[0], taskB, '/move'), attacker)
      .send({ column_id: b.columns[1].id, position: 0 })).status).toBe(200);
  });
});
