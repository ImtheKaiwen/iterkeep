# Iterkeep — Agent Entry Point

Bu dosya kodlama ajanlarının **ilk okuyacağı** kısa yönlendirmedir. Kanonik ürün ve mimari sözleşmeler `docs/` altındaki 36 teknik dokümandır. Bu dosya yeni gereksinim, SQL tablo, IPC kanal veya güvenlik istisnası getirmez.

1. Önce `docs/00-README.md` ardından `docs/35-IMPLEMENTATION-PLAYBOOK.md` dosyasını tamamen oku.
2. `IP-00` ile güncel belgelerin tutarlılığını kontrol et; kod zaten varsa önce `git status --short`, log, ilgili kaynak, test/komutları incele; kullanıcı değişikliklerini kaybetme.
3. En erken tamamlanmamış ve bağımlılıkları doğrulanmış `IP-*` paketini seç; yalnız ilgili birincil `DOC-*` dosyalarını ve ihtiyacın olan komşu sözleşmeleri oku.
4. **Yetki alanları:** `DOC-08` domain, `DOC-09` fiziksel SQLite DDL, `DOC-10` DB işlemleri, `DOC-11` IPC, `DOC-12` jobs, `DOC-20–23` UI, `DOC-26–27` agent izin, `DOC-30` güvenlik, `DOC-33` test, `DOC-34` release.
5. `SQLite` tek canonical storage, `Renderer → named Preload → Electron Main → Application Core → DB Worker` güvenlik sınırıdır. Ollama, Whisper, EMA ve Git isteğe bağlıdır.
6. Yeni bir tool/kanal/tablo/domain enum icat etmeden önce kanonik doküman ile karşılaştır; eksikse sözleşme sahibini ve gerekli testleri açık değişiklikle güncelle.
7. Testleri **gerçekten çalıştır**; PASS/FAIL/BLOCKED/NOT_RUN durumlarını kanıtla. Dummy PASS, atlanmış güvenlik kapısı ve çalıştırılmamış benchmark sonucu yasaktır.
8. Her adım sonunda kullanıcıya değişen dosyaları, çalıştırılan test komutlarını ve exit code'larını, açık riskleri, sonraki `IP-*` paketini bildir. Kullanıcı verisini, raw prompt'u veya ses dosyasını CI'ya istemsiz yükleme.
9. Kamuya hazır release yalnız DOC-04/33/34 kalite kapıları ve aynı imzalı Windows artifact testlerinden sonra mümkündür; signer yoksa `BLOCKED`.

**Başlangıç işi:** `IP-00` (doc audit); sonraki iş: `IP-01` (monorepo scaffolding). `docs/35`'in oluşturulmuş olması uygulamanın geliştirildiği anlamına gelmez.
