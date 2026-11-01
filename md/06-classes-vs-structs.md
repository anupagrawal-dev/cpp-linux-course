# 06 — Classes vs Structs

*Category: C++ Core*

> struct and class differ only in their defaults (public vs private); everything else is identical, and the choice between them is a convention.

## Must-remember points

- Only **two** real language differences: (1) default member access: `struct` public, `class` private; (2) default inheritance: `struct` public, `class` private.
- Everything else is identical: both can have constructors, methods, `private` members, virtual functions, inheritance and templates. A `struct` may have `private:` members and a `class` `public:` ones.
- `template<class T>` / `template<typename T>` are allowed; `template<struct T>` is not.
- A plain struct (public data, no constructors, no virtual functions) is an **aggregate**: `Point p{1, 2};` sets the members in order, and members left out become 0.
- A **C** struct holds only data, and its type is written `struct Point` (unless typedef'd). A **C++** struct is a full class, and `Point` alone names it.
- Convention: `struct` = passive bundle of public data with no rule between the members; `class` = encapsulated type with behaviour and invariants.

## The two real differences

**Meaning:** `struct` and `class` both define a class type. They differ only in what you get when you don't write an access specifier: members of a `struct` are `public` by default and members of a `class` are `private`. The same goes for inheritance: `struct D : B` inherits publicly, `class D : B` privately (lesson 13).

```cpp
#include <iostream>

struct S { int x = 1; };              // struct: members are public by default
class  C { int x = 2; };              // class: members are private by default

struct Base { int id = 7; };
struct FromStruct : Base {};          // struct: inherits publicly by default
class  FromClass  : Base {};          // class: inherits privately by default

int main() {
    S s;
    std::cout << s.x << "\n";
    // C c;  std::cout << c.x;        // error: 'int C::x' is private within this context

    FromStruct fs;
    std::cout << fs.id << "\n";
    // FromClass fc;  std::cout << fc.id;   // error: 'int Base::id' is inaccessible within this context
}
```
```output
1
7
```

**How it works:**
1. `S` and `C` look the same, but `x` is public in `S` and private in `C`.
2. `FromStruct` inherits `Base` publicly, so `id` stays public. `FromClass` inherits privately, so `id` becomes private inside it and `main` can't use it.
3. Writing the specifier explicitly (`class C { public: int x; };`, `class D : public B`) removes the difference completely.

## Everything else is the same

**Meaning:** a `struct` can do everything a `class` can, and the other way round. The keyword only picks the default; you can still write `private:` in a struct or `public:` in a class.

```cpp
#include <iostream>

struct Counter {                        // a struct with a constructor, private data and methods
    explicit Counter(int start) : n(start) {}
    void add() { n++; }
    int get() const { return n; }
private:
    int n;
};

class Color {                           // a class with only public data
public:
    int r, g, b;
};

int main() {
    Counter c(10);
    c.add();
    Color red{255, 0, 0};               // brace-initialized like any plain struct
    std::cout << c.get() << " " << red.r << "\n";
}
```
```output
11 255
```

One place where the keywords are not interchangeable: a template parameter. `template<class T>` and `template<typename T>` mean the same, but `struct` is not allowed there:

```cpp
template<struct T>          // does not compile: 'struct T' names a struct type here, not a type parameter
T make() { return T{}; }
```

## Aggregate initialization

**Meaning:** a struct (or class) whose data members are all public, with no user-declared constructors, no virtual functions and no private or virtual base classes, is an **aggregate**. You can initialize it with a brace list: the values go to the members in declaration order. Members you leave out are set from their default member initializer, or to zero.

```cpp
#include <iostream>
#include <string>

struct Point {
    int x;
    int y;
};

struct Config {
    std::string host = "localhost";    // default member initializers are allowed
    int port = 80;
    bool verbose = false;
};

int main() {
    Point a{1, 2};                     // members in declaration order
    Point b{};                         // every member set to 0
    Point c{.x = 3, .y = 4};           // C++20: designated initializers, by name
    std::cout << a.x << "," << a.y << "  " << b.x << "," << b.y << "  " << c.x << "," << c.y << "\n";

    Config cfg{"example.com", 8080};   // verbose keeps its default
    std::cout << cfg.host << ":" << cfg.port << " " << std::boolalpha << cfg.verbose << "\n";
}
```
```output
1,2  0,0  3,4
example.com:8080 false
```

**How it works:**
1. `Point a{1, 2}` sets `x = 1`, `y = 2`. No constructor is needed.
2. `Point b{}` zero-initializes. `Point b;` with no braces would leave `x` and `y` uninitialized (garbage) for a local.
3. Designated initializers (C++20) name the members; they must still appear in declaration order.
4. Leaving out a member with no default (`Point p{5};`) gives it 0, and `-Wextra` warns `missing initializer for member 'Point::y'`.
5. Braces refuse narrowing: `Point p{1.5, 2};` fails with `narrowing conversion of '1.5e+0' from 'double' to 'int'`.

## C struct vs C++ struct

**Meaning:** in C, a struct is only a group of data members: no member functions, no access specifiers, no constructors, no inheritance. Its type name is `struct Point`; C code adds a `typedef` to write just `Point`. In C++ a struct is a full class, and `Point` alone is the type name. A C++ struct with only public data members and no virtual functions has the same memory layout as the C one, so the same header can describe data shared between C and C++ code.

```c
#include <stdio.h>

struct Point { int x; int y; };            /* C: a struct holds data only */
typedef struct Point Point;                /* lets C code write Point instead of struct Point */

void move(struct Point* p, int dx) {       /* "methods" are free functions taking a pointer */
    p->x += dx;
}

int main(void) {
    struct Point a = {1, 2};               /* C needs the struct keyword... */
    Point b = {3, 4};                      /* ...unless there is a typedef */
    move(&a, 10);
    printf("%d %d\n", a.x, b.x);
    return 0;
}
```
```output
11 3
```

This program is valid C and valid C++. C++ features in a struct are rejected by a C compiler:

```bash
$ cat cpp_only.c
struct Point {
    int x, y;
    void move(int dx) { x += dx; }    /* a member function: C++ only */
};
int main(void) {
    Point p = {1, 2};                 /* Point without "struct": C++ only */
    return p.x;
}
$ gcc -c cpp_only.c 2>&1 | grep error
cpp_only.c:3:23: error: expected ':', ',', ';', '}' or '__attribute__' before '{' token
cpp_only.c:6:5: error: unknown type name 'Point'; use 'struct' keyword to refer to the type
cpp_only.c:7:13: error: request for member 'x' in something not a structure or union
$ g++ -c cpp_only.c && echo "compiles as C++"
compiles as C++
```

`g++` treats a `.c` file as C++, which is why the last command succeeds.

## When to use which

| | `struct` | `class` |
|---|---|---|
| Default member access | `public` | `private` |
| Default inheritance | `public` | `private` |
| Constructors, methods, virtual functions, templates | yes | yes |
| Convention: use it for | passive data, all members public, no invariant | types with invariants, private data, behaviour |
| Examples | `Point`, `Config`, `Color`, a record read from a file | `BankAccount`, `Clock`, a container |

**When to use `struct`:** the members are independent values and any combination is valid. Readers then know at a glance that there is nothing to protect, and aggregate initialization works.

**When to use `class`:** there is a rule to protect (lesson 5), so the data is private and changes go through member functions.

The compiler treats both the same way, so this is about telling the reader your intent. Mixing (a `struct` full of private members) is legal but surprising.

## Common mistakes

- **Believing a struct can't have methods, constructors or private members.** In C++ it can; only the defaults differ.
- **Forgetting `public` when a class inherits.** `class D : B` is private inheritance, so `B`'s public members become private in `D`.
- **Adding a constructor and breaking brace initialization.** A user-declared constructor makes the type a non-aggregate, so `Point p{1, 2};` needs a matching constructor: `no matching function for call to 'Point::Point(<brace-enclosed initializer list>)'`.
- **Leaving a plain struct uninitialized.** `Point p;` as a local holds garbage; write `Point p{};` or give the members default values.
- **Using C++ features in a header that C code includes.** Member functions, access specifiers and `Point` without `struct` are C++ only.

## ⚠ Easily confused

- **class default vs struct default** — Members are `private` by default in a `class`, `public` by default in a `struct` (same for the default inheritance mode).
- **aggregate vs class with a constructor** — An aggregate (public data, no user-declared constructors, no virtuals) is filled member by member from `{...}`. Once you declare a constructor, `{...}` calls a constructor instead.
- **`Point p;` vs `Point p{};`** — For a local plain struct, `Point p;` leaves the members uninitialized (garbage); `Point p{};` sets them to zero.
- **C struct vs C++ struct** — C: data only, type written `struct Point` unless typedef'd. C++: a full class (methods, access, inheritance), and `Point` alone is the type.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 06).