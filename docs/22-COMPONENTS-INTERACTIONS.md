---
document_id: DOC-22
title: "Iterkeep — React Bileşen Sistemi, Etkileşim Sözleşmeleri ve UI Durumları"
version: "0.1.0"
status: "draft"
last_updated: "2026-10-10"
language: "tr-TR"
owner: "Frontend Architecture & Interaction Design"
depends_on:
  - "DOC-00"
  - "DOC-02"
  - "DOC-03"
  - "DOC-04"
  - "DOC-05"
  - "DOC-06"
  - "DOC-07"
  - "DOC-08"
  - "DOC-11"
  - "DOC-12"
  - "DOC-13"
  - "DOC-14"
  - "DOC-18"
  - "DOC-19"
  - "DOC-20"
  - "DOC-21"
next_document: "DOC-23"
---

# Iterkeep — React Bileşen Sistemi, Etkileşim Sözleşmeleri ve UI Durumları

> **Normatif hedef:** Iterkeep V1 masaüstü arayüzünün tekrar kullanılabilir React bileşenlerini, props/olay sözleşmelerini, hata ve loading durumlarını, odak/klavye davranışlarını, kompozisyon sınırlarını ve doğrulama kriterlerini kodlama ajanının doğrudan uygulayabileceği kesinlikte tanımlamak.
>
> **Yetki sınırı:** Bu belge bileşen API'si, erişilebilir etkileşim ve bileşenler arası kompozisyonda kanonik kaynaktır. Renk/ölçü/motion **DOC-20**, route ve responsive eşik **DOC-21**, domain doğruluğu **DOC-08/13/14**, IPC isimleri/DTO **DOC-11**, job ve event **DOC-12**, agent tool/onay güvenlik semantiği **DOC-26/27**, ses protokolü **DOC-28/29**, i18n/a11y test matrisi **DOC-23**, test altyapısı **DOC-33** tarafından belirlenir. Burada hiçbir yeni IPC kanalı, SQLite sütunu, iş durumu veya CSS renk paleti yaratılmaz.
>
> **Kanıt:** Bu belge uygulanabilir arayüz tasarımı ve örnek TSX/CSS içerir. Kodlar mevcut bir Iterkeep uygulamasında **henüz derlenmiş/çalıştırılmış değildir**. `status: draft` korunur; gerçek tarayıcı, Electron, ekran okuyucu ve görsel regresyon doğrulamaları ayrı iş kalemidir.

## 1. Kapsam ve tamamlanma ölçütü

Bu doküman tasarım sisteminin *davranış katmanı*dır. Her ekran, tekrar eden unsurları `@iterkeep/ui` paketinden kullanır; uygulama verisi ve iş kuralları `apps/desktop/src/renderer/features/*` ile `@iterkeep/application` sınırlarında kalır.

V1'de kapsananlar: temel form kontrolleri, popup/dialog, navigasyon bileşenleri, proje/görev listeleri, Kanban, Markdown editörü kabuğu, not/karar/log görünümleri, global arama, agent sohbet/araç izleri, onay ekranı, ses düğmesi/transkript, Setup Wizard, System Health, job progress ve toast.

**Kapsam dışı:** Görsel node editor, serbestçe script çalışan Markdown/HTML, eklenti marketplace'i, kullanıcı tarafından yeni bileşen kodu yükleme, çoklu-kullanıcı eşzamanlı collaborative editor, AI modelinin doğrudan UI JSX üretmesi, sayfaya göre alternatif tasarım sistemi.

## 2. Değişmez karar kataloğu (`UI-I-001–048`)

| ID | Normatif kural |
|---|---|
| UI-I-001 | Görsel tokenlar yalnız `packages/ui/src/styles/tokens.css` içinde tanımlanır (DOC-20). |
| UI-I-002 | UI bileşenleri React 19, TypeScript strict ve semantik DOM kullanır. |
| UI-I-003 | `@iterkeep/ui` bileşenleri IPC, Electron, SQLite, Ollama, Node veya route import etmez. |
| UI-I-004 | `@iterkeep/ui` domain'e özgü mutation başlatmaz; feature callback ile isteği dışarı bildirir. |
| UI-I-005 | Veri kaynağı TanStack Query, ephemeral görünüm durumu component-local / gerektiğinde Zustand'dır. |
| UI-I-006 | Prop'lar readonly, public tipler export edilmiş; belirsiz `any` ve rastgele `[key:string]` yoktur. |
| UI-I-007 | Kontrollü form bileşenleri `value`/`onValueChange`; uncontrolled gerekiyorsa yalnız ilk değer için `defaultValue` sunar. |
| UI-I-008 | Kullanıcı tıklamasına kadar her etkileşim pasif; `useEffect` içinde onaysız mutasyon yapılmaz. |
| UI-I-009 | UI başarı ibaresi ancak DOC-10'daki kalıcı commit/receipt doğrulandıktan sonra gösterilir. |
| UI-I-010 | Belirsiz timeout sonucu 'başarısız' veya 'kaydedildi' denmez; `unknown-outcome` uzlaştırması yapılır. |
| UI-I-011 | Bütün interaktif kontroller keyboard-operable, erişilebilir adlandırılmıştır. |
| UI-I-012 | Renk tek başına durum taşımaz; ikon/metin ve uygun ARIA rolü bulunur. |
| UI-I-013 | Görünür focus `:focus-visible`; hover ve focus durumları eşdeğer bilgi verir. |
| UI-I-014 | Disabled kontrol nedenini gerekiyorsa yakın açıklama taşır; `title` tek açıklama değildir. |
| UI-I-015 | `loading` butonu ikinci göndermeyi bloke eder; önce başlamış işin iptali ayrı eylemdir. |
| UI-I-016 | `aria-busy`, `role=status` ve `role=alert` seçimi olay önemine göre yapılır; her token canlı duyurulmaz. |
| UI-I-017 | Radix dialog/select/popover erişilebilir primitive olarak kullanılır; yeniden modal focus-trap yazılmaz. |
| UI-I-018 | Popover/Dialog/Tooltip portalları tek UI `OverlayRoot` ve DOC-20 z-index tokenlarıyla çalışır. |
| UI-I-019 | Modal açıksa arka plan inert ve kaydırma kontrollü olmalı; focus kapanışta tetikleyiciye döner. |
| UI-I-020 | `Esc` yalnız üstteki kapanabilir katmanı kapatır; bekleyen onayı otomatik reddetmez. |
| UI-I-021 | Destructive eylem kullanıcıya açıkça ifade edilir; yüksek riskli işlem DOC-27 onayından geçer. |
| UI-I-022 | Toast, gerçek transaction'ın tek kanıtı değildir; sayfa state'i refetch/reconciliation ile doğrulanır. |
| UI-I-023 | Toast host modal etkileşimini fiziksel olarak engelleyemez; pointer-events politikası uygulanır. |
| UI-I-024 | Search, list ve Kanban büyüdükçe virtualize/page edilir; sonsuz React DOM düğümü yasaktır. |
| UI-I-025 | `key` yalnız index değil, kalıcı UUID veya sabit öğe kimliğidir. |
| UI-I-026 | Her render sırasında büyük Markdown parse, `Intl.*` instantiation veya O(n²) sıralama çalıştırılmaz. |
| UI-I-027 | Ağır CodeMirror/Markdown preview/Agent paneli route/visible-state temelli lazy yüklenir. |
| UI-I-028 | Memoization yalnız ölçümlü maliyet veya referans kararlılığı için kullanılır; refleksif `memo` zorunlu değildir. |
| UI-I-029 | Scroll/sürükleme/resize hareketinde her piksel SQLite'a yazılmaz; geçici UI state kullanılır. |
| UI-I-030 | Editor local draft'ı server snapshot'ından ayrıdır; revision conflict sessiz overwrite olmaz. |
| UI-I-031 | MD preview ham HTML/script/remote image ile code execution yaratamaz; güvenli render politikası geçerlidir. |
| UI-I-032 | Drag-drop fareye özgü değildir: keyboard ve düğme/menü alternatifi sunulur. |
| UI-I-033 | Filtreli veya kısmen yüklenmiş listede global reorder yapılmaz; DOC-13 sıralama kuralı geçerlidir. |
| UI-I-034 | Route/API/durum isimleri DOC-11/21'den gelir; örtük `window.electron` API'si yasaktır. |
| UI-I-035 | AI devre dışıyken hiçbir `@iterkeep/ui` primitive'i provider sorgulamaz. |
| UI-I-036 | Tool trace gerçek güvenli run/job olaylarını gösterir; modelin gizli iç muhakemesi gösterilmez. |
| UI-I-037 | Agent onayında yetki `approved:true` client boolean'ına dayanmaz; Main-owned approval receipt zorunludur. |
| UI-I-038 | Mikrofon/voice UI kapalı veya izin reddedilmişken form ve text chat çalışır. |
| UI-I-039 | Transcript taslağı otomatik gönderilmez; kullanıcı düzenler ve açıkça kabul eder. |
| UI-I-040 | Kullanıcı tercihi `system` ise tema DOM'da resolved `light|dark` olarak uygulanır; yerel ikinci tema DB'si yok. |
| UI-I-041 | Sayfa değişimi, tema değişimi veya chat drawer toggle ağır işleri otomatik iptal etmez. |
| UI-I-042 | Çeviri anahtarı UI katmanında; domain enum değerleri çevrilerek saklanmaz. |
| UI-I-043 | Gizli SQL, mutlak dosya yolu, stack trace, token veya ham audio blob'u UI/diagnostics'a sızdırılmaz. |
| UI-I-044 | Her bileşenin loading/empty/error/success/disabled/readonly durumları uygun olanlar için test edilir. |
| UI-I-045 | Erişilebilir hedefler DOC-20 boyut/kontrast ve DOC-23 kapsamıyla test edilir. |
| UI-I-046 | Bütün komponent public exports tek index'ten; feature component'leri `@iterkeep/ui` içine konmaz. |
| UI-I-047 | Çalışmayan provider veya DB hata durumu yalnız etkilenen bölgeyi kısıtlar; ana ekran çökmemelidir. |
| UI-I-048 | Gereksinim veya IPC boşluğu görülürse gizli yeni endpoint yaratılmaz; ilgili DOC güncellenir. |

## 3. Yerleşim ve bileşen sahipliği

| Katman | Yer | Örnekler | İzin verilen bağımlılık |
|---|---|---|---|
| Tokens | `packages/ui/src/styles/tokens.css` | Surface/typography/motion | CSS only |
| Generic primitive | `packages/ui/src/components/primitives/` | Button, TextField, Dialog, Popover | React, Radix, lucide, token CSS |
| Generic composite | `packages/ui/src/components/composites/` | SearchField, EmptyState, StatusBadge, ConfirmDialog | primitives; generic React props |
| Feature-aware | `apps/desktop/src/renderer/features/<feature>/components/` | TaskRow, KanbanBoard, MarkdownEditor, ToolTrace | UI + DTO + feature hooks |
| Shell-aware | `apps/desktop/src/renderer/shared/components/` | Sidebar, AgentDrawer, CommandPalette | UI, navigation/feature facades |
| Screen-level | `apps/desktop/src/renderer/pages/` | ProjectsPage, SearchPage, SetupPage | router + composed features |

Klasörler DOC-07 ile uyumlu; `components/primitives` ve `components/composites`, var olan `packages/ui/src/components` alt bölümleridir, yeni workspace paketi değildir. Alt klasörler kullanılınca oluşturulur; ihtiyaç yokken boş dosya eklenmez. `@iterkeep/ui` **React-only** paketidir ve server bundle'a import edilmez.

**Import ilkeleri:** `packages/ui` bağımsız olarak render edilebilir. Feature katmanı UI paketini ve `@iterkeep/contracts` public tiplerini kullanır; `@iterkeep/ui` feature veya IPC client import etmez. `index.ts` yalnız kararlı kamuya açık exports verir; internal hooks oradan kazara açılmaz.

### 3.1 Dosya haritası (normatif hedef)

```text
packages/ui/src/
  index.ts
  styles/tokens.css                       # DOC-20; yeni renkler burada
  components/
    primitives/
      Button.tsx
      IconButton.tsx
      TextField.tsx
      TextArea.tsx
      Checkbox.tsx
      Select.tsx
      Switch.tsx
      Tabs.tsx
      Badge.tsx
      Spinner.tsx
      Skeleton.tsx
      Dialog.tsx
      Popover.tsx
      Tooltip.tsx
      DropdownMenu.tsx
      Separator.tsx
      ScrollArea.tsx
    composites/
      SearchField.tsx
      EmptyState.tsx
      ErrorState.tsx
      ConfirmDialog.tsx
      StatusIndicator.tsx
      ProgressIndicator.tsx
      ToastHost.tsx
      PaginationControls.tsx
      InlineEditableText.tsx
    overlays/
      OverlayRoot.tsx
    hooks/
      useControllableState.ts
      useEventCallback.ts
      useReducedMotion.ts

apps/desktop/src/renderer/
  shared/components/
    AppShell.tsx Sidebar.tsx AgentDrawer.tsx
    GlobalJobDrawer.tsx CommandPalette.tsx
    QuickCapture.tsx SafeNavigationDialog.tsx
  features/projects/components/
    ProjectRow.tsx ProjectCard.tsx ProjectStatusMenu.tsx
  features/tasks/components/
    TaskRow.tsx TaskDetail.tsx TaskQuickAdd.tsx
    KanbanBoard.tsx KanbanColumn.tsx KanbanCard.tsx
    TaskReorderActions.tsx
  features/notes/components/
    MarkdownEditor.tsx MarkdownPreview.tsx
    SaveStateIndicator.tsx RevisionConflictDialog.tsx
  features/decisions/components/
    DecisionCard.tsx DecisionTimeline.tsx DecisionSupersedeDialog.tsx
  features/logs/components/
    ActivityTimeline.tsx ActivityComposer.tsx
  features/search/components/
    SearchResults.tsx SearchFilters.tsx SearchResultRow.tsx
  features/ai-chat/components/
    ChatComposer.tsx ChatTranscript.tsx AgentMessage.tsx
    ToolExecutionCard.tsx ApprovalDialog.tsx AgentRunStatus.tsx
  features/voice/components/
    VoiceRecordButton.tsx TranscriptReview.tsx VoicePlaybackControl.tsx
  features/setup/components/
    SetupStepper.tsx CapabilityCheckRow.tsx ModelSelectionCard.tsx
  features/settings/components/
    CapabilityToggle.tsx SystemHealthCard.tsx
  features/backup/components/
    TransferPreview.tsx RestoreConfirmDialog.tsx
```

Gerçek bileşen sayısı gereksiz dosya çokluğuna yol açarsa aynı sorumluluk korunarak küçük presentational elemanlar tek `.tsx` içinde bulunabilir; **public export**, import sınırı ve test kimliği değişmez. Dosya haritası `DOC-07` isimlendirme ve feature sınırlarının uzantısıdır.

## 4. Public prop kuralları ve ortak durum tipleri

```ts
// packages/ui/src/components/primitives/shared.types.ts
import type { ReactNode } from 'react';

export type ComponentSize = 'sm' | 'md' | 'lg';
export type VisualTone = 'neutral' | 'positive' | 'warning' | 'danger';
export type Appearance = 'primary' | 'secondary' | 'ghost' | 'outline';
export type AsyncViewState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'empty' }
  | { kind: 'error'; message: string; retryable: boolean };

export interface AccessibleLabelProps {
  /** Görünür text label veya görünmez aria-label'dan en az biri gereklidir. */
  label?: string;
  'aria-label'?: string;
  descriptionId?: string;
}

export interface CommonFeedback {
  state: 'idle' | 'pending' | 'committed' | 'conflict' | 'unknown-outcome' | 'error';
  message?: string;
  occurredAt?: string;
}

export type ActionContent = string | ReactNode;
```

Bu türler `@iterkeep/ui`'nin **presentational state** örnekleridir; domain `BackgroundJob.status`, `AgentRun.status`, IPC `Result` veya gerçek provider health enum'u değildir. `CommonFeedback` bileşeni backend'den gelen sonucu göstermek için adapter ile doldurulur. `ReactNode` kullanıcıdan gelen HTML'nin otomatik güvenli render olduğu anlamına gelmez.

### 4.1 Prop / callback yasaları

1. Kullanıcı etkileşimleri `on*` callback'leriyle bildirilir; bileşen doğrudan IPC çağırmaz.
2. Async eylemde `Promise<void>` alan callback yalnız feature wrapper'ında kullanılabilir; generic `Button` retry veya toast yapmaz.
3. `onOpenChange`/`onValueChange` yeni değeri alır; DOM olayını kullanıcı koduna zorunlu olarak geçirmez.
4. Accessible native HTML props gerekli durumlarda `ComponentPropsWithRef<'button'>` / `ComponentPropsWithRef<'input'>` ile genişletilir; fakat `size`, `color`, `value` gibi yeniden tanımlanan prop'lar `Omit` edilir.
5. React key ve controlled input ID `useId` ile üretilir; API/DB UUID bunlardan farklıdır.
6. Uygulama sırası: normal state → disabled/readOnly → keyboard → loading → error → resize → test. Sadece happy-path demo tamamlama sayılmaz.
7. Kullanıcı metinleri `i18n` çevirisinden gelir; ortak UI paketi t('...') çağırmak yerine metin/etiketi prop alabilir.
8. Bileşen `.tsx` dosyasında literal yeni tasarım değerleri açılmaz; DOC-20 tokenları kullanılır.

## 5. Temel primitive kataloğu

| Bileşen | Zorunlu/önemli public props | Etkileşim ve davranış |
|---|---|---|
| `Button` | `appearance,size,loading,disabled,type,onClick,children` | `type='button'` default; form submit açıkça seçilir; loading çift göndermeyi bloke eder |
| `IconButton` | `icon,aria-label,size,appearance,onClick` | Görünür metin yoksa `aria-label` zorunlu; ikon decorative |
| `TextField` | `label,value,onValueChange,error,description,disabled,readOnly` | Label `htmlFor`, `aria-invalid`, `aria-describedby`, composition-safe |
| `TextArea` | `label,value,onValueChange,rows,maxLength,error` | IME uyumlu, büyük metinde debounced feature update |
| `Checkbox` | `checked,onCheckedChange,label,disabled` | `indeterminate` yalnız açık prop; gerçek `input` semantiği |
| `Switch` | `checked,onCheckedChange,label,disabled` | Kısa anlık tercih; kalıcı ayar commit'i feature kontrolünde |
| `Select` | `value,onValueChange,items,label,disabled` | Radix Select, item'lar stabil key, typeahead |
| `Tabs` | `value,onValueChange,items,aria-label` | Radix Tabs; URL sekmesi feature/router ile senkron |
| `Badge` | `tone,children` | Durum metni renk dışında da yazılır; süs ikonları gizlenir |
| `Spinner` | `label?` | Tek başına ise erişilebilir açıklama; parent loading ilişkisi |
| `Skeleton` | `variant,count` | Sabit/öngörülebilir ölçü, motion-independent, sahte buton değil |
| `Dialog` | `open,onOpenChange,title,description,children` | Radix focus trap, Escape/overlay policy; tüm dialog'lar güvenlik akışı değildir |
| `Popover` | `open,onOpenChange,trigger,content` | Modal değil, escape/blur/outside click düzgün |
| `Tooltip` | `content,children` | Sadece ipucu; kritik doğrulama/hata burada saklanmaz |
| `DropdownMenu` | `items,trigger,aria-label` | Klavye menüsü; disabled item seçilemez |
| `Separator` | `orientation,decorative` | Semantik olmayan ayraç `aria-hidden` |
| `ScrollArea` | `children,label?` | Scroll affordance korunur; keyboard scroll engellenmez |

### 5.1 Button referans uygulaması

```tsx
// packages/ui/src/components/primitives/Button.tsx
import { forwardRef } from 'react';
import type { ComponentPropsWithRef } from 'react';
import type { Appearance, ComponentSize } from './shared.types';

export type ButtonProps = Omit<ComponentPropsWithRef<'button'>, 'color'> & {
  appearance?: Appearance;
  size?: ComponentSize;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { appearance = 'secondary', size = 'md', loading = false,
      disabled, type = 'button', children, className = '', ...native },
    ref,
  ) {
    return (
      <button
        {...native}
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        data-appearance={appearance}
        data-size={size}
        className={`ik-button ${className}`}
      >
        {loading ? <span className="ik-button__busy" aria-hidden="true" /> : null}
        <span>{children}</span>
      </button>
    );
  },
);
```

`aria-busy` kullanımı erişilebilir tamamlandı anonsunun yerine geçmez. `disabled` yükleme sırasında native butonun ikinci kez submit edilmesini durdurur; ancak işlem bitmiş mi sorusunun kaynağı yalnız Application Core receipt'tir. `className` genişletme yalnız token tabanlı utility'ler için kullanılabilir. `ik-button` sınıfı değerlerini aşağıdaki CSS'te tokenlardan alır.

```css
/* packages/ui/src/components/primitives/primitives.css — tokens.css sonrasında */
.ik-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--ik-space-2);
  min-height: var(--ik-control-height-md);
  padding-inline: var(--ik-space-4);
  border: var(--ik-border-width) solid transparent;
  border-radius: var(--ik-radius-sm);
  background: var(--ik-color-action);
  color: var(--ik-color-text-inverse);
  cursor: pointer;
}
.ik-button[data-appearance='secondary'] {
  background: var(--ik-color-surface-2);
  color: var(--ik-color-text-primary);
  border-color: var(--ik-color-border);
}
.ik-button[data-appearance='ghost'] {
  background: transparent;
  color: var(--ik-color-text-primary);
}
.ik-button[data-appearance='outline'] {
  background: transparent;
  color: var(--ik-color-text-primary);
  border-color: var(--ik-color-border-strong);
}
.ik-button[data-size='sm'] { min-height: var(--ik-control-height-sm); }
.ik-button[data-size='lg'] { min-height: var(--ik-control-height-lg); }
.ik-button:disabled { cursor: not-allowed; opacity: .65; }
```

**Normatif not:** `opacity:.65` yalnız *görsel* disabled ipucudur, tek durum kanıtı değildir. DOC-20 forced-colors/kontrast testinde disabled label okunurluğu doğrulanır. CSS'teki tüm renk, boyut ve radius değerleri DOC-20 tokenlarından gelir.

### 5.2 Kontrollü TextField: IME, doğrulama, gönderim

```tsx
import { useId, useState } from 'react';
import type { ChangeEvent, ComponentPropsWithRef } from 'react';

type TextFieldProps = Omit<ComponentPropsWithRef<'input'>,
  'value' | 'defaultValue' | 'onChange' | 'size'> & {
  label: string;
  value: string;
  onValueChange: (next: string) => void;
  error?: string;
  description?: string;
};

export function TextField({ label, value, onValueChange, error,
  description, id, ...native }: TextFieldProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  const descriptionId = `${fieldId}-description`;
  const errorId = `${fieldId}-error`;
  const [composing, setComposing] = useState(false);
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    // Kompozisyon sürerken parent'ın ağır server-validated işi yapılmaz;
    // görünür local text yine güncellenir.
    onValueChange(event.currentTarget.value);
  }
  return (
    <div className="ik-field">
      <label htmlFor={fieldId}>{label}</label>
      {description && <p id={descriptionId}>{description}</p>}
      <input {...native} id={fieldId} value={value}
        data-composing={composing || undefined}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={() => setComposing(false)}
        onChange={handleChange}
        aria-invalid={!!error || undefined}
        aria-describedby={[description && descriptionId, error && errorId]
          .filter(Boolean).join(' ') || undefined} />
      {error && <p id={errorId}>{error}</p>}
    </div>
  );
}
```

Bu örnekte feature katmanı `data-composing`/composition olaylarına göre `Enter` submit veya search debounce işini ertelemelidir; TextField kendi başına IPC çalıştırmaz. `onCompositionEnd` gerçek bitiş event'inden son değeri feature'a iletme gereği uygulama testinde ele alınır; Safari/Windows IME koşulları DOC-23/33 senaryolarıdır.

### 5.3 Dialog, ConfirmDialog, popover ve portal

- Genel `Dialog` dış click ile kapanabilir; destructive confirmation ve agent approval **dış tıklamayla kapanmaz**; kontrollü `open` state vardır.
- Kapatma öncesi dirty editor varsa kullanıcıya **Kaydet / Değişiklikleri at / İptal** gösterilir. `Esc` kaydedilmemiş notu atmaz.
- Radix `Dialog.Title` ve `Dialog.Description` erişilebilir nesne ağacında bulunur; metin boş bırakılamaz.
- `ConfirmDialog` generic bir component'tir: işlem sonucunu kendi başına doğrulamaz, `confirmLabel`, `busy`, `riskTone`, `onConfirm`, `onCancel` alır.
- Agent'ın yüksek riskli approval'ı `ConfirmDialog` görsel primitive'lerini yeniden kullanabilir ama ayrı `ApprovalDialog` feature bileşeni actor/scope/digest/TTL ve Main challenge kuralını uygular.
- `OverlayRoot` tek portal mount noktasıdır. Popover ve tooltip portal katmanları DOC-20 `--ik-z-*` tokenlarını kullanır; modalın üzerine yanlışlıkla başka interaktif katman çıkamaz.
- Browser `window.confirm`, `window.prompt`, `alert` V1 kullanıcı arayüzü olarak kullanılmaz.

## 6. Ortak composite kataloğu ve durum sözleşmesi

| Component | Veri sözleşmesi | Kullanıcı etkileşimi | Hata/boş durum |
|---|---|---|---|
| `SearchField` | `value,onChange,onSubmit,placeholder,loading` | `Enter` aratır, `Esc` temizler/katmana göre kapatır | Boş sorgu çalıştırılmaz |
| `EmptyState` | `title,description,action?` | Erişilebilir CTA | Sahte veri göstermez |
| `ErrorState` | `title,description,onRetry?,errorCode?` | Tekrar dene erişilebilir | Stack trace/ham SQL göstermez |
| `ConfirmDialog` | `open,title,description,confirmLabel,busy` | Açık onay / iptal | Pending iken çift tetik yok |
| `StatusIndicator` | `kind,label,detail?` | Durum metni | Renk tek başına değil |
| `ProgressIndicator` | `value?,label,description,indeterminate?` | Okunabilir yüzdelik | Bilinmeyen yüzde için tahmin yazmaz |
| `ToastHost` | `toasts,onDismiss` | Kapat/detay bağlantısı | Maksimum görünür sayıyı sınırlar |
| `PaginationControls` | `hasNext,hasPrevious,onNext,onPrevious,busy` | Önceki/sonraki | Cursor sırası feature katmanında |
| `InlineEditableText` | `value,onCommit,onCancel,validation` | Enter kaydet, Esc iptal (IME hariç) | Conflict odak kaybıyla silinmez |

### 6.1 Toast politikası

`ToastHost` aynı anda en fazla 3 düşük öncelikli bildirimi gösterir; yenileri bounded queue'da bekler. Kritik veri kaybı, `unknown-outcome`, recovery veya onay gereksinimi **yalnız toast** ile ifade edilmez; sayfa içinde kalıcı banner/dialog da gerekir. Toast kapanması işlem iptaline neden olmaz; error toast teknik ayrıntı içermeyen hata kodu ile ilişkilendirilebilir. Otomatik kapanma süresi erişilebilirlik gereksinimlerine ve kullanıcı eyleminin kritikliğine göre belirlenir; yüksek önem taşıyan onay/hata kendiliğinden kapanmaz.

### 6.2 ProgressIndicator ve job ilerlemesi

```ts
export type JobVisual =
  | { state: 'queued'; label: string }
  | { state: 'running'; label: string; percentage?: number }
  | { state: 'paused'; label: string; reason?: string }
  | { state: 'succeeded'; label: string }
  | { state: 'failed'; label: string; errorCode: string }
  | { state: 'cancelled'; label: string };
```

Bu presentational adaptör `background_jobs` sütunlarının yeni şema karşılığı değildir. İş ilerlemesi belirsizse indeterminate gösterilir. %100 ilerleme, `succeeded` terminal iş durumunun eşdeğeri değildir. `jobs.get` snapshot + `events.*` aboneliği üzerinden uzlaştırma yapılır.

## 7. App Shell, navigasyon ve global etkileşimler

| Component | Owns | Girdi | Kural |
|---|---|---|---|
| `AppShell` | Görünür panel yerleşimi | `navigation,capabilityOverview?,children` | Tek shell; route değişiminde sidebar remount yok |
| `Sidebar` | Nav öğesi sunumu | `items,selectedRoute,onNavigate,collapsed` | `aria-current="page"`; ikon-only modda erişilebilir ad |
| `AgentDrawer` | Panel UI görünürlüğü | `open,onOpenChange,mode` | Kapanınca agent run otomatik iptal olmaz |
| `GlobalJobDrawer` | Job listesi | `jobs,selectedJobId,onSelect,onCancel` | Job state'i snapshot olarak gösterilir |
| `CommandPalette` | Modal arama/komut | `open,onOpenChange,query,onQueryChange,results,onSelect` | `Ctrl/Cmd+K`, salt kullanıcı eylemi |
| `QuickCapture` | Kısa görev/not formu | `draft,kind,onCommit,onCancel,submitting` | Inbox varsayılan; veri commit sonrası success |
| `SafeNavigationDialog` | Kirli editör koruması | `open,saveState,onSave,onDiscard,onStay` | Unknown-outcome varken sessiz discard yok |

**App Shell responsive davranışları:** DOC-21 kesin eşikleri ≥1440, 1100–1439, 760–1099 ve <760 CSS px'tir. Panel genişliği yeni bir CSS token değildir. Kullanıcının oturumluk panel yeniden boyutlandırması izinli clamp aralığı içinde tutulur; layout reset `@iterkeep/ui` tarafında değil shell'de yapılır. `resize` sırasında `requestAnimationFrame` ile paint-time hesaplanabilir; React her pointer movement'a bağlı ağır içerik render etmez.

### 7.1 Command Palette davranışı

1. `Ctrl/Cmd+K` yalnız normal route bağlamında açar. Recovery/Setup, destructive confirmation veya üstte modal varken kısayol yan etkisizdir.
2. Arama girişi focus alır; global arama için `search.query()` yalnız uygun debounce/submit politikasında feature katmanından çağrılır.
3. Listede `ArrowUp/ArrowDown` aktif seçimi değiştirir; `Enter` geçerli seçimi yürütür; `Esc` palette'i kapatır.
4. Komut sonucu navigation ise doğrulanmış dahili route'a gider; mutasyon ise normal feature API ve onay kurallarıyla yürütülür.
5. AI kapalıyken AI komutları sessizce yarım çalışmaz; gerekirse devre dışı açıklaması gösterilir.
6. Sonuçlar `project/task/document/decision/activity` kaynak kaydına referans taşır; FTS snippet'inden shell komutu türetilmez.
7. Kullanıcı yazarken gelen eski async sonuç güncel sorgunun yerine geçmez: `requestKey` veya AbortController mantığıyla stale yanıtlar atılır.
8. Komut paleti tek `role=combobox` + listbox/option örüntüsü seçer; birden fazla çelişen `aria-activedescendant` mekanizması kurulmaz.

### 7.2 Overlay yöneticisi

```ts
// apps/desktop/src/renderer/shared/overlays/overlay-model.ts
export type OverlayKind =
  | 'drawer' | 'popover' | 'dialog' | 'destructive-dialog' | 'blocking-recovery';

export interface OverlayDescriptor {
  id: string;
  kind: OverlayKind;
  dismissible: boolean;
  restoreFocusTo?: string; // UI-local trigger ID; DOM selector injection yok
}

export function canDismissTop(stack: readonly OverlayDescriptor[]): boolean {
  const top = stack.at(-1);
  return !!top && top.dismissible && top.kind !== 'blocking-recovery';
}
```

Tek gerçek overlay sahibi Shell olabilir; Radix primitive'in kendi open state'iyle çakışan ikinci farklı modal stack oluşturulmaz. Koşullar ve görsel öncelik DOC-21 §5.3'ün kuralını aynen izler.

## 8. Proje bileşenleri

### 8.1 `ProjectRow` / `ProjectCard`

Görsel props: `project: ProjectSummary`, `selected`, `onOpen(id)`, `onContextAction(action,id)`, `busy?`, `layout: 'row'|'card'`. Domain enum/alanları DOC-08, wire `ProjectSummary` DOC-11. `ProjectSummary` DTO'sunda bulunmayan hesaplanmış bilgi zorla okunmaz; gerekiyorsa ayrı query/projection ve DOC-11 değişikliği yapılır.

- Açma: `Enter` veya kartın ana düğmesine tıklama; destekleyici üç nokta menüsü nested-button olarak aynı tıklama öğesine gömülmez.
- Sistem Inbox kartında arşivle/sil seçenekleri gösterilmez; ayrıca backend Inbox koruması mevcuttur.
- Proje durumu metin ve ikona dayanır; `active`, `paused`, `archived` gibi değerler domain enum ile eşleştirilir, UI tarafından yeni status eklenmez.
- Menü içindeki yıkıcı işlem ConfirmDialog ile açıkça onaylanır, `projects.trash` revision check ile yürütülür.
- `projects.list` araması değiştiğinde eski liste geçici olarak kalabilir fakat yanlış projeye işlem gönderilmez.
- Kart görselinde tüm alt öğelerin pointer cursor olması gereksiz; yalnız gerçek etkileşimler tıklanabilir görünür.

### 8.2 `ProjectStatusMenu`

UI props: `currentStatus`, `allowedOptions`, `busy`, `onRequestStatusChange`; `allowedOptions` domain policy tarafından belirlenir. Statü değişimi `projects.changeStatus` aracılığıyla yapılır; UI sadece iyimser renk/etiket gösterebilir. Çakışmada doğru sürüm refetch edilir, kullanıcı isteği kaybolmadan farklılık gösterilir. Inbox için `archived` veya `deleted` seçeneği olmamalıdır.

## 9. Görevler, liste ve Kanban

### 9.1 `TaskRow` ve `TaskQuickAdd`

```ts
// Feature-only prop sözleşmesi; DTO DOC-11'de tanımlıdır.
import type { TaskSummary } from '@iterkeep/contracts';

export interface TaskRowProps {
  task: TaskSummary;
  selected?: boolean;
  pending?: boolean;
  onOpen(taskId: string): void;
  onRequestStatus(taskId: string, next: TaskSummary['status']): void;
  onRequestMove?(taskId: string): void;
}

export type QuickCaptureKind = 'task' | 'note';
export interface TaskQuickAddProps {
  projectId?: string;          // yoksa use-case Inbox'a kaydeder
  disabled?: boolean;
  onSubmit(input: { title: string; projectId?: string }): Promise<void>;
}
```

Derleme aşamasında `@iterkeep/contracts` public export'undaki gerçek `TaskSummary` tipine uyarlanır; DTO alanı varsayılmaz. `TaskRow` içindeki checkbox sonucu pending iken görsel olarak geçici durum gösterebilir, ancak `succeeded` ancak receipt sonrası yazılır. `TaskQuickAdd` başlık normalizasyonunu sınırlarda uygular, boş başlığı reddeder ve iki kez Enter ile çift kayıt üretmemelidir. Aynı niyet tekrarında idempotency key korunur. Checkbox etiketine tıklama ile satır navigasyonu birbirini istemeden tetiklemez.

### 9.2 `TaskDetail`

Task form alanları domain ile birebir eşleşir: başlık, açıklama (Markdown), durum, öncelik, hedef gün, etiketler ve proje; readonly geçmiş paneli eklenir. `save` her keypress yerine kullanıcı aksiyonu veya belirlenen kontrollü autosave politikasıyla çalışır. `expectedRevision` her mutasyonda server'ın son doğrulanmış revision'ından alınır. `CONFLICT_REVISION` halinde yeni snapshot ve kullanıcı taslağı karşılaştırılır.

### 9.3 `KanbanBoard`, `KanbanColumn`, `KanbanCard`

Beş sabit sütun: `todo`, `in_progress`, `blocked`, `done`, `cancelled`. Kullanıcıya görünen etiketler locale üzerinden çevrilir; DB değeri değişmez. Sütunlar başlık + sayı + kısıtlı kart listesi + sayfa yükle eyleminden oluşur.

- `KanbanBoard` yalnız sütunlara gruplama ve orchestrator state'ini tutar; veri yazmaz.
- `KanbanCard` görev kimliği, başlık, öncelik, tarih ve busy göstergesi sunar. Status düşürme ve taşıma menüsü erişilebilir.
- `onDrop` event'i UI-only `MoveIntent` üretir. Feature doğrular ve `tasks.move`/`tasks.reorder` ile iletir.
- DOC-13'e göre **250 öğeye kadar** tüm-list reorder atomik olabilir; daha büyük veya filtreli/paginated listede evrensel sıra yeniden yazılmaz.
- Sütunlar virtualized ise drag preview portalı kart DOM düğümünü gerçek veri kaynağı gibi tutmaz; kaynak görev ID'si authoritative'tir.
- Klavye alternatifi: kart menüsü → hedef durum/proje seç → `Taşı`, gerektiğinde sıraya göre önce/sonra taşıma.
- Pending kart farklı kolona geçici taşınabilir; commit reddinde eski sorgu/refetch ile uzlaştırılır. Aynı kart için eşzamanlı iki move kilitlenir.
- Boş Kanban yalnız "henüz görev yok" mesajı verir; yükleme, hata ve sıfır-sonuç birbirinden ayrılır.

### 9.4 Drag-drop algoritması ve güvenlik

```ts
export type MoveIntent = {
  taskId: string;
  sourceProjectId: string;
  destinationProjectId: string;
  destinationStatus: 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
  beforeTaskId?: string;
  afterTaskId?: string;
};

export function assertMoveIntent(intent: MoveIntent): void {
  if (intent.beforeTaskId && intent.beforeTaskId === intent.taskId) {
    throw new Error('INVALID_MOVE_SELF_REFERENCE');
  }
  if (intent.afterTaskId && intent.afterTaskId === intent.taskId) {
    throw new Error('INVALID_MOVE_SELF_REFERENCE');
  }
  if (intent.beforeTaskId && intent.beforeTaskId === intent.afterTaskId) {
    throw new Error('INVALID_MOVE_NEIGHBORS');
  }
}
```

`beforeTaskId/afterTaskId` yalnız UI niyetidir; mevcut `tasks.move` IPC sözleşmesi henüz neighbor alanı kabul **etmez**. DOC-13 politikası doğrultusunda adapter niyeti kanonik `sortOrder`/`tasks.reorder` yüküne dönüştürür. Eğer sayfalı görünümde güvenli sıra hesaplanamıyorsa **reorder özelliği UI'da devre dışıdır**, genel amaçlı yeni IPC uydurulmaz. Sürükleme sırasında modal veya Escape varsa drag iptal olur; DB mutasyonu otomatik tetiklenmez.

## 10. Not, karar ve günlük bileşenleri

### 10.1 `MarkdownEditor` sözleşmesi

```ts
export type DocumentSaveState =
  | { kind: 'clean'; savedRevision: number }
  | { kind: 'dirty'; baseRevision: number }
  | { kind: 'saving'; baseRevision: number }
  | { kind: 'saved'; revision: number; savedAt: string }
  | { kind: 'conflict'; baseRevision: number; latestRevision: number }
  | { kind: 'unknown-outcome'; operationKey: string }
  | { kind: 'error'; code: string; retryable: boolean };

export interface MarkdownEditorProps {
  documentId: string;
  initialMarkdown: string;
  initialRevision: number;
  readOnly?: boolean;
  onSave(input: { bodyMarkdown: string; expectedRevision: number }): Promise<void>;
  onSaveStateChange?(next: DocumentSaveState): void;
}
```

`MarkdownEditor` CodeMirror 6 adapter'ı feature katmanındadır. Controller `documents.save({documentId, expectedRevision, patch:{bodyMarkdown}})` kullanır. `SaveStateIndicator` kullanıcının görebileceği `Kaydediliyor / Kaydedildi / Kaydedilemedi / Çakışma / Durum doğrulanıyor` göstergelerini sağlar.

**Zorunlu davranışlar:**

1. Açılışta başlangıç içeriği `clean`. İlk gerçek değişiklik `dirty` olur; Unicode composition/undo seçimi bozulmaz.
2. Kontrollü autosave DOC-14'e uygun debounce ile yapılır; uygulama belirlenen sınırlar dışında her karakterde IPC başlatmaz.
3. Kaydetme sırasında sonraki değişiklikler varsa `saved` gösterimi yalnız kaydedilen snapshot içindir; UI güncel metni `dirty` olarak korur.
4. Eski `expectedRevision` ile save `CONFLICT_REVISION` verirse editör kullanıcı metnini koruyup `RevisionConflictDialog` açar.
5. `OPERATION_OUTCOME_UNKNOWN`: aynı operation idempotency key ile receipt uzlaştırılır; farklı yeni key ile kör gönderim yapılmaz.
6. Sidebar/route değiştirme, tab kapatma ve uygulama kapatmada dirty guard çalışır; kaydetme denemesinin başarısızlığı UI'yı kendiliğinden kapatmaz.
7. Markdown önizleme parse edilip sanitize edilmeden DOM'a raw HTML olarak basılmaz; script, inline event handler, `javascript:` veya izinsiz remote URL engellenir.
8. Görünmeyen preview pane için büyük parse işlemi çalıştırılmaz; ağır metin renderer ana thread'ini bloke ediyorsa worker kullanılır.
9. Güncel revision server ile farklıysa yeni snapshot'ın UI'ya gelmesi local taslağı otomatik olarak overwrite etmez.
10. Browser clipboard erişimi izin ve kullanıcı etkileşimi sınırları içindedir; harici URL doğrudan otomatik açılmaz.

### 10.2 `RevisionConflictDialog`

Props: `localText`, `remoteText`, `localBaseRevision`, `latestRevision`, `onKeepDraft`, `onReloadRemote`, `onCopyDraft`, `busy`. İki metnin satır bazlı karşılaştırması gösterilebilir, ancak otomatik satır birleştirme V1'in zorunlu özelliği değildir. Güvenli default **taslağı koru**. `Reload remote` kullanıcı onayı olmadan yerel içeriği silemez; mümkünse kullanıcı taslağı kopyalama seçeneği sunulur. `onKeepDraft` yalnız overlay kapatır; eşzamanlı commit yapmaz.

### 10.3 `DecisionCard`, `DecisionTimeline`, `DecisionSupersedeDialog`

Kabul edilmiş kararların gerekçesini kart üstünde en azından kısaca görünür kıl; `context/decision/rationale/consequences` ayrı alanlardır. Karar revizyonları `decisions.revise` ile append-only tarihe kaydedilir. `accepted` kararın yerine yenisi geliyorsa `decisions.supersede` ile iki ID bağlanır; eski kart üzerinde `Yerine yeni karar geçti` ve link görünür.

`DecisionTimeline` sadece geçmiş revizyonları gösterir; kullanıcı eski revizyonu doğrudan düzenleyemez. `DecisionSupersedeDialog` yeni karar kimliği ve mevcut beklenen revision'lar olmadan onayı etkinleştirmez. Hata halinde iki karar yeniden sorgulanır; onaylı karar yanlışlıkla silinmez.

### 10.4 `ActivityTimeline` / `ActivityComposer`

Günlük kayıtları UTC timestamp kullanır, UI kullanıcı saat diliminde gösterir. Append-only olduğundan mevcut satırda 'düzenle' düğmesi bulunmaz. Düzeltme komutu `activity.append({correctionOfId,...})` ile ayrı kayıttır; eski giriş `Düzeltildi` gibi ilişki göstergesi taşır ancak orijinal metin korunur. Kullanıcı tarih filtresi `activity.list` sorgusuna dönüştürülür; FTS query filter ile karıştırılmaz.

Hızlı log kaydı kullanıcıya iki saniyelik etkileşim hedefleyebilir; gerçek kayıt ancak commit receipt sonrası listede kalıcı görünür. `occurredAt` kullanıcı düzenleyebilirse geçerli RFC3339 değere dönüştürülür; gelecek tarih/işlem tutarlılığı domain sözleşmesine göre doğrulanır.

## 11. Arama arayüzü

`SearchField`, `SearchFilters`, `SearchResults`, `SearchResultRow` aynı `search.query` akışını kullanır. DOC-15 normalizasyon kuralları UI'da yeni bir bağımsız Türkçe tokenizer olarak kopyalanmaz; arama servisi otoritedir.

- `SearchResults` sayfalandırılır; gerekli olduğunda virtualization kullanılır. Her sonuç en az kayıt türü, başlık, proje bağlamı, izinli snippet ve açılabilir hedef içerir.
- Snippet kaynağından HTML üretilmez: güvenli metin parçaları React text node'larına ayrılır, vurgular `<mark>` semantiğiyle gösterilir.
- `search.query` sonucu boşsa `NoResults`, henüz arama yapılmamışsa yönlendirici `EmptyState`, hata varsa `ErrorState` gösterilir.
- Yeni sorgu yazılırken eski istek stale olarak işaretlenir; async sonuç yarışında eski sorgunun yanıtı yeniyi ezmez.
- Klavyeyle `Enter` ilk/aktif sonucu açar; tekli arama sonucu beklenmedik biçimde otomatik navigasyon yapmaz.
- `Ctrl/Cmd+K` palette ile `#/search` tam arama sayfası aynı arama facade'ını kullanabilir, ama farklı route state'leri birbirine yazılmaz.
- `SearchResultRow` doğrudan `#/records/:kind/:id` veya `#/projects/:id` açar; `activity` tekil detay `activity.get` ile yüklenir.

## 12. Agent sohbeti ve görünür tool izleri

| Component | Props / adapter girişleri | Zorunlu davranış |
|---|---|---|
| `ChatComposer` | `text,onTextChange,onSubmit,canSend,busy,onVoiceClick?` | Submit açık eylem; IME sırasında Enter submit değil |
| `ChatTranscript` | `messages,runState,hasEarlier,onLoadEarlier` | Bounded/virtualized transcript; role ayrımı |
| `AgentMessage` | `message,streaming,sourceLinks?` | Markdown sanitize; token parti render |
| `AgentRunStatus` | `safeRunSnapshot,onCancel?` | queued/running/approval/terminal durumu |
| `ToolExecutionCard` | `toolCall,expanded,onToggle` | Input/output yalnız safe bounded DTO; gerçek adım durumları |
| `ApprovalDialog` | `approval,expiresAt,busy,onApprove,onDeny` | Risk, hedef ve eylem özeti; explicit onay |

`ChatComposer` boş whitespace, AI disabled veya provider unavailable iken tool call başlatamaz; kullanıcının yazdığı metin alanını keyfî şekilde silmez. `agent.startRun()` başarılı olduğunda `runId` ile olaylara bağlanır. Mesaj gönderme ve yanıt stream etme ayrı yaşam döngüleridir; `startRun` reply'si **yanıt tamamlandı** anlamına gelmez.

### 12.1 ToolExecutionCard görünüm sözleşmesi

```ts
// UI presentation adapter, backend'in yeni DTO'su değildir.
export interface SafeToolStepView {
  stepId: string;
  toolName: string;
  state: 'queued' | 'running' | 'awaiting_approval' | 'succeeded' | 'failed' | 'cancelled';
  summary: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  safeInputSummary?: string;
  safeOutputSummary?: string;
  errorCode?: string;
}

export interface ToolExecutionCardProps {
  step: SafeToolStepView;
  expanded: boolean;
  onExpandedChange(next: boolean): void;
}
```

`ToolExecutionCard` kendi başına backend tool çağrısı yapmaz. Başlıkta `toolName + state`, ayrıntıda gerçek işlem özeti ve **sanitiz edilmiş** input/output gösterir. Kullanıcı `expanded` durumunu değiştirdiğinde agent run devam eder. Başarısız tool otomatik successful'a dönüşmez; run geçmişi kaybolmaz. Modelin iç düşünce/chain-of-thought metni gösterilmez.

### 12.2 ApprovalDialog güvenlik akışı

1. Modal yalnız Main tarafından kayıtlı `ApprovalRequest` ve açık `approvalId` ile açılır; sırf model yanıtındaki metin 'onaylandı' dedi diye gösterilmez.
2. Göster: eylem, hedef kayıt/çalışma alanı, kapsam, risk etiketi, beklenen sonuç, geçerlilik süresi.
3. Görsel red/onay aynı modal içinde; varsayılan odak **onay** üzerinde değil, güvenli/red aksiyonunda veya ilk açıklamada.
4. `onApprove` yalnız `agent.decideApproval({approvalId,decision:'approve',challengeNonce})` çağırır; nonce güvenilir Main handshake'in UI'ya izinli dar çıktısıdır, UI kendi nonce'unu icat etmez.
5. Bu callback uzun sürerse disable/spinner + görünür pending; ikinci click aynı onay için ek işlem üretmez.
6. Süresi geçtiyse `APPROVAL_EXPIRED` görünür; kullanıcı yeni onay akışı ister, eski nonce tekrar kullanılmaz.
7. Modal kapanması veya farklı route'a geçiş kabul/red commit'i anlamına gelmez. Onay hâlâ pending ise ilgili job/run listesinde gösterilir.
8. Kabul edilmiş ve yürütülmüş tool'un sonucunu UI 'işlem tamamlandı' diye ancak doğrulanmış tool/event snapshot'ı sonrası gösterir.
9. Ham shell komutu/DB SQL/kişisel sır gibi veriler UI'da ve loglarda gereksiz yere gösterilmez.

### 12.3 Streaming ve backpressure

Token başına setState yapılmaz; `requestAnimationFrame` veya sınırlı frame batch'e aktarılır. Olay abonelikleri bileşen açılışında kurulur, cleanup'ta `unsubscribe` edilir. DOC-11 `events.subscribe` + `events.getSince` boşluk tamamlama protokolü kullanılır; event gap görülünce snapshot refetch edilir. Yeni mesaj geldiğinde kullanıcı geçmişi okuyorsa zorla en alta scroll edilmez; “yeni mesaj” affordance gösterilir.

## 13. Ses: kayıt, transkript ve oynatma bileşenleri

### 13.1 VoiceRecordButton durumları

```ts
export type RecorderVisualState =
  | { kind: 'disabled'; reason: string }
  | { kind: 'idle' }
  | { kind: 'requesting-permission' }
  | { kind: 'recording'; startedAt: number }
  | { kind: 'stopping' }
  | { kind: 'transcribing'; jobId: string }
  | { kind: 'ready-for-review'; draftId: string }
  | { kind: 'failed'; code: string; recoverable: boolean };

export interface VoiceRecordButtonProps {
  state: RecorderVisualState;
  onToggle(): void;
  onCancel?(): void;
  label: string;
}
```

`startedAt` bu örnekte UI monotonic süre göstergesi içindir ve DB timestamp anlamına gelmez. Ses kaydı `voice.startCapture`/`voice.appendChunk`/`voice.stopCapture` ile gerçek ses servisi tarafından yapılır; **bileşen** mikrofon izin API'si veya ses buffer'ını kalıcı DB'ye yazmaz.

- İlk tıklama kayıt iznini istenir, başarılıysa kayıt göstergesi ve durdur butonu görünür.
- İkinci tıklama stop'u başlatır; `voice.stopCapture` transcription job verir, hemen transkript var sanılmaz.
- `voice.getTranscript` başarılı olunca kullanıcıya düzenlenebilir **taslak** sunulur.
- Transkript kullanıcı onayı olmadan chat'e, görev listesine veya loga gönderilmez.
- Permission deny, STT unavailable, timeout ve servis kapanması güvenli metin alternatifini bozmaz.
- Görünür kayıt göstergesi yalnız renkle değil açık metin ve süreyle anlaşılır; focus korunur.
- Kayıt bileşeni route'tan kapanırken açık capture için DOC-28 güvenli cancellation/cleanup uygulanır; gizli ses kaydı devam etmez.

### 13.2 `TranscriptReview`

Props: `draftText,onChange,onAccept,onDiscard,sourceInfo,busy`. Transkript `TextArea` içinde düzeltilebilir, kabul için açık CTA vardır. Boş veya hatalı sonuç kullanıcıya açıkça söylenir; sanki ses tanındı gibi gösterilmez. Kullanıcı `Accept` eylemini seçince hedefe göre mevcut `tasks.create`, `documents.create`, `activity.append` veya `agent.startRun` facade'ı çalışır. Toplu destructive voice command hiçbir zaman anında uygulanmaz.

### 13.3 `VoicePlaybackControl`

Props: `playbackState,label,onPlay,onPause?,onStop?,onRetry?`. TTS yokken `unavailable` durumundadır; yazılı AI yanıtı yine görünür. `voice.speak` sonucu bir job ID olduğundan oynatma erişimini ve geçici ses dosyasını DOC-29 belirler; **bu belge yeni `voice.play` IPC kanalı varsaymaz**. DOC-29'da playback transport tanımlanmadan UI butonunun aktif/işlevsel olduğu iddia edilmez. Sesin dışa aktarılması veya saklanması ayrı açık kullanıcı tercihi gerektirir.

## 14. Setup Wizard, capability ve sağlık ekranı bileşenleri

- `SetupStepper`: `steps,currentStep,onBack,onNext,canAdvance,busy`; DOC-18 adımları değiştirilmez. Kullanıcı zaten kurulu agent'ı atlayabilir, ana ekran engellenmez.
- `CapabilityCheckRow`: `name,preference,health,stale,onRetry?`; tercihle sağlık birbirinden ayrıdır. `enabled` ama `unavailable` ise yanlış başarı işareti çizmez.
- `ModelSelectionCard`: `model,recommended,installed,benchmark?,busy,onSelect,onDownload`; tahmini performans **ölçülmüş** gibi gösterilmez. Download öncesinde kullanıcı onayı ve boyut bilgisi gerekir.
- `CapabilityToggle`: `enabled,health,busy,onChange`; tercih commit'i başarılı olunca gerçek DB preference yansır, servis kullanılamıyorsa ayrı durum uyarısı görünür.
- `SystemHealthCard`: `capabilitySnapshot,lastCheckedAt,onRefresh`; TTL/refresh politikası DOC-19'a uyar, render sırasında probe başlatılmaz.
- `TransferPreview` ve `RestoreConfirmDialog`: Import/restore önizleme sonucu gerçek job receipt'ten alınır; veri üzerine yazma ve geri yüklemede onay; başarı yalnız doğrulanmış sonuç üzerine gösterilir.

Setup, Model Manager ve Recovery gibi akışlarda birden fazla modal overlay karışmaz. Ayrı sayfa veya tek modal üst katmanı kullanılır. AI/voice kurulumu isteğe bağlı olduğundan `Skip` işlemi veri modeline doğru tercihi kaydeder; gizlice model indirme başlatmaz.

## 15. Hata, bekleme ve veri doğruluğu durum matrisi

| Koşul | Component UX | Yapılmaması gereken |
|---|---|---|
| İlk query yükleniyor | Skeleton + anlamlı `aria-busy` | Uydurma içerik gösterme |
| Query boş döndü | İlgili `EmptyState` + oluştur CTA | Boşluğu servis hatası sayma |
| Arama filtresi sonuç bulmadı | `NoResults` + filtre temizle | Veriyi silinmiş gösterme |
| Mutasyon pending | Inline spinner/disable, local draft koruma | Üst üste API çağrısı |
| Mutasyon committed | Verified row + kısa toast / save state | Receipt olmadan 'kaydedildi' |
| Revision conflict | Diff/reload/keep-draft dialog | Sessiz last-write-wins |
| Outcome unknown | Uzlaştırma görünümü + receipt sorgusu | Kör idempotency-key değiştirme |
| Provider unavailable | Sağlık CTA + AI-only control disabled | Core ekranlarını kilitleme |
| Job queued/running/paused | Snapshot progress + cancel policy | `100% = committed` varsayma |
| Job failed/cancelled | Kalıcı status + yeniden deneme kuralları | Otomatik riskli retry |
| DB corruption / restore | Recovery route ve doğrulama | Boş DB yaratıp kullanıcıyı taşıma |
| Workspace değişti | Feature queries invalidate + bağımlı view reset | Eski workspace verisini yenisinde gösterme |
| User denies approval | Run waiting/denied state uzlaşması | İşlem yapıldığına dair toast |
| Voice permission denied | Text fallback, izin açıklaması | Kayıt varmış gibi ses grafiği oynatma |

### 15.1 ErrorBoundary katmanları

Bir UI bileşeni render hatası yaparsa sayfa-level error boundary kendi bölgesini izole eder; DB worker/agent hizmeti hatası global React crash'e dönüştürülmez. `ErrorBoundary` veriyi değiştirmez; `onRetry` yalnız güvenli sorgu veya görünüm yenilemesi yapar. Workspace recovery özel route tarafından yönetilir. Hata mesajları `errorCode` ve güvenli açıklama içerir; kullanıcı metni, erişim anahtarı veya SQL loglanmaz.

## 16. Performans sözleşmesi

| Bileşen | Hedefleme | Ölçüm |
|---|---|---|
| TaskRow | Yerel etkileşim gecikmesi düşük | 1000 satır / tanımlı viewport Profiling |
| Kanban | Sütun kartları bounded/virtualized | 10k görev fixture ile FPS ve DOM node sayısı |
| MarkdownEditor | Yazarken React parent re-render minimum | 1MB Markdown ile input latency / P95 |
| MarkdownPreview | Debounce / lazy parse | Büyük not açılışı, scroll ve memory |
| ChatTranscript | Token batch ve geçmiş sayfalama | 10k mesaj simülasyonunda typing/input latency |
| ToolExecutionCard | Kapalıyken ağır JSON/tree render yok | 500 tool step ile commit/render süresi |
| GlobalJobDrawer | Event batch + snapshot uzlaşma | 100 concurrent progress event simülasyonu |
| SystemHealth | TTL query, on-demand refresh | Idle CPU ve probe sayısı |
| OverlayRoot | Tek portal host, lifecycle cleanup | Aç/kapa 100x sonrası listener/artık DOM yok |
| Theme | CSS vars, component remount yok | Light/dark 50x; editor draft korunuyor |

Kabul eşikleri ve makine profili DOC-04/31'e bağlıdır; bu tablo yeni performans eşiği uydurmaz. Fiziksel scroll sırasında girdi kuyruklarını bloke eden `JSON.stringify(hugeState)`, `Array.sort` veya Markdown parse render içine konmaz. Virtualized DOM, ekran okuyucunun ilerleme/görünür satır bilgisini kaybettirmemelidir; DOC-23 ile doğrulanır.

**UI'da gereksiz bağımlılık yasağı:** Kapsamı dokümanla belirlenmemiş ikinci toast, ikinci router, ikinci state management, ikinci dialog altyapısı veya ikinci token sistemi kurulmaz. Radix primitives ile `@iterkeep/ui` wrapper'ı birlikte kullanılır; her ekranın kendi modal framework'ü yoktur.

## 17. Erişilebilirlik ve i18n etkileşimleri

1. Tüm primary işlevlere yalnız klavyeyle ulaşılabilir. `Tab` doğal sıralama, `Shift+Tab` ters sıralama, `Enter/Space` ilgili kontrollere özgüdür.
2. UI düğmeleri `type='button'` ile yanlış form submit'i engeller. Submit düğmesi açıkça `type='submit'` olur.
3. Screen reader adları görünür etiketle tutarlı. Icon button ile tool tooltip'i adlandırmanın tek dayanağı olamaz.
4. Busy durumları `aria-busy`, kısa başarı `role=status`, kritik hata `role=alert` ile sunulur; aynı cümle üç canlı bölgede tekrarlanmaz.
5. Durum renkleri high-contrast/forced-colors ile okunabilir; `prefers-reduced-motion` için devamlı animasyon devre dışıdır.
6. Dialog açılışı/kapanışı odak taşır, odak geri döner. Modal arka alan `inert`/Radix mekanizmasıyla erişilemez olur.
7. Türkçe (`tr-TR`) ve İngilizce (`en-US`) çeviri anahtarları aynı bileşen API'sini kullanır. Hardcoded status çevirisi DB'ye yazılmaz.
8. 200% zoom, dar pencere ve uzun Almanca/Türkçe satırlar UI kontrollerini kırmamalı; flex child `min-width:0` olur ve overflow kendisine ayrılır.
9. Keyboard shortcut yalnız gerçek odak ve IME durumunda çalışır; `input/textarea/contenteditable` içindeki normal yazıyı çalmaz.
10. Toast zaman aşımı kritik duyuruyu yok edemez. Hata veya bekleyen onay, kendi panelinde de takip edilebilir olmalı.

DOC-23, WCAG 2.2 AA hedeflerini ve manuel ekran okuyucu test matrisini ayrıca kesinleştirir. Bu dosyanın geçmesi DOC-23 testi yerine geçmez.

## 18. Kodlama ajanın uygulama sırası

| Sıra | Paket/feature | Çıktı | Gate |
|---:|---|---|---|
| 1 | UI tokens + `@iterkeep/ui` package | CSS import / primitive baseline | Theme ve AST boundary test |
| 2 | Button, IconButton, form controls | Kontrollü erişilebilir input | Unit + keyboard + contrast |
| 3 | Dialog, OverlayRoot, ToastHost | Tek overlay katmanı | Focus trap, z-index, escape |
| 4 | Shell + navigation primitives | Sidebar, panes, palette | DOC-21 responsive route test |
| 5 | Projects + Tasks | CRUD kart/list/Kanban | DOC-13 + real IPC mock |
| 6 | Markdown + decisions + logs | Autosave/diff/timeline | DOC-14 conflict + FTS tests |
| 7 | Search | Virtualized result list | DOC-15 relevance & stale query |
| 8 | Setup + capability | Stepper / Health / Model cards | DOC-18/19 skip/offline test |
| 9 | Agent UI | Composer, Tool card, Approval dialog | DOC-26/27 authorization tests |
| 10 | Voice UI | Capture/Transcript/TTS controls | DOC-28/29 capability tests |
| 11 | Transfer/backup surfaces | Preview + safe restore | DOC-16/17 data preservation |
| 12 | Final | Screenshots, E2E, perf, i18n | DOC-04/23/31/33 quality gates |

Ajana **yasak kestirmeler:** Mock data ile 'tamamlandı' deme; render içinden DB'ye erişme; onaysız destructive tool tetikleme; `any` ile contracts bypass; docs'ta olmayan domain enum üretme; `aria-label` olmadan ikon-only buton yayınlama; renkleri `#fff`/`bg-zinc-*` ile bileşenlerde dağıtma; provider yoksa kullanıcı projesini kilitleme.

## 19. Otomatik ve manuel test kataloğu (`UI-T-001–UI-T-072`)

Aşağıdaki testler **planlanan doğrulamalardır**, tamamlanmış test kanıtı değildir. Unit/RTL, görsel/Playwright, Electron E2E ve perf örnekleri gerektiği gibi işaretlenir. Her testte setup, action, assertion ve fail kanıtı bulunmalıdır.

| ID | Kategori | Seviye | Kabul senaryosu |
|---|---|---|---|
| `UI-T-001` | Primitive | RTL | Button type belirtilmeyince button davranır; sahte form submit oluşturmaz. |
| `UI-T-002` | Primitive | RTL | Button loading sırasında disabled olur ve iki click tek onClick üretir. |
| `UI-T-003` | Primitive | RTL | IconButton erişilebilir isimsizse test fail; aria-label ile başarılı. |
| `UI-T-004` | Primitive | RTL | TextField error durumunda aria-invalid ve aria-describedby doğru bağlanır. |
| `UI-T-005` | Primitive | RTL | TextField Windows/Türkçe IME bileşimi sırasında submit göndermemelidir. |
| `UI-T-006` | Primitive | RTL | Checkbox checked/uncheck keyboard Space ile değişir. |
| `UI-T-007` | Primitive | RTL | Select klavyeyle açılır, item seçilir ve focus korunur. |
| `UI-T-008` | Primitive | RTL | Disabled primitive açıkça tıklanamaz ve erişilebilir etikete sahiptir. |
| `UI-T-009` | Primitive | Visual | Dark/light temada Button bütün varyantlarda kontrast kaybetmez. |
| `UI-T-010` | Overlay | RTL | Dialog açılınca odak modal içine alınır ve kapatılınca önceki elemana döner. |
| `UI-T-011` | Overlay | RTL | Destructive dialog dış tıklamayla kapanmaz. |
| `UI-T-012` | Overlay | RTL | Esc üstteki dismissible overlayi kapatır, alttaki modal kalır. |
| `UI-T-013` | Overlay | RTL | Blocking recovery overlay Esc ile kapanmaz. |
| `UI-T-014` | Overlay | RTL | Tooltip kritik validasyonun tek taşıyıcısı değildir. |
| `UI-T-015` | Overlay | Visual | Popover portal modalın yanlış katmanına çıkamaz. |
| `UI-T-016` | Overlay | Visual | Toast modal onay butonunu fiziksel olarak kapatmaz. |
| `UI-T-017` | Overlay | RTL | 100 overlay mount/unmount sonrası stale listener birikmez. |
| `UI-T-018` | Overlay | E2E | Window blur/yeniden odaklama focus trap dışına çıkmaz. |
| `UI-T-019` | Shell | RTL | Ctrl+K normal route üzerinde Command Palette açar. |
| `UI-T-020` | Shell | RTL | Input içindeki normal yazım ve IME command palette tetiklemez. |
| `UI-T-021` | Shell | RTL | Blocking dialog sırasında Ctrl+K devre dışı kalır. |
| `UI-T-022` | Shell | RTL | Palette Arrow/Enter/Esc ile tam klavye kullanımı sunar. |
| `UI-T-023` | Shell | E2E | Sidebar dar görünümde drawer olur ve içerik yatay taşmaz. |
| `UI-T-024` | Shell | E2E | Agent drawer kapanınca agent run kendi policy dışında iptal olmaz. |
| `UI-T-025` | Shell | E2E | 200% zoom altında overlay kontrolü kullanılabilir kalır. |
| `UI-T-026` | Shell | RTL | Route geri dönüşünde sidebar current link aria-current güncellenir. |
| `UI-T-027` | Shell | RTL | QuickCapture hedef proje seçilmediyse Inbox varsayılan akışını kullanır. |
| `UI-T-028` | Tasks | RTL | TaskRow checkbox tıklama satır navigasyonunu yanlışlıkla tetiklemez. |
| `UI-T-029` | Tasks | RTL | TaskQuickAdd boş/whitespace başlığı göndermez. |
| `UI-T-030` | Tasks | E2E | Hızlı iki Enter tek görev oluşturur; idempotency korunur. |
| `UI-T-031` | Tasks | E2E | Task status optimistic gösterildikten sonra commit hatasında snapshot uzlaşır. |
| `UI-T-032` | Tasks | E2E | Task revision conflict yerel niyeti silmeden bildirilir. |
| `UI-T-033` | Tasks | RTL | Kanban keyboard action ile kartı durumlar arasında taşıyabilir. |
| `UI-T-034` | Tasks | E2E | Filtreli Kanban listesinde global reorder yapılmaz. |
| `UI-T-035` | Tasks | Perf | 10k görev fikstüründe tüm kartlar tek DOM ağacına yüklenmez. |
| `UI-T-036` | Tasks | RTL | Inbox sistem projesinde archive/delete aksiyonları görünmez. |
| `UI-T-037` | Docs | RTL | MarkdownEditor kirli taslağı dış snapshot gelince silmez. |
| `UI-T-038` | Docs | E2E | Autosave başarılı receipt olmadan Kaydedildi göstermez. |
| `UI-T-039` | Docs | E2E | Save outcome unknown iken aynı receipt üzerinden uzlaştırır. |
| `UI-T-040` | Docs | E2E | Revision conflict dialog metni korur ve güvenli geri yükleme sunar. |
| `UI-T-041` | Docs | E2E | Kararın supersede bağlantısı eski karar geçmişini korur. |
| `UI-T-042` | Docs | E2E | Activity düzeltmesi yeni append-only kayıt üretir. |
| `UI-T-043` | Docs | Security | Markdown preview HTML script/event handler çalıştırmaz. |
| `UI-T-044` | Docs | Perf | Büyük Markdown notu yazarken ana thread uzun süre bloke edilmez. |
| `UI-T-045` | Docs | RTL | Dirty editor ile route çıkışında guard görünür ve odak doğru olur. |
| `UI-T-046` | Search | RTL | NoResults ve EmptyState birbirinden ayrılır. |
| `UI-T-047` | Search | RTL | Eski sorgu yanıtı yeni sorgu görünümünü ezmez. |
| `UI-T-048` | Search | Security | Snippet içerdiği HTML benzeri metni executable render etmez. |
| `UI-T-049` | Search | E2E | Arama sonucundaki activity kaydı activity.get ile açılır. |
| `UI-T-050` | Search | RTL | SearchResultRow doğru kayıt türü ve proje bağlamını gösterir. |
| `UI-T-051` | Search | Perf | 10k sonuç sayfalı veya virtualized sunulur. |
| `UI-T-052` | Search | RTL | Arama sonuç listesi keyboard Enter ile doğrulanmış route açar. |
| `UI-T-053` | Search | E2E | Silinmiş/erişilemeyen search target doğru Not Found sunar. |
| `UI-T-054` | Search | RTL | Arama filtreleri boş sorguya sahte sonuç üretmez. |
| `UI-T-055` | Agent | RTL | AI disabled iken composer tool çalıştırmaz, izin açıklaması verir. |
| `UI-T-056` | Agent | E2E | Run start yanıtı tamamlandı olarak yanlış gösterilmez. |
| `UI-T-057` | Agent | RTL | ToolExecutionCard kapalıyken büyük JSON çıktısını render etmez. |
| `UI-T-058` | Agent | Security | Tool card gizli token/path/raw SQL göstermeyi engeller. |
| `UI-T-059` | Agent | E2E | ApprovalDialog eski/expired nonce ile onay işlemini tamamlamaz. |
| `UI-T-060` | Agent | RTL | ApprovalDialog açılınca focus varsayılan olarak approve butonunda değildir. |
| `UI-T-061` | Agent | E2E | Agent event gap sonrası getSince/snapshot refetch ile eşleşir. |
| `UI-T-062` | Agent | Perf | Token stream React state güncellemeleri batch edilir. |
| `UI-T-063` | Agent | RTL | Eski sohbet okunurken yeni token kullanıcıyı otomatik en alta atmaz. |
| `UI-T-064` | Voice | RTL | VoiceButton ilk tıklamada start ikinci tıklamada stop gösterir. |
| `UI-T-065` | Voice | E2E | Mikrofon izin reddinde metin alanı kullanılabilir kalır. |
| `UI-T-066` | Voice | E2E | Transkript düzenlenmeden ve açık onay olmadan hiçbir kayda gönderilmez. |
| `UI-T-067` | Voice | E2E | Transkripsiyon job çalışırken metinli not yazmaya devam edilebilir. |
| `UI-T-068` | Voice | E2E | TTS unavailable ise AI metni görüntülenmeye devam eder. |
| `UI-T-069` | Setup | E2E | AI setup skip seçimi sıfır modelle tamamlanır. |
| `UI-T-070` | Setup | E2E | Capability enabled fakat unavailable iken yeşil ready işareti yoktur. |
| `UI-T-071` | Setup | E2E | Model download progress yüzde yüz olsa da job receipt beklenir. |
| `UI-T-072` | Setup | Visual | Tema değişince açık editör taslağı ve sidebar pozisyonu korunur. |

### 19.1 Referans React Testing Library testi

```tsx
// packages/ui/src/components/primitives/__tests__/button.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { FormEvent } from 'react';
import { Button } from '../Button';

describe('Button', () => {
  it('yüklenirken ikinci isteği engeller', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick} loading>Kaydet</Button>);
    const button = screen.getByRole('button', { name: /kaydet/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('varsayılan olarak form submit yapmaz', () => {
    const submit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
    render(<form onSubmit={submit}><Button>Vazgeç</Button></form>);
    fireEvent.click(screen.getByRole('button', { name: 'Vazgeç' }));
    expect(submit).not.toHaveBeenCalled();
  });
});
```

**Uyarlama notu:** Bu örnek sadece davranışın referansını verir. `toBeDisabled()` eşleyicisi için gerçek Vitest test setup'ında `@testing-library/jest-dom/vitest` kaydı gerekir. Form submit testinde `FormEvent<HTMLFormElement>` ile React tipi korunur. Test kodu derlenmeden başarı kanıtı sayılamaz.

### 19.2 Kanıt ve raporlama protokolü

Test raporu `artifacts/quality/ui-components/<run-id>/` altında (Git ignored) tutulur: test çıktısı, failing case ekran görüntüleri, Windows+tema+zoom matrisi, komponent profiling JSON/Chrome trace ve Electron E2E logu. CI için `UI-T` kimliğiyle test dosyası/test adı eşleştirilir. Mock testler gerçek packaged Electron ve native driver testlerinin yerine geçmez.

- Accessibility otomasyonu axe benzeri kontrollerle desteklenebilir, **manuel** NVDA/klavye/görsel kontrol zorunluluğu DOC-23/33'e tabidir.
- `unknown-outcome`, `revision conflict`, `provider disabled` gibi ağır riskler için test sonucu ekran görüntüsü ve sahte veri yerine kayıtlı response fixture göstermelidir.
- Performans verisi P50/P95, donanım, veri seti, cache sıcaklığı, ölçüm aracını açıklamalı.
- Her bug fix, aynı UI-T senaryosuyla bir regresyon testi gerektirir.

## 20. İzlenebilirlik ve yetki haritası

| Konu | Bu belge | Kanonik bağımlılık | Uygulama kabulü |
|---|---|---|---|
| Button/theme/overlay | `UI-I-001–023` | DOC-20 / DOC-23 | Component RTL + visual |
| Shell/sidebar/palette | §7 | DOC-21 / DOC-11 | Navigation E2E |
| Project/Task/Kanban | §8–9 | DOC-08/11/13 | CRUD + large-list |
| Markdown/Decision/Log | §10 | DOC-08/11/14 | Conflict + append-only |
| Search/result UI | §11 | DOC-11/15/21 | FTS source navigation |
| Agent steps/approval | §12 | DOC-11/12/26/27 | Authorized command + trace |
| Voice/transcription/TTS | §13 | DOC-18/19/28/29 | Optional services/fallback |
| Setup/Health/Backup | §14 | DOC-16/17/18/19 | Offline + recovery |
| Quality/Accessibility | §15–19 | DOC-04/23/31/33 | CI/E2E/bench |

### 20.1 Bilinçli olarak ertelenen teknik bağımlılıklar

1. **DOC-23**: İngilizce/Türkçe label'ların erişilebilir test sözlüğü ve manuel ekran okuyucu matrisi.
2. **DOC-26–27**: `SafeToolCallSummary`, `ApprovalReceipt` ve onay TTL/digest'in tam DTO eşlemesi. Bu belge bunları görsel olarak sergiler, yeniden icat etmez.
3. **DOC-28–29**: Ses capture izin politikası, gerçek playback transport ve stream süreçleri. Kesinleşmeden TTS Play butonuna işlevsel denemez.
4. **DOC-31**: Donanıma göre kesin performans sınırları ve histogram/ölçüm metodu.
5. **DOC-33–34**: Görsel snapshotların CI stabilizasyonu, Windows installer ve E2E sertifikasyonu.

Bu dosyalardan biri henüz yoksa geliştirme ajanı özelliği `blocked-by-spec` olarak etiketlemeli ve taslağa uymayan sahte endpoint veya geçici güvenlik bayrağı yaratmamalıdır. Özellikle agent approval, ses playback ve import restore ürünün güvenlik sözleşmelerinden bağımsız tasarlanmamalıdır.

## 21. Definition of Done

- [ ] `@iterkeep/ui` public exports ve React 19/TypeScript strict derleniyor.
- [ ] `@iterkeep/ui` import grafiğinde Node/Electron/SQLite/IPC/feature bağımlılığı yok.
- [ ] Light/dark/system, forced-colors ve reduced-motion kontrolleri geçti.
- [ ] `Button`, `Input`, Dialog, overlay, Toast, Command Palette keyboard testleri geçti.
- [ ] Form submit/IME event ayrımı, aria-label ve focus restoration doğrulandı.
- [ ] Project, Inbox, Tasks, Kanban liste/sıralama/hata durumları doğru.
- [ ] Editör çakışma/unknown-outcome durumunda taslak kaybolmuyor.
- [ ] Agent run/tool stream/onay bileşenleri gerçek güvenli DTO'larla çalışıyor.
- [ ] Ses capability off/yok/izin reddi durumlarında metin arayüzü kullanılabilir.
- [ ] Setup ve System Health sonuçları preference ile actual health'i karıştırmıyor.
- [ ] Uzun listelerde sanallaştırma ve perf bütçesi ölçülmüş.
- [ ] Tüm `UI-T-001–072` senaryoları kalite yönetiminde izleniyor; başarısızlar açıkça raporlu.
- [ ] Packaged Windows E2E için en az bir light ve bir dark smoke görüntüsü alınmış.
- [ ] Belge imzalanmadan `status: draft` korunuyor; kanıt alınmadan implemented iddiası yok.

## 22. Sonraki adım

Sıradaki normatif belge **`23-ACCESSIBILITY-I18N.md`**. Bu dosyadaki public bileşen sözleşmeleri onun klavye odak matrisi, ekran okuyucu kullanım kalıpları, erişilebilir dil/kontrast kontrolü ve çeviri anahtarlarıyla test edilmelidir. Kullanıcı deneyiminde kapsam değişikliği varsa önce DOC-02/03; yeni IPC gerekiyorsa DOC-11; yeni CSS token gerekiyorsa DOC-20 güncellenir.
