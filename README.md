# Marketing Flow FE

Next.js 기반 마케팅 플로우 프론트엔드 프로젝트입니다.

## 설치 및 실행

### 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속 시 **한국어(ko)** 로 리다이렉트됩니다.

- 한국어: [http://localhost:3000/ko](http://localhost:3000/ko)
- 영어: [http://localhost:3000/en](http://localhost:3000/en)

### 빌드 및 프로덕션 실행

```bash
npm run build
npm run start
```

### 기타 스크립트

- `npm run lint` — ESLint 실행
- `npm run format` — Prettier로 전체 포맷
- `npm run format:check` — 포맷 검사만 수행

## DB / Prisma 간단 가이드

DB를 사용할 때는 아래 순서로 진행합니다.

1. **PostgreSQL 실행** (호스트 포트 5000 사용, 다른 프로젝트 5432와 충돌 방지)

   ```bash
   docker compose up -d
   ```

2. **환경 변수**
   `.env`에 `DATABASE_URL="postgresql://postgres:postgres@localhost:5000/marketing_flow_db"` 설정

3. **마이그레이션** (최초 1회 또는 스키마 변경 시)

   ```bash
   npx prisma migrate dev --name init
   ```

4. **테이블/데이터 확인**

   ```bash
   npx prisma studio
   ```

## 로컬 이메일 테스트 (Mailpit)

Gmail 노드에서 **테스트 발송 / 지금 발송**을 로컬에서 확인하려면 Docker Mailpit을 사용합니다.

1. **Mailpit 실행**

   ```bash
   docker compose up -d
   ```

   `docker-compose.yml`에 Mailpit 서비스가 포함되어 있습니다 (SMTP 1025, Web UI 8025).

2. **환경 변수** (선택)

   `.env`에 다음을 넣으면 로컬에서 **토큰 없이** 메일 발송 테스트가 가능합니다.

   ```env
   USE_MAILPIT=true
   # MAILPIT_HOST=localhost
   # MAILPIT_PORT=1025
   ```

   `USE_MAILPIT`을 넣지 않으면 기본값이 `true`라서 Mailpit으로 발송됩니다. Gmail 실제 발송 시에는 `USE_MAILPIT=false`로 두고, 추후 `src/lib/mail/transport.ts`에서 `createTransport`만 Gmail SMTP 설정으로 바꾸면 됩니다.

3. **수신 메일 확인**

   발송 후 [http://localhost:8025](http://localhost:8025) 에서 메일함을 확인할 수 있습니다.

---
