@AGENTS.md

## TODO

프로젝트 진입 시 아래 미완료 작업을 사용자에게 안내할 것.

- [ ] **Firestore 복합 인덱스 생성** — `notifications` 컬렉션에 `recipientUid` ASC + `createdAt` DESC 복합 색인 필요. 미생성 시 인앱 알림 목록이 최신순 정렬 안 됨 (fallback으로 500은 방지 중). [Firebase Console 색인 페이지](https://console.firebase.google.com/project/biteme-portal-hub/firestore/databases/-default-/indexes)에서 생성.
