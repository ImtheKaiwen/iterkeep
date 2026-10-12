---
document_id: DOC-20
title: "Iterkeep — Design Tokens, Tema Motoru ve Görsel Temel Sözleşmesi"
version: "0.1.0"
status: "draft"
last_updated: "2026-10-10"
language: "tr-TR"
owner: "Design System & Desktop UI Architecture"
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
  - "DOC-11"
  - "DOC-18"
  - "DOC-19"
next_document: "DOC-21"
---

# Iterkeep — Design Tokens, Tema Motoru ve Görsel Temel Sözleşmesi

> **Normatif amaç:** Iterkeep'in Windows öncelikli, yerel, performans odaklı masaüstü arayüzünün tüm temel görsel sabitlerini, ışık/karanlık/sistem tema davranışını, CSS/React/Electron entegrasyonunu ve ölçülebilir tasarım kalitesini sabitlemek. Geliştirme ajanı bileşenlere keyfî renk, radius, boşluk, font veya animasyon değeri eklememelidir.
>
> **Yetki sınırı:** Bu belge token **isimleri ve değerleri**, tema çözümleme/başlatma, CSS mimarisi ve temel tasarım invariant'larında tek yetkilidir. Ekran hiyerarşisi/yerleşimi `DOC-21`, bileşen prop'ları ve etkileşimleri `DOC-22`, tam erişilebilirlik/i18n matrisi `DOC-23`, güvenlik `DOC-30`, performans ölçümü `DOC-31`, UI testi `DOC-33` alanına girer. `workspace_preferences.theme` ve IPC yöntemleri **DOC-09/11/19** tarafından tanımlanmıştır; bu belge yeni veritabanı sütunu veya gizli IPC kanalı icat etmez.
>
> **Kanıt seviyesi:** Mimari kararlar, örnek CSS/TypeScript ve hedef testler tanımlanmıştır. Gerçek Windows/macOS/Linux render, Lighthouse/Playwright, görsel regresyon ve ekran okuyucu testleri henüz gerçekleştirilmedi. `status: draft` korunur. Referans kodu doğrudan kopyalanabilir başlangıçtır ancak gerçek repo ve TypeScript derlemesiyle doğrulanmadan `verified` sayılamaz.

## 1. Görsel ürün amacı

Iterkeep işin önüne geçmeyen, zihinsel yükü düşük, hızlı ve güven veren bir araçtır. OpenAI ürünlerinin genel prensipleri (sadelik, boşluk kullanımı, içerik önceliği, sınırlı vurgu) **esin kaynağıdır**; logo, ticari marka, birebir tasarım varlığı veya telifli öğe kopyalanmaz. Kendi özgün ürün kimliği ve adı **Iterkeep** kullanılır.

1. Kullanıcının **içeriği** uygulama kromundan daha yüksek görsel öncelik taşır.
2. Görev, karar, not ve sohbet arasındaki görsel akrabalık aynı token sistemiyle kurulur.
3. Light, dark ve system arasında işlevsel fark yoktur; yalnız tasarım sunumu değişir.
4. Tema, font ve yoğunluk kullanıcının aktif editörünü, seçimini veya form içeriğini silmez.
5. Renk tek başına durum anlatmaz; metin, ikon ve semantik erişilebilir durum da vardır.
6. Uzun süreli yazma ve okumaya uygun, düşük parlama ve yeterli kontrast kullanılır.
7. Ağır bulanıklık, shader, görsel efekt, arka plan videosu ve sürekli dekoratif animasyon yoktur.
8. Kritik durumlar saklanmaz: kaydediliyor, kaydedildi, hata, onay gerekiyor, indirme devam ediyor.
9. Bütün görsel sabitler merkezi sözleşmeden gelir; iki ayrı light/dark component ağacı kurulmaz.
10. AI ve ses modülleri kapalı olsa bile tasarım bütünlüğü korunur.

## 2. Karar kataloğu: `DS-D-001`–`DS-D-036`

| ID | Normatif karar | Kabul edilen uygulama |
|---|---|---|
| DS-D-001 | Kanonik token kaynağı | `packages/ui/src/styles/tokens.css` |
| DS-D-002 | Tema değerleri | `light`, `dark`, `system`; DB enum ile aynı |
| DS-D-003 | Kalıcı tema sahibi | `workspace_preferences.theme`, SQLite; revision/CAS gerekir |
| DS-D-004 | Erken açılış aynası | Main `userData/application-settings.json` içinde minimal tema aynası; DB'ye rakip kaynak değil |
| DS-D-005 | Sistem teması otoritesi | Electron Main `nativeTheme`, `themeSource` ve `updated` |
| DS-D-006 | Render edilen tema | HTML kökünde `data-theme="light" | "dark"`; `system` CSS değerine yazılmaz |
| DS-D-007 | CSS mimarisi | Tailwind CSS 4 + CSS custom properties; `@theme inline` semantik eşleme |
| DS-D-008 | Theme React performansı | CSS değişkeni değişimi; tüm komponentlere `theme` prop geçilmez |
| DS-D-009 | Tema geçişi | Uygulama reload, route reset, store clear veya editor yeniden mount yok |
| DS-D-010 | Varsayılan | Kullanıcı tercihi yoksa `system` |
| DS-D-011 | Renk modeli | Nötr gri tonlar; sınırlandırılmış semantik success/warning/danger/accent |
| DS-D-012 | Anlamlı adlar | `--ik-color-text-primary`; doğrudan `#hex` kullanımına komponentlerde izin yok |
| DS-D-013 | Kontrast | Normal metin hedefi en az 4.5:1; büyük metin ve temel UI durum göstergeleri en az 3:1 |
| DS-D-014 | Focus | Görünür 2px focus ring + ayrışma/offset; klavye kullanıcıları için kaybolmaz |
| DS-D-015 | Font | Varsayılan OS/system UI stack, varsayılan uzaktan font yüklemesi yok |
| DS-D-016 | Kod fontu | OS mono stack; 8pt/11px altına düşmez |
| DS-D-017 | Tipografi | Tip kademeleri ve line-height tek yerden; `rem` tabanlı |
| DS-D-018 | Boşluk | 4px modüler grid; rastgele Tailwind `p-[13px]` yasak |
| DS-D-019 | Ölçek | 100%, 125%, 150%, 200% zoom ve font scaling korunur |
| DS-D-020 | Köşe radius | Tokenlı hafif yuvarlaklık; gereksiz devasa pill kontroller yok |
| DS-D-021 | Gölge | Düşük yoğunluk; hiyerarşiyi önce yüzey/border sağlar |
| DS-D-022 | Animasyon | Yalnız algılanabilirlik/bağlam için; süre tokenlı, çoğunlukla 100–220ms |
| DS-D-023 | Reduced motion | `prefers-reduced-motion: reduce` animasyon ve geçişleri sınırlar |
| DS-D-024 | High contrast | `forced-colors: active` varsayılan sistem renklerini bozmayan güvenli fallback |
| DS-D-025 | Tema geçişi flicker | İlk ekran görünmeden tema kaynağı ayarlanır; DB sonrası uzlaşma yapılır |
| DS-D-026 | Paneller | Sidebar, main ve agent aynı yüzey/border tokenlarını paylaşır |
| DS-D-027 | Liste yoğunluğu | V1 `comfortable`; ikinci `compact` modu ayrı ürün kararı gerekmeden geliştirilemez |
| DS-D-028 | Ikon | `lucide-react`, 16/18/20/24 px tokenlı; ikon-only erişilebilir ad zorunlu |
| DS-D-029 | Z-index | Global katman sözleşmesi; `z-[999999]` yasak |
| DS-D-030 | Scrollbar | Yerel hissi koru; scrollbar'ı gizleyerek kaydırılabilir alanı saklama |
| DS-D-031 | Overlay | Menüler, dialog, toast ve tooltips tek elevation/panel token setini kullanır |
| DS-D-032 | Durum renkleri | Başarı/hata yalnız renkle kodlanmaz; tekst/ikon ile anlatılır |
| DS-D-033 | AI görünümü | Tool step'leri ve onaylar içerikten ayrılır, gizli muhakeme görselleştirilmez |
| DS-D-034 | Tasarım testi | Temalar × ana ekranlar × error/loading × zoom ve forced-colors snapshot |
| DS-D-035 | Tekil CSS entry | Renderer `index.css` sadece bir kez import edilir |
| DS-D-036 | Değişiklik kontrolü | Token API değişikliği doküman/snapshot/kontrast testleriyle beraber yapılır |

### 2.1 Sorumluluk matrisi

| Dosya/modül | Sorumluluk | Yasak |
|---|---|---|
| `packages/ui/src/styles/tokens.css` | Tüm görsel custom property değerleri ve Tailwind semantik alias'ları | Feature bazlı selector'lar |
| `apps/desktop/src/renderer/styles/index.css` | Tailwind import, tokens import, global reset ve scrollbar davranışı | İkinci renk sözlüğü |
| `apps/desktop/src/renderer/styles/token-overrides.css` | Sadece test/laboratuvar ve belgelenmiş platform düzeltmeleri | Kullanıcı teması kopyası veya yeni rastgele renk |
| `apps/desktop/src/main/window/create-window.ts` | İlk gösterim, `backgroundColor` ve nativeTheme boot senkronu | React iç durumu |
| `apps/desktop/src/renderer/features/settings/` | Theme seçim arayüzü, API çağrısı ve hata sunumu | Yerel `localStorage` ile kalıcı tema |
| `apps/desktop/src/renderer/stores/ui-preferences.store.ts` | Geçici panel/menü/ölçülendirme state'i | İkinci kalıcı `theme` truth |
| `packages/ui/src/components/` | Token kullanan ortak React UI | Doğrudan DB/IPC/Node erişimi |
| `packages/contracts/src/` | Mevcut `Preferences` DTO doğrulaması | Yeni kanonik tema enum'u |

## 3. Tasarım token taksonomisi

Prefix: `--ik-`. İç içe sınıflar:

- **Foundation tokens:** Nötr renk seti, sistem fontları, temel ölçüler. Component'ler foundation rengini normalde doğrudan kullanmaz.
- **Semantic tokens:** `--ik-color-text-primary`, `--ik-color-surface-1`, `--ik-color-danger` gibi rol tanımları.
- **Component alias tokens:** Tasarım belgesi `DOC-22` içinde yalnızca gerektiğinde; örneğin `--ik-button-height-sm: var(--ik-control-height-sm)` olabilir. Yeni tema paleti yaratamaz.
- **State tokens:** Focus, pressed, disabled, selected, loading, hover, destructive, success, warning.
- **Motion/elevation tokens:** Süre/easing/shadow/z-index. UI bileşeni bu değerleri CSS üzerinden alır.

**Yasak:** Tüm UI için `#fff`, `rgb(...)`, `oklch(...)`, `bg-neutral-900` vb. rastgele stil değerlerini tekrarlamak. Belge boyunca ham değerler yalnız **token tanım katmanında** ve kontrast test fixture'larında kullanılabilir. 1px ayraç gibi motifler bile önceden tanımlı tokenlardan çözülmelidir. Grafik, kullanıcı içeriği veya dış görsel kaynağı açık istisnadır; istisna belgelenir.

### 3.1 Açık/koyu ana palet

| Semantik token | Açık | Koyu | Kullanım |
|---|---|---|---|
| `--ik-color-canvas` | `#ffffff` | `#121212` | Uygulama ana arka planı |
| `--ik-color-surface-1` | `#f8f8f8` | `#1b1b1b` | Sol sidebar / yükseltilmiş alan |
| `--ik-color-surface-2` | `#f0f0f0` | `#242424` | Hover, seçim dışı ikincil yüzey |
| `--ik-color-surface-3` | `#e8e8e8` | `#303030` | Pressed/seçili vurgu |
| `--ik-color-text-primary` | `#171717` | `#f5f5f5` | Başlık ve içerik |
| `--ik-color-text-secondary` | `#525252` | `#b9b9b9` | Açıklama |
| `--ik-color-text-muted` | `#616161` | `#a3a3a3` | Yardımcı metadata |
| `--ik-color-text-inverse` | `#ffffff` | `#121212` | Primary buton metni |
| `--ik-color-border` | `#dedede` | `#393939` | Hafif ayraç |
| `--ik-color-border-strong` | `#919191` | `#858585` | Input ve vurgulu ayraç |
| `--ik-color-action` | `#171717` | `#f5f5f5` | Primary CTA yüzeyi |
| `--ik-color-action-hover` | `#303030` | `#dedede` | Primary hover |
| `--ik-color-action-pressed` | `#484848` | `#c7c7c7` | Primary pressed |
| `--ik-color-link` | `#175c99` | `#89c8ff` | Metin linki |
| `--ik-color-focus` | `#155dbb` | `#9dd0ff` | Focus ring |
| `--ik-color-success` | `#17653e` | `#6ce0a4` | Başarı metni/ikon |
| `--ik-color-warning` | `#855700` | `#f2c66d` | Uyarı metni/ikon |
| `--ik-color-danger` | `#ae2924` | `#ff9992` | Hata metni/ikon |
| `--ik-color-overlay` | `rgb(0 0 0 / 0.48)` | `rgb(0 0 0 / 0.67)` | Modal arkası |
| `--ik-color-selection-bg` | `#d5e8ff` | `#24415f` | Metin seçimi |
| `--ik-color-selection-fg` | `#171717` | `#ffffff` | Seçim metni |

Kontrast iddiası tek bir sabit üstünde değil, **kullanıldığı arka plan ve state kombinasyonunda** doğrulanır. Örneğin `text-muted` yalnız canvas ve surface-1 üzerinde test edilir. FTS snippet vurgusu renk dışında kalın yazı/ikon gibi ek ayrımla desteklenir.

### 3.2 Renk kullanımı ve semantik durumlar

| Durum | Yüzey | Metin/ikon | Mutlaka ek gösterim |
|---|---|---|---|
| Seçili navigasyon | `surface-2` | `text-primary` | `aria-current`, aktif kenar göstergesi |
| Hover row | `surface-1/2` | `text-primary` | Cursor/focus ve etkileşim semantiği |
| Görev tamamlandı | Nötr yüzey | `success` | Checkbox/done etiketi |
| Görev blocked | Nötr yüzey | `warning` | `blocked` yazısı veya uygun ikon |
| Başarısız import | Nötr yüzey | `danger` | Hata kodu, çözüm yolu |
| Agent onay bekliyor | İkincil panel | `warning` | Açık `Onayla / Reddet` eylemi |
| İndirme sürüyor | Nötr panel | `text-primary` | Progress `aria-valuenow`; miktar bilinmiyorsa yüzde yok |
| Devre dışı | Tokenlı opacity ve görünür kontur | `text-muted` | HTML `disabled` veya `aria-disabled` kuralları |

**Risk:** Opacity'yi kritik metnin tamamına uygularsan kontrastı düşürürsün. `--ik-opacity-disabled` yalnız dekoratif/uygun kontrol seviyesinde kullanılır; açıklayıcı durum metni normal `text-secondary` renginde kalır. Durum renkleri küçük gri rozetlerin üstünde tek başına geçiş şartı değildir.

## 4. Tipografi sözleşmesi

### 4.1 Font ailesi

UI: `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `"Helvetica Neue"`, `Arial`, `sans-serif`. Sistemin varsayılan fontları ilk sürümde ağaç dışı indirme gerektirmez. Font fallback sırası Windows/macOS/Linux fontlarıyla görsel regresyonda test edilir.

Monospace: `"Cascadia Code"`, `"SFMono-Regular"`, `Consolas`, `"Liberation Mono"`, `monospace`. Kod snippet'ları, UUID, kısa sistem kimliği, tool çıktısı ve veri tabloları için.

CJK/diğer dil sistemi yedekleri browser font fallback'iyle gelir; V1 ana yerelleri `tr-TR` ve `en-US` olarak kalır. Üçüncü taraf font dosyası kullanıcıya bu docs üzerinden dağıtılmaz.

### 4.2 Tip ölçeği

| Token | Boyut | Satır yüksekliği | Ağırlık | Örnek |
|---|---:|---:|---:|---|
| `--ik-text-2xs` | 0.75rem | 1.125rem | 400 | Sadece kısa metadata (12px) |
| `--ik-text-xs` | 0.8125rem | 1.25rem | 400 | Yardımcı açıklama (13px) |
| `--ik-text-sm` | 0.875rem | 1.375rem | 400 | Kompakt satır/ikincil açıklama (14px) |
| `--ik-text-md` | 0.9375rem | 1.5rem | 400 | Genel UI gövde (15px) |
| `--ik-text-lg` | 1.0625rem | 1.625rem | 500 | Kart/section başlıkları (17px) |
| `--ik-text-xl` | 1.25rem | 1.875rem | 600 | Sayfa alt başlığı (20px) |
| `--ik-text-2xl` | 1.75rem | 2.25rem | 600 | Sayfa başlığı (28px) |
| `--ik-text-3xl` | 2.125rem | 2.625rem | 650 | Landing/empty-state hero (34px) |

12px altındaki metin yalnız hesaplanabilir ikon içi rozete dahi önerilmez. Normal paragraf 15–16px olarak hedeflenir; bilgilendirici metinlerin 12–13px aşırı kullanımından kaçınılır. Gövde metni en fazla yaklaşık 72ch genişlikte tutulur (not editörü kullanıcı ayarı farklı olabilir; V1 tercihi ileriki tasarım kararında sabitlenir).

Yazı ağırlıkları: `400` normal, `500` medium, `600` semibold, `650` büyük başlık. Tarayıcı/OS fontunun desteklemediği ara ağırlık taklit edilebilir; sistem fontu varlığında görünüm kontrol edilir.

### 4.3 Metin içerik politikaları

- Başlıklar Unicode biçiminde kesilmez; gerektiğinde iki satır ve ellipsis uygun yerde kullanılır.
- Uzun UUID/URL/metin `overflow-wrap:anywhere` ile sınırı aşmaz; code fragment yatay kayabilir.
- `font-variant-numeric: tabular-nums` sayaç, timestamp ve progress üzerinde kullanılır.
- Türkçe `İ/ı` karakterleri; `text-transform: uppercase` ile ana butonlarda otomatik büyütülmez.
- Başlık hiyerarşisi CSS boyutundan ayrı semantik heading (`h1`–`h6`) düzeyinde korunur.
- Markdown preview ile editör tipografisi aynı semantik font/spacing ailelerini kullanır; farklı blog teması eklenmez.

## 5. Uzamsal ve bileşen ölçekleri

### 5.1 Spacing (4px grid)

| Token | px | Tipik kullanım |
|---|---:|---|
| `--ik-space-0` | 0 | Reset |
| `--ik-space-1` | 4 | İkon/metin küçük aralık |
| `--ik-space-2` | 8 | İkincil iç boşluk |
| `--ik-space-3` | 12 | Satır dikey/iç boşluk |
| `--ik-space-4` | 16 | Kart içi |
| `--ik-space-5` | 20 | Form grubu |
| `--ik-space-6` | 24 | Panel aralıkları |
| `--ik-space-8` | 32 | Section aralığı |
| `--ik-space-10` | 40 | Büyük section |
| `--ik-space-12` | 48 | Empty-state |
| `--ik-space-16` | 64 | Hero/üst düzey boşluk |

### 5.2 Boyutlar

| Token | Değer | Açıklama |
|---|---|---|
| `--ik-control-height-sm` | 32px | Küçük araç çubuğu |
| `--ik-control-height-md` | 38px | Varsayılan text input/button |
| `--ik-control-height-lg` | 44px | Dokunma ağırlıklı büyük CTA |
| `--ik-click-target-min` | 24px | WCAG 2.2 minimum hedefe göre taban; çevre boşluğu/istisna test edilir |
| `--ik-sidebar-width` | 256px | Default genişlik, DOC-21 dar ekran sınırları |
| `--ik-agent-panel-width` | 352px | Başlangıç genişliği, kullanıcı sürükleyerek değiştirebilir |
| `--ik-content-max-width` | 1120px | Standart içerik yüzeyi |
| `--ik-readable-max-width` | 760px | Uzun not ve konuşma metni |
| `--ik-header-height` | 52px | App başlığı |
| `--ik-toolbar-height` | 44px | Liste/editor toolbar |

Kullanıcı zoom yaptığında piksel bazlı sabit minimum pencere genişliği içerikleri kesmemelidir. DOC-21 gerçek breakpoint ve panel collapse eşiklerini tanımlar; bu ölçüler *başlangıç/default* değerleridir.

### 5.3 Radius, border, shadow, focus, z-index

| Grup | Token | Değer |
|---|---|---|
| Radius | `--ik-radius-xs` | 4px |
| Radius | `--ik-radius-sm` | 6px |
| Radius | `--ik-radius-md` | 10px |
| Radius | `--ik-radius-lg` | 14px |
| Radius | `--ik-radius-xl` | 18px |
| Radius | `--ik-radius-pill` | 999px |
| Border | `--ik-border-width` | 1px |
| Focus | `--ik-focus-width` | 2px |
| Focus | `--ik-focus-offset` | 2px |
| Shadow | `--ik-shadow-sm` | `0 1px 3px rgb(0 0 0 / 0.07)` |
| Shadow | `--ik-shadow-md` | `0 4px 18px rgb(0 0 0 / 0.12)` |
| Shadow | `--ik-shadow-lg` | `0 10px 32px rgb(0 0 0 / 0.18)` |
| Layer | `--ik-z-base` | 0 |
| Layer | `--ik-z-sticky` | 10 |
| Layer | `--ik-z-dropdown` | 30 |
| Layer | `--ik-z-popover` | 40 |
| Layer | `--ik-z-modal` | 60 |
| Layer | `--ik-z-toast` | 80 |
| Layer | `--ik-z-tooltip` | 90 |

**Önemli:** `z-index` sayısının büyük olması tek başına çözüm değildir. CSS `transform`, `opacity`, `filter`, `isolation`, `position` yeni stacking context yaratabilir. Radix Portal container hiyerarşisi DOC-22'de ortaklaştırılır. `toast` modal kapatma alanına tıklamayı engelleyemez; pointer-event policy ayrıca test edilir.

## 6. Kanonik CSS uygulaması

### 6.1 Dosya: `packages/ui/src/styles/tokens.css`

Bu blok, V1 semantik tokenlarının **tek merkezidir**. Foundation renk değerleri yeniden başka yerde tanımlanmaz. Derleme sırasında Tailwind CSS 4 PostCSS/Vite işlem hattı uygulandığı kanıtlanmalıdır.

```css
/* @iterkeep/ui/src/styles/tokens.css — canonical, Tailwind v4 */
:root,
:root[data-theme='light'] {
  color-scheme: light;
  --ik-color-canvas: #ffffff;
  --ik-color-surface-1: #f8f8f8;
  --ik-color-surface-2: #f0f0f0;
  --ik-color-surface-3: #e8e8e8;
  --ik-color-text-primary: #171717;
  --ik-color-text-secondary: #525252;
  --ik-color-text-muted: #616161;
  --ik-color-text-inverse: #ffffff;
  --ik-color-border: #dedede;
  --ik-color-border-strong: #919191;
  --ik-color-action: #171717;
  --ik-color-action-hover: #303030;
  --ik-color-action-pressed: #484848;
  --ik-color-link: #175c99;
  --ik-color-focus: #155dbb;
  --ik-color-success: #17653e;
  --ik-color-warning: #855700;
  --ik-color-danger: #ae2924;
  --ik-color-overlay: rgb(0 0 0 / 0.48);
  --ik-color-selection-bg: #d5e8ff;
  --ik-color-selection-fg: #171717;
}

:root[data-theme='dark'] {
  color-scheme: dark;
  --ik-color-canvas: #121212;
  --ik-color-surface-1: #1b1b1b;
  --ik-color-surface-2: #242424;
  --ik-color-surface-3: #303030;
  --ik-color-text-primary: #f5f5f5;
  --ik-color-text-secondary: #b9b9b9;
  --ik-color-text-muted: #a3a3a3;
  --ik-color-text-inverse: #121212;
  --ik-color-border: #393939;
  --ik-color-border-strong: #858585;
  --ik-color-action: #f5f5f5;
  --ik-color-action-hover: #dedede;
  --ik-color-action-pressed: #c7c7c7;
  --ik-color-link: #89c8ff;
  --ik-color-focus: #9dd0ff;
  --ik-color-success: #6ce0a4;
  --ik-color-warning: #f2c66d;
  --ik-color-danger: #ff9992;
  --ik-color-overlay: rgb(0 0 0 / 0.67);
  --ik-color-selection-bg: #24415f;
  --ik-color-selection-fg: #ffffff;
}

/* Before async persisted preferences load, Electron nativeTheme drives CSS.
   This fallback only applies if data-theme is not yet present. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    color-scheme: dark;
    --ik-color-canvas: #121212;
    --ik-color-surface-1: #1b1b1b;
    --ik-color-surface-2: #242424;
    --ik-color-surface-3: #303030;
    --ik-color-text-primary: #f5f5f5;
    --ik-color-text-secondary: #b9b9b9;
    --ik-color-text-muted: #a3a3a3;
    --ik-color-text-inverse: #121212;
    --ik-color-border: #393939;
    --ik-color-border-strong: #858585;
    --ik-color-action: #f5f5f5;
    --ik-color-action-hover: #dedede;
    --ik-color-action-pressed: #c7c7c7;
    --ik-color-link: #89c8ff;
    --ik-color-focus: #9dd0ff;
    --ik-color-success: #6ce0a4;
    --ik-color-warning: #f2c66d;
    --ik-color-danger: #ff9992;
    --ik-color-overlay: rgb(0 0 0 / 0.67);
    --ik-color-selection-bg: #24415f;
    --ik-color-selection-fg: #ffffff;
  }
}

:root {
  --ik-font-ui: -apple-system, BlinkMacSystemFont, 'Segoe UI',
    'Helvetica Neue', Arial, sans-serif;
  --ik-font-mono: 'Cascadia Code', 'SFMono-Regular', Consolas,
    'Liberation Mono', monospace;
  --ik-text-2xs: 0.75rem;
  --ik-text-xs: 0.8125rem;
  --ik-text-sm: 0.875rem;
  --ik-text-md: 0.9375rem;
  --ik-text-lg: 1.0625rem;
  --ik-text-xl: 1.25rem;
  --ik-text-2xl: 1.75rem;
  --ik-text-3xl: 2.125rem;
  --ik-leading-2xs: 1.125rem;
  --ik-leading-xs: 1.25rem;
  --ik-leading-sm: 1.375rem;
  --ik-leading-md: 1.5rem;
  --ik-leading-lg: 1.625rem;
  --ik-leading-xl: 1.875rem;
  --ik-leading-2xl: 2.25rem;
  --ik-leading-3xl: 2.625rem;
  --ik-space-0: 0px;
  --ik-space-1: 4px;
  --ik-space-2: 8px;
  --ik-space-3: 12px;
  --ik-space-4: 16px;
  --ik-space-5: 20px;
  --ik-space-6: 24px;
  --ik-space-8: 32px;
  --ik-space-10: 40px;
  --ik-space-12: 48px;
  --ik-space-16: 64px;
  --ik-control-height-sm: 32px;
  --ik-control-height-md: 38px;
  --ik-control-height-lg: 44px;
  --ik-click-target-min: 24px;
  --ik-sidebar-width: 256px;
  --ik-agent-panel-width: 352px;
  --ik-content-max-width: 1120px;
  --ik-readable-max-width: 760px;
  --ik-header-height: 52px;
  --ik-toolbar-height: 44px;
  --ik-radius-xs: 4px;
  --ik-radius-sm: 6px;
  --ik-radius-md: 10px;
  --ik-radius-lg: 14px;
  --ik-radius-xl: 18px;
  --ik-radius-pill: 999px;
  --ik-border-width: 1px;
  --ik-focus-width: 2px;
  --ik-focus-offset: 2px;
  --ik-shadow-sm: 0 1px 3px rgb(0 0 0 / 0.07);
  --ik-shadow-md: 0 4px 18px rgb(0 0 0 / 0.12);
  --ik-shadow-lg: 0 10px 32px rgb(0 0 0 / 0.18);
  --ik-z-base: 0;
  --ik-z-sticky: 10;
  --ik-z-dropdown: 30;
  --ik-z-popover: 40;
  --ik-z-modal: 60;
  --ik-z-toast: 80;
  --ik-z-tooltip: 90;
  --ik-duration-instant: 0ms;
  --ik-duration-fast: 100ms;
  --ik-duration-normal: 160ms;
  --ik-duration-slow: 220ms;
  --ik-ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ik-ease-emphasized: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ik-opacity-disabled: 0.55;
}

/* Tailwind 4 maps utilities onto runtime semantic variables.
   @theme inline prevents aliases from resolving to an inert compile-time palette. */
@theme inline {
  --color-ik-canvas: var(--ik-color-canvas);
  --color-ik-surface-1: var(--ik-color-surface-1);
  --color-ik-surface-2: var(--ik-color-surface-2);
  --color-ik-surface-3: var(--ik-color-surface-3);
  --color-ik-text: var(--ik-color-text-primary);
  --color-ik-secondary: var(--ik-color-text-secondary);
  --color-ik-muted: var(--ik-color-text-muted);
  --color-ik-border: var(--ik-color-border);
  --color-ik-border-strong: var(--ik-color-border-strong);
  --color-ik-action: var(--ik-color-action);
  --color-ik-action-hover: var(--ik-color-action-hover);
  --color-ik-link: var(--ik-color-link);
  --color-ik-focus: var(--ik-color-focus);
  --color-ik-success: var(--ik-color-success);
  --color-ik-warning: var(--ik-color-warning);
  --color-ik-danger: var(--ik-color-danger);
  --font-ik-ui: var(--ik-font-ui);
  --font-ik-mono: var(--ik-font-mono);
  --radius-ik-sm: var(--ik-radius-sm);
  --radius-ik-md: var(--ik-radius-md);
  --radius-ik-lg: var(--ik-radius-lg);
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --ik-duration-fast: 0ms;
    --ik-duration-normal: 0ms;
    --ik-duration-slow: 0ms;
  }
}

@media (forced-colors: active) {
  :root {
    --ik-color-canvas: Canvas;
    --ik-color-surface-1: Canvas;
    --ik-color-surface-2: Canvas;
    --ik-color-surface-3: Canvas;
    --ik-color-text-primary: CanvasText;
    --ik-color-text-secondary: CanvasText;
    --ik-color-text-muted: CanvasText;
    --ik-color-text-inverse: HighlightText;
    --ik-color-border: ButtonBorder;
    --ik-color-border-strong: ButtonText;
    --ik-color-action: Highlight;
    --ik-color-action-hover: Highlight;
    --ik-color-action-pressed: Highlight;
    --ik-color-link: LinkText;
    --ik-color-focus: Highlight;
    --ik-color-success: CanvasText;
    --ik-color-warning: CanvasText;
    --ik-color-danger: CanvasText;
    --ik-color-selection-bg: Highlight;
    --ik-color-selection-fg: HighlightText;
    --ik-shadow-sm: none;
    --ik-shadow-md: none;
    --ik-shadow-lg: none;
  }
}
```

**Doğrulama notu:** Sistemi izlemeden önce ilk paint'e kadar `data-theme` boş olabilir; o durumda CSS'in karanlık media fallback'i uygulanır. `:root` light tokenlarıyla `@media` dark fallback'i kasıtlı olarak birlikte vardır. Sonrasında `data-theme` atanırsa explicit light/dark selector seçimi fallback'ten üstündür. New semantic color token eklemek gerekiyorsa üç blok (light/dark/media fallback) + forced-colors + kontrast testi birlikte değişir. Derleme sırasında `@theme inline` kurallarının `tokens.css` içinden işlendiği smoke test ile kanıtlanır.

### 6.2 Renderer stylesheet entry

```css
/* apps/desktop/src/renderer/styles/index.css */
@import 'tailwindcss';
@import '@iterkeep/ui/styles/tokens.css';

@custom-variant dark (&:where([data-theme='dark'], [data-theme='dark'] *));

@layer base {
  html {
    font-family: var(--ik-font-ui);
    font-size: 16px;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
  body {
    margin: 0;
    min-width: 0;
    color: var(--ik-color-text-primary);
    background-color: var(--ik-color-canvas);
  }
  *, *::before, *::after { box-sizing: border-box; }
  :focus-visible {
    outline: var(--ik-focus-width) solid var(--ik-color-focus);
    outline-offset: var(--ik-focus-offset);
  }
  ::selection {
    background: var(--ik-color-selection-bg);
    color: var(--ik-color-selection-fg);
  }
  [hidden] { display: none !important; }
  button, input, textarea, select { font: inherit; }
  input, textarea, select { min-width: 0; }
}
```

`@iterkeep/ui` paketinin `exports` alanında `"./styles/tokens.css": "./src/styles/tokens.css"` (ve derlenmiş dağıtımda ona denk gelen CSS) açıkça tanımlanmalıdır. Export yolu bulunamadığında gizli relatif import ile çalışan build yapılmış sayılmaz. Electron packaged build testi, Vite CSS çıktısını ve `@theme inline` utility üretimini doğrular.

**Önerilen kullanım:**

```tsx
export function SurfaceCard(props: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-ik-lg border border-ik-border bg-ik-surface-1 p-4 text-ik-text">
      <h2 className="text-lg font-semibold">{props.title}</h2>
      <div className="mt-3 text-ik-secondary">{props.children}</div>
    </section>
  );
}
```

Buradaki `text-lg`, `mt-3`, `p-4` gibi Tailwind'in genel varsayılan ölçekleri **DOC-20'nin tam değerini garanti etmez**; production'da `ik-*` utility tanımlanmalı veya CSS custom property ile `font-size`, `gap`, `padding` bağlanmalıdır. Yukarıdaki kod **entegrasyon iskeletidir**, piksel kusursuz referans bileşen değildir. `DOC-22` her ortak bileşenin kanonik class tanımını sabitleyecektir.

### 6.3 Özelleştirme sınırı

`token-overrides.css` gelişigüzel üçüncü renk dosyasına dönüşmemeli. İzin verilenler: platforma özgü focus/scrollbar bug workaround'u, test modunda yüksek kontrast fixture'ı, kontrollü üretim düzeltmesi. Her override yorumda `DS-OVR-ID`, neden, desteklenen platform, kaldırılma ölçütü ve test linki taşır. Kullanıcı özel tema oluşturma V1 kapsamına **dahil değildir**.

## 7. Tema durum makinesi

### 7.1 Ayrı tutulacak üç kavram

| Kavram | Tip | Gerçek kaynak |
|---|---|---|
| `themePreference` | `'light'|'dark'|'system'` | DB `workspace_preferences.theme` |
| `osTheme` | `'light'|'dark'` | Main `nativeTheme.shouldUseDarkColors` ve `nativeTheme.updated` |
| `resolvedTheme` | `'light'|'dark'` | `themePreference==='system' ? osTheme : preference` |

`resolvedTheme` DB'ye yazılmaz. Aynı şekilde `system` bir CSS paleti değildir; DOM için light veya dark'a çözülür.

### 7.2 İlk açılış sırası

1. Electron Main, BrowserWindow oluşturmadan **önce** `userData/application-settings.json` içindeki sadece izinli boot alanlarını okur.
2. Mirror dosyası yoksa, bozuksa veya theme enum'u geçersizse `system` kullanır; gizli crash/telemetry göndermez.
3. `nativeTheme.themeSource = bootTheme` atanır; `BrowserWindow.backgroundColor` karşılık gelen canvas rengini alır. Sistem kaynağı için `shouldUseDarkColors` alınır.
4. Renderer statik HTML/CSS boot edilir. `data-theme` henüz yoksa CSS'in `prefers-color-scheme` fallback'i devrededir.
5. Kullanılabilir workspace DB açılınca `workspace.getPreferences()` ile kanonik tercih alınır. Valid ise `nativeTheme.themeSource` ve `document.documentElement.dataset.theme` güncellenir.
6. Mirror değer DB'den farklıysa Main atomik olarak DB sonucunu mirror'a yazar (bir sonraki soğuk açılış için).
7. DB yok/bozuk veya kurtarma ekranındaysa, geçici mirror/OS teması kullanılır; DB'yi sırf tema yüzünden yeniden yaratmaz.
8. Kullanıcı temayı değiştirirse `workspace.updatePreferences({patch:{theme},expectedRevision})` çağrılır. Commit sonrası DOM ve native theme nihai seçime getirilir. UI geçici önizleme gösterirse hata halinde eski tercihe döner.

**Kritik senkronizasyon:** Renderer'ın `nativeTheme` veya Electron modülüne doğrudan erişimi yoktur. Tema persist komutunu işleyen Main, zaten var olan `workspace.preferences.update` sonucu başarılıysa native theme ve mirror'ı günceller; yeni public IPC methodu gerekmez. Main değişimi geçerli pencere(ler)e mevcut güvenli event altyapısından bildirebilir; yeni event ismi eklemek gerekirse **DOC-11** revizyonu zorunludur. V1 tek pencere olduğu için renderer kendi başarılı komut sonucuyla DOM'u günceller. **Önemli:** DOM `data-theme` attribute'u atandıktan sonra medya fallback artık devrede değildir; `theme=system` iken `matchMedia` değişim olayını dinleyip `data-theme` güncellemek zorunludur. NativeTheme source değişimi bu medya sorgusuna yansır; ayrıca yeni IPC event gerekmez.

### 7.3 Çatışma ve bağlantı hataları

| Olay | Beklenen davranış |
|---|---|
| `theme='system'`, OS light→dark | Aynı UI paneli ve editör durumuyla palette dark'a geçer; DB revision değişmez |
| Explicit light seçildi, OS dark oldu | Tema light kalır |
| Preferences CAS uyuşmadı | Yeni DB tercihi refetch edilir; uyarı verilir; son-yazan-kazan sessiz overwrite yok |
| DB çalışma sırasında offline/worker down | Mevcut tema kullanılmaya devam; kaydedilemeyen yeni tercih başarılı gösterilmez |
| İlk setup'ta DB henüz yok | Boot mirror/OS kullan; setup ekranı görünür; user preference saklanınca DB canonical olur |
| Başka workspace açıldı | Yeni workspace'in DB theme tercihi alınır; önceki workspace temi buna taşınmaz |
| Mirror bozuk | `system` fallback; hassas kullanıcı içerikleri mirror içinde tutulmaz |
| `nativeTheme.updated` art arda geldi | En son hesaplanan resolvedTheme uygulanır; timer'la viewport yeniden yükleme yok |
| React HMR/dev reload | Persist edilmiş DB theme ve main nativeTheme yeniden uzlaştırılır |
| Uygulama açılış sırasında çöktü | Mirror güvenli okunur, DB source zarar görmez |

### 7.4 TypeScript referans sözleşmesi

```ts
// UI-safe, pure functions: no Electron and no DB access here.
export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export function resolveTheme(
  preference: ThemePreference,
  osTheme: ResolvedTheme,
): ResolvedTheme {
  return preference === 'system' ? osTheme : preference;
}

export function applyResolvedTheme(theme: ResolvedTheme): void {
  document.documentElement.dataset.theme = theme;
  // Rendering engine updates styles through CSS custom properties.
  // No React subtree remount, no className propagation to individual controls.
}

// Call once in the renderer app shell after a canonical preference is known.
// The returned callback MUST be used for cleanup on unmount/HMR.
export function observeResolvedTheme(preference: ThemePreference): () => void {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const recompute = () => {
    applyResolvedTheme(resolveTheme(preference, media.matches ? 'dark' : 'light'));
  };
  recompute();
  media.addEventListener('change', recompute);
  return () => media.removeEventListener('change', recompute);
}

// When preference changes, detach the old observer and attach a new one.
// Main-side reference sketch; placed into existing composition/bootstrap route.
// Electron module must NEVER be imported into renderer or @iterkeep/ui.
/*
import { nativeTheme } from 'electron';
export function setNativeThemePreference(theme: ThemePreference) {
  nativeTheme.themeSource = theme;
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}
*/
```

**Not:** `ThemePreference` veri modeli canonical olarak `DOC-08/11` içindeki mevcut union'dur. Yukarıdaki tip yalnız UI içi okunabilirlik için yeniden ifade edilmiştir; gerçek `@iterkeep/ui` paketinde aynı union ya contract'tan `import type` edilir ya da `satisfies` compile-time testi ile eşlenir. Yeni paralel domain enum'u yaratılmaz.

### 7.5 Kalıcı tema güncelleme pseudo-code

```ts
// apps/desktop/src/renderer/features/settings/theme-controller.ts
// Input: current preferences snapshot and selected theme from UI.
async function persistTheme(
  current: { theme: ThemePreference; revision: number },
  next: ThemePreference,
) {
  if (current.theme === next) return current;
  const previous = current.theme;
  const previouslyResolved = document.documentElement.dataset.theme;

  // The user may see a preview. Do NOT mark it as persisted yet.
  // To keep visual transition smooth without a new public IPC method,
  // final application is performed after commit.
  const result = await window.iterkeep.workspace.updatePreferences({
    patch: { theme: next },
    expectedRevision: current.revision,
  });

  if (!result.ok) {
    if (previouslyResolved === 'dark' || previouslyResolved === 'light') {
      applyResolvedTheme(previouslyResolved);
    }
    // In real code: refetch preferences; show localized inline safe error.
    throw new Error(result.error.code);
  }
  // IPC Main synchronizes nativeTheme + boot mirror after successful commit.
  // The application shell rebinds observeResolvedTheme(next) after
  // the canonical preferences snapshot changes; do not leave stale listeners.
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyResolvedTheme(resolveTheme(next, isDark ? 'dark' : 'light'));
  return result.data;
}
```

**Referans-kod uyarısı:** `result.ok/error/data`, `window.iterkeep.workspace` namespace ve tam dönüş DTO'su gerçek `DOC-11` Zod proxy implementasyonundan üretilecek; bu pseudo-code için bağımsız API yaratılmaz. `DOC-11` tercih yanıtı `Preferences` olarak tanımlar, dolayısıyla sürüme göre wrapper mapping `@iterkeep/contracts` içinde kesinleştirilmeden yukarıdaki örnek doğrudan TypeScript derlendi kabul edilemez. Production'da hata sonucu UI rollback + refetch davranışı zorunludur.

## 8. Tema render ve performans kuralları

1. React Context Provider içine tüm tema token sözlüğü konmaz. Görsel tema, CSS üzerinde yaşar; React yalnız `preference` picker'ını tutar.
2. `data-theme` üst düğüm üzerinde tek değişikliktir; mount edilmiş editor/CodeMirror state korunur.
3. Popover/dialog portal'ları aynı document kökünün altında theme tokenlarını miras alır. Bağımsız `ShadowRoot` veya ayrı pencere çıkarsa explicit theme injection test edilir.
4. Sidebar, chat ve not önizlemesinde `background` değerleri bir komponentten diğerine prop olarak dağıtılmaz.
5. Theme değişimi sırasında `transition: all` yasaktır; büyük layout alanlarında tüm property'lerin animasyonu hem performansı hem odak görünümünü bozabilir.
6. Salt renk geçişleri için bile sistem reduced motion tercihine saygı gösterilir; varsayılan tema geçişi **instant** seçilir (flash/race riskini azaltır).
7. `box-shadow` çok büyük listelerde her satıra uygulanmaz; border/background değişimi tercih edilir.
8. Sınırsız `backdrop-filter: blur(...)`, animasyonlu gradient, video background ve yoğun translucency ana ürünün V1 default UI'ında yoktur.
9. Büyük Markdown listeleri ve tool logları DOC-21/22'de tanımlanan virtualization/layout politikalarına uyar.
10. Tema değişimi ağ isteği, Python sidecar, yeni SQL schema/migration veya Ollama probe başlatmaz.
11. CSS dosyası tek load edilir; aynı token seti feature CSS'te ikinci kez üretilmez.
12. Birden fazla `window` yapılacak gelecekteki sürümde tema broadcast ve snapshot mekanizması revize edilir; V1 sadece tek aktif window kabul eder.

**Ölçüm:** Geliştirme ajanı React Profiler ve Playwright Performance timeline ile en az ana ekran, not editörü açıkken ve agent stream sırasında 30 tema geçişi ölçer. Hedef: kaydırma bozulması, focus kaybı, editör remount veya CSS kaynaklı uzun frame yok. Sayısal performans eşikleri `DOC-31` sahibi; burada yeni sahte evrensel `16ms` garantisi verilmez.

## 9. Bileşen tasarım dili ve örnekler

### 9.1 Temel yüzeyler

| Alan | Zemin | Border | Yazı | Derinlik |
|---|---|---|---|---|
| Ana içerik | canvas | border gerektiğinde | primary | 0 |
| Sidebar | surface-1 | border | primary | 0 |
| Toolbar | canvas/surface-1 | border | secondary/primary | 0 |
| Kart | canvas/surface-1 | border | primary | sm yalnız gerektikçe |
| Popover | surface-1 | border-strong gerektiğinde | primary | md |
| Modal | surface-1 | border | primary | lg |
| Agent tool trace | surface-1 | border | secondary/primary | 0 |
| Code/SQL block | surface-2 | border | primary | 0 |
| Input | canvas | border-strong | primary | 0 |
| Destructive action | nötr / explicit danger rolü | border | danger | 0 |

### 9.2 Etkileşim öncelikleri

- Primary button yalnız ekrandaki **tek ana eylem** için kullanılır. Birden çok aynı ağırlıkta CTA yoktur.
- Secondary/tertiary kontroller, başlık altı eylemler, “Atla”, “Geri”, “İptal” için.
- Link bir navigasyon veya belge açma eylemidir; destructive confirm gibi kritik command için link yerine buton.
- Loading, spinner tek başına anlam taşımaz; kısa eylemlerde metin; uzun işte deterministik progress veya indeterminate.
- Empty state net bir sonraki eylem belirtir; ikon/görsel zorunlu değildir.
- Error state uygulanabilir kurtarma sunar; sahte başarı üretmez.
- Icon-only button `aria-label` alır; `title` tek başına erişilebilir ad garanti etmez.
- Geçici toast kalıcı kayıt sonucu yerine geçmez: kaydedildi göstergesi yalnız başarılı commit receipt sonrası.

### 9.3 Layout aralıkları ve scrolling

- Sidebar ve agent paneli birbirlerinden ayrı bağımsız scroll yüzeylerine sahip olabilir; içerik odağı scroll ile kaybolmaz.
- Üst toolbar sticky olabilir fakat yatay scroll container seçimi focus ring'i kesemez.
- `min-width:0` flex/grid çocukları için zorunlu; uzun dosya adları, UUID ve Türkçe cümleler yatay overflow üretmez.
- Not editörü ve chat input kontrollü min/max yükseklikle büyür; viewport'un tamamını kaplamaz.
- Agent trace, long-running job ve listeler gerektiğinde sanallaştırılır; renk/tema değişimi sanallaştırma ölçülerini resetlemez.

## 10. Hareket ve mikroetkileşim politikası

| Olay | Animasyon | Süre | Reduced-motion |
|---|---|---:|---|
| Buton hover/press | Renk (opsiyonel) | fast | Anında |
| Sidebar collapse | transform/width; layout kontrolü | normal | Anında |
| Popover açılması | Hafif opacity + translate | fast | Anında |
| Modal açılması | Opacity + küçük scale | normal | Anında |
| Toast giriş/çıkış | Opacity | fast | Anında |
| Progress | Progress değeri anlamlıysa fill | normal | Anlık değer göster |
| Agent token stream | Metin doğrudan akar; typewriter animasyonu yok | N/A | Aynı |
| Mikrofon kaydı | Durum göstergesi statik + isteğe bağlı wave | slow | Statik `Kayıt sürüyor` |
| Kanban drag | Hafif hover/drag feedback | fast | Semantik hedef vurgusu |
| Tema değişimi | **Yok** | instant | Aynı |

**Policy:** Animasyonların tümü 2D ve GPU dostu olsa bile JS ile yüzlerce satıra ayrı interval uygulanmaz. `prefers-reduced-motion` medya sorgusu yanında gerekiyorsa `prefers-reduced-transparency` platform desteği kontrollü incelenir. Döngüsel dekoratif animation varsayılan kapalıdır. Loading spinner tek başına bilgi vermemelidir.

## 11. Erişilebilirlik temel sözleşmesi

### 11.1 WCAG 2.2 AA uyarlaması

- Metin ve zemin kontrastı normal metin için **≥ 4.5:1**, büyük metin için **≥ 3:1** olacak şekilde test edilir. Özel durum/istisnalar gerekçeli olarak işaretlenir.
- Kullanıcı tarafından içerik olmayan, anlamlı kontrol çerçeveleri ve simgeleri için **≥ 3:1** hedeflenir (WCAG 1.4.11 kapsamına giren durumlar).
- Odak göstergesi görünür; `outline:none` tek başına yasak. Forced-colors modunda sistem `Highlight` kullanılır.
- Hover'da sunulan ek bilgi focus veya click ile de erişilir.
- Hata durumunda yalnız kırmızı ikon kullanılmaz; metin ve gerektiğinde `aria-live` kullanılır.
- Dialog açılınca anlamlı başlık focus, kapandığında önceki tetikleyiciye odak iadesi. Tam ayrıntı `DOC-22/23`.
- Hedefler en az 24×24 CSS px veya WCAG 2.2 target spacing istisnasıyla test edilir. V1 normal kontrol yüksekliği 38/44px.
- Metin 200% büyütüldüğünde yatay okuma engeli ve kapalı kontrol olmamalı; responsive davranış `DOC-21`.
- Font weight, placeholder ve disabled state için ayrı kontrast/focus senaryoları hazırlanır.
- Yüksek kontrast ve invert renkler, kişiselleştirilmiş paletin aksine işletim sistemi sistem renklerine öncelik verir; `forced-color-adjust:none` global uygulanmaz.

### 11.2 Tema kontrolü

Üç radyo seçeneğinin lokalize etiketleri `Sistem / Açık / Koyu` ve `System / Light / Dark`. Seçim algılanan OS durumunu ayrıca kısa erişilebilir metinle gösterebilir: `Sistem (şu an koyu)`. Arayüzde kalıcı olarak `system` seçiliyken OS değişmesi seçili radyo değerini değiştirmez. Kullanıcı değiştirip kaydetme başarısız olursa erişilebilir hata mesajı belirir ve kayıtlı seçenek geri gelir.

## 12. Editör, Markdown ve özel yüzeyler

### 12.1 CodeMirror 6

CodeMirror DOM ve syntax highlight tokenları harici stiller kullandığı için ayrı `EditorThemeAdapter` tanımlanır. Temayı **iki adet tamamen farklı editor instance'ı** yaratarak değiştirmeyiz. CodeMirror extension için `Compartment.reconfigure(...)` veya eşdeğer hafif yeniden yapılandırma kullanılır. Açık yazı, cursor, selection, line-number, active-line, gutter ve bracket highlight renkleri semantik CSS tokenlarını tüketir.

**Kodlama notu:** CodeMirror'ın iç CSS selector'ları `DOC-22` içinde minimum adapter alanında ele alınır; `!important` ile tüm editörü boyayan evrensel rule yazılmaz. Markdown syntax rengi yalnız dekoratif değilse yeterli kontrast; rehberlik ve seçili metin için native selection görünür.

### 12.2 Markdown preview

Markdown preview'da `h1`...`h6`, `blockquote`, listeler, tablolar, inline code, fenced code, link ve task checkbox görsel ölçüleri tokenlara bağlanır. Harici HTML içeriği sanitize policy ile işlenir (`DOC-30`). Uzak font/logo/yüklenebilir script'ler Markdown içeriği üzerinden otomatik alınmaz. Tema değişince preview DOM yeniden parse edilmeye zorlanmaz; CSS değişkenleri yeterlidir.

### 12.3 Agent chat ve izlenebilir tool akışı

- Kullanıcı ve agent mesajları aynı tipografi ailesini kullanır.
- Tool çağrısı varsayılan olarak kısa `tool name/status/süre` kartıyla gösterilir; ayrıntı seçilince güvenli çıktı açılır.
- Başarı/hata/onay yalnız yeşil-kırmızı renk ile değil simge + lokalize durumla görünür.
- Uzun stream sırasında bütün geçmiş mesajlar her token ile yeniden render edilmez; stream batching `DOC-11/12/27`.
- Modelin ham gizli reasoning izinin arayüzde 'şeffaflık' adıyla sunulması V1'de yok; sadece gerçek tool/işlem/açıklama olayları sunulur.

### 12.4 Ses göstergeleri

- Bas-konuş kayıt sırasında belirgin label + kayıt zamanı; yalnız kırmızı nokta değil.
- Transkript önizlemesi ayrı metin alanı; yanlış algılama kullanıcı düzeltebilir.
- TTS başlamadan önce metin yanıtı görünür; ses hatası metni gizlemez.
- Waveform dekoratif olabilir ama sürekli ana thread animasyonu veya aktif olmayan halde GPU tüketimi yasak.

## 13. Uygulama yerleşimi ve bağımlılık kontrolü

```text
packages/ui/
  src/
    index.ts                  # Public components/types export
    styles/
      tokens.css              # SINGLE authoritative token file
    components/
      Button.tsx              # DOC-22 implementation
      TextField.tsx
      SurfaceCard.tsx
      StatusIndicator.tsx
      ...
    primitives/
      ...                     # Radix wrappers, no extra palette

apps/desktop/src/
  main/window/create-window.ts
  renderer/
    styles/index.css         # tailwind + tokens once
    styles/token-overrides.css # empty unless justified
    stores/ui-preferences.store.ts
    features/settings/       # prefs API and theme UI
    app/AppProviders.tsx
```

**Dependency rule:** `@iterkeep/ui` renderer-only'dir; OS `nativeTheme` import etmez; preload köprüsü üstünden DB almaz; değişiklikleri dışarı `onChange(theme)` şeklinde kontrollü callback ile bildirir. `@iterkeep/desktop` settings feature, `workspace.preferences.update` IPC'yi çağırır. `@iterkeep/ui` bileşenleri herhangi bir sayfa için çalışabilir; özel proje state'i ile tasarım token'ı birbirine bağlanmaz.

## 14. CI tasarım sözleşmesi

### 14.1 Zorunlu statik kontroller

| ID | Kontrol | Geçiş kuralı |
|---|---|---|
| DS-CI-001 | UI kaynak taraması | `packages/ui/src/**` ve renderer styles içinde tokens dışı `#[0-9a-f]{3,8}` ham renk kullanımı sıfır, whitelistli fixture hariç |
| DS-CI-002 | Token benzersizliği | Aynı scope içinde yinelenmiş token declaration yok |
| DS-CI-003 | Tailwind alias çözümü | `bg-ik-canvas`, `text-ik-text`, `border-ik-border` build CSS çıktısında bulunur |
| DS-CI-004 | Tema union eşleşmesi | UI picker ve DB/DTO `light|dark|system` enum'u aynı |
| DS-CI-005 | Import sınırı | UI ve renderer'da `electron`, `better-sqlite3`, `fs`, sidecar native import yok |
| DS-CI-006 | Kontrast snapshot | Token çiftlerinin hesaplanan kontrastı kayıtlı hedefin altına inmez |
| DS-CI-007 | Reduced-motion | `prefers-reduced-motion` varyantında animasyon süreleri 0ms |
| DS-CI-008 | CSS entry tekliği | `index.css` tek kez yüklenir, tokenların duplicative import'u yok |
| DS-CI-009 | CSS parse | Tailwind 4 build success ve unknown `@theme` literal'ı production CSS'te kalmaz |
| DS-CI-010 | Focus | `:focus-visible` kaynakta vardır; keyboard Playwright smoke geçer |

`DS-CI-001` yorum, SVG asset, CSS token kaynak dosyası ve test snapshot içindeki sabit renkler için açık parser/allowlist kullanmalıdır; regex tek başına gerçek CSS bağlamını anlamadığı için tek test yeterli değildir. CSS AST parser + seçili ESLint kuralları tercih edilir.

### 14.2 Görsel regresyon matrisi

| Boyut | Değerler | Gerekli ekran seti |
|---|---|---|
| Tema | light/dark/system | Dashboard, Project, Tasks, Editor, Chat, Settings, Setup, Recovery |
| Dil | tr-TR/en-US | Header, form, nav, boş/hata durumu |
| Zoom | 100/125/150/200% | Form, sidebar, dialog, Kanban |
| Hareket | normal/reduced | Dialog, toast, Kanban, agent stream |
| Kontrast | normal/forced-colors | Focus, selected, danger, approval |
| Veri | empty/loading/error/filled | Proje listesi, notlar, tool trace |
| OS | Win11 (zorunlu), macOS/Linux desteklenen CI | Sistem teması ve font fallback |

**Test metodolojisi:** Baseline sabit Chromium/Electron/OS/font ortamında alınır; makine/dpi farklılığından kaynaklanan rastgele piksel değişimleri incelenir. Snapshot güncellemesi gerçek UI review gerektirir, otomatik `--update-snapshots` ile kör onay yoktur.

### 14.3 Performans bütçesi ve kanıt

- Tema değişimi sırasında JS tekrarlı render nedenleri React Profiler ile kaydedilir; editor state ve selection korunur.
- Tema switch hiçbir Ollama/STT/TTS health probe veya backend DB taraması başlatmaz; yalnız bir revision-korumalı preferences mutasyonu olabilir.
- Sidebar/agent açık-kapalı durumlarında gereksiz layout thrashing/progress listesi rerender'i sorgulanır.
- Basit screenshot değil, ana iş parçacığı profili ve FPS/jank izleri toplanır.
- Dist renderer CSS boyutu ölçülür; her component'in kendi global stylesheet'ini bundle'a eklemesine izin verilmez.
- Kesin P50/P95 sınırları ve fixture sayısı `DOC-31`; kanıtın CI konumu `.artifacts/` ve `DOC-33/34` sözleşmelerine göre.

## 15. Test senaryoları (`DS-T-001`–`DS-T-056`)

| ID | Önkoşul / eylem | Beklenen sonuç |
|---|---|---|
| DS-T-001 | İlk kurulum, DB henüz yok | OS temasına uygun ilk paint |
| DS-T-002 | `system`, OS light | Light palette |
| DS-T-003 | `system`, OS dark | Dark palette |
| DS-T-004 | `system` aktif, OS değişir | Palette otomatik güncellenir; DB revision aynı |
| DS-T-005 | Explicit light, OS dark | Light kalır |
| DS-T-006 | Explicit dark, OS light | Dark kalır |
| DS-T-007 | Light→dark DB commit başarılı | Native + DOM eşleşir; editor text korunur |
| DS-T-008 | Dark→light commit başarılı | Aynı görünümde light; route değişmez |
| DS-T-009 | `updatePreferences` conflict | Refetch + hata; sessiz overwrite yok |
| DS-T-010 | `updatePreferences` timeout | Sahte kaydedildi bildirimi yok; receipt/refetch |
| DS-T-011 | Worker kapalı, kullanıcı tema değiştirir | Persist başarısız; eski seçim korunur |
| DS-T-012 | Mirror dosyası bozuk | Fallback `system`; uygulama açılır |
| DS-T-013 | Mirror dark, DB light | DB tercihi uygulanır; mirror güncellenir |
| DS-T-014 | Farklı workspace açıldı | Yeni DB tercihi kullanılır |
| DS-T-015 | Uygulama yeniden başlatıldı | Tercih ve initial paint uyumlu |
| DS-T-016 | OS nativeTheme event spam | Tek nihai resolved palette |
| DS-T-017 | Setup AI atlandı | Tüm tema seçeneği çalışır |
| DS-T-018 | Setup STT/TTS yok | Tema ve temel UI değişmez |
| DS-T-019 | Dark/light canvas/text-primary | Kontrast ≥4.5:1 |
| DS-T-020 | Dark/light surface-1/text-secondary | Kontrast ≥4.5:1 |
| DS-T-021 | Link foreground vs surface | Kontrast hedefi geçer |
| DS-T-022 | Danger/success/warning icon+metin | Durum yalnız renk değil |
| DS-T-023 | Primary CTA foreground/background | Normal metin AA |
| DS-T-024 | Focus ring, tema + yüzeyler | Görsel olarak fark edilir |
| DS-T-025 | Forced-colors active | Sistem renkleri ve odak korunur |
| DS-T-026 | 200% zoom sidebar | Kontrol kaybı/yatay taşma yok |
| DS-T-027 | 200% zoom modal | CTA'lar erişilebilir/scrollable |
| DS-T-028 | TR `İ ı Ş ğ` ve uzun cümle | Overflow ve bozuk harf yok |
| DS-T-029 | EN uzun hata metni | Layout bozulmaz |
| DS-T-030 | Font fallback Windows | Text clipping yok |
| DS-T-031 | Font fallback macOS | Text clipping yok |
| DS-T-032 | Font fallback Linux | Text clipping yok |
| DS-T-033 | Editor açıkken tema değişimi | Editor yeniden mount olmaz |
| DS-T-034 | Editor selection aktif | Seçim konumu korunur |
| DS-T-035 | Markdown preview kod bloğu | Kod ve zemin yeterince ayrışır |
| DS-T-036 | Agent stream devam ederken tema | Akış devam eder, içerik kaybı yok |
| DS-T-037 | Tool trace hata durumu | Metin+ikon+güvenli detay |
| DS-T-038 | Agent approval dialog | Focus trap/return doğru |
| DS-T-039 | Voice recording reduced-motion | Durum statik etiketle açık |
| DS-T-040 | Reduced-motion sidebar | Hareket engellenir, işlev sürer |
| DS-T-041 | Reduced-motion toast | Mesaj görünür, süre kaynaklı kayıp yok |
| DS-T-042 | Tooltip Portal | Doğru tema ve stacking layer |
| DS-T-043 | Dialog Portal | Background overlay ve focus uyumlu |
| DS-T-044 | Tooltip z-index vs modal | Tooltip modal dışında kalmaz |
| DS-T-045 | Scrollbar ve büyük görev listesi | Kaydırma fark edilir; scroll lock yok |
| DS-T-046 | Birden fazla kayıtlı sidebar satırı | Hover animasyon frame jank yok |
| DS-T-047 | Token CSS import tekliği | Duplicate definition/bundle yok |
| DS-T-048 | Tailwind @theme inline build | Semantic utilities üretilir |
| DS-T-049 | Unknown token kullanımı | Static check başarısız |
| DS-T-050 | Raw HEX UI komponentte | Lint uyarısı ve CI fail |
| DS-T-051 | Tema değişimi React Profiler | Gereksiz kitlesel remount yok |
| DS-T-052 | Toast close/keyboard | Açık metin, focus kaybı yok |
| DS-T-053 | ARIA ikon-only control | Erişilebilir isim var |
| DS-T-054 | Kontrast failure fixture | CI gerçekten fail eder |
| DS-T-055 | Feature `ai` disabled | UI design unaffected; tek uygulama |
| DS-T-056 | Theme restore sonrası prefs | Recovery/DB snapshot tercihi doğru uygulanır |

**Test ID kapsamı:** `DS-T-001..056` birebir bir kez tanımlanmalı. Geçişe dair sonuçlar `DOC-04` kalite kapılarında, kod dosyaları ve CI raporlarına kanıtlarla işaretlenir.

## 16. Bütünlük kontrolleri ve sürüm değişikliği politikası

### 16.1 Token değişikliği prosedürü

1. Kullanıcı ihtiyacını açıkla; token değişimi gerçekten gerekli mi kontrol et.
2. Mevcut semantik role uygun tek tokenı düzenle; başka renk kopyası üretme.
3. Light/dark/media fallback/forced-colors varyantlarının hepsini güncelle.
4. `docs/20` versiyonunu güncelle; `DOC-22` UI component snapshot ve `DOC-23` kontrast kullanım alanlarını kontrol et.
5. Kontrast testini ve ana ekranların görsel regresyonunu çalıştır.
6. Uygulamayı gerçek packaged Electron'da test et; headless browser screenshot tek başına yeterli değil.
7. Change log ve kanıt dosyasını `.artifacts/` altında üret; kullanıcı verisi/proje adı/sohbet içeriği ekleme.

### 16.2 Çelişki yönetimi

- `DOC-09/11/19` tema tercihi, IPC ve revision semantiği için normatiftir; `DOC-20` bu alanları override etmez.
- `DOC-20` tüm token ve tema değerleri için normatiftir; `DOC-21` yeni hex palette tanımlamaz.
- `DOC-22` bileşen API ve etkileşimi için normatiftir; rastgele yeni renk/timing token'ı eklemek yerine `DOC-20` güncellemesi ister.
- `DOC-23` nihai erişilebilirlik doğrulama matrisini belirler; `DOC-20` kontrast ve temel görsel sınırı sağlar.
- İlk implementasyondan önce çelişki varsa `DOC-00` çözüm sırası izlenir, sessiz rewrite yapılmaz.

## 17. Definition of Done

`DOC-20` kabul edilebilir tasarım kontratı sayılabilmesi için:

- [ ] Bütün semantik palet değerleri CSS'te tek kaynaklı ve light/dark/forced-colors kapsamlı.
- [ ] `system` teması `nativeTheme` güncellemelerini izler, DB `system` kalır.
- [ ] Preferences kaydı CAS/commit koşuluna bağlı, hata rollback/refetch ile gösterilir.
- [ ] İlk paint boot-theme mirror ve OS fallback ile ters renk parlaması üretmez.
- [ ] Tailwind v4 `@theme inline` ve package CSS exports gerçek build'de doğrulanır.
- [ ] `@iterkeep/ui` ve renderer hiçbir native backend bağımlılığı import etmez.
- [ ] Açık/koyu kontrast + system + forced-colors + reduced-motion testleri geçer.
- [ ] Yazı/zoom, keyboard focus, ikon/renk dışı durum göstergeleri gerçek UI üzerinde doğrulanır.
- [ ] Editör, chat, listeler tema geçişinde remount olmaz; profiller toplanır.
- [ ] `DS-T-001..056` otomasyona veya kayıtlı manuel kontrole bağlanır.
- [ ] DOC-21/22/23 tasarımları bu token kataloğuna bağlıdır.
- [ ] Uygulama implementasyonu ve raporları oluşana dek frontmatter `status: draft` kalır.

## 18. Kaynaklar ve uygulama notları

Resmî teknik dayanaklar (belgenin tek kaynak olduğu tasarım kararlarının yerini almaz):

- Electron nativeTheme: https://www.electronjs.org/docs/latest/api/native-theme
- Tailwind CSS 4 dark mode: https://tailwindcss.com/docs/dark-mode
- Tailwind functions/directives ve `@theme`: https://tailwindcss.com/docs/functions-and-directives
- WCAG 2.2 Quick Reference: https://www.w3.org/WAI/WCAG22/quickref/
- WCAG Understanding Non-text Contrast: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- WCAG Understanding Contrast (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html

**Son karar:** Iterkeep görsel tasarımında yeni UI öğesi **önce semantik token seçerek** oluşturulur; bütün renk/değer/timing'ler komponent içerisinde serbestçe türetilmez. Tema çekirdek veritabanı tercihine uyumlu, işletim sistemini takip eden, yeniden yükleme gerektirmeyen ve opsiyonel AI'dan bağımsız çalışır.
