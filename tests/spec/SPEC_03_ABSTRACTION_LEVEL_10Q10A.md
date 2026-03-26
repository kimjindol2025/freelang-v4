# FreeLang v4 — Spec 03: 추상화 수준 10Q 10A

---

## Q1. 추상화 수준이란 무엇인가?

**A:** 프로그래머(여기선 AI)가 하드웨어를 얼마나 직접 다루는가.

```
Low-level (C, Rust):
  포인터 직접 조작, 메모리 주소 계산, 레지스터 접근
  → 제어력 최대, 위험도 최대

Mid-level (Go, Java):
  포인터 없음, GC가 메모리 관리, 하드웨어 숨김
  → 균형

High-level (Python, Ruby):
  모든 것이 객체, 타입도 동적, 하드웨어 완전 숨김
  → 편의성 최대, 성능 최저
```

질문의 본질: FreeLang v4는 이 스펙트럼에서 어디에 서는가?

---

## Q2. FreeLang v4의 위치는?

**A:** **High-level (Python급 추상화) + 컴파일 타임 안전성 (Rust급 보장).**

```
                제어력
Low  ←─────────────────────→ High
C    Rust    Go    Java    Python
                      ↑
                  FreeLang v4
                  (여기)
```

Go~Java 사이. Python보다는 낮고 Rust보다는 높다.

이유: AI Agent는 포인터를 다룰 필요가 없다. 하드웨어 제어가 필요한 프로그램을 만들지 않는다(Spec 01: CLI 도구, API 서버, 데이터 파이프라인). 추상화가 높을수록 AI가 실수할 여지가 줄어든다.

---

## Q3. 포인터를 노출하는가?

**A:** 노출하지 않는다.

```
❌ 허용 안 함:
  var p: *i32 = &x      // 포인터 선언
  *p = 42                // 역참조
  p + 1                  // 포인터 산술
  unsafe { *p }          // unsafe 포인터 접근

✅ 대신:
  var x = 42             // 값
  var arr = [1, 2, 3]    // 배열 (인덱스로 접근)
  var s = { name: "a" }  // 구조체 (필드로 접근)
```

포인터가 없으므로:
- buffer overflow 불가능
- dangling pointer 불가능
- 포인터 산술 오류 불가능

---

## Q4. 메모리 주소를 볼 수 있는가?

**A:** 볼 수 없다.

```
❌ 불가:
  var addr = addressof(x)    // 메모리 주소 조회
  var x = deref(0x7fff1234)  // 주소로 접근

✅ 가능:
  var x = 42      // 값만 존재. 주소는 VM 내부.
```

AI에게 메모리 주소는 의미 없다. 주소를 알아야 하는 작업(하드웨어 드라이버, OS 커널)은 v4의 범위가 아니다.

---

## Q5. unsafe 블록이 존재하는가?

**A:** v4에서 존재하지 않는다.

```
이전 설계 (SPEC_02_LANGUAGE_SPEC.md):
  unsafe { ffi_call("libc", "malloc", 1024) }

수정:
  v4에 unsafe 없음. FFI도 없음.
```

이유:
- FFI는 v4 범위가 아니다 (Phase 8개에 FFI 없음)
- unsafe가 있으면 "컴파일 되면 안전하다"가 깨진다
- unsafe 하나가 있으면 AI가 거기로 도망친다

v5에서 FFI가 필요해지면 그때 unsafe를 설계한다. 지금은 없다.

---

## Q6. 배열 경계 검사는 어떻게 하는가?

**A:** 항상 검사한다. 끌 수 없다.

```freelang
var arr = [1, 2, 3]
var x = arr[5]        // 런타임 panic: index out of bounds
```

컴파일 타임에 잡을 수 있는 경우:
```freelang
var arr = [1, 2, 3]   // 길이 3 확정
var x = arr[5]        // ❌ 컴파일 에러: index 5 >= length 3
```

컴파일 타임에 못 잡는 경우 (동적 인덱스):
```freelang
var arr = [1, 2, 3]
var i = some_function()
var x = arr[i]        // 런타임 검사: i < arr.length
```

성능 영향: 인덱스 접근마다 비교 1회. Python도 하고 있다. 문제 없다.

---

## Q7. 문자열은 어떤 수준으로 추상화하는가?

**A:** 불변(immutable) 바이트 시퀀스. 내부 인코딩은 숨긴다.

```freelang
var s = "hello"
var c = s[0]           // ❌ 불가. 문자열 인덱싱 없음.
var c = s.char_at(0)   // ✅ Option<string> 반환 (UTF-8 안전)
var sub = s.slice(0, 3) // ✅ "hel"
var len = s.length()   // ✅ 바이트 수가 아닌 문자 수
var joined = s + " world" // ✅ 새 문자열 생성 (원본 불변)
```

왜 인덱싱을 금지하는가:
- UTF-8에서 `s[i]`는 i번째 바이트이지 i번째 문자가 아니다
- "한글"[1]이 'ㄴ'이 아니라 깨진 바이트가 나온다
- AI가 이 함정에 빠지지 않게 원천 차단

---

## Q8. 숫자 오버플로우는 어떻게 처리하는가?

**A:** 런타임 panic.

```freelang
var x: i32 = 2147483647   // i32 최대값
var y = x + 1              // panic: integer overflow
```

선택지와 판단:

| 방식 | 언어 | 문제 | FreeLang v4 |
|------|------|------|-------------|
| Wrapping (조용히 감싸기) | C, Java | 버그 숨김 | ❌ |
| Saturating (최대값 유지) | 일부 DSP | 특수 용도 | ❌ |
| BigInt 자동 확장 | Python | 성능 저하 | ❌ |
| **Panic** | **Rust (debug)** | **명시적** | **✅** |

AI가 오버플로우를 인지해야 한다. 조용히 넘어가면 버그가 숨는다.

---

## Q9. I/O는 어떤 수준으로 제공하는가?

**A:** 표준 라이브러리 함수로 제공. 시스템 콜 직접 접근 불가.

```freelang
// ✅ 제공하는 것 (표준 라이브러리)
println("hello")                           // 표준 출력
var content = read_file("test.txt")?       // 파일 읽기 → Result
write_file("out.txt", content)?            // 파일 쓰기 → Result

// ❌ 제공하지 않는 것
syscall(1, fd, buf, len)                   // 시스템 콜
open("/dev/sda", O_RDWR)                   // 디바이스 접근
mmap(addr, len, prot, flags, fd, offset)   // 메모리 매핑
```

모든 I/O 함수는 Result를 반환한다. 실패를 숨기지 않는다.

---

## Q10. 이 추상화 수준에서 못 만드는 프로그램은?

**A:** 명시적으로 못 만드는 것:

```
❌ OS 커널, 드라이버
  → 포인터 없음, 시스템 콜 직접 접근 없음

❌ 게임 엔진 (실시간 렌더링)
  → GPU 접근 없음, 저수준 메모리 제어 없음

❌ 임베디드 시스템
  → 하드웨어 레지스터 접근 없음

❌ 데이터베이스 엔진 (B-Tree 직접 구현)
  → 페이지 단위 메모리 관리 불가

❌ 네트워크 패킷 파서 (바이트 수준)
  → 바이트 배열 직접 조작 제한적
```

만들 수 있는 것:

```
✅ CLI 도구 (파일 처리, 변환, 자동화)
✅ HTTP API 서버
✅ 데이터 파이프라인 (ETL)
✅ 메시지 브로커 (채널 기반)
✅ 모니터링/스케줄러
✅ 계산 집약적 로직 (알고리즘, 수학)
```

이게 Spec 01에서 정의한 범위와 정확히 일치한다. 과하지도 부족하지도 않다.
