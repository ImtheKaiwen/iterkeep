-- iterkeep V1 baseline. Execution: DB worker only, in one BEGIN IMMEDIATE transaction.
-- PRAGMA foreign_keys=ON, journal_mode=WAL and busy_timeout are set by connection bootstrap,
-- before BEGIN; only user_version is updated inside the migration transaction.
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY CHECK (version > 0),
  name TEXT NOT NULL,
  sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
  applied_at TEXT NOT NULL
) STRICT;

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 120),
  inbox_project_id TEXT NOT NULL,
  schema_compatibility_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_compatibility_version >= 1),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  FOREIGN KEY (inbox_project_id) REFERENCES projects(id) DEFERRABLE INITIALLY DEFERRED,
  CHECK (created_at <= updated_at)
) STRICT;
CREATE TRIGGER trg_workspaces_one BEFORE INSERT ON workspaces
WHEN (SELECT count(*) FROM workspaces) >= 1
BEGIN SELECT RAISE(ABORT, 'WORKSPACE_LIMIT'); END;

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN ('user','inbox')),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  description TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL CHECK (length(slug) BETWEEN 1 AND 160),
  status TEXT NOT NULL CHECK (status IN ('active','paused','completed','archived')),
  priority TEXT NOT NULL DEFAULT 'none' CHECK (priority IN ('none','low','medium','high','urgent')),
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  last_activity_at TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  deleted_at TEXT,
  CHECK (created_at <= updated_at),
  CHECK (kind <> 'inbox' OR (name = 'Inbox' AND status = 'active' AND deleted_at IS NULL))
) STRICT;
CREATE UNIQUE INDEX ux_projects_one_inbox ON projects(workspace_id) WHERE kind = 'inbox';
CREATE INDEX idx_projects_status_order ON projects(workspace_id,status,sort_order,id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_recent ON projects(workspace_id,last_activity_at DESC,id) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_projects_inbox_protect BEFORE UPDATE OF kind,name,status,deleted_at,workspace_id ON projects
WHEN OLD.kind = 'inbox' AND
 (NEW.kind <> 'inbox' OR NEW.name <> OLD.name OR NEW.status <> 'active'
  OR NEW.deleted_at IS NOT NULL OR NEW.workspace_id <> OLD.workspace_id)
BEGIN SELECT RAISE(ABORT, 'INBOX_PROTECTED'); END;
CREATE TRIGGER trg_projects_inbox_delete BEFORE DELETE ON projects
WHEN OLD.kind = 'inbox'
BEGIN SELECT RAISE(ABORT, 'INBOX_PROTECTED'); END;

CREATE TABLE workspace_preferences (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  locale TEXT NOT NULL DEFAULT 'tr-TR' CHECK (locale IN ('tr-TR','en-US')),
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light','dark','system')),
  timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  last_selected_project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  last_view TEXT NOT NULL DEFAULT 'dashboard' CHECK (last_view IN ('dashboard','projects','tasks','search','chat')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1)
) STRICT;

-- DOC-16: export targets persist in SQLite, not an external mutable settings file.
CREATE TABLE export_profiles (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  target_path TEXT NOT NULL CHECK (length(trim(target_path)) > 0),
  git_enabled INTEGER NOT NULL DEFAULT 0 CHECK (git_enabled IN (0,1)),
  last_export_manifest_sha256 TEXT CHECK (last_export_manifest_sha256 IS NULL OR length(last_export_manifest_sha256)=64),
  last_export_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  UNIQUE(workspace_id,target_path),
  CHECK (created_at <= updated_at)
) STRICT;
CREATE INDEX idx_export_profiles_workspace ON export_profiles(workspace_id,updated_at DESC,id);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 300),
  body_markdown TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','blocked','done','cancelled')),
  priority TEXT NOT NULL DEFAULT 'none' CHECK (priority IN ('none','low','medium','high','urgent')),
  due_date TEXT,
  completed_at TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  blocked_reason TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  deleted_at TEXT,
  CHECK (created_at <= updated_at),
  CHECK ((status='done' AND completed_at IS NOT NULL)
      OR (status<>'done' AND completed_at IS NULL)),
  CHECK (due_date IS NULL OR (length(due_date)=10 AND due_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'))
) STRICT;
CREATE INDEX idx_tasks_kanban ON tasks(project_id,status,sort_order,created_at,id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_due ON tasks(due_date,priority,id) WHERE due_date IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_tasks_recent ON tasks(project_id,updated_at DESC,id) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_tasks_parent_live_insert BEFORE INSERT ON tasks
WHEN NOT EXISTS (SELECT 1 FROM projects WHERE id=NEW.project_id AND deleted_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'PARENT_PROJECT_UNAVAILABLE'); END;
CREATE TRIGGER trg_tasks_parent_live_move BEFORE UPDATE OF project_id ON tasks
WHEN NOT EXISTS (SELECT 1 FROM projects WHERE id=NEW.project_id AND deleted_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'PARENT_PROJECT_UNAVAILABLE'); END;

CREATE TABLE task_history (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN ('created','status_changed','completed','reopened','moved_project','priority_changed','deleted','restored')),
  from_value TEXT, to_value TEXT,
  occurred_at TEXT NOT NULL,
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('user','agent','import','system')),
  actor_ref TEXT NOT NULL,
  correlation_id TEXT NOT NULL
) STRICT;
CREATE INDEX idx_task_history_time ON task_history(task_id,occurred_at DESC,id);
CREATE TRIGGER trg_task_history_no_update BEFORE UPDATE ON task_history
BEGIN SELECT RAISE(ABORT, 'APPEND_ONLY'); END;

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
  body_markdown TEXT NOT NULL DEFAULT '',
  pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0,1)),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  deleted_at TEXT,
  CHECK (created_at <= updated_at)
) STRICT;
CREATE INDEX idx_documents_project ON documents(project_id,pinned DESC,updated_at DESC,id) WHERE deleted_at IS NULL;

CREATE TABLE document_versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
  revision_number INTEGER NOT NULL CHECK (revision_number >= 1),
  title TEXT NOT NULL, body_markdown TEXT NOT NULL,
  saved_at TEXT NOT NULL,
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('user','agent','import','system')),
  actor_ref TEXT NOT NULL,
  UNIQUE(document_id,revision_number)
) STRICT;
CREATE TRIGGER trg_document_versions_no_update BEFORE UPDATE ON document_versions
BEGIN SELECT RAISE(ABORT, 'APPEND_ONLY'); END;

CREATE TABLE decisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  display_code TEXT NOT NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
  context_markdown TEXT NOT NULL DEFAULT '',
  decision_markdown TEXT NOT NULL DEFAULT '',
  rationale_markdown TEXT NOT NULL DEFAULT '',
  consequences_markdown TEXT NOT NULL DEFAULT '',
  alternatives_markdown TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','accepted','rejected','superseded')),
  decided_at TEXT,
  supersedes_decision_id TEXT REFERENCES decisions(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  superseded_by_decision_id TEXT REFERENCES decisions(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  deleted_at TEXT,
  CHECK (created_at <= updated_at),
  CHECK (supersedes_decision_id IS NULL OR supersedes_decision_id <> id),
  CHECK (superseded_by_decision_id IS NULL OR superseded_by_decision_id <> id),
  UNIQUE(project_id,display_code)
) STRICT;
CREATE INDEX idx_decisions_project_status ON decisions(project_id,status,updated_at DESC,id) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_decisions_supersedes_same_project_insert BEFORE INSERT ON decisions
WHEN NEW.supersedes_decision_id IS NOT NULL AND EXISTS (
 SELECT 1 FROM decisions WHERE id=NEW.supersedes_decision_id AND project_id<>NEW.project_id)
BEGIN SELECT RAISE(ABORT, 'DECISION_PROJECT_MISMATCH'); END;
CREATE TRIGGER trg_decisions_supersedes_same_project_update BEFORE UPDATE OF supersedes_decision_id,project_id ON decisions
WHEN NEW.supersedes_decision_id IS NOT NULL AND EXISTS (
 SELECT 1 FROM decisions WHERE id=NEW.supersedes_decision_id AND project_id<>NEW.project_id)
BEGIN SELECT RAISE(ABORT, 'DECISION_PROJECT_MISMATCH'); END;

CREATE TABLE decision_revisions (
  id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE RESTRICT,
  revision_number INTEGER NOT NULL CHECK (revision_number >= 1),
  snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json)),
  changed_at TEXT NOT NULL,
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('user','agent','import','system')),
  actor_ref TEXT NOT NULL,
  change_reason TEXT NOT NULL CHECK (length(trim(change_reason)) > 0),
  UNIQUE(decision_id,revision_number)
) STRICT;
CREATE TRIGGER trg_decision_revisions_no_update BEFORE UPDATE ON decision_revisions
BEGIN SELECT RAISE(ABORT, 'APPEND_ONLY'); END;

CREATE TABLE activity_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  text_markdown TEXT NOT NULL CHECK (length(trim(text_markdown)) > 0),
  occurred_at TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('user','agent','import','system')),
  actor_ref TEXT NOT NULL,
  correction_of_id TEXT REFERENCES activity_logs(id) ON DELETE RESTRICT,
  correlation_id TEXT NOT NULL,
  related_task_id TEXT REFERENCES tasks(id) ON DELETE RESTRICT,
  related_decision_id TEXT REFERENCES decisions(id) ON DELETE RESTRICT
) STRICT;
CREATE INDEX idx_activity_logs_timeline ON activity_logs(project_id,occurred_at DESC,recorded_at DESC,id DESC);
CREATE TRIGGER trg_activity_logs_no_update BEFORE UPDATE ON activity_logs
BEGIN SELECT RAISE(ABORT, 'APPEND_ONLY'); END;

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 40),
  name_key TEXT NOT NULL CHECK (length(name_key) > 0),
  created_at TEXT NOT NULL,
  UNIQUE(workspace_id,name_key)
) STRICT;
CREATE TABLE project_tags (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE RESTRICT,
  PRIMARY KEY(project_id,tag_id)
) STRICT, WITHOUT ROWID;
CREATE TABLE task_tags (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE RESTRICT,
  PRIMARY KEY(task_id,tag_id)
) STRICT, WITHOUT ROWID;
CREATE TABLE document_tags (
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE RESTRICT,
  PRIMARY KEY(document_id,tag_id)
) STRICT, WITHOUT ROWID;

-- Polymorphic record references have real composite FKs to the registry.
-- Registry entries are produced by domain-table triggers, not public commands.
CREATE TABLE record_registry (
  kind TEXT NOT NULL CHECK (kind IN ('project','task','document','decision','activity_log')),
  record_id TEXT NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  deleted_at TEXT,
  PRIMARY KEY(kind,record_id)
) STRICT, WITHOUT ROWID;
CREATE INDEX idx_record_registry_project ON record_registry(project_id,kind,record_id);
CREATE TABLE record_links (
  id TEXT PRIMARY KEY,
  source_kind TEXT NOT NULL,
  source_id TEXT NOT NULL,
  target_kind TEXT NOT NULL,
  target_id TEXT NOT NULL,
  relation TEXT NOT NULL CHECK (relation IN ('references','depends_on','related_to')),
  created_at TEXT NOT NULL,
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('user','agent','import','system')),
  actor_ref TEXT NOT NULL,
  FOREIGN KEY(source_kind,source_id) REFERENCES record_registry(kind,record_id) ON DELETE RESTRICT,
  FOREIGN KEY(target_kind,target_id) REFERENCES record_registry(kind,record_id) ON DELETE RESTRICT,
  CHECK (source_kind<>target_kind OR source_id<>target_id),
  CHECK (relation<>'depends_on' OR (source_kind='task' AND target_kind='task')),
  CHECK (relation<>'related_to' OR (source_kind || ':' || source_id < target_kind || ':' || target_id)),
  UNIQUE(source_kind,source_id,target_kind,target_id,relation)
) STRICT;
CREATE INDEX idx_record_links_target ON record_links(target_kind,target_id,relation);
CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  owner_kind TEXT NOT NULL CHECK (owner_kind IN ('document','task','activity_log')),
  owner_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  relative_asset_path TEXT NOT NULL,
  media_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
  sha256 TEXT NOT NULL CHECK (length(sha256)=64),
  created_at TEXT NOT NULL, deleted_at TEXT,
  FOREIGN KEY(owner_kind,owner_id) REFERENCES record_registry(kind,record_id) ON DELETE RESTRICT
) STRICT;
CREATE UNIQUE INDEX ux_attachments_live_path ON attachments(owner_kind,owner_id,relative_asset_path) WHERE deleted_at IS NULL;

CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE RESTRICT,
  title TEXT NOT NULL DEFAULT '',
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0,1)),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  deleted_at TEXT,
  CHECK (created_at <= updated_at)
) STRICT;
CREATE INDEX idx_conversations_project_recent ON conversations(project_id,updated_at DESC,id) WHERE deleted_at IS NULL;
CREATE TABLE agent_runs (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE RESTRICT,
  project_context_id TEXT REFERENCES projects(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('queued','running','awaiting_approval','completed','failed','cancelled')),
  model_provider TEXT NOT NULL CHECK (model_provider='ollama'),
  selected_model_id TEXT NOT NULL,
  created_at TEXT NOT NULL, started_at TEXT, finished_at TEXT,
  correlation_id TEXT NOT NULL,
  error_code TEXT,
  CHECK (status NOT IN ('completed','failed','cancelled') OR finished_at IS NOT NULL)
) STRICT;
CREATE INDEX idx_agent_runs_conversation ON agent_runs(conversation_id,created_at DESC,id);
CREATE TABLE tool_calls (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  args_redacted_json TEXT NOT NULL CHECK (json_valid(args_redacted_json)),
  status TEXT NOT NULL CHECK (status IN ('proposed','awaiting_approval','running','succeeded','failed','denied','cancelled')),
  result_summary TEXT,
  started_at TEXT, completed_at TEXT, error_code TEXT,
  idempotency_key TEXT NOT NULL,
  UNIQUE(run_id,idempotency_key)
) STRICT;
CREATE INDEX idx_tool_calls_run ON tool_calls(run_id,id);
CREATE TABLE approvals (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE RESTRICT,
  tool_call_id TEXT NOT NULL UNIQUE REFERENCES tool_calls(id) ON DELETE RESTRICT,
  action_fingerprint TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low','medium','high')),
  status TEXT NOT NULL CHECK (status IN ('pending','approved','denied','expired','cancelled')),
  requested_at TEXT NOT NULL, resolved_at TEXT, expires_at TEXT NOT NULL,
  CHECK ((status='pending' AND resolved_at IS NULL) OR (status<>'pending' AND resolved_at IS NOT NULL))
) STRICT;
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','tool')),
  body_text TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('streaming','complete','failed','cancelled')),
  created_at TEXT NOT NULL, finalized_at TEXT,
  agent_run_id TEXT REFERENCES agent_runs(id) ON DELETE RESTRICT,
  tool_call_id TEXT REFERENCES tool_calls(id) ON DELETE RESTRICT,
  sequence INTEGER NOT NULL CHECK (sequence >= 1),
  UNIQUE(conversation_id,sequence),
  CHECK ((status='streaming' AND finalized_at IS NULL) OR (status<>'streaming' AND finalized_at IS NOT NULL)),
  CHECK (role<>'tool' OR tool_call_id IS NOT NULL)
) STRICT;

CREATE TABLE feature_preferences (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  feature TEXT NOT NULL CHECK (feature IN ('ai','stt','tts','git')),
  preference TEXT NOT NULL DEFAULT 'disabled' CHECK (preference IN ('enabled','disabled')),
  updated_at TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  PRIMARY KEY(workspace_id,feature)
) STRICT, WITHOUT ROWID;
CREATE TABLE setup_state (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  core_setup_completed INTEGER NOT NULL DEFAULT 0 CHECK (core_setup_completed IN (0,1)),
  last_completed_step TEXT,
  ai_setup_choice TEXT NOT NULL DEFAULT 'unselected' CHECK (ai_setup_choice IN ('unselected','enabled','skipped')),
  voice_setup_choice TEXT NOT NULL DEFAULT 'unselected' CHECK (voice_setup_choice IN ('unselected','enabled','skipped')),
  updated_at TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1)
) STRICT;
CREATE TABLE provider_configs (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('ollama','whisper_cpp','ema_lightning')),
  base_url TEXT,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
  updated_at TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  PRIMARY KEY(workspace_id,provider)
) STRICT, WITHOUT ROWID;
CREATE TABLE model_profiles (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider='ollama'),
  provider_model_name TEXT NOT NULL,
  model_digest TEXT,
  context_window INTEGER NOT NULL CHECK (context_window > 0),
  selected_for_agent INTEGER NOT NULL DEFAULT 0 CHECK (selected_for_agent IN (0,1)),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  UNIQUE(workspace_id,provider,provider_model_name)
) STRICT;
CREATE UNIQUE INDEX ux_selected_agent_model ON model_profiles(workspace_id) WHERE selected_for_agent=1;
CREATE TABLE model_benchmark_receipts (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES model_profiles(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  benchmark_version TEXT NOT NULL,
  measured_at TEXT NOT NULL,
  first_token_ms REAL CHECK (first_token_ms IS NULL OR first_token_ms >= 0),
  tokens_per_second REAL CHECK (tokens_per_second IS NULL OR tokens_per_second >= 0),
  tool_success_count INTEGER NOT NULL CHECK (tool_success_count >= 0),
  tool_test_count INTEGER NOT NULL CHECK (tool_test_count >= 0),
  outcome TEXT NOT NULL CHECK (outcome IN ('passed','failed','inconclusive')),
  CHECK (tool_success_count <= tool_test_count)
) STRICT;
CREATE INDEX idx_model_benchmarks_profile ON model_benchmark_receipts(profile_id,measured_at DESC);
CREATE TABLE background_jobs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('model_download','model_benchmark','voice_component_install','stt_transcribe','tts_synthesize','import','export','backup','restore','search_rebuild','git_commit','git_push')),
  status TEXT NOT NULL CHECK (status IN ('queued','running','paused','succeeded','failed','cancelled')),
  progress_done INTEGER CHECK (progress_done IS NULL OR progress_done >= 0),
  progress_total INTEGER CHECK (progress_total IS NULL OR progress_total >= 0),
  attempt INTEGER NOT NULL DEFAULT 0 CHECK (attempt >= 0),
  created_at TEXT NOT NULL, started_at TEXT, finished_at TEXT,
  error_code TEXT,
  result_json TEXT CHECK (result_json IS NULL OR json_valid(result_json)),
  correlation_id TEXT NOT NULL,
  CHECK (progress_done IS NULL OR progress_total IS NULL OR progress_done <= progress_total),
  CHECK (status NOT IN ('succeeded','failed','cancelled') OR finished_at IS NOT NULL)
) STRICT;
CREATE INDEX idx_background_jobs_status ON background_jobs(status,created_at,id);

CREATE TABLE domain_events (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version=1),
  aggregate_id TEXT NOT NULL,
  aggregate_revision INTEGER NOT NULL CHECK (aggregate_revision >= 1),
  occurred_at TEXT NOT NULL,
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('user','agent','import','system')),
  actor_ref TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  causation_id TEXT,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  dispatched_at TEXT
) STRICT;
CREATE INDEX idx_domain_events_pending ON domain_events(sequence) WHERE dispatched_at IS NULL;
CREATE TABLE idempotency_receipts (
  id TEXT PRIMARY KEY,
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('user','agent','import','system')),
  actor_ref TEXT NOT NULL,
  command_name TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL CHECK (length(payload_sha256)=64),
  result_json TEXT NOT NULL CHECK (json_valid(result_json)),
  created_at TEXT NOT NULL, expires_at TEXT NOT NULL,
  UNIQUE(actor_kind,actor_ref,command_name,idempotency_key)
) STRICT;
CREATE INDEX idx_idempotency_expiry ON idempotency_receipts(expires_at);

-- Stop new content from being added to soft-deleted projects even if a foreign key exists.
CREATE TRIGGER trg_documents_parent_live_insert BEFORE INSERT ON documents
WHEN NOT EXISTS (SELECT 1 FROM projects WHERE id=NEW.project_id AND deleted_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'PARENT_PROJECT_UNAVAILABLE'); END;
CREATE TRIGGER trg_decisions_parent_live_insert BEFORE INSERT ON decisions
WHEN NOT EXISTS (SELECT 1 FROM projects WHERE id=NEW.project_id AND deleted_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'PARENT_PROJECT_UNAVAILABLE'); END;
CREATE TRIGGER trg_activity_parent_live_insert BEFORE INSERT ON activity_logs
WHEN NOT EXISTS (SELECT 1 FROM projects WHERE id=NEW.project_id AND deleted_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'PARENT_PROJECT_UNAVAILABLE'); END;
CREATE TRIGGER trg_documents_parent_live_move BEFORE UPDATE OF project_id ON documents
WHEN NOT EXISTS (SELECT 1 FROM projects WHERE id=NEW.project_id AND deleted_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'PARENT_PROJECT_UNAVAILABLE'); END;
CREATE TRIGGER trg_decisions_parent_live_move BEFORE UPDATE OF project_id ON decisions
WHEN NOT EXISTS (SELECT 1 FROM projects WHERE id=NEW.project_id AND deleted_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'PARENT_PROJECT_UNAVAILABLE'); END;
CREATE TRIGGER trg_activity_parent_live_move BEFORE UPDATE OF project_id ON activity_logs
WHEN NOT EXISTS (SELECT 1 FROM projects WHERE id=NEW.project_id AND deleted_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'PARENT_PROJECT_UNAVAILABLE'); END;

-- Domain record registry: polymorphic FK target, maintained in the SAME transaction.
CREATE TRIGGER trg_registry_project_ins AFTER INSERT ON projects BEGIN
 INSERT INTO record_registry(kind,record_id,project_id,deleted_at) VALUES('project',NEW.id,NEW.id,NEW.deleted_at);
END;
CREATE TRIGGER trg_registry_project_upd AFTER UPDATE OF deleted_at ON projects BEGIN
 UPDATE record_registry SET deleted_at=NEW.deleted_at WHERE kind='project' AND record_id=NEW.id;
END;
CREATE TRIGGER trg_registry_project_del AFTER DELETE ON projects BEGIN
 DELETE FROM record_registry WHERE kind='project' AND record_id=OLD.id;
END;
CREATE TRIGGER trg_registry_task_ins AFTER INSERT ON tasks BEGIN
 INSERT INTO record_registry(kind,record_id,project_id,deleted_at) VALUES('task',NEW.id,NEW.project_id,NEW.deleted_at);
END;
CREATE TRIGGER trg_registry_task_upd AFTER UPDATE OF project_id,deleted_at ON tasks BEGIN
 UPDATE record_registry SET project_id=NEW.project_id,deleted_at=NEW.deleted_at WHERE kind='task' AND record_id=NEW.id;
END;
CREATE TRIGGER trg_registry_task_del AFTER DELETE ON tasks BEGIN
 DELETE FROM record_registry WHERE kind='task' AND record_id=OLD.id;
END;
CREATE TRIGGER trg_registry_document_ins AFTER INSERT ON documents BEGIN
 INSERT INTO record_registry(kind,record_id,project_id,deleted_at) VALUES('document',NEW.id,NEW.project_id,NEW.deleted_at);
END;
CREATE TRIGGER trg_registry_document_upd AFTER UPDATE OF project_id,deleted_at ON documents BEGIN
 UPDATE record_registry SET project_id=NEW.project_id,deleted_at=NEW.deleted_at WHERE kind='document' AND record_id=NEW.id;
END;
CREATE TRIGGER trg_registry_document_del AFTER DELETE ON documents BEGIN
 DELETE FROM record_registry WHERE kind='document' AND record_id=OLD.id;
END;
CREATE TRIGGER trg_registry_decision_ins AFTER INSERT ON decisions BEGIN
 INSERT INTO record_registry(kind,record_id,project_id,deleted_at) VALUES('decision',NEW.id,NEW.project_id,NEW.deleted_at);
END;
CREATE TRIGGER trg_registry_decision_upd AFTER UPDATE OF project_id,deleted_at ON decisions BEGIN
 UPDATE record_registry SET project_id=NEW.project_id,deleted_at=NEW.deleted_at WHERE kind='decision' AND record_id=NEW.id;
END;
CREATE TRIGGER trg_registry_decision_del AFTER DELETE ON decisions BEGIN
 DELETE FROM record_registry WHERE kind='decision' AND record_id=OLD.id;
END;
CREATE TRIGGER trg_registry_activity_ins AFTER INSERT ON activity_logs BEGIN
 INSERT INTO record_registry(kind,record_id,project_id,deleted_at) VALUES('activity_log',NEW.id,NEW.project_id,NULL);
END;
CREATE TRIGGER trg_registry_activity_del AFTER DELETE ON activity_logs BEGIN
 DELETE FROM record_registry WHERE kind='activity_log' AND record_id=OLD.id;
END;

-- Search is a disposable, same-transaction read projection; content remains in domain tables.
CREATE TABLE search_index (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('project','task','document','decision','activity_log')),
  record_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  UNIQUE(kind,record_id)
) STRICT;
CREATE INDEX idx_search_index_project ON search_index(project_id,kind,id);
CREATE VIRTUAL TABLE search_fts USING fts5(
  title, body,
  content='search_index', content_rowid='id',
  tokenize='unicode61 remove_diacritics 0', prefix='2 3'
);
CREATE TRIGGER trg_search_fts_insert AFTER INSERT ON search_index BEGIN
 INSERT INTO search_fts(rowid,title,body) VALUES (NEW.id,NEW.title,NEW.body);
END;
CREATE TRIGGER trg_search_fts_delete AFTER DELETE ON search_index BEGIN
 INSERT INTO search_fts(search_fts,rowid,title,body) VALUES ('delete',OLD.id,OLD.title,OLD.body);
END;
CREATE TRIGGER trg_search_fts_update AFTER UPDATE OF title,body ON search_index BEGIN
 INSERT INTO search_fts(search_fts,rowid,title,body) VALUES ('delete',OLD.id,OLD.title,OLD.body);
 INSERT INTO search_fts(rowid,title,body) VALUES (NEW.id,NEW.title,NEW.body);
END;

CREATE TRIGGER trg_search_project_insert AFTER INSERT ON projects WHEN NEW.deleted_at IS NULL BEGIN
 INSERT INTO search_index(kind,record_id,project_id,title,body)
 VALUES('project',NEW.id,NEW.id,NEW.name,NEW.description);
END;
CREATE TRIGGER trg_search_project_update AFTER UPDATE ON projects BEGIN
 DELETE FROM search_index WHERE kind='project' AND record_id=NEW.id AND NEW.deleted_at IS NOT NULL;
 INSERT INTO search_index(kind,record_id,project_id,title,body)
 SELECT 'project',NEW.id,NEW.id,NEW.name,NEW.description WHERE NEW.deleted_at IS NULL
 ON CONFLICT(kind,record_id) DO UPDATE SET title=excluded.title,body=excluded.body;
END;
CREATE TRIGGER trg_search_project_delete AFTER DELETE ON projects BEGIN
 DELETE FROM search_index WHERE kind='project' AND record_id=OLD.id;
END;
CREATE TRIGGER trg_search_task_insert AFTER INSERT ON tasks WHEN NEW.deleted_at IS NULL BEGIN
 INSERT INTO search_index(kind,record_id,project_id,title,body)
 VALUES('task',NEW.id,NEW.project_id,NEW.title,NEW.body_markdown);
END;
CREATE TRIGGER trg_search_task_update AFTER UPDATE ON tasks BEGIN
 DELETE FROM search_index WHERE kind='task' AND record_id=NEW.id AND NEW.deleted_at IS NOT NULL;
 INSERT INTO search_index(kind,record_id,project_id,title,body)
 SELECT 'task',NEW.id,NEW.project_id,NEW.title,NEW.body_markdown WHERE NEW.deleted_at IS NULL
 ON CONFLICT(kind,record_id) DO UPDATE SET project_id=excluded.project_id,title=excluded.title,body=excluded.body;
END;
CREATE TRIGGER trg_search_task_delete AFTER DELETE ON tasks BEGIN
 DELETE FROM search_index WHERE kind='task' AND record_id=OLD.id;
END;
CREATE TRIGGER trg_search_document_insert AFTER INSERT ON documents WHEN NEW.deleted_at IS NULL BEGIN
 INSERT INTO search_index(kind,record_id,project_id,title,body)
 VALUES('document',NEW.id,NEW.project_id,NEW.title,NEW.body_markdown);
END;
CREATE TRIGGER trg_search_document_update AFTER UPDATE ON documents BEGIN
 DELETE FROM search_index WHERE kind='document' AND record_id=NEW.id AND NEW.deleted_at IS NOT NULL;
 INSERT INTO search_index(kind,record_id,project_id,title,body)
 SELECT 'document',NEW.id,NEW.project_id,NEW.title,NEW.body_markdown WHERE NEW.deleted_at IS NULL
 ON CONFLICT(kind,record_id) DO UPDATE SET project_id=excluded.project_id,title=excluded.title,body=excluded.body;
END;
CREATE TRIGGER trg_search_document_delete AFTER DELETE ON documents BEGIN
 DELETE FROM search_index WHERE kind='document' AND record_id=OLD.id;
END;
CREATE TRIGGER trg_search_decision_insert AFTER INSERT ON decisions WHEN NEW.deleted_at IS NULL BEGIN
 INSERT INTO search_index(kind,record_id,project_id,title,body)
 VALUES('decision',NEW.id,NEW.project_id,NEW.title,
   NEW.context_markdown || char(10) || NEW.decision_markdown || char(10) || NEW.rationale_markdown || char(10) || NEW.consequences_markdown || char(10) || NEW.alternatives_markdown);
END;
CREATE TRIGGER trg_search_decision_update AFTER UPDATE ON decisions BEGIN
 DELETE FROM search_index WHERE kind='decision' AND record_id=NEW.id AND NEW.deleted_at IS NOT NULL;
 INSERT INTO search_index(kind,record_id,project_id,title,body)
 SELECT 'decision',NEW.id,NEW.project_id,NEW.title,
   NEW.context_markdown || char(10) || NEW.decision_markdown || char(10) || NEW.rationale_markdown || char(10) || NEW.consequences_markdown || char(10) || NEW.alternatives_markdown
 WHERE NEW.deleted_at IS NULL
 ON CONFLICT(kind,record_id) DO UPDATE SET project_id=excluded.project_id,title=excluded.title,body=excluded.body;
END;
CREATE TRIGGER trg_search_decision_delete AFTER DELETE ON decisions BEGIN
 DELETE FROM search_index WHERE kind='decision' AND record_id=OLD.id;
END;
CREATE TRIGGER trg_search_activity_insert AFTER INSERT ON activity_logs BEGIN
 INSERT INTO search_index(kind,record_id,project_id,title,body)
 VALUES('activity_log',NEW.id,NEW.project_id,'',NEW.text_markdown);
END;
CREATE TRIGGER trg_search_activity_delete AFTER DELETE ON activity_logs BEGIN
 DELETE FROM search_index WHERE kind='activity_log' AND record_id=OLD.id;
END;

PRAGMA user_version = 1;
