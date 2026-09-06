# 한나 공유 다이어리

2026-09-06. `/dashboard/diary`는 한나와 AI가 메모와 일정을 공유하면서 근거 있는 제안과 질문을 이어가는 화면이다. 다이어리는 조언을 위한 맥락이며, 기존에 합의한 ‘함께 생각할 것’을 대체하지 않는다. Google Calendar에 의존하지 않는다. 주간은 한국 날짜 기준 월요일부터 일요일까지이며, 월간과 날짜 미정 기록도 같은 원장에서 읽는다.

## 사용

- 위쪽 메모칸은 하루에 여러 번 쓴다. 줄바꿈과 처음 남긴 원문을 보존한다.
- 주간 날짜의 `이날에 쓰기`로 날짜가 있는 할 일이나 메모를 추가한다.
- 월간에서는 날짜를 눌러 기록을 읽고 `쓰기`로 추가한다.
- 내용을 누르면 날짜·시간·종류·내용을 수정한다. 완료 상태는 주간과 월간에 함께 반영된다.
- 저장 성공은 서버 응답을 받은 뒤 표시한다. 실패하면 입력을 유지한다. 새로고침 또는 화면으로 돌아왔을 때 서버 기록을 다시 읽는다.
- 다른 기기에서 먼저 수정했다면 그 내용을 확인하면서 자신의 초안을 유지할 수 있다.

## AI와 공유하는 방법

‘함께 생각할 것’에는 AI 제안, 지금 이 제안을 꺼낸 이유, 출처, 질문, AI가 이해한 한나의 뜻을 함께 보여준다. 출처는 한나의 맥락·뒷받침하는 근거·표현을 위한 참고로 구분한다. 표현 기법을 팔로워 증가의 증거처럼 쓰지 않는다.

한나는 질문에 답하거나 ‘내 뜻과 달라요’로 정정하고, ‘검토할 제안으로 담기’를 선택할 수 있다. 답변과 정정은 원문 그대로 별도 메모로 저장되며 해당 제안의 ID와 버전에 연결된다. 검토 선택은 날짜 없는 검토 목록이며, 확정 일정이나 마감일을 만들지 않는다. 제안은 달력의 일정 행에 중복 표시하지 않는다.

새 답변·정정이 아직 제안에 반영되지 않았거나 참조한 기록이 수정되면 ‘다시 검토 필요’가 표시된다. 이것은 재검토 상태이지 자동 AI 실행 상태가 아니다. 후속 AI 검토는 원문 답변과 일정을 먼저 읽고 제안의 `basis`에 실제 검토한 기록 ID/버전을 포함한다. 원문과 과거 이력을 보존하며 한나의 검토 선택을 바꾸지 않는다.

Backend: `/Users/gimhanna/Documents/coolhanna-telegram-bot`.
저장 위치는 `config.JOURNAL_FILE`로만 정의한다. 현재 위치는 `/Users/gimhanna/Obsidian Vault/한나_AI_데이터베이스/01_시스템/공유다이어리/journal.json`이다.

AI가 일정을 검토할 때 먼저 해당 기간과 날짜 미정 항목을 읽는다. 빈 날을 여유 시간이라고 판단하지 않는다. 원문 작성자, 정정 이력, 확정 여부를 함께 확인한다. 기존 일별 Markdown이나 옛 메모를 이 원장에 자동 복제하지 않는다.

기존 인증을 사용하는 API:

```
GET   /api/dashboard/journal?start=YYYY-MM-DD&end=YYYY-MM-DD&include_undated=true
GET   /api/dashboard/journal/reflections?limit=10
POST  /api/dashboard/journal
GET   /api/dashboard/journal/{id}
PATCH /api/dashboard/journal/{id}
GET   /api/dashboard/journal/{id}/history
```

날짜 범위는 양 끝을 포함하며 최대 93일이다. 직접 backend 호출은 기존 Bearer 인증이 필요하다. 인증 정보는 코드·노트·출력에 기록하지 않는다. 브라우저에서는 기존 로그인과 `/api/dashboard/proxy/journal`을 사용하며 작성자가 한나로 고정된다.

AI 제안은 `author: "ai"`, `actor: "ai"`, `confirmation: "proposed"`로 생성하고 `source`에 해당 대화·자료의 근거를 적는다. AI가 새 날짜를 확정 약속처럼 만들지 않는다. 한나가 화면에서 확정한 경우 원래 AI 작성자 표시는 유지된다. 현재 직접 backend의 Bearer 사용자는 신뢰하는 내부 호출자이며 별도 AI 계정 시스템은 없다.

POST는 UUID `request_id`와 `text`를 받는다. 선택 필드는 `date`, `time`, `kind`(`memo`/`task`), `author`, `actor`, `confirmation`, `source`다. 같은 요청 재시도에는 같은 UUID를 쓴다. 내용을 바꿨다면 새 요청 UUID를 쓴다. 날짜를 정하지 않은 기록은 `date:null`, `time:null`이다.

구조화한 제안은 AI의 미확정 메모에 `reflection`을 추가한다. 필드는 `title`, `understanding`, `why_now`, `question`, `evidence`(label/role/detail/url), `basis`(entry_id/version)다. `text`가 제안 본문이다. 답변은 한나의 확정 메모에 `reply: {reflection_id, reflection_version, type: "answer" | "correction"}`를 추가한다. `review_state`는 제안의 `unreviewed`/`considering`/`dismissed` 상태이며 한나만 변경한다. 모든 기록은 기존 원장과 잠금·버전·생성 중복 방지 체계를 공유한다. 기존 schema_version=1 기록도 그대로 읽는다.

PATCH는 `expected_version`과 `actor`를 포함한다. 409가 오면 새 버전을 읽어 변경 내용을 비교한다. 충돌을 숨기고 버전만 바꿔 덮어쓰지 않는다. AI는 아직 확정되지 않은 자신의 제안을 수정할 수 있다. 완료 처리는 확정된 할 일에만 적용한다. 삭제 대신 `status: "archived"`를 사용하며 이력은 보존한다.

이 화면을 열어 두었다고 AI가 계속 실행되는 것은 아니다. 메모 기반 자동 조사·역제안·알림은 별도 연결 단계다. 기존 자동화는 이번 기능에서 변경하지 않았다.

## 검증과 운영

프런트엔드: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
Backend: `venv/bin/python -m unittest -q test_journal`.

테스트 저장 경로는 `HANNA_JOURNAL_PATH`로 별도 지정한다. 실제 사용자 원장을 테스트 데이터로 덮어쓰지 않는다. backend의 JSON 쓰기는 별도 파일 잠금과 원자적 교체를 사용하고 생성 중복·수정 충돌·원문·이력을 검사한다.

운영 backend는 `com.coolhanna.dashboard-api` LaunchAgent를 사용하며 `/healthz`로 확인한다. 웹 배포는 이 저장소의 기존 Vercel 연결을 사용한다. 되돌릴 때 웹 변경을 revert하고 backend의 `journal_api` import/router include를 제거한 뒤 서비스 상태를 확인한다. 사용자 다이어리 파일은 보존한다.
