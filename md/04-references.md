# 04 — References

*Category: C++ Core*

> A reference is another name for an existing object, bound once at declaration: pass big objects by const reference, and never return one to a local.

## Must-remember points

- A reference is an **alias** (another name) for an existing object: after `int& r = x;`, using `r` **is** using `x`, and `&r == &x`.
- It must be initialized when declared and is **fixed** from then on: `r = y;` copies `y`'s value into `x`, it does not rebind `r`. It **cannot be null** (in well-formed code) and has no arithmetic.
- Pass-by-value = copy (changes don't escape); pass-by-reference (`int&`) = writes go straight to the caller's variable.
- `const T&` = read-only alias with **no copy**: the usual way to pass big objects (`std::string`, `std::vector`). It can also bind to a temporary (`const int& r = 5;`); a plain `int&` can't.
- Range-for: `auto x` **copies** each element, `auto& x` lets you **modify** them, `const auto& x` **reads** without copying.
- Return a reference only to something that outlives the call: a member, a static, an element of a container the caller owns. A reference to a local **dangles** (UB).
- Under the hood a reference is usually an **address**, but `sizeof(r)` and `&r` give the size and address of the object it refers to.
- Use a reference when there must be an object; use a pointer when "no object" (`nullptr`) or re-pointing is needed.

## A reference is another name

**Meaning:** `int& r = x;` makes `r` a second name for the variable `x`. It is not a copy and not a new object: reading `r` reads `x`, assigning to `r` changes `x`, and `&r` is the address of `x`. The binding happens once, at the declaration, and can never be changed.

```cpp
#include <iostream>

int main() {
    int x = 10;
    int& r = x;                     // r is another name for x
    r = 20;                         // changes x
    std::cout << x << "\n";
    std::cout << std::boolalpha << (&r == &x) << "\n";   // same object, same address

    int y = 99;
    r = y;                          // NOT a rebind: copies y's value into x
    y = 0;
    std::cout << x << " " << y << "\n";
}
```
```output
20
true
99 0
```

**How it works:**
1. `r = 20` writes into `x`, because `r` and `x` are the same object.
2. `r = y` looks like "make `r` refer to `y`", but a reference can't be rebound. It assigns `y`'s value (99) to `x`.
3. Changing `y` afterwards doesn't touch `x`: they are separate variables.
4. `int& r;` with no initializer does not compile (`'r' declared as reference but not initialized`).

## Passing by reference

**Meaning:** a by-value parameter is a copy, so the function can't change the caller's variable. A reference parameter is an alias for the caller's variable, so every change goes straight to it. Unlike a pointer parameter (lesson 2), the call looks like an ordinary call: no `&` at the call site and no `*` inside the function.

```cpp
#include <iostream>

void swapValues(int& a, int& b) {   // a and b are the caller's variables
    int tmp = a;
    a = b;
    b = tmp;
}

void noSwap(int a, int b) {         // a and b are copies
    int tmp = a;
    a = b;
    b = tmp;
}

int main() {
    int x = 1, y = 2;
    noSwap(x, y);
    std::cout << x << " " << y << "\n";
    swapValues(x, y);               // called like a by-value function: no &
    std::cout << x << " " << y << "\n";
}
```
```output
1 2
2 1
```

**How it works:**
1. `noSwap` swaps its own copies; `x` and `y` are untouched.
2. Inside `swapValues`, `a` **is** `x` and `b` **is** `y`, so the swap is visible in `main`.
3. The cost: at the call site `swapValues(x, y)` doesn't show that `x` and `y` may change. Clear function names help.

## const references

**Meaning:** `const T&` is an alias you can only read through. Passing a big object this way avoids the copy, and the `const` promises (and the compiler enforces) that the function won't change it. A `const` reference can also bind to a **temporary** value, such as a literal or the result of an expression; the temporary then lives as long as the reference (lesson 39). A plain `T&` refuses temporaries, because changing a temporary would be pointless.

```cpp
#include <iostream>
#include <string>

void greet(const std::string& name) {   // no copy, and greet can't change name
    std::cout << "hello " << name << "\n";
}

void addOne(int& n) { n++; }

int main() {
    std::string user = "anna";
    greet(user);                    // binds to user: no copy
    greet("bob");                   // binds to a temporary std::string built from "bob"

    const int& five = 5;            // OK: a const reference can bind to a temporary
    std::cout << five << "\n";

    int x = 1;
    addOne(x);
    // addOne(5);                   // error: cannot bind non-const lvalue reference...
    std::cout << x << "\n";
}
```
```output
hello anna
hello bob
5
2
```

**How it works:**
1. `greet(user)` binds `name` directly to `user`: no characters are copied.
2. `greet("bob")` works because `"bob"` can be turned into a temporary `std::string`, and a `const` reference accepts it.
3. `addOne(5)` fails with `cannot bind non-const lvalue reference of type 'int&' to an rvalue of type 'int'`: there is no variable for `n` to refer to. `addOne(x + 1)` fails the same way.
4. Writing through a `const` reference fails too: `n = 3;` inside `void show(const int& n)` gives `assignment of read-only reference 'n'`.

**When to use it:** `const T&` for parameters of class types you only read (`std::string`, `std::vector`, your own classes). Pass small built-in types (`int`, `double`, `char`) by value: a copy of an `int` is as cheap as passing an address.

## References in range-for loops

**Meaning:** the loop variable of a range-for is declared like any other variable. Declared as a value (`auto x`), it is a **copy** of each element. Declared as a reference (`auto& x`), it **is** each element, so changes stick. `const auto& x` is the element, read-only, without a copy.

```cpp
#include <iostream>
#include <string>
#include <vector>

int main() {
    std::vector<int> nums = {1, 2, 3};

    for (auto n : nums) n *= 10;           // n is a copy: nums is unchanged
    std::cout << nums[0] << " " << nums[1] << " " << nums[2] << "\n";

    for (auto& n : nums) n *= 10;          // n is each element itself
    std::cout << nums[0] << " " << nums[1] << " " << nums[2] << "\n";

    std::vector<std::string> names = {"ada", "linus"};
    for (const auto& s : names)            // read-only, and no string is copied
        std::cout << s << " has " << s.size() << " letters\n";
}
```
```output
1 2 3
10 20 30
ada has 3 letters
linus has 5 letters
```

| Loop variable | What it is | Use it when |
|---|---|---|
| `auto x` | a copy of each element | elements are small (`int`, `double`) and you only read them |
| `auto& x` | the element itself | you change the elements |
| `const auto& x` | the element, read-only | you only read, and elements are big (strings, objects) |

## Returning a reference

**Meaning:** a function can return a reference, so the caller gets the object itself instead of a copy, and can even assign to it. This is only safe if the object **outlives the call**: a data member of an object that still exists, a `static` variable, or an element of a container the caller passed in.

```cpp
#include <iostream>
#include <vector>

class Scores {
    std::vector<int> values = {50, 70, 90};
public:
    int& at(int i) { return values[i]; }        // refers to a member: lives as long as the object
};

int& callCount() {
    static int count = 0;                        // a static lives for the whole program
    return count;
}

int& largest(std::vector<int>& v) {              // refers into the caller's vector
    int best = 0;
    for (int i = 1; i < static_cast<int>(v.size()); i++)
        if (v[i] > v[best]) best = i;
    return v[best];
}

int main() {
    Scores s;
    s.at(1) = 75;                   // assign through the returned reference
    std::cout << s.at(1) << "\n";

    callCount()++;
    callCount()++;
    std::cout << callCount() << "\n";

    std::vector<int> v = {4, 9, 2};
    largest(v) = 0;                 // sets the biggest element to 0
    std::cout << v[0] << " " << v[1] << " " << v[2] << "\n";
}
```
```output
75
2
4 0 2
```

**How it works:**
1. `s.at(1)` returns the vector element itself, so `= 75` changes it inside `s`. This is how `std::vector::operator[]` works.
2. `callCount()` returns the same `static int` every time, so both increments land on it.
3. `largest(v)` returns a reference into `v`, which belongs to `main` and is still alive.

Returning a reference to a local is wrong, because the local dies when the function returns:

```cpp
#include <iostream>

int& bad() {
    int local = 42;
    return local;          // undefined behaviour: local is destroyed when bad() returns
}

int main() {
    int& r = bad();        // r refers to a variable that no longer exists
    std::cout << r << "\n";
}
```

g++ warns `reference to local variable 'local' returned`. Return by value instead (lesson 39 covers dangling references).

## How references work underneath

**Meaning:** the language has no way to get at the reference itself: `sizeof(r)` is the size of the referred object and `&r` is its address. Underneath, when a reference has to be stored or passed, the compiler uses the object's **address**, exactly as for a pointer. When it is only a local alias, it usually disappears entirely.

```cpp
#include <iostream>

struct Big { int data[100]; };          // 400 bytes
struct Holder { Big& ref; };            // a struct holding only a reference

int main() {
    Big big{};
    Big& r = big;
    std::cout << sizeof(r) << "\n";                       // the size of Big
    std::cout << std::boolalpha << (&r == &big) << "\n";  // the address of big
    Holder h{big};
    std::cout << sizeof(h) << "\n";                       // the reference is stored as an address
    h.ref.data[0] = 7;
    std::cout << big.data[0] << "\n";
}
```
```output
400
true
8
7
```

Passing by reference and by pointer produce the same machine code:

```cpp
struct Big { int data[100]; };
void byRef(Big& b) { b.data[0] = 1; }
void byPtr(Big* b) { b->data[0] = 1; }
```
```bash
$ g++ -O2 -S -o - ref.cpp | grep -E '^_Z|movl|ret'
_Z5byRefR3Big:
	movl	$1, (%rdi)
	ret
_Z5byPtrP3Big:
	movl	$1, (%rdi)
	ret
```

**How it works:**
1. `sizeof(r)` is 400 and `&r` equals `&big`: every use of `r` is a use of `big`.
2. `Holder` is 8 bytes on x86-64 with g++: the stored reference is an address.
3. Both functions receive the address of the `Big` in register `rdi` and write `1` at that address. Only the rules differ: the reference can't be null or rebound.

## Pointer vs reference

| | Reference `int& r` | Pointer `int* p` |
|---|---|---|
| Must be initialized | yes | no (but should be) |
| Can be null | no | yes (`nullptr`) |
| Can be changed to refer elsewhere | no | yes |
| How you use it | like the object: `r = 5`, `r.member` | `*p = 5`, `p->member` |
| Arithmetic | no | yes (`p + 1`) |
| `sizeof` and `&` give | the referred object's | the pointer's own |
| Can be stored in a `std::vector` | no (`std::vector<int&>` doesn't compile) | yes |

**When to use a reference:**
- Function parameters that must refer to an existing object: `const T&` to read, `T&` to change it.
- Range-for loops, and returning an element or member to the caller (`operator[]`).

**When to use a pointer:**
- "No object" is a valid answer (an optional argument, "not found").
- It must point to different objects over time (walking a linked list, an array).
- C APIs and low-level code, and heap objects (through smart pointers, lesson 40).

## Common mistakes

- **Expecting `r = y` to rebind.** It copies `y`'s value into the original object.
- **Returning a reference (or pointer) to a local.** It dangles as soon as the function returns. Return by value.
- **`for (auto x : v)` when you meant to change `v`.** You change copies. Write `auto&`.
- **Copying big objects by accident.** `void f(std::string s)` and `for (auto s : names)` copy every string. Use `const std::string&` / `const auto&` when you only read.
- **Keeping a reference to a vector element, then growing the vector.** `push_back` may move all elements to a new block, and the old reference dangles (lesson 43).

## ⚠ Easily confused

- **reference vs pointer** — A reference is a fixed alias (no null, no rebinding, used like the object itself). A pointer can be null, re-pointed, and needs `*` / `->` to reach the object.
- **pass-by-value vs pass-by-reference** — By value copies the argument (changes stay local). By reference operates on the caller's actual variable.
- **`T&` vs `const T&`** — `T&` can change the object and accepts only a real (non-const) variable. `const T&` is read-only and also accepts temporaries and literals.
- **`auto` vs `auto&` vs `const auto&` in range-for** — `auto`: a copy of each element. `auto&`: the element itself, changes stick. `const auto&`: the element, read-only, no copy.
- **`r = y` vs rebinding** — `r = y` assigns `y`'s value to the object `r` refers to. A reference can never be made to refer to a different object.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 04).