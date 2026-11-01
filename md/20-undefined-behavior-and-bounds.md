# 20 — Undefined Behavior & Bounds Checking

*Category: C++ Language & Safety*

> Undefined behaviour means the C++ standard promises nothing: the program may work, crash or quietly compute nonsense. `[]` is unchecked, `.at()` is checked, and a passing run proves nothing.

## Must-remember points

- **Undefined behaviour (UB)**: code breaks a rule and the standard sets **no requirements** on what happens. It may appear to work, crash, corrupt other data, or change with the compiler, flags or input. **"It printed the right value" is not proof.**
- Common UB: **out-of-bounds** access, reading an **uninitialized** variable, **null** or **dangling** pointer dereference, **use after free**, **double delete**, **signed overflow**, integer **division by zero**, **data races**, falling off the end of a **non-void function**, shifting by the type's width or more.
- **Undefined** (anything goes) vs **unspecified** (one of several allowed results, undocumented, e.g. argument evaluation order) vs **implementation-defined** (one documented choice, e.g. `sizeof(long)`).
- The optimizer **assumes UB never happens** and builds on that assumption: it can delete an overflow check or a null check. That is why UB bugs often appear only with `-O2`.
- `arr[i]`, `std::array::operator[]` and `std::vector::operator[]` do **no bounds checking**. `.at(i)` **checks** and throws `std::out_of_range`.
- C++ philosophy: **"don't pay for what you don't use"**. `[]` is fast by default; checking is opt-in with `.at()` or an explicit `if`.
- Find UB with `-Wall -Wextra` at compile time and **sanitizers** at run time: `-fsanitize=address,undefined -g` (lesson 23).

## What undefined behaviour is

**Meaning:** the C++ standard lists rules a program must follow. If a program breaks one, the behaviour is **undefined**: the standard requires no particular result, and the compiler needn't detect it. The program may do anything, including exactly what you hoped. That is the danger: UB often looks fine in testing and fails later, on another compiler, with other flags, or with other input.

The common cases:

| Undefined behaviour | Example | What often happens |
|---|---|---|
| Out-of-bounds access | `a[5]` on `int a[5]` | garbage value, a corrupted neighbour, or a crash |
| Reading an uninitialized variable | `int x; std::cout << x;` | a random value that changes between builds |
| Null pointer dereference | `int* p = nullptr; *p = 1;` | segmentation fault |
| Dangling pointer or reference | returning a reference to a local | reads memory already reused |
| Use after free | `delete p; *p = 1;` | stale data or heap corruption |
| Double delete | `delete p; delete p;` | glibc aborts: `free(): double free detected in tcache 2` |
| Signed integer overflow | `INT_MAX + 1` | wraps around, or an overflow check is deleted (below) |
| Integer division by zero | `10 / d` with `d == 0` | `Floating point exception` (SIGFPE) on x86-64 |
| Data race | two threads `++counter` with no lock | lost updates, hard to reproduce |
| No `return` in a non-void function | `int sign(int x) { if (x > 0) return 1; if (x < 0) return -1; }` | g++ 13: garbage with `-O2`, `Illegal instruction` with `-O0` |
| Bad shift | `1 << 32` on a 32-bit `int` | different results on different CPUs |
| Modifying a `const` object | through `const_cast` | change ignored, or a crash |

Each function below compiles, most with warnings, and each contains UB:

```cpp
// Every function here has undefined behaviour. It compiles; none of it is safe to call.
#include <climits>
#include <thread>

int outOfBounds()   { int a[3] = {1, 2, 3}; return a[3]; }        // index 3 of a 3-element array
int uninitialized() { int x; return x; }                           // reads a value never written
int nullDeref()     { int* p = nullptr; return *p; }               // dereferences null
int& dangling()     { int local = 5; return local; }               // reference to a dead local
int useAfterFree()  { int* p = new int(1); delete p; return *p; }  // reads freed memory
void doubleDelete() { int* p = new int(1); delete p; delete p; }   // frees twice
int overflow()      { int x = INT_MAX; return x + 1; }             // signed overflow
int divide(int d)   { return 10 / d; }                             // UB when d == 0
int sign(int x)     { if (x > 0) return 1; if (x < 0) return -1; } // x == 0 falls off the end
int shift(int s)    { return 1 << s; }                             // UB when s < 0 or s >= 32
int counter = 0;
void race() {                                                      // two threads, no lock
    std::thread t([] { ++counter; });
    ++counter;
    t.join();
}

int main() {}                                                      // deliberately calls nothing
```

With `-Wall -Wextra`, g++ warns about only three of them (the dangling reference, the missing return and the uninitialized read). The rest need run-time tools.

## Undefined vs unspecified vs implementation-defined

**Meaning:** the standard leaves some things open on purpose, in three different strengths. Only the first one makes a program wrong.

| Kind | Meaning | Example | Can you rely on it? |
|---|---|---|---|
| **Undefined** | no requirements at all | signed overflow, out-of-bounds access | Never: the program is wrong |
| **Unspecified** | one of several allowed results; the compiler needn't say which | order in which `f(a(), b())` evaluates `a()` and `b()` | Only if your code works for every possible choice |
| **Implementation-defined** | one choice, and the compiler must document it | `sizeof(long)`, whether `char` is signed | Yes on that platform; not portable |

```cpp
#include <climits>
#include <iostream>

int a() { std::cout << "a "; return 1; }
int b() { std::cout << "b "; return 2; }
void f(int, int) { std::cout << "\n"; }

int main() {
    // implementation-defined: the compiler picks, and documents, the answer
    std::cout << "sizeof(long) = " << sizeof(long) << "\n";
    std::cout << "char is " << (CHAR_MIN < 0 ? "signed" : "unsigned") << "\n";
    // unspecified: the order in which the two arguments are evaluated
    f(a(), b());
}
```

The same file built with two compilers on x86-64 Linux:

```bash
$ g++ kinds.cpp -o kinds && ./kinds
sizeof(long) = 8
char is signed
b a
$ clang++ kinds.cpp -o kinds && ./kinds
sizeof(long) = 8
char is signed
a b
```

**How it works:**
1. `sizeof(long)` is 8 on x86-64 Linux but 4 on 64-bit Windows; `char` is signed on x86-64 but unsigned on ARM Linux. Each compiler documents its choice.
2. g++ evaluated `b()` first, clang `a()` first. Both are correct. Code whose result depends on that order (for example `f(i++, i++)`-style side effects) is fragile.

## Bounds checking: [] vs .at()

**Meaning:** `operator[]` on raw arrays, `std::array` and `std::vector` does **no** bounds check: a bad index is UB. `.at(i)` compares `i` with `size()` and throws `std::out_of_range` if it is too big. That turns a silent memory bug into an error you can catch, or at least a clean, honest abort.

```cpp
#include <array>
#include <iostream>
#include <stdexcept>

int main() {
    std::array<int, 5> a{1, 2, 3, 4, 5};
    std::size_t i = 7;                             // a bad index, e.g. from user input
    try {
        std::cout << a.at(i) << "\n";              // checked: throws instead of reading past the end
    } catch (const std::out_of_range& e) {
        std::cout << "caught: " << e.what() << "\n";
    }
    if (i < a.size()) std::cout << a[i] << "\n";   // [] is safe only after your own check
    else              std::cout << "index " << i << " rejected\n";
}
```
```output
caught: array::at: __n (which is 7) >= _Nm (which is 5)
index 7 rejected
```

**How it works:**
1. `a.at(7)` sees that 7 >= 5 and throws before touching memory. The message comes from libstdc++.
2. `a[7]` would compile and run, reading whatever lies after the array.
3. Checking once with `if` and then using `[]` gives the same safety as `.at()`.

**Why `[]` is unchecked:** a check costs a comparison on every access, which matters in tight loops that already know their indexes are valid. Java and Python check every access, with no way to opt out. C++ follows **"don't pay for what you don't use"**: fast `[]` by default, `.at()` when you want the check.

**When to use which:** `.at()` for indexes from outside (user input, files, network); `[]` in loops bounded by `size()`; range-for when you don't need the index.

## Why UB is dangerous: the optimizer trusts you

**Meaning:** the compiler is allowed to assume that UB never happens, and the optimizer uses that assumption to simplify code. If your code relies on what UB "usually does" (for example, that `INT_MAX + 1` wraps to a negative number), the optimizer may remove exactly the code you depended on.

```cpp
#include <climits>
#include <iostream>

bool canAddOne(int x) {
    int next = x + 1;            // undefined behaviour when x == INT_MAX
    return next > x;             // meant as an overflow check
}

int main(int argc, char*[]) {
    int x = INT_MAX - 1 + argc;  // INT_MAX when run with no arguments
    std::cout << "canAddOne(INT_MAX) = " << canAddOne(x) << "\n";
}
```

```bash
$ g++ -O0 overflow.cpp -o of && ./of
canAddOne(INT_MAX) = 0
$ g++ -O2 overflow.cpp -o of && ./of
canAddOne(INT_MAX) = 1
$ g++ -O2 -S -o - overflow.cpp | grep -A5 '^_Z9canAddOnei:'
_Z9canAddOnei:
.LFB2057:
	.cfi_startproc
	endbr64
	movl	$1, %eax
	ret
```

**How it works:**
1. At `-O0`, `INT_MAX + 1` happens to wrap to `INT_MIN` on x86-64, so the check returns 0 (false).
2. At `-O2`, the compiler reasons: signed overflow can't happen, so `x + 1` is always greater than `x`. The whole function becomes `return 1`, and the "check" is gone.
3. Neither build is wrong: the program is. A correct check tests **before** the operation: `return x < INT_MAX;`, or use `__builtin_add_overflow` (g++/clang).

The same reasoning removes a null check placed after a dereference (the pointer "can't" be null). With `int a[4];`, g++ `-O2` compiles `for (int i = 0; i <= 4; i++) if (a[i] == x) return 1;` to plain `return 1`, because reading `a[4]` "can't" happen. So UB bugs often appear only in release builds or after a compiler upgrade.

## Catching UB with sanitizers

**Meaning:** most UB can't be found by the compiler, but it can be caught **while the program runs** by building it with sanitizers. **UBSan** (`-fsanitize=undefined`) reports overflow, bad shifts and similar; **ASan** (`-fsanitize=address`) reports out-of-bounds and use-after-free. Lesson 23 covers the tools and how to read their reports.

```cpp
#include <climits>
#include <iostream>

int main(int argc, char*[]) {
    int big = INT_MAX - 1 + argc;   // INT_MAX when run with no arguments
    int sum = big + 1;              // undefined behaviour: signed overflow
    int a[5] = {};
    a[argc + 4] = sum;              // undefined behaviour: writes a[5], one past the end
    std::cout << a[0] << "\n";
}
```

A trimmed report (addresses and paths shortened):

```text
$ g++ -g -fsanitize=address,undefined -o bugs bugs.cpp && ./bugs
bugs.cpp:6:9: runtime error: signed integer overflow: 2147483647 + 1 cannot be represented in type 'int'
bugs.cpp:8:15: runtime error: index 5 out of bounds for type 'int [5]'
...
==8115==ERROR: AddressSanitizer: stack-buffer-overflow on address 0x7f7424400034 ...
WRITE of size 4 at 0x7f7424400034 thread T0
    #0 0x55c7bee075e8 in main .../bugs.cpp:8
...
    [32, 52) 'a' (line 7) <== Memory access at offset 52 overflows this variable
SUMMARY: AddressSanitizer: stack-buffer-overflow .../bugs.cpp:8 in main
```

**How it works:**
1. UBSan reports the overflow on line 6 and the bad index on line 8, and lets the program continue.
2. ASan then stops the program at the out-of-bounds write: array `a` occupies bytes 32 to 52 of the frame, and the write at offset 52 is just past its end.
3. A sanitizer only reports code that actually **runs**. Test with inputs that reach every path.

## Common mistakes

- **Trusting a passing run.** `a[10] = 4;` on a 5-element array may print 4 and exit cleanly. It is still UB and can break with the next change.
- **Overflow checks after the fact.** `if (x + 1 < x)` is itself UB and is removed by the optimizer. Check `x < INT_MAX` first. Unsigned arithmetic wraps by definition and is not UB.
- **Using `[]` on untrusted indexes.** Check the index, or use `.at()`.
- **Ignoring warnings.** `control reaches end of non-void function`, `reference to local variable 'local' returned`, `'x' is used uninitialized`: each points at UB. Build with `-Wall -Wextra`.
- **Thinking `-O0` behaviour is the real behaviour.** There is no real behaviour; `-O0` just happens to do the naive thing more often.
- **Testing without sanitizers.** Run the test suite at least once with `-fsanitize=address,undefined` (lesson 23).

## ⚠ Easily confused

- **[] vs .at()** — `[]` = no check, UB on a bad index, fastest. `.at()` = checks against `size()` and throws `std::out_of_range`.
- **undefined vs unspecified** — Undefined: no requirements at all, the program is wrong. Unspecified: one of a few valid results (e.g. argument evaluation order); correct code must work with any of them.
- **unspecified vs implementation-defined** — Both are allowed choices. Implementation-defined must be documented by the compiler (`sizeof(long)`, signedness of `char`); unspecified need not be.
- **UB vs a controlled crash** — UB = anything can happen, silent corruption included. `.at()` throwing (even uncaught, ending in abort) is a controlled, honest failure: far better.
- **'works' vs correct** — A program that runs and prints the expected value can still contain UB. Correctness comes from following the rules, not from a lucky run.
- **signed vs unsigned overflow** — Signed overflow is UB (the optimizer may assume it never happens). Unsigned arithmetic wraps modulo 2^N by definition.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 20).