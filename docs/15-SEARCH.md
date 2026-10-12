---
document_id: DOC-15
title: "Iterkeep — Yerel Arama Motoru, FTS5, Türkçe Sorgu Dili ve Performans Sözleşmesi"
version: "0.1.0"
status: "draft"
last_updated: "2026-10-10"
language: "tr-TR"
owner: "Search Architecture & Information Retrieval"
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
next_document: "DOC-16"
---

# Iterkeep — Yerel Arama Motoru, FTS5, Türkçe Sorgu Dili ve Performans Sözleşmesi

> **Normatif amaç:** Iterkeep'in proje, görev, Markdown not, teknik karar ve çalışma günlüklerini **AI olmadan**, internete bağlanmadan, kanonik SQLite içeriğine dayanarak aranabilir hâle getirmek. Bu belge sorgu dili, güvenli FTS5 derleyicisi, indeks görünürlüğü, sonuç sıralama, sayfalama, Türkçe sınırlamaları, UI davranışı, hata kurtarma, test ve benchmark sözleşmesidir.
>
> **Yetki ayrımı:** Domain kimlikleri/statüler **DOC-08**; SQL DDL/FTS trigger'ları **DOC-09**; DB bağlantı/transaction/backup **DOC-10**; public IPC kanal/envelope **DOC-11**; job/event yaşam döngüsü **DOC-12**; görev/proje semantiği **DOC-13**; Markdown, karar ve günlük görünürlüğü **DOC-14**; kullanıcı arayüzünün tasarım tokenları/yerleşimi **DOC-20–22**; benchmark kanıtı **DOC-31**. Bu belge onların yerine yeni tablo, endpoint veya statü yaratmaz.
>
> **Kanıt seviyesi:** Tasarım ve referans uygulama taslağıdır. FTS5 davranışları resmi SQLite dokümanıyla eşlenmiştir. Hazırlık sırasında Python `sqlite3` (SQLite 3.46.1) üzerinde DOC-09 başlangıç şemasıyla **dar kapsamlı SQL smoke testi** yapıldı: iki belge eşleşmesi, güncelleme sonrası tek sonuç, parent soft-delete sonrası sıfır görünür sonuç ve FTS external-content `integrity-check` başarılı. Bu, parser, TypeScript/Electron entegrasyonu veya 100.000 kayıt performans testi değildir. SQLite/Electron uygulaması üzerinde uçtan uca ve büyük veriyle ölçülmüş performans **henüz yoktur**. `draft` statüsü korunur. Değişiklikler uygulamadan önce ilişkili dokümanlarla sözleşme uyumu test edilir.

---

## 0. Amaç, ürün dili ve kapsam

Temel kullanıcı soruları:

1. **"Memory modülü hangi projedeydi?"** — proje/görev/not başlıklarından hızlı kaynak bulma.
2. **"Ses modeli hakkındaki teknik karara dön"** — karar türü filtresi + başlık/gövde eşleşmesi + kaynak ID.
3. **"Geçen ay runtime hakkında hangi notları yazdım?"** — tarih ve tür filtresi; metinsel eşleşme.
4. **"Şu görevi tamamladım mı?"** — görevi bulup asıl durumunu ilgili kayıt ekranında gösterme.
5. **"Proje adını yanlış yazmış olabilirim"** — sınırlı ve açıkça etiketlenmiş başlık önerileri.
6. **"AI kapalıyken de arayayım"** — aynı çekirdek arama; Ollama/STT/TTS gerektirmez.

Kullanıcıya "arama bir bilgiyi kesin anlamış" izlenimi verilmez. `geçen ay hangi kararı vermiştim` ifadesi tek başına doğal dil anlayışı gerektirir; V1'in kesin sözleşmesi **anahtar sözcük + açık tür/tarih filtreleri**dir. UI kullanıcıya `Tür: Kararlar`, `Tarih: Geçen ay` filtreleri sunar. İleride isteğe bağlı agent, doğal dili açık bir arama filtresine dönüştürebilir; fakat her zaman aynı `search.query()` ve kayıt ID'lerini kullanır.

### 0.1 V1 kapsamında

- Başlık ve gövde üzerinde SQLite FTS5; proje, görev, not, karar, günlük.
- `search.query` için güvenli query parser; arama alanı, tür ve proje filtreleri.
- Kullanıcının bulunduğu saat dilimiyle açık tarih filtresi (`after:`, `before:`).
- Başlığa ağırlık veren BM25, deterministik bağlayıcı sıralama.
- Cursor'la sayfalama, sınırlandırılmış snippet ve güvenli işaretleme.
- Silinmiş ve silinmiş proje içindeki sonuçları dışarıda bırakma.
- Arama kutusunda debounce, yükleniyor/boş/hata durumları ve klavye navigasyonu.
- FTS bütünlük kontrolü, kontrollü onarma ve ölçülebilir benchmark.

### 0.2 V1 kapsamında *olmayanlar*

- Vektör veritabanı / embedding / semantik aramanın zorunlu olması.
- Türkçe morfolojik analiz veya bütün çekimli kelimelerin otomatik eşitlenmesi.
- OCR, PDF içeriği indeksi, ses transkriptlerinden otomatik indeksleme (ileride ayrı karar).
- Bulut arama, kullanıcı verisini dışarı gönderme, arama telemetrisi.
- Gerçek zamanlı çok-kullanıcılı indeks replikasyonu.
- Tüm Markdown'ın HTML'e çevrilip aranması; DB'de kanonik Markdown metni aranır.

---

## 1. Değişmez kurallar (`SRCH-I-001–040`)

| ID | Kesin kural |
|---|---|
| SRCH-I-001 | Kalıcı gerçek kaynak yalnız domain tablolarıdır; `search_index` ve `search_fts` **yeniden üretilebilir projeksiyon**dur. |
| SRCH-I-002 | Renderer/agent SQL, FTS `MATCH`, dosya yolu veya DB bağlantısı kullanmaz. |
| SRCH-I-003 | Tek public arama kanalı DOC-11'deki `search.query`'dir. |
| SRCH-I-004 | `@iterkeep/search` arama sözdizimini ayrıştırır; `storage-sqlite` parametreli SQL'i yürütür. |
| SRCH-I-005 | Kullanıcı metni asla doğrudan FTS `MATCH` dili olarak çalıştırılmaz. |
| SRCH-I-006 | Arama semantiği AI'dan bağımsız ve deterministiktir. |
| SRCH-I-007 | Arama esnasında hiçbir domain kaydı güncellenmez. |
| SRCH-I-008 | Yeni kayıt/soft-delete/güncelleme ve indeks değişimi aynı SQLite transaction sınırındadır (DOC-09). |
| SRCH-I-009 | Sonuçlar ancak kaynak proje ve registry hâlâ erişilebilirse gösterilir. |
| SRCH-I-010 | Arşivli proje aramadan otomatik silinmez; görünürlük etiketlenir. |
| SRCH-I-011 | Çöpe atılan proje ve bağlı çocuk kayıtları normal arama sonuçlarından gizlenir. |
| SRCH-I-012 | Geçmiş revizyonların gövdeleri V1 FTS kapsamına girmez; mevcut karar/not kaydı aranır. |
| SRCH-I-013 | Yalnızca başlık/gövde indekslenir; kullanıcı kimlikleri, sohbetler, agent gizli içeriği ve tanı logu kapsam dışıdır. |
| SRCH-I-014 | Varsayılan sıralama BM25 (küçük skor daha iyi) + sabit kayıt bağlayıcılarıdır. |
| SRCH-I-015 | Tam sonuç kümesi React'e aktarılmaz; limit üst sınırı 100'dür, varsayılan 40. |
| SRCH-I-016 | `cursor` query/filter/sort/workspace ve indekse ait bir bağlamı temsil eder; başka sorguda kullanılmaz. |
| SRCH-I-017 | İndeks veya kanonik veri değişince eski cursor geçersiz sayılabilir; kullanıcıya güvenli yenileme önerilir. |
| SRCH-I-018 | Gövde/snippet React'te HTML olarak doğrudan basılmaz; işaretleyiciler güvenli metin node'larına dönüştürülür. |
| SRCH-I-019 | Arama sonucu her zaman `kind` + `recordId` + `projectId` ile kaynak ekrana açılır. |
| SRCH-I-020 | Doğal dil anlam çıkarımı yapıldığı iddia edilmez; açık filtreler ve isteğe bağlı agent ayrı gösterilir. |
| SRCH-I-021 | Türkçe `I/İ/ı/i`, Unicode normalizasyonu ve ekli biçimler için doğruluk matrisi yazılır. |
| SRCH-I-022 | FTS tokenizer değişikliği migration + yeniden indeksleme + regression testi gerektirir. |
| SRCH-I-023 | İlk açılışta her kaydı renderer belleğine çekmek yasaktır. |
| SRCH-I-024 | Yeniden indeksleme yalnız DB worker bakım yolu ve `search_rebuild` job'undan yapılır. |
| SRCH-I-025 | Yeniden indeksleme sessizce kullanıcı verisini değiştirmez veya silmez. |
| SRCH-I-026 | Sağlam olmayan FTS indeksinde kullanıcıya yanlış 'hiç sonuç yok' cevabı verilmez; onarım durumu bildirilir. |
| SRCH-I-027 | Her arama çağrısı doğrulanmış deadline ve iptal edilen UI çağrısının sonuç bastırma politikasına uyar. |
| SRCH-I-028 | UI'dan gelen `projectIds` yalnız aktif workspace içindeki izinli kayıtlardır. |
| SRCH-I-029 | Filtreler `MATCH` için serbest string birleştirme yöntemiyle SQL'e dönüştürülmez. |
| SRCH-I-030 | Fuzzy öneri ancak sınırlı aday kümesinde başlık üzerinde çalışır; yüz binlerce tam metin RAM'e taşınmaz. |
| SRCH-I-031 | `search.query` hiçbir zaman model indirme/Ollama başlatma tetiklemez. |
| SRCH-I-032 | Boş arama sorgusu FTS `MATCH ''` yapmaz; anlamlı son kayıt görünümü veya boş giriş gösterir. |
| SRCH-I-033 | Sadece filtre içeren sorgularda FTS'siz indeksli listeleme yapılır. |
| SRCH-I-034 | `type`, `after`, `before` operatörleri katı ayrıştırılır; tanınmayan `foo:bar` otomatik SQL operatörü olmaz. |
| SRCH-I-035 | Sonuç zaman filtresi tarih değeri ile kaynak kaydın güncellenme/oluşma tarihini açıkça ilişkilendirir. |
| SRCH-I-036 | Query/cache anahtarları workspace ID, kanonik terimler ve tüm filtreleri kapsar. |
| SRCH-I-037 | Arama geçmişi, kullanıcı açmadan kalıcı depoya veya uzak hizmete yazılmaz. V1'de geçmiş kaydı yoktur. |
| SRCH-I-038 | Tek arama batch'i süreç başına sınırlandırılır; ağır bakım araması interaktif işi aç bırakmaz. |
| SRCH-I-039 | Yeni bağımlılık, yeni indeks veya API için ilgili DOC-05/07/09/11 revizyonu gerekir. |
| SRCH-I-040 | Performans başarısı yalnız gerçek test sonucu ve karşılaştırılabilir donanım profiliyle ilan edilir. |

---

## 2. Kanonik şema ve veri kapsamı

DOC-09 `0001_initial.sql` **değişmeden** kullanılır:

```sql
CREATE TABLE search_index (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('project','task','document','decision','activity_log')),
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
```

> Bu kod **açıklama için yeniden gösterilen mevcut şema**dır, yeni migration değildir. Tam SQL (tüm trigger'lar dâhil) DOC-09'dan birebir alınır; burada parçalı bir migrasyon dosyası yaratılmaz.

| `search_index.kind` | Kanonik source | Başlık | Gövde | Kaynak zaman alanı |
|---|---|---|---|---|
| `project` | `projects` | `name` | `description` | `updated_at` |
| `task` | `tasks` | `title` | `body_markdown` | `updated_at` |
| `document` | `documents` | `title` | `body_markdown` | `updated_at` |
| `decision` | `decisions` | `title` | `context_markdown`, `decision_markdown`, `rationale_markdown`, `consequences_markdown`, `alternatives_markdown` birleşimi | `updated_at` |
| `activity_log` | `activity_logs` | boş string | `text_markdown` | `occurred_at` |

Dışa aktarma veya import yalnızca Application Core üzerinden kanonik tabloya commit eder; indeks güncelleme DOC-09 trigger'ları tarafından yapılır. `document_versions`, `decision_revisions` ve `task_history` V1 arama indeksine **ayrı sonuç** olarak girmez. Ek dosya adları ve içerikleri, model dosyaları, ses kayıtları, agent tool argümanları ve `messages` de indekslenmez.

**Kapsam sorunu:** Project soft-delete alt çocukların search_index satırlarını fiziksel olarak kaldırmaz. `search.query` sonucunda **hem** `projects.deleted_at IS NULL`, **hem** `record_registry.deleted_at IS NULL` filtresi uygulanır. `projects.status='archived'` sonuç dışlama nedeni değildir; `projectStatus` döndürülür. Child soft-delete source trigger üzerinden projeksiyondan çıkarılır.

### 2.1 Yazma tutarlılığı

```text
Application Command -> DB worker BEGIN
  INSERT/UPDATE/soft-delete source entity
  trigger: search_index INSERT/UPDATE/DELETE
  trigger: search_fts INSERT/DELETE (external-content sequence)
  INSERT domain_events / receipt
DB COMMIT -> mutation acknowledged -> UI invalidates search cache
```

Başarısız transaction hiçbir görünür arama değişikliği bırakmaz. Commit'ten önce gösterilen UI değeri kalıcı değildir. Olay akışı kaçırıldıysa kullanıcı yeniden arama yaparak DB anlık görünümünü alır. Bir şeyin `search_fts` içerisinde bulunması, kaynak kaydın görünür olduğunu **kanıtlamaz**; erişim filtreleri zorunludur.

### 2.2 Dil politikası ve tokenizer sınırları

- Şemadaki `unicode61 remove_diacritics 0` **mevcut V1 kararıdır**. FTS5 varsayılanı olan `remove_diacritics 1` ile karıştırılmamalı.
- `unicode61` gelişmiş Türkçe yerel kuralları veya sözcük kökü/ek ayırma sağlamaz; `geliştir` ve `geliştirme` otomatik olarak eş anlamlı değildir.
- NFC normalizasyonu bütün yeni içeriklerde DOC-08'in girdi doğrulamasına tabidir. Eski/import edilmiş metnin tamamını otomatik değiştirerek veri kaybı yaşatmayız.
- Türkçe `I/İ/ı/i` davranışları ve birleşik Unicode varyantları gerçek veritabanı motoru üzerinde matrise alınır. Uygulama yalnız sorguyu locale-lowercase yaparak aynı sonucu garanti **edemez**, çünkü kanonik kaynak FTS5'in kendi tokenizer'ıyla indekslenmiştir.
- Türkçe için kabul testleri başarısızsa ürün bunları 'tam çözülmüş' gösteremez; alternatif token tablosu veya tokenizer ancak **DOC-09 migration/ADR** ile eklenir. V1 için yanlış pozitif üretmektense sınırlamayı görünür göstermek esastır.
- `prefix='2 3'` önek eşleştirmeyi destekler; bu, typo correction veya Türkçe sözcük kökü eşleştirme anlamına gelmez.

---

## 3. Public IPC ve arama isteği

**Tek public API (DOC-11):**

```ts
window.iterkeep.search.query({
  query: 'type:decision after:2026-09-01 "ses modeli"',
  types: ['decision'], // opsiyonel
  projectIds: [],      // opsiyonel: boş dizi = tüm görünür projeler
  cursor: null,
  limit: 40,
});
```

IPC kanal suffix'i `search.query`, tam kanal `iterkeep:v1:search.query`'dir. Bu doküman yeni `search.rebuild`, `search.suggest`, `search.semantic`, `search.history` veya SQL çalıştırma public metodu **eklemez**. FTS onarımı DOC-12'deki iç `search_rebuild` bakım işi üzerinden yönetilir. `type:`, `after:`, `before:` **query metni** içinden ayrıştırılır; DOC-11 DTO alanına yeni filtre eklenmez.

| Alan | Tür / sınır | Davranış |
|---|---|---|
| `query` | UTF-8 / en çok 1024 kod birimi üst IPC sınırı | Trim, NFC, token parser, boş değer ayrı yol. |
| `types?` | `SearchKind[]`, max 5 benzersiz | Sadece 5 izinli tür; tekrarlar reddedilir. |
| `projectIds?` | UUIDv4[], max 30 benzersiz | Boş/undefined tüm projeler; her ID aktif workspace'te doğrulanır. |
| `cursor?` | null veya opaque en çok 512 karakter | Fingerprint, TTL ve indeks değişimi doğrulanır. |
| `limit?` | tamsayı `1..100`, varsayılan `40` | Geri verilen sayfa boyutu; `limit+1` için yalnız backend fetch. |

**Dönüş:** `Page<SearchHit>`; tanımlayıcı `recordId` ve `kind`, `projectId`, sınırlı `title`, `excerpt`, `highlights`, `projectStatus`, `sourceTimestamp`, `score` ve `nextCursor` içerir. Buradaki nesne *projection* tipidir; nihai wire ismi ve JSON-safe Zod DTO'su `@iterkeep/contracts/src/ipc/search.contracts.ts` içinde DOC-11 kurallarına tabi olur. `SearchHit` asla tam Markdown gövdesini veya gizli alanları otomatik döndürmez.

### 3.1 Önerilen JSON-safe projeksiyon

```ts
export const SearchKinds = [
  'project', 'task', 'document', 'decision', 'activity_log',
] as const;
export type SearchKind = (typeof SearchKinds)[number];

export interface SearchHit {
  kind: SearchKind;
  recordId: string;       // UUID v4; DOC-08/11 runtime validation
  projectId: string;
  projectStatus: 'active' | 'paused' | 'completed' | 'archived';
  title: string;          // <= 200 code points in response projection
  excerpt: string;        // escaped text only; <= 240 visible code points
  highlights: ReadonlyArray<{ start: number; end: number }>;
  sourceTimestamp: string; // UTC RFC3339 milliseconds
  score: number | null;  // FTS score or null for non-FTS list mode
}

export interface SearchPage {
  items: SearchHit[];
  nextCursor: string | null;
  hasMore: boolean;
}
```

`highlights` indeksleri **UTF-16 kod birimi** ofsetleridir (JS `slice` ile aynı) ve metin üzerinde hesaplanır; Unicode surrogate çiftleri kesilmez. `SearchHit` örneği referans şemadır: DOC-11 kanonik tipleri farklıysa DOC-11 uyum revizyonu yapılmadan kodlanmaz. `title` kesilmesi kullanıcıya tam başlık olmadığı gösterilerek yapılır, kaynaktaki başlık değişmez.

---

## 4. Güvenli sorgu dili (V1)

### 4.1 Kullanıcı sözdizimi

| Kullanıcı girişi | Semantik | Örnek |
|---|---|---|
| `kelime` | Tam token eşleşmesi | `runtime` |
| `iki kelime` | İki terim birlikte (AND) | `memory runtime` |
| `"ifade metni"` | FTS bitişik ifade (phrase) | `"ses modeli"` |
| `kel*` | Sondan önek araması; token >=2 harf | `mem*` |
| `type:task` | Tür daraltma | `type:decision` |
| `after:YYYY-MM-DD` | Kaynak tarih >= başlangıç günü | `after:2026-09-01` |
| `before:YYYY-MM-DD` | Kaynak tarih <= bitiş günü | `before:2026-09-30` |
| Başka karakter/`:` | Sıradan arama metni veya anlaşılır hata | `C++`, `foo:bar` |

**Sınırlar:** V1 kullanıcı sorgusunda serbest `OR`, `NOT`, `NEAR`, parantez, FTS sütun sınırlaması, joker karakterle başlayan arama (`*foo`) ve düzenli ifade yoktur. Bu kelimeler normal metin olarak kabul edilir; FTS diline emir olarak taşınmaz. Negatif terimlerin doğruluğunu V1'de garanti etmiyoruz. Üçüncü taraf uygulamanın FTS sözdizimini direkt göndermesi kabul edilmez.

`type:` değeri `project|task|document|decision|activity_log` kümesinden olmalıdır. Birden fazla `type:` tekrarı V1'de hata (`SEARCH_INVALID_FILTER`) döndürür; çoklu tür için UI `types[]` filtresi kullanılır. `after` ve `before` en fazla birer kez verilir; geçersiz tarih veya ters aralık doğrulama hatasıdır. Tanınmayan `isim:değer` `SEARCH_UNKNOWN_OPERATOR` döndürür; `C++` sıradan sözcükler gibi normalize edilir.

**Filtre birleşimi:** query içindeki `type:decision` ile `types:['task']` çakışırsa sonuç kümesi boş olur; hata değildir, çünkü intersection boştur. `projectIds:[]` genel kapsam demektir. UI filtre çipleri ve arama metni tutarlı gösterilmelidir.

### 4.2 Parser çıktı sözleşmesi

```ts
type SearchTerm =
  | { kind: 'word'; value: string; prefix: boolean }
  | { kind: 'phrase'; value: string };

type ParsedSearchQuery = {
  terms: SearchTerm[];
  kindFilter: SearchKind | null;
  fromDate: string | null; // inclusive date, timezone in workspace_preferences
  toDate: string | null;   // inclusive date
  normalizedDisplay: string;
};
```

- Maksimum **12** metin terimi / phrase ve phrase başına 80 Unicode code point. En çok 1024 UTF-16 kod birimi ham giriş.
- Kontrol karakterleri (özellikle `NUL`, `U+0000..001F`, `U+007F`) reddedilir; tab/newline kullanıcı sorgusunda normalize edilebilir fakat karmaşık sözdizimi olarak çalıştırılmaz.
- Boşluk Unicode kategorisi `White_Space` biçiminde tek boşluğa indirgenir; NFC uygulanır.
- Tokenizasyon sınırı FTS5'e birebir eşit olduğu varsayılmaz. Tek harfli terimler engellenmez; yalnız tek harfli **prefix** engellenir.
- Punctuation-only ifadeler `SEARCH_EMPTY_TERMS` verir; FTS5'e boş `MATCH` göndermek yasaktır.
- `"` kaçışı ve dengesiz tırnak kullanıcı dostu `SEARCH_INVALID_SYNTAX` üretir.
- `foo:bar` tanınmayan operator olarak hata verir; kullanıcı tam metinde iki nokta arayacaksa tırnaklı phrase kullanabilir: `"foo:bar"`.
- Aynı exact terim tekrarı normalize edilebilir; farklı sıralı phrase'ler birleştirilmez.

### 4.3 Güvenli FTS derleme: string escape yeterli değildir

FTS5 expression injection, SQL injection'dan farklıdır. `db.prepare('... MATCH ?')` SQL injection'ı önler ama kullanıcının `NEAR(...)`, `OR`, `NOT`, `*`, `"` gibi FTS operatörleri vermesini **otomatik engellemez**. Bu nedenle derleme AST'den yapılır.

İlk çekirdek kod örneği (tip güvenli, side-effect'siz; `normalizeNfcAndValidate` ve gerçek parser ayrı dosyadadır):

```ts
// packages/search/src/parse-query.ts
export type Term =
  | { kind: 'word'; value: string; prefix: boolean }
  | { kind: 'phrase'; value: string };

const stripOuterSpace = (v: string) => v.normalize('NFC').trim();
function quotedFtsAtom(value: string): string {
  // Literal phrase within FTS syntax. Double-quotes are doubled as FTS5 requires.
  // Never pass unvalidated raw operator strings into MATCH.
  return `"${value.replaceAll('"', '""')}"`;
}

export function compileFts5(terms: readonly Term[]): string | null {
  if (terms.length === 0) return null;
  if (terms.length > 12) throw new Error('SEARCH_TOO_MANY_TERMS');
  return terms.map(term => {
    const value = stripOuterSpace(term.value);
    if (!value || !/[\p{L}\p{N}]/u.test(value)) {
      throw new Error('SEARCH_EMPTY_TERMS');
    }
    if (term.kind === 'word' && term.prefix) {
      const points = [...value];
      if (points.length < 2 || !/^[\p{L}\p{N}]+$/u.test(value)) {
        throw new Error('SEARCH_INVALID_PREFIX');
      }
      return `${quotedFtsAtom(value)}*`;
    }
    return quotedFtsAtom(value);
  }).join(' AND ');
}
```

**Güvenlik sınırı:** Bu örnek sadece **güvenilir AST** girişi için derleyicidir; doğrudan kullanıcı metnine uygulanmaz. `parseQuery` ayrı şekilde tırnak, tarih ve uzunluk kontrolleri yapar ve kullanıcı bir phrase içinde iki tırnağı içeriyorsa doğru escape eder. FTS tokenizer'ın punctuation-only terim döndürmemesi edge-case olarak test edilir. `compileFts5`'in verdiği expression ayrıca SQLite FTS5 `MATCH` üzerinde test edilmelidir.

**Örnek çeviri:**

```text
Input : type:decision after:2026-09-01 "ses modeli" eğitim*
AST   : kind=decision, from=2026-09-01, terms=[phrase("ses modeli"), word("eğitim", prefix)]
MATCH : "ses modeli" AND "eğitim"*
WHERE : si.kind IN (...) AND source_timestamp >= :from_utc
```

### 4.4 Tarih yorumlama

- `after:2026-09-01` = workspace IANA timezone'undaki **2026-09-01 00:00** anından itibaren.
- `before:2026-09-30` = aynı timezone'daki **2026-10-01 00:00** anından **önce** (exclusive upper bound).
- `after` ve `before` için gerçek takvim tarihi gerekir; `2026-02-31` kabul edilmez.
- Zaman sınırlarını UTC RFC3339 millisecond (`YYYY-MM-DDTHH:mm:ss.sssZ`) biçimine çevirirken DST ve yerel takvim günü politikası paylaşılmış date util/testleriyle doğrulanır. Sabit UTC+03:00 değeri **hardcode edilmez**.
- `sourceTimestamp` tablodan tabloya farklı anlamlıdır: çoğu kayıtta son değişim `updated_at`, çalışma günlüğünde olayın gerçekleşme zamanı `occurred_at`.
- Doğal dil `dün`, `geçen ay` veya `geçen hafta` V1 parser'ın zorunlu bir parçası değildir. UI tarih filtreleri dinamik olarak hesaplayabilir; AI isteğe bağlı olarak kullanıcıdan onay alıp filtre önerebilir.

---

## 5. SQL yürütme planı

### 5.1 FTS eşleşmesi + görünürlük + zaman

Aşağıdaki referans sorgu **belirli tek workspace ve doğrulanmış parametreler** için temel şablondur. Kodlayıcı `:types` / `:projectIds` listelerini doğrudan CSV text interpolasyonu yapmaz; her öğe için sabit adlandırılmış placeholder üretir. `kind` ve `project_id` ifadeleri sadece doğrulanmış parametreyle sınırlandırılır.

```sql
WITH hits AS (
  SELECT si.id AS search_row_id,
         si.kind, si.record_id, si.project_id,
         si.title, si.body,
         p.status AS project_status,
         CASE si.kind
           WHEN 'project' THEN p.updated_at
           WHEN 'task' THEN t.updated_at
           WHEN 'document' THEN d.updated_at
           WHEN 'decision' THEN dec.updated_at
           WHEN 'activity_log' THEN a.occurred_at
         END AS source_timestamp,
         bm25(search_fts, 3.0, 1.0) AS fts_score,
         snippet(search_fts, 1, :mark_start, :mark_end, '…', 24) AS excerpt_raw
  FROM search_fts
  JOIN search_index si ON si.id = search_fts.rowid
  JOIN projects p ON p.id=si.project_id
  JOIN record_registry rr
    ON rr.kind=si.kind AND rr.record_id=si.record_id
  LEFT JOIN tasks t ON si.kind='task' AND t.id=si.record_id
  LEFT JOIN documents d ON si.kind='document' AND d.id=si.record_id
  LEFT JOIN decisions dec ON si.kind='decision' AND dec.id=si.record_id
  LEFT JOIN activity_logs a ON si.kind='activity_log' AND a.id=si.record_id
  WHERE search_fts MATCH :match_query
    AND p.workspace_id=:workspace_id
    AND p.deleted_at IS NULL
    AND rr.deleted_at IS NULL
)
SELECT kind, record_id, project_id, project_status,
       title, source_timestamp, fts_score, excerpt_raw
FROM hits
WHERE (:from_utc IS NULL OR source_timestamp >= :from_utc)
  AND (:until_utc IS NULL OR source_timestamp < :until_utc)
-- Dynamically append trusted placeholder clauses for kind/project sets.
ORDER BY fts_score ASC, kind ASC, record_id ASC
LIMIT :fetch_limit;
```

`projects` aramasında `si.project_id=projects.id` olur. Bir görevin başka projeye taşınması search_index satırının `project_id` alanını trigger üzerinden günceller. Sorguda `record_registry` join'i aktif kaynak ilişkisini korur. Burada `task`, `document` ve `decision` kaynak join'leri yalnız gerekirse yapılır; son sorgu planı `EXPLAIN QUERY PLAN` ile optimize edilir. `source_timestamp` nullable görünüyorsa kaynağın beklenmeyen eksikliği bir veri bütünlüğü hatasıdır: sonuç sessizce bozulmaz, tanılama ve onarım mekanizması tetiklenir.

> **Önemli:** CTE'nin optimize edilme şekli SQLite sürümüne ve koşullara göre değişebilir; `bm25` yalnız FTS `MATCH` bağlamında hesaplanmalıdır. Bu SQL taslağı `better-sqlite3` üzerinde gerçek şema ile entegrasyon testinden geçirilir; sorgu planı hatalıysa aynı semantik korunarak daha sade tek SELECT veya iki aşamalı sorguya dönüştürülebilir. Böyle bir düzeltmede `DOC-15` ve performans testleri birlikte güncellenir.

### 5.2 Yalnız filtre / boş sorgu

Arama metni yoksa `MATCH` çağrılmaz. Sadece `type:` ve `after:/before:` varsa `search_index` ile kaynak tablolarda filtreli, zaman sıralı sayfalama yapılır. Hiç arama terimi ve filtre yoksa boş giriş ekranında son projeler/kayıtlar; **`search.query` hizmetinde boş sonuç** ya da ürünün açıkça belirttiği "recent" görünümü döner. Bu davranış UI ve backend için tek biçimde sabitlenir: **V1 `search.query` boş koşulda son 40 görünür kaydı döndürür**, FTS kullanmaz. Arayüz boş arama kutusunda bunu "Son kayıtlar" başlığıyla gösterir. `projectIds` ve `types` varsa aynı filtreler kullanılır.

Başka kayıt türü salt metadata'sının FTS'ye eklenmesi V1'de yasaktır; `tags` yalnız proje/görev UI filtrelerinin parçasıdır, `search.query` etiket araması sunduğunu iddia etmez.

### 5.3 SQL'de dinamik filtreler

```ts
// packages/storage-sqlite/src/search/queries.ts — parametreli IN clause
function namedIn(
  field: 'si.kind' | 'si.project_id',
  values: readonly string[],
  prefix: 'kind' | 'project',
): { sql: string; params: Record<string, string> } {
  if (values.length === 0) return { sql: '', params: {} };
  const params: Record<string, string> = {};
  const slots = values.map((v, i) => {
    const key = `${prefix}_${i}`;
    params[key] = v; // already validated UUID or finite enum
    return `:${key}`;
  });
  return { sql: ` AND ${field} IN (${slots.join(',')})`, params };
}
```

Sadece sabit `field` birleşimi ve doğrulanmış öğelerle interpolasyon yapılır. SQL parametreleri `BETWEEN`, FTS ve tarih için ayrı bağlanır. SQLite `LIMIT` tamsayı kontrolü yine server tarafındadır. `LIKE '%user%` üzerinden büyük tablo taraması V1 ana arama yöntemi olamaz.

### 5.4 RANK ve result projection

- Varsayılan FTS puanı: `bm25(search_fts, 3.0, 1.0)`. Başlık ağırlığı gövdeden fazladır.
- **Düşük BM25 skoru daha alakalıdır.** `ASC` kullanılmalı; `DESC` yanlış olur.
- Görev veya karar türünü otomatik sınırsız yükselten rastgele bonuslar eklenmez. Kullanıcının açık tür filtreleri zaten önceliklidir.
- Tie-break sırası: `kind ASC`, `record_id ASC` (UUIDv4). FTS'siz son kayıt modunda: `source_timestamp DESC`, `kind ASC`, `record_id ASC`.
- Başlık tamamen eşleşirse sonradan `rank.ts` bonusu eklemek için cursor sözleşmesi, testler ve benchmark güncellenir. V1'in kesin sıralaması **yalnız BM25**'tir.
- Kullanıcının isteğiyle beklenmedik bir karar ağırlıklandırılması yapılmaz; kişiselleştirilmiş sıralama kapsam dışıdır.

### 5.5 Cursor ve kararlı sayfalama

V1 `cursor` şunları içerir (JSON olarak dışarı açık bir API değil, opaque **signed base64url** token):

```ts
type InternalSearchCursorV1 = {
  v: 1;
  workspaceId: string;
  queryHash: string;           // normalized AST + filters + sort + limit
  processEpoch: string;        // process restart after cursor invalid
  maxDomainEventSequence: number;
  sort: 'bm25' | 'recent';
  last: {
    score?: number;           // exact SQLite DOUBLE from previous query
    timestamp?: string;
    kind: SearchKind;
    recordId: string;
  };
  issuedAt: number;           // UNIX epoch milliseconds
};
```

**Risk:** FTS BM25 skorları korpus değişince oynar. Sayfalar arasında domain mutasyonu gerçekleşirse global `SELECT COALESCE(MAX(sequence),0) FROM domain_events` değişimini fark et ve `SEARCH_CURSOR_STALE` döndür. Bu strateji kullanıcıya bir sayfanın atlanması/tekrarını gizleyip yanlış liste vermekten iyidir. `search_rebuild` gibi salt türetilmiş indeks işlemleri domain event üretmeyebilir; bu yüzden worker ayrıca proses içi `indexGeneration` tutar, maintenance sonrası artırır. Epoch restart sonrası cursor invalid olur.

- İlk sayfada `maxDomainEventSequence`, `indexGeneration` (internal cursor alanı) ve query fingerprint alınır. Son sayfalarda hepsi eşleşmelidir.
- *Keyset*: `last.score`, `last.kind`, `last.recordId` üzerinden `(score > :s OR (score=:s AND (kind>... OR ...)))`; son puan SQL `REAL` olarak bağlanır ve aynı skor SQL expression'ından hesaplanır. Sayısal eşitlik/korpus sabitliği DB entegrasyon testinde doğrulanır.
- "Recent" modunda `sourceTimestamp DESC` için `(timestamp < :lastTimestamp OR tie-break ...)` kullanılır.
- `limit+1` satır alınır; fazladan kayıt yalnız `hasMore` için kullanılır.
- Cursor HMAC-SHA256 ile süreç içi gizli anahtarla doğrulanır; kullanıcı verisi içermez. En fazla 5 dakika TTL; yanlış HMAC ve queryHash reddedilir.
- Her arama sayfası **tek DB statement / tutarlı read snapshot** altında hesaplanır. Ayrı IPC sayfaları arasında kalıcı MVCC snapshot yoktur; bu nedenle değişim tespiti şarttır.
- UI `SEARCH_CURSOR_STALE` durumunda sorguyu sıfır cursor ile yeniler, bir süre görünür "Sonuçlar güncellendi" bildirimi gösterir.
- Her içerik değişikliğinin `domain_events` artırmadığı bir yol varsa bu **uygulama hatasıdır**; indeks kaynak değişimine bağlı `indexGeneration` tamamlama kuralıyla eşlenene dek cursor garantisi verilemez.

**Boyut kontrolü:** JSON payload + MAC base64url hâli DOC-11 cursor 512 karakter sınırını aşmamalıdır. Kısaltılmış alan anahtarları/nonce ID kullanımı önerilir; 512'yi aşan token üretilirse `SEARCH_CURSOR_INTERNAL_ERROR` ile test başarısız sayılır, sessiz truncate yapılmaz.

---

## 6. Türkçe arama kalite sözleşmesi

### 6.1 Doğruluk seviyeleri

| Özellik | V1 garantisi | Not |
|---|---|---|
| Tam Türkçe kelime | **Testle doğrulanan sözcük eşleşmesi** | FTS5 unicode61 davranışı. |
| Büyük/küçük harf | **Motor test matrisine bağlı** | `İ/i`, `I/ı` locale-sensitive değildir. |
| `ş/ğ/ü/ö/ç` | `remove_diacritics 0` kuralına bağlı | Accent folding vaat edilmez. |
| Ayrı Unicode birleşimi | NFC girdi normalizasyonu | Legacy corpus normalization ayrı sorun. |
| Ekli kelime | Otomatik kök eşleşmesi **yok** | `karar` vs `kararları` sonucu garanti değil. |
| Prefix (`geliş*`) | >= 2 kod noktalı geçerli token | FTS5 `"term"*` üzerinden. |
| Yanlış yazım | İsteğe bağlı sınırlı başlık önerisi | Exact sonuç gibi gösterilmez. |
| Eş anlam / semantik | Zorunlu değil | Agent opsiyonel; aynı arama API'si. |

### 6.2 Türkçe test matrisi (gerçek FTS5 motorunda)

En az şu kaynakları fixture'a ekle:

```text
İstanbul'da eğitim
istanbul eğitim
Isparta tasarım
ısparta tasarım
Çalışma günlüğü
calisma gunlugu
ses modeli geliştirildi
ses modellerini geliştirmek
C++ bellek modeli
AI-Agent: runtime
NFC: "İ"; NFD: "I\u0307"
```

Her kelime için şu sorguların gerçek çıktıları snapshot olarak saklanır: `istanbul`, `İstanbul`, `Isparta`, `ısparta`, `çalışma`, `calisma`, `eğitim`, `egitim`, `geliştir*`, `geliştirme`, `"ses modeli"`, `C++`, `AI-Agent`. Exact davranış saptanmadan normalize ettiğini iddia eden eşanlam tablosu kullanılmaz.

**İyileştirme yaklaşımı:** Önce ölç, sonra ürün kararını ver. Kanıtlanan kullanıcı ihtiyacı Türkçe harf eşdeğerliği gerektiriyorsa kanonik metni bozmadan ayrı normalize arama sütunu/indeksi veya tokenizer geliştirilebilir. Bu, DOC-09'da migration ve indeks yeniden oluşturma ister; bugünkü DDL üzerinde varmış gibi davranmak yasaktır.

### 6.3 Fuzzy suggestion (V1 kısıtlı)

- Yalnız `project`, `task`, `document`, `decision` **başlıkları** ve metadata önerileri. Günlük metninin tamamında typo correction yok.
- Öncelikle exact FTS çalıştır. Sonuç 0 ise ya da yalnız düşük kalite varsa filtreli, limitli başlık adayları getir.
- Üst aday havuzu **en çok 300**; kanonik kaynak tablodan sadece `id, kind, project_id, title` getir; `body` getirme. Adaylar projeye/kayıt türüne göre sınırlı olabilir.
- İsteğe bağlı `Fuse.js` ya da saf küçük bir edit distance algoritması `@iterkeep/search` üzerinde sadece bu küçük aday kümesine uygulanır. `Fuse.js` kullanılacaksa DOC-05/07 bağımlılık listesi güncellenir.
- Öneri etiketi "Bunu mu aradınız?" olur; 10 öneri üst sınır, öncelikli exact FTS sonuçlarıyla karıştırılmaz.
- 100k satırı JS belleğine yükleyip Levenshtein çalıştırmak **yasaktır**.
- `search.query` sonucuna öneri eklemek DOC-11 response sözleşmesi değişikliği gerektirir; V1 ilk uygulamada öneri **opsiyonel** ve kabul için şart değildir. Implementasyon yapılırsa önce ortak DTO değiştirilir.

---

## 7. Snippet, vurgulama ve kaynak navigasyonu

### 7.1 Snippet üretimi

FTS5 `snippet(search_fts, 1, :start, :end, '…', 24)` gövde üzerinde sonuç çevresini üretir. Günlükte boş title olması normaldir; başlık UI tarafından tarih/"Çalışma günlüğü" etiketiyle sunulur. Snippet sunumundan önce:

1. İçeriği en fazla **240 görünür code point** olacak şekilde kırp; UTF-16 highlight ofsetlerini buna göre yeniden hesapla.
2. HTML tag render etme. Marker'ları ayır ve güvenli React text / `<mark>` bileşenlerine map et.
3. Markdown sentaksını (örn. `**bold**`) doğrudan HTML render etme; arama özetinde plain text göster.
4. Boş snippet varsa güvenli, sınırlı `title` fallback'i kullan.
5. U+0000 ve kontrol karakterleri/çizim bozucu karakterler kontrol edilir; source içeriği değiştirilmez.
6. Yüksek ışık/karanlık tema için tek `search-highlight` token'ı kullan; sabit sarı renk yazılmaz.

**XSS örneği:** Kullanıcı notuna `<img onerror=alert(1)>` yazsa bile sonuç sadece metin olarak görünmeli. React `dangerouslySetInnerHTML`, `innerHTML` veya `DOMParser` tabanlı onaysız HTML akışı yasaktır. Alıntı `>` veya `<` simgeleri korunabilir fakat HTML olarak yorumlanamaz.

### 7.2 Kayıt açma ve soft-delete yarışı

Hit tıklanınca route `kind + recordId` çözülür; yalnız `projectId` kullanılarak kayıt açılmaz. Kayıt arama ile tıklama arasında taşınmış, silinmiş veya arşivlenmiş olabilir:

- Kayıt taşındı: kanonik kayıttan **güncel** proje id'siyle aç, kullanıcıya hafif yer değişikliği notu göster.
- Kayıt silindi: normal detail açma; Trash kurtarma yoluna yönlendir.
- Proje arşivlendi: read-only politikası DOC-13/14'e uyar.
- ID yok veya yanlış: `NOT_FOUND`, güvenli boş durum; başka kaydı benzer başlıkla açma.

Arama sonucu derin linkleri DOM satır pozisyonuna değil sabit UUID'ye dayanır.

---

## 8. Performans, concurrency ve cache

### 8.1 Hedefler (ölçülene dek vaat değil)

| Ölçüm | V1 başlangıç hedefi | Ölçüm koşulu |
|---|---|---|
| Arama P50 | < 45 ms | 100k arama kaydı, SSD, warm DB |
| Arama P95 | < 100 ms | 100k kayıt, 30+ rastgele kontrollü sorgu |
| Filtre/boş mod P95 | < 100 ms | SQLite indexed source filtreleri |
| Input→görsel geri bildirim | < 50 ms | Arama kutusu typing interaksiyonu; spinner/yerel state |
| Debounce | 150 ms başlangıç | UI ölçümüyle ayarlanır, sabit ürün vaadi değil |
| Tek sayfa limit | 40 varsayılan, 100 üst | JSON DTO ve excerpt boyutu sınırlı |
| Yoğun yazma altında P95 | < 250 ms hedef | Ayrı writer kuyruğu, küçük mutasyonlarla |
| 100k arama kaydında RAM sıçraması | ölçülür, regresyon alarmı | Renderer'a asla tüm arama indeksi aktarılmaz |
| Index rebuild | iş ilerlemesi/durdurulma görünür | Kesin süre cihaz ve hacme bağlı, garanti yok |

**Performans raporlarında** cihaz CPU/RAM, disk türü, SQLite/FTS5 sürümü, Electron sürümü, WAL/checkpoint durumu, corpus boyutu, sorgu sayısı, soğuk/sıcak cache ayrımı, median/P95/P99 ve hata sayısı bulunur. Ortalama tek başına kabul ölçüsü değildir.

### 8.2 Benchmark corpus profilleri

| Profil | Proje | Görev | Not | Karar | Log | Toplam |
|---|---:|---:|---:|---:|---:|---:|
| S (smoke) | 3 | 50 | 20 | 10 | 100 | 183 |
| M | 100 | 6.000 | 2.000 | 900 | 5.000 | 14.000 |
| L (hedef) | 1.000 | 40.000 | 20.000 | 9.000 | 30.000 | 100.000 |

Her profile Türkçe/İngilizce Unicode, uzun Markdown, boş başlıklar (günlük), soft-delete, archived parent ve çok tekrar eden terimler eklenir. Korpus sabit seed ile üretilir ve doğrulanmış fingerprint kaydedilir. Disk kullanımı, FTS boyutu ve WAL boyutu da raporlanır.

### 8.3 Debounce, iptal ve yarışma

```ts
// Renderer controller: illustrative; gerçek IPC wrapper ve AbortSignal DOC-11'e uyar.
let searchGeneration = 0;

async function runSearch(input: SearchRequest): Promise<void> {
  const myGeneration = ++searchGeneration;
  showSearchingState();
  try {
    const page = await window.iterkeep.search.query(input);
    if (myGeneration !== searchGeneration) return; // stale response
    showSearchPage(page);
  } catch (error) {
    if (myGeneration !== searchGeneration) return;
    showSearchError(error);
  }
}
```

- Input değişince generation artırılır, önceki sonuç yeni input altında gösterilmez.
- `AbortSignal` DOC-11 içinde destekliyse gerçek request iptal edilir; aksi hâlde UI tarafı stale sonucu **mutlaka** görmezden gelir.
- DB worker tek sahip olduğundan büyük `MATCH` query'leri kısa deadline ve sayfa limitine tabidir. DB iptali için native driver'ın test edilmiş interruption kabiliyeti kullanılmadan `db.interrupt()` var sayılmaz.
- Gereksiz `search.query` event spam'i için UI cache query-key ile coalesce/debounce yapılır; her keypress yeni job kaydı oluşturmaz.
- Ollama model işi, GPU kullanmasa bile CPU yoğun olabilir; interactive search hiçbir zaman isteğe bağlı modelin başlatılmasına bağımlı değildir.

### 8.4 React / TanStack Query stratejisi

- `queryKey=['search', workspaceId, normalizedQuery, sortedKinds, sortedProjectIds, cursor, limit]`.
- İlk sayfa yeni query fingerprint ile çalışır; filtre değişince eski sayfalar yeni listeye append edilmez.
- `keepPreviousData` davranışı yükleme sırasında gösterebilir ama eski sonuçlar **önceki sorguya ait** olduğuna göre etiketlenir.
- Mutasyon commit sonrası `domain_events` veya Query invalidation ile arama cache'i geçersizlenir; event teslimi başarının kaynağı değildir.
- Görünür 40–100 hit için sanallaştırma şart olmayabilir; çok sayfalı listede `TanStack Virtual` kullanılır.
- Klavye `Ctrl/Cmd+K` global arama açar; Escape kutu/overlay kapatır; ↑/↓ sonuç seçimi, Enter kaynak kaydı açar. Bu kısayollar DOC-21/22 ile koordine edilir.

---

## 9. İndeks denetimi, bakım ve onarım

### 9.1 Üç kontrol seviyesi

**Seviye A — Hızlı uygulama başlangıcı:** Kullanıcıyı bekletmeden SQLite açılışı ve FTS tablo varlığı kontrol edilir; her açılışta 100k satır `integrity-check` veya rebuild yapılmaz.

**Seviye B — Tanılama / idle doğrulama:** DB worker dışı bağımsız SQLite bağlantısı açılmaz; aktif işlerin olmadığı bakım penceresinde `integrity-check` yapılır:

```sql
INSERT INTO search_fts(search_fts,rank) VALUES('integrity-check',1);
```

External-content modda `rank=1` kaynakla FTS içeriğini de karşılaştırır. Hata alınırsa kullanıcı içeriğini silmek yerine `SEARCH_INDEX_CORRUPT` durumu bildirilir; tüm veritabanının bozuk olduğu ilan edilmez.

**Seviye C — Rebuild:** `DOC-12` `search_rebuild` job; kullanıcı/otomasyonun tetikleme politikası ayrı bakım yetkisindedir. İlk aşama `search_index` kaynaklardan yeniden kurulur, ikinci aşamada `search_fts` tutarlılığı kontrol edilir. İşlem sonucu görünür receipt ve güncel `indexGeneration` sağlar.

### 9.2 Rebuild için tekil transaction ve iptal

DOC-09 §6.2, kaynak tablolardan tekrar `search_index` doldurma örneğidir. Kanonik sıra:

```text
maintenance approval / policy check
  → DB worker resource lock (exclusive maintenance)
  → assert usable storage + healthy source tables
  → BEGIN IMMEDIATE
  → source counts/fingerprint preflight
  → DELETE search_index  (existing FTS delete triggers fire)
  → INSERT search_index SELECT ...  (insert triggers fire)
  → external-content integrity-check
  → COMMIT
  → bump indexGeneration, invalidate search cursors/cache
  → job succeeded + receipt
```

**Çökme/iptal:** Transaction `ROLLBACK` ile eski kaynak+indeks mantıksal tutarlılığı korunur. DB worker `better-sqlite3` sorguları senkron çalışır; transaction ortasında UI'dan gelen bir cancel her aşamayı **anında** kesemez. Kullanıcıya 'iptal edildi' demek için gerçekte transaction'ın rollback/abort olması gerekir. Hızlı cancellation kritikse ayrı, doğrulanmış parça/bakım yaklaşımı yeni ADR ile tasarlanır. Böylece yüzlerce milisaniyeden uzun kilitler UI'yı doğrudan bloklamasa da diğer DB operasyonlarını geciktirebilir; bunu benchmark ölçer.

**Risk:** Kaynak veri çok büyükse `DELETE` + trigger'lı yeniden doldurma ekstra WAL ve disk alanı oluşturur. Rebuild öncesi boş disk alanı ve yedek politikası DOC-10/17 ile ölçülür; disk kapasitesi yetersizse `SEARCH_REBUILD_NO_SPACE`. Onarılabilir indeks hatası kullanıcı verisinin silinmesini gerektirmez.

### 9.3 Hatalar ve kurtarma

| Kod | Koşul | Kullanıcı mesajı | Sistem davranışı |
|---|---|---|---|
| `SEARCH_INVALID_SYNTAX` | Dengesiz tırnak | "Arama ifadesindeki tırnakları kontrol edin." | DB sorgusu yok |
| `SEARCH_UNKNOWN_OPERATOR` | `foo:bar` | "Bu filtre desteklenmiyor." | Desteklenen filtreler önerilir |
| `SEARCH_INVALID_FILTER` | tarih/tür invalid | "Filtreyi kontrol edin." | DB sorgusu yok |
| `SEARCH_TOO_MANY_TERMS` | >12 terim | "Daha kısa bir arama yapın." | DB sorgusu yok |
| `SEARCH_EMPTY_TERMS` | noktalama-only | "Aranacak bir kelime yazın." | Sıfır sonuç gösterme yerine doğru boş durum |
| `SEARCH_INVALID_PREFIX` | `a*` | "Önek en az iki karakter olmalı." | DB sorgusu yok |
| `SEARCH_CURSOR_INVALID` | MAC/hash/format sorunu | "Sonuç sayfası yeniden yüklenecek." | İlk sayfayı getir |
| `SEARCH_CURSOR_STALE` | event/gen/restart/TTL | "Sonuçlar güncellendi." | İlk sayfaya dön |
| `SEARCH_INDEX_CORRUPT` | FTS integrity fail | "Arama indeksi onarılmalı." | Onarım politikası; kaynaklara dokunma |
| `SEARCH_UNAVAILABLE` | DB worker beklenmedik hata | "Arama şu anda kullanılamıyor." | Diğer sayfalar mümkün olduğunca normal |
| `SEARCH_TIMEOUT` | deadline | "Arama uzun sürdü; filtreleri daraltın." | UI kullanılabilir kalır |
| `SEARCH_CURSOR_INTERNAL_ERROR` | encoder > 512 | Geliştiriciye tanı; kullanıcıya güvenli hata | Testte hard fail |

Not: Bu arama alt-kodları DOC-11'in **ana error envelope** mekanizmasıyla taşınır. Ürün çapında tek global enum gerektiriliyorsa DOC-11 revize edilerek adlar kayıt altına alınır. Renderer özel hata string'i parse edip davranış çıkarmamalıdır; `code` alanına bakar.

---

## 10. İsteğe bağlı Agent ile entegrasyon

Agent, kullanıcı sorgusunu yorumlamaya çalışabilir ama FTS sıralama ve filtre işlemlerini yeniden uygulamaz.

```text
"Geçen ay ses modeliyle ilgili ne kararlaştırmıştım?"
      |
      v
[Agent: optional; user-enabled only]
      |
      +-- proposes structured search intent:
          {query: '"ses modeli"', types:['decision'],
           after: workspace-local last-month-start,
           before: workspace-local last-month-end}
      |
      v
[Validated command/search adapter]
      |
      v
[search.query({query:'type:decision after:YYYY-MM-DD before:YYYY-MM-DD "ses modeli"'})]
      |
      v
[SearchHit[]: kind, id, snippets]
      |
      v
[Agent summarizes with exact source links; may request second search]
```

- Agent arama öncesi provider açık değilse kullanıcıya model yüklemeyi zorlamaz; normal arama çalışır.
- Agent, `search.query`'den aldığı sonucu gerçek kaynak ID olarak gösterir; olmayan kararın var olduğunu söyleyemez.
- LLM doğal tarih dönüştürmesinde timezone'a uyar, gerekirse kullanıcıya filtre yorumu gösterir.
- Agent'ın metin cevabı "veritabanında kesin hiç kayıt yok" diyemez; kullanılan sorgu kapsamında eşleşme yok demelidir.
- Search tool result'ları izinli limit/kapsamla, gizli dosya yolları ve ham SQL olmadan sunulur. Kanonik agent tool şeması DOC-26'dadır.

---

## 11. Kod yerleşimi ve portlar

DOC-07 ile uyumlu dizinler:

```text
packages/search/src/
├── index.ts
├── normalize.ts
├── parse-query.ts
├── rank.ts
├── search-service.ts
└── __tests__/
    ├── parser.test.ts
    ├── turkish.test.ts
    └── cursor-contract.test.ts

packages/storage-sqlite/src/search/
├── fts-index.ts
├── queries.ts
└── __tests__/
    ├── search-query.integration.test.ts
    ├── search-trigger.integration.test.ts
    └── search-rebuild.integration.test.ts

apps/desktop/src/renderer/features/search/
├── components/
│   ├── SearchBox.tsx
│   ├── SearchResults.tsx
│   ├── SearchResultRow.tsx
│   └── SearchFilters.tsx
├── hooks/useSearch.ts
└── __tests__/search-flow.test.tsx

packages/contracts/src/ipc/search.contracts.ts
```

`packages/search` SQL/native/Electron import etmez. `SearchService` bir `SearchIndexPort` (sorgu DTO + kontrol edilen filtreler → sayfa) kullanır; portun SQLite uygulaması yalnız `storage-sqlite` paketindedir. DB worker mesaj sözleşmesi DOC-11'e tabidir. `rank.ts` V1'de BM25 puanını yeniden hesaplamaz; yalnız sonuç formatlama ve UI tarafı yönlendirme yardımcıları içerebilir.

### 11.1 Port tipi — SQL'i sızdırma

```ts
export interface SearchIndexPort {
  query(input: {
    ftsMatch: string | null; // generated trusted AST, never raw user query
    kinds: readonly SearchKind[];
    projectIds: readonly string[];
    fromUtc: string | null;
    untilUtc: string | null;
    limit: number;
    bookmark: unknown | null; // opaque within search implementation
  }): Promise<{ rows: readonly SearchHit[]; nextBookmark: unknown | null }>;
}
```

Bu örnek Application Core içinde kalacak port içindir. Renderer sözleşmesi değildir; `unknown` bookmark DB adapter tarafından validate edilir. Nihai interface repo içinde `@iterkeep/search` ve `@iterkeep/application` public `exports` kuralına göre yerleştirilir. `ftsMatch` güvenli parser tarafından üretilir; agent bu alana doğrudan string sağlayamaz.

---

## 12. Test planı (`SRCH-T-001–060`)

| ID | Test | Geçme koşulu |
|---|---|---|
| SRCH-T-001 | Ekleme sonrası başlık FTS | Kaynak commit sonrası tek sonuç |
| SRCH-T-002 | Gövde güncelleme | Eski terim gider, yeni terim gelir |
| SRCH-T-003 | Task project move | Hit yeni projectId ile döner |
| SRCH-T-004 | Soft-delete task | Sonuç anında gizlenir |
| SRCH-T-005 | Restore task | Sonuç aynı recordId ile döner |
| SRCH-T-006 | Soft-delete project | Proje ve çocukları normal aramada gizli |
| SRCH-T-007 | Restore project | Çocuklar tekrar görünür |
| SRCH-T-008 | Archived project | Hit görünür ve status archived |
| SRCH-T-009 | Decision search body birleşimi | 5 alanın her birinden eşleşme |
| SRCH-T-010 | Activity log append | Yeni yazı searchable |
| SRCH-T-011 | Document version geçmişi | Eski sürüm bağımsız hit olarak dönmez |
| SRCH-T-012 | Deleted registry | Registry tombstone hit gizler |
| SRCH-T-013 | FTS integrity-check | Normal corpus geçer |
| SRCH-T-014 | FTS bozulma simülasyonu | Doğru hata; veri korunur |
| SRCH-T-015 | Rebuild 1000 row | Sonuç fingerprint'ı eşit |
| SRCH-T-016 | Rebuild rollback | Eski projeksiyon tutarlı kalır |
| SRCH-T-017 | WAL ve restart | Son commit aranabilir |
| SRCH-T-018 | Transaction rollback | Kaydedilmemiş içerik indexte yok |
| SRCH-T-019 | Cross-workspace path | Başka DB/project erişimi yok |
| SRCH-T-020 | Query word | Tam token doğru |
| SRCH-T-021 | Query phrase | Kelime dizisi doğru |
| SRCH-T-022 | İki terim AND | Her ikisi aranır |
| SRCH-T-023 | Prefix >=2 | FTS prefix doğruluğu |
| SRCH-T-024 | Prefix 1 char | `SEARCH_INVALID_PREFIX` |
| SRCH-T-025 | SQL injection string | Prepared parametre; tablo değişmez |
| SRCH-T-026 | FTS expression injection | `OR NOT NEAR` operator olarak çalışmaz |
| SRCH-T-027 | Balanced quotes | Doğru phrase |
| SRCH-T-028 | Unbalanced quotes | Syntax error |
| SRCH-T-029 | Invalid operator | Unknown operator error |
| SRCH-T-030 | Punctuation-only | No accidental full scan/MATCH error |
| SRCH-T-031 | Query >1024 | Bounded validation error |
| SRCH-T-032 | >12 terms | Bounded validation error |
| SRCH-T-033 | `type:` filter | Doğru tür kümesi |
| SRCH-T-034 | types[] intersection | Doğru intersection / empty |
| SRCH-T-035 | projectIds[] scope | Yalnız ilgili projeler |
| SRCH-T-036 | projectIds unauthorized | Red; başka kaynak sızmaz |
| SRCH-T-037 | after/before inclusive days | UTC bounds doğru |
| SRCH-T-038 | DST timezone | Sınırlar bir gün kaymaz |
| SRCH-T-039 | Invalid calendar date | Reddedilir |
| SRCH-T-040 | Duplicate filter | Reddedilir |
| SRCH-T-041 | Empty query | Son kayıtlar, FTS MATCH değil |
| SRCH-T-042 | Filter-only | Index-based list |
| SRCH-T-043 | BM25 ascending | Daha iyi skor önce |
| SRCH-T-044 | Stable tie-break | Aynı fixture aynı sıra |
| SRCH-T-045 | Page size 40/100 | Bound doğru |
| SRCH-T-046 | Cursor filter reuse | Reddedilir |
| SRCH-T-047 | Cursor tampering | MAC reddeder |
| SRCH-T-048 | Cursor stale on commit | Yeniden başlat uyarısı |
| SRCH-T-049 | Cursor stale on rebuild | Yeniden başlat uyarısı |
| SRCH-T-050 | Cursor restart TTL | Reddedilir |
| SRCH-T-051 | Cursor multi-page | Duplicate/missing yok, corpus sabit |
| SRCH-T-052 | HTML/script snippet | Güvenli metin, XSS yok |
| SRCH-T-053 | Unicode offset | Surrogate çift bozulmaz |
| SRCH-T-054 | Max excerpt bytes/codepoints | DTO bounded |
| SRCH-T-055 | Source record moved/deleted after click | Güvenli navigasyon |
| SRCH-T-056 | Turkish I/İ/ı/i matrix | Ölçülen kurala uygun snapshot |
| SRCH-T-057 | Turkish suffix/prefix matrix | Yanlış anlamsal garanti verilmez |
| SRCH-T-058 | Stale requests UI | Yeni sorgu eski sonuçla overwrite olmaz |
| SRCH-T-059 | AI missing/offline | Search eşdeğer ve bağımsız |
| SRCH-T-060 | Large corpus P95 / plan | DOC-31 eşiğine uygun rapor |

### 12.1 Ek güvenlik ve fault-injection koşulları

- FTS `MATCH` ile dengesiz Unicode/emoji/kontrol karakterli giriş SQL hata sızdırmamalı; güvenli ürün hatasına dönmeli.
- Arama sırasında SQLite `BUSY`, I/O hatası, kapalı workspace, eski migration gibi hatalar güvenli, yerelleştirilebilir error envelope ile bildirilir.
- FTS journal/transaction yarıda bırakılırsa uygulama veriyi doğru kurtarmadan "arama hazır" göstermez.
- Aynı başlıklı iki kayıt iki ayrı ID olarak döner, yanlış birleştirilmez.
- Çok uzun Markdown metni küçük query yanıtına bütün gövde olarak taşınmaz.
- Tüm testlerde `AI_ENABLED=false` çalıştırma yolu zorunludur.

---

## 13. Implementation checklist / Definition of Done

- [ ] `DOC-08/09/10/11/12/13/14` sözleşmeleriyle statik eşleme yapıldı.
- [ ] `@iterkeep/search` parser, normalizer, query compiler ve sınırlayıcılar yazıldı.
- [ ] `search.query` Zod input/output gerçek kodu DOC-11 ile eşleştirildi.
- [ ] `search_index + search_fts` trigger'ları kanonik migration'dan kuruldu; şema değiştirilmedi.
- [ ] Sorgu güvenlik filtreleri (workspace, project, registry/tombstone) test edildi.
- [ ] FTS-only ve filter-only sorguların EXPLAIN QUERY PLAN çıktıları kaydedildi.
- [ ] FTS cümle işleme, prefix, Türkçe, quote, operator escaping testleri geçti.
- [ ] Date filtreleri IANA timezone/DST testleri geçti.
- [ ] BM25 ve cursor/keyset entegrasyon testleri geçti; cache invalidation doğrulandı.
- [ ] Snippet güvenli React text render ile işlendi; XSS testleri geçti.
- [ ] `search_rebuild` DOC-12 internal job'ına bağlandı, data-loss testi geçti.
- [ ] API ve index yeniden oluşturma AI kapalıyken de çalıştı.
- [ ] Small/medium/large benchmark ve yerel P50/P95/P99 raporu üretildi.
- [ ] Windows packaged Electron ortamında `better-sqlite3` + FTS5 arama doğrulandı.
- [ ] DOC-04 kalite kapıları için rapor ve sürümler arşivlendi.

Bunlardan herhangi biri tamamlanmadıysa bu belgeye dayanarak feature 'done' ilan edilmez. Geliştirici ajanının görevi özgürce yeni mimari tasarlamak değil, belirtilen sözleşmeleri çalışan kod ve kanıt hâline getirmektir.

---

## 14. Açık mühendislik riskleri ve karar kayıtları

| Risk | Mitigasyon | Karar otoritesi |
|---|---|---|
| Türkçe diacritic ve casing farkları | Gerçek SQLite fixtures; ancak migration ile ikinci indeks | DOC-09 + DOC-15 + ADR |
| Keyset BM25 float/cursor boyutu | SQL integration + query fingerprint + stale detection | DOC-11/15 |
| Date filtreli FTS sorgusu maliyeti | Query-plan karşılaştırma, sorguyu bölme / indeks önerisi | DOC-09/10/31 |
| `domain_events` dışı indeks değişikliği | worker `indexGeneration` ve internal event | DOC-10/12/15 |
| Uzun rebuild'in DB worker'ı meşgul etmesi | Bakım zamanı, transaction maliyeti benchmark | DOC-10/12/31 |
| FTS external-content bozulma senaryoları | Source/FTS integrity check ve kontrollü rebuild | DOC-09/10/15 |
| Fuzzy öneri çok yüksek maliyet | <300 başlık adayı, özelliği opsiyonel tut | DOC-15/31 |
| Markdown'dan HTML injection | text nodes, güvenli snippet boundary | DOC-22/30 |
| Snippet unicode offset uyumsuzluğu | UTF-16 output contract + grapheme-safe truncate | DOC-11/15 |

**Kanonik kararlar:** V1 yeni SQL tablo/indeks yaratmaz; DOC-09 migration kullanılmaya devam edilir. `search.query` dışında yeni public IPC yoktur. Türkçe semantik başarı **henüz doğrulanmış ürün vaadi değildir**. Fuzzy suggestions yalnız ölçüm ve DTO uyumundan sonra açılır.

## 15. Referans kaynaklar

- SQLite resmi FTS5 kılavuzu — tokenizer, MATCH, BM25, snippet, prefix ve external-content: https://www.sqlite.org/fts5.html
- SQLite resmi query planner kaynakları: https://www.sqlite.org/queryplanner.html
- SQLite resmi WAL ve concurrency davranışı: https://www.sqlite.org/wal.html
- SQLite resmi online backup API: https://www.sqlite.org/backup.html
- TypeScript ve Zod doğrulama kuralları: DOC-08 / DOC-11 / DOC-05.

> **Sonraki belge:** `docs/16-IMPORT-EXPORT-GIT.md` — Import/export formatının deterministik gösterimi, manifest/ID eşleştirmesi, Git aktarımı ve çakışma çözümü. DOC-15, yalnız **arama** davranışının kanonik sözleşmesidir.
