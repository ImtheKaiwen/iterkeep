---
document_id: DOC-01
title: "Iterkeep — Ürün Vizyonu ve Değer Sözleşmesi"
version: "0.1.0"
status: "draft"
last_updated: "2026-10-10"
language: "tr-TR"
owner: "Product"
depends_on:
  - "DOC-00"
---

# Iterkeep — Ürün Vizyonu ve Değer Sözleşmesi

> **Bu belgenin amacı:** Iterkeep'in *neden var olduğunu*, *kimler için tasarlandığını*, *hangi işi en iyi biçimde yapacağını* ve *başarılı ürün deneyiminin nasıl görüneceğini* kodlama başlamadan kesin biçimde anlatmak.
>
> **Yetki sınırı:** Bu belge ürün yönünü ve değer vaatlerini belirler. Ayrıntılı V1 özellik/istisna gereksinimleri `DOC-02`, adım adım kullanıcı akışları `DOC-03`, ölçülebilir yayın kapıları `DOC-04`, teknoloji/SQL/IPC/tool sözleşmeleri ise ilgili teknik belgeler tarafından tanımlanır. Burada geçen ekran, tablo veya model adları teknik sözleşmenin yerine geçmez.
>
> **Durum:** `draft`. Kullanıcı onayı ve `DOC-02–04` ile tutarlılık denetiminden sonra `reviewed`/`approved` aşamasına alınır. `00-README.md` içinde sabitlenen temel kararları değiştirmez.

## 1. Yönetici özeti

**Iterkeep**, bir insanın aynı anda yürüttüğü veya zaman zaman ara verdiği projeler hakkında **bağlamı kaybetmeden çalışma** ihtiyacını çözen; hızlı, yerel, çevrimdışı, kişisel masaüstü çalışma alanıdır.

Kullanıcı uygulamayı açtığında aşağıdaki dört soruya kısa sürede cevap bulabilmelidir:

1. **Ne yapıyordum?** — Projenin son durumu ve yakın zamanda yapılan işler.
2. **Nerede kalmıştım?** — Yarım kalan görev, son not ve ilerlemek için gerekli bağlantılar.
3. **Bu kararı neden almıştım?** — Tarihli karar, gerekçe, alternatifler ve varsa onu değiştiren yeni karar.
4. **Şimdi ne yapmalıyım?** — Açık görevler, öncelikler ve seçilebilecek sıradaki küçük adım.

Ürünün birincil deneyimi, bunlara **internetsiz, hesapsız ve herhangi bir AI modeli indirmeden** yanıt verebilmesidir. Yerel agent, sesli giriş ve sesli geri bildirim kullanıcı isteğiyle devreye giren üretkenlik hızlandırıcılarıdır; sistemin çalışması için ön koşul değildir.

### 1.1 Tek cümlelik ürün sözü

> **"Projeye geri döndüğünde kaldığın yeri yeniden aramak zorunda kalma."**

### 1.2 Dört ürün vaadi

| Vaat kodu | Kullanıcıya verilen söz | Üründe gözlemlenebilir karşılık |
|---|---|---|
| PV-01 — Bağlamı koru | Aradan zaman geçse bile projeyi anlayabilirim. | Son çalışma, açık işler, önemli kararlar ve notlar birbirine bağlanır. |
| PV-02 — Sürtünmeyi azalt | Bir fikri/görevi kaydetmek zahmetli değildir. | Hızlı ekleme, klavye akışı, yalın formlar, isteğe bağlı ses girişi. |
| PV-03 — Kontrol bende | Verilerime erişim ve çalışma biçimi bana aittir. | SQLite yerelde, taşınabilir dışa aktarım, yedek, yerel model, açık onaylar. |
| PV-04 — Yardımcı ol, bağımlı kılma | AI zaman kazandırır ama yokken işlerim durmaz. | Agent/voice modülleri bağımsız; açık/kapalı durumlar anında anlaşılır. |

Bu vaatleri daha sonraki belgelerde teste çevirmeden ürünün tamamlandığı kabul edilmez.

## 2. Çözdüğümüz problem

### 2.1 Problemin kökeni

Gerçek hayatta proje planı, görevler, günlük çalışma kaydı ve teknik kararlar çoğunlukla farklı yüzeylere dağılır: defter, not uygulaması, rastgele Markdown dosyaları, terminal çıktısı, mesajlar veya kişinin hafızası. Her araç tek başına yararlı olsa da **tek bir projenin karar ve ilerleme hikâyesini** görmek güçleşir.

Bağlam kopması özellikle şu durumlarda maliyetlidir:

- Birden fazla projeye gün içinde gidip gelme.
- Okul, iş veya kişisel yükler yüzünden projeye haftalarca ara verme.
- Bir teknik kararı gerekçesini unuttuktan sonra tekrar tartışma veya yanlışlıkla tersine çevirme.
- Yapılmış bir işi tamamlanmamış sanma; aynı görevi yeniden açma.
- Toplantıdan veya düşünme anından sonra akla gelen fikri uygun bir yere yazamama.
- Notları bulunsa bile **hangi notun sıradaki eyleme dönüştüğünü** görememe.

### 2.2 Mevcut yaklaşımlardaki boşluklar

Bunlar pazar genelindeki kavramsal trade-off'lardır; belirli bir rakip hakkında güncel/kanıtlanmış iddia değildir.

| Yaklaşım | Tipik güçlü yanı | Bu ürünün çözmek istediği eksik |
|---|---|---|
| Yalnızca düz metin dosyaları | Açıklık, taşınabilirlik ve kontrol | Görev/karar ilişkileri, ortak görünüm ve tutarlı arama elle yönetilir. |
| Basit yapılacaklar listesi | Görev ekleme ve tamamlama kolay | Karar gerekçesi, çalışma geçmişi, proje bağlamı çoğu zaman ikinci plandadır. |
| Ağır proje yönetim platformu | Ekip, süreç ve raporlama yetenekleri | Tek kişinin günlük kullanımında gereksiz kurulum, kavramsal yük veya çevrimiçi bağımlılık olabilir. |
| Genel amaçlı not defteri | Serbest yazma alanı | 'Nerede kalmıştım?' sorusuna sistematik bir cevap her zaman vermez. |
| Saf AI sohbeti | Doğal dille özetleme/yönlendirme | Model olmadan iş akışı, denetlenebilir kalıcı durum ve deterministik görev işlemleri sağlanmayabilir. |

**Konumlandırma:** Iterkeep; not defteri kadar hızlı giriş, görev yöneticisi kadar takip, karar günlüğü kadar açıklanabilir geçmiş ve isteğe bağlı agent kadar kolay komut kullanımı sağlayan **bireysel proje hafızası** ürünüdür.

### 2.3 Kök problem ile semptomu ayırma

Kullanıcının asıl ihtiyacı 'daha fazla görev listesi' değildir. Asıl ihtiyaç, **düşünce → karar → iş → sonuç** zincirinin kaybolmamasıdır.

- *Semptom:* "Hangi görevde kalmıştım?" → *Kök ihtiyaç:* Güncel ve güvenilir proje durumu.
- *Semptom:* "Neden bu kütüphaneyi seçmiştim?" → *Kök ihtiyaç:* Gerekçeli karar geçmişi.
- *Semptom:* "Bunu bir yere yazmam lazım" → *Kök ihtiyaç:* Düşük sürtünmeli yakalama.
- *Semptom:* "Notu nereye koymuştum?" → *Kök ihtiyaç:* Birleşik, hızlı arama.
- *Semptom:* "AI görev eklesin" → *Kök ihtiyaç:* Doğru ve geri alınabilir işlemin daha az adımla yapılması.

## 3. Ürün misyonu, vizyonu ve stratejik duruş

### 3.1 Misyon

Bireyin projeleri üzerinde düşünürken, üretirken ve ara verip geri dönerken **bağlam kaybını azaltmak**, hızlı kayıt ve güvenilir geri çağırmayla çalışmasını kolaylaştırmak.

### 3.2 Vizyon

Kullanıcının bilgisayarında yaşayan; bilgiyi sahiplenmediği, abonelik/hesap gerektirmediği, talep edilmedikçe dış sistemlerle konuşmadığı; aynı zamanda çağdaş bir masaüstü uygulaması gibi akıcı ve özenli hissettiren **kişisel proje hafızası**.

### 3.3 Stratejik odak sırası

İkisi çatıştığında üst sıradaki ilke korunur:

1. **Veri güvenilirliği ve kullanıcı kontrolü.** Kaybolmayan, yanlış değiştirilmeyen veri; açık izinler.
2. **Birincil işin hızla tamamlanması.** Projeyi bulmak, kayıt eklemek, kaldığı yeri anlamak.
3. **Karmaşıklığı azaltan iyi tasarım.** Az tıklama, açık bilgi hiyerarşisi, erişilebilir etkileşim.
4. **İsteğe bağlı otomasyon.** Yerel AI ve ses; faydası maliyetini geçtiğinde etkin.
5. **Genişletilebilirlik ve çoklu platform.** Çekirdeği bozmadan yeni entegrasyonlara olanak.

**Anti-hedef:** AI vitrini, görsel animasyon veya yeni teknoloji kullanmak uğruna birinci ve ikinci sıradaki amaçları riske atmak.

### 3.4 Ürünü tanımlayan ana döngü

```text
Bir fikir / gelişme oluşur
          ↓
    Hızlıca kaydedilir
          ↓
Proje, görev veya kararla ilişkilendirilir
          ↓
İş ilerler; durum ve günlük güncellenir
          ↓
    Ara verilir / başka işe geçilir
          ↓
Proje yeniden açılır → Bağlam birkaç adımda bulunur
          ↺
```

Bu döngünün her halkası **manuel ve çevrimdışı** işletilebilir olmalıdır. Ses/AI bu döngünün alternatif giriş yollarıdır.

## 4. Hedef kitle ve kullanıcı arketipleri

### 4.1 Birincil kullanıcılar

| Arketip | Bağlam | En değerli iş | Başarısızlık işareti |
|---|---|---|---|
| Solo geliştirici | Aynı anda birkaç yazılım projesi | Son teknik kararı ve açık işi hemen bulmak | Proje kodunu incelemeden nerede kaldığını anlayamamak |
| Üniversite öğrencisi / araştırmacı | Ders, bitirme projesi ve bireysel çalışma | Notları, görevleri ve kararları tek projede düzenlemek | Dağınık dosyalardan 'sırada ne var' cevabı çıkaramamak |
| Teknik üretici / bağımsız çalışan | Müşteri ve yan proje arasında geçiş | Bir projeyi güvenilir biçimde durdurup sonra devam ettirmek | Son görüşme/aksiyonun kaybolması |
| Kişisel proje yöneten kişi | Yazılım bilmek zorunda değil | Karmaşık kurulum olmadan liste ve günlük tutmak | Temel kullanım için terminal veya model kurulumu gerekmesi |

### 4.2 Ortak kullanıcı özellikleri

- Her gün düzenli kullanabilecekleri kadar az sürtünme isterler.
- Kısa ama sık yapılan kayıtlar, çok uzun proje tanımlarından daha yaygındır.
- İnternet yokken de işlerinin sürmesini beklerler.
- Bazıları Markdown/Git bilir; bazıları bilmez. **Ürün hiçbirini zorunlu kullanıcı becerisi saymaz.**
- Ses tanıma ve AI'yı denemek isteyebilirler, ancak kaynak tüketimine/özel veriye karşı hassastırlar.

### 4.3 V1'de hedeflenmeyen kullanıcı senaryoları

- Ekip izinleri, rol tabanlı ortak çalışma ve çoklu kullanıcı yetkilendirmesi gereken kuruluşlar.
- Eşzamanlı çok cihazlı, anlık bulut senkronizasyonu bekleyen kullanıcılar.
- Kurumsal iş akışı motoru, kaynak tahsisi, faturalandırma veya gelişmiş Gantt planlaması bekleyen ekipler.
- Takvim, e-posta, web tarayıcısı ve tüm işletim sistemini kendiliğinden yönetmesi beklenen otonom ajan kullanıcıları.

Bu ihtiyaçlar meşru olabilir; ancak Iterkeep V1 ürün sözünün kapsamı dışındadır.

## 5. Kullanıcı işleri (Jobs to Be Done)

Aşağıdaki işlerin sonradan `DOC-02` gereksinimlerine ve `DOC-03` kullanım akışlarına dönüştürülmesi zorunludur. Buradaki `JTBD-*` kimlikleri ürün sonucunu belirtir, API veya ekran sözleşmesi değildir.

| İş kimliği | Durum / tetikleyici | Kullanıcının beklediği ilerleme | Algılanan başarı |
|---|---|---|---|
| JTBD-01 | Yeni bir fikir veya proje başladı | Projeyi hızlıca başlatabilmek | Nereden başlayacağını bilen, boş olmayan bir çalışma alanı |
| JTBD-02 | Bir işi hatırlaması gerekiyor | Görev/not/günlük olarak hızlı kayıt | Düşünce kaybolmadan kalıcı kayıt |
| JTBD-03 | Ara verip projeye döndü | Durumu ve sıradaki adımı anlayabilmek | Önceki çalışmayı araştırmadan işe başlama |
| JTBD-04 | Neden bir karar alındığını unuttu | Gerekçeye, tarihe ve alternatiflere ulaşma | Eski kararı yeniden keşfetmeye gerek kalmaması |
| JTBD-05 | Çok fazla kayıt oluştu | İlgili görev/not/kararı bulmak | Doğru kaynağa hızlı ulaşma |
| JTBD-06 | Düzenli kontrol yapmak istiyor | Açık/tamamlanan işleri ve ilerlemeyi görmek | İlerlemeyi gerçeğe uygun değerlendirme |
| JTBD-07 | Yazı yazmak istemiyor veya yazamıyor | Tek eylemle ses kaydetmek ve metne dönüştürmek | Kontrol edilmiş transkripti istediği yere ekleme |
| JTBD-08 | Doğal dille bir işlem yapmak istiyor | İsteğe bağlı agent'a görevi devretmek | Ne değiştiğini görme, gerekirse onay/iptal |
| JTBD-09 | Uygulama/servis değiştiriyor | Kendi verisini standart biçimde alabilmek | Okunabilir ve yeniden içe alınabilir veri |
| JTBD-10 | Modeller kurulu değil veya bozuldu | Temel kullanımın kesilmemesi | AI olmadan güvenle devam etme |
| JTBD-11 | Yeni cihazda/kurulumda başlıyor | Kurulum seçeneklerini anlayarak ilerleme | Gereksiz indirme olmadan çalışır ürün |
| JTBD-12 | Veri kaybından endişe ediyor | Yedekleme ve kurtarma sürecini görebilmek | Doğrulanabilir geri yükleme yolu |

## 6. Ana ürün deneyimi

### 6.1 İlk açılışta hissedilmesi gerekenler

- Sihirbaz kısa, adım adım ve geri dönülebilirdir.
- Yerel veri konumu anlaşılır; varsayılan yol önerebilir ama kullanıcı konumu görebilir/değiştirebilir.
- Ollama/model/Whisper/TTS kurulumlarının **isteğe bağlı** olduğu saklanmaz.
- Uygulama, kuruluma başlamadan önce olası indirme ve kaynak gereksinimini açıklar.
- AI'yı atlayan kişi engellenmeden ilk projesine geçer.
- Daha sonra Ayarlar üzerinden yalnızca istediği modülü kurabilir veya kaldırabilir.
- Yerel dosyalar kullanıcı izni olmadan uzak sunucuya gönderilmez.

İlk açılış davranışlarının durum makinesi ve teknik ayrıntısı `DOC-18`/`DOC-19` tarafından tanımlanır.

### 6.2 Günlük kullanımın minimum ritmi

Kullanıcı uygulamayı açar; **son açılan proje**, öne çıkan açık işler, son çalışma kaydı ve önemli kararları kolayca bulur. İsterse başka projeye geçer, hızlı giriş alanına yazar, görevi tamamlar veya yeni bir karar ekler. Bu akışın hiçbir noktasında AI sorusu cevaplamayı beklemek zorunda kalmaz.

**Temel etkileşim ilkesi:** 'Bir şey yazıp kaydetmek' ile 'kayıt için önce karmaşık kategori seçmek' arasında çatışma varsa hızlı kaydı tercih et; kullanıcıya sonradan düzenleme olanağı ver.

### 6.3 Projeye dönüş: ürünün belirleyici anı

Bir proje haftalar sonra açıldığında gösterilebilen ana bağlam unsurları:

1. Projenin adı, açıklaması, mevcut durumu.
2. Son çalışılan tarih ve en yakın çalışma kayıtları.
3. Devam eden veya sıradaki açık görevler.
4. Önemli/son kararlar ve bunların gerekçeleri.
5. Bağlantılı notlar, varsa engeller ve ilgili referanslar.

**Ürün kararı:** Başlangıç bağlamı, AI tarafından üretilmiş bir özete bağlı olmamalıdır. Yapılandırılmış verilerden deterministik bir 'Kaldığın Yer' görünümü üretilir; AI açıksa bunu ayrıca açıklayabilir.

### 6.4 Kayıt akışları

| Kayıt türü | Sorduğu soru | Kullanıcı için asgari anlamı |
|---|---|---|
| Görev | *Ne yapacağım?* | Eylem, durum, gerekirse öncelik ve bağlam |
| Not | *Ne öğrendim / neyi unutmamalıyım?* | Serbest metin ve ilgili proje |
| Karar | *Ne seçtim ve neden?* | Karar, gerekçe, alternatifler ve tarih |
| Çalışma günlüğü | *Ne yaptım?* | Zamanla ilişkilendirilmiş kısa ilerleme kaydı |
| Proje | *Bütün bunlar neyin parçası?* | Diğer kayıtları gruplayan kalıcı kimlik ve bağlam |

Arayüz bu türler arasındaki farkı kullanıcıya anlatmalı, fakat her ekleme işleminde uzun bir form zorlamamalıdır.

### 6.5 Arama ve geri çağırma

Arama alanı, proje ve görev adları kadar not, karar ve günlük metinlerini de bulmayı hedefler. Sonuçta kullanıcının **neyi bulduğu kadar hangi projeden ve hangi kayıt türünden geldiği** de anlaşılmalıdır.

Arama bir 'AI cevabı' değildir. Önce güvenilir sonuç listesi gelir; yerel model etkinse bu sonuçlara referans vererek bir özet sunabilir. Türkçe arama davranışları `DOC-15`, performans eşikleri `DOC-31` altında kesinleştirilir.

### 6.6 Klavye, fare ve ses arasında eşdeğerlik

Temel işler fare ile yapılabilmelidir; sık kullanılan işler klavye ile hızlanmalıdır. Ses girişini etkinleştiren kullanıcı aynı işi konuşarak başlatabilmelidir. Ancak ses, yazılı girdinin yerini zorunlu olarak almaz ve erişilebilir alternatifleri kaldırmaz.

## 7. Yapay zekânın üründeki rolü

### 7.1 AI'nın yapacağı işler

AI, kullanıcı izniyle aşağıdaki iş türlerinde yardımcı olabilir:

- Doğal dilde söyleneni uygun görev veya not eylemine dönüştürmek.
- Kullanıcının seçtiği proje kapsamında mevcut bilgiye dayanarak özet vermek.
- İlgili görev/karar/notları araçlarla bulup kaynaklarını göstermek.
- Birden fazla görev oluşturma ya da sınıflandırma gibi işleri **önizleme ve güvenli yetki sınırları içinde** yapmak.
- Ses transkriptini kullanıcının kontrol edeceği bir taslağa dönüştürmek.

### 7.2 AI'nın asla üstlenmeyeceği yetkiler

- Kullanıcı onayı olmadan dış servise not/sohbet/proje içeriği göndermek.
- Güvenlik sınırlarını aşan genel terminal veya keyfî SQL/dosya erişimi.
- Belirsiz bir komutu kritik veri silme/kalıcı toplu işlem olarak yorumlayıp uygulamak.
- Bir işlem gerçekleşmeden gerçekleşmiş gibi göstermek.
- Sahte belge veya gerçekte olmayan görev/karar uydurarak 'proje hafızası' oluşturmak.
- Uygulamanın ana fonksiyonlarını devre dışı bırakarak kullanıcıyı modele bağımlı kılmak.

### 7.3 Kullanıcıya görünür agent davranışı

Bir agent işlemi şu dört soruyu yanıtlayabilmelidir:

- **Ne istedim?** Kullanıcı isteğinin görülebilir kaydı.
- **Ne yapıldı?** Gerçek araç adımları ve durumları.
- **Hangi veri değişti?** Proje/görev/not gibi değişen öğeler, mümkünse önce/sonra farkı.
- **Sorun yaşandı mı?** Hata, iptal ve yeniden deneme imkânı.

Sistem modelin gizli düşünce zincirini göstermek zorunda değildir; denetlenebilir işlevsel olayları göstermelidir. Teknik tool şemaları `DOC-26`, yetki ve izlenebilirlik `DOC-27` kapsamındadır.

### 7.4 AI tercihi ve anlık kullanılabilirlik ayrı tutulur

| Kullanıcı tercihi | Fiilî durum | Ürün deneyimi |
|---|---|---|
| Kapalı | Ollama/model var veya yok | AI başlatılmaz; temel ekranlar çalışır. |
| Açık | Servis hazır ve model uyumlu | Chat ve izin verilen agent eylemleri sunulur. |
| Açık | Ollama kurulu değil | Kurulum önerilir; ana iş akışı bloke edilmez. |
| Açık | Ollama kapalı/erişilemez | Durum net gösterilir, tekrar dene seçeneği sunulur. |
| Açık | Model yok/uygunsuz | Mevcut modeli seç veya önerilen modeli indir seçeneği sunulur. |
| Açık | Model indiriliyor | İlerleme izlenir; kullanıcı uygulamanın diğer bölümlerini kullanır. |
| Açık | Model çalışması başarısız | Geri kazanım seçenekleri sunulur; temel kayıtlar etkilenmez. |

Bu tablo ürün davranışının niyetini belirler; kesin durum adları `DOC-19` ve `DOC-24–25` altında tanımlanacaktır.

### 7.5 Model tavsiye felsefesi

'Otomatik en iyi model' tek bir sabit model adı demek değildir. Öneri mekanizması yüklü modelleri, kullanılabilir RAM/VRAM'i, model boyutunu, cevap süresini ve uygulamanın ihtiyaç duyduğu Türkçe anlama/araç kullanma doğruluğunu dikkate almalıdır. Kullanıcı isterse öneriden farklı bir model seçer.

**Önemli ödünleşim:** Daha güçlü ama cihazı yavaşlatan model, hızlı ve yeterince doğru bir modele göre her zaman daha iyi değildir. Seçim gerekçesi kullanıcıya anlaşılır biçimde gösterilir.

## 8. Sesli kullanımın üründeki rolü

### 8.1 Sesli giriş vaadi

Kullanıcı kayıt düğmesine **bir kez basarak başlatır**, tekrar basarak durdurur. Kayıt, açık izin ve görünür kayıt durumu ile gerçekleşir. Konuşma sonrasında **düzenlenebilir transkript** üretilir; kullanıcı onu görev, not, günlük veya agent mesajı olarak kullanmayı seçer.

- Yanlış transkripsiyon otomatik olarak önemli veriyi değiştirmemelidir.
- Model indirimi, mikrofon yetkisi, CPU/GPU yokluğu gibi durumlar anlaşılır açıklanmalıdır.
- Ses kaydı ve transkriptin saklanma/silinme politikası kullanıcıya görünür olmalıdır.
- Bir STT hatası, mikrofon erişimi reddi veya TTS çökmesi başka ekranları kullanılamaz hâle getirmemelidir.

### 8.2 Sesli yanıt vaadi

Etkinleştirilmiş TTS, uygun yanıtlarda sesli geri bildirim verebilir. Metin yanıtı her zaman asıl erişilebilir çıktı olarak kalır. Ses oynatma kapatılabilir, durdurulabilir; ses servisi sessizce sürekli çalıştırılmaz.

Whisper sağlayıcısı ve modeli `DOC-28`, EMA Lightning sidecar yaşam döngüsü `DOC-29` tarafından belirlenir.

## 9. Bilgi mimarisi ve navigasyon niyeti

Üründe ilk bakışta anlaşılır üç ana kavram öne çıkar:

1. **Çalışma alanı (workspace):** Kullanıcının yerel veri evreni.
2. **Proje:** Görevleri, kararları, notları ve çalışma geçmişini toplayan yapı.
3. **Yardımcı panel:** İsteğe bağlı agent; ana içerikten bağımsız açılıp kapanabilir.

Temel ekran aileleri ürün niyeti düzeyinde aşağıdadır:

| Ekran ailesi | Birincil kullanıcı işi | Ana tasarım ilkesi |
|---|---|---|
| Dashboard / Son çalışma | "Şimdi neye döneceğim?" | Son ve önemli bilgiler öncelikli |
| Proje listesi / detay | "Hangi proje ve ne durumda?" | Hızlı gezinme, minimal karmaşa |
| Görev listesi / görünümü | "Sıradaki eylem ne?" | Düzenlenebilir, filtrelenebilir, net durum |
| Not / karar / günlük | "Ne öğrendim; neden seçtim?" | Yazmaya odaklı, kaynak ve tarih görünür |
| Birleşik arama | "Nerede geçiyordu?" | Sonuç, kaynak, bağlam ve filtre |
| Agent sohbeti | "Bunu benim için yap / açıkla" | Adımlar ve onaylar şeffaf |
| Kurulum / Ayarlar / Sistem Sağlığı | "Ne kurulu; ne çalışıyor?" | Gözlemlenebilir ve onarılabilir durum |

Ekranların birebir rotaları, panel boyutları, modal/drawer tercihleri ve boş/yükleniyor/hata durumları `DOC-21–22` kapsamındadır.

## 10. Tasarım karakteri

### 10.1 İstenen his

- **Sakin:** Bilgi öne çıksın; dekorasyon değil.
- **Hızlı:** Etkileşim anında algılanabilir geri bildirim versin.
- **Öngörülebilir:** Aynı iş aynı kurallarla çalışsın.
- **Dürüst:** Yükleniyor, hata, AI hazır değil gibi durumlar gizlenmesin.
- **Kontrollü:** Kullanıcı veri ve otomasyon üzerinde söz sahibi olsun.
- **Özenli:** Dark/light/system tema, tipografi, boşluk ve mikro-etkileşimler tutarlı olsun.

### 10.2 Görsel yön

Modern, sade, okunaklı, açık-koyu tema destekli; OpenAI'nin arayüzlerinden **genel sadelik ve etkileşim prensipleri bakımından esinlenen**, ancak bağımsız marka kimliği ve özgün bileşenleri olan bir deneyim.

**Yapılmayacaklar:** Mevcut bir ürünün marka/logosunu kopyalamak; aşırı cam efekti, gereksiz animasyon, görsel uğruna düşük kontrast, dar pencere boyutlarında kaybolan kritik kontroller.

Merkezi tema tokenları `DOC-20`, bileşen kontratları `DOC-22`, erişilebilirlik/i18n `DOC-23` altında normatifleşir.

### 10.3 Metin ve dil

- Birincil ürün dili Türkçe; İngilizce desteği mimari ve bileşenlerden itibaren düşünülür.
- Komutlar ve durum mesajları kısa, açıklayıcı ve eylem odaklı olmalıdır.
- "İşlem başarısız" gibi bağlamsız hata yerine **neyin olmadığını ve nasıl düzeltileceğini** söyleyen dil tercih edilir.
- Agent çıktısı tahmin ile kesin olarak yapılmış işlemi açıkça ayırır.

## 11. Yerellik, sahiplik ve veri taşınabilirliği

### 11.1 Veri sahipliği

Kullanıcı verisinin yetkili kopyası yerel SQLite veritabanındadır. Veritabanı bulunmadığında uygulama yeni boş alan oluşturma veya yedekten geri yükleme yollarını anlaşılır biçimde sunmalıdır; mevcut verilerin üstüne sessizce yazılmaz.

- Markdown/YAML içe/dışa aktarımı birinci sınıf ürün yeteneğidir.
- Git entegrasyonu isteğe bağlıdır; canlı SQLite dosyalarını otomatik merge ettirme yaklaşımı kullanılmaz.
- Yedekler, kullanıcının geri dönebileceği tutarlı durumlar yaratmalıdır.
- Veri dışa aktarılırken kimlik ve ilişkilerin korunması hedeflenir; kesin format `DOC-16` içindedir.

### 11.2 Çevrimdışı temel işlevler

İnternet kapalıyken kullanıcı şu işleri yapabilmelidir: uygulamayı açmak, proje/görev/not/karar/günlük oluşturmak ve düzenlemek, yerel aramayı çalıştırmak, kaydedilmiş veriyi görmek, yerel yedek ve dışa aktarım yapmak.

Yerel Ollama/Whisper/TTS kurulmuşsa ağ gerekmeden çalışması beklenir; ancak ilk model indirmeleri ve isteğe bağlı sürüm kontrolleri internet isteyebilir. Harici servis yokluğu temel CRUD'a **asla** bağımlılık oluşturmamalıdır.

### 11.3 Gizlilik beklentisi

- Kullanıcı davranışına dair varsayılan analitik/telemetri gönderimi yoktur.
- Kayıtları, notları veya agent prompt'larını habersiz yükleyen arka plan servisi yoktur.
- Git push, güncelleme ve model indirme kullanıcıya şeffaf davranır.
- Yerel arayüzde kişisel veriler mümkün olan yerlerde gereksiz loglanmaz.
- Eğer gelecekte opt-in telemetri eklenirse bu ayrı bir ürün kararı ve açık rıza gerektirir.

Ayrıntılı uygulama güvenliği `DOC-30` kapsamında tanımlanır.

## 12. Hız ve kalite felsefesi

**Hız sadece milisaniye değildir.** Kullanıcının işi bitirmek için toplam harcadığı süre önemlidir.

İki farklı hız türünü birlikte ele alırız:

- **Teknik hız:** Soğuk/sıcak açılış, sorgu gecikmesi, UI tepkisi, arayüz donmaması, model ve worker kaynak tüketimi.
- **İş akışı hızı:** Bir notu kaydetmek için gerekli adım, projeye döndüğünde bağlamı anlamak için gereken etkileşim, agent onaylarının anlaşılabilirliği.

`DOC-31` teknik benchmark protokolünü ve kesin performans eşiklerini; `DOC-03–04` kullanıcı yolu ve kabul ölçütlerini belirler. Bu belgede rakam icat edilmez; hedefler ölçülebilir olmak zorundadır.

### 12.1 Ana performans kuralı

**İsteğe bağlı servisler kullanıcı arayüzünün açılmasını veya temel CRUD işlemlerini bloke edemez.** Ollama modeli indirme, ses işleme, Git ve güncelleme kontrolleri, bağımsız ve iptal edilebilir iş akışları olarak tasarlanmalıdır.

### 12.2 Hız için vazgeçilmeyecek güvenilirlik

- Hız uğruna veri commit edilmeden 'kalıcı olarak kaydedildi' gösterilmez.
- Önceliği düşük indeksleme/AI işleri temel kullanıcı eylemlerini aç bırakmaz.
- Kullanıcının verisini kaybetme riski yaratan kestirmeler performans optimizasyonu sayılamaz.
- Çok büyük veri setlerinde UI'nın ana thread'i bloklanmamalı; gerekirse sanallaştırma/yükleme parçalama uygulanmalıdır.

## 13. V1 için ürün yetenek seti (vizyon seviyesi)

> Bu liste **özellik sözleşmesi değildir**. Hangi alanların V1 kapsamına girdiği `DOC-00` ile uyumludur; kesin gereksinim listesi, zorunluluk düzeyi ve kabul testleri `DOC-02` ve `DOC-04` tarafından belirlenecektir.

| Ürün alanı | V1'de istenen sonuç | Ön koşul / ilk ilke |
|---|---|---|
| Yerel çalışma alanı | Veriyi nerede tuttuğu anlaşılır, ilk kurulumdan çıkınca kullanılabilir | Model hesabı/kurulumu yok |
| Projeler | Proje listesi, oluşturma, güncelleme, arşivleme/geri bulma | Kalıcı kimlik ve veri bütünlüğü |
| Görevler | Açık, devam eden, tamamlanan işler yönetilir | Deterministik durum değişimleri |
| Notlar | Hızlı yazı ve Markdown içeriği | Yazma deneyimi ilk sırada |
| Kararlar | Karar gerekçesi ve tarihsel bağlam korunur | Geçmiş sessizce kaybolmaz |
| Günlük | Tarihli ilerleme notları kaydedilir | Geri dönmede kaynak olarak görünür |
| Arama | Farklı kayıt türleri birlikte bulunur | Yerel ve AI'dan bağımsız |
| İçe/dışa aktarım | Okunabilir standart biçimler | SQLite ile çift-yazarlı çalışma yok |
| Yedek/kurtarma | Veriye güvenilir geri dönüş yolu | Migration ve hata planı |
| Tema/erişilebilirlik | Dark/light/system ve klavye kullanımı | Merkezi tasarım dili |
| Kurulum/Capability | AI/voice atlama, sonra açma ve durum görme | Hata dayanıklılığı |
| Ollama/agent | Yerel modeli seçme, araçlı yardım, eylem geçmişi | Kullanıcı izni ve kontrol |
| Ses | Bas/durdur STT, düzeltilebilir transkript, isteğe bağlı TTS | Model ve mikrofon opsiyonel |
| Windows dağıtımı | Temiz cihazda kurulum, çalıştırma, kaldırma | Test edilmiş imzalama/güncelleme politikası |

### 13.1 Git ve CLI konumlandırması

Git, metin dışa aktarımlarını sürümleme/taşıma açısından değerli **isteğe bağlı** bir entegrasyondur; kullanıcıyı Git öğrenmeye zorlamayız. Uygulama çekirdeği ileride bir CLI tarafından da kullanılabilir olmalıdır. **Genel kullanıma açık, tam kapsamlı bağımsız CLI komut ailesinin V1 için zorunlu olduğu bu belgeyle varsayılmaz**; kesin karar `DOC-02`'de verilir. Hızlı kayıt ihtiyacı V1'de öncelikle UI ve klavye akışıyla karşılanır.

## 14. Ürün dışı sınırlar ve bilinçli feragatler

V1 aşağıdakilere dönüşmeyecek:

1. Tam kapsamlı ekip proje yönetimi/issue tracking platformu.
2. Zorunlu bulut hesabı veya veriyi kendi sunucusunda tutan SaaS.
3. Her web sitesini veya yerel uygulamayı otomatik kontrol eden genel amaçlı bilgisayar agent'ı.
4. Kod çalıştıran, internetten keyfî bilgi toplayan, geniş işletim sistemi yetkileri isteyen sınırsız ajan.
5. Sürekli mikrofon dinleyen ortam asistanı.
6. Faturalandırma, CRM, şirket içi rol/yetki veya gerçek zamanlı ortak çalışma çözümü.
7. Her türlü Markdown eklentisini birebir taklit eden tam bir bilgi yönetim ekosistemi.
8. Kullanıcıyı yüksek donanım veya büyük AI indirmelerine zorlayan paket.

**Farklılaştırma kararı:** Bir özelliği eklemenin temel proje hafızası döngüsünü iyileştirmediği durumlarda V1 kapsamına alınması için ayrıca güçlü kanıt gerekir.

## 15. Ürün ilkelerini karar verme testine dönüştürme

Yeni bir özellik önerildiğinde ürün sahibi/geliştirici ajan aşağıdaki soruları cevaplamalıdır:

| Soru | Kabul edilen yanıt yönü |
|---|---|
| Hangi `JTBD-*`'yi iyileştiriyor? | En az bir açık kullanıcı işi ve somut çıktı. |
| AI kapalıyken davranış ne? | Temel iş akışı kesintisiz çalışmalı. |
| Offline davranış ne? | Yerel çekirdek gerekli işi yapabilmeli. |
| Verinin yetkili kaynağı neresi? | SQLite; import/export ayrı mekanizma. |
| Hata ve iptalde kullanıcı ne görür? | Gerçek durum, tekrar deneme veya güvenli geri dönüş. |
| Kullanıcının kaç adımını azaltıyor? | Kullanım yolu ölçülebilir biçimde açıklanmış. |
| Performans bedeli ne? | Referans benchmark veya gerekçeli bütçe. |
| Erişilebilir, çevrilebilir ve temalanabilir mi? | UI bileşenleri ortak sözleşmeye uygun. |
| Yeni izin/ağ/veri gönderimi gerekiyor mu? | Açık kullanıcı bilgilendirmesi ve onayı. |
| Sadeleştirilebilir veya ertelenebilir mi? | Daha basit aynı değeri sağlıyorsa basit olan seçilir. |

Bu kontrol listesi mimari ve özellik belgelerinde bilinçli karar üretmek içindir; çalışma zamanında gerçek zamanlı bir algoritma değildir.

## 16. Rekabet avantajı ve ürünün savunulabilir karakteri

Iterkeep'in avantajı 'AI içermesi' değildir; tek başına bir sohbet kutusu ayırt edici ürün değeri yaratmaz.

Savunulabilir kombinasyon şudur:

- **Hızlı, düzenli, güvenilir proje hafızası** üzerine kurulu ürün döngüsü.
- **Deterministik görev ve kayıt işlemleri:** Agent'ın yaptıkları normal UI işlemleriyle aynı kurallardan geçer.
- **Denetlenebilir otomasyon:** Araç adımı, etki, onay ve sonuç görünür.
- **Yerel denetim ve taşınabilirlik:** Hesap kilidi/format bağımlılığına ihtiyaç bırakmaz.
- **Hafif çekirdek, isteğe bağlı ağır modeller:** Yalnızca ihtiyacı olan kullanıcı ek bileşenleri kurar.
- **Tutarlı ve özenli masaüstü deneyimi:** Teknik olmayan bir kullanıcı için de anlaşılır.

Bu konumlandırma, pazara çıktıktan sonra gerçek kullanıcı görüşmeleriyle doğrulanmalıdır; rakiplere kıyasla üstünlük henüz ölçülmüş bir bulgu değildir.

## 17. Başarı ölçümü ve kanıt toplama

### 17.1 Ana ürün göstergesi (North Star)

**Başarılı projeye dönüş oranı:** Kullanıcının belirli bir süre ara verdiği projeyi yeniden açtıktan sonra, temel bağlamı edinip anlamlı bir sonraki eylemi gerçekleştirebildiği oturumların oranı.

Bu kavramı gözlemek için gerçek kullanıcı testi gerekir; yalnızca 'proje ekranı açıldı' sinyali başarı kanıtı değildir.

Önerilen tanım:

```text
Başarılı dönüş oturumu =
  En az X gün ara verilmiş proje yeniden açılır;
  kullanıcı o projenin önceki durumunu anlayabildiğini doğrular;
  ve belirlenen test senaryosundaki sonraki adımı doğru seçer.

Dönüş başarı oranı =
  Başarılı dönüş oturumu sayısı / Geçerli dönüş testi oturumu sayısı
```

**X ve kabul eşiği** ürün test planında sabitlenir; geliştirme sırasında rastgele değiştirilmez. Bu ölçüm ilk aşamada moderasyonlu/yerel kullanıcı testiyle yapılır; varsayılan uzaktan davranış takibi eklenmez.

### 17.2 Yardımcı ölçüler

| Ölçüm alanı | Ölçülebilir çıktı | Ölçme yolu |
|---|---|---|
| İlk değer anı | Yeni kullanıcı ilk projesini ve ilk kaydını tamamladı mı? | Görev tabanlı kullanım testi |
| Kayıt sürtünmesi | Kullanıcının kısa bir görevi/notu oluşturma süresi ve eylem sayısı | Önceden belirlenmiş senaryolar |
| Bağlam bulma | Son çalışma ve önemli karar gerekçesine ulaşma süresi | Kullanıcı testi |
| Arama doğruluğu | Bilinen kayıtların doğru ve anlaşılır biçimde bulunması | Sabit fixture seti |
| Yapılabilirlik | Temel işlerin AI/voice/offline modda tamamlanması | E2E test matrisi |
| Güvenilirlik | Çökme, hata ve migration sonrası veri tutarlılığı | Entegrasyon / hata enjeksiyonu |
| Teknik akıcılık | Açılış, sorgu, UI yanıtı, yüksek veri hacmi | `DOC-31` benchmark |
| Agent doğruluğu | Yanlış hedef üzerinde işlem yapmama; doğru parametre/sonuç | Sabit tool test seti ve kullanıcı denemeleri |
| Model kurulum netliği | AI atlama, sonra etkinleştirme ve onarım başarı oranı | Kurulum UX testi |
| Veri taşınabilirliği | Export → import sonrası anlamlı verinin korunması | Round-trip testleri |

### 17.3 Veri toplama etiği

- Varsayılan üretim kurulumu uzaktan kullanım analitiği göndermez.
- Ürün metrikleri önce yerel benchmark, test laboratuvarı ve gönüllü araştırma yoluyla değerlendirilir.
- Kullanıcıya ait gerçek proje içerikleri genel test fixture'larına konmaz.
- Gelecekte anonim/opt-in tanılama tasarlanırsa veri türleri ve saklama politikası ayrı onaylanır.

### 17.4 Lansman kararını ne belirler?

Bir arayüzün tamamlanmış görünmesi yeterli değildir. Lansman kararı, en azından temel kullanıcı görevlerinin E2E çalışmasına, veri kurtarma testlerine, AI kapalı senaryolara, kurulum başarısına, referans donanımda performans sonuçlarına ve kritik güvenlik bulgularının çözülmesine dayanır. Kesin kapılar `DOC-04`'e aittir.

## 18. Temel kullanıcı hikâyeleri — ürün düzeyinde örnekler

> Hikâyeler birer örnektir, uygulamadaki gerçek ID/veri/ekran sözleşmesini belirlemez. `DOC-02` ve `DOC-03` tarafından gereksinim/kabul senaryolarına dönüştürülür.

### HİKÂYE A — Üç hafta sonra projeye dönüş

Kullanıcı üç hafta önce ara verdiği 'Ses Modeli' projesini açar. Son çalışmada neyi denediğini, hangi hatanın kaldığını ve bir sonraki görevi görür. Karar günlüğünden belirli bir modelin neden tercih edildiğini bulur. **AI hiç kurulu olmasa bile** sonraki adımı anlayabilir.

**Başarı işareti:** Projeyi yeniden incelemek için dış kaynaklara veya kişinin hafızasına muhtaç olmama.

### HİKÂYE B — Bir fikri hızla yakalama

Kullanıcı çalışırken 'agent'a iptal butonu ekle' fikri aklına gelir. Kısayolla hızlı giriş açar ve kaydeder. Sonradan ilgili projede görevi düzenler. İlgisiz bir model indirme veya ayar ekranı onu durdurmaz.

**Başarı işareti:** Düşünce kaybolmadan doğru bağlamda kalıcı hâle gelir.

### HİKÂYE C — Karar gerekçesini bulma

Kullanıcı daha önce neden SQLite seçtiğini hatırlamaz. Arama ile gerekçeli karara, değerlendirilmiş alternatife ve kararı değiştiren kayıt varsa o bağlantıya ulaşır.

**Başarı işareti:** Yapılan seçim tek cümlelik bir etiket değil, yeniden okunabilir akıl yürütme bağlamıdır.

### HİKÂYE D — Agent ile güvenli eylem

Kullanıcı 'Bu projeye yarın test yazma görevi ekle' der. Agent mevcut projeyi tanımlar, uygun araç çağrısını üretir, uygulama parametreyi doğrular, görev oluşur. Sohbet ekranında gerçek işlem görünür. Agent yanlış projeyi seçerse kullanıcı sonucu fark edebilir ve düzeltebilir.

**Başarı işareti:** Doğal dil kolaylık sağlar; denetlenebilirlikten vazgeçilmez.

### HİKÂYE E — Sesli giriş, yanlış kelime

Kullanıcı düğmeye basar, konuşur, durdurur. Transkript bir teknik terimi yanlış yazar. Kullanıcı önizlemede düzeltir ve göreve dönüştürür. **Yanlış transkript otomatik olarak kalıcı eylem yapmaz.**

**Başarı işareti:** Ses kolaylığı güvenilir veri kontrolüyle birlikte gelir.

### HİKÂYE F — Kurulumda AI'yı atlama, sonradan açma

Kullanıcı ilk gün AI'yı atlar; bir hafta normal çalışır. Ayarlardan AI'yı açar, Ollama'nın kurulu olduğunu uygulama algılar, yüklü modelleri listeler, uyumlu modeli önerir. Model yoksa izinli indirme akışı sunar. Kullanıcı yapay zekâ kurulurken mevcut projeleriyle çalışmayı sürdürür.

**Başarı işareti:** Kurulum tercihi kalıcı kilit değildir.

### HİKÂYE G — Veriyi başka yere taşıma

Kullanıcı Markdown/YAML dışa aktarır, proje klasörlerini inceler, isterse Git ile sürümler. Yeni çalışma alanında bunları içe almak istediğinde çakışmalar için önizleme görür; veri sessizce kaybolmaz.

**Başarı işareti:** Uygulamaya bağımlı olmadan verileri anlamlandırabilme.

## 19. Ürün kararlarına ilişkin zor trade-off'lar

| Karşıt hedefler | Iterkeep V1 tercihi | Gerekçe |
|---|---|---|
| Dosya tabanlı sadelik vs zengin ve hızlı sorgu | SQLite canonical; Markdown import/export | Tek yazma kaynağı + taşınabilirlik |
| Başlangıç hızı vs modelin hazır beklemesi | Ana UI önce; AI isteğe bağlı/lazy | Çekirdek kullanım gecikmez |
| Sıfır kurulum vs güçlü yerel AI | Modüler ilk kurulum; AI atlanabilir | Basit kullanıcı dışlanmaz |
| Agent özerkliği vs veri güvenliği | Kısıtlı tool'lar ve riskli işlerde onay | Yanlış eylemin maliyeti yüksek |
| Tek tıkla kayıt vs çok ayrıntılı metadata | Basit varsayılan, sonra zenginleştirme | İlk kullanım yükünü düşürür |
| 'Her şey tek ekranda' vs bilgi yoğunluğu | Açık hiyerarşi, isteğe bağlı paneller | Odak ve erişilebilirlik |
| Her platforma aynı anda çıkmak vs güvenilir dağıtım | Windows öncelikli, taşınabilir mimari | Test edilebilir ilk yayın |
| Sürekli veri toplama vs gizlilik | Varsayılan telemetri yok | Kullanıcının verisi kendisine ait |
| Büyük özellik listesi vs temel döngünün kalitesi | Önce proje hafızası akışı | Ürün değeri özellik sayısından önemli |

## 20. Bilinen ürün riskleri ve hipotezler

| Risk kimliği | Risk / doğrulanması gereken hipotez | Nasıl sınanacak? | Plan sahibi |
|---|---|---|---|
| RISK-P01 | Kullanıcı not, karar ve günlüğü ayırmayı karmaşık bulabilir. | Görev tabanlı kullanılabilirlik testi; hızlı kayıt prototipi | Product / UX |
| RISK-P02 | Başlangıç ekranı yeterince 'kaldığın yer' bağlamı vermeyebilir. | Uzun ara sonrası test senaryoları | Product / UX |
| RISK-P03 | SQLite+Markdown export kullanıcının 'dosyalarımla çalışıyorum' beklentisini karşılamayabilir. | Gerçek kullanıcılarla export/import deneyimi | Product / Data |
| RISK-P04 | AI model önerisi cihazdan cihaza değişken davranabilir. | Donanım matrisi + tool doğruluk benchmark'ı | Local AI |
| RISK-P05 | Kurulum sihirbazı çok uzun sürerse insanlar ürünü terk edebilir. | AI'sız ilk kullanım ve isteğe bağlı kurulum testi | Product / Setup |
| RISK-P06 | Ses modeli indirmeleri depolama ve UX açısından ağır olabilir. | Açık boyut/izin gösterimi, ses kapalı testleri | Voice |
| RISK-P07 | Electron temel kaynak tüketimi 'hafif' algısını zedeleyebilir. | Referans/alt seviye makinede ölçüm | Performance |
| RISK-P08 | Agent işlem geçmişi fazla teknik ve karmaşık görünebilir. | Katmanlı ayrıntı seviyeleri için UX testi | Agent / UX |
| RISK-P09 | Otomatik Git/sync beklentisi veri kaybına veya gizlilik endişesine yol açabilir. | Varsayılan kapalı politika ve açıklık testi | Data / Security |
| RISK-P10 | Kapsam genişler ve temel döngü gecikebilir. | `DOC-02` kapsam kontrolü + `DOC-35` iş paketi kapıları | Product / Engineering |

Risklerin kesin şiddet ve teknik çözümleri ilgili tasarım/kalite belgelerinde işlenecektir. Bu liste ürün seviyesinde erken uyarı kaydıdır.

## 21. Başka belgeler için bağlayıcı ürün çıktıları

| Hangi belge? | Bu dokümandan devralması gereken ürün sözleşmesi |
|---|---|
| `DOC-02` | `PV-01–04`, `JTBD-01–12` için sınırları belirlenmiş, izlenebilir gereksinimler |
| `DOC-03` | Projeye dönüş, hızlı yakalama, karar bulma, kurulum atlama, agent ve ses dahil kullanıcı yolları |
| `DOC-04` | Dört ürün vaadinin gözlenebilir kabul testleri ve yayın kapıları |
| `DOC-05–07` | Lokal çekirdek, opsiyonel modüller, sınırları belirli UI/servis mimarisi |
| `DOC-08–10` | Proje/görev/not/karar/log ilişkilerinin tutarlı saklanması, migration ve veri sahipliği |
| `DOC-11–12` | UI'yı bloke etmeyen IPC ve iptal edilebilir arka plan işleri |
| `DOC-13–15` | Projeye dönüş + hızlı kayıt + birleşik aramayı destekleyen işlevler |
| `DOC-16–17` | Taşınabilirlik, deterministik export/import ve kurtarılabilirlik |
| `DOC-18–19` | Atlanabilir/resumable setup, sonradan AI açma, gerçek capability sağlığı |
| `DOC-20–23` | Minimal, özgün, tutarlı, erişilebilir, çok dilli UI |
| `DOC-24–27` | Yerel ve kontrollü AI, gözlemlenebilir gerçek tool eylemleri |
| `DOC-28–29` | Kullanıcı tetiklemeli kayıt, kontrol edilebilir transkript ve isteğe bağlı TTS |
| `DOC-30–34` | Kullanıcı kontrolü, yerel gizlilik, güvenlik, ölçülebilir kalite ve yüklenebilir sürüm |
| `DOC-35` | Temel proje hafızası döngüsünü AI vitrininin önüne alan geliştirme sırası |

## 22. Ürün vizyonu için gözden geçirme kontrolü

Belge onaylanmadan önce aşağıdaki maddeler tek tek doğrulanmalıdır:

- [ ] Dört ana sorunun ve ürünün birincil değerinin açık olması.
- [ ] Hedef kullanıcıların V1'de gerçekçi ve bireysel kullanım odaklı tanımlanması.
- [ ] AI, STT ve TTS olmadan ürünün bağımsız çalışmasının tartışmasız olması.
- [ ] SQLite ana veri kaynağı ve Markdown'ın içe/dışa aktarım rolünün çelişkisiz olması.
- [ ] Kurulumda AI atlama, daha sonra açma/kapatma ve servis bozulma durumlarının ürün vaadine dahil olması.
- [ ] Proje bağlamına geri dönüşün AI özetine bağımlı olmaması.
- [ ] Agent'ın gerçek araç eylemlerinin kullanıcı tarafından görülebilmesi ve riskli işlerde onay olması.
- [ ] Sesli akışın görünür kayıt, durdurma ve düzenlenebilir transkript içermesi.
- [ ] Dış dünyaya verinin izinsiz gönderilmemesi ve yedek/taşınabilirliğin korunması.
- [ ] V1 dışı takım/bulut/mobil/sınırsız agent özelliklerinin net dışlanması.
- [ ] 'Hızlı' iddiasının ölçüm gerektirdiğinin kabul edilmesi.
- [ ] Kesin SQL/API/ekran/test ayrıntılarının yetkili teknik belgelere bırakılması.

### 22.1 `DOC-01` için Definition of Done

- [x] Ürün vaadi, problem, hedef kitle ve farklılaştırma tanımlandı.
- [x] Kullanıcı işlerinin izlenebilir `JTBD-*` kimlikleri oluşturuldu.
- [x] Local-first, AI-optional, SQLite canonical kararları `DOC-00` ile tutarlı.
- [x] Ürün düzeyinde ana senaryolar ve V1 dışı sınırlar yazıldı.
- [x] Başarıyı değerlendirmek için ölçülebilir göstergeler ve araştırma yöntemi önerildi.
- [x] Riskler ve diğer belgelere devredilecek yükümlülükler tanımlandı.
- [ ] Ürün sahibi tarafından gözden geçirildi ve onaylandı.
- [ ] `DOC-02–04` yazıldıktan sonra belge çelişkileri kontrol edildi.

## 23. Açık ürün kararları ve sonraki adım

**Karar gerektiren ama bu belgede keyfî varsayılarak sabitlenmeyen konular:**

1. V1 için tam kapsamlı bağımsız bir CLI mı, yoksa yalnızca UI klavye hızlı kayıt akışı mı zorunlu? (`DOC-02`)
2. V1'de kaç görev görünümü zorunlu: yalnızca liste mi, Kanban da mı? (`DOC-02`, `DOC-21`)
3. İlk sürümde son kullanıcıların İngilizce UI ile tüm akışları tamamlaması zorunlu mu, yoksa i18n altyapısı + öncelikli Türkçe paket mi? (`DOC-02`, `DOC-23`)
4. Proje dışındaki genel not/görevler doğrudan desteklenecek mi, yoksa varsayılan bir Inbox projesine mi düşecek? (`DOC-02`, `DOC-08`, `DOC-13`)
5. Yerel kullanım analizinin tamamen kapalı tutulmasına ek olarak, kullanıcı tarafından çalıştırılabilen gizlilik korumalı tanı raporu V1 için gerekli mi? (`DOC-02`, `DOC-30–32`)

Bunlar `DOC-02` hazırlanırken açık ürün kararına dönüştürülmelidir; geliştirme ajanı kullanıcı onayı olmadan kritik UX/kapsam yönünü değiştirmemelidir.

**Sıradaki doküman:** [`02-SCOPE-REQUIREMENTS.md`](./02-SCOPE-REQUIREMENTS.md) — Her özelliği benzersiz `REQ-*` kimliğine bağlayacak; *MUST/SHOULD/MAY*, V1 kapsamı, özellik kabul koşulları ve kapsam dışı davranışlar burada kesinleştirilecektir.

---

## Belge değişiklik geçmişi

| Sürüm | Tarih | Değişiklik |
|---|---|---|
| 0.1.0 | 2026-10-10 | İlk kapsamlı ürün vizyonu taslağı oluşturuldu. |
