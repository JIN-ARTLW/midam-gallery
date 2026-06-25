# 🌼 그림 올리기 기능 설치 안내

비개발자(예: 어머니) 한 분이 **휴대폰으로 사진을 골라 제목·날짜만 적으면** 갤러리에
그림이 올라가도록 만드는 기능입니다.

## 어떻게 동작하나요?

```
[upload.html 폼]  →  [Cloudflare Worker]  →  GitHub 저장소 images/ 에 커밋
                         (비밀번호 확인 +                    │
                          GitHub 토큰 보관)                  ▼
                                              기존 GitHub Actions 가
                                              WebP·images.json 자동 생성
                                                            │
                                                            ▼
                                                  갤러리에 자동 반영 (1~2분)
```

- **무료**: Cloudflare Workers 무료 플랜(하루 10만 요청)으로 충분합니다.
- **안전**: GitHub 토큰은 폼이 아니라 Worker 안에만 비밀로 보관됩니다.
- 업로드하는 분은 **GitHub도 깃도 몰라도 됩니다.** 비밀번호 하나만 알면 됩니다.

---

## 설치 (한 번만 하면 됩니다 · 약 15분)

### 1단계. GitHub 토큰 만들기
1. https://github.com/settings/tokens?type=beta → **Generate new token** (Fine-grained)
2. **Repository access** → *Only select repositories* → `JIN-ARTLW/midam-gallery` 선택
3. **Permissions** → *Repository permissions* → **Contents: Read and write** 로 설정
4. **Generate token** 누르고 나온 토큰(`github_pat_…`)을 복사해 둡니다. (다시 못 보니 잘 보관)

### 2단계. Cloudflare 계정 + Worker 배포
1. https://dash.cloudflare.com 에서 무료 가입 후, 컴퓨터 터미널에서 `worker` 폴더로 이동:
   ```bash
   cd worker
   npx wrangler login          # 브라우저로 로그인
   ```
2. 비밀 값 2개를 등록합니다 (입력창이 뜨면 값을 붙여넣기):
   ```bash
   npx wrangler secret put GITHUB_TOKEN      # 1단계에서 복사한 토큰
   npx wrangler secret put UPLOAD_PASSWORD   # 어머니께 알려드릴 비밀번호 (원하는 대로)
   ```
3. 배포:
   ```bash
   npx wrangler deploy
   ```
   배포가 끝나면 주소가 나옵니다. 예:
   `https://midam-upload.내아이디.workers.dev` ← **이 주소를 복사**

### 3단계. 업로드 페이지에 Worker 주소 넣기
1. [upload.html](upload.html) 을 열어 위쪽의 이 줄을 찾습니다:
   ```js
   const WORKER_URL = 'https://midam-upload.YOUR-SUBDOMAIN.workers.dev';
   ```
2. 2단계에서 복사한 **실제 Worker 주소**로 바꿔 저장합니다.
3. 변경사항을 push 하면 GitHub Pages에 반영됩니다:
   ```bash
   git add upload.html
   git commit -m "feat: 업로드 페이지에 Worker 주소 연결"
   git push
   ```

### 4단계. 끝! 주소 알려드리기
업로드 페이지 주소:
**https://jin-artlw.github.io/midam-gallery/upload.html**

이 주소를 어머니 휴대폰에 **즐겨찾기(홈 화면에 추가)** 해 드리고, 비밀번호를 알려드리면 됩니다.
(이 페이지는 검색에 노출되지 않고 갤러리에서 링크도 안 보이므로, 주소를 아는 분만 사용합니다.)

---

## 👵 어머니께 알려드릴 사용법

1. 즐겨찾기 해 둔 **'그림 올리기'** 를 엽니다.
2. **📷 사진 고르기** 를 눌러 그림 사진을 고르거나 바로 찍습니다.
3. **제목**(예: 가을 한옥), **종류**(수채화·펜화 등), **날짜** 를 고릅니다.
4. **비밀번호** 를 적고 **올리기** 를 누릅니다.
5. "올라갔어요! 🌼" 가 나오면 끝. 1~2분 뒤 갤러리에 그림이 보입니다.

---

---

## 🗑 작품 관리(삭제) 페이지

관리 페이지에서 작품을 **삭제**할 수 있습니다.
- 주소: **https://jin-artlw.github.io/midam-gallery/manage.html**
- 비밀번호(업로드와 동일)를 입력 → 작품의 **🗑 삭제** 버튼 → 확인하면 삭제
- 삭제하면 원본과 WebP가 함께 지워지고, 1~2분 뒤 갤러리에서 사라집니다.

### ⚠️ 삭제 기능을 켜려면 Worker를 다시 배포하세요
삭제 기능은 Worker 코드에 새로 추가됐으므로, **한 번 재배포**해야 작동합니다:
```bash
cd /Users/jin-yeseo/code/midam/worker
npx wrangler deploy
```
(대시보드에서 코드를 붙여넣어 배포했다면, `worker/upload-worker.js` 내용을 다시 붙여넣어 Deploy 하세요.)

> 삭제도 업로드와 같은 비밀번호를 씁니다. 삭제는 따로 더 보호하고 싶다면 알려주세요 — 관리자 전용 비밀번호를 분리할 수 있어요.

---

## 자주 묻는 질문

- **비밀번호를 바꾸고 싶어요** → `npx wrangler secret put UPLOAD_PASSWORD` 다시 실행.
- **사진이 안 보여요** → GitHub Actions(WebP·매니페스트 생성)가 도는 중입니다. 1~2분 기다리세요.
- **제목에 `_`(밑줄)이 들어가요** → 파일명 규칙(`제목_종류_날짜`)과 겹치므로 자동으로 `-` 로 바뀝니다.
- **무료 범위를 넘지 않나요** → 하루 10만 요청 무료. 그림 업로드 용도로는 절대 넘지 않습니다.
