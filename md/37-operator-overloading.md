# 37 — Operators & Operator Overloading

*Category: C++ Core*

> An operator is a function with a special name. Overloading it gives your own type natural syntax (a + b, a == b, cout << a, v[i]), chosen by the operand types at compile time.

## Must-remember points

- An operator is a **function with a special name** (`operator+`, `operator==`, `operator<<`): `a + b` calls `a.operator+(b)` or `operator+(a, b)`. The compiler picks it from the operand types: **compile-time polymorphism**.
- Two forms: **member** (left operand is `*this`) and **free function** (both operands are parameters). Use a free function when the left operand isn't your class (`std::cout << v`, `3 * m`). Declare it **`friend`** if it needs private members.
- Return **by value** for arithmetic (`+` makes a new object); return `*this` **by reference** for `=` and compound assignment (`+=`), so calls chain.
- `operator<<` is a **free** function that takes and returns `std::ostream&`, so `std::cout << a << b` chains.
- Comparisons: `==`, `<` (and C++20's `<=>`, which can be `= default`) return `bool`; `std::sort` uses `<`. Mark them `const`.
- `++x` is `T& operator++()`; `x++` is `T operator++(int)`: a dummy `int`, and it returns the **old copy**, so prefix is cheaper.
- `operator[]` returns a **reference** so `v[i] = 5` works; provide a `const` version for const objects.
- Limits: no new operators, no change of precedence or number of operands, at least one operand of your type; `::`, `.`, `.*`, `?:`, `sizeof` can't be overloaded. Keep the operator's natural meaning.

## An operator is a function

**Meaning:** for your own types, `a + b` means nothing until you write a function named `operator+`. The compiler then rewrites the expression as a call to it. The usual parameter style applies: take operands as `const T&` (no copy, not modified), and mark a member `const` when it doesn't change `*this`.

```cpp
#include <iostream>

struct Vec2 {
    double x, y;

    Vec2 operator+(const Vec2& o) const { return {x + o.x, y + o.y}; }      // new object: by value
    Vec2& operator+=(const Vec2& o) { x += o.x; y += o.y; return *this; }   // changes *this: by reference
};

std::ostream& operator<<(std::ostream& os, const Vec2& v) {   // free: the left operand is the stream
    return os << "(" << v.x << ", " << v.y << ")";
}

int main() {
    Vec2 a{1, 2}, b{3, 4};
    Vec2 c = a + b;                  // the compiler calls a.operator+(b)
    Vec2 d = a.operator+(b);         // the same call written out
    a += Vec2{10, 10};
    std::cout << c << " " << d << " " << a << "\n";
}
```
```output
(4, 6) (4, 6) (11, 12)
```

**How it works:**
1. `a + b` and `a.operator+(b)` are the same call. `+` leaves `a` and `b` unchanged and returns a **new** `Vec2` by value (a reference to a local would dangle).
2. `+=` changes `a` itself and returns `*this` by reference (lesson 38), so `(a += b) += c` and chains work without copies.
3. `std::cout << c << " "` is `operator<<(std::cout, c) << " "`: each call returns the stream for the next `<<`.

## Member, free function, or friend

**Meaning:** a member operator always has your object on the **left** (`*this`). When the left operand is something else, an `int` or a `std::ostream`, you can't add a member to it, so you write a **free function** taking both operands. A free function sees only public members. Declaring it **`friend`** inside the class gives it access to private members. A friend is still not a member: it has no `this` and is called like any free function.

```cpp
#include <iostream>

class Money {
    long cents;                                                    // private
public:
    explicit Money(long c) : cents(c) {}
    Money operator*(int k) const { return Money(cents * k); }     // member: money * 3

    friend Money operator*(int k, const Money& m);                // free: 3 * money
    friend std::ostream& operator<<(std::ostream& os, const Money& m);
};

Money operator*(int k, const Money& m) { return Money(m.cents * k); }   // friend: may read m.cents

std::ostream& operator<<(std::ostream& os, const Money& m) {
    return os << m.cents << " cents";
}

int main() {
    Money price(250);
    std::cout << price * 3 << "\n";        // price.operator*(3)
    std::cout << 3 * price << "\n";        // operator*(3, price)
}
```
```output
750 cents
750 cents
```

| | Member | Free function | Free function + `friend` |
|---|---|---|---|
| Left operand | Always your object | Anything | Anything |
| Access to private members | Yes | No (public interface only) | Yes |
| Has `this` | Yes | No | No |
| Typical use | `+=`, `=`, `[]`, `++`, `->` | Symmetric operators built from public members | `<<`, `>>`, `3 * m` needing private data |

If the public interface is enough (here `m * k` could simply return `m.operator*(k)`), skip `friend`: fewer functions with access to private data.

## Comparison operators

**Meaning:** define `==` to test equality and `<` to order objects. Standard algorithms and containers use them: `std::sort` and `std::map` need `<`, `std::find` needs `==`. Define `!=` from `==` so the two always agree. Comparisons don't change anything, so make them `const`.

```cpp
#include <algorithm>
#include <iostream>
#include <vector>

struct Version {
    int major, minor;
    bool operator==(const Version& o) const { return major == o.major && minor == o.minor; }
    bool operator!=(const Version& o) const { return !(*this == o); }      // reuse ==
    bool operator<(const Version& o) const {
        return major < o.major || (major == o.major && minor < o.minor);
    }
};

int main() {
    std::vector<Version> v = {{2, 1}, {1, 9}, {2, 0}};
    std::sort(v.begin(), v.end());                       // uses operator<
    for (const Version& x : v) std::cout << x.major << "." << x.minor << " ";
    std::cout << "\n" << (v[0] == Version{1, 9}) << (v[0] != v[1]) << "\n";
}
```
```output
1.9 2.0 2.1
11
```

C++20 adds the three-way comparison `<=>`. Defaulted, it compares the members in declaration order and gives all six operators (a defaulted `<=>` also brings a defaulted `==`):

```cpp
// C++20
#include <compare>
#include <iostream>

struct Version {
    int major, minor;
    auto operator<=>(const Version&) const = default;
};

int main() {
    Version a{1, 9}, b{2, 0};
    std::cout << (a < b) << (a >= b) << (a == b) << (a != b) << "\n";
}
```
```output
1001
```

## ++ and --: prefix vs postfix

**Meaning:** both forms are named `operator++`. The **postfix** one (`x++`) takes a dummy `int` parameter only to tell them apart. Prefix changes the object and returns **itself** by reference. Postfix must return the value **before** the change, so it copies the object first.

```cpp
#include <iostream>

class Counter {
    int n = 0;
public:
    Counter& operator++() { ++n; return *this; }                           // ++c
    Counter operator++(int) { Counter old = *this; ++*this; return old; }  // c++
    int value() const { return n; }
};

int main() {
    Counter c;
    Counter a = c++;        // a gets the old value 0, then c becomes 1
    Counter b = ++c;        // c becomes 2, b gets the new value 2
    std::cout << a.value() << " " << b.value() << " " << c.value() << "\n";
}
```
```output
0 2 2
```

**How it works:**
1. `c++` calls `operator++(int)`: it saves a copy, increments through the prefix version, and returns the copy by value.
2. `++c` calls `operator++()`: it increments and returns `*this` by reference, with no copy.
3. That copy is why `++it` is preferred over `it++` for iterators and other class types when the old value isn't needed. `--` works the same way.

## operator[]

**Meaning:** `operator[]` makes an object indexable like an array. It returns a **reference** to the element, so the result can be read and assigned. A second `const` version returns a `const` reference, so const objects (and `const&` parameters) can be read but not changed.

```cpp
#include <iostream>

class Scores {
    int data[3] = {70, 85, 90};
public:
    int& operator[](int i) { return data[i]; }               // non-const object: read and write
    const int& operator[](int i) const { return data[i]; }   // const object: read only
    int size() const { return 3; }
};

void print(const Scores& s) {                    // s is const, so s[i] uses the const version
    for (int i = 0; i < s.size(); i++) std::cout << s[i] << " ";
    std::cout << "\n";
}

int main() {
    Scores s;
    s[1] = 100;                                  // int& return: the element itself changes
    print(s);
}
```
```output
70 100 90
```

**How it works:**
1. `s[1] = 100` calls the non-const version; the returned `int&` refers to `data[1]`.
2. Inside `print`, `s` is `const`, so only the `const` version can be called. Without it, `s[i]` would not compile there.
3. Like `std::vector::operator[]`, this does no bounds check. A checked `at()` that throws `std::out_of_range` is the usual companion.

## Rules and good style

| Operator | Usually written as | Returns |
|---|---|---|
| `+ - * /` | `const` member or free function | A new object, by value |
| `+= -= *= /=` | Member | `*this` by reference |
| `== != <` (C++20 `<=>`) | `const` member or free function | `bool` (`<=>`: an ordering) |
| `<<` `>>` for streams | Free function, often `friend` | The stream, by reference |
| `[]` | Member, `const` and non-const | A reference to the element |
| `++x` / `x++` | Member | `T&` / `T` (old copy) |
| `=` | Member only (lesson 41) | `*this` by reference |
| `->` | Member only (lesson 42) | A pointer |

**What the language forbids:**
- Inventing operators (`**`) or changing precedence, associativity or the number of operands.
- Overloading for built-in types only: at least one operand must be a class or enum (`int + int` stays as it is).
- Overloading `::`, `.`, `.*`, `?:` and `sizeof`. `=`, `[]`, `()` and `->` must be members.

**Good style:**
- Keep the natural meaning: `+` adds and changes neither operand, `==` and `!=` agree, `<` is a consistent ordering. A surprising operator is worse than a named function.
- Write `+=` first, then `+` from it: `Vec2 operator+(Vec2 a, const Vec2& b) { a += b; return a; }`.
- Overload only when the meaning is obvious to every reader (math types, strings, containers, iterators).

## Common mistakes

- **Returning a reference to a local** from `operator+`: it dangles. g++ warns `reference to local variable 'r' returned`. Return by value.
- **Writing `operator<<` as a member**: then the object must be on the left (`v << std::cout`). Make it a free function.
- **Forgetting `const`** on `==`, `<` or `+`: they can't be called on const objects or through `const&` parameters.
- **Mixing up the `++` forms**: postfix returning a reference, or prefix returning a copy, breaks the expected behaviour.
- **Overloading `&&`, `||` or `,`**: the overloaded versions are ordinary function calls, so both operands are always evaluated. Short-circuiting is lost.
- **Defining `==` without `!=`** before C++20, so `a != b` doesn't compile (C++20 rewrites `a != b` as `!(a == b)` automatically).

## ⚠ Easily confused

- **member vs free operator** — Member: the left operand is `*this`. Free: both operands are parameters, required when the left operand isn't your type (`std::cout << e`, `2 * v`).
- **free function vs friend** — A free function sees only public members. Declaring it `friend` inside the class gives it private access, but it is still not a member (no `this`).
- **+ returns by value vs = returns by reference** — `+` makes a NEW object, so return by value. `=` and `+=` modify the existing object, so `return *this;` by reference (enables `a = b = c`).
- **prefix vs postfix ++** — `++x`: `T& operator++()`, changes and returns itself. `x++`: `T operator++(int)`, returns a copy of the old value, so it costs a copy.
- **overloadable vs not** — Can't redefine `int + int`, invent new operators or change precedence; can't overload `::` `.` `.*` `?:` `sizeof`.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 37).