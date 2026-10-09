# 44 — Local Static Variables

*Category: C++ Core*

> static on a local variable: scope stays in the function, lifetime becomes the whole program.

## Must-remember points

- `static` on a local variable changes only its **lifetime**. **Scope** stays inside the function, so it acts like a **private global**.
- It lives in the **static area** (`.data` / `.bss`), not on the stack, so it **keeps its value between calls**.
- A **constant** initializer (`static int n = 0;`) is set **before `main`**, with no run-time work and no flag.
- A **run-time** initializer (a constructor, `new`) runs **once**, the first time execution reaches the line, behind a **hidden flag** (thread-safe since C++11).
- It is destroyed at **program exit**, in **reverse order** of construction.
- Only the **first build** is thread-safe. Changing the value from two threads is still a **data race**.

## One example for all the points

```cpp
struct Logger { Logger(){ std::cout << "built\n"; } ~Logger(){ std::cout << "destroyed\n"; } };

int counter() {
    static int n = 0;      // constant init: already 0 before main, no flag
    return ++n;            // 1, 2, 3 ... keeps its value between calls
}

int* table() {
    static int arr[3] = {10, 20, 30};
    return arr;            // safe: static storage outlives the call (a plain local array would dangle)
}

Logger& instance() {
    static Logger L;       // run-time init: built on the FIRST call only (hidden flag)
    return L;              // destroyed at program exit
}

void never() { static Logger X; }   // never called -> flag stays 0 -> X is never built or destroyed
```

## ⚠ Easily confused

- **scope vs lifetime** — **Scope** = where the name is visible. **Lifetime** = how long the storage exists. `static` on a local changes the lifetime only; the name still works only inside the function.
- **static local vs plain local** — A plain local is created on the stack at each call and destroyed on return. A static local is created once and lives until the program ends.
- **`static int n = 0;` vs `static Logger L;`** — The constant is stored in the program before `main` (no flag). The constructor is code, so it must run at run time on the first call, behind a hidden flag.
- **`static Logger L;` vs `static Logger* P = new Logger();`** — Both are guarded and built once. With the pointer only the **pointer** is static; the object is on the heap and its destructor never runs at exit.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 44).