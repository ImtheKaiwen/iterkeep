---
document_id: DOC-05
title: "Iterkeep — Teknoloji Yığını, Sürüm Politikası ve Mimari Karar Kayıtları"
version: "0.1.0"
status: "draft"
last_updated: "2026-10-10"
language: "tr-TR"
owner: "Software Architecture & Platform Engineering"
depends_on:
  - "DOC-00"
  - "DOC-01"
  - "DOC-02"
  - "DOC-03"
  - "DOC-04"
---

# Iterkeep — Teknoloji Yığını, Sürüm Politikası ve Mimari Karar Kayıtları

> **Amaç:** Iterkeep V1 için uygulanacak teknolojileri, kullanılmayacak alternatifleri, seçim gerekçelerini, dağıtım risklerini, sürüm sabitleme ve doğrulama politikasını ve kodlama ajanının bu kararları nasıl uygulayacağını belirlemek.
>
> **Yetki sınırı:** Teknoloji/bağımlılık seçiminin normatif kaynağı **DOC-05**'tir. Kesin dizin ağacı **DOC-07**, domain DTO **DOC-08**, SQL DDL **DOC-09**, veritabanı çalışma akışları **DOC-10**, IPC yöntem adları ve payload şemaları **DOC-11**, UI tokenları **DOC-20**, model indirme protokolü **DOC-25**, performans ölçüm değerleri **DOC-31**, CI uygulaması **DOC-34** ve uygulama sırası **DOC-35** tarafından tanımlanacaktır. Bu belgede verilen kod örnekleri bağlayıcı **tasarım kalıplarıdır**, oluşturulmuş ya da test edilmiş ürün kodu değildir.
>
> **Durum:** `draft`; sürüm adayları 10.10.2026 tarihindeki kamuya açık sürüm ve resmî kaynak incelemesine dayanır. **Hiçbir paket burada kurulup derlenmiş veya Windows installer testinden geçirilmiş değildir.** Kabul ve sürüm kilidi ancak başlangıç uyumluluk denemesi + `package-lock.json` + temiz Windows paket testiyle kesinleşir.

---

## 1. Karar bağlamı ve değişmez koşullar

### 1.1 Ürün niçin bu stack'e ihtiyaç duyuyor?

Iterkeep; binlerce projeyi, çok sayıda görevi/notu/kararı, sık eklenen günlükleri ve bunların aranmasını **bilgisayarda, internet ve hesap gerektirmeden** yapabilmelidir. Yapay zekâ ve ses özellikleri ihtiyaç anında eklenir; bu sağlayıcıların kapanması, modelin silinmesi, bozulması veya güncellenmesi **temel ürünü etkilememelidir**. Kullanıcı verilerinin tek kanonik kaynağı SQLite'tır. Markdown/YAML ise kullanıcıya ait taşınabilir import/export biçimidir. `DOC-00` içindeki P-01–P-12 ilkeleri ve `DOC-02` içindeki `REQ-*` maddeleri geçerlidir.

### 1.2 V1 hedef platformları ve destek sınırı

| Alan | V1 normatif kural | Gerekçe |
|---|---|---|
| Birincil paket | Windows 11 x64 yüklenebilir dağıtım | İlk gerçek kullanıcı ve referans test ortamı |
| Mimari hazırlığı | macOS ARM64/x64 ve Linux x64 için platform adaptörleri | Platform kilidi oluşmasın |
| Destek taahhüdü | Windows dışındaki platformlar doğrulanmadan 'destekleniyor' denmez | Çalışma ≠ doğrulanmış paket |
| Veri | Tek kullanıcı, yerel workspace, SQLite | Sunucu ve üyelik yok |
| Ağ | Çekirdek için zorunlu ağ isteği yok | Offline-first |
| Git | İsteğe bağlı dış araç / adapter | Git olmadan uygulama işlevsel |
| AI | Ollama etkinleşirse kullanılır | AI yokken UI, arama ve veri yazma sürer |
| STT/TTS | Ayrı isteğe bağlı çalışma süreçleri | Bellek ve hata izolasyonu |

Windows 10 için ayrıca destek sözü verilmez. Ürün gerektiriyorsa `DOC-34`'te destek matrisi genişletilir; macOS/Linux paketleri otomatik olarak Windows ile eşdeğer sayılmaz.

### 1.3 Teknik öncelik sıralaması

1. **Veri doğruluğu ve gizlilik**, ardından **kararlı kullanıcı deneyimi**, sonra **algılanan hız**, sonra **mühendislik kolaylığı**.
2. UI açılışı sırasında Ollama/Whisper/TTS sorgusu beklenmez.
3. Tek ana kalıcı veri kaynağı: SQLite. Birden fazla uygulama katmanı veritabanına serbestçe yazamaz.
4. Native modüllerin installer içinde çalışması yalnız geliştirme ortamındaki çalışmasından daha önemlidir.
5. Tip güvenliği derleme sınırında durmaz: preload, IPC, dosya import, model yanıtı ve child process çıktıları runtime'da doğrulanır.
6. Kullanılmayan framework ve performans optimizasyonları bağımlılık olarak eklenmez.
7. Bir sürüm 'hızlı' veya 'güvenli' yalnız ölçüm/kanıtla ilan edilir (`DOC-04`, `DOC-31`).

---

## 2. Kabul edilen teknoloji matrisi

**Sürüm sütunu:** `pin adayı` test edilmeden kesin üretim kilidi değildir. Tam pin gerektiği yerlerde doğrulanmış örnek verilir; diğerlerinde uyumlu ana sürüm seçilmiş, ilk çalışan dependency graph üzerindeki tam versiyonlar lockfile'a kilitlenecektir. **`latest` etiketi üretim bağımlılığı değildir.**

| Bölge | Tercih / paket | Seçilen aile / pin adayı | Durum | Temel kullanım |
|---|---|---|---|---|
| Desktop runtime | `electron` | **44.7.0** | Pin adayı | Pencere, OS API, yerel yaşam döngüsü |
| Build & installer | `@electron-forge/*` | **7.11.2** aynı sürüm ailesi | Pin adayı | Geliştirme, paketleme, maker'lar |
| Renderer bundler | `vite` | **8.x** | Uyumluluk kapısına bağlı | React HMR, derleme |
| Forge Vite | `@electron-forge/plugin-vite` | **7.11.2** | Deneysel eklenti; doğrulama gerekli | Main/preload/renderer build |
| Native packaging | `@electron-forge/plugin-auto-unpack-natives` | **7.11.2** | Pin adayı | Native `.node` modüllerini ASAR dışında tutma |
| UI | `react`, `react-dom` | **19.3.0** | Pin adayı | Arayüz |
| UI dili | `typescript` | **7.0.2** | Pin adayı | `strict`, proje referansları |
| Vite React eklentisi | `@vitejs/plugin-react` | **6.1.2** | Pin adayı | JSX / Fast Refresh |
| Workspace package manager | `npm`, `npm workspaces` | **Node 24 LTS ile gelen npm, lockfile ile** | Kabul | İşletim/sürüm sadeleşmesi |
| Çekirdek JS çalışma zamanı | Node.js | **24.x LTS** (geliştirme) | Kabul | Tooling ve script'ler |
| SQLite binding | `better-sqlite3` | **13.0.3** | Native uyumluluk kapısı | Hazırlanmış SQL, transaction, backup |
| Arama | SQLite FTS5 | Bağlı SQLite build | Kabul | Yerel tam metin arama |
| Validasyon | `zod` | **4.x** | Kabul | IPC, import, model/tool şeması |
| Renderer async state | `@tanstack/react-query` | **5.x** | Kabul | IPC sorgu önbelleği, invalidation |
| Renderer ephemeral state | `zustand` | **5.x** | Kabul | Panel, tema seçimi, anlık UI durumu |
| UI tasarımı | `tailwindcss` + `@tailwindcss/vite` | **4.x** | Kabul | Merkezi CSS token ve utility'ler |
| Erişilebilir UI primitives | `@radix-ui/react-*` | Kararlı uyumlu paketler | Kabul | Dialog, popover, select, focus |
| İkonlar | `lucide-react` | Kararlı uyumlu sürüm | Kabul | Hafif, tutarlı ikonografi |
| Uzun listeler | `@tanstack/react-virtual` | **3.x** | Kabul | Kanban/liste/sorgu sonucu sanallaştırma |
| Markdown editör | CodeMirror 6 ekosistemi | Uyumluluğu kilitlenecek | Kabul | Hafif, kontrollü editör |
| Markdown parse | `unified`, `remark-parse`, `remark-gfm` | Uyumlu kararlı sürümler | Kabul | Import/export/önizleme |
| YAML | `yaml` | Uyumlu kararlı sürüm | Kabul | Şemalı `meta.yml` taşınabilirliği |
| Markdown render | `react-markdown` + sanitize politikası | Uyumlu kararlı sürüm | Kabul | Script'siz içerik gösterimi |
| Dil | `i18next`, `react-i18next` | Uyumlu kararlı sürümler | Kabul | `tr-TR`, `en-US` |
| Tarihler | `date-fns` | Uyumlu kararlı sürüm | Kabul | Takvim ve timezone yardımcıları |
| Unit/integration | `vitest` | Vite 8 ile doğrulanmış kararlı sürüm | Kabul | Core, adapter, view-model |
| UI component tests | React Testing Library | React 19 ile uyumlu sürüm | Kabul | Erişilebilir kullanıcı etkileşimi |
| E2E | `@playwright/test` + Electron launch | **1.64.0** pin adayı | Kabul | Gerçek Electron uçtan uca |
| Lint/format | ESLint, `typescript-eslint`, Prettier | Birbirine uyumlu kararlı sürümler | Kabul | Kod kalitesi |
| CI | GitHub Actions | Pinlenmiş action commit SHA | Kabul | PR ve release doğrulaması |
| Optional LLM | Ollama HTTP API | Capability/version probe | Kabul | Model keşfi, streaming, tools |
| Optional STT | `whisper.cpp` sidecar | İndirilen doğrulanmış binary/model | Kabul | Transkripsiyon |
| Optional TTS | EMA Lightning sidecar | İzole runtime/model | Kabul | Türkçe sesli geri bildirim |

**Önemli:** Yukarıdaki sürümler birbirleriyle birlikte **henüz denenmedi**. Özellikle `Vite 8 + Forge Vite 7.11.2 + Electron 44 + better-sqlite3 13` birleşimi, ilk aşamada kesin **uyumluluk POC** gerektirir. Geçmezse ilk tercih Forge Vite eklentisini aynı ana serinin uyumlu düzeltme sürümüne almak; yine başarısızsa belgeli mimari değişiklik (`ADR` revizyonu) ile ayrı Vite build pipeline kurmaktır. *Sessizce sürüm değiştirmek yasaktır.*

### 2.1 Sürüm araştırma notu (10.10.2026)

- Electron v44.7.0, **7 Ekim 2026** tarihinde yayımlanmış kararlı sürümdür; 45 serisi bu tarihte beta aşamasındadır: https://releases.electronjs.org/release/v44.7.0 ve https://releases.electronjs.org/schedule
- Forge 7.11.2, Forge 8.0.1'in yeni yayımlandığı tarihte daha olgun seçenektir; Forge 8'e otomatik geçilmez: https://www.npmjs.com/package/@electron-forge/cli?activeTab=versions
- Forge Vite eklentisi resmî belgelerde **experimental** olarak açıklanır: https://www.electronforge.io/config/plugins/vite
- Native modüller, Electron ABI'ye yeniden derlenmek zorundadır: https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules
- Native ASAR unpack: https://www.electronforge.io/config/plugins/auto-unpack-natives
- React 19.3.0: https://www.npmjs.com/package/react ; TypeScript 7.0.2: https://www.npmjs.com/package/typescript
- better-sqlite3 13.0.3: https://www.npmjs.com/package/better-sqlite3 ; Vite 8 kararlı duyurusu: https://vite.dev/blog/announcing-vite8
- Tailwind 4.3.x: https://www.npmjs.com/package/tailwindcss ; Playwright 1.64.0: https://www.npmjs.com/package/@playwright/test
- Node 24 LTS: https://github.com/nodejs/Release/blob/main/README.md

Bu bağlantılar **karar inceleme kaynaklarıdır**; çalışma zamanı veya paketleme entegrasyon testinin yerine geçmez.

---

## 3. ADR defteri — kararların statüsü

| ADR | Karar | Statü | Bağlı doküman |
|---|---|---|---|
| ADR-001 | Electron + React + TypeScript masaüstü | Accepted-for-design | 06,07 |
| ADR-002 | Forge 7 + Vite 8, uyumluluk test kapısı ile | Conditional | 07,34 |
| ADR-003 | npm workspaces + tek package-lock | Accepted-for-design | 07,34 |
| ADR-004 | SQLite canonical + better-sqlite3 | Conditional native POC | 09,10 |
| ADR-005 | DB yalnızca worker'da; tek writer | Accepted-for-design | 06,10,12 |
| ADR-006 | FTS5 / kontrollü Türkçe arama | Accepted-for-design | 15 |
| ADR-007 | IPC üzerinden domain commands; Zod | Accepted-for-design | 11,30 |
| ADR-008 | TanStack Query + Zustand sorumluluk ayrımı | Accepted-for-design | 12,22 |
| ADR-009 | Tailwind 4 + merkezi design tokens | Accepted-for-design | 20 |
| ADR-010 | Radix primitives + erişilebilir UI | Accepted-for-design | 22,23 |
| ADR-011 | CodeMirror 6 / Markdown import-export | Accepted-for-design | 14,16 |
| ADR-012 | Ollama yalnız local/onaylı endpoint adaptörü | Accepted-for-design | 24,25 |
| ADR-013 | Agent deterministic tool gateway / izlenebilirlik | Accepted-for-design | 26,27 |
| ADR-014 | Whisper.cpp ayrı STT sidecar | Accepted-for-design | 28 |
| ADR-015 | EMA Lightning ayrı TTS sidecar | Accepted-for-design | 29 |
| ADR-016 | Sidecar'lar isteğe bağlı, açılışı bloklamaz | Accepted-for-design | 18,19,24 |
| ADR-017 | Windows x64 önce; diğer platformlar sonra | Accepted-for-design | 34 |
| ADR-018 | CI git SHA / dependency / imza doğrulaması | Accepted-for-design | 30,34 |
| ADR-019 | Gözlenebilirlik local ve redakte | Accepted-for-design | 27,32 |
| ADR-020 | Git ve Markdown dışa aktarımı opsiyonel | Accepted-for-design | 16,17 |
| ADR-021 | Başlangıçta ORM yok; typed repository SQL | Accepted-for-design | 09,10 |
| ADR-022 | Router: React Router data-loader'sız basit mod | Accepted-for-design | 21 |
| ADR-023 | Geliştirmede Node 24 LTS; üretimde Electron'un Node'u | Accepted-for-design | 07,34 |
| ADR-024 | Performans: ölç, sonra optimize et; ağır işler ayrık | Accepted-for-design | 31 |
| ADR-025 | AI/voice network ve model indirme açık kullanıcı onayı | Accepted-for-design | 18,19,30 |

`Accepted-for-design`, gerçek test sonucu değildir. `Conditional` kararlar POC kabul senaryosu geçmedikçe üretim sürümü için `approved` sayılmaz. Belgede yeni ADR açılırsa mevcut ID'ler değiştirilmez; gerekirse `supersedes` ilişkisi eklenir.

---

## 4. ADR-001/002/017/023 — Electron ve derleme altyapısı

### 4.1 Electron seçme gerekçeleri

- React tabanlı olgun ekosistem, Electron preload/IPC, Windows installer ve native servis entegrasyonu.
- Paketlemenin ağır olması kabul edilmiş bir trade-off'tur; Electron ile **mutlak milisaniyelik cold start vaat edilmez**.
- Tauri V1 için seçilmedi: ayrı Rust çekirdeği ve komut sınırları aynı anda kurulursa öğrenme/bakım yükü artar. Daha sonra ihtiyaç doğarsa `Application Core` ayrımı UI/runtime değişimini kolaylaştırır.
- Web veya PWA seçilmedi: istenen işletim sistemi entegrasyonu, yerel DB ve sidecar yönetimi kolaylığı.

### 4.2 Süreç ayrımı (high level)

```text
APP START
  └─ Electron Main (hafif orchestrator)
       ├─ BrowserWindow / renderer (React, sandbox ON)
       │    └─ preload (dar API; DB/FS/child process erişimi yok)
       ├─ DB worker (Node worker thread, better-sqlite3)
       ├─ background jobs worker (index/import/export/safe batch)
       ├─ Ollama adapter (yerel HTTP isteği; yalnız talep edilirse)
       └─ optional sidecars (Whisper, EMA Lightning; kullanıcı tetikler)
```

İş parçacığı ve servislerin gerçek dosya adları `DOC-07`, görev yaşam döngüsü `DOC-12` tarafından kesinleştirilecektir. Windows kapatma/kurtarma davranışı `DOC-32` içindedir.

### 4.3 Electron pencere güvenliği

Normatif başlangıç özellikleri:

```ts
webPreferences: {
  contextIsolation: true,
  sandbox: true,
  nodeIntegration: false,
  webSecurity: true,
  preload: absolutePreloadPath,
}
```

- Renderer'a `fs`, `child_process`, `sqlite` veya genel `ipcRenderer` aktarılmaz.
- Haricî URL navigasyonu, yeni pencere ve izinler kısıtlanır.
- Yerel paket içeriği için kapalı CSP ve uygun özel protokol tercih edilir; `file://` kullanımından uzaklaşma aşamaları `DOC-30`'da güvenlik incelemesiyle kesinleşir.
- Geliştirme sunucusu istisnası sadece `dev` modunda ve açıkça tanımlıdır; `dev` bayrağı kullanıcı girdisinden gelmez.
- Electron Fuses ve sandbox kontrolleri release build üzerinde doğrulanır.

Kaynak: https://www.electronjs.org/docs/latest/tutorial/security

### 4.4 Forge 7 + Vite 8: bilinçli risk ve kabul denemesi

Forge'ın Vite eklentisinin deneysel statüsü sebebiyle şu kombinasyon için **ilk gün** `POC-STACK-001` yapılır:

1. Windows x64 üzerinde Node 24 LTS ve temiz `npm ci`.
2. Forge 7.11.2 + `plugin-vite@7.11.2` + Vite 8 ile renderer + preload + main build.
3. `forge start`: pencere açılır, preload yalnız izinli API'yi sunar.
4. `forge package`: paketlenmiş uygulamada renderer kaynakları yüklenir.
5. Native `better-sqlite3` `require/import` üzerinden paketlenmiş süreçte açılır; `SELECT 1` ve FTS5 kullanılabilir.
6. Windows installer gerçekten kurulur, çalışır ve kaldırılır.
7. `npm ci` ikinci kez aynı grafı üretir.

Başarısızsa bulgu `STACK-COMPAT-001` ile kaydedilir. Önce aynı kararlı ana sürümde uyumlu dependency düzeltmesi; sonra alternatif Vite giriş build'i; son çare `ADR-002` değişikliği düşünülür. Native DB çalışmıyorsa **AI veya UI geliştirmesine geçilip sorun saklanmaz**.

### 4.5 Native ASAR ve Forge kuralları

- `better-sqlite3` native modüldür: Electron ABI'ye uygun derlenir (`@electron/rebuild` Forge tarafından yönetilir).
- Forge auto-unpack-natives eklentisi kullanılır; `packagerConfig.asar` aktiftir.
- Vite tarafında `better-sqlite3` **external** kalır; `.node` dosyaları browser/renderer bundle'ına girmez.
- Worker entry ve native module yükleme yolu **paketlenmiş build altında** test edilir. Bundler'ın dev ortamında çözdüğü URL paket ortamında farklı olabilir.
- Native bağımlılık `dependencies` içinde olmalıdır, yalnız `devDependencies` içinde olmamalıdır.
- Electron patch/major yükseltmesinden sonra Windows x64 install-smoke ve native rebuild zorunludur.
- Installer önceki sürümü güncelleyince workspace DB'nin taşınmadığı/doğru kaldığı kanıtlanır.

### 4.6 Örnek Forge tasarım kalıbı (uyumluluk denemesine tabi)

Aşağıdaki şema **tam çalışan config iddiası değildir**. `DOC-07` repo ağacı tamamlandığında üretim dosyası oluşturulur:

```ts
// forge.config.ts — örnek başlangıç kalıbı
import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';

const config: ForgeConfig = {
  packagerConfig: { asar: true },
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        { entry: 'src/main/main.ts', config: 'vite.main.config.ts' },
        { entry: 'src/preload/index.ts', config: 'vite.preload.config.ts' },
        { entry: 'src/workers/db.worker.ts', config: 'vite.worker.config.ts' },
      ],
      renderer: [
        { name: 'main_window', config: 'vite.renderer.config.ts' },
      ],
      concurrent: false,
    }),
  ],
};

export default config;
```

Gerçek çalışma sırasında Forge 7'nin worker build ve plugin API desteği doğrulanacaktır. Native `external` ayarları Vite 8'in Rolldown yapılandırma API'sine göre kesinleştirilir; eski `rollupOptions` isimleri test edilmeden kopyalanmaz. Maker/publisher ayarları `DOC-34`'tedir.

---

## 5. ADR-003/023 — Node, npm, lockfile ve sürüm politikası

### 5.1 Neden npm workspaces?

- Forge paketleme dokümanları `node_modules` dizininden paket bağımlılıklarını keşfeder. Symlink temelli bazı monorepo düzenleri ek konfigürasyon gerektirebilir.
- Tek repo, az sayıda paket, proje başlangıcında ek bir package manager katmanına ihtiyaç yoktur.
- `npm workspaces` + **tek** `package-lock.json` + `npm ci` tekrarlanabilir build sunar.
- `pnpm` yasak değildir; fakat sonradan geçiş, uygun paketleme/ASAR testleri ve `ADR-003` revizyonu gerektirir.

Kaynak: https://www.electronforge.io/

### 5.2 Repo script sözleşmesi

`DOC-07` oluşturulurken package.json'da aşağıdaki script **isimleri** bulunacaktır; uygulama komutlarının içeriği o belgede normatiftir:

```json
{
  "scripts": {
    "dev": "electron-forge start",
    "build": "electron-forge package",
    "make": "electron-forge make",
    "typecheck": "tsc --build --pretty false",
    "lint": "eslint .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "verify": "npm run typecheck && npm run lint && npm run test"
  }
}
```

**Dikkat:** Script isimleri taslak kontrattır; `tsc --build` proje referansları, dosya yolları ve test runner entegrasyonları `DOC-07/33/34` tarafından oluşturulmadan çalıştığı ileri sürülemez.

### 5.3 Exact pin ve güvenli güncelleme

- `package.json` içinde doğrudan bağımlılıklar mümkünse **tam `x.y.z`** olarak yazılır (`^` veya `*` yok). npm `save-exact` aktif edilir.
- Lockfile **zorunlu commit** edilir; CI `npm install` değil `npm ci` kullanır.
- Node major 24 geliştirmede sabittir (`.nvmrc` ve `engines`). Electron 44 içindeki Node versiyonu platform runtime'ını belirler; global Node kurulumu end-user şartı değildir.
- Releaselerde bağımlılık ve lockfile güncellemesi ayrı PR ve test grubudur; güvenlik güncellemeleri için hızlandırılmış onay mümkün, ama test atlanamaz.
- Native modül, Electron ve Forge sürümleri **birlikte** güncellenip yeniden paketlenir.
- Bağımlılık lisans envanteri ve SBOM release artefaktı olarak üretilir.
- Optional model binary'leri ve Python sidecar bağımlılıkları kendi hash/manifest ve lisans envanterleriyle izlenir; npm lockfile bunların yerine geçmez.

### 5.4 `POC-STACK-001` sonrası lockfile kilitleme kaydı

```yaml
# docs içi karar kaydı örneği; gerçek lockfile yerine geçmez
stack_lock:
  status: pending-validation
  reference_platform: windows-x64
  node_major: 24
  electron: 44.7.0
  forge: 7.11.2
  react: 19.3.0
  typescript: 7.0.2
  better_sqlite3: 13.0.3
  vite: "8.x -> exact version after compatibility POC"
  npm_lock_sha256: null
  proof_artifact: null
```

Test başarılı olduğunda burada `status: verified`, gerçek sürümler, lockfile hash'i ve artefakt konumu belirtilir. Sırf dosyada tablo bulundu diye `verified` yazılamaz.

---

## 6. ADR-004/005/006/021 — SQLite ve veri erişimi

### 6.1 Neden SQLite?

| Seçenek | Avantaj | Dezavantaj | V1 kararı |
|---|---|---|---|
| Plain Markdown tek veri deposu | İnsan tarafından doğrudan okunur | İlişkisel sorgu/filtre, metadata bütünlüğü ve eşzamanlı yazma yönetimi daha zahmetli | Ana depo değil |
| IndexedDB renderer içinde | Web UI ile yakın | IPC dışı domain ve CLI yeniden kullanımı zorlaşır; güven sınırı bulanıklaşır | Seçilmedi |
| SQLite + FTS5 | Transaction, indeks, arama, tek dosya, offline | Native paketleme ve migration gerektirir | **Seçildi** |
| PostgreSQL | Çoklu kullanıcı için güçlü | Sunucu kurulumu, ağır dağıtım | V1 dışı |

SQLite'ın WAL modu bazı koşullarda eşzamanlı okuyucu/yazıcı davranışına fayda sağlar; **bir anda çok sayıda bağımsız writer garantisi vermez**. `SQLITE_BUSY` ve checkpoint politikası `DOC-10`'da tanımlanır.

Kaynaklar: https://www.sqlite.org/wal.html , https://www.sqlite.org/fts5.html

### 6.2 `better-sqlite3` ve tek writer stratejisi

- `better-sqlite3` senkron API sunar; **Electron main ve renderer'da çalıştırılmaz**.
- Ayrılmış **DB worker** SQLite bağlantısının sahibidir; uygulama katmanı typed request/response ile kullanır.
- V1 için tek worker üzerinden yazma sıraya alınır; böylece write-conflict yönetimi basitleşir.
- WAL, `foreign_keys`, `busy_timeout` ve migration doğrulaması açılışta bir kez uygulanır (`DOC-10`).
- DB worker'ın çökmesi 'kaydedildi' bildirimi üretmez. İşlemler ACK alana kadar `pending` kalır.
- `busy` veya `constraint` gibi nedenlerle yapılan başarısız yazmalar transaction'da rollback olur; yeniden deneme yalnız idempotent olduğu kanıtlanan operasyonlarda yapılır.
- Veri dizini Electron `app.getPath('userData')` altındadır; kullanıcı farklı workspace seçerse güvenli path doğrulama ve geçiş akışı `DOC-17/19`'da tanımlanır.

### 6.3 Neden ilk sürümde ORM yok?

- Kapsamlı ilişkisel domain için basit SQL yeterli ve izlenebilir.
- Drizzle benzeri typed ORM, migration ve build bağımlılığı ekler; SQLite FTS5 ve özel arama sorgularında yine SQL yazma ihtiyacı vardır.
- `Repository` arayüzleri TypeScript'te tipli, parametreli statement'lar içinde SQL olarak yazılır.
- Sorgu sayısı/bakım maliyeti V1 sonrasında yükselirse farklı ORM için ADR açılabilir; gereksiz soyutlama ilk günden şart koşulmaz.

### 6.4 SQL sorumluluk sınırları

**Yalnızca `DOC-09`**: tablo DDL, indeks, trigger, FTS virtual table ve migration dosyası isimleri.

**Yalnızca `DOC-10`**: bağlantı yaşam döngüsü, transaction, yedekleme API çağrıları, WAL checkpoint, error/retry.

**Yalnızca `DOC-15`**: Türkçe normalizasyon, güvenli FTS sorgu derleyicisi, arama kalitesi.

**Yalnızca `DOC-17`**: yedekten geri yükleme UI işlemi ve kurtarma akışı.

Bu belge bunlardan birinin yerine yeni SQL şema üretmez.

### 6.5 Worker istek sözleşmesi — temsili tipler

```ts
// Örnek iç mesaj zarfı; kanonik DTO'lar DOC-08/11'de tanımlanır.
type DbRequest = Readonly<{
  requestId: string;
  operation: 'query' | 'command' | 'transaction' | 'health';
  commandName: string;     // Geliştirici tanımlı allowlist; SQL cümlesi değildir.
  arguments: unknown;
  correlationId?: string;
}>;

type DbReply =
  | Readonly<{ requestId: string; ok: true; data: unknown }>
  | Readonly<{
      requestId: string;
      ok: false;
      error: { code: string; retryable: boolean; message: string };
    }>;
```

Renderer ya da agent'ın DB worker'a **ham SQL göndermesi yasaktır**. `commandName` sabit servis kayıtlarından gelir; `arguments` verisi sınırda doğrulanır.

### 6.6 Migration ve geri dönüş garantisi

- **Forward-only migration**; eski uygulama sürümünün yeni şemayı sessizce açmasına izin verilmez.
- Migration öncesi tutarlı SQLite backup; migration transaction'ı, başarısızlık kayıtları ve gerekirse kullanıcıya kurtarma seçeneği.
- Test: boş DB, son iki desteklenen şema sürümünden yükseltme, migration yarıda kalma, açılışta `integrity_check` ihtiyacı, büyük veri seti.
- Assets ve DB aynı anda kullanılan operasyonlarda 'DB transaction atomik ama file system değil' riski `DOC-17/32`'de ele alınır.

### 6.7 FTS5 ve Türkçe

- `fts5` SQL sorgusu veri/alan izinlerine göre oluşturulur; kullanıcı metni doğrudan `MATCH` ifadesine tehlikeli sözdiziminde eklenmez.
- İlgisiz sonuç üretmemek için Unicode `I/İ/ı/i` ve ekli kelime testleri ayrı fixture içerir.
- İlk açılışta her kelime için LLM çağrısı yapılmaz; FTS sorguları yerelde çalışır.
- İndeksler veriyle uyumlu tutulur; rebuild operasyonları job/worker'da ve ilerleme mesajlarıyla yürür.

---

## 7. ADR-007/008/022 — React, IPC, state, navigation

### 7.1 State ownership kuralı

| Veri | Sahibi | React tarafı |
|---|---|---|
| Proje/görev/not/karar/log | SQLite + Application Core | React Query ile okunur/güncellenir |
| Yükleniyor/hata/son güncelleme | Async query yaşam döngüsü | TanStack Query |
| Açık panel, sidebar genişliği, modal görünümü | UI | Zustand veya local component state |
| Geçerli tema ve dil tercihi | Persisted settings service | UI store hydration |
| Agent run/tool durumu | Job / agent runtime | Stream event + query snapshot |
| Model indirme ilerlemesi | Capability Manager | Event stream snapshot, ephemeral UI |
| Seçilen project ID (route) | Router | Route param; backend'den doğrulanmış proje |

**Anti-pattern:** SQLite tablosunun tamamını Zustand'a kopyalayıp iki ayrı cache üretmek; React render'ında dosya sistemi erişimi; `useEffect` içinde tüm DB'yi polling ile her saniye tekrar okumak.

### 7.2 React Query IPC query kalıbı

```ts
// Örnek; gerçek preload API adı ve DTO DOC-11 tarafından belirlenecek.
const projectKeys = {
  all: ['projects'] as const,
  detail: (id: string) => ['projects', 'detail', id] as const,
};

async function loadProject(id: string) {
  // window.iterkeep.project.get() yalnız güvenli preload köprüsüdür.
  return window.iterkeep.project.get({ id });
}

// Bir mutation ACK aldıktan sonra ilgili query invalidation yapılır.
// ACK gelmeden 'kalıcı kaydedildi' bildirimi gösterilemez.
```

Tüm query'leri global invalidation etmek yerine ilgili entity ID'si bazında cache güncellemesi uygulanır. Pencere odaklanınca gereksiz refetch ve disk yoğunluğu önlenir.

### 7.3 IPC üzerinden tek komut yolu

```text
UI click / keyboard / quick add
    ↓
Typed preload API
    ↓
Main IPC Gateway (sender allowlist + schema + authorization)
    ↓
Application Command Handler
    ↓
Repository / DB worker
    ↓
Result event + query invalidation
```

Agent `tasks.create` tool'u çağırdığında da aynı Application Command Handler kullanılır; UI ve agent için iki ayrı iş kuralı yazılmaz.

IPC kanalı için yalnız `DOC-11` normatiftir. `ipcRenderer.send(channel, anything)` gibi sınırsız API renderer'a açılmaz. Parametre ve sonuç boyutu, timeout, cancellation, sender kontrolü ve hata kodları şarttır.

### 7.4 Navigation

- React Router'ın **basit istemci tarafı router** kullanımı seçildi; rota ID/parametre sözleşmeleri `DOC-21`'de.
- İlk sürümde React Router data-loader, SSR veya sunucu bileşenleri yoktur; domain servislerinin sahibi Electron'dur.
- Deep link veya import edilen dış URL kendiliğinden komut çalıştıramaz.
- Panel kapanması/geri tuşu/focus geri dönmesi erişilebilirlik testine dahildir.

---

## 8. ADR-009/010/011 — Design system, UI ve editör

### 8.1 Merkezi tasarım sistemi

- **Tailwind CSS 4** yalnız style utility katmanı; **CSS custom properties** tasarım tokenlarının tek kaynağıdır (`DOC-20`).
- Tema: `light`, `dark`, `system`; kullanıcının açık tercihi kalıcı ayar olarak saklanır.
- Anlık tema geçişi stylesheet token değişimiyle yapılır; tüm komponentlere manuel dark-mode prop yayılmaz.
- Renk, spacing, border radius, font ailesi, focus ring, gölge ve animasyon süreleri tek yerde tanımlanır.
- Kullanıcının `prefers-reduced-motion` tercihi desteklenir; animasyonlar çekirdek işlevi engellemez.
- Bileşen kitaplığı baştan ağır bir hazır dashboard kitine bağımlı olmaz; Radix primitives üzerine ürün bileşenleri inşa edilir.

### 8.2 Sade UI ve hız

- `React.lazy` / route-level code splitting: agent paneli, markdown editörü, grafik ve ses UI'sı ana splash bundle'a zorla girmez.
- Çok uzun görev veya arama listeleri sanallaştırılır; ilk 20–50 görünür öğe işlenir.
- Ağır selector/computation React render sırasında tekrarlanmaz; memoization ölçüme göre yapılır.
- Tek tip skeleton, empty/error/success bileşenleri.
- `useCallback`/`memo` rastgele her yerde kullanılmaz; profil sonuçlarıyla gerekçelendirilir.
- Dark/light varyantları ayrı bileşen kopyaları oluşturmaz.

### 8.3 Markdown işlemleri

- Not editörü CodeMirror 6; normal günlük ekleme, task create gibi kısa formlarda ağır editör yüklenmez.
- Markdown içeriği `remark` ile ayrıştırılır; önizleme güvenli allowlist altında oluşturulur.
- Import edilen Markdown içindeki HTML/JS **asla** Node/Electron ayrıcalığı almaz; ham HTML gösterimi V1 için kapalıdır.
- Export formatı, dosya isimlendirme ve idempotence `DOC-16`'nın sorumluluğundadır.

### 8.4 Erişilebilirlik ve lokalizasyon

- V1: `tr-TR` ve `en-US` dil kaynakları; tüm UI metinleri key bazlı, yerelleştirilebilir.
- Yalnız ikon içeren butonun erişilebilir adı, modal focus trap, klavye Escape, list navigation, reduced-motion.
- Tarih saatler UTC veya offset korunan saklama biçiminden kullanıcı yerel saatine çevrilir; kullanıcının sistem saati değişirse veriler bozulmaz.
- UI testlerinde erişilebilir rol ve adlar kullanılır; `data-testid` tek erişim yolu sayılmaz.

---

## 9. ADR-012/013/025 — Ollama ve agent

### 9.1 Ollama bir bağımlılık değil, bir adapter'dır

Çekirdek uygulama `OllamaProvider` olmadan açılır. Model bulunamadı veya servis bozuksa `ProviderUnavailable` sonucu döner; görev/not kaydı etkilenmez.

```ts
// Örnek mimari arayüz; kesin tipler DOC-24/26 tarafından tanımlanır.
interface LocalLlmProvider {
  probe(signal: AbortSignal): Promise<{ ready: boolean; detail?: string }>;
  listModels(signal: AbortSignal): Promise<readonly { id: string }[]>;
  streamChat(
    request: { modelId: string; messages: readonly unknown[] },
    signal: AbortSignal,
  ): AsyncIterable<unknown>;
}
```

- Kullanıcı onaylamadan Ollama kurulumu veya model indirme başlamaz.
- Yerel endpoint varsayılanı uygulamanın bilinen loopback portudur; dış endpoint varsayılan olarak reddedilir.
- Ağ bağlanırlığı için kısa timeout, `AbortController` ve health TTL kullanılır; UI açılışında `await` edilmez.
- Model adı, yüklü olma, hazır olma, tool testini geçme ve benchmark skorları ayrı durum alanlarıdır.
- Model `latest` etiketi kullanıcıya belirsiz tavsiye değildir; gerçek model ID/digest görüntülenir.
- Model benchmark kullanıcı onayı/konfigürasyonuna göre çalışır; GPU/VRAM baskısı normal kullanımda sürekli yaratılmaz.

### 9.2 Tool çağırma

```text
User request → context retrieval → LLM proposes tool
→ tool schema validation → policy check → approval if required
→ deterministic Application Command Handler
→ write ACK → audit event → final user response
```

- Agent'ın kod çalıştırma, kabuk erişimi, serbest SQL yürütme veya sınırsız dosya okuma aracı **V1'de yoktur**.
- Araç argümanları `DOC-26` Zod şemasıyla doğrulanır.
- Riskli yazma/silme işlemleri `DOC-27/30` politikasına bağlanır.
- Her run, step ve tool call için durum ve korelasyon kimliği üretilir.
- UI'da yalnız doğrulanabilir araç olayları, çıktı özeti, süre, hata ve onaylar gösterilir; modelin gizli düşünce zinciri varmış gibi taklit edilmez.
- Başarısız bir tool call kullanıcının önceden tamamlanmış verilerini rollback yapmaz; çok adımlı işlemler için compensating action yalnız kesin tanımlıysa uygulanır.

---

## 10. ADR-014/015/016 — Whisper ve EMA Lightning

### 10.1 İsteğe bağlı sağlayıcı mimarisi

```text
Mic button (renderer)
  → permission & session owner
  → capture, stop
  → transcription job (Whisper sidecar)
  → editable text preview
  → [save note / create task / send to agent]

Agent text result
  → optional TTS request
  → EMA Lightning sidecar
  → audio playback / stop
```

- Mikrofon varsayılan olarak **kapalı**. 'Basınca kaydet; ikinci basışta durdur' kontrolü `DOC-28`'de normatiftir.
- Gizli arka plan mikrofon erişimi, sürekli kayıt, uyandırma kelimesi V1'de yoktur.
- Transkript kullanıcı tarafından gözden geçirilebilir; yanlış STT çıktısı otomatik tehlikeli tool eylemine dönüşmez.
- TTS başarısızsa metin yanıtı başarılı olmaya devam eder; sesli yanıt sistemi ikinci kalite alanıdır.
- Sidecar işleyişi dış servise kendiliğinden bağlanmaz. Python veya `whisper.cpp` iç süreç çıktıları doğrulanır; süreç patlarsa ana uygulama çalışmaya devam eder.

### 10.2 Sidecar paketleme/başlatma politikası

| Durum | V1 davranışı |
|---|---|
| AI/STT/TTS hiç kurulmamış | Uygulama normal açılır, özellik 'kurulmadı' |
| Kullanıcı özelliği atladı | Kurulum durumu saklanır, başlangıçta indirme yok |
| Kullanıcı sonradan açtı | Ayrı capability probe + gerekli kurulum adımları |
| Model diskte ama hash uyuşmuyor | `corrupt`, çalıştırma yok, yeniden doğrulama seçeneği |
| Sidecar başlatma hatası | Timeout ve hata açıklaması; ana UI işlem görür |
| GPU bellek yetmedi | Kontrollü hata, alternatif CPU/az kaynak seçimi |
| Worker çöktü | Job `failed`, kaynaklar kapanır, yeniden dene |
| Kullanıcı iptal etti | Aktif işlem sona erdirilir, kısmi veriler temizleme politikasına göre korunur |

**TTS uyarısı:** EMA Lightning model dosyasının küçük olması, Python/PyTorch çalışma zamanının küçük olacağını garanti etmez. Bunlar ayrı indirilecek/paketlenecek bağımlılıklardır. Lisans ve model/binary kaynağı release öncesinde doğrulanır.

### 10.3 Donanım kaynak yönetimi

- Kullanıcının model profiline göre GPU/CPU iş ataması.
- İlk sürümde LLM + GPU Whisper + GPU TTS'yi aynı anda zorunlu yükleme yoktur.
- `ResourceManager` concurrency limit, bellek bütçesi, foreground priority ve idle unload davranışı uygular (`DOC-24`).
- Uygulama kendi başlatmadığı Ollama hizmetini körlemesine durdurmaz; aynı Ollama başka uygulamalarca kullanılabilir.
- Windows kullanıcı makinesinde GPU varsa yetenek algılanır, fakat sürücü uyumluluğu gerçek küçük testle doğrulanır; CPU fallback'ı paket bağımsızlığına göre çalışır.

---

## 11. ADR-018/019/020/024 — Git, log, performans, CI

### 11.1 Git ve taşınabilirlik

- Çalışma alanı Git deposu olmak zorunda değildir.
- Git işlemleri dışa aktarılan Markdown/YAML snapshot üzerinde yürür; SQLite `.db`, WAL/SHM dosyaları Git'e eklenmez.
- `git` executable yoksa Git UI'sı `unavailable` gösterir ama export sürer.
- Uzak push, branch değiştirme, force push ve delete otomatik yapılmaz; açık kullanıcı eylemi gerektirir.
- Archive içinden import edilmeden önce path traversal/zip bomb/HTML/script kontrolleri gerekir (`DOC-16/30`).

### 11.2 Gözlemlenebilirlik

- Lokal ve isteğe bağlı uygulama logları, `requestId`, `runId`, `jobId`, `durationMs`, sınırlı hata kodu ve sürüm bilgisi içerir.
- Kullanıcının not metni, ses kaydı, model prompt'u, terminal stdout'u ve dosya yolu varsayılan tanılama loguna tam içerik olarak yazılmaz.
- Debug/tracing modu kullanıcı tercihiyle, süreli ve redaction kontrolüyle açılır; otomatik uzak telemetri V1'de kapalı.
- Crash raporu dış servise kullanıcı izni olmadan gönderilmez.

### 11.3 Performans yaklaşımı

- UI performansı `React Profiler`, Chrome Performance, Electron trace ve worker işlem ölçümleriyle doğrulanır.
- DB için hazırlanan `EXPLAIN QUERY PLAN`, fixture verisi ve `P50/P95/P99` ölçümleri kullanılabilir.
- Startup: cold/warm ve AI enabled/disabled ayrı ölçülür.
- UI üzerindeki “kaydedildi” yalnız backend ACK'den sonra görünür; optimistik UI geri sarma ve hata gösterebilme koşuluna tabidir.
- Önceden belirlenmiş sayısal eşikler `DOC-31`'in yetkisindedir. Vizyon belgesindeki süreler test sonucu yerine geçmez.

### 11.4 CI / release

- PR'da format, lint, strict TS, unit/integration, migration ve sözleşme testleri.
- Windows matrix: Electron native `.node` smoke + Forge package + installer install/open/save/exit/uninstall.
- Tarayıcı temelli Playwright bileşen testleri gerçek Electron E2E'nin yerine geçmez.
- Mock Ollama/STT/TTS testleri CI'da hızlı çalışır; gerçek model/voice donanım testi release kapısı ayrıca gerektirir.
- GitHub Actions dependency pinleri **commit SHA** üzerinden tutulur ve güvenlik incelemesiyle yükseltilir.
- Release artefaktları hash/manifest, SBOM ve imza bilgisi taşır; ilk halka açık sürüm için Windows kod imzalama ve dağıtımın güven uyarıları giderilmeden 'tam güvenilir' denmez.
- Linux updater ayrı strateji ister; Windows ve macOS oto-güncelleme metotları doğrudan Linux'a uygulanmaz.

---

## 12. Bilinçli biçimde kullanılmayan veya ertelenen teknolojiler

| Teknoloji/özellik | V1 kararı | Tekrar değerlendirme koşulu |
|---|---|---|
| PostgreSQL, bulut DB, auth servisi | Yok | Çok kullanıcılı senkronizasyon planı |
| Drizzle/Prisma gibi ORM | Yok | SQL repository bakımı ölçülebilir sorun olursa |
| Next.js, SSR, React Server Components | Yok | Masaüstü statik renderer dışı sunucu ihtiyacı |
| Redux Toolkit | Yok | Zustand + Query'nin yetersizliği gösterilirse |
| Tam UI kit / ağır chart paketi | Yok | Belirli ekran işlevi ve bundle ölçümüyle |
| Global Python kurulumu şartı | Yok | Asla son kullanıcı ön koşulu yapılmaz |
| Paket içine tüm LLM/STT/TTS modelleri | Yok | Ayrı offline opsiyonel distribution kararı |
| Sınırsız AI terminali/FS erişimi | Yok | Ayrı güvenlik ürün kararı ve sandbox tasarımı |
| Server-side telemetry veya user tracking | Yok | Ayrı açık onay ve gizlilik tasarımı |
| Git üzerinden DB dosyası merge | Yok | SQLite conflict-safe sync tasarlanırsa |
| Üçüncü taraf bulut LLM varsayılanı | Yok | Açık kullanıcı eylemi + güvenlik gereksinimi |
| Background sürekli mikrofon | Yok | Ayrı kullanıcı onayı, gizlilik ve pil testleri |
| GPU için başlangıçta prewarm | Yok | Gerçek kullanımda algılanan gecikme iyileştirmesi kanıtlanırsa |

---

## 13. Tüm paketler için seçme ve ekleme kuralı

Bir ajan, V1'e yeni dependency eklemeden önce aşağıdaki kanıtı PR açıklamasına koyar:

```text
Dependency change request
- Package & exact version:
- Purpose / linked REQ IDs:
- Why existing stack insufficient:
- Runtime process (renderer/main/worker/sidecar):
- License & maintenance state:
- Unpacked install size difference:
- Security capabilities (FS/network/native permissions):
- Alternatives considered:
- Cold/warm startup effect:
- Native ABI / Windows installer result (if applicable):
- Unit/E2E evidence:
- Related ADR update:
```

Kararların son güncelleme ve kabul statüsü repo içerisinde takip edilir. Tek bir kütüphanenin 3 farklı alternatifi gereksiz yere aynı anda tutulmaz.

### 13.1 Paket yerleşimi ve import sınırları

```text
packages/domain        → framework'süz TS tip ve iş kuralları
packages/application   → domain komutları / use-case
packages/contracts     → Zod / IPC public DTO
packages/storage-sqlite→ better-sqlite3 adapter (Node-only)
apps/desktop/main      → Electron main + trusted IPC
apps/desktop/preload   → küçük ve dar renderer köprüsü
apps/desktop/renderer  → React, router, UI, query
services/voice         → optional sidecar wrappers
```

**Bu klasör ağacı kavramsal öneridir.** Gerçek kesin repo haritası, paket adları ve workspace bağımlılık yönleri `DOC-07` tarafından kilitlenecektir.

**İzin verilen import yönü:** `domain` kendi dışında hiçbir UI/Electron/DB modülü import etmez. `application` domain'e bağımlıdır, renderer'a değil. `storage-sqlite` domain/contracts kullanabilir ancak renderer'a bağımlı olamaz. Renderer yalnız public contracts/preload'la konuşur; native binding'i import edemez. Sidecar protokolleri adapter interface'i uygular.

### 13.2 TypeScript yapısal kurallar

- `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true` seçilir (uyumluluk sorunu oluşursa kod düzeltilir, bayrak kapatılmaz).
- `noImplicitAny: true`; `any` ve cast yalnız sınırda, açıklamayla.
- Bir domain komutu `Result<T, AppError>` veya açık throw/error mapping kullanan **tek bir sonuç standardına** bağlanır; standardın tam şekli `DOC-08/11`'de.
- Package circular dependency yasaktır. Project references veya workspace graph ile kontrol edilir.
- Haricî `unknown` değerler schema parse edilmeden domain'e aktarılmaz.
- Sürüm yükseltmesinde TS derleme farkları suppress ile gizlenmez.

### 13.3 Dosya boyutu ve bundle bütçesi

- Ana renderer başlangıç JS/CSS, preload ve optional worker/agent/voice parçalarının boyutları CI artefaktı olarak kaydedilir.
- İlk açılışta kod yükleme ile native model yükleme ayrı metriklerdir.
- 'Tree shaking var' diyerek statik `import` zincirindeki büyük modüller ana bundle'a bırakılmaz.
- Bileşen, paket, worker sınırları gereksiz mikro-paketlemeye dönüşmez; modül bağımsızlığı kullanım alanı ve test edilebilirlikle gerekçelendirilir.

---

## 14. Uyumluluk POC'leri — kodlama başlamadan önce

Aşağıdaki POC'ler kaynak dosyaları üretilebilir küçük prototiplerle doğrulama gerektirir. Kodlamaya geçen agent burada gördüğü kontrol listesini **test edilmeden işaretleyemez**.

### POC-STACK-001 — Forge/Vite/Electron packaging

**Ön koşul:** Windows x64, Node 24 LTS, temiz proje, npm lockfile.

**Deneme:** `npm ci`; `npm run dev`; `npm run make`; oluşturulan installer ile temiz kullanıcı profilinde başlatma.

**Kanıt:** komut stdout/stderr, exact dependency graph (`npm ls`), `process.versions`, SHA256 artifact, ekran görüntüsü/otomatik açılış testi.

**Başarı:** development ve packaged renderer açılır, preload sağlıklı, izin sınırları korunur.

**Başarısızlıkta:** uyumsuzluk raporu, önerilen minimal değişiklik, tekrar test. Körlemesine random paket downgrade yapılmaz.

### POC-STACK-002 — Native SQLite in worker

**Deneme:** `better-sqlite3` yalnız worker'a yüklenir; dosya oluşturur, `PRAGMA foreign_keys`, WAL, `SELECT 1`, transaction ve FTS5 isteği çalışır; kullanıcıya veri yazılır; restart sonrası kalıcıdır.

**Kanıt:** dev + packaged + installed artifact üzerinde aynı test, ABI hata raporu yok, worker crash simülasyonu.

**Başarı:** Renderer ve main bloklanmaz; native binding hem dev hem installer içinde yüklenebilir.

### POC-STACK-003 — Secure IPC and browser isolation

**Deneme:** renderer'dan `require`, `process`, `fs`, `child_process` erişimi yok; sadece allowlisted preload metotları çalışır; bozuk/veri sınırı aşmış argümanlar reddedilir; yanlış sender reddedilir.

**Başarı:** yetkisiz erişim denenmesine rağmen privileged API çağrısı yapılamaz.

### POC-STACK-004 — React state / persistence

**Deneme:** proje ve görev oluştur, listele, filtrele, güncelle, yeniden aç; UI/agent aynı application command servisini kullanır.

**Başarı:** optimistic state tutarlı; fail halinde rollback ve kullanıcıya açık hata.

### POC-STACK-005 — Optional feature isolation

**Deneme:** Ollama/Python/Git/whisper/TTS yüklü olmayan offline Windows profilinde uygulama ve kurulum sihirbazı açılır.

**Başarı:** DB, projeler, görevler, not ve arama normal çalışır; sonsuz spinner yok.

### POC-STACK-006 — Sidecar lifecycle

**Deneme:** sahte sidecar start/stop/restart/crash; timeout, kullanıcı iptali, stdout/stderr limit, temiz shutdown.

**Başarı:** UI kilitlenmez, child process birikmez, 'başarılı' mesajı yanlış üretilmez.

### POC-STACK-007 — Import/export determinism

**Deneme:** örnek proje setini Markdown/YAML export et, yeni workspace'e import et, normalize edilmiş verileri karşılaştır.

**Başarı:** kimlik/karar geçmişi kaybı ve gizli duplications yok; konular `DOC-16`'da kesinleşir.

### POC-STACK-008 — Build reproducibility

**Deneme:** aynı lockfile ile iki temiz CI job, dependency hash/SBOM ve paket bitleri karşılaştırılır.

**Başarı:** dependency graph aynıdır; platform kaynaklı nondeterministic paket byte farkları raporlanır, bunlar saklanmaz.

---

## 15. Tehditler, çözüm politikaları ve uyumsuzluk örnekleri

| Risk | Önleyici karar | Tespit | Davranış |
|---|---|---|---|
| Electron native ABI mismatch | Forge rebuild + packaging smoke | `.node` load error | Build fail; yayın yok |
| Forge Vite deneysel kırılma | POC-STACK-001, exact pin | dev/package farkı | Build pipeline ADR değişikliği |
| Better-sqlite3 DB worker'da bloklandı | Ayrı thread / bounded jobs | İş süreleri, jank | Ağır sorguyu böl / timeout |
| WAL veya checkpoint büyümesi | DOC-10 lifecycle | DB/WAL büyüklüğü | Güvenli checkpoint job |
| Yanlışlıkla iki canonical store | Tek DB writer | Uyuşmayan export | DB üstün; export tekrar oluştur |
| IPC'den Node erişimi | Kısıtlı preload + sandbox | Security tests | Release block |
| Agent yanlış tool seçti | Zod + policy + onay | Tool audit log | İşlemi reddet ve açıkla |
| LLM yokken onboarding bloklandı | Async probe + skip | Offline E2E | Basit setup devam |
| TTS büyük Python runtime | Ayrı optional bundle | Download/install size | Kullanıcıya açık indirme bilgisi |
| AI sidecar GPU bellek hatası | Resource Manager | Model load failure | Text UI/CPU fallback |
| Fazla UI dependency | Bundle ownership | Bundle analyzer | PR reddi veya code splitting |
| Dosya import XSS | Sanitizer + CSP | Payload fixtures | Import/render güvenli reddi |
| Windows installer unsigned | İmzalama stratejisi | Smoke/reputation | Yayın riski açık rapor; güvenli olduğunu iddia etme |
| Gizli telemetry | Network allowlist | Offline/network tests | Release block |
| İşlem iptalinde yetim süreç | Process manager cleanup | Job/process table | Cleanup + visible error |

---

## 16. Kalite kapısı ve test izlenebilirliği

| İş kararı | Gereksinimler | Kalite kanıtı | Sonraki normatif dosya |
|---|---|---|---|
| Electron güvenliği / IPC | REQ-129–133 | Renderer escape, input validation, packaged security smoke | DOC-11,30,33 |
| Temel offline kullanım | REQ-001–052, REQ-095–098 | Offline Windows setup / create/search/restart | DOC-18,33 |
| SQLite ve arama | REQ-053–080 | Transaction, migration, FTS, backup, import/export | DOC-09,10,15–17 |
| Setup + model | REQ-095–106 | Ollama yok/var/model yok/silindi testleri | DOC-18,19,25 |
| Agent | REQ-107–120 | Tool policy/approval/trace ve idempotency | DOC-26,27 |
| Ses | REQ-121–128 | Mic permission/STT/TTS failure ve gerçek model testleri | DOC-28,29 |
| Dağıtım ve performans | REQ-134–140 | Native installer, P50/P95 ve release evidence | DOC-31,33,34 |

> **Not:** Ürün gereksinimlerinin ayrıntılı numara ve kapsamı `DOC-02`'den okunmalıdır. Bu tablo performans ve güvenlik alt gereksinimlerinin tamamını yeniden tanımlamaz. `DOC-04`'teki 26 kalite kapısı ile eşleştirme `DOC-33` test matrisi içerisinde makine tarafından denetlenebilir hâle getirilir.

### 16.1 Belgenin geçiş kapısı

`DOC-05` ancak şu koşullarda `reviewed` / `approved` olabilir:

- [ ] Ürün sahibi, seçilen teknoloji ailesini ve trade-off'ları kabul etti.
- [ ] Electron 44 + Forge 7 + Vite 8 + native SQLite POC gerçek Windows üzerinde geçti.
- [ ] Renderer sandbox / preload / IPC sınırları E2E doğrulandı.
- [ ] Gerçek `package-lock.json` commit edildi; `npm ci` temiz ortamda çalıştı.
- [ ] Native `.node` paketlenmiş uygulamada açıldı ve DB'ye yazdı.
- [ ] AI/voice/Git/Python olmadan offline açılış ve temel CRUD geçti.
- [ ] Python/Whisper/EMA model ve runtime paketleme planı lisans ve boyut yönünden doğrulandı.
- [ ] Katkı/CI sürüm güncelleme politikası `DOC-34` ile tutarlı.
- [ ] Kararların `DOC-06–12` mimari diyagram ve sözleşmeleriyle uyuştuğu denetlendi.
- [ ] Hiçbir test `blocked` iken başarılı olarak işaretlenmedi.

**Başlangıç durumu:** Yukarıdaki kutular test kanıtı olmadan boş bırakılmıştır.

---

## 17. Geliştirici agent için doğrudan uygulama talimatı

1. `DOC-00`, `DOC-02`, `DOC-04` ve bu dokümanı oku; güvenlik/kalıcılık ilkelerini özetle.
2. `DOC-06`, `DOC-07`, `DOC-08`, `DOC-09`, `DOC-10`, `DOC-11`, `DOC-12` onaylanmadan tam uygulama mimarisini kendi başına nihai sayma.
3. `POC-STACK-001/002/003` için **minimum** Electron paket prototipini oluşturup Windows'ta doğrula. Tam özellik yazmak POC yerine geçmez.
4. Şemalar kesinleşince core + IPC + UI, aynı command handler üzerinden ilerlesin. Renderer'ın SQLite'a erişmesine izin verme.
5. Forge/Vite plugin uyuşmazlığını gizleme. Test sonuçlarını, exact lockfile sürümlerini ve önerilen ADR güncellemesini raporla.
6. AI ve ses bağımlılıklarını varsayılan paket kurulumunda zorunlu yapma; kullanıcı sonradan ekleyebilsin.
7. Her PR'da değişen ADR, `REQ-*` ve test kanıtını yaz; performans ölçümünde çalıştırılmamış testi `passed` gösterme.
8. Release hazırlığında `DOC-04` kapılarının tamamı ve `DOC-34` signing/update politikası uygulanır.

---

## 18. Açık kararlar ve ilgili dokümanlara devredilen konular

| Konu | Şu anki karar | Kesinleşeceği yer |
|---|---|---|
| Vite tam patch sürümü | 8.x POC uyumlu sürüm | Bu dosyada `stack_lock` + gerçek `package-lock.json` |
| Worker build entry/load path | Forge'da worker build denenecek | DOC-06/07, POC-STACK-001/002 |
| DB şema/FTS DDL | SQLite + FTS5 | DOC-09 |
| DB pragmaları, checkpoint, concurrency | Tek writer + WAL | DOC-10 |
| IPC kanal adı, DTO, hata kodları | Allowlist + Zod | DOC-11 |
| Router route desenleri | React Router | DOC-21 |
| Tam UI token değerleri | CSS değişkenleri + Tailwind 4 | DOC-20 |
| Ollama model benchmark eşikleri | Donanım/tutum testleri | DOC-25/31 |
| EMA Lightning / whisper binary sağlayıcı manifesti | Optional sidecar | DOC-28/29/34 |
| Windows maker, signing, release dosyaları | Forge | DOC-34 |
| Uygulama milestone ve task ID | POC önce | DOC-35 |

Önemli ayrım: Burada *açık* görünen bir konu, geliştirme ajanının kendi tercihini sessizce 'kabul edilmiş' sayabileceği anlamına **gelmez**. Yetkili belge hazırlanır ve doğrulama sürecinden geçirilir.

---

## 19. Kararların gerekçeli kısa özeti

- **Electron + React:** Hedeflenen masaüstü UX için olgun geliştirici deneyimi; paket boyutu trade-off'u bilerek kabul edildi.
- **Vite:** Hızlı HMR ve modern build; Forge eklentisi deneysel olduğundan ayrı smoke gate var.
- **TypeScript strict:** Alanlar arası sözleşme ve kolay bakım; runtime Zod olmadan yeterli değil.
- **SQLite + better-sqlite3:** Hızlı, basit, sunucusuz veri; native ABI ve paketleme riskinin test edilmesi şart.
- **FTS5:** AI gerektirmeyen yerel tam metin arama; Türkçe kalite doğrulaması gerekir.
- **TanStack Query / Zustand:** Kalıcı veri ve geçici arayüz durumunun tek yerde toplanması yerine sorumluluk ayrımı.
- **Tailwind/CSS token + Radix:** Tutarlı dark/light ve erişilebilir, modüler UI.
- **Ollama / Whisper / EMA Lightning:** İsteğe bağlı yerel yetenekler; ana uygulama ve kullanıcı verileri bunlara bağımlı değildir.
- **npm lockfile / Forge / GitHub Actions:** Geliştirme ve paketleme tekrarlanabilirliği; yayımlanabilirliği ancak gerçek kurulum testleri kanıtlar.

## 20. Sonraki belge ve sürüm geçmişi

**Sıradaki belge:** `docs/06-SYSTEM-ARCHITECTURE.md`. Buradaki süreç ve bağımlılık kararlarını modül sınırlarına, iletişim diyagramlarına, iş yükü/topolojiye, hata izolasyonuna ve yaşam döngülerine dönüştürecek.

| Tarih | Versiyon | Değişiklik | Durum |
|---|---|---|---|
| 2026-10-10 | 0.1.0 | İlk stack matrisi, ADR-001–025, POC-STACK-001–008 ve sürüm riskleri hazırlandı | Draft; uyumluluk testleri bekliyor |

