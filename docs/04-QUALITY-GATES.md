---
document_id: DOC-04
title: "Iterkeep — Kalite Kapıları, Kanıt Sözleşmesi ve Yayın Kabulü"
version: "0.1.0"
status: "draft"
last_updated: "2026-10-10"
language: "tr-TR"
owner: "Quality Engineering & Release Management"
depends_on:
  - "DOC-00"
  - "DOC-01"
  - "DOC-02"
  - "DOC-03"
---

# Iterkeep — Kalite Kapıları, Kanıt Sözleşmesi ve Yayın Kabulü

> **Amaç:** Iterkeep V1'in *yapıldı*, *test edildi*, *yayına hazır* ve *yayınlandı* ifadelerini birbirinden ayırmak; `REQ-001–140` ürün gereksinimleri ile `AC-001–018` / `JRN-001–018` akışlarının ölçülebilir, yeniden üretilebilir kanıtlar üzerinden kabulünü sağlamak.
>
> **Yetki:** Bu dosya **hangi kalite kapılarının, ne zaman ve hangi kanıtla geçileceğini** belirler. SQL doğruları `DOC-09/10`, güvenlik politikası `DOC-30`, sayısal performans eşikleri ve benchmark yöntemi `DOC-31`, hata sınıflaması ve kurtarma adımları `DOC-32`, tekil `TEST-*` kayıtları ve otomasyon kodu `DOC-33`, release yürütümü `DOC-34` ve uygulama sırası `DOC-35` tarafından kesinleştirilir.
>
> **Statü:** `draft`. Kapılar normatif tasarım hedefidir; **henüz bir testin çalıştırıldığı, eşiklerin tutturulduğu veya bir dağıtımın doğrulandığı iddia edilmez.** Ürün sahibi ve sonraki yetkili dokümanlar onaylanınca `approved` statüsüne yükseltilebilir.

---

## 1. Teslim sözleşmesi ve normatif anlamlar

### 1.1 V1 kalite sözleşmesi

Iterkeep, AI devre dışıyken de proje oluşturabilen, görev/not/karar/log kaydedebilen, veriyi arayabilen, içe/dışa aktarabilen ve tutarlı biçimde yedekleyebilen **bağımsız masaüstü uygulaması** olmak zorundadır. İsteğe bağlı Ollama, agent, STT ve TTS modülleri etkinleştirildiğinde ise tanımlı gerçek özellikleri sunar; *placeholder* ekranla V1 şartı karşılanmış olmaz (`DOC-02`, §1 ve §9).

Kalite önceliği şu sıradadır:

1. **Veri kaybını ve yetkisiz işlemleri önleme.** Hız uğruna kalıcı veri tutarlılığı, güvenlik veya kullanıcı onayı gevşetilemez.
2. **Temel ürünün bağımsızlığı.** Ollama, model, STT, TTS, Git, GPU veya internet olmadan çekirdek çalışmalıdır.
3. **Doğru, anlaşılır ve geri alınabilir kullanıcı sonucu.** Yalan başarı bildirimi, gizli eylem veya sessiz veri ezme kabul edilmez.
4. **Algılanan hız ve kaynak verimliliği.** Ölçülmüş performans ve anlık tepki önceliklidir; ancak ilk üç kuralı ihlal etmez.
5. **Görsel bütünlük, erişilebilirlik ve sürdürülebilirlik.** Tema, lokalizasyon, test edilebilir mimari ve bakımı yapılabilir kod V1'in parçasıdır.

### 1.2 Terimler

| Terim | Kesin anlamı |
|---|---|
| **Requirement covered** | Gereksinim, belirli test(ler) ve beklenen sonucu olan izlenebilir bir doğrulama yöntemiyle eşleştirilmiş. Sadece test adı geçmesi yetmez. |
| **Test passed** | İlgili kod revizyonunda, belirtilen platform/fixture üzerinde gerçek yürütümden **başarı** kanıtı alınmış. |
| **Not run** | Henüz çalıştırılmamış test. Başarı değildir. |
| **Blocked** | Ortam, donanım, izin veya dış bağımlılık nedeniyle çalıştırılamayan test. Başarı değildir. |
| **Skipped by design** | Yalnız açık ve tanımlı bir varyasyonun dışarıda kalmasına izin verilen durum; zorunlu V1 işlevinin testini yok sayamaz. |
| **Waiver** | Sadece izin verilen kapı türü için, gerekçesi, riski, son tarihi ve onayı bulunan geçici istisna. Veri güvenliği engellerini geçersiz kılamaz. |
| **Artifact** | Test sonucu, ölçüm raporu, tarama çıktısı, kurulum kanıtı, dosya hash'i veya doğrulama tutanağı. |
| **Release candidate (RC)** | Dondurulmuş commit ve paket kimliğiyle son doğrulamaya giren yüklenebilir aday sürüm. |
| **Ready** | Sağlığı gerçekten sınanmış yetenek için kullanılan durum. `configured` veya `downloaded` ile aynı şey değildir. |

### 1.3 MUST / SHOULD / MAY ilişkisi

`DOC-02`'de **P0 ve P1 = V1 MUST**. P0 daha önce uygulanır, fakat P1 de yayın engelleyicidir. P2 tamamlanması tercih edilen iş; eksikse kullanıcı açısından etkisi belgelenmiş bir sapma kaydı zorunludur. P3 / kapsam dışı özellikler V1 test kapısına gizlice eklenmez. Bir modülün *kurulumunun opsiyonel olması*, modül etkin kullanıldığında ilgili P0/P1 testlerini opsiyonel yapmaz.

### 1.4 Kanıt olmadan başarı yok

`[x]` kutusu, geliştirici ajanın kendi kanaatiyle işaretlenemez. Her geçişin bağlantısı kaynak commit, test çalışması, platform, ortam ve oluşturulma zamanı ile birlikte tutulur. Dokümanın yazılması ≠ kodun çalışması ≠ paketin yayınlanması.

---

## 2. Kalite değerlendirme modeli

### 2.1 Üç eksenli sonuç

Her özellik için ayrı ayrı değerlendirilir:

1. **Spesifikasyon durumu:** `missing | draft | reviewed | approved | superseded`.
2. **Uygulama durumu:** `not-started | in-progress | implemented | verified | blocked`.
3. **Kanıt durumu:** `not-run | passed | failed | blocked | waived`.

Örnek: `REQ-121` için sözleşme `approved` olabilir, transkript editörü `implemented` olabilir; ancak mikrofon/Whisper gerçek uçtan uca testi çalıştırılmadıysa `verified` ve `passed` değildir.

### 2.2 Geçiş durum makinesi

```text
SPECIFIED (approved contract)
       |
       v
IMPLEMENTED --(code review)--> TESTED
       |                         |
       |                         +-- failed --> FIX REQUIRED
       |                         +-- blocked -> BLOCKED
       |                         +-- passed --> VERIFIED
       |                                          |
       +------------------------------------------+
                                                  v
                                            GATE ELIGIBLE
                                                  |
                                         RC/release checks
                                                  v
                                               ACCEPTED
```

Bu şema ürün modülü düzeyindedir; başarısız test yeniden çalıştırılmadan eski başarı kanıtı kullanılamaz. Kaynak revizyonu değişirse etkilenen kanıtlar yeniden üretilecektir.

### 2.3 Sonuç hesaplama

Her `QG-*` kapısı için sonuç `PASS | FAIL | BLOCKED | NOT_RUN | NOT_APPLICABLE` olarak tutulur. `NOT_APPLICABLE`, sadece açıkça tanımlanmış test **varyasyonu** için ve yazılı gerekçeyle geçerlidir; V1'de zorunlu modülün tüm kapısını ortadan kaldırmaz.

```text
hard_gate_passed =
  required_checks_exist
  AND all(required_checks.status == PASS)
  AND no_critical_or_high_open_release_defect
  AND no_required_evidence_missing
```

`BLOCKED`, `NOT_RUN`, `FAIL` ve kaybolmuş kanıt **geçiş değildir**. `WARN` gibi UI etiketi bulunsa bile sert kapının makine durumu değiştirilmez.

### 2.4 Kalite sorumlulukları

| Rol | Birincil iş | Tek başına yapamayacağı |
|---|---|---|
| **Product Owner** | V1 kapsamını, ürün kabulünü, P2 sapmalarını onaylar. | Güvenlik/veri kaybı kapısını kanıtsız kaldırmak. |
| **Architecture Owner** | İş sınırı, data/IPC sözleşmesi ve mimari değişimlerini kontrol eder. | Testi çalıştırmadan çalıştı ilan etmek. |
| **Feature Developer / Agent** | Kod, test, izlenebilirlik ve düzeltme kanıtını hazırlar. | Kendi çalışmasını kanıtsız release onayı saymak. |
| **Quality Owner** | Otomatik koşumların doğruluğunu, test kapsamını ve RC raporunu inceler. | Zorunlu başarısız testi `skipped` işaretleyip gizlemek. |
| **Release Owner** | Paket kaynağı, imza, installer, yayın ve rollback hazırlığını doğrular. | İmzalanmamış/kaynağı belirsiz paketi güvenilir ilan etmek. |

Küçük, tek kişilik projede roller aynı insanda birleşebilir; ancak kanıtların ve onay kayıtlarının ayrı tutulması yine zorunludur.

---

## 3. Kalite kapılarının yaşam döngüsü

### 3.1 G0 — Spesifikasyon kapısı (koddan önce)

**Giriş:** İlgili iş paketi `REQ-*` kimlikleriyle tanımlanmıştır.

**Geçiş:**

- [ ] `DOC-00/02/04` ve özelliğin yetkili teknik dokümanı okunmuş, `approved`.
- [ ] Etkilenen domain / SQL / IPC / provider / UI sözleşmeleri net, çelişki listesi çözülmüş.
- [ ] Normal, boş, hata, iptal, yeniden deneme ve geri alma davranışı yazılmış.
- [ ] Güvenlik ve veri kalıcılığı etkisi değerlendirilmiş.
- [ ] En az bir birim/entegrasyon/E2E test fikri ve gereksinim eşlemesi belirlenmiş.
- [ ] Sayısal performans hedefi varsa yetkili `DOC-31` referansı belirtilmiş.

**Başarısızlık:** Sözleşme eksikse ilgili özellikte üretim koduna başlanmaz; bağımsız spike/prototip yapılabilir fakat V1 kanıtı değildir.

### 3.2 G1 — Değişiklik / pull request kapısı

Her davranış değiştiren PR için:

- [ ] Format, lint, TypeScript `strict` typecheck ve ilgili testler geçiyor.
- [ ] Kullanılan dış bağımlılık sürümü ve lisansı kontrol edilmiş.
- [ ] Etkilenen `REQ-*` ve varsa `JRN-*`, `QG-*` / test bağlantıları PR'da belirtilmiş.
- [ ] Yeni DB alanı varsa migration, geri yükleme veya uyumluluk etkisi ele alınmış.
- [ ] Yeni IPC/tool varsa sınır doğrulaması, authorization ve hata/iptal testleri var.
- [ ] Yeni ekran varsa klavye, loading/empty/error, tema ve iki dil denetlenmiş.
- [ ] AI/voice kullanan kod çekirdek UI'yı bloke etmiyor.
- [ ] Güncel kod revizyonu için CI kanıtları erişilebilir.

**Kod incelenmeden sadece CI yeşili olmak yeterli değildir.** CI konfigürasyonu da değiştirilebildiğinden, test atlama ve muafiyetler ayrıca incelenir.

### 3.3 G2 — Özellik tamamlanma kapısı

**Definition of Done:** Özellik, gerçek kullanıcı yolunda davranışı kanıtlanınca tamamdır; sadece komponent çizilince değil.

- [ ] Gereksinimin bütün P0/P1 yan durumları uygulanmış.
- [ ] Kalıcı veri değişimi mevcutsa başarılı commit ve başarısız rollback gösterilmiş.
- [ ] React state/IPC/app core tutarlılığı test edilmiş.
- [ ] Değişiklik kalıcılığı uygulama yeniden başlatılarak test edilmiş.
- [ ] Lokal hata mesajı, telemetry'siz tanılama ve erişilebilir hata durumu mevcut.
- [ ] Feature-specific testler yeşil, yapay başarı/no-op mock canlı davranış yerine sunulmuyor.
- [ ] Güncel güvenlik / performans / erişilebilirlik etkileri rapor edilmiş.
- [ ] Kabul kanıtına sahip feature owner onayı alınmış.

### 3.4 G3 — RC bütünleşik kapısı

- [ ] V1 `REQ-001–140` envanterinin tamamına doğrulama yöntemi bağlanmış; P0/P1 gereksinimler geçiyor.
- [ ] `AC-001–018` için sonuçlar gerçek E2E veya gerekçeli birleştirilmiş otomasyon+manuel doğrulama ile geçiyor.
- [ ] Temiz kurulum ve yükseltme, provider yokluğu, kesintiler, disk hatası, migration ve restore doğrulanmış.
- [ ] Performans bütçeleri kaynak commit ve referans donanım ile geçiyor.
- [ ] Açık `critical/high` güvenlik veya veri kaybı hatası yok.
- [ ] Release paketinin hash'i, sürümü, commit SHA'sı ve raporu eşleşiyor.
- [ ] Yerel verilerin izinsiz ağ/telemetri çıkışı olmadığı doğrulanıyor.

### 3.5 G4 — Yayın öncesi kapısı

RC doğrulandıktan sonra **aynı paket** temiz Windows makinede (Ollama/Python/Git ön yüklü değil) kurulup açılmalı, temel çalışma döngüsü ve veri kalıcılığı ispatlanmalıdır. Ardından imzalama/güncelleme kanalı, indirme bütünlüğü, sürüm notu, bilinen sınırlamalar ve geri dönüş yöntemi gözden geçirilir. RC'den sonra kod veya paket değiştirilirse etkilenen kapılar yeniden çalışır.

### 3.6 G5 — Yayın sonrası / hotfix

Hata durumunda kullanıcı verisini koruyan güvenli geri dönüş tanımlanır. Hotfix, değişiklikten etkilenmeyen testleri gerekçeyle daraltabilir; **DB migration, güvenlik, yedek, kurulum ve çökme önleyici çekirdek testlerini** kanıtsız atlayamaz. Yeni sürümde eski verinin açılması gerekir; otomatik downgrade işlemi eski şemayla uyumsuzsa engellenmelidir.

---

## 4. Kanonik kalite kapısı kataloğu (`QG-*`)

Bu kimlikler **global yayın kararı** için oluşturulmuştur. `DOC-33` bunları gerçek `TEST-*` kayıtlarıyla ilişkilendirir; her `QG` için en az bir kanıt sahibi olur. `HARD`, başarısızlığın V1 yayınını durdurduğu; `CONDITIONAL`, modülün belirli koşullarda çalışması gereken varyasyonları içerdiği anlamındadır. `CONDITIONAL` hiçbir zaman ürünün V1 zorunluluğundan muafiyet değildir.

| Kimlik | Kapı | Kapsam | Sertlik | Birincil norm |
|---|---|---|---|---|
| **QG-001** | Spesifikasyon / izlenebilirlik bütünlüğü | 140 REQ + 18 AC/JRN | HARD | DOC-00, 02, 33 |
| **QG-002** | Derleme, tip, lint, birim testleri | Tüm çalışma alanı | HARD | DOC-05, 07, 33 |
| **QG-003** | Güvenli süreç ve IPC sınırları | Electron / core / renderer | HARD | DOC-06, 11, 30 |
| **QG-004** | SQLite veri modeli ve transaction | Tüm kalıcı kayıtlar | HARD | DOC-08–10 |
| **QG-005** | Eşzamanlılık ve gerçek kaydedildi durumu | CRUD / autosave | HARD | DOC-10, 12–14 |
| **QG-006** | Migration ve bozuk DB kurtarma | Açılış / yükseltme | HARD | DOC-09, 17, 32 |
| **QG-007** | Tutarlı yedek / geri yükleme | DB + asset + metadata | HARD | DOC-17, 32 |
| **QG-008** | Markdown/YAML round-trip ve güvenli import | Import/export/Git | HARD | DOC-16, 30 |
| **QG-009** | Proje/görev/not/karar/log işlevleri | Core + UI | HARD | DOC-13, 14 |
| **QG-010** | Arama doğruluğu ve FTS kurtarma | FTS5 / TR-EN arama | HARD | DOC-15, 31 |
| **QG-011** | AI olmadan offline açılış / kullanım | Temel uygulama | HARD | DOC-18, 19, 24 |
| **QG-012** | Setup skip/resume / capability sağlık | İlk kurulum / ayarlar | HARD | DOC-18, 19 |
| **QG-013** | Ollama/model manager güvenilirliği | Provider algılama / model indirme | CONDITIONAL | DOC-24, 25 |
| **QG-014** | Agent tool izinleri / mutasyon doğruluğu | AI etkin yol | CONDITIONAL | DOC-26, 27, 30 |
| **QG-015** | Agent izlenebilirlik / iptal / redaksiyon | AI etkin yol | CONDITIONAL | DOC-27, 30 |
| **QG-016** | STT izin, kayıt, transkript / fallback | Voice etkin yol | CONDITIONAL | DOC-28 |
| **QG-017** | TTS playback / bağımsız fallback | Voice etkin yol | CONDITIONAL | DOC-29 |
| **QG-018** | UI erişilebilirlik / klavye / durumlar | Tüm kritik ekranlar | HARD | DOC-20–23 |
| **QG-019** | Dark/light/system ve TR/EN tutarlılık | Tüm ekranlar | HARD | DOC-20–23 |
| **QG-020** | Mahremiyet, URL, import ve onay politikası | Uygulama + agent + provider | HARD | DOC-30 |
| **QG-021** | Performans / kaynak bütçeleri | Açılış, arama, input, listeler | HARD | DOC-31 |
| **QG-022** | Hata izolasyonu / tanılama | DB, sidecar, UI, IPC | HARD | DOC-32 |
| **QG-023** | 18 kullanıcı kabul yolculuğu | Uçtan uca | HARD | DOC-02/03, 33 |
| **QG-024** | CI tekrarlanabilirlik / supply chain | PR ve release işleri | HARD | DOC-33, 34 |
| **QG-025** | Windows yükleyici ve temiz makine testi | Dağıtım | HARD | DOC-34 |
| **QG-026** | Güncelleme / geri dönüş / sürüm uyumu | Installer/updater | HARD | DOC-32, 34 |

### 4.1 Opsiyonel özellik testini kaçırmama kuralı

`QG-013–017` için iki **ayrı** kabul kategorisi zorunludur:

- **Unavailable/disabled:** Bileşen kurulu değil, kullanıcı atladı veya servis kapalı. Temel uygulama ve ayarlar doğru çalışır; giriş noktası doğru bilgi gösterir. Bu testler *her release'de HARD*.
- **Installed/enabled:** Gerçek provider/model ve uygun donanım mevcutken belirtilen özellik çalışır; sorunlar görünür, iptal/yeniden deneme güvenlidir. Bu testler *V1 özelliğinin uygun test ortamında HARD*; standart CI'da bağımlılık yok diye sahte `PASS` verilmez. Ayrı provider lab sonucu RC'ye bağlanır.

Uygun donanım bulunamazsa `BLOCKED` raporlanır; ürün sahibi özelliği V1'den resmen çıkarmadıkça **RC kapısı geçilmiş sayılmaz**. `DOC-02` kapsamı değiştirilirse ilgili REQ/AC/QA planı sürümlenerek güncellenir.

### 4.2 Kapı sahipliği kuralı

Bir kapı birden fazla bileşeni kesebilir fakat **tek bir doğrulama sahibi** atanır. Örnek: FTS5 `QG-010` performans kısmını `DOC-31` tanımlar, arama semantiğini `DOC-15`, release geçişini bu belge belirler. Tablolardaki atıflar referanstır; SQL veya IPC sözleşmelerinin ikinci kopyası değildir.

---
## 5. Yatay kalite kriterleri ve kanıtlanacak davranışlar

Bu bölüm teknik dokümanlarda ayrıntılanacak sözleşmeleri yeniden yazmaz. Her alan için **kabul kanıtının ne göstermek zorunda olduğunu** belirler.

### 5.1 Veri bütünlüğü ve SQLite (`QG-004/005/006`)

**Zorunlu invariants:**

- Tek doğruluk kaynağı SQLite; Markdown/JSON/YAML içe-dışa aktarımı paralel yazma deposuna dönüşmez (`P-03`, `REQ-063–068`).
- Foreign key, benzersiz kimlik, versiyon ve `CHECK` kuralları veritabanı seviyesinde doğrulanır (`DOC-08/09`).
- Kalıcı işlem atomiktir: ara adımda hata üretilirse veri yarım durumunda kalmaz.
- UI üzerinde optimistik sonuç gösterilebilir; **başarı bildirimi** doğrulanmış commit'ten önce verilmez.
- Aynı değişiklik iki kez iletildiğinde idempotency kuralı ihlal edilmez; tekrarlı görev veya çift silme oluşmaz.
- Eski entity revision'ı ile yapılan çakışan yazma **sessiz veri ezme** yaratmaz.
- WAL ve checkpoint stratejisi altında beklenen okuyucu/yazıcı davranışı ölçülür; main/renderer bloke olmaz.
- Bozuk DB ya da migration uyumsuzluğu otomatik boş workspace açılmasıyla maskelenmez.

**Kanıt seti:** SQL integrity / foreign-key kontrol çıktısı, failpoint ile ortada kesilen transaction testi, çatışan yazma testi, crash/restart testleri, migration yükseltme ve rollback/kurtarma raporu. İlgili mekanizmanın doğru teknik uygulaması `DOC-09/10/17` ile sabitlenir.

**Negatif vakalar:** disk-full simülasyonu, read-only workspace, DB busy/lock, programı işlem ortasında sonlandırma, şema sürüm uyuşmazlığı, eşzamanlı düzenleme.

### 5.2 Yedek, asset, restore (`QG-007`)

Geçerli yedek yalnızca içinde `.db` dosyası bulunan klasör değildir. Canlı WAL veritabanından **tutarlı SQLite yedeği**, ilişkili asset'ler, restore için gerekli meta ve bütünlük bilgisi gerekir.

Geçiş kanıtı:

1. Canlı veri yazılırken snapshot oluşturma testi, SQLite backup tekniği ile tamamlanır.
2. Yedeğin veritabanı tutarlılığı, manifest ve var olan asset eşleşmeleri doğrulanır.
3. Kullanıcı yedek içerik ve etki önizlemesi görür; geri yükleme açık onay ister.
4. Restore sonrası proje ID'leri, görev bağlantıları, karar ilişkileri, not ve asset referansları kontrol edilir.
5. Restore iptali/bozuk arşiv/alan yetersizliğinde aktif workspace korunur; geçici dosyalar temizlenir veya anlaşılır kurtarma durumunda saklanır.
6. Sonradan şema migration gerekiyorsa geri yükleme politikası ve sürüm uyumu `DOC-17/32`'ye göre kontrol edilir.

**Fail koşulu:** Kayıt sayıları tutuyor diye metin, ilişkiler veya asset'ler kaybolmuş olsa bile `PASS` verilemez. Karşılaştırma kimlikleri, içerikleri ve referans bütünlüğünü kapsar.

### 5.3 Import/export ve Git (`QG-008`)

- Aynı mantıksal verinin tekrarlı export'u, zaman damgası/kararlı sıralama kuralları içinde gereksiz diff oluşturmamalıdır.
- Round-trip sonrası normalize edilmiş domain kayıtları ve referans bağlantıları eşdeğer olmalı; yalnız tanımlı kayıplı alanlar ayrı raporlanmalıdır.
- Bozuk YAML/Markdown, eksik alan, aşırı büyük dosya, zararlı link, symlink ve `../` path traversal reddedilmeli; mevcut veri değişmemelidir.
- Export, kullanıcı dosyalarının üzerine açık onay olmadan yazamaz; yarım paket son paket diye sunulmaz.
- Git eksikliği offline çekirdeği bozmaz; Git commit sadece seçilen export dosyalarını stage eder. Uzak `push` açık onaysız başlamaz.
- İş raporu eklenen, güncellenen, atlanan ve hatalı kayıtların sayısını ve nedenlerini gösterir.

**Kanıt:** Golden export fixture + re-import karşılaştırması; malicious fixture test raporu; güvenli Git test deposu ve izin akışı. Git'in gerçek uzak sunucuya bağlanmasını gerektirmeyen hermetik testler önceliklidir.

### 5.4 Çekirdek ürün ve arama (`QG-009/010`)

Projeler, görevler, notlar, kararlar ve loglar ortak kimliklere sahip olmalı; birden fazla UI görünümünde **aynı** kaydı göstermelidir.

Geçiş koşulları:

- Proje oluştur/düzenle/arşivle/geri al ve kalıcı sil işlemleri beklenen sonuçları verir.
- Inbox'a ekleme ve daha sonra projeye taşıma ID değişikliğine yol açmaz.
- Liste ve Kanban görünümündeki aynı görevde durum/öncelik/manuel sıra tutarlıdır.
- Kararlar güncellenip yerine başka karar konduğunda eski gerekçeye ulaşılır.
- Günlük ekleme ve yanlış kaydı düzeltme politikası veri geçmişini gizlemez.
- Kaynak not/görev/karar/log içeriği arama sonucundan doğrudan açılır.
- Türkçe `i/İ/ı/I`, ekler, kısmi metin ve diakritik davranışları **beklenen bir golden query setiyle** doğrulanır. Bu belge gelişmiş Türkçe kök bulma başarısı vaat etmez; normalizasyon kesin davranışı `DOC-15`'indir.
- FTS indeksi bozulduğunda yeniden üretim, özgün not metnini veya görev verisini silmeden sonuç verir.
- Boş liste, boş filtre sonucu ve arama sonucu yok durumları farklı mesajlar verir.

**Kanıt:** Domain birim/entegrasyon testleri, UI E2E navigasyon, Türkçe sorgu fixture'ı ve indeks restore testi.

### 5.5 AI'sız açılış ve setup (`QG-011/012`)

**Zorunlu test ortamı:** Temiz Windows profili, internetsiz, Ollama/Git/Python/model yok.

- Uygulama açılır; çalışma alanı seçilir; AI ve ses atlanır; proje/görev/not eklenir, aranır ve yeniden başlatma sonrası bulunur.
- Kurulum yarıda kapanıp yeniden açılabilir; workspace'deki mevcut veriyi silmez.
- `setup_completed`, `ai_enabled`, `provider_health`, `selected_model` ve aktif iş durumları tek boolean'da birleştirilmez.
- Model/provider yokluğu Splash ekranını veya CRUD'u engellemez; kontrol timeout ile sonlanır.
- Kullanıcı AI'yı ayarlardan açıp kapatır; uygulamayı baştan kurmak gerekmez.
- Yerel Ollama servisi sonradan kaybolursa Chat `unavailable` durumuna geçer, kayıtlı sohbetler ve veri durur.
- Mikrofon/TTS ayrı ayrı açılıp kapatılabilir.

**Kanıt:** Temiz kuruluma ait E2E, ağ kapalı smoke, setup yarıda kesilme ve capability transition testleri. İlk çalıştırma sadece tam ekran yükleme spinner'ıyla geçirilmişse başarısızdır.

### 5.6 Provider ve model yönetimi (`QG-013`)

Test edilecek durum matrisi:

| Durum | Beklenen davranış | Başarı kanıtı |
|---|---|---|
| Ollama kurulu değil | Kurulum yönlendirmesi; AI skip açık | Ana uygulama kullanılabilir |
| Kurulu, servis kapalı | Kısa timeout; başlat/yeniden dene | Sonsuz spinner yok |
| Çalışıyor, model listesi boş | Model seçme/indirme önerisi | Yanlış `Ready` yok |
| Model listeleniyor, çalıştırma uyumsuz | Uyum uyarısı ve alternatif seçim | Servis doğru hata raporluyor |
| GPU bilgisi yok | Güvenli manuel model seçimi | Kurulum bloke değil |
| Disk alanı yetmiyor | Ön kontrol ve açık hata | Yanlış indirme/başarı durumu yok |
| İndirme başladı, kullanıcı iptal etti | İptal/terminal durum görünür | Veri ve app core etkilenmez |
| İndirme sırasında kapanma | Setup/progress doğrulanır, yeniden dene/yeniden denetle | Kısmi dosya `Ready` değil |
| Model dışarıdan silindi | Başlangıçta veya kullanımda tekrar sağlık kontrolü | Chat unavailable / yeniden seç |
| Ollama başka uygulama tarafından kullanılıyor | Yalnız Iterkeep'in isteği iptal edilir | Harici servis/proses öldürülmez |
| Provider geçici ağ/yerel API hatası | Sınırlı retry/backoff ve son durum | UI donmaz |

Donanım önerisi testinde modelin paketteki boyutu **gerçek RAM/VRAM gereksinimiymiş gibi** kullanılmaz. Sonuç, öneri gerekçesi, uygunluk ve gerçekten yapılan tool benchmark'ıyla birlikte görünür. Model indirme kaynağı/lisans/gerekli disk alanı gösterilmeden onaysız indirme yapılamaz. Provider adaptörü mock testleri tek başına bu kapıyı geçirmez; uygun gerçek Ollama sürümü üzerinde entegrasyon testi gerekir.

### 5.7 Agent güvenliği, eylem doğruluğu ve görünürlük (`QG-014/015`)

**Agent tool çağrısı için invariant:** `proposed != authorized != committed`. Modelin bir eylem yapmayı istemesi, eylemin izinli olduğu veya başarıyla gerçekleştiği anlamına gelmez.

Zorunlu test kanıtları:

1. Modelin ürettiği tüm araç parametreleri güven sınırında doğrulanır. Bilinmeyen tool, geçersiz parametre, aşırı büyük payload, farklı workspace ID ve yasak path reddedilir.
2. Serbest shell, doğrudan SQL veya genel dosya erişimi bir agent yeteneği değildir.
3. Yıkıcı/toplu eylemde hedef ve etki gösterilir; kullanıcı reddettiğinde veri değişmez.
4. Normal görev ekleme gibi izinli bir araç, sadece servis katmanının **gerçek kalıcı sonucu** sonrası tamamlandı görünür.
5. Bir run içinde ilk tool başarılı, ikinci tool reddedilmiş veya hata almış olabilir. Geçmiş bunu tek bir 'hepsi başarılı' yanıtına indirgemez.
6. Tool çağrısında `run_id`, `step_id`, durum, süre, güvenli input/output özeti ve hata kodu izlenir.
7. Kullanıcı iptal ettiğinde yeni eylemler durur; zaten commit edilmiş işlemlerin geçmişi saklanır, yanlış rollback iddiası verilmez.
8. Prompt injection içeren proje notu kullanıcı yetkisini genişletemez; doküman metni komut yetkisi kazanmaz.
9. Modelin ürettiği kaynak linkleri gerçek kayıt kimliğine bağlanır; uydurma kaynak 'bulundu' diye gösterilmez.
10. Tanı/audit kayıtları parola, token, ses içeriği veya tam özel not metnini varsayılan olarak ifşa etmez.

**Kanıt:** Yetkisiz tool red testleri, komut-vs-kaynak saldırı fixture'ları, multi-step partial-success E2E, DB diff kanıtı ve sanitize edilmiş audit snapshot. Görünür adımlar **gerçek tool olaylarıdır**; gizli model düşünce zinciri UI'ya sunulmaz.

### 5.8 Sesli giriş (`QG-016`)

- Mikrofona ilk basış kayıt açar, ikinci basış durdurur. Kayıt devam ederken UI durumu açıkça görünür.
- İzin yok, cihaz bağlı değil, model yok, sessiz kayıt, boş transkript, STT time-out/çökme, iptal ve kaynak yetersizliği ayrı kullanıcı sonuçlarıdır.
- Kayıt durduğunda transkript **düzenlenebilir önizlemeye** döner; kullanıcı düzeltip nereye göndereceğini (not/görev/chat) seçer.
- Ses düğmesi otomatik silme / Git push / kaydı düzenleme gibi riskli agent eylemlerinin onayını atlayamaz.
- Kaydedilmemiş ham ses varsayılan olarak geçicidir; retention ve kullanıcıya görünür silme politikası doğrulanır.
- Herhangi bir STT işleme aşaması UI ve ana Electron sürecini kilitlemez.

**Kanıt:** Örnek Türkçe WAV'lar üzerinden deterministik regresyon, gerçek mikrofon izni testleri ve kayıt durum yaşam döngüsü E2E. STT model versiyonu, cihaz ve çıkarım ayarları kaydedilir. Tek bir WER rakamı kullanıcı deneyiminin tümünü temsil etmez; yanlış transkript düzeltme mutlaka test edilir.

### 5.9 Sesli yanıt (`QG-017`)

- EMA Lightning kurulu/değil ve açık/kapalı durumları ayrı kontrol edilebilir.
- İsteğe bağlı TTS, yanıtın gösterilmesini geciktiren zorunlu blok oluşturmaz.
- Oynatma başlat, durdur, iptal ve model çökmesi doğru UI durumlarını üretir.
- Sidecar yaşam döngüsü kendi proses sınırında yönetilir; kaynak tüketimi ve olası GPU/RAM çakışması raporlanır.
- TTS başarısız olsa bile metin yanıtı ve agent işlem geçmişi korunur.
- Paket ayrı indiriliyorsa kullanıcı onayı, kaynak, lisans ve disk alanı kontrolü sağlanır.

**Kanıt:** TTS entegrasyon ve playback testleri, sidecar kill/fallback testi, kaynak kullanım raporu; gerçek ses niteliği için kısa manuel kabul tutanağı. Belirli gecikme eşikleri `DOC-31` tarafından tanımlanır.

### 5.10 Erişilebilirlik, tema ve dil (`QG-018/019`)

**Hedef:** İlgili WCAG 2.2 AA prensipleri masaüstü UI davranışına uyarlanır; otomatik araç tek başına 'WCAG uyumlu' beyanına yeterli değildir. Platforma özgü uygulama kontrolü yapılır.

- Klavye ile proje oluşturma, görev ekleme, not düzenleme, arama, setup skip ve agent onayı/ret tamamlanabilir.
- Odak görünür, mantıklı sırada ve modal/drawer kapanınca geri döner; focus trap kullanıcıyı kilitlemez.
- İkon-only kontrollerin erişilebilir adları ve eylem durumları bulunur.
- `loading`, `saving`, `saved`, `failed`, `approval required` ve `recording` ekran okuyucu için de anlamlıdır.
- Hata yalnız kırmızı renkle anlatılmaz; metin ve uygun semantik sunulur.
- Reduced-motion ayarı çalışır; kritik durum değişimini tamamen görünmez kılmaz.
- Light/dark/system geçişi veriyi veya aktif editörü bozmaz. Hardcode renkler merkezi token sistemini atlatmaz.
- TR/EN geçişi temel fonksiyonlarda eksik string, taşma, tarih/sayı biçimi karmaşası veya yanlış klavye davranışı üretmez.
- Dar pencere, yüksek ölçekleme/zoom ve uzun metin alanlarında kontroller erişilebilir kalır.

**Kanıt:** Erişilebilirlik statik taraması + manuel klavye/ekran okuyucu smoke + görünüm snapshot'ları ve TR/EN metin kontrolü. Ekran okuyucu/platform matrisi `DOC-23/33`'ün sorumluluğundadır.

### 5.11 Güvenlik ve gizlilik (`QG-003/020`)

**Release'i bloke eden asgari negatif sonuçlar:**

- Renderer keyfî Node, SQL, dosya sistemi veya OS process yetkisine ulaşabiliyor.
- IPC, kaynak yolunu veya kullanıcı otoritesini doğrulamadan mutasyon yapıyor.
- Harici import/Markdown/HTML içeriği script, tehlikeli URL veya path traversal üzerinden yetki yükseltiyor.
- Agent dosya içeriğindeki prompt injection ile keyfî command/secret export yapabiliyor.
- Varsayılan ağ/telemetri/kayıt mekanizması kullanıcı bilgisi olmadan proje, prompt, ses veya log içeriğini gönderiyor.
- Repo/CI paketine kimlik bilgileri veya kullanıcı gerçek workspace verileri giriyor.
- Güncelleme sistemi kaynağı veya bütünlüğü doğrulanmamış executable kuruyor.
- Kurulu olmayan Ollama/Python/Whisper/EMA için uygulama habersizce uzak bir servise veri yolluyor.

**Kanıt:** İşletim sistemi ve Electron güvenlik kontrol raporu, IPC sınır testleri, malicious Markdown/import fixture'ları, ağ izolasyon denetimi, dependency/secrets taramaları ve açık threat-model onayı. Tehdit sınıfları, tam kontrol listesi ve uygun yaptırımlar `DOC-30`'un yetkisindedir.

### 5.12 Hata izolasyonu ve kullanıcıyı yanıltmama (`QG-022`)

- UI çökmesi veya worker/sidecar hatası, kalıcı DB kaydını bozmaz.
- AI, Ollama, STT ve TTS hata durumları çekirdeğin çalışmasını engellemez.
- Hata nesneleri sınıflandırılmış, anlamlı, kişisel veri sızdırmayacak ve uygun `retry/recover/report` yollarını sunacak biçimdedir.
- Kullanıcıya *kaydedildi* sözü yalnız doğrulanmış sonuçtan sonra verilir.
- Yerel redakte edilmiş tanılama raporu kullanıcı talebiyle oluşturulur; izinsiz upload edilmez.
- Kullanıcı bir işlem tamamlama sırasında uygulamayı kapatırsa kalıcı/kalıcı olmayan sonuç yeniden açılışta ayırt edilir.
- Güncelleme veya migration başarısızlığında veri kaybetmeden geri dönüş veya açık kurtarma yolu sağlanır.

**Kanıt:** Worker kill, renderer reload, IPC timeout, DB failpoint, model process crash ve disk hatası matrisi. Hata kodu ve kurtarma akışları `DOC-32`'ye bağlanır.

---
## 6. Performans: ölçüm standardı ve yayın geçişi (`QG-021`)

### 6.1 Tek normatif eşik kaynağı

Bu bölümdeki hedefler `DOC-00`, §10'dan taşınan **başlangıç ürün bütçeleridir**; nihai benchmark eşiklerinin, fixture üretiminin ve ölçüm araçlarının tek normatif kaynağı `DOC-31-PERFORMANCE-BENCHMARKS.md` olacaktır. `DOC-31` onaylandığında bu bölüm eşik değeri kopyalamak yerine `PERF-*` kimliklerini referanslamalıdır.

| Ölçülen davranış | Başlangıç hedefi (garanti değil) | Yayın kararının gereği |
|---|---|---|
| Normal SSD'li Windows açılış → kullanılabilir temel UI | ≤ 1,5 s | Cold/warm ayrımı ve gerçek ilk etkileşim ölçülür. |
| Görev ekleme görsel feedback | ≤ 50 ms | Kaydedildi durumu yalnız DB commit sonrası gösterilir. |
| Tipik görev oluşturma kalıcı commit | ≤ 250 ms | Başarısız commit geri alınır; P95 raporlanır. |
| Büyük kayıtta tipik FTS arama | 100.000 kayıt için P95 ≤ 100 ms | Sorgu türü, warm/cache, filtre ve Türkçe fixture tanımlanır. |
| Scroll/interaction | 60 FPS hedefi | Uzun listeler ve terminal/agent akışı ölçülür. |
| AI kapalı boşta kaynak | Düşük ve stabil CPU/RAM | Nihai sayı `DOC-31`; provider proses yokluğu ayrıca kanıtlanır. |

Bu hedefler **ölçülmüş sonuç gibi** README, pazarlama sayfası veya release notlarına konamaz. Kanıt bulunmadan `PASS` verilmez. Düşük güçte cihazda bazı bütçeler sağlanamıyorsa uygulama yanıt verebilir kalmalı; uyum matrisinde destekleniyor/desteklenmiyor ayrımı açık olmalıdır.

### 6.2 Zorunlu benchmark koşulları

Ölçüm en az şu bilgileri içerir:

- Git commit SHA, paket sürümü, build türü (development/packaged) ve Electron/Node sürümleri.
- OS sürümü, CPU, RAM, disk/SSD, GPU/VRAM ve güç modu.
- Veri fixture kimliği, kayıt sayıları, boyut, indeks durumu ve veri üretim seed'i.
- Uygulamanın cold/warm başlaması, disk cache durumu ve model/sidecar açık olup olmadığı.
- Deneme sayısı, örneklem dağılımı, medyan, P95 ve uygun yerde P99.
- Birim (`ms`, `MB`, `MiB`, `FPS`, `%CPU`, `tokens/s` gibi) ve toplanma yöntemi.
- Başarısız/tamamlanamayan denemelerin sayısı ve gerekçesi; başarısız denemeler sessizce dışlanamaz.

**Referans veri seti sınıfları (boyutlar önerilen başlangıç, kesin seed tasarımı `DOC-31`):**

| Fixture | Kapsam | Test amacı |
|---|---|---|
| `FIX-SMALL` | 5 proje, 50 görev, 100 not/log | Sık kullanılan günlük akış ve sıcak açılış |
| `FIX-MEDIUM` | 100 proje, 10.000 aranabilir kayıt | Gerçekçi veri çeşitliliği, filtreler |
| `FIX-LARGE` | 1.000 proje, ≥100.000 log/kayıt; karma TR/EN | İndeks, UI sanallaştırma, memory, arama |
| `FIX-ADVERSARIAL` | Büyük metin, Unicode, bozuk import, aşırı bağlantı | Dayanıklılık ve sınır durumları |

100.000 **log satırı** ile 100.000 **arama kaydı** aynı yükü üretmez; ikisi ayrı fixture varyasyonları olarak ölçülecektir. Tek büyük Markdown gövdesi ile 100 bin ayrı DB row'u eş değer sayılmayacak.

### 6.3 İki performans kanıtı gereklidir

1. **Otomatik bütçe testi:** Stabil donanım/runner üzerinde, tanımlı eşiklerle tekrar edilebilir. Zaman açısından oynak paylaşımlı CI ortamı tek başına yayın performansı kanıtı değildir.
2. **Paketli uygulama testi:** Üretim Windows kurulumunda kullanıcının deneyimini temsil eder; dev server, sıcak bağımlılık cache'i ve mock provider ile yanıltıcı sonuç üretmez.

### 6.4 Görev ekleme ve kaydedildi semantiği

```text
T0: kullanıcı Enter/Save tıklar
T1: UI pending/optimistic görünür                  -> input responsiveness
T2: core doğrular ve SQLite transaction yürütür
T3: commit başarı yanıtı                          -> durability latency
T4: UI "Kaydedildi" gösterebilir                  -> verified success

T2/T3 error -> pending kaldır; taslağı/geri alma yolunu koru; hata göster
```

`T1` anındaki görsel değişim `T3` gerçekleşmeden `saved` gibi ilan edilirse performans bütçesi sağlanmış olsa bile `QG-005` geçmez.

### 6.5 Performans regresyonu ve waiver

`DOC-31`, ölçüm gürültüsü, tekrarlanma sayısı ve regresyon karşılaştırma yöntemini belirler. Doğrulanmış eşik aşımı `QG-021=FAIL` olur. Algılanabilir bozulma fakat ürün hedefinin altında kalan ölçüm değişikliği için `P2` türü iyileştirme açılabilir. Veri kaybına, UI'nın sürekli kilitlenmesine veya bellek sızıntısına yol açan sorun “performans sapması” diye yumuşatılamaz.

---

## 7. `AC-001–018` → kullanıcı yolculuğu → kalite kapısı matrisi

Aşağıdaki **18 senaryonun hepsi V1 release acceptance** kapsamındadır. `JRN-XXX` kimliği `DOC-03`'te aynı numaralı kullanıcı yolculuğunu, `AC-XXX` `DOC-02`'de beklenen ürünü gösterir. Gerçek otomasyon `TEST-*` numaralarını `DOC-33` atar.

| AC / JRN | Kabul konusu | Birincil QG | Mutlaka görülecek kanıt |
|---|---|---|---|
| **001** | AI'sız temiz kurulum | 011, 012, 025 | Temiz Windows + offline E2E, DB'de kalıcı proje/görev/not |
| **002** | Inbox'a hızlı yakalama | 005, 009 | Bir kez commit, ID korunarak başka projeye taşıma |
| **003** | Üç hafta sonra projeye dönüş | 009, 010 | Son log + açık görev + ilgili karar aynı proje bağlamında |
| **004** | Eski ve yeni karar gerekçesi | 009, 010 | Superseded zinciri, tarih, gerekçe, kaynak linki |
| **005** | Liste/Kanban aynı görev | 004, 005, 009 | Tek kayıt, restart, commit-failure UI rollback |
| **006** | Türkçe birleşik arama | 010, 021 | Golden query seti, filtreler, sonuç ID ve kaynak |
| **007** | Markdown round-trip | 008 | ID/içerik/ilişki eşdeğerlik raporu, deterministik export |
| **008** | Kötü import, veri sağlam | 008, 020 | Path traversal reddi, önce/sonra DB hash/kanıt |
| **009** | Tutarlı yedek ve restore | 006, 007 | Doğrulanmış snapshot, etki onayı, geri yükleme bütünlüğü |
| **010** | Ollama yokken başla; sonradan aç | 011–013 | Core kesintisiz, capability refresh, model seçimi |
| **011** | Model indirirken çıkış | 012, 013, 022 | Yarım indirme ready değil, yeniden deneme / sağlık kontrolü |
| **012** | Agent tool izleme ve ret | 014, 015, 020 | Gerçek run/step, etki önizlemesi, redde DB değişmez |
| **013** | Düzeltilebilir transkript | 016, 018 | Bas/kaydet/durdur, editable transcript, kullanıcı commit'i |
| **014** | TTS bozuk/kapalı | 017, 022 | Metin yanıtı ve geçmiş bozulmaz, hata görünür |
| **015** | Offline ve mahremiyet | 011, 020, 025 | İnternetsiz temel işlev; izin dışı trafik/veri aktarımı yok |
| **016** | İzin hatası/disk doluluğu | 004–007, 022 | Yanlış başarı yok; taslak/veri korunur; anlamlı kurtarma |
| **017** | Migration başarısız | 006, 007, 022 | Backup, tutarsız yükseltmenin reddi, geri dönüş |
| **018** | Tema ve dil değişimi | 018, 019 | TR/EN, dark/light/system, persistence, erişilebilirlik |

Her satırın başarılı sayılması için ilgili AC'nin **Given / When / Then** maddelerinin tamamı gözlenmelidir. Tek bir ekran görüntüsü veritabanı bütünlüğünü kanıtlayamaz; SQLite assertion / restart doğrulaması gibi ikinci seviye kanıtlar gerekir.

### 7.1 AC testlerinde varyasyon ilkesi

Kanonik 18 senaryo, V1'in kullanıcı kabul omurgasıdır; **tek başına 140 gereksinimin tamamını kapsamaz**. `DOC-33` ayrıca `REQ-010–011`, `018–020`, `033–040`, `047–052`, `069–072`, `080–092`, `103–106`, `112–118`, `123–128`, `135–140` ve diğer dolaylı gereksinimleri tek tek teste bağlar.

Her AC ailesinde uygun olduğunda şu varyasyonlar bulunmalıdır:

- Normal geçiş ve yanlış/eksik kullanıcı girdisi.
- Uygulama kapatma / yeniden başlatma ve kaydın hâlâ bulunması.
- Hata enjeksiyonu ve yanıltıcı başarı mesajının oluşmaması.
- Klavye, tema, dil, pencere boyutu ve ekran okuyucu davranışı.
- İlgili opsiyonel provider mevcut değilken UI ve çekirdek davranışının devamı.
- Çakışma, çift tıklama, tekrarlı çağrı veya yarış durumu.

### 7.2 Gereksinim ailelerine göre izleme kapıları

| REQ aralığı | Ana alan | Varsayılan QG eşlemesi |
|---|---|---|
| 001–012 | Workspace / ilk açılış | 006, 011, 012, 022, 025 |
| 013–024 | Projeler | 004, 005, 009 |
| 025–040 | Görevler / Kanban | 004, 005, 009 |
| 041–052 | Notlar / kararlar / loglar | 004, 005, 009 |
| 053–062 | Arama / navigasyon | 010, 021 |
| 063–072 | Import/export/Git | 008, 020 |
| 073–080 | Yedekleme / restore | 006, 007, 022 |
| 081–092 | UI / erişilebilirlik / dil | 018, 019 |
| 093–106 | Setup / model yönetimi | 011, 012, 013 |
| 107–118 | AI / agent | 014, 015, 020 |
| 119–128 | STT / TTS | 016, 017, 022 |
| 129–140 | Güvenlik / işletim / kalite | 003, 020–026 |

Bu **aralık matrisi tek tek requirement coverage yerine geçmez**. `DOC-33`'te `REQ-001` ile `REQ-140`'ın her biri belirli `TEST-*` kimliğine ve kanıt adımına tek tek bağlanacaktır.

---

## 8. Test piramidi, ortamlar ve fixture kuralları

### 8.1 Katmanlar ve kabul kanıtı

| Katman | Ne test eder? | Mock kullanımı | Release rolü |
|---|---|---|---|
| **Static** | TS strict, lint, format, import sınırı, secret/dependency taraması | Uygulanmaz | Her PR |
| **Unit** | Domain kuralları, normalizasyon, policy, reducer, schema parse | İzole bağımlılıklar | Her PR |
| **DB integration** | Gerçek SQLite, transaction, foreign key, FTS5, migration | SQLite **gerçek** kullanılır | Her PR/RC |
| **IPC integration** | Preload allowlist, kaynak doğrulama, typed error, cancel | Servis stub izinli; güven sınırı gerçek | Her PR/RC |
| **Renderer component** | Form state, tema, a11y, loading/error, localization | Sağlayıcı mock izinli | Her PR |
| **Electron E2E** | Paketli veya test bundle ile tam UI/core yaşam döngüsü | İhtiyaç duyulunca fixture provider | RC |
| **Provider contract** | Ollama/Whisper/EMA adaptörünün protokolü | Deterministik stub zorunlu | PR/RC |
| **Provider real integration** | Gerçek modelin kurulumu, tool/STT/TTS sonucu ve kaynak ölçümü | **Sadece mock yeterli değil** | RC/hardware lab |
| **Performance** | Paketli çalışma, fixture ölçekleri, süre ve memory | Gerçek DB ve UI; AI için gerçek runtime | RC |
| **Installer/update smoke** | Temiz makine, yükleyici, yükseltme, geri dönüş | Mock installer kabul edilmez | RC/release |

`DOC-33`, seçilen Vitest/Playwright/Electron runner'larını, test komutlarını ve `TEST-*` kataloğunu sürümlü biçimde kesinleştirir. Bu belgede araçların API çağrıları ve sürümleri **yetkili sözleşme** olarak yazılmaz.

### 8.2 Desteklenen test işletim ortamı

**Birincil dağıtım ve release kanıtı:** Windows (temiz kullanıcı profili, üretim paketi). Kod yapısı macOS/Linux'u engellemeyecek; ancak `DOC-34` bu platformlarda resmî destek veya otomatik update taahhüdü vermedikçe V1 Windows release kanıtı bu platformlarda başarı iddiasına dönüşmez.

Test ortamlarında ayrı profiller tutulur:

| Ortam | Zorunlu özellik | Kullanım |
|---|---|---|
| `CI-HERMETIC` | İnternet gerektirmeyen fixture; gerçek SQLite; provider stub | Birim/entegrasyon ve çoğu E2E |
| `WIN-CLEAN` | Temiz Windows, Git/Python/Ollama yok, offline | Installer ve çekirdek acceptance |
| `WIN-UPGRADE` | Önceki desteklenen sürümde yaratılmış veri/yedek | Migration + updater + rollback |
| `WIN-LARGE` | Referans SSD/CPU/RAM + büyük fixture | PERF ve bellek sızıntısı |
| `AI-LAB` | Gerçek Ollama, izinli modeller, kaynak profili | Tool/model seçimi ve agent |
| `VOICE-LAB` | İzinli mikrofon/ses aygıtı + gerçek STT/TTS | Ses davranışı ve resource manager |

Test ortamındaki servis yokluğunu mock `healthy` bildirerek geçmek **yasaktır**. `AI-LAB`/`VOICE-LAB` testlerine erişilemiyorsa o kapı `BLOCKED`; kapatılmamış iş olarak raporlanır.

### 8.3 Fixture tasarım ilkeleri

- Gerçek kullanıcı verisi, özel sohbet, gerçek parola/token veya kişisel ses kullanılmaz.
- Fixture ID'leri, zaman damgaları ve rastgelelik seed'i **deterministik** tutulur.
- Türkçe karakterler, uzun başlıklar, emoji, RTL/Unicode ve özel Markdown karakterleri örneklenir.
- Zararlı import fixture'ları izole test dizinleri kullanır; hiçbir zaman gerçek çalışma alanına yazmaz.
- SQLite test workspace'i her koşumda temiz bir temp dizininde oluşturulur; testler birbirinin sırasına bağımlı olmaz.
- Her test en az bir beklenen **olumlu** ve uygun bir **olumsuz** assertion içerir; ekran görüntüsü tek başına davranış kanıtı değildir.
- Test stub'ı gerçeğe uymuyorsa `DOC-33` provider protokol testi başarısız sayılmalıdır.

### 8.4 Property-based ve hata enjeksiyonu

Sadece “örnek girdi” testleri yeterli değildir. Özellikle şu veri davranışları için property-based veya model-based test tasarlanır:

- `create → update → retrieve` ilişkisel tutarlılığı.
- `export → import → export` kararlı alanlarının eşdeğerliği.
- `reorder/move/toggle` sonrası görevlerin kaybolmaması ve çoğalmaması.
- Unicode normalizasyonu sonrası aynı ID'nin tek kayıt olması.
- Ret/iptal edilen mutasyonda değişikliğin yokluğu.
- Invalid IPC payload → yan etki olmadan reddetme.
- Transaction hata enjeksiyonu → ya tüm işlem commit ya da hiçbiri.

**Kritik kanıt:** Simüle edilmiş başarısızlıktan önce ve sonra DB/asset durumu karşılaştırılır; “uygulama çökmedi” tek başına tutarlılık anlamına gelmez.

---
## 9. Kanıt artefaktı sözleşmesi

### 9.1 Her doğrulama kaydının asgari alanları

CI/test raporlarının tam dizinleri ve nihai şemaları `DOC-33/34` tarafından seçilir. Bununla birlikte her kabul kaydı aşağıdaki **semantik bilgileri** taşımalıdır:

| Alan | Açıklama | Zorunluluk |
|---|---|---|
| `run_id` | Test çalışmasının benzersiz kimliği | Zorunlu |
| `source_revision` | Tam Git commit SHA | Zorunlu |
| `build_id` / `package_sha256` | Üretilen paket kimliği; yalnız paket testinde | Paket testinde zorunlu |
| `gate_ids` | Bağlı `QG-*` kimlikleri | Zorunlu |
| `requirement_ids` | Doğrudan doğrulanan `REQ-*` kimlikleri | Zorunlu |
| `acceptance_ids` | İlgili `AC-*` / `JRN-*` | Varsa zorunlu |
| `test_ids` | Gerçek `TEST-*` kayıtları | Zorunlu |
| `platform` | OS, sürüm, mimari | Zorunlu |
| `environment` | `CI-HERMETIC`, `WIN-CLEAN`, `AI-LAB` vb. | Zorunlu |
| `fixture_id` | Veri seti/seed kimliği | Veri testinde zorunlu |
| `status` | `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`, `NOT_APPLICABLE` | Zorunlu |
| `started_at` / `finished_at` | UTC ISO 8601 anları | Zorunlu |
| `observed` | Kontrol edilen sonuç, ölçüm veya assertion özeti | Zorunlu |
| `evidence_paths` | İlgili çıktıların bağıl yolları | Zorunlu |
| `failure_code` | Başarısızlık/engel kodu | Başarısızlık/engelde zorunlu |
| `reviewer` | Manuel kabulü yapan kişi/rol | Manuel kontrolde zorunlu |

Test raporunun oluşturulması da doğrulanmalıdır; `exit 0` dönüp boş JSON oluşturan bir test işini **PASS** sayamayız.

### 9.2 Temsili makine tarafından okunabilir JSON

Aşağıdaki örnek **şema niyetini** gösterir; gerçek koşum sonucu değildir. Tam rapor şemasının yetkili tanımı `DOC-33`'te yapılır.

```json
{
  "schema_version": 1,
  "run_id": "EXAMPLE-RUN-001",
  "source_revision": "0123456789abcdef0123456789abcdef01234567",
  "build_id": "iterkeep-v1.0.0-rc1",
  "platform": "windows-x64",
  "environment": "WIN-CLEAN",
  "fixture_id": "FIX-SMALL-v1-seed42",
  "started_at": "2026-10-10T10:00:00Z",
  "finished_at": "2026-10-10T10:01:00Z",
  "gate_ids": ["QG-011", "QG-012", "QG-025"],
  "requirement_ids": ["REQ-001", "REQ-004", "REQ-094", "REQ-134"],
  "acceptance_ids": ["AC-001", "JRN-001"],
  "test_ids": ["TEST-EXAMPLE-ONLY"],
  "status": "NOT_RUN",
  "observed": "ÖRNEK: Gerçek test yapılmadı; PASS kanıtı değildir.",
  "evidence_paths": [],
  "failure_code": null,
  "reviewer": null
}
```

`TEST-EXAMPLE-ONLY` gerçek `TEST-*` kataloğunda bulunmaz; belgede örnek olarak kullanılır. Üretim raporu her alanın geçerli biçimini doğrular. Gerçek kanıt yolları paket artefaktları, test logları ve güvenli ekran görüntüleridir; özel kullanıcı verisi içeren ham logu yayımlamak yasaktır.

### 9.3 İzlenebilirlik dizini

Önerilen repo/CI artefakt şeması (bu dizinler nihai repo organizasyonu değildir; `DOC-07/33/34` karar verecek):

```text
quality/
  requirements-coverage.json       # REQ -> TEST -> QG eşlemesi, kaynak olarak sürümlenir
  acceptance-coverage.json         # AC/JRN -> TEST -> QG eşlemesi
  exceptions.yml                   # izin verilen P2 sapmaları; kullanım gerekçesi

artifacts/quality/<run-id>/         # CI tarafından üretilir, source olarak commit edilmez
  manifest.json                     # commit, build, platform, fixture, sonuç
  static/                           # lint, types, dependency/secret scan
  unit/                             # unit ve component test raporu
  integration/                      # SQLite/IPC/provider contract
  e2e/                              # E2E raporu / mahremiyete uygun screenshot
  performance/                      # PERF-* benchmark JSON/CSV
  security/                         # sanitizasyonu yapılmış test raporu
  installer/                        # kurulum, sürüm yükseltme kanıtı
  release/                          # SHA256, imza doğrulama, change log
```

**Önemli:** `artifacts/quality` geçici CI çıktısıdır, bu Markdown belgesinde veya Git deposunda gerçek run gibi sahte çıktı eklenmez. Özellikle `.env`, lokal DB ve gerçek kullanıcı sohbetleri artifact olarak yüklenmez.

### 9.4 İki yönlü izlenebilirlik

Makine kontrolü şu soruları yanıtsız bırakmamalı:

1. Belirli `REQ-042` hangi `TEST-*` ile doğrulanıyor?
2. Test başarısız olursa hangi `QG-*`, feature ve release etkileniyor?
3. Testteki `AC-013`, hangi `JRN-013` ve ilgili `REQ-*` ile bağlı?
4. İlgili rapor, **şu an yayınlanacak aynı commit ve pakete** mi ait?
5. Requirement artık kapsam dışına alındıysa belgelenmiş ürün kararı ve migration/compatibility etkisi var mı?

`DOC-33`, `REQ-001–140`, `AC-001–018`, `JRN-001–018` kimliklerini dokümanlardan ayıklayan ve test kataloğuyla karşılaştıran bir kalite denetleyicisi sunmalıdır. Eksik/tekrarlı ID, kayıp test, düşmüş zorunlu varyasyon ve yanlış commit kanıtı **CI hatası** olacaktır.

### 9.5 Kodlamaya dönük doğrulayıcı algoritma

Aşağıdaki kod **entegrasyon gerektiren referans algoritmadır**. `DOC-33` gerçek coverage dosyalarının şemasını ve CI komutunu kesinleştirir. Birim test kodunu yazmadan önce kapsam şemasını, tek kaynağı ve testlerin execution-result bağımlılığını sabitleyin.

```ts
// Conceptual TypeScript contract; not a production-ready script.
type CheckStatus = 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_RUN' | 'NOT_APPLICABLE';

type CoverageEntry = {
  requirementId: `REQ-${string}`;
  priority: 'P0' | 'P1' | 'P2';
  testIds: string[];
  gateIds: string[];
};

type TestResult = {
  testId: string;
  sourceRevision: string;
  status: CheckStatus;
};

function validateMandatoryCoverage(
  requiredIds: readonly string[],
  entries: readonly CoverageEntry[],
  results: readonly TestResult[],
  releaseRevision: string,
): string[] {
  const errors: string[] = [];
  const byReq = new Map<string, CoverageEntry>();
  const byTest = new Map<string, TestResult>();

  for (const entry of entries) {
    if (byReq.has(entry.requirementId)) {
      errors.push(`Duplicate requirement mapping: ${entry.requirementId}`);
    }
    byReq.set(entry.requirementId, entry);
  }
  for (const result of results) {
    if (byTest.has(result.testId)) errors.push(`Duplicate test result: ${result.testId}`);
    byTest.set(result.testId, result);
  }

  for (const id of requiredIds) {
    const entry = byReq.get(id);
    if (!entry) {
      errors.push(`Missing requirement mapping: ${id}`);
      continue;
    }
    if (!entry.testIds.length || !entry.gateIds.length) {
      errors.push(`Missing tests/gates: ${id}`);
      continue;
    }
    // V1 P0/P1: at least one real passing test is necessary,
    // but not sufficient; the canonical DOC-33 suite must also
    // enforce *all* mandatory negative/platform variants and QG states.
    if (entry.priority === 'P0' || entry.priority === 'P1') {
      const pass = entry.testIds.some((testId) => {
        const r = byTest.get(testId);
        return r?.status === 'PASS' && r.sourceRevision === releaseRevision;
      });
      if (!pass) errors.push(`No current passing evidence: ${id}`);
    }
  }
  return errors;
}
```

**Yetersizlik uyarısı:** Yukarıdaki referans fonksiyonu *tüm testler geçti* şartını doğrulamaz; yalnız minimum izlenebilirlik örneğidir. Üretim gate evaluator şunları ayrıca kontrol eder: eksiksiz 140-ID envanteri, beklenen tüm `TEST-*` varyasyonları, bağlı `QG-*` durumları, doğru build/package hash'i, manual acceptance imzaları ve muafiyet politikası. Bu fonksiyonu tek başına release kararı için kullanmak yasaktır.

---

## 10. Hata şiddeti, triage ve muafiyet politikası

### 10.1 Hata ciddiyet seviyeleri

| Seviye | Örnek | Yayın kararı |
|---|---|---|
| **Critical / S0** | Onaysız veri sızması/silme, geniş yetki yükseltme, yaygın kalıcı veri kaybı, güvensiz update | **Kesin bloke**; düzeltme ve yeniden test olmadan yayın yok |
| **High / S1** | Yedek/restore çalışmıyor, AI yokken açılmıyor, migration başarısızlığında veri riski, P0/P1 gereksinim eksik, temel CRUD güvenilmez | **Bloke**; workaround olsa bile zorunlu kalite kapısı karşılanmalı |
| **Medium / S2** | Belirli durumda anlaşılır fallback'ı olan hata; kalıcı veri kaybı ve güvenlik ihlali yok | Ancak gerçekten P0/P1 kapısını bozmadığı kanıtlanırsa şartlı değerlendirme |
| **Low / S3** | Küçük kozmetik/ikinci derece UX hata; erişilebilir çekirdek akışını bozmaz | Belgelenmiş sapma ile yayın mümkün olabilir |

**Seviyelendirme hatayı gizlemek için kullanılmaz.** Örneğin P1 zorunlu İngilizce UI'sında bir ekran tamamen kullanılamıyorsa sırf “sadece çeviri” diye S3 olmaz. S1 deki bir hata geçiş için S2'ye yeniden adlandırılamaz.

### 10.2 `Waiver` kabul kuralları

`Waiver` yalnızca ürün şartını ihlal etmeyen, güvenlik/veri bütünlüğü riski taşımayan ve açıkça sapmaya izin verilen P2 veya kozmetik varyasyonlar için kullanılabilir.

Her waiver en az şunları içerir:

```yaml
# Sadece örnek format; gerçek istisna yoktur.
id: "WAIVER-EXAMPLE-001"
status: "proposed"
requirement_ids: ["REQ-EXAMPLE"]
gate_ids: ["QG-019"]
severity: "low"
reason: "Örnek: düşük etkili, dış kapsamda bir kozmetik farklılık"
impact: "Örnek kullanıcı etkisi"
mitigation: "Geçici kullanıcı alternatifi"
expires_at: "2026-12-31"
owner: "Product Owner"
approved_by: null
related_issue: "EXAMPLE-ONLY"
```

Gerekçe, kullanıcı etkisi, kapsam, son tarih, tek owner, düzeltme takip işi ve onay yoksa waiver geçersizdir. `REQ-EXAMPLE` gerçek gereksinim kimliği değildir. `QG-003–008`, `011`, `014`, `020`, `022`, `025–026` gibi güvenlik, veri, bağımsızlık ve dağıtım kapılarındaki başarısız zorunlu davranışlar **waiver ile PASS yapılamaz**; ayrıca bütün diğer P0/P1 ihlalleri de release blokajıdır.

### 10.3 Flaky test politikası

- Test aralıklı başarısız oluyorsa varsayılanı `FAIL`dir; en son yeşil denemeyi seçip “pass” ilan edemeyiz.
- Testte zaman bağımlılığı, yarış, rastgele fixture veya environment farkı varsa kök neden analizi yapılır.
- Quarantine sadece zorunlu kapsamı başka sağlam testin gerçekten kapsadığı durumlarda ve açık iş takibiyle uygulanabilir.
- Güvenlik, migration, recovery, ödeme/hesap gibi üründe bulunmayan alanlar değil; **veri kalıcılığı, tool izinleri, setup ve installer smoke** gibi çekirdek testler quarantine edilerek release kapısı atlanamaz.
- Tekrar deneme sayısı, neden ve her run sonucu raporda saklanır; tekrarlı koşumun ilk başarısızlıkları saklanmaz.

### 10.4 Değişiklikten sonra yeniden doğrulama

Aşağıdaki değişiklikler minimum şu testleri tetikler:

| Değişiklik | Zorunlu yeniden çalıştırma |
|---|---|
| SQL migration, relation veya index | `QG-004–007`, 010, 022; migration/restore fixture |
| IPC veya preload allowlist | `QG-003`, 020, 022 + etkilenen E2E |
| Agent tool/policy | `QG-014–015`, 020, 023 + olumsuz saldırı testleri |
| Model manager / Ollama adapter | `QG-011–013`, 022 + gerçek provider lab |
| Voice sidecar | `QG-016–017`, 022 + sesi kapalı fallback |
| Theme/token/component | `QG-018–019` + ilgili görsel/klavye akışı |
| Export/import | `QG-007–008`, 020 + round-trip/malicious test |
| Installer/updater | `QG-025–026`, 020 + temiz makine ve yükseltme testi |
| Build tool / dependency | `QG-002`, 024, 025; güvenlik taraması |

---
## 11. CI/CD iş akışı ve yayın kalite kararı (`QG-024–026`)

### 11.1 Önerilen GitHub Actions iş grafiği

Bu grafik uygulama pipeline'ının **tasarım şartıdır**. Tam workflow dosyaları, paket sürümü pin'leri, Runner OS sürümleri, Electron Forge seçenekleri ve uygulama imzası `DOC-05/34`'te kesinleştirilir.

```text
pull_request / push
  |
  +--> static-checks --------+
  |     format, lint, types   |
  +--> test-core ------------+--> integration / contract --> PR gate
  |     domain, SQLite, IPC  |
  +--> security-scan --------+
        deps, secrets, SAST

release-candidate (signed/approved tag + exact commit)
  |
  +--> PR gate results (same SHA)
  +--> Windows packaged E2E
  +--> Clean/offline installer smoke
  +--> Upgrade, migration, backup/restore, rollback
  +--> AI-LAB and VOICE-LAB acceptance
  +--> Reference hardware PERF-* benchmarks
  +--> Accessibility / i18n review
  +--> Integrity/signature/SBOM/artifact verification
  |
  v
  generate immutable release evidence manifest
  |
  v
  quality owner + release owner approval
  |
  v
  publish reviewed artifact (no untested rebuild)
```

**Çok önemli:** Standart hosted runner üzerinde gerçek GPU/mikrofon bulunmaması; provider testlerinin yapılmış gibi gösterilmesine gerekçe değildir. Donanıma bağımlı `AI-LAB` / `VOICE-LAB` sonuçları ayrı, revizyona bağlı ve doğrulanabilir artefaktlar olarak RC kararına katılır.

### 11.2 Pipeline başarısızlık politikası

- Bir zorunlu iş hata aldıysa akış `FAILED`; `continue-on-error` ile sessiz yeşil release yasaktır.
- Test beklenen dosyayı üretmezse veya JSON şeması geçersizse sonuç `FAIL`.
- Güvenlik tarayıcısı erişilemezse tarama `BLOCKED`; otomatik `PASS` verilmez.
- Provider laboratuvarı mevcut değilse ilgili sonuç `BLOCKED`; gerekçeli yeniden planlama gerekir.
- Artefakt hash'i veya commit uyuşmazlığı varsa release iptal edilir.
- Bir iş yeniden çalıştırıldıysa rapor yeni `run_id` ile gelir; eski başarısız kayıt saklanır.
- Yalnız **dökümante edilmiş izinli P2** sapmaları ayrı release-notes/waiver yoluna girebilir; zorunlu P0/P1 testleri ötelenemez.

### 11.3 Dağıtım güvenliği ve imzalama

V1'de ilk destek hedefi Windows'tur (`REQ-134`). `DOC-34` kurulum formatını ve güncelleme stratejisini belirler. Bu belgede gerekecek kanıt şunlardır:

1. Kurulum dosyası gerçekten temiz Windows makinede açılır; eksik Python/Ollama/Git zorunlu hatası vermez.
2. Paket üzerindeki uygulama versiyonu, commit, kaynak hash ve CI build ID eşleşir.
3. İmza/bütünlük kontrolü ve dağıtım kaynağı doğrulaması test edilir. Windows güven/SmartScreen davranışı ve imza planı açıkça belirtilir; imzasız paket güvenilir imzalı sürüm gibi pazarlanamaz.
4. Uygulama güncellemesi önceki desteklenen sürümden veriyi koruyarak ilerler.
5. Ağ kesilmesi, yarıda kalan indirme, bozuk güncelleme paketi ve başarısız ilk açılış için güvenli recovery tanımlanır.
6. Farklı OS hedefleri varsa o platformların ayrı imzalama/noterizasyon/auto-update gereksinimleri tek tek ele alınır; Windows testini onların yerine saymayız.
7. Model ve ses paketleri temel kurulumdan bağımsızdır; indirilecek dosyanın kaynağı ve lisansı gösterilir, kurulu olmayan servis saklı ağ isteği üretmez.

Güncelleme sırasında uyumsuz DB downgrade olasılığı varsa installer rollback'i **veriyi bozacak şekilde otomatik** yapılmaz; gerekli yedek ve kurtarma politikası `DOC-17/32/34`'te karara bağlanır.

### 11.4 Sürüm kararı için örnek belge

```yaml
# Şema örneği — gerçek bir release kararı değildir.
release_id: "v1.0.0-rc1-EXAMPLE"
source_revision: "0123456789abcdef0123456789abcdef01234567"
package_sha256: "<replace-with-real-sha256>"
status: "NOT_RUN"
required_gates:
  - "QG-001..QG-026"
results_manifest: null
required_acceptance:
  - "AC-001..AC-018"
required_requirements:
  - "REQ-001..REQ-140; P0/P1"
blocking_findings: []
open_p2_deviations: []
product_approval: null
quality_approval: null
release_approval: null
```

Buradaki `QG-001..QG-026` / `REQ-001..REQ-140` ifadeleri **insan için yazılmış aralık gösterimidir**; gerçek makine şeması bunları çözümleyip tam listelerle karşılaştırmalıdır. Boş `blocking_findings` alanı, sonuç raporu `NOT_RUN` iken sıfır hata kanıtı değildir.

---

## 12. Geliştirici agent için uygulama protokolü

### 12.1 Yeni bir feature yazarken izleyeceği sıra

1. `DOC-00`, `DOC-02`, bu `DOC-04`, özelliğin yetkili dokümanı ve `DOC-35`'teki iş paketini oku.
2. `REQ-*` maddelerini çıkar; ilgili `JRN/AC/QG` ve bağımlı domain/DB/IPC/provider sözleşmelerini eşleştir.
3. Testten önce üretim davranışı uydurma; belirsiz kuralı `SPEC-CONFLICT` olarak kaydet, yetkili belgede çöz.
4. Olumlu ve negatif test senaryolarını belirle; en az bir DB/permission/fallback durumu dahil et.
5. Küçük bir dikey dilimi kodla; TypeScript strict ve güvenlik sınırlarını koru.
6. Testleri **gerçekten** çalıştır; stdout/exit code/rapor ve yürütülen komutları sakla.
7. Değişikliği AI-disabled / offline durumda doğrula (uygun ise).
8. Etkilenen QG kapılarını değerlendir; `PASS` yalnız kanıtla ver.
9. Testin çalışamadığı ortamı `BLOCKED` diye bildir; sahte kanıt, `skip` veya manuel tahminle geçme.
10. PR raporunda bitenler, çalıştırılanlar, başarısızlar, açık riskler ve sonraki işler açıkça ayrıştırılsın.

### 12.2 Bir iş paketinin son rapor formatı

```markdown
### Work package: WP-XXX
- Source revision: `<full-sha>`
- Implemented requirements: `REQ-...`
- Contract references: `DOC-...`
- Quality gates: `QG-...`
- Changed files: `...`
- Migrations: `none | IDs and recovery evidence`
- Tests executed: `command` -> `PASS/FAIL/BLOCKED`, evidence path
- Acceptance checks: `AC/JRN -> status`
- Security review: `summary and scan paths`
- Performance: `PERF-* -> measured numbers / not-run`
- Unresolved risks: `issues or none with evidence`
- Next step: `WP-...`
```

Ajan tamamlanmış modülü yalnızca test kataloğunda ID bulunduğu için kabul edemez. Son kullanıcı davranışı kanıtlanmıyorsa `implemented`, fakat `verified` değil şeklinde raporlar.

### 12.3 Dokümantasyon değişikliği de kalite işlemidir

- Teknik sözleşme değiştiyse sürüm, tarih, gerekçe ve ilgili referans güncellenir.
- Bir REQ/AC/QG kimliği başka işte yeniden kullanılmaz.
- Yetkili belgeyle örnek kod çelişiyorsa önce tek kaynak düzeltilir.
- Kullanıcı tarafından onaylanmamış büyük kapsam değişikliği sessizce projeye eklenmez.
- `DOC-31`, `DOC-33` ve `DOC-34` tamamlandığında geçici performance/test/release atıfları yeni sözleşmelere bağlanır.
- Doküman güncellemesi sonrası etkilenen otomatik check/testler geçmedikçe çelişki çözülmüş kabul edilmez.

---

## 13. V1 yayın engeli karar ağacı

```text
RC exists and has exact commit/package identity?
  NO -> BLOCK RELEASE
  YES
    |
    v
All DOC-02 P0/P1 requirements have verified, current evidence?
  NO -> BLOCK RELEASE
  YES
    |
    v
All AC-001..018 and required QG-001..026 checks passed?
  NO / BLOCKED / NOT_RUN -> BLOCK RELEASE
  YES
    |
    v
No open S0/S1 or mandatory security/data-integrity violation?
  NO -> BLOCK RELEASE
  YES
    |
    v
DOC-31 performance + Windows installer/upgrade/restore evidence passed?
  NO -> BLOCK RELEASE
  YES
    |
    v
Optional AI/voice enabled tests verified on actual compatible providers?
  NO / NO LAB -> BLOCK RELEASE (unless scope formally revised)
  YES
    |
    v
Artifact identity, integrity, approvals, recovery plan complete?
  NO -> BLOCK RELEASE
  YES -> ELIGIBLE FOR RELEASE
```

`ELIGIBLE FOR RELEASE`, ürünün kullanıcı tarafından **fiilen yayımlandığını** söylemez. Yayınlama ayrı, kayıt altına alınan bir dağıtım eylemidir. İndirilmiş model ve TTS paketlerinin son kullanıcı makinesinde başarı garantisi yoktur; desteklenen uyumluluk aralığı ve fallback mekanizmasıyla değerlendirilir.

### 13.1 Son kontrol listesi — release sahibi

- [ ] `docs` belge envanteri `00–35` tamam; ilgili normatif sözleşmeler onaylı.
- [ ] `REQ-001–140` test ve kanıt bağlantıları doğrulandı; P0/P1 eksik yok.
- [ ] `AC-001–018` / `JRN-001–018` sonuçları yeşil.
- [ ] `QG-001–026` sonuçları doğru varyasyonlarla yeşil.
- [ ] Gerçek SQLite, yedek, migration, offline, izin, restore ve paket doğrulama testleri geçti.
- [ ] Gerçek Ollama, STT ve TTS testlerinin cihaz/sürüm kayıtları ve onayları mevcut.
- [ ] Performance raporları referans donanım ve doğru fixture ile üretildi.
- [ ] Klavye, screen reader smoke, TR/EN, light/dark/system doğrulandı.
- [ ] Varsayılan izinsiz ağ çıkışı ve kişisel veri toplama yokluğu doğrulandı.
- [ ] Model indirmesi / agent yıkıcı işlem / Git push için açık kullanıcı onayı doğrulandı.
- [ ] S0/S1 kapatıldı; izinli P2 sapmaları belgeli ve süreli.
- [ ] CI artefaktı, commit SHA, paket hash, sürüm ve yayın paketi aynı.
- [ ] Temiz Windows kurulum, güncelleme ve geri dönüş yolu kanıtlandı.
- [ ] Release notları, bilinen sınırlamalar, desteklenen platform ve modeller açık.
- [ ] Product/Quality/Release onayları kayda geçti.

---

## 14. Diğer teknik belgelere devredilen zorunlu işler

Bu belge, daha yazılmamış teknik sözleşmelere sahipmiş gibi davranmaz. Aşağıdaki maddeler `DOC-04`'ün uygulanabilir hâle gelebilmesi için **sahibi belli zorunlu girdilerdir**.

| Yetkili belge | Sağlayacağı çıktı | Bu belgenin bağımlılığı |
|---|---|---|
| `05` | Paket/sürüm pinleme, güvenlik/lisans seçimi | QG-002/024 |
| `06/07` | Main/renderer/worker sınırları ve gerçek repo düzeni | QG-002/003/024 |
| `08–10` | Domain invariant'ları, DDL, transaction, migration, DB worker | QG-004–007 |
| `11/12` | Gerçek IPC ve job/error sözleşmeleri | QG-003/005/022 |
| `13/14` | Proje/görev/not/karar/log kalıcılığı | QG-009 |
| `15` | FTS arama semantiği, Türkçe golden sorguları | QG-010 |
| `16` | Export/import manifest, Git güvenli stage stratejisi | QG-008 |
| `17` | SQLite backup, restore, retention ve doğrulama protokolü | QG-006/007 |
| `18/19` | Setup ve capability state machine'i, sağlık ekranı | QG-011/012 |
| `20–23` | Token, route, component, dil ve a11y tam sözleşmesi | QG-018/019 |
| `24/25` | Gerçek Ollama adapter, model uyumu, downloader, resource policy | QG-013 |
| `26/27` | Tool allowlist, izin, run/step log ve redaksiyon | QG-014/015 |
| `28/29` | Whisper/EMA model paketleri, life cycle, hata/ses kabulü | QG-016/017 |
| `30` | Threat model, trust boundary, gizlilik ve izin matrisi | QG-003/020 |
| `31` | `PERF-*` ID'leri, nihai eşikler, fixture ve benchmark komutları | QG-010/021 |
| `32` | Hata kodları, failpoint/restore kararları | QG-006/022/026 |
| `33` | `TEST-*`, kodlu matris, CI test komutları, evidence şeması | QG-001/023/024 |
| `34` | Release pipeline, platform paketleme, imza, updater | QG-024–026 |
| `35` | Feature iş paketleri, uygulama sırası ve her kapının çalışma noktası | G0–G5 |

### 14.1 Kodlama öncesi çözülmesi gereken kararlar

Bunlar **bilinçli devir** konularıdır; ajan sessizce varsayım belirleyemez:

1. `DOC-02` içindeki `SCOPE-01–08` ürün sahibi tarafından onaylandı mı?
2. `DOC-31` hangi Windows referans cihazlarını, cold-start tanımını, örneklem boyutunu ve toleransı seçecek?
3. Ollama / Whisper / EMA için gerçek provider-lab hangi donanım ve işletim sistemi varyasyonlarını kapsayacak?
4. Paket/installer imza gereksinimi ve updater kanalının destek matrisi `DOC-34` ile kesinleşti mi?
5. `DOC-33` hangi testleri bloklayan kategori sayacak, kanıt ve iş takibini nasıl sağlayacak?
6. Agent tool eylem günlüklerinin saklama ve kişisel veri redaksiyon politikası `DOC-27/30` ile sabitlendi mi?
7. Veritabanı migration ve eski sürüm geri dönüşü `DOC-17/32` üzerinden felaket senaryolarında gerçekten test edilebilir mi?
8. Gereksinim kapsamını değiştiren açık ürün kararı olmadan bir test `NOT_APPLICABLE` sayılmaya mı çalışılıyor?

Bu sorular tasarımın eksik olduğu iddiasını gizlemek için değil, **yetkili belgeler arasında karar tekrarını önlemek** için listelenmiştir.

---

## 15. Bu dokümanın kendi Definition of Done'u

### 15.1 Hazırlanmış belge kontrolü

- [x] V1 P0/P1 gereksinimlerini, P2/P3 sapmalarını ve release blokajlarını ayrıştırdık.
- [x] `G0–G5` aşamalarını (spesifikasyon → PR → feature → RC → release → hotfix) tanımladık.
- [x] `QG-001–026` kararlı kalite kapısı kataloğunu oluşturduk.
- [x] AI/voice modüllerinin **opsiyonel kurulum** ve **gerçek çalışırlık** testlerini ayırdık.
- [x] SQLite, backup, round-trip, arama, setup, Ollama, agent, STT/TTS, UI, güvenlik ve dağıtımı kalite kapılarına bağladık.
- [x] `AC-001–018` / `JRN-001–018` ve `REQ-001–140` aile eşlemelerini yazdık.
- [x] Kanıt şeması, izlenebilirlik ve fail-closed gate evaluator şartlarını koyduk.
- [x] Flaky test, `BLOCKED`, risk seviyesi, waiver ve yeniden doğrulama kurallarını belirledik.
- [x] Release karar ağacı, checklist ve sonraki belgelere devredilen çıktıları hazırladık.

### 15.2 `approved` ve uygulama için bekleyenler

- [ ] Ürün sahibi P0/P1 V1 kapsamına ve kapıların **release-blocking** olmasına onay verdi.
- [ ] `DOC-05–30` ilgili sözleşmeleri tamamlayıp bu belgeyle çelişki bırakmadı.
- [ ] `DOC-31` nihai ölçüm eşiği, fixture, ortam ve `PERF-*` ID'lerini sağladı.
- [ ] `DOC-33`, 140 ayrı REQ için `TEST-*` ve 18 AC/JRN için gerçek test/kanıt matrisi oluşturdu.
- [ ] `DOC-34`, paketleme, release, imzalama ve güncelleme gereksinimlerini netleştirdi.
- [ ] `DOC-35`, work package / kalite kapısı entegrasyonunu tanımladı.
- [ ] Kod ve paket üretildikten sonra zorunlu testler **gerçekten** çalıştırıldı; kanıtları commit ve paketle eşleştirildi.

**Bu dosyanın mevcut durumu:** Kapsamı yazılmış bir **kalite stratejisi taslağıdır**. Yukarıdaki bekleyen maddeler nedeniyle `approved` değildir; V1 uygulaması ve testleri henüz yapılmış kabul edilmez.

## 16. Sıradaki belge ve devretme notu

Sıradaki: [`05-STACK-DECISIONS.md`](./05-STACK-DECISIONS.md).

Bu belgede Electron / React / Vite / SQLite binding / ORM yaklaşımı / state management / bundler / paket sürümleri / native dependency paketleme stratejisi karşılaştırılıp karara bağlanmalıdır. Seçimler `DOC-04`'teki `QG-*` gereksinimlerinin **test ve paketleme maliyetiyle** birlikte gerekçelendirilir. Özellikle native SQLite modülünün Electron ABI uyumu, Windows kurulumda VC runtime bağımlılığı, worker'da DB bağlantısı, Whisper/EMA sidecar dağıtımı ve pnpm/npm lockfile stratejisi önceden çözülmelidir.

---

## Değişiklik geçmişi

| Sürüm | Tarih | Değişiklik |
|---|---|---|
| 0.1.0 | 2026-10-10 | G0–G5, QG-001–026, 18 kullanıcı kabul akışı, 140 gereksinim izlenebilirliği, performans/kanıt/CI/waiver ve release kapıları tanımlandı. |
