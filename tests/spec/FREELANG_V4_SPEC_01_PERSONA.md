# FreeLang v4 — Spec 01: 타겟 페르소나 및 핵심 문제 정의

---

# 1. 누가 쓰는가

## 1.1 주 사용자: AI Code Agent

코드를 **작성하는** 주체가 사람이 아니라 AI다.

```
사람 → 의도를 말한다 ("파일 읽어서 에러 처리해줘")
AI   → 코드를 생성한다 (fn read_file(...): Result<...>)
컴파일러 → 코드가 맞는지 검증한다
```

AI Agent란:
- Claude Code, GitHub Copilot, Cursor 등 LLM 기반 코드 생성 도구
- 사용자의 자연어 지시를 받아 코드를 생성하고, 빌드하고, 실행하는 자율 에이전트
- 코드를 한 번에 맞추는 게 아니라, 컴파일러 피드백으로 반복 수정하는 루프를 탄다

## 1.2 부 사용자: AI를 운용하는 개발자

AI가 생성한 코드를 읽고, 검토하고, 배포하는 사람.
이 사람은 FreeLang을 직접 작성하지 않지만, 읽을 수 있어야 한다.

## 1.3 비사용자: 일반 개발자

범용 언어가 아니다. Python이나 Go를 대체하려는 게 아니다.
"모든 개발자가 쓸 수 있는 언어"를 목표로 하지 않는다.

---

# 2. 왜 필요한가

## 2.1 AI가 코드를 작성할 때 겪는 실제 문제

### 문제 1: 컴파일 통과했는데 런타임에 죽는다

```python
# AI가 생성한 Python 코드
def get_user(id):
    user = db.find(id)
    return user.name        # user가 None이면? → 런타임 에러
```

Python은 이걸 컴파일 시점에 잡아주지 않는다.
AI는 "컴파일 통과 = 정상"이라고 판단한다.
배포 후 터진다.

```freelang
// FreeLang v4로 같은 코드
fn get_user(id: i32): Result<string, Error> {
    var user = db.find(id)    // 반환: Option<User>
    match user {
        Some(u) => Ok(u.name)
        None => Err(Error("User not found"))
    }
}
```

None 처리를 안 하면 **컴파일이 안 된다**.
AI가 실수하면 컴파일러가 잡아준다.

### 문제 2: 동시성 코드에서 데이터 경쟁

```go
// AI가 생성한 Go 코드
var counter int

func increment() {
    for i := 0; i < 1000; i++ {
        counter++    // 데이터 경쟁. 결과 비결정적.
    }
}

go increment()
go increment()
```

Go는 `-race` 플래그를 켜야 런타임에 감지한다.
AI는 이 문제를 구조적으로 만들 수밖에 없다.
공유 메모리 모델 자체가 문제다.

```freelang
// FreeLang v4: 공유 메모리 자체가 불가능
var ch: channel<i32> = channel()

spawn {
    for i in 0..1000 {
        ch.send(1)
    }
}

var total = 0
for _ in 0..1000 {
    total = total + ch.recv()
}
```

공유 변수가 없다. 채널로만 통신한다.
**구조적으로 데이터 경쟁이 불가능하다.**

### 문제 3: 에러 경로 누락

```javascript
// AI가 생성한 JS 코드
async function fetchData(url) {
    const res = await fetch(url)
    const data = await res.json()
    return data.items[0].name
    // 네트워크 실패하면? json 파싱 실패하면?
    // items가 빈 배열이면? name이 없으면?
    // 전부 런타임에 터진다.
}
```

AI는 "happy path"를 잘 작성한다. 에러 경로를 빠뜨린다.

```freelang
// FreeLang v4: 모든 에러 경로를 컴파일러가 강제
fn fetch_data(url: string): Result<string, Error> {
    var res = http_get(url)?              // 실패 시 Err 즉시 반환
    var data = parse_json(res.body)?      // 실패 시 Err 즉시 반환
    var items = data.get("items")?        // None이면 Err
    var first = items.first()?            // 빈 배열이면 Err
    var name = first.get("name")?         // 필드 없으면 Err
    return Ok(name)
}
```

`?` 하나가 에러 경로를 명시한다.
하나라도 빠뜨리면 **컴파일 에러**.

### 문제 4: 암묵적 동작이 AI의 추론을 방해한다

```javascript
// JavaScript의 암묵적 타입 변환
"5" + 3     // "53" (문자열 연결)
"5" - 3     // 2 (숫자 연산)
[] + {}     // "[object Object]"
{} + []     // 0
```

AI가 이런 규칙을 전부 기억해서 정확한 코드를 생성하기 어렵다.
언어 자체에 함정이 있으면 AI도 빠진다.

```freelang
// FreeLang v4: 암묵적 동작 없음
"5" + 3       // ❌ 컴파일 에러: string + i32 불가
str(5) + str(3) // ✅ "53"
i32("5") + 3    // ✅ 8
```

규칙이 단순하면 AI가 실수할 여지가 없다.

---

# 3. 기존 언어로 안 되는 이유

| 언어 | AI가 쓸 때의 문제 |
|------|-------------------|
| **Python** | 타입 없음, 런타임 에러 폭발, 동시성 GIL |
| **JavaScript** | 암묵적 변환 지뢰밭, undefined/null 이중 함정 |
| **Go** | 에러 무시 가능 (`_ = err`), 데이터 경쟁 가능 |
| **Rust** | AI가 Lifetime을 정확히 다루기 어려움, 학습곡선 |
| **Java** | null 존재, Exception 숨김, 장황함 |
| **C/C++** | undefined behavior, 메모리 안전성 없음 |

어느 것도 "AI가 생성한 코드가 컴파일되면 안전하다"를 보장하지 않는다.

---

# 4. Value Proposition

## 한 문장 정의

```
"AI가 생성한 코드가 컴파일을 통과하면, 그 코드는 안전하다."
```

## 풀어쓰면

```
컴파일 통과 = 다음 5가지가 보장됨

1. 모든 값의 타입이 정적으로 확인됨
2. 모든 에러 경로가 명시적으로 처리됨
3. Null 참조가 구조적으로 불가능함
4. 데이터 경쟁이 구조적으로 불가능함
5. 메모리 누수/해제 후 사용이 불가능함
```

## 비교 포지셔닝

```
Rust:  "사람이 Lifetime을 정확히 쓰면 안전하다"
Go:    "사람이 error를 무시하지 않으면 안전하다"
FreeLang v4: "컴파일 되면 안전하다" (사람/AI의 실수를 컴파일러가 차단)
```

차이: Rust는 사람의 정확성에 의존. FreeLang은 컴파일러가 강제.
Lifetime 같은 "사람이 맞춰야 하는" 기능을 의도적으로 뺐다.

---

# 5. 핵심 설계 원칙 (이 문서에서 파생되는 것)

위 문제 정의에서 나오는 설계 원칙 5가지:

## 원칙 1: 암묵적인 것은 없다

```
❌ 묵시적 타입 변환
❌ 묵시적 null
❌ 묵시적 에러 무시
❌ 묵시적 공유 메모리
✅ 모든 것이 명시적
```

AI는 명시적인 언어에서 실수가 적다.

## 원칙 2: 컴파일러가 강제한다

```
❌ "이렇게 쓰는 게 좋습니다" (가이드라인)
❌ "린터가 경고합니다" (무시 가능)
✅ "이렇게 안 쓰면 컴파일 안 됩니다" (강제)
```

경고는 무시할 수 있다. 컴파일 에러는 무시할 수 없다.

## 원칙 3: 구조적 안전성

```
❌ "주의해서 쓰면 안전합니다" (규율 의존)
✅ "잘못 쓸 수 있는 방법 자체가 없습니다" (구조적 제거)
```

예: 공유 메모리를 "주의해서" 쓰라는 게 아니라, 공유 메모리 자체를 없앤다.

## 원칙 4: 에러 메시지가 수정 방향을 알려준다

```
❌ "Type mismatch" (뭘 어쩌라고?)
✅ "Expected Result<i32, Error>, got i32. Wrap with Ok(value)." (이렇게 고쳐)
```

AI가 컴파일 에러를 보고 자동으로 수정할 수 있어야 한다.
에러 메시지 = AI를 위한 수정 가이드.

## 원칙 5: 단순함

```
❌ 10가지 방법으로 같은 일을 할 수 있다 (Python)
❌ 언어 기능이 서로 복잡하게 얽힌다 (C++)
✅ 하나의 일을 하는 하나의 방법 (FreeLang v4)
```

반복문은 `for`만. 에러는 `Result`만. 동시성은 `Actor`만.
선택지가 적을수록 AI가 일관된 코드를 생성한다.

---

# 6. 성공 기준

이 언어가 성공했다고 판단하는 조건:

```
기준 1: 악마 테스트 #2, #3 통과
  → 동시성 + 에러 처리가 실제로 작동

기준 2: AI가 생성한 코드의 런타임 에러율 = 0
  → 컴파일 통과한 코드에서 런타임 에러 없음

기준 3: 컴파일 에러 메시지만으로 AI가 자동 수정 가능
  → 사람 개입 없이 에러 → 수정 → 재컴파일 루프 완성

기준 4: 1000개 spawn이 데이터 경쟁 없이 실행
  → Actor 모델의 실제 동작 증명
```

---

# 7. 이 정의가 나머지 9단계에 미치는 영향

| Spec 단계 | 이 정의에서 파생되는 제약 |
|-----------|-------------------------|
| 2. 실행 모델 | VM이 Actor 스케줄링 내장해야 함 |
| 3. 추상화 수준 | unsafe 없이는 저수준 접근 불가 |
| 4. 어휘 명세 | 토큰 종류 최소화 (단순함 원칙) |
| 5. 구문론 | 하나의 일에 하나의 문법 (for만, Result만) |
| 6. 타입 시스템 | Null 없음, 묵시적 변환 없음, exhaustiveness 강제 |
| 7. 메모리 관리 | Ownership (GC 없음, 컴파일 타임 보장) |
| 8. 스코프 | 가변 전역 금지 (동시성 안전) |
| 9. 에러 모델 | Exception 없음, Result 강제 |
| 10. 모듈성 | 순환 import 금지, 명시적 export |
