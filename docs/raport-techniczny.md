# MedTrack — Raport Techniczny

## 1. Opis projektu

MedTrack to mobilna aplikacja zdrowotna (React Native + Expo) umożliwiająca pacjentom przechowywanie, analizę i śledzenie wyników badań laboratoryjnych z asystentem AI. Aplikacja wspiera 8 ról użytkowników (pacjent, lekarz, rodzina, opiekun, admin kliniki, laborant, HR pracodawcy, super admin).

**Wersja:** 1.0.0
**Platformy:** iOS, Android, Web
**Język interfejsu:** polski

---

## 2. Stack technologiczny

| Warstwa | Technologia | Wersja |
|---------|-------------|--------|
| Framework mobilny | React Native | 0.83.2 |
| Platforma | Expo | ~55.0.8 |
| Język | TypeScript | ~5.9.2 |
| UI framework | React | 19.2.0 |
| Backend (serverless) | Convex | ^1.21.0 |
| Autentykacja | @convex-dev/auth + @auth/core | 0.0.91 / 0.37.0 |
| Nawigacja | expo-router (file-based) | ~55.0.7 |
| Styling | NativeWind (Tailwind CSS) | ^4.1.23 |
| Wykresy | react-native-gifted-charts | ^1.4.76 |
| ML on-device | react-native-executorch | ^0.7.0 |
| AI (cloud) | GLM-5 (Zhipu BigModel API) | — |
| Markdown | react-native-markdown-display | ^7.0.2 |
| Animacje | react-native-reanimated | 4.2.1 |
| Bezpieczny storage | expo-secure-store | ~55.0.9 |

---

## 3. Architektura aplikacji

```
┌─────────────────────────────────────────────────┐
│                  React Native App               │
│  ┌───────────┐ ┌──────────┐ ┌────────────────┐  │
│  │ Expo      │ │ NativeWind│ │ expo-router    │  │
│  │ Router    │ │ Tailwind  │ │ (file-based)   │  │
│  └───────────┘ └──────────┘ └────────────────┘  │
│  ┌───────────────────────────────────────────┐   │
│  │  Convex React Hooks (useQuery/useMutation)│   │
│  └───────────────────┬───────────────────────┘   │
└──────────────────────┼───────────────────────────┘
                       │ real-time sync
┌──────────────────────┼───────────────────────────┐
│                 Convex Backend                    │
│  ┌─────────┐ ┌───────────┐ ┌──────────────────┐  │
│  │ Queries  │ │ Mutations │ │ Actions (Node.js)│  │
│  │ (7)      │ │ (7)       │ │ (2 — AI)         │  │
│  └─────────┘ └───────────┘ └──────────────────┘  │
│  ┌─────────────────┐  ┌───────────────────────┐  │
│  │ Auth (password)  │  │ RBAC (8 ról, 16 perm)│  │
│  └─────────────────┘  └───────────────────────┘  │
│  ┌─────────────────────────────────────────────┐  │
│  │            Convex Database (13 tabel)        │  │
│  └─────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
                       │
           ┌───────────┴────────────┐
           │   GLM-5 (Zhipu API)    │
           │  • Chat z narzędziami  │
           │  • Parsowanie OCR      │
           │  • Streaming SSE       │
           └────────────────────────┘
```

---

## 4. Baza danych — schemat (13 tabel)

| Tabela | Opis | Kluczowe pola | Indeksy |
|--------|------|---------------|---------|
| **users** | Profile użytkowników | email, name, role (8 typów), medicalSegment | by_email, by_role, by_clinic |
| **labResults** | Wyniki badań | userId, labName, collectionDate, ocrStatus, uploadSource | by_user, by_user_date, by_clinic |
| **parameters** | Parametry badań | resultId, name, value, unit, status, referenceMin/Max | by_result, by_user_name_date |
| **alerts** | Alerty o nieprawidłowościach | userId, parameterId, type (out_of_range/critical) | by_user_unread |
| **reminders** | Przypomnienia o badaniach | userId, title, scheduledAt, repeatIntervalDays | by_user, by_scheduled |
| **chatMessages** | Wiadomości czatu AI | userId, conversationId, role, content, isStreaming | by_user_conversationId |
| **sharingTokens** | Tokeny udostępniania | userId, token, accessLevel, parameterFilter, expiresAt | by_token, by_user |
| **patientDoctorLinks** | Relacja pacjent–lekarz | patientId, doctorId, accessLevel, status | by_patient, by_doctor |
| **familyLinks** | Relacja pacjent–rodzina | ownerId, memberId, relationship, permissions | by_owner, by_member |
| **clinics** | Kliniki B2B | name, nip, subscriptionPlan, labIntegrations | — |
| **employers** | Pracodawcy | name, nip, employeeCount, subscriptionPlan | — |

---

## 5. Ekrany aplikacji (17 widoków)

### Nawigacja główna (5 zakładek)

| Zakładka | Ekran | Opis |
|----------|-------|------|
| Dashboard | `(tabs)/index.tsx` | Powitanie, alerty, ostatnie wyniki, nadchodzące badania |
| Badania | `(tabs)/results/index.tsx` | Lista wyników + tab switcher **Wyniki** / **Trendy** |
| Dodaj | `(tabs)/scan.tsx` | Skanowanie OCR z aparatu + ręczne dodawanie |
| Asystent | `(tabs)/assistant.tsx` | Chat AI z markdown i streamingiem |
| Profil | `(tabs)/profile.tsx` | Zarządzanie profilem, segment medyczny |

### Ekrany zagnieżdżone

| Ekran | Opis |
|-------|------|
| `results/[id].tsx` | Szczegóły wyniku — parametry, zakresy referencyjne, ReferenceBar |
| `results/trend/[name].tsx` | Szczegóły trendu — wykres liniowy, historia pomiarów, statystyki |
| `add-result/review.tsx` | Przegląd i korekta wyników OCR przed zapisem |
| `reminders.tsx` | Zarządzanie przypomnieniami o badaniach |
| `share/[token].tsx` | Publiczny widok udostępnionych wyników (bez logowania) |

### Autentykacja

| Ekran | Opis |
|-------|------|
| `(auth)/sign-in.tsx` | Logowanie email + hasło |
| `(auth)/sign-up.tsx` | Rejestracja z wyborem roli |

---

## 6. Backend API

### Queries (7 plików, 336 linii)

| Moduł | Funkcje |
|-------|---------|
| `results` | `list()`, `listRecent(limit)`, `getById(resultId)` |
| `parameters` | `listByNameForTrends(name)`, `listDistinctNames()`, `listParametersSummary()` |
| `alerts` | `listUnread()` |
| `reminders` | `listUpcoming(limit)`, `listPast()` |
| `chat` | `listMessages()` (internal), `listForUser(conversationId)` |
| `users` | `getCurrent()`, `getByAuthId()` (internal) |
| `shares` | `getByToken(token)` |

### Mutations (7 plików, 425 linii)

| Moduł | Funkcje |
|-------|---------|
| `results` | `saveScannedResult()` (z auto-alertami), `remove()` (kaskadowe usuwanie) |
| `chat` | `saveMessages()`, `saveUserMessage()`, `createStreamingMessage()`, `updateStreamingContent()` |
| `reminders` | `create()`, `update()`, `remove()` |
| `alerts` | `markRead()`, `markAllRead()` |
| `users` | `updateProfile()`, `deleteAccount()` (RODO) |
| `shares` | `createToken()`, `revokeToken()` |
| `storage` | `generateUploadUrl()` |

### Actions AI (2 pliki, 579 linii)

| Action | Model | Opis |
|--------|-------|------|
| `medicalAgent.chat` | GLM-5 | Asystent medyczny z 8 narzędziami, tool-calling loop (max 5 iteracji), streaming SSE, historia konwersacji |
| `parseWithAI` | GLM-5 (JSON mode) | Parsowanie tekstu OCR na strukturalne dane (labName, data, parametry) |

---

## 7. Integracje AI

### Asystent medyczny (`medicalAgent.ts`)

**8 narzędzi dostępnych dla modelu:**

| Narzędzie | Opis |
|-----------|------|
| `getUserProfile` | Profil pacjenta (imię, data urodzenia, segment) |
| `getRecentResults` | Ostatnie N wyników badań |
| `getResultDetails` | Szczegóły wyniku z parametrami |
| `getAllResults` | Pełna historia wyników |
| `getParameterTrends` | Historia wartości parametru (do analizy trendu) |
| `getDistinctParameters` | Lista dostępnych nazw parametrów |
| `getUnreadAlerts` | Nieprzeczytane alerty |
| `getUpcomingReminders` | Nadchodzące przypomnienia |

**Streaming odpowiedzi:**
1. Wiadomość użytkownika → zapis do DB
2. Pusty msg asystenta z `isStreaming: true`
3. Tool-calling loop (bez streamowania)
4. Finalna odpowiedź → SSE stream z GLM API
5. Aktualizacja DB co ~150ms → Convex reaktywność → UI na żywo

### Parsowanie OCR (`parseWithAI.ts`)

- Wejście: surowy tekst OCR z polskich dokumentów laboratoryjnych
- Wyjście: JSON z `labName`, `collectionDate`, `parameters[]`
- Temperature: 0.1 (minimalna wariancja)
- Klient-side: redakcja danych osobowych przed wysyłką (RODO)

---

## 8. System uprawnień (RBAC)

### 8 ról z 16 uprawnieniami

| Rola | Kluczowe uprawnienia |
|------|---------------------|
| **patient** | Pełny CRUD własnych danych, udostępnianie, zarządzanie rodziną |
| **doctor** | Odczyt wyników powiązanych pacjentów |
| **family_member** | Odczyt wyników członka rodziny, przypomnienia |
| **caregiver** | Odczyt wyników podopiecznego, przypomnienia |
| **clinic_admin** | Widok wszystkich pacjentów kliniki |
| **lab_technician** | Tylko upload wyników |
| **employer_hr** | Zagregowane dane pracowników |
| **super_admin** | Wszystkie uprawnienia |

**Mechanizm:** Sprawdzanie relacji (patientDoctorLinks, familyLinks) + rola użytkownika na poziomie każdego query/mutation.

---

## 9. Komponenty UI (7 komponentów)

| Komponent | Opis |
|-----------|------|
| `StatusBadge` | Kolorowy badge statusu parametru (Norma/Podwyższony/Obniżony/Krytyczny) |
| `ResultCard` | Karta wyniku badania (labName, data, notatki) |
| `ParameterRow` | Wiersz parametru z wartością, jednostką, zakresem |
| `EmptyState` | Stan pusty z ikoną, opisem i CTA |
| `SectionHeader` | Nagłówek sekcji z opcjonalnym przyciskiem |
| `TrendChart` | Wykres liniowy (react-native-gifted-charts) z normą i statusem |
| `TrendDetails` | Lista parametrów z podsumowaniem trendów, nawigacja do szczegółów |

---

## 10. Metryki kodu

| Kategoria | Pliki | Linie kodu |
|-----------|-------|------------|
| Ekrany aplikacji | 17 | ~2 350 |
| Backend (queries/mutations/actions) | 16 | ~1 340 |
| Backend (lib/config) | 6 | ~340 |
| Komponenty UI | 7 | ~430 |
| Utilities + typy | 5 | ~400 |
| Konfiguracja | 4 | ~150 |
| **Razem** | **~55** | **~5 010** |

---

## 11. Kluczowe funkcjonalności

### Dla pacjenta
- Skanowanie wyników badań (OCR z aparatu + AI parsing)
- Ręczne dodawanie wyników
- Przeglądanie historii badań
- Analiza trendów parametrów (wykresy liniowe)
- Chat z asystentem AI (streaming, markdown, tool-use)
- Alerty o nieprawidłowych wartościach
- Przypomnienia o badaniach
- Udostępnianie wyników lekarzowi (tokeny z wygaśnięciem)

### Dla lekarza / kliniki
- Podgląd wyników powiązanych pacjentów
- Filtrowane udostępnianie (wybrane parametry)
- Panel kliniki (admin)

### Bezpieczeństwo
- Autentykacja email + hasło z @convex-dev/auth
- RBAC z 16 granularnymi uprawnieniami
- Redakcja danych osobowych przed AI (RODO)
- Bezpieczny storage (expo-secure-store)
- Tokeny udostępniania z wygaśnięciem i limitem wyświetleń
- Kaskadowe usuwanie danych przy zamknięciu konta (RODO)

---

## 12. Design system

- **Paleta kolorów:** Primary blue (#2563EB), status colors (green/amber/indigo/red)
- **Typografia:** System fonts, Menlo/monospace dla kodu
- **Spacing:** Tailwind 4px grid
- **Zaokrąglenia:** rounded-xl (12px), rounded-2xl (16px) dla bąbelków czatu
- **Ciemny motyw:** Przygotowane (userInterfaceStyle: automatic)

---

## 13. Możliwości rozwoju

| Obszar | Opis |
|--------|------|
| Push notifications | expo-notifications + Convex scheduled functions |
| Integracja z laboratoriami | Webhook `lab_webhook` (uploadSource gotowy w schemacie) |
| Eksport PDF | Generowanie raportów zdrowotnych |
| Panel lekarza | Dedykowany widok dla roli doctor |
| Wielojęzyczność | i18n (obecnie polski hardcoded) |
| Biometria | Logowanie odciskiem palca / Face ID |
| Ciemny motyw | UI gotowe (automatic), potrzebne dark: klasy Tailwind |
| Integracja HL7/FHIR | Standardy wymiany danych medycznych |
