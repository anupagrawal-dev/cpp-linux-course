# 10 — Enums

*Category: C++ Core*

> An enum gives names to a fixed set of integer values. Prefer `enum class`: its names are scoped and it never converts to `int` by accident.

## Must-remember points

- An **enum** is a type whose values are a fixed list of named integer constants. Values start at 0 and count up by 1 unless assigned: `enum E { A = 3, B, C };` gives B = 4, C = 5.
- Stored as an integer, the **underlying type**: `int` for an `enum class`, compiler-chosen for a plain `enum` (usually 4 bytes with g++). `: std::uint8_t` makes it 1 byte.
- **Plain `enum`**: names leak into the enclosing scope (two enums can't both have `Red`) and it **converts to `int` silently**.
- **`enum class`** (C++11): names are **scoped** (`Color::Red`), **no implicit conversion** to `int` or between enums. The default choice.
- Convert on purpose with **`static_cast`**, both ways: `static_cast<int>(c)`, `static_cast<Color>(n)`. Check an incoming `int` first: a value with no enumerator has no name.
- C++ can't print an enum's name: write a function with a **`switch`**. Without `default`, `-Wall` warns when an enumerator isn't handled.
- Typical uses: **states** (state machines), **options** (instead of a `bool` parameter), **bit flags** (1, 2, 4 combined with `|`).

## What an enum is

**Meaning:** an enum (enumeration) is a type with a fixed list of named integer values, the **enumerators**. Instead of remembering that 2 means "high", you write `High`, and a parameter of type `Level` says which values make sense.

```cpp
#include <iostream>

enum Level { Low, Medium, High };                       // 0, 1, 2
enum HttpCode { Ok = 200, Created, NotFound = 404 };    // Created = 201

void setLevel(Level l) { std::cout << "level " << l << "\n"; }

int main() {
    setLevel(High);
    // setLevel(2);                     // would not compile: an int doesn't convert to Level
    std::cout << Ok << " " << Created << " " << NotFound << "\n";
    int n = High + 10;                  // but a plain enum converts to int on its own
    std::cout << n << "\n";
}
```
```output
level 2
200 201 404
12
```

**How it works:**
1. An enumerator without a value is the previous one plus 1, so `Created` is 201.
2. `setLevel(2)` fails with `invalid conversion from 'int' to 'Level'`: even a plain enum is its own type.
3. The other direction is automatic: `High + 10` turns the enum into an `int`.

## Plain enum vs enum class

**Meaning:** a plain `enum` has two problems. Its names go into the surrounding scope, so `enum Color { Red };` and `enum Light { Red };` can't coexist (`'Red' conflicts with a previous declaration`). And it converts to `int` silently, so mistakes compile. An `enum class` keeps its names inside the type and converts to nothing implicitly.

```cpp
#include <iostream>

enum Color { Red, Green, Blue };              // plain: Red, Green, Blue are global names
enum Fruit { Apple, Banana };
enum class Light { Red, Amber, Green };       // scoped: no clash with Color's Red and Green

void paint(int colorCode) { std::cout << "colour " << colorCode << "\n"; }

int main() {
    paint(Banana);                            // compiles: Banana silently becomes 1 (Green)
    std::cout << Apple + Blue << "\n";        // arithmetic on unrelated enums compiles too

    Light l = Light::Red;                     // the name must be qualified
    // paint(l);                              // would not compile: cannot convert 'Light' to 'int'
    if (l == Light::Red) std::cout << "stop " << static_cast<int>(l) << "\n";
}
```
```output
colour 1
2
stop 0
```

**How it works:**
1. `paint(Banana)` passes a fruit as a colour, and nothing stops it. `Red == Apple` also compiles; g++ only warns `comparison between 'enum Color' and 'enum Fruit'`.
2. `Light::Red` doesn't clash with `Color`'s `Red`. A `Light` compares only with a `Light`: `l == Apple` would not compile.

| | Plain `enum` | `enum class` |
|---|---|---|
| Names | leak into the enclosing scope: `Red` | scoped: `Light::Red` |
| To `int` | implicit | only `static_cast` |
| From `int` | only `static_cast` | only `static_cast` |
| Compare two different enums | compiles (warning) | doesn't compile |
| Default underlying type | chosen by the compiler | `int` |
| Use for | C headers, old code, bit flags | everything else |

## Underlying type and sizeof

**Meaning:** an enum value is stored as an integer of its **underlying type**. An `enum class` uses `int` unless you name another type after a colon; for a plain enum the compiler picks a type large enough for its values. A small type saves memory in structs, arrays, files and network packets.

```cpp
#include <cstdint>
#include <iostream>

enum Plain { A, B, C };                                  // the compiler picks the type
enum class Scoped { X, Y };                              // int by default
enum class Color : std::uint8_t { Red, Green, Blue };    // fixed: 1 byte

struct Pixel  { Color c;  std::uint8_t alpha; };         // 1 + 1 bytes
struct Pixel4 { Scoped s; std::uint8_t alpha; };         // 4 + 1, padded to 8

int main() {
    std::cout << sizeof(Plain) << " " << sizeof(Scoped) << " " << sizeof(Color) << "\n";
    std::cout << sizeof(Pixel) << " " << sizeof(Pixel4) << "\n";
}
```
```output
4 4 1
2 8
```

**How it works:**
1. Sizes are for g++ on x86-64. A plain enum with a value above 4 billion would get 8 bytes.
2. `: std::uint8_t` makes `Color` one byte, so `Pixel` is 2 bytes instead of 8.
3. A value that doesn't fit is rejected: `Red = 300` gives `enumerator value '300' is outside the range of underlying type 'uint8_t'`.

## A complete example: enum class with switch

**Meaning:** a **state machine** is in exactly one state at a time and moves to another when an event happens. An `enum class` lists the states and a `switch` holds the rules (switch basics: lesson 1). C++ keeps no enum names at run time, so printing a name needs a function that maps each value to a string.

```cpp
#include <iostream>

enum class State { Idle, Playing, Paused };

const char* name(State s) {                    // map each value to its name
    switch (s) {
        case State::Idle:    return "Idle";
        case State::Playing: return "Playing";
        case State::Paused:  return "Paused";
    }
    return "unknown";                          // a cast can create a value with no name
}

State pressPlay(State s) {                     // the rules: one case per state
    switch (s) {
        case State::Idle:    return State::Playing;
        case State::Playing: return State::Paused;
        case State::Paused:  return State::Playing;
    }
    return s;
}

int main() {
    State s = State::Idle;
    for (int i = 0; i < 3; i++) {
        s = pressPlay(s);
        std::cout << name(s) << " = " << static_cast<int>(s) << "\n";   // enum -> int
    }
    int saved = 0;                             // e.g. read back from a file
    if (saved >= 0 && saved <= 2)              // check, then int -> enum
        std::cout << "restored " << name(static_cast<State>(saved)) << "\n";
    std::cout << name(static_cast<State>(7)) << "\n";   // allowed, but no enumerator is 7
}
```
```output
Playing = 1
Paused = 2
Playing = 1
restored Idle
unknown
```

**How it works:**
1. `static_cast<int>(s)` gives the number; `static_cast<State>(saved)` turns a number back into a `State`, after a range check.
2. `static_cast<State>(7)` is allowed (an `enum class` can hold any `int`), but no case matches, so `name` reaches the fallback `return`. Without it, g++ warns `control reaches end of non-void function`.
3. No `default` on purpose: add `Stopped` to `State`, and `-Wall` reports `enumeration value 'Stopped' not handled in switch` at every switch that misses it.

## Options and bit flags

**Meaning:** `openFile("log.txt", true)` says nothing at the call site; `openFile("log.txt", Mode::ReadWrite)` does. When several options can be on at once, give each enumerator its own bit (1, 2, 4, ...) and combine them with `|`: **bit flags**, like file permissions (r = 4, w = 2, x = 1, lesson 30).

```cpp
#include <iostream>
#include <string>

enum class Mode { ReadOnly, ReadWrite };                 // an option

void openFile(const std::string& path, Mode m) {
    std::cout << path << (m == Mode::ReadOnly ? " read-only\n" : " read-write\n");
}

enum Perm : unsigned { PermExec = 1, PermWrite = 2, PermRead = 4 };   // one bit each

int main() {
    openFile("log.txt", Mode::ReadWrite);
    unsigned p = PermRead | PermWrite;                   // combine with |  (6, like rw-)
    if (p & PermWrite) std::cout << p << " can write\n"; // test a flag with &
    p &= ~PermWrite;                                     // clear a flag
    std::cout << p << "\n";
}
```
```output
log.txt read-write
6 can write
4
```

**How it works:**
1. `Mode` names the option; the compiler rejects anything that isn't a `Mode`.
2. `PermRead | PermWrite` sets two bits: 4 + 2 = 6. `&` tests one bit; `&= ~flag` clears it.
3. Flags are where a plain enum is handy: `|` works because it converts to `unsigned`. With an `enum class`, `|` gives `no match for 'operator|'` until you overload it (lesson 37).

## Common mistakes

- **Printing a 1-byte enum.** `uint8_t` is a `char` type, so `std::cout << static_cast<std::uint8_t>(Color::Blue)` prints the invisible byte 2, not the digit `2`. Cast to `int`.
- **Casting unchecked input.** `static_cast<Color>(n)` accepts any `n`; check the range first. For a plain enum **without** `: type`, a value outside its range is undefined behaviour (for `enum Plain { A, B, C }` the range is 0 to 3).
- **`default` in every enum switch.** It silences the warning that a new enumerator isn't handled.
- **Plain enums with common names.** `enum Status { Error, Ok };` puts `Error` and `Ok` in the global scope. Use `enum class`.

## ⚠ Easily confused

- **enum vs enum class** — Plain `enum` leaks names and converts to int implicitly. `enum class` is scoped and type-safe (no implicit int conversion).
- **enum vs enumerator** — The **enum** is the type (`Color`). An **enumerator** is one of its named values (`Color::Red`).
- **enum vs const int constants** — Separate `const int`s are unrelated numbers; any int fits where they are used. An enum is one type the compiler checks: `setLevel(2)` is rejected.
- **switch with vs without default** — With `default`, g++ can't warn about a forgotten enumerator. Without it, `-Wall` warns `enumeration value 'X' not handled in switch`.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 10).