# Supabase 설정

Block Drop은 Supabase Auth로 이메일과 비밀번호 로그인을 처리하고, Postgres에 플레이어 프로필과 점수를 저장합니다. 이메일 인증을 끄면 가입 직후 로그인됩니다.

## 1. 데이터베이스 준비

1. Supabase에서 프로젝트를 만들고 **SQL Editor**를 엽니다.
2. [`supabase/schema.sql`](supabase/schema.sql)의 내용을 실행합니다.
3. 프로젝트 왼쪽 메뉴의 **Authentication → Sign In / Providers → Email**에서 Email provider와 새 사용자 가입을 켭니다.
4. 같은 Email 설정에서 **Confirm email**을 끕니다. Supabase는 이 설정을 끄면 이메일 주소 확인 없이 가입 직후 세션을 발급합니다.

## 2. 브라우저 연결

Supabase 프로젝트의 **Project Settings → API Keys**에서 Project URL과 publishable key(이전 프로젝트에서는 `anon` key)를 복사해 [`supabase-config.js`](supabase-config.js)에 입력합니다.

```js
window.BLOCKDROP_SUPABASE_CONFIG = {
  url: 'https://YOUR_PROJECT.supabase.co',
  anonKey: 'YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY'
};
```

이 파일은 브라우저에 공개되므로 publishable/anon key만 넣으세요. `service_role` 또는 secret key는 절대 넣지 마세요. 데이터 접근 권한은 `schema.sql`의 RLS 정책이 제한합니다.

## 3. 앱 동작

- 닉네임, 이메일, 비밀번호로 가입하고 이메일과 비밀번호로 로그인합니다.
- 한 판이 끝나면 로그인한 플레이어의 점수, 레벨, 지운 줄 수, 난이도를 저장합니다.
- 명예의 전당은 플레이어마다 최고 점수 한 건씩 보여주며, 점수 내림차순과 기록 시간 순으로 TOP 10을 표시합니다.
- 로그아웃 상태에서도 순위는 볼 수 있고 게임은 플레이할 수 있습니다. 점수 저장은 로그인한 상태에서 끝낸 판에 한해 이뤄집니다.

점수는 브라우저에서 제출되므로 이 구성은 일반 플레이용 순위표입니다. 변조 방지 점수 검증이 필요하면 서버에서 게임 진행을 검증하는 별도 방식을 추가해야 합니다.

Supabase 설정 파일을 채우고 배포하면 로그인과 순위가 활성화됩니다. 이 저장소는 Vercel에 연결돼 있어 GitHub의 `main` 브랜치 업데이트 후 자동 배포됩니다.
