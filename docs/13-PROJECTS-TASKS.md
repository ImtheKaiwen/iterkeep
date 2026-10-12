---
document_id: DOC-13
title: "Iterkeep — Projeler, Inbox, Görevler, Liste ve Kanban: Uygulama Sözleşmesi"
version: "0.1.0"
status: "draft"
last_updated: "2026-10-10"
language: "tr-TR"
owner: "Core Features — Projects & Tasks"
depends_on:
  - "DOC-00"
  - "DOC-01"
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
next_document: "DOC-14"
---

# Iterkeep — Projects, Inbox, Tasks, List & Kanban

> **Normatif amaç:** Kullanıcının proje oluşturma, proje geçmişine dönme, hızlı görev yakalama, görevleri düzenleme, liste ve Kanban üzerinden yönetme, sıralama, taşıma, arşivleme, silme ve kurtarma deneyimlerinin **gözlemlenebilir davranışını** kesinleştirmek. Geliştirme ajanı bu belgeden application service, repository query, UI state ve otomatik kabul testlerini üretebilmelidir.
>
> **Tek yetki sınırı:** Kalıcı enum, entity kimliği, UTC, `revision` ve domain transition kuralları **DOC-08**; fiziksel tablolar/index/trigger'lar **DOC-09**; commit, idempotency, güvenli SQLite bağlantısı **DOC-10**; public IPC route isimleri ve wire şemaları **DOC-11**; event teslimi, query cache ve job koordinasyonu **DOC-12**; UI component/pixel layout **DOC-20–23**; error taxonomy **DOC-32**; test ve performans eşikleri **DOC-31/33** tarafından tanımlanır. Bu dosya **proje/görev use-case davranışı, sıralama algoritması, UI etkileşim akışları ve özellik kabul testleri** için yetkilidir. Yeni IPC kanalı veya SQLite tablosu icat edilmez.
>
> **Kanıt düzeyi:** Doküman teknik tasarım ve uygulama örnekleri içerir; üretim React/Electron kodu değildir. DDL, worker, Windows paketleme veya uçtan uca testler bu dokümanın hazırlanmasıyla çalıştırılmış sayılmaz. V1 `draft` statüsü korunur.

---

## 1. V1 sonuçları ve kapsam sınırı

Iterkeep'in temel işi, kullanıcının 'Şu projede neredeydim, sıradaki doğru iş ne?' sorusunu **AI gerekmeden** yanıtlamaktır. Özelliğin başarı ölçüsü yalnızca CRUD değil, kesinti sonrasında güvenilir biçimde aynı kayda geri dönebilmektir.

| Kullanıcı hedefi | Gerekli V1 davranışı | Kanıt |
|---|---|---|
| Projeyi hızlı başlatmak | Ad gir → kaydet → yeni proje görünür | REQ-013, AC-001 |
| Projeye aylar sonra dönmek | Son aktivite, açık görevler, son karar/log ve doğrudan bağlantılar | REQ-016, AC-003 |
| Aklına geleni kaçırmamak | Proje seçmeden tek giriş → Inbox; tekrar gönderim tek kayıt | REQ-021,025,035, AC-002 |
| Görevi izlemek | `todo` → `in_progress`/`blocked` → `done`; gerektiğinde geri aç | REQ-026–029 |
| Kanban'dan çalışmak | Sürükleme veya klavye ile durum değişimi; kayıttan sonra doğrulama | REQ-030–032, AC-005 |
| Hatasını düzeltebilmek | Soft delete, restore, revizyon çakışması ve duruma uygun hata mesajı | REQ-015,037 |
| Büyük veriyle devam etmek | Sayfalama, hafif projection, sınırlı reorder ve virtualized rendering | DOC-04/31 |

V1 kapsamında **yok:** Alt görev hiyerarşisi, çok kullanıcılı atama/izin, otomatik tekrar eden task, time tracking, calendar sync, gerçek zamanlı cloud ortak düzenleme, sınırsız toplu reorder, serbest kullanıcı tanımlı görev statüleri. Bu yokluklara rağmen iç şemadaki UUID/foreign key ve `record_links` ileride genişlemeye uygundur. P2 olan `REQ-040` toplu durum değiştirme V1 teslimatını bloke etmez; V1'in zorunlu çekirdeği olarak uygulanmaz.

### 1.1 Bağlayıcı kararlar (`PT-D-001–030`)

| ID | Karar |
|---|---|
| PT-D-001 | SQLite kalıcı **tek** yetkili veri kaynağıdır; Markdown export çalışma kopyası değildir. |
| PT-D-002 | Tek workspace; tam bir sistem Inbox. Tüm görevler bir proje ID'sine bağlıdır. |
| PT-D-003 | Domain ID'leri UUID v4; isim ve `slug` kimlik olarak kullanılmaz. |
| PT-D-004 | Proje adı 1–120 Unicode code point; görev başlığı 1–300, newline yok, trim+NFC. |
| PT-D-005 | Durum ve priority değerleri DOC-08 ile **birebir** aynı; UI etiketi değil DB enum'u saklanır. |
| PT-D-006 | Yeni proje `kind=user,status=active,priority=none,revision=1`. |
| PT-D-007 | Yeni görev `status=todo,priority=none,revision=1`, `completedAt=null`. |
| PT-D-008 | No-op güncelleme revision, timestamp, event ve geçmiş üretmez. |
| PT-D-009 | İşlem başarısı yalnız DB commit'inden sonra kullanıcıya gösterilir. |
| PT-D-010 | Yazma komutu expectedRevision ve gerekiyorsa idempotency key taşır; sessiz lost update yasaktır. |
| PT-D-011 | Inbox taşınamaz, silinemez, yeniden adlandırılamaz, arşivlenemez ve çoğaltılamaz. |
| PT-D-012 | Proje arşivleme soft-delete değildir; arşiv veriyi korur ve görünümden gizler. |
| PT-D-013 | Arşivlenmiş projeye **yeni** görev ekleme ve mevcut görev düzenleme, proje tekrar `active` olana dek reddedilir; okuma, arama ve restore/reopen mümkündür. |
| PT-D-014 | `paused`/`completed` projeler içeriklerini korur; düzenleme yapılabilir ancak UI görünür durum etiketi gösterir, sessiz status değiştirmez. |
| PT-D-015 | Proje trash, alt kayıtları DB'den silmez; aktif görünümlerden proje ve çocukları gizlenir. Restore aynı ID'leri görünür yapar. |
| PT-D-016 | Kalıcı purge ayrı bir gelecekteki işlem; V1 `projects.trash` kalıcı silme değildir. |
| PT-D-017 | Liste/Kanban aynı `tasks` kayıtlarını ve aynı Application Core komutlarını kullanır. |
| PT-D-018 | Tek görev durum değişikliği `tasks.status`; proje/kolon/konum taşıma `tasks.move` veya `tasks.reorder` ile olur. |
| PT-D-019 | `done` dışındaki durumlarda `completed_at=NULL`; her yeniden tamamlamada yeni tamamlanma anı. |
| PT-D-020 | `cancelled` tamamlanan iş sayılarına katılmaz; açık işler `todo,in_progress,blocked` kümesidir. |
| PT-D-021 | Kanban sütunları `todo,in_progress,blocked,done,cancelled` durumlarının tümünü kayıpsız kapsar; kapalı sütun gizleme filtre olabilir. |
| PT-D-022 | Manuel sıralama `(sort_order,created_at,id)` kararlı sıralamasına dayanır, eşit sort değerleri deterministiktir. |
| PT-D-023 | Toplu `tasks.reorder` sınırı **250** ID; yalnız tek proje+tek status kapsar. |
| PT-D-024 | Filtrelenmiş/sıralama kriteri manuel olmayan görünümde drag-to-reorder yapılmaz; status değişikliği ayrı çalışır. |
| PT-D-025 | Taslak/optimistic UI kalıcı kayıt değildir; başarısızlıkta geri alma veya uzlaştırma şarttır. |
| PT-D-026 | Tüm görev yaratma yolları (quick add, UI, agent, import) aynı validation ve command handler kullanır. |
| PT-D-027 | Arama/deep-link kaynak ID ile açar; archived/trashed erişim uygun görünür uyarı taşır. |
| PT-D-028 | Project/Task listeleri cursor ile sayfalanır; tüm child entity'leri eager yükleme yasaktır. |
| PT-D-029 | Kullanıcı içeriği, agent telemetry veya tanılama loguna kendiliğinden kopyalanmaz. |
| PT-D-030 | AI/Ollama/Whisper kapalı veya hiç kurulu değilken bütün bu modül aynı davranışla çalışır. |

### 1.2 Önerilen V1 UI yüzeyleri

| Yüzey | Birincil veri kaynağı | Eylem | Bağımlı belge |
|---|---|---|---|
| Sol navigasyon / Projects | `projects.list` + saved selection | Aç, oluştur, filtrele | DOC-21 |
| Inbox / Quick Capture | `tasks.create` | Tek giriş, proje seçimi isteğe bağlı | DOC-22 |
| Project Overview | `projects.get`, `projects.resume` | Son yapılanı gör, bağlantıya atla | DOC-14/21 |
| Project Settings/Actions | `projects.update`, `projects.status`,`projects.trash` | Düzenle, arşivle, geri aç, çöpe taşı | DOC-22 |
| Task List | `tasks.list` | Ekle, filtrele, tamamla, aç | DOC-21/22 |
| Kanban | `tasks.list`, `tasks.status`,`tasks.move`,`tasks.reorder` | Sürükle/klavyeden durum ve sıra değiştir | DOC-22 |
| Task Drawer | `tasks.get`, `tasks.update`, `tasks.status` | Tüm alanları ve ilişkileri yönet | DOC-22 |
| Trash / Recovery entry | `projects.restore`, `tasks.restore` | Kimliği koruyarak kurtar | DOC-17/19 |

---

## 2. Kimlikler, alan sınırları ve normalize etme

**Kanonik `Project`/`Task` type'ları DOC-08 §6–7'den import edilir.** Bu belgede yeni domain type yaratılmaz. `ProjectSummary`, `TaskSummary`, `ProjectResumeSnapshot` IPC DTO'lardır; kesin şemaları DOC-11/ilgili projection contract'larındadır.

| Alan | Kaydetmeden önce | Hata |
|---|---|---|
| Proje adı | `trim`, NFC, 1–120 code point; kontrol karakterleri reddet | `VALIDATION_FAILED` |
| Görev başlığı | `trim`, NFC, 1–300 code point; LF/CR ve diğer yasak kontrol karakterleri reddet | `VALIDATION_FAILED` |
| Proje açıklaması | DOC-08 kısa metin, 2.000 UTF-8 byte | `PAYLOAD_TOO_LARGE` |
| Görev body | DOC-08 Markdown, 2 MiB UTF-8 byte | `PAYLOAD_TOO_LARGE` |
| Priority | `none,low,medium,high,urgent` | `VALIDATION_FAILED` |
| Task status | `todo,in_progress,blocked,done,cancelled` | `INVALID_STATUS_TRANSITION` veya validation |
| Hedef tarih | Gerçek yerel takvim günü `YYYY-MM-DD`; timezone dönüşümü yok | `VALIDATION_FAILED` |
| Tag IDs | JSON array, max 30, tekrarsız, workspace içinde geçerli | `VALIDATION_FAILED` / `NOT_FOUND` |
| `expectedRevision` | Pozitif tamsayı; server değerine karşı CAS | `CONFLICT_REVISION` |
| `idempotencyKey` | Komut kapsamında belirli tek intent'i tekrar temsil eder | `IDEMPOTENCY_CONFLICT` |

NFC ve uzunluk hesapları UI, IPC ve import'ta ortak `@iterkeep/contracts` doğrulayıcısıyla yapılmalıdır. `trim()` sonrası boş kalan başlık reddedilir. Kullanıcı içeriği otomatik kısaltılmaz. ASCII casefold ve slug, Türkçe proje adını veya görünen kullanıcı metnini değiştirmek için kullanılmaz.

### 2.1 `slug` davranışı

- `slug` proje adından türetilmiş **kullanıcıya gösterilmeyen** export/URL yardımcı değeridir. Türkçe aksan harfleri desteklenmiyorsa deterministik transliteration; boş kalırsa `project` fallback'i kullanılır.
- V1 SQL şemasında slug için unique constraint bulunmadığından `slug` benzersiz **varsayılmaz**; fiziksel export klasörü çakışması DOC-16'nın ID suffix kuralıyla çözülür.
- Rename sırasında `slug` değiştirilebilir ama herhangi bir başka kaydın FK/link referansı **asla** slug'a taşınmaz.
- Projelerin aynı display name'e sahip olması V1'de izinlidir. Liste ayırımı proje ID'si, status ve son aktiviteyle yapılır.

### 2.2 Proje/Görev kaynak sahipliği

- `Project.workspaceId` aktif workspace dışına çıkamaz; bir DB'den başka DB'ye doğrudan `projects.move` çağrısı V1'de bulunmaz.
- `Task.projectId` non-null FK'dir; UI alanı boş bırakırsa Application Core o workspace'in Inbox ID'sini bulur.
- Tag linkleri `project_tags` ve `task_tags` aracılığıyla yönetilir. Etiket adını değiştirmek ilgili kayıtları yeni ID'lerle oluşturmaz.
- Dışa aktarma veya deep-link referansları UUID v4 kullanır; proje silinip aynı isimle tekrar oluşturulursa eski ve yeni farklı kayıtlardır.

---

## 3. Workspace ve Inbox yaşam döngüsü

### 3.1 Atomik workspace bootstrap (burada tekrar uygulanmaz)

`DOC-09` ve `DOC-10` içindeki kurulum transaction'ı `Workspace + Inbox Project + Preferences + SetupState` oluşturur. Bu dosya yeni alternatif bootstrap şeması önermez.

Inbox'ın fiziksel `name` alanı her zaman **`Inbox`** olmalıdır; lokalize 'Gelen Kutusu' UI'da çeviri katmanı tarafından gösterilir. `inboxProjectId` yeniden açılışta aynı kalır. DB'deki `kind='inbox'` bir kullanıcı projesi gibi düzenlenmez.

### 3.2 Proje seçilmeden hızlı görev ekleme

1. Kullanıcı quick capture'ı açar; odak doğrudan girişe gider.
2. Mevcut proje bağlamı yoksa hedef etiketi 'Inbox / Gelen Kutusu' olur. Proje içindeyse mevcut proje seçili gelebilir; kullanıcı hedefi değiştirebilir.
3. UI başlığı alır, yalnız basit görünür alan doğrulaması yapar, her **tekil** gönderimde yeni idempotency key üretir.
4. `tasks.create` isteğinde `projectId` tamamen **omit** edilebilir; `null` gönderilmez.
5. Application Core aktif workspace Inbox ID'sini resolve eder; DB transaction ile görev + geçmiş + domain event + receipt üretir.
6. Commit cevabına kadar `saving` göster; doğrulanmış `id/revision` gelince `saved` ve ilgili görev bağlantısı.
7. Başarısızlıkta kullanıcı girdi metnini kaybetmez. `unknown` timeout sonucu otomatik yeni key ile tekrar gönderilmez; receipt reconciliation yapılır.

**Aynı hızlı ekle formuna kullanıcı bilerek iki ayrı kez submit ederse** iki ayrı görev üretilebilir. Sadece aynı intent'in replay'i idempotent olmalıdır; semantik olarak aynı başlıktaki farklı işler otomatik dedupe edilmez.

### 3.3 Inbox yönetim kuralları

| Kullanıcı işlemi | Sonuç |
|---|---|
| Inbox'a görev/not/log ekle | İlgili izinli varlık türüne göre kaydet |
| Inbox görevünü başka projeye taşı | `tasks.move`; Task ID ve tarihçe korunur |
| Inbox'ı yeniden adlandır/arşivle/sil | `INBOX_PROTECTED`; kalıcı değişiklik yok |
| Inbox'ı başka projeye taşı veya kopyala | Public route yok; reddet |
| Import Inbox eşleşmesi | DOC-16 önizlemesi ile mevcut Inbox'a eşleştir; sessiz çoğaltma yok |
| Workspace'i tekrar aç | Var olan Inbox kimliği korunur; yeniden oluşturulmaz |

Inbox görevleri diğer görevlerle aynı `Task` enum, tarih ve revision politikasını izler. 'Gelen Kutusu' ayrı bir görev koleksiyonu değildir.

---

## 4. Proje oluşturma, görüntüleme ve düzenleme

### 4.1 Oluşturma `projects.create`

**Girdi:** `{name, description?, priority?, tagIds?}` ve DOC-11 `MutationMeta` içinde actor/correlation/idempotency bilgisi.

**Servis sırası:** normalize/validate → ID/clock üret → kullanıcı projesi nesnesi oluştur → mevcut etiketleri doğrula → tek transaction `projects` + `project_tags` + `domain_events` + `idempotency_receipts` → commit → projeyi seçilebilir hâle getir.

**Başarı:** `{id,revision:1}`; React yeni kaydı proje listesi query invalidation/snapshot üzerinden görür. Sırf optimistic nesnenin oluşturulmuş olması 'kaydedildi' kanıtı değildir.

**Varsayılanlar:** `status=active`, `kind=user`, `priority=none`, açıklama boş string, `sort_order` stabil son pozisyon, `deleted_at=null`; `last_activity_at` başlangıçta `null` veya belgelenmiş türetilmiş summary. Özellik geliştiren ajan yeni `projects.created_at` alanları icat etmez.

**Boş/duplicate name:** Boş ad reddedilir; aynı ad mevcutsa isim eşsizliği varsayılmadığından izinlidir. Kullanıcıya isteğe bağlı mevcut proje önerisi gösterilebilir, zorunlu blokaj değildir.

### 4.2 Liste `projects.list`

UI'da ayrık görünüm filtreleri: `active`, `paused`, `completed`, `archived`; soft-deleted kayıtlar standart listede **asla** bulunmaz. Inbox, öntanımlı olarak sabit üst bölümde gösterilebilir; genel proje sıralamasına sokulmaz.

Desteklenen sıralama: Son etkinlik (varsayılan), ad, durum. Listeden status ve arama filtreleri; kanonik `projects.list` API'sinin sağladığı kısıtları aşmadan, sunucu tarafında uygulanır. `DOC-11 §3/4.3` artık `sortBy: recent|name|status` ve `direction: asc|desc` alanlarını tanımlar. Sıralama bütün sayfalar için server-side yapılır, `cursor` query fingerprint'ine bağlıdır; client-only sayfa sıralaması yasaktır.

Projeler için hafif projection (`id/name/status/priority/lastActivityAt/openTaskCount/revision`) kullanılmalı; tüm görevler/notlar/kararlar her liste yüklenmesinde sorgulanmamalıdır. N+1 query yasaktır; sayaçlar set-based veya ayrı cached projection sorgusuyla getirilir.

### 4.3 Düzenleme `projects.update`

Değiştirilebilirler: `name`, `description`, `priority`. Değişmezler: `id`, `kind`, `workspaceId`, `createdAt`, `revision` (doğrudan patch), `inboxProjectId`, türetilen `lastActivityAt`.

Etiket ilişkilerini düzenleme `REQ-014/018` kapsamındadır. `DOC-11` içindeki `projects.update.patch.tagIds` alanı opsiyonel, en fazla 30 UUID'dir. Alan yoksa tag'ler değişmez, `[]` gönderilirse hepsi kaldırılır. İlgili `project_tags` bağlantıları aynı transaction'da tam küme replace edilir; istenen tüm tag'ler workspace içinde doğrulanır.

Güncelleme akışı: taslak → alan doğrulama → `expectedRevision` → DB CAS/transaction → başarılıysa yeniden okunmuş projection; aynı içerik no-op, farklı revision `CONFLICT_REVISION`.

### 4.4 Durum değiştirme `projects.status`

DOC-08 matrisi esas alınır:

| Kaynak | Hedef | Davranış |
|---|---|---|
| `active` | `paused`,`completed`,`archived` | Kabul; Inbox hariç |
| `paused` | `active`,`completed`,`archived` | Kabul |
| `completed` | `active`,`archived` | Kabul |
| `archived` | `active` | Aç/geri getir |
| `archived` | `paused`,`completed` | Reddet; önce `active` |
| Herhangi | Aynı status | No-op, revision/event yok |

Arşiv eylemi UI'da görevlere erişimin devam ettiğini, ancak düzenleme için 'Projeyi yeniden etkinleştir' gerektiğini açıklamalı. `completed` status alt görevlerin otomatik tamamlanması **demek değildir**; projeyi tamamlamak görevlerin `done` olmasını zorlamaz veya veriyi değiştirmez.

### 4.5 Proje trash ve restore

- `projects.trash` yalnız `kind=user`; kullanıcıya proje adı ve bağlı öğe sayıları gösterilir. **Bu, kalıcı purge değil soft-delete'dir.** DOC-11'deki approval alanı/bağlamı üzerinden güvenli onay alınır.
- Transaction ile `projects.deleted_at`, `revision`, `updated_at` ve domain event güncellenir; child kayıtlar otomatik `DELETE` edilmez. Varsayılan tüm child query'ler parent görünürlüğü denetler.
- Link veya arama sonucu gizlenmiş projeye erişirse, UI silinmiş içerik uyarısı gösterir; içeriği uydurmaz.
- `projects.restore` beklendiği gibi aynı `id` ve çocuk FK'leri ile projeyi geri getirir; tarihçe korunur. Kullanıcı ayrıca yeniden `active` yapabilir. Restore için `revision` CAS zorunlu.
- Restore esnasında Inbox uniqueness, workspace ownership, çöp/başka workspace ilişkileri ve bekleyen transaction'lar yeniden doğrulanır. Purge V1'de ayrı public route değildir.

### 4.6 Arşiv vs tamamlandı vs çöp

| Durum | Standart aktif listede | Okuma | Yeni görev | Geri alma |
|---|---|---|---|---|
| `active` | Evet | Evet | Evet | — |
| `paused` | Filtre tercihi | Evet | Evet, uyarıyla | `active` |
| `completed` | Filtre tercihi | Evet | Evet, uyarıyla | `active` |
| `archived` | Hayır (arşiv filtresiyle) | Evet | Hayır; önce active | `projects.status(active)` |
| `deleted_at != NULL` | Hayır (Trash alanı) | Sınırlı | Hayır | `projects.restore` |

Bu tablo **kullanıcı-visible feature policy**'sidir; DOC-09'daki trigger arşive görev eklemeyi DB seviyesinde yasaklamadığı için Application Core kontrolü zorunludur. Agent, import ve UI da bu kuraldan geçer.

---

## 5. Proje özetinde 'Nerede kalmıştım?'

`projects.resume` bağımsız, tek call'la dönebilen hafif bir **read projection** sağlar. LLM'nin özet üretmesi zorunlu değildir. Projeye bağlı gerçek kayıtlardan şu bloklar oluşturulur:

| Blok | İçerik | Kanonik kaynak |
|---|---|---|
| Genel durum | İsim/status/son güncelleme | `projects` ve türetilmiş `last_activity_at` |
| Sıradaki işler | Üst öncelikli açık görevler, gecikenler | `tasks` filtre/sıra |
| Devam edilen iş | `in_progress` görevler; yoksa açık yüksek öncelikliler | `tasks` |
| Son çalışma | Son zaman damgalı activity log | `activity_logs` |
| Son karar | Son ilişkili accepted/proposed decision | `decisions` ve revisions |
| Hızlı bağlantılar | Not/karar/log/görev UUID deep link'leri | `record_registry` |
| Tamamlananlar | `done` görev sayısı, iptal hariç | `tasks` status |

**Null doğruluğu:** Hiç aktivite yoksa 'Son çalışma kaydı yok' gösterilir; sahte özet, sahte karar tarihi veya AI'dan üretilmiş varsayım görünmez. Silinmiş veya başka workspace'e ait kayıtlar projeksiyona katılmaz. `lastActivityAt` türetiminde proje create tarihinin aktivite sayılıp sayılmayacağı repository testinde sabitlenir; burada tercih: yalnız kullanıcı tarafından yapılan anlamlı görev/doküman/karar/log mutasyonları son aktivite olarak kabul edilir, boş proje `lastActivityAt=null` tutabilir.

Read consistency: Aynı DB worker bağlantısında tek read transaction ya da birbirine tutarlı snapshot okuma uygulanır; ayrı sorgulardan farklı zamanlara ait yarım summary birleştirilmez. `projects.resume` ekranında son logun Markdown gövdesinin tamamı preload edilmez; preview sınırı, sonra kaynak kayda gider.

UI aşırı bilgi yığmamalı: Önce devam edilen iş + son not/karar; kalan bağlantılar progressive disclosure. İçerik uzun olsa bile pencereyi bloke edecek full DOM render yapılmaz.

---

## 6. Görev oluşturma ve hızlı ekleme

### 6.1 Create sözleşmesi

**Kanonik public route:** `tasks.create` (DOC-11). Payload `projectId?`, `title`, `bodyMarkdown?`, `priority?`, `dueDate?`, `tagIds?` (en fazla 30). `status` create payload'ında yoktur; yeni görev her zaman `todo` başlar. İstenen farklı durum, aynı core üzerinden ayrı status transition'dır. Agent da bu sırayı izler.

| Adım | Sorumlu | Koruma |
|---|---|---|
| Normalize+validate | contracts + Application Core | Başlık, Markdown, tarih, tag sınırı |
| Hedef proje çözme | Application Core | Yoksa Inbox; `deleted_at`/archived guard |
| ID ve zaman üretme | Clock + ID port | UUID v4; UTC milliseconds |
| Task row + tags | DB worker transaction | FK, unique tag rows, no partial write |
| `task_history(created)` | Aynı transaction | Olayı editör söylemine değil commit'e bağla |
| `domain_events(task.created)` | Aynı transaction | Source, correlation ID, revision |
| `idempotency_receipts` | Aynı transaction | Aynı intent'in tekrarını tek sonuç |
| Commit receipt | DB worker → Core → IPC | Bundan sonra `saved` |

**Hedef proje geçiş yarışı:** Kullanıcı formu açık tutarken proje arşivlenirse/stash edilirse Core güncel DB durumu ile yeniden karar verir ve `PROJECT_NOT_WRITABLE` veya `PARENT_PROJECT_UNAVAILABLE` döner; otomatik Inbox'a yönlendirme **yalnız projectId omit olduğunda** geçerlidir. Hedef açıkça belirtilmişse sessiz hedef değişikliği yapılamaz.

### 6.2 Klavye odaklı hızlı ekleme

- `Ctrl/Cmd+K` command palette; 'Yeni görev' eylemi. Kesin keymap çakışmaları DOC-22 tarafından çözümlenecektir.
- Quick capture'da minimum etkileşim: aç → başlık yaz → Enter. `Shift+Enter` satır sonu quick-title için desteklenmez; uzun açıklamaya ayrı alan kullanılır.
- Tek satır girişte `Enter` submit eder; composition/IME aktifken (`isComposing`) submit edilmez. Kullanıcı Türkçe giriş veya erişilebilir input yöntemi kullanabilir.
- `Escape` taslağı iptal ederken yazılmış metin varsa en az bir kez onay veya taslağı koruma sağlar. Draft local UI state'tedir; persist garantisi yoksa kullanıcıya bildirilir.
- Başarılı create sonrası alan temizlenir, en son projeye dönülür veya ikinci görev için odak input'ta kalır (seçilen davranış DOC-22 ile sabitlenir). Duplicate Enter engellenir.
- Enter sonrası IPC geç kalırsa, yeni ID ile ikinci submit otomatik yapılmaz; işlemin durumu receipt üzerinden uzlaştırılır.

### 6.3 Normal proje içi görev oluşturma

Yeni task drawer/modal: başlık zorunlu; açıklama, priority, dueDate ve tags isteğe bağlı. Proje adı ve status açık görünür. Proje arşivlenmişse önce 'Yeniden etkinleştir' eylemi. Kaydet düğmesi saving sırasında ikinci intent başlatamaz. Başarı commit receipt geldikten sonra detay ekranında gerçek ID kullanılarak gösterilir.

---

## 7. Görev güncelleme, durum ve tamamlanma

### 7.1 `tasks.update` patch semantiği

DOC-11 `TaskChange` alanlarını beyaz listeyle uygula: `title`, `bodyMarkdown`, `priority`, `dueDate`, `tagIds`, `blockedReason` (durum ve proje ID değişimleri için dedicated route tercih edilir; DOC-08 TaskChange'in birleşik semantiği daha genel olsa da UI için ayrı route tutarlı). `undefined` gönderilmemiş alan demektir; `null` yalnız izinli nullable alanı temizler.

- Kullanıcı editöründe eski `revision` bulunduğundan tüm yazmalar CAS kontrolünden geçer.
- Hedef zaten aynıysa no-op; yalnız `updated_at` değiştirmek amacıyla yazma yoktur.
- Başlık/dueDate/priority/Markdown değişimleri domain event üretebilir; DOC-09 `task_history.kind` bunların yalnız bazılarını içerir. **Mevcut enum'a `title_changed` uydurulmaz**; detaylı audit gerekiyorsa `domain_events` kullanılır.
- Task soft-deleted veya parent proje trashed/archived ise düzenleme reddedilir.
- Girdi başka bir sekmede değişmişse `CONFLICT_REVISION` + güncel snapshot; kullanıcı kendi taslağını kaybetmeden karşılaştırır.

### 7.2 Status machine

Kanonik DOC-08 §7.1 matrisinde 5 status arasında **her gerçek geçiş** desteklenir; kendine geçiş no-op'tur.

| Hedef status | `completed_at` | Tarihçe | Açıklama |
|---|---|---|---|
| `todo` | `NULL` | `reopened` (eski done ise), aksi `status_changed` | Açık |
| `in_progress` | `NULL` | `reopened` (eski done ise), aksi `status_changed` | Devam |
| `blocked` | `NULL` | `reopened` (eski done ise), aksi `status_changed` | Gerekçe isteğe bağlı |
| `done` | yeni UTC timestamp | `completed` | Tamamlandı |
| `cancelled` | `NULL` | `reopened` (eski done ise), aksi `status_changed` | Tamamlanmış sayılmaz |

`blocked_reason`: `blocked` dışına çıkılırken aktif alan `NULL` olur; gerekçe history/event içinde saklanabilir, fakat `task_history.kind` izin verdiği enum ile kalır. `Task` editinde kullanıcı gerekçesi status `blocked` iken isteğe bağlıdır; boş olmasına izin verilir. Kullanıcının önceki açıklamasının sessiz silinmesi olmaz: açıklama diff/history ya da event snapshot üzerinden izlenebilir.

**Tamamlama arayüzü:** checkbox yalnız görsel kısa yoldur; `tasks.status({status:'done'})` çağırır. Yanıt commit gelene kadar geçici durum erişilebilir biçimde işaretlenir. Commit başarısızsa checkbox eski hâle döner, hata görünür. Reopen, yeni completion timestamp üretmeden `completedAt` sıfırlar; tarihi geçmişteki event'ten okunabilir.

### 7.3 Task history ve UI gösterimi

`task_history`: `created, status_changed, completed, reopened, moved_project, priority_changed, deleted, restored`. Her satır append-only; asla UPDATE yapılmaz. History pagination `tasks.get` detay projection'unda sınırlı olabilir; DOC-11 ayrı `tasks.history` route **tanımlamaz**. Tam geçmiş göstermek gerekiyorsa önce DOC-11'e versiyonlu route eklenmesi gerekecek; şimdi doğrudan SQL kullanan renderer yaratılamaz. V1 temel timeline `tasks.get` üzerinden sınırlı, kaynak DB geçmişi tamdır.

Dış linkler `record_registry` üzerinden kanonik kayıt ID'sine çözülür. Aktivite ile task history karıştırılmaz: kullanıcı çalışma logu (`activity_logs`) ayrı varlıktır.

---

## 8. Liste, filtre, tarih ve sayaç semantiği

### 8.1 Liste alanları

`tasks.list`: projectId opsiyonel (global liste), status array, priority array, due filtre, cursor, limit. Query sadece `tasks.deleted_at IS NULL` ve **canlı** parent project üzerinden sonuç döndürür. Varsayılan global görev listesinde arşivlenmiş projeler gizlidir; proje context'inde archived proje kullanıcı açıkça seçerse ayrı okuma görünümünde görevler gösterilir. Parent trashed ise hiçbir normal listeye dahil edilmez.

**Yasak:** `tasks.list` çağrısını proje sayısı kadar tekrarlayarak N+1 global liste üretmek. Repository tek indeksli query/filter ve cursor yaklaşımı uygular.

### 8.2 Task alan filtreleri

| Filtre | Beklenen sonuç | Not |
|---|---|---|
| Open | `todo,in_progress,blocked` | `cancelled` dahil değil |
| Completed | yalnız `done` | `cancelled` tamamlanma metriği değildir |
| Closed | `done,cancelled` | Gösterimde iki kategori ayrılır |
| Priority high+ | `high,urgent` | `none` gizli düşük öncelik değildir |
| Overdue | `due_date < local_today` ve status açık | Date-only karşılaştırma; gece timezone kayması yok |
| Today | `due_date = local_today` | `Europe/Istanbul` dahil seçilen IANA zone |
| No due date | `due_date IS NULL` | Null, belirsiz tarih değil |
| Project | Belirli UUID | Arşiv filtre politikası korunur |
| Tags | İlgili `task_tags` join/EXISTS | V1 kesin IPC filtre kapsamı DOC-11 ile eşleştirilmeli |

`due` DOC-11 sözleşmesinde `overdue|today|upcoming|no_date` olarak sabittir. `upcoming`, bugünden **sonraki** tarihler (`> localToday`) demektir; `today` ayrı seçilir. Ekran kendi takvim hesabını veritabanından farklı kabul etmez; iş mantığı seçili IANA zaman dilimine göre gün hesaplar.

### 8.3 Sıralama seçenekleri

Varsayılan manuel sıralama `sort_order ASC, created_at ASC, id ASC` (DOC-08). Ek görünüm sıralamaları: dueDate, priority, updatedAt. Bu seçenekler DOC-11 `tasks.list.sortBy`/`direction` alanlarıyla tüm cursor sayfalarında **server-side** uygulanır; sadece yüklenmiş sayfayı istemcide sıralamak yanıltıcıdır. Manuel Kanban sırasının doğruluğu için `sortBy=manual,direction=asc` zorunludur.

### 8.4 Sayaçlar

- `openCount = count(todo,in_progress,blocked)`
- `doneCount = count(done)`
- `cancelledCount = count(cancelled)`; doneCount'a eklenmez.
- `overdueCount = due_date < local_today` ve açık statü; parent görünürlük uygulanır.
- Sayılar committed DB snapshot veya yeniden oluşturulabilir read projection'dan gelir; UI'daki geçici optimistic state kalıcı sayaç olarak gösterilmez.
- Project status `completed` olması proje görevlerinin tamamlandığı anlamına gelmez.

### 8.5 Keyset pagination

`Page<T>` IPC cursor opaque imzalı/versiyonlu query token'ı olabilir; offset gerekiyorsa limit ve bozulma semantiği açık belgelenir. Önceki/sıradaki sayfalar kullanıcı filtresini taşır; status/sort/filter değişince eski cursor kullanılamaz. Cursor içeriği veri güvenliği ve query uyumluluğu için parse/validate edilir; renderer tarafından SQL parametresi olarak oluşturulmaz.

---

## 9. Kanban, drag-drop ve manuel sıralama

### 9.1 Sütun haritası

| Sütun | DB status | Varsayılan |
|---|---|---|
| Yapılacak | `todo` | Görünür |
| Devam Ediyor | `in_progress` | Görünür |
| Engellendi | `blocked` | Görünür |
| Tamamlandı | `done` | Görünür |
| İptal | `cancelled` | Gizlenebilir fakat erişilebilir |

'Engellendi' durumu ayrı sütun veya filtre olarak sunulabilir; V1 kararı: **ayrı sütun**, beş statünün eksiksiz gösterimi. Mobil dar pencere veya azaltılmış genişlikte yatay scroll; ekran okuyucuyla list/column action menüsü. UI statüleri saklamaz, sadece görünüm ayarı saklar.

### 9.2 İki ayrı kullanıcı niyeti

1. **Durum değiştirme:** Bir kartı başka status sütununa taşımak → `tasks.move` (`projectId` aynı, `status` yeni) veya yalnız status menüsünde `tasks.status`. Eğer sürüklemenin hedef konumu belirtilmişse `sortOrder` field'ı da verilebilir; server nihai düzeni tutarlı kılar.
2. **Aynı sütun içinde sıra değiştirme:** `tasks.reorder` yalnız belirtilen `(projectId,status)` kapsamındaki `orderedTaskIds` listesi için atomik çalışır.

`tasks.reorder` **asla** scope dışındaki bir projenin, status'un veya silinmiş task'ın ID'sini kabul etmez. Tek bir kart status değiştirilirken eski ve yeni sütun düzeninin tutarlı kalması gereklidir; tek commit boundary içinde yapılır. Status değişiminde history/event gereklidir.

### 9.3 Basit ve güvenli reorder algoritması

**İlk V1 tercihi:** Lane görünür ve bütünüyle yüklenmişse en çok 250 task'ın listesi üzerinden **tam lane reindex**. `sort_order = 0, 1024, 2048, …` kullanılır; her tam reorder transaction'da etkilenen tüm task'ların revision'ı değişir. `250*1024` JavaScript safe integer içindedir. Row value eşitlikleri bu yöntemle deterministik çözülür.

Bu algoritma az ve orta ölçekli projelerde sağlamdır. **Büyük lane için** 250 üstü tüm kartların yüklenmesi veya blind reindex YASAKTIR. Daha büyük listede user status değişikliği, görev içeriği edit'i ve filtreler çalışır; manuel sıra değiştirme için 'Daha fazla kart yükle' sonrasında güvenli bir 250'lik scope sunulmalı veya uygulama uygun `tasks.move` için pencere bazlı yeniden konumlandırma algoritmasını ayrıca ölçümlenmiş/test edilmiş şekilde sunmalıdır. Bu ek davranışın kabul testi olmadan kullanıcıya sürükle özelliği çalışıyormuş gibi gösterilmez.

**Önemli düzeltme:** DOC-11 `tasks.reorder` payload'ı yalnız `orderedTaskIds` ve `expectedRevisions` içeriyor; reorder'ın kısmi görünür scope mu yoksa tam lane mi olduğu belirsiz. V1 kuralı **tam, filtrelenmemiş ve en çok 250 task içeren lane** olmalı. Bir lane >250 ise `tasks.reorder` çalışmaz; `tasks.move` ile tek task status/proje taşıma yapılabilir. Bu, görünmeyen task'ların sırasının istemeden değişmesini engeller. `tasks.reorder` içindeki liste DB'de o lane'de bulunan görünür tüm canlı task ID'leriyle birebir eşleşmelidir; eksik/fazla → `REORDER_SCOPE_MISMATCH`.

**Query üzerinde sıralama yapılmışsa veya filtreler aktifse:** Drag-reorder kontrolü kapalıdır. UI nedenini belirtir: 'Manuel sıralama için filtreyi temizleyin.' Filtreli listeyi kullanıcı beğendiği gibi sürükleyip sonra tüm projenin gizli görevlerini karıştırmak yasaktır.

### 9.4 Transaction algoritması — doğrudan kodlanabilir plan

**Precondition:** project canlı+non-archived; `orderedTaskIds.length <= 250`; array unique; her task `projectId` ve `status` aynı; hiçbir task soft-deleted değil; tüm lane task sayısı array uzunluğuna eşit; her task `expectedRevision` eşleşiyor.

1. `BEGIN IMMEDIATE` veya DOC-10 eşdeğer iş sınırına gir.
2. Lane'in tüm `id,revision,sort_order,created_at` satırlarını deterministik sırayla oku.
3. Üyelik kümelerini karşılaştır. Tek bir eksik/görünmeyen/ikinci workspace ID → sıfır mutasyon, açıklayıcı hata.
4. Her `id` için `newSortOrder=index*1024` üret. Girdi mevcut sırayla tamamen aynıysa no-op.
5. Değişen her task için `UPDATE tasks SET sort_order=?, revision=revision+1, updated_at=? WHERE id=? AND revision=?` CAS yap.
6. `domain_events` içerisine yeniden sıralama olgusunu transaction içinde yaz; event `aggregate_revision` kullanıcıya doğru delta bildirecek şekilde eşleştirilsin.
7. `idempotency_receipts` kaydını DOC-10 tek-işlem kuralına göre ekle.
8. Commit sonrası `updatedIds` dön; event broker delta yayınlasın.

**Dikkat:** `tasks.reorder` yanıtı yalnız güncellenen ID'leri içerir; React, güvenilir güncel revizyonlara sahip olmak için ilgili lane query'sini invalidate/refetch eder. Hiçbir çağıran `revision` artışlarını tahmini olarak cache'e yazmamalı. Çoklu satır transaction'da tek job cancellation button yoktur; kısa DB transaction işlem atomiktir.

### 9.5 SQL taslağı (normatif değil, DOC-09 şemasına uyumlu)

```sql
-- DB worker'da kullan; ? parametreleri prepared statement ile bağla.
SELECT id, revision, sort_order, created_at
FROM tasks
WHERE project_id = ? AND status = ? AND deleted_at IS NULL
ORDER BY sort_order ASC, created_at ASC, id ASC;

UPDATE tasks
SET sort_order = ?, revision = revision + 1, updated_at = ?
WHERE id = ? AND project_id = ? AND status = ?
  AND deleted_at IS NULL AND revision = ?;
-- changes() = 1 değilse tüm transaction rollback.
```

Bu SQL, `trg_search_task_update` event'iyle arama izdüşümünü güncelleyebilir; 250 satırlık reorder için gereksiz FTS güncellemesi performans maliyeti yaratır. **DOC-09'da FTS trigger'ını sırf `sort_order` değişiminde güncellemeyen `UPDATE OF title,body_markdown,status,priority,project_id,deleted_at` veya alan değişimi kontrolüyle daraltma** için ADR/şema gözden geçirmesi önerilir. Şema 0001 yayımlanmadan düzeltilirse DDL ve checksum birlikte güncellenir; yayımlandıysa ileri migration kullanılır. DOC-13 kendi başına trigger'ı değiştirmez.

### 9.6 Cross-column / cross-project move

`tasks.move` kanonik payload: `{taskId,projectId,status?,sortOrder?,expectedRevision}`. Aynı proje/aynı status/aynı konum hiçbir semantik değişim yoksa no-op. `projectId` zorunludur; UI mevcut projeyi biliyorsa açıkça geçirir.

- Kaynak ve hedef DB'de canlı, yetkili, non-archived olmalı; hedef Inbox olabilir.
- Görev ID, `createdAt`, önceki history ve linked records korunur.
- Status değişiminde tamamlanma/null kuralları, blockedReason temizliği ve doğru `task_history.kind` uygulanır.
- ProjectId değişiminde `task_history(kind='moved_project')` yazılır, kaynak/hedef proje aktivite özetleri güncellenir.
- Tek transaction içinde `tasks`, history, event, idempotency receipt güncellenir.
- `sortOrder` istenen hedef sıra konumunu belirten **negatif olmayan rank integer**. Eşzamanlı taşıma sonucu büyük listelerde duplicate sortOrder mümkünse tie-break deterministiktir; sonraki açık manuel normalize adımıyla giderilir. Sıralama mutation'ının exact insert-position semantiği DOC-10 repository implementation testlerinde sabitlenir.

Sürükleme UI'sında optimistik önizleme olabilir, ancak commit öncesi gerçek başarı gösterilmez; stale revision veya status yüzünden işlem reddedilirse eski lane'e dönülür ya da güncel gerçek okunur.

---

## 10. Görev silme, restore ve linked records

### 10.1 Task trash

`tasks.trash({taskId,expectedRevision})` kaza sonucu kayıp azaltmak için soft-delete'dir. Proje veya task gizli/arşivli ise politika önce doğrulanır. Onay UX'i: Tek task silmede yumuşak onay/undo; çoklu eylemde etki özeti. **Silindi** demek transaction commit edildiği anlamına gelir; fiziksel temizleme anlamına gelmez.

Başarılı transaction `deleted_at/updated_at/revision` değiştirir, `task_history(kind='deleted')`, domain event, idempotency receipt yazar. Görev normal listeden ve FTS aramadan düşer; linki varsa trash ekranında erişilebilmek için metadata saklanır.

### 10.2 Restore

`tasks.restore({taskId,expectedRevision})`: aynı ID, title, body, tags, history, mevcut status ve doğru `completedAt` korunur. Parent hâlâ canlı olmalıdır; parent trash ise önce `projects.restore`. Parent archived ise restore ile eski görev okunabilir hâle gelir ancak düzenleme için proje önce active yapılmalıdır.

Trash'te süreli undo önerilebilir ama gerçek undo yeni, doğrulanmış restore komutudur. Silinen kaydı UI state'ten yerinde geri koymak DB restore demek değildir.

### 10.3 Bağlantılar

Not/karar/log ile görev ilişkileri `record_links` + registry modelindedir (`DOC-09`). `tasks.get` detay DTO'su bağlı kayıt özetlerini alabilir; arayüz `records.link/unlink` kanonik route'larını kullanır. Silinmiş hedefe giden link UI'da boş kutu değil, 'Kayıt arşivde/çöpte/erişilemiyor' durumu üretir.

---

## 11. Public IPC -> Application Core -> Storage eşlemesi

**YENİ channel oluşturma!** Public isimlerin nihai listesi DOC-11 §3'tedir.

| IPC method | Application handler | Repository/DB etkisi |
|---|---|---|
| `projects.list` | `ListProjectsQuery` | Indexed paginated summaries |
| `projects.get` | `GetProjectQuery` | Single live/archived project detail |
| `projects.resume` | `GetResumeSnapshotQuery` | Consistent multi-table snapshot |
| `projects.create` | `CreateProjectCommand` | project+tags+receipt+event |
| `projects.update` | `UpdateProjectCommand` | project CAS + project_tags replace if contract revised |
| `projects.status` | `ChangeProjectStatusCommand` | validated transition + event |
| `projects.trash` | `TrashProjectCommand` | soft-delete+event+receipt |
| `projects.restore` | `RestoreProjectCommand` | restore+event+receipt |
| `tasks.list` | `ListTasksQuery` | keyset list; parent visibility |
| `tasks.get` | `GetTaskQuery` | detail + limited history/links |
| `tasks.create` | `CreateTaskCommand` | task+tags+history+receipt+event |
| `tasks.update` | `UpdateTaskCommand` | CAS task patch + tags; event |
| `tasks.status` | `ChangeTaskStatusCommand` | CAS status + completion timestamp + history |
| `tasks.move` | `MoveTaskCommand` | CAS project/status/order + history |
| `tasks.reorder` | `ReorderTasksCommand` | full lane check + <=250 CAS reorder |
| `tasks.trash` | `TrashTaskCommand` | soft-delete + history + event |
| `tasks.restore` | `RestoreTaskCommand` | undeletion + history + event |

Repository functions should accept domain-validated objects and opaque `CommandContext`. Renderer/agent never receives DB connection, SQL strings, or absolute workspace paths.

### 11.1 Example ports and command (illustrative, TypeScript)

```ts
// packages/application/src/ports/project-task.ports.ts
// Import exact domain types from @iterkeep/domain in actual codebase.
export interface TaskCommandContext {
  readonly correlationId: string;
  readonly actorKind: 'user' | 'agent' | 'import' | 'system';
  readonly actorRef: string;
  readonly idempotencyKey: string;
}

export interface CreateTaskInput {
  readonly projectId?: string;
  readonly title: string;
  readonly bodyMarkdown?: string;
  readonly priority?: 'none' | 'low' | 'medium' | 'high' | 'urgent';
  readonly dueDate?: string | null;
  readonly tagIds?: readonly string[];
}

export interface TaskCommandsPort {
  create(input: CreateTaskInput, context: TaskCommandContext): Promise<{
    id: string;
    revision: number;
  }>;
  changeStatus(input: {
    taskId: string;
    status: 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
    expectedRevision: number;
  }, context: TaskCommandContext): Promise<{revision:number}>;
}
```

**Not:** Yukarıdaki daraltılmış type'lar yalnız protokolü anlatır, `@iterkeep/contracts` veya `@iterkeep/domain` şemalarının yerine geçmez. Kod ajanı aynı type'ları ikinci defa dışa açmaz; direkt import kullanır. `TaskCommandsPort` imzası örnek minimal alt kümedir, tam repository abstraction için DOC-07/10 izlenir.

### 11.2 Event, receipt, cache

- Her mutation `correlationId` ile ilişkilendirilir ve domain event outbox işleyişini DOC-12'ye göre uygular.
- Renderer ilk yükleme snapshot'ı aldıktan sonra `events.subscribe` ile delta/refetch kullanır. Snapshot/event yarış koşulu DOC-12 cursor reconciliation ile çözülür.
- `projects.create` sonrası proje listesi; `tasks.create/status/move/reorder/trash/restore` sonrası ilgili proje task listesi, Kanban sütunları, Inbox/global sayaçları ve `projects.resume` query'si invalidate edilir.
- Event/stream içerikleri minimal ID+revision/kind'dir; Task Markdown body'nin tamamı otomatik çok sayıda aboneye yayılmaz.
- Query cache stale/diff sonucu doğrulama için canonical DB projection okunur; event 'saved' yerine geçmez.

---

## 12. React UI state, navigation ve etkileşim modeli

### 12.1 State ownership tablosu

| State | Sahibi | Kalıcılık |
|---|---|---|
| Aktif proje ID ve son görünüm | Workspace preferences | SQLite (kanonik preference) |
| Açık modal/drawer, hover, drag preview | Zustand/component | Ephemeral |
| Proje/görev liste sonuçları | TanStack Query | Canonical DB response cache |
| Kaydedilmemiş başlık/not taslağı | Component + isteğe bağlı session recovery | Commit edilmemiş; asla task gibi sunulmaz |
| Status/priority enum labels | i18n resources | Kalıcı domain değil |
| Hata/commit toast | UI feedback | Geçici; event log değildir |
| Task/proje activity timeline | Read DTO/DB projection | DB'ye bağlı |
| AI suggested tasks | Agent proposal | Onay/commit öncesi Task değildir |

### 12.2 Proje listesi

- İlk açılışta sidebar minimum skeleton + Inbox göstersin; readiness anında içerik gelsin.
- Proje seçimi ID ile route edilir; son kullanılan proje path değil ID ile saklanır.
- Status filtreleri net görünür; archived default listede gizli, isteğe bağlı görünür.
- Proje adına tık → overview; kart menüsü → update, pause, complete, archive, trash.
- Rename sonrası açık linkler ID üzerinden kalır, sidebar/metin güncellenir.
- Uzun adlarda tek satır ellipsis + tooltip; ekran okuyucu tam adı okuyabilir.

### 12.3 Task listesi

- Varsayılan listede durum, başlık, öncelik, hedef tarih, proje ve kaydedilme göstergesi görünür.
- Tamamlama checkbox'ı gerçek `tasks.status` çağrısı yapar; checkbox `aria-checked`, busy state ve mümkünse announce ile güncellenir.
- Satır seçimi details drawer açar, linki ID bazlıdır. Virtualization yalnız gerektiğinde devreye girer.
- Klavye: Tab, Enter, Space ve escape anlamlı; mouse-only görev yok. Kesin shortcut haritası DOC-22.
- Filtre boşluğu `no tasks` değil `no matching tasks` durumunu gösterir.

### 12.4 Kanban görünümü

- Kart başlığında priority, date ve blocked label ayrı metin/ikonla sunulur. Renk tek bilgi kaynağı olamaz.
- Drag önizlemesinde hedef statü ve belirsiz save durumu gösterilir.
- Klavye alternatifinde `Change Status` context menu, move to project ve reorder kontrolü vardır; focus restore edilir.
- Aynı kartın iki görünümde ayrı React state kopyası tutulmaz; query key/id ve canonical mutation receipt kullanılır.
- Hata durumunda eski kararlı sıralama geri getirilir; `CONFLICT_REVISION` ise refetch ve 'başka yerde değişmiş' ayrımı.
- >250 kayıtlı lane için manuel sıralama eylemi disable + gerekçeli mesaj; görev status değişimi mümkün.
- Responsive dar pencerede yatay sütun navigasyonu ve keyboard scroll desteklenir.

### 12.5 Görev düzenleyici

- Editable: title, body markdown, priority, dueDate, tags, blockedReason ve status.
- Status ve project değişiklikleri dedicated command kullanır; status transition sonrası updated revision refetch edilir.
- `Saving…` ile `Saved` ayrıdır. Kapanırken kaydedilmemiş taslak varsa koruma uyarısı.
- İki alanı farklı handler'larla art arda yazıyorsak her commit receipt yeni revision ile yenilenmeden sıradaki otomatik gönderilmez.
- Markdown görüntüleme `DOC-30` sanitization ve güvenli link davranışıyla uyumlu; ham HTML yürütülmez.

---

## 13. Error contract ve eşzamanlılık

| Failure | Tespit | Kullanıcı mesajı | Kural |
|---|---|---|---|
| `VALIDATION_FAILED` | Zod/domain | 'Başlık gerekli veya geçersiz.' | Girdi korunur |
| `PAYLOAD_TOO_LARGE` | Contracts | 'Metin izin verilen boyutu aşıyor.' | Sessiz kırpma yok |
| `CONFLICT_REVISION` | CAS 0 row | 'Bu kayıt başka bir işlemle değişmiş.' | Taslak korunur, refetch/compare |
| `INBOX_PROTECTED` | Domain/DB trigger | 'Gelen Kutusu değiştirilemez.' | DB değişmez |
| `PARENT_PROJECT_UNAVAILABLE` | FK/trigger + core | 'Hedef proje kullanılamıyor.' | Sessiz Inbox fallback yok |
| `PROJECT_NOT_WRITABLE` | Archived policy | 'Devam etmek için projeyi yeniden etkinleştirin.' | Auto-unarchive yok |
| `REORDER_SCOPE_MISMATCH` | Full-lane membership | 'Liste güncellendi; yeniden yükleyin.' | Tüm reorder rollback |
| `INVALID_STATUS_TRANSITION` | Domain | 'Bu durum değişikliği yapılamıyor.' | No partial history |
| `IDEMPOTENCY_CONFLICT` | Same key, different payload | 'İşlem doğrulanamadı; tekrar denemeyin.' | Kullanıcıya reconciliation |
| `SQLITE_BUSY` | DB worker | 'Kaydetme şu an yapılamadı, yeniden deneyin.' | Bounded retry only |
| `SQLITE_FULL` | DB worker | 'Disk alanı yetersiz.' | Taslak korunur |
| `UNKNOWN_COMMIT_STATE` | IPC timeout | 'Kaydın durumu doğrulanıyor.' | Receipt kontrolü, duplicate write yok |
| `NOT_FOUND`/`DELETED` | Missing/trashed | 'Kayıt bulunamadı veya çöp kutusunda.' | Boş proje uydurulmaz |

**Error code isimleri:** Yukarıdaki `PROJECT_NOT_WRITABLE`, `REORDER_SCOPE_MISMATCH`, `UNKNOWN_COMMIT_STATE` hata *semantiği* olarak gösterilmiştir. Eğer `DOC-08/11` ortak hata enum'u bunları içermiyorsa, uygulamada yeni bağımsız IPC enum'u üretilmez; mevcut `INVALID_STATE`, `VALIDATION_FAILED`, `CONFLICT_REVISION`, `TIMEOUT_UNCERTAIN` gibi kanonik kodlara sabit bir mapping yapılır veya DOC-11 sözleşmesi sürümlü şekilde revize edilir. UI `safeMessageKey` ile yerelleştirir.

### 13.1 Komut belirsizliği ve reconciliation

1. Kullanıcı tek intent gönderir, idempotency key sabit kalır.
2. IPC timeout veya worker restart olduğunda UI task'ın oluşmadığını **varsaymaz**.
3. `operations.receipt.get({idempotencyKey,commandName})` ile committed durumu sorgulanır.
4. Receipt bulunduysa aynı ID/revision ile UI doğru sonucu uygular.
5. Receipt yok ve işlem gerçekten tamamlanmadığı doğrulanabiliyorsa aynı intent/key ile bounded retry; belirsizlik sürüyorsa kullanıcıya inceleme + yeniden deneme bilgisi.
6. Farklı key üreterek otomatik duplicate task oluşturulmaz.

### 13.2 Race örnekleri

- Kullanıcı task'ı `done` yaparken agent priority değiştirirse: iki komut aynı eski revision'ı kullanıyorsa biri geçer, diğeri `CONFLICT_REVISION` alır. Agent aynı komutu farklı yazma yoluyla zorlayamaz.
- Task A projesinden B'ye taşınırken A arşivlenirse: aynı DB transaction'ın lineer sonucu geçerlidir; arşiv politikasını geçtiğini göstermeyen işlem reddedilir.
- Proje çöpe taşınmışken yeni task oluşturulursa: parent live kontrolü transaction içinde yapılır, FK tek başına yetmez.
- Kanban reorder sırasında yeni kart eklenirse: full lane üyelik kontrolü mismatch → rollback/refetch. Görevler kaybolmaz.
- Kullanıcı `tasks.status` sonrasında UI'yı kapatırsa: commit varsa açılışta DB sonucu görünür; son snapshot/event'e bel bağlanmaz.

---

## 14. Performans, bellek, indeks ve render politikası

Bu modül `DOC-04` kalite kapılarını ve `DOC-31` nihai benchmark metodolojisini izler. Aşağıdakiler **test hedefi / kodlama disiplini**, kanıtlanmış çalışma sonucu değildir.

| İşlem | Tasarım ilkesi | Ölçüm |
|---|---|---|
| Proje listesi | N+1 yok, yalnız summary projection | Query plan + P50/P95 |
| Task listesi | Sayfalama, projection, `idx_tasks_kanban` | 10k–100k fixture |
| Tek task status | İndeksli primary key CAS + kısa transaction | Commit latency P95 |
| 250 lane reorder | Tek transaction, yalnız farklı order satırlarını güncelle | 50/250 kart test |
| Proje resume | Bounded recent subsets + set-based count | P95 + allocation |
| Render | Büyük listede virtualization, memo-boundary | React Profiler FPS |
| Optimistic feedback | UI yanıtı ≠ commit süresi | İki ayrı timestamp |
| Search | FTS5 query safety + türetilmiş indeks | DOC-15/31 |

**Anti-pattern'ler:** Her keystroke'ta `projects.resume` + tüm task listelerini yeniden yüklemek; her task kartı için farklı `tasks.get` çağrısı; `OFFSET 100000` ile derin sayfalama; her drag hareketinde DB UPDATE; kanban lane genelini 1000 task JSON'u olarak preload etmek; renderer'a `better-sqlite3` koymak; template'lerde doğrudan `Date.parse('YYYY-MM-DD')` ile timezone türetmek.

**FTS trade-off:** DOC-09'da mevcut `AFTER UPDATE ON tasks` trigger'ı reorder'da da FTS'i güncelleyebilir. Performans testleri bunu gösterirse migration öncesi trigger scope düzelt; başka bir tablo/FTS yolu yaratma.

---

## 15. Güvenlik, gizlilik ve AI etkisi

- Renderer sadece preload bridge çağırır; Node `fs`, SQL, shell, arbitrary local paths kullanmaz.
- Bütün IPC requests `DOC-11` Zod şemasından geçer. `tagIds`, `orderedTaskIds`, `projectId` gibi foreign ID'ler workspace ve parent sınırına göre doğrulanır.
- Markdown task body güvenli render edilir, raw HTML script yürütülmez; external URL'ler `system.openExternalUrl` onay/allowlist politikasına tabidir.
- Agent'ın 'görevi tamamla' komutu UI'ın `ChangeTaskStatusCommand` yoluyla aynı policy ve CAS'ı uygular; `tools` katmanında DB SQL bulunmaz.
- Yıkıcı task/proje işlemlerinde agent approval'ları `DOC-27` uyarınca zorunludur; normal kullanıcı UI'sındaki kendi etki/onay davranışı aynı seviyede sürdürülür.
- Hiçbir görev başlığı veya Markdown gövdesi analytics/diagnostics/e-posta servisine otomatik gönderilmez. Ollama AI kapalıyken kurulum ve dış ağ erişimi yapılmaz.
- Etiketler, açıklama ve arama metinleri log'a ham basılmaz; correlation ID ve hata koduyla izlenir.

---

## 16. Uçtan uca referans akışları (`PT-F-001–012`)

### PT-F-001 — AI olmadan yeni proje

1. Workspace hazır, AI tercih false; `projects.create` gönder.
2. Input doğrulanır; DB transaction commit.
3. Proje overview açılır, empty-state 'İlk görevi ekle' çağrısı gösterir.
4. Restart sonrası aynı ID ve metadata ile görünür.

### PT-F-002 — Proje seçmeden Inbox'a hızlı ekleme

1. Quick capture'da başlık, projectId omit.
2. Core Inbox resolve eder; task+history+event+receipt atomik yazılır.
3. UI commit'i aldıktan sonra saved gösterir.
4. Görevin Inbox'tan başka projeye taşınması aynı UUID'yi korur.

### PT-F-003 — İki kez Enter / timeout

1. Tek intent ve aynı idempotency key ile iki IPC gönderisi oluşur.
2. İlk commit, ikinci receipt sonucu döndürür; iki task yok.
3. IPC timeout belirsiz olursa `operations.receipt.get` ile uzlaştır.

### PT-F-004 — Proje rename ve linklerin korunması

1. Project revision r; `projects.update({name,...expectedRevision:r})`.
2. DB günceller, `project_tags`, child FK veya deep links etkilenmez.
3. Old name araması artık aynı ID'nin güncel adını bulur.

### PT-F-005 — Proje arşivi

1. Proje `active`; kullanıcı archive ister.
2. `projects.status(archived)` commit; normal listeden çıkar.
3. URL/explicit archive filtresinde okunabilir, yeni task reddedilir.
4. `projects.status(active)` sonrası yeniden düzenlenebilir.

### PT-F-006 — Görev tamamla ve geri aç

1. `todo` task UI checkbox → `tasks.status(done)`.
2. `completed_at` UTC set, history completed, count+1.
3. `tasks.status(in_progress)` → completedAt null, history reopened, done count-1.
4. List/Kanban/restart tutarlı.

### PT-F-007 — Kanban filtresiz lane reorder

1. Proje+status lane tamamen yüklenmiş, sayısı <=250.
2. UI yeni ID dizisini revision map ile `tasks.reorder` gönderir.
3. Worker lane membership+CAS doğrular; tek transaction tamamlanır.
4. Query refetch sonrası sıra aynı; app restart ile korunur.

### PT-F-008 — Reorder race

1. A/B aynı lane'ı açar; B task'ı taşır veya oluşturur.
2. A eski listeyle reorder ister.
3. Membership veya expectedRevision tutmaz → rollback.
4. UI yeni gerçek sırayı gösterir, gizli task kaybolmaz.

### PT-F-009 — Başka projeye taşı

1. Task A projectId ile oluşturulmuş, history/links var.
2. `tasks.move({projectId:B,...})`.
3. Task id aynı; A listesinde yok, B'de görünür; geçmiş aynı.

### PT-F-010 — Task sil/restore

1. Task trash → list/FTS'den gizlenir, DB history korunur.
2. Restore aynı ID'yi getirir; tamamlanma ve açıklama verisi bozulmaz.
3. Parent trash ise önce proje kurtarma gerekir.

### PT-F-011 — Üç hafta sonra projeye dön

1. Projede activity, decision, açık iş ve not var.
2. `projects.resume` ilgili bilgileri AI olmadan birleştirir.
3. Kullanıcı son log/karara ID linkiyle gider; yeni görev yazar.

### PT-F-012 — DB hata ve veri güvenliği

1. Writer `SQLITE_FULL` veya revision conflict üretir.
2. UI kaydedildi demez; draft korur, retry/compare sunar.
3. Restart ile DB eski tutarlı hâlde; yarım task/history yoktur.

---

## 17. Test matrisi (`PT-T-001–052`)

**Kurulum:** Gerçek `DOC-09` migration'ıyla oluşturulmuş geçici dosya DB; foreign keys=ON, WAL mode; varsayılan Inbox, iki kullanıcı projesi, 260 task, archived/deleted örnekleri; fake clock ve deterministic randomUUID test portu; no Ollama/Python/Git needed. Unit tests saf domain, integration DB Worker, E2E Electron + UI. `PT-T-*` kimlikleri release kanıtına bağlanacaktır.

| ID | Test | Katman | Öncelik |
|---|---|---|---|
| PT-T-001 | Workspace tam bir Inbox oluşturur | integration | P0 |
| PT-T-002 | İkinci Inbox reddedilir | integration | P0 |
| PT-T-003 | Inbox rename/archive/trash reddedilir | integration | P0 |
| PT-T-004 | Proje adı NFC/boş/120 code point doğrulaması | unit+IPC | P0 |
| PT-T-005 | Aynı proje adı iki farklı UUID yaratabilir | integration | P1 |
| PT-T-006 | Proje create commit sonrası receipt döner | integration | P0 |
| PT-T-007 | Proje create çift replay aynı key tek satır | integration | P0 |
| PT-T-008 | Proje rename child link/FK değiştirmez | integration | P0 |
| PT-T-009 | Geçersiz project status transition reddedilir | unit+integration | P0 |
| PT-T-010 | Archived proje default listede gizli, archived filter'da mevcut | integration+E2E | P0 |
| PT-T-011 | Archived projeye task create reddedilir | integration | P0 |
| PT-T-012 | Paused/completed projede edit açık durum uyarısıyla | integration+E2E | P1 |
| PT-T-013 | Proje trash child kayıtları fiziksel silmez | integration | P0 |
| PT-T-014 | Proje restore aynı ID, children, links ile | integration | P0 |
| PT-T-015 | Parent deleted task normal listede yok | integration | P0 |
| PT-T-016 | Son etkinlik boş projede null/empty gösterir | unit+E2E | P1 |
| PT-T-017 | Resume snapshot current tasks/logs/decisions gerçeği | integration | P0 |
| PT-T-018 | Resume sorguları N+1 oluşturmaz | performance | P1 |
| PT-T-019 | Inbox quick create projectId omitted | integration | P0 |
| PT-T-020 | Explicit silinmiş projectId Inbox'a fallback yapmaz | integration | P0 |
| PT-T-021 | Aynı idempotency key tek Task üretir | integration | P0 |
| PT-T-022 | Aynı key farklı payload reddedilir | integration | P0 |
| PT-T-023 | Task title boş/newline/300 code point testleri | unit+IPC | P0 |
| PT-T-024 | Task Markdown 2MiB limit ve Unicode byte testleri | unit+IPC | P0 |
| PT-T-025 | Hedef tarih 29 Şubat/takvim dışı/red | unit | P0 |
| PT-T-026 | Yeni task `todo`, completedAt null, revision 1 | integration | P0 |
| PT-T-027 | Task create/history/event/receipt aynı transaction | integration | P0 |
| PT-T-028 | Task completedAt yalnız done'da dolu | unit+integration | P0 |
| PT-T-029 | done → in_progress history korunur | integration | P0 |
| PT-T-030 | cancelled done metriğine katılmaz | integration+E2E | P0 |
| PT-T-031 | Durum no-op revision/event üretmez | integration | P0 |
| PT-T-032 | priority değişince history doğru | integration | P1 |
| PT-T-033 | Task move ID/history/link korur | integration | P0 |
| PT-T-034 | Task move to archived/deleted reddedilir | integration | P0 |
| PT-T-035 | Kanban/list aynı task ID/status gösterir | E2E | P0 |
| PT-T-036 | Kanban keyboard menu ile status değişir | E2E | P1 |
| PT-T-037 | 250 task full lane reorder kalıcıdır | integration | P0 |
| PT-T-038 | 251+ task `tasks.reorder` reddedilir; status değişir | integration+E2E | P0 |
| PT-T-039 | Duplicate orderedTaskId ve foreign project ID reddedilir | integration | P0 |
| PT-T-040 | Partial/filtered reorder scope mismatch rollback | integration | P0 |
| PT-T-041 | Reorder stale revision rollback, zero partial mutation | integration | P0 |
| PT-T-042 | Reorder sonucu affected revision/refetch eşleşir | integration | P0 |
| PT-T-043 | Drag status UI failure eski konuma döner | E2E | P0 |
| PT-T-044 | Task trash normal list/search'ten düşer | integration | P0 |
| PT-T-045 | Task restore aynı ID/history'yle görünür | integration | P0 |
| PT-T-046 | Parent trash varken child restore reddedilir | integration | P0 |
| PT-T-047 | Revision conflict taslağı korur | E2E | P0 |
| PT-T-048 | Timeout receipt reconciliation duplicate önler | integration+E2E | P0 |
| PT-T-049 | Filtre sıfır sonucu gerçek empty state'ten ayrı | E2E | P1 |
| PT-T-050 | No Ollama/Python: Project/Task CRUD ve Kanban | E2E | P0 |
| PT-T-051 | Restart sonrası status/sort/Inbox ID korunur | E2E | P0 |
| PT-T-052 | List 10k/100k fixture query plan ve P95 kanıtı | performance | P1 |

**Test kanıtı minimumu:** test adı/fixture, kod commit hash, işletim sistemi, Electron/SQLite/native modül sürümleri, start/end timestamp, DB `quick_check`/`foreign_key_check`, makine bilgisi ve ölçümler. Gizli kullanıcı içerikleri test raporlarına konmaz; sentetik fixture kullanılır.

---

## 18. Geliştirici ajan için uygulama dilimleri ve bitiş kriterleri

### 18.1 Uygulama sırası

| Dilim | Teslim | Zorunlu test |
|---|---|---|
| PT-IMPL-01 | Project/Task domain policies, validation, ID/Clock ports | 004,009,023–025,028,031 |
| PT-IMPL-02 | Project repo + workspace Inbox + create/list/update/status/trash/restore | 001–015 |
| PT-IMPL-03 | Task repo + receipt/history + CRUD/status/move | 019–034,044–046 |
| PT-IMPL-04 | Resume read projection, counters, paginated lists | 016–018,030,049 |
| PT-IMPL-05 | Project/InBox/list/task drawer UI + typed IPC | 035,047,050,051 |
| PT-IMPL-06 | Kanban, DnD, keyboard move, reorder guards | 036–043 |
| PT-IMPL-07 | Race/timeout reconciliation + performance | 048,052 + DOC-04 |

Her dilim kod+test+CI lint/typecheck+basic packaged smoke içerir; core ve UI başka iki farklı CRUD iş mantığı barındıramaz. Uygulama ajana *önce kod yaz sonra tipleri uydur* izni verilmez. İlk iş kanonik contracts/domain referanslarının gerçek repo iskeletine taşınmasıdır.

### 18.2 Bitiş tanımı

- [ ] REQ-013–040 kapsamındaki P0/P1 maddeleri karşılandı; P2 `REQ-040` gerekiyorsa backlog'a açık şekilde kaydedildi.
- [ ] AC-002, AC-003, AC-005 otomatik E2E akışları geçiyor.
- [ ] 52 testin geçme/atlama kanıtları var; P0 başarısız veya sahte mock-pass yok.
- [ ] Tüm commit sonrası UI durumları doğru; timeout sonucu ikinci görev oluşmuyor.
- [ ] Inbox/soft-delete/restore/archived policy UI + agent + import üzerinde aynı.
- [ ] 250/251+ reorder, stale revisions, FTS trigger ve performance testleri var.
- [ ] Klavye ile eşdeğer görev status/menü etkileşimi erişilebilir.
- [ ] AI disabled/offline durumda P0 işlemler başarıyla çalışıyor.
- [ ] Windows packaged build'de gerçek `better-sqlite3` modülü ve DB worker çalışıyor.
- [ ] UI doğrulaması ve gerçek donanım benchmark'ları belge statüsünü `approved` yapmak için ayrıca inceleniyor.

---

## 19. Önceki sözleşmelerle kapatılacak uyumluluk noktaları

**Bu bölüm yeni API route'u yaratmaz.** `DOC-11` kanal listesi / route sayısı aynı kalır. DOC-13 hazırlanırken aşağıdaki mevcut route request **payload** boşlukları `DOC-11` içinde giderildi; ajanın yeni kaynak koda aynen taşıması gerekir:

| Açıklık | Kaynak | Gerekli çözüm | İlave route? |
|---|---|---|---|
| `projects.update.patch.tagIds` | REQ-014/018, DOC-11 §4.3 | Eklendi: opsiyonel max30 benzersiz UUID; transaction ile replace | Hayır |
| `projects.list.sortBy`/direction | REQ-019, DOC-11 §3/4.3 | Eklendi: `recent,name,status` + `asc/desc`, cursor fingerprint | Hayır |
| `tasks.list.sortBy`/direction | Task list UX, DOC-11 §3/4.2 | Eklendi: `manual,due_date,priority,updated_at` + yön | Hayır |
| `tasks.list.due` | DOC-11 §3/4.2 | Eklendi: `overdue,today,upcoming,no_date` ve timezone policy | Hayır |
| `tasks.get` history projection limiti | DOC-11 §3 | Uygulama hedefi: en son 20 history/linked summary; tam timeline gerekirse yeni sözleşme | Hayır |
| Archived project mutation | DOC-08 §6 & DOC-13 | Bu belge PT-D-013 policy'si; Core'da guard test | Hayır |
| Reorder scope tamlığı | DOC-11 `tasks.reorder` | Aynı lane'in tüm üyeleri, max250, filtrelenmemiş, tüm revisions | Hayır |
| Genel tag filtre alanı | REQ-018, DOC-11 list payload | Eklendi: `projects.list.tagIds`, aynı workspace kontrollü | Hayır |

**Değişiklik prosedürü:** `DOC-11` Zod schema/route tablosundaki güncelleme tamamlanmıştır; `DOC-10` repository query ve `DOC-33` contract tests geliştirme sırasında bu kesinleşmiş sözleşmeye bağlanacaktır. Uygulama testi yapılmadan özellik completed sayılmaz. Mevcut route sayısı 92'dir; yalnız request schema alanı eklemek yeni route değildir. Uyumluluk dosyaları birbirini geçmiş sürüme yönlendirmemeli. Doküman statüsü `draft` iken bu kararlar uygulanabilir; release sonrası IPC v1 backwards-compat ve migration kuralları gerekir.

---

## 20. İzlenebilirlik ve sonraki belge

| Kaynak | Bu dokümanla bağlanan alt sistem | Kanıt |
|---|---|---|
| `DOC-02` REQ-013–024 | Projects/Inbox, resume | PT-T-001–018 |
| `DOC-02` REQ-025–040 | Task/kanban, status, order | PT-T-019–052 |
| `DOC-03` JRN-002 | Inbox quick capture | PT-F-002/003 |
| `DOC-03` JRN-003 | Resume | PT-F-011 |
| `DOC-03` JRN-005 | List/kanban consistency | PT-F-006–008 |
| `DOC-08` Project/Task | Value objects, invariants | PT-D-* / PT-T-* |
| `DOC-09` projects/tasks/task_history | Schema, FK/trigger/FTS | PT-F-004–010 |
| `DOC-10` SQL writer | transactions/CAS/receipt | PT-F-003/008/012 |
| `DOC-11` IPC | existing 17 public methods | §11/19 |
| `DOC-12` event/cache/job | UI reconciliation | §11–13 |

**DOC-14 — NOTES-DECISIONS-LOGS.md** not, karar, append-only çalışma günlüğü, history ve birbirine bağlanmış kayıtlar için ayrı özellik sözleşmesini oluşturacaktır. Bu doküman o varlıkların edit akışlarını tekrar tanımlamaz.

## Değişiklik geçmişi

| Tarih | Sürüm | Açıklama |
|---|---|---|
| 2026-10-10 | 0.1.0 | V1 proje/görev davranışı, Kanban sıralaması, Inbox, UI, CAS, test kataloğu ve sözleşme açıkları |
