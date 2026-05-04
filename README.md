# 쿨한나 (coolhanna.com)

매주 월요일 아침 8시에 발송되는 한나 뉴스레터의 공식 아카이브 사이트.

```
홈 (/)        — 소개 + 큰 구독 버튼 + 최신 6편 (일러스트 + 제목)
지난 편 (/archive) — 전체 아카이브 그리드 + 검색
소개 (/about) — 쿨한나 소개 + 채널 링크
```

기술: Next.js 15 (App Router) + TailwindCSS + Pretendard 폰트
배포: Vercel + 도메인 `coolhanna.com`
디자인: 각 편 = **3:2 일러스트 + 제목**

---

## 한나가 새 편 추가하는 방법 (제일 중요)

새 뉴스레터가 발송되면 **(1) 일러스트 PNG 1장 업로드** + **(2) `data/newsletters.json`에 한 줄 추가** 두 단계로 끝납니다.

### 1. 일러스트 PNG 업로드

`public/images/` 폴더에 **3:2 비율** PNG 파일을 올립니다.
파일명은 회차 번호 두 자리(`23.png`, `24.png` ...)로.

> **권장 크기**: 1200×800 px (또는 1500×1000 px)
> **포맷**: PNG (투명 배경 가능)
> **비율**: 3:2 (다른 비율이면 `object-cover`로 잘려 보일 수 있어요)

### 2. `data/newsletters.json` 맨 위에 한 줄 추가

가장 최신 편이 배열의 **맨 위**에 와야 합니다.

```json
[
  {
    "title": "새 편지 제목을 여기에",
    "illustration": "/images/23.png",
    "url": "https://stibee.com/여기에-스티비-공개-URL"
  },
  {
    "title": "한 해를 돌아보며, 다시 쓰는 편지",
    "illustration": "/images/22.png",
    "url": "https://stibee.com/PLACEHOLDER_22"
  },
  ... (이전 편들은 그대로)
]
```

| 필드 | 설명 | 예시 |
|------|------|------|
| `title` | 편지 제목 (사이트에 그대로 노출) | `"한 해를 돌아보며"` |
| `illustration` | `/images/` 경로 + 파일명 | `"/images/23.png"` |
| `url` | 스티비 공개 URL (새 탭에서 열림) | `"https://stibee.com/..."` |

> **JSON 문법 주의**
> - 모든 따옴표는 `"` (큰따옴표)
> - 항목 사이 쉼표(`,`) 빠뜨리지 말기
> - 가장 마지막 항목 뒤에는 쉼표 **없음**

### 3. GitHub에 푸시 → 자동 배포

```bash
git add public/images/23.png data/newsletters.json
git commit -m "feat: 23편 추가"
git push
```

푸시하면 Vercel이 **자동으로 사이트를 다시 배포**합니다 (1~2분 소요).

---

## 처음 로컬에서 띄우기

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 열기.

빌드 미리 보기:

```bash
npm run build
npm run start
```

---

## 구독 버튼 / 소셜 링크 바꾸기

`lib/newsletters.ts` 파일 위쪽의 상수를 바꾸면 사이트 전체에 반영됩니다.

```ts
export const SUBSCRIBE_URL = "https://page.stibee.com/subscriptions/PLACEHOLDER";

export const SOCIAL = {
  instagram: "https://instagram.com/coolhanna",
  youtube: "https://youtube.com/@coolhanna",
};
```

- `SUBSCRIBE_URL` ← 스티비 신청 페이지 주소
- `SOCIAL.instagram` ← 인스타그램 프로필 URL
- `SOCIAL.youtube` ← 유튜브 채널 URL

---

## 일러스트 만들기 팁

- **3:2 비율 고정**. 1200×800 권장 (망가져 보이지 않으려면 같은 비율).
- 배경색: 종이톤(`#fafaf7` ~ `#efece4`)이면 사이트와 자연스럽게 어울립니다.
- 본문 텍스트는 일러스트 안에 넣지 말 것 (제목이 별도로 노출됨).
- AI 일러스트 / 직접 그린 그림 / 사진 모두 가능.

지금 `public/images/` 안의 파일들은 **빈 placeholder (1×1 투명 PNG)** 입니다.
한나가 PNG로 덮어쓰면 그 편만 자연스럽게 일러스트가 나타납니다.

---

## 디자인 / 글꼴 / 색

- 색: 종이 배경(`#fafaf7`) + 잉크 검정(`#0a0a0a`) + 카드 슬롯 톤(`#efece4`)
- 폰트: Pretendard Variable (한국어), 강조에 Noto Serif KR (이탤릭)
- 모든 디자인 토큰은 `tailwind.config.ts`에서 관리

---

## 폴더 구조

```
coolhanna-website/
├─ app/
│  ├─ layout.tsx         ← 공통 레이아웃 (Header / Footer)
│  ├─ page.tsx           ← 홈 (/)
│  ├─ archive/page.tsx   ← 지난 편 (/archive)
│  ├─ about/page.tsx     ← 소개 (/about)
│  ├─ not-found.tsx      ← 404
│  └─ globals.css
├─ components/
│  ├─ Header.tsx
│  ├─ Footer.tsx
│  ├─ SubscribeButton.tsx
│  ├─ NewsletterCard.tsx ← 일러스트 + 제목 카드
│  └─ ArchiveList.tsx    ← 검색 + 정렬 그리드 (클라이언트)
├─ data/
│  └─ newsletters.json   ★ 새 편 추가하는 파일
├─ public/
│  └─ images/            ★ 일러스트 PNG (01.png ~ 22.png ...)
├─ lib/
│  └─ newsletters.ts     ← 타입 + 구독/소셜 URL
├─ tailwind.config.ts
├─ next.config.mjs
└─ package.json
```

---

## 도메인 (coolhanna.com) 연결

1. Vercel 대시보드 → 이 프로젝트 → **Settings** → **Domains**
2. `coolhanna.com` 입력 후 **Add**
3. 도메인 등록 업체에서 Vercel이 알려주는 **A 레코드** 또는 **CNAME**으로 변경
4. 10~30분 대기 → HTTPS 자동 발급
