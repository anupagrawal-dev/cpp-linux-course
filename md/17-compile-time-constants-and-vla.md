# 17 — Compile-time Constants & VLAs

*Category: C++ Language & Safety*

> Why `int arr[n]` with a run-time `n` is not standard C++, and what to use instead.

## Must-remember points

- A **constant expression** is a value the compiler can work out before the program runs. C++ requires one for **array sizes**, **template arguments** (`std::array<int, N>`), `case` labels, `static_assert` and enumerator values.
- `constexpr int s = 5*4; int a[s];` and `const int s = 5*4; int a[s];` are both standard: a `const` integer **initialized with a constant expression** is a constant. `const int s = readSize();` is not, so `int a[s];` is then a VLA.
- `int s = 5*4; int a[s];` is a **VLA** (variable length array): its size is decided at run time. **Not standard C++** in any version.
- VLAs are standard in **C99** (optional since C11). g++ and clang accept them in C++ as an **extension**; MSVC does not support them.
- `-pedantic` (or `-Wvla`) makes g++ warn in every `-std=` mode; `-pedantic-errors` makes it an error. The **flag** matters, not the version.
- VLAs are risky: they live on the **stack** with **no size check**, so a large or user-controlled `n` crashes the program. `sizeof` of a VLA is computed at run time.
- Standard replacements: `std::vector<int> v(n)` (run-time size, heap, can grow), `std::make_unique<int[]>(n)` (run-time size, fixed), `std::array<int, N>` (compile-time size).

## Where C++ requires a constant expression

**Meaning:** a **constant expression** is a value the compiler can compute: a literal, a `constexpr` variable, or a `const` integer initialized with a constant (lesson 16). Some places accept **only** such values, because the compiler needs them to lay out memory or generate code.

```cpp
#include <array>
#include <iostream>

constexpr int N = 4;
enum Color { Red = N, Green };           // enumerator values

template <int Size>
struct Buffer { char data[Size]; };      // non-type template parameter

int main() {
    int raw[N] = {1, 2, 3, 4};           // array bound
    std::array<int, N> arr{};            // template argument
    Buffer<N * 2> buf{};                 // template argument
    static_assert(sizeof(buf.data) == 8, "unexpected size");   // static_assert condition
    switch (raw[2]) {
        case N - 1: std::cout << "case 3\n"; break;            // case label
        default:    std::cout << "other\n";
    }
    std::cout << arr.size() << " " << Green << "\n";
}
```
```output
case 3
4 5
```

**How it works:**
1. Every commented place uses `N` or an expression built from it, so the compiler knows each value. `std::array<int, 4>` and `std::array<int, 5>` are different types, so the size must be fixed at compile time.
2. With a run-time value instead of `N`, each of these lines fails to compile, except the array bound, where g++ quietly falls back to a VLA (next sections).

## const vs constexpr as an array size

**Meaning:** whether a `const` variable can size an array depends on its **initializer**, not on the keyword. Initialized with a constant expression, it is a constant. Initialized from anything computed at run time, it is just a read-only variable. `constexpr` removes the doubt: it refuses to compile unless the value is a constant.

```cpp
#include <iostream>

int fromUser(int argc) { return argc * 4; }   // not constexpr: result known only at run time

int main(int argc, char*[]) {
    constexpr int a = 5 * 4;        // compile-time constant
    const int b = 5 * 4;            // const + constant initializer: also a compile-time constant
    const int c = fromUser(argc);   // const, but set at run time: NOT a constant
    int x[a];                       // standard
    int y[b];                       // standard
    std::cout << sizeof(x) << " " << sizeof(y) << " " << c << "\n";
    // int z[c];                    // a VLA: g++ accepts it, -pedantic warns
    // constexpr int d = fromUser(argc);   // error: call to non-'constexpr' function
}
```
```output
80 80 4
```

**How it works:**
1. `x` and `y` are ordinary arrays of 20 ints (80 bytes).
2. `c` is `const` but depends on `argc`, so `int z[c]` would be a VLA (`-pedantic` warns: `ISO C++ forbids variable length array 'z'`).
3. **Prefer `constexpr`** for sizes: a non-constant value is then an error at the declaration, not a silent VLA.

## VLAs: what g++ accepts and the standard doesn't

**Meaning:** a **variable length array** is a local array whose size is a run-time value. C99 added them to C. No C++ standard has them. g++ and clang accept them as an **extension**, so the code compiles quietly and works until it doesn't.

```cpp
#include <cstdlib>
#include <iostream>

int main(int argc, char* argv[]) {
    int n = argc > 1 ? std::atoi(argv[1]) : 10;   // size chosen at run time
    int a[n];                                     // VLA: g++ extension, lives on the stack
    for (int i = 0; i < n; i++) a[i] = i;
    std::cout << "n = " << n << ", sizeof(a) = " << sizeof(a) << ", last = " << a[n - 1] << "\n";
}
```
```output
n = 10, sizeof(a) = 40, last = 9
```

The compiler only reports it when asked, and a large `n` crashes the program:

```bash
$ g++ -std=c++17 vla.cpp -o vla                    # extensions on: silent
$ g++ -std=c++17 -pedantic vla.cpp -o vla
vla.cpp:6:9: warning: ISO C++ forbids variable length array 'a' [-Wvla]
$ g++ -std=c++17 -pedantic-errors vla.cpp -o vla
vla.cpp:6:9: error: ISO C++ forbids variable length array 'a' [-Wvla]
$ ./vla 1000
n = 1000, sizeof(a) = 4000, last = 999
$ ulimit -s                                        # stack limit in KB
8192
$ ./vla 10000000                                   # 40 MB on an 8 MB stack
Segmentation fault
```

**How it works:**
1. `sizeof(a)` is normally a compile-time constant. For a VLA it is computed at run time, from `n`.
2. The VLA is carved out of the stack by moving the stack pointer `n * 4` bytes. Nothing checks that the stack has room.
3. With `n = 10000000` the array needs 40 MB. The stack is 8 MB here (`ulimit -s`), so a write lands outside it and the kernel kills the process. There is no exception to catch: a user-controlled size is a crash, and a security problem.
4. Not portable: Clang 18 warns even without flags (`variable length arrays in C++ are a Clang extension`), and MSVC does not support VLAs at all. The size also can't be a template argument: `std::array<int, n>` fails with `the value of 'n' is not usable in a constant expression`.

## Standard alternatives

**Meaning:** C++ has standard containers for each situation a VLA tries to cover. Choose by when the size is known and whether it must change.

```cpp
#include <array>
#include <cstdlib>
#include <iostream>
#include <memory>
#include <vector>

int main(int argc, char* argv[]) {
    int n = argc > 1 ? std::atoi(argv[1]) : 5;   // run-time size

    std::vector<int> v(n);                       // heap, n zeros, knows its size, can grow
    auto p = std::make_unique<int[]>(n);         // heap, n zeros, fixed size, freed automatically
    constexpr int N = 5;
    std::array<int, N> a{};                      // size fixed at compile time, no heap allocation

    v[n - 1] = 1; p[n - 1] = 2; a[N - 1] = 3;
    std::cout << v.size() << " " << v[n - 1] << " " << p[n - 1] << " " << a.size() << " " << a[N - 1] << "\n";
}
```
```output
5 1 2 5 3
```

**How it works:** `v` and `p` both get `n` zeroed ints from the heap and free them automatically at the end of scope (lessons 43 and 40); `p` has no `size()`, so keep `n` yourself. `a` needs `N` at compile time and makes no heap allocation (lesson 21).

| | `std::vector<int> v(n)` | `std::make_unique<int[]>(n)` | `std::array<int, N>` | VLA `int a[n]` |
|---|---|---|---|---|
| Standard C++ | yes | yes | yes | no (extension) |
| Size known | run time | run time | compile time | run time |
| Memory | heap | heap | inside the object (stack if local) | stack |
| Too big | allocation fails with `std::bad_alloc` | allocation fails with `std::bad_alloc` | size fixed in the source | crash, nothing to catch |
| Can grow | yes | no | no | no |
| Knows its size | `v.size()` | no | `a.size()` | `sizeof` at run time |

**When to use which:** run-time size or growth: `std::vector` (the default). Compile-time size: `std::array`. A fixed run-time buffer for C-style code: `make_unique<int[]>`.

## Common mistakes

- **"It compiles, so it's standard."** g++ accepts VLAs silently. Build with `-pedantic` (or at least `-Wvla`) to see extensions.
- **Thinking `const` is enough.** `const int n = readSize(); int a[n];` is still a VLA. Use `constexpr` for anything meant to be a compile-time size.
- **Sizing a local array from user input.** A large value overflows the stack with no error. Use `std::vector`.
- **Huge local arrays with a constant size.** `int big[10'000'000];` is standard but still overflows an 8 MB stack. Big data belongs on the heap (lesson 18).

## ⚠ Easily confused

- **const int size vs constexpr int size** — `const int` is a compile-time constant only if its initializer is a constant expression. `constexpr int` must be one, or it doesn't compile.
- **const int size vs plain int size** — `const int n = 20;` is a constant, so `int a[n]` is a normal array. A plain `int n = 20;` is a run-time variable, so `int a[n]` is a VLA (non-standard).
- **compiler allows vs standard allows** — g++ accepting code (extensions on) is not the same as the C++ standard allowing it. `-pedantic` shows the difference.
- **VLA vs std::vector** — VLA: run-time size on the stack, no size check, non-standard. `std::vector<int> v(n)`: run-time size on the heap, can grow, failure throws `std::bad_alloc`.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 17).