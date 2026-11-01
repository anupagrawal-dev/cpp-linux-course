# 33 — Ternary Operator

*Category: C++ Core*

> The conditional operator cond ? a : b picks one of two values inside an expression.

## Must-remember points

- Real name: **conditional operator**, the only operator with **three** operands: `cond ? a : b` gives `a` if `cond` is true, else `b`.
- It is an **expression** (it yields a value), not a statement, so it works inline: initializing a variable or a `const`, in a `return`, as a function argument.
- Only the **chosen** branch is evaluated, so `p ? *p : 0` is safe.
- Both branches need a **common type**: `int` and `double` give `double`; `int` and `const char*` don't compile. Mixing `int` and `unsigned` gives `unsigned` (-1 becomes 4294967295).
- Low precedence: inside `<<` wrap it in parentheses, `std::cout << (c ? "a" : "b");`. Without them g++ prints `c` and warns.
- Use it to choose between **two values**. For actions, several statements or more than one condition, `if/else` or `switch` reads better.

## Syntax and where it fits

**Meaning:** `cond ? a : b` evaluates `cond`; if it is true the whole expression is `a`, otherwise `b`. Because it produces a value, it can go anywhere a value is needed, which `if/else` can't.

```cpp
#include <iostream>
#include <string>

std::string plural(int n) {
    return n == 1 ? "item" : "items";        // in a return statement
}

int main() {
    int a = 3, b = 7;
    int biggest = (a > b) ? a : b;           // initialize a variable
    const int limit = (a < b) ? 5 : 15;      // a const must get its value at once

    int* p = nullptr;
    int value = p ? *p : 0;                  // *p is evaluated only when p is not null

    std::cout << biggest << " " << limit << " " << value << "\n";
    std::cout << "1 " << plural(1) << ", " << a << " " << plural(a) << "\n";   // as an argument
}
```
```output
7 5 0
1 item, 3 items
```

**How it works:**
1. `a > b` is false, so `biggest` gets `b` (7). `a < b` is true, so `limit` gets 5.
2. A `const` must be initialized in its declaration. With `if/else` you would have to declare it first and assign later, which `const` forbids; the ternary does it in one step.
3. `p` is null, so only `0` is evaluated. `*p` never runs, so there is no null dereference.
4. `plural(n)` returns one of two string literals.

## The result type: a common type

**Meaning:** the whole expression has **one** type, fixed at compile time, whichever branch is chosen. If the branches differ, the compiler converts them to a common type. If there is none, it is an error.

```cpp
#include <iostream>
#include <string>
#include <type_traits>

int main() {
    bool flag = true;
    auto v = flag ? 1 : 2.5;                                  // int and double -> double
    std::cout << v << " is double: " << std::is_same_v<decltype(v), double> << "\n";

    std::string s = flag ? std::string("text") : "literal";  // const char* converts to std::string
    std::cout << s << "\n";

    int n = -1;
    unsigned u = 1;
    std::cout << (flag ? n : u) << "\n";                     // int and unsigned -> unsigned
}
```
```output
1 is double: 1
text
4294967295
```

**How it works:**
1. `1` and `2.5` meet at `double`, so `v` is the double `1.0` (printed as `1`) even though the `int` branch was chosen.
2. A `std::string` and a string literal meet at `std::string`.
3. `int` and `unsigned` meet at `unsigned`, so the chosen `-1` turns into 4294967295 (32-bit `unsigned`). This is a real source of bugs.

With no common type, it doesn't compile:

```cpp
int main() {
    bool c = true;
    auto x = c ? 5 : "hi";       // does not compile: int vs const char*
}
```

g++ says: `error: operands to '?:' have different types 'int' and 'const char*'`.

## Precedence: parentheses inside <<

**Meaning:** `?:` has very low precedence, lower than `<<`. Without parentheses, `std::cout << ok ? "yes" : "no"` is read as `(std::cout << ok) ? "yes" : "no"`: it prints `ok` and then throws the strings away.

```cpp
#include <iostream>

int main() {
    bool ok = true;
    std::cout << ok ? "yes" : "no";          // parsed as (std::cout << ok) ? "yes" : "no"
    std::cout << "\n";
    std::cout << (ok ? "yes" : "no") << "\n";
}
```
```output
1
yes
```

**How it works:**
1. The first line prints `ok` (as `1`). g++ with `-Wall` warns: `second operand of conditional expression has no effect`.
2. The parentheses make the ternary run first, so its result is what gets printed.
3. `=` and initialization take the whole ternary as their value, so `int m = c ? a : b;` needs no parentheses.

## Nesting, and when to use if/else instead

**Meaning:** a branch can itself be a ternary, which makes a chain of conditions. It is legal, but quickly hard to read. If you nest, put one condition per line.

```cpp
#include <iostream>

char gradeTernary(int score) {
    return score >= 90 ? 'A'
         : score >= 75 ? 'B'
         : score >= 50 ? 'C'
         :               'F';
}

char gradeIf(int score) {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 50) return 'C';
    return 'F';
}

int main() {
    for (int s : {95, 80, 60, 10})
        std::cout << gradeTernary(s) << gradeIf(s) << " ";
    std::cout << "\n";
}
```
```output
AA BB CC FF
```

Both give the same results, but the `if` version is easier to extend and to step through in a debugger.

| | Ternary `?:` | `if` / `else` |
|---|---|---|
| Kind | Expression: produces a value | Statement: runs code |
| Initialize a `const` or a reference | Yes, in one step | No: needs declare-then-assign |
| Inside a `return`, a call, `<<` | Yes | No |
| Several statements per branch | No | Yes |
| Branch types | Must have a common type | No restriction |
| Many conditions | Hard to read | Clear (or `switch`) |
| Best for | Choosing between two values | Choosing between actions, longer logic |

## Common mistakes

- **Missing parentheses inside `<<`**: `std::cout << ok ? "yes" : "no";` prints `ok`; `std::cout << x > 0 ? "pos" : "neg";` doesn't even compile (`no match for 'operator>'`). Write `std::cout << (x > 0 ? "pos" : "neg");`.
- **Mixing signed and unsigned branches**: `flag ? -1 : size` (where `size` is unsigned) gives a huge positive number instead of -1.
- **Expecting the chosen branch's own type**: `auto v = flag ? 1 : 2.5;` is a `double` even when `1` is chosen.
- **Using it for actions**: `ok ? save() : report();` compiles when both return the same type, but `if (ok) save(); else report();` says what it means.
- **Deep nesting on one line**: `a ? b ? x : y : z` is legal and almost unreadable. Use `if/else` or one condition per line.

## ⚠ Easily confused

- **ternary vs if/else** — Ternary is an expression that yields a value (works inline, can initialize a `const`). `if/else` is a statement that runs code and yields nothing.
- **same type vs common type** — Branches don't need the SAME type, they need a COMMON type. `int`/`double` gives `double`; `int`/string literal is an error; `int`/`unsigned` gives `unsigned`.
- **?: vs << precedence** — `<<` binds tighter than `?:`, so wrap the ternary in parentheses inside a `cout` statement.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 33).