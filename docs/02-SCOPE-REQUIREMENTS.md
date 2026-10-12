---
document_id: DOC-02
title: "Iterkeep — V1 Kapsamı ve Doğrulanabilir Ürün Gereksinimleri"
version: "0.1.0"
status: "draft"
last_updated: "2026-10-10"
language: "tr-TR"
owner: "Product & Requirements Engineering"
depends_on:
  - "DOC-00"
  - "DOC-01"
---

# Iterkeep — V1 Kapsamı ve Doğrulanabilir Ürün Gereksinimleri

> **Bu belgenin görevi:** V1'de ürünün *ne yapması gerektiğini*, *hangi durumlarda ne olacağını*, *nelerin kapsam dışında kaldığını* ve gereksinimlerin *nasıl kabul edileceğini* tanımlamak. Buradaki `REQ-*` kimlikleri ürün sözleşmesidir. Geliştirme ajanı bu maddeleri kod, otomatik test ve kanıtlarla ilişkilendirmelidir.
>
> **Yetki sınırı:** Bu belge özelliklerin ürün davranışını belirler. Kesin SQL/indeks/DDL `DOC-09`, domain enum ve DTO `DOC-08`, IPC `DOC-11`, agent tool şemaları `DOC-26`, tema token değerleri `DOC-20`, ölçüm düzeni ve performans eşikleri `DOC-31`, test kimlikleri `DOC-33` tarafından tanımlanır. Bu belge onların yerine geçmez.
>
> **Durum:** `draft`; burada önerilen V1 kapsamı ürün sahibinin incelemesinden sonra `approved` olur. DOC-00'daki kabul edilmiş `local-first`, `AI-optional` ve `SQLite canonical` ilkelerini değiştirmez.

## 1. Yönetici özeti ve teslim sözleşmesi

Iterkeep V1, **tek kişi / tek bilgisayar** için tasarlanmış, çevrimdışı çalışan bir masaüstü proje hafızasıdır. Kullanıcı projelerini, görevlerini, notlarını, kararlarını ve günlük ilerlemesini kalıcı olarak yönetir; proje bağlamını güçlü yerel aramayla geri bulur. Verilerin ana kaynağı SQLite'tır. Markdown/YAML, verilerin taşınması için **içe/dışa aktarım** biçimidir; iki bağımsız yazma kaynağı oluşturulmaz.

İsteğe bağlı özellikler:

- **Ollama:** Yerel model bulma, seçme, onaylı indirme, sohbet ve sınırlı araç kullanan agent.
- **Whisper tabanlı STT:** Kullanıcının düğmeye basarak başlatıp durdurduğu, ardından gözden geçirdiği transkripsiyon.
- **EMA Lightning TTS:** Kurulmuşsa agent mesajını isteğe bağlı seslendirir.
- **Git:** Markdown dışa aktarımlarının sürüm kontrolüne yardımcı olur; zorunlu değildir.

**V1.0 tamamlandı** diyebilmek için tüm `MUST` gereksinimleri ve `DOC-04` yayın kapıları karşılanmış olmalıdır. Özelliğin **isteğe bağlı kurulması**, uygulandığı durumda eksik/örnek/sahte işlevli olabileceği anlamına gelmez: kullanıcı modülü etkinleştirirse belirtilen sözleşme gerçekten çalışmalıdır.

### 1.1 Dört kullanım sonucu

| Ürün sonucu | Kullanıcı kanıtı | İlişkili kullanıcı işleri |
|---|---|---|
| **Capture:** Fikri kaybetmeden kaydetme | Projeye görev/not/günlük eklenir; kaydedildiği doğrulanır | `JTBD-01`, `JTBD-02` |
| **Resume:** Projeye geri dönme | Son çalışma, açık görev ve ilgili kararlar tek girişten görünür | `JTBD-03`, `JTBD-06` |
| **Recall:** Nedenini bulma | Arama ilgili kaydı ve kaynak konumunu getirir | `JTBD-04`, `JTBD-05` |
| **Control:** Veriye ve otomasyona sahip olma | Veriyi dışa alır; AI/voice isteğe bağlıdır; kurtarma yapılır | `JTBD-07–12` |

## 2. Normatif dil, öncelik ve kimlik kuralları

- **MUST (`P0`)**: V1 yayınını engelleyen zorunlu gereksinim. Yazılan testin geçmesi gerekir.
- **MUST (`P1`)**: V1 kapsamının parçası ve yayın öncesi gereklidir; uygulama sırası `P0` sonrasıdır. `P1`, 'ileride belki' demek değildir.
- **SHOULD (`P2`)**: V1 hedefi olarak tercih edilir; tamamlanmazsa sürüm notunda gerekçeli sapma kaydı açılır. P2 eksikliği tek başına V1'i engellemez.
- **MAY (`P3`)**: İleri sürüm adayı; V1'e gizlice sokulmaz.
- **NOT IN V1**: İşlevin ilk sürümde bulunmaması bilinçli kapsam kararıdır.

Bu dosyada her `REQ-*` satırı şu yapıda yorumlanır:

1. **ID**: Kalıcı gereksinim kimliği; asla yeniden kullanma.
2. **Öncelik**: `P0/P1/P2`; tüm P0/P1 maddeleri V1'de uygulanır.
3. **Davranış + başarı**: Kullanıcı veya sistem tarafından gözlenebilir koşul. Başka belgede teknik karşılığı ayrıntılanır.
4. **Yetkili ayrıntı**: İlgili `DOC-*` teknik şartname dosyası; doküman çelişkisinde `DOC-00` hiyerarşisi uygulanır.

`AC-*` bu belgedeki ürün kabul senaryolarının **geçici referans kimliğidir**; kesin otomatik `TEST-*` kataloğu `DOC-33` içinde oluşturulur ve bunlarla eşleştirilir. `REQ-*` numaraları ileride satır eklemek için yeniden numaralandırılmaz.

### 2.1 Genel kabul yorumları

Bütün CRUD eylemleri için aşağıdakiler ayrıca yazılmasa da zorunludur:

- Geçerli bir girdi deterministik biçimde işlenir; hata ve doğrulama kullanıcıya anlaşılır olarak gösterilir.
- Başarı işareti, veri gerçekten kalıcı kaydedildikten sonra verilir; optimistik UI gecikmeyi gizleyebilir ama yanlış 'kaydedildi' bildirimi veremez.
- Çift tıklama veya tekrar gelen istek veri çoğaltma/çifte silme yaratmamalıdır; gerekli işlemlerde idempotency anahtarı kullanılır.
- Kısa süreli yükleniyor/boş/hata/iptal durumları tasarımsal olarak tanımlıdır.
- Aynı alanı değiştiren iki işlem yarışıyorsa son yazan sessizce önceki kullanıcı değişikliğini yok etmez; sürüm kontrolü veya belirli birleşme politikası uygulanır.
- Uygulama yeniden açıldığında veriler ve kaydedilmiş kullanıcı tercihleri beklenen durumda kalır.
- Geçersiz kimlik, kaynak erişim hatası veya bozuk kayıt ana UI'nın kapanmasına yol açmaz.

## 3. V1 kapsam kararı: Kesin tercihler

`DOC-01` içinde açık bırakılan ürün kararları için önerilen V1 varsayımları:

| Karar kimliği | V1 kararı | Gerekçe | Durum |
|---|---|---|---|
| SCOPE-01 | **Tam bağımsız CLI V1'de zorunlu değil**; ortak core, ileride CLI'ya bağlanabilecek şekilde tasarlanacak | Ana odak masaüstü ve klavyeyle hızlı kayıt | Önerildi |
| SCOPE-02 | **Görev listesi + Kanban** V1 kapsamına girer | Durumların farklı bakış açılarıyla takibi, aynı veri kaynağı | Önerildi |
| SCOPE-03 | **Türkçe ve İngilizce temel UI** V1'de tamamlanır | Uygulama yalnızca sahibine özel değil; iki dil arasında ayarlardan geçiş | Önerildi |
| SCOPE-04 | Proje seçilmeden kaydedilen kayıtlar **varsayılan Inbox projesine** gider | Hızlı yakalamayı kesmemek ve proje dışı 'sahipsiz' kaydı azaltmak | Önerildi |
| SCOPE-05 | **Kullanıcı talebiyle üretilen yerel tanılama raporu** V1'de olur, otomatik gönderilmez | Destek ve hata analizi; gizlilik varsayılanı | Önerildi |
| SCOPE-06 | **Tek aktif workspace**; workspace klasörü ayarlardan değiştirilebilir, kapalı DB kontrollü taşınır/açılır | İlk sürümde karmaşık eşzamanlı workspace sorunundan kaçınma | Önerildi |
| SCOPE-07 | **Proje bazlı görev listesi/kanban, projeler arası birleşik görev görünümü** V1'de vardır | Kullanıcının tüm açık işlerini bulabilmesi | Önerildi |
| SCOPE-08 | **Ücretli servis / hesap / bulut zorunluluğu yoktur** | Yerel ve erişilebilir ürün vaadi | DOC-00 ilkesi |

> Bu tercihler, kullanıcının kodlamadan önce değiştirebileceği **ürün kapsam kararlarıdır**. Dökümana işlendiği sürece uygulama ajanı kendi alternatiflerini sessizce dayatamaz. Seçimler `approved` yapılmadan uygulama ajanının kalıcı ürün mimarisi kararını verdiği varsayılmamalıdır.

## 4. Yeteneğe göre V1 gereksinimleri

Aşağıdaki listede **P0/P1 = V1 MUST**. Dış teknolojinin yokluğu için ayrı fallback gereksinimleri ilgili bölümlerde yer alır.

### 4.1 İlk açılış, workspace, uygulama yaşam döngüsü

**Yetkili ayrıntı:** `DOC-06`, `DOC-08–12`, `DOC-17–19`, `DOC-30`, `DOC-32`.

| ID | Öncelik | Gereksinim / gözlenebilir kabul | İlgili JTBD |
|---|---|---|---|
| REQ-001 | P0 | Yeni kurulum, giriş hesabı veya internete ihtiyaç olmadan yerel çalışma alanı oluşturur. | 11 |
| REQ-002 | P0 | İlk açılış sihirbazı çalışma alanı konumunu gösterir; kullanıcı varsayılanı onaylar veya uygun başka klasör seçer. | 11 |
| REQ-003 | P0 | Geçerli bir workspace ile uygulama açıldığında veri kaynağı başarıyla doğrulanır ve proje ekranı kullanılabilir hâle gelir. | 01,03 |
| REQ-004 | P0 | AI/STT/TTS/Git yokluğu ya da hata durumu açılışı ve temel CRUD'u engellemez. | 10 |
| REQ-005 | P0 | Eksik/zorunlu migration hatası, DB kilidi veya bozulma durumunda kullanıcıya anlaşılır kurtarma ekranı açılır; sessiz sıfırlama yapılmaz. | 12 |
| REQ-006 | P1 | Aynı workspace veritabanına aynı anda tehlikeli ikinci uygulama instance'ının yazması engellenir; mevcut pencereye yönlendirme tercih edilir. | 12 |
| REQ-007 | P1 | Kullanıcı uygulamayı kapatıp açtığında son seçilen proje/görünüm gibi zararsız UI tercihleri korunur. | 03 |
| REQ-008 | P1 | Yeni workspace boş durumda ilk proje oluşturma ve hızlı yakalama yolunu açık gösterir; boş ekran kullanıcıyı kilitlemez. | 01 |
| REQ-009 | P0 | Kullanıcının seçimleri olmadan modele, internete, Git uzak deposuna veya dış servise proje verisi aktarılmaz. | 09,10 |
| REQ-010 | P1 | Mevcut workspace'i açma akışında geçersiz yol, yazma izni ve eksik asset senaryoları kullanıcı dostu ele alınır. | 09,12 |
| REQ-011 | P1 | Workspace taşıma/değiştirme isteğinde etkin işler güvenli sonlandırılır, mevcut DB kapatılır ve yeni yol doğrulanır. | 09,12 |
| REQ-012 | P1 | İlk kurulum işlemleri tamamlanmasa veya atlanmış olsa bile kullanılabilir çekirdek bir workspace üretilebilir; setup daha sonra tekrar açılabilir. | 10,11 |

### 4.2 Projeler ve geri dönme deneyimi

**Yetkili ayrıntı:** `DOC-08`, `DOC-13`, `DOC-21–22`.

| ID | Öncelik | Gereksinim / gözlenebilir kabul | İlgili JTBD |
|---|---|---|---|
| REQ-013 | P0 | Kullanıcı başlıkla proje oluşturur; kalıcı, yeniden adlandırmadan etkilenmeyen proje kimliği atanır. | 01 |
| REQ-014 | P0 | Proje adı, açıklama, durum ve etiketleri düzenlenebilir; gerekli alanlar doğrulanır. | 01 |
| REQ-015 | P0 | Aktif ve arşivlenmiş projeler filtrelenir; arşivleme verileri silmez ve geri alınabilir. | 03,06 |
| REQ-016 | P0 | Proje ayrıntısı açık görevleri, devam eden işleri, en son çalışma kaydını ve ilgili kararları tek giriş noktasından gösterir. | 03 |
| REQ-017 | P0 | Kaydı olmayan yeni projede anlamlı boş durum ve sonraki ilk eylemler gösterilir. | 01 |
| REQ-018 | P1 | Projeye bir veya daha fazla etiket atanabilir; etikete göre listeleme yapılabilir. | 05,06 |
| REQ-019 | P1 | Projeler son etkinliğe, isme ve duruma göre sıralanabilir; son seçilen seçenek korunur. | 03,06 |
| REQ-020 | P1 | Kalıcı proje silme işlemi silinecek ilişkili verilerin özetini ve açık kullanıcı onayını gerektirir. | 12 |
| REQ-021 | P0 | Uygulama en az bir Inbox projesi oluşturabilir; proje seçilmeden hızlı ekleme buraya yapılır. | 02 |
| REQ-022 | P1 | Inbox girdileri sonradan başka projeye taşınabilir; kayıt kimliği ve içerik korunur. | 02,03 |
| REQ-023 | P1 | Son kullanılan projelere ve son düzenlenen kayıtlara hızlı ulaşım vardır. | 03 |
| REQ-024 | P1 | Kullanıcı projeyi yeniden adlandırınca görev, not, karar ve log bağlantıları kopmaz. | 03,04 |

### 4.3 Görevler, liste, Kanban ve hızlı yakalama

**Yetkili ayrıntı:** `DOC-08`, `DOC-11–13`, `DOC-21–22`.

| ID | Öncelik | Gereksinim / gözlenebilir kabul | İlgili JTBD |
|---|---|---|---|
| REQ-025 | P0 | Seçili projeye veya Inbox'a başlıkla görev eklenir; açıkça 'kaydedildi' durumu verilir. | 02 |
| REQ-026 | P0 | Görev başlığı, açıklama, durum, öncelik ve isteğe bağlı hedef tarih düzenlenebilir. | 02,06 |
| REQ-027 | P0 | Görevler en az yapılacak, devam ediyor ve tamamlandı iş anlamlarını ayırt eden statülerle izlenir; kesin enum `DOC-08`'indir. | 03,06 |
| REQ-028 | P0 | Tamamlama/yeniden açma işlemleri görev tarihçesi ve birleşik görünümlerle tutarlı kalır. | 06 |
| REQ-029 | P0 | Görev listesi proje ve genel kapsamda görüntülenebilir; durum ve önceliğe göre filtrelenebilir. | 06 |
| REQ-030 | P1 | Görevler liste ve Kanban görünümleri arasında aynı kayıtlar kullanılarak gösterilir; görünüm değiştirmek kopya veri yaratmaz. | 06 |
| REQ-031 | P1 | Kanban sütunları arasında görev taşıma geçerli durum geçişini uygular; işlem başarısızsa eski konuma döner. | 06 |
| REQ-032 | P1 | Görevlerin manuel sırası kullanıcı işleminden sonra kalıcıdır; aynı görünümde yeniden açınca korunur. | 06 |
| REQ-033 | P1 | Görev detayından bağlı not, karar veya log kaydına gidilebilir; ilişkiler tutarlı saklanır. | 03,04 |
| REQ-034 | P1 | Görev tarihi yerel saat diliminde doğru görüntülenir; takvim günü/UTC anlamı belirsiz bırakılmaz. | 06 |
| REQ-035 | P0 | Uygulama içindeki klavye odaklı hızlı ekleme, fareyle gezinmeye kıyasla az adımla görev/not oluşturabilir. | 02 |
| REQ-036 | P1 | Kullanıcı bir görevi başka projeye taşıyabilir; kimlik ve geçmiş korunur. | 03,06 |
| REQ-037 | P1 | Görev silme bir onay/geri alma politikası ile yönetilir; yanlışlıkla yok etme minimize edilir. | 12 |
| REQ-038 | P1 | Uzun açıklamalar Markdown olarak saklanır ve güvenli biçimde görüntülenir; görev başlığı düz metindir. | 02 |
| REQ-039 | P1 | Liste/kanban boş, filtreyle sıfır sonuç, yükleniyor ve hata durumlarını ayrı gösterir. | 06 |
| REQ-040 | P2 | Çoklu görev seçimiyle sınırlı toplu durum değiştirme işlemi, etki önizlemesi ve geri alma ile sunulabilir. | 06 |

### 4.4 Notlar, teknik kararlar, çalışma günlüğü

**Yetkili ayrıntı:** `DOC-08`, `DOC-14`, `DOC-16`, `DOC-21–22`.

| ID | Öncelik | Gereksinim / gözlenebilir kabul | İlgili JTBD |
|---|---|---|---|
| REQ-041 | P0 | Kullanıcı proje içinde başlıklı Markdown not oluşturabilir, düzenleyebilir ve yeniden bulabilir. | 02,05 |
| REQ-042 | P0 | Not düzenlemede kaydedilmemiş durum görünür; yazma başarısızlığı kullanıcıdan saklanmaz. | 02,12 |
| REQ-043 | P0 | Teknik karar kaydı başlık, karar, bağlam/gerekçe, tarih ve durum bilgisini tutar. | 04 |
| REQ-044 | P0 | Bir karar değiştirildiğinde önceki karar sessizce silinmez; tarihsel ilişki veya revizyon kaydı korunur. | 04 |
| REQ-045 | P0 | Kullanıcı projeye zaman damgalı çalışma logu ekler; önceki loglar normal akışta append-only davranır. | 02,03 |
| REQ-046 | P0 | Proje 'Nerede kalmıştım?' görünümünde güncel açık görevler, son loglar ve son kararlar birlikte görülebilir. | 03,04 |
| REQ-047 | P1 | Not/karar/log kaydı proje içinde benzersiz kimliğe ve oluşturma zamanına sahiptir; ilişkiler yeniden adlandırmadan etkilenmez. | 04,05 |
| REQ-048 | P1 | Kullanıcı kaydı uygun türlerde düzenleyebilir; tarihçe ve logun append-only istisnaları veri modelinde netleştirilir. | 02,12 |
| REQ-049 | P1 | Markdown görüntülemede betik/zararlı HTML yürütülmez; bağlantılar güvenlik politikasına göre açılır. | 02,12 |
| REQ-050 | P1 | Notlar, kararlar ve loglar ilgili kayıttan kaynağa geri dönülebilir şekilde aranır. | 05 |
| REQ-051 | P1 | Ekler/varlıklar (görseller veya dosyalar) yerel kontrollü asset alanına içe alınır; orijinal dosya kullanıcı onayı olmadan değiştirilmez. | 02,09 |
| REQ-052 | P1 | Bir ek bulunamıyorsa uygulama çökmeden eksik varlık uyarısı gösterir; metin kaydı erişilebilir kalır. | 09,12 |

### 4.5 Arama, gezinme ve bağlam erişimi

**Yetkili ayrıntı:** `DOC-15`, `DOC-21–22`, `DOC-31`.

| ID | Öncelik | Gereksinim / gözlenebilir kabul | İlgili JTBD |
|---|---|---|---|
| REQ-053 | P0 | Proje, görev, not, karar ve log için AI'dan bağımsız birleşik metin araması vardır. | 05 |
| REQ-054 | P0 | Arama sonucunda kayıt türü, ilgili proje ve eşleşen içerik bağlamı görüntülenir. | 05 |
| REQ-055 | P0 | Sonuca tıklanınca doğru kayıt açılır; mümkünse ilgili eşleşme konumuna odaklanılır. | 04,05 |
| REQ-056 | P0 | Arama tamamen yerel çalışır ve ağ yokken, Ollama kapalıyken aynı çekirdek sonuçları sunar. | 05,10 |
| REQ-057 | P1 | Arama proje, kayıt türü ve uygulanabilir alanlarda durum/tarih filtreleri sunar. | 05,06 |
| REQ-058 | P1 | Türkçe karakterler, farklı büyük/küçük harf biçimleri, boş sorgu, noktalama ve çok sözcüklü sorgular test edilir; normalizasyon kuralı kullanıcıyı yanıltmaz. | 05 |
| REQ-059 | P1 | Arama kaydı eklendiğinde/düzenlendiğinde indeks sonuçları transaction ile tutarlı ya da açıkça tanımlı gecikme sınırında güncellenir. | 02,05 |
| REQ-060 | P1 | Sonuç sayısı yüksekse sanallaştırma/sayfalama uygulanır; bütün sonuç düğümleri bir anda oluşturulmaz. | 05 |
| REQ-061 | P1 | Arama başarısızlık veya indeks bozukluğu durumunda kullanıcıya güvenli yeniden oluşturma seçeneği verir; mevcut kayıtlar silinmez. | 05,12 |
| REQ-062 | P1 | Uygulama içi command palette, en az proje açma, arama, hızlı ekleme ve ayarlara gitme komutlarını sunar. | 02,03 |

### 4.6 Markdown/YAML içe-dışa aktarım ve Git

**Yetkili ayrıntı:** `DOC-16`, `DOC-17`, `DOC-30`.

| ID | Öncelik | Gereksinim / gözlenebilir kabul | İlgili JTBD |
|---|---|---|---|
| REQ-063 | P0 | Kullanıcı proje ya da workspace verilerini belgelenmiş, insan tarafından okunabilir Markdown/YAML dosyalarına aktarabilir. | 09 |
| REQ-064 | P0 | Export, aynı verinin aynı sırada ve aynı şema sürümünde tekrar üretilmesi durumunda deterministik içerik verir; rastgele metadata üretmez. | 09 |
| REQ-065 | P0 | Kullanıcı desteklenen bir dışa aktarımı önce doğrulayıp önizleyerek geri içe alabilir; bozuk/eksik dosyada mevcut DB zarar görmez. | 09,12 |
| REQ-066 | P0 | Import işlemleri tek transaction veya açık bölümlenmiş, geri alınabilir transaction stratejisiyle işlenir; yarım veri sessizce kabul edilmez. | 09,12 |
| REQ-067 | P1 | Import sırasında çakışan kararlı ID'ler için atla, yeni kopya oluştur veya bilinçli birleştir gibi açık politika gösterilir. | 09 |
| REQ-068 | P1 | Export, seçilen konuma yazarken kullanıcı dosyalarının üzerine habersizce yazmaz; yol ve izin hataları işlenir. | 09,12 |
| REQ-069 | P1 | Git sistemde kurulu değilse uygulamanın diğer özellikleri değişmeden çalışır; Git özelliği kapalı/kurulum önerisi durumuna geçer. | 09,10 |
| REQ-070 | P1 | Kullanıcı isteğiyle dışa aktarım dizini için Git durumunu inceleme ve yerel commit oluşturma desteklenir; mevcut kullanıcı değişiklikleri yanlışlıkla stage edilmez. | 09 |
| REQ-071 | P1 | Git push asla sessiz arka plan eylemi olarak çalışmaz; uzak hedef ve gönderilecek etki gösterilerek açık kullanıcı onayı istenir. | 09,12 |
| REQ-072 | P1 | Import/export işlem raporu kaç kaydın eklendiği, güncellendiği, atlandığı ve hatalı olduğunu gösterir. | 09 |

### 4.7 Yedekleme, geri yükleme ve şema yükseltmeleri

**Yetkili ayrıntı:** `DOC-09–10`, `DOC-17`, `DOC-32`.

| ID | Öncelik | Gereksinim / gözlenebilir kabul | İlgili JTBD |
|---|---|---|---|
| REQ-073 | P0 | Workspace yedeği SQLite ile tutarlı yöntem kullanır; WAL varlığında yalnızca canlı `.db` dosyasını kopyalamak yedekleme olarak kabul edilmez. | 12 |
| REQ-074 | P0 | Asset dosyaları ve uygulamanın workspace için gerekli metadata'sı yedek kapsamına girer; geri yükleme sonrası kırık bağlantılar raporlanır. | 12 |
| REQ-075 | P0 | Kullanıcı bir yedeği doğrulayabilir ve geri yükleme öncesi içerik/etki özeti görür; aktif verinin değiştirilmesi onay gerektirir. | 12 |
| REQ-076 | P0 | Uygulama migration öncesinde doğrulanabilir kurtarma noktası oluşturur; başarısız migration sessiz veri kaybı üretmez. | 12 |
| REQ-077 | P1 | Yedek listesinde tarih, boyut ve doğrulama durumu görülür; silme/onay ve saklama politikasını kullanıcı denetler. | 12 |
| REQ-078 | P1 | DB bozulması veya alan yetersizliği gibi durumlarda kullanıcıya doğrulanabilir onarım/geri yükleme yolları sunulur. | 12 |
| REQ-079 | P1 | Yedekleme başarısız olduysa sistem son başarılı yedeği olmuş gibi göstermez; hata kaydı ve yeniden deneme vardır. | 12 |
| REQ-080 | P1 | Yedek ve export dosyalarının varsayılan olarak şifrelenmediği dürüstçe belirtilir; kullanıcı güvenlik beklentisi yanlış yönlendirilmez. | 09,12 |

### 4.8 Görsel deneyim, klavye, erişilebilirlik ve dil

**Yetkili ayrıntı:** `DOC-20–23`.

| ID | Öncelik | Gereksinim / gözlenebilir kabul | İlgili JTBD |
|---|---|---|---|
| REQ-081 | P0 | Masaüstü arayüzü açık, koyu ve sistem temasıyla çalışır; tek token kaynağından yönetilir. | 01–12 |
| REQ-082 | P0 | Proje, görev, not, karar, log ve arama eylemleri fare yanında klavye ile tamamlanabilir. | 02,03 |
| REQ-083 | P0 | Arayüzde loading, empty, success, error ve disabled durumları birbirinden ayırt edilebilir; başarı görselleri yanıltıcı olmaz. | 01–12 |
| REQ-084 | P1 | Agent paneli kullanıcı tarafından açılıp kapatılabilir; kapalıyken veri yönetimi alanı kullanılabilir kalır. | 08,10 |
| REQ-085 | P1 | Türkçe ve İngilizce temel uygulama metinleri tamamdır; dil değişimi uygulamanın yeniden kurulmasını gerektirmez. | 01–12 |
| REQ-086 | P1 | Ekran okuyucu için alan adları, butonlar, hata iletileri ve odak geçişleri anlamlıdır. | 01–12 |
| REQ-087 | P1 | Reduced-motion tercihi ve işletim sistemi erişilebilirlik ayarı dikkate alınır; zorunlu büyük hareketli animasyon yoktur. | 01–12 |
| REQ-088 | P1 | En küçük desteklenen pencere boyutunda temel işlemler erişilebilir kalır; yatay taşma kritik kontrolleri gizlemez. | 01–12 |
| REQ-089 | P1 | Kullanıcı geri alınabilir aksiyonlarda Undo erişimine sahip olur; geri alınamaz aksiyon açık biçimde ayrılır. | 12 |
| REQ-090 | P1 | Klavye kısayolları yardım ekranında görünür; uygulama işletim sistemiyle çakışan global kısayolları varsayılan zorlamaz. | 02 |
| REQ-091 | P1 | Editör, arama ve sohbet gibi uzun listeler arayüzü bloke etmeyecek şekilde kademeli render edilir. | 02,05 |
| REQ-092 | P1 | Aynı ekranın React bileşenlerinde ayrı hardcode renk setleri oluşturulmaz; tasarım sistemi ortak kullanılır. | 01–12 |

### 4.9 Kurulum sihirbazı, sağlayıcı algılama ve ayarlar

**Yetkili ayrıntı:** `DOC-18–19`, `DOC-24–25`.

| ID | Öncelik | Gereksinim / gözlenebilir kabul | İlgili JTBD |
|---|---|---|---|
| REQ-093 | P0 | Kurulum sihirbazı workspace oluşturma ile AI/ses seçimini ayrı, geri dönülebilir adımlar olarak gösterir. | 11 |
| REQ-094 | P0 | Kullanıcı AI ve sesi kurmadan `Skip` seçerek çekirdek uygulamayı eksiksiz kullanmaya başlayabilir. | 10,11 |
| REQ-095 | P0 | Kurulum tamamlandı bilgisi ile Ollama/model/STT/TTS gerçek zamanlı sağlık durumları ayrı tutulur. | 10 |
| REQ-096 | P0 | Kullanıcı ayarlardan AI'yı ve ses bileşenlerini bağımsız açıp kapatabilir; yeniden kurulum gerekmez. | 10,11 |
| REQ-097 | P0 | Ollama tespiti kısa zaman aşımlı, iptal edilebilir ve başarısızlıkta engelleyici olmayan şekilde yapılır. | 10,11 |
| REQ-098 | P0 | Ollama yok/kapalı/model yok/model var gibi durumlar birbirinden ayrılır; her biri için doğru sonraki eylem gösterilir. | 10,11 |
| REQ-099 | P0 | Model indirmesi yalnızca kullanıcı eylemi/onayıyla başlatılır; kaynak, paket boyutu ve beklenen disk gereksinimi önceden gösterilir. | 11 |
| REQ-100 | P1 | Kurulu modeller listelenir; kullanıcı varsayılan modeli seçer ve değiştirebilir. | 08,11 |
| REQ-101 | P1 | Otomatik öneri GPU/RAM, model desteği, bağlam bütçesi ve yerel görev testlerine göre açıklanabilir biçimde sıralanır; öneri seçimi zorunlu değildir. | 08,11 |
| REQ-102 | P1 | Model indirme ilerlemesi, iptal, hata ve yeniden deneme durumları görünürdür; uygulamanın kapanması setup'ı tamamlandı işaretlemez. | 10,11 |
| REQ-103 | P1 | Kullanıcı sihirbazı daha sonra ayarlardan tekrar açabilir; daha önce tamamladığı adımları gerekmediği sürece yeniden yapmaz. | 10,11 |
| REQ-104 | P1 | Model sonradan silinirse veya Ollama kapanırsa Chat uygun unavailable durumuna geçer; veri kaybı veya genel UI çökmesi olmaz. | 10 |
| REQ-105 | P1 | Sistem Sağlığı ekranı tercih, gerçek servis durumu, son hata ve düzeltme eylemini ayrı gösterir. | 10,11 |
| REQ-106 | P1 | Donanım algılama kullanıcıya açıkça gösterilir; donanım bulunamadığında manuel model seçimine geçilir. | 11 |

### 4.10 Yerel sohbet, bağlam ve agent araçları

**Yetkili ayrıntı:** `DOC-24–27`, `DOC-30`.

| ID | Öncelik | Gereksinim / gözlenebilir kabul | İlgili JTBD |
|---|---|---|---|
| REQ-107 | P0 | AI etkin ve model hazırsa kullanıcı seçili proje bağlamında yerel sohbet başlatabilir. | 08 |
| REQ-108 | P0 | Agent'ın proje üzerinde eylem yapması yalnızca doğrulanmış, sınırlandırılmış Application Core araçlarıyla mümkündür; doğrudan SQL/shell erişimi yoktur. | 08,12 |
| REQ-109 | P0 | Agent'ın yaptığı her gerçek araç çağrısı, iş adı, durum, süre ve denetlenebilir sonuç bilgisiyle görünürdür. | 08 |
| REQ-110 | P0 | Riskli/toplu/yıkıcı eylemlerde kullanıcı onayı alınır; ret halinde hiçbir mutasyon yapılmaz. | 08,12 |
| REQ-111 | P0 | Agent hata verdiğinde veya model bağlantısı kesildiğinde tamamlanmış işlemlerin durumu yanlış gösterilmez; kullanıcı manuel çalışmaya devam eder. | 08,10 |
| REQ-112 | P1 | Agent okuma/arama, proje bulma, görev ekleme/güncelleme, not ve log ekleme, karar listeleme gibi sınırlı V1 araçları kullanabilir. | 08 |
| REQ-113 | P1 | Sohbet mesajları ile ilgili agent run/tool event geçmişi yerel olarak saklanır ve kullanıcı tarafından görüntülenebilir. | 08 |
| REQ-114 | P1 | Agent akışı görünür metin ve işlem durumlarını aşamalı aktarır; uzun süren işlem iptal edilebilir. | 08 |
| REQ-115 | P1 | Tool başarısı ancak core'un doğruladığı kalıcı sonuçtan sonra gösterilir; modelin kendi ifadesi başarı kanıtı sayılmaz. | 08,12 |
| REQ-116 | P1 | Agent seçili projeyle ilgili kaynak kayıtlara referans verir; yanıt ile gerçek kaynak birbirinden ayırt edilebilir. | 04,08 |
| REQ-117 | P1 | AI devre dışı bırakılınca aktif agent işlemi güvenli biçimde sonlandırılır; eskiden kaydedilmiş sohbetler okunabilir kalabilir. | 08,10 |
| REQ-118 | P1 | İzin, tool hatası, geçersiz argüman ve tekrar deneme olayları yerel teşhis kaydına girer; kullanıcı verileri kontrolsüz loglanmaz. | 08,12 |

### 4.11 Mikrofon, transkripsiyon ve sesli geri bildirim

**Yetkili ayrıntı:** `DOC-28–29`, `DOC-19`, `DOC-30`.

| ID | Öncelik | Gereksinim / gözlenebilir kabul | İlgili JTBD |
|---|---|---|---|
| REQ-119 | P0 | Mikrofon kaydı kullanıcı tuşa bastığında başlar; aynı kontrolle durdurulur; açık kayıt durumu sürekli görünür. | 07 |
| REQ-120 | P0 | STT modeli yoksa kayıt düğmesi kullanıcıyı kurulum/etkinleştirmeye yönlendirir; model yokluğu uygulamayı bloke etmez. | 07,10 |
| REQ-121 | P0 | Kayıt durdurulunca yerel STT işlenir ve sonuç otomatik işlem çalıştırmadan önce düzenlenebilir transkript olarak sunulur. | 07,08 |
| REQ-122 | P0 | Kullanıcı transkripti not/görev/sohbet girdisi olarak nereye göndereceğini açıkça seçer; ses tek başına yıkıcı işlem başlatamaz. | 07,08 |
| REQ-123 | P1 | Mikrofon izni reddi, cihaz yokluğu, boş/sessiz kayıt, model hatası ve iptal için anlaşılır geri dönüş vardır. | 07,10 |
| REQ-124 | P1 | Ses kaydı varsayılan olarak geçici tutulur ve onay/iptal sonrası politika gereği temizlenir; kalıcı saklama varsa açık izin istenir. | 07,09 |
| REQ-125 | P1 | TTS tek başına açılıp kapatılabilir; TTS kapalı veya hatalı olsa da metin yanıtı gösterilir. | 07,10 |
| REQ-126 | P1 | EMA Lightning sesi kullanıcı isteğiyle üretilir; oynatma durdurma, hata ve yeniden deneme görünürdür. | 07 |
| REQ-127 | P1 | STT ve TTS modeli ayrı indirilebilir; uygulama bütün ses paketlerini zorunlu ilk kurulum bağımlılığı yapmaz. | 10,11 |
| REQ-128 | P1 | Ses çıkarımı Electron renderer/main iş parçacığını uzun süre bloke etmez; eşzamanlı model belleği baskısı yönetilir. | 07,10 |

### 4.12 Güvenlik, mahremiyet, hata dayanıklılığı ve işletim

**Yetkili ayrıntı:** `DOC-06`, `DOC-11`, `DOC-17`, `DOC-30–34`.

| ID | Öncelik | Gereksinim / gözlenebilir kabul | İlgili JTBD |
|---|---|---|---|
| REQ-129 | P0 | Renderer, doğrudan Node dosya sistemi/SQL ve sınırsız işletim sistemi API'si kullanamaz; kısıtlı preload/IPC üzerinden işlem yapar. | 09,12 |
| REQ-130 | P0 | IPC ve tool girdileri güven sınırında tip/şema, yetki, path ve veri boyutu açısından doğrulanır. | 09,12 |
| REQ-131 | P0 | Varsayılan çalışma yerel/çevrimdışı olup otomatik telemetri, bulut sync ve dış model sağlayıcısı etkin değildir. | 09,10 |
| REQ-132 | P0 | Dış bağlantı ve dosya erişimi kullanıcı tarafından başlatılmış veya açık yetkilendirilmiş akışlara bağlıdır. | 09,12 |
| REQ-133 | P0 | Fatal olmayan modül hataları bütün uygulamayı kilitlemez; veri kaybı riskini artırmadan izolasyon ve kurtarma sağlanır. | 10,12 |
| REQ-134 | P0 | Windows yüklenebilir dağıtım paketi temiz makinede kurulup açılabilir; Ollama/Python/Git önceden kurulu olma koşulu yoktur. | 10,11 |
| REQ-135 | P1 | Güncelleme, uygulama imza/bütünlük kontrolleri ve kaynak doğrulama politikasıyla dağıtılır; başarısız güncellemeden kurtarma tanımlıdır. | 12 |
| REQ-136 | P1 | Hata teşhisi için yerel redakte edilmiş günlük ve kullanıcı talebiyle dışa alınan rapor vardır; kendiliğinden sunucuya gönderilmez. | 12 |
| REQ-137 | P1 | Kullanıcı kendi sohbet/geçmiş kayıtlarını veya geçici verileri kontrollü biçimde temizleyebilir; etki ve yedek ilişkisi açıklanır. | 09,12 |
| REQ-138 | P1 | Veritabanı şema sürümü uyumsuzsa yanlış sürüm üzerine yazma yapılmaz; yükseltme ya da okunabilir hata/kurtarma sunulur. | 12 |
| REQ-139 | P1 | Geliştirme, test ve paketleme otomatik doğrulama zincirine sahip olur; release kanıtları kayıt altına alınır. | 11,12 |
| REQ-140 | P1 | Başlangıç, görev ekleme, arama ve uzun listeler performans bütçesine göre ölçülür; `DOC-31` kriterleri sağlanır. | 02,03,05 |

### 4.13 Gereksinim envanterinin özeti

| Aralık | Alan | Sayı |
|---|---|---:|
| `REQ-001–012` | Workspace / ilk açılış | 12 |
| `REQ-013–024` | Projeler / resume | 12 |
| `REQ-025–040` | Görevler / Kanban | 16 |
| `REQ-041–052` | Notlar / kararlar / loglar | 12 |
| `REQ-053–062` | Arama / navigasyon | 10 |
| `REQ-063–072` | Import/export/Git | 10 |
| `REQ-073–080` | Yedekleme / recovery | 8 |
| `REQ-081–092` | UI / erişilebilirlik / dil | 12 |
| `REQ-093–106` | Kurulum / model yönetimi | 14 |
| `REQ-107–118` | AI / agent | 12 |
| `REQ-119–128` | Ses / STT / TTS | 10 |
| `REQ-129–140` | Güvenlik / işletim / kalite | 12 |
| **Toplam** | **Benzersiz ürün gereksinimleri** | **140** |

## 5. Kritik kullanıcı kabul senaryoları

`DOC-03` akış diyagramlarını ve ayrıntılı kullanıcı yolculuklarını, `DOC-33` ise otomatik test uygulamasını belirler. Burada istenen sonuçlar normatiftir.

### AC-001 — AI'sız temiz kurulum

**Given:** Yeni Windows kullanıcı profili, Ollama/Git/Python kurulu değil, internet bağlantısı yok.

**When:** Kullanıcı Iterkeep'i açar, çalışma alanını seçer, AI ve sesi atlar, bir proje/görev/not oluşturur.

**Then:** Sihirbaz tamamlanır; proje ve kayıtlar SQLite'a kaydedilir; arama çalışır; yeniden başlatma sonrasında veri kaybolmaz.

**Bağ:** `REQ-001–004`, `REQ-009`, `REQ-012`, `REQ-013`, `REQ-025`, `REQ-041`, `REQ-053`, `REQ-094`, `REQ-134`.

### AC-002 — İlk yakalama ve Inbox

**Given:** Workspace hazır, proje seçilmemiş.

**When:** Kullanıcı command palette veya hızlı ekleme alanından 'Memory testlerini yaz' görevini kaydeder.

**Then:** Girdi Inbox'ta bir kez oluşur, başarı commit sonrası gösterilir; daha sonra başka projeye taşınınca kimlik/içerik korunur.

**Bağ:** `REQ-021–022`, `REQ-025`, `REQ-035`, `REQ-062`.

### AC-003 — Üç hafta sonra projeye dönüş

**Given:** Projede açık ve tamamlanmış görevler, çalışma logları ve teknik kararlar vardır.

**When:** Kullanıcı projeyi yeniden açar.

**Then:** Son çalışma ve yapılacak işler görünür; karara tek bir gezinme yolu ile ulaşılır; hiçbir AI yanıtı gerekmemektedir.

**Bağ:** `REQ-015–016`, `REQ-023`, `REQ-027–029`, `REQ-043–046`.

### AC-004 — Kararı neden aldığımı bul

**Given:** Aynı konuda eski ve onu değiştiren yeni bir karar mevcut.

**When:** Kullanıcı karar adını veya gerekçesini arar.

**Then:** Kaynak, tarih, durum ve revizyon/yerine-geçme ilişkisi görünür; eski karar silinmiş gibi davranılmaz.

**Bağ:** `REQ-043–044`, `REQ-053–058`.

### AC-005 — Aynı görevin listeden ve Kanban'dan güncellenmesi

**Given:** Bir görev liste ve Kanban görünümlerinde görünmektedir.

**When:** Kullanıcı Kanban'da durumunu değiştirir, listeye döner ve uygulamayı yeniden açar.

**Then:** İki görünüm aynı durumu gösterir; ikinci görev oluşmaz; DB commit hatasında eski durum geri gelir ve hata görünür.

**Bağ:** `REQ-025–032`, `REQ-039`.

### AC-006 — Türkçe karmaşık arama

**Given:** Türkçe büyük/küçük harf ve ek kullanımını içeren görev/not/karar kayıtları vardır.

**When:** Kullanıcı birleşik aramada metin ve kayıt türü filtreleri kullanır.

**Then:** Tanımlı normalizasyon politikasıyla tutarlı kaynaklı sonuçlar gösterilir; sonuç yoksa açıklayıcı boş durum çıkar; Ollama gerekli değildir.

**Bağ:** `REQ-053–061`.

### AC-007 — Markdown round-trip

**Given:** En az iki proje, görevler, notlar, kararlar, loglar ve asset referansları vardır.

**When:** Kullanıcı dışa aktarır, yeni bir workspace'e içe alır ve yeniden dışa aktarır.

**Then:** ID/ilişki/içerik kaybı olmadan tanımlı şema eşdeğerliği elde edilir; metadata'nın kararlı alanlarında gereksiz diff oluşmaz.

**Bağ:** `REQ-063–068`, `REQ-072`, `REQ-074`.

### AC-008 — Kötü import / sağlam veri

**Given:** Kaydedilmiş çalışma alanı ve bozuk/malicious bir import paketi vardır.

**When:** Kullanıcı paketi içe aktarmayı dener.

**Then:** Hata açık görünür, mevcut proje sayısı/verisi değişmez, workspace dışına dosya yazılmaz ve path traversal reddedilir.

**Bağ:** `REQ-065–068`, `REQ-129–130`.

### AC-009 — Yedekten geri dönme

**Given:** Çalışma alanında kayıtlar vardır ve tutarlı yedek oluşturulmuştur.

**When:** Kullanıcı bir görevi değiştirir, ardından önceki yedeğe geri yükleme başlatır.

**Then:** Önizleme ve onay gerekir; restorasyon sonrası DB ve asset bütünlüğü doğrulanır; eski sürüme dönülen durum kullanıcıya açık gösterilir.

**Bağ:** `REQ-073–079`.

### AC-010 — Ollama kurulu değil, sonradan kuruldu

**Given:** AI kapalı kurulum tamamlanmış ve uygulama kullanılmaktadır.

**When:** Kullanıcı daha sonra Ollama kurar, Ayarlar'dan AI'yı açar ve taramayı çalıştırır.

**Then:** Kurulum sihirbazını sıfırdan tekrarlamadan model seçeneklerine ulaşır; proje verileri ve diğer tercihler değişmez.

**Bağ:** `REQ-094–106`.

### AC-011 — Model indirirken çıkış / tekrar açılış

**Given:** Kullanıcı modeli indirmeyi onaylamış ve indirme başlamıştır.

**When:** Uygulama indirme sırasında kapanır veya internet kesilir.

**Then:** Tamamlanmamış model 'ready' kabul edilmez; kullanıcı yeniden açınca gerçek durum gösterilir ve doğrulanmış yeniden deneme yolu sunulur; temel uygulama çalışır.

**Bağ:** `REQ-095`, `REQ-099–104`.

### AC-012 — Agent eylem izi ve güvenli ret

**Given:** Yerel model hazır, kullanıcı iki görev eklemek ve bir projeyi silmek istemektedir.

**When:** Agent normal görev ekleme araçlarını çağırır; silme için kullanıcı onayı ister; kullanıcı reddeder.

**Then:** Eklenen görevler gerçekten kalıcıysa görünür; silme gerçekleşmez; her tool çağrısının giriş/çıkış özeti ve durumu bulunur; modelin yalnızca 'yaptım' demesi yeterli olmaz.

**Bağ:** `REQ-107–118`, `REQ-129–132`.

### AC-013 — Sesli notta yanlış transkript

**Given:** STT etkin, mikrofon izni verilmiş ve kullanıcı konuşma kaydı başlatmıştır.

**When:** Kullanıcı yeniden basarak kaydı durdurur; yanlış transkripti manuel düzeltip göreve dönüştürür.

**Then:** Düzeltilmiş metin kaydedilir; orijinal yanlış metin eylem komutu olarak yürütülmez; kayıt sona erince görünür kayıt göstergesi kaybolur.

**Bağ:** `REQ-119–124`.

### AC-014 — TTS yok / hata / kapalı

**Given:** AI yanıt metni hazır, TTS kurulu değil veya servis hata vermektedir.

**When:** Kullanıcı yanıtı görüntüler.

**Then:** Metin tam olarak okunabilir, TTS eksikliği sohbeti durdurmaz; kullanıcı sesi sonra kurabilir veya kapalı bırakabilir.

**Bağ:** `REQ-125–128`.

### AC-015 — Çevrimdışı ve gizlilik

**Given:** AI/voice/Git provider'ları devre dışı ve internet bağlantısı kesiktir.

**When:** Kullanıcı proje yönetir, veri arar, not kaydeder, yerel yedek oluşturur.

**Then:** Çekirdek görevler başarılıdır; gizli ağ çağrısı veya kullanıcı izni dışında veri aktarımı yapılmaz.

**Bağ:** `REQ-001`, `REQ-004`, `REQ-053`, `REQ-073`, `REQ-094`, `REQ-129–132`.

### AC-016 — Dosya izin hatası ve disk doluluğu

**Given:** Workspace dizini yazmaya kapalı veya diskte boş alan yetersiz.

**When:** Kullanıcı not kaydetmeye, modeli indirmeye veya yedek oluşturmaya çalışır.

**Then:** İşlem tamamlandı sayılmaz; kullanıcıya doğrulanabilir hata/çözüm yolu sunulur; diğer veriler tutarlı kalır.

**Bağ:** `REQ-005`, `REQ-042`, `REQ-078–079`, `REQ-099`, `REQ-133`.

### AC-017 — Migrasyon yükseltme başarısızlığı

**Given:** Eski şemalı gerçekçi test workspace'i ve bilinçli hata üreten migration fixture'ı vardır.

**When:** Yeni uygulama sürümü ilk kez açılır.

**Then:** Kurtarma noktası alınır, hata halinde DB tutarlı kalır; kullanıcı eski veriye erişebilmek için açık kurtarma adımlarını görür; bozuk şema üzerine yazılmaz.

**Bağ:** `REQ-005`, `REQ-073–079`, `REQ-138`.

### AC-018 — Türkçe / İngilizce ve temalar

**Given:** Workspace'te kayıtlar var ve kullanıcı koyu tema + Türkçe UI kullanıyor.

**When:** Kullanıcı açık temaya, sonra İngilizceye geçer.

**Then:** Veriler değişmez, ekranlar aynı işlevleri sunar, kontroller erişilebilir kalır; yeniden başlatınca tercih korunur.

**Bağ:** `REQ-007`, `REQ-081–092`.

## 6. Negatif durum ve fallback matrisi

Bu tablo tek bir hata testine indirgenmeyecek; ilgili alanın entegrasyon ve E2E testlerinden örnekler üretilmelidir.

| Durum | Asla olmamalı | Beklenen kullanıcı sonucu | Sorumlu belge |
|---|---|---|---|
| DB dosyası açılmıyor | Boş veritabanıyla sessiz devam | Kurtarma/doğrulama ekranı | `17`, `32` |
| İki eşzamanlı düzenleme | Sessiz içerik ezme | Çakışma/yenileme politikası | `10`, `12` |
| Import içinde `../` | Workspace dışına yazma | Güvenli reddetme ve rapor | `16`, `30` |
| FTS indeksi bozuk | Notların silinmesi | İndeksi yeniden üretme | `15`, `32` |
| Git yüklü değil | Uygulamanın açılmaması | Git-only kontroller açıklanır | `16`, `19` |
| Git repo'da başka uncommitted dosyalar | Hepsini otomatik stage etme | Yalnız seçilen export etkisi | `16` |
| Ollama dinlemiyor | Sonsuz spinner | Durum + yeniden dene + manuel kullanım | `19`, `25` |
| Ollama başka uygulama tarafından kullanılıyor | Servisi habersiz kapatma | Sadece kendi istek/işlerini iptal | `24`, `25` |
| Model eksik/uyumsuz | 'Model hazır' göstermek | Başka model/kurulum seçeneği | `25` |
| Model indirme yarıda | Tamamlandı durumu | Kısmi/failed + kurtarılabilir adım | `18`, `25` |
| AI açık, tool geçersiz | Keyfî SQL/komut | Şema reddi ve görünür hata | `26`, `27`, `30` |
| Kullanıcı silmeyi reddediyor | Gizli silme | Güvenli ret + adım kaydı | `27`, `30` |
| Mikrofon izni yok | Sessizce kayıt başlatmış gibi yapma | İzin yardımı + metin alternatifi | `28` |
| STT sonucu boş | Boş kayıtla görev oluşturma | Tekrar kaydet/düzenle | `28` |
| TTS çöktü | Chat yanıtını kaybetme | Metin kaldığı yerden çalışır | `29`, `32` |
| Disk doldu | Başarı bildirimi | Başarısız yazma + veri tutarlılığı | `10`, `17`, `32` |
| Güncelleme hatası | Çalışmayan sürüme zorla geçiş | Güvenli geri dönüş/uyarı | `34` |
| 100k kayıtta arama | UI ana thread'ini kilitleme | İlerleme/sonuç/iptal davranışı | `15`, `31` |

## 7. İşlevsel olmayan gereksinimler (NFR)

Aşağıdaki maddeler bütün ilgili `REQ-*` gereksinimlerine çapraz uygulanır. Sayısal eşiklerin **tek normatif kaynağı `DOC-31`** olacak; burada performansın hangi açılardan zorunlu olduğu belirtilir.

### NFR-A — Performans ve algılanan hız

1. **Ana pencere / çekirdek CRUD / arama, AI servislerinin yanıtını beklemez.**
2. Kullanıcı girdisinin görsel tepkisi ile kalıcı commit durumu ayrı gösterilir; commit edilmemiş veri kaydedilmiş gibi ilan edilmez.
3. Tek bir görev veya projedeki değişim tüm workspace'in yeniden sorgulanmasını ve React ağacının gereksiz yeniden render edilmesini gerektirmez.
4. Çok sayıda sonuç veya günlük girişi, sanallaştırma/sayfalama ve kademeli veri getirme ile işlenir.
5. Uzun işler arayüzü ve Electron main event loop'u bloke etmeyen worker/sidecar mekanizmalarına taşınır.
6. CPU, RAM, VRAM, disk I/O ve cold/warm startup ölçümleri referans donanım ve veri fixture'ları ile raporlanır.
7. Yavaş donanım algılandığında görsel efekt azaltma ve sınırlı eşzamanlılık gibi anlaşılır degrade stratejisi uygulanabilir.

### NFR-B — Güvenilirlik ve veri bütünlüğü

1. SQLite tek kalıcı yazma kaynağıdır. Markdown export eşzamanlı ikinci veri kaynağı olmaz.
2. Transaction ve şema doğrulama, kısmi yazma/veri yetimleşmesi ihtimalini engellemek için uygulanır.
3. WAL ve gerçek SQLite backup API / uygun transaction yaklaşımı kullanılmadan 'güvenli yedek' ilan edilmez.
4. İçe aktarım güvenilmeyen girdi kabul edilir; dosya boyutu/yol kısıtlamaları ve paket bütünlüğü doğrulanır.
5. Otomatik şema migration'ı veri kaybı riskini azaltan kurtarma prosedüründen sonra başlatılır.
6. Kullanıcının oluşturduğu metnin kaybolmaması, milisaniyelik daha hızlı tepkiden daha yüksek önceliklidir.

### NFR-C — Güvenlik ve mahremiyet

1. Electron renderer ayrıcalıksızdır; yalnız dar kapsamlı ve doğrulanmış IPC kullanır.
2. Agent yalnız izinli uygulama araçlarını çalıştırır; serbest shell, serbest SQL ve genel dosya sistemi yetkisi yoktur.
3. Model prompt'ları, kullanıcı notları ve geçici ses kayıtları varsayılan olarak dış servislerle paylaşılmaz.
4. Telemetri varsayılan kapalıdır; V1'de kendiliğinden toplanan/iletilen kullanıcı analitiği yoktur.
5. İçe alınan Markdown/HTML içerikleri JavaScript çalıştırma vektörüne dönüşemez.
6. Workspace dosyaları varsayılan olarak OS kullanıcısının erişim kontrolüyle korunur; ürün **tam-disk şifreleme / uçtan uca şifreleme sağlıyor** gibi pazarlanamaz.
7. Kullanıcı istemedikçe uygulama uzak Ollama endpoint'i keşfetmez veya veri göndermez; yerel endpoint dışı özel yapılandırmalar ayrı güvenlik kararına tabidir.

### NFR-D — Kullanılabilirlik / erişilebilirlik

1. Zorunlu temel iş akışları mouse veya keyboard ile tamamlanabilir.
2. Ses hiçbir zaman tek giriş kanalı değildir; TTS hiçbir zaman tek çıkış kanalı değildir.
3. Loading, partial, retry, error, disabled, pending approval ve completed durumları kolay ayrılır.
4. Açık/koyu tema ve Türkçe/İngilizce çeviriler veri davranışını etkilemez.
5. Küçük ekran, yüksek zoom, reduced motion ve ekran okuyucu modları kalite matrisine dahildir.
6. Kritik silme/import/restore/onay ekranları yapılacak etkiyi anlaşılır biçimde açıklar.

### NFR-E — Sürdürülebilirlik ve test edilebilirlik

1. Domain kararları React bileşenlerine, provider adapter'larına veya prompt metinlerine gömülmez.
2. İşlevlerin core, IPC, UI, provider mock ve E2E seviyelerinde test edilebilen katmanları vardır.
3. Harici provider yokken hızlı çalışan hermetik test fixture'ları bulunur.
4. Üretilmiş paketlerin sürümü, kaynak revizyonu ve CI sonucuyla izlenebilirliği sağlanır.
5. SQL şema, IPC ve tool sözleşmelerinin sürümlenmesi değişiklik kontrol sürecine bağlıdır.

## 8. V1 kapsamından açıkça çıkarılan özellikler

**Aşağıdakiler V1'in 'eksik yapılmış' özellikleri değil, kapsam dışı ürün alanlarıdır.** Geliştirici ajan bunları yeni gereksinim olarak ekleyemez.

| OUT-ID | V1 dışı | Kapsama girme koşulu |
|---|---|---|
| OUT-01 | Kullanıcı hesabı, ücretli abonelik, zorunlu bulut servisi | Ayrı ürün kararı |
| OUT-02 | Ekip rolleri, davet/izin sistemi, gerçek zamanlı çok kullanıcı | V2+ keşif |
| OUT-03 | Mobil/Web istemcisi, bulut sync backend'i | Ayrı yol haritası |
| OUT-04 | Genel amaçlı, sınır tanımayan işletim sistemi agent'ı | Güvenlik ve ürün kapsamı yeniden değerlendirme |
| OUT-05 | Serbest terminal komutu ve keyfî ağ isteği yürüten AI | Varsayılan olarak kabul edilmez |
| OUT-06 | Aralıksız mikrofon dinleme/uyandırma kelimesi | Açık mahremiyet tasarımı sonrası |
| OUT-07 | Tam kapsamlı bağımsız CLI uygulaması | Ortak core hazır olduğunda sonraki sürüm |
| OUT-08 | Google/Outlook takvim, Gmail, Drive senkronizasyonu | Kullanıcı talebi + güvenlik modeli |
| OUT-09 | Gantt, zaman çizelgesine bağlı bütçe/ekip kaynak planlama | Ayrı odak kararı |
| OUT-10 | Marketplace, kullanıcı eklentisi veya bilinmeyen script çalıştırma | Sandboxing/izin tasarımı sonrası |
| OUT-11 | Yerleşik remote LLM sağlayıcısı ve bulut konuşma servisi | Açık kullanıcı güvenlik tercihi sonrası |
| OUT-12 | Otomatik arka plan Git push ve tam otomatik iki yönlü sync | Çakışma ve izin tasarımı sonrası |
| OUT-13 | Kendi kendine servis kurup sistem ayarlarını izinsiz değiştirme | Hiçbir sürümde izinsiz yapılmaz |
| OUT-14 | Kaynak kod IDE'si, debugger, terminal emülatörü | Proje hafızası odağıyla uyumsuz |
| OUT-15 | Kalıcı ses arşivi / arka plan konuşma diarization sistemi | Ses özelliğinin V1 dışı genişletmesi |
| OUT-16 | Tam otomatik AI özetinin proje kaydı yerine kullanılması | Ürün ilkelerine aykırı |

## 9. Yayın / özellik kırılımı ve bağımlılıklar

V1'in bütün zorunlu bölümleri tamamlanmış olmakla birlikte geliştirme sırasında dört doğrulanabilir dikey aşama kullanılacaktır. Kesin iş paketleri `DOC-35` içindedir.

| İş dilimi | Bağımlılık | Çalışır teslim / smoke test | İlgili gereksinimler |
|---|---|---|---|
| **Slice A — Çekirdek** | Repo, DB, IPC, workspace | Kurulum atlanır, proje/görev/not kaydedilir ve yeniden açılır | `001–052`, `073–080`, `129–133` içinden ilgili P0 |
| **Slice B — Bulunabilirlik** | Çekirdek entity'leri | FTS5, karar arama, export/import, yedek/restore | `053–080` |
| **Slice C — Ürün deneyimi** | Çekirdek + arama | Setup/settings, list+Kanban, temalar, klavye ve iki dil | `081–106` |
| **Slice D — Opsiyonel yetenekler** | Core command + capability manager | Ollama agent ve ses, tool onayı, provider hatasında fallback | `107–128` |
| **Release hardening** | Tüm dilimler | Windows temiz kurulum, test/benchmark, migration & güvenlik doğrulama | `129–140` ve `DOC-04/33/34` |

**Not:** Bu sıra mutlak geliştirme kronolojisi değildir; güvenlik/migration/test altyapısı ilk dilimden itibaren kurulur. Release hardening'e bırakılmaz.

### 9.1 Opsiyonel bileşenin ürün sözleşmesi

'AI optional' iki farklı anlama gelmez:

- **Kullanıcı açısından:** AI, Whisper ve TTS'yi kurmadan uygulamanın ana işlevleri çalışır.
- **Ürün geliştirme açısından:** V1 bu modülleri 'mevcut' olarak yayımlıyorsa ilgili P0/P1 gereksinimleri ve testsiz stub'lar kabul edilmez.

Modül kurulu değilken disabled durum göstermek, modülün asıl uygulanışındaki eksikliği meşrulaştırmaz. Kurulum akışı ve çalışan provider ayrı ayrı test edilmelidir.

## 10. Gereksinim → ürün işi → test izlenebilirliği

Bu bölüm, `DOC-03/04/33` için başlangıç ilişki matrisidir; kesin test ID'leri sonra eklenir.

| Kullanıcı işi | Asgari doğrulama | Temel gereksinimler | Kabul senaryoları |
|---|---|---|---|
| `JTBD-01` Proje başlatma | Kurulum ve yeni proje | `001–003`, `013–017`, `093–094` | `AC-001`, `AC-003` |
| `JTBD-02` Hızlı yakalama | Inbox + görev/not | `021–022`, `025`, `035`, `041–042` | `AC-002` |
| `JTBD-03` Geri dönme | Son etkinlik / açık işler | `016`, `023`, `027–029`, `045–046` | `AC-003` |
| `JTBD-04` Kararı hatırlama | Gerekçeye ve revizyona ulaşma | `043–044`, `050`, `055` | `AC-004` |
| `JTBD-05` Arama | Çevrimdışı birleşik arama | `053–062` | `AC-006` |
| `JTBD-06` İlerleme | Liste + Kanban | `025–040` | `AC-005` |
| `JTBD-07` Sesle giriş | Start/stop/düzelt/kaydet | `119–128` | `AC-013`, `AC-014` |
| `JTBD-08` Agent | Denetlenen araç ve onay | `107–118` | `AC-012` |
| `JTBD-09` Taşınabilirlik | Export/import round-trip | `063–072` | `AC-007`, `AC-008` |
| `JTBD-10` AI yokken çalışma | Kapanma/yeniden açma + provider yokluğu | `004`, `094–098`, `104`, `111`, `125` | `AC-001`, `AC-010`, `AC-014`, `AC-015` |
| `JTBD-11` Kolay kurulum | Skip/resume/model seçimi | `001–012`, `093–106` | `AC-001`, `AC-010`, `AC-011` |
| `JTBD-12` Güvenlik/kurtarma | Backup/restore/migration | `073–080`, `129–140` | `AC-008`, `AC-009`, `AC-016`, `AC-017` |

### 10.1 Örnek kabul testi iskeleti

Aşağıdaki format, `DOC-33`'te gerçek Playwright/E2E ve unit testlerine çevrilmelidir. Testte sahte Ollama kullanmak normaldir; release'e kadar en az bir gerçek yerel modelle uçtan uca doğrulama gerekir.

```gherkin
Feature: Optional AI must not block core workspace

  Scenario: AI disabled from first run
    Given there is no Ollama executable or service
    And I have no network connection
    When I complete setup with AI and voice skipped
    And I create a project named "Deneme"
    And I add a task named "İlk görev"
    And I restart Iterkeep
    Then I can find the project "Deneme"
    And it contains exactly one task "İlk görev"
    And search works without an AI provider
    And no AI installation was initiated
```

İkinci örnek: mutation öncesi onay ile gerçek commit'in ayrılması.

```gherkin
Feature: Agent tools are audited and permissioned

  Scenario: User rejects destructive action
    Given the local agent is ready
    And project "Deneme" exists
    When I ask the agent to permanently delete "Deneme"
    And the agent requests the matching approved tool
    Then the UI shows the target and destructive impact
    When I reject the action
    Then "Deneme" still exists in SQLite
    And the tool event has the status "rejected"
    And the assistant does not claim deletion succeeded
```

## 11. Edge-case envanteri: Geliştirici ajanın atlamaması gerekenler

1. Bir projede aynı isimli iki görev olabilir; kimlik metin değildir.
2. Boş başlıklı görev/not/karar oluşturma kuralları doğrulama ile belirlenir; boş metni yanlışlıkla commit etme.
3. Kullanıcı görev oluştururken başka projeye geçerse giriş beklenmedik projeye yazılmaz; hedef ID komutla birlikte sabitlenir.
4. Görev tamamlanmışken yeniden açılabilir; geçmiş doğru kalır.
5. Kanban sürükle-bırak ile klavye üzerinden durum değiştirme aynı core command'ı kullanır.
6. Uygulama beklenmedik kapanırsa kalıcı yazılmış notlar kalır, başarısız yazma sahte başarıya dönüşmez.
7. Çok uzun Markdown, bozuk UTF-8, emoji, Türkçe özel harfler ve karma Unicode kayıtları ele alınır.
8. Kullanıcı dosya adında ayrılmış karakter kullanırsa export güvenli slug/ID şeması üretir; proje adı veri olarak aynen korunur.
9. Export dizininde önceden kullanıcı dosyası varsa habersizce silme/ezme yapılmaz.
10. Import path traversal, symlink, çok büyük dosya ve zip bombası riskleriyle sınanır (paket biçimi kullanılıyorsa).
11. SQLite yoğun yazma sırasında UI'da 'dondu' izlenimi verilmez; busy/retry/timeout politikası vardır.
12. System clock değişmiş olabilir; oluşturulma ve etkinlik sıralaması yalnız kullanıcı cihaz saatine körü körüne güvenmez.
13. Yerel tarih / takvim tarihi ile UTC anı farklı veri tipleri olarak ele alınır.
14. Bir modelin Ollama listesinde bulunması 'çalışabiliyor' anlamına gelmez; gerçek yükleme/araç testleri ayrı gerçekleşir.
15. Ollama servisinde kullanıcıya ait olmayan modeller silinmez; indirme de kullanıcı onayı gerektirir.
16. AI kapatılınca eski sohbet kayıtları silinmez; kullanıcı ayrıca temizleyebilir.
17. Tool uygulama tarafından hata dönerse LLM çıktısındaki 'tamam' ifadesi başarı yerine geçmez.
18. STT çıkışı bir tool input'una dönüştürülmeden önce kullanıcı düzenleme/onay adımından geçer.
19. Sesli kayıt sırasında mikrofon çıkarılırsa kayıt hata durumuna geçer; sonsuza dek recording görünmez.
20. Ses/AI servisinde VRAM yetersizse bellek yöneticisi çalışmayı durdurup daha hafif alternatif sunabilir; çekirdek UI çalışır.
21. TTS başarısızsa metin yanıtı kesintisiz kalır.
22. Tema ve dil değişiminde modal odağı kaybolup yıkıcı düğme yanlışlıkla tetiklenmez.
23. İşletim sistemi dizini salt okunursa kullanıcıya farklı workspace konumu seçme yolu gösterilir.
24. Restore işlemi sürüm uyumluluğu nedeniyle yapamıyorsa canlı DB üzerinde deneme-yanılma migration yapılmaz.
25. Birden fazla kısa süreli iş (arama, ses, indirme, export) birlikte çalışırken prioritizasyon kullanıcının aktif eylemini aç bırakmaz.
26. İndirme boyutu, diskte boş alan ve açık izin bulunmadığında işlem kendiliğinden başlamaz.
27. Başarısız arama indeksi yeniden oluşturma işlemi, altta saklanan veri kayıtlarını silmez.
28. Yeni güncelleme alınmasa ve ağ olmasa dahi geçmiş workspace kullanılabilir kalır.

## 12. Teknik dokümanlara devredilen kesin çıktılar

| Yetkili belge | Bu gereksinimlerden üretilecek zorunlu teknik çıktı |
|---|---|
| `03-USER-JOURNEYS` | `AC-001–018` için kullanıcı yolları, her ekranın empty/error/retry/exit davranışı |
| `04-QUALITY-GATES` | P0/P1 gereksinimlerin yayın kapıları, kanıt türleri ve engelleyici hata sınıfları |
| `05-STACK-DECISIONS` | Pinli bağımlılıklar, alternatif değerlendirmeler, sürüm uyumluluk matrisi |
| `06-SYSTEM-ARCHITECTURE` | Açılış kritik yolu, worker/sidecar sınırları, servis yaşam döngüsü |
| `07-REPO-STRUCTURE` | Domain modül sınırları, kod dizinleri, test fixture ve app paketleri |
| `08-DOMAIN-MODEL` | Kararlı kimlikler, ilişkiler, görev/karar/proje durum makineleri, event semantiği |
| `09-DATABASE-SCHEMA` | DDL, FK/unique/check/index, FTS5, migration, veri integrity invariant'ları |
| `10-DB-OPERATIONS` | Transaction, repository, optimistic concurrency, idempotency, backup API stratejisi |
| `11-IPC-CONTRACTS` | Bütün kullanıcı komutları için IPC adları, girdi/çıktı/hata/iptal şemaları |
| `12-STATE-JOBS-EVENTS` | UI request cache, invalidation, job lifecycle, progress, queue/cancellation |
| `13-PROJECTS-TASKS` | Inbox, liste/Kanban, görev sırası, archive/delete, undo ve UI eylem kuralları |
| `14-NOTES-DECISIONS-LOGS` | Markdown editörü, append-only log politikası, karar revizyon bağlantıları |
| `15-SEARCH` | Türkçe normalizasyon, FTS5 sorgu/indeks, filtreleme ve safe query kuralları |
| `16-IMPORT-EXPORT-GIT` | Şemalı taşınabilirlik formatı, deterministik export, çakışma çözümü, Git sınırları |
| `17-BACKUP-RECOVERY` | Workspace snapshot, asset, restore, migration fail-safe, kullanıcı uyarıları |
| `18-SETUP-WIZARD` | Kurulum adımları, skip/retry/resume, servis algılama, indirme/progress |
| `19-SETTINGS-CAPABILITY` | Ayar kalıcılığı, provider sağlık state machine ve Sistem Sağlığı ekranı |
| `20-DESIGN-TOKENS-THEMES` | Merkezi light/dark/system token seti ve erişilebilir renk kontrastı |
| `21-SCREENS-NAVIGATION` | Dashboard, Inbox, Project, Task, Editor, Search, Chat, Setup, Health ekran haritası |
| `22-COMPONENTS-INTERACTIONS` | Her kontrole basma/disabled/loading/error/undo/keyboard davranışı |
| `23-ACCESSIBILITY-I18N` | TR/EN katalog kapsamı, aria/odak, reduced motion ve klavye testleri |
| `24-LOCAL-AI-ARCHITECTURE` | Provider interface, AI kaynak yönetimi, core isolation, lifecycle |
| `25-OLLAMA-MODEL-MANAGER` | Algılama, donanım profili, öneri ölçütü, indirme, model benchmark |
| `26-AGENT-TOOL-CONTRACTS` | Sınırlı V1 araçlarının JSON/TS şemaları ve yan etki sınırları |
| `27-AGENT-POLICY-OBSERVABILITY` | Risk/onay matrisi, red, tool timeline, audit ve run_id/step_id |
| `28-VOICE-STT` | Kullanıcı tetiklemeli kayıt, permission, geçici ses, edit/approve transcript |
| `29-VOICE-TTS` | EMA Lightning paketleme, sidecar, CPU/GPU, playback/stop/failure |
| `30-SECURITY-PRIVACY` | Electron güvenlik matrisi, dış kaynak politikası, log redaction, import threat model |
| `31-PERFORMANCE-BENCHMARKS` | Ölçüm fixture'ları, eşikler, cold/warm startup, P95, UI/DB/LLM/voice profilleri |
| `32-ERROR-RECOVERY` | Hata kodları, retry/backoff, repair, bozuk workspace ve sidecar çökmesi |
| `33-TEST-STRATEGY` | `REQ-*` → `TEST-*` ve `AC-*` matrisi; unit/integration/E2E/chaos |
| `34-CI-CD-DISTRIBUTION` | Windows clean install, release, imza, güncelleme ve kaynak doğrulama |
| `35-IMPLEMENTATION-PLAYBOOK` | P0/P1 bağımlılık sırası, iş paketleri, çalıştırılabilir tamamlanma kapıları |

## 13. Gereksinim değişiklik yönetimi

1. Yeni gereksinim ortaya çıktığında önce **ürün değeri, V1 kapsamı, öncelik ve bağımlılığı** değerlendirilir.
2. Uygunsa sonraki boş `REQ-*` ID ile eklenir; eski ID'lerin anlamı sessizce değiştirilmez.
3. Değişen gereksinim önce etkilenen yetkili teknik dokümanlarla, sonra test/kabul matrisiyle eşleştirilir.
4. Bir P0/P1 gereksinimi V1'den çıkarılacaksa gerekçe, kullanıcı etkisi ve açık ürün onayı gerekir.
5. 'Agent yaptı' veya 'çalışıyor gibi' ifadesi kanıt kabul edilmez; test çıktısı, ekran, log veya paket doğrulaması gerekir.
6. Performans optimizasyonu core doğruluğunu veya gizlilik ilkesini bozuyorsa optimizasyon reddedilir.
7. Belgedeki önerilen ürün kararları (`SCOPE-*`) onaylanmadan kullanıcıya kesin ve değişmez seçimler gibi sunulmamalıdır.

### 13.1 'Yapıldı' durumunu kanıtlayan standart kayıt

Her `REQ-*` için uygulama aşamasında en az şu alanlar tutulur:

```yaml
requirement_id: REQ-025
implementation_status: implemented   # planned | in_progress | implemented | verified
owner_package: packages/core
source_paths:
  - packages/core/src/tasks/...
verification:
  tests:
    - TEST-XXXX
  last_ci_run: "<run-id>"
  evidence: "<local-report-path-or-build-artifact>"
open_issues: []
```

Bu bir **kanıt kayıt biçimi örneğidir**, uygulama SQLite tablo şeması veya GitHub workflow kontratı değildir. Kesin denetim yöntemi `DOC-04`, `DOC-33`, `DOC-35`'te tanımlanır.

## 14. Bu belgenin Definition of Done

### 14.1 İçerik bütünlüğü

- [x] V1'in hedef kullanıcı ve temel problemi `DOC-01` ile uyumlu.
- [x] `SCOPE-01–08` açık ürün tercihleri kaydedildi.
- [x] `REQ-001–140` benzersiz kimlikle tanımlandı.
- [x] AI/voice opsiyonelliği, kurulum skip/resume ve provider-failure için ayrı gereksinimler tanımlandı.
- [x] CRUD, arama, export/import, backup, Git, agent, STT, TTS ve masaüstü dağıtımı kapsandı.
- [x] En az bir edge-case ve kabul akışı olmayan büyük modül bırakılmadı.
- [x] Teknik sözleşme yetki alanları ilgili belgelere devredildi.
- [x] Kullanıcı işleri, gereksinimler ve kabul senaryoları ilişkilendirildi.

### 14.2 Onay / doğrulama için bekleyenler

- [ ] Ürün sahibi `SCOPE-01–08` kararlarını inceleyip onayladı.
- [ ] `DOC-03` adım adım yolları ve `DOC-04` kalite kapıları bu gereksinimlerle eşleştirildi.
- [ ] `DOC-08–12`, `DOC-13–19`, `DOC-24–30` detayları ürün davranışıyla çelişmeyecek biçimde yazıldı.
- [ ] `DOC-33` gerçek `TEST-*` izlenebilirlik matrisini sağladı.
- [ ] `DOC-31` performans hedeflerinin cihaz ve veri seti tanımlarını tamamladı.

**Durum sonucu:** Metin içerik olarak hazır bir `draft`tır; bu maddeler tamamlanmadan `approved` veya 'ürün kodlamaya hazır' olarak işaretlenmez.

## 15. Sonraki belge ve kullanım talimatı

Sıradaki doküman: **[`03-USER-JOURNEYS.md`](./03-USER-JOURNEYS.md)**.

Orada en az `AC-001–018` senaryoları için adım adım ekran/etkileşim, alternatif yol, empty/loading/error/confirmation davranışı, giriş/çıkış koşulları ve kullanıcı yolculuğu ölçümleri hazırlanacaktır.

**Kodlama ajanına kısa kural:** Bu dosyayı ürün gereksinimi envanteri olarak oku. Özellik kodlamadan önce ilgili `REQ-*` kimliğini, yetkili teknik belgesini ve kabul testini bul. Henüz yazılmamış şema, IPC, tool veya tema değeri için uydurma sözleşme oluşturma. Model veya ek özellik bulunmasa da çekirdek kullanımın çalışması esastır.

---

## Değişiklik geçmişi

| Sürüm | Tarih | Değişiklik |
|---|---|---|
| 0.1.0 | 2026-10-10 | İlk V1 kapsam taslağı; 140 kalıcı gereksinim, 18 kabul senaryosu, 8 ürün kapsam kararı, NFR ve doküman devri. |
