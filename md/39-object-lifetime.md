# 39 — Object Lifetime

*Category: C++ Core*

> An object's lifetime is the time between its construction and its destruction; its storage duration (automatic, dynamic, static or thread) decides it, and using an object outside its lifetime is undefined behaviour.

## Must-remember points

- **Lifetime** = from the end of construction to the start of destruction (a run-time idea). **Scope** = where the name can be used (a compile-time idea). They match only for local (automatic) objects.
- Four **storage durations**: **automatic** (locals: until the end of their `{}` block), **dynamic** (`new`: until `delete`), **static** (globals, `static` locals, static members: the whole program), **thread** (`thread_local`: one copy per thread, for the thread's life).
- Automatic objects in one scope are destroyed in **reverse** order of creation, at a known point: C++ destruction is **deterministic**, unlike garbage-collected languages.
- Returning a pointer or reference to a local gives a **dangling** pointer (its stack frame is gone). Fixes: return by value, return a `std::unique_ptr`, fill a caller-supplied object, or use an object with static storage.
- A **temporary** (an unnamed object such as `T(1)` or a function's returned value) dies at the end of the **full expression**, normally the `;`.
- **Lifetime extension:** binding a temporary **directly** to a `const T&` (or `T&&`) keeps it alive as long as the reference. It does **not** pass through a function that returns a reference, or through a pointer such as `.c_str()`.
- **RAII** builds on deterministic lifetime: the destructor releases resources at scope exit, even during exceptions (lesson 12).

## Storage durations: how long an object lives

**Meaning:** an object's **lifetime** starts when its constructor finishes and ends when its destructor starts. How long that is depends on its **storage duration**, which is fixed by how the object is created (the creation syntax is lesson 34). Don't confuse lifetime with **scope**, which is only where the *name* can be used: a heap object can outlive the pointer that names it, and a `static` local outlives its function.

```cpp
#include <iostream>
#include <thread>

struct T {
    const char* name;
    T(const char* n) : name(n) { std::cout << "+" << name << " "; }
    ~T() { std::cout << "-" << name << " "; }
};

T global("static");                          // static: the whole program
thread_local int perThread = 0;              // thread: one copy per thread

void work(const char* who) {
    perThread += 10;                         // each thread changes only its own copy
    std::cout << who << ":" << perThread << " ";
}

int main() {
    std::cout << "| main\n";
    T* heap = nullptr;
    {
        T local("automatic");                // automatic: until the closing brace
        heap = new T("dynamic");             // dynamic: until delete, scope doesn't matter
    }
    std::cout << "| block ended\n";
    delete heap;
    std::cout << "| deleted\n";

    std::thread t1(work, "t1");
    t1.join();
    std::thread t2(work, "t2");
    t2.join();
    work("main");
    std::cout << "| main ends\n";
}
```
```output
+static | main
+automatic +dynamic -automatic | block ended
-dynamic | deleted
t1:10 t2:10 main:10 | main ends
-static
```

**How it works:**
1. `global` is built before `main` runs and destroyed after it returns.
2. `local` dies at its closing brace. The heap object created in the same block survives the brace and dies only at `delete`.
3. `perThread` is `thread_local`: each thread (including `main`'s) gets its own copy starting at 0, so every thread prints 10.

| Storage duration | Created by | Lifetime ends | Who destroys it |
|---|---|---|---|
| automatic | a local variable, a function parameter | at the end of its block | automatic, in reverse order |
| dynamic | `new` (directly, or inside `make_unique`, `vector`...) | at `delete` | your code, or the owning smart pointer or container |
| static | a global, a `static` local (lesson 44), a static member (lesson 9) | after `main` returns | automatic, in reverse order of creation |
| thread | a `thread_local` variable | when its thread ends | automatic |

## Dangling: using an object after its lifetime

**Meaning:** a pointer or reference to an object whose lifetime has ended is **dangling**. Using it is undefined behaviour: it may print the old value, garbage, or crash. The classic case is returning the address of a local: the local dies when the function returns.

```cpp
int* badPointer() {
    int x = 5;
    return &x;            // undefined behaviour once the caller uses it: x dies here
}

int& badReference() {
    int x = 5;
    return x;             // the same problem with a reference
}
```

g++ catches these simple cases: `warning: address of local variable 'x' returned [-Wreturn-local-addr]` and `warning: reference to local variable 'x' returned`. Here are four correct ways to give the caller something that outlives the function:

```cpp
#include <iostream>
#include <memory>
#include <string>

std::string byValue()                 { std::string s = "value"; return s; }              // the caller gets the object
std::unique_ptr<std::string> onHeap() { return std::make_unique<std::string>("heap"); }   // ownership moves to the caller
void intoBuffer(std::string& out)     { out = "buffer"; }                                 // the caller owns the storage
const std::string& fromStatic()       { static const std::string s = "static"; return s; } // lives for the whole program

int main() {
    std::string a = byValue();
    std::unique_ptr<std::string> b = onHeap();
    std::string c;
    intoBuffer(c);
    const std::string& d = fromStatic();
    std::cout << a << " " << *b << " " << c << " " << d << "\n";
}
```
```output
value heap buffer static
```

**How it works:**
1. **By value:** the returned object goes to the caller (moved or created in place, no extra copy in practice). The usual choice.
2. **`unique_ptr`:** the object is on the heap and ownership passes to the caller, who doesn't need to `delete` it.
3. **Caller's buffer:** the caller creates the object, the function only fills it.
4. **Static:** returning a reference is safe when the object has static storage; it is the same object on every call (lesson 44).

Other ways to get a dangling pointer: keeping a pointer to a `std::vector` element after the vector grows (lesson 43), and using a pointer after `delete` (lesson 34).

## Temporaries and lifetime extension

**Meaning:** a **temporary** is an object with no name: `T(1)`, the result of `a + b` for class types, a value returned by a function before it is stored. It is destroyed at the end of the **full expression** that created it (normally at the `;`). One exception: if a temporary is bound **directly** to a `const T&` or a `T&&`, its lifetime is **extended** to match the reference.

```cpp
#include <iostream>
#include <string>

struct T {
    int id;
    T(int i) : id(i) { std::cout << "+" << id << " "; }
    ~T() { std::cout << "-" << id << " "; }
};

T make(int i) { return T(i); }

int main() {
    T(1);                                    // a temporary: dies at the end of this statement
    std::cout << "| after statement 1\n";

    const T& r = T(2);                       // bound to a const reference: lives as long as r
    std::cout << "| r.id = " << r.id << "\n";

    T&& rr = make(3);                        // an rvalue reference extends it too
    std::cout << "| rr.id = " << rr.id << "\n";

    const std::string& s = std::string("hi") + "!";   // works for library types as well
    std::cout << "| s = " << s << "\n";
    std::cout << "| main ends\n";
}                                            // rr's and r's objects die here, in reverse order
```
```output
+1 -1 | after statement 1
+2 | r.id = 2
+3 | rr.id = 3
| s = hi!
| main ends
-3 -2
```

**How it works:**
1. `T(1)` is built and destroyed in the same statement: `-1` prints before the next line.
2. `const T& r = T(2);` binds the temporary directly to `r`, so it lives until `r` goes out of scope at the end of `main`.
3. `make(3)` returns a temporary; `rr` extends it the same way.
4. The string `"hi!"` built by `+` is also a temporary, extended by `s`.
5. At the end of `main` the extended temporaries die in reverse order: `-3`, then `-2`.

This is why a function can take `const std::string&` and still be called with `"text"` or `a + b`: the temporary lives until the call's full expression ends, which is long enough for the function.

## Where lifetime extension stops

**Meaning:** extension happens only when the temporary itself is bound to the reference in the declaration. If anything stands in between, such as a function that returns a reference or a member function that returns a pointer into the temporary, the temporary dies at the `;` as usual and the reference or pointer dangles.

```cpp
#include <iostream>

struct T {
    int id;
    T(int i) : id(i) { std::cout << "+" << id << " "; }
    ~T() { std::cout << "-" << id << " "; }
};

const T& pass(const T& t) { return t; }      // returns the reference it was given

int main() {
    const T& bad = pass(T(4));               // undefined behaviour: T(4) dies at the end of this line
    std::cout << bad.id << "\n";
}
```

**How it works:**
1. `T(4)` is bound to the **parameter** `t`, not to `bad`. A parameter binding lasts only until the call's full expression ends.
2. `bad` receives a reference to the same object, which is destroyed at the `;`. Reading `bad.id` afterwards is undefined behaviour. g++ 13 warns here: `warning: possibly dangling reference to a temporary [-Wdangling-reference]`.

The same trap, with no warning at all from g++:
- `const char* p = (std::string("abc") + "def").c_str();` The pointer points into the temporary string, which is destroyed at the `;`.
- A class that stores a `const std::string&` member, set in its constructor from a temporary argument: the temporary dies at the end of the statement that created the object.

**Rule:** extension works only for `const T& r = <temporary>;` or `T&& r = <temporary>;` written directly. When in doubt, store a **value** (`std::string s = ...;`, `T copy = pass(T(4));`), which owns its data.

## Deterministic destruction

**Meaning:** in C++ every automatic object is destroyed at a point you can see in the code: the closing brace of its block. Garbage-collected languages such as Java, C# and Go free memory *some time later*, when the collector runs, so they can't promise when cleanup code runs. That's why they need `finally`, `try`-with-resources or `using` blocks to close files and release locks.

| | C++ | Garbage-collected languages |
|---|---|---|
| When an object is cleaned up | at a known point: end of scope, `delete`, end of the program | when the collector decides, maybe never |
| Releasing files, locks, sockets | automatic, in the destructor (RAII) | by hand, with `finally` / `using` blocks |
| Cost | no collector; you must get ownership right (dangling pointers are possible) | collector pauses and memory overhead; no dangling pointers |

RAII, which uses this to release every resource on every path, is lesson 12.

## Common mistakes

- **Returning `&local` or a reference to a local.** The object dies when the function returns. Return by value instead; heed `-Wreturn-local-addr`.
- **Thinking lifetime equals scope.** A heap object lives on after its pointer goes out of scope (a leak if nobody deletes it). A `static` local lives on after its function returns.
- **Expecting extension through a function.** `const T& r = pass(T(4));` dangles. Only a direct binding extends a temporary.
- **Keeping `.c_str()`, `.data()` or a `std::string_view` of a temporary string.** The string dies at the `;`; the pointer or view dangles.
- **Storing a reference member that refers to a temporary argument.** Store a value instead.
- **Using a pointer after `delete`**, or to a `vector` element after the vector reallocated.
- **Depending on the order of destruction of globals in different files.** It is the reverse of their construction order, which is unspecified across files (lesson 8).

## ⚠ Easily confused

- **scope vs lifetime** — Scope = where the name can be used (compile time). Lifetime = when the object exists (run time). Equal only for automatic objects.
- **automatic vs dynamic vs static vs thread** — Automatic (locals): to the end of the block. Dynamic (`new`): until `delete`. Static (globals, `static` locals): the whole program. Thread (`thread_local`): one per thread, for the thread's life.
- **dangling vs valid return** — Return `&local` or a reference to a local = dangling. Return by value, a `unique_ptr`, a caller-supplied object, or a static object = valid.
- **extended vs not extended temporary** — `const T& r = T(2);` extends `T(2)` to `r`'s scope. `const T& r = pass(T(2));` does not: the temporary dies at the `;`.
- **RAII vs manual cleanup** — RAII: the destructor releases automatically at scope exit (even on exceptions). Manual: you must remember to free/close/unlock, and it is easy to forget.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 39).