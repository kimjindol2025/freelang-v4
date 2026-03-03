#include <stdio.h>
#include <setjmp.h>
#include <stdint.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <time.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <netdb.h>

// ================== VM 정의 ==================
#define STACK_SIZE 1024
#define MEM_SIZE 4096
#define MAX_QUEUE 256
#define MAX_ASYNC_TASKS 64

typedef struct VM {
    int32_t registers[8];      // R0~R7
    uint8_t memory[MEM_SIZE];  // VM 메모리
    int32_t stack[STACK_SIZE]; // 스택
    int sp;                    // 스택 포인터
    jmp_buf jump_buffer;       // 예외 처리
    char last_error[256];      // 마지막 에러 메시지
} VM;

// ================== ISA 정의 (ISA v1.0 핵심) ==================
typedef enum {
    OP_NOP = 0,
    OP_HALT = 1,
    OP_MOV = 10,
    OP_ADD = 20,
    OP_SUB = 21,
    OP_MUL = 22,
    OP_DIV = 23,
    OP_LOAD = 11,
    OP_STORE = 12,
    OP_CMP = 30,
    OP_JMP = 40,
    OP_JMP_IF = 41,
    OP_CALL = 42,
    OP_RET = 43,
    OP_PUSH = 50,
    OP_POP = 51,
    OP_TRY_BEGIN = 60,
    OP_TRY_END = 61,
    OP_RAISE = 62,
    OP_CATCH = 63,
    OP_FOR_INIT = 70,
    OP_FOR_NEXT = 71
} OpCode;

// ================== Async Queue 구조 ==================
typedef struct AsyncTask {
    uint32_t id;
    uint32_t delay_ms;      // 지연 시간 (ms)
    uint64_t scheduled_at;  // 예약 시각 (ms)
    int (*callback)(void*); // 콜백 함수
    void* data;             // 콜백 데이터
    int completed;          // 완료 여부
} AsyncTask;

typedef struct AsyncQueue {
    AsyncTask tasks[MAX_ASYNC_TASKS];
    int count;
    uint32_t next_id;
} AsyncQueue;

// ================== REST API 응답 버퍼 ==================
typedef struct HttpResponse {
    int status_code;
    char body[4096];
    int body_len;
} HttpResponse;

// ================== Global Async Queue ==================
AsyncQueue g_queue;
uint64_t g_start_time = 0;

// ================== Utility 함수들 ==================

/* 현재 시각 (ms) */
uint64_t get_current_time_ms() {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (ts.tv_sec * 1000) + (ts.tv_nsec / 1000000);
}

/* Async Queue 초기화 */
void async_queue_init() {
    g_queue.count = 0;
    g_queue.next_id = 1;
    g_start_time = get_current_time_ms();
}

/* Async Task 등록 */
uint32_t async_queue_add(uint32_t delay_ms, int (*callback)(void*), void* data) {
    if (g_queue.count >= MAX_ASYNC_TASKS) {
        printf("ERROR: Async queue full\n");
        return 0;
    }

    AsyncTask* task = &g_queue.tasks[g_queue.count];
    task->id = g_queue.next_id;
    task->delay_ms = delay_ms;
    task->scheduled_at = get_current_time_ms() + delay_ms;
    task->callback = callback;
    task->data = data;
    task->completed = 0;

    g_queue.count++;
    printf("[ASYNC] Task #%u scheduled (delay=%ums)\n", task->id, delay_ms);

    return g_queue.next_id++;
}

/* Async 작업 실행 (이벤트 루프) */
int async_queue_process() {
    uint64_t now = get_current_time_ms();
    int executed = 0;

    for (int i = 0; i < g_queue.count; i++) {
        AsyncTask* task = &g_queue.tasks[i];
        if (!task->completed && now >= task->scheduled_at) {
            printf("[ASYNC] Executing task #%u...\n", task->id);
            if (task->callback) {
                task->callback(task->data);
            }
            task->completed = 1;
            executed++;
        }
    }

    return executed;
}

/* 모든 Async 작업 완료 대기 */
void async_queue_wait_all() {
    int waiting = 1;
    int iterations = 0;
    const int MAX_ITERATIONS = 1000;

    printf("[ASYNC] Waiting for all tasks...\n");

    while (waiting && iterations < MAX_ITERATIONS) {
        waiting = 0;
        async_queue_process();

        for (int i = 0; i < g_queue.count; i++) {
            if (!g_queue.tasks[i].completed) {
                waiting = 1;
                break;
            }
        }

        if (waiting) {
            usleep(10000); // 10ms
            iterations++;
        }
    }

    printf("[ASYNC] All tasks completed (iterations: %d)\n", iterations);
}

// ================== HTTP/REST API 호출 ==================

/* 간단한 HTTP GET 요청 (골격) */
int http_get(const char* host, int port, const char* path, HttpResponse* response) {
    printf("[HTTP] GET http://%s:%d%s\n", host, port, path);

    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) {
        perror("socket");
        return -1;
    }

    struct hostent* he = gethostbyname(host);
    if (!he) {
        printf("ERROR: Unable to resolve host %s\n", host);
        close(sock);
        return -1;
    }

    struct sockaddr_in server_addr;
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(port);
    memcpy(&server_addr.sin_addr, he->h_addr, he->h_length);

    if (connect(sock, (struct sockaddr*)&server_addr, sizeof(server_addr)) < 0) {
        perror("connect");
        close(sock);
        return -1;
    }

    /* HTTP 요청 전송 */
    char request[512];
    snprintf(request, sizeof(request),
             "GET %s HTTP/1.1\r\nHost: %s\r\nConnection: close\r\n\r\n",
             path, host);

    send(sock, request, strlen(request), 0);

    /* 응답 수신 */
    char buffer[4096];
    int n = recv(sock, buffer, sizeof(buffer) - 1, 0);
    close(sock);

    if (n > 0) {
        buffer[n] = 0;

        /* 상태 코드 파싱 (간단) */
        if (sscanf(buffer, "HTTP/1.1 %d", &response->status_code) == 1) {
            printf("[HTTP] Response: %d\n", response->status_code);

            /* Body 추출 */
            char* body = strstr(buffer, "\r\n\r\n");
            if (body) {
                body += 4;
                response->body_len = strlen(body);
                strncpy(response->body, body, sizeof(response->body) - 1);
            }
            return 0;
        }
    }

    return -1;
}

// ================== VM 초기화 ==================
void vm_init(VM* vm) {
    memset(vm, 0, sizeof(VM));
    vm->sp = -1;
}

// ================== 예외 처리 (SPEC_13) ==================
void vm_raise(VM* vm, const char* msg) {
    strncpy(vm->last_error, msg, sizeof(vm->last_error) - 1);
    printf("[EXCEPTION] %s\n", msg);
    longjmp(vm->jump_buffer, 1);
}

// ================== 스택 연산 ==================
void vm_push(VM* vm, int32_t value) {
    if (vm->sp >= STACK_SIZE - 1) {
        vm_raise(vm, "Stack overflow");
        return;
    }
    vm->stack[++vm->sp] = value;
}

int32_t vm_pop(VM* vm) {
    if (vm->sp < 0) {
        vm_raise(vm, "Stack underflow");
        return 0;
    }
    return vm->stack[vm->sp--];
}

// ================== VM 실행 (ISA v1.0) ==================
void vm_run(VM* vm, uint8_t* bytecode, int length) {
    int pc = 0;
    int call_stack[256];
    int call_depth = 0;

    while (pc < length) {
        uint8_t byte = bytecode[pc++];
        OpCode op = (OpCode)byte;

        switch (op) {
            case OP_NOP:
                break;

            case OP_HALT:
                printf("[VM] HALT\n");
                return;

            case OP_MOV: {
                uint8_t dest = bytecode[pc++];
                uint8_t src = bytecode[pc++];
                vm->registers[dest] = vm->registers[src];
                printf("[VM] MOV r%d = r%d (%d)\n", dest, src, vm->registers[dest]);
                break;
            }

            case OP_ADD: {
                uint8_t dest = bytecode[pc++];
                uint8_t src1 = bytecode[pc++];
                uint8_t src2 = bytecode[pc++];
                vm->registers[dest] = vm->registers[src1] + vm->registers[src2];
                printf("[VM] ADD r%d = r%d + r%d = %d\n", dest, src1, src2, vm->registers[dest]);
                break;
            }

            case OP_SUB: {
                uint8_t dest = bytecode[pc++];
                uint8_t src1 = bytecode[pc++];
                uint8_t src2 = bytecode[pc++];
                vm->registers[dest] = vm->registers[src1] - vm->registers[src2];
                printf("[VM] SUB r%d = r%d - r%d = %d\n", dest, src1, src2, vm->registers[dest]);
                break;
            }

            case OP_MUL: {
                uint8_t dest = bytecode[pc++];
                uint8_t src1 = bytecode[pc++];
                uint8_t src2 = bytecode[pc++];
                vm->registers[dest] = vm->registers[src1] * vm->registers[src2];
                printf("[VM] MUL r%d = r%d * r%d = %d\n", dest, src1, src2, vm->registers[dest]);
                break;
            }

            case OP_DIV: {
                uint8_t dest = bytecode[pc++];
                uint8_t src1 = bytecode[pc++];
                uint8_t src2 = bytecode[pc++];
                if (vm->registers[src2] == 0) {
                    vm_raise(vm, "Division by zero");
                }
                vm->registers[dest] = vm->registers[src1] / vm->registers[src2];
                printf("[VM] DIV r%d = r%d / r%d = %d\n", dest, src1, src2, vm->registers[dest]);
                break;
            }

            case OP_LOAD: {
                uint8_t reg = bytecode[pc++];
                uint16_t addr = (bytecode[pc] << 8) | bytecode[pc + 1];
                pc += 2;
                if (addr >= MEM_SIZE) {
                    vm_raise(vm, "Memory access out of bounds");
                }
                vm->registers[reg] = *(int32_t*)(vm->memory + addr);
                printf("[VM] LOAD r%d = mem[%d] = %d\n", reg, addr, vm->registers[reg]);
                break;
            }

            case OP_STORE: {
                uint16_t addr = (bytecode[pc] << 8) | bytecode[pc + 1];
                pc += 2;
                uint8_t reg = bytecode[pc++];
                if (addr >= MEM_SIZE) {
                    vm_raise(vm, "Memory access out of bounds");
                }
                *(int32_t*)(vm->memory + addr) = vm->registers[reg];
                printf("[VM] STORE mem[%d] = r%d = %d\n", addr, reg, vm->registers[reg]);
                break;
            }

            case OP_JMP: {
                uint16_t addr = (bytecode[pc] << 8) | bytecode[pc + 1];
                pc = addr;
                printf("[VM] JMP to %d\n", addr);
                break;
            }

            case OP_JMP_IF: {
                uint8_t cond = bytecode[pc++];
                uint16_t addr = (bytecode[pc] << 8) | bytecode[pc + 1];
                pc += 2;
                int should_jump = (cond && vm->registers[0] != 0);
                printf("[VM] JMP_IF %s -> %s\n", cond ? "true" : "false", should_jump ? "taken" : "not taken");
                if (should_jump) {
                    pc = addr;
                }
                break;
            }

            case OP_CALL: {
                uint16_t addr = (bytecode[pc] << 8) | bytecode[pc + 1];
                pc += 2;
                if (call_depth >= 256) {
                    vm_raise(vm, "Call stack overflow");
                }
                call_stack[call_depth++] = pc;
                pc = addr;
                printf("[VM] CALL to %d\n", addr);
                break;
            }

            case OP_RET: {
                if (call_depth == 0) {
                    vm_raise(vm, "Return without call");
                }
                pc = call_stack[--call_depth];
                printf("[VM] RET\n");
                break;
            }

            case OP_PUSH: {
                uint8_t reg = bytecode[pc++];
                vm_push(vm, vm->registers[reg]);
                printf("[VM] PUSH r%d = %d\n", reg, vm->registers[reg]);
                break;
            }

            case OP_POP: {
                uint8_t reg = bytecode[pc++];
                vm->registers[reg] = vm_pop(vm);
                printf("[VM] POP r%d = %d\n", reg, vm->registers[reg]);
                break;
            }

            case OP_TRY_BEGIN: {
                uint16_t handler = (bytecode[pc] << 8) | bytecode[pc + 1];
                pc += 2;
                printf("[VM] TRY_BEGIN handler at %d\n", handler);
                break;
            }

            case OP_TRY_END: {
                printf("[VM] TRY_END\n");
                break;
            }

            case OP_RAISE: {
                vm_raise(vm, "User-defined exception");
                break;
            }

            case OP_CATCH: {
                uint8_t reg = bytecode[pc++];
                printf("[VM] CATCH error -> r%d\n", reg);
                vm->registers[reg] = 1; // Error code
                break;
            }

            case OP_FOR_INIT: {
                uint8_t reg = bytecode[pc++];
                int32_t count = (bytecode[pc] << 24) | (bytecode[pc + 1] << 16) |
                               (bytecode[pc + 2] << 8) | bytecode[pc + 3];
                pc += 4;
                vm->registers[reg] = count;
                printf("[VM] FOR_INIT r%d = %d\n", reg, count);
                break;
            }

            case OP_FOR_NEXT: {
                uint8_t reg = bytecode[pc++];
                uint16_t addr = (bytecode[pc] << 8) | bytecode[pc + 1];
                pc += 2;
                vm->registers[reg]--;
                printf("[VM] FOR_NEXT r%d = %d %s\n", reg, vm->registers[reg],
                       vm->registers[reg] >= 0 ? "-> jump" : "-> continue");
                if (vm->registers[reg] >= 0) {
                    pc = addr;
                }
                break;
            }

            default:
                printf("[VM] Unknown opcode %d\n", op);
                break;
        }
    }

    printf("[VM] Program finished\n");
}

// ================== REST API 콜백 ==================
int rest_api_callback(void* data) {
    const char* endpoint = (const char*)data;
    HttpResponse response = {0};

    printf("\n[REST API] Calling: %s\n", endpoint);

    // 예제: localhost:8080에서 API 호출 시뮬레이션
    // 실제 환경에서는 http_get() 사용
    // http_get("localhost", 8080, endpoint, &response);

    printf("[REST API] Response status: 200 (simulated)\n");
    printf("[REST API] Response body: {\"status\": \"success\", \"data\": \"test\"}\n");

    free((void*)endpoint);
    return 0;
}

// ================== Main 프로그램 ==================
int main() {
    printf("\n╔════════════════════════════════════════════╗\n");
    printf("║   FreeLang v4 ISA v1.0 C VM                ║\n");
    printf("║   + REST API + Async Queue 골격             ║\n");
    printf("╚════════════════════════════════════════════╝\n\n");

    // ========== 1. VM 초기화 ==========
    VM vm;
    vm_init(&vm);
    vm.registers[1] = 10;
    vm.registers[2] = 5;
    vm.registers[3] = 3;

    // ========== 2. Async Queue 초기화 ==========
    async_queue_init();

    // ========== 3. Async 작업 예약 ==========
    async_queue_add(100, rest_api_callback, (void*)strdup("/api/v1/status"));
    async_queue_add(200, rest_api_callback, (void*)strdup("/api/v1/data"));

    // ========== 4. VM 프로그램 (ISA v1.0 테스트 - 간단한 계산) ==========
    uint8_t program[] = {
        OP_ADD, 0, 1, 2,           /* r0 = r1 + r2 (10 + 5 = 15) */
        OP_MUL, 0, 0, 3,           /* r0 = r0 * r3 (15 * 3 = 45) */
        OP_MOV, 4, 0,              /* r4 = r0 */
        OP_SUB, 5, 1, 2,           /* r5 = r1 - r2 (10 - 5 = 5) */
        OP_PUSH, 4,                /* push r4 */
        OP_POP, 6,                 /* pop -> r6 */
        OP_HALT                    /* halt */
    };

    // ========== 5. Exception Handling (SPEC_13) ==========
    printf("--- Test 1: Normal VM Execution with Exception Handling ---\n");
    if (setjmp(vm.jump_buffer) == 0) {
        vm_run(&vm, program, sizeof(program));
        printf("\n✓ VM finished successfully\n");
    } else {
        printf("\n✗ Caught exception: %s\n", vm.last_error);
    }

    // ========== 6. Exception Test Program ==========
    printf("\n--- Test 2: Exception Handling (Division by Zero) ---\n");
    vm_init(&vm);
    vm.registers[0] = 10;
    vm.registers[1] = 0;

    uint8_t exception_program[] = {
        OP_DIV, 2, 0, 1,   /* r2 = r0 / r1 -> division by zero exception */
        OP_HALT
    };

    if (setjmp(vm.jump_buffer) == 0) {
        vm_run(&vm, exception_program, sizeof(exception_program));
    } else {
        printf("✓ Exception caught successfully: %s\n", vm.last_error);
    }

    // ========== 7. Async Queue 처리 (이벤트 루프) ==========
    printf("\n--- Test 3: Async Queue & Event Loop ---\n");
    printf("Scheduled 2 async tasks with delays...\n");
    async_queue_wait_all();

    printf("\n╔════════════════════════════════════════════╗\n");
    printf("║   모든 테스트 완료                          ║\n");
    printf("╚════════════════════════════════════════════╝\n\n");

    return 0;
}
