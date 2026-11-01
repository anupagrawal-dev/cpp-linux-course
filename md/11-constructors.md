# 11 — Constructors

*Category: C++ Core*

> A constructor is the special function that runs when an object is created and puts it in a valid state; a class can have several, and the arguments choose which one runs.

## Must-remember points

- A **constructor** has the **same name as the class** and **no return type**. It runs automatically when an object is created. Its job: give every member a valid value, acquire resources, and check the rules (invariants).
- A class can have **several constructors** (overloading); the arguments pick one: **default** (no arguments), **parameterized**, **copy** `T(const T&)` (lesson 41) and **move** `T(T&&)` (takes over the resources of an object that is about to die).
- The compiler writes a **default constructor only if you declare no constructor at all**. Declare any constructor and it is gone; `Entity() = default;` brings it back. `= delete` forbids a constructor, for example copying.
- Default values: **default member initializers** (`int hp = 100;`) apply in every constructor that doesn't set the member; **default arguments** (`Rect(int w = 1, int h = 1)`) let one constructor be called several ways.
- The **member initializer list** (`: x(px)`) initializes members before the body runs. It is required for `const` members, references, and members with no default constructor (lesson 32).
- **Brace initialization** `Entity e{1, 2};` refuses **narrowing** conversions such as `double` to `int`, which parentheses allow silently. `Entity e{};` also avoids the **most vexing parse**: `Entity e();` declares a function.
- A constructor can't return an error: it reports failure by **throwing**. The object then never exists, and its destructor does not run. Constructors **can't be virtual**.

## What a constructor is, and which one runs

**Meaning:** a constructor is a member function with the same name as the class and no return type (not even `void`). You never call it by name: it runs by itself whenever an object is created. A class may have several constructors with different parameters, and the compiler picks the one that matches the arguments, like any overloaded function.

```cpp
#include <iostream>
#include <string>
#include <utility>

class Entity {
    std::string name;
    int x = 0, y = 0;
public:
    Entity() : name("unnamed")                             { std::cout << "default:  "; }
    Entity(int px, int py) : name("point"), x(px), y(py)   { std::cout << "int,int:  "; }
    Entity(const std::string& n) : name(n)                 { std::cout << "string:   "; }
    Entity(const Entity& o) : name(o.name), x(o.x), y(o.y) { std::cout << "copy:     "; }
    Entity(Entity&& o) noexcept : name(std::move(o.name)), x(o.x), y(o.y) { std::cout << "move:     "; }

    void print() const { std::cout << name << " at " << x << "," << y << "\n"; }
};

int main() {
    Entity a;                    // no arguments
    a.print();
    Entity b(3, 4);              // two ints
    b.print();
    Entity c("player");          // text
    c.print();
    Entity d = b;                // a new object made from an existing one
    d.print();
    Entity e = std::move(c);     // made from an object we no longer need
    e.print();
}
```
```output
default:  unnamed at 0,0
int,int:  point at 3,4
string:   player at 0,0
copy:     point at 3,4
move:     player at 0,0
```

**How it works:**
1. `Entity a;` has no arguments, so the **default constructor** runs.
2. `Entity b(3, 4)` and `Entity c("player")` match the **parameterized** constructors (`"player"` converts to `std::string`).
3. `Entity d = b;` creates a **new** object from an existing one: the **copy constructor**. Copying and the Rule of Three are lesson 41.
4. `std::move(c)` says "`c` is no longer needed", so the **move constructor** runs. It takes over `c`'s string buffer instead of copying it, which is cheaper. `c` is left valid but unspecified.

## The default constructor, = default and = delete

**Meaning:** if a class declares **no constructor at all**, the compiler writes a default constructor for it. It default-constructs each member: members with a default member initializer get that value, class members run their own default constructor, and plain `int`/`double`/pointer members are left **uninitialized**. As soon as you declare **any** constructor, the compiler stops writing it. `= default` asks for it back; `= delete` forbids a constructor.

```cpp
#include <iostream>

struct Point {
    int x = 0, y = 0;                  // default member initializers
};

class Circle {
    Point center;
    double radius = 1.0;               // default member initializer
public:
    Circle() = default;                // ask for the compiler's default constructor back
    Circle(double r) : radius(r) {}    // on its own, this would remove Circle()
    void print() const { std::cout << center.x << "," << center.y << " r=" << radius << "\n"; }
};

int main() {
    Point p;                           // the compiler-written default constructor
    std::cout << p.x << "," << p.y << "\n";
    Circle c1;                         // = default: members use their initializers
    c1.print();
    Circle c2(2.5);                    // radius from the argument, center from its initializers
    c2.print();
}
```
```output
0,0
0,0 r=1
0,0 r=2.5
```

**How it works:**
1. `Point` declares no constructor, so the compiler writes one. The `= 0` initializers make `x` and `y` zero.
2. `Circle` declares `Circle(double)`, so without the `= default` line, `Circle c1;` would fail with `error: no matching function for call to 'Circle::Circle()'`.
3. `= default` gives the compiler's version: `center` is default-constructed and `radius` takes its initializer, 1.0.

`= delete` removes a constructor on purpose. A class that owns a file descriptor must not be copied (two objects would close the same file), so its copy constructor is deleted:

```cpp
class FileHandle {
    int fd;
public:
    explicit FileHandle(int f) : fd(f) {}
    FileHandle(const FileHandle&) = delete;     // copying is forbidden
};

int main() {
    FileHandle a(3);
    FileHandle b = a;    // does not compile: the copy constructor is deleted
}
```
g++ reports: `error: use of deleted function 'FileHandle::FileHandle(const FileHandle&)'`. The mistake is caught at compile time instead of becoming a double close at run time.

## Default values: default arguments and default member initializers

**Meaning:** two ways to avoid writing many nearly identical constructors.
- A **default member initializer** (`double radius = 1.0;` in the class) is the value a member gets in every constructor that doesn't initialize it itself.
- **Default arguments** let callers leave out trailing parameters: one constructor `Rect(int width = 1, int height = 1)` can be called with zero, one or two arguments.

```cpp
#include <iostream>

class Rect {
    int w, h;
public:
    Rect(int width = 1, int height = 1) : w(width), h(height) {}   // one constructor, three ways to call it
    int area() const { return w * h; }
};

int main() {
    Rect a;            // Rect(1, 1): with all defaults it is also the default constructor
    Rect b(5);         // Rect(5, 1)
    Rect c(5, 3);      // Rect(5, 3)
    std::cout << a.area() << " " << b.area() << " " << c.area() << "\n";
}
```
```output
1 5 15
```

**How it works:**
1. The compiler fills in the missing arguments at the call: `Rect b(5)` becomes `Rect(5, 1)`.
2. Defaults go from the right: a parameter with a default can't be followed by one without.
3. `Rect(5)` means a `Rect` can be built from one `int`, so the compiler may also convert an `int` into a `Rect` silently (`Rect r = 5;`). Mark such constructors `explicit` to stop that (lesson 36).

| | Default member initializer | Default argument | Separate overloads |
|---|---|---|---|
| Written | at the member: `int hp = 100;` | in the parameter list: `int h = 1` | one constructor per form |
| Applies to | every constructor that doesn't set that member | calls that leave the argument out | only the overload chosen |
| Best for | a sensible starting value for a member | an optional trailing parameter | forms that do really different work |

## The member initializer list (in short)

**Meaning:** the part between the `)` and the `{` of a constructor, `: name(n), x(px)`, **initializes** members as the object is built. Code in the body runs later and can only **assign** to members that already exist. That's why the list is the normal place to set members, and why it is **required** for:
- `const` members and reference members (they can't be assigned after creation);
- members whose type has no default constructor;
- choosing which base-class constructor runs (lesson 13).

Members are always initialized in the order they are **declared** in the class, not the order written in the list. Lesson 32 covers all of this with examples.

## Brace initialization and narrowing

**Meaning:** an object can be created with braces, `Entity e{1, 2};`, as well as parentheses. Braces call the same constructor, with two benefits:
- **No narrowing**: a conversion that can lose information, such as `double` to `int`, is not allowed. With parentheses it happens silently.
- **No most vexing parse**: `Entity e{};` always creates an object, while `Entity e();` declares a function named `e`.

```cpp
#include <iostream>

struct P {
    int x, y;
    P(int a, int b) : x(a), y(b) {}
};

int main() {
    double d = 2.9;
    P p1(d, 1);              // parentheses: 2.9 silently becomes 2
    std::cout << p1.x << "\n";
    P p2{3, 1};              // braces: fine, no information lost
    std::cout << p2.x << "\n";
}
```
```output
2
3
```

```cpp
struct P {
    int x, y;
    P(int a, int b) : x(a), y(b) {}
};

int main() {
    P p3{2.9, 1};            // does not compile: narrowing double -> int inside braces
}
```

**How it works:**
1. `P p1(d, 1)` converts 2.9 to `int` without a word: the `.9` is lost.
2. `P p3{2.9, 1}` is rejected: `error: narrowing conversion of '2.8999999999999999e+0' from 'double' to 'int' [-Wnarrowing]`.
3. The standard makes every narrowing in braces an error. g++ enforces it for constants like `2.9`; for a **variable** (`P p{d, 1}`) it prints only a warning by default. Build with `-Werror=narrowing` to make that an error too.

**When to use it:** braces are a good default for creating objects. Lesson 34 shows the other brace forms and the one surprise they have with containers such as `std::vector`.

## When construction fails

**Meaning:** a constructor has no return value, so it can't return an error code. If it can't build a valid object (bad arguments, a file that won't open, no memory), it **throws an exception**. The object then never exists: the caller can't end up holding a half-built object. Exceptions are lesson 22.

```cpp
#include <iostream>
#include <stdexcept>

class Fraction {
    int num, den;
public:
    Fraction(int n, int d) : num(n), den(d) {
        if (d == 0)
            throw std::invalid_argument("denominator is 0");   // no return value: throw instead
        std::cout << "made " << num << "/" << den << "\n";
    }
    ~Fraction() { std::cout << "destroyed " << num << "/" << den << "\n"; }
};

int main() {
    try {
        Fraction ok(1, 2);
        Fraction bad(1, 0);            // throws: bad never becomes an object
        std::cout << "not reached\n";
    } catch (const std::invalid_argument& e) {
        std::cout << "error: " << e.what() << "\n";
    }
}
```
```output
made 1/2
destroyed 1/2
error: denominator is 0
```

**How it works:**
1. `ok` is built normally.
2. `bad`'s constructor throws before it finishes, so `bad` never exists and its destructor never runs: there is no "destroyed 1/0".
3. Leaving the `try` block destroys `ok` (its destructor runs during the unwinding), then the `catch` block runs.
4. Any member that was already fully built when the constructor threw **is** destroyed. That's why members that clean up after themselves (`std::string`, `std::unique_ptr`) make constructors safe; lesson 12 explains this.

**Constructors can't be virtual:** `virtual` chooses a function by the object's real type, but while a constructor runs, the object's type is still being built. The code always names the exact type it creates (`Fraction f(1, 2)`), so there is nothing to choose. g++: `error: constructors cannot be declared 'virtual'`.

## Common mistakes

- **Adding a constructor and losing the default one.** After `Circle(double r)`, `Circle c;` stops compiling. Add `Circle() = default;` (or your own) if objects without arguments should exist.
- **Leaving built-in members uninitialized.** With no initializer and no constructor setting it, `int count;` in a local object holds garbage; reading it is undefined behaviour. Give such members a default member initializer: `int count = 0;`.
- **`Entity e();`** declares a function, not an object. Write `Entity e;` or `Entity e{};`.
- **Assigning in the body instead of initializing.** It default-constructs the member first, then overwrites it, and it doesn't compile for `const` or reference members. Use the initializer list (lesson 32).
- **Calling a virtual function from a constructor.** While `Base`'s constructor runs, the `Derived` part doesn't exist yet, so the call goes to `Base`'s version. A `Base` constructor that calls the virtual `hello()` prints `Base::hello` even when building a `Derived`.
- **Single-argument constructors without `explicit`.** They allow silent conversions (`Rect r = 5;`). Mark them `explicit` unless the conversion is wanted (lesson 36).

## ⚠ Easily confused

- **Entity e; vs Entity e();** — `Entity e;` creates an object. `Entity e();` declares a function returning `Entity` (the most vexing parse). `Entity e{};` always creates an object.
- **init list vs assignment in body** — The init list constructs members directly, once. Assigning in the body default-constructs first, then overwrites, and is impossible for `const`/reference members.
- **= default vs = delete** — `= default` asks the compiler to write that function for you. `= delete` forbids it: any call is a compile error.
- **default constructor vs default arguments** — A default constructor is any constructor callable with no arguments. `Rect(int w = 1, int h = 1)` is one, because every parameter has a default.
- **copy vs move constructor** — Copy `T(const T&)` duplicates the source, which stays unchanged. Move `T(T&&)` takes over the source's resources and leaves it valid but unspecified (lesson 41).

➡ Questions for this topic: `questions/master-question-sheet.md` (section 11).