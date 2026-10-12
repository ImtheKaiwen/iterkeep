---
document_id: DOC-31
title: "Iterkeep — Performans Bütçeleri, Ölçüm Protokolü ve Benchmark Kanıtı"
version: "0.1.0"
status: "draft"
last_updated: "2026-10-10"
language: "tr-TR"
owner: "Performance Engineering & Release Quality"
depends_on:
  - "DOC-00"
  - "DOC-02"
  - "DOC-04"
  - "DOC-05"
  - "DOC-06"
  - "DOC-07"
  - "DOC-09"
  - "DOC-10"
  - "DOC-11"
  - "DOC-12"
  - "DOC-13"
  - "DOC-15"
  - "DOC-17"
  - "DOC-19"
  - "DOC-20"
  - "DOC-21"
  - "DOC-22"
  - "DOC-24"
  - "DOC-25"
  - "DOC-28"
  - "DOC-29"
  - "DOC-30"
next_document: "DOC-32"
---

# Iterkeep — Performans Bütçeleri, Ölçüm Protokolü ve Benchmark Kanıtı

> **Normatif amaç:** Iterkeep V1'de “hızlı”, “hafif” ve “akıcı” ifadelerini, **tekrarlanabilir ölçümler, belirli cihaz profilleri, kabul eşikleri, hata kuralları ve sürüm kanıtlarına** dönüştürmek. Bu belge ölçüm yöntemi ve sayısal performans bütçeleri için **tek yetkili kaynaktır**. Ölçülen sonuç ile hedef birbirine karıştırılamaz.
>
> **Yetki sınırı:** DOC-04 kalite kapısının release üzerindeki yetkisini; DOC-07 paket/dosya yapısını; DOC-09 fiziksel SQL'i; DOC-10 transaction/backup semantiğini; DOC-11 IPC kanal ve DTO adlarını; DOC-12 job durumlarını; DOC-15 FTS sorgu anlamını; DOC-19 capability/resource politikalarını; DOC-24/25 LLM ölçümlerini; DOC-28/29 ses işlem protokollerini; DOC-30 güvenliği **yeniden tanımlamaz**. Sadece bunların performansını ölçer. Yeni tablo, IPC kanalı, job türü, tool veya güvenlik istisnası açmaz.
>
> **Gerçeklik kontrolü:** Henüz paketlenmiş Electron uygulaması, referans Windows cihazı veya 100.000 kayıttan oluşan üretim fixture'ı üzerinde benchmark sonucu yoktur. Buradaki sayılar **önerilen V1 tasarım hedefleri**dir. Herhangi bir hedef için `PASS` demek, bu belgede belirtilen gerçek ölçüm kanıtını gerektirir. Tasarım aşamasında belge `draft` kalır.

---

## 0. Temel amaç ve ölçüm felsefesi

Iterkeep'in birinci kullanım hedefi, uygulamayı açan kişinin proje bağlamına hemen ulaşması, arama yapabilmesi, not/görev ekleyebilmesi ve bir önceki çalışmasına kesintisiz dönebilmesidir. AI ek maliyet oluşturan **isteğe bağlı** bir yetenektir; her kullanıcı için gizli bir açılış bağımlılığı değildir.

Beş ayrı maliyet ölçülür: **algılanan tepki süresi**, **gerçek veri commit süresi**, **kullanıcıya görünür sonuç süresi**, **bellek/CPU/IO maliyeti**, **doğruluk ve güvenlik maliyeti**. Birini iyileştirmek için diğerini gizlice bozmak kabul edilmez.

Örneğin görev ekleme butonu anında `pending` gösterip işlemi 2 saniyede diske yazıyorsa 50 ms UI hedefi geçilmiş olabilir ama kalıcılık hedefi geçilmemiştir. DB henüz commit edilmemişken “Kaydedildi” yazılması ise performans değil, **veri bütünlüğü hatasıdır**.

### 0.1 Operasyonel terimler

| Terim | Kesin tanım |
|---|---|
| `T_click` | Girdi olayının renderer tarafından görüldüğü monoton zaman |
| `T_pending_paint` | İlgili kontrolün `pending`/optimistic durumunun gerçekten boyandığı kare |
| `T_commit` | DB worker'ın başarılı SQLite transaction commit'i sonrası verdiği onay |
| `T_saved_paint` | UI'nin commit onayına dayanarak başarı durumunu boyadığı kare |
| `T_search_query_start` | Kullanıcı sorgusunun doğrulanmış ve debounce sonrasında Main'e gönderildiği an |
| `T_search_result_paint` | Gerçek sonuçların DOM'da görünür hâle geldiği kare |
| `T_process_start` | Test harness'ın paketlenmiş Electron executable başlatma isteğini yaptığı monoton an |
| `T_core_usable` | Güvenli IPC + SQLite + Inbox/proje listesi + klavye/tıklama kullanılabilirlik kontrolü geçtiği an |
| `process-cold` | Iterkeep'in hiçbir sürecinin çalışmadığı, OS disk önbelleğinin normal durumda olduğu açılış |
| `OS-cold` | Sistem yeniden başlatılıp temiz oturumda yapılan açılış; ayrı raporlanır |
| `warm` | Uygulama kapatılıp tekrar açıldığında normal sistem cache'lerinin bulunduğu açılış |
| `model-cold / model-warm` | Modelin Ollama/sidecar belleğinde bulunmadığı / hazır olduğu durumlardaki ölçüm |
| `P95` | Sıralı örneklemde `ceil(0.95 × n) - 1` indeksli nearest-rank yüzdelik |
| `hata` | Timeout, crash, iptal, eksik sonuç, yanlış kayıt veya başarısız operasyon; sonuçlardan atılamaz |

**Saat kuralı:** Süreler yalnız **monoton saat** ile ölçülür. Farklı süreçlerin `performance.now()` değerleri doğrudan çıkarılamaz; süreçler arası süre için aynı süreçteki giriş/çıkış işaretleri veya kalibre edilmiş ortak monotonic origin kullanılır. `Date.now()` sadece rapor zaman damgasında kullanılabilir.

### 0.2 Çelişki ve değişiklik yönetimi

- DOC-04 §6 ve DOC-15 §8 önceki hedef taslaklarını içerir. Bu dosyadaki `PERF-B-*` eşikleri V1 benchmark'ının kanonik tanımıdır.
- Hedef gevşetmek için yalnız doküman değişikliği yeterli değildir; regression kanıtı, gerekçe, ilgili ADR ve DOC-04 onayı gerekir.
- Donanımda uygulanamayan bütçe sessizce atlanmaz. `FAIL`, `NOT_RUN`, `NOT_APPLICABLE` açıkça ayrılır.
- Performans nedeniyle Electron sandbox'ını, izin kontrollerini, SQLite synchronous politikasını veya onay işlemlerini kapatmak yasaktır (DOC-30).

## 1. Değişmez mühendislik kuralları (`PERF-I-001–048`)

| ID | Zorunlu kural |
|---|---|
| PERF-I-001 | Asıl release sayıları yalnız paketlenmiş üretim build'i ve kayıtlı benchmark cihazından gelir. |
| PERF-I-002 | `npm run dev` sonuçları geliştirme tanısıdır; release performans kanıtı değildir. |
| PERF-I-003 | Benchmark fixture'ları sabit seed, sabit schema migration ve doğrulanmış checksum ile oluşturulur. |
| PERF-I-004 | AI/Ollama/Python/Git bulunmadığında core açılışı hiçbir servis probe'unu beklemez. |
| PERF-I-005 | `T_core_usable`, skeleton ekrana geldiği an değil, gerçek DB sorgusu çalıştığı andır. |
| PERF-I-006 | Kaydetme geri bildirimi ve kalıcı commit ayrı metriklerdir. |
| PERF-I-007 | Gerçekten commit edilmemiş operasyonda `saved/succeeded` UI durumu gösterilemez. |
| PERF-I-008 | Main process içinde ağır eşzamanlı IO, model inference veya FTS taraması yapılmaz. |
| PERF-I-009 | Renderer büyük SQLite tablolarını veya tam FTS dizinini hafızaya kopyalamaz. |
| PERF-I-010 | DB işlemleri DOC-10'daki tek DB worker üzerinden yürür; performans bahanesiyle ek writer açılmaz. |
| PERF-I-011 | IPC şema, boyut, sender ve yetki kontrolü açıkken benchmark yapılır. |
| PERF-I-012 | Query süresi, IPC uçtan uca süresi ve boyama süresi ayrı ölçülür. |
| PERF-I-013 | `p50/p95/p99` raporu başarısız ve timeout denemelerini ayrı sayar; yalnız başarılı örnekler için percentile üretir. |
| PERF-I-014 | İstenen tekrardan az örnekle `PASS` kararı verilmez. |
| PERF-I-015 | Benchmark sırasındaki antivirus/güç modu/OS yükü/arka plan süreçleri raporda yer alır. |
| PERF-I-016 | Veri fixture'ında UTF-8 Türkçe, İngilizce, uzun/boş alanlar ve ilişkili kayıtlar bulunur. |
| PERF-I-017 | 100 bin log satırı ile 100 bin FTS kaydı aynı benchmark sayılmaz. |
| PERF-I-018 | Arama sonuçları sıralama doğruluğu ve görünürlük filtresi korunarak ölçülür. |
| PERF-I-019 | `LIKE '%term%'` gibi yavaş fallback, onaysız otomatik ana arama yoluna geçemez. |
| PERF-I-020 | FTS `MATCH` ifadesi DOC-15'in güvenli query parser'ından üretilir. |
| PERF-I-021 | SQLite query plan'ı insan incelemesi içindir; sabit EXPLAIN açıklama string'leri test kontratı yapılmaz. |
| PERF-I-022 | İndeks değişikliği performans testi yanında insert/update maliyeti ve DB boyutuyla değerlendirilir. |
| PERF-I-023 | WAL checkpoint/FTS bakım/migration UI iş parçacığını bloke edemez. |
| PERF-I-024 | Optimistic UI commit failure durumunda deterministik rollback/reconcile sunar. |
| PERF-I-025 | Liste ve Kanban'da sayfalama/sanallaştırma maliyeti ayrıca ölçülür. |
| PERF-I-026 | Render sayısı, commit süresi ve input gecikmesi tek `FPS` sayısına indirgenmez. |
| PERF-I-027 | Profiler/trace overhead'i bulunan ve bulunmayan ölçümler karıştırılmaz. |
| PERF-I-028 | Animasyonlar düşük güç/reduced motion durumunda erişilebilirliği bozmaz. |
| PERF-I-029 | Theme değişimi React ağacının veya editör/agent oturumunun yeniden başlatılmasını gerektirmez. |
| PERF-I-030 | IPC/agent token stream yüksek frekanslı olayları batch/backpressure ile sınırlar. |
| PERF-I-031 | Model indirme/benchmark ve ses işleri performans testinde core kullanımını kilitleyemez. |
| PERF-I-032 | CPU/GPU paylaşımı yalnız Iterkeep'in kendi kaynak lease'lerini koordine eder. |
| PERF-I-033 | Ollama modeli/VRAM kullanım ölçümü tahminse `estimated`; gerçek ölçümse `observed` olarak etiketlenir. |
| PERF-I-034 | Model paketi boyutu çalışma RAM/VRAM tüketimine eşit kabul edilmez. |
| PERF-I-035 | STT modeli için Türkçe WER ve RTF farklı test veri kümelerinde raporlanır. |
| PERF-I-036 | TTS'de ilk duyulabilir ses ile ilk sentez parçası zamanı karıştırılmaz. |
| PERF-I-037 | Ses iptali, durdurulan playback ve sidecar iş temizliği ayrı doğrulanır. |
| PERF-I-038 | Kaynak ölçümü Main + Renderer + GPU + Utility/DB worker + sahip olunan sidecar süreçlerini kapsar. |
| PERF-I-039 | Başka uygulamaların Ollama modelini boşaltmak veya daemon'u öldürmek bir optimizasyon değildir. |
| PERF-I-040 | Kullanıcının gerçek not, ses, prompt veya hassas path içeriği performans loguna yazılmaz. |
| PERF-I-041 | Her ölçüm run'ı git SHA, fixture ID/hash, cihaz, OS ve build kimliği ile izlenir. |
| PERF-I-042 | CI'daki paylaşımlı runner performans sapması tek başına kesin release hükmü değildir. |
| PERF-I-043 | Kararlı kontrol donanımında eşik ve regresyon testi birlikte çalışır. |
| PERF-I-044 | Hard gate başarısızlığı geçerli onay olmadan release'i durdurur. |
| PERF-I-045 | `0 crash`, `0 false saved`, `0 permission bypass` koşulları P95 ile ortalamaya indirgenmez. |
| PERF-I-046 | Her benchmark script'i timeout, cleanup ve kendi workspace'ini kullanır; gerçek kullanıcı DB'sini kullanmaz. |
| PERF-I-047 | Bellek sızıntısı tek snapshot ile değil, tekrarlar ve GC belirsizliği açıklanarak izlenir. |
| PERF-I-048 | Performans eşikleri kullanıcıya doğrulanmadan vaat olarak sunulmaz. |

---

## 2. Test matrisi: cihaz, build, koşul

### 2.1 Donanım profilleri

| Kod | Tip | Minimum gereksinim değil; test profili | Release kullanımı |
|---|---|---|---|
| `HW-REF-WIN` | Referans Windows | Windows 11, i5-12450H, RAM 16 GB, RTX 4050 6 GB, SSD | Ürün hedefi için birincil gerçek cihaz adayımız; fiilen ölçüldüğünde `verified` |
| `HW-LOW-WIN` | Düşük donanım | Windows 10/11, 4 çekirdek, 8 GB RAM, SSD, GPU zorunlu değil | Degrade davranış testi; performans hedefleri ayrı rapor |
| `HW-HIGH-WIN` | Yüksek donanım | 32 GB RAM, modern CPU/NVMe | Regresyon ve paralel iş yükü karşılaştırması |
| `HW-CI` | Paylaşımlı CI runner | İşçi ayrıntıları otomatik kaydedilir | Fonksiyonel/perf smoke; deterministik mutlak p95 hard gate için yeterli değil |
| `HW-MAC-LINUX` | Gelecek dağıtım | Platform ve donanım ayrı belirtilir | Çalışan native paket kanıtı olmadan destek sözü yok |

`HW-REF-WIN` kullanıcının örnek cihazından türetilen tasarım referansıdır. Testi gerçekten bu cihazda çalıştırmadan cihaz onayı alınamaz. Aynı model CPU/GPU olsa da disk ve güç profili değişebileceğinden sonuçlar ortama özeldir.

### 2.2 Ortam standardı

- Windows power plan, priz/batarya, termal durum, GPU sürücüsü ve OS build kaydedilir.
- Ekran çözünürlüğü, Windows scaling (`100%`, `125%`, `150%`), yenileme hızı ve uygulama pencere ölçüsü raporlanır.
- Paketli uygulama kod imzası/antivirus etkisi test dışına saklanmaz; OS antivirüsü devre dışı bırakmak benchmark koşulu olamaz.
- Düşük bellek durumu için kontrollü bellek baskısı yaratılır; üretim cihazını bilinçsizce OOM'a iten yöntem kullanılmaz.
- Sıcaklık/CPU throttling ve GPU başka süreçlerle paylaşımı gözlemlenirse run etiketlenir; yalnız geçerli tekrarlarla karar verilir.
- Bağlı Ollama varsa ilgili servis/app ownership belirtilir. Mock provider sonuçları gerçek inference raporu değildir.
- `--disable-web-security`, sandbox off, renderer Node on veya izin mekanizması kapalı build ile alınan sayılar reddedilir.
- Her fixture ayrı geçici workspace'e yazılır. Orijinal kullanıcı dosyaları kesinlikle mutasyona uğratılmaz.

### 2.3 Build kimliği

Zorunlu: `gitSha`, `appVersion`, `electronVersion`, `nodeVersion`, `sqliteVersion`, `fts5Available`, `buildMode`, `installerSha256`, `schemaVersion`, `migrationChecksums`, `architecture`, `workerBinaryHash`, `fixtureFingerprint`, `benchmarkProtocolVersion`.

İmzalanmış veya ön-imzalı release candidate installer ölçülür; dev server ile renderer yüklemek release kanıtı olarak sunulamaz. Benchmark-specific opt-in build'inde fazladan trace varsa ayrı kohorta alınır.

## 3. Fixture protokolü

### 3.1 Sabit veri kümesi kimlikleri

| Fixture | Sayılar | Doğrulama |
|---|---|---|
| `FIX-SMALL-V1` | 5 proje, 50 görev, 100 not/log kaydı | Özet açılış, görev CRUD |
| `FIX-MEDIUM-V1` | 100 proje, toplam 10.000 aranabilir kayıt | Liste, filtre, arama, concurrency |
| `FIX-LARGE-FTS-V1` | 1.000 proje + 40.000 görev + 20.000 not + 9.000 karar + 30.000 log = **100.000 aranabilir kayıt** | DOC-15'teki L dağılımı ile aynı |
| `FIX-LARGE-LOG-LINES-V1` | 100.000 günlük metin satırı; ayrı 1.000–2.000 günlük kaydı | Uzun içerik / export / parse; 100k DB row sayılmaz |
| `FIX-ADVERSARIAL-V1` | Çok uzun Markdown, bozuk Unicode dizileri, silinmiş ilişkiler, izin hataları, aşırı büyük import, typo | Sınır/hata baskısı |
| `FIX-CONCURRENT-V1` | 8 okuma isteği, saniyede 2–10 kısa yazma, farklı kayıt kimlikleri | DB worker, WAL, UI kuyruklama |
| `FIX-AI-OFF-V1` | Ollama, Python, voice binary/modeller yok; bazen sahte kapalı servis | Local-first başlangıç garantisi |

**Sayıların açıklaması:** `FIX-LARGE-FTS-V1` proje dahil toplam 100.000 aranabilir kayıttır: 1.000 + 40.000 + 20.000 + 9.000 + 30.000 = 100.000. Bu, her kayıt için yüzlerce satır metin depolamak demek değildir. `FIX-LARGE-LOG-LINES-V1` başka bir stres yüküdür. 1.000 projede kayıt dağılımı homojen olmayacak; 10 projede kayıtların %50'si yoğunlaşacak.

### 3.2 Test metni ve dağılımı

- En az %60 Türkçe, %30 İngilizce, %10 karışık veya çok dilli kayıt; Unicode NFC normalizasyonu ve gerçek Türkçe `I/ı/İ/i` köşeleri.
- En az %15 kayıt ortak terimler (`model`, `proje`, `görev`, `agent`) içerecek; seçiciliği düşük sorgular benchmark'ı yanıltmayacak.
- En az %10 soft-delete/arşiv bağlantılı kayıt, %10 tarih sınırı, %5 boş/tek karakter başlık, %5 uzun Markdown.
- %1 güvenli test amaçlı HTML-benzeri metin, kötü görünümlü FTS operatörleri ve aşırı uzun token.
- Sorgu kataloğu en az 60 sabit test sorgusu: 20 exact, 12 prefix, 8 Türkçe varyant, 8 filtreli, 6 no-result, 6 adversarial.
- Seed `20261010`, fixture sürümü `v1`, UTC referans tarihi sabit. Üretilen her DB manifest SHA-256 kaydedilir.
- Fixture generator önce DOC-09 başlangıç migration'ını çalıştırır, sonra Application Core portuyla kayıt üretir; toplu doğrudan SQL seed hızlandırması kullanılacaksa DB constraint/FTS trigger eşdeğerliği ve sample row invariants ayrıca doğrulanır.

### 3.3 Üretim ve doğrulama aşamaları

1. Boş ve geçici workspace oluştur; DOC-09 migration checksum'ını doğrula.
2. Saat/UUID/seed kaynaklarını deterministik enjekte et; UUID v4 biçimini koru.
3. Workspace Inbox dahil tüm tabloları geçerli FK'lerle doldur; kayıtların proje/etiket/link ilişkilerini üret.
4. `PRAGMA foreign_key_check`, `PRAGMA quick_check`, FTS5 integrity check ve beklenen kayıt sayısı testlerini çalıştır.
5. Fixture hashing sırasında SQLite WAL bağlantıları kapalı/ checkpoint tamamlanmış olmalı; dosyaların değişmez `fixture manifest`ini yaz.
6. Fixture'ın immutable ana kopyasını sakla; her mutasyonlu benchmark için dosya klonu kullan.
7. Başarılı test bile fixture kimlik ve veri dağılımı denetimini atlayamaz.

**Güvenlik:** Gerçek proje isimleri, kişisel notlar veya ses transkriptleri benchmark fixture'ı değildir. Sentetik içerik kullanılmalıdır (DOC-30).

---

## 4. Tek yetkili performans bütçeleri (`PERF-B-*`)

**Karar alanları:** `HARD` = yayın engelleyen; `CONDITIONAL` = özellik açıldığında gerekli; `OBSERVE` = toplanır, ilk cihaz baz çizgisine kadar sabit eşik yok. `HW-REF-WIN`, stabil kalibre edilmiş referans cihazdır. Eşikler resmi ölçümle henüz kanıtlanmamıştır.

| ID | İşlem/ölçüt | Bütçe ve istatistik | Fixture / koşul | Kapı |
|---|---|---|---|---|
| PERF-B-001 | Paketli process-cold → core usable | P95 ≤ 1500 ms | `FIX-SMALL-V1`, provider kapalı, SSD, `HW-REF-WIN` | HARD |
| PERF-B-002 | Paketli tekrar açılış | P95 ≤ 850 ms hedef | `FIX-SMALL-V1`, OS cache warm | CONDITIONAL: başlangıç geçişi |
| PERF-B-003 | Görev ekle input → pending paint | P95 ≤ 50 ms | UI, gerçek renderer paint | HARD |
| PERF-B-004 | Tek görev create: UI intent → DB commit | P95 ≤ 250 ms | `FIX-MEDIUM-V1`, sağlam disk, 1 writer | HARD |
| PERF-B-005 | 100k kayıt arama, `search.query` uçtan uca | P50 < 45 ms; P95 < 100 ms | `FIX-LARGE-FTS-V1`, warm cache, 60 sorgu | HARD |
| PERF-B-006 | Yazma altında FTS arama | P95 < 250 ms | `FIX-CONCURRENT-V1` + büyük arama fixture | CONDITIONAL |
| PERF-B-007 | Proje geçişi intent → içerik paint | P95 < 150 ms | `FIX-MEDIUM-V1` | HARD |
| PERF-B-008 | 1000 görev/20k item listeyi kaydırma | ≥ %95 frame ≤ 16,7 ms; kritik donma 0 | `FIX-LARGE-FTS-V1`, 60 Hz | CONDITIONAL |
| PERF-B-009 | UI/Renderer uzun görev bloğu | Normal core etkileşiminde > 100 ms main-thread task yok | Paketli UI, search/kanban | HARD |
| PERF-B-010 | Core idle CPU | 5 dakikalık izleme, ortalama ≤ %1 bir mantıksal CPU eşdeğeri hedef | AI kapalı, foreground idle | OBSERVE → kalibrasyon |
| PERF-B-011 | Core idle bellek | Başlangıç baseline + 20% regresyon alarmı; mutlak RAM sınırı ilk ölçümle belirlenecek | AI kapalı, 10 dk idle | OBSERVE |
| PERF-B-012 | 100 tur UI/DB kullanımında bellek sızıntısı | GC kontrollü/tekrarlı ölçümde sürekli sınırsız büyüme yok; peak ve trend raporu | CRUD+route döngüsü | HARD: gözle görülür leak |
| PERF-B-013 | Arka plan job kabulü | P95 ≤ 200 ms | `FIX-CONCURRENT-V1`, boş/normal queue | CONDITIONAL |
| PERF-B-014 | Progress UI fırtınası | 1000 progress event ile no freeze > 100 ms; her pencerede buffer ≤ 1 MiB | DOC-12 event generator | HARD |
| PERF-B-015 | Ayarlar/feature toggle görsel tepki | P95 ≤ 50 ms | Settings | CONDITIONAL |
| PERF-B-016 | Tercih değişikliği kalıcı commit | P95 ≤ 250 ms | SQLite settings | CONDITIONAL |
| PERF-B-017 | `capabilities.get` sıcak önbellek | P95 ≤ 50 ms | Provider çağrısı yapmadan cache | CONDITIONAL |
| PERF-B-018 | Mikrofon girdi → kayıt başlangıcı UI durumu | P95 ≤ 100 ms | İzin diyaloğu süresi hariç; STT modülü kurulu | CONDITIONAL |
| PERF-B-019 | İzin sonrası mikrofon hazır | P95 ≤ 500 ms hedef | gerçek ses aygıtı | CONDITIONAL |
| PERF-B-020 | Stop ve son chunk ACK → seal | P95 ≤ 300 ms hedef | 10 sn ses, disk izinli | CONDITIONAL |
| PERF-B-021 | 10 sn Türkçe Whisper base | RTF ≤ 1 hedef, WER ayrı kalite metriği | CPU/GPU iki profil | CONDITIONAL; ölçülür |
| PERF-B-022 | TTS istek → UI queued/busy | P95 < 150 ms | TTS hazır/sıra dolu | CONDITIONAL |
| PERF-B-023 | TTS cancel → playback duruşu | P95 < 300 ms | Gerçek ses çıkışı | CONDITIONAL |
| PERF-B-024 | AI sağlayıcısı yokken core kullanılabilirliği | %100 smoke senaryosu; 0 sağlayıcı süreci gereksinimi | `FIX-AI-OFF-V1` | HARD |
| PERF-B-025 | Veri doğruluğu ve gizlilik | 0 yanlış `saved`, 0 silinmiş kaydı aramada gösterme, 0 yetki bypass | Tüm fixture'lar | HARD |
| PERF-B-026 | Paketleme ve startup güvenliği | Sandbox, IPC ve DB doğrulaması açık; optimizasyon adıyla bypass 0 | Release candidate | HARD |

**Nitelik notları:**

- B-001 ve B-002 farklı run türleridir. Tam OS-cold sonuçlar ayrıca raporlanır; `OS-cold` koşulu 1,5 saniyelik hedefi **kendi kendine** geçemedi diye B-001'i yanlış değerlendirmez.
- B-005 `T_search_query_start` → `T_search_result_paint` ölçümüdür, debounce beklemesi dışında; SQL-only, IPC ve render alt süreleri ayrıca verilir. DOC-15'in P50/P95 başlangıç hedefi bu sınırla somutlaştırılır.
- B-008 için 60 Hz gerçek display varsa geçerlidir; 120 Hz monitörde ek doğal kare aralıkları ayrıca raporlanır. Sadece ortalama FPS yeterli değildir.
- B-009'daki 100 ms long-task sınırı bilinçli bir stabilite kontrolüdür. Sistem scheduler ve renderer trace'leri birlikte incelenir; test scaffolding kaynaklı bloklar belirsiz kalırsa `INCONCLUSIVE`.
- B-010 CPU normalizasyonu: 100% = **bir mantıksal çekirdeğin** 100% doluluğu; görev yöneticisindeki bütün makine yüzdesiyle karıştırılmaz. Toplam CPU zamanı / duvar saati oranı ayrı kaydedilir.
- B-011 RSS süreç toplamı shared pages'i iki kez sayabilir. Windows private working set ve süreç başına RSS ayrıca raporlanır; toplam raporda yöntem belirtilir.
- B-012 kontrollü GC mümkün değilse "kesin leak yok" denmez; artış trendi + heap snapshots + OS working set incelenir. 100 tur başarısızsa otomatik PASS verilemez.
- B-021 model çıkarım hedefidir; `word error rate` doğruluk için ayrı metrik. Gerçek model/driver yoksa `NOT_RUN`, asla mock ile `PASS` değil.
- AI token/s, model TTFT ve TTS ilk duyulabilir ses için **henüz sabit cihazlar arası SLA yoktur**; bunlar karşılaştırmalı ve ayrı cold/warm raporlardır. Varsayımsal sabit eşik verilmeyecek.
- B-024, yanlışlıkla çalışan model sunucusunu durdurma yetkisi vermez; yalnız uygulamanın ona bağımlı olmadığını kanıtlar.

### 4.1 Hedef dışı kalma politikası

Bir HARD hedef kararlı ölçümde geçilmezse ürünün o sürümü `release-ready` olamaz. Hedef gerçekten yanlış/kötü tanımlanmışsa politika değişikliği DOC-04 kalite sahibiyle belgelenir; başarısız sayı gizlenerek eşik değiştirilemez. Desteklenen platform için test yoksa statü `NOT_RUN`dır. `CONDITIONAL` test bir özellik kullanıcıya sunuluyorsa gereklidir; özellik henüz shipping değilse `NOT_APPLICABLE` + build flag kanıtı sunulur.

---

## 5. Ölçüm mimarisi: katman bazlı spans

### 5.1 Üretim yükü yaratmayan ölçüm noktaları

```text
TEST HARNESS (monotonic clock)
  t0: packaged executable spawn
      Electron Main: startup phases, DB worker ready (diagnostic marks)
      Preload: IPC bridge ready
      Renderer: route paint / keyboard enabled
  t1: verified core-useful UI and live DB query

USER INTENT (renderer monotonic clock)
  intent → pending paint
      preload invoke / response
      Main gateway authorization/validation
      Application Core command
      DB Worker queue → BEGIN → DML → COMMIT
  commit ack → saved paint

SEARCH
  intent → debounce done → IPC → parse → FTS query → page DTO → paint

AI/VOICE
  request → queued/lease → provider/model cold/warm → first token/audio → end
```

- IPC ingress/egress için `correlationId`, `requestId`, `spanKind`, `durationMs` kullan. Her katmanda **local duration** ölç; process clock'larını birleştirirken güvenli kalibrasyon yoksa toplama tahmini yapma.
- UI'da `requestAnimationFrame` kullanılarak paint-boundary için kareye yaklaştırma yapılabilir; `rAF` callback'i her platformda “piksel fiziksel ekrana çıktı” garantisi değildir. Kritik ölçümler Playwright trace/video veya güvenilir Chromium paint gözlemiyle doğrulanır.
- Geliştirici `performance.mark`/`performance.measure`, Node `perf_hooks`, Chromium DevTools trace ve React profiling build araçlarını kullanır. Profiling build sonucu normal production build ile tek kohorta konmaz.
- Span isimleri `iterkeep.<layer>.<operation>.<phase>` olur (örneğin `iterkeep.db.tasks.create.commit`). Kullanıcı içeriği/span attribute olarak yazılmaz.

### 5.2 Örnek TypeScript ölçüm helper'ı

```ts
// packages/testing/src/performance/timing.ts — referans iskelet
import { performance } from 'node:perf_hooks';

export async function timed<T>(
  metric: string,
  run: () => Promise<T>,
  record: (sample: { metric: string; durationMs: number; ok: boolean }) => void,
): Promise<T> {
  const start = performance.now();
  try {
    const value = await run();
    record({ metric, durationMs: performance.now() - start, ok: true });
    return value;
  } catch (error) {
    record({ metric, durationMs: performance.now() - start, ok: false });
    throw error; // Test, başarısız run'ı saklayamaz.
  }
}
```

Bu helper, test gövdesinin input durumunu ve `T_saved_paint` gibi UI sinyallerini tek başına ölçmez. Birleştiren harness `DOC-11` IPC metodlarının doğrulanmış sonucunu beklemelidir.

### 5.3 Event-loop ve UI ölçümü

- Electron Main için event-loop lag histogramı (Node `monitorEventLoopDelay`, nanosecond değerlerini ms'ye çevir), aktif IPC sayısı ve en uzun blocking period.
- Renderer için PerformanceLongTaskTiming/DevTools trace, input-to-feedback, React commit profili, DOM node sayısı ve gözlenmiş frame aralıkları.
- DB worker için queue waiting, query execution, transaction commit, FTS step, WAL checkpoint ayrı metrikler.
- Background jobs için queue wait, lease wait, retry count, progress event coalescing ve bounded buffer.
- Her sensör performans maliyeti yaratabilir: trace etkilidir; normal ve instrumented ölçüm çıktıları ayrı olmalıdır.

### 5.4 İstatistik uygulaması — referans

```ts
// packages/testing/src/performance/stats.ts — örnek
export function summarizeMs(values: readonly number[]) {
  if (values.length === 0 || values.some(v => !Number.isFinite(v) || v < 0)) {
    throw new Error('PERF_INVALID_SAMPLE');
  }
  const sorted = [...values].sort((a, b) => a - b);
  const pct = (p: number) => sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
  const sum = sorted.reduce((acc, x) => acc + x, 0);
  return {
    n: sorted.length,
    minMs: sorted[0],
    p50Ms: pct(0.5),
    p95Ms: pct(0.95),
    p99Ms: pct(0.99),
    maxMs: sorted.at(-1)!,
    meanMs: sum / sorted.length,
  };
}
```

P95 örnekleme için **warm mikro benchmark en az 100 başarılı deneme**, **cold start en az 30 bağımsız process spawn** ve **cihaz üzerinde E2E kritik etkileşim en az 50 tekrar** yapılır. Bu kadar tekrarda P99 kararsız olabilir; raporlanır ama istatistiksel kesinlik iddia edilmez. Arama setindeki 60 sorgu her koşuda sabit sırada koşturulmaz; sabit seed ile randomize edilir, her sorgu sınıfı ayrı analiz edilir. Timeout veya crash varsa başarısız deneme oranı %0 dışında HARD geçemez.

---

## 6. Açılış ve kapanış benchmark'ı

### 6.1 Çalıştırılacak modlar

| Mod | Kurulum | Özellikle kontrol edilecek nokta |
|---|---|---|
| Fresh install | İlk kurulum açılır | Güvenli setup ekranı gerçek UI; model taraması takılma yaratmaz |
| Returning, AI off | Setup tamam, model yok | En kritik P95 core açılış testi |
| Returning, AI on/Ollama off | Capability isteği var, daemon kapalı | UI açıldıktan sonra non-blocking health |
| Returning, Ollama on/model missing | Tercih kaydedilmiş, model silinmiş | Sonsuz splash yok, ayarlarda eksik model |
| Migrating DB | Eski DB şema sürümü | Splash + aşama bildirimi; migration'a 1,5 s kuralı zorlanmaz |
| Recovery mode | DB bozuk veya lock | Sınırlı sürede hata ekranına geçilir; boş DB sessiz açılmaz |
| Busy background queue | Önceden indirme job'ı | Startup reconciliation, no automatic side effects |

### 6.2 Paketli Windows test protokolü

1. Başlatmadan önce Iterkeep process tree'nin bulunmadığı doğrulanır; üretim data path'i yerine ayrı test user-data directory kullanılır.
2. Fixture seçilir, data snapshot kurulup SHA doğrulanır; `HW-REF-WIN` cihazı ve güç modu raporlanır.
3. Başlatma zamanı harness tarafından işaretlenir. IPC ile “DB accessible” sorgusu ve UI kullanılabilirliği aynı iterasyonda sınanır.
4. Program kontrollü kapatılır; proses ve sidecar child'larının sızmadığı doğrulanır; 30 kez tekrarlanır.
5. Model probe süreleri core end marker'ına eklenmez, ama yan etkileri / CPU yükleri ayrı yazılır.
6. Warm, process-cold ve OS-cold sonuçları farklı klasörlere kaydedilir.
7. Yüzdelikler, başarısız denemeler ve paket bilgisiyle rapor üretilir.

**Yanlış benchmark:** `app.whenReady` veya `BrowserWindow.show` tek başına core usable değildir; SQLite, IPC ve etkileşim de başarılı olmalıdır. Windows işletim sistemi boot süresi uygulama başlangıç metriğine gizlice eklenmez.

### 6.3 Electron performans bütçesi

- Main bootstrap'ta heavyweight import ve provider probe'larını geciktir; bundle analizinde neyin eagerly import edildiği raporlanır.
- `ready-to-show` ile gerçek `core usable` farklı instrument edilir. `show` geciktirmeyi “hızlı açılış” gibi pazarlamak yasaktır.
- İlk interaktif kare gelmeden büyük document listesi, animasyon, voice sidecar veya Ollama model yükleme başlatılmaz.
- Asar/native helper yolları packaged ortamda doğrulanır; `better-sqlite3` eksikse açılış testi fail olur, boş storage'a fallback yasak.
- App quit sırasında DB worker'ı boşa kapatmak, kaydedilmemiş kullanıcı içeriğini bırakmak veya fazla uzun bloklama yapmak ayrı kapanış metriğidir.

## 7. SQLite / FTS5 benchmark'ı

### 7.1 Sorgu katalogu

| Kimlik | Senaryo | Metod | Beklenen doğruluk |
|---|---|---|---|
| `SQL-P-01` | Inbox proje çözümleme | indexed exact lookup | 1 gerçek sistem Inbox |
| `SQL-P-02` | Proje listesi + sayaçlar | set-based projected SELECT | N+1 yok |
| `SQL-P-03` | Görev listeleme, due/prio/status | composable indexed filter | eksiksiz, kararlı keyset |
| `SQL-P-04` | Görev oluşturma | revision, idempotency, history transaction | tam 1 commit |
| `SQL-P-05` | Görev durum geçişi | CAS + audit | doğru status/revision |
| `SQL-P-06` | Not kaydı | revision CAS, document version | metin korunur |
| `SQL-P-07` | Karar revizyonu | append-only revision | geçmiş değişmez |
| `SQL-P-08` | Günlük ekleme | append-only + search trigger | kaydı bul |
| `SQL-P-09` | FTS exact/prefix | güvenli MATCH | en doğru source IDs |
| `SQL-P-10` | FTS archived/soft-deleted | visibility projection | gizli kayıt 0 |
| `SQL-P-11` | FTS no-result/adversarial | safe bounded query | hızlı/bounded hata |
| `SQL-P-12` | FTS rebuild | bounded job | UI kullanılabilir |
| `SQL-P-13` | Export snapshot | streaming/bounded iteration | aynı veri ve kimlikler |
| `SQL-P-14` | Backup + integrity | Online Backup API | tutarlı yedek |
| `SQL-P-15` | Migrasyon | schema checks + snapshot | veri korunur |
| `SQL-P-16` | Restore | DOC-17 staged protocol | atomic recovery |

### 7.2 `EXPLAIN QUERY PLAN` ve indeks kanıtı

- `EXPLAIN QUERY PLAN` ile query path, full scan, temp B-tree, join order incelenir. **Planın tam metin çıktısına `assert.equal()` yapma**; SQLite sürümlerinde değişebilir.
- Her kritik sorguda indeksli plan seçimi ile gerçek ölçüm birlikte değerlendirilir; indeks kullanımı otomatik hız garantisi değildir.
- Prepared statement cache büyüklüğü sınırlıdır. Cache hit/miss ve statement sayısı raporlanır.
- SQLite `PRAGMA optimize` zamanlaması gerçek DB owner içinde, startup yolunu bloklamayacak şekilde tasarlanır. FTS5 `optimize` potansiyel uzun iştir; otomatik açılışta çalıştırılmaz.
- WAL checkpoint, yüksek IO ve DB backup birlikte koşturulduğunda UI gecikmesi ve read/write starvation test edilir.

### 7.3 Ayrı DB katman süreleri

```text
DB Query Total = worker queue wait + statement prepare/cache lookup
               + SQLite step/row mapping + response serialization

Write Total = queue wait + validation + BEGIN IMMEDIATE
            + DML + secondary audit/FTS triggers + COMMIT + reply

Search UI Total = post-debounce IPC request + Main validation
                + worker wait + FTS step + DTO + Renderer paint
```

- `BEGIN`/`COMMIT` süreleri her örnekte kaydedilir; `synchronous=NORMAL` ve `FULL` arasındaki fark veri dayanıklılığı etkisi açıklanmadan “kazanç” ilan edilemez.
- İndeks büyüklüğü, `workspace.db`, `-wal`, `-shm`, `assets/` ayrıştırılır; `VACUUM` uygulanması benchmark modunda kontrollüdür.
- Her test sonunda `quick_check` ve uygun durumda `foreign_key_check`; FTS doğruluğu örnek kaynak setiyle eşleştirilir.
- Tek yazma sahibi ilkesine uymayan yapay paralel connection karşılaştırması ürün benchmark'ı sayılmaz.

## 8. React, UI ve render ölçümleri

### 8.1 Etkileşim matrisi

| Etkileşim | Ölçülecek alt metrik | Aşırı yük koşulu |
|---|---|---|
| Inbox hızlı görev | keydown → pending paint; verified commit | 100 hızlı komut |
| Proje değişimi | click → heading + task list paint | 100 proje geçişi |
| Kanban sürükle | drag frame intervals + drop → DB ack | 5 lane, 1000 görev |
| Task list scroll | dropped frames, mounted DOM rows | 20.000 kayıttan sanallaştırma |
| Global arama | typing, debounce, sonuç paint, stale discards | 100k kayıt |
| Markdown editörü | tuş → input paint, autosave batch, undo | 100.000 karakter not |
| Agent token stream | UI update frequency, no chat freeze | 100 token/s sentetik akış |
| Tool execution card | 1000 event burst, collapse/expand | pending approval |
| Tema değişimi | tıklama → tamamlanmış boya, gereksiz remount | dark/light/system 50 tur |
| Setup wizard | next/back/skip/return, no background wait | Ollama unavailable |
| Resize | min width, sidebar/agent panel reflow | 800→1600px tekrarı |
| Accessibility | keyboard & screen reader response | 200 item virtual list |

### 8.2 Profiling ve test kriterleri

- Üretim render'ında `console.log` ile per-frame telemetry, her token için Zustand global write ve sürekli DOM ölçümü yasaktır.
- React Profiler, devtools ve Chromium trace verileri tanı içindir; instrumented build sonuçları üretim latency'sini tek başına ölçmez.
- React `memo`/`useMemo` ancak profil sayesinde gerekli olduğu kanıtlanırsa eklenir. Maliyetli global context güncellemeleri önlenir.
- Çok uzun listelerde mounted DOM node sayısı ve scroll FPS birlikte raporlanır; yalnız “virtualization kullanıldı” yeterli değildir.
- `aria-live` veya screen reader announcement performans uğruna kaldırılmaz; yoğun olaylar erişilebilir sıra ve özet mantığıyla birleştirilir.
- Düşük güç cihazında animasyonlar uyarlanabilir; reduced motion ve kontrastın bozulması optimizasyon sayılmaz.

### 8.3 Örnek Playwright kontrol akışı

```ts
// tests/performance/ui/task-feedback.spec.ts — taslak, test-id kesinliği DOC-22'de
import { test, expect } from '@playwright/test';

test('görev eklemede pending ve verified saved ayrımı', async ({ page }) => {
  await page.goto('/'); // Electron harness tarafından açılmış test penceresi
  await page.getByRole('button', { name: /new task|yeni görev/i }).click();
  await page.getByRole('textbox', { name: /title|başlık/i }).fill('Sentetik benchmark görevi');
  await page.getByRole('button', { name: /save|kaydet/i }).click();
  await expect(page.getByText(/kaydediliyor|saving/i)).toBeVisible();
  await expect(page.getByText(/kaydedildi|saved/i)).toBeVisible();
});
```

**Bu tek başına zaman benchmark'ı değildir.** İşaretleyici trace ve `page.evaluate(performance.getEntriesByName(...))` veya test hook ölçümü ayrıca gereklidir. Fixture clone, gerçek IPC ve DB commit ack kullanılarak sahte UI etiketleriyle testin geçmesi engellenir. `page.goto('/')` da paketlenmiş Electron URL protokolüne birebir uymayabilir; test harness DOC-21 routing ile uyarlanmalıdır.

## 9. Job, event ve concurrency performansı

- DOC-12'daki kuyruklanabilir 11 iş türü + daha sonra DOC-28'de tanımlanan `voice_component_install` için **mevcut job türleri** ölçülür. Yeni tür eklenmez.
- Öncelik: UI mikro işlemler > kullanıcı ses iptali/geri bildirim > kısa DB sorguları > AI streaming > düşük öncelikli bakım. Gerçek scheduler öncelikleri DOC-12'ye aittir; burada yalnız lag değerlendirilir.
- 1000 progress olayı saniyelik darbeden sonra event broker penceredeki 1 MiB tamponu aşmamalı, event gap/re-query mantığı çalışmalıdır.
- DB progress update üst sınırı DOC-12'ye göre `≤4 writes/s/job + terminal write` test edilir.
- Kuyruk açlık testi: Sürekli düşük öncelik iş varken kısa kullanıcı isteği tahmini üst sınırda ilerlemeli; sürekli yüksek öncelik iş varken bakım işi de sonsuza dek beklememeli.
- `job cancel` henüz dış yan etki commit ettiyse başarı geri alınmış gibi gösterilmez. Cancellation-to-state ve gerçekte sonlanan alt süreç ayrı ölçülür.
- Process restart testinde zorunlu yeniden uzlaştırma zamanı ayrıca raporlanır; uygulama açılışını ve kullanıcı CRUD'sini bloke edemez.

## 10. AI/Ollama benchmark'ı

### 10.1 Ölçümler

| Metrik | Formül / olay sınırı | Açıklama |
|---|---|---|
| Model load cold | istek → kullanılabilir model durumu | Disk/GPU/CPU dahil |
| TTFT | chat isteği gönderildi → **ilk anlamlı metin tokenı** | Tool-only cevaplar ayrıca sınıflanır |
| Throughput | üretilen output tokens / generation seconds | Pre-fill dahil/hariç iki sayı |
| Tool accuracy | doğru tool + doğru alanlar / değerlendirme case'i | DOC-25 benchmark seti |
| Tool success E2E | beklenen DB sonucu + izin ve audit doğruluğu | Model text'i başarı sayılmaz |
| 1–4 step planning | user request → final **doğrulanmış** sonuç | İstek türüne göre ayrı |
| Peak RAM/VRAM | gerçek ölçüm veya doğrulanmış tahmin | Ölçüm kaynağı etiketlenir |
| Interference | AI aktifken task/search p95 sapması | Core hızını koruma |

- Cihaz, tam model digest, quantization, context uzunluğu, concurrency, Ollama sürümü, GPU offload, `keep_alive`, token sayısı ve warm/cold ayrımı saklanır.
- En az 20 sentetik prompt her dil için; uygun olmayan modelin tool yeteneği yoksa `UNSUPPORTED` ve kullanıcıya önerilmez.
- Streaming `first token` zamanını prompt hazırlanması ve DB retrieval süresinden ayır; toplam kullanıcı latency ayrıca verilir.
- Güvenlik tool testi geçmeyen modelin hızlı olması onu uygun hâle getirmez; DOC-25/26/27 kapıları bağımsızdır.
- Ollama yükleme/boşaltma politikası, başka uygulamaların daemon kaynaklarını izinsiz değiştiremez. Resource Manager yalnız kendi lease ve job'larını yönetir.

### 10.2 Core etkileşim kesintisi

Aynı fixture ile iki koşul çalıştırılır: AI tamamen kapalıyken ve 1 agent run aktifken. Proje değiştirme, arama, not autosave ve task save senaryolarında `p95DeltaMs` ve `p95Ratio` hesaplanır. İlk ölçümde bağlayıcı üst etki sınırı yerine ölçülmüş baseline raporlanır; ciddi freeze (B-009) veya veri yanlışı (B-025) doğrudan HARD fail'dir.

## 11. STT/TTS benchmark'ı

### 11.1 Türkçe ses veri kümesi

- Kısa 2–5 sn, orta 10–15 sn, uzun 60 sn sentetik/izinli Türkçe konuşmalar; erkek/kadın, farklı hızlar, normal oda gürültüsü ve sessizlik.
- Kişisel gerçek ses kayıtları CI'ya yüklenmez. Açık lisanslı/izinli corpus veya test amaçlı sentetik sample kullanılır; lisans manifestte bulunur.
- Transkripsiyon için Unicode ve noktalama normalizasyonundan sonra token bazlı WER hesapla: `(S + D + I) / N`; `N=0` için WER tanımsız ve sessizlik ayrı sınıftır.
- Gerçek zaman faktörü `RTF = inference_wall_seconds / audio_seconds`; model yükleme hariç warm ve dahil cold ayrı raporlanır.

### 11.2 Whisper

- Mic capture, `stop` → final ACK → seal → queue wait → model inference → transcript draft paint birbirinden ayrılır.
- CPU-only `base` ve uygun GPU `base`/`small` profilleri; çok dilli model. `.en` modeli Türkçe baseline olmaz.
- Benchmark sırasında renderer input/açılış normal çalışmalı, worker/sidecar crash core'u düşürmemeli.
- Tek transkript başarısı, sözcük doğruluğu ayrı; `0 yanlış otomatik task execution` zorunludur.

### 11.3 EMA Lightning

- Input: 20, 100, 500, 2000 code point ve uzunluk sınırı aşımı.
- TTS request accepted, first PCM chunk, first audible output (loopback/ölçülebilir ses çıkışı), total duration, underrun/drop sayısı, cancellation stop ve CPU/GPU memory incelenir.
- CPU default, GPU yolunun ilk compile maliyeti ayrı; RTX 4090 sonuçları 4050 için benchmark sayılmaz.
- Ses servisi çökerse metin yanıtlama devam etmeli; restart/TTS disabled durumları ayrı ölçülmeli.
- Playback buffer DOC-29'a göre en çok 2 saniyelik PCM; yavaş cihazda backpressure test edilir.

## 12. Kaynak, termal, disk ve ağ tüketimi

### 12.1 Süreç ağacı

İzlenecek bileşenler: Electron Main, en az bir renderer, GPU/utility süreçleri, DB worker, uygulamanın başlattığı sidecar'lar; mevcut harici Ollama daemon'u ayrı sahiplik olarak sınıflanır. Çakışan veya farklı owner procesleri toplam uygulama RAM'i diye yanlış etiketleme.

**Rapor:** RSS/private working set/heap, CPU time, Thread count, file descriptor/handle count, GPU committed/resident bellek (OS araçlarının sınırlamalarıyla), disk read/write, WAL peak, installer ve model cache boyutu. `MB` ve `MiB` ayırt edilir.

### 12.2 Uzun süreli test

- `idle-10m`: UI açık, AI kapalı; CPU, RAM, disk write ve ağ hedefleri.
- `soak-60m`: Her 10 saniyede küçük UI/DB işlemi; bellek trendi, IPC listener sızıntısı, worker crash.
- `agent-voice-cycle-100`: Mümkünse seçili model kurulu; 100 küçük STT/TTS/agent işlemi, temiz süreç ve lease bırakma.
- `backup-under-load`: Kullanıcı not düzenlerken tutarlı yedek; UI donması yok, restore sonrası FK/FTS eşleşir.
- `disk-pressure`: Disk sınırına yaklaşırken açıkça başarısız commit/backup; başarılı sahte UI yok.
- `battery-limited`: Güç tasarrufu modunda UX bozulursa özellik/animasyon azaltma önerilir; güvenlik azaltılmaz.

### 12.3 Benchmark sırasında yasak optimizasyonlar

SQLite PRAGMA güvenilirliğini sessiz düşürme, WAL/FTS yazmayı kapatma, task history'yi atlama, IPC sender doğrulaması kaldırma, ses/model kontrolünü bypass etme, sistem antivirus'ünü kapatma, renderer sandbox disable etme, gerçek commit'i mock'lama, başarısız denemeyi sonuçtan silme.

---

## 13. Regresyon ve release kararı

### 13.1 Mutlak eşik + referansa göre sapma

- Birincil `PASS`: HARD bütçe hedefi sağlanıyor, doğruluk/integrity kusursuz ve yeterli deneme var.
- `REGRESSION`: Aynı fixture/cihaz/build sınıfında p95 önceki kabul edilmiş median-of-runs baseline'a göre **>%15 kötüleşmiş**, fakat mutlak eşik hâlâ geçiyorsa inceleme zorunlu. En az üç bağımsız run ile tekrar doğrulanır.
- `FAIL`: Hard eşik aşıldı veya sıfır hata kuralları ihlal edildi.
- `INCONCLUSIVE`: Test ortamı bozuldu, eksik ölçüm, profil/dependency hash uyuşmazlığı; release için PASS sayılmaz.
- `NOT_RUN`: Çalıştırılmadı; gerekçe kaydedilir. HARD release gate geçilemez.
- `NOT_APPLICABLE`: O feature gerçekten shipped değilse açık feature-flag ve installer kanıtıyla kullanılabilir.

Ölçüm varyansı yüksekse önce planlama/scheduler ve termal koşulları incele; varsayılan olarak `%15` artışın her zaman kod regresyonu olduğu iddia edilmez. Ancak inceleme kaydı kapatılmadan yayın PASS verilmez.

### 13.2 CI katmanları

| Katman | Tetikleyici | İçerik | Release kararı |
|---|---|---|---|
| PR static + smoke | Her PR | typecheck, lint, SQL integration, short UI smoke, fixture hash | Fonksiyonel gate |
| PR perf smoke | Her PR | mini benchmark, başlangıç/DB/ses mock | Kesin mutlak performans kanıtı değil |
| Nightly stable Windows | Gece | paketli app, `FIX-MEDIUM`+`LARGE`, baseline karşılaştırma | Regresyon alarmı |
| RC stable Windows | Tag / release candidate | 30 cold launch, 100 search/create, UI trace, real model if shipped | QG-021 HARD |
| RC low end | Tag | 8GB RAM, CPU-only, degrade ve no crash | Desteklenen cihaz kapısı |
| RC optional voice | Feature dağıtılıyorsa | gerçek mic/audio/device, TTS/STT | Şartlı provider kapısı |

**CI runner paylaşımı:** Genel hosted runner üzerinde mutlak P95'ler CPU yarışmasına açık olduğundan "kesin PASS" verilmez; kararlı kalibre edilmiş Windows agent gerekli. Test donanımı yoksa ürün çıkışı performans açısından `NOT_RUN` olarak işaretlenir.

### 13.3 Performans sapmasında izlenecek sıra

1. Veriyi doğrula: yanlış fixture/query/OS güç modu var mı?
2. Sorunu `renderer`, `main`, `DB queue`, `SQLite`, `job`, `provider` alt span'larına ayır.
3. Güvenlik ve veri bütünlüğü kontrollerinin açık olduğunu teyit et.
4. `EXPLAIN QUERY PLAN`, flamegraph, React profile, process tree ölçümleriyle darboğazı kanıtla.
5. En düşük riskli optimizasyonu yap: gereksiz import / query N+1 / stable selector / virtualizer / batch.
6. Aynı fixture ve koşullarda önce/sonra ölç; işlevsel testleri de çalıştır.
7. P50/P95 ve varyans, memory, disk, güvenlik etkisini raporla; belirsizse FAIL/INCONCLUSIVE kalır.

## 14. Repo uygulaması ve komut sözleşmeleri

DOC-07 tarafından tanımlanan **mevcut** klasör ve komut korunur; yeni package açılmaz:

```text
iterkeep/
├── tests/
│   └── performance/
│       ├── run-benchmarks.mjs
│       ├── fixtures/                 # Seed, generator, corpus, test manifests
│       ├── startup/                  # packaged app harness
│       ├── database/                 # query suites, FTS and concurrency
│       ├── ui/                       # renderer/interaction trace scripts
│       ├── jobs/                     # bounded queues/event storm
│       ├── ai/                       # real/mock segregated
│       ├── voice/                    # microphone/TTS profiles
│       └── helpers/                  # stats, env, output, threshold
└── .artifacts/
    └── performance/
        └── <git-sha>/<device>/<run-id>/
            ├── environment.json
            ├── fixture.json
            ├── samples.jsonl
            ├── summary.json
            ├── gate-result.json
            ├── traces/              # redacted / controlled access
            └── report.md
```

Dosyalar ölçüm kanıtıdır ve `.gitignore` altındadır. Kullanıcı verisi yedekleme klasörüyle aynı yere yazılmaz. Gerçek donanım ölçümü olmadan örnek `summary.json`dan başarı sonucu türetilmez.

### 14.1 Kanonik npm komutları

```bash
npm ci
npm run verify
npm run test:performance
npm run make
```

`npm run test:performance` DOC-07'deki `node tests/performance/run-benchmarks.mjs` script'ini çağırır. Harness'ın `--profile`, `--fixture`, `--mode`, `--out` CLI seçenekleri olabilir; ek npm script'leri DOC-07'ye belgelenmeden zorunlu kabul edilmez. `npm run make` Windows gerçek binary/installer smoke testiyle eşleşir. `node`/Electron doğru sürümü DOC-05'te tanımlıdır.

### 14.2 Örnek benchmark runner sözleşmesi

```ts
// tests/performance/helpers/types.ts — tanım; gerçek implementasyon değil
export type BenchStatus =
  | 'PASS' | 'FAIL' | 'REGRESSION' | 'INCONCLUSIVE'
  | 'NOT_RUN' | 'NOT_APPLICABLE';

export interface BenchSample {
  metricId: string;
  iteration: number;
  durationMs: number | null;
  ok: boolean;
  errorCode?: string;       // hassas veri içermez
  condition: 'warm' | 'process-cold' | 'os-cold' | 'model-cold';
}

export interface BenchResult {
  benchmarkProtocolVersion: '1';
  metricId: string;
  deviceProfile: string;
  fixtureFingerprint: string;
  gitSha: string;
  buildSha256: string;
  nAttempted: number;
  nSucceeded: number;
  nFailed: number;
  p50Ms?: number;
  p95Ms?: number;
  p99Ms?: number;
  baselineP95Ms?: number;
  status: BenchStatus;
  evidencePath: string;   // relative path under .artifacts/performance only
}
```

### 14.3 Referans karar algoritması

```ts
// packages/testing/src/performance/gates.ts — referans
export function decideGate(args: {
  hard: boolean;
  requiredSamples: number;
  attempted: number;
  failed: number;
  samples: number[];
  maxP95Ms: number;
}): 'PASS' | 'FAIL' | 'INCONCLUSIVE' {
  if (args.attempted < args.requiredSamples) return 'INCONCLUSIVE';
  if (args.failed > 0) return 'FAIL';
  if (args.samples.length !== args.attempted) return 'INCONCLUSIVE';
  const { p95Ms } = summarizeMs(args.samples); // import from helpers/stats
  if (p95Ms > args.maxP95Ms) return args.hard ? 'FAIL' : 'INCONCLUSIVE';
  return 'PASS';
}
```

**Sınır:** Bu yordam yalnız tek yönlü maksimum-süre eşikleri içindir. CPU/VRAM, FPS minimumu, 0 event loss ve yüzde büyüme kurallarının ayrı evaluator'u gerekir. Gerçek release engine, versiyonlu threshold manifest + `DOC-04` quality gate doğrulamasını kullanır; bütün metrikleri bu işlevle değerlendirmez.

## 15. Sonuç kanıtı ve JSON manifest

Bir run'ın `summary.json` dosyası aşağıdaki gibi olur; değerler **temsili placeholder**, gerçek PASS kanıtı değildir:

```json
{
  "protocolVersion": 1,
  "gitSha": "REPLACE_WITH_GIT_SHA",
  "appVersion": "REPLACE_WITH_APP_VERSION",
  "buildMode": "packaged-production",
  "device": "HW-REF-WIN",
  "platform": "win32-x64",
  "osBuild": "REPLACE_WITH_OS_BUILD",
  "fixtureId": "FIX-LARGE-FTS-V1",
  "fixtureSha256": "REPLACE_WITH_HASH",
  "benchmarkId": "PERF-B-005",
  "condition": "warm",
  "attempted": 0,
  "succeeded": 0,
  "failed": 0,
  "p50Ms": null,
  "p95Ms": null,
  "p99Ms": null,
  "status": "NOT_RUN",
  "evidence": []
}
```

**Release raporu:** her bütçe için `PASS/FAIL/REGRESSION/INCONCLUSIVE/NOT_RUN/NOT_APPLICABLE`, ölçüm cihazı, tarih, donanım, referans baseline, fixture hash, logs/traces, sorumlu inceleyen ve değişiklik kararı. Güvenlik kontrollerinin performans testinde etkin kaldığına ait kanıt ayrıca bulunur.

---

## 16. Uçtan uca performans akışları (`PERF-F-*`)

### PERF-F-001 — AI olmayan temiz açılış

**Hazırlık:** `FIX-AI-OFF-V1`; Ollama executable, model cache ve Python sidecar bulunmaz. **Adımlar:** paketli app çalıştır → kurulum/ana ekranı aç → kullanıcı Inbox'a görev ekler. **Kontrol:** core ısrarla provider beklemez; `T_core_usable` ölçülür; hiçbir başarısız health çağrısı endless spinner üretmez. **Kanıt:** startup trace, process tree, görev UUID + commit receipt, PERF-B-001/024/025.

### PERF-F-002 — Geri gelen kullanıcı ve kayıp model

**Hazırlık:** setup bitmiş, `aiEnabled=true`, seçili Ollama modeli silinmiş. **Adımlar:** app aç → projeyi aç → görev kaydet → System Health'i aç. **Kontrol:** modeli tarama UI'yi engellemez, doğru unavailable durumu görünür; DB değişikliği tek transaction. **Kanıt:** Main/renderer trace, capability zaman çizelgesi, PERF-B-001/004/024.

### PERF-F-003 — Hızlı Inbox yakalama

**Hazırlık:** `FIX-MEDIUM-V1`. **Adımlar:** 100 sentetik görev kısa aralıklarla ayrı ID ile eklenir; visual pending ve gerçek DB commit zamanları işaretlenir. **Kontrol:** her görev tam bir kez, `saved` yalnız commit sonrası; failpoint'te rollback. **Kanıt:** task_history sayısı, idempotency receipts, PERF-B-003/004/025.

### PERF-F-004 — 100 bin kayıt araması

**Hazırlık:** `FIX-LARGE-FTS-V1`, warm cache. **Adımlar:** 60 sorgu setini randomize et, en az 100 örnek topla. **Kontrol:** `search.query` yanıtı kaynak UUID'lerine açılır; erişilemeyen veya silinmiş kayıt görünmez; P50/P95 sınırları ölçülür. **Kanıt:** FTS trace, result snapshot, PERF-B-005.

### PERF-F-005 — 100 bin log satırı ayrık yük

**Hazırlık:** `FIX-LARGE-LOG-LINES-V1`. **Adımlar:** uzun günlük aç, scroll, arama, export yap. **Kontrol:** renderer tek büyük metni kontrolsüz DOM'a yerleştirmez; veri eksik kesilmez. **Kanıt:** heap/DOM trace, çıktı hash'i; PERF-B-008/009.

### PERF-F-006 — Çok kalabalık Kanban

**Hazırlık:** 1000 görev tek bir lane'de, filtreli ve filtresiz iki görünüm. **Adımlar:** klavyeyle taşı, sürükle, aynı anda görev güncelle. **Kontrol:** filtreli görünümde gizli görevlerin sırası değişmez, revision conflict açıklanır; FPS ve commit ayrıdır. **Kanıt:** task ordering diffs, PERF-B-008/009/025.

### PERF-F-007 — Uzun Markdown notu

**Hazırlık:** 100.000 karakterlik sentetik not, 100 tuş eylemi. **Adımlar:** düzenle, autosave, ayrı pencerede conflict yarat. **Kontrol:** tuş gecikmesi ve store response ölçülür; sessiz veri kaybı olmaz. **Kanıt:** document_versions, editor trace, PERF-B-009/025.

### PERF-F-008 — Model indirme ve core CRUD

**Hazırlık:** fake Ollama progress stream; ağ gecikmesi ve kopması. **Adımlar:** uzun model indirmeyi başlat → proje değiştir → not kaydet → indirmeyi iptal et. **Kontrol:** UI sağlıklı, `job` gerçek durumla tutarlı, core task/starvation yok. **Kanıt:** job events, IPC trace, PERF-B-007/009/014.

### PERF-F-009 — Gerçek Ollama agent

**Hazırlık:** digest ve model benchmark kaydı olan, kullanıcının seçtiği gerçek model. **Adımlar:** kaynak ara → agent tool → policy onayı → verified mutation. **Kontrol:** tool accuracy ayrı, TTFT ayrı, final DB sonucu ayrı; hiçbir güvenlik bypass yok. **Kanıt:** redakte edilmiş execution timeline, PERF-B-025.

### PERF-F-010 — Mikrofon ve Türkçe transkript

**Hazırlık:** izinli sentetik Türkçe kayıt/gerçek input cihazı. **Adımlar:** başlat → 10 sn konuş → durdur → transcript. **Kontrol:** capture başladı, ACK sealed, Whisper inference, kullanıcı düzenleme; izinsiz tool çağrısı 0. **Kanıt:** zaman işaretleri, WER, RTF, PERF-B-018/019/020/021.

### PERF-F-011 — Sesli yanıt ve iptal

**Hazırlık:** EMA Lightning CPU yolu. **Adımlar:** sentez iste → ilk PCM → oynat → yarıda iptal. **Kontrol:** ilk duyulan ses gecikmesi ve stop süresi ayrı; 2sn buffer üst sınırı. **Kanıt:** audio loopback/driver log, PERF-B-022/023.

### PERF-F-012 — Eşzamanlı DB yükü

**Hazırlık:** `FIX-CONCURRENT-V1`. **Adımlar:** 8 okuma ile 2–10 kısa yazma/s → arama → backup. **Kontrol:** writer starvation, busy retry ve queue latency raporlanır; `quick_check` temiz. **Kanıt:** worker queue trace, SQLite integrity, PERF-B-004/006/025.

### PERF-F-013 — Arka plan event seli

**Hazırlık:** Mock JobManager 1000 event üretir; renderer yavaşlatılır. **Adımlar:** coalesce/buffer overflow → gap snapshot → user cancel. **Kontrol:** 1 MiB/window altı, güvenilir son job state, iş durduysa UI da durdu. **Kanıt:** event sayacı, trace, PERF-B-014.

### PERF-F-014 — 60 dakikalık soak

**Hazırlık:** AI kapalı, sentetik görev/not işlemleri. **Adımlar:** bir saat boyunca route change, edit, background query. **Kontrol:** leak, process/handle/scheduler büyümesi incelenir; test final DB snapshot tutarlıdır. **Kanıt:** bellek grafiği, terminal check, PERF-B-012/025.

### PERF-F-015 — Düşük donanım

**Hazırlık:** `HW-LOW-WIN`, 8GB, GPU olmadan. **Adımlar:** normal CRUD/FTS + optional AI kapalı; sonra optional voice CPU. **Kontrol:** yavaşlık raporlanır, UI donmadan geri bildirim sunar, core still works. **Kanıt:** düşük cihaz raporu, OOM/crash sayısı, PERF-B-024/025.

### PERF-F-016 — Sürüm adayı regresyon değerlendirmesi

**Hazırlık:** Son onaylı packaged binary baseline ve yeni RC aynı cihazda. **Adımlar:** üç bağımsız run, her koşu clean fixture, karşılaştır. **Kontrol:** eşik + regresyon + güvenlik gate, yanlış `PASS` yok. **Kanıt:** imzalı/hashed build raporu, `gate-result.json`, DOC-04 QG-021.

---

## 17. Ölçülebilir test matrisi (`PERF-T-001–080`)

**Her testin en az kaydetmesi gerekenler:** `attempted`, `succeeded`, `failed`, `elapsed`, `fixture`, `HW profile`, `buildHash`, sonucu üreten trace/evidence pointer. Testler `DOC-33` altında otomasyona bağlanır. Aşağıdaki satırlar senaryo-kabul sözleşmesidir; gerçek test kodu henüz yazılmış değildir.


### Startup testi — 8 vaka

| ID | Senaryo | Veri koşulu | Beklenen / PASS delili | Bağlantı |
|---|---|---|---|---|
| `PERF-T-001` | AI kapalı fresh install, setup shell görüntüleniyor | `FIX-AI-OFF-V1` | Arayüz modeli beklemeden yüklenir | `B-001/024` |
| `PERF-T-002` | Returning user process-cold 30 defa | `FIX-SMALL-V1` | P95 ≤ 1500 ms ve 0 fail | `B-001` |
| `PERF-T-003` | OS-cold reboot ve 3 tekrar | `FIX-SMALL-V1` | Normal process-cold ile karıştırılmadan rapor | `B-001` |
| `PERF-T-004` | Warm restart 30 defa | `FIX-SMALL-V1` | P95 ≤ 850 ms hedefi | `B-002` |
| `PERF-T-005` | Ollama daemon kapalı ama AI tercihi açık | `FIX-AI-OFF-V1` | Core açılır ve sağlık durumu unavailable | `B-024` |
| `PERF-T-006` | Model kurulu değil ama seçili görünüyor | `FIX-AI-OFF-V1` | Sonsuz splash yok, degraded durum | `B-024` |
| `PERF-T-007` | Migration öngören önceki DB sürümü | `FIX-MEDIUM-V1` | Açık migration ekranı, veri kaybı yok | `B-025` |
| `PERF-T-008` | Native SQLite binary eksik paket | `FIX-SMALL-V1` | Kurtarma hatası, sessiz boş DB açılmaz | `B-026` |

### CRUD DB testi — 8 vaka

| ID | Senaryo | Veri koşulu | Beklenen / PASS delili | Bağlantı |
|---|---|---|---|---|
| `PERF-T-009` | Create task input → pending feedback 100 tekrar | `FIX-MEDIUM-V1` | P95 ≤ 50 ms | `B-003` |
| `PERF-T-010` | Create task → verified commit 100 tekrar | `FIX-MEDIUM-V1` | P95 ≤ 250 ms | `B-004` |
| `PERF-T-011` | Create task commit failure injection | `FIX-MEDIUM-V1` | 0 sahte saved, veri korunur | `B-025` |
| `PERF-T-012` | Aynı idempotency key ile replay | `FIX-MEDIUM-V1` | Tam bir kayıt, tutarlı receipt | `B-025` |
| `PERF-T-013` | Project list summary N+1 kontrolü | `FIX-LARGE-FTS-V1` | Query count sınırı, gereksiz tekrar yok | `B-007` |
| `PERF-T-014` | Task CAS stale revision | `FIX-MEDIUM-V1` | Revision conflict doğru gösterilir | `B-025` |
| `PERF-T-015` | Document versioned autosave | `FIX-MEDIUM-V1` | Revision/draft tutarlı | `B-004/025` |
| `PERF-T-016` | 1000 mixed commits ardından foreign key check | `FIX-LARGE-FTS-V1` | 0 FK hatası, 0 corrupted event | `B-025` |

### Search testi — 8 vaka

| ID | Senaryo | Veri koşulu | Beklenen / PASS delili | Bağlantı |
|---|---|---|---|---|
| `PERF-T-017` | 60 sorgu x2, warm 100k search | `FIX-LARGE-FTS-V1` | P50<45 ms, P95<100 ms | `B-005` |
| `PERF-T-018` | Sadece Türkçe harf varyantları | `FIX-LARGE-FTS-V1` | Beklenen hit ID seti | `B-005/025` |
| `PERF-T-019` | FTS prefix yaygın sözcük | `FIX-LARGE-FTS-V1` | Query bounded, P95 ölçülür | `B-005` |
| `PERF-T-020` | Archived/soft-deleted not exclusion | `FIX-LARGE-FTS-V1` | Gizlenen kayıt sonucu 0 | `B-025` |
| `PERF-T-021` | Filter date/kind/project birleşimi | `FIX-LARGE-FTS-V1` | Doğru sonuç ve kararlı sayfa | `B-005` |
| `PERF-T-022` | No-result çok uzun arama | `FIX-ADVERSARIAL-V1` | Önceden belirli token/length sınırı | `B-005/025` |
| `PERF-T-023` | Write load altında FTS search | `FIX-CONCURRENT-V1` | P95<250 ms ve doğru veri | `B-006` |
| `PERF-T-024` | Rebuild sonrası checksum/identity | `FIX-LARGE-FTS-V1` | Doğru sonuç; rebuild UI bloke etmez | `B-009/025` |

### UI testi — 8 vaka

| ID | Senaryo | Veri koşulu | Beklenen / PASS delili | Bağlantı |
|---|---|---|---|---|
| `PERF-T-025` | Project switch 100 tekrar | `FIX-MEDIUM-V1` | P95<150 ms | `B-007` |
| `PERF-T-026` | Kanban 1000 item virtual scroll | `FIX-LARGE-FTS-V1` | Frame zamanları hedefi | `B-008` |
| `PERF-T-027` | Task list 20k virtual scroll | `FIX-LARGE-FTS-V1` | Yalnız bounded DOM, stabil FPS | `B-008` |
| `PERF-T-028` | Kanban drag/drop concurrent conflict | `FIX-LARGE-FTS-V1` | Dondurma yok, doğru revision | `B-009/025` |
| `PERF-T-029` | Editor 100k karakterde typing | `FIX-ADVERSARIAL-V1` | >100ms kritik JS task yok | `B-009` |
| `PERF-T-030` | Tema geçişi 50 tekrar | `FIX-SMALL-V1` | Editor/agent session remount yok | `B-009` |
| `PERF-T-031` | 200 öğelik keyboard navigation | `FIX-MEDIUM-V1` | Odak kaybı yok; render normal | `B-009` |
| `PERF-T-032` | Resize 800-1600px + agent panel toggle | `FIX-MEDIUM-V1` | Layout freeze yok, text kaybı yok | `B-009` |

### Jobs testi — 8 vaka

| ID | Senaryo | Veri koşulu | Beklenen / PASS delili | Bağlantı |
|---|---|---|---|---|
| `PERF-T-033` | Job accept 100 tekrar boş queue | `FIX-CONCURRENT-V1` | P95≤200 ms | `B-013` |
| `PERF-T-034` | 1000 progress event seli | `FIX-CONCURRENT-V1` | Buffer≤1MiB, freeze yok | `B-014` |
| `PERF-T-035` | Slow subscriber, event gap recovery | `FIX-CONCURRENT-V1` | Snapshot ile doğruluk | `B-014/025` |
| `PERF-T-036` | Job cancellation before start | `FIX-CONCURRENT-V1` | Yan etki yok | `B-025` |
| `PERF-T-037` | Job cancel after commit | `FIX-CONCURRENT-V1` | İşlem geri alındı denmez | `B-025` |
| `PERF-T-038` | Restart during backup/export | `FIX-CONCURRENT-V1` | Korunan veri, doğru job state | `B-025` |
| `PERF-T-039` | WAL checkpoint during writes | `FIX-CONCURRENT-V1` | UI ve DB bounded | `B-006/009` |
| `PERF-T-040` | Restore under heavy load | `FIX-CONCURRENT-V1` | Aşamalı doğrulama, DB integrity | `B-025` |

### Resources testi — 8 vaka

| ID | Senaryo | Veri koşulu | Beklenen / PASS delili | Bağlantı |
|---|---|---|---|---|
| `PERF-T-041` | Core idle 5dk, AI off | `FIX-AI-OFF-V1` | CPU ortalaması ve spike raporu | `B-010` |
| `PERF-T-042` | Core idle 10dk memory | `FIX-AI-OFF-V1` | Process tree baseline raporu | `B-011` |
| `PERF-T-043` | CRUD ve route 100 tur leak | `FIX-MEDIUM-V1` | RSS/heap trend, sızıntı yok | `B-012` |
| `PERF-T-044` | Soak 60dk | `FIX-MEDIUM-V1` | Sürekli memory artışı yok | `B-012` |
| `PERF-T-045` | Disk pressure write failure | `FIX-ADVERSARIAL-V1` | 0 false saved, recoverable | `B-025` |
| `PERF-T-046` | Power saver 8GB no GPU | `FIX-SMALL-V1` | Core erişilebilir kalır | `B-024` |
| `PERF-T-047` | Disk/WAL/FTS boyut ölçümü | `FIX-LARGE-FTS-V1` | Boyut kaybı olmayan ölçüm | `B-011` |
| `PERF-T-048` | Electron child exit cleanup | `FIX-SMALL-V1` | Process leak yok | `B-012` |

### AI testi — 8 vaka

| ID | Senaryo | Veri koşulu | Beklenen / PASS delili | Bağlantı |
|---|---|---|---|---|
| `PERF-T-049` | Ollama absent noop core | `FIX-AI-OFF-V1` | Core işlevleri tam | `B-024` |
| `PERF-T-050` | Model cold/warm karşılaştırma | `Real-Ollama` | TTFT ve load ayrı | `B-024` |
| `PERF-T-051` | Agent stream 100 token/s fake | `Mock-Ollama` | UI main thread donmaz | `B-009/014` |
| `PERF-T-052` | Agent writes with approval | `Real-Ollama` | 0 yetkisiz write | `B-025` |
| `PERF-T-053` | Tool schema invalid argument | `Mock-Ollama` | İşlem reddedilir | `B-025` |
| `PERF-T-054` | LLM active parallel search | `Real-Ollama` | Core latency karşılaştırılır | `B-005/009` |
| `PERF-T-055` | Model remove while selected | `Real-Ollama` | Model unavailable, core çalışır | `B-024` |
| `PERF-T-056` | GPU memory pressure STT+LLM | `Real-Ollama+STT` | Controlled lease, no unintended kill | `B-024/025` |

### Voice testi — 8 vaka

| ID | Senaryo | Veri koşulu | Beklenen / PASS delili | Bağlantı |
|---|---|---|---|---|
| `PERF-T-057` | Mic button pending UI latency | `Real-mic` | P95≤100ms | `B-018` |
| `PERF-T-058` | After permission to record ready | `Real-mic` | P95≤500ms hedefi | `B-019` |
| `PERF-T-059` | 10sec recording seal ACK | `Real-mic` | P95≤300ms hedefi | `B-020` |
| `PERF-T-060` | Turkish Whisper base warm CPU | `Real-STT` | RTF≤1 hedefi, WER raporu | `B-021` |
| `PERF-T-061` | Whisper unsupported model .en | `Mock-STT` | Türkçe modeli önerilmez | `B-025` |
| `PERF-T-062` | TTS queued indicator 100 tekrar | `Real-TTS` | P95<150ms | `B-022` |
| `PERF-T-063` | TTS cancel audible stop | `Real-TTS` | P95<300ms | `B-023` |
| `PERF-T-064` | TTS long text slow output | `Real-TTS` | 2s buffer, bounded memory | `B-023` |

### Safety correctness testi — 8 vaka

| ID | Senaryo | Veri koşulu | Beklenen / PASS delili | Bağlantı |
|---|---|---|---|---|
| `PERF-T-065` | CSP/sandbox on benchmark | `Packaged-Windows` | 0 güvenlik baypası | `B-026` |
| `PERF-T-066` | Invalid sender IPC burst | `Packaged-Windows` | 0 unauthorized mutation | `B-025/026` |
| `PERF-T-067` | FTS injection probes under perf load | `FIX-ADVERSARIAL-V1` | 0 invalid result, bounded latency | `B-025` |
| `PERF-T-068` | Prompt injection in markdown | `FIX-ADVERSARIAL-V1` | 0 unauthorized tool | `B-025` |
| `PERF-T-069` | Corrupted import archive | `FIX-ADVERSARIAL-V1` | No DB damage, bounded UI | `B-025` |
| `PERF-T-070` | Backup during concurrent write | `FIX-CONCURRENT-V1` | Backup integrity good | `B-025` |
| `PERF-T-071` | Power loss-like worker kill | `FIX-CONCURRENT-V1` | Durable rows correct, no saved lies | `B-025` |
| `PERF-T-072` | No app data in trace samples | `All` | No raw content/path/voice | `B-026` |

### Release gates testi — 8 vaka

| ID | Senaryo | Veri koşulu | Beklenen / PASS delili | Bağlantı |
|---|---|---|---|---|
| `PERF-T-073` | PR smoke baseline on shared CI | `CI` | No misleading absolute PASS | `QG-021` |
| `PERF-T-074` | Nightly stable runner repeated runs | `HW-REF-WIN` | Regression threshold evaluated | `QG-021` |
| `PERF-T-075` | RC 30 packaged cold launches | `HW-REF-WIN` | Budget and evidence | `B-001` |
| `PERF-T-076` | RC 100 warm FTS operations | `HW-REF-WIN` | Budget and result correctness | `B-005` |
| `PERF-T-077` | RC release signed/hashed binary | `HW-REF-WIN` | Build identity verified | `B-026` |
| `PERF-T-078` | Missing fixture fingerprint | `CI` | INCONCLUSIVE not PASS | `QG-021` |
| `PERF-T-079` | Optional voice absent, feature disabled | `HW-REF-WIN` | NOT_APPLICABLE documented | `QG-021` |
| `PERF-T-080` | Provider feature advertised no real test | `HW-REF-WIN` | NOT_RUN blocks feature release | `QG-021` |

---

## 18. Önceki dokümanlarla izlenebilirlik

| Kaynak belge | Kullanılan kontrat | Bu belgede ölçüm yeri |
|---|---|---|
| DOC-00 | Local-first, performans vaat sınırı | Bölüm 0, 4, 6 |
| DOC-02 | Ürün kapsamı, REQ ve kabul senaryoları | Bölüm 4, 17 |
| DOC-03 | Kullanıcı yolculukları | PERF-F-001–016 |
| DOC-04 | QG-021 ve release block | Bölüm 4, 13 |
| DOC-05 | Kesin runtime/versiyon seçimleri | Bölüm 2 ve 14 |
| DOC-06 | Süreç izolasyonu, startup | Bölüm 5 ve 6 |
| DOC-07 | `tests/performance/`, npm script | Bölüm 14 |
| DOC-08 | Domain kimlik ve integrity | Bölüm 3, 7 |
| DOC-09 | SQL, FTS, constraints | Bölüm 3, 7 |
| DOC-10 | Transaction, single writer, backup | Bölüm 5 ve 7 |
| DOC-11 | IPC DTO, event ve güvenlik | Bölüm 5 ve 8 |
| DOC-12 | Job state, event buffering | Bölüm 9 |
| DOC-13 | Task/Inbox/Kanban | Bölüm 8, PERF-F-003/006 |
| DOC-14 | Document/autosave/log | Bölüm 8, PERF-F-007 |
| DOC-15 | FTS, Türkçe, query sınıfları | Bölüm 3, 7 |
| DOC-16 | Export/Git arka plan işleri | Bölüm 7, 9 |
| DOC-17 | Backup/restore/kurtarma | Bölüm 7, 12 |
| DOC-18 | Setup first use | Bölüm 6 |
| DOC-19 | Capability Manager ve health cache | Bölüm 4, 12 |
| DOC-20–23 | Tema, ekran, bileşen, erişilebilirlik | Bölüm 8 |
| DOC-24/25 | AI port, model manager, benchmark | Bölüm 10 |
| DOC-26/27 | Agent güvenlik ve gözlem | Bölüm 10, 17 |
| DOC-28/29 | Voice STT/TTS limit ve protokol | Bölüm 11 |
| DOC-30 | Security/privacy; açıkken ölçüm | Bölüm 2, 12 |
| DOC-32 | Hata/kurtarma UI | Benchmark fault expectations |
| DOC-33 | Otomasyon ve test coverage | PERF-T-001–080 |
| DOC-34 | CI/CD release kanıtları | Bölüm 13–15 |
| DOC-35 | Uygulama sırası ve DoD | Bölüm 19 |

## 19. Uygulama iş paketleri ve teslim kriterleri

| Paket | Geliştirme görevi | Gereken kanıt |
|---|---|---|
| `PERF-WP-01` | Sabit sentetik fixture generator ve immutable manifest | FIX-S/M/L/LOG/ADVERSARIAL hash'leri |
| `PERF-WP-02` | Metric ID, timer, sample recorder, stats ve gate evaluator | Unit test + percentile fixture |
| `PERF-WP-03` | Paketli Windows startup harness | 30 process-cold deneme, AI absent |
| `PERF-WP-04` | DB/FTS query benchmark + EXPLAIN review | 100k FTS, SQL run timings |
| `PERF-WP-05` | Renderer input/paint/virtualization profiler | 50+ E2E, frame/DOM trace |
| `PERF-WP-06` | Job/event/coalescing/perf under load | Buffer ve latency kanıtı |
| `PERF-WP-07` | Ollama/model benchmark entegrasyonu | Digest + actual provider logs |
| `PERF-WP-08` | Whisper/TTS cihaz ölçümü | WER, RTF, onset, cancel |
| `PERF-WP-09` | Soak/memory/CPU/disk ölçümü | Process-tree trend + leak inspection |
| `PERF-WP-10` | CI nightly + RC evidence manifest | QG-021 kararı, regresyon raporu |

### 19.1 Definition of Done — doküman

- [ ] `PERF-I-001–048` kural ve `PERF-B-001–026` bütçe kimlikleri benzersiz.
- [ ] `PERF-F-001–016` kullanıcı/perf akışları tanımlı.
- [ ] `PERF-T-001–080` test kimlikleri benzersiz ve izlenebilir.
- [ ] Ölçümde cold/warm, process/OS/model, DB commit/UI paint ayrımları açık.
- [ ] Sentetik fixture sayıları DOC-04 ve DOC-15 ile uyumlu.
- [ ] Hiçbir test yanlışlıkla gerçek kullanıcı DB'sini değiştirip veri kaybetmez.
- [ ] Resmî kaynaklar ve normatif doküman bağlantıları mevcut.
- [ ] Test edilmemiş release/performance iddiası veya uydurma sayı yok.

### 19.2 Definition of Done — uygulama / yayın

- [ ] `npm run test:performance` gerçek benchmark runner olarak çalışıyor.
- [ ] Paketlenmiş Windows release candidate gerçek donanımda test edildi.
- [ ] En az bir LOW cihaz profili güvenli degrade testini geçti.
- [ ] Bütün ilgili HARD ve shipped CONDITIONAL bütçeler PASS.
- [ ] Crash, yanlış kaydedildi, izinsiz araç çalışması sayısı sıfır.
- [ ] AI kapalıyken tüm temel kullanım ve testler başarılı.
- [ ] Model/voice performans raporları gerçek provider ile ve model digest'i ile ilişkilendirilmiş.
- [ ] Benchmark raporu kişisel içerik ve hassas path sızdırmıyor.
- [ ] DOC-04 QG-021, DOC-33 test stratejisi ve DOC-34 release pipeline aynı kanıtları tüketiyor.

## 20. Açık konular ve gelecekteki ölçümler

Bunlar **belirsiz geliştirme kararı değildir**; gerçek cihaz ölçümü gerektiren sonuç değerleridir:

- `HW-REF-WIN` gerçek cihazda startup, arama ve memory baseline değerleri.
- GPU/CPU modelin gerçek VRAM tahsisi, `keep_alive` sonrası kalan bellek.
- Windows Defender'ın paketli uygulamadaki startup/disk gecikmesine etkisi.
- EMA Lightning CPU/GPU inference gerçek sesi duyurma zamanı; ses çıkış sürücüsü farkları.
- Whisper Türkçe kısa/uzun kayıt WER ve CPU/GPU RTF değerleri.
- `HW-LOW-WIN` profilinde güvenilir minimum kullanıcı deneyimi ve yüksek DPI ölçekleme.

Testler yapıldıktan sonra bu dosyanın **hedefleri** test sonuçlarına göre kullanıcıya vaat hâline gelmez; rapor ayrı yayımlanır. Yeni veri yüzünden hedef değişirse ADR ve kalite kapısı onayı gerekir.

## 21. Kaynaklar ve doğrulama referansları

- [Electron — Performance](https://www.electronjs.org/docs/latest/tutorial/performance): Main/renderer bloklamama, başlangıç yükünü azaltma ve bundle yönlendirmesi.
- [Node.js — Performance measurement APIs](https://nodejs.org/api/perf_hooks.html): monoton yüksek çözünürlüklü ölçüm, marks/measures, event-loop delay.
- [SQLite — EXPLAIN QUERY PLAN](https://www.sqlite.org/eqp.html): query plan incelemesi; açıklama çıktısı stable API değildir.
- [SQLite — PRAGMA optimize](https://www.sqlite.org/pragma.html#pragma_optimize): uzun ömürlü bağlantıda istatistik bakımı.
- [SQLite — FTS5](https://www.sqlite.org/fts5.html): FTS indeksi, merge/optimize maliyeti.
- [React — Profiler](https://react.dev/reference/react/Profiler): React commit ölçümü, production profiling overhead ayrımı.
- [Playwright — Electron](https://playwright.dev/docs/api/class-electron): Electron test harness desteği; deneme/release kanıtı için packaged binary akışı ayrıca doğrulanır.

## Değişiklik geçmişi

| Sürüm | Tarih | Değişiklik |
|---|---|---|
| 0.1.0 | 2026-10-10 | Performans bütçeleri, fixture'lar, 48 invariant, 16 akış, 80 test, ölçüm/evidence sözleşmesi oluşturuldu. |
