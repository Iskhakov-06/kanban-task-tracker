-- ============================================================
--  Task Tracker — полная схема базы данных
--  MySQL 8.0+
--  Порядок: создаём таблицы от независимых к зависимым
-- ============================================================

CREATE DATABASE IF NOT EXISTS task_tracker
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE task_tracker;

-- ── 1. users ─────────────────────────────────────────────────
--  Хранит всех пользователей системы.
--  password_hash — bcrypt, никогда не возвращается клиенту.
--  role — глобальная роль: admin > moderator > user.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                     CHAR(36)     NOT NULL DEFAULT (UUID()),
  username               VARCHAR(50)  NOT NULL,
  email                  VARCHAR(100) NOT NULL,
  password_hash          VARCHAR(255) NOT NULL,
  role                   ENUM('admin','moderator','user') NOT NULL DEFAULT 'user',
  is_verified            TINYINT(1)   NOT NULL DEFAULT 0,
  verification_token     VARCHAR(255)     NULL,
  reset_password_token   VARCHAR(255)     NULL,
  reset_password_expires DATETIME         NULL,
  avatar_url             VARCHAR(500)     NULL,
  created_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email    (email),
  INDEX idx_users_role         (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 2. boards ────────────────────────────────────────────────
--  Доска — корневой объект, принадлежит одному владельцу.
--  При удалении владельца доска тоже удаляется (CASCADE).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS boards (
  id               CHAR(36)     NOT NULL DEFAULT (UUID()),
  title            VARCHAR(100) NOT NULL,
  description      TEXT             NULL,
  owner_id         CHAR(36)     NOT NULL,
  background_color CHAR(7)      NOT NULL DEFAULT '#0079BF',
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_boards_owner (owner_id),
  CONSTRAINT fk_boards_owner
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 3. board_members ─────────────────────────────────────────
--  Связь N:M между пользователями и досками.
--  role здесь — роль на доске (admin доски vs обычный member).
--  Пара (board_id, user_id) уникальна.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS board_members (
  id         CHAR(36) NOT NULL DEFAULT (UUID()),
  board_id   CHAR(36) NOT NULL,
  user_id    CHAR(36) NOT NULL,
  role       ENUM('admin','member') NOT NULL DEFAULT 'member',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_board_members        (board_id, user_id),
  INDEX      idx_board_members_user  (user_id),
  CONSTRAINT fk_bm_board
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_bm_user
    FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 4. columns ───────────────────────────────────────────────
--  Колонки доски (To Do / In Progress / Done и любые другие).
--  position — целое число для сортировки; при перетаскивании
--  обновляется у всех затронутых колонок.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS columns (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()),
  board_id   CHAR(36)     NOT NULL,
  title      VARCHAR(100) NOT NULL,
  position   INT          NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_columns_board    (board_id),
  INDEX idx_columns_position (board_id, position),
  CONSTRAINT fk_columns_board
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 5. tasks ─────────────────────────────────────────────────
--  Задача — основная единица работы.
--  assignee_id может быть NULL (неназначенная задача).
--  При удалении исполнителя поле обнуляется (SET NULL).
--  position — порядок внутри колонки.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id          CHAR(36)     NOT NULL DEFAULT (UUID()),
  column_id   CHAR(36)     NOT NULL,
  title       VARCHAR(200) NOT NULL,
  description TEXT             NULL,
  assignee_id CHAR(36)         NULL,
  created_by  CHAR(36)     NOT NULL,
  priority    ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  due_date    DATETIME         NULL,
  position    INT          NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_tasks_column   (column_id),
  INDEX idx_tasks_assignee (assignee_id),
  INDEX idx_tasks_creator  (created_by),
  INDEX idx_tasks_priority (priority),
  INDEX idx_tasks_due_date (due_date),
  INDEX idx_tasks_position (column_id, position),
  CONSTRAINT fk_tasks_column
    FOREIGN KEY (column_id)   REFERENCES columns(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_tasks_assignee
    FOREIGN KEY (assignee_id) REFERENCES users(id)   ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_tasks_creator
    FOREIGN KEY (created_by)  REFERENCES users(id)   ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 6. comments ──────────────────────────────────────────────
--  Комментарии к задаче. При удалении задачи удаляются и они.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id         CHAR(36) NOT NULL DEFAULT (UUID()),
  task_id    CHAR(36) NOT NULL,
  user_id    CHAR(36) NOT NULL,
  body       TEXT     NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_comments_task (task_id),
  INDEX idx_comments_user (user_id),
  CONSTRAINT fk_comments_task
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_comments_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 7. action_logs ───────────────────────────────────────────
--  Неизменяемая история всех действий с задачей.
--  updated_at намеренно отсутствует — логи не редактируются.
--  payload (JSON) хранит детали: что изменилось и как.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS action_logs (
  id         CHAR(36)    NOT NULL DEFAULT (UUID()),
  task_id    CHAR(36)    NOT NULL,
  user_id    CHAR(36)    NOT NULL,
  action     VARCHAR(50) NOT NULL
    COMMENT 'created|moved|assigned|commented|priority_changed|...',
  payload    JSON            NULL
    COMMENT 'Детали изменения: {"from":"To Do","to":"In Progress"}',
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_action_logs_task      (task_id),
  INDEX idx_action_logs_user      (user_id),
  INDEX idx_action_logs_action    (action),
  INDEX idx_action_logs_task_time (task_id, created_at),
  CONSTRAINT fk_action_logs_task
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_action_logs_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 8. refresh_tokens ────────────────────────────────────────
--  Хранит refresh-токены для ротации JWT.
--  is_revoked = 1 — токен отозван (logout / подозрительная активность).
--  Устаревшие токены можно чистить по cron: WHERE expires_at < NOW().
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          CHAR(36)     NOT NULL DEFAULT (UUID()),
  user_id     CHAR(36)     NOT NULL,
  token       VARCHAR(500) NOT NULL,
  expires_at  DATETIME     NOT NULL,
  is_revoked  TINYINT(1)   NOT NULL DEFAULT 0,
  user_agent  VARCHAR(300)     NULL COMMENT 'Браузер/устройство',
  ip_address  VARCHAR(45)      NULL COMMENT 'IPv4 или IPv6',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_refresh_token          (token),
  INDEX      idx_refresh_tokens_user   (user_id),
  INDEX      idx_refresh_tokens_expires(expires_at),
  CONSTRAINT fk_refresh_tokens_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  Полезные представления (VIEW) — удобны при отладке
-- ============================================================

-- Задачи с именами исполнителей и названием колонки
CREATE OR REPLACE VIEW v_tasks_full AS
SELECT
  t.id,
  t.title,
  t.priority,
  t.due_date,
  t.position,
  c.title  AS column_title,
  b.id     AS board_id,
  b.title  AS board_title,
  u.username AS assignee,
  cr.username AS created_by
FROM tasks t
JOIN columns c ON c.id = t.column_id
JOIN boards  b ON b.id = c.board_id
LEFT JOIN users u  ON u.id  = t.assignee_id
LEFT JOIN users cr ON cr.id = t.created_by;

-- Статистика по доскам
CREATE OR REPLACE VIEW v_board_stats AS
SELECT
  b.id,
  b.title,
  COUNT(DISTINCT bm.user_id) AS member_count,
  COUNT(DISTINCT t.id)       AS task_count
FROM boards b
LEFT JOIN board_members bm ON bm.board_id = b.id
LEFT JOIN columns col      ON col.board_id = b.id
LEFT JOIN tasks t          ON t.column_id  = col.id
GROUP BY b.id, b.title;
