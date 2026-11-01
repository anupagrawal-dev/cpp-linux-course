# 41 — Copying & Copy Constructors

*Category: C++ Core*

> A class that owns a resource must define how it is copied (deep copy, Rule of Three), may define how it is moved (Rule of Five), and ideally owns nothing raw at all (Rule of Zero).

## Must-remember points

- **Copy constructor** `T(const T& other)` builds a **new** object from an existing one: `T b = a;`, `T b(a);`, pass by value, return by value (often elided: C++17 builds a returned temporary directly in the caller).
- The compiler's default copy is **shallow** (member by member): a pointer member's **address** is copied, so both objects share one buffer.
- Shared buffer -> editing one changes the other, and both destructors `delete` it -> **double free** (undefined behaviour). A **deep copy** allocates a new buffer and copies the contents.
- **Copy assignment** `T& operator=(const T& other)` is for two objects that **already exist** (`b = a;`): check self-assignment, copy into a new buffer, free the old one, `return *this`.
- **Rule of Three**: a class that needs a custom destructor also needs a custom copy constructor and copy assignment. **Rule of Five** adds the move constructor and move assignment.
- **Move constructor** `T(T&& other) noexcept` steals the other object's buffer instead of copying it, leaving the source empty. `std::move(a)` asks for it.
- **Rule of Zero**: build classes from members that manage themselves (`std::string`, `std::vector`, `std::unique_ptr`) and write none of the five.
- Pass by `const T&` to avoid a copy. `= delete` forbids copying (like `unique_ptr`); `= default` asks for the compiler's version.

## When copies happen

**Meaning:** the copy constructor runs whenever a **new** object is created from an existing object of the same type. When both objects already exist, `=` calls the copy **assignment** operator instead.

```cpp
#include <iostream>

struct Tracker {
    Tracker() { std::cout << "default\n"; }
    Tracker(const Tracker&) { std::cout << "copy constructor\n"; }
    Tracker& operator=(const Tracker&) { std::cout << "copy assignment\n"; return *this; }
};

void byValue(Tracker) {}
void byRef(const Tracker&) {}
Tracker makeOne() { return Tracker(); }

int main() {
    Tracker a;
    Tracker b = a;              // new object from a: copy constructor (not assignment)
    Tracker c(a);               // the same, direct form
    byValue(b);                 // the parameter is a new copy
    byRef(c);                   // a reference: no copy
    Tracker d = makeOne();      // C++17: the temporary is built directly in d
    d = a;                      // both exist: copy assignment
}
```
```output
default
copy constructor
copy constructor
copy constructor
default
copy assignment
```

**How it works:**
1. `Tracker b = a;` has an `=` but creates `b`, so it is construction.
2. `byValue(b)` copies `b` into the parameter; `byRef(c)` doesn't.
3. `return Tracker();` prints only `default`: since C++17 a returned temporary is created directly in `d` (guaranteed copy elision).
4. `d = a;` changes an existing object, so `operator=` runs.

## The default copy is shallow

**Meaning:** if you don't write a copy constructor, the compiler generates one that copies each member. That is right for `int`, `double` or `std::string` members. For a raw pointer it copies the **address**, not the data, so two objects end up sharing one buffer.

```cpp
#include <cstring>
#include <iostream>

struct Buffer {
    char* data;
    explicit Buffer(const char* s) : data(new char[std::strlen(s) + 1]) { std::strcpy(data, s); }
    // no copy constructor written: the compiler copies 'data', the address
};

int main() {
    Buffer a("Hello");
    Buffer b = a;                  // shallow: b.data == a.data
    b.data[0] = 'J';               // changes the one shared buffer
    std::cout << a.data << " " << b.data << ", same buffer: " << (a.data == b.data) << "\n";
    delete[] a.data;               // freed once, by hand
}
```
```output
Jello Jello, same buffer: 1
```

**How it works:**
1. `b` got a copy of the pointer, so `a` and `b` point at the same 6 bytes. Changing `b` changed `a`.
2. Give `Buffer` the obvious destructor `~Buffer() { delete[] data; }` and both objects would delete the same buffer at the end of `main`: a **double free**, undefined behaviour. With glibc the program usually aborts with `free(): double free detected in tcache 2`.
3. The cure is a **deep copy**: each object allocates and owns its own buffer.

## Deep copy: a Rule-of-Three String

**Meaning:** a class that owns a raw resource needs three functions that agree on how it is managed: the **destructor** frees it, the **copy constructor** makes an independent copy for a new object, and **copy assignment** replaces an existing object's resource with a copy. This is the **Rule of Three**.

```cpp
#include <cstring>
#include <iostream>

class String {
    std::size_t m_size;                         // length without the '\0'
    char* m_data;
public:
    String(const char* s) : m_size(std::strlen(s)), m_data(new char[m_size + 1]) {
        std::memcpy(m_data, s, m_size + 1);
    }
    String(const String& other)                 // copy constructor: a buffer of its own
        : m_size(other.m_size), m_data(new char[m_size + 1]) {
        std::memcpy(m_data, other.m_data, m_size + 1);
        std::cout << "[copy ctor]\n";
    }
    String& operator=(const String& other) {    // copy assignment: both objects already exist
        std::cout << "[copy assign]\n";
        if (this == &other) return *this;       // a = a: nothing to do
        char* fresh = new char[other.m_size + 1];
        std::memcpy(fresh, other.m_data, other.m_size + 1);
        delete[] m_data;                        // free the old buffer only after the copy succeeded
        m_data = fresh;
        m_size = other.m_size;
        return *this;
    }
    ~String() { delete[] m_data; }
    char& operator[](std::size_t i) { return m_data[i]; }
    friend std::ostream& operator<<(std::ostream& os, const String& s) { return os << s.m_data; }
};

int main() {
    String a = "Hello";
    String b = a;            // copy constructor
    b[0] = 'J';              // only b changes
    String c = "Hi";
    c = a;                   // copy assignment: c's old "Hi" buffer is freed
    c = c;                   // self-assignment is safe
    std::cout << a << " " << b << " " << c << "\n";
}
```
```output
[copy ctor]
[copy assign]
[copy assign]
Hello Jello Hello
```

**How it works:**
1. The copy constructor allocates a new buffer of the right size and copies the characters into it, so `b[0] = 'J'` doesn't touch `a`.
2. Copy assignment must also deal with the buffer `c` **already has**: it copies `a`'s text into a fresh buffer, then frees the old one. Without the `delete[]` the old buffer would leak.
3. The self-assignment check matters: without it (and with delete-first order), `c = c` would free `c`'s buffer and then copy from the freed memory.
4. Allocating before deleting means that if `new` throws `std::bad_alloc`, `c` is left unchanged.
5. `operator=` returns `*this` by reference (lessons 37 and 38), so `a = b = c` works. A common alternative is **copy-and-swap**: take the parameter by value and `std::swap` the members with it.

## Move constructor (Rule of Five)

**Meaning:** copying a big buffer is wasteful when the source is about to be thrown away anyway. A **move constructor**, `T(T&& other)`, takes the source's buffer instead of copying it and leaves the source empty but still safe to destroy. `std::move(a)` says "you may take `a`'s contents". With move assignment, this makes the **Rule of Five**. (Move semantics get their own lesson later; this is the minimum.)

```cpp
#include <cstring>
#include <iostream>
#include <utility>

class String {
    std::size_t m_size;
    char* m_data;
public:
    String(const char* s) : m_size(std::strlen(s)), m_data(new char[m_size + 1]) {
        std::memcpy(m_data, s, m_size + 1);
    }
    String(const String& o) : m_size(o.m_size), m_data(new char[m_size + 1]) {   // copy: new buffer
        std::memcpy(m_data, o.m_data, m_size + 1);
        std::cout << "copy\n";
    }
    String(String&& o) noexcept : m_size(o.m_size), m_data(o.m_data) {           // move: take the buffer
        o.m_size = 0;
        o.m_data = nullptr;                // the source must not free it any more
        std::cout << "move\n";
    }
    ~String() { delete[] m_data; }         // delete[] nullptr does nothing
    const char* c_str() const { return m_data ? m_data : "(empty)"; }
};

int main() {
    String a = "Hello";
    String b = a;                // a is still needed: copy
    String c = std::move(a);     // a is given up: move, no allocation
    std::cout << a.c_str() << " " << b.c_str() << " " << c.c_str() << "\n";
}
```
```output
copy
move
(empty) Hello Hello
```

**How it works:**
1. `std::move(a)` doesn't move anything itself; it only lets the compiler choose the `String&&` constructor.
2. The move constructor copies two members (a size and a pointer) and nulls the source, instead of allocating and copying the text.
3. `noexcept` matters: when a `std::vector` grows, it moves its elements only if the move constructor is `noexcept`; otherwise it copies them to stay safe (checked with g++: a type without `noexcept` printed `copy` on `reserve`, one with it printed `move`).
4. After the move, `a` is empty. Assign it a new value before using it again.

## Rule of Zero, = default and = delete

**Meaning:** the best way to follow the Rule of Three or Five is to need none of it. If every member manages its own resource (`std::string`, `std::vector`, `std::unique_ptr`), the compiler-generated copy, move and destructor already do the right thing. This is the **Rule of Zero**. When an object must **not** be copied (a file, a socket, a lock), write `= delete`.

```cpp
#include <iostream>
#include <string>
#include <vector>

class Person {                                    // Rule of Zero: no special members written
    std::string name;
    std::vector<int> scores;
public:
    Person(const std::string& n, const std::vector<int>& s) : name(n), scores(s) {}
    void addScore(int x) { scores.push_back(x); }
    void print() const { std::cout << name << " has " << scores.size() << " scores\n"; }
};

class Socket {                                    // must not be copied
    int fd;
public:
    explicit Socket(int f) : fd(f) {}
    Socket(const Socket&) = delete;
    Socket& operator=(const Socket&) = delete;
    int id() const { return fd; }
};

int main() {
    Person p("Ana", {90, 80});
    Person q = p;                 // generated copy: string and vector copy themselves deeply
    q.addScore(70);
    p.print();
    q.print();

    Socket s(3);
    std::cout << "socket " << s.id() << "\n";
}
```
```output
Ana has 2 scores
Ana has 3 scores
socket 3
```

`Socket t = s;` would not compile: `use of deleted function 'Socket::Socket(const Socket&)'`. `std::unique_ptr` (lesson 40) is built the same way.

| Rule | You write | When |
|---|---|---|
| Zero | None of the five | Members manage themselves. The normal case. |
| Three | Destructor, copy constructor, copy assignment | The class owns a raw resource (memory from `new`, a file descriptor). |
| Five | The three + move constructor + move assignment | Same, and moving should be cheap. |
| `= delete` | Deleted copy constructor and copy assignment | The resource can't be duplicated. |
| `= default` | `T(const T&) = default;` | You declared other special members but still want the compiler's version. |

## Common mistakes

- **Copy constructor taking its parameter by value**: `String(String other)` would need a copy to make a copy. g++: `invalid constructor; you probably meant 'String (const String&)'`.
- **Half of the Rule of Three**: writing the copy constructor but not copy assignment leaves `b = a;` shallow, with the same double free.
- **Assignment that leaks or self-destructs**: forgetting `delete[]` of the old buffer leaks; deleting it first without a self-assignment check breaks `a = a`.
- **Move constructor without `noexcept`**: `std::vector` then copies instead of moving when it grows.
- **Using an object after `std::move`**: it is valid but empty (or unspecified for library types). Give it a new value first.
- **Copying by accident**: `void f(String s)` copies on every call. Take `const String&`.
- **Declaring only a move constructor** deletes the implicit copy constructor: `T b = a;` then fails with `use of deleted function`.

## ⚠ Easily confused

- **shallow vs deep copy** — Shallow (default): copies the pointer, so two objects share one buffer: double free. Deep (custom): allocate your own buffer and copy the contents.
- **copy constructor vs copy assignment** — Copy constructor: `T b = a;` builds a NEW object. Copy assignment `b = a;`: both already exist: self-check, copy, free the old buffer, `return *this`.
- **copy vs move** — Copy: the source keeps its value, the target gets new memory. Move (`T&&`, `std::move`): the target takes the source's memory, the source is left empty.
- **Rule of Three vs Five vs Zero** — Three: destructor + copy constructor + copy assignment. Five: adds move constructor + move assignment. Zero: use self-managing members and write none.
- **= delete vs = default** — `= delete`: this operation is forbidden (compile error if used). `= default`: generate the compiler's normal version.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 41).