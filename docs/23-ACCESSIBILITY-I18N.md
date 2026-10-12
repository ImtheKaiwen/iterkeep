---
document_id: DOC-23
title: "Iterkeep — Erişilebilirlik, Uluslararasılaştırma ve Yerelleştirme Sözleşmesi"
version: "0.1.0"
status: "draft"
last_updated: "2026-10-10"
language: "tr-TR"
owner: "UX Engineering, Accessibility & Localization"
depends_on:
  - "DOC-00"
  - "DOC-02"
  - "DOC-03"
  - "DOC-04"
  - "DOC-05"
  - "DOC-07"
  - "DOC-08"
  - "DOC-09"
  - "DOC-11"
  - "DOC-18"
  - "DOC-19"
  - "DOC-20"
  - "DOC-21"
  - "DOC-22"
next_document: "DOC-24"
---

# Iterkeep — Erişilebilirlik, Uluslararasılaştırma ve Yerelleştirme Sözleşmesi

> **Normatif amaç:** Iterkeep V1'in Türkçe/İngilizce yerelleştirmesini ve WCAG 2.2 AA düzeyini hedefleyen masaüstü erişilebilirlik davranışlarını uygulanabilir, test edilebilir biçimde tanımlamak. Belge; çevrilebilir içerik, biçimlendirme, kullanıcı dil tercihi, klavye, odak, ekran okuyucu, ses/agent erişimi ve CI kabul testleri için ana kaynaktır.
>
> **Yetki:** Dil sözlükleri, çeviri anahtarları, locale çözümleme, tarih/sayı gösterimi, aria/focus/keyboard test matrisi burada kanoniktir. Renk/token değerleri DOC-20, responsive route davranışı DOC-21, bileşen API'leri DOC-22, veritabanı alanları DOC-09, preferences IPC DOC-11, kalite kapıları DOC-04, test ortamı DOC-33 içindir. Bu dosya yeni SQL sütunu veya public IPC kanalı icat etmez.
>
> **Kanıt seviyesi:** Bu bir uygulama sözleşmesidir. Referans React/TypeScript kodlarının Electron altında derlemesi ve NVDA/VoiceOver manuel testleri henüz yapılmamıştır. `status: draft` korunur. WCAG 2.2 AA, hedeflenen uygunluk seviyesidir; bağımsız sertifika iddiası değildir.

---

## 1. Temel ürün kararları (A11Y-D-001–040)

| ID | Kesin karar / kural |
|---|---|
| A11Y-D-001 | V1 arayüz dilleri sadece `tr-TR` ve `en-US`; ilk yeni workspace varsayılanı `tr-TR`. |
| A11Y-D-002 | Kalıcı locale kanonik alanı `workspace_preferences.locale`; ikinci kalıcı kaynak yok. |
| A11Y-D-003 | Kalıcı timezone `workspace_preferences.timezone` IANA biçimindedir; varsayılan `Europe/Istanbul`. |
| A11Y-D-004 | Arayüzde gösterilen yerelleştirilmiş metin hiçbir zaman domain enum'una/SQLite'a yazılmaz. |
| A11Y-D-005 | `i18next` + `react-i18next` ve yerel `tr-TR.json` / `en-US.json` katalogları kullanılır (DOC-05/07). |
| A11Y-D-006 | `tr-TR` ve `en-US` anahtar kümeleri eşit ve placeholder tipleri uyumludur; CI kontrol eder. |
| A11Y-D-007 | UI kaynak kodunda kullanıcıya görünen kalıcı sabit metin yazılmaz; veri olarak girilmiş kullanıcı metni istisnadır. |
| A11Y-D-008 | UI dili değişince form taslakları, CodeMirror geçmişi, route ve agent run'ları kaybolmaz. |
| A11Y-D-009 | Locale değişimi `workspace.updatePreferences({patch:{locale},expectedRevision})` üzerinden CAS yapılır. |
| A11Y-D-010 | Kaydetme başarısızsa kalıcı değer değiştirilmiş gibi gösterilmez; geri alma/açık hata gösterilir. |
| A11Y-D-011 | `Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.RelativeTimeFormat`, `Intl.PluralRules` ve gereken yerde `Intl.Collator` kullanılır. |
| A11Y-D-012 | UTC timestamp kayıtta sabit kalır; sadece gösterim seçilmiş IANA timezone'a bağlıdır. |
| A11Y-D-013 | `YYYY-MM-DD` takvim günü saatli UTC instant gibi otomatik parse edilmez. |
| A11Y-D-014 | Türkçe `I/İ/ı/i` karşılaştırmaları JavaScript'in varsayılan İngilizce dönüşümüne emanet edilmez. |
| A11Y-D-015 | Erişilebilir isim/rol/değerleri görünen etiketle tutarlı ve programatik olarak bulunabilir olmalıdır. |
| A11Y-D-016 | Fare olmadan tüm çekirdek işlevlere, onay ve iptal mekanizmalarına ulaşılır. |
| A11Y-D-017 | Tab sırası mantıklı; pozitif `tabindex` kullanılmaz; disabled/inert alanlar Tab ile erişilemez. |
| A11Y-D-018 | Modal, odağı içeride tutar ve kapanınca mantıklı kaynağa döndürür. |
| A11Y-D-019 | Agent token akışı her token için ekran okuyucu duyurusu üretmez; anlamlı özet/işlem sınırları kullanılır. |
| A11Y-D-020 | Kanban drag-drop tek etkileşim yolu olamaz; klavye ve tıklama alternatifi vardır. |
| A11Y-D-021 | Mikrofon veya TTS kullanılabilirliği, temel yazılı işlevlere erişimin şartı değildir. |
| A11Y-D-022 | Ses kaydı sürerken görsel ve erişilebilir kalıcı gösterge vardır; gizli kayıt başlatılmaz. |
| A11Y-D-023 | Renk tek başına durum iletmez; metin veya uygun ikon/rol eşlik eder. |
| A11Y-D-024 | Gövde metni için ≥4.5:1; büyük metin için ≥3:1; anlamlı UI grafikleri/kontrol sınırları için ≥3:1 kontrast hedefi. |
| A11Y-D-025 | 200% text zoom ve dar pencere kırılmamalı; 400% browser/electron zoom'da yeniden akış ayrıca test edilir. |
| A11Y-D-026 | `prefers-reduced-motion: reduce` ve forced-colors koşullarında kritik etkileşimler kullanılabilir kalır. |
| A11Y-D-027 | Kullanıcı bilgisi veya onayı gereken kritik hata yalnız süreli toast içinde kalmaz. |
| A11Y-D-028 | Bildirimler ve progress uygun semantik rol/ARIA özelliğine sahiptir; çift duyuru yapılmaz. |
| A11Y-D-029 | Klavye kısayolları odak, IME composition, platform ve kullanıcı metin alanı bağlamını gözetir. |
| A11Y-D-030 | Gizli global OS kısayolları kaydedilmez; uygulama içi kısayollar açıkça listelenir. |
| A11Y-D-031 | İngilizce arayüzde kullanıcı tarafından yazılmış Türkçe proje/görev metni çevrilmez. |
| A11Y-D-032 | Model yanıtı ve STT transkripti otomatik UI çevirisine tabi tutulmaz; kaynak dil korunur. |
| A11Y-D-033 | Kişisel veri içeren lokalizasyon verisi/telemetri harici servise gönderilmez. |
| A11Y-D-034 | Kritik eksik çeviri otomatik testte hata; çalışma anındaki fallback kontrollü ve görünürdür. |
| A11Y-D-035 | Erişilebilirlik otomasyonu manuel NVDA/VoiceOver testinin yerine geçmez. |
| A11Y-D-036 | Dinamik liste sanallaştırması semantik sıra/odak/sonuç sayısı bilgisini korur. |
| A11Y-D-037 | Form alanları hata durumunda `aria-invalid`, ilişkili açıklama ve klavye ile düzeltme sağlar. |
| A11Y-D-038 | Destrüktif eylem onaylarında varsayılan odak güvenli seçeneğe gider; Escape onay değildir. |
| A11Y-D-039 | Kullanıcıya önemli bir işlem başarısı yalnız DB commit/receipt sonrası erişilebilir şekilde duyurulur. |
| A11Y-D-040 | Sürüm, kurulum ve recovery ekranları da temel ekranlarla aynı erişilebilirlik standardını karşılar. |

**Kapsam sınırı:** V1 sağdan sola (RTL) dil eklemez. Yine de gereksiz fiziksel `left/right` bağımlılığı azaltılır; ancak V1'de RTL uyumluluğu tamamlandı iddiası yapılmaz. Üçüncü dil veya timezone modeli gerekiyorsa DOC-09 + bu belge + UI sözlükleri kontrollü revize edilir.

## 2. Erişilebilirlik standardı ve kabul yorumu

Referans: WCAG 2.2 W3C Recommendation (`https://www.w3.org/TR/WCAG22/`) ve WAI ARIA Authoring Practices (`https://www.w3.org/WAI/ARIA/apg/`). Desktop uygulaması web teknolojisiyle geliştirildiği için ilgili başarı ölçütleri UI içeriğine uygulanır.

| WCAG kriteri | V1 kontrolü | Kanıt yöntemi |
|---|---|---|
| 1.1.1 Non-text Content A | İkon-only button için erişilebilir ad, dekoratif ikon gizleme | axe + manual SR |
| 1.3.1 Info and Relationships A | Heading, form, table, list doğru semantik | RTL/axe |
| 1.3.2 Meaningful Sequence A | DOM sırası görsel/okuma sırasıyla tutarlı | Keyboard/manual |
| 1.4.1 Use of Color A | Durum yalnız renkle belirtilmez | Visual audit |
| 1.4.3 Contrast (Minimum) AA | Normal metin 4.5:1, büyük 3:1 | Kontrast hesaplayıcı |
| 1.4.4 Resize Text AA | 200% büyütmede içerik ve işlev kaybı yok | E2E screenshot/manual |
| 1.4.10 Reflow AA | 320 CSS px eşdeğeri ve 400% zoom senaryosu; iki-boyutlu düzen gerektiren içerik istisnası dar yorumlanır | E2E/manual |
| 1.4.11 Non-text Contrast AA | Girdi sınırı, odak ve durum işaretleri uygun kontrast | Token analyzer/manual |
| 1.4.12 Text Spacing AA | Özel line/letter/paragraph spacing içerik kesmez | CSS injection test |
| 1.4.13 Content on Hover or Focus AA | Hover-only tooltip focus ve pointer ile erişilir | E2E |
| 2.1.1 Keyboard A | Tüm kritik işlemler keyboard üzerinden | Full keyboard walkthrough |
| 2.1.2 No Keyboard Trap A | Modal dışındaki odak tuzağı yok; modal Escape | Full keyboard walkthrough |
| 2.1.4 Character Key Shortcuts A | Tek karakterli kısayol yok veya güvenli bağlam sınırı | Shortcut tests |
| 2.4.3 Focus Order A | Modal, filtre, Kanban ve form Tab akışı mantıklı | Keyboard/manual |
| 2.4.7 Focus Visible AA | Açık odak göstergesi | Token/visual test |
| 2.4.11 Focus Not Obscured (Minimum) AA | Yapışkan toolbar/footer odaklı öğeyi tamamen örtmez | E2E/manual |
| 2.5.3 Label in Name A | Görünen eylem kelimesi erişilebilir ad içerisinde | RTL/manual |
| 2.5.7 Dragging Movements AA | Drag alternatifleri (single-pointer ve keyboard) | E2E |
| 2.5.8 Target Size (Minimum) AA | Hedef 24×24 CSS px veya WCAG'deki geçerli istisna | Geometry audit |
| 3.1.1 Language of Page A | `html.lang` doğru (`tr-TR` veya `en-US`) | DOM assertions |
| 3.1.2 Language of Parts AA | Başka dilde belirgin içerik `lang` ile işaretlenir, uygun istisnalar korunur | Manual |
| 3.2.2 On Input A | Tek seçim beklenmedik yönlendirme/submit yapmaz | RTL |
| 3.3.1 Error Identification A | Hata alanı ve düzeltme yöntemi metinle belirtilir | RTL |
| 3.3.2 Labels or Instructions A | Alan adları/format açıklamaları | RTL |
| 4.1.2 Name, Role, Value A | Custom widget'lar doğru ARIA/HTML rolü | axe/manual |
| 4.1.3 Status Messages AA | Başarı/progress/hata odak çalmadan duyurulur | SR test |

**Not:** WCAG'nin AAA maddeleri V1 zorunluluğu sayılmaz. Ürün iç hedef olarak 44×44 CSS px rahat hit area kullanabilir; WCAG 2.2 AA 2.5.8'in 24×24 ve istisnalarıyla 44'ü aynı şeymiş gibi anlatılmaz. 4.1.1 Parsing kriteri WCAG 2.2'de kaldırılmıştır; HTML doğruluğu ve hatasız DOM yine mühendislik gereksinimidir.

## 3. Locale ve timezone kaynakları

1. Yeni kullanıcı ilk kuruluma girerken DB varsayılan locale `tr-TR`, timezone `Europe/Istanbul` ile oluşturulur; hiçbir yapay zekâ kurulumu gerekmez.
2. Uygulama açılırken DB hazır değilse `tr-TR` katalogu başlangıç fallback'idir. Dil DB'den okunduğunda React/i18next eşzamanlı güncellenir.
3. Workspace switch durumunda önceki workspace locale'i yeniye taşınmaz; yeni `workspace.getPreferences()` sonucu kullanılır.
4. `workspace_preferences` içindeki `locale`, `theme`, `timezone`, `revision` birlikte tek snapshot'tır. Locale değişimi CAS ile yapılır.
5. Locale yalnız UI metni ve gösterim biçimini etkiler; FTS5 arama indeksi veya DB statü alanları dönüştürülmez.
6. Timezone değişimi saklanan `UTC timestamp` ve tarih-only görev günlerini değiştirmez. `due_date` yerel gün semantiğindedir ve ISO `YYYY-MM-DD` olarak kalır; `overdue/today` filtresi seçilen zone'un bugünkü takvim gününe göre değerlendirilir.
7. Saat dilimi listesi IANA doğrulanır; geçersiz/eksik timezone değeri kullanıcıya sorun olarak gösterilir, daha önce doğrulanmış varsayılanla kontrollü fallback yapılır ve DB sessizce mutasyona uğramaz.
8. `Intl.DateTimeFormat` içinde **her zaman** hem `locale` hem `timeZone` açıkça belirtilir. Sistemin varsayılan yerel saatine güvenilmez.
9. Locale ayarı işletim sistemi mikrofon/STT diliyle aynı olmak zorunda değildir; STT dil seçimi DOC-28'de ayrıdır.
10. İçerik dilini otomatik çeviren bir özellik V1 kapsamında yoktur; herhangi bir UI language değişimi proje adı ve Markdown içeriklerini değiştiremez.

## 4. Katalog mimarisi ve kanonik dosya yolları

```text
apps/desktop/src/renderer/
├── locales/
│   ├── tr-TR.json                  # varsayılan; kullanıcı metinleri
│   └── en-US.json                  # key parity zorunlu
├── shared/
│   └── i18n/
│       ├── bootstrap.ts           # i18next init; DB bağımsız fallback
│       ├── locale-controller.ts   # preferences CAS + i18next changeLanguage
│       ├── formatting.ts          # Intl cache + date-only formatter
│       ├── accessibility.ts       # ortak screen reader metin yardımcıları
│       └── translation-types.ts   # türetilen key union/tip güvenliği
├── app/
│   └── ...                         # DOC-07/21 uygulama yönlendirmesi
└── features/
    └── ...                         # yalnız t(...) kullanır

scripts/
└── verify-locales.mjs             # parity/placeholder/plural/accessibility lint

tests/
├── integration/i18n/
├── e2e/accessibility/
└── fixtures/localization/
```

DOC-07'de tanımlanmamış olan `shared/i18n` alt klasörü, mevcut `shared/` altında yeni **yardımcı dosyalar** olarak eklenir; yeni workspace/paket ve ayrı veritabanı katmanı eklenmez. Bu belge `@iterkeep/ui` içine i18next bağlamı taşınmasını **yasaklar**: genel UI primitive'leri `label`, `aria-label`, `description` gibi hazır çevrilmiş metinleri props'tan alır. Bileşen metninin çevirisi renderer feature/container seviyesinde yapılır.

### 4.1 Translation key isimlendirme

Kök namespace'ler: `common`, `navigation`, `projects`, `tasks`, `documents`, `decisions`, `activity`, `search`, `settings`, `setup`, `models`, `agent`, `voice`, `jobs`, `backup`, `transfer`, `errors`, `a11y`. Her namespace içinde `object.action.state` / `surface.element` şeması uygulanır.

Kurallar:
- Anahtar adları İngilizce ASCII `camelCase` parçaları ile tanımlanır; `t(dynamicPrefix + status)` yasaktır. Gereken enum mapping statik, exhaustive nesnede tutulur.
- Çeviri değerleri sade metin; geliştirici kaynaklı zengin biçim gerektiren yerlerde güvenli `Trans` bileşeni, sabit etiket allowlist'i; HTML işlenmez.
- Gerçek içerik/parola/file path/ID çeviriye eklenmeden önce sınırda doğrulanır; interpolasyon ile HTML markup render edilmez.
- Aynı kelimenin bağlama göre farklı anlamları için farklı key kullanılır: `common.close` ve `agent.run.stop` ayrı anlam taşır.
- Değişkenler `{{count}}`, `{{name}}`, `{{date}}` şeklindedir; her locale'de aynı placeholder isimleri bulunur.
- İngilizce tekil/çoğul ve Türkçe mesaj varyantları i18next plural resolver ile üretilir; sabit `count === 1 ? trA : trB` ifadeleri feature'a dağılmaz.
- Çeviri metinleri içinde güvenlik izni/agent tool adı anlamsal olarak değiştirilemez: kullanıcıya görünür çevrilmiş label ayrı, stabil enum sabittir.

### 4.2 Başlangıç katalogu (`tr-TR.json`)

Aşağıdaki blok **başlangıç zorunlu anahtarlarının referans örneği**dir; tüm ürün metinleri tamamlandığında eksik anahtar kalmamalıdır. Bu dosyaya sözlük olarak eklenmeli, eski kaynakla çakışan key varsa içerik merkezi katalogda birleştirilmelidir.

```json
{
  "common": {
    "save": "Kaydet", "cancel": "Vazgeç", "close": "Kapat", "delete": "Sil",
    "confirm": "Onayla", "retry": "Yeniden dene", "skip": "Atla",
    "loading": "Yükleniyor…", "saved": "Kaydedildi", "saving": "Kaydediliyor…",
    "saveFailed": "Kaydetme başarısız. Değişiklikler henüz diske yazılmadı.",
    "noResults": "Sonuç bulunamadı", "unavailable": "Kullanılamıyor"
  },
  "navigation": {
    "home": "Ana sayfa", "inbox": "Gelen kutusu", "projects": "Projeler",
    "tasks": "Görevler", "search": "Ara", "chat": "Agent", "settings": "Ayarlar",
    "skipToContent": "Ana içeriğe geç", "goBack": "Geri dön"
  },
  "tasks": {
    "new": "Yeni görev", "markDone": "Görevi tamamla", "reopen": "Görevi yeniden aç",
    "status": {"todo": "Yapılacak", "inProgress": "Devam ediyor", "blocked": "Engellendi", "done": "Tamamlandı", "cancelled": "İptal edildi"},
    "count_one": "{{count}} görev", "count_other": "{{count}} görev",
    "moveTo": "{{status}} sütununa taşı"
  },
  "settings": {
    "language": "Dil", "timezone": "Saat dilimi", "theme": "Tema",
    "languageSaved": "Dil tercihi kaydedildi", "languageFailed": "Dil kaydedilemedi; önceki tercih korundu"
  },
  "setup": {
    "title": "Iterkeep kurulumu", "aiOptional": "Yapay zekâ isteğe bağlıdır",
    "skipAi": "Yapay zekâ olmadan devam et", "complete": "Kurulumu tamamla"
  },
  "agent": {"approve": "İşlemi onayla", "reject": "Reddet", "working": "Agent çalışıyor", "completed": "Agent işlemi tamamlandı", "failed": "Agent işlemi başarısız oldu"},
  "voice": {"start": "Kaydı başlat", "stop": "Kaydı durdur", "transcript": "Transkript", "permissionDenied": "Mikrofon izni reddedildi"},
  "a11y": {
    "closeDialog": "İletişim penceresini kapat", "opensDialog": "İletişim penceresi açar",
    "taskMoved": "Görev {{status}} sütununa taşındı", "resultsCount": "{{count}} sonuç bulundu",
    "jobProgress": "{{name}}: yüzde {{percent}} tamamlandı", "recording": "Mikrofon kaydı sürüyor",
    "statusUpdated": "Durum güncellendi", "unsavedChanges": "Kaydedilmemiş değişiklikler var"
  },
  "errors": {
    "revisionConflict": "Kayıt başka bir işlem tarafından değiştirildi. Farkları inceleyin.",
    "serviceUnavailable": "Bu özellik şu anda kullanılamıyor. Diğer işlevler çalışmaya devam eder.",
    "generic": "İşlem tamamlanamadı. Yeniden deneyin."
  }
}
```

### 4.3 Başlangıç katalogu (`en-US.json`)

```json
{
  "common": {
    "save": "Save", "cancel": "Cancel", "close": "Close", "delete": "Delete",
    "confirm": "Confirm", "retry": "Retry", "skip": "Skip",
    "loading": "Loading…", "saved": "Saved", "saving": "Saving…",
    "saveFailed": "Save failed. Your changes have not yet been written to disk.",
    "noResults": "No results found", "unavailable": "Unavailable"
  },
  "navigation": {
    "home": "Home", "inbox": "Inbox", "projects": "Projects",
    "tasks": "Tasks", "search": "Search", "chat": "Agent", "settings": "Settings",
    "skipToContent": "Skip to main content", "goBack": "Go back"
  },
  "tasks": {
    "new": "New task", "markDone": "Complete task", "reopen": "Reopen task",
    "status": {"todo": "To do", "inProgress": "In progress", "blocked": "Blocked", "done": "Done", "cancelled": "Cancelled"},
    "count_one": "{{count}} task", "count_other": "{{count}} tasks",
    "moveTo": "Move to {{status}} column"
  },
  "settings": {
    "language": "Language", "timezone": "Time zone", "theme": "Theme",
    "languageSaved": "Language preference saved", "languageFailed": "Language could not be saved; the previous preference was kept"
  },
  "setup": {
    "title": "Set up Iterkeep", "aiOptional": "AI is optional",
    "skipAi": "Continue without AI", "complete": "Finish setup"
  },
  "agent": {"approve": "Approve action", "reject": "Reject", "working": "Agent is running", "completed": "Agent run completed", "failed": "Agent run failed"},
  "voice": {"start": "Start recording", "stop": "Stop recording", "transcript": "Transcript", "permissionDenied": "Microphone access denied"},
  "a11y": {
    "closeDialog": "Close dialog", "opensDialog": "Opens a dialog",
    "taskMoved": "Task moved to {{status}} column", "resultsCount": "{{count}} results found",
    "jobProgress": "{{name}}: {{percent}} percent complete", "recording": "Microphone recording in progress",
    "statusUpdated": "Status updated", "unsavedChanges": "You have unsaved changes"
  },
  "errors": {
    "revisionConflict": "This record changed elsewhere. Review the differences.",
    "serviceUnavailable": "This feature is currently unavailable. Other features still work.",
    "generic": "Could not complete the action. Try again."
  }
}
```

**Dikkat:** `tasks.status.inProgress` yalnız UI anahtarıdır; DB enum'u `in_progress` olmaya devam eder. Diğer domain enum'ları da sözlük anahtarlarına dönüştürülmeden veri tabanında tutulur.

## 5. i18next kurulum sözleşmesi

```ts
// apps/desktop/src/renderer/shared/i18n/bootstrap.ts
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import trTR from '../../locales/tr-TR.json';
import enUS from '../../locales/en-US.json';

export const SUPPORTED_LOCALES = ['tr-TR', 'en-US'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return value === 'tr-TR' || value === 'en-US';
}

export const i18n = i18next.createInstance();

export async function initI18n(): Promise<void> {
  await i18n.use(initReactI18next).init({
    lng: 'tr-TR',
    fallbackLng: 'tr-TR',
    supportedLngs: [...SUPPORTED_LOCALES],
    resources: {
      'tr-TR': { translation: trTR },
      'en-US': { translation: enUS },
    },
    defaultNS: 'translation',
    interpolation: { escapeValue: false }, // React escapes text children; no innerHTML.
    returnNull: false,
    initImmediate: false,
  });
  document.documentElement.lang = 'tr-TR';
  document.documentElement.dir = 'ltr';
}
```

**Güvenlik notu:** `escapeValue:false` yalnız React'in metin interpolasyonunu güvenle escape etmesi beklentisiyle kullanılır; `dangerouslySetInnerHTML` yasaktır. Rich HTML göstermek için sabit ve kontrollü component binding gerekir. Lokal dil dosyaları paket içinde offline yer alır; CDN çağrısı yoktur.

**İşletim notu:** `initImmediate:false` yüklü kaynaklar yerel ve senkron olduğundan kabul edilir; React mount öncesi `initI18n` tamamlanır. `react-i18next` context consumer'ları yalnız i18n aboneliğinde yeniden render olabilir; CodeMirror/editor model/agent run dispose edilmemelidir.

### 5.1 Dil değiştirme ve kalıcı başarı

```ts
// apps/desktop/src/renderer/shared/i18n/locale-controller.ts
import { i18n, isSupportedLocale, type SupportedLocale } from './bootstrap';

type Preferences = {
  locale: SupportedLocale;
  revision: number;
};

export async function persistLocaleChange(
  current: Preferences,
  requested: SupportedLocale,
): Promise<Preferences> {
  if (!isSupportedLocale(requested)) throw new Error('INVALID_LOCALE');
  if (current.locale === requested) return current;

  // Kanonik kayıt önce commit edilir. IPC envelope/result unwrap adaptörü DOC-11'de.
  const updated = await window.iterkeep.workspace.updatePreferences({
    patch: { locale: requested },
    expectedRevision: current.revision,
  });

  // `updated` uygulama facade'ında doğrulanmış Preferences sonucudur.
  // Eğer DOC-11 envelope biçiminde dönüyorsa önce unwrap/validation gerekir.
  await i18n.changeLanguage(updated.locale);
  document.documentElement.lang = updated.locale;
  document.documentElement.dir = 'ltr';
  return { locale: updated.locale, revision: updated.revision };
}
```

API şekli DOC-11'e göre uyarlanır; bu örnekte `window.iterkeep.workspace.updatePreferences` TypeScript facade'ın açılmış sonucu olarak temsil edilmiştir, gerçek Electron `ipcRenderer` doğrudan kullanılmaz. Hata kodu `CONFLICT_REVISION` olduğunda UI yeni preference snapshot'ını getirir; kullanıcının seçimi hâlâ farklıysa yeniden onayla tekrar dener. **Kör CAS retry** yapılmaz.

`changeLanguage` çok nadiren başarısız olursa DB'nin commit'i geri alınmış sayılmaz; görünür hata/tekrar deneme sunulur ve tekrar açılışta DB locale gerçeği okunur. Locale/DOM/i18next atomik tek transaction değildir; bu arıza açıkça ele alınmalıdır. Dil ayarının başarılı kaydı UI durumu ve DOM'un güncellenmesiyle birlikte doğrulanır.

### 5.2 Renderer dışı mesajlar

- Electron Main modal dialog veya tray metni gerekiyorsa native OS diline bırakılmaz; mevcut tercihin doğrulanmış karşılığı kontrollü olarak Main'de sağlanır.
- `@iterkeep/domain` paketinde `t()` çağrısı yoktur.
- Diagnostic/error log'larına çevrilmiş özel kullanıcı metni eklenmez; sabit `errorCode`, `correlationId` ve temiz metadata yazılır.
- Agent'a gönderilen tool/schema enum alanları (`in_progress`, `approved`, `queued` vb.) İngilizce stabil değer olarak kalır; doğal dil prompt'u/yanıtı kullanıcı tercihinden bağımsız olabilir.

## 6. Mesaj doğrulama / sözlük lint kuralları

`verify-locales.mjs` npm root script'i olarak `npm run i18n:check` şeklinde sunulur ve `npm run check` ile CI içinde zorunlu çağrılır.

1. Her iki JSON parse edilir; duplicate key tespiti sıradan `JSON.parse` ile güvenilir değildir. CI'da duplicate JSON anahtarını raporlayan parser veya tokenizer kontrolü olmalıdır.
2. Leaf key path kümeleri eşitlenir; eksik/fazla key hata.
3. Her key için `{{...}}` placeholder kümeleri ve zorunlu `count` değişkeni eşitlenir.
4. i18next plural suffix grupları (`_one`, `_other`) dillerin kurallarına göre kontrol edilir; Türkçe'de en az `other` kapsamı bulunur; İngilizce'de `one` ve `other` zorunludur.
5. Örtük HTML (`<script>`, `<img onerror=...>`) reddedilir; düz metinlerde HTML etiketi kullanılmaz.
6. `\n` kaçışı meşru multiline label ise bilinçli whitelist gerekir; mantıksız `\r` veya control char reddedilir.
7. Boş kullanıcı metni, sonu sadece değişken olan eksik semantik label veya sırf ikon karakteri erişilebilir etiket sayılmaz.
8. Kaynak kod `t('...')` statik key kullanımı varsa kullanılan key catalog'da aranır. Dinamik anahtarları static enum map dışında reddetmek için ESLint custom rule önerilir.
9. `errorCode → i18nKey` explicit exhaustive map ile kontrol edilir; bilinmeyen hata `errors.generic` üzerinden güvenli fallback alır.
10. Çeviri değişikliği tablo/domain değerlerini değiştirmemelidir; migration gerektirmez.

**Örnek açık hata eşleme:**

```ts
export const errorTranslationKey = {
  CONFLICT_REVISION: 'errors.revisionConflict',
  SERVICE_UNAVAILABLE: 'errors.serviceUnavailable',
} as const;

export function resolveErrorKey(code: string): string {
  return Object.hasOwn(errorTranslationKey, code)
    ? errorTranslationKey[code as keyof typeof errorTranslationKey]
    : 'errors.generic';
}
```

Bu küçük örnek tüm gerçek DOC-11 hata kataloğunu kapsamaz. Uygulamada DOC-11'in bütün error kodları için exhaustive mapping veya fallback testi yazılacaktır.

## 7. Tarih, saat, takvim günü ve timezone

### 7.1 Üç ayrı kavram

| Veri | Örnek | Anlam | İzinli işlem |
|---|---|---|---|
| UTC instant | `2026-10-10T12:30:00.000Z` | Gerçek zaman noktası | `Intl.DateTimeFormat` ile locale+zone göster |
| Date-only | `2026-10-10` | Takvim günü, saat dilimi taşımaz | Parçalayarak takvim bileşeni kullan |
| Relative label | `3 gün önce` | Gösterim türevi | `Intl.RelativeTimeFormat` ile güncelle |

**Yasak örnek:** `new Date('2026-10-10').toLocaleDateString()` kullanarak task due gününü UI timezone'una göre rastgele bir gün ileri/geri taşıma. Date-only değer açık `(y,m,d)` takvim tuple'ıdır. Gün farkı/sıralama için UTC midnight helper'ı yalnız *takvim aritmetiği* amacıyla kullanılabilir; bu bir olay instant'ı sanılmamalıdır.

### 7.2 Formatter cache referansı

```ts
// shared/i18n/formatting.ts
import type { SupportedLocale } from './bootstrap';

const formatters = new Map<string, Intl.DateTimeFormat>();

export function formatInstant(
  instantIsoUtc: string,
  locale: SupportedLocale,
  timeZone: string,
): string {
  const key = JSON.stringify([locale, timeZone, 'medium', 'short']);
  let fmt = formatters.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, {
      timeZone, dateStyle: 'medium', timeStyle: 'short',
    });
    // V1 kısıtlı zone/locale kombinasyonları; büyürse LRU üst sınırı ekle.
    formatters.set(key, fmt);
  }
  const instant = new Date(instantIsoUtc);
  if (!Number.isFinite(instant.getTime())) throw new Error('INVALID_INSTANT');
  return fmt.format(instant);
}

export function parseDateOnly(value: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('INVALID_DATE_ONLY');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(0);
  utc.setUTCFullYear(year, month - 1, day);
  utc.setUTCHours(0, 0, 0, 0);
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) {
    throw new Error('INVALID_DATE_ONLY');
  }
  return { year, month, day };
}
```

Göz önünde bulundurulacak nokta: `parseDateOnly` yıl 0–99 davranışını `setUTCFullYear` üzerinden açık kontrolle ele alır; V1 ürün tarih aralığı domain validator'da ayrıca sınırlandırılabilir. Sistemin `Date()` yerel timezone varsayımı kullanılmaz.

### 7.3 Saat dilimi değişimi ve DST senaryosu

- `Europe/Istanbul`, `America/New_York`, `Europe/Berlin` ile manuel test fixture'ı.
- Aynı timestamp farklı gösterilebilir; veritabanı UTC sütunu değişmemeli.
- DST geçişindeki “02:30 var mı?” sorusu tek başına kullanıcı girdisi değil; V1 yalnız date-only due kullanır. Olay gösterimlerinde IANA zone kullanılır.
- Bugün/gecikmiş hesapları kullanıcı timezone'unun **günün** değerinden türetilir; `Date.now()` milisaniye eşitliğiyle keyfî 24 saat sınırı kullanılmaz.
- Kullanıcının takvim tarihini görsel biçimi locale'e bağlıdır ancak düzenlenebilir tarih girişinde ISO kuralıyla tutarlı parser/formatter kullanılır.
- Relative time metni sabit güncelleme aralıklarında yenilenir; arka plan tabı ve saat dilimi değişimi birlikte test edilir. Sürekli `setInterval` ile bütün app repaint edilmez.

## 8. Sayı, dosya boyutu, ilerleme ve çoğul kuralları

| Veri | Biçim | Örnek / uyarı |
|---|---|---|
| Görev sayısı | `Intl.NumberFormat(locale)` + localized count | `1 görev`, `2 tasks` |
| Yüzde | `Intl.NumberFormat(...,{style:'percent'})` | 0–1 oranına dikkat; API 0–100 ise önce /100 |
| Disk boyutu | `Intl.NumberFormat` + açık MB/MiB birimi | 1 MiB = 1,048,576 byte |
| Dosya indirilen byte | sayısal değer + ölçü birimi | Duyurularda `%` ile byte karışmaz |
| Süre | Yerelleştirilmiş integer + seconds/minutes key | Her yerde `s` veya `m` sabit basılmaz |
| Decimal | `Intl.NumberFormat(locale)` | `1,5` vs `1.5` UI gösterimi, API numeric aynen kalır |
| Filtre/sıralama | İlgili locale veya açık case-folding | Sıralama kullanıcıya görünür; DB stabil tie-break `id` |

Performans için `Intl.*` nesneleri her liste satırında yeniden oluşturulmaz; locale+timeZone+options anahtarıyla sınırlı cache gerekir. Büyük listelerde eager tüm formatları üretmek yerine görünür öğelerde hesaplanır.

## 9. Türkçe metin ve arama sınırı

`i18n` görüntüleme dili, `DOC-15` arama indeksinin dilsel kararlarını değiştiremez. Arama normalize/tokenizer semantiği **DOC-15 yetki alanıdır.** Burada UI tarafı için:

```ts
const trSort = new Intl.Collator('tr-TR', { sensitivity: 'base', numeric: true });
const enSort = new Intl.Collator('en-US', { sensitivity: 'base', numeric: true });
const toTurkishLower = (input: string) => input.toLocaleLowerCase('tr-TR');

// NOT: Locale-aware UI sıralama, FTS5 indeks semantiği ile aynı değildir.
```

- `I` → `ı`, `İ` → `i` kontrol fixture'ı zorunlu; `toLowerCase()` farklı davranabilir.
- Database fuzzy/FTS sıralama kuralları DOC-15'te; frontend yeniden bağımsız sıralayıp sayfalama cursor'ını bozamaz.
- Kullanıcı girdisi (proje adı, karar gerekçesi, chat) yerelleştirilmez; yalnız UI denetim metni çevrilir.
- İçerik farklı dilde yazılmışsa, mümkün olduğunda `<span lang="...">` ile bu bilgi açık işaretlenebilir; otomatik dil tahmini zorunlu tutulmaz ve özel içeriği herhangi bir bulut servisine göndermez.

## 10. HTML semantiği, landmark ve sayfa başlıkları

- Bir ekranda bir ana `main` landmark vardır; global ana gezinme `nav aria-label={t('navigation.projects')}` gibi benzersiz anlamlı ad taşır (gerçek alan etiketi bağlamla uyumlu seçilir).
- Uygulama başlığı ve seçili proje heading hiyerarşisi `<h1>...<h2>...` düzeninde tutulur. Görsel font büyüklüğü h1/h2 yerini almaz.
- Route değişiminde `document.title` yeni ekran/proje adıyla güncellenir; kullanıcı içerik metni olduğu gibi kalır.
- Ekrana atlama bağlantısı keyboard focus ile erişilebilir; görünmez pozisyonu odak alınca viewport'a çıkar.
- Logo/dekoratif simgeler için `aria-hidden="true"`; durum taşıyan ikonlar erişilebilir açıklama alır.
- `role="button"` kullanılan div yerine önce gerçek `button` tercih edilir. Form etiketi gerçek `label htmlFor` ile input ID'sine bağlanır.
- Tooltip düğmenin tek ismi değildir; icon-only button için `aria-label` veya görünür sr-only metin vardır.
- Link, navigasyon; button ise eylemdir. İç içe interaktif kontroller (button içinde button) yasaktır.
- Modal açıkken arka plandaki section sadece görsel değil, odak ve erişim açısından da pasif olmalıdır.
- Liste sanallaştırma sırasında DOM'a yansımayan öğelere dair toplam sayı ve konum bilgisi erişilebilir metinle verilir.

## 11. Focus manager ve route lifecycle

### 11.1 Navigasyon odak davranışı

1. Uygulama ilk kullanılabilir olduğunda ana başlık veya ilk anlamlı etkileşim odağa alınır (kullanıcının daha önce bir alana odaklandığı sırada zorla taşınmaz).
2. Sidebar → proje açılışında route başlığı `tabIndex={-1}` üzerinden odaklanabilir; başlık DOM'da var olduğunda odak aktarılır.
3. Liste → detay → geri akışında daha önceki satır hâlâ mevcutsa odağa geri döner; yoksa en yakın mantıklı kontrol seçilir.
4. Filtre uygularken input odaklanmışsa yalnız sonuç sayısı değişti diye input'tan focus alınmaz.
5. Arama sonuç ekranında yeni sonuç geldiğinde `aria-live` sayıyı duyurur, klavye odağı otomatik ilk satıra atlamaz.
6. Kaydetme başarısında focus korunur. Hata durumunda `aria-live` mesajı; kullanıcı “hataya git” derse hatalı alana explicit focus.
7. Route yükleme skeleton'u sürekli focus/ARIA duyurusu tekrarlamaz; gecikme uzarsa bir defalık yükleme durumu sunulur.
8. Derin linkte bulunamayan kayıtta fallback başlığına focus verilir ve neden erişilemediği söylenir.
9. Yazım sırasında kullanıcı isteği olmadan otomatik scroll, focus ya da modal açılması yasaktır.
10. Agent paneli açılınca composer'a otomatik focus yalnız açık kullanıcı etkileşiminde; arka plan event'i focus çalamaz.

### 11.2 Modal, popover ve onaylar

- Radix Dialog primitive kullanılarak `aria-modal`, heading ve odak kapanı uygulanır; `DOC-22` API'si temel alınır.
- Modal açılışında uzun ve kritik metinde başlık (`tabindex=-1`) initial focus alır; büyük riskli işlemde tehlikeli onay tuşuna otomatik focus verilmez.
- `Escape` güvenli iptal/kapatma eylemidir. Veri kaybına yol açabilecek unsaved draft varsa doğrudan kapatmak yerine guard devreye girer.
- Modal kapanınca tetikleyen kontrol DOM'daysa focus oraya döner. Silinen satır tetikleyiciyse üst öğenin fallback kontrolü focus alır.
- Modal arkasına Tab kaçışına, scroll-hijacking'e veya üst üste iki `aria-modal=true` etkin pencereye izin verilmez.
- Popover, nested menu ve tooltip kontrolünün açılma biçimi doğru role/pattern kullanır; escape stack yalnız en üst erişilebilir katmanı kapatır.
- Asenkron onay diyalogları action tamamlanınca durum değiştirebilir; bitmeyen iş “başarılı” gösterilmez.

### 11.3 Focus outline kontratı

```css
/* DOC-20 semantik tokenları kullanılır; sabit marka rengi uydurulmaz. */
:where(button, a, input, textarea, select, [tabindex]):focus-visible {
  outline: 2px solid var(--ik-color-focus);
  outline-offset: 2px;
}

@media (forced-colors: active) {
  :where(button, a, input, textarea, select, [tabindex]):focus-visible {
    outline: 2px solid Highlight;
  }
}
```

CSS'de `--ik-color-focus` **DOC-20'deki gerçek token adıyla** değiştirilmelidir. DOC-20'de başka isim varsa yeni paralel token yaratılamaz. Normal tıklama ile `:focus-visible` görünmesi tarayıcı heuristiğine bağlı olabilir; keyboard hedefi mutlaka görünürdür.

## 12. Klavye sözleşmeleri

| Yüzey | Kısayol / hareket | Beklenen davranış |
|---|---|---|
| Tüm UI | `Tab` / `Shift+Tab` | Mantıklı odak sırası; hiçbir core kontrol atlanmaz |
| Tüm UI | `Escape` | En üst dismissible katmanı kapat; veri kaybını engelle |
| Command Palette | `Ctrl/Cmd+K` | Arama/komut menüsünü aç; repeat basım yeni instance açmaz |
| Quick Capture | `Ctrl/Cmd+Shift+N` | Inbox yeni görev; editör içinde yazı bağlamı korunur |
| Markdown editör | `Ctrl/Cmd+S` | İlgili notu kaydet; browser save dialog açılmaz |
| Button | `Enter` veya `Space` | Native button davranışı |
| Checkbox | `Space` | Checked değişir |
| Tabs | `ArrowLeft/ArrowRight` | Roving focus; automatic activation yalnız anlık render edilebiliyorsa |
| Listbox/Combobox | `ArrowUp/Down`, `Enter`, `Escape` | APG standardı; tek bir tasarım sistemi primitive'i |
| Modal | `Tab`/`Shift+Tab` | Modal içi odak döngüsü |
| Kanban | Select → durum seç / taşı | Drag yapmadan görev taşınır |
| Long list | `Home/End`, `PageUp/PageDown` | Kullanılan widget pattern'ine ve görünür veri aralığına uygun |

`event.isComposing === true` veya `compositionstart..compositionend` aralığında editörden kaynaklı kısayollar bloke edilir. Kısayol yöneticisi input/textarea/contenteditable ve CodeMirror davranışlarını ayırt eder. `Ctrl+K` gibi uygulama kısayolu bile input bağlamında istenen davranışı açıkça test eder, tek karakter kısayolu V1 kapsamına girmez.

Keyboard event handler `e.key` ve `e.code` karışıklığını bilinçli çözer: kullanıcının klavye düzenindeki karakter için `key`, fiziksel klavye tuşu için `code`; V1 komutları `key` temellidir. Shortcut etiketleri Windows/Linux `Ctrl`, macOS `Cmd` biçiminde locale ile gösterilir.

## 13. Projeler, Inbox ve Kanban erişilebilirliği

- `ProjectCard` kartı tek büyük clickable `div` değil; net bir link/düğme etkileşimine sahip olur. Menü eylemleri link içine gömülmez.
- Inbox açıklaması, yeni görevin nereye gideceğini açıkça bildirir; global quick capture yanlış projeye yazmaz.
- Görev satırı checkbox, başlık linki, priority ve durum kontrollerinin erişilebilir isimleri ayrıdır.
- Aynı adlı görevlerde ekran okuyucu ismi proje veya ek bağlamla ayrıştırılabilir.
- 5 Kanban sütununun başlığı heading, öğe sayısı statü metni olarak bulunur; `aria-label` içinde ham enum gösterilmez.
- Card sürükle-bırak fare için bir kolaylıktır; kart eylem menüsünde “Durumu değiştir / Öncesine taşı / Sonrasına taşı” tek tıkla erişilebilir olmalıdır.
- Klavye taşıma sonucu durumu bir defa duyurulur: `a11y.taskMoved` gibi.
- Başarısız veya revision conflict ile reddedilen taşıma geri alınır; ekran okuyucuda başarı duyurulmaz.
- Yatay scroll zorunlu Kanban görünümünde sütunlara keyboard ulaşımı vardır; dar pencerede liste alternatifinden tüm statüler erişilir.
- Virtualized görev listesi total sonuç sayısını, seçili index'i ve sanal sayfalama sınırını duyurur. Öğeye focus varken unmount olmasını önlemek için overscan/focus anchoring gerekir.
- `aria-grabbed` gibi modern kullanımda tavsiye edilmeyen sürükleme özelliklerine güvenilmez; açık metinsel alternatif kullanılır.

## 14. Markdown editörü, seçim ve hata koruması

1. CodeMirror 6 `contenteditable` desteği uygulamanın tek metin giriş katmanıdır; duplicate gizli `<textarea>` ile iki ayrı metin state'i yaratılmaz.
2. Editor için erişilebilir isim vardır: `{{documentTitle}} — Markdown düzenleyici` gibi; başlık yoksa genel “Markdown editörü”.
3. Editör kaydetme durumları `dirty`, `saving`, `saved`, `conflict`, `error` — DOC-22 kayıt semantiğiyle eşleşir; ekran okuyucuya her tuşta “değişti” duyurusu yapılmaz.
4. Autosave başarılı olduğunda yalnız ilk veya anlamlı değişimde sakin `role=status` duyurusu; kaydetme gecikmesinde canlı bölge spam'i yok.
5. `CONFLICT_REVISION`: düzenleme içeriği kaybolmaz; farklılıkları inceleme eylemi keyboard erişilebilir.
6. Markdown preview'ı güvenli HTML render eder; heading/link/list semantiği korunur. Preview'dan editöre dönüşte seçim mümkünse muhafaza edilir.
7. Kod bloklarının yatay scroll'u varsa metin seçimi ve keyboard scroll mümkündür; uzun başlık/bağlantılar ana viewport'u taşırmaz.
8. Editörde `Ctrl/Cmd+S` yakalaması IME sırasında veya ayarlar paneli fokustayken yanlış formu göndermemelidir.
9. Preview markdown içeriğinin `lang` alanını otomatik tahminle değiştirmemelidir.
10. Kullanıcının taslağı locale/tema değişiminde korunmalıdır; zorunlu `key={locale}` remount yapılmaz.

## 15. Arama, command palette ve sonuçlar

- Arama alanı erişilebilir etikete sahiptir; placeholder tek label değildir.
- Sorgu değiştiğinde input focus korunur; sonuçlar `aria-live=polite` ile **throttle/debounce edilmiş** sayı özeti verir.
- İlk yüklemede sıfır sonuç ile henüz aranmamış boş state ayrıdır.
- Sonuçlara klavyeyle ulaşılabilir, `Enter` kaynağın doğrulanmış kaydını açar.
- `highlight` görsel metin parçasıdır; ekran okuyucu sonuçtaki metni parçalanmış tekrarlar halinde dinlememeli.
- Arama skorları ve kararsız sıralama kaynaklı otomatik focus değişimi yasaktır.
- Command Palette, APG combobox/listbox desenine göre adlandırılır; `aria-activedescendant`/roving focus kuralı tutarlı seçilir.
- Sorgu “geçen ay” gibi doğal dille yazılırsa AI yokken arayüz sahte anlamsal yorum yaptığını iddia etmez; DOC-15 arama davranışını açıklar.

## 16. Agent Chat, araç çağrıları ve onaylar

### 16.1 Sohbet alanı

- Sohbet mesaj geçmişi bir `role=log` veya semantik ordered list olarak sunulur; her streaming token canlı duyuruya dönüşmez.
- Kullanıcının mesaj alanında görünen metin ve gönderme düğmesi açık isimlidir; `Enter` gönderme/`Shift+Enter` satır değiştirme davranışı konfigürasyon ve görünür yardım ile tutarlı olmalıdır.
- Aktif agent durumu `working`, `awaiting_approval`, `completed`, `failed` gibi stabil domain/job durumlarına göre çevrilir; DB'de lokalize string saklanmaz.
- Araç kartı `Disclosure/Accordion` mantığında klavye ile açılır; tıklanamaz JSON text bloğu temel durum bilgisi yerine geçmez.
- Tool parametrelerinde özel kullanıcı verisi için redaction DOC-27/30 politikasından gelir; a11y label'ları bu sınırı delmez.
- “Durdur” işi iptal isteğidir; tamamlandığı kanıtlanmadan “iptal edildi” denmez.
- Bildirimler yalnız değişen **anlamlı olayları** duyurur: işlem başladı, kullanıcı onayı gerekli, işlem tamamlandı/başarısız.
- Streaming yarıda kaldığında mevcut tamamlanmış mesaj içeriği kullanılabilir; otomatik TTS tetiklenmez.

### 16.2 Onay penceresi

| Eylem | İlk focus | Duyurulacak etki | Kapanış |
|---|---|---|---|
| Agent görev ekleme önizlemesi | Güvenli başlık veya Vazgeç | Hedef proje + görev metni + izin türü | Vazgeç/Onay sonrası tetikleyiciye dön |
| Toplu silme | Başlık/Vazgeç | Kayıt sayısı ve geri alma kapsamı | Escape = reddet |
| Git push | Başlık/Vazgeç | Hedef repo/branch ve ağ transferi | Commit yapılmış gibi gösterme |
| Restore | Başlık/Vazgeç | Değişecek workspace ve eski verinin korunması | Confirm sonrası job görünür |

Modal içindeki açıklama uzun ise `aria-describedby` ile tüm açıklama tek uzun cümle halinde okutulmaz; heading'e odak verilir, kullanıcı içerikte dolaşabilir. `approve` butonu keyboard tarafından yanlış tetiklenmeyecek şekilde doğrulanır.

## 17. Sesli kayıt, transkript ve TTS

- Mikrofon yalnız açık kullanıcı eylemiyle başlar; salt `voice.getStatus()` mikrofon izni istemez veya kayıt başlatmaz.
- Kayıt başladığında görünen kayıt durumu ve erişilebilir metin kalıcıdır; ekran okuyucuya tek defalık başlangıç duyurusu yapılır.
- Kayıt durdurma düğmesi klavyeyle ulaşılır; tekrar basma mantığıyla aynı sonuç.
- Recording sırasında sesi dinlemenin mümkün olmaması soruna yol açmamalı; görsel durum tek bilgi kaynağı değildir.
- Transkript önce düzenlenebilir alanda gösterilir, yanlış yazılan kelime kullanıcı tarafından düzeltilir; “görev olarak kaydet” ayrı onay eylemidir.
- STT yoksa metin giriş alanı her zaman kullanılabilir; mikrofon kontrolü disabled veya isteğe bağlı setup CTA'sı ile açıklanır.
- TTS yoksa agent/chat metni okunabilir; TTS otomatik ses çıkışı kullanıcı tercihi olmadan başlatılmaz.
- TTS playback için oynat/duraklat/durdur, durum bilgisi ve transcript eşleniği; basit metin yanıtı zaten transcript rolü görür.
- `prefers-reduced-motion` dalga şekli animasyonlarını azaltır; kayıt göstergesi yalnız hareketli waveform değildir.
- İçerik/dil kayması nedeniyle Voice STT sonucu locale değişimiyle değiştirilmez; STT dil ayarı DOC-28 sorumluluğu.

## 18. Kurulum, sistem sağlığı, modal ve recovery

- 6 adımlı Setup Wizard `ol` veya semantik progress göstergesi ile adım konumunu ifade eder.
- İsteğe bağlı AI adımı doğrudan “Atla” düğmesi sunar. Atlamak bir hata gibi duyurulmaz.
- Ollama algılama `aria-busy`/status ile bildirilir; uzun tarama sırasında keyboard bloke edilmez.
- Model kartındaki indir düğmesi model adı ve tahmini disk boyutuyla erişilebilir şekilde adlandırılır.
- İndirmenin ilerlemesi gerektiğinde progressbar `aria-valuenow/min/max` içerir; belirsiz progress'te sahte yüzde gösterilmez.
- Model indirme başarısızlığında hata yanında “Yeniden dene”, “Atla”, “Ayarları aç” alternatifleri.
- System Health `healthy`, `degraded`, `unavailable`, `disabled` durumlarını yalnız yeşil/kırmızıyla göstermez.
- Migration ve Recovery ekranı diğer ekranlardan **daha az** erişilebilir olmamalıdır; hata veya kurtarma seçimi keyboard ile tamamlanır.
- Restore ve Git push onayları otomatik timeout ile tehlikeli onay vermez.
- Sistem uyarısı kapanınca açıklama mesajı erişilebilir geçmiş/job detayında kalır; süreli toast kaybolması bilgi kaybı üretmez.

## 19. Live region, bildirim ve ekran okuyucu gürültüsü

| Mesaj türü | Rol | Olay zamanı | Sıklık |
|---|---|---|---|
| Görev DB commit başarılı | `role=status` | Commit/receipt alındığında | Tek sefer |
| Autosave kaydedildi | `role=status` | Uygun aralık/önemli state | Throttle |
| Hatalı form | İlgili `aria-describedby`; gerekirse `alert` | Submit doğrulama hatası | Tek sefer |
| Job progress | `role=status` veya `progressbar` | Anlamlı eşiklerde | Coalesce; her byte değil |
| Agent token | Canlı duyuru yok | Token üretimi | Sonuç/özet düzeyinde duyur |
| Agent onay istiyor | `alertdialog` | Kullanıcı eylemi gerektiğinde | Tek sefer + kalıcı |
| Arama sonuç sayısı | `role=status` | Debounce sonrası | Tek sefer/sorgu |
| Mikrofon kaydı | `role=status` | Başladı/durdu | Tek sefer |
| Kritik disk/DB hatası | `role=alert` + kalıcı hata alanı | Kullanıcının müdahalesi gerektiğinde | Tek sefer |

`aria-live=assertive` varsayılan değildir; yoğun akan log veya sohbet güncellemelerinde `polite` ya da hiç canlı duyuru kullanılmaz. Başlangıçta boş live region DOM'da bulunur; yeni mesaj yalnız doğru işlemden sonra metin olarak eklenir. Canlı bölge gizli `display:none` yapılamaz; görsel olarak gizlemek için uygun sr-only kuralı kullanılabilir.

## 20. Zoom, overflow, reduced motion ve forced colors

- Dar Electron penceresinde ana içerik genişliği sınırlanır; sidebar ve agent paneli DOC-21 breakpoint'leriyle collapse edilir.
- En uzun `en-US`/`tr-TR` etiketleri ve 200% zoom birlikte test edilir. Ellipsis yalnız ek açıklaması erişilebilir olan ikincil görsel alanlarda kullanılabilir.
- Kontrollerin etiketleri scale olur; 14px altına zorlayan `transform:scale()` ile sahte zoom yapılmaz.
- UI özel fontu yokken fallback fontlarla aynı düzen çalışır. Tasarım gölgesi ve border yalnızca dekoratifse görmezden gelinir.
- `prefers-reduced-motion:reduce` durumunda süreli animasyon (shimmer, bouncing icon, sayfa transition) azaltılır; yüklenme metinsel durumla gösterilir.
- Forced-colors sistem renklerini devre dışı bırakan global kural uygulanmaz; focus, hata ve selected indicator kontrastı doğrulanır.
- Scroll yalnız pointer wheel'e bağımlı değildir; odağı olan scroll container klavyeyle kullanılabilir.
- Tıklanabilir hedef ölçüleri DOC-20 tokenları ve WCAG 2.2 istisnaları ile test edilir; küçük icon-only controls çevresinde yeterli alan gerekir.
- Yüksek DPI / 125–200% OS scaling ile Electron pencere zoom'unun birleşimi UI'nın yanlış varsayımlarla kırılmamasına dair smoke test gerektirir.

## 21. Güvenlik ve gizlilik ile etkileşim

1. Çeviri dizeleri dosya/URL/komut olarak yorumlanmaz. Kullanıcı içerikleri interpolasyon sırasında HTML olarak çalıştırılmaz.
2. Dialog erişilebilir metni kullanıcıya gerçek etkiyi açıklar ancak ham API token/kimlik/parola dökmez.
3. Diagnostik için otomatik screen reader konuşma logu veya kullanıcı ekran metni kaydı yapılmaz.
4. Yapay zekâ modeli yokken ekran okuyucu aracılığıyla core notlar/projeler kullanılmaya devam eder.
5. Clipboard, ses, file picker gibi OS izinleri kullanıcıya açıkça ifade edilir; izin reddi UI'yı kilitlemez.
6. Kullanıcının girdisi Türkçe olduğu için bulut çeviri servisine otomatik gönderilmez.
7. Accessible name'de gizli veya farklı anlamlı onay metni kullanmak güvenlik sorunudur; görünen etiketle isim tutarlı olmalıdır.
8. Fallback dilin devreye girdiği kritik recovery/onay akışında kullanıcı boş buton veya makine kodu görmemelidir.

## 22. Test ortamları ve manuel matris

| Platform | Ekran okuyucu | Test katmanı | V1 karar |
|---|---|---|---|
| Windows 11 | NVDA + Chrome/Electron accessibility tree | Zorunlu manual smoke | İlk dağıtım hedefi |
| Windows 11 | Windows Narrator | Zorunlu manual smoke | OS-native varyasyon |
| macOS (ileriki dağıtım) | VoiceOver | Platform release öncesi zorunlu | macOS release yoksa bloke etmez |
| Linux (ileriki dağıtım) | Orca | Platform release öncesi zorunlu | Linux release yoksa bloke etmez |

Otomatik: Vitest + React Testing Library + `jest-axe` veya `axe-core` / Playwright eklentisi; kullandığımız sürümlerin gerçek Electron webview bağlamında çalışması ilk POC'ta doğrulanır. Test yöntemi DOC-33'e uygun olmalıdır. Axe başarı raporu WCAG 2.2 AA tam uygunluk anlamına **gelmez**.

E2E doğrulaması: Gerçek paketlenmiş Windows build üzerinde, gerçek keyboard input ile odak sırası, modal, Kanban, setup skip, locale/theme/zoom, transfer/backup onayı, ses izin reddi ve agent onay ekranları incelenir. AI/STT/TTS yokken en az bir tam gezinme senaryosu çalıştırılır.

## 23. Uygulanacak test fixture'ları

| Fixture | Amaç | Gereksinim |
|---|---|---|
| `i18n-tr-letters.json` | `I, İ, ı, i` davranışı | Locale-aware normalization |
| `i18n-dates.json` | UTC crossing, leap day, DST, iki timezone | Date-only vs instant |
| `i18n-overflow.json` | 100–300 karakter proje/görev etiketi | Zoom/wrapping |
| `a11y-forms.json` | Geçersiz tarih, boş başlık, eşzamanlı revizyon | Error feedback |
| `a11y-agent-events.json` | Çok sayıda token, araç çıktısı, onay ihtiyacı | Live region noise |
| `a11y-virtualized-tasks.json` | 10.000 görev, fokuslu öğe taşınması | Virtualization |
| `a11y-setup-states.json` | Ollama unavailable, model downloading, skip | Setup ve statuses |
| `a11y-voice-states.json` | Microphone denied, listening, transcribing | Voice text fallback |

Fixtures içinde gerçek kullanıcı verisi bulunmamalı. Tüm ID'ler geçerli UUID v4 biçiminde ve DOC-08 enum'ları ile tutarlı olmalıdır.

## 24. Otomatik erişilebilirlik testleri (`A11Y-T-001–072`)

Aşağıdaki test listesi uygulama ve test ajanı için normatiftir; her test `pass/fail`, CI artefakt yolu ve yürütme ortamıyla raporlanacaktır. Mock geçmesi manuel test gereksinimini kaldırmaz.

| Test ID | Yüzey | Senaryo / beklenen sonuç |
|---|---|---|
| `A11Y-T-001` | Locale | İlk kurulumda `tr-TR` sözlüğüyle Türkçe ekran yüklenir; Ollama bağımlılığı yoktur. |
| `A11Y-T-002` | Locale | Workspace tercihi `en-US` olduğunda başlık ve ayar seçenekleri İngilizce görünür. |
| `A11Y-T-003` | Locale | Ayar değişimi commit edilince DOM `html.lang` yeni locale değerini alır. |
| `A11Y-T-004` | Locale | Locale değişimi için beklenen revision yanlışsa `CONFLICT_REVISION` görünür, DB kaydı bozulmaz. |
| `A11Y-T-005` | Locale | Kayıt başarısızlığında `languageSaved` duyurulmaz, UI yeniden senkronize olur. |
| `A11Y-T-006` | Locale | İki sözlükte tüm leaf key path kümesi eşleşir. |
| `A11Y-T-007` | Locale | İki sözlükte placeholder adları eşleşir; test, eksik `{{status}}` ile fail olur. |
| `A11Y-T-008` | Locale | Duplicate JSON key hata oluşturur; sıradan parse sonucu sessiz kabul edilmez. |
| `A11Y-T-009` | Locale | Çeviri olmayan `t()` key erişimi CI kapısını düşürür. |
| `A11Y-T-010` | Locale | Locale değişimi açık CodeMirror içeriğini ve undo geçmişini sıfırlamaz. |
| `A11Y-T-011` | Locale | Locale değişimi aktif agent run durumunu veya job ilerlemesini sıfırlamaz. |
| `A11Y-T-012` | Locale | İngilizce UI Türkçe görev, not ve transkript metnini otomatik çevirmeden gösterir. |
| `A11Y-T-013` | Locale | Sahte markup içeren çeviri girdisi uygulamada HTML olarak çalışmaz. |
| `A11Y-T-014` | Locale | Bilinmeyen IPC error code anlaşılır genel hata metni üretir; teknik kod istenirse detayda bulunur. |
| `A11Y-T-015` | Locale | Locale değeri `de-DE` gönderildiğinde persist edilmez ve doğrulama hatası döner. |
| `A11Y-T-016` | Tarih | UTC instant her iki locale ile doğru `Intl.DateTimeFormat` çıktısı alır. |
| `A11Y-T-017` | Tarih | Aynı UTC instant iki IANA timezone seçilince farklı gösterim ama aynı kayıt ID/timestamp üretir. |
| `A11Y-T-018` | Tarih | `2026-10-10` date-only timezone dönüşümü yüzünden bir gün geriye düşmez. |
| `A11Y-T-019` | Tarih | Geçersiz `2026-02-30` date-only parser tarafından reddedilir. |
| `A11Y-T-020` | Tarih | Leap day `2028-02-29` geçerli kabul edilir. |
| `A11Y-T-021` | Tarih | DST sınırında today/overdue filtreleri seçilen timezone yerel gününü kullanır. |
| `A11Y-T-022` | Tarih | Yüzde API 0–100 değeri uygun ölçeklendirilerek doğru gösterilir. |
| `A11Y-T-023` | Tarih | Türkçe `I/İ/ı/i` küçük harf fixture sonuçları doğrulanır. |
| `A11Y-T-024` | Tarih | Sıralama `Intl.Collator` ile yapılır ama FTS5 cursor sırası UI tarafından bozulmaz. |
| `A11Y-T-025` | Semantik | Ana route `main` landmark, h1 başlık ve adlandırılmış `nav` sağlar. |
| `A11Y-T-026` | Semantik | Sadece ikon içeren buton erişilebilir isim taşır ve görünen label varsa içerir. |
| `A11Y-T-027` | Semantik | Form etiketi ile input `htmlFor/id` üzerinden bağlıdır; placeholder tek isim değildir. |
| `A11Y-T-028` | Semantik | Tüm dekoratif SVG ikonlar ekran okuyucuda gereksiz nesne olarak görünmez. |
| `A11Y-T-029` | Semantik | Aynı adlı iki görev uygun project context ile ayırt edilebilir. |
| `A11Y-T-030` | Klavye | Global Tab sırası soldan sağa değil DOM anlamlı sıra ile uygundur. |
| `A11Y-T-031` | Klavye | Command Palette `Ctrl/Cmd+K` ile açılır; tekrar basmak ikinci modal yaratmaz. |
| `A11Y-T-032` | Klavye | Quick Capture ile proje seçmeden Inbox görevi açılabilir. |
| `A11Y-T-033` | Klavye | `Ctrl/Cmd+S` sadece ilgili notu kaydeder ve OS save dialog açılmaz. |
| `A11Y-T-034` | Klavye | IME composition sırasında kayıt/komut kısayolu yanlış tetiklenmez. |
| `A11Y-T-035` | Klavye | Modal `Tab` ve `Shift+Tab` odağı kendi içinde tutar. |
| `A11Y-T-036` | Klavye | Modal `Escape` tehlikeli onay değil kapatma/reddetme davranışıdır. |
| `A11Y-T-037` | Klavye | Modal kapanınca tetikleyici varsa odağa geri dönülür. |
| `A11Y-T-038` | Klavye | Tetikleyici silinmişse mantıklı fallback focus seçilir. |
| `A11Y-T-039` | Klavye | Popover Escape sadece üst katmanı kapatır; alt taslak korunur. |
| `A11Y-T-040` | Klavye | Sidebar kapalıyken tüm çekirdek ekranlara klavyeyle erişilir. |
| `A11Y-T-041` | Kanban | Klavye ile kartın durumunu sürüklemeden değiştirmek mümkündür. |
| `A11Y-T-042` | Kanban | Tek-pointer menü ile kart `done` sütununa taşınabilir. |
| `A11Y-T-043` | Kanban | Başarısız taşıma başarı live announcement yapmaz ve önceki pozisyona döner. |
| `A11Y-T-044` | Kanban | 10.000 görevde sanal listede focus kaybolmaz; erişilebilir sayfa/toplam bilgisi sunulur. |
| `A11Y-T-045` | Editör | CodeMirror erişilebilir editör adı sağlar. |
| `A11Y-T-046` | Editör | Autosave sırasında her keypress ekran okuyucu status spam’i üretmez. |
| `A11Y-T-047` | Editör | Revision conflict mesajı ve karşılaştırma düğmesi keyboard erişilebilirdir. |
| `A11Y-T-048` | Editör | Preview Markdown başlık/list/link semantiği ekran okuyucuda görünür. |
| `A11Y-T-049` | Arama | Arama alanında yazarken sonuç yenilemesi focus çalmaz. |
| `A11Y-T-050` | Arama | Arama sonucu sayısı debounce sonrası tek statü bildirimi üretir. |
| `A11Y-T-051` | Arama | Sonuç klavyeyle seçilip geçerli kaynak route açılır. |
| `A11Y-T-052` | Agent | Bir saniyede yüzlerce streaming token ekran okuyucuya ayrı ayrı okutulmaz. |
| `A11Y-T-053` | Agent | Tool çalışıyor/bitti/hata durumları semantik metinle ve log üzerinden erişilir. |
| `A11Y-T-054` | Agent | Riskli tool onay diyaloğu varsayılan olarak onay butonuna focus vermez. |
| `A11Y-T-055` | Agent | Onay reddi tek keyboard eylemiyle sağlanır; job durumu gerçeği izler. |
| `A11Y-T-056` | Agent | Agent chat kapatılıp yeniden açılınca yeni run oluşturulmaz. |
| `A11Y-T-057` | Voice | Mikrofon izni verilmediğinde transkript/editör metin girişi çalışır. |
| `A11Y-T-058` | Voice | Kayıt başladı/durdu olayları ayrı erişilebilir metinle duyurulur. |
| `A11Y-T-059` | Voice | Reduced motion dalga animasyonunu azaltır; kayıt işareti görünür kalır. |
| `A11Y-T-060` | Voice | TTS devre dışı ise metin yanıtı okunabilir ve ses kendiliğinden başlamaz. |
| `A11Y-T-061` | Setup | AI adımı skip edilerek sadece klavyeyle kurulum tamamlanır. |
| `A11Y-T-062` | Setup | Ollama tespit sonucu `unavailable` ise açık yardımcı açıklama vardır. |
| `A11Y-T-063` | Setup | Model indirme progressbar geçerli min/max/value ya da indeterminate durum kullanır. |
| `A11Y-T-064` | Setup | Restore ekranında tehlikeli onay varsayılan odak değildir; açık sonucu anlatır. |
| `A11Y-T-065` | Görsel | Light/dark normal metin min 4.5:1 ve büyük metin 3:1 kontrast sağlar. |
| `A11Y-T-066` | Görsel | Kontrol ve fokus işaretleri WCAG kapsamında en az 3:1 kontrast sağlar. |
| `A11Y-T-067` | Görsel | 200% metin büyütmede önemli kontrol kesilmez veya üst üste binmez. |
| `A11Y-T-068` | Görsel | 400% zoom ve dar pencerede yatay okuma engeli yoktur; izinli istisnalar açık test edilir. |
| `A11Y-T-069` | Görsel | Forced-colors odak halkası sistem rengiyle görünür kalır. |
| `A11Y-T-070` | Görsel | Mouse hover ile çıkan önemli bilgi keyboard focus ile de erişilebilir. |
| `A11Y-T-071` | Görsel | 24×24 CSS px veya geçerli spacing istisnası tıklama hedeflerinde doğrulanır. |
| `A11Y-T-072` | Manuel | Windows 11 NVDA ile uçtan uca çekirdek akış ve agent onayı okunabilir. |

## 25. Test komutları ve kanıt dosyaları

Önerilen npm script sözleşmesi (kanonik uygulama komutları DOC-07/33 ile eşleştirilmeli):

```json
{
  "scripts": {
    "i18n:check": "node scripts/verify-locales.mjs",
    "test:a11y:unit": "vitest run apps/desktop/src/renderer --testNamePattern a11y",
    "test:a11y:e2e": "playwright test tests/e2e/accessibility",
    "check:experience": "npm run i18n:check && npm run test:a11y:unit && npm run test:a11y:e2e"
  }
}
```

Yukarıdaki `vitest --testNamePattern` kullanımının Vitest sürümü ile çalıştığı **uyumluluk POC'unda** doğrulanmalıdır; test discovery için sonradan ayrı config gerekebilir. `npm run test:a11y:e2e` gerçek Electron başlatıcısını kullanan DOC-33 runner'ına bağlanmalıdır. Sadece tarayıcıda açılan web sayfası Electron accessibility testini karşılamaz.

### 25.1 Her CI koşumunda kanıt

```text
.artifacts/
└── accessibility/<run-id>/
    ├── locale-key-parity.json
    ├── locale-placeholder-report.json
    ├── axe-results.json
    ├── keyboard-e2e-results.json
    ├── zoom-200-400-screenshots/
    ├── contrast-results.json
    ├── electron-smoke.json
    └── manual-screen-reader-review.md
```

- `run-id`, commit SHA ve kullanılan Electron/OS bilgisi kanıt metadata'sında yer alır.
- Otomatik koşum yapmadığı NVDA testini `passed` göstermemelidir; `not_run` / `needs_manual` statüsü kullanır.
- Ekran görüntüleri sahte demo/veri fixture'ı içermeli; gerçek kullanıcı notları CI'ya taşınmaz.
- Her failing test ile DOC-04 gate kimliği, ilgili `A11Y-T-###`, ekran/komponent ve sorumlu dosya bağlantısı eşleştirilir.
- P0 blocker: klavyeyle core eylem yapılamaması, onayda yanlış davranış, veri kaybı, erişilemez recovery, boş çeviriyle kaydet/sil işlemi.
- P1 blocker: V1 desteklenen locale'de temel kontrol metni eksikliği, önemli UI kontrast ihlali, modal focus kaçışı, ekran okuyucunun önemli hata/onayı öğrenememesi.
- P2: düşük riskli metinsel çeviri üslubu; kullanıcı işlemini engellemeyen kozmetik farklılıklar. P2 bile yayın notuna ve takip işine kaydedilir.

### 25.2 Manuel kontrol şablonu

```markdown
# A11Y manual review — <commit SHA>
- Platform: Windows 11 / Electron packaged build <version>
- Screen reader: NVDA <version> / Narrator
- Locale: tr-TR + en-US
- Theme: light/dark/system
- Zoom: 100%, 200%, 400%
- Screen resolution / OS scale:
- Walkthrough: Setup → Inbox → Tasks → Notes → Search → Agent approval → Recovery
- Keyboard-only pass: yes/no
- Announcements understandable: yes/no
- Blocking violations: <issue links>
- Reviewer / date / evidence:
```

## 26. Uygulama iş paketleri

| Sıra | Kodlama paketi | Bağımlılık | Çıkış ölçütü |
|---|---|---|---|
| 1 | i18next bootstrap ve lokal JSON katalogları | DOC-05/07 | Offline iki dil yüklenir, parity pass |
| 2 | Preference locale/timezone entegrasyonu | DOC-09/11/19 | Revision CAS, hata ve workspace switch doğru |
| 3 | Intl format yardımcıları + date-only ayrımı | DOC-08/13 | DST, leap day, Türkçe fixture pass |
| 4 | Semantik `@iterkeep/ui` primitive audit | DOC-20/22 | Axe + keyboard primitive tests |
| 5 | Route focus manager ve modal/overlay | DOC-21/22 | Back/forward, dialog focus, fallback tests |
| 6 | Kanban, editor ve arama özel testleri | DOC-13–15/22 | Keyboard+screen reader smoke |
| 7 | Agent, voice ve setup özel erişilebilirlik | DOC-18/24–29 | Yapay zekâ kapalı/var akışlar geçer |
| 8 | E2E zoom, forced-colors ve manuel NVDA | DOC-04/31/33 | Kanıt dosyaları ve release gate pass |

Her pakette tasarım tokenları yalnız DOC-20'den alınır; feature bileşeni kendi başka renk paletini veya `z-index` sistemini oluşturmaz. A11y hataları düzeltilirken bilinçsiz global `tabIndex` ve `aria-live` ekleme yapılmaz; ilgili APG pattern tekrar kontrol edilir.

## 27. Dokümanlar arası izlenebilirlik ve açık kararlar

| Bu dokümanın kararı | Diğer kanonik belge | Uygulama sınırı |
|---|---|---|
| Locale `tr-TR/en-US` | DOC-09 workspace preferences | Yeni sütun yok |
| Locale change IPC | DOC-11 workspace.preferences.update | Yeni kanal yok |
| Theme tokens ve kontrast | DOC-20 | Yeni tema paleti yok |
| Route focus başlangıcı | DOC-21 | Route mantığı yeniden yazılmaz |
| Button/Dialog/Kanban component API | DOC-22 | Bileşen prop'ları değiştirilirse iki belge birlikte revize |
| Search Turkish normalization | DOC-15 | Ayrı FTS tokenizer icat etme |
| Kanban status/priority enums | DOC-08/13 | UI metni enum yerine yazılmaz |
| Voice STT and TTS | DOC-28/29 | AI olmayan kullanıcı bloke olmaz |
| Agent tool/approval | DOC-26/27 | Onay boolean'ı UI'dan serbest yetkiye dönüştürülmez |
| Perf/CI | DOC-04/31/33 | P95 ve gerçek ortam kanıtı gerekir |

**Açık doğrulama ihtiyaçları:**

- [ ] İlk Electron Windows build'de Chromium locale/ICU davranışı ile i18next plural kurallarını test et.
- [ ] Radix Dialog/Popover seçilen sürümünde nested focus + `aria-modal` davranışını gerçek Electron üzerinde doğrula.
- [ ] CodeMirror 6 accessibility tree ve screen reader imleç desteğini gerçek NVDA/Narrator'da doğrula.
- [ ] `@iterkeep/ui` focus ring CSS tokenı DOC-20'deki `--ik-color-focus` ile eşleşsin.
- [ ] Date-only parser ürün tarih aralığı ve year 0000 politikasını DOC-08 validator ile uyumlu kıl.
- [ ] `A11Y-T-072` manuel NVDA koşumunu gerçek kullanıcı testçisiyle değerlendir; otomasyonla otomatik pass verme.
- [ ] Eski `en-US` uygulama metinleri, yeni locale kataloguyla key mismatch oluşturmamalı.

## 28. Definition of Done

Bir özellik için erişilebilirlik ve dil uyumu **tamamlandı** denebilmesi için:

- [ ] Ekranın bütün kullanıcıya görünen sabit metinleri iki katalogda mevcut; parity/placeholder lint geçiyor.
- [ ] Domain enum'ları ve kaynak içerik dil değişince değişmiyor.
- [ ] Mevcut preference akışı kalıcı kayıt/çatışma/güncelleme durumlarını doğru gösteriyor.
- [ ] İlgili ekran/komponent keyboard-only kullanılabiliyor; modal ve focus geri dönüş testleri geçiyor.
- [ ] Temel WCAG 2.2 AA kriterleri ilgili ekran üzerinde otomatik ve manuel olarak değerlendirildi.
- [ ] Dark/light/forced-colors ve 200%/400% zoom'da kritik bilgiler kaybolmuyor.
- [ ] Agent token, job progress, autosave ekran okuyucuda gürültü oluşturmuyor.
- [ ] AI/STT/TTS olmadan core iş akışı sorunsuz tamamlanıyor.
- [ ] Test raporu, commit, makine ve varsa açık istisnalar yazılı durumda.
- [ ] DOC-04 kalite kapıları ve DOC-33 test kayıtları eşleşiyor.

**Bu dokümanın kendi tamamlanma koşulu:** Tüm `A11Y-D-001–040` kuralları, `A11Y-T-001–072` testleri ve örnek katalogun iki locale için geçerli JSON olduğu otomatik incelenmiş olmalıdır. Dokümantasyon kontrolü, gerçek ürünün WCAG uyumunu kanıtlamaz.

## 29. Kaynaklar

- W3C — Web Content Accessibility Guidelines 2.2: https://www.w3.org/TR/WCAG22/
- W3C — WCAG 2.2'de yeni kriterler: https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
- W3C — WAI ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/
- W3C — Modal dialog pattern: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- W3C — `role=log` technique: https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA23.html
- MDN — `Intl.DateTimeFormat`: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat
- MDN — JavaScript internationalization: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Internationalization
- i18next — Introduction: https://www.i18next.com/overview/getting-started
- react-i18next — Introduction: https://react.i18next.com/

---

**Sonraki belge:** `24-LOCAL-AI-ARCHITECTURE.md` — isteğe bağlı yerel agent, sağlayıcı portları, kaynak yönetimi ve yapay zekâ olmadan core çalışmasının normatif mimarisi.
