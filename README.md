# 쿨한나 (coolhanna.com)

매주 월요일 발송되는 한나 뉴스레터의 공식 아카이브 사이트.

```
홈 (/)        — 소개 + 큰 구독 버튼 + 최신 3편
지난 편 (/archive) — 전체 아카이브 + 검색
소개 (/about) — 쿨한나 소개 + 채널 링크
```

기술: Next.js 15 (App Router) + TailwindCSS + Pretendard 폰트
배포: Vercel + 도메인 `coolhanna.com`

---

## 한나가 새 편 추가하는 방법 (제일 중요)

새 뉴스레터가 발송되면 **`data/newsletters.json` 파일에 한 줄만 추가**하면 됩니다.

### 1. `data/newsletters.json` 열기

파일 맨 위에 가장 최신 편이 있어요. 맨 위에 새 편을 추가합니다:

```json
[
  {
    "id": 23,
    "title": "여기에 제목을 넣어요",
    "date": "2026-05-04",
    "excerpt": "한 줄 요약을 넣어요. 본문 첫 문장도 좋아요.",
    "url": "https://stibee.com/여기에-스티비-공개-URL"
  },
  {
    "id": 22,
    ... (이전 편들은 그대로)
  }
]
```

| 필드 | 설명 | 예시 |
|------|------|------|
| `id` | 회차 번호 (이전 + 1) | `23` |
| `title` | 편지 제목 | `"한 해를 돌아보며"` |
| `date` | 발송일 (`YYYY-MM-DD`) | `"2026-05-04"` |
| `excerpt` | 한 줄 요약 (홈/아카이브에 노출) | `"비결은 없습니다..."` |
| `url` | 스티비 공개 URL | `"https://stibee.com/..."` |

> **주의: JSON 문법**
> - 모든 따옴표는 `"` (큰따옴표)
> - 항목 사이 쉼표(`,`) 빠뜨리지 말기
> - 가장 마지막 항목 뒤에는 쉼표 없음

### 2. 저장 후 GitHub에 푸시

```bash
git add data/newsletters.json
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

## 디자인 / 글꼴 / 색

- 색: 흰 종이 배경(`#fafaf7`) + 진한 잉크 검정(`#0a0a0a`)
- 폰트: Pretendard Variable (한국어), 강조에 Noto Serif KR (이탤릭)
- 모든 디자인 토큰은 `tailwind.config.ts`에서 관리

---

## 폴더 구조

```
coolhanna-website/
├─ app/
│  ├─ layout.tsx        ← 공통 레이아웃 (Header / Footer)
│  ├─ page.tsx          ← 홈 (/)
│  ├─ archive/page.tsx  ← 지난 편 (/archive)
│  ├─ about/page.tsx    ← 소개 (/about)
│  ├─ not-found.tsx     ← 404
│  └─ globals.css
├─ components/
│  ├─ Header.tsx
│  ├─ Footer.tsx
│  ├─ SubscribeButton.tsx
│  ├─ NewsletterRow.tsx
│  └─ ArchiveList.tsx   ← 검색 + 정렬 (클라이언트 컴포넌트)
├─ data/
│  └─ newsletters.json  ★ 새 편 추가하는 파일
├─ lib/
│  └─ newsletters.ts    ← 타입 + 구독/소셜 URL
├─ tailwind.config.ts
├─ next.config.mjs
└─ package.json
```

---

## 도메인 (coolhanna.com) 연결

1. Vercel 대시보드 → 이 프로젝트 → **Settings** → **Domains**
2. `coolhanna.com` 입력 후 **Add**
3. 도메인 등록 업체(가비아 등)에서 Vercel이 알려주는 **A 레코드** 또는 **CNAME**으로 변경
4. 10~30분 대기 → HTTPS 자동 발급
