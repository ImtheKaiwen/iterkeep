---
document_id: DOC-09
title: "Iterkeep — SQLite V1 Şeması, İndeksler, FTS5 ve Migration Sözleşmesi"
version: "0.1.1"
status: "draft"
last_updated: "2026-10-10"
language: "tr-TR"
owner: "Storage Architecture & Data Integrity"
depends_on:
  - "DOC-00"
  - "DOC-02"
  - "DOC-04"
  - "DOC-05"
  - "DOC-06"
  - "DOC-07"
  - "DOC-08"
next_document: "DOC-10"
---

# Iterkeep — SQLite V1 Şeması, İndeksler, FTS5 ve Migration Sözleşmesi

> **Normatif amaç:** Iterkeep V1'in bütün kalıcı domain veri yapılarının **gerçek SQLite DDL'ini**, `INDEX`/`UNIQUE`/`FOREIGN KEY`/`CHECK` sınırlarını, tam metin arama izdüşümünü, schema migration disiplinini ve otomatik doğrulama koşullarını tanımlamak. Kodlama ajanı bu dosyada verilen `0001_initial.sql` bloğunu kaynak dosya olarak çıkarmalı; alternatif şema uydurmamalıdır.
>
> **Yetki:** Entity anlamı, kimlik, status geçişleri ve tüm domain invariants için `DOC-08`; dosya ve paket yolları için `DOC-07`; bağlantı, `busy_timeout`, backup, WAL checkpoint, transaction/retry, idempotency receipt *işlem akışları* için `DOC-10`; tokenizer davranışı, kullanıcı sorgu parser'ı ve Türkçe arama kalitesi için `DOC-15` yetkilidir. Bu belge **fiziksel DDL, indeks, trigger ve migration dosyası isimleri** için kanonik kaynaktır.
>
> **Kanıt düzeyi:** V1 DDL ve temel fixture'lar bu belgeler hazırlanırken `sqlite3` Python sürücüsü ile bağlantı üzerinde denenmiştir (yerel SQLite 3.46.1, FTS5/JSON fonksiyonları mevcut). **Henüz** Electron `better-sqlite3` native paketleme, Windows üretim binary'si, 100.000 kayıt gerçek performans karşılaştırması veya uçtan uca UI doğrulaması yapılmamıştır. `status: draft` korunmalıdır.

## 1. Değişmez şema kararları (`DBS-D-001–020`)

| ID | Karar | Zorunlu sonuç |
|---|---|---|
| DBS-D-001 | Workspace başına tek `workspace.db` | Her veritabanında yalnız bir `workspaces` satırı; ikinci workspace farklı DB dosyasıdır. |
| DBS-D-002 | SQLite kalıcı tek yetkili kaynak | Markdown içe/dışa aktarım; ikincil yazma deposu değil. |
| DBS-D-003 | `STRICT` tablolar, açık `CHECK`/`FK` | Geçersiz alan DB seviyesinde de olabildiğince reddedilir. |
| DBS-D-004 | Bütün domain ID'leri UUID v4 `TEXT` | 36 karakter, küçük harfli tireli biçim `@iterkeep/contracts` ile doğrulanır. |
| DBS-D-005 | UTC RFC3339 milisaniyeli timestamp `TEXT` | `YYYY-MM-DDTHH:mm:ss.sssZ`; yerel format yalnız gösterim katmanında. |
| DBS-D-006 | Takvim tarihi `YYYY-MM-DD` `TEXT` | `due_date` tam tarih doğrulaması uygulama/IPC katmanında. |
| DBS-D-007 | Boş değer ve opsiyonel değer farklı | Yokluk `NULL`; status/priority enum sabit ASCII `TEXT`. |
| DBS-D-008 | Tek DB bağlantı sahibi DB worker | Renderer/Main/agent doğrudan SQL gönderemez veya çalıştıramaz. |
| DBS-D-009 | Tek yazıcı, kısa transaction, revision CAS | Yüksek seviye uygulaması `DOC-10`. |
| DBS-D-010 | FK'ler her bağlantıda açık | `PRAGMA foreign_keys=ON`, açılışta doğrulama zorunlu. |
| DBS-D-011 | Workspace bootstrap atomik | Workspace+Inbox+preferences+setup tek transaction; FK'de deferred bağlantı. |
| DBS-D-012 | Inbox tekil ve korunur | Partial unique index + DB trigger + application invariant. |
| DBS-D-013 | Proje/görev/not/karar silmeleri öncelikle soft-delete | Silinen içerik varsayılan okuma ve aramadan çıkar. |
| DBS-D-014 | ActivityLog ve revision geçmişi append-only | Normal işlemlerde UPDATE yasak; özel purge `DOC-17/30`. |
| DBS-D-015 | Polimorfik ilişkiler için kayıt registry'si | `record_links` ve `attachments` iki sütunlu gerçek FK ile bağlanır. |
| DBS-D-016 | FTS5, yeniden kurulabilir arama izdüşümü | `search_index` ve `search_fts` ürün gerçeği değil, kaynaklardan türetilen yapı. |
| DBS-D-017 | FTS kaynak trigger'ları transaction içindedir | Arama indeksi commit sonrası kalıcı kayıtla tutarlı olur. |
| DBS-D-018 | Migrations forward-only, checksum'lı | `schema_migrations` + `user_version`, migration öncesi backup ve test. |
| DBS-D-019 | Agent/AI/voice, DB şemasının açılış bağımlılığı değildir | Eksik provider core tablolarını/bootstrapi engellemez. |
| DBS-D-020 | Gizli veriler ayrı tanı loguna otomatik kopyalanmaz | Ham konuşma, not veya tool argümanları dış telemetriye gitmez. |

## 2. Fiziksel veri türleri ve ortak sözleşme

| Domain alanı | SQLite | Düzey | Açıklama |
|---|---|---|---|
| ID, FK, actor_ref, correlation_id | `TEXT` | `NOT NULL` uygun olduğunda | UUID parse kontrolü TypeScript/Zod; FK veri bütünlüğü DB'de. |
| `revision`, sıra, bool, sayaç | `INTEGER` | `CHECK` | Booleans `0/1`, revision >=1, `sort_order>=0`. |
| Kullanıcı içeriği / Markdown | `TEXT` | DB boyut sınırı yalnız kısmen | Gerçek UTF-8 **byte** boyut sınırları DOC-08/11 doğrulayıcısında. |
| Timestamp | `TEXT` | app'de katı ISO doğrulaması | Lex sıralama için bütün değerler UTC ve sabit hassasiyetli yazılır. |
| Takvim hedef günü | `TEXT NULL` | basit GLOB + app kontrolü | `2026-02-31` gibi takvim dışı tarih yalnız GLOB ile yakalanmaz. |
| Enum | `TEXT` | `CHECK IN (...)` | Domain ve DB değerleri birebir eşleşir. |
| JSON snapshot/audit | `TEXT` | `json_valid(...)` | JSON shape `@iterkeep/contracts` ile de doğrulanır. |
| Ses dosyası/model binary | DB'de bulunmaz | FS/provider | DB yalnız durum / referans / metadata kaydeder. |

`length(...)` SQLite'da Unicode karakter sayısını ölçebilir, ancak DOC-08'deki *code point* ve özellikle *UTF-8 byte* sınırlarının tek doğrulayıcısı **değildir**. DB kısıtları ikincil koruma; güvenli doğrulama `Application Core` ve Zod sınırında tekrar yapılmalıdır. `UTC string` doğruluğu alanın `TEXT` oluşundan otomatik doğmaz; `Clock` portu ve import kontrolü normatiftir.

### 2.1 DB açılışı — migration başlamadan önce

`packages/storage-sqlite/src/connection/pragmas.ts` aşağıdaki kontrolü worker içinde yapmalıdır:

```ts
// Temsili; repo oluşturulunca better-sqlite3 üzerinde çalıştırılacak.
import type Database from 'better-sqlite3';

export function configureDatabase(db: Database.Database): void {
  db.pragma('foreign_keys = ON');
  if (db.pragma('foreign_keys', { simple: true }) !== 1) {
    throw new Error('SQLITE_FOREIGN_KEYS_UNAVAILABLE');
  }
  db.pragma('busy_timeout = 3000');
  const journalMode = db.pragma('journal_mode = WAL', { simple: true });
  if (String(journalMode).toLowerCase() !== 'wal') {
    throw new Error('SQLITE_WAL_UNAVAILABLE');
  }
  // synchronous=NORMAL vs FULL seçimi/ölçümü DOC-10'da yapılır.
  const fts = db.prepare("SELECT sqlite_compileoption_used('ENABLE_FTS5') AS compiled").get();
  // Compile option işaretine tek başına güvenme: asıl test FTS5 tablolarını
  // oluşturmak ve MATCH sorgusu çalıştırmaktır.
  void fts;
}
```

- `foreign_keys` veya `journal_mode` transaction **içerisinde** değiştirilmez.
- `:memory:` SQLite smoke-test bağlantısında WAL modu desteklenmez; bu kontrol yalnız gerçek dosya için uygulanır, smoke test `:memory:` bağlantısı kullanıyorsa WAL kontrolü ayrı tutulur.
- `STRICT`, JSON ve FTS5 özellikleri native `better-sqlite3` build'inde runtime test edilir (`POC-STACK-002`).
- DB dosyası bulunamazsa sessizce yeni boş workspace yaratma; aktif workspace yoluyla eski dosya ilişkisini `DOC-17/19` kurallarına göre doğrula.

## 3. Şema envanteri — V1

| Kategori | Kanonik tablolar |
|---|---|
| Migration/Workspace | `schema_migrations`, `workspaces`, `workspace_preferences`, `export_profiles` |
| Projects/tasks | `projects`, `tasks`, `task_history` |
| Notes/decisions/logs | `documents`, `document_versions`, `decisions`, `decision_revisions`, `activity_logs` |
| Metadata/links/assets | `tags`, `project_tags`, `task_tags`, `document_tags`, `record_registry`, `record_links`, `attachments` |
| AI conversations | `conversations`, `messages`, `agent_runs`, `tool_calls`, `approvals` |
| Setup/models/jobs | `feature_preferences`, `setup_state`, `provider_configs`, `model_profiles`, `model_benchmark_receipts`, `background_jobs` |
| Reliability/audit | `domain_events`, `idempotency_receipts` |
| Search projection | `search_index`, `search_fts` (FTS5 virtual table ve internal tablolar) |

**NOT:** `sqlite_master` içinde `search_fts_*` gibi FTS internal tabloları ayrıca görünür; uygulama bunları doğrudan manipüle etmez. `CapabilitySnapshot`, aktif ses capture oturumu, transkript taslağı ve playback hâli kalıcı domain tabloları değildir. `ModelProfile` ile model dosyasının yerel disk üzerinde gerçekten bulunması aynı şey değildir.

## 4. Kanonik başlangıç migration dosyası

**Tam dosya yolu:** `packages/storage-sqlite/migrations/0001_initial.sql` (`DOC-07` ile aynı). Aşağıdaki SQL bloğu **tek parçadır**; tamamı dosyaya yazılmalıdır. İkinci bir migration aynı adla veya farklı şemayla oluşturulamaz.

**Çalıştırma:** Bağlantı bootstrap'i tamamlandıktan sonra `BEGIN IMMEDIATE` transaction başlatılır, aşağıdaki SQL uygulanır, `schema_migrations` için hash/uygulama zamanı satırı aynı transaction'a eklenir ve commit edilir. Dosyanın sonunda `PRAGMA user_version=1` bulunur. SQL bloğunda **`BEGIN/COMMIT` yoktur**, transaction'ı çağıran migrator yönetir. `0001_initial.sql` checksum'ı en son dosya byte içeriğinden SHA-256 olarak hesaplanır; sonradan değiştirilemez.

```sql
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
```

**DOC-12/16 uyum notu (2026-10-10, yayınlanmamış V1 taslağı):** `background_jobs.kind` CHECK kümesine `git_commit` ve `git_push` eklenmiştir. `DOC-11` bu iki işlem için `{jobId}` döndürdüğü için kalıcı işler olarak temsil edilmesi gerekir. `0001_initial.sql` henüz yayımlanmış migration olmadığından taslak DDL üzerinde değiştirildi; önceki dosya byte'larından üretilecek hash kullanılmaz. İlk uygulama sonrası aynı SQL migration asla değiştirilmez, yeni sürüm migration ile ilerlenir. **DOC-16 eklemesi:** export hedef profili için `export_profiles` (yalnız Main/DB worker erişir) ve transfer job sonuç özeti için `background_jobs.result_json` eklendi. `result_json` yalnız bounded, redakte edilmiş receipt metadata içerir; ham import manifesti veya path yetkilendirme tokenı tutulmaz. Preview detayları süreli korunan derived cache ve `transfer.getImportPreview` üzerinden okunur.

## 5. Bootstrap: workspace + Inbox yaratımı

Migration yalnız tablo/trigger oluşturur; **kullanıcıya ait gerçek bir workspace yaratmaz**. İlk başarılı kurulum, `DOC-18` akışıyla aşağıdaki işlemleri bir transaction'da gerçekleştirir:

1. Güvenilir `IdFactory` ile `workspaceId`, `inboxProjectId` UUID v4 üret.
2. `workspaces` satırını `inbox_project_id` ile ekle (FK `DEFERRABLE INITIALLY DEFERRED` olduğu için aynı transaction'da Inbox henüz yok olabilir).
3. `projects` içine `kind='inbox'`, saklanan ad `Inbox`, `status='active'`, `slug='inbox'` satırını ekle.
4. `workspace_preferences` ve `setup_state` satırlarını; `feature_preferences` için ai/stt/tts/git `disabled` satırlarını ekle.
5. `workspaces.inbox_project_id` gerçekten **aynı workspace'teki** `kind='inbox'` projesine işaret ediyor mu ve `PRAGMA foreign_key_check` boş mu, transaction içinde kontrol et.
6. Ancak son adımda commit et. Hata varsa **rollback**, `coreSetupCompleted=false` olarak yeni bir yarım kayıt oluşturma.

Ürünün AI kurulum seçimi `unselected/skipped/enabled` tutulur; işlevin o anda hazır olması ayrı bir runtime probe'dur. Yeni workspace'in açılması **Ollama ya da Whisper gerektirmez**. `workspaces` tablosundaki tek-satır trigger'ı ikinci workspace eklenmesini engeller; yeni workspace **ayrı DB dosyasıdır**.

### 5.1 Örnek transaction (davranış kanıtı; kimlikler gösterimlik)

```sql
BEGIN IMMEDIATE;
INSERT INTO workspaces(id,display_name,inbox_project_id,created_at,updated_at)
VALUES(:workspace_id,:name,:inbox_id,:now,:now);
INSERT INTO projects(id,workspace_id,kind,name,slug,status,created_at,updated_at)
VALUES(:inbox_id,:workspace_id,'inbox','Inbox','inbox','active',:now,:now);
INSERT INTO workspace_preferences(workspace_id) VALUES(:workspace_id);
INSERT INTO setup_state(workspace_id,updated_at) VALUES(:workspace_id,:now);
INSERT INTO feature_preferences(workspace_id,feature,preference,updated_at)
VALUES(:workspace_id,'ai','disabled',:now),
      (:workspace_id,'stt','disabled',:now),
      (:workspace_id,'tts','disabled',:now),
      (:workspace_id,'git','disabled',:now);
-- Application bootstrap validator: inbox id/kind/workspace, FK check, required rows.
COMMIT;
```

**Önemli güvenlik detayı:** `workspaces.inbox_project_id` FK'si kaydın varlığını korur; hedefin Inbox türünde ve aynı workspace'te olduğunu **tek başına ispatlamaz**. Application bootstrap validator hem ilk yaratılışta hem migration sonrası doğrular. `inbox` statü/deletion koruması ayrıca SQL trigger ile sağlanır. Bu, bilinçli iki seviyeli invariant korumasıdır.

## 6. Arama projeksiyonu, trigger'lar ve sorgu sözleşmesi

`search_index` **türetilmiş normal tablo**, `search_fts` ise `content='search_index'` üzerinden FTS5 external-content indeksidir. Domain tablosundaki insert/update/soft-delete işlemleri `search_index` trigger'ını tetikler; oradaki insert/update/delete da `search_fts` trigger'ını çalıştırır. Böylece bütün değişimler **aynı transaction** içerisindedir. Tutarlı source/FTS hareketi SQLite'ın external-content yönergelerini izler.

FTS5 verilerini `INSERT INTO search_fts ...` ile manuel UI/agent üzerinden yazmak yasaktır. Silinmiş bir kaydın `search_index` satırı hemen kaldırılır; bağlı parent proje soft-delete olduğunda child satırları indeks içinde kalabilir, ancak **arama sorgusu parent ve record registry üzerindeki `deleted_at` ile görünürlüğü tekrar kontrol eder**.

### 6.1 Örnek FTS sorgusu — parametreli, referans kimlikli ve filtreli

```sql
SELECT si.kind, si.record_id, si.project_id,
       bm25(search_fts, 3.0, 1.0) AS relevance_score
FROM search_fts
JOIN search_index AS si ON si.id = search_fts.rowid
JOIN projects AS p ON p.id = si.project_id
JOIN record_registry AS rr
  ON rr.kind = si.kind AND rr.record_id = si.record_id
WHERE search_fts MATCH :safe_fts_query
  AND p.deleted_at IS NULL
  AND rr.deleted_at IS NULL
  AND (:project_id IS NULL OR si.project_id = :project_id)
ORDER BY relevance_score ASC, si.kind ASC, si.record_id ASC
LIMIT :limit;
```

- `:safe_fts_query` **ham kullanıcı metni değil**, DOC-15'teki `parse-query` tarafından tokenlanmış/kaçışlanmış güvenli FTS söz dizimidir. SQL prepared statement kullanmak FTS `MATCH` operatörünün **kendi query syntax**'ını otomatik olarak güvenli/kullanıcı dostu yapmaz.
- Negatif BM25 sıralamasında **küçük sayı daha iyi**. Tie-break kararlı olmalıdır.
- Uzun sayfalama için offset yerine bookmark/cursor kriterleri (`DOC-15`), bellek limiti ve iptal desteklenir.
- `unicode61 remove_diacritics 0` ham UTF-8'i çökertmez; ancak Türkçe `I/İ/ı/i`, ekli sözcük ve anlamsal eşdeğerliği çözmez. Unicode normalizasyon ve model karşılaştırması DOC-15'in sorumluluğundadır.

### 6.2 İndeks bozulması, yeniden oluşturma

**İzinli bakım komutu** (`search_rebuild` job, DB worker içinde, yazma kontrolüyle):

```sql
-- DİKKAT: Üretimde yazma işleri durdurulmuş güvenli bakım transaction'ında.
DELETE FROM search_index;
INSERT INTO search_index(kind,record_id,project_id,title,body)
SELECT 'project',id,id,name,description FROM projects WHERE deleted_at IS NULL;
INSERT INTO search_index(kind,record_id,project_id,title,body)
SELECT 'task',id,project_id,title,body_markdown FROM tasks WHERE deleted_at IS NULL;
INSERT INTO search_index(kind,record_id,project_id,title,body)
SELECT 'document',id,project_id,title,body_markdown FROM documents WHERE deleted_at IS NULL;
INSERT INTO search_index(kind,record_id,project_id,title,body)
SELECT 'decision',id,project_id,title,
       context_markdown || char(10) || decision_markdown || char(10) || rationale_markdown || char(10) || consequences_markdown || char(10) || alternatives_markdown
FROM decisions WHERE deleted_at IS NULL;
INSERT INTO search_index(kind,record_id,project_id,title,body)
SELECT 'activity_log',id,project_id,'',text_markdown FROM activity_logs;
-- External content ile indeksin hâlâ tutarlı olduğunun FTS kontrolü:
INSERT INTO search_fts(search_fts,rank) VALUES('integrity-check',1);
```

Bu yaklaşım her `search_index` değişikliğinde FTS trigger'ını çalıştırdığı için büyük veri kümesinde maliyetli olabilir. Performans testinde gerekiyorsa `search_index` tutarlılığını koruyarak FTS indeksini `INSERT INTO search_fts(search_fts) VALUES('rebuild')` ile **yalnız kontrollü bakım modunda** baştan oluşturmak alternatifidir. Rebuild kodunun atomiklik ve iptal semantiği DOC-10/12/15'te kesinleşir. `search_index` tablo içeriği önce temizlenmeden tek başına `rebuild` kayıp source satırlarını geri getirmez.

## 7. Migration protokolü ve şema sürüm güvenliği

| Durum | Zorunlu davranış |
|---|---|
| Dosya yeni | Preflight + migration V1 + workspace bootstrap |
| `user_version=1` ve migration hash eşleşiyor | Aç; test edilen versiyonu kullan |
| `user_version` uygulamanın bildiğinden büyük | **Açma / yazma yapma**, uyumsuz sürüm uyarısı |
| `schema_migrations` eksik veya checksum değişmiş | **Açma**, otomatik sıfırlama/overwrite yasak |
| V1→V2 | SQLite tutarlı backup, sonra `0002_*.sql`, sonra validation |
| Migration başarısız | Transaction rollback, eski DB'yi koru, kurtarma ekranı |
| Ana DB yolu mevcut değil | Sessiz yeni DB yaratma; çalışma alanı seçim/kurtarma |
| Kapanış anında migration | Eski sürüm veri dosyasını yazmaya devam etmemeli; tek writer koordinasyonu |

**Checksum detayı:** `schema_migrations.sha256`, SQL dosyasının **byte düzeyindeki** SHA-256 değeridir. Tarihçe migration sonradan düzenlenmez. İlk migration'ın kayıt satırını başka migration'a bırakma; migrator DDL ile aynı transaction'da ekler. `PRAGMA user_version` ile `schema_migrations.MAX(version)` açılışta uyuşmalıdır. Migration öncesi DB backup, migration dışı güvenli protokolde alınır (backup API için DOC-10/17); `cp workspace.db` WAL açıkken yeterli değildir.

```ts
// packages/storage-sqlite/src/connection/migrate.ts
// Kavramsal (gerçek API uyumu DOC-10'da integration test ile sabitlenir).
import { createHash } from 'node:crypto';
import type Database from 'better-sqlite3';

interface Migration { readonly version: number; readonly name: string; readonly sql: string; }
function sha256(sql: string): string {
  return createHash('sha256').update(Buffer.from(sql,'utf8')).digest('hex');
}
export function applyFirstMigration(db: Database.Database, m: Migration, nowUtc: string): void {
  if (m.version !== 1) throw new Error('UNEXPECTED_MIGRATION_VERSION');
  const previous = Number(db.pragma('user_version', { simple: true }));
  if (previous !== 0) throw new Error('SCHEMA_MIGRATION_ALREADY_APPLIED');
  // Application should have completed consistent backup + free space checks.
  const apply = db.transaction(() => {
    db.exec(m.sql); // no BEGIN/COMMIT in SQL file; PRAGMA user_version=1 is allowed in txn
    db.prepare(`INSERT INTO schema_migrations(version,name,sha256,applied_at)
                VALUES(?,?,?,?)`).run(1,m.name,sha256(m.sql),nowUtc);
    const inDbVersion = Number(db.pragma('user_version', { simple: true }));
    if (inDbVersion !== 1) throw new Error('SCHEMA_USER_VERSION_MISMATCH');
    const fkErrors = db.pragma('foreign_key_check');
    if (Array.isArray(fkErrors) && fkErrors.length > 0) throw new Error('FOREIGN_KEY_CHECK_FAILED');
  });
  apply.immediate();
}
```

> Bu fonksiyon tek başına üretim migration manager değildir. Gerçek migrator bütün sürümleri sıralar, önceki kayıtların checksum'ını doğrular, kilit/backup politikasını yürütür ve rollback/diagnostic raporlar (`DOC-10/17/32`). `schema_migrations` tablosu sıfırıncı sürümde bulunmayacağından ilk bootstrap diğer sürümlerden farklıdır.

## 8. DB integrity düzeyleri ve sınırlar

| Kural | SQLite korur mu? | Tamamlayan katman |
|---|---|---|
| Olmayan task.project_id | **Evet**, FK | Core hata çevirisi |
| Aynı workspace ikinci Inbox | **Evet**, partial unique | UI'da güvenli hata |
| Inbox arşivleme veya silme | **Evet**, check + trigger | Command validation |
| Done task'ta completed_at olması | **Evet**, CHECK | Clock, geçiş politikası |
| Tarihlerin gerçek takvim değeri | **Kısmen** (basit GLOB) | Zod/Calendar parser |
| UTC milisaniyeli timestamp | **Hayır**, TEXT tek başına yetersiz | Clock/Zod/Import |
| Unicode code point / UTF-8 byte sınırı | **Kısmen** | Ortak Zod validator |
| RecordLink var olmayan ID | **Evet**, `record_registry` composite FK | Soft-delete erişim politikası |
| `depends_on` döngüsü | **Hayır** | Recursive graph validation aynı DB txn içinde |
| Decision supersede karşılıklı link tutarlılığı | **Kısmen** | DOC-10 atomic command, DOC-08 policy |
| Tag workspace sınırı | **Kısmen** | Tag create/attach komutu, özel integration test |
| Project soft-delete ile child görünürlüğü | **Query filtresiyle** | DOC-10/13/15 okuma sözleşmeleri |
| Domain root revision CAS | **Sütunda CHECK**; eşzamanlı CAS query ile | DOC-10 `WHERE revision=?` |
| Append-only log revizyon düzenleme | **Evet** update trigger | Özel redaction/purge policy |
| Hard-delete sonrası FK tutarlılığı | **Evet** (FK), ancak purge sırası gerekir | DOC-17/30 maintenance operation |
| JSON'un beklenen semantik şeması | **Hayır**, JSON sentaks kontrolü var | Contracts + Application |
| Agent tool izni | **Hayır** | Policy layer DOC-26/27/30 |

**Append-only ayrımı:** `task_history`, `document_versions`, `decision_revisions`, `activity_logs` üzerinde normal `UPDATE` yasak. `DELETE` için yalnız ayrı, kullanıcı onaylı privacy erasure/purge bakım komutu olabilir; bu komut **UI/agent tool erişiminde yer almaz**. Bu sistem varsayılan olarak sonsuz koruma veya legal-hold garantisi vermez. `domain_events` outbox satırında `dispatched_at` güncellendiğinden normal domain append-only günlüğüyle aynı sınıfta değildir.

### 8.1 Silme / purge sırası

- V1 normal kayıt silme `deleted_at` + `revision` CAS ile olur, çocukları fiziksel silmez.
- Gerçek purge gerekirse `record_links`, `attachments` ve asset dosyaları açık kullanıcı onayıyla temizlenir; ardından ilgili history ve bağımlı tablolara kontrollü cleanup uygulanır.
- `record_registry` foreign key referansları kontrol edilir; ilgili registry satırları ve ana kayıtların silinme sırası **RESTRICT bağlantılara uygun** tasarlanır. Proje `record_registry(project_id)` kendini referansladığından parent purge için bu özel sıra özellikle test edilir.
- Asset dosyası ve DB aynı atomik işlem değildir; fiziksel dosya hatasında yeniden başlatılabilir journal/güvenli kuyruk `DOC-17/32`'de tasarlanır.
- AI sohbetinin silinmesi agent denetim geçmişini nasıl etkileyeceği privacy policy ve retention ile netleşmelidir; sessiz destructive cascade yoktur.

## 9. Kritik repository sorgu örnekleri (`DOC-10` implementation reference)

### 9.1 Task listesi, limit/cursor

```sql
SELECT t.id, t.project_id, t.title, t.status, t.priority,
       t.due_date, t.sort_order, t.updated_at, t.revision
FROM tasks AS t
JOIN projects AS p ON p.id=t.project_id
WHERE t.project_id=:project_id
  AND t.deleted_at IS NULL AND p.deleted_at IS NULL
  AND (:status IS NULL OR t.status=:status)
ORDER BY t.sort_order ASC,t.created_at ASC,t.id ASC
LIMIT :limit;
```

`limit` en fazla örn. 100 olarak doğrulanır; gerçek sınır `DOC-11/31`. Kanban sıralamasında `sort_order,created_at,id` kullanılır; keyset cursor bağlamsal sayfalama gerekiyorsa `DOC-10` sorgusu genişletilir. İndeks `idx_tasks_kanban` bu sorgunun temel sırasını destekler.

### 9.2 Atomic compare-and-swap, örnek `Task` mutasyonu

```sql
UPDATE tasks
SET title=:title, updated_at=:now, revision=revision+1
WHERE id=:id AND revision=:expected_revision AND deleted_at IS NULL
  AND title<>:title
RETURNING id,revision,updated_at;
```

`RETURNING` sıfır satır verdiğinde önce record var mı/soft deleted mı/revision farklı mı/no-op mu **transaction içinde** ayırt edilir. `title` normalizasyonu ve immutable alan yetkisi DB'den önce yapılır. Task transition/history/event/idempotency receipt yazma kombinasyonu **aynı transaction** içindedir (`DOC-10`). SQLite native `UPDATE ... RETURNING` özelliği runtime POC'de doğrulanır.

### 9.3 Inbox sorgusu

```sql
SELECT p.id, p.name, p.kind, p.status
FROM workspaces AS w
JOIN projects AS p ON p.id=w.inbox_project_id
WHERE w.id=:workspace_id AND p.workspace_id=w.id AND p.kind='inbox'
  AND p.status='active' AND p.deleted_at IS NULL;
```

Sıfır satır dönmesi yeni Inbox yaratma izni **değildir**; workspace bozulması/kurtarma senaryosudur.

## 10. Test planı (`DBS-T-001–034`)

Aşağıdaki testler `packages/storage-sqlite/src/test` içinde integration fixture; performans stress testleri `tests/performance` altında oluşturulacak. *Eşdeğer gözlemlenebilir sonuç* ile test edilebilir; pass/fail CI'ya makinece okunur yazılmalıdır.

| Test | Beklenen sonuç |
|---|---|
| DBS-T-001 | `0001_initial.sql` boş yeni DB'de tek transaction ile uygulanır. |
| DBS-T-002 | Aynı migration tekrar uygulanmaz, checksum uyuşur. |
| DBS-T-003 | Eski/ileri şema sürümü açılış öncesi tespit edilir. |
| DBS-T-004 | Workspace + Inbox + setup tek atomik commit olur. |
| DBS-T-005 | İkinci workspace satırı aynı dosyada reddedilir. |
| DBS-T-006 | İkinci Inbox reddedilir. |
| DBS-T-007 | Inbox rename/archive/delete engellenir. |
| DBS-T-008 | Geçersiz task status veya priority CHECK tarafından reddedilir. |
| DBS-T-009 | Done/completedAt tutarsızlığı reddedilir. |
| DBS-T-010 | Olmayan project'e task/doc/decision/log eklenmez. |
| DBS-T-011 | Soft-deleted project içine yeni kayıt eklenmez. |
| DBS-T-012 | ActivityLog mevcut satırı UPDATE edilemez. |
| DBS-T-013 | DecisionRevision/DocumentVersion/TaskHistory UPDATE edilemez. |
| DBS-T-014 | Aynı `(projectId,displayCode)` kararda tekrarlanamaz. |
| DBS-T-015 | `record_links` kayıp source/target composite FK ile reddedilir. |
| DBS-T-016 | `depends_on` yalnız task→task, self-link yasak. |
| DBS-T-017 | App graph validator iki task arasında `depends_on` cycle reddeder. |
| DBS-T-018 | Link/attachment sahibi deleted ise erişim politikası uygular. |
| DBS-T-019 | Project/task/doc/decision/log yeni oluşturulunca FTS'de görünür. |
| DBS-T-020 | Task/document/decision update edilince eski token silinir, yeni token bulunur. |
| DBS-T-021 | Soft-delete edilen kayıt FTS görünürlüğünden çıkar. |
| DBS-T-022 | Parent project soft-delete edilirse çocuk arama sonuçlarında görünmez. |
| DBS-T-023 | Index rebuild sonrası id/başlık/metin sayısı eşleşir. |
| DBS-T-024 | FTS `integrity-check` ve `PRAGMA integrity_check` başarılı. |
| DBS-T-025 | `PRAGMA foreign_key_check` sıfır hata. |
| DBS-T-026 | UI'dan gelen ham FTS operator metni doğrudan MATCH'e geçmez. |
| DBS-T-027 | Tag `name_key` aynı workspace içinde unique. |
| DBS-T-028 | Tek workspace'te en fazla bir seçili agent modeli. |
| DBS-T-029 | `enabled` provider olmadan setup tamamlanabilir ve DB çalışır. |
| DBS-T-030 | Tool args, event payload ve revizyon snapshot JSON geçerli olur. |
| DBS-T-031 | Outbox sequence yeniden başlatmada artmaya devam eder. |
| DBS-T-032 | Idempotency key+actor+command unique; farklı payload hash uygulama katmanında conflict. |
| DBS-T-033 | Migration hata/interrupt durumunda kayıt bozulmaz ve backup kalır. |
| DBS-T-034 | 100.000 log satırında FTS/query P50/P95 ve DB boyutu raporlanır; sayı iddia edilmez. |

### 10.1 Bu doküman hazırlanırken gerçekleştirilen SQLite smoke testleri

SQLite 3.46.1'e bağlı Python `sqlite3` ile **boş in-memory bağlantıda** migration DDL denendi; ayrıca örnek UUID kayıtları üzerinden Inbox koruması, FK kontrolü, arama token insert/update, search soft-delete, task done/completed_at constraint, append-only trigger ve `FTS5 integrity-check` doğrulandı. Çalıştırılan kontrol, üretim `better-sqlite3` ve paketlenmiş Electron testi değildir.

Geliştirici ajan aynı davranışları `better-sqlite3` üzerinde **gerçek dosyalı DB** ile test etmeli; sadece in-memory başarıyı `verified` saymamalıdır. Windows'la beraber macOS/Linux'a dair native smoke testleri DOC-34 release matrix'e bağlanacaktır.

## 11. Performans ve indeks tasarımının gerekçesi

- `tasks(project_id,status,sort_order,created_at,id)` sıralı Kanban/list query'sini, `activity_logs(project_id,occurred_at,recorded_at,id)` kronolojiyi, `messages` UNIQUE `(conversation_id,sequence)` akış sırasını destekler.
- Bütün FTS verisini program açılışında React belleğine çekmeyiz. `search_index` ve `search_fts` sorgulanır, yalnız sayfa DTO döner.
- Metadata sorgularında büyük `body_markdown` kolonu seçilmez; detay açılınca çekilir. `SELECT *` kritik liste yolunda kullanılmaz.
- AI kapalı başlangıçta hiçbir `model_profiles`/`messages` tam tablo scan'i UI'ya yüklenmez; yalnız işlevin tercihi ve gerekirse asenkron health check yapılır.
- `fts5` prefix indeksleri depolama maliyetini artırır; `prefix='2 3'` seçimi 100k log fixture P95 ve dosya boyutunda ölçülür. Gereksizse yeni migration + ADR ile değişir.
- `search_index` gövdeyi alanında tekrar tuttuğundan disk maliyeti artar; bu V1'in hızlı arama ve sağlam trigger tutarlılığı için **bilinçli ödünleşimidir**. DB / WAL / backup boyutu ölçülür.
- `EXPLAIN QUERY PLAN`, gerçek Windows SSD ölçümü, cold/warm P50/P95 ve memory RSS `DOC-31` kapsamındadır. Henüz performans hedeflerine ulaşıldığı **iddia edilmez**.
- `VACUUM`, aggressive FTS optimize veya geniş indeks rebuild UI/ana süreç üzerinde senkron yapılmaz; güvenli job/worker üzerinden ve uygun çalışma zamanında gerçekleşir.

## 12. Yerleşim, kodlama sırası ve yayın kapıları

**Dosyaları oluştur:**

```text
packages/storage-sqlite/
├── migrations/
│   └── 0001_initial.sql       # §4'teki TAM SQL BLOĞU
└── src/
    ├── connection/
    │   ├── open-database.ts
    │   ├── pragmas.ts
    │   └── migrate.ts
    ├── repositories/
    │   ├── project.repository.ts
    │   ├── task.repository.ts
    │   ├── document.repository.ts
    │   ├── decision.repository.ts
    │   └── activity.repository.ts
    ├── search/
    │   ├── fts-index.ts
    │   └── queries.ts
    ├── operations/
    │   ├── backup.ts
    │   ├── checkpoint.ts
    │   └── integrity.ts
    └── test/
        ├── temp-workspace.ts
        └── fixtures.ts
```

**Uygulama sırası:** `SQL migration + checksum` → native SQLite POC → workspace/Inbox atomic bootstrap → domain repositories/CAS → outbox/idempotency → metadata/tag/link → FTS5 → project/task/docs/decisions/log fixtures → agent/setup/voice metadata → integrity tests → crash/migration tests → 100k log benchmark.

**Release blocker'lar:** FK kapalı; migration yarım uygulanmış; canonical veriyi silebilen tehlikeli cascade; parent silindikten sonra child aramada görünmesi; dış actor kimliğiyle write; FTS kaydının yanlış domain kaydına navigasyonu; Inbox restore bozuk; fail olmuş yazma UI'da başarılı görünmesi; Electron native sqlite modülünün pakette yüklenememesi.

### 12.1 Geliştirici ajan için kesin talimatlar

1. `DOC-08` enum/ID anlamlarını bu şemayla karşılaştır; uyuşmazlıkta sessizce SQL veya domain değiştirme, iki belgeyi ADR ile uzlaştır.
2. `§4` SQL'i `packages/storage-sqlite/migrations/0001_initial.sql` olarak **aynen** çıkar. SQL checksum hash hesapla; kaynak script versiyonun sabitlendikten sonra değiştirme.
3. `sqlite3` smoke testleri ile başla, sonra Electron-native `better-sqlite3` integration E2E ile aynı testi koş.
4. `PRAGMA foreign_keys` ve FTS5 gerçekten açık mı runtime doğrula. Sadece compile option'a güvenme.
5. UI/agent/cloud sidecar'a hiçbir SQL yetkisi verme; repository adapters `DOC-06/07` sınırını aşamaz.
6. Domain ve database `CHECK` hatalarını kullanıcıya raw SQL hata mesajı olarak vermek yerine tipli güvenli hata zarfına çevir (`DOC-10/11`).
7. DB migration ve FTS integrity hata durumları için kurtarma ekranı çalışmadan release yapma.
8. `DBS-T-001–034` test IDsini CI raporunda görünür kıl.

### 12.2 Bu belgenin Definition of Done'u

- [x] Kanonik V1 DDL tek `sql` bloğu olarak oluşturuldu.
- [x] Tablo, indeks, trigger, FTS5, FK ve migration düzeni tanımlandı.
- [x] SQLite 3.46.1 in-memory smoke test temel senaryoları çalıştırıldı.
- [x] `DOC-08` enum/field isimleri, nullable alanlar ve append-only semantiği gözden geçirildi.
- [ ] Native `better-sqlite3` Electron worker ile derleme/smoke test geçildi.
- [ ] Gerçek `schema_migrations` checksum/backup/failure recovery uçtan uca test edildi.
- [ ] 100.000 log performans testi ve FTS boyut ölçümü raporlandı.
- [ ] Windows installer içinden yeni workspace kurulumu E2E geçti.

**Bu dört açık madde tamamlanmadan statü `approved` veya `verified` olmaz.** Belgede kod bulunması uygulamanın tamamlandığı anlamına gelmez.

## 13. İzlenebilirlik / yetki devri

| Alan | Kaynak | Sonraki sözleşme |
|---|---|---|
| UUID, status, history, error code | DOC-08 | DOC-10 / DOC-11 |
| `workspaces`, `projects`, Inbox invariant | DOC-08 + DOC-09 | DOC-10 / DOC-18 |
| `tasks` Kanban, CAS, task_history | DOC-08 + DOC-09 | DOC-10 / DOC-13 |
| Document/Decision/Log | DOC-08 + DOC-09 | DOC-10 / DOC-14 |
| Search FTS5 & query safety | DOC-09 | DOC-15 / DOC-31 |
| Markdown/JSON/Git export | DOC-09 metadata | DOC-16 |
| Backup, purge, migration failure | DOC-09 DDL | DOC-10 / DOC-17 / DOC-32 |
| Setup/Model/Voice jobs | DOC-08 + DOC-09 | DOC-12 / DOC-18 / DOC-19 / DOC-24–29 |
| Tool approvals, privacy/audit | DOC-08 + DOC-09 | DOC-26 / DOC-27 / DOC-30 |
| Tests & packaged native checks | DOC-04 / DOC-09 | DOC-33 / DOC-34 |

## 14. Kaynaklar ve karar geçmişi

Resmî teknik referanslar:

- SQLite FTS5 external-content, rebuild ve integrity-check: https://www.sqlite.org/fts5.html
- SQLite triggers: https://www.sqlite.org/lang_createtrigger.html
- SQLite PRAGMA (FK, WAL, integrity): https://www.sqlite.org/pragma.html
- SQLite ALTER TABLE/migration sınırları: https://www.sqlite.org/lang_altertable.html
- SQLite strict tables: https://www.sqlite.org/stricttables.html
- SQLite transactions: https://www.sqlite.org/lang_transaction.html

| Tarih | Sürüm | Açıklama |
|---|---|---|
| 2026-10-10 | 0.1.0 | V1 DDL, external-content FTS, registry, migration ve test sözleşmesi oluşturuldu. |

**Sonraki belge: `10-DB-OPERATIONS.md` (DOC-10).** Burada SQL şemasını değiştirmeden transaction yönetimi, worker RPC, prepared repository methods, CAS/undo, busy retry, WAL checkpoint, backup API ve idempotent command dispatch protokolleri tanımlanacaktır.

> **VOICE-ADR-001 uyum güncellemesi (2026-10-10):** İsteğe bağlı STT/TTS runtime ve model paketlerinin uygulama içinden, güvenli katalog üzerinden kullanıcı onaylı indirilmesi için `voice_component_install` job / `voice.listComponents` ve `voice.startComponentInstall` sözleşmesi gerektiği yerde eşlendi. Bu tasarım değişikliği henüz çalışır kod kanıtı değildir.
