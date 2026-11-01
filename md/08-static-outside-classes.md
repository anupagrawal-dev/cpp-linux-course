# 08 — Static (outside classes)

*Category: C++ Core*

> Outside a class, static makes a global variable or function private to its own .cpp file (internal linkage), and makes a local variable live for the whole program.

## Must-remember points

- `static` at file scope gives **internal linkage**: the name is visible only in its **translation unit** (one `.cpp` plus its headers). Without `static`, a global variable or function has **external linkage**: any file can link to it.
- `static` works the same on **functions**: a `static` helper is private to its file, so two files can each have their own `logCall()`.
- Same non-static global defined in two files: **`multiple definition`** link error. `extern int x;` with no definition anywhere: **`undefined reference`**. `extern` only declares; it creates nothing.
- The **unnamed namespace** (`namespace { ... }`) is the modern way to make names file-private. It also works for **types**, which `static` can't.
- One global shared through a header: C++17 **`inline int x = 1;`**, or `extern int x;` in the header plus `int x = 1;` in one `.cpp`. A plain `int x = 1;` in a header breaks the link; `static int x = 1;` silently gives each file its own copy.
- A **`const`** global already has internal linkage in C++ (not in C). Share it with `extern const int x = 10;` or `inline constexpr` in a header.
- A `static` **local variable** is initialized **once**, **keeps its value between calls** and lives for the whole program; its scope stays the function (lesson 44).
- Globals in different files are initialized in an **unspecified order** (the **static initialization order fiasco**). Constants or a function-local static avoid it.

## Translation units and linkage

**Meaning:** each `.cpp` file is compiled on its own into an object file (`.o`). A `.cpp` plus the headers it includes is a **translation unit**. The **linker** then joins the object files and connects each use of a name to its definition. **Linkage** decides whether that can happen across files:
- **External linkage** (the default for global variables and functions): other files can use the name.
- **Internal linkage** (`static` at file scope): the name exists only inside its own file.

```cpp
// counter.cpp
#include <iostream>

int total = 0;                     // external linkage: other files may use it
static int calls = 0;              // internal linkage: private to this file

static void logCall(int n) {       // internal linkage: a private helper function
    std::cout << "call " << calls << ": add " << n << "\n";
}

void add(int n) {                  // external linkage: the file's public function
    ++calls;
    total += n;
    logCall(n);
}
```

```cpp
// main.cpp  (g++ main.cpp alone does not compile into a program: the linker
//            also needs counter.cpp, which defines add and total)
#include <iostream>

extern int total;                  // declaration: "total is defined in another file"
void add(int n);                   // declaration: add is defined in another file

int main() {
    add(5);
    add(7);
    std::cout << "total = " << total << "\n";
}
```

```bash
$ g++ -std=c++17 -c main.cpp counter.cpp     # compile each file to an object file
$ g++ main.o counter.o -o app                # link them into one program
$ ./app
call 1: add 5
call 2: add 7
total = 12
$ nm -C counter.o | grep -E 'total|calls|add|logCall'
0000000000000078 T add(int)
0000000000000004 b calls
0000000000000000 t logCall(int)
0000000000000000 B total
```

**How it works:**
1. `main.cpp` only **declares** `total` and `add`. The compiler trusts the declarations and leaves the linker a note: "find these".
2. The linker finds both definitions in `counter.o` and connects them.
3. `nm` lists an object file's symbols. **Uppercase** (`T` = code, `B` = zero-initialized data) = a global symbol other files can link to. **Lowercase** (`t`, `b`) = a local symbol: `static` hid `calls` and `logCall`.

**Why make things file-private:** other files can't misuse the helper, and two files can reuse a short name without colliding.

## The two classic linker errors

**Meaning:** the compiler sees one file at a time, so linkage mistakes appear only when the linker joins the files. A program must contain **exactly one** definition of each external name (the **One Definition Rule**). Two extra files, linked with `main.o` and `counter.o` from above:

```bash
$ cat spy.cpp
extern int calls;              // try to reach counter.cpp's static variable
int peek() { return calls; }
$ cat other.cpp
int total = 1;                 // a second definition of total
static int calls = 99;         // fine: a separate, private calls
$ g++ -std=c++17 -c spy.cpp other.cpp
$ g++ main.o counter.o spy.o -o app 2>&1 | grep -E 'undefined|error'
spy.cpp:(.text+0xa): undefined reference to `calls'
collect2: error: ld returned 1 exit status
$ g++ main.o counter.o other.o -o app
/usr/bin/ld: other.o:(.data+0x0): multiple definition of `total'; counter.o:(.bss+0x0): first defined here
collect2: error: ld returned 1 exit status
```

**How it works:**
1. `spy.cpp` compiles fine, but at link time there is no **external** `calls`: the one in `counter.cpp` is `static`, invisible to the linker.
2. `other.cpp` defines a second external `total`: two definitions, so the linker refuses. Its `static int calls` is no problem: a separate, private variable.

| Linker message | Usual cause | Fix |
|---|---|---|
| `undefined reference` | declared and used, but never defined, or defined `static` in another file | define it once, without `static`, in one `.cpp` |
| `multiple definition` | defined in two `.cpp` files, or in a header included by two files | keep one definition; elsewhere only declare (`extern`), or use `inline` |

## The unnamed namespace: the modern alternative

**Meaning:** `namespace { ... }` (a namespace with no name) gives everything inside it internal linkage, like `static`. Modern C++ prefers it because it works for **every** declaration, including types. `static` works only on variables and functions: `static struct P { int x; };` is rejected with `error: a storage class can only be specified for objects and functions`.

```cpp
#include <iostream>
#include <string>

namespace {                            // everything here is private to this file
    int calls = 0;

    void logLine(const std::string& msg) {
        std::cout << "[" << ++calls << "] " << msg << "\n";
    }

    struct Point { int x, y; };        // a file-private type: static can't do this
}

int main() {
    logLine("start");                  // used without any prefix
    Point p{2, 3};
    logLine("point at " + std::to_string(p.x) + "," + std::to_string(p.y));
}
```
```output
[1] start
[2] point at 2,3
```

**How it works:**
1. The compiler gives the namespace a unique hidden name per file. The rest of the file uses its contents without a prefix; other files can't name it.
2. Two files that each define a different `struct Point` would break the One Definition Rule, and the linker would **not** report it. Inside unnamed namespaces they are two separate types.

| | `static` at file scope | unnamed namespace |
|---|---|---|
| Variables and functions | Yes | Yes |
| Classes, structs, enums | No | Yes |
| Many declarations at once | No: `static` on each | Yes: one block |
| Valid in C | Yes | No |

**When to use it:** for file-private helpers and types in C++ code. `static` remains common in older code and in code shared with C.

## Sharing one global through a header (C++17 inline variables)

**Meaning:** sometimes every file should share **one** global, such as a setting. Its declaration goes in a header so all files see it. C++17 **inline variables** make this easy: `inline int x = 1;` may appear in every file that includes the header, and the linker keeps a **single** variable.

```bash
$ cat config.h
#ifndef CONFIG_H
#define CONFIG_H
inline int verbosity = 1;      // C++17: one variable, shared by every file
#endif
$ cat a.cpp
#include "config.h"
void setLoud() { verbosity = 3; }
$ cat main.cpp
#include <iostream>
#include "config.h"
void setLoud();
int main() {
    setLoud();
    std::cout << "verbosity = " << verbosity << "\n";
}
$ g++ -std=c++17 a.cpp main.cpp -o app && ./app
verbosity = 3

# the same files, with config.h changed to   int verbosity = 1;
$ g++ -std=c++17 -c a.cpp main.cpp && g++ a.o main.o -o app
/usr/bin/ld: main.o:(.data+0x0): multiple definition of `verbosity'; a.o:(.data+0x0): first defined here
collect2: error: ld returned 1 exit status

# and with config.h changed to   static int verbosity = 1;
$ g++ -std=c++17 a.cpp main.cpp -o app && ./app
verbosity = 1
```

**How it works:**
1. `inline`: both files contain the definition and the linker merges them. `setLoud()` sets it to 3 and `main.cpp` sees 3.
2. Plain `int`: each including file defines its own external `verbosity`: link error.
3. `static`: it links, but each file has a **private copy**. `setLoud()` changed `a.cpp`'s copy, so `main.cpp` prints its own 1. No error, just a wrong result.
4. The classic way, valid before C++17 and in C: `extern int verbosity;` in the header, and `int verbosity = 1;` in exactly one `.cpp`.

For a shared constant, write `inline constexpr int maxUsers = 10;` in the header. Avoid shared **mutable** globals where you can: any file can change them, so bugs are hard to trace.

## Static local variables

**Meaning:** `static` on a variable **inside a function** is not about linkage. It changes the **lifetime**: the variable is created once and lives until the program ends, so it keeps its value between calls. The **scope** stays the function. Lesson 44 covers initialization, thread safety and destruction.

```cpp
#include <iostream>

int nextId() {
    static int id = 0;     // created once; keeps its value between calls
    return ++id;
}

int main() {
    for (int i = 0; i < 3; i++)
        std::cout << nextId() << " ";
    std::cout << "\n";
}
```
```output
1 2 3
```

**How it works:** `id` is set to 0 once, not on every call, so each call increments the same variable. Without `static`, it would print `1 1 1`.

## Initialization order across files

**Meaning:** a global whose initial value needs code to run (a function call, a constructor) is initialized before `main`. Within one file this happens top to bottom; **across files the order is unspecified**. A global that reads a global from another file may read it before it is ready: the **static initialization order fiasco**.

```bash
$ cat base.cpp
int loadBase() { return 42; }
int base = loadBase();         // dynamic initialization: runs before main
$ cat main.cpp
#include <iostream>
extern int base;
int derived = base + 1;        // needs base to be ready first
int main() { std::cout << "derived = " << derived << "\n"; }
$ g++ -std=c++17 -c base.cpp main.cpp
$ g++ base.o main.o -o app1 && ./app1
derived = 43
$ g++ main.o base.o -o app2 && ./app2
derived = 1
```

**How it works:**
1. Static storage starts as zeros, so `base` is 0 until `loadBase()` runs.
2. Linked as `base.o main.o`, this build initialized `base` first: 43. Linked the other way, `derived` read `base` while it was still 0: 1. Same code, different result.

**Fixes:**
- Use a compile-time constant (`inline constexpr int base = 42;` in a header). Constants are set before any initialization code runs.
- Wrap the global in a function: `int& base() { static int b = loadBase(); return b; }`. It is built on first use (lesson 44).

## Summary: every kind of global

| Declaration | Who can use the name | Creates the variable? |
|---|---|---|
| `int x = 1;` (file scope) | every file (external linkage) | yes: only one `.cpp` may do this |
| `static int x = 1;` (file scope) | this file only (internal linkage) | yes: one per file that has it |
| `namespace { int x = 1; }` | this file only (internal linkage) | yes: one per file that has it |
| `const int x = 1;` (file scope) | this file only (internal linkage in C++) | yes: one per file that has it |
| `extern int x;` | refers to an external `x` defined elsewhere | no: declaration only |
| `inline int x = 1;` (C++17) | every file (external linkage) | yes: repeated in each file, merged into one |
| `static int x = 0;` inside a function | that function only | yes: one, created once (lesson 44) |

All of these live for the whole program (static storage). Inside a class, `static` means yet another thing: one member shared by all objects (lesson 9).

## Common mistakes

- **A definition in a header.** `int x = 1;` gives `multiple definition`; `static int x = 1;` gives each file its own copy. Use `inline` (C++17) or `extern` plus one definition.
- **Sharing a `const` global with `extern`.** In C++, `const int maxUsers = 10;` at file scope is internal, so another file's `extern const int maxUsers;` gets `undefined reference`. Define it as `extern const int maxUsers = 10;`.
- **`extern` with an initializer.** `extern int x = 5;` is a definition, not a declaration (g++ warns: `'x' initialized and declared 'extern'`).
- **Thinking `static` means constant.** A `static` global can be changed; it is only hidden from other files. `const` makes a value read-only.
- **Mixing up the meanings of `static`:** file scope = internal linkage; local variable = program-long lifetime (lesson 44); class member = shared by all objects (lesson 9).

## ⚠ Easily confused

- **static (file scope) vs extern** — `static` global = internal linkage, private to this file. `extern int x;` = a declaration referring to an external `x` defined in another file.
- **static local vs normal local** — A normal local is created and destroyed on every call. A `static` local is created once, keeps its value, and lives for the whole program (lesson 44).
- **declaration vs definition** — `extern int x;` declares (no storage). `int x = 1;` defines (creates the storage). Many declarations are fine; exactly one definition.
- **static global vs inline variable in a header** — `static` gives each file its **own** copy; `inline` (C++17) gives all files **one** shared variable.
- **static vs unnamed namespace** — Same effect (internal linkage). The unnamed namespace also works for classes, structs and enums.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 08).