# 44 — Local Static Variables

*Category: C++ Core*

> static on a local variable: the scope stays inside the function, but the lifetime becomes the whole program, so the value survives between calls.

## Must-remember points

- `static` on a local variable changes only its **lifetime**. Its **scope** stays inside the function, so it acts like a **private global**.
- It lives in the **static area** (`.data` when initialized with a non-zero constant, `.bss` when zero), not on the stack, so it **keeps its value between calls**.
- A **constant** initializer (`static int n = 0;`) is already in place **before `main`**: no run-time work, no flag.
- A **run-time** initializer (a constructor, a function call) runs **once**, the first time execution reaches the line, behind a **hidden guard flag**. A function that is never called never builds it. The first build is **thread-safe** since C++11.
- It is destroyed at **program exit**, after `main` returns, in **reverse order** of construction (the compiler registers the destructor with `__cxa_atexit` when it is built).
- Only the **first build** is thread-safe. Changing the value from two threads afterwards is a **data race**: use `std::atomic` or a mutex.
- There is **one per function**, not one per object or per call: a static local in a member function is shared by **all objects** of the class.
- Uses: counters, values built once on first use (lookup tables, caches), the singleton `instance()` (lesson 9), and avoiding the cross-file initialization order problem (lesson 8).

## What static changes on a local variable

**Meaning:** a normal local variable is created each time the function runs and destroyed when it returns. Add `static` and the variable is created **once** and lives until the program ends: its **lifetime** becomes the whole program. Its **scope** does not change: only code inside that function can use the name. It behaves like a global that only one function can see.

```cpp
#include <iostream>

int plainCounter() {
    int n = 0;                 // created on every call
    return ++n;
}

int staticCounter() {
    static int n = 0;          // created once; keeps its value between calls
    return ++n;
}

int* table() {
    static int arr[3] = {10, 20, 30};
    return arr;                // safe: arr outlives the call (a plain local array would dangle)
}

int main() {
    for (int i = 0; i < 3; i++)
        std::cout << plainCounter() << " " << staticCounter() << "\n";
    int* t = table();
    t[0] = 99;                 // changes the one static array
    std::cout << table()[0] << " " << table()[1] << "\n";
}
```
```output
1 1
1 2
1 3
99 20
```

**How it works:**
1. `plainCounter`'s `n` is a new variable set to 0 on every call, so it always returns 1.
2. `staticCounter`'s `n` is set to 0 **once**. Later calls skip the initialization and increment the same variable: 1, 2, 3.
3. `arr` is not on the stack, so returning a pointer to it is safe. Every call returns the **same** array: the change made through `t` is visible on the next call.
4. The `= 0` and `= {10, 20, 30}` are not executed at each call: they are only the starting values.

## When it is built, and when it is destroyed

**Meaning:** there are two kinds of initializer.
- A **constant** the compiler can compute (`static int n = 0;`): the value is written into the program file, so it is already there before `main` starts. Nothing happens at run time.
- **Run-time** work (a constructor, a function call): the compiler can't run it in advance. The declaration line is reached on every call, so the compiler adds a hidden **guard flag**: the first time, it builds the object and sets the flag; later calls see the flag and skip. A built object is destroyed after `main` returns.

```cpp
#include <iostream>

struct Logger {
    const char* name;
    Logger(const char* n) : name(n) { std::cout << "built " << name << "\n"; }
    ~Logger()                       { std::cout << "destroyed " << name << "\n"; }
};

int counter() {
    static int n = 0;                        // constant initializer: already 0 before main, no flag
    return ++n;
}

Logger& audit()  { static Logger L("audit");  return L; }   // run-time initializer: guarded
Logger& errors() { static Logger L("errors"); return L; }
void never()     { static Logger X("never"); }              // never called: X is never built

int main() {
    std::cout << "main starts, counter = " << counter() << "\n";
    errors();
    audit();
    errors();                                // already built: the flag says skip
    std::cout << "main ends\n";
}
```
```output
main starts, counter = 1
built errors
built audit
main ends
destroyed audit
destroyed errors
```

The guard flags are visible in the object file:

```bash
$ g++ -std=c++17 -c logs.cpp
$ nm -C logs.o | grep -E '\(\)::'
0000000000000010 b guard variable for audit()::L
0000000000000030 b guard variable for never()::X
0000000000000020 b guard variable for errors()::L
0000000000000008 b audit()::L
0000000000000028 b never()::X
0000000000000018 b errors()::L
0000000000000000 b counter()::n
$ objdump -dr logs.o | grep -oE '__cxa_(guard_acquire|atexit|guard_release)' | sort | uniq -c
      3 __cxa_atexit
      3 __cxa_guard_acquire
      3 __cxa_guard_release
```

**How it works:**
1. Nothing is built before `main`: the Loggers are built in the order their functions are **first called** (`errors`, then `audit`). The second `errors()` call builds nothing.
2. `never()` is never called, so its flag stays 0: `X` is never built and never destroyed.
3. After `main` returns, the built objects are destroyed in **reverse** order of construction: `audit` (built last) first.
4. `nm` shows a `guard variable` for each `Logger`, but none for `counter()::n`: a constant needs no flag. All of them sit in `.bss` (`b`), the zero-filled static area, not on the stack.
5. Each guarded initialization calls `__cxa_guard_acquire` (take the flag, waiting if another thread is building), then `__cxa_atexit` (register the destructor for program exit), then `__cxa_guard_release`.

## Thread safety

**Meaning:** since C++11 the **first build** of a static local is thread-safe: if several threads reach the line at once, one builds the object and the others wait until it is ready. That's what `__cxa_guard_acquire` does. Everything **after** the build is ordinary shared data: two threads changing it at the same time is a data race, exactly like a global.

```cpp
#include <atomic>
#include <iostream>
#include <thread>
#include <vector>

struct Config {
    Config() { std::cout << "Config built\n"; }       // must run exactly once
};

Config& config() {
    static Config c;                                  // first build is thread-safe (C++11)
    return c;
}

int nextTicket() {
    static std::atomic<int> n{0};                     // later changes need protection
    return ++n;
}

void worker() {
    for (int i = 0; i < 1000; i++) {
        config();
        nextTicket();
    }
}

int main() {
    std::vector<std::thread> threads;
    for (int i = 0; i < 4; i++) threads.emplace_back(worker);
    for (std::thread& t : threads) t.join();
    std::cout << "next ticket: " << nextTicket() << "\n";
}
```
```output
Config built
next ticket: 4001
```

**How it works:**
1. Four threads call `config()` 4,000 times in total, but `Config built` prints once: the guard makes the other threads wait for the first build, then skip it.
2. The 4,000 increments of the shared `n` are all counted because `n` is a `std::atomic<int>`, so the next ticket is 4001.
3. With a plain `static int n = 0;`, `++n` from several threads at once is a data race (undefined behaviour); in practice increments get lost. The guard protects only the initialization, never the later uses.

## One per function: uses and drawbacks

**Meaning:** a static local belongs to the **function**, not to a call or an object. A static local inside a member function is therefore one variable shared by **every** object of the class. This "built once, shared by everyone" property is what makes static locals useful for values that are expensive to build, and what makes them risky.

```cpp
#include <iostream>
#include <vector>

std::vector<int> buildPrimes(int count) {             // pretend this is expensive
    std::cout << "(building table) ";
    std::vector<int> v;
    for (int n = 2; (int)v.size() < count; n++) {
        bool prime = true;
        for (int d : v)
            if (n % d == 0) { prime = false; break; }
        if (prime) v.push_back(n);
    }
    return v;
}

int nthPrime(int i) {
    static const std::vector<int> table = buildPrimes(10);   // built on the first call only
    return table[i];
}

struct Button {
    int clicks = 0;                                   // one per Button
    void click() {
        static int total = 0;                         // ONE for the function, shared by all Buttons
        ++clicks;
        ++total;
        std::cout << clicks << "/" << total << " ";
    }
};

int main() {
    std::cout << nthPrime(0) << "\n";
    std::cout << nthPrime(9) << "\n";
    Button a, b;
    a.click();
    a.click();
    b.click();
    std::cout << "\n";
}
```
```output
(building table) 2
29
1/1 2/2 1/3
```

**How it works:**
1. The prime table is built on the first call and reused by every later call: no global, and no cost if `nthPrime` is never used.
2. `clicks` is a member, so `a` and `b` each have their own. `total` is a static local, so `b`'s first click continues from 2 to 3.
3. If `total` should belong to the class, make it a static data member (lesson 9); if it should be per object, make it a normal member.

**Advantages:**
- Built only if and when needed (lazy), and exactly once.
- Hidden from the rest of the program: only its function can touch it.
- Its first use defines its initialization order, so it avoids the cross-file initialization order problem (lesson 8).

**Disadvantages:**
- It is hidden **state**: the same call can give different results (`counter()`), which makes the function harder to test and reason about.
- Functions that hand out a pointer to a static buffer are not **reentrant**: every caller shares and overwrites the same buffer (the C functions `strtok` and `asctime` have this problem).
- Later changes need a mutex or `std::atomic` when threads are involved.
- Destroyed at exit in reverse order: a static object whose destructor uses another function's static local may find it already destroyed.

## Common mistakes

- **Expecting it to reset on each call.** `static int n = 0;` sets 0 once; later calls keep the old value.
- **Using a static local in a member function as per-object data.** It is shared by all objects. Use a member.
- **Changing it from several threads** without `std::atomic` or a mutex: only the first build is protected.
- **`static Logger* p = new Logger();`** Only the **pointer** is static. The `Logger` is on the heap and is never deleted: its destructor never runs at exit. Prefer `static Logger L;`.
- **Returning a pointer to a static buffer and keeping it.** The next call overwrites the buffer the caller is still reading.
- **Thinking other functions can use it by name.** The scope is still the function; return a reference if others need access.

## ⚠ Easily confused

- **scope vs lifetime** — **Scope** = where the name is visible. **Lifetime** = how long the storage exists. `static` on a local changes the lifetime only; the name still works only inside the function.
- **static local vs plain local** — A plain local is created on the stack at each call and destroyed on return. A static local is created once and lives until the program ends.
- **`static int n = 0;` vs `static Logger L;`** — The constant is stored in the program before `main` (no flag). The constructor is code, so it runs at run time on the first call, behind a hidden guard flag.
- **`static Logger L;` vs `static Logger* P = new Logger();`** — Both are guarded and built once. With the pointer only the **pointer** is static; the object is on the heap and its destructor never runs at exit.
- **static local in a member function vs data member** — A static local is one variable for the function, shared by all objects. A normal data member exists once per object; a static data member once per class (lesson 9).

➡ Questions for this topic: `questions/master-question-sheet.md` (section 44).