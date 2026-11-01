# 16 — const, constexpr & volatile

*Category: C++ Language & Safety*

> `const` means read-only, `constexpr` means known at compile time, `volatile` means every access must really happen.

## Must-remember points

- `const` = **read-only after initialization**; the value may come from run time (`const int n = argc;`). It must be initialized.
- **Pointers: read right to left.** `const int* p` = pointer to a const int (can't change `*p`, can move `p`). `int* const p` = const pointer (can change `*p`, can't move `p`). `const int* const p` = both fixed.
- **`const T&` parameters**: no copy, no modification, and they accept temporaries and literals (a plain `T&` does not).
- **const member function** `int get() const`: promises not to change the object. Only const member functions can be called on a `const` object. A **`mutable`** member may change even inside them (caches, counters).
- `constexpr` variable = value **computed at compile time**, so it can be used where C++ needs a constant (array sizes, template arguments, `static_assert`). Every `constexpr` variable is `const`, not the other way round.
- `constexpr` function: runs at compile time when its arguments are constants and the result is needed there; otherwise at run time like a normal function. `consteval` (C++20) **must** run at compile time.
- `volatile` = every read and write must really happen; the compiler may not cache or remove them. Real uses: **memory-mapped hardware registers** and a **`volatile std::sig_atomic_t` flag** set by a signal handler.
- `volatile` gives **no atomicity and no thread ordering**. For data shared between threads use `std::atomic` or a mutex.

## const variables

**Meaning:** a `const` variable can't be changed after it is initialized. It must get its value when it is created, and that value may be known only at run time. The compiler rejects any line that tries to modify it.

```cpp
#include <iostream>

int main(int argc, char*[]) {
    const int maxUsers = 100;            // value known at compile time
    const int args = argc;               // value known only at run time: still fine for const
    std::cout << maxUsers << " " << args << "\n";
    // maxUsers = 200;                   // error: assignment of read-only variable 'maxUsers'
    // const int x;                      // error: uninitialized 'const x'
}
```
```output
100 1
```

**How it works:**
1. `maxUsers` and `args` are both `const`. They differ only in *when* the value is known: `100` at compile time, `argc` at start-up.
2. Uncommenting either commented line gives the error shown.
3. Use `const` for every value that shouldn't change. It also replaces `#define` constants with typed, scoped variables.

## const with pointers

**Meaning:** with a pointer, two things can be read-only: the **pointed-to value** and the **pointer itself**. `const` applies to what is on its **left** (or, if nothing is there, to its right). The easy way: **read the declaration right to left**, starting from the name.

| Declaration | Read right to left | Change the int through `p`? | Point `p` elsewhere? |
|---|---|---|---|
| `const int* p` (same as `int const* p`) | p is a pointer to an int that is const | No | Yes |
| `int* const p` | p is a const pointer to an int | Yes | No |
| `const int* const p` | p is a const pointer to a const int | No | No |

```cpp
#include <iostream>

int main() {
    int a = 1, b = 2;

    const int* p1 = &a;          // pointer to const int
    p1 = &b;                     // OK: the pointer may move
    // *p1 = 5;                  // error: assignment of read-only location '* p1'

    int* const p2 = &a;          // const pointer to int
    *p2 = 10;                    // OK: a is now 10
    // p2 = &b;                  // error: assignment of read-only variable 'p2'

    std::cout << *p1 << " " << a << "\n";

    const int* view = &a;        // a read-only VIEW of a...
    a = 20;                      // ...but a itself is not const
    std::cout << *view << "\n";  // the view sees the new value
}
```
```output
2 10
20
```

**How it works:**
1. `p1` starts at `a` and moves to `b`; only writing through it is forbidden.
2. `p2` is stuck pointing at `a`, but `*p2 = 10` changes `a`.
3. `view` shows that `const int*` means "not changed **through this pointer**", not "nobody can change it".

Take `const T*` (or `const T&`) in functions that only read. `T* const` fits a pointer that must never move, such as a fixed hardware address (see `volatile` below).

## const reference parameters

**Meaning:** passing a large object **by value** copies it. Passing it by `const&` avoids the copy, and `const` promises the caller's object won't change. A `const&` parameter also accepts temporaries and literals; a plain `T&` does not, because it exists to modify a real variable of the caller's.

```cpp
#include <iostream>
#include <string>

std::size_t countSpaces(const std::string& text) {   // no copy, read-only
    std::size_t n = 0;
    for (char c : text) if (c == ' ') ++n;
    // text += "!";                                  // would not compile: text is const
    return n;
}

void shout(std::string& text) { text += "!"; }       // non-const&: changes the caller's string

int main() {
    std::string s = "a b c";
    std::cout << countSpaces(s) << " " << countSpaces("x y") << "\n";   // a literal works with const&
    shout(s);                    // shout("x y") would not compile: a temporary can't bind to std::string&
    std::cout << s << "\n";
}
```
```output
2 1
a b c!
```

**How it works:**
1. `countSpaces(s)` binds `text` directly to `s`: no copy.
2. `countSpaces("x y")` builds a temporary `std::string`; a `const&` may bind to it.
3. `shout("x y")` fails: `cannot bind non-const lvalue reference of type 'std::string&' ... to an rvalue`.

**When to use it:** `const T&` for read-only parameters that are expensive to copy (`std::string`, `std::vector`, your classes). Small types (`int`, `double`, pointers) are passed by value.

## const member functions and mutable

**Meaning:** writing `const` after a member function's parameter list promises that the function does not change the object (inside it, `this` points to a const object). On a `const` object, or through a `const&`, **only const member functions can be called**. A member marked **`mutable`** is the exception: it may change even inside a const function. Use it for things that are not part of the object's visible value, such as a cache or a usage counter.

```cpp
#include <iostream>
#include <string>
#include <utility>

class Account {
    std::string owner;
    int balance;
    mutable int reads = 0;                    // may change even in const functions
public:
    Account(std::string o, int b) : owner(std::move(o)), balance(b) {}
    int getBalance() const {                  // const: does not change the account
        ++reads;                              // allowed only because reads is mutable
        return balance;
    }
    void deposit(int x) { balance += x; }     // non-const: changes the account
    int readCount() const { return reads; }
};

void report(const Account& acc) {             // acc is const in here
    std::cout << acc.getBalance() << "\n";    // OK: getBalance is const
    // acc.deposit(5);                        // error: passing 'const Account' as 'this' argument discards qualifiers
}

int main() {
    Account a("Ann", 100);
    a.deposit(50);
    report(a);
    report(a);
    std::cout << "balance read " << a.readCount() << " times\n";
}
```
```output
150
150
balance read 2 times
```

**How it works:**
1. `report` receives a `const Account&`, so only `getBalance()` and `readCount()` (both `const`) can be called on it.
2. `getBalance()` still increments `reads`, because `reads` is `mutable`.
3. Mark every member function that doesn't modify the object `const`. If you forget, nobody holding a `const&` to your class can call it.

## constexpr variables and functions

**Meaning:** `constexpr` asks the compiler to compute a value **at compile time**. A `constexpr` variable must be initialized with a constant expression, and can then be used wherever C++ requires a constant (lesson 17 lists those places). A `constexpr` function *can* run at compile time; it does so when its arguments are constants and the result is needed at compile time. Called with a run-time value, it simply runs at run time.

```cpp
#include <array>
#include <iostream>

constexpr int square(int x) { return x * x; }

int main(int argc, char*[]) {
    constexpr int n = square(4);                 // computed by the compiler
    static_assert(n == 16, "square is wrong");   // checked at compile time
    std::array<int, square(3)> arr{};            // template argument must be a constant: 9
    int m = square(argc + 1);                    // argc is known only at run time: runs at run time
    std::cout << n << " " << arr.size() << " " << m << "\n";
}
```
```output
16 9 4
```

**How it works:**
1. `constexpr int n = square(4)` forces compile-time evaluation: the program just contains 16.
2. `static_assert` is checked by the compiler; if it failed, the build would stop with the message.
3. `std::array<int, square(3)>` needs its size at compile time, and `square(3)` provides it.
4. `square(argc + 1)` can't be done at compile time, so it is an ordinary run-time call (argc is 1 here). `constexpr int b = argc;` would not compile: `the value of 'argc' is not usable in a constant expression`.

**`consteval` (C++20)** makes a function that **must** run at compile time. Calling it with a run-time value is an error, not a fallback.

```cpp
// C++20
#include <iostream>

consteval int cube(int x) { return x * x * x; }

int main() {
    constexpr int c = cube(3);       // fine: 3 is a constant
    std::cout << c << "\n";
    // int k = 2; int d = cube(k);   // error: the value of 'k' is not usable in a constant expression
}
```
```output
27
```

**Trade-off:** the work is done once by the compiler, not on every run, but on the compile-time path a `constexpr` function can't do I/O or call non-constexpr functions, and heavy compile-time work slows builds.

## volatile: accesses that must really happen

**Meaning:** normally the compiler may keep a variable in a register and skip reads it thinks are redundant. `volatile` forbids that for one object: **every read and write in the code really happens, in order**. Use it when something outside the program's normal flow changes the value: a **signal handler**, or **hardware** behind a memory address. A flag set by a signal handler must be `volatile std::sig_atomic_t` (an integer type the handler can write in one step):

```cpp
#include <csignal>
#include <iostream>
#include <unistd.h>    // alarm (POSIX)

volatile std::sig_atomic_t stop = 0;    // set by the handler, read by main

void onAlarm(int) { stop = 1; }         // a handler should do little more than set a flag

int main() {
    std::signal(SIGALRM, onAlarm);
    alarm(1);                           // ask the kernel for SIGALRM in 1 second
    unsigned long spins = 0;
    while (!stop) ++spins;              // stop is re-read from memory on every pass
    std::cout << "stopped by the handler, looped " << (spins > 0 ? "many" : "zero") << " times\n";
}
```
```output
stopped by the handler, looped many times
```

**How it works:**
1. `alarm(1)` makes the kernel interrupt the program after one second and run `onAlarm`, which sets `stop`.
2. Because `stop` is `volatile`, the loop reads it from memory every pass and sees the change.
3. Without `volatile`, the optimizer sees that nothing **inside the loop** changes `stop`, reads it once, and turns the loop into an endless jump. The same program without the keyword, built with `-O2`:

```bash
$ g++ -std=c++17 -O2 -o novol novol.cpp     # same program, 'volatile' removed
$ timeout 3 ./novol; echo "exit $?"
exit 124
$ g++ -O2 -S -o - novol.cpp | grep -A1 '^.L5:'
.L5:
	jmp	.L5
```

Exit code 124 means `timeout` had to kill it: the loop became a jump to itself.

**Hardware registers:** on a microcontroller, a device's status register sits at a fixed address, and the device changes it. Each read must reach the device:

```cpp
#include <cstdint>

// (not run): this address only means something on that microcontroller
volatile std::uint32_t* const UART_STATUS = reinterpret_cast<volatile std::uint32_t*>(0x40011000);

int main() {
    while ((*UART_STATUS & 0x80) == 0) {}   // wait for the device; each pass really reads it
}
```

Right to left: a **const pointer** (fixed address) to a **volatile** `uint32_t` (changed by the device).

**Not for threads:** `volatile` doesn't make `++x` atomic and doesn't order memory between CPU cores; two threads doing `++counter` on a `volatile int` still lose updates. Use `std::atomic<int>` or a mutex.

## const vs constexpr vs volatile

**Meaning:** the three keywords answer different questions. `const`: may this code change it? `constexpr`: is it known before the program runs? `volatile`: can it change behind the compiler's back?

| | `const` | `constexpr` | `volatile` |
|---|---|---|---|
| Promise | read-only after initialization | value computed at compile time | every read and write really happens |
| When the value is known | compile time or run time | compile time (for variables) | it may change at any moment |
| Usable as array size / template argument | only if initialized with a constant expression | yes | no |
| Effect on the optimizer | none forbidden; writes through this name are errors | work moves to compile time | may not cache, merge or remove accesses |
| Typical use | `const T&` parameters, getters, fixed settings | sizes, lookup tables, `static_assert` | hardware registers, signal-handler flags |


## Common mistakes

- **Thinking `const int*` makes the data constant.** It only blocks writes **through that pointer**. Another non-const name can still change the value.
- **Mixing up `const int*` and `int* const`.** Read right to left from the name: "pointer to const int" vs "const pointer to int".
- **Casting `const` away to modify a truly const object.** `const int x = 5; *const_cast<int*>(&x) = 6;` is undefined behaviour (lesson 20). `const_cast` is only for calling old APIs that take `T*` but don't write.
- **Forgetting `const` on member functions.** Then a `const Account&` can't call `getBalance()`.
- **Assuming a `constexpr` function always runs at compile time.** It does only when the result is needed in a constant context (a `constexpr` variable, `static_assert`, a template argument). Use `consteval` if compile time is required.
- **Using `volatile` for thread synchronization.** It gives no atomicity and no ordering. Use `std::atomic` or a mutex.

## ⚠ Easily confused

- **const vs constexpr** — `const` = read-only, value may be set at run time. `constexpr` = computed by the compiler, usable as an array size or template argument.
- **`const int* p` vs `int* const p`** — `const int* p`: the int can't be changed through `p`, but `p` can point elsewhere. `int* const p`: `p` always points to the same int, which can be changed.
- **constexpr function vs consteval function** — `constexpr`: runs at compile time when it can and must, otherwise at run time. `consteval` (C++20): always at compile time; a run-time argument is a compile error.
- **const member function vs mutable member** — A `const` member function may not change the object's members, except those marked `mutable` (caches, counters).
- **volatile vs std::atomic** — `volatile`: every access really happens, nothing more. `std::atomic`: indivisible operations and ordering between threads.
- **constexpr vs volatile** — Opposite ends: `constexpr` moves work to compile time; `volatile` forces every access to really happen at run time.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 16).