# 22 — Exceptions & try/catch

*Category: C++ Language & Safety*

> `throw` reports an error, the nearest matching `catch` up the call chain handles it, and destructors clean up on the way. Uncaught means `std::terminate`.

## Must-remember points

- `throw` raises an exception; control jumps to the nearest matching `catch` **up the call chain**, skipping the rest of the `try` block. `.at()` throws `std::out_of_range` on a bad index.
- An **uncaught** exception calls `std::terminate`: "terminate called after throwing an instance of ...", then the program aborts. The crash means nobody handled the error.
- Standard hierarchy: everything derives from **`std::exception`** (`what()` gives the message). **`logic_error`** (`out_of_range`, `invalid_argument`, `length_error`) = bugs in the program's logic; **`runtime_error`** = conditions only known at run time; **`bad_alloc`** = `new` failed.
- Write your own exception by deriving from **`std::runtime_error`** (or `logic_error`) and passing the message to its constructor; add fields for extra details.
- **Catch by `const&`** (no copy, no slicing). Order handlers **most-derived first**; `catch (...)` catches anything. Inside a handler, **`throw;`** rethrows the same object.
- **Stack unwinding**: while the exception travels up, every local object in the frames it leaves is **destroyed**. That is why RAII cleanup works with exceptions (lesson 12).
- A throwing **constructor** means the object never existed: its destructor doesn't run, but members already built are destroyed. **Destructors must not throw** (they are `noexcept`; a throw calls `terminate`). `noexcept` marks functions that never throw.
- **Exceptions** for rare errors the direct caller can't handle; **error codes / `std::optional`** for expected failures, hot paths and code built without exceptions.

## throw, try and catch

**Meaning:** when a function hits an error it can't handle, it **throws** an exception object. The program stops running normal code and goes back up the call chain until it finds a `try` block with a matching `catch` handler. Code after the `throw` inside the `try` is skipped; after the handler, execution continues below the `try`/`catch`.

```cpp
#include <iostream>
#include <stdexcept>
#include <vector>

int readItem(const std::vector<int>& v, std::size_t i) {
    return v.at(i);                              // throws std::out_of_range if i is too big
}

int main() {
    std::vector<int> v = {10, 20, 30};
    try {
        std::cout << readItem(v, 1) << "\n";
        std::cout << readItem(v, 10) << "\n";    // throws: the rest of the try block is skipped
        std::cout << "not printed\n";
    } catch (const std::out_of_range& e) {
        std::cout << "error: " << e.what() << "\n";
    }
    std::cout << "still running\n";
}
```
```output
20
error: vector::_M_range_check: __n (which is 10) >= this->size() (which is 3)
still running
```

**How it works:**
1. `readItem(v, 10)` calls `v.at(10)`, which throws. `readItem` ends immediately, without returning a value.
2. The exception lands in the `catch` for `std::out_of_range`. `e.what()` returns the message (this one comes from libstdc++).
3. The program then continues after the handler.

Without the `try`/`catch`, nothing handles it, and the program ends:

```bash
$ ./uncaught
terminate called after throwing an instance of 'std::out_of_range'
  what():  vector::_M_range_check: __n (which is 10) >= this->size() (which is 3)
Aborted
$ echo $?
134
```

The abort is not a bug in `.at()`: it did its job by reporting the bad index. The bug is that no code handled it.

## The standard exception hierarchy

**Meaning:** the library's exceptions all derive from `std::exception`, so one `catch (const std::exception& e)` handles any of them. The two main branches say what kind of error it is.

| Class | Meaning | Thrown by (examples) |
|---|---|---|
| `std::logic_error` | a mistake the program could have avoided | base of the next four |
| `std::out_of_range` | index or value outside the allowed range | `vector::at`, `string::at`, `std::stoi` on a huge number |
| `std::invalid_argument` | argument makes no sense | `std::stoi("abc")` |
| `std::length_error` | a size above the maximum | `vector::reserve(v.max_size() + 1)` |
| `std::runtime_error` | a problem only detectable at run time | base for your own errors (file, network, config) |
| `std::system_error` | an OS error with an error code | `std::thread`, `std::filesystem` |
| `std::bad_alloc` | memory allocation failed | `new`, any container growing |

```cpp
#include <iostream>
#include <new>
#include <stdexcept>
#include <string>
#include <vector>

void fail(int which) {
    std::vector<int> v(3);
    switch (which) {
        case 0: v.at(5) = 1; break;                       // std::out_of_range
        case 1: v[0] = std::stoi("abc"); break;           // std::invalid_argument
        case 2: v.reserve(v.max_size() + 1); break;       // std::length_error
        case 3: throw std::runtime_error("disk full");    // std::runtime_error
        case 4: { std::vector<char> big(1ULL << 50); }    // std::bad_alloc: asks for 1 PiB
    }
}

int main() {
    for (int i = 0; i < 5; i++) {
        try {
            fail(i);
        } catch (const std::logic_error& e) {
            std::cout << "logic_error:   " << e.what() << "\n";
        } catch (const std::runtime_error& e) {
            std::cout << "runtime_error: " << e.what() << "\n";
        } catch (const std::bad_alloc& e) {
            std::cout << "bad_alloc:     " << e.what() << "\n";
        }
    }
}
```
```output
logic_error:   vector::_M_range_check: __n (which is 5) >= this->size() (which is 3)
logic_error:   stoi
logic_error:   vector::reserve
runtime_error: disk full
bad_alloc:     std::bad_alloc
```

**How it works:** the first three all derive from `logic_error`, so one handler catches them: a base-class handler catches every derived class.

## Your own exception class

**Meaning:** to report errors of your own, derive a class from `std::runtime_error` (or `std::logic_error`). Pass the message to the base constructor, so `what()` works, and add members for details the handler may need. Callers can then catch your specific type, or just `std::exception`.

```cpp
#include <iostream>
#include <stdexcept>
#include <string>

class ConfigError : public std::runtime_error {
public:
    ConfigError(const std::string& key, int line)
        : std::runtime_error("bad value for '" + key + "'"), line_(line) {}
    int line() const { return line_; }               // extra information for the handler
private:
    int line_;
};

void loadConfig() { throw ConfigError("port", 12); }

int main() {
    try {
        loadConfig();
    } catch (const ConfigError& e) {                  // the specific type: can read line()
        std::cout << e.what() << " on line " << e.line() << "\n";
    } catch (const std::exception& e) {               // everything else in the standard family
        std::cout << "other error: " << e.what() << "\n";
    }
}
```
```output
bad value for 'port' on line 12
```

**How it works:**
1. The first handler matches the exact type and can call `line()`.
2. Code that knows nothing about `ConfigError` can still catch it as `std::exception`.
3. Throw **by value** and catch **by `const&`**. Never `throw new ConfigError(...)`: then someone must `delete` it, and handlers for `ConfigError&` don't match a pointer.

## Several handlers, catch (...) and rethrow

**Meaning:** handlers are tried **in order**, and the first one that matches wins. So put the **most derived** class first and its bases after it. `catch (...)` matches anything, including non-class types. Inside a handler, a bare **`throw;`** sends the **same** exception object on up the chain, for example after logging it.

```cpp
#include <iostream>
#include <stdexcept>

void parse(int kind) {
    if (kind == 0) throw std::invalid_argument("not a number");
    if (kind == 1) throw std::runtime_error("file missing");
    throw 42;                                         // anything can be thrown, even an int
}

void parseLogged(int kind) {
    try {
        parse(kind);
    } catch (const std::exception& e) {
        std::cout << "log: " << e.what() << "\n";
        throw;                                        // rethrow the same object, real type kept
    }
}

int main() {
    for (int k = 0; k < 3; k++) {
        try {
            parseLogged(k);
        } catch (const std::invalid_argument&) {      // most derived first
            std::cout << "bad input\n";
        } catch (const std::exception& e) {           // then its base
            std::cout << "failed: " << e.what() << "\n";
        } catch (...) {                               // anything else
            std::cout << "unknown exception\n";
        }
    }
}
```
```output
log: not a number
bad input
log: file missing
failed: file missing
unknown exception
```

**How it works:**
1. `parseLogged` logs and rethrows. `throw;` rethrows the original object, so `main` still sees an `invalid_argument`.
2. `throw e;` instead would throw a **copy of the static type** `std::exception` (sliced), and `main` would print `failed:`.
3. The `int` is not a `std::exception`, so only `catch (...)` matches it.
4. With a base handler first, the derived one could never run; g++ warns: `exception of type 'std::out_of_range' will be caught by earlier handler [-Wexceptions]`.

## Stack unwinding: destructors still run

**Meaning:** while an exception travels up to its handler, the runtime leaves each function on the way, and **destroys every local object** in those frames, in reverse order of construction. This is **stack unwinding**. Resources held by objects with destructors (locks, files, smart pointers) are released even though the normal path never finished. Tying cleanup to destructors is RAII (lesson 12).

```cpp
#include <iostream>
#include <stdexcept>

struct Guard {                                   // stands for a lock, a file, a buffer...
    const char* name;
    explicit Guard(const char* n) : name(n) { std::cout << "acquire " << name << "\n"; }
    ~Guard() { std::cout << "release " << name << "\n"; }
};

void inner() {
    Guard g("lock");
    throw std::runtime_error("inner failed");
}

void outer() {
    Guard g("file");
    inner();
    std::cout << "never printed\n";
}

int main() {
    try {
        outer();
    } catch (const std::exception& e) {
        std::cout << "caught: " << e.what() << "\n";
    }
}
```
```output
acquire file
acquire lock
release lock
release file
caught: inner failed
```

**How it works:** the throw leaves `inner` (destroying `lock`), then `outer` (destroying `file`), and only then runs the handler. A raw `new` with a `delete` further down would leak: the `delete` line is skipped.

## Constructors, destructors and noexcept

**Meaning:**
- A constructor has no return value, so **throwing is how it reports failure**. The object never existed: its destructor does **not** run, but members and bases already built **are** destroyed.
- **Destructors must not throw.** They are `noexcept` by default, so an exception leaving one calls `std::terminate`.
- **`noexcept`** promises a function never throws (if it does, `std::terminate` is called). The operator `noexcept(expr)` asks whether an expression can throw.

```cpp
#include <iostream>
#include <stdexcept>

struct Part {
    Part()  { std::cout << "Part built\n"; }
    ~Part() { std::cout << "Part destroyed\n"; }
};

class Widget {
    Part part;                                        // built before the constructor body runs
public:
    explicit Widget(int size) {
        if (size < 0) throw std::invalid_argument("negative size");
        std::cout << "Widget built\n";
    }
    ~Widget() { std::cout << "Widget destroyed\n"; }
};

int add(int a, int b) noexcept { return a + b; }       // promise: never throws

int main() {
    try {
        Widget w(-1);
    } catch (const std::exception& e) {
        std::cout << "caught: " << e.what() << "\n";
    }
    std::cout << add(2, 3) << " " << noexcept(add(2, 3)) << " " << noexcept(Widget(1)) << "\n";
}
```
```output
Part built
Part destroyed
caught: negative size
5 1 0
```

**How it works:**
1. `part` is fully built, then the constructor body throws. `part` is destroyed; `~Widget` never runs, because no `Widget` was completed.
2. `noexcept(add(2, 3))` is 1 (true); `noexcept(Widget(1))` is 0, because the constructor may throw.
3. A `throw` inside a destructor gets the warning `'throw' will always call 'terminate' [-Wterminate]`, with the note `in C++11 destructors default to 'noexcept'`.
4. `noexcept` matters for performance too: `std::vector` moves elements during reallocation only if their move constructor is `noexcept`; otherwise it copies them (lesson 43).

## Exceptions vs error codes

**Meaning:** an **exception** can't be ignored and travels up automatically. An **error value** (a status code, `bool`, `std::optional`, C++23 `std::expected`) is returned normally and the caller must check it. C APIs and Linux system calls use error codes: they return `-1` and set `errno`.

```cpp
#include <charconv>
#include <iostream>
#include <optional>
#include <stdexcept>
#include <string>

std::optional<int> tryParse(const std::string& s) {      // error-value style: empty = failed
    int v = 0;
    auto [end, ec] = std::from_chars(s.data(), s.data() + s.size(), v);
    if (ec != std::errc() || end != s.data() + s.size()) return std::nullopt;
    return v;
}

int parseOrThrow(const std::string& s) {                 // exception style, built on top
    if (auto v = tryParse(s)) return *v;
    throw std::invalid_argument("not a number: " + s);
}

int main() {
    try {
        std::cout << parseOrThrow("40") + parseOrThrow("2x") << "\n";   // no checks on the happy path
    } catch (const std::invalid_argument& e) {
        std::cout << "exception: " << e.what() << "\n";
    }
    if (auto v = tryParse("2x")) std::cout << *v << "\n";               // the caller must check
    else                         std::cout << "optional: empty\n";
}
```
```output
exception: not a number: 2x
optional: empty
```

| | Exceptions | Error codes / `std::optional` |
|---|---|---|
| Can be ignored by mistake | no: unhandled, the program stops | yes, unless checked (`[[nodiscard]]` helps) |
| Happy-path code | clean, no checks | an `if` after every call |
| Passing the error up several levels | automatic | every level must forward it |
| Cost when nothing fails | almost none with g++ (handlers are found through tables) | a check per call |
| Cost when it fails | high: unwinding and table lookups | cheap |
| Works in constructors and operators | yes | no return value to use |
| Visible in the signature | no | yes |

**When to use which:**
- **Exceptions** for errors that are rare and that the direct caller can't fix: a constructor that can't build its object, a missing file deep inside a loader, out of memory.
- **Error values** for outcomes that are normal (lookup not found, user typed bad input), in hot loops, and in code built with `-fno-exceptions` (common in embedded systems and some game engines).

## Common mistakes

- **Catching by value.** `catch (std::exception e)` copies and slices: a derived exception loses its type and its `what()`. Catch `const&`.
- **Base handler before derived.** The derived handler never runs. Order: most derived first, `std::exception` next, `...` last.
- **`throw e;` instead of `throw;`** when rethrowing. It throws a sliced copy.
- **Throwing pointers.** `throw new MyError` leaks and doesn't match `catch (const MyError&)`. Throw by value.
- **Swallowing errors.** `catch (...) {}` hides every failure, including bugs. Log or rethrow.
- **Throwing from a destructor.** It calls `std::terminate`. Report errors another way (a `close()` function that can throw).
- **Manual cleanup between `new` and `delete`.** A throw in between skips the `delete`. Use smart pointers and other RAII types (lessons 12, 40).
- **Exceptions for normal control flow** (ending a loop, "not found"). They are slow when thrown and hide the real flow. Return a value instead.

## ⚠ Easily confused

- **uncaught throw vs bug in .at()** — The abort comes from nobody catching the exception. `.at()` did its job by detecting the bad index.
- **catch by value vs by reference** — Catch by `const&`. Catching by value copies the exception and slices it to the handler's type.
- **throw; vs throw e;** — `throw;` rethrows the original object with its real type. `throw e;` throws a new copy of `e`'s static type (sliced).
- **logic_error vs runtime_error** — `logic_error`: a mistake the program could have avoided (bad index, bad argument). `runtime_error`: a problem only visible at run time (file missing, network down).
- **noexcept specifier vs noexcept operator** — `void f() noexcept` promises f never throws (a throw calls `terminate`). `noexcept(expr)` asks at compile time whether `expr` can throw, giving true or false.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 22).