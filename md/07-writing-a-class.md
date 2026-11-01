# 07 — How to Write a Class

*Category: C++ Core*

> Design a class in steps (private data, invariant, constructor, operations, const getters), then split it into a guarded header and a source file.

## Must-remember points

- Decide what's **private (data)** and what's **public (interface)**; outsiders touch data only through member functions.
- Design order: private data, then the **invariant** it must keep, a **constructor** that establishes it, public **operations** that keep it, and **const getters**.
- A member function defined **inside** the class body is implicitly `inline`. Defined **outside**, it needs the class name: `long BankAccount::balance() const { ... }`.
- Forgetting `ClassName::` defines an unrelated free function: a compile error if its body uses members (`'x' was not declared in this scope`), otherwise the member stays undefined and the link fails (`undefined reference`).
- Header/source split: the class definition goes in a `.h`, member function bodies in **one** `.cpp`. A non-inline body in a header included by several `.cpp` files breaks the **One Definition Rule**: `multiple definition` at link time.
- Every header needs an **include guard** (`#ifndef X_H` / `#define X_H` / `#endif`) or `#pragma once`. Without one, a header included twice in one `.cpp` gives `redefinition of 'class X'`.
- **const-correctness**: a member function that doesn't modify the object should be `const` (`long balance() const`). Only `const` functions can be called on `const` objects and `const&` parameters.
- Conventions: public section first, private data last; mark data members (`m_balance` or `balance_`); and end the class with `};`.

## Designing a class step by step

**Meaning:** a good class is written in a fixed order of decisions. Take a bank account:
1. **Data**: what must the object remember? An owner and a balance. Make it `private`.
2. **Invariant**: what must always be true? The owner is not empty; the balance is never negative.
3. **Constructor**: build only valid objects; refuse bad arguments (lesson 11).
4. **Operations**: what do users want to do? Deposit and withdraw. Each one keeps the invariant (lesson 5).
5. **Getters**: what may users read? Owner and balance, as `const` functions.

```cpp
#include <iostream>
#include <stdexcept>
#include <string>
#include <utility>

class BankAccount {
public:                                              // the interface comes first
    BankAccount(std::string owner, long cents)       // the constructor establishes the invariant
        : m_owner(std::move(owner)), m_cents(cents) {
        if (m_owner.empty() || m_cents < 0)
            throw std::invalid_argument("invalid account");
    }

    void deposit(long cents) {                       // operations keep the invariant
        if (cents <= 0) throw std::invalid_argument("deposit must be positive");
        m_cents += cents;
    }
    bool withdraw(long cents) {
        if (cents <= 0 || cents > m_cents) return false;
        m_cents -= cents;
        return true;
    }

    const std::string& owner() const { return m_owner; }   // const getters
    long balance() const { return m_cents; }

private:                                             // the data comes last
    std::string m_owner;                             // invariant: not empty
    long m_cents;                                    // invariant: never negative
};

void report(const BankAccount& a) {                  // a const object: only const functions allowed
    std::cout << a.owner() << ": " << a.balance() << " cents\n";
}

int main() {
    BankAccount acc("Ravi", 1000);
    acc.deposit(500);
    std::cout << std::boolalpha << acc.withdraw(2000) << "\n";   // refused: not enough money
    acc.withdraw(300);
    report(acc);
}
```
```output
false
Ravi: 1200 cents
```

**How it works:**
1. The constructor checks its arguments; `BankAccount("", 5)` would throw, so every `BankAccount` that exists is valid.
2. `withdraw(2000)` would make the balance negative, so it returns `false` and changes nothing.
3. `report` takes a `const BankAccount&`. It may only call `const` member functions, which is why `owner()` and `balance()` are marked `const`.
4. `owner()` returns `const std::string&`: the caller can read the name without a copy, but can't change it.
5. Money is kept in whole cents (`long`), so no rounding errors creep in as they would with `double`.

## const member functions

**Meaning:** `const` after a member function's parameter list promises that the function doesn't change the object. The compiler enforces it: inside, every data member is read-only. In return, the function can be called on a `const` object or through a `const&`, which is how most objects are passed around. A getter without `const` can't be called there at all.

| Function | Can change members? | Callable on a `const` object? |
|---|---|---|
| `long balance() const` | no | yes |
| `long balance()` | yes | no |

```cpp
class Counter {
    int n = 0;
public:
    int get() { return n; }          // forgot const
};

void show(const Counter& c) {
    c.get();                         // does not compile: passing 'const Counter' as 'this' argument discards qualifiers
}
```

**When to use it:** on every member function that only reads: getters, `print`, comparisons, calculations. The rare member that must change inside a `const` function (a cache, a mutex) can be declared `mutable`.

## Splitting the class into a header and a source file

**Meaning:** in a real project, each class gets two files. The **header** (`bank_account.h`) holds the class definition: members and function declarations. Every file that uses the class includes it. The **source file** (`bank_account.cpp`) holds the bodies of the member functions, each written as `ReturnType ClassName::name(...)`. It is compiled once. Tiny functions may stay in the class body: defined there, they are implicitly `inline` and allowed in a header.

```cpp
// bank_account.h
#ifndef BANK_ACCOUNT_H                 // include guard: skip everything if already included
#define BANK_ACCOUNT_H

#include <string>                      // the header includes what it uses

class BankAccount {
public:
    BankAccount(std::string owner, long cents);
    void deposit(long cents);
    bool withdraw(long cents);

    const std::string& owner() const { return m_owner; }   // tiny: defined here, implicitly inline
    long balance() const { return m_cents; }

private:
    std::string m_owner;               // invariant: not empty
    long m_cents;                      // invariant: never negative
};

#endif                                 // BANK_ACCOUNT_H
```

The source file defines the remaining members. `BankAccount::` tells the compiler which class each function belongs to; inside, the members are in scope as usual:

```bash
$ cat bank_account.cpp
// bank_account.cpp
#include "bank_account.h"
#include <stdexcept>
#include <utility>

BankAccount::BankAccount(std::string owner, long cents)
    : m_owner(std::move(owner)), m_cents(cents) {
    if (m_owner.empty() || m_cents < 0)
        throw std::invalid_argument("invalid account");
}

void BankAccount::deposit(long cents) {
    if (cents <= 0) throw std::invalid_argument("deposit must be positive");
    m_cents += cents;
}

bool BankAccount::withdraw(long cents) {
    if (cents <= 0 || cents > m_cents) return false;
    m_cents -= cents;
    return true;
}
```

The program only includes the header, then compile both `.cpp` files and link them:

```bash
$ cat main.cpp
// main.cpp
#include <iostream>
#include "bank_account.h"

int main() {
    BankAccount acc("Ravi", 1000);
    acc.deposit(500);
    acc.withdraw(300);
    std::cout << acc.owner() << ": " << acc.balance() << " cents\n";
}
$ g++ -std=c++17 -Wall -Wextra -c bank_account.cpp    # compile: bank_account.o
$ g++ -std=c++17 -Wall -Wextra -c main.cpp            # compile: main.o
$ g++ bank_account.o main.o -o bank                   # link
$ ./bank
Ravi: 1200 cents
```

**How it works:**
1. `#include "bank_account.h"` pastes the header's text in, so `main.cpp` knows the class's members and sizes. It does not need the function bodies to compile.
2. Each `.cpp` is compiled separately into an object file. The linker then connects `main.o`'s calls to the bodies in `bank_account.o`. (`g++ -std=c++17 bank_account.cpp main.cpp -o bank` does all three steps at once.)
3. Leave `bank_account.cpp` out (`g++ main.cpp -o bank`) and the link fails: `undefined reference to 'BankAccount::deposit(long)'`.
4. Only declarations and inline bodies belong in the header. A normal body there would be compiled into every `.cpp` that includes it, and the linker would see several definitions (next section).

**Advantages:**
- Users of the class read a short header, not every body.
- Changing a function body recompiles only `bank_account.cpp`.
- The bodies can be shipped already compiled, in a library (lesson 45).

**Disadvantages:**
- Two files to keep in sync.
- A change to the header recompiles every file that includes it.

## Include guards, #pragma once and the One Definition Rule

**Meaning:** `#include` is plain text pasting. If `main.cpp` includes `point.h` directly and also through `shape.h`, the class appears twice in the same file, and a class may be defined only once per `.cpp`:

```cpp
// main.cpp after the preprocessor, when point.h (no guard) is included twice: does not compile
struct Point { int x, y; };      // from #include "point.h"
struct Point { int x, y; };      // from #include "shape.h", which includes point.h again
int main() {}
```

g++ reports `redefinition of 'struct Point'`. An **include guard** prevents it. The first time, `BANK_ACCOUNT_H` is not defined, so the header defines it and its body is kept. Any later inclusion in the same `.cpp` finds the macro defined and skips to `#endif`. `#pragma once` at the top of the header does the same in one line. It is not part of the C++ standard, but g++ and clang support it.

| | `#ifndef` include guard | `#pragma once` |
|---|---|---|
| Standard C++ | yes | no (a compiler extension) |
| Length | three lines and a unique macro name | one line |
| Can go wrong when | two headers use the same macro name (the second is silently skipped) | the compiler doesn't support it |

Guards work **within one `.cpp`**. Across files, a different rule applies, the **One Definition Rule (ODR)**: a non-inline function may be defined only once in the whole program. So a body written outside the class in a header, without `inline`, breaks the link as soon as two `.cpp` files include it:

```bash
$ g++ a.cpp b.cpp -o app      # both include counter.h, which defines Counter::add() outside the class
/usr/bin/ld: /tmp/ccjh8jZ3.o: in function `Counter::add()':
b.cpp:(.text+0x0): multiple definition of `Counter::add()'; /tmp/ccyFjJEN.o:a.cpp:(.text+0x0): first defined here
collect2: error: ld returned 1 exit status
```

The fix: move that body into `counter.cpp`, or mark it `inline` (as functions defined inside the class body already are).

## Conventions

These don't change what the program does, but they make classes easy to read, and reviewers expect them:
- **Public first, private last.** Readers come to learn the interface; the data is an implementation detail.
- **Mark data members** so they don't clash with parameters and locals: `m_balance` or `balance_`. Pick one style per project.
- **One class per header**, named after the class (`bank_account.h` / `bank_account.cpp`), and each header includes everything it uses (`<string>` above), so it compiles on its own.
- **Getters named after the value** (`balance()`) or with `get` (`getBalance()`): either works; be consistent.
- **`const` on every function that only reads**, `const T&` for class-type parameters you only read (lesson 4), and `explicit` on single-argument constructors (lesson 36).

## Common mistakes

- **Missing `ClassName::`** in a definition outside the class. `long balance() const { ... }` in the `.cpp` is a free function: g++ rejects `const` on it (`non-member function 'long int balance()' cannot have cv-qualifier`), a body that uses members gives `'m_cents' was not declared in this scope`, and otherwise the real member is left undefined (`undefined reference`).
- **Declaration and definition don't match.** Declared `long balance() const;`, defined `long BankAccount::balance() { ... }`: `no declaration matches 'long int BankAccount::balance()'`. The `const` must be repeated.
- **Repeating words that belong only in the class.** Default arguments, `virtual`, `static` and `explicit` go on the declaration only: `default argument given for parameter 1 of ...`, `'virtual' outside class declaration`.
- **Missing `const` on getters.** Calling them on a `const&` fails: `passing 'const BankAccount' as 'this' argument discards qualifiers`.
- **Missing `;` after the class.** `class A { ... }` followed by more code: `expected ';' after class definition`.
- **A non-inline body in a header.** Fine with one `.cpp`, then `multiple definition` as soon as a second one includes it.
- **Forgetting to compile the `.cpp`.** `g++ main.cpp` alone gives `undefined reference` for every member defined in `bank_account.cpp`.

## ⚠ Easily confused

- **declaration vs definition** — A declaration says 'this exists' and gives its type (`void deposit(long);`, in the header). A definition provides the body or storage (`void BankAccount::deposit(long c) { ... }`, in one `.cpp`).
- **inline member vs Class::** — Defined inside the class body = implicitly inline, may live in a header. Defined outside = must be qualified with `Class::` (or it's an unrelated free function) and belongs in one `.cpp`, unless marked `inline`.
- **include guard vs ODR** — An include guard stops the same header being pasted twice into **one** `.cpp` (`redefinition`). The ODR is about the **whole program**: a non-inline function defined in two `.cpp` files fails at link time (`multiple definition`).
- **#ifndef guard vs #pragma once** — Both stop double inclusion. The guard is standard C++ but needs a unique macro name; `#pragma once` is one line and supported by g++ and clang, but is not in the standard.
- **const member function vs const return** — `long balance() const` promises not to change the object. `const std::string& owner()` returns something the caller can't change. A getter often has both.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 07).