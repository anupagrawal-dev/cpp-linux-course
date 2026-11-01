# 01 — Control Flow

*Category: C++ Core*

> Branches (if, switch) decide which statements run; loops (for, while, do-while) repeat them; break and continue steer the loops.

## Must-remember points

- **Branching** (`if` / `else if` / `else`, `switch`) picks which statements run. **Loops** (`for`, range `for`, `while`, `do-while`) repeat them.
- In a condition, any **non-zero** number or **non-null** pointer counts as `true`; `0` and `nullptr` count as `false`.
- `&&` and `||` **short-circuit**: the right side runs only if it can still change the result, so `p && p->x` is safe when `p` is null.
- `switch` works on integers, `char` and enums (not `std::string`, not `double`); `case` labels must be constants. A case that declares a variable needs `{ }`.
- `switch` needs `break` in each case or it **falls through** to the next case. Mark deliberate fall-through with `[[fallthrough]];`.
- `for (init; condition; step)` for counting, range `for (x : container)` to visit every element, `while` when the number of passes is unknown.
- `do-while` runs the body **at least once** (condition checked after).
- `break` leaves the innermost loop or `switch`; `continue` jumps to the next pass. To leave nested loops, use a flag or `return` from a function.
- Classic bugs: `=` instead of `==`, a stray `;` after `if (...)` or `for (...)`, `<=` instead of `<` (off by one). `-Wall -Wextra` catches most of them.

## if, else if, else

**Meaning:** `if` runs a block only when its condition is true. `else if` adds more conditions, tested top to bottom, and `else` catches everything left. Exactly one branch of a chain runs: the first one whose condition is true. A condition doesn't have to be a `bool`: any non-zero number and any non-null pointer count as true.

```cpp
#include <iostream>

void describe(int temp) {
    if (temp < 0) {
        std::cout << temp << ": freezing\n";
    } else if (temp < 20) {
        std::cout << temp << ": cool\n";
    } else {
        std::cout << temp << ": warm\n";
    }
}

int main() {
    describe(-5);
    describe(12);
    describe(30);

    int unread = 3;
    if (unread)                       // any non-zero number counts as true
        std::cout << "you have mail\n";

    int* p = nullptr;
    if (!p)                           // a null pointer counts as false, so !p is true
        std::cout << "p is null\n";
}
```
```output
-5: freezing
12: cool
30: warm
you have mail
p is null
```

**How it works:**
1. For `12`, `temp < 0` is false, so the next test `temp < 20` is tried. It is true, so `cool` prints and the `else` is skipped.
2. For `30`, both tests are false, so the `else` branch runs.
3. `if (unread)` means `if (unread != 0)`. `if (!p)` means `if (p == nullptr)`.

To choose between two **values** in one expression, use the conditional operator `cond ? a : b` (lesson 33).

## Logical operators and short-circuit evaluation

**Meaning:** `&&` (and), `||` (or) and `!` (not) combine conditions. `&&` and `||` evaluate left to right and **stop as soon as the result is known**. This is called short-circuit evaluation, and it lets the left side guard the right side.

| Operator | True when | Right side evaluated? |
|---|---|---|
| `a && b` | both are true | only if `a` is true |
| `a || b` | at least one is true | only if `a` is false |
| `!a` | `a` is false | (one operand) |

```cpp
#include <iostream>

bool check(const char* name, bool result) {
    std::cout << "check " << name << "\n";
    return result;
}

struct Sensor { int value = 42; };

int main() {
    if (check("A", false) && check("B", true))   // A is false: B is never called
        std::cout << "both true\n";
    if (check("C", true) || check("D", false))   // C is true: D is never called
        std::cout << "at least one true\n";
    if (!check("E", false))                      // ! turns false into true
        std::cout << "E was false\n";

    Sensor* s = nullptr;
    if (s && s->value > 10)          // safe: s->value is read only when s is not null
        std::cout << "high\n";
    else
        std::cout << "no sensor\n";
}
```
```output
check A
check C
at least one true
check E
E was false
no sensor
```

**How it works:**
1. `check("A", false)` returns false, so `&&` already knows the answer is false. `check("B", ...)` never runs: there is no `check B` line.
2. `check("C", true)` returns true, so `||` already knows the answer is true and skips `D`.
3. `s && s->value > 10`: `s` is null (false), so `s->value` is never touched. Written the other way round, `s->value > 10 && s` would dereference a null pointer first. Put the guarding test first: `i < size && v[i] == x`.

## switch

**Meaning:** `switch` compares one value against a list of constant `case` labels and jumps to the matching one. Execution then continues **downwards** until a `break` (or the end of the `switch`), so each case normally ends with `break`. `default` runs when no case matches.

Rules:
- The value must be an integer type, `char`, `bool` or an enum. A `std::string` or `double` is not allowed.
- Each `case` label must be a compile-time constant, and no two labels may be equal.
- A variable declared inside a case needs its own `{ }` block.
- Leaving out `break` on purpose is allowed. Write `[[fallthrough]];` (C++17) to say so: with `-Wextra`, g++ warns about every unmarked fall-through (`this statement may fall through`).

```cpp
#include <iostream>

void run(char cmd) {
    switch (cmd) {
    case 'a':
    case 'A':                         // two labels share one branch
        std::cout << "add\n";
        break;
    case 'd': {                       // braces, because this case declares a variable
        int count = 2;
        std::cout << "delete " << count << "\n";
        break;
    }
    case 'v':
        std::cout << "verbose, then ";
        [[fallthrough]];              // deliberate: continue into the next case
    case 'l':
        std::cout << "list\n";
        break;
    default:                          // no case matched
        std::cout << "unknown '" << cmd << "'\n";
    }
}

int main() {
    run('A');
    run('d');
    run('v');
    run('l');
    run('x');
}
```
```output
add
delete 2
verbose, then list
list
unknown 'x'
```

**How it works:**
1. `run('A')` jumps to `case 'A'`, prints `add`, and `break` leaves the `switch`. `'a'` would land on the empty `case 'a'` and fall into the same code.
2. Without the braces around `case 'd'`, g++ stops with `error: jump to case label` and `note: crosses initialization of 'int count'`: a jump to a later case would skip the creation of `count` while it is still in scope.
3. `run('v')` prints `verbose, then `, falls through into `case 'l'`, prints `list`, then breaks.
4. `'x'` matches no case, so `default` runs.

A `switch` on a string does not compile:

```cpp
#include <string>

int main() {
    std::string cmd = "add";
    switch (cmd) {          // does not compile: error: switch quantity not an integer
    case "add": break;
    }
}
```

**When to use it:**
- `switch`: one value compared with many constants, especially an enum. With `-Wall`, g++ warns `enumeration value 'Yellow' not handled in switch` when an enum switch without `default` misses a value.
- `if` / `else if`: ranges (`temp < 20`), strings, several variables, or any other condition.

## Loops: for, range for, while, do-while

**Meaning:** a loop repeats its body while a condition is true. `for (init; condition; step)` is built for counting. A range `for (int x : container)` visits each element in order, with no index to get wrong. `while (condition)` checks before every pass; `do { } while (condition);` checks after every pass.

```cpp
#include <iostream>
#include <vector>

int main() {
    for (int i = 0; i < 3; i++)            // init; condition; step
        std::cout << "for " << i << "\n";

    std::vector<int> scores = {70, 85, 90};
    int total = 0;
    for (int s : scores)                    // range-based for: each element in turn
        total += s;
    std::cout << "total " << total << "\n";

    int n = 4096, digits = 0;
    while (n > 0) {                         // repeat while the condition holds
        n /= 10;
        digits++;
    }
    std::cout << "digits " << digits << "\n";

    int tries = 0;
    do {
        tries++;                            // the body runs first...
    } while (tries < 0);                    // ...then the check: false, but the body already ran
    std::cout << "tries " << tries << "\n";
}
```
```output
for 0
for 1
for 2
total 245
digits 4
tries 1
```

**How it works:**
1. The `for` loop runs `int i = 0` once, then repeats: check `i < 3`, run the body, run `i++`. When `i` becomes 3 the check fails. `i` exists only inside the loop.
2. The range `for` copies each element into `s` in turn. To change the elements, loop with a reference, `for (int& s : scores)` (lesson 4).
3. The `while` loop divides 4096 by 10 until it reaches 0: 409, 40, 4, 0. That is 4 passes, one per digit.
4. The `do-while` body runs once before `tries < 0` is checked for the first time.

| Loop | Condition checked | Runs at least once? | Use it when |
|---|---|---|---|
| `for` | before each pass | no | counting, or stepping through an index range |
| range `for` | (none: once per element) | no | visiting every element of a container or array |
| `while` | before each pass | no | repeating until something happens, number of passes unknown |
| `do-while` | after each pass | yes | the body must run once first (read input, then validate it) |

## break, continue and nested loops

**Meaning:** `break` leaves the innermost loop (or `switch`) immediately. `continue` skips the rest of the current pass and goes on with the next one (in a `for`, the step still runs). `while (true)` is a loop whose exit is a `break` somewhere inside it.

```cpp
#include <iostream>

int main() {
    for (int i = 1; i <= 6; i++) {
        if (i % 2 == 0) continue;           // skip even numbers: go to the next pass
        if (i == 5) break;                  // leave the loop completely
        std::cout << i << " ";
    }
    std::cout << "\n";

    bool found = false;                     // break leaves only the inner loop,
    for (int row = 0; row < 3 && !found; row++) {   // so the outer loop checks a flag
        for (int col = 0; col < 3; col++) {
            if (row * col == 2) {
                std::cout << "found at " << row << "," << col << "\n";
                found = true;
                break;
            }
        }
    }

    int total = 0;
    while (true) {                          // the exit test is in the middle
        total += 7;
        if (total > 20) break;
    }
    std::cout << "total " << total << "\n";
}
```
```output
1 3
found at 1,2
total 21
```

**How it works:**
1. `i = 2` and `i = 4` hit `continue`, so nothing prints for them. At `i = 5`, `break` ends the loop before 5 prints.
2. In the grid search, `break` only leaves the `col` loop. The outer loop's condition `!found` then stops the `row` loop too.
3. Two other ways out of nested loops: move the loops into a function and `return` from it (usually the clearest), or `goto` a label after the loops (legal, rarely used).
4. The `while (true)` loop adds 7 until the total passes 20: 7, 14, 21.

## Common mistakes

- **`=` instead of `==`.** `if (x = 5)` assigns 5 and is always true. g++ `-Wall` warns: `suggest parentheses around assignment used as truth value`.
- **A stray semicolon.** `if (x > 0);` and `for (...);` end with an empty statement, so the block below runs once, unconditionally. g++ warns (`suggest braces around empty body in an 'if' statement`, `this 'for' clause does not guard...`).
- **Off by one.** For an array of `n` elements the valid indexes are `0` to `n - 1`: write `i < n`, not `i <= n`. Reading `a[n]` is out of bounds (undefined behaviour, lesson 20).
- **Missing `break`** in a `switch`: the next case runs too.
- **`break` inside a `switch` inside a loop** leaves only the `switch`, not the loop.
- **Counting down with `unsigned`.** `for (unsigned i = n - 1; i >= 0; i--)` never ends: an unsigned value is never below 0, it wraps to a huge number. g++ `-Wextra` warns `comparison of unsigned expression in '>= 0' is always true`. Use a signed `int` for a downward loop.
- **Missing braces.** Only the first statement after `if`/`for`/`while` is guarded; an indented second line is not.
- **`&` or `|` instead of `&&` or `||`.** The bitwise operators always evaluate both sides, so `p & p->x` does not protect against a null `p`.

## ⚠ Easily confused

- **while vs do-while** — `while` checks the condition BEFORE the first run (may run 0 times); `do-while` checks AFTER (runs at least once).
- **= vs ==** — `=` assigns; `==` compares. `if (x = 5)` stores 5 in `x`, and the condition is then always true: a classic bug that `-Wall` warns about.
- **break vs continue** — `break` leaves the innermost loop (or `switch`) completely. `continue` skips the rest of this pass and starts the next one.
- **&& vs &** — `&&` is logical and: it **short-circuits** (skips the right side when the left is false). `&` is bitwise and: it always evaluates both sides.
- **switch vs if-else chain** — `switch` compares **one** integer, char or enum value with constant labels. An `if`/`else if` chain can test anything: ranges, strings, several variables.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 01).