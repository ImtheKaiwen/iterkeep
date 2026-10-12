---
document_id: DOC-16
title: "Iterkeep — Taşınabilir Markdown/YAML Formatı, İçe/Dışa Aktarım ve Güvenli Git Entegrasyonu"
version: "0.1.0"
status: "draft"
last_updated: "2026-10-10"
language: "tr-TR"
owner: "Portability, Data Migration & Git Integration"
depends_on:
  - "DOC-00"
  - "DOC-02"
  - "DOC-03"
  - "DOC-04"
  - "DOC-05"
  - "DOC-06"
  - "DOC-07"
  - "DOC-08"
  - "DOC-09"
  - "DOC-10"
  - "DOC-11"
  - "DOC-12"
  - "DOC-13"
  - "DOC-14"
  - "DOC-15"
next_document: "DOC-17"
---

# Iterkeep — Markdown/YAML İçe–Dışa Aktarım ve Git Sözleşmesi

> **Normatif amaç:** Veriyi kullanıcıya ait, internetsiz okunabilir ve sürümlenebilir bir formata çıkarmak; bu formatı güvenli ve öngörülebilir şekilde yeniden içe almak; Git işlemlerini kullanıcı onayına bağlı, kapsamı dar ve gözlemlenebilir tutmak. Geliştirme ajanı bu belgede belirtilen formatı, hata politikalarını ve kabul testlerini takip etmelidir.
>
> **Yetki sınırı:** `DOC-08` domain enum/ID/iş kuralları; `DOC-09` fiziksel SQL; `DOC-10` transaction, backup ve idempotency; `DOC-11` dış IPC; `DOC-12` job ve olay döngüsü; `DOC-14` document/decision/log yazma semantiği; `DOC-15` arama indeksi; `DOC-17` tam DB yedek/restore; `DOC-30` tehdit modeli; `DOC-31` performans bütçeleri için kanonik kaynaktır. **DOC-16 yalnız taşınabilir dosya biçimi, import planı/çatışması, dışa aktarım tutarlılığı ve Git entegrasyonunda yetkilidir.**
>
> **Kanıt sınırı:** Bu dosya bir uygulama spesifikasyonudur. GitHub Actions, Electron ve gerçek dosya sistemi üzerinde E2E testleri henüz tamamlanmış değildir. Belge `draft` kalır. SQL ve yerel format kontrolleri geçse bile release onayı anlamına gelmez.

## 0. Projenin gerçek veri sınırı

- Tek yetkili çalışma alanı verisi: SQLite `workspace.db` (`DOC-09`). Markdown/YAML *transfer anındaki snapshot*'tır; DB ile sürekli çift yönlü senkronizasyon kurulmaz.
- **Export ≠ Backup:** Export kullanıcıya okunur kayıt sağlar; `DOC-17`'deki SQLite backup API, tam uygulama geri yüklemesi için gereklidir. Bazı operasyonel bilgiler (provider ayarları, model dosyaları, agent geçmişi vb.) taşınabilir paket kapsamı dışındadır.
- **Git ≠ Otomatik bulut yedeği:** Local commit yalnız makinededir. Push açık onay ister; private repo seçilmesi dahi veri mahremiyetini mutlak garanti etmez.
- **İlk açılış ve CRUD** hiçbir zaman Git kurulumu, ağ veya import-export paketinin sıcak başlatılmasını beklemez.
- AI olmadan import/export/Git kullanılır. Agent bu yeteneklerin farklı ve serbest bir uygulamasına sahip değildir; aynı Application Core komut ve politika kapısını kullanır.

---

## 1. Kesin kararlar (`XFER-D-001–036`)

| ID | V1 kararı | Teknik sonuç |
|---|---|---|
| XFER-D-001 | SQLite source of truth | Export yalnız snapshot; import Application Core komutlarını kullanır. |
| XFER-D-002 | Native portable format ID `iterkeep-portable/1` | Parse sırasında `format`, `version` doğrulanır. |
| XFER-D-003 | Kalıcı kayıt ID'si UUID v4 | Ulid, satır numarası, slug kanonik kimlik olmaz. |
| XFER-D-004 | Dosya yolları göreli, POSIX slash | Windows'ta da manifestte `/`; filesystem adapter çevirir. |
| XFER-D-005 | UTF-8, LF ve Unicode NFC | Deterministik Markdown/YAML; kullanıcı metni kendiliğinden normalize edilmez, yalnız format/isimler normalize edilir. |
| XFER-D-006 | Yayımlanan dosya sırası sabit | Project ID, tür, kayıt ID; timestamp rastgele üretilmez. |
| XFER-D-007 | Manifest content-addressed | Her veri dosyası SHA-256, byte boyutu ve göreli yolu içerir. |
| XFER-D-008 | İndeks dosyaları türetilmiştir | `README.md` ve `tasks-index.md` düzenlenebilir ana veri sanılmaz. |
| XFER-D-009 | Her görev, not, karar ve log ayrı `.md` | Kullanıcıya okunur, bağımsız düzenlenebilir kayıtlar. |
| XFER-D-010 | Entity front matter kısıtlı YAML şemasıdır | `id`, `project_id`, `revision`, tarih ve typed alanlar. |
| XFER-D-011 | Özel link/tag/history, şemalı `.jsonl` | Çapraz ilişkiyi kusursuz korur, insan okumayı engellemez. |
| XFER-D-012 | Attachment byte'ları opsiyonel kopyalanır | Açık katılım + manifest hash; path güvenli. |
| XFER-D-013 | Gizli/operasyonel alanlar export dışı | Agent düşüncesi, API token, temp ses, provider config, DB, job receipts. |
| XFER-D-014 | Eksik attachment veri kaybı olarak raporlanır | Varsayılan fail; açık 'metadata only' seçeneğinde açık uyarı. |
| XFER-D-015 | Export tutarlı DB snapshot'tan üretilecek | Parçalı ve birbirini tutmayan okuma yok. |
| XFER-D-016 | Export staging + doğrulama + kontrollü publish | Hedefe yarım paket 'başarılı' diye çıkmaz. |
| XFER-D-017 | Var olan kullanıcı dosyası habersiz ezilmez | Manifest sahipliği ve diff/onay zorunlu. |
| XFER-D-018 | Import preview, kalıcı domain mutasyonu yapmaz | Parse/plan sahte değil; tam doğrulama ve etkiler gösterilir. |
| XFER-D-019 | Preview ve commit arasında fingerprint kontrolü | Kaynak içerik veya hedef revision değişmişse plan geçersiz. |
| XFER-D-020 | Başlangıç politikası `skip`, `copy`, `merge` | `replace_all`, `force overwrite` V1 yok. |
| XFER-D-021 | `merge` yalnız açık alan değişikliklerinde | Revizyon veya içerik çatışmasında otomatik yazma yok. |
| XFER-D-022 | `copy` tüm ID ve ilişkileri deterministik mapping ile yeniler | İlişkiler yanlış kayda bağlanmaz. |
| XFER-D-023 | Bütün import batch'i atomik tercih | Kullanıcı verisi yarım toplu aktarımla bozulmaz. |
| XFER-D-024 | Büyük import'ta boyut kısıtı vardır | Limit aşımı chunk/transaction rejimi ayrı ADR olmadan otomatik seçilmez. |
| XFER-D-025 | Import parser hiçbir dosyayı çalıştırmaz | HTML/JS/komut/SQL içerik olarak saklanır; render güvenli. |
| XFER-D-026 | Symlink/reparse point/zip-slip engellenir | Export/import seçili kökün dışına taşamaz. |
| XFER-D-027 | Git adapter allowlist komutları çalıştırır | Shell string interpolation ve keyfî Git flag yok. |
| XFER-D-028 | Git export target'a bağlanır, canlı DB'ye değil | `workspace.db`, cache, model, ses kayıtları stage edilmez. |
| XFER-D-029 | Git repo dirty ise yalnız uygulamanın sahip olduğu export dosyaları | Başka staged/untracked dosyaları commit'e katılmaz. |
| XFER-D-030 | `git push` açık ve ayrı kullanıcı onayıyla | Ağ erişimi ve remote/branch/commit özeti görünür. |
| XFER-D-031 | Git commit/push sonuç belirsizse kendiliğinden tekrar yok | HEAD/remote uzlaştırma gerekir (`DOC-12`). |
| XFER-D-032 | Git yoksa export ve uygulama eksiksiz işler | Kurulum önerisi, crash değil. |
| XFER-D-033 | Kullanıcı taşıma profilini iptal edebilir | DB'de export profile saklanır; path değişince revalidate edilir. |
| XFER-D-034 | Metadata YAML alias/tag yükleme yasak | Safe schema, duplicate key ve nesting sınırı. |
| XFER-D-035 | Sensitive içerik remote'a gidebileceği anlatılır | Varsayılan push kapalı; secret scan uyarı verir, güvenlik garantisi vermez. |
| XFER-D-036 | İçe/dışa aktarım raporu denetlenebilir | ID bazlı status, problem kodu, yeni ID mapping ve toplam sayılar. |

**Açık uyumluluk maddeleri (artık çözülmüş):** `DOC-11`'deki `exportProfileId`'nin kalıcılığı için `DOC-09` ilk migration'ına `export_profiles` eklendi; listelenebilir profiller ve sayfalanmış import önizlemesi için `DOC-11`'e iki adlandırılmış IPC rotası eklendi. Bu değişiklikler önceki belgelere aynı teslimatta uygulanmıştır. Hiçbir yeni `JobKind` icat edilmez; hâlâ `import`, `export`, `git_commit`, `git_push` kullanılır.

## 2. İnsan tarafından okunabilir native portable formatı

### 2.1 Paket biçimi

`iterkeep-portable/1`: **klasör** esas biçim; aynı ağaç `zip` olarak paylaşılabilir, ancak ZIP açılmadan önce limit ve yol kontrolü uygulanır. ZIP oluşturma paketin iç yapısını değiştiremez.

```text
exported-workspace/
├── iterkeep-export.yml                     # root manifest; authority for file list
├── README.md                               # generated, informative, NOT imported
├── .iterkeep/
│   ├── records/
│   │   ├── task_history.jsonl
│   │   ├── document_versions.jsonl
│   │   ├── decision_revisions.jsonl
│   │   └── record_links.jsonl
│   ├── tags.jsonl
│   ├── asset-manifest.jsonl                 # yalnız includeAssets=true
│   └── format.txt                          # 'iterkeep-portable/1\n'
└── projects/
    ├── kaiwen-agent--1ba2c3d4/
    │   ├── project.yml
    │   ├── README.md                         # türetilmiş index
    │   ├── tasks-index.md                   # türetilmiş index
    │   ├── tasks/
    │   │   └── 27bd08dd-7f3e-4ec0-bbe2-c6fb882ed33b.md
    │   ├── notes/
    │   │   └── 79e0d9a5-3b89-4960-a7aa-ad21e6bbed89.md
    │   ├── decisions/
    │   │   └── 5cf39524-c038-4a61-83c1-ab8411e30da2.md
    │   └── logs/2026/10/10/
    │       └── 136d1ea1-1163-4a1f-b0c6-e0e82b761e1c.md
    └── inbox--.../
        └── ...
```

- `.iterkeep/` içerikleri saklı dosyalar gibi görünse de **Gizli/özel veri değildir**: düz metindir; kullanıcı bunları Git'e gönderirse uzak tarafa gider.
- Asıl kayıt Markdown içeriği `tasks/*.md`, `notes/*.md`, `decisions/*.md`, `logs/**/*.md` dosyalarındadır. Türetilmiş `tasks-index.md` yalnız gezinmeyi kolaylaştırır; içe alma tarafından yok sayılır.
- Tüm ID'ler tam tireli lowercase UUID v4'dir. Klasör adındaki son 8 karakter yalnız görünüm içindir; rename/slugs değiştiğinde kimlik bulunması için `project.yml` okunur.
- Portable pakette export işleminin son saatini tutan rastgele/oynak bir `generated_at` alanı **yoktur**. Aynı snapshot aynı baytlarla yeniden üretilebilir; kullanıcıya işin zamanı uygulama job receipt'inde gösterilir.
- Boş proje klasöründe bile `project.yml` ve indeks dosyaları üretilir.

### 2.2 `iterkeep-export.yml`: kanonik manifest

```yaml
format: iterkeep-portable
format_version: 1
workspace_id: "5f9719c0-51e2-4645-a6da-13ec31c7a9b2"
workspace_name: "My Workspace"
schema_compatibility_version: 1
included_scopes: [projects, tasks, documents, decisions, activity_logs, tags, links, history]
assets_included: false
partial: false
files:
  - path: "projects/kaiwen-agent--1ba2c3d4/project.yml"
    sha256: "<64-lowercase-hex-hash>"
    bytes: 432
  - path: "projects/kaiwen-agent--1ba2c3d4/tasks/27bd08dd-7f3e-4ec0-bbe2-c6fb882ed33b.md"
    sha256: "<64-lowercase-hex-hash>"
    bytes: 218
# ... all imported files including metadata and copied assets in sorted path order.
```

Örnekteki `<...>` alanları **placeholder**'dır; üretimde Zod/validator bunları kabul etmez. Manifestin kendisinin hash'i kendisine yazılmaz; SHA-256 değeri iş receipt'inde hesaplanıp gösterilir. `files` listesinde *manifest dışındaki bütün içerik dosyaları*, oluşturulduğu sırada sabit sıralamayla bulunur. Dosya listesinde duplicate path, `../`, absolute path, backslash, platform device path, NUL veya Unicode/Windows casefold çakışması yasaktır.

`partial=true` tek/çoklu proje seçili export'u gösterir. Workspace ID yalnız veri kökeni bilgisidir; import yeni workspace'e taşırken kendi workspace ID'sini koruyabilir, ancak tek-aktif-workspace kuralı gereği **yeni çalışma alanı kayıtlarına ait bütün FK'lar** hedefin workspace ID'sine uyarlanır. Aynı ID'li farklı workspace otomatik merge edilmez.

### 2.3 `project.yml` örneği

```yaml
kind: project
id: "1ba2c3d4-4c95-47b8-812d-29c78b75497c"
name: "Kaiwen Agent"
description: "Yerel agent sistemi"
status: active
priority: high
sort_order: 1000
created_at: "2026-10-10T10:00:00.000Z"
updated_at: "2026-10-10T11:20:00.000Z"
last_activity_at: "2026-10-10T11:18:00.000Z"
revision: 3
deleted_at: null
tags: ["ai", "python"]
```

- `kind='inbox'` projeleri, **mevcut hedef sistem Inbox'ı ile güvenli eşleme kuralı** üzerinden ele alınır; ikinci Inbox oluşturulmaz.
- `slug` taşınabilir YAML'de gerekli değildir; export klasör adından yeniden türetilmez. Manifestte veya metadata'da mevcut `slug` varsa okunur; import hedefte slug'ı proje adına göre güvenli biçimde üretir. İç ID değişmez.
- `workspace_id` proje dosyalarında tekrarlanmaz; manifestte bulunur. Tüm veri tablosu sütunları aktarılır gibi davranılmaz; dosya formatının kendi sürümlü kontratı vardır.

### 2.4 `.md` dosyalarında front matter

Her kayıt dosyasında yalnız güvenli ve deterministik YAML front matter ve Markdown body bulunur:

```markdown
---
kind: task
id: "27bd08dd-7f3e-4ec0-bbe2-c6fb882ed33b"
project_id: "1ba2c3d4-4c95-47b8-812d-29c78b75497c"
title: "Memory testlerini tamamla"
status: todo
priority: high
due_date: "2026-10-12"
completed_at: null
sort_order: 1000
blocked_reason: null
revision: 1
created_at: "2026-10-10T10:00:00.000Z"
updated_at: "2026-10-10T10:00:00.000Z"
deleted_at: null
tags: ["ai"]
---

Test kapsamı: idempotency, tool izinleri ve DB migration.
```

Kayıt tipine göre izinli front matter alanları:

| `kind` | Ek metadata | Markdown body'nin eşlendiği alan |
|---|---|---|
| `task` | `status`, `priority`, `due_date`, `completed_at`, `blocked_reason`, `sort_order`, `tags` | `tasks.body_markdown` |
| `document` | `pinned`, `tags`, `revision`, `deleted_at` | `documents.body_markdown` |
| `decision` | `display_code`, `status`, `decided_at`, `supersedes_decision_id`, `superseded_by_decision_id` + bölüm başlıkları | Beş karar markdown alanı (aşağıda) |
| `activity_log` | `occurred_at`, `recorded_at`, `actor_kind`, `actor_ref`, `correction_of_id`, `related_task_id`, `related_decision_id`, `correlation_id` | `activity_logs.text_markdown` |

Decision için içerik, özel başlık ayraçlarına mahkûm edilmez; front matter içine Markdown gömmek de istenmez. Karar dosyası şu **sabit özel delimiters** ile beş parçaya ayrılır:

```markdown
---
kind: decision
id: "5cf39524-c038-4a61-83c1-ab8411e30da2"
project_id: "1ba2c3d4-4c95-47b8-812d-29c78b75497c"
display_code: "DEC-001"
title: "SQLite kullanımı"
status: accepted
revision: 1
created_at: "2026-10-10T10:00:00.000Z"
updated_at: "2026-10-10T10:00:00.000Z"
decided_at: "2026-10-10T10:00:00.000Z"
supersedes_decision_id: null
superseded_by_decision_id: null
deleted_at: null
---

<!-- iterkeep:section=context -->
Yerel ve güvenli kayıt gereksinimi.
<!-- iterkeep:section=decision -->
SQLite tek yetkili veri kaynağıdır.
<!-- iterkeep:section=rationale -->
İndeksleme ve transaction desteği.
<!-- iterkeep:section=consequences -->
Markdown transfer formatı olarak kalır.
<!-- iterkeep:section=alternatives -->
Salt dosya tabanlı saklama.
```

Bu **bölüm ayracı**, kullanıcı metniyle çakışabileceği için parser üretmeden önce kaçışlama kuralı gerektirir: Kullanıcı body satırı ayracın aynı UTF-8 bayt dizisiyle eşleşiyorsa satır `\\` ön ekli yazılır; importer **yalnız bu tam kuralı** tersine çevirir. Başka metinler değiştirilmez. Eksik/tekrar eden veya yanlış sıradaki delimiter reddedilir. Markdown render, HTML'yi güvenli biçimde sanitize eder (`DOC-14/30`).

### 2.5 Metadata sidecar'ları (tamlık)

Per-record Markdown tek başına bütün ilişkileri temsil edemez. Bunun için `.iterkeep/records/*.jsonl` dosyalarında **her satır ayrı katı şemalı JSON nesnesidir**:

- `task_history.jsonl`: `task_history` satırları, `id`, `task_id`, `kind`, `from_value`, `to_value`, `occurred_at`, `actor_kind`, `actor_ref`, `correlation_id`.
- `document_versions.jsonl`: `document_versions` için tam geçmiş snapshot; current note Markdown'dan okunur, history edit edilmez.
- `decision_revisions.jsonl`: `decision_revisions` için JSON snapshot + gerekçe; kabul edilmiş kararı overwrite etme politikası korunur.
- `record_links.jsonl`: iki uç `kind/id`, ilişki tipi, yaratılma ve aktör metadatası. Yalnız exported/selected kayıtlar arasında kalan link'ler dahil edilir; dış bağlantılar raporlanır.
- `tags.jsonl`: canonical tag kimliği/ismi ve project/task/document bağlantıları; front matter `tags` dizisi kullanıcıya okunur temsildir, sidecar **kimlik/ilişki için** asıl transfer kaynağıdır.
- `asset-manifest.jsonl`: asset kimliği, sahibi, relative path, hash ve bayt boyutu; sadece `includeAssets=true`.

**Çift veri uyuşmazlığı ilkesi:** Front matter `tags` yalnız görünüm bilgisidir; `tags.jsonl` ile çelişirse import preview `PORTABLE_METADATA_CONFLICT` döndürür, sessizce bir tarafı seçmez. Sidecar'dan gelen history, hedefte eski history'ye saldırgan UPDATE uygulamaz; kimlik/digest bazında eksik satır eklenir veya çatışma raporlanır. `README` ve `tasks-index` asla import kaynağı olmaz.

### 2.6 Portable schema evolution

- `format_version=1` kabul edilir. Daha yüksek major format desteklenmiyorsa `PORTABLE_UNSUPPORTED_VERSION` ile yalnız görüntüleme/rapor seçeneği; eksik alan tahmin edilmez.
- `schema_compatibility_version`, SQLite `user_version` ile **aynı kavram değildir**. Export formatı ürün DB sürümünden bağımsız yaşar.
- Gerekirse `format_version=2` için açık migration adapter yazılır. V1 exporter aynı veriden deterministik üretim devam ettirebilir.
- Gelecekteki bilinmeyen **güvenlik/kimlik belirleyici alanları** otomatik yok sayma yoktur. Bilinmeyen güvenli opsiyonel alanlar yalnız whitelisted extension namespace ile kabul edilir; V1 varsayılanı strict schema'dır.

---

## 3. Deterministik üretim kuralları

1. Kanonik SELECT sıraları ID'ye göre sabit; kullanıcı tercihli `sort_order` içerik metadatasında korunur, dosya üretim sırası buna bağlanmaz.
2. Dışa aktarılan tüm metadata key sıraları `portableSerializer` şemasıyla sabittir; genel-purpose YAML dump'ın key sıra garantisine kör güvenilmez.
3. Bütün satır sonları LF. Dosya sonu tek LF. UTF-8 BOM eklenmez. JSONL satırları canonical key sırasıyla, dosya sonunda tek LF.
4. Boş ve null ayrı. Boolean gerçek YAML boolean; tarih dizeleri **tırnaklı** ve UTC millisecond biçimindedir.
5. Markdown gövdesi kullanıcı yazdığı hâliyle korunur; kırpma, trim, `\r\n`→`\n` normalizasyonu yalnız aktarım temsili seviyesinde yapılır. **Round-trip eşitliği için** kayıt gövdesinin bayt biçimi de korunacaksa manifestte `raw_body_encoding` ve raw SHA metadata gerekir. V1 normatif round-trip ölçütü **normalize edilmiş Markdown text eşitliği** olup binary newline aynılığı garantisi yoktur.
6. En küçük değişimde bütün manifest hash dizisi değişebilir; fakat ilgili olmayan Markdown dosyalarının içerik hash'i değişmez.
7. `mtime`, filesystem inode, export zamanı, job ID ve platform-specific path hiçbir canonical dosyaya yazılmaz.
8. Proje adında `/`, `\\`, `:`, `?`, `*`, `.` veya emoji olabilir; klasör slug'ı güvenli transliteration + kısa UUID suffix ile oluşturulur. Asıl ad `project.yml` içinde kayıpsız kalır.
9. Windows için `CON`, `PRN`, `AUX`, `NUL`, `COM1`..`COM9`, `LPT1`..`LPT9`, trailing space/dot, eşdeğer Unicode normalize/casefold çakışmaları engellenir.
10. Yalnız selected project set varsa `partial=true`; proje dışı Inbox taşıma politikası import preview'de özellikle gösterilir.

### 3.1 Kaynak bütünlüğü ve seçili proje snapshot'ı

- Application Core `ExportSnapshot` portuyla tek **tutarlı** okuma anı sağlar. SQLite worker bir read transaction içinde kaynakları, geçmişleri, ilişkileri ve asset metadatasını çıkarır; DB transaction boyunca yavaş disk yazımı yapmaz.
- Büyük snapshot için read transaction sürelerini sınırlamak üzere tutarlı geçici DB snapshot'ı alınabilir (SQLite backup API/VACUUM INTO uygunluğu `DOC-10/17`), ardından worker geçici DB'den okur. Tutarlılık kanıtı verilmeden ayrı ayrı canlı SELECT sonuçlarını birleştirmek yasaktır.
- Asset dosyaları DB dışındadır; metadata ile asset byte hash'i publish öncesi tekrar kontrol edilir. Asset snapshot consistency garanti edilemezse export `SOURCE_CHANGED` ile abort edilir.
- UI staging sırasında yalnız gerçek status/progress gösterir; commit olmadan başarı ilan etmez.

### 3.2 TypeScript portu

```ts
// packages/import-export/src/index.ts — referans sözleşme
export type PortableFormatVersion = 1;
export type ExportScope = Readonly<{
  projectIds: readonly string[] | null;
  includeAssets: boolean;
  includeHistory: true;
}>;
export interface PortableFile {
  relativePath: string;
  bytes: Uint8Array;
  sha256: string;
}
export interface ExportPlan {
  readonly schema: 'iterkeep-portable/1';
  readonly snapshotFingerprint: string;
  readonly files: readonly PortableFile[];
  readonly recordCounts: Readonly<Record<string, number>>;
  readonly warnings: readonly string[];
}
export interface ExportWriter {
  stage(plan: ExportPlan, selectedTarget: string, signal: AbortSignal): Promise<string>;
  verify(stagingPath: string, plan: ExportPlan): Promise<void>;
  publish(stagingPath: string, selectedTarget: string, policy: 'new' | 'confirmed_replace'): Promise<void>;
}
```

Bu arayüzde `selectedTarget` yalnız **Main'in handle doğrulamasından sonra** Node adapter'a geçirilir. Renderer yolu belirleyemez. Gerçek uygulamada `bytes` büyük dosyalarda bellekte tek sefer tutmak yerine akış veya temp snapshot referansına dönüşebilir; `DOC-31` benchmarkı ile ölçülür. Yukarıdaki tipler davranış sözleşmesidir, production implementasyonunun tamamı değildir.

### 3.3 Export yayın protokolü

```text
USER chooses directory via Main → SelectionHandle
  → validate target/permissions/capacity
  → create export job & idempotency receipt
  → consistent DB snapshot
  → canonical serializers → staging owned directory
  → SHA256 all files + manifest verification
  → compare existing target and ownership manifest
  → if target contains unmanaged files: REFUSE or explicit choose-new-location
  → if prior managed export: show diff/confirm replacement
  → promote staged owned tree to final target
  → re-open manifest + verify file hashes
  → mark job succeeded + safe receipt + optional exportProfile
```

- `staging` hedef ile **aynı filesystem/volume** üzerinde ayrı kardeş klasör, örn. `.iterkeep-export-staging-<random>`; yayın rename mümkünse atomic, Windows directory replacement sınırlamaları nedeniyle platform adapter önceden eski hedefi koruyan journal/rollback kullanır. Atomic rename **her platformda ve her durumda garantili kabul edilmez**.
- Kullanıcı seçtiği root'un kendisi başka belgeler içeriyorsa sessiz `rm -rf` yapılmaz; yalnız **uygulamanın önceki manifestine sahip, hashi beklenen** dosyalar hedeflenir. Unmanaged dosya varsa açık hedef seçimi gerekir.
- **Git deposu özel durumu:** Hedef kökünde `.git/` mevcutsa tüm dizini rename/swap ederek yayımlamak yasaktır; bu Git metadata'sını yok edebilir. Bunun yerine manifestin sahip olduğu dosyalar dosya-bazında güvenli staged replacement + korumalı rollback journal ile güncellenir. `.git/` ve başka kullanıcı dosyaları asla değiştirilmez, silinmez veya manifest envanterine alınmaz. Export için alınan kilit Git commit/push ile çakışmayı engeller.
- Export sırasında iptal gelirse yeni hedef üretilmemiş olur; oluşturulmuş staging klasörü yalnız sahiplik marker'ı ve güvenli gerçek yol kontrolünden sonra temizlenir.
- Disk full/permission/AV lock hatasında hedefin önceki **doğrulanmış versiyonu** korunur veya recovery journal ile geri döndürülür. Kullanıcıya `EXPORT_INCOMPLETE` gibi açıklanabilir hata verilir.

---

## 4. Import format algılama ve güvenlik sınırı

### 4.1 Desteklenen kaynaklar

| Kaynak | V1 durumu | Çalışma biçimi |
|---|---|---|
| Native `iterkeep-portable/1` klasör | Tam destek | Manifest, checksum, explicit preview |
| Native ZIP | Tam destek (limitli) | Güvenli extraction sandbox ardından aynı parser |
| İlk proje fikrindeki `meta.yml`/`tasks.md`/`decisions.md`/`logs` | Legacy V1 importer | Belirsizlik varsa kullanıcı eşlemesi, kaynak ID bilinmiyorsa yeni UUID |
| Düz `.md` dosyaları | Not içe alma | Tek note; isteğe bağlı proje seçimi, id üretimi |
| Belirsiz üçüncü taraf görev exportları | V1 kapsam dışı | Açık unsupported uyarı; rastgele şema tahmini yok |
| SQLite `workspace.db` | Restore/backup akışı | `transfer.import` üzerinden **asla** açılmaz (`DOC-17`) |

Legacy importer, Markdown checkbox satırlarını task olarak tanır; eksik öncelik/tarih gibi alanlarda varsayılanları açıkça gösterir. Legacy karar yazısı yapılandırılamıyorsa veri kaybetmek yerine **Markdown Document** olarak içe almayı önerir. `meta.yml` içinde beklenmedik YAML object veya custom tag varsa safe parser reddeder. Eski verilerde ID yoksa yeni UUID v4 atanır ve migration raporunda gösterilir.

### 4.2 Kaynak dosya tehditleri

**Zorunlu reject:** absolute path, drive-letter/UNC path, `..` segmenti, URL-encoded traversal, Windows ADS (`:`), ZIP symlink/Unix special file, hardlink, device file, junction/reparse point kaçışı, zip bomb, duplicate entry, case-insensitive collision, null byte, aşırı path derinliği, aşırı dosya sayısı, tehlikeli manifest parse, escape eden attachment referansı.

**V1 başlangıç limitleri (konfigürasyon ve DOC-30/31 testleriyle değişebilir):**

| Ölçüt | Başlangıç üst sınırı | Aşılırsa |
|---|---:|---|
| Tek Markdown dosyası | 8 MiB | `IMPORT_FILE_TOO_LARGE` |
| Tek asset dosyası | 50 MiB | `IMPORT_ASSET_TOO_LARGE` |
| Toplam açılmış dosya | 1 GiB | `IMPORT_TOTAL_LIMIT` |
| Dosya adedi | 150.000 | `IMPORT_ENTRY_LIMIT` |
| Sıkıştırma genişleme oranı | 100:1 | `IMPORT_ARCHIVE_BOMB` |
| Path UTF-8 byte uzunluğu | 240 | `IMPORT_PATH_INVALID` |
| Yol derinliği | 12 segment | `IMPORT_PATH_INVALID` |
| YAML recursion depth | 16 | `IMPORT_METADATA_INVALID` |
| JSONL tek satır | 1 MiB | `IMPORT_METADATA_INVALID` |

Bunlar bilinçli ilk güvenlik bütçeleridir, kullanıcı dosyasını keserek kabul etmeyiz. Büyük workspace için ileride **streaming** parse ve kullanıcı kontrollü gelişmiş import modu ayrı ADR ile eklenebilir.

### 4.3 Secure file walk örnek yaklaşım

```ts
import path from 'node:path';

// Tek başına yetmez: open-time symlink/reparse ve TOCTOU da native FS adapter'da korunur.
export function validatePortableRelativePath(input: string): string {
  if (!input || input.includes('\\0') || input.includes('\\\\')) throw new Error('IMPORT_PATH_INVALID');
  if (input.startsWith('/') || /^[a-zA-Z]:/.test(input)) throw new Error('IMPORT_PATH_INVALID');
  const parts = input.split('/');
  if (parts.some(p => !p || p === '.' || p === '..' || p.includes(':'))) {
    throw new Error('IMPORT_PATH_INVALID');
  }
  const normalized = path.posix.normalize(input);
  if (normalized !== input || normalized.startsWith('../')) throw new Error('IMPORT_PATH_INVALID');
  return normalized;
}
```

**Uygulama şartı:** Yukarıdaki fonksiyon *gerekli ama yeterli değildir*. Main tarafı import staging kökü, `lstat` ve güvenli açma politikasıyla race condition'ları azaltır; platform-specific junction/reparse point kontrolü test edilir. Sadece `path.resolve(...).startsWith(root)` string kontrolü güvenlik yeterliliği değildir. Import paketi içindeki hiçbir executable/script çalıştırılmaz.

---

## 5. Import preview → commit işlem sözleşmesi

### 5.1 Preview çıktısı

`transfer.previewImport({selectionHandle}) → {jobId}` asenkron başlar. Tamamlanınca `transfer.getImportPreview({previewJobId,cursor?,limit?})` ile sayfalanmış sonuç alınır:

```ts
export type ImportAction = 'create' | 'update' | 'skip' | 'copy' | 'conflict' | 'reject';
export interface PreviewItem {
  readonly selectionId: string; // manifest path+record id'den türetilen, preview'a scoped opaque id
  readonly sourceId: string | null;
  readonly kind: 'project' | 'task' | 'document' | 'decision' | 'activity_log' | 'attachment' | 'tag' | 'link' | 'history';
  readonly displayName: string;
  readonly proposedAction: ImportAction;
  readonly currentRevision: number | null;
  readonly incomingRevision: number | null;
  readonly fieldDiffSummary: readonly string[];
  readonly warningCodes: readonly string[];
}
export interface ImportPreviewPage {
  readonly previewJobId: string;
  readonly sourceFingerprint: string;
  readonly targetFingerprint: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly summary: Readonly<Record<ImportAction, number>>;
  readonly items: readonly PreviewItem[];
  readonly nextCursor: string | null;
}
```

- Preview: dosya formatını doğrular; ID/relation graph doğrular; seçili target DB'de çakışma tarar; kaynak URI/script çalıştırmaz; **kullanıcı domain tablolarına INSERT/UPDATE yapmaz**.
- Preview materyali `userData/cache/import-previews/<jobId>.json` benzeri uygulama sahipliğinde, OS kullanıcı izniyle korunan süreli temp artifact'tır; gizli erişim tokenı *asla* renderer'a dosya yolu olarak verilmez. Bu operasyonel dosya ikinci kanonik workspace değildir.
- Preview dosyaları hassas kullanıcı içeriği/diff barındırabilir: OS dosya izinleri dar olmalı, 30 dakika sonra güvenli uygulama-sahipliği kontrolüyle silinmeli; crash sonrası TTL cleanup yapılmalı. Paket manifest hash'i, preview cache artefaktının integrity hash'iyle karıştırılmaz.
- Preview TTL başlangıç 30 dakika; restart sonrası geçersiz sayılır ve yeniden preview gerekir. Job receipt kalabilir fakat kaynak izinleri aynı kabul edilmez.
- `getImportPreview` mesajı en fazla 100 kayıt getirir; `selectionIds` yalnız o preview'a ait opak değerler olabilir.
- Kapsam seçimi bağımlılık grafını etkiler: project seçilmeden alt kaydı commit etmek reddedilir veya var olan hedef projeye açık eşleme istenir. `related_task_id`, `supersedes_decision_id`, record link uçları vb. harici referanslar görünür şekilde çözülmelidir.

### 5.2 Conflict policy

| Politika | Mevcut ID yoksa | Aynı ID + aynı içerik | Aynı ID + farklı içerik |
|---|---|---|---|
| `skip` | Yeni kayıt oluştur | Atla | Atla, neden raporla |
| `copy` | Yeni kayıt oluştur | İstendiğinde kopya | Yeni ID ile yeni kayıt/kopya; FK remap |
| `merge` | Yeni kayıt oluştur | Atla | Alan/Revision farklarını denetle; otomatik sessiz overwrite yok |

`merge`, iki versiyonun kaynağını ve hedefteki revision'ı denetler. Hedef değişmişse `IMPORT_TARGET_CHANGED` üretir. Kullanıcıya çatışmalı alanlar gösterilir; güvenle merge edilemeyen kayıt `conflict` kalır. Merge başarısızsa bütün transaction rollback veya açıkça **yeniden planlama** gerekir. V1'de aynı komutta otomatik 'partial success and continue' kullanılmaz.

`copy` politikası için id mapping: map key `(kind, source_uuid)`; yeni UUIDler **preview sırasında** rastgele üretilmez (preview tekrarlandığında fark olmamalı), commit planında transaction başlamadan üretilip onaylı plan receipt'ine bağlanır. Yeniden deneme idempotency receipt ile aynı eşlemeyi kullanır. Cross-reference hedefi `map.get()` ile uyarlanır. User data içindeki tesadüfi UUID metinlerine find-and-replace yapılmaz.

### 5.3 Import atomiklik ve sıralama

**Kanonik transaction sırası:** project + Inbox mapping → tag → task/document/decision → append-only histories → activity logs → record links → attachment metadata → domain events/idempotency receipt. Mevcut trigger'lar `record_registry` ve `search_index` izdüşümünü oluşturur; import doğrudan FTS tablolarına INSERT yapmaz.

1. Main Preview ticket'ını ve SelectionHandle kaynak fingerprint'ini tekrar doğrular. Kullanıcı seçimi/izinleri geçer.
2. Application Core tüm komutları *toplu doğrulama* ile kontrol eder; SQL literal import edilmez.
3. DB worker tek `BEGIN IMMEDIATE` altında izin verilen kaynak row'ları ve ilişkileri işler; gerçekte en fazla 1 GiB kaynak varsa transaction bellek/latency ölçülür, batch gerekiyor ise atomic staging DB yaklaşımı ADR ile açıkça tanımlanmadan otomatik bölünmez.
4. Trigger'ın koruduğu Inbox, FK, decision supersession ve append-only semantiği değiştirilmez. Doğrudan imported immutable historical row ekleniyorsa audit `actor=import` ve orijinal creator metadata'sı ayrı trace edilir; imported history'nın `actor_ref` metnini sahte izin belgesi gibi kullanma.
5. Asset dosyaları DB transaction'ında yönetilemediği için önce hash doğrulamalı güvenli **asset staging** yapılır. DB commit başarısızsa staging temizlenir; DB commit başarılı ama asset publish başarısızsa kompanzasyon / recovery journal ile kullanıcıya açık eksik varlık durumu gösterilir. Çifte atomiklik varmış gibi davranılmaz.
6. Transaction commit'inden sonra domain event yayımlanır; UI durumu yeniler; receipt sonucu `created/updated/copied/skipped/conflicted/rejected` sayımlarıyla kesinleşir.

**Önemli nüans:** `project.kind='inbox'` ayrı yeni Inbox üretmez. Kullanıcı mevcut Inbox'taki görevlerini import edebilir; taşınan görevlerin project ID'si hedef `workspaces.inbox_project_id` olur. İlişki referansları da bu eşlemeye göre düzeltilir.

### 5.4 Import crash/retry ve doğruluk

- Preview bitti ama commit başlamadı: DB değişmedi; preview expiring artifact temizlenebilir.
- Import commit öncesi crash: DB değişmedi, asset staging temizlenir.
- Commit sonrasında IPC yanıtı kayıp: aynı `idempotencyKey + payloadHash` ile **receipt sorgulanır**, ikinci kayıt yaratılmaz.
- Commit sonrası attachment publish problemi: `IMPORT_ASSET_RECOVERY_REQUIRED`, kullanıcıya veri kaydı var ama dosya eksik bilgisi; otomatik başarı yok.
- İthal edilen kayıtlar aynı `correlation_id` üzerinden audit ve job ile ilişkilendirilebilir; trace data logları ham hassas içeriği kopyalamaz.

---

## 6. Git export profili ve komut güvenliği

### 6.1 `ExportProfile` kalıcılığı

`DOC-09` baseline migration'ında tanımlanan `export_profiles` V1 tablosu export hedefini ve opsiyonel Git ayarını saklar. Başlangıç alanları:

```ts
export interface ExportProfile {
  readonly id: string; // UUID v4
  readonly workspaceId: string;
  readonly targetPath: string; // Main-only; never sent as arbitrary renderer authority
  readonly gitEnabled: boolean;
  readonly lastExportManifestSha256: string | null;
  readonly lastExportAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly revision: number;
}
```

- `transfer.exportMarkdown` başarılı olunca Main kontrollü `export_profiles` kaydını yaratabilir/güncelleyebilir. Başarılı job `jobs.get` sonuç özetinde `exportProfileId` ve manifest özetini verir; `git.listProfiles()` ile sonraki oturumlarda listeye erişilir. Profil kaydı oluşması, Git'i etkinleştirme veya `git init` izni değildir.
- Export path farklı bilgisayara taşınmış olabilir: profil listede **missing target** görünür; kullanıcı yeniden klasör seçene kadar hiçbir otomatik Git işlemi yoktur.
- Aynı hedef başka kullanıcı dosyaları içeriyorsa hedef sahipliği/git klasörü kontrollü doğrulanır. Kaydedilmiş path otomatik izin anlamına gelmez; `git_commit/git_push` ayrıca kullanıcı eylemi ve yetki gerektirir.
- İşletim sistemi path'i ve remote URL'si dışa aktarılan `iterkeep-export.yml` içine girmez. İleride profil schema ihtiyaçları migration ile yapılır.

### 6.2 Git tespiti ve repo koşulları

Git yoksa `GIT_UNAVAILABLE` capability; core etkilenmez. Git CLI seçilen export hedefinde `git rev-parse --show-toplevel` ile repo kökünü tespit eder. Git repo kökü export hedefinin **ebeveyni** ise yalnız owned export alt dizini stage edilir. Repo kökü workspace DB klasörü ya da kullanıcının kod reposu olduğunda daha katı policy uygulanır; `workspace.db`, `*.sqlite-wal`, `*.sqlite-shm`, temp model / audio dosyaları hard reject listesine girer.

`git init`, remote ekleme, credential saklama V1 public IPC'de yoktur: kullanıcı Git'i kendi terminalinde/ayarlarında kurabilir; uygulama yönlendirme sunar. Bu işlemlere sessizce yeni UI API icat edilmez. Git credentials, Git Credential Manager/OS entegrasyonuna bırakılır; token'a uygulama erişmez ve stdout/loglara yazmaz.

### 6.3 Komut allowlist ve örnek adaptör

```ts
// packages/git-adapter/src/git-client.ts — örnek; gerçek policy kontrolü şart.
import { spawn } from 'node:child_process';

export async function runGit(
  cwd: string,
  args: readonly string[],
  signal: AbortSignal,
): Promise<{ code: number; stdout: string; stderr: string }> {
  const allowed = new Set(['rev-parse','status','diff','ls-files','add','commit','push','log']);
  if (!allowed.has(args[0] ?? '')) throw new Error('GIT_COMMAND_DENIED');
  return await new Promise((resolve, reject) => {
    const child = spawn('git', [...args], {
      cwd, shell: false, windowsHide: true, signal,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      stdio: ['ignore','pipe','pipe'],
    });
    let stdout = '', stderr = '';
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', d => { stdout += d; if (stdout.length > 65536) child.kill(); });
    child.stderr.on('data', d => { stderr += d; if (stderr.length > 65536) child.kill(); });
    child.on('error', reject);
    child.on('close', code => resolve({ code: code ?? -1, stdout, stderr }));
  });
}
```

**Güvenlik uyarısı:** Bu örnekteki `allowed` yalnız isim kontrolüdür; kötü niyetli argümanlar hâlâ seçenek enjekte edebilir. Üretim kodunda uygulama tarafından oluşturulan **kapalı argüman şablonları** zorunludur; kullanıcı `args` gönderemez. `git -c`, `--exec-path`, global hooks, git config dosyası, env `GIT_CONFIG_*`, pager, protocol helper ve Git attributes/filter etkileri ayrıca threat-model kapsamında kısıtlanmalıdır. `GIT_CONFIG_NOSYSTEM`, `GIT_CONFIG_GLOBAL` gibi global ayarları değiştirmenin credential akışına etkisi test edilmeden prod'a alınmaz.

`git commit` hook'ları (`pre-commit`, `commit-msg` vb.) program çalıştırabilir. Sadece **kullanıcının açıkça seçtiği yerel repo ve commit işlemi** için yürütmeye izin verilir; mümkünse uygulama `core.hooksPath` için güvenli null hooks dir kullanarak kendi commit'inde hook yürütmeyi kapatır. Bunun riskleri/UX'i belgelenir. Shell yok, `exec` ile kullanıcı metni yok.

### 6.4 Başka staged değişiklikleri dahil etmeme

`git add -A` tüm repository için **yasak**. Ancak `git add -- <export-relative-path>` tek başına kullanıcının aynı path'teki başka staged değişikliklerini commit'ten çıkarmaz.

**V1 güvenli çözüm:** Uygulama-owned export dosyaları için **ayrı geçici Git index'i** (ör. `GIT_INDEX_FILE` ile) oluşturulur. HEAD'den boş olmayan yeni index initialize edilir (üretimde native Git index/index-tree semantiği test edilir), sonra yalnız manifestte listelenen export dosyaları ve uygulama tarafından silinmiş eski export dosyaları stage edilir. Böylece gerçek repo index'i ve üçüncü taraf staged değişiklikler korunur. `git write-tree` + `git commit-tree` + koşullu ref update gibi low-level Git akışı gerekir; **`git commit`'i yalnız ayrı index'le çalıştırmak repo HEAD üzerinde yan etkiler doğurabileceği için** gerçek uygulamada planın HEAD yarışları ve reflog davranışları test edilmelidir.

V1 için daha kolay ve güvenli alternatif: **ayrı, yalnız export'a ayrılmış Git deposu** oluşturmayı tavsiye etmek; başka dosyaların bulunduğu dirty repo'larda commit'i kapatmak. Bu belge için **normatif ilk sürüm** bu daha sınırlı politikadır:

1. Git commit yalnız uygulamanın export root'una **özgülenmiş repo** üzerinde desteklenir; başka unrelated staged/untracked/tracked değişiklikler varsa `GIT_REPO_NOT_DEDICATED` hatası ve yönerge.
2. `git add -- <literal-paths>` yalnız manifestteki owned dosyaları seçer; `git add -A` kullanılmaz; pathspec escaping uygulanır.
3. Commit öncesi `git diff --cached --name-only` ile staged set'in yalnız owned dosyalardan oluştuğu **tekrar doğrulanır**. Kullanıcının başka staged dosyası varsa commit reddedilir; index temizlenmez/restore edilmez.
4. Önceki owned export'tan silinmiş dosyalar da explicit inventory diff üzerinden stage edilir. Bütün repo üzerinde `-A` yoktur.
5. Stage ile commit arasında HEAD/index değişirse race detect edip işlemi iptal eder. Credential/network hiç bu aşamada devreye girmez.

Böylece ilk sürümde desteklenmeyen karışık repo senaryosu açıkça reddedilir; ileride ayrı index implementation, ADR ve testlerle eklenebilir. Kullanıcı repo dosyaları sessizce temizlenmez.

### 6.5 `git.commitExport()` akışı

```text
Git not installed? → GIT_UNAVAILABLE
Export target/profile valid? → required
Dedicated repo? → required
Status clean? → "Nothing to commit"
Changed files outside owned list? → reject
User presses Commit → show owned diff stat
Job accepted → revalidate target + HEAD + index
Explicit owned staging → index audit
Commit only owned files → verify HEAD/diff
Persist safe job receipt → show commit hash
```

`message` maksimum 200 UTF-8 karakter; komut argümanı olarak **tek string**, shell interpolation yok. `user.name`/`user.email` yoksa kullanıcıya standart Git ayarına yönlendirme; sahte kimlik otomatik atanmaz. Source secret scan bulursa açık uyarı ve tekrar onay politikası `DOC-30` ile belirlenir, gizli veriler loglanmaz.

### 6.6 `git.pushExport()` akışı

- `approvalId`, Main/Policy'nin belirli `exportProfileId`, remote URL (şifre/token redact), hedef branch, local HEAD hash ve commit aralığı için verdiği **tek amaçlı** onaya bağlanır.
- Hedef remote ve branch isimleri Git'den doğrulanır; upstream yoksa V1 user guidance verir ve varsayarak `--set-upstream` push yapmaz.
- Başka local branch, force push, tag push, mirror push, all, delete refs V1'de **yasaktır**. Yalnız `git push <configured-remote> <local-branch>:<remote-branch>` gibi açık argüman listesi, `--force` olmadan.
- Ağ sonucu belirsizse otomatik tekrar yapılmaz; remote ref sorgulanır, başarısız/şüpheli sonuç kullanıcıya gösterilir. Onayın başlatıldığı HEAD ile push anındaki HEAD farklıysa onay geçersiz sayılır.
- Push için SSH/HTTPS credential yönetimi uygulamadan bağımsızdır. Host key check atlatılmaz, token loglanmaz.
- Mevcut kullanıcı Git hook/config/credential yardımcıları yürütülme riski taşıyabilir; adapter güvenli ortam ve allowlist testlerini `DOC-30` ile tamamlar.

---

## 7. UI akışları ve görünür durumlar

### FLOW-XFER-01 — İlk export

1. Proje görünümünden **Export as Markdown** seçilir; tek proje ya da bütün workspace seçilir.
2. Kullanıcı `includeAssets` ve `includeHistory=true` seçeneklerini görür. Format ve güvenlik notu açıklanır.
3. Main'in seçtirdiği dizin `SelectionHandle` ile taşınır. Kök DB/path UI'ya serbest erişim vermez.
4. İş başlar; UI `queued → running → verifying → published` aşamalarını Job UI'ında gösterir (`verifying` domain `JobStatus` değildir, görünüm fazıdır).
5. Dosya listesi ve değişiklik özeti gösterilir; hedefte mevcut dosya varsa açık overwrite/choose another konfigürasyonu uygulanır.
6. Başarılı result receipt: hedefin görünen ismi, sayı/uyarılar, manifest hash'i ve `exportProfileId`.

### FLOW-XFER-02 — Native import preview

1. Kullanıcı ZIP/klasör seçer. Parser formatı ve taramayı çalıştırır.
2. Preview özetinde `created/updated/copied/skipped/conflicts/rejected` sayıları, örnek diff ve kaynak formatı görünür.
3. Kullanıcı politika seçer; çatışma varsa kayda özel çözüm/atla seçebilir.
4. Kullanıcı **Import** onayına basar; UI optimistic success ilan etmez.
5. Commit'te fingerprint değişirse `IMPORT_PREVIEW_STALE`; tekrar preview gerekir.
6. Sonuç: kalıcı kayıtlar, seçili proje görünümü ve ayrıntılı rapor.

### FLOW-XFER-03 — Legacy `tasks.md`

1. `meta.yml` kimlik ve proje adını safe YAML ile okur; Markdown checklist satırlarını parse eder.
2. Sistem belirsiz status/due date bölümlerini işaretler. Görev başlıkları kullanıcıya editlenebilir preview sunulur.
3. Import bir `correlationId` ile yaratılır; eski dosyalar silinmez.
4. Sonra opsiyonel native V1 export önerilebilir; original dosyaya otomatik yazma yok.

### FLOW-XFER-04 — Git durum ve commit

1. Kullanıcı export profili seçer, Git kullanılabilirliği tespit edilir.
2. Git status diff özeti; repo kökü, branch, değişen owned export dosyaları gösterilir.
3. Mixed repository veya staged üçüncü taraf dosya varsa commit butonu kapalı ve açıklamalı.
4. Kullanıcı mesaj girer, commit işini başlatır; başarılıysa commit hash'i görünür.
5. Ağ kullanılmadan local commit biter; push ayrı ekrandadır.

### FLOW-XFER-05 — Onaylı push

1. UI remote URL host'u (credentials redacted), branch ve gönderilecek commit sayısını gösterir.
2. Kullanıcı açık onayı verir; `approvalId` sadece bu HEAD ve remote için geçerlidir.
3. Push job ilerleyişi/hata/sonuç görünür. Sonuç belirsizse `unknown` UI uyarısı ve **Verify remote** eylemi sunulur; otomatik yeniden push yok.

### FLOW-XFER-06 — Kullanıcı import sırasında uygulamayı kapatır

1. DB transaction'ın sınırı ve asset staging recovery receipt saklanır.
2. Yeniden açılış, job'u kör tekrar etmez; DB gerçeği, staging ve idempotency receipt uzlaştırılır.
3. Gerekiyorsa kullanıcı Import History ekranında incomplete/partial asset recovery görür.
4. Kaynak dosya izinleri ve preview invalid ise yeniden seçim istenir.

---

## 8. Hata sözlüğü ve retry politikası

| Kod | Kullanıcı davranışı | Otomatik tekrar? |
|---|---|---|
| `PORTABLE_UNSUPPORTED_VERSION` | Desteklenmeyen sürümü bildir | Hayır |
| `PORTABLE_MANIFEST_INVALID` | Hangi dosya / alan hatalı göster | Hayır |
| `PORTABLE_HASH_MISMATCH` | Kaynak değişmiş, yeniden seç | Hayır |
| `PORTABLE_METADATA_CONFLICT` | Tag/front matter/historical çelişki | Hayır |
| `IMPORT_ARCHIVE_BOMB` | Güvenli ret ve limit uyarısı | Hayır |
| `IMPORT_ENTRY_LIMIT` | Büyük paket limit uyarısı | Hayır |
| `IMPORT_PATH_INVALID` | Zararlı yol, red | Hayır |
| `IMPORT_PREVIEW_STALE` | Önizlemeyi yenile | Hayır |
| `IMPORT_TARGET_CHANGED` | Revision diff, yeniden çöz | Hayır |
| `IMPORT_ASSET_RECOVERY_REQUIRED` | Kurtarma/repair ekranı | Hayır |
| `EXPORT_TARGET_UNSAFE` | Başka hedef seç | Hayır |
| `EXPORT_TARGET_CHANGED` | Hedef dosyası değişmiş, diff/onay | Hayır |
| `EXPORT_INCOMPLETE` | Önceki export korunmuş, incele | Hayır |
| `GIT_UNAVAILABLE` | Git kur veya kapalı kullan | Güvenli manuel kontrol |
| `GIT_REPO_NOT_DEDICATED` | Ayrı export-only repo öner | Hayır |
| `GIT_INDEX_CONFLICT` | Başka staged dosya var | Hayır |
| `GIT_PUSH_REQUIRES_APPROVAL` | Onay penceresi | Hayır |
| `GIT_REMOTE_OUTCOME_UNKNOWN` | Remote doğrula, tekrar onay iste | Hayır |

Kodlar `DOC-11` genel Error Envelope içinde `details` beyaz-listesiyle gelir. Dinamik filesystem path, raw Git stderr, credential veya import içeriği frontend diagnostic loglarına düz metin olarak gönderilmez. `DOC-32` kullanıcı dostu hata metinleri için kanonik kaynaktır. Dosya bazında neyin bozuk olduğunu kullanıcıya göstermeye yetecek kısıtlı, sanitize edilmiş `safeRelativePath` alanı kullanılabilir.

---

## 9. Paket ve dosya sahipliği (`DOC-07` ile uyum)

```text
packages/import-export/src/
├── index.ts                       # public adapter factory/types
├── manifest.ts                    # portable format version + canonical schema
├── validate.ts                    # safe paths, YAML/JSONL strict validation
├── plan.ts                        # preview diff, ID mapping, dependency order
├── render.ts                      # deterministic serializers
└── markdown.ts                    # frontmatter + safe body parser

packages/git-adapter/src/
├── index.ts
├── git-client.ts                  # process wrapper, no shell
├── git-policy.ts                  # allowed command templates, remote/ownership
└── git-status.ts                  # porcelain parser, safe summaries

packages/application/src/        # existing use-case grouping; add files under its established conventions
  # TransferService / GitExportService orchestrate validated ports,
  # avoiding direct SQL/filesystem process access.

apps/desktop/src/main/           # selection handle + file dialogs, job-runner registration
packages/job-system/src/        # existing 'import','export','git_commit','git_push' runners
packages/storage-sqlite/src/    # export_profiles repository, consistent snapshot source
```

- Yeni paket ya da module sınırı olmadan mevcut monorepo yapısını kullan.
- Kaynak dosyası yerleştirmede `DOC-07` ana otoritedir; burada sadece yeni sınıfların hangi sahiplik katmanında olacağı açıklanır.
- Asenkron işlem API'sinde `transfer.previewImport` veya `git.commitExport` yanıtı `{jobId}` olarak kalır; iş tamamlanmış gibi cevap verilmez.
- `transfer.getImportPreview` ve `git.listProfiles` yeni statik IPC route'larıdır. Güncellenmiş `DOC-11` ile birlikte kodlanır, generic `invoke(string,payload)` açılmaz.

### 9.1 Input/schema örneği (Zod)

```ts
import { z } from 'zod';

export const PortableManifestEntrySchema = z.strictObject({
  path: z.string().min(1).max(240),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  bytes: z.number().int().nonnegative().max(1_073_741_824),
});
export const PortableManifestSchema = z.strictObject({
  format: z.literal('iterkeep-portable'),
  format_version: z.literal(1),
  workspace_id: z.uuidv4(),
  workspace_name: z.string().min(1).max(120),
  schema_compatibility_version: z.number().int().positive(),
  included_scopes: z.array(z.enum([
    'projects','tasks','documents','decisions',
    'activity_logs','tags','links','history',
  ])).min(1),
  assets_included: z.boolean(),
  partial: z.boolean(),
  files: z.array(PortableManifestEntrySchema).max(150000),
});
```

V1 parser, üretilmiş `README` ve `tasks-index` dosyalarının hash'ini doğrulasa da onları import entity'si saymaz. Manifest entries sırasının canonical ve path'lerin duplicate-free olduğu ayrıca parse sonrası denetlenir. Zod tek başına file traversal, link resolution ve archive sandbox güvenliği sağlamaz.

---

## 10. Kalite, performans ve güvenlik testleri

Test tipleri `U` unit, `DB` real SQLite integration, `FS` real filesystem, `E2E` Electron UI, `SEC` adversarial. Aşağıdaki testler **henüz uygulanmış/başarılı değildir**; kodlama sırasında evidence üretilecektir.

| ID | Katman | Test | Beklenen |
|---|---|---|---|
| XFER-T-001 | U | Aynı snapshot iki kez export | Byte-level determinism |
| XFER-T-002 | U | Proje rename ama aynı ID | ID ve ilişkiler korunur |
| XFER-T-003 | U | UTF-8 Türkçe/emoji metadata | Kayıpsız import |
| XFER-T-004 | U | UTC millisecond normalization | Exact format / deterministic sort |
| XFER-T-005 | U | LF / trailing newline | Canonical serializer |
| XFER-T-006 | U | YAML duplicate key | Reject |
| XFER-T-007 | U | YAML custom tags / aliases | Reject |
| XFER-T-008 | U | Missing manifest | Reject |
| XFER-T-009 | U | Duplicate manifest path | Reject |
| XFER-T-010 | U | Noncanonical uppercase SHA | Reject |
| XFER-T-011 | U | Decision section delimiter collision | Escaped and lossless text |
| XFER-T-012 | U | Decision missing delimiter | Reject |
| XFER-T-013 | U | Tags sidecar/front matter mismatch | Metadata conflict |
| XFER-T-014 | U | Bad JSONL line | Reject / source line |
| XFER-T-015 | U | Unsupported portable version | Explicit error |
| XFER-T-016 | FS | `../` and absolute path | Reject before extraction |
| XFER-T-017 | FS | Windows device name/trailing-dot | Reject |
| XFER-T-018 | SEC | Symlink/junction escape | No outside reads/writes |
| XFER-T-019 | SEC | ZIP bomb / duplicate entry | Bounded reject |
| XFER-T-020 | FS | Hash mismatch after preview | Commit blocked |
| XFER-T-021 | DB | Projects/tasks/notes/decisions/logs round-trip | Semantically equal |
| XFER-T-022 | DB | Task history revision round-trip | History preserved |
| XFER-T-023 | DB | Decision revisions round-trip | Append-only preserved |
| XFER-T-024 | DB | Record links both ends imported | FK intact |
| XFER-T-025 | DB | Out-of-scope record link | Preview warning, no dangling FK |
| XFER-T-026 | DB | Inbox from other workspace | Single Inbox, tasks remapped |
| XFER-T-027 | DB | `copy` policy + link graph | New IDs correctly remapped |
| XFER-T-028 | DB | `skip` existing conflicting ID | Target unchanged |
| XFER-T-029 | DB | `merge` conflicting revision | Explicit conflict |
| XFER-T-030 | DB | Same record same content | Idempotent skip |
| XFER-T-031 | DB | Failed import batch | Full transaction rollback |
| XFER-T-032 | DB | Commit reply lost and retried | Receipt, no duplicates |
| XFER-T-033 | DB | Import FTS triggers | Search immediately reflects records |
| XFER-T-034 | FS | Asset missing while include=true | Export/import failure clearly reported |
| XFER-T-035 | FS | Asset content modified mid-export | Hash/revalidate blocks publish |
| XFER-T-036 | FS | Target managed export updated externally | No silent overwrite |
| XFER-T-037 | FS | Target contains user-owned files | Unsafe target blocked |
| XFER-T-038 | FS | Disk full during stage | Previous export survives |
| XFER-T-039 | FS | Crash between stage and publish | Recovery journal reconciles |
| XFER-T-040 | E2E | Preview → select → commit | Correct report and records |
| XFER-T-041 | E2E | Cancel at import preview | DB unchanged |
| XFER-T-042 | E2E | Cancel export job | No success; temp cleaned safely |
| XFER-T-043 | E2E | Git absent | Core app operational |
| XFER-T-044 | E2E | Export-only repo Git status | Correct safe file list |
| XFER-T-045 | SEC | Repo has other staged file | No commit with that file |
| XFER-T-046 | SEC | Git arg injection attempt | Args rejected, shell=false |
| XFER-T-047 | SEC | Malicious export filename Git options | Literal pathspec handling |
| XFER-T-048 | E2E | Commit with owned changes only | HEAD includes only owned changes |
| XFER-T-049 | E2E | Local Git commit without push | No network activity |
| XFER-T-050 | E2E | Push declined | No subprocess/network push |
| XFER-T-051 | E2E | Push approval stale HEAD | Blocked |
| XFER-T-052 | E2E | Push timeout but remote updated | No automatic second push |
| XFER-T-053 | E2E | Git profile target moved | Re-selection required |
| XFER-T-054 | FS | Casefold file collision | Reject on Windows |
| XFER-T-055 | U | Manifest stable sorting | Exact deterministic order |
| XFER-T-056 | U | Large markdown threshold | Typed rejection, no truncation |
| XFER-T-057 | E2E | AI/Ollama disabled | Transfer flows unchanged |
| XFER-T-058 | DB | Transfer after SQLite migration | Format v1 semantic equality |
| XFER-T-059 | E2E | Jobs progress/event loss | jobs.get reconstructs state |
| XFER-T-060 | E2E | Agent requests export/push | Same confirmation policy as UI |

### 10.1 Ölçülebilir benchmark ve hedefler

`DOC-31` sayısal performans için tek normatif kaynaktır; bu belgede **ölçüm tasarımı** tanımlanır:

- Fixtures: `100`, `1_000`, `10_000` ve `100_000` activity log; `1_000` proje, gerçekçi not/karar/görev dağılımı.
- Ölçümler: export snapshot sorgu süresi, serialize throughput MiB/s, dosya açma sayısı, staging→publish gecikmesi, Git status/commit süresi, import preview/commit P50/P95.
- Resource: UI main-thread uzun blok >50 ms uyarısı, renderer memory plateau ve DB worker transaction lock süresi.
- Windows NTFS, antivirus açık referans cihazında ve macOS/Linux için uygun ek cihazlarda ölç. Electron packaged sürüm ile dev mode'u ayrı raporla.
- Git ile 100 bin küçük Markdown dosyasının yavaş olabileceğini **ölçmeden** 'anlık' vaat etme. V1 data boyut limitleri aşılırsa kullanıcıyı bilgilendir; ileride günlük gruplama/segmentli aktarım için benchmark temelli ADR açılabilir.

### 10.2 Kabul matrisi

| Gereksinim | Doğrulama |
|---|---|
| REQ-063 | XFER-T-021,040,057 |
| REQ-064 | XFER-T-001,004,005,055 |
| REQ-065 | XFER-T-008,020,040,041 |
| REQ-066 | XFER-T-031,032,039 |
| REQ-067 | XFER-T-027–030 |
| REQ-068 | XFER-T-036–039 |
| REQ-069 | XFER-T-043,057 |
| REQ-070 | XFER-T-044–049 |
| REQ-071 | XFER-T-050–052,060 |
| REQ-072 | XFER-T-040,059 |
| AC-007 | XFER-T-021–027,058 |
| AC-008 | XFER-T-016–020,031,036 |

---

## 11. Geliştirme iş sırası ve DoD

1. `@iterkeep/contracts`: portable manifest, record front matter, transfer preview DTO ve IPC schemas; Zod fixtures (`XFER-T-001–015`).
2. `@iterkeep/import-export`: deterministic serializer/parser, safe walk, metadata sidecar ve fixture round-trip.
3. `@iterkeep/storage-sqlite`: `export_profiles` migration ve repository, consistent snapshot, selected-ID transactional import portu.
4. `@iterkeep/application`: export/import plan, ID mapping, conflict preview ve canonical command flow.
5. `@iterkeep/job-system`: mevcut import/export job runner + progress, cancellation, recovery ticket.
6. `@iterkeep/desktop`: file dialog scoped handle, paginated preview route, conflict UI, progress screen.
7. `@iterkeep/git-adapter`: safe CLI templates, status parser, dedicated export-only repo policy.
8. `@iterkeep/desktop`: Git profile screen, owned diff, commit and explicit push approval.
9. CI: DB+FS fixtures, malicious archives, Windows named pipes/path test, E2E; `DOC-31` benchmark.
10. `DOC-04` kalite kapıları geçmeden *implemented/verified/release ready* statüsü verme.

**Definition of Done:**

- [ ] Native portable format v1 belgelenmiş örnek fixture'a byte-level deterministik export sağlar.
- [ ] 2+ proje, ilişkiler, decision/history, log, tag, asset içeren round-trip ID ve anlam eşitliğini korur.
- [ ] Bozuk/zararlı import, hedef SQLite'a **sıfır** değişiklik yapar.
- [ ] Preview ile commit arasında kaynağın/hedefin değişmesi açık hata üretir.
- [ ] Aynı idempotency key tekrarında kayıt çoğalmaz; kayıp yanıt uzlaştırılır.
- [ ] Export var olan kullanıcı dosyalarını onaysız ezmez; yarım publish başarı değildir.
- [ ] `git.commitExport` yalnız ayrı export-only repo'da ve owned dosyalarla çalışır.
- [ ] `git.pushExport` için açık, bağlama özgü onay gerekir ve bilinmeyen sonuçta otomatik retry yoktur.
- [ ] Git/Ollama/Whisper/TTS olmadan temel uygulama ve transfer akışları çalışır.
- [ ] Bütün `XFER-T-*` testleri ve ilgili kalite kapısı kanıtları CI'da kaydedilir.

## 12. Kaynak dokümanlar ve sonraki dosyalar

- Önceki: `docs/00-README.md`, `02-SCOPE-REQUIREMENTS.md`, `07-REPO-STRUCTURE.md`, `08-DOMAIN-MODEL.md`, `09-DATABASE-SCHEMA.md`, `10-DB-OPERATIONS.md`, `11-IPC-CONTRACTS.md`, `12-STATE-JOBS-EVENTS.md`, `13-PROJECTS-TASKS.md`, `14-NOTES-DECISIONS-LOGS.md`, `15-SEARCH.md`.
- Sonraki: `DOC-17` tutarlı SQLite backup/restore, `DOC-19` export/git capability, `DOC-27` agent approvals, `DOC-30` güvenlik, `DOC-31` benchmark, `DOC-33` test, `DOC-34` paketleme, `DOC-35` uygulama sırası.
- Resmî referans: [Git add pathspec / NUL semantics](https://git-scm.com/docs/git-add), [SQLite Online Backup API](https://www.sqlite.org/backup.html). Git komutları kullanıcı durumuna etkisi göz önüne alınarak güvenlik testlerine tabi tutulmalıdır.

> **Belge durumu:** `draft`. Format, akış ve test sözleşmeleri ayrıntılıdır; uygulamanın çalıştığına ilişkin iddia içermez. Artık DOC-17 hazırlanabilir.
