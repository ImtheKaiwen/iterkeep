---
document_id: DOC-00
title: "Iterkeep — Teknik Spesifikasyon Ana Rehberi"
version: "0.1.0"
status: "approved-foundation"
last_updated: "2026-10-10"
language: "tr-TR"
owner: "Product & Architecture"
---

# Iterkeep — Teknik Spesifikasyon Ana Rehberi

> **Bu belge, Iterkeep'in ürün kodu değildir.** `docs/` altındaki bütün teknik spesifikasyonların giriş noktası, okuma protokolü ve tutarlılık sözleşmesidir. Uygulamanın ayrıntılı davranışı, ilgili konuda **yetkili (source-of-truth)** dokümanda tanımlanır.
>
> **Belge durumu:** Bu rehberin temel kararları kabul edilmiştir; diğer 35 kanonik belge oluşturulmuş ve `draft` durumunda tutulmaktadır. Bu belge tek başına uygulamanın tüm ayrıntılarını tanımlamaz. Kapsamı tamamlanmamış bir özelliği geliştirme ajanı kendi tahminleriyle kesinleştirmemelidir.

## 1. Ürünün tek cümlelik tanımı

**Iterkeep**, proje bağlamını, görevleri, teknik kararları, notları ve çalışma günlüğünü tek yerde tutan; **önce yerel çalışan**, hızlı, çevrimdışı kullanılabilen ve **isteğe bağlı yerel yapay zekâ ile ses modülleri** sunan çapraz platform masaüstü çalışma alanıdır.

### 1.1 Temel problem

Kullanıcı bir projeye günler veya aylar sonra geri döndüğünde şu soruların cevabını hemen bulmalıdır:

- **Ne yapıyordum?** Son etkinlikler, açık görevler ve tamamlanan işler.
- **Nerede kalmıştım?** Devam eden görevler, günlük kaydı ve proje özeti.
- **Bu kararı neden vermiştim?** Gerekçeli, değişiklik geçmişi korunan kararlar.
- **Sırada ne var?** Öncelik, durum ve ilişkilere göre bir sonraki işler.

Ürün bu ihtiyaçları **AI veya internet bağlantısı gerekmeksizin** karşılamalıdır. AI, mevcut yetenekleri hızlandıran bir katmandır; onların ön koşulu değildir.

### 1.2 Ürünün hedef kitlesi

- Tek başına çalışan yazılımcılar ve mühendisler.
- Öğrenciler, araştırmacılar ve çoklu proje yürüten bireyler.
- Ücretli bir bulut servisine bağımlı olmak istemeyen teknik veya teknik olmayan kullanıcılar.

**V1 kapsamı:** Bireysel, tek bilgisayardaki çalışma alanı. Çok kullanıcılı gerçek zamanlı ortak düzenleme, bulut senkronizasyon sunucusu ve mobil istemci **V1 kapsamında değildir**.

## 2. Pazarlık edilmeyecek ürün ilkeleri

| Kod | İlke | Uygulamadaki sonucu |
|---|---|---|
| P-01 | **Local-first** | Proje verileri varsayılan olarak cihazda tutulur. İnternet zorunlu değildir. |
| P-02 | **AI-optional** | Ollama/Whisper/TTS kurulu değilken tüm temel üretkenlik işlevleri çalışır. |
| P-03 | **SQLite canonical** | Yapısal verilerde tek yazma kaynağı SQLite'tır; Markdown ana verinin eşzamanlı ikinci kopyası değildir. |
| P-04 | **Portability** | Projeler okunabilir Markdown/YAML olarak içe/dışa aktarılabilir. |
| P-05 | **Responsive by design** | Ağır I/O, indeksleme ve model işleri arayüz ile Electron main event loop'unu bloke etmez. |
| P-06 | **User control** | Agent'ın yazma/silme gibi etkileri servis katmanında doğrulanır; riskli işlemler onaylanır. |
| P-07 | **Privacy by default** | Uzak model/telemetri/otomatik Git push kullanıcı onayı olmadan etkinleştirilmez. |
| P-08 | **Recoverability** | Migration, yedekleme, hata kurtarma ve dosya dışa aktarma tasarımın parçasıdır. |
| P-09 | **Accessible UX** | Klavye, ekran okuyucu, reduced-motion ve light/dark tema temel gereksinimdir. |
| P-10 | **Measurable quality** | “Hızlı/güvenli” sıfatları test ve kabul kriterine dönüştürülür. |
| P-11 | **One domain, many interfaces** | UI, CLI ve agent aynı iş kurallarını ve komut servislerini kullanır. |
| P-12 | **Fail gracefully** | AI/voice/Git güncellemesi gibi isteğe bağlı yeteneklerin bozulması temel uygulamayı bozmaz. |

Bu ilkeleri değiştirmek, açık mimari karar güncellemesi ve ilgili testlerin revizyonunu gerektirir.

## 3. Kabul edilmiş yüksek seviyeli teknoloji kararları

| Katman | Başlangıç kararı | Sınır / açıklama | Yetkili belge |
|---|---|---|---|
| Masaüstü çalışma zamanı | Electron + TypeScript | Güvenli preload ve sınırlı IPC | `05`, `06`, `11`, `30` |
| Arayüz | React + Vite | Electron renderer'da ayrıcalıklı Node API yok | `05`, `20–23` |
| Stil | Tailwind CSS + merkezi design tokens | Dark/light + sistem teması | `20–22` |
| Kalıcı veriler | SQLite | WAL, yabancı anahtarlar, transaction, migration | `08–10` |
| Arama | SQLite FTS5 | Türkçe normalizasyonu/arama kalitesi test edilmeli | `15`, `31` |
| Doküman taşıma | Markdown/YAML import-export | Deterministik dışa aktarım; veritabanı tek kaynak | `16` |
| Git | Opsiyonel dışa aktarım sürümleme/yedekleme | Otomatik uzak push yok | `16`, `17` |
| Local LLM | Ollama adaptörü | İsteğe bağlı, sağlık kontrolü ve model yönetimi | `24–27` |
| Konuşmadan yazıya | whisper.cpp tabanlı sağlayıcı | Açıkça tetiklenen kayıt; ayarlanabilir model | `28` |
| Yazıdan konuşmaya | EMA Lightning sağlayıcısı | İsteğe bağlı yan süreç; model kurulumu zorunlu değil | `29` |
| Test ve paketleme | Otomatik testler + GitHub Actions | Öncelik Windows, mimaride çoklu platform hazırlığı | `33`, `34` |

**Henüz sabitlenmeyen ayrıntılar:** Tam paket sürümleri, kesin ORM/SQLite binding seçimi, test framework'lerinin platforma özgü ayarları, model sıralama eşikleri ve paketleme/imzalama seçenekleri ilgili belgelerde karşılaştırılarak sabitlenecektir. Ajan bunları sessizce keyfî belirlememelidir.

## 4. Veri bütünlüğü ve modül bağımsızlığı sözleşmesi

1. **Tek gerçek veri kaynağı:** Projeler, görevler, kararlar, notlar, günlükler ve agent çalışmasına ilişkin kalıcı kayıtların yetkili verisi SQLite'tır.
2. **Markdown bir değişim formatıdır:** Import sırasında doğrulama + önizleme + transaction; export sırasında kararlı sıralama, kararlı kimlikler ve deterministik içerik kullanılmalıdır.
3. **Git, uygulama veritabanını birleştirme aracı değildir:** Git'e esasen metin dışa aktarımları alınır. Canlı SQLite `.db` dosyası conflict-merge amacıyla Git'te tutulmaz.
4. **Şema geçişleri yönetilir:** `schema_migrations`, sürümlü migration, migration öncesi yedek ve başarısız geçişte kurtarma stratejisi zorunludur.
5. **Güvenli yazma yolları:** SQLite işlemleri transaction üzerinden geçer. Renderer doğrudan SQL çalıştırmaz. Agent SQL üretip çalıştıramaz.
6. **Bağımlılıklar opsiyoneldir:** Ollama, STT, TTS, Git, internet, GPU bulunmadığında app core çalışır.
7. **Kalıcı ayar ve anlık sağlık ayrıdır:** `setup_completed` / kullanıcı tercihi, `provider_healthy` / model hazır durumuyla aynı şey değildir.
8. **Yazma yetkileri sınırlandırılır:** Agent'ın tüm mutasyonları, kullanıcı UI'sinin de kullandığı doğrulanmış Application Core komutlarına gider.
9. **Dış sistemlere erişim görünürdür:** İndirme, izin, Git push ve uzak servise veri gönderme ancak kullanıcı tarafından başlatılan veya açıkça yetkilendirilmiş akışlarda gerçekleşir.
10. **Yedekleme veri tutarlılığını korur:** WAL açıkken salt `.db` kopyalamak yerine SQLite uyumlu backup/checkpoint yaklaşımı kullanılır.

## 5. Teknik belgelerin resmî envanteri (36 dosya)

**Adlandırma kuralı:** `NN-UPPER-KEBAB-CASE.md`. Numaralar kararlıdır. Bu dosya 00, diğer dosyalar 01–35'tir. Aşağıdaki tabloda `Yetki alanı` ilgili konuda **hangi dosyanın son sözü söyleyeceğini** gösterir.

### 5.1 Ürün ve gereksinimler — 5 dosya

| No | Dosya | Yetki alanı / zorunlu çıktı |
|---|---|---|
| 00 | `00-README.md` | Doküman envanteri, ilkeler, kaynak hiyerarşisi, uygulama ajanı protokolü. |
| 01 | `01-PRODUCT-VISION.md` | Ürün vizyonu, hedef kitle, çözülen problem, değer önerisi, başarının tanımı. |
| 02 | `02-SCOPE-REQUIREMENTS.md` | Özellik kapsamı, işlevsel ve işlevsel olmayan gereksinimler, V1 dışı maddeler, gereksinim ID'leri. |
| 03 | `03-USER-JOURNEYS.md` | İlk kullanım, günlük kullanım, projeye dönüş, AI ve ses akışları; hata/kurtarma kullanıcı yolları. |
| 04 | `04-QUALITY-GATES.md` | Global Definition of Done, sürüm kabul kapıları ve gereksinim → test izlenebilirliği. |

### 5.2 Mimari ve veritabanı — 8 dosya

| No | Dosya | Yetki alanı / zorunlu çıktı |
|---|---|---|
| 05 | `05-STACK-DECISIONS.md` | Bağımlılıklar, sürüm pinleme stratejisi, teknik karşılaştırmalar, ADR kararları. |
| 06 | `06-SYSTEM-ARCHITECTURE.md` | Electron süreçleri, servis sınırları, worker/sidecar mimarisi ve veri akışı. |
| 07 | `07-REPO-STRUCTURE.md` | Monorepo/paket dizini, dosya isimleri, modül kuralları, build hedefleri. |
| 08 | `08-DOMAIN-MODEL.md` | Entity/value object/ID, durum makineleri, domain olayları, DTO sınırları. |
| 09 | `09-DATABASE-SCHEMA.md` | Çalıştırılabilir SQL DDL, indeksler, FTS5, constraint'ler ve migration sırası. |
| 10 | `10-DB-OPERATIONS.md` | Repository API, transaction, concurrency, read-model, backup entegrasyonu. |
| 11 | `11-IPC-CONTRACTS.md` | Kanal isimleri, TypeScript/Zod şemaları, izinler, cevaplar, hata kodları. |
| 12 | `12-STATE-JOBS-EVENTS.md` | Zustand/Query sınırları, job queue, event bus, iptal, progress ve senkronizasyon. |

### 5.3 Uygulama özellikleri — 7 dosya

| No | Dosya | Yetki alanı / zorunlu çıktı |
|---|---|---|
| 13 | `13-PROJECTS-TASKS.md` | CRUD, kimlikler, görev durumları, filtreleme, bağlar, kullanım komutları. |
| 14 | `14-NOTES-DECISIONS-LOGS.md` | Not editörü, karar geçmişi, günlük olayları, Markdown davranışları. |
| 15 | `15-SEARCH.md` | FTS5 indeks güncellemeleri, Türkçe arama, ranking, query DSL, benchmark senaryoları. |
| 16 | `16-IMPORT-EXPORT-GIT.md` | Markdown/YAML şeması, import önizleme, çakışma, export, Git adaptörü. |
| 17 | `17-BACKUP-RECOVERY.md` | SQLite backup, restore, migration rollback/recovery, veri tutarlılığı. |
| 18 | `18-SETUP-WIZARD.md` | İlk açılış, adım akışı, skip/resume/retry, sistem keşfi, indirme yaşam döngüsü. |
| 19 | `19-SETTINGS-CAPABILITY.md` | Kullanıcı tercihleri, provider sağlık durumu, capability manager, sonradan aç/kapat. |

### 5.4 Tasarım ve deneyim — 4 dosya

| No | Dosya | Yetki alanı / zorunlu çıktı |
|---|---|---|
| 20 | `20-DESIGN-TOKENS-THEMES.md` | Renk/typography/spacing/motion tokenları, dark/light, tema kalıcılığı. |
| 21 | `21-SCREENS-NAVIGATION.md` | Tam ekran envanteri, navigasyon, responsive pencere davranışı, boş/yükleniyor ekranları. |
| 22 | `22-COMPONENTS-INTERACTIONS.md` | Tekil bileşen kontratları, klavye kısayolları, editor/chat/tool timeline etkileşimleri. |
| 23 | `23-ACCESSIBILITY-I18N.md` | WCAG hedefleri, odak yönetimi, ekran okuyucu, Türkçe/İngilizce, reduced-motion. |

### 5.5 AI, agent ve ses — 6 dosya

| No | Dosya | Yetki alanı / zorunlu çıktı |
|---|---|---|
| 24 | `24-LOCAL-AI-ARCHITECTURE.md` | AI modül sınırları, provider interface'leri, yaşam döngüsü, donanım bütçesi. |
| 25 | `25-OLLAMA-MODEL-MANAGER.md` | Ollama algılama/API, model kataloğu, öneri puanlama, indirme ve benchmark. |
| 26 | `26-AGENT-TOOL-CONTRACTS.md` | Her tool'un isim/şema/izin/sonuç/hata/idempotency sözleşmesi. |
| 27 | `27-AGENT-POLICY-OBSERVABILITY.md` | Risk sınıfları, onay, tool timeline, event log, agent çalışma durumları. |
| 28 | `28-VOICE-STT.md` | Push-to-toggle kayıt, mikrofon izinleri, whisper.cpp, transkript onayı, hata akışları. |
| 29 | `29-VOICE-TTS.md` | EMA Lightning sidecar, yükleme, ses çıkışı, iptal, CPU/GPU fallback, hata akışları. |

### 5.6 Mühendislik, test ve yayın — 6 dosya

| No | Dosya | Yetki alanı / zorunlu çıktı |
|---|---|---|
| 30 | `30-SECURITY-PRIVACY.md` | Electron güvenliği, dosya kapsamı, secrets, süreç izinleri, gizlilik sınırları. |
| 31 | `31-PERFORMANCE-BENCHMARKS.md` | Referans donanım, senaryolar, veri hacimleri, hedef metrikler, profiler prosedürü. |
| 32 | `32-ERROR-RECOVERY.md` | Hata sınıfları, retry/backoff, telemetrisiz yerel tanılama, kullanıcıya hata sunumu. |
| 33 | `33-TEST-STRATEGY.md` | Unit/integration/E2E/migration/chaos/multi-platform test matrisleri. |
| 34 | `34-CI-CD-DISTRIBUTION.md` | GitHub Actions, paketleme, imzalama, sürüm yönetimi, updater ve release politikası. |
| 35 | `35-IMPLEMENTATION-PLAYBOOK.md` | Sprint/iş paketleri, bağımlılık grafı, kodlama sırası, ajan görev protokolü ve final denetim. |

**Kapsam toplamı:** 5 + 8 + 7 + 4 + 6 + 6 = **36 Markdown dosyası**. Proje köküne daha sonra eklenecek `AGENTS.md`, uygulama `README.md` ve koddan üretilen referanslar bu sayıya **dahil değildir**.

## 6. Belgelerin yetki hiyerarşisi ve çelişki çözümü

Belgeler birbirini tekrar ederek ikinci doğruluk kaynağı oluşturmayacak. Her belgenin yukarıdaki tablodaki kendi alanı yetkilidir.

### 6.1 Öncelik sırası

1. **Kullanıcının son onayladığı açık ürün/mimari kararı** (ilgili dokümana işlenmiş olmalıdır).
2. **Güvenlik ve veri bütünlüğü kısıtları** (`30`, `09`, `10`, `17`); bunlar diğer maddelerle sessizce gevşetilemez.
3. **İlgili konunun yetkili sözleşme dokümanı** (ör. SQL için `09`, IPC için `11`, model indirme için `25`).
4. **Global kapsam ve kabul kriterleri** (`02`, `04`).
5. **Örnek kod/pseudocode, ekran çizimi, açıklayıcı örnekler** (normatif sözleşmeye aykırı olamaz).

Çatışma örnekleri:

- `21` bir butonun çağrısını `tasks:create` diye tarif edip `11` farklı bir IPC kanalı belirliyorsa, **IPC adı için `11` yetkilidir**. İlgili ekran belgesi düzeltilir.
- `13` görev alanını `priority: string` diye örnekleyip `08` enum tanımlıyorsa, **domain tipi için `08` yetkilidir**.
- `25` bir model indirmesini otomatik önerse bile `30` açık ağ izni/onay istiyorsa, **izinsiz indirme yapılmaz**.
- `00` içindeki örnek teknoloji ile `05` içindeki pinlenmiş sürüm farklıysa, **sürüm için `05` yetkilidir**.

**Belirsizlik protokolü:** Geliştirici ajan ilgili kodu yazmadan önce iki kaynak arasındaki uyuşmazlığı bir `SPEC-CONFLICT` kaydı olarak belirtir, yetkili belgede tek karar üretir ve etkilenen testleri günceller. Kritik güvenlik/veri kaybı belirsizlikleri çözülmeden o bölüm kodlanmaz. Tahmin edilerek uyumluymuş gibi davranılmaz.

### 6.2 Bilinçli tekrar / tek kaynak ilkesi

- SQL tablo/sütunları **yalnızca `09`** içinde normatif tanımlanır; diğer belgeler isimlerini referans verir.
- Public IPC komutları **yalnızca `11`** içinde normatif tanımlanır.
- Agent tool parametreleri ve sonucu **yalnızca `26`** içinde normatif tanımlanır.
- Design token isimleri/değerleri **yalnızca `20`** içinde normatif tanımlanır.
- Ölçüm yöntemi ve eşikler **yalnızca `31`** içinde normatif tanımlanır.
- Öncelik sıralı uygulama görevleri **yalnızca `35`** içinde normatif tanımlanır.

Kod örnekleri, ilgili sözleşmeleri açıklamak içindir; üretim kodu `src/` veya ilgili paket altında yer alır.

## 7. Her belgenin zorunlu yazım standardı

### 7.1 Üst bilgi (frontmatter)

Her belgenin başında aşağıdaki alanlar bulunur:

```yaml
---
document_id: DOC-XX
title: "Belgenin açık adı"
version: "0.1.0"
status: "draft" # draft | reviewed | approved | deprecated
last_updated: "YYYY-MM-DD"
language: "tr-TR"
owner: "İlgili sistem alanı"
depends_on:
  - "DOC-00"
---
```

Bu `00` belgesi, temel rehber olduğu için `approved-foundation` işaretiyle tutulmuştur; diğer belgelerde standart statüler kullanılır. Tüm tarih alanları ISO 8601'e uygun olmalıdır.

### 7.2 İçerik yapısı

Bir belgenin konusuna uygunsa şu başlıklar yer alır:

1. **Amaç ve kapsam:** Çözdüğü problem ve V1 sınırı.
2. **Bağımlılıklar ve varsayımlar:** Diğer belge ID'leri ve kararlar.
3. **Kesin kurallar (MUST/SHOULD/MAY):** İsteğe bağlı davranış açıkça etiketlenir.
4. **Veri tipleri/sözleşmeler:** TypeScript interface, Zod, SQL, IPC ve/veya JSON örnekleri.
5. **Normal akış:** Kullanıcı, UI, servis, DB ve isteğe bağlı sağlayıcı adımları.
6. **Boş, hata, iptal ve yeniden deneme durumları:** Geri alınabilirlik ve sonuç.
7. **Performans/güvenlik/erişilebilirlik etkileri:** İlgili global belgeye atıf.
8. **Test matrisi:** Girdi, beklenen çıktı, başarısızlık koşulları.
9. **Definition of Done:** Ajana kontrol edilebilir bitirme listesi.
10. **Açık kararlar:** Kodlamadan önce çözülmesi gereken *gerçek* belirsizlikler.

**Belirsiz dil yasağı:** “Çok hızlı”, “güvenli olsun”, “güzel arayüz” gibi ifadeler, gerekli teknik kural ve doğrulama olmadan tamamlanmış spesifikasyon sayılmaz.

### 7.3 Gereksinim, sözleşme ve test kimlikleri

Tutarlılık ve otomatik izlenebilirlik için şu kimlik düzeni kullanılacaktır:

```text
REQ-001               # Ürün gereksinimi — DOC-02
UC-001                # Kullanıcı akışı — DOC-03
ADR-001               # Mimari karar — DOC-05
DB-001                # Veritabanı invariantı — DOC-09/10
IPC-001               # IPC kontratı — DOC-11
TOOL-001              # Agent aracı — DOC-26
SEC-001               # Güvenlik gereksinimi — DOC-30
PERF-001              # Performans hedefi — DOC-31
TEST-001              # Test senaryosu — DOC-33
```

ID'ler yayımlandıktan sonra yeniden numaralandırılmaz. İsim değişebilir, kimlik ve geçmiş korunur. İlgili testler gereksinim ID'sine referans verir.

### 7.4 Kod örneği ilkeleri

- Sözleşme örnekleri **TypeScript strict** ve açık tiplerle yazılmalı.
- DB örnekleri çalıştırılabilir SQLite SQL olmalı; belirsiz ORM pseudocode'u ile geçiştirilmemeli.
- Kullanıcı tarafından kontrol edilen bütün veriler giriş sınırında doğrulanmalı.
- IPC ve tool örneklerinde başarılı yanıt, hata yanıtı ve iptal durumu gösterilmeli.
- Belgenin konusuyla ilgili referans kod **tamamlayıcıdır**; aynı iş mantığını farklı belgelerde tekrar tanımlamayın.
- Sürümü bilinmeyen kütüphane API'lerini doğrulanmış gibi sunmayın; `05` içinde pin ve entegrasyon testi gereksinimi tanımlayın.

## 8. Geliştirici agent çalışma protokolü

Bu bölüm bütün kodlama ajanları için zorunludur.

### 8.1 İlk okuma sırası

**Yeni depo / tüm projeyi üretme isteği:**

1. Bu dosyayı (`DOC-00`) bütünüyle oku.
2. Ürün şartlarını (`01–04`) oku; V1 dışı işleri ayır.
3. Sistem kontratlarını (`05–12`) oku.
4. Özellik sözleşmelerini (`13–19`), tasarımı (`20–23`), AI/sesi (`24–29`) oku.
5. Güvenlik, performans, hata, test ve release (`30–34`) belgelerini oku.
6. **En son** `35-IMPLEMENTATION-PLAYBOOK.md` içindeki iş paketlerine göre kodlamaya başla.

**Tek özellik üzerinde çalışma:** Önce `00`, `02`, `04`, ilgili özelliğin yetkili belgesi, onun dependency'leri, `30–33` ve `35` içindeki ilgili iş paketini oku. `11`/`09` gibi ortak sözleşmelerden etkileniyorsan onları da oku.

### 8.2 Kodlama öncesi kontrol

- [ ] Yapılacak iş `REQ-*` kimliklerine bağlandı.
- [ ] İlgili yetkili belge **approved** durumunda.
- [ ] Referans verilen tablo/IPC/tool/token sözleşmeleri tanımlı.
- [ ] Güvenlik, veri kaybı ve kullanıcı onayı riskleri belirlendi.
- [ ] Başarılı akışla birlikte boş/hata/iptal akışları belirlendi.
- [ ] Test ve başarı ölçütleri belirlendi.
- [ ] İş paketinin bağımlılıkları tamamlandı.

**Bu maddeler eksikse:** İlgili spesifikasyonu tamamla veya blokajı açıkça raporla; sözleşmesi eksik bir modülü 'hazır' ilan etme. Kullanıcıdan onay gerektirmeyen küçük uygulama ayrıntılarını belgeleyerek ilerleyebilirsin; temel mimariyi değiştiremezsin.

### 8.3 Kodlama döngüsü

Her iş paketi için:

1. Sözleşmeye bağlı en küçük çalışan dikey dilimi seç.
2. Testleri (veya E2E kabul senaryosunu) belirle.
3. Kodla; domain mantığını renderer'a, provider'a veya agent prompt'una gömme.
4. Typecheck, lint, birim ve ilgili entegrasyon testlerini çalıştır.
5. UI varsa klavye, tema, boş/yükleniyor/hata durumlarını doğrula.
6. Veri değişiyorsa migration, rollback/recovery ve backward compatibility testlerini çalıştır.
7. Modülün AI kapalı ve offline durumda çalıştığını doğrula (ilgiliyse).
8. Sonucu, değişen dosyaları, test çıktılarını ve açık riskleri raporla.
9. Kabul kapısını karşılamayan işi tamamlandı işaretleme.

### 8.4 Yasaklı kestirmeler

- ❌ Renderer'dan doğrudan SQLite / Node dosya erişimi.
- ❌ Agent'ın sınırsız shell/SQL çalıştırması veya keyfî dosya sistemi yazması.
- ❌ AI kurulmadan temel işlevleri kilitleme.
- ❌ Bir özelliğin hatasını sessizce yutma ya da başarı olarak gösterme.
- ❌ Değişen şema için migration/backup olmadan üretim DB'sini dönüştürme.
- ❌ Ana UI thread'inde model inference, toplu indeksleme veya bloklayıcı I/O.
- ❌ Güvenlik, performans, test veya release gereksinimini 'ileride ekleriz' diye yok sayma.
- ❌ Kullanıcının notlarını, dosyalarını veya model prompt'larını izinsiz uzak servise gönderme.
- ❌ Kaynak kod deposuna token, parola, kişisel veri veya kullanıcının gerçek DB dosyasını commit etme.
- ❌ Belgelerdeki 'planlanan' bir alanı 'uygulandı ve test edildi' diye raporlama.

## 9. Özellikler arası temel yaşam döngüleri

### 9.1 Uygulamanın açılışı

```text
App process start
  -> Single-instance & configuration validation
  -> Create secure Electron window and lightweight shell
  -> Start/open local SQLite services
  -> Render workspace / or first-run wizard
  -> Deferred capability checks (Ollama, STT, TTS, Git)
  -> UI remains interactive if any optional service fails
```

Açılışta model indirmesi veya Ollama başlatılması kendiliğinden zorunlu yapılmaz. Model varlık kontrolü kısa zaman aşımlı ve iptal edilebilir olmalıdır.

### 9.2 İsteğe bağlı AI durumu

```text
User preference: DISABLED | ENABLED
Runtime capability: NOT_INSTALLED | STOPPED | NO_MODEL |
                    READY | BUSY | DEGRADED | ERROR
```

Bunlar aynı değişken değildir. Örneğin `ENABLED + NO_MODEL` durumunda kullanıcı dosyalarını düzenlemeye devam edebilir, model seçimi ve indirme önerilir. `DISABLED` durumunda agent başlatılmaz; sonradan ayarlardan açılabilir. Tam durum makinesi `19`, `24`, `25` belgelerinde tanımlanacaktır.

### 9.3 Ses akışı

```text
Microphone button (user action)
  -> permission check
  -> recording starts
  -> second click stops
  -> STT job (cancel/retry support)
  -> editable transcript preview
  -> user chooses: save note | create task | send to agent
  -> optional TTS feedback (if enabled)
```

Sesli girişin yokluğu uygulamanın diğer işlevlerini engelleyemez. Ses komutundan çıkan tehlikeli agent eylemleri aynı onay politikasından geçer.

## 10. Performans yaklaşımı ve ölçüm disiplini

Ölçümler makineye, veri setine, soğuk/sıcak başlangıca ve disk durumuna bağlıdır. **Aşağıdaki değerler ürün hedefidir; ölçülmüş garanti değildir.** Normatif test düzeni ve nihai eşikler `31-PERFORMANCE-BENCHMARKS.md` içinde sabitlenecektir.

| Ölçüm | İlk V1 hedefi | Koşul / dikkat |
|---|---|---|
| Normal açılış → kullanılabilir UI | Referans SSD cihazında ≤ 1,5 sn | AI servisleri olmadan; soğuk/sıcak ayrı ölçülür. |
| Görev ekleme görsel tepkisi | ≤ 50 ms | İşin diske kalıcı yazılmasından ayrıdır. |
| Görev ekleme kalıcı commit | Tipik durumda ≤ 250 ms | P95 ve farklı disk yükleri ayrıca ölçülür. |
| Büyük veriyle arama | 100.000 kayıt için P95 ≤ 100 ms hedefi | Belirli sorgu türü, indeks ve ölçüm yöntemi şart. |
| Animasyon ve gezinme | 60 FPS hedefi | Düşük güçlü cihazlarda degrade stratejisi tanımlanır. |
| AI kapalı boşta kaynak | Minimal CPU/RAM kullanımı | Net bütçe ölçümlerle kabul edilir. |
| Ollama/STT/TTS erişilemez | **0 engelleyici bağımlılık** | Ana ekran açılır, temel CRUD ve arama çalışır. |

**Önemli:** Gerçekten daha hızlı olan veri yolu benchmark ile seçilir; sırf “SQLite daha hızlı” ön kabulüyle eksik indeksli, ağır sorgulu veya ana thread'i bloke eden sistem kabul edilmez.

## 11. Güvenlik, gizlilik ve kullanıcı onayı

- **Varsayılan politika:** Proje ve sohbet verileri yereldir. Yerel model kullanımı dahi açık kullanıcı seçimi ile etkinleşir.
- **Ollama yerelliği:** Sadece güvenilir ve açıkça yapılandırılmış yerel uç nokta varsayılan olarak kabul edilir. Ağ üzerinden dış sağlayıcılar V1'in varsayılanı değildir.
- **İndirmeler:** Model indirmesi öncesinde kaynak, yaklaşık boyut, lisans/uyumluluk bilgisi ve disk alanı gösterilir. Kullanıcının onayı gerekir.
- **İzin sınırı:** IPC ve agent tool çağrıları doğrulanmış, en az yetkili API'lere yönlendirilir.
- **Dosya erişimi:** Import/export dışında workspace dışı dosya erişimi açık seçim ve yol doğrulaması gerektirir.
- **Silme/toplu değiştirme:** Etki önizlemesi, açık onay ve mümkün olan yerlerde geri alma/yedek gerekir.
- **Mikrofon:** Kullanıcı tuşuna basmadan kayıt başlatılmaz. Kayıt durumu her zaman görünürdür.
- **Gözlemlenebilirlik:** Tool input/output logları kişisel veri sızdırmayacak şekilde saklanır; görüntüleme ve temizleme kontrolleri olur.
- **Güncellemeler:** İndirilen uygulama güncellemeleri için paket bütünlüğü/uygun platform imzası ve güvenli dağıtım prosedürü tanımlanır.

Ayrıntılı tehdit modeli, veri sınıflandırması ve uygulama politikaları `30-SECURITY-PRIVACY.md`'nin yetki alanındadır.

## 12. Ürün kapsamı ve teslim tanımı

### 12.1 V1'in asgari yetenekleri

1. İlk açılış sihirbazıyla lokal çalışma alanı oluşturma ve AI kurulumu atlama.
2. Proje ve görevleri oluşturma, düzenleme, tamamlama, filtreleme, arama.
3. Not, karar, çalışma günlüğü kaydetme; bağlamı hızla geri bulma.
4. Kalıcı SQLite verisi ve tutarlı Markdown import/export.
5. Güvenilir yedek/geri yükleme ve temel Git entegrasyonu (isteğe bağlı).
6. Dark/light/system temaları, modern ve erişilebilir ekranlar.
7. Opsiyonel Ollama adaptörü; model algılama, yönetim, öneri, indirme ve chat.
8. Kontrollü agent tool'ları, kullanıcı onayı ve görülebilir işlem geçmişi.
9. Opsiyonel bas-konuş/durdur STT ve ayrı isteğe bağlı EMA Lightning TTS.
10. Testlerden geçmiş, yüklenebilir Windows dağıtımı ve CI/release pipeline.

### 12.2 V1 dışında

- Hesap açma zorunluluğu, bulut depolama veya bulut sync sunucusu.
- Gerçek zamanlı çok kullanıcılı ortak düzenleme.
- Mobil uygulama, web uygulaması veya sunucu backend'i.
- Sonsuz süre mikrofondan otomatik dinleme / uyandırma kelimesi zorunluluğu.
- Agent'a varsayılan sınırsız terminal, ağ veya çalışma alanı dışı dosya yetkisi.
- Ollama, STT veya TTS kurulumu olmadan çalışmayı engelleyen özellik kilidi.

### 12.3 Bitti sayılmanın minimum şartları

Ürün, yalnızca ekranlar hazırlanmış diye bitmiş sayılmaz. `04`, `33`, `34`, `35`'in kapıları geçilmelidir. Özellikle:

- Gereksinimlerin tamamı izlenebilir test veya doğrulama kanıtıyla bağlıdır.
- Yeni kurulum + eski sürümden yükseltme + bozuk provider + AI kapalı kullanım test edilmiştir.
- Veriler uygulama çökmesi ve başarısız migration senaryolarında korunur veya açık kurtarma yöntemi vardır.
- Windows dağıtım paketi temiz makinede kurulup çalışır.
- Performans eşikleri gerçek referans makinede ölçülmüş ve raporlanmıştır.
- Bilinen yüksek ciddiyetli güvenlik ve veri kaybı hataları çözülmüştür.

## 13. Doküman yazım ve onay sırası

Dokümanlar numara sırasıyla oluşturulacak; önemli bağımlılıklar gerektiğinde önce kavramsal karara bağlanıp yetkili dosyada kesinleştirilecektir.

| Aşama | Belgeler | Çıkış şartı |
|---|---|---|
| A — Ürün sözleşmesi | `01–04` | V1 sınırı, kullanıcı akışları ve global kalite kriterleri kesin. |
| B — Çekirdek mimari | `05–12` | Modül sınırları, SQL, IPC, iş/event modeli kodlanabilir. |
| C — Ürün işlevleri | `13–19` | Tüm temel CRUD, arama, setup ve recovery akışları açıklanmış. |
| D — Arayüz | `20–23` | Ekran ve bileşen sözleşmeleri, tema ve erişilebilirlik tamam. |
| E — AI ve ses | `24–29` | Model, tool, izin ve ses servislerinin yaşam döngüsü tamam. |
| F — Üretim kalitesi | `30–35` | Güvenlik, test, performans, CI/CD ve uygulanabilir iş paketleri tamam. |

**Resmî kodlama başlangıç kapısı:** `01–35` tamamlandığında, çelişki listesi temizlendiğinde, kritik belgeler `approved` statüsüne geçtiğinde ve `35` uygulama sırasını belirlediğinde **ürün tamamını üretmek için kodlama** başlatılabilir. Deneysel prototipler ayrıca yapılabilir fakat nihai ürünün doğrulanmış uygulaması gibi kabul edilmez.

## 14. Belgeler arası gereksinim izlenebilirliği

Bu tablo ürünün en kritik akışlarının başvuru noktalarını gösterir; ayrıntılı gereksinim/test matrisi `02`, `04` ve `33`'te hazırlanacaktır.

| İşlev / risk | İşlevsel sözleşme | Altyapı/güvenlik | Test ve kabul |
|---|---|---|---|
| Proje/görev yönetimi | `13` | `08–11` | `04`, `33` |
| Not, karar, log | `14` | `08–10` | `04`, `33` |
| Arama ve filtreler | `15` | `09–10` | `31`, `33` |
| Markdown/Git | `16` | `08–10`, `30` | `33` |
| Backup/restore | `17` | `09–10`, `30` | `32`, `33` |
| İlk kurulum | `18` | `11–12`, `19` | `32`, `33` |
| AI açma/kapama | `19`, `24` | `12`, `30` | `32`, `33` |
| Ollama/model | `25` | `24`, `30` | `31–33` |
| Agent tool/izleme | `26–27` | `11`, `30` | `32–33` |
| STT/TTS | `28–29` | `19`, `24`, `30` | `31–33` |
| Tema/erişilebilirlik | `20–23` | `12` | `04`, `33` |
| Installer/updater | `34` | `30`, `32` | `33` |

## 15. Terimler sözlüğü

| Terim | Bu projedeki kesin anlamı |
|---|---|
| **Workspace** | Bir kullanıcının yerel SQLite veritabanı ve ilgili varlıklarıyla oluşturduğu çalışma alanı. |
| **Project** | Kararlı kimliği olan, görev/not/karar/log ilişkilerine sahip çalışma birimi. |
| **Canonical source** | Verinin güvenilir, mutasyon yapılan tek yetkili kopyası. |
| **Application Core** | UI/agent/CLI'dan bağımsız domain işlemleri, komutlar ve kurallar. |
| **Capability** | Ollama, STT, TTS veya Git gibi kullanılabilirliği değişebilen isteğe bağlı yetenek. |
| **Provider** | Belirli capability'yi sunan dış süreç veya uygulama adaptörü. |
| **Agent run** | Tek bir kullanıcı isteğinden başlayan, kimlikli ve izlenebilir çalışma. |
| **Tool call** | Agent'ın belirli şema ve yetkiye tabi, durum/çıktı kaydı olan operasyonu. |
| **Sidecar** | Electron dışında bağımsız süreçte çalışan yardımcı servis (ör. TTS). |
| **IPC** | Renderer ile ayrıcalıklı uygulama katmanı arasında doğrulanmış iletişim. |
| **FTS5** | SQLite içindeki tam metin arama sanal tablosu/indeksleme altyapısı. |
| **WAL** | SQLite Write-Ahead Logging journal modu. |
| **Migration** | Veritabanı şeması/veri sürümleri arasında kontrollü geçiş. |
| **Definition of Done** | Bir işin tamamlanmış kabul edilmesi için ölçülebilir koşullar. |

## 16. Belge ilerleme ve sonraki adım

Şu anki durum (12 Ekim 2026):

- [x] `00-README.md` — teknik dokümantasyon rehberi oluşturuldu.
- [x] `01–35` — kanonik sözleşme belgeleri oluşturuldu; uygulama ve gerçek test kanıtları tamamlanana kadar `draft` durumu korunuyor.
- [x] Kökte `AGENTS.md` — kodlama ajanları için kısa giriş yönlendirmesi oluşturuldu.
- [ ] `IP-00` — belge tutarlılığı, kimlik envanteri ve SQL fixture denetimi çalıştırılacak.
- [ ] `IP-01–19` — uygulama paketleri bağımlılık sırasıyla yürütülecek.

**Sonraki adım:** `DOC-35` uyarınca `IP-00` denetimini tamamlamak; ardından bağımlılık kapısı geçerse `IP-01` monorepo iskeletine başlamak.

---

**Rehberin ana ilkesi:** *Önce tutarlı sözleşme, sonra küçük ve doğrulanabilir uygulama; önce güvenilir yerel çalışma, sonra isteğe bağlı AI kolaylığı.*
