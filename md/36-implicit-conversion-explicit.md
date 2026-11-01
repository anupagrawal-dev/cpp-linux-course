# 36 — Implicit Conversion & explicit

*Category: C++ Core*

> The compiler converts values between types on its own: built-in types, one-argument constructors and conversion operators. explicit and brace initialization keep the surprising ones out.

## Must-remember points

- A constructor callable with **one argument** (and not `explicit`) is a **converting constructor**: the compiler may use it to turn that argument into your class (`Entity e = 22;`). Default arguments count: `Entity(int a, int b = 0)` converts too.
- Implicit conversion fires in **copy-initialization** (`T x = value;`), **function arguments** and **return values**.
- **At most one** user-defined conversion per chain: `Entity e = "Tom";` fails when it needs `const char*` -> `std::string` -> `Entity`.
- `explicit` turns the implicit use off. `Entity e(22);`, `Entity e{22};`, `Entity(22)` and `static_cast<Entity>(22)` still work; `Entity e = 22;` and `f(22)` don't.
- Guideline: make one-argument constructors `explicit` unless the class really is another form of the argument (`std::string` from `const char*` is implicit; `std::vector`'s size constructor is explicit).
- A **conversion operator** goes the other way: `operator double() const` turns your object into a `double`. `explicit operator bool()` works in conditions (`if (c)`, `!c`) but not in `int n = c;`.
- Built-in conversions can lose data silently: `double` -> `int` drops the fraction, a too-big `int` -> `short` changes value, `-1` -> `unsigned` becomes 4294967295. `-Wall` doesn't warn; `-Wconversion` does.
- **Brace initialization rejects narrowing**: `int x{3.7};` is an error, while `int x = 3.7;` quietly gives 3.

## Converting constructors

**Meaning:** if a class has a constructor that can be called with one argument, the compiler treats it as a way to convert that argument's type into the class. It uses it silently wherever an object of the class is expected but a value of the other type is given.

```cpp
#include <iostream>
#include <string>

class Entity {
    std::string name;
    int age;
public:
    Entity(const std::string& n) : name(n), age(-1) { std::cout << "Entity(string) "; }
    Entity(int a) : name("unknown"), age(a)         { std::cout << "Entity(int) "; }
    void show() const { std::cout << name << ", " << age << "\n"; }
};

void print(const Entity& e) { e.show(); }

Entity adult() {
    return 18;                          // return value: int -> Entity
}

int main() {
    Entity a = 22;                      // copy-initialization: int -> Entity
    a.show();
    print(std::string("Tom"));          // function argument: std::string -> Entity
    adult().show();
}
```
```output
Entity(int) unknown, 22
Entity(string) Tom, -1
Entity(int) unknown, 18
```

**How it works:**
1. `Entity a = 22;` asks for an `Entity` from an `int`, so the compiler calls `Entity(int)`.
2. `print` wants an `Entity`, gets a `std::string`, and the compiler builds a temporary `Entity` with `Entity(const std::string&)`.
3. `return 18;` in a function returning `Entity` converts the same way.

The compiler applies **at most one** user-defined conversion in a row:

```cpp
#include <string>

class Entity {
public:
    Entity(const std::string& name) {}
};

int main() {
    Entity e = "Tom";      // does not compile: const char* -> std::string -> Entity is two conversions
}
```

g++ says: `error: conversion from 'const char [4]' to non-scalar type 'Entity' requested`. `Entity e("Tom");` and `Entity e = std::string("Tom");` both work: each needs only one user-defined conversion.

## explicit constructors

**Meaning:** `explicit` in front of a constructor says "only use me when someone asks for this type by name". Direct initialization, braces, a cast or naming the type still work. Silent conversions in `=` initialization, arguments and returns stop.

```cpp
#include <iostream>

class Buffer {
    int size;
public:
    explicit Buffer(int bytes) : size(bytes) {}
    int bytes() const { return size; }
};

void send(const Buffer& b) { std::cout << "sending " << b.bytes() << " bytes\n"; }

int main() {
    Buffer a(512);                      // direct-initialization
    Buffer b{1024};                     // brace initialization
    send(a);
    send(b);
    send(Buffer(64));                   // type named at the call
    send(static_cast<Buffer>(32));      // a cast is explicit too
}
```
```output
sending 512 bytes
sending 1024 bytes
sending 64 bytes
sending 32 bytes
```

```cpp
class Buffer { public: explicit Buffer(int) {} };
void send(const Buffer&) {}

int main() {
    Buffer c = 100;        // does not compile: copy-initialization needs an implicit conversion
    send(100);             // does not compile: so does passing an int
}
```

g++ says `conversion from 'int' to non-scalar type 'Buffer' requested` and `invalid initialization of reference of type 'const Buffer&' from expression of type 'int'`.

**Why it matters:** without `explicit`, `send(100)` compiles and quietly sends a new 100-byte buffer, when the caller may have meant "send the number 100". The standard library follows the same rule: `std::vector<int> v = 10;` doesn't compile because the size constructor is `explicit`, while `std::string s = "hi";` works because a string really is another form of the literal.

**When to use it:** by default on every constructor callable with one argument (and on conversion operators). Leave it off only when the conversion is natural and lossless: `std::string` from `const char*`, a `Fraction` from an `int`.

## Conversion operators

**Meaning:** a converting constructor turns another type **into** your class. A **conversion operator** turns your class **into** another type: `operator double() const`. It has no return type written; the name says it. `explicit` works here too, and matters most for `operator bool`: an `explicit operator bool()` is used only where a condition is expected (`if`, `while`, `!`, `&&`, `||`, the first part of `?:`).

```cpp
#include <iostream>

class Celsius {
    double deg;
public:
    explicit Celsius(double d) : deg(d) {}
    operator double() const { return deg; }             // Celsius -> double, implicitly
};

class Connection {
    bool open;
public:
    explicit Connection(bool o) : open(o) {}
    explicit operator bool() const { return open; }     // only in conditions
};

int main() {
    Celsius t(21.5);
    double d = t;                                       // uses operator double()
    std::cout << d + 1 << "\n";

    Connection up(true), down(false);
    if (up)    std::cout << "up is open\n";             // a condition: allowed
    if (!down) std::cout << "down is closed\n";         // ! counts as a condition too
}
```
```output
22.5
up is open
down is closed
```

**How it works:**
1. `double d = t;` calls `t.operator double()`.
2. `if (up)` calls `up.operator bool()` even though it is `explicit`: a condition counts as asking for `bool`.
3. `int n = up;` or `bool b = up;` would not compile (`cannot convert 'Connection' to 'int' in initialization`).

This is how `if (ptr)` works for smart pointers (lesson 40) and `while (std::cin >> x)` for streams. Without `explicit`, `operator bool` is a trap: `int n = up + 5;` compiles (the `bool` becomes 1) and gives 6.

## Built-in conversions and narrowing

**Meaning:** between built-in types the compiler converts freely. **Widening** (a smaller range into a bigger one, like `int` to `double`) keeps the value. **Narrowing** (into a type that can't hold every value) can silently change it.

```cpp
#include <iostream>

int main() {
    double price = 3.99;
    int big = 70000, minus = -1;

    double widened = 7;          // int -> double: exact
    int truncated = price;       // double -> int: the fraction is dropped, not rounded
    short wrapped = big;         // int -> short: 70000 doesn't fit, the value changes
    unsigned huge = minus;       // negative -> unsigned: wraps around
    bool flag = big;             // any non-zero value -> true

    std::cout << widened << " " << truncated << " " << wrapped << " " << huge << " " << flag << "\n";
}
```
```output
7 3 4464 4294967295 1
```

**How it works:**
1. On x86-64 with g++, `short` is 16 bits and `unsigned` 32 bits: 70000 keeps only its low 16 bits (4464), and -1 becomes 2^32 - 1.
2. g++ with `-Wall -Wextra` prints no warning for any of these lines. `-Wconversion` reports the `double` and `short` lines, `-Wsign-conversion` the `unsigned` one.

| Conversion | Example | Result | Safe? |
|---|---|---|---|
| `int` -> `double` (widening) | `double d = 7;` | 7 | Yes |
| `double` -> `int` | `int i = 3.99;` | 3 (truncated) | No: fraction lost |
| `int` -> `short` | `short s = 70000;` | 4464 | No: value changed |
| negative -> `unsigned` | `unsigned u = -1;` | 4294967295 | No: sign lost |
| number -> `bool` | `bool b = 42;` | `true` | Only 0 / non-0 kept |
| narrowing inside `{}` | `int x{3.7};` | compile error | Caught |

**Brace initialization** forbids narrowing:

```cpp
int main() {
    int x{3.7};          // does not compile: narrowing double -> int
}
```

g++ says `error: narrowing conversion of '3.7000000000000002e+0' from 'double' to 'int' [-Wnarrowing]`. For a non-constant (`int y{price};`) g++ only warns by default; `-Werror=narrowing` turns that into an error too.

## Common mistakes

- **Forgetting `explicit`** on a one-argument constructor: `send(100)` or `Entity e = 22;` compile and build objects nobody asked for.
- **Missing that default arguments make a converting constructor**: `Entity(int a, int b = 0)` lets `f(7)` compile for `void f(Entity)`.
- **A non-explicit `operator bool`**: arithmetic and comparisons on your object compile (`up + 5`). Write `explicit operator bool()`.
- **Relying on silent narrowing**: `int total = 2.5 * count;` drops the fraction. Use braces (`int total{...}`) to get an error, and build with `-Wconversion`.
- **Comparing signed with unsigned**: `-1 < 1u` is false, because -1 is converted to `unsigned` first. g++ warns with `-Wall` (`comparison of integer expressions of different signedness`).

## ⚠ Easily confused

- **implicit vs explicit conversion** — Implicit = the compiler converts on its own (`Entity e = 22;`, `f(22)`). Explicit = you ask for the type by name (`Entity e(22);`, `Entity(22)`, `static_cast<Entity>(22)`).
- **direct init vs copy init** — `Entity e(22);` / `Entity e{22};` = direct (works even with `explicit`). `Entity e = 22;` = copy init (needs an implicit conversion, blocked by `explicit`).
- **one vs two user conversions** — Only ONE user-defined conversion is allowed. `int` -> `Entity` = one (ok). `const char*` -> `std::string` -> `Entity` = two (error).
- **converting constructor vs conversion operator** — Converting constructor: other type -> your class (`Entity(int)`). Conversion operator: your class -> other type (`operator double() const`).
- **widening vs narrowing** — Widening keeps the value (`int` -> `double`). Narrowing may change it (`double` -> `int`, `int` -> `short`). Braces `{}` reject narrowing; `=` allows it silently.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 36).