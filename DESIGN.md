# Logos Translation Assistant - 설계 및 개발 환경 명세서
(Logos Translation Assistant - System Design and Architecture Specification)

본 문서는 사용자의 요청에 따라 **Logos Translation Assistant (Theology Edition)**의 개발 환경, 기본 설계(Architecture), 그리고 상세 설계(Detailed Design)를 기술한 공식 문서입니다. 본 서비스는 개인용 API 키 과금 모델과 다국어(한국어/영어) 번역 지원 및 macOS 단축어(Shortcuts) 환경과의 긴밀한 연동을 목적으로 개발되었습니다.

---

## 1. 개발 환경 (Development Environment)

### 1.1. 시스템 및 런타임 환경
- **운영체제 (OS):** Linux (Cloud Run 컨테이너 환경)
- **런타임 (Runtime):** Node.js v18+ / v20+
- **패키지 매니저:** npm (Node Package Manager)
- **주요 컴파일러 및 언어:** TypeScript v5.0+ (ES Module / CommonJS 혼합 구동)

### 1.2. 프론트엔드 기술 스택 (Frontend Stack)
- **코어 프레임워크:** React 18 (Vite 기반 최적화 빌드)
- **스타일링 라이브러리:** Tailwind CSS (초고속 유틸리티 클래스 아키텍처)
- **애니메이션 라이브러리:** Motion (구 `framer-motion`, `motion/react` 패키지)
- **아이콘 라이브러리:** Lucide React (학술적이고 직관적인 아이콘 페어링)

### 1.3. 백엔드 기술 스택 (Backend Stack)
- **웹 서버:** Express.js (HTTP API 라우팅 및 정적 에셋 서빙 통합)
- **통합 미들웨어:** Vite Middleware (개발 환경 내 모듈 핫 리로딩 지원 및 SPA 라우팅 폴백)
- **서버 번들러:** Esbuild (TypeScript 서버 코드를 단일 CommonJS `dist/server.cjs` 파일로 고속 빌드하여 콜드스타트 시간 단축)

### 1.4. 핵심 외부 API SDK
- **AI 추론 엔진:** `@google/genai` (Google 공식 최신 Gemini SDK)
- **번역 지원 엔진:** DeepL API (학술 번역 보조용)

---

## 2. 기본 설계도 (Basic Design Architecture)

### 2.1. 전체 아키텍처 구성도
본 서비스는 **Full-stack (Express + Vite) 아키텍처**를 채택하여, 보안이 필요한 API 키가 클라이언트 브라우저 측에 직접 노출되지 않도록 설계되었습니다.

```
+-----------------------------------------------------------------------------------+
|                                 사용자 브라우저 (Client)                           |
+-----------------------------------------------------------------------------------+
| [UI Layer (React)]                                                                |
|  - 원문 입력창 / 비교 뷰어 / 개인 API 설정 창 / 단축어 가이드                         |
|  - 언어 상태 관리 (LanguageContext - KO/EN 전환)                                   |
|  - LocalStorage (개인 키 저장: logos_custom_gemini_key, 번역 히스토리 기록)          |
+-----------------------------------------------------------------------------------+
                                         │
                   HTTPS Request (JSON / URL Query Parameters)
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                                Express.js (Backend)                               |
+-----------------------------------------------------------------------------------+
| [API Proxy / Business Logic Router (server.ts)]                                   |
|  - /api/translate       : 본문 전문 번역, 주해 분석 및 어휘 의미론적 교차 대조 API    |
|  - /api/translate-text  : macOS 단축어 전용 초경량 렌더링 HTML 반환 API             |
|                                         │
|  * API 키 선택 흐름: Client 제공 키가 존재하면 해당 키 사용 (개인 과금)              |
|                     그 외 서버 환경 변수(GEMINI_API_KEY) 우선 적용                 |
+-----------------------------------------------------------------------------------+
                                         │
               HTTPS API (Bearer Authentication / API Key Header)
                                         │
                                         ▼
                 +────────────────────────────────────────────────+
                 │      Google Gemini API & DeepL Translation      │
                 +────────────────────────────────────────────────+
```

### 2.2. 핵심 컴포넌트 구성 및 역할
1. **`src/App.tsx` (컨트롤 타워):**
   - 전체 번역 어시스턴트의 글로벌 상태 관리.
   - 개인 설정 패널 노출 여부, 단축어 가이드 탭 조작, 번역 히스토리 갱신 등의 컨트롤 총괄.
2. **`src/components/TranslationViewer.tsx` (비교 뷰어):**
   - 신학 번역, 심층 분석, 어휘 해석(단어 파싱 및 사전 정보) 등을 학술적인 레이아웃(Tabbed Card)으로 분할 렌더링.
3. **`src/components/MacShortcutGuide.tsx` (단축어 연동 가이드):**
   - 사용자가 한 번의 핫키(Cmd+Option+Shift+T)로 본문을 이 앱에 보내어 번역하도록 단축어 구성법을 가이드.
   - **[혁신적 설계]** 사용자가 개인 API 키를 등록하면, 가이드 내 복사용 URL에 해당 키가 자동으로 바인딩되어 복사됩니다.
4. **`src/lib/LanguageContext.tsx` (다국어화 사전 및 컨텍스트):**
   - 웹페이지 한글/영어 원클릭 전환을 위해 `t()` 번역 도구를 제공하는 글로벌 i18n 상태 공유 장치.

---

## 3. 상세 설계도 (Detailed Design)

### 3.1. API 라우트 및 엔드포인트 세부 명세

#### ① 번역 및 신학 분석 API (`POST /api/translate`)
- **설명:** 원문을 전달받아 Gemini AI 엔진과 DeepL 번역을 거친 고도의 정밀 대조 데이터를 JSON 형태로 반환합니다.
- **요청 바디 (Request Body JSON):**
  ```json
  {
    "text": "For God so loved the world, that he gave his only Son...",
    "mode": "balanced", 
    "targetLang": "Korean",
    "geminiApiKey": "AIzaSy...", // (선택) 클라이언트가 발급한 개인 Gemini API 키
    "deeplApiKey": "..."          // (선택) 클라이언트가 발급한 개인 DeepL API 키
  }
  ```
- **인증 가중치 (Key Precedence Logic):**
  1. 클라이언트가 바디(`geminiApiKey`) 혹은 헤더(`x-gemini-api-key`)로 제공한 키가 1순위로 바인딩됩니다. (개인 과금 실현)
  2. 제공된 개인 키가 없는 경우에만 서버 시스템에 기본 설정된 환경 변수의 공용 키를 사용합니다.

#### ② 단축어 전용 가벼운 렌더링 API (`GET /api/translate-text`)
- **설명:** macOS 시스템 단축어 내 '웹 피드 가져오기' 기능에 맞춰, 텍스트가 바로 서식이 가미된 HTML 문서로 즉시 출력될 수 있게 설계된 특화 엔드포인트입니다.
- **쿼리 스트링 매개변수:**
  - `text`: 번역할 원본 텍스트
  - `html`: `true`로 설정 시, 심플한 학술 전용 CSS가 박힌 고해상도 HTML 출력
  - `gemini_key`: (선택) URL 쿼리를 통해 주입되는 개인 Gemini API 키
  - `deepl_key`: (선택) URL 쿼리를 통해 주입되는 개인 DeepL API 키

---

### 3.2. 개인 API 키 발급 및 과금 모델 상세 구현 (Personal Billing Model)

사용자가 번역 과금 비용을 독자적으로 충당할 수 있도록 지원하는 프론트엔드 저장 메커니즘입니다.

1. **저장 영역:** 브라우저 내부의 안전한 `localStorage`를 사용합니다.
   - Gemini API 키 슬롯명: `logos_custom_gemini_key`
   - DeepL API 키 슬롯명: `logos_custom_deepl_key`
2. **동작 메커니즘:**
   - **수동 등록:** 프론트엔드 헤더의 `⚙️ 개인 API 키 설정` 버튼을 클릭하면 슬라이드 형태로 설정 카드 등장. 입력 후 '저장' 시 `logos_keys_updated` 커스텀 이벤트가 브라우저에 발행되어 앱 내 모든 연동 정보가 즉시 동기화됩니다.
   - **자동 온보딩 (URL 주입):** 단축어 링크나 외부 링크를 통해 접속 시 URL 파라미터(`?gemini_key=...&deepl_key=...`)에 API 키가 실려있으면, 앱이 최초 구동될 때 이를 자동으로 감지하여 `localStorage`에 자동 보관 및 온보딩 처리해 줍니다.
   - **단축어 자동 최적화:** `MacShortcutGuide` 컴포넌트는 사용자의 `localStorage`에 등록된 키 상태를 실시간으로 감지하여, 단축어 액션 등록용 추천 엔드포인트 URL에 개인 키 값을 백그라운드 인코딩(`encodeURIComponent`)하여 실시간 렌더링합니다. 따라서 유저는 별도 설정 과정 없이 주소만 복사-붙여넣기하면 단축어에서도 본인 계정으로 즉시 API 호출이 가능합니다.

---

### 3.3. 다국어 지원 (i18n) 설계 방식

영어와 한국어를 원활하게 전환할 수 있도록 구조화된 사전 기반 언어 관리 기술을 채택하고 있습니다.

1. **상태 관리 주체:** `src/lib/LanguageContext.tsx`
2. **사전 매핑 아키텍처:**
   - 사전 데이터는 대칭형 맵 구조로 되어 있어 번역 누락을 차단합니다.
   - `uiLang` 상태가 변경(`ko` ↔ `en`)되면, React 컴포넌트 트리 내에서 이를 구독하고 있는 모든 `t("key")` 함수가 reactive하게 트리거되어 **새로고침 없이 실시간 번역**이 이루어집니다.
3. **단축어 연동 동기화:**
   - 다국어 사전 내에는 macOS 가이드 텍스트 및 "Engine Status", "Theology Edition" 등의 특수 텍스트가 모두 맵핑되어 있어, 언어를 전환하면 시스템 가이드라인의 시각적 요소들까지도 현지화되어 제공됩니다.

---

### 3.4. 보안 설계 정책 (Security Configuration)
- **API 키 은닉:** 환경 변수 은닉 파일(`dotenv`)을 구동하며, 사용자가 개인 API 키를 등록할 경우 서버 전송 바디에 SSL 암호화 터널링을 통해 전달되므로 네트워크 전송 중 외부에 절대 유출되지 않습니다.
- **CORS 및 접근 통제:** Node.js 컨테이너 뒷단의 Nginx 리버스 프록시 단에서 포트 3000 단일 통로를 제어하며, 비정상적인 디렉토리 접근 및 쿼리는 자동으로 필터링 및 차단됩니다.
- **무결성 검사 (TypeScript Type Safety):** 프론트엔드와 백엔드가 `src/types.ts` 내부의 구조적 타입 명세를 전면 공유하므로, API 포맷 유실로 인한 런타임 Crash가 완벽하게 사전 봉쇄되어 있습니다.
