# Master Question Bank

524 single-focus questions across 45 topics, in learning order. Each question asks one thing; the answer is hidden in a <details> block.

## C++ Core

### 01 — Control Flow  (11 Qs)
**Q1. What does this code print?**

```cpp
int x = 1;
switch (x) {
  case 1: cout << "A";
  case 2: cout << "B"; break;
  case 3: cout << "C";
}
```

<details><summary>Show answer</summary>

It prints **AB**. `x` is 1, so control enters `case 1` and prints `A`. There is **no `break`** after `case 1`, so execution *falls through* into `case 2`, prints `B`, and only then hits `break`. `case 3` never runs. To print only `A`, add a `break` after `case 1`.

</details>

**Q2. When should you use a `do-while` loop instead of a `while` loop?**

<details><summary>Show answer</summary>

Use a `do-while` when the body must run **at least once** before the condition is checked — because a `do-while` evaluates its condition *after* running the body, whereas a `while` checks *first* and may run zero times.
```cpp
do {
    x = readInput();
} while (!valid(x));   // ask once, then keep asking until valid
```

</details>

**Q3. Does this compile, and what is the value of `x` after the `if`?**

```cpp
int x = 0;
if (x = 5) {
    cout << "entered";
}
// what prints? what is x now?
```

<details><summary>Show answer</summary>

It **compiles and runs fine** — this is *not* a compiler error, and calling it a 'bug' would be wrong: it's valid C++. `=` is **assignment**, not comparison, so `x = 5` stores 5 in `x`, and the value of that expression is 5, which is truthy — the `if` body always runs and `x` is **5** afterward. It's usually a **typo for `==`** (comparison), so it's a logic pitfall rather than something the compiler rejects. Many compilers warn about it, and writing `if (5 == x)` would turn the typo into a real compile error.

</details>

**Q4. When is `switch` fall-through intentional rather than a mistake?**

<details><summary>Show answer</summary>

When several cases should share the same code — you deliberately leave out `break` so one case flows into the next:
```cpp
switch (grade) {
  case 'A':
  case 'B': cout << "Pass"; break;   // A and B both -> Pass
  case 'F': cout << "Fail"; break;
}
```

</details>

**Q5. What does this print?**

```cpp
int i = 0;
do { std::cout << i; } while (i++ < 2);
```

<details><summary>Show answer</summary>

**Expected output:**
```
012
```

`do-while` runs the body first, then checks. Prints 0; `0 < 2` is true (i becomes 1). Prints 1; `1 < 2` is true (i becomes 2). Prints 2; `2 < 2` is false, so the loop ends.

</details>

**Q6. True or false: a `while` loop always runs its body at least once.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** `while` checks the condition *before* the first run, so it can run zero times. `do-while` is the loop that always runs at least once.

</details>

**Q7. What does this print?**

```cpp
int calls = 0;
bool f() { ++calls; return true; }

int main() {
    if (false && f()) {}
    if (true || f()) {}
    if (true && f()) {}
    std::cout << calls;
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
1
```

Only the third `if` calls `f()`. In `false && f()` the left side is false, so `&&` skips `f()`. In `true || f()` the left side is true, so `||` skips `f()`. In `true && f()` the result depends on the right side, so `f()` runs once: `calls` is 1.

</details>

**Q8. What does this print?**

```cpp
for (int i = 0; i < 6; i++) {
    if (i == 1) continue;
    if (i == 4) break;
    std::cout << i;
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
023
```

`i = 0` prints 0. `i = 1` hits `continue`, so the rest of that pass is skipped. `i = 2` and `i = 3` print. At `i = 4`, `break` leaves the loop before printing.

</details>

**Q9. Which of these can be the value tested by a `switch`? Select all that apply.**

- **A)** An `int`
- **B)** A `char`
- **C)** An `enum class` value
- **D)** A `std::string`
- **E)** A `double`

<details><summary>Show answer</summary>

**Correct: A, B, C**

A `switch` needs an integer type, `char`, `bool` or an enum (scoped or not). A `std::string` is rejected (`switch quantity not an integer`), and so is a `double`. Use an `if` / `else if` chain for those.

</details>

**Q10. True or false: inside a `for` loop, a `break` placed in a `switch` leaves the `for` loop.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** `break` leaves the innermost enclosing `switch` or loop, which here is the `switch`. The loop carries on with its next pass. To leave the loop, use a flag, `return`, or move the `switch` out.

</details>

**Q11. Why does this fail to compile, and how do you fix it?**

```cpp
int x = 2;
switch (x) {
case 1:
    int y = 5;
    std::cout << y;
    break;
case 2:
    std::cout << "two";
    break;
}
```

<details><summary>Show answer</summary>

g++ says `jump to case label` with the note `crosses initialization of 'int y'`. Jumping to `case 2` would skip the line that creates and initializes `y`, while `y` is still in scope for the rest of the `switch`. Fix: give the case its own block, `case 1: { int y = 5; std::cout << y; break; }`, so `y`'s scope ends before `case 2`.

</details>

### 02 — Pointers  (13 Qs)
**Q12. What is the difference between `*p` and `&x`?**

<details><summary>Show answer</summary>

`&x` means **'address of x'** — it produces the memory address where `x` lives. `*p` means **'dereference p'** — go to the address stored in `p` and read/write the value there. They are inverses: `*(&x)` is just `x`.
```cpp
int x = 42;
int* p = &x;   // p holds x's address
int y = *p;    // y = 42 (value at that address)
*p = 99;       // x is now 99
```

</details>

**Q13. For a heap pointer `p`, what does printing `p` give you versus printing `&p`?**

```cpp
int* p = new int(5);
cout << p;    // the heap address
cout << &p;   // where p itself lives (stack)
```

<details><summary>Show answer</summary>

`p` is the value stored *in* the pointer — the **address it points to** (here, the heap block from `new`). `&p` is the address of the **pointer variable itself**, which sits on the stack. They are two different addresses. To inspect the heap allocation you print `p`; `&p` only tells you where the pointer lives.

</details>

**Q14. What is the difference between a null pointer and a dangling pointer?**

<details><summary>Show answer</summary>

A **null** pointer holds the address 0 — it deliberately points to nothing, and you can safely test for it (`if (p) ...`). A **dangling** pointer holds an address that *used to* be valid but whose memory has been freed or gone out of scope; it still looks like a normal non-zero address, so you **cannot** detect it by checking — using it is undefined behaviour.
```cpp
int* p = nullptr;   // null: safe to check
int* q = new int(3);
delete q;           // q now dangles (still non-null!)
```

</details>

**Q15. Can a pointer be changed to point somewhere else after it is created?**

<details><summary>Show answer</summary>

Yes. Unlike a reference, a pointer can be **reseated** any number of times, and can be set to `nullptr`.
```cpp
int a=1, b=2;
int* p = &a;   // points to a
p = &b;        // now points to b
p = nullptr;   // now points to nothing
```

</details>

**Q16. Where does a pointer variable itself live in memory?**

<details><summary>Show answer</summary>

The pointer **variable** — the 8 bytes holding the address on a 64-bit machine — lives wherever it's declared, typically on the **stack** as a local. That is separate from what it *points to*, which can live anywhere: the stack (`int* p = &local;`), the heap (`int* p = new int;`), or static storage.

</details>

**Q17. After `int x = 5; int* p = &x; *p = 9;` what is the value of `x`?**

- **A)** 5
- **B)** 9
- **C)** The address of `x`
- **D)** It does not compile

<details><summary>Show answer</summary>

**Correct: B**

**9.** `p` holds the address of `x`, and `*p = 9` writes through that address, so it changes `x` itself.

</details>

**Q18. What does this print?**

```cpp
int a = 1, b = 2;
int* p = &a;
*p = 10;
p = &b;
*p = 20;
std::cout << a << " " << b;
```

<details><summary>Show answer</summary>

**Expected output:**
```
10 20
```

`*p = 10` writes through `p` into `a`. Then `p = &b` **reseats** the pointer (a reference could not do that), so `*p = 20` changes `b`, not `a`.

</details>

**Q19. What does this print?**

```cpp
int a[] = {5, 10, 15, 20};
int* p = a + 1;
*(p + 1) += 1;
p++;
std::cout << *p << " " << p[-2] << " " << (p - a);
```

<details><summary>Show answer</summary>

**Expected output:**
```
16 5 2
```

`p` starts at `a + 1`, so `*(p + 1)` is `a[2]`, which becomes 16. `p++` moves `p` to `a[2]`, so `*p` is 16, `p[-2]` is `a[0]` (5), and `p - a` is the distance in elements: 2.

</details>

**Q20. In `int* a, b;`, what is the type of `b`?**

- **A)** `int*`
- **B)** `int`
- **C)** `int&`
- **D)** It does not compile

<details><summary>Show answer</summary>

**Correct: B**

**`int`.** The `*` binds to the name next to it, not to the type, so only `a` is a pointer. Declare pointers one per line to avoid it.

</details>

**Q21. Given `int x = 1, y = 2; int* const p = &x;`, which lines compile? Select all that apply.**

- **A)** `*p = 5;`
- **B)** `p = &y;`
- **C)** `int v = *p;`
- **D)** `p = nullptr;`

<details><summary>Show answer</summary>

**Correct: A, C**

`p` is a **const pointer** to a non-const `int`. The value can be changed and read through it (`*p = 5;`, `int v = *p;`), but `p` itself can't be reseated, so `p = &y;` and `p = nullptr;` fail with `assignment of read-only variable 'p'`.

</details>

**Q22. True or false: on x86-64 with g++, `sizeof(char*)` is smaller than `sizeof(double*)`.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** Both are 8 bytes. Every data pointer stores an address of the same width; the pointed-to type only changes how `*p` is read and how far `p + 1` moves.

</details>

**Q23. Why prefer `nullptr` over `NULL` or `0` for a null pointer?**

<details><summary>Show answer</summary>

`nullptr` has its own type, `std::nullptr_t`, which converts to any pointer type but never to an integer. `0` and `NULL` are integers. With overloads `f(int)` and `f(int*)`, `f(0)` calls `f(int)`, and with g++ `f(NULL)` is rejected as ambiguous, while `f(nullptr)` calls `f(int*)` as intended. It also makes the code say clearly that a pointer is meant.

</details>

**Q24. A function `int count(int arr[])` returns `sizeof(arr) / sizeof(arr[0])`. Called with a 10-element array on x86-64, it returns 2. Why, and what is the fix?**

<details><summary>Show answer</summary>

An array parameter is really a **pointer**: `int arr[]` means `int* arr`, because the array decays when passed. So `sizeof(arr)` is the pointer's size (8), and 8 / 4 = 2. g++ warns `'sizeof' on array function parameter 'arr' will return size of 'int*'`. Fix: pass the length as a second parameter, or pass a `std::array` / `std::vector` (which know their size).

</details>

### 03 — Stack & Heap Memory  (13 Qs)
**Q25. Why is stack allocation faster than heap allocation?**

<details><summary>Show answer</summary>

Allocating a local on the stack is just moving the stack-pointer register down by the needed bytes (one instruction for all the function's locals); freeing is moving it back when the function returns. There is no searching and no bookkeeping, and the top of the stack is usually in the CPU cache. (The stack's address range is set aside in advance; each page gets physical RAM the first time it is touched, like any other memory.) Heap allocation (`new`) must ask the allocator to **find a free block** of the right size, record its size, and sometimes ask the kernel for more memory; `delete` must give the block back. That search and bookkeeping make it slower.

</details>

**Q26. Which direction does the stack grow, and where is its 'top'?**

<details><summary>Show answer</summary>

On typical machines the stack grows **downward**, toward **lower** addresses — each call/`push` *decrements* the stack pointer. So the 'top of stack' (the most recent item) is actually at the **lowest** address currently in use, the opposite of the everyday picture of a stack growing up.

</details>

**Q27. What happens when the caller dereferences the pointer this function returns?**

```cpp
int* bad() {
    int x = 42;
    return &x;   // returning the address of a local
}
```

<details><summary>Show answer</summary>

It's a **dangling pointer**, so dereferencing it is **undefined behaviour**. `x` is a local — it lives on `bad()`'s stack frame; when `bad()` returns, that frame is reclaimed and `x` no longer exists, yet the returned pointer still holds its old address. Reading through it may give garbage, may seem to work, or may crash. To return something that outlives the call, allocate on the heap (`new`) or return by value.

</details>

**Q28. What happens if you free `new[]` memory with plain `delete` (instead of `delete[]`)?**

<details><summary>Show answer</summary>

**Undefined behaviour.** Array `new[]` and scalar `new` can use different bookkeeping, so they must be matched exactly: `new` ↔ `delete`, and `new[]` ↔ `delete[]`. Mismatching them can corrupt the heap or leak — even if it *seems* to work on one compiler.
```cpp
int* a = new int[10];
delete a;     // WRONG — must be delete[] a;
```

</details>

**Q29. Why does very deep recursion crash a program?**

<details><summary>Show answer</summary>

Each function call pushes a **stack frame** (return address, saved registers, locals). The stack is small — typically only **1–8 MB**. Deep or unbounded recursion keeps pushing frames until the stack is exhausted → **stack overflow** (a crash). This is one reason large data lives on the heap instead.

</details>

**Q30. Why do the heap addresses a program prints change on every run?**

<details><summary>Show answer</summary>

Because of **ASLR** (Address Space Layout Randomization): the OS deliberately randomizes where memory regions are placed each run, so attackers can't predict addresses. The structure is the same but the absolute base shifts, so `new int` prints a different address each time.

</details>

**Q31. In `void f() { int a = 1; int* p = new int(2); }`, what lives on the heap?**

- **A)** `a`
- **B)** The pointer variable `p` itself
- **C)** The `int` that `p` points to
- **D)** Both `a` and `p`

<details><summary>Show answer</summary>

**Correct: C**

Only **the `int` that `p` points to** (created by `new`). `a` and the pointer variable `p` itself are locals on the stack. (And this function leaks that `int`: nothing deletes it.)

</details>

**Q32. True or false: the stack grows toward lower addresses, so the most recently pushed value sits at the lowest address.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: A**

**True.** A push decrements the stack pointer, so the "top" of the stack is its lowest address.

</details>

**Q33. A global `int total;` with no initializer: which region holds it?**

- **A)** text
- **B)** data
- **C)** bss
- **D)** heap
- **E)** stack

<details><summary>Show answer</summary>

**Correct: C**

**bss.** Globals and statics with no initializer (or initialized to zero) go in bss, which takes no space in the program file and is zero-filled when the program starts. A global with a non-zero initial value (`int total = 5;`) would go in **data**.

</details>

**Q34. True or false: on Linux, the whole 8 MB stack is given physical RAM when the program starts.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** The stack's address range is set aside, but each page gets physical RAM only when it is first touched (a page fault, lesson 27).

</details>

**Q35. What does a stack frame hold, and what happens to it when the function returns?**

<details><summary>Show answer</summary>

A frame holds the **return address** (where to continue in the caller), **saved registers** (such as the caller's frame pointer), the function's **local variables**, and arguments that don't fit in registers. On return the stack pointer is moved back above the frame, so all of it is freed at once; the locals no longer exist, and any pointer to them dangles.

</details>

**Q36. Which of these belong on the heap rather than the stack? Select all that apply.**

- **A)** A 50 MB image buffer
- **B)** An `int` loop counter
- **C)** An object that must outlive the function that creates it
- **D)** An array whose length is read from the user
- **E)** A small struct used only inside one function

<details><summary>Show answer</summary>

**Correct: A, C, D**

A 50 MB buffer would overflow an 8 MB stack. An object that must outlive its function can't live in that function's frame. An array whose size is read at run time needs a run-time allocation (`std::vector`). A loop counter and a small struct used only inside one function are ideal stack variables.

</details>

**Q37. How do you see the stack size limit on Linux, and how does a program end when it overflows the stack?**

<details><summary>Show answer</summary>

`ulimit -s` prints the limit in KiB (typically `8192`, 8 MB). A program that goes past it touches the guard area below the stack, the kernel sends `SIGSEGV`, and the shell reports `Segmentation fault` with exit code **139** (128 + signal 11). `ulimit -s <KiB>` changes the limit for that shell and its children.

</details>

### 04 — References  (12 Qs)
**Q38. Name two things a reference cannot do that a pointer can.**

<details><summary>Show answer</summary>

A reference **cannot be null** and **cannot be reseated** (rebound to a different variable after initialization). It also has **no arithmetic** and must be initialized when declared. A pointer can be null, can point at different things over time, and supports pointer arithmetic.

</details>

**Q39. What does this print, and why?**

```cpp
void byVal(int x){ x = 99; }
void byRef(int& x){ x = 99; }
int n = 1;
byVal(n); byRef(n);
cout << n;
```

<details><summary>Show answer</summary>

It prints **99**. `byVal` gets a **copy**, so its `x = 99` changes only the local copy — `n` is untouched by it. `byRef` gets a **reference (alias)** to `n`, so its `x = 99` writes straight through to `n`. After both calls, `n` is 99.

</details>

**Q40. Why do we often pass large objects as `const T&` instead of by value?**

<details><summary>Show answer</summary>

Passing by value (`T`) **copies** the whole object, which is expensive for a big `std::string` or `std::vector`. A `const T&` binds an **alias** — no copy — while `const` guarantees the function won't modify the caller's object. So you get a reference's speed with read-only safety.
```cpp
void print(const std::string& s);  // no copy, cannot change s
```

</details>

**Q41. Why must a reference be initialized at the point where it is declared?**

<details><summary>Show answer</summary>

Because a reference is a permanent **alias** with no identity of its own — it must be bound to an existing object the moment it's created, and can never be re-bound afterward. `int& r;` is a compile error; `int& r = x;` is required. (That's exactly why a reference makes a good fixed alias but a poor 'optional' or reseatable handle — use a pointer for those.)

</details>

**Q42. What does this print?**

```cpp
void f(int a, int& b) { a = 10; b = 20; }

int main() {
    int x = 1, y = 2;
    f(x, y);
    std::cout << x << " " << y;
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
1 20
```

`a` is a copy, so `a = 10` changes only the copy and `x` stays 1. `b` is a reference to `y`, so `b = 20` writes straight into `y`.

</details>

**Q43. True or false: in well-formed code, a reference can be null.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** A reference must be bound to an existing object when it is declared, and it cannot be reseated, so there is no null reference. Use a pointer when "nothing" is a valid value.

</details>

**Q44. What does this print?**

```cpp
int a = 1, b = 2;
int& r = a;
r = b;
b = 5;
std::cout << a << " " << b << " " << r;
```

<details><summary>Show answer</summary>

**Expected output:**
```
2 5 2
```

`r` is bound to `a` for good. `r = b` copies `b`'s value (2) into `a`; it does not rebind `r`. Changing `b` to 5 afterwards doesn't affect `a`, and `r` is still `a`, so it prints `2 5 2`.

</details>

**Q45. What does this print?**

```cpp
std::vector<int> v = {1, 2, 3};
for (auto x : v) x++;
for (auto& x : v) x *= 2;
std::cout << v[0] << v[1] << v[2];
```

<details><summary>Show answer</summary>

**Expected output:**
```
246
```

The first loop's `x` is a **copy** of each element, so `x++` changes only the copies. The second loop's `x` is a **reference** to each element, so doubling sticks: 1, 2, 3 become 2, 4, 6.

</details>

**Q46. Which line does **not** compile? (`x` is an `int` variable.)**

- **A)** `const int& a = 5;`
- **B)** `int& b = 5;`
- **C)** `int& c = x;`
- **D)** `const int& d = x + 1;`

<details><summary>Show answer</summary>

**Correct: B**

`int& b = 5;` fails: a non-const reference must bind to a variable (an lvalue), and `5` is a temporary (`cannot bind non-const lvalue reference of type 'int&' to an rvalue of type 'int'`). A `const int&` may bind to a temporary such as `5` or `x + 1`.

</details>

**Q47. True or false: with `std::array<int, 100> a; auto& r = a;`, `sizeof(r)` is 8 on x86-64, the size of a pointer.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** `sizeof` applied to a reference gives the size of the referred object: 400 bytes here. The language gives no way to measure a reference itself (stored in a struct, it takes 8 bytes on x86-64 with g++).

</details>

**Q48. Which of these are good reasons to use a pointer instead of a reference? Select all that apply.**

- **A)** The value may be absent
- **B)** It must refer to different objects over time
- **C)** To avoid copying a big argument
- **D)** So the function can change the caller's variable

<details><summary>Show answer</summary>

**Correct: A, B**

A pointer can be `nullptr`, so it can express "no object", and it can be re-pointed, so it can walk through objects. Avoiding a copy and letting a function change the caller's variable are both done just as well by a reference (`const T&`, `T&`).

</details>

**Q49. Returning `int&` from a member function like `int& at(int i) { return values[i]; }` is fine, but returning `int&` to a local variable is a bug. Explain the difference.**

<details><summary>Show answer</summary>

A reference is only valid while the object it refers to exists. `values` is a member, so it lives as long as the object you called `at` on; the caller gets a reference to a living element (and can even assign through it). A local variable is destroyed when the function returns, so a reference to it **dangles** at once and using it is undefined behaviour (g++ warns `reference to local variable ... returned`). Return locals **by value**.

</details>

### 05 — Classes & Encapsulation  (10 Qs)
**Q50. If `private` gives no runtime security, what is the real point of making data private?**

<details><summary>Show answer</summary>

Two real benefits: (1) **Invariant safety** — every change must go through a public method that can *validate* it, so the object can never be put into an illegal state. (2) **Freedom to change internals** — since outside code can't touch the fields directly, you can later change how the data is stored without breaking any user of the class. `private` is a *design/compile-time* tool for controlled change, not a runtime guard against attackers.

</details>

**Q51. What is a class invariant?**

<details><summary>Show answer</summary>

An **invariant** is a rule that must always be true for a valid object — e.g. a `BankAccount`'s balance must never be negative. By keeping `balance` private and only changing it through `deposit()`/`withdraw()`, each of which checks the rule, the invariant is guaranteed after every operation, so the object is never left inconsistent.

</details>

**Q52. Show how a method can protect an invariant that a public field could not.**

<details><summary>Show answer</summary>

A method can validate *before* writing; a public field can be set to anything:
```cpp
class Account {
    double balance = 0;
public:
    bool withdraw(double amt){
        if (amt < 0 || amt > balance) return false; // guard
        balance -= amt; return true;
    }
};
```
If `balance` were public, any code could do `a.balance = -500;` and break the invariant. The method is the single validated gate.

</details>

**Q53. What does this print?**

```cpp
class Account {
    int balance = 0;
public:
    void deposit(int a)  { if (a > 0) balance += a; }
    bool withdraw(int a) { if (a > balance) return false; balance -= a; return true; }
    int  get() const     { return balance; }
};

int main() {
    Account acc;
    acc.deposit(100);
    acc.withdraw(150);
    acc.withdraw(30);
    std::cout << acc.get();
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
70
```

Every change goes through a method that checks it. `deposit(100)` sets 100; `withdraw(150)` is refused (it would overdraw), so the balance stays 100; `withdraw(30)` leaves 70.

</details>

**Q54. True or false: making a member `private` stops other code from reading that object's memory at runtime.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** `private` is a compile-time rule: the compiler refuses direct access from other code. Nothing protects the bytes at runtime. Its purpose is controlled change and protecting invariants.

</details>

**Q55. What does this print?**

```cpp
class Counter {
    int count = 0;
public:
    void add() { count++; }
    int get() const { return count; }
};

int main() {
    Counter a, b;
    a.add(); a.add(); b.add();
    std::cout << a.get() << " " << b.get();
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
2 1
```

Each object has its own `count`. `a.add()` runs twice on `a`, `b.add()` once on `b`, so `a` holds 2 and `b` holds 1. Member functions are shared code, but the data they work on belongs to the object they are called on.

</details>

**Q56. Inside a member function of class `Player`, can you read the `private` member `health` of **another** `Player` object passed as a parameter?**

- **A)** Yes: access is checked per class, not per object
- **B)** No: private members are visible only through `this`
- **C)** Only if the other object is `const`
- **D)** Only if `health` is declared `protected`

<details><summary>Show answer</summary>

**Correct: A**

**Yes.** Access control is checked per class, not per object: any member function of `Player` may use the private members of any `Player`. That is how comparison functions and copy constructors read the other object's data.

</details>

**Q57. True or false: adding a member function to a class makes every object of that class bigger.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** Member functions are stored once, in the program's code. Objects contain only the data members (plus padding, and a hidden pointer if the class has virtual functions, lesson 14).

</details>

**Q58. Why is a class with a public getter **and** an unchecked setter for every field hardly better than a struct with public fields? What should you write instead?**

<details><summary>Show answer</summary>

An unchecked setter lets any code store any value, so the invariant is as unprotected as with a public field; you only added typing. Instead: keep the data private, validate in the constructor, and offer operations that say what users want (`deposit`, `withdraw`, `addMinutes`), each keeping the rule. Add a getter only for values outside code really needs to read, and a setter only if it validates.

</details>

**Q59. What role does the constructor play in keeping a class invariant?**

<details><summary>Show answer</summary>

Member functions keep the invariant true **after each change**, but the object must also **start** valid. The constructor runs when the object is created; it checks its arguments and either sets up a valid state or refuses (typically by throwing), so no invalid object ever exists. Without that, a default-constructed object could break the rule before any method is called.

</details>

### 06 — Classes vs Structs  (9 Qs)
**Q60. What are the ONLY two language-level differences between a `class` and a `struct`?**

<details><summary>Show answer</summary>

(1) **Default member access**: `class` members are `private` by default, `struct` members are `public` by default. (2) **Default inheritance mode**: `class B : A` is private inheritance by default, `struct B : A` is public by default. Everything else — constructors, methods, virtual functions, templates, inheritance — is identical.

</details>

**Q61. Is `x` accessible from outside here?**

```cpp
class C { int x; };
int main(){ C c; c.x = 5; }
```

<details><summary>Show answer</summary>

**No.** In a `class`, members are `private` by default, and `x` has no access specifier, so it's private — `c.x = 5;` from outside is a compile error. Change `class` to `struct` and `x` becomes public, so it would compile. That default is the whole practical difference.

</details>

**Q62. By convention, when do you use a `struct` rather than a `class`?**

<details><summary>Show answer</summary>

Use a **`struct`** for a passive bundle of public data with little or no behaviour (a plain-old-data aggregate, e.g. `struct Point{int x,y;};`). Use a **`class`** for an encapsulated type that maintains invariants and exposes behaviour through methods while hiding its data. The compiler treats them the same — this is purely a readability convention.

</details>

**Q63. Which of these are real language differences between `class` and `struct`? Select all that apply.**

- **A)** Default member access
- **B)** Default inheritance mode
- **C)** Only a `class` can have virtual functions
- **D)** Only a `class` can have constructors

<details><summary>Show answer</summary>

**Correct: A, B**

Only the two **defaults** differ: members are `private` in a `class` and `public` in a `struct`, and inheritance is private vs public by default. Both can have constructors, virtual functions and everything else.

</details>

**Q64. `struct B { int x; };` and `class D : B {};`. Does `D d; d.x = 1;` compile?**

- **A)** Yes: `struct` members are always public
- **B)** No: `class` inherits privately by default, so `x` is private in `D`
- **C)** Yes: inheritance is always public
- **D)** No: `x` is private in `B`

<details><summary>Show answer</summary>

**Correct: B**

**No.** A `class` inherits **privately** by default, so `x` becomes private inside `D`. Writing `class D : public B` (or `struct D : B`) makes it compile.

</details>

**Q65. What does this print?**

```cpp
struct P { int a; int b = 5; int c; };

int main() {
    P p{1};
    std::cout << p.a << p.b << p.c;
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
150
```

`P` is an aggregate. `p{1}` sets `a = 1`; `b` is not given, so it uses its default member initializer, 5; `c` is not given and has no default, so it is set to 0.

</details>

**Q66. Which of these types can be initialized with `T t{1, 2};` as an aggregate (member by member)?**

- **A)** `struct A { int x; int y; };`
- **B)** `struct B { B(int v) : x(v), y(v) {} int x, y; };`
- **C)** `struct C { private: int x, y; };`
- **D)** `struct D { virtual void f() {} int x, y; };`

<details><summary>Show answer</summary>

**Correct: A**

Only `struct A { int x; int y; };`: all data public, no user-declared constructor, no virtual functions. `B` has a user-declared constructor, `C` has private data, and `D` has a virtual function, so none of them is an aggregate.

</details>

**Q67. True or false: a C compiler accepts `struct Point { int x; void move(); };`.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** In C a struct may contain only data members. gcc stops with `field 'move' declared as a function`. Member functions, access specifiers and constructors are C++ additions.

</details>

**Q68. `struct Point { int x, y; };` was used as `Point p{1, 2};` all over a project. Someone adds `Point(int v) : x(v), y(v) {}`. Why do those lines stop compiling, and what are two fixes?**

<details><summary>Show answer</summary>

With a user-declared constructor, `Point` is no longer an **aggregate**, so `{1, 2}` no longer fills the members; it must match a constructor, and there is none taking two `int`s (`no matching function for call to 'Point::Point(<brace-enclosed initializer list>)'`). Fixes: also add `Point(int x, int y)`, or remove the constructor and keep `Point` a plain aggregate (give the members default values instead).

</details>

### 07 — How to Write a Class  (11 Qs)
**Q69. Why does this compile but fail to link with 'undefined reference to Entity::GetX()'?**

```cpp
// entity.h
class Entity { int x; public: int GetX(); };
// entity.cpp
int GetX() { return 42; }   // note: no Entity::
```

<details><summary>Show answer</summary>

The out-of-class definition is missing the `Entity::` qualifier, so `int GetX(){...}` defines an **unrelated free function** named `GetX`, not the member. The class's declared `GetX()` therefore has **no definition**, and the linker complains. Fix: `int Entity::GetX() { return x; }`.

</details>

**Q70. When should a member function be marked `const`?**

<details><summary>Show answer</summary>

Mark a method `const` whenever it **doesn't modify the object's state** — typically getters: `int GetX() const;`. The payoff: it can then be called on `const` objects and `const` references, and the compiler enforces the read-only promise (modifying a member inside a `const` method is an error unless the member is `mutable`). Missing `const` on getters is something interviewers notice.

</details>

**Q71. What happens if you put a non-inline function's full body in a header that multiple .cpp files include?**

<details><summary>Show answer</summary>

You get a **duplicate-symbol link error**, because of the **One Definition Rule (ODR)**: a non-inline function may be *defined* only once in the whole program. A header is textually pasted into every `.cpp` that `#include`s it, so a full body in the header becomes a definition in *each* including `.cpp` → multiple definitions. Fix: put the **declaration** in the header and the single **definition** in one `.cpp` (or mark it `inline`).

</details>

**Q72. What is the difference between a declaration and a definition?**

<details><summary>Show answer</summary>

A **declaration** tells the compiler something *exists* and its type/signature (`int GetX();`) — it can appear many times. A **definition** actually provides the body or storage (`int Entity::GetX(){return x;}`) — it must appear exactly once (ODR). Declarations live in headers; the single definition lives in a source file.

</details>

**Q73. `Entity` declares `int GetX() const;`. Which out-of-class definition is correct?**

- **A)** `int GetX() const { return x; }`
- **B)** `int Entity::GetX() const { return x; }`
- **C)** `int Entity.GetX() const { return x; }`
- **D)** `Entity::int GetX() const { return x; }`

<details><summary>Show answer</summary>

**Correct: B**

**`int Entity::GetX() const { return x; }`**: the `Entity::` qualifier ties it to the class, and `const` must match the declaration. Without `Entity::` you define an unrelated global function and the member stays undefined (a link error).

</details>

**Q74. True or false: a member function defined inside the class body is implicitly `inline`.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: A**

**True.** That is why such a definition can sit in a header included by many `.cpp` files without breaking the One Definition Rule.

</details>

**Q75. What does this print?**

```cpp
class Box {
    int w = 2, h = 3;
public:
    int area() const { return w * h; }
    void grow() { w++; h++; }
};

void show(const Box& b) { std::cout << b.area(); }

int main() {
    Box b;
    b.grow();
    show(b);
    b.grow();
    std::cout << " " << b.area();
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
12 20
```

`show` takes a `const Box&`, so it can only call `const` members; `area()` is `const`, so the call compiles. After one `grow()` the box is 3 x 4 = 12; after the second, 4 x 5 = 20.

</details>

**Q76. `point.h` has no include guard. `main.cpp` includes `point.h` and also `shape.h`, which itself includes `point.h`. What happens when you build?**

- **A)** Compile error: `redefinition of 'struct Point'`
- **B)** Link error: `multiple definition of Point`
- **C)** It builds: the second copy is ignored
- **D)** It builds, with a warning

<details><summary>Show answer</summary>

**Correct: A**

`main.cpp` gets the class definition pasted in twice, and a class may be defined only once per translation unit: g++ stops with `redefinition of 'struct Point'` while **compiling** `main.cpp`. An include guard or `#pragma once` in `point.h` fixes it.

</details>

**Q77. A member is declared in the class as `virtual void draw(int scale = 1) const;`. Which parts must **not** be repeated in the out-of-class definition? Select all that apply.**

- **A)** The default argument `= 1`
- **B)** The trailing `const`
- **C)** The keyword `virtual`
- **D)** The return type `void`

<details><summary>Show answer</summary>

**Correct: A, C**

The definition is `void Shape::draw(int scale) const { ... }`. The default argument and `virtual` appear only in the declaration (repeating them gives `default argument given for parameter 1` and `'virtual' outside class declaration`). The trailing `const` **must** be repeated, and so must the return type.

</details>

**Q78. True or false: `g++ main.cpp -o app` is enough to build a program whose member functions are defined in `bank_account.cpp`.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** `main.cpp` compiles (the header declares the members), but the bodies are in `bank_account.cpp`, which was never compiled, so the linker reports `undefined reference` for each of them. Build with `g++ main.cpp bank_account.cpp -o app`.

</details>

**Q79. Why do tiny getters often stay in the class body in the header, while bigger member functions go in the `.cpp`?**

<details><summary>Show answer</summary>

A function defined in the class body is implicitly `inline`, so it may appear in every `.cpp` that includes the header without breaking the One Definition Rule, and the compiler can inline it at each call. Bigger functions go in the `.cpp`: the header stays short and readable, and changing a body recompiles only that one `.cpp` instead of every file that includes the header.

</details>

### 08 — Static (outside classes)  (11 Qs)
**Q80. What does calling `counter()` three times in a row print?**

```cpp
int counter(){ static int n = 0; return ++n; }
```

<details><summary>Show answer</summary>

It prints **1 2 3**. The `static` local `n` is initialized to 0 only **once** (a constant like 0 is already in place before `main` starts), then **retains its value between calls** (lifetime = the whole program, scope = the function). So each call increments the same `n`: 1, 2, 3. Without `static`, `n` would reset to 0 each call and print 1 1 1.

</details>

**Q81. What does `static` do to a variable declared at file/global scope?**

<details><summary>Show answer</summary>

It gives the variable **internal linkage** — the symbol is visible **only within that translation unit** (that `.cpp`). Other files can't see or link to it, and two files can each have their own `static int x;` with no clash. This is the opposite of `extern`, which shares one symbol across files.

</details>

**Q82. Why does a `static` local variable initialize safely regardless of other globals' init order?**

<details><summary>Show answer</summary>

Because a `static` local initializes **on first use** — the first time control reaches its declaration — not at program startup. This dodges the *static initialization order fiasco*: globals in **different** translation units are initialized in an **unspecified** order, so one global's constructor using another (from a different `.cpp`) may run before that other is initialized (a bug). A static local's init order is instead defined by *call order*, which is deterministic. (Basis of the Meyers singleton.)

</details>

**Q83. What does `extern int x;` declare?**

<details><summary>Show answer</summary>

It's a **declaration** (not a definition) saying: 'an `int x` with external linkage is defined in some *other* translation unit — share that one.' It reserves no storage itself. If no `.cpp` actually *defines* `int x;` anywhere, the linker can't find the symbol and reports **'undefined reference to x'**.

</details>

**Q84. What does this print?**

```cpp
void f() {
    static int s = 0;
    int n = 0;
    ++s; ++n;
    std::cout << s << n << " ";
}

int main() { f(); f(); f(); }
```

<details><summary>Show answer</summary>

**Expected output:**
```
11 21 31
```

`s` is `static`: created once, it keeps its value, so it counts 1, 2, 3. `n` is a normal local, re-created as 0 on every call, so it is always 1.

</details>

**Q85. `a.cpp` has `static int helper = 5;` at file scope. `b.cpp` says `extern int helper;` and uses it. What happens?**

- **A)** It works: `extern` finds it
- **B)** The link fails: `static` makes `helper` private to `a.cpp`
- **C)** It works only if `b.cpp` includes a header from `a.cpp`
- **D)** It works, but `helper` is read-only in `b.cpp`

<details><summary>Show answer</summary>

**Correct: B**

**The link fails** (`undefined reference to 'helper'`). File-scope `static` gives internal linkage: the name is private to `a.cpp`, so `b.cpp`'s `extern` finds no definition.

</details>

**Q86. A header contains `static int counter = 0;` and is included by `a.cpp` and `b.cpp`. A function in `a.cpp` sets `counter = 5`. What value does code in `b.cpp` read?**

- **A)** 0: each file has its own copy
- **B)** 5: they share one variable
- **C)** Link error: multiple definition
- **D)** Compile error: static is not allowed in headers

<details><summary>Show answer</summary>

**Correct: A**

**0.** `static` at file scope gives internal linkage, so every file that includes the header gets its **own private** `counter`. `a.cpp` changes only its copy. No compile or link error appears: that's why a `static` variable in a header is a silent bug. Use `inline int counter = 0;` (C++17) for one shared variable.

</details>

**Q87. Which of these, written at file scope in a `.cpp`, have **internal linkage**? Select all that apply.**

- **A)** `static int a;`
- **B)** `const int b = 1;`
- **C)** `int c;`
- **D)** `namespace { int d; }`
- **E)** `extern int e;`

<details><summary>Show answer</summary>

**Correct: A, B, D**

`static int a;`, `const int b = 1;` (a `const` global has internal linkage in C++) and anything in an unnamed namespace are private to the file. A plain `int c;` has external linkage, and `extern int e;` refers to an external variable defined elsewhere.

</details>

**Q88. True or false: in C++, if `limits.cpp` defines `const int maxUsers = 10;` at file scope, another file can use it after declaring `extern const int maxUsers;`.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** In C++ a `const` global has internal linkage, so the link fails with `undefined reference` to `maxUsers`. Define it as `extern const int maxUsers = 10;`, or put `inline constexpr int maxUsers = 10;` in a header. (In C, a `const` global has external linkage, so this would work.)

</details>

**Q89. You want one global setting shared by every `.cpp` that includes `config.h`. Which line in the header does that on its own, with no extra definition in a `.cpp`?**

- **A)** `int verbosity = 1;`
- **B)** `static int verbosity = 1;`
- **C)** `inline int verbosity = 1;`
- **D)** `extern int verbosity;`

<details><summary>Show answer</summary>

**Correct: C**

**`inline int verbosity = 1;`** (C++17): every file includes the definition and the linker merges them into one variable. `int verbosity = 1;` gives `multiple definition`, `static` gives every file its own copy, and `extern int verbosity;` is only a declaration: it still needs `int verbosity = 1;` in exactly one `.cpp`.

</details>

**Q90. Why do modern C++ guidelines prefer an unnamed namespace to `static` for file-private names?**

<details><summary>Show answer</summary>

It gives internal linkage to **every** kind of declaration, including classes, structs and enums, which `static` can't be applied to (`static struct P {...};` is an error). One block covers many declarations at once. It also keeps two files' same-named helper classes apart, which would otherwise silently break the One Definition Rule.

</details>

### 09 — Static (for Classes & Structs)  (10 Qs)
**Q91. Does a `static` data member increase each object's `sizeof`?**

<details><summary>Show answer</summary>

No. A `static` member is **shared by all objects** — there is exactly **one** copy in static storage, not one per object. So it doesn't live inside the object and doesn't count toward `sizeof(obj)`. (An ordinary non-static member does live in each object and adds to its size.) A classic use is a counter of how many instances exist.

</details>

**Q92. Why does this fail to link with 'undefined reference to Entity::count'?**

```cpp
struct Entity { static int count; };
// no definition anywhere
int main(){ Entity::count++; }
```

<details><summary>Show answer</summary>

A **non-inline static data member** is only *declared* inside the class — it still needs exactly one **definition** outside it. Without that, the linker can't find storage for `Entity::count`. Fix (pre-C++17): add `int Entity::count = 0;` in one `.cpp`. Fix (C++17+): declare it `inline static int count = 0;` inside the class, which provides the definition automatically.

</details>

**Q93. Why can't a `static` member function read a normal (non-static) data member?**

<details><summary>Show answer</summary>

A static member function has **no `this` pointer** — it isn't tied to any particular object, and you can call it as `Class::fn()` with no instance at all. Since per-object data lives *in an object* and there's no object in hand, there's nothing to read it from. A static function can only touch **static** members (or data passed in as arguments).

</details>

**Q94. On x86-64, what does this print?**

```cpp
struct Entity {
    static int count;
    int id;
    Entity() : id(++count) {}
};
int Entity::count = 0;

int main() {
    Entity a, b, c;
    std::cout << Entity::count << " " << b.id << " " << sizeof(Entity);
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
3 2 4
```

One shared `count` for all objects: three constructions make it 3, and `b` was second, so `b.id` is 2. A static member lives outside the objects, so `sizeof(Entity)` is just the `int id`: 4.

</details>

**Q95. True or false: a `static` member function can read the object's non-static data members.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** A static member function has no `this`, so there is no object to read from; it can only use static members (or an object passed in). g++ rejects it.

</details>

**Q96. What does this print?**

```cpp
struct Player {
    inline static int alive = 0;
    Player()  { ++alive; }
    ~Player() { --alive; }
};

int main() {
    {
        Player a;
        Player b = a;
        std::cout << Player::alive << " ";
    }
    std::cout << Player::alive;
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
1 -1
```

The constructor increments the shared `alive`, but `Player b = a;` uses the compiler-generated **copy constructor**, which doesn't run `++alive`. So inside the block the count is 1 although two players exist. Both destructors run `--alive`, so after the block it is -1. Fix: a copy constructor that also increments.

</details>

**Q97. Which of these define a static data member **inside** the class, so no separate definition in a `.cpp` is needed? Select all that apply.**

- **A)** `inline static int x = 0;`
- **B)** `static constexpr int y = 5;`
- **C)** `static int z;`
- **D)** `static int Player::alive = 0;` written outside the class

<details><summary>Show answer</summary>

**Correct: A, B**

`inline static int x = 0;` (C++17) and `static constexpr int y = 5;` (implicitly inline since C++17) are definitions. A plain `static int z;` is only a declaration: it needs `int C::z = 0;` in one `.cpp`. `static int Player::alive = 0;` doesn't compile: `static` may not appear on the out-of-class definition.

</details>

**Q98. True or false: the address of a static member function can be stored in a plain function pointer such as `void (*fp)(int)`.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: A**

**True.** A static member function has no `this`, so it is called like a free function and its address is an ordinary function pointer. That's why it can be passed to C APIs like `pthread_create` or `qsort`. A normal member function needs an object, so its address is a pointer-to-member, which doesn't fit.

</details>

**Q99. Why are factory functions such as `Temperature::fromCelsius(double)` and `Temperature::fromFahrenheit(double)` written as **static** member functions instead of constructors?**

<details><summary>Show answer</summary>

Two constructors that both take one `double` can't be overloaded: the compiler couldn't tell them apart. Static factories have **names**, so each says what its argument means. They are static because they're called **before** any object exists (`Temperature::fromCelsius(25)`), and as members they can still call a private constructor.

</details>

**Q100. Give two drawbacks of the singleton pattern (`static Logger& instance()`).**

<details><summary>Show answer</summary>

Any two of: it is **hidden global state**, so any code can reach and change it and dependencies are invisible; it is **hard to test** because a fake can't be substituted; only its **creation** is thread-safe, not its use; and objects destroyed at program exit may still try to use it after it is gone.

</details>

### 10 — Enums  (11 Qs)
**Q101. In `enum E { A = 3, B, C };`, what are the values of `B` and `C`?**

<details><summary>Show answer</summary>

`B == 4` and `C == 5`. Enumerators without an explicit value take the **previous value + 1**. `A` is set to 3, so `B` becomes 4 and `C` becomes 5. (If nothing were assigned at all, they would start at 0.)

</details>

**Q102. Give two problems with a plain `enum` that `enum class` fixes.**

<details><summary>Show answer</summary>

(1) **Name leakage**: a plain `enum`'s names go into the enclosing scope, so `enum Color{Red}` and `enum Fruit{Red}` collide. `enum class Color{Red}` scopes it as `Color::Red`. (2) **Implicit int conversion**: a plain enum converts to `int` silently, so you can accidentally compare unrelated enums or do arithmetic on them; `enum class` blocks that (you must `static_cast<int>(x)` deliberately).

</details>

**Q103. How do you make an enum occupy only 1 byte instead of the default 4?**

<details><summary>Show answer</summary>

Give it an explicit **underlying type**:
```cpp
enum class Color : uint8_t { Red, Green, Blue };
```
The `: uint8_t` fixes storage to 1 byte — useful when packing many enum values into structs or over the wire.

</details>

**Q104. How do you convert an `enum class` value to an `int`?**

<details><summary>Show answer</summary>

With an explicit cast: `int n = static_cast<int>(Color::Green);`. It's deliberately *not* automatic — `enum class` is type-safe and refuses implicit conversion to `int`, which prevents accidental mixing of unrelated enums and silent arithmetic bugs. You opt in with the cast only when you really mean it.

</details>

**Q105. What does this print?**

```cpp
enum Level { Low, Mid = 5, High };
std::cout << Low << " " << Mid << " " << High;
```

<details><summary>Show answer</summary>

**Expected output:**
```
0 5 6
```

Values start at 0 and count up from the last assigned one: `Low` is 0, `Mid` is set to 5, so `High` is 6. A plain `enum` converts to `int` implicitly, so `cout` prints the numbers.

</details>

**Q106. `enum class Color { Red, Green };` What does `int x = Color::Green;` do?**

- **A)** Sets `x` to 1
- **B)** Compile error: needs `static_cast<int>`
- **C)** Sets `x` to 0
- **D)** Compiles but is undefined behaviour

<details><summary>Show answer</summary>

**Correct: B**

**It doesn't compile.** `enum class` has no implicit conversion to `int`; write `int x = static_cast<int>(Color::Green);` (which gives 1).

</details>

**Q107. What does this print?**

```cpp
enum class Dir { North, East, South, West };

Dir turnRight(Dir d) { return static_cast<Dir>((static_cast<int>(d) + 1) % 4); }

int main() {
    Dir d = turnRight(Dir::West);
    std::cout << static_cast<int>(d) << " " << (d == Dir::North);
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
0 1
```

`West` is 3. `turnRight` converts it to `int`, adds 1 and wraps with `% 4`, giving 0, then casts back to `Dir::North`. So it prints `0`, then `1` because the comparison is true.

</details>

**Q108. Given `enum class Color { Red, Green, Blue };` and `enum class Light { Red, Green };`, which lines compile? Select all that apply.**

- **A)** `int n = Color::Red;`
- **B)** `int n = static_cast<int>(Color::Red);`
- **C)** `Color c = static_cast<Color>(1);`
- **D)** `Color c = 1;`
- **E)** `bool b = (Color::Red == Light::Red);`

<details><summary>Show answer</summary>

**Correct: B, C**

Only the explicit casts compile: `static_cast<int>(Color::Red)` and `static_cast<Color>(1)`. An `enum class` never converts to `int` implicitly, an `int` never converts to an enum implicitly, and two different enum class types can't be compared.

</details>

**Q109. True or false: with `enum class Color { Red, Green, Blue };`, the expression `static_cast<Color>(7)` is undefined behaviour.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** An `enum class` has a fixed underlying type (`int`), so any `int` value is a valid `Color`; it just matches no enumerator, so a name function needs a fallback. (For a plain enum *without* a fixed type, a value outside its range is undefined behaviour.)

</details>

**Q110. On x86-64 with g++, what is `sizeof(Pixel)` for `enum class Color : std::uint8_t { Red, Green, Blue }; struct Pixel { Color c; std::uint8_t alpha; };`?**

- **A)** 2
- **B)** 5
- **C)** 8
- **D)** 16

<details><summary>Show answer</summary>

**Correct: A**

**2.** `: std::uint8_t` makes `Color` one byte, and `alpha` adds one more, with no padding needed. With the default `int` underlying type the struct would be 8 bytes (4 + 1, padded to a multiple of 4).

</details>

**Q111. C++ has no built-in way to print an enum's name. How do you write a name function for an `enum class`, and why leave out `default`?**

<details><summary>Show answer</summary>

A function with a `switch` that returns a string literal per enumerator (`case Color::Red: return "Red";`), plus a fallback `return "unknown";` after the switch: a cast can create a value with no name, and without the fallback g++ warns `control reaches end of non-void function`. Leave out `default` so that when a new enumerator is added, `-Wall` warns `enumeration value '...' not handled in switch` at every switch that needs updating.

</details>

### 11 — Constructors  (11 Qs)
**Q112. Why does `Entity e;` stop compiling once you add a constructor that takes arguments?**

```cpp
class Entity {
public:
    Entity(int x) { /*...*/ }   // now Entity e; fails
};
```

<details><summary>Show answer</summary>

As soon as you **declare any constructor of your own**, the compiler stops providing the free **default (no-argument) constructor**. So `Entity e;` (which needs a no-arg ctor) no longer compiles. Fixes: add your own no-arg ctor, or explicitly request the compiler's with `Entity() = default;`.

</details>

**Q113. Name two cases where a member initializer list is *required*, not merely preferred.**

<details><summary>Show answer</summary>

The `: member(value), ...` list (which initializes members directly, before the body) is **required** for: (1) **`const` members** — they must be initialized, never assigned; and (2) **reference members** — same reason (a reference must bind at creation). It's also required for member objects whose type has **no default constructor**.
```cpp
class A { const int id; int& ref;
  A(int i, int& r) : id(i), ref(r) {}  // must use init list
};
```

</details>

**Q114. Why prefer an initializer list over assigning members inside the constructor body?**

<details><summary>Show answer</summary>

The init list **constructs each member once, directly** with the right value. Assigning in the body first **default-constructs** the member, then **overwrites** it — two steps, wasteful for non-trivial types, and outright illegal for `const`/reference members. So the init list is both faster and more capable.

</details>

**Q115. What does `Entity e();` actually declare?**

<details><summary>Show answer</summary>

A **function** named `e` that takes no parameters and returns an `Entity` — *not* an object. This is the **'most vexing parse'**: the compiler prefers to read it as a declaration. To create an object, write `Entity e;` or `Entity e{};` (the brace form avoids the ambiguity).

</details>

**Q116. Which line creates a default-constructed `Entity` object named `e`?**

- **A)** `Entity e();`
- **B)** `Entity e;`
- **C)** `Entity e = Entity;`
- **D)** `Entity() e;`

<details><summary>Show answer</summary>

**Correct: B**

**`Entity e;`** creates the object. `Entity e();` is the *most vexing parse*: it declares a function named `e` that returns an `Entity`. The other two do not compile.

</details>

**Q117. Which members **must** be initialized in the member initializer list? Select all that apply.**

- **A)** A `const int` member
- **B)** An `int&` member
- **C)** A member object whose class has no default constructor
- **D)** A `std::string` member

<details><summary>Show answer</summary>

**Correct: A, B, C**

A `const` member and a reference member can't be assigned after construction, and a member object with no default constructor can't be built without arguments, so all three need the initializer list. A `std::string` has a default constructor, so it can be assigned in the body (the list is still preferred).

</details>

**Q118. What does this print?**

```cpp
struct R {
    R()             { std::cout << "A"; }
    R(int, int = 5) { std::cout << "B"; }
    R(const R&)     { std::cout << "C"; }
};

int main() {
    R x;
    R y(1);
    R z(1, 2);
    R w = y;
    R v{};
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
ABBCA
```

`R x;` uses the default constructor (A). `R y(1);` and `R z(1, 2);` both match `R(int, int = 5)`; the default argument fills in the missing second value (B, B). `R w = y;` builds a new object from an existing one: the copy constructor (C). `R v{};` with empty braces value-initializes the object, which calls the default constructor (A).

</details>

**Q119. `struct P { int x, y; P(int a, int b) : x(a), y(b) {} };` What does `P p{2.9, 1};` do with g++?**

- **A)** Compiles; `p.x` is 2
- **B)** Compiles; `p.x` is 3
- **C)** Compile error: narrowing conversion
- **D)** Compiles, but it is undefined behaviour

<details><summary>Show answer</summary>

**Correct: C**

**It doesn't compile**: braces forbid narrowing conversions, and `2.9` to `int` would lose information (`error: narrowing conversion of '2.8999999999999999e+0' from 'double' to 'int'`). With parentheses, `P p(2.9, 1);` compiles and silently stores 2.

</details>

**Q120. True or false: if a constructor throws an exception, the destructor of that object runs to clean up.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** The object never finished being built, so it never existed and its destructor does not run. Members and base classes that were already fully constructed **are** destroyed. That's why resources should be held by members that clean up after themselves (RAII, lesson 12).

</details>

**Q121. Which of these are true about constructors? Select all that apply.**

- **A)** A class can have several constructors
- **B)** A constructor can have default arguments
- **C)** A constructor can be declared `virtual`
- **D)** A constructor can return an error code

<details><summary>Show answer</summary>

**Correct: A, B**

Constructors **can be overloaded** and **can have default arguments**. They **can't be virtual** (g++: `constructors cannot be declared 'virtual'`) and have **no return value**, so they report failure by throwing, not with an error code.

</details>

**Q122. What does `FileHandle(const FileHandle&) = delete;` do, and why would a class want it?**

<details><summary>Show answer</summary>

It **deletes the copy constructor**: any attempt to copy a `FileHandle` is a compile error (`use of deleted function`). A class that owns a unique resource, such as a file descriptor, must not be copied: two copies would both close the same descriptor. Deleting the copy turns that run-time bug into a compile-time error (`std::unique_ptr` does the same).

</details>

### 12 — Destructors & RAII  (11 Qs)
**Q123. `Base` has a non-virtual destructor — what happens when `delete b;` runs?**

```cpp
struct Base { ~Base(){} };            // non-virtual!
struct Derived : Base { /* owns memory */ };
Base* b = new Derived();
delete b;
```

<details><summary>Show answer</summary>

Only `~Base()` runs. `delete b` goes through a `Base*` whose destructor is non-virtual, so it uses static dispatch and `~Derived()` is **never called** — anything `Derived` owns is leaked (the standard calls this undefined behaviour). To make it correct, declare the base destructor **`virtual`** (`virtual ~Base();`); then `delete b` runs `~Derived()` first, then `~Base()`.

</details>

**Q124. Why does RAII make resource cleanup automatic and exception-safe?**

<details><summary>Show answer</summary>

**RAII** (Resource Acquisition Is Initialization) ties a resource's lifetime to an object: acquire it in the **constructor**, release it in the **destructor**. A local object's destructor runs automatically when it leaves scope — **including when an exception unwinds the stack** — so the resource is always released, with no manual `free`/`close`/`unlock` to forget. `std::unique_ptr`, `std::lock_guard`, and `std::fstream` all rely on this.

</details>

**Q125. What is the Rule of Three?**

<details><summary>Show answer</summary>

If a class needs a custom **destructor**, it almost certainly also needs a custom **copy constructor** and **copy assignment operator**. Why: a class that owns a raw resource and defines only a destructor gets a compiler-generated **shallow copy** — two objects end up owning the same pointer, and when both destruct, the memory is freed twice (**double-free**). Defining all three (deep copy) prevents it. (C++11 adds move ctor/assignment → Rule of Five.)

</details>

**Q126. In what order are members and base/derived subobjects destroyed?**

<details><summary>Show answer</summary>

**Members** are destroyed in the **reverse** order of their declaration. For an inheritance chain the **derived** destructor runs first, then the **base** destructor — the mirror image of construction (base→derived to construct, derived→base to destroy).

</details>

**Q127. What does this print?**

```cpp
struct T {
    char name;
    T(char n) : name(n) { std::cout << "+" << name; }
    ~T() { std::cout << "-" << name; }
};

int main() {
    T a('A');
    {
        T b('B');
    }
    T c('C');
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
+A+B-B+C-C-A
```

Objects are destroyed at the end of their scope. `B` lives only in the inner block, so it dies before `C` is made. At the end of `main`, locals die in **reverse** order of construction: `C`, then `A`.

</details>

**Q128. True or false: deleting a derived object through a base pointer is safe even when the base destructor is not `virtual`.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** It is undefined behaviour: typically only the base destructor runs, so the derived part is never cleaned up (a leak, or worse). A polymorphic base needs a `virtual` destructor.

</details>

**Q129. What does this print?**

```cpp
struct T {
    char c;
    T(char ch) : c(ch) { std::cout << "+" << c; }
    ~T() { std::cout << "-" << c; }
};

int main() {
    T('t');
    T x('x');
    T* p = new T('p');
    delete p;
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
+t-t+x+p-p-x
```

The temporary `T('t')` dies at the end of its full expression, so `-t` prints before `x` is made. `p` is a heap object and dies only at `delete`. At the end of `main`, the remaining local `x` is destroyed. Note that `delete p` comes before the closing brace, so `-p` prints before `-x`.

</details>

**Q130. A function locks a mutex with a `std::lock_guard` and then throws an exception. When is the mutex unlocked?**

- **A)** While the exception leaves the function, before any catch block runs
- **B)** Only if a catch block calls `unlock()`
- **C)** Never: the mutex stays locked
- **D)** When the program exits

<details><summary>Show answer</summary>

**Correct: A**

**While the exception leaves the function**, before any `catch` block runs: the exception unwinds the stack, the `lock_guard`'s destructor runs, and it unlocks. That is the point of RAII: the release happens on every path, including exceptions.

</details>

**Q131. True or false: if an exception escapes from a destructor, the nearest matching `catch` block handles it like any other exception.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** Destructors are implicitly `noexcept` since C++11, so an escaping exception calls `std::terminate` and the program aborts. g++ warns: `'throw' will always call 'terminate'`. Handle errors inside the destructor instead.

</details>

**Q132. What is the Rule of Zero, and why is it preferred?**

<details><summary>Show answer</summary>

Build a class only from members that manage their own resources (`std::string`, `std::vector`, `std::unique_ptr`, ...) and write **no** destructor, copy or move operations. The compiler-generated ones do the right thing member by member: each member frees its own resource, and a `unique_ptr` member makes the class move-only instead of letting copies double-free. There is no cleanup code to get wrong. Only small classes that own one raw resource need a destructor (and then the Rule of Three/Five).

</details>

**Q133. Which of these end an object's lifetime and run its destructor? Select all that apply.**

- **A)** The closing `}` of the block that declares a local object
- **B)** `delete p;` on a pointer from `new`
- **C)** An exception thrown and passing out of the local's scope
- **D)** `p = nullptr;` on the only raw pointer to a heap object

<details><summary>Show answer</summary>

**Correct: A, B, C**

A local's scope ending, `delete` on a heap object, and an exception passing out of the local's scope (stack unwinding) all run the destructor. Assigning `nullptr` to a raw pointer does **not** destroy the object it pointed to: the object is leaked.

</details>

### 13 — Inheritance  (13 Qs)
**Q134. What is object slicing?**

<details><summary>Show answer</summary>

Slicing happens when you copy a **derived** object into a **base** object *by value* — only the base part is copied and the derived part is 'sliced off', so overrides and extra data are lost.
```cpp
Derived d;
Base b = d;    // SLICED: b holds only the Base part
Base& r = d;   // OK: alias, full object, polymorphism works
Base* p = &d;  // OK: pointer, full object
```
Avoid it by handling polymorphic objects through base **pointers or references**, never by value.

</details>

**Q135. Who can access a `protected` member?**

<details><summary>Show answer</summary>

A `protected` member is accessible to the class's **own methods** and to the methods of its **derived classes** ('the family') — but not to outside code. That's the key difference from `private`, which is accessible **only** to the class's own methods, not even derived classes. `protected` lets you share implementation down the inheritance chain while hiding it from the outside world.

</details>

**Q136. In what order are the base and derived parts constructed and destroyed?**

<details><summary>Show answer</summary>

**Construction:** base first, then derived — the base subobject must be fully built before the derived part relies on it. **Destruction:** the reverse — derived first, then base. A derived object physically contains the base subobject laid out first.

</details>

**Q137. What is the difference between an 'is-a' and a 'has-a' relationship?**

<details><summary>Show answer</summary>

**is-a** means one type is a kind of another (a `Car` **is a** `Vehicle`) — modelled with **inheritance**. **has-a** means one type contains another (a `Car` **has an** `Engine`) — modelled with **composition** (a member object). A common guideline is to prefer composition unless the relationship is genuinely is-a.

</details>

**Q138. What does this print?**

```cpp
struct Base {
    Base()  { std::cout << "B"; }
    ~Base() { std::cout << "~B"; }
};
struct Derived : Base {
    Derived()  { std::cout << "D"; }
    ~Derived() { std::cout << "~D"; }
};

int main() { Derived d; }
```

<details><summary>Show answer</summary>

**Expected output:**
```
BD~D~B
```

Construction goes **base first**, then derived (`B` then `D`). Destruction is the reverse: derived first, then base (`~D` then `~B`).

</details>

**Q139. What does this print?**

```cpp
struct Animal { virtual std::string name() const { return "animal"; } };
struct Dog : Animal { std::string name() const override { return "dog"; } };

void byValue(Animal a)      { std::cout << a.name(); }
void byRef(const Animal& a) { std::cout << a.name(); }

int main() {
    Dog d;
    byValue(d);
    std::cout << " ";
    byRef(d);
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
animal dog
```

`byValue` takes an `Animal` **by value**, so the `Dog` is sliced: only its `Animal` part is copied and `name()` returns `animal`. `byRef` keeps the real object, so the virtual call reaches `Dog::name`.

</details>

**Q140. Give two reasons to choose composition (has-a) over inheritance (is-a) when you only want to reuse another class's code.**

<details><summary>Show answer</summary>

(1) **Looser coupling**: the class uses only the part's public interface, so changes inside the part don't ripple into it, and the part can be swapped for another type later. (2) **Control over the interface**: you expose only the operations you choose. Inheriting would also expose every public base function (e.g. `insert()` on a stack built by inheriting from `std::vector`). Also: the class doesn't falsely become usable wherever the base is expected.

</details>

**Q141. What does this print?**

```cpp
struct Vehicle {
    Vehicle(const char* b) { std::cout << "Vehicle(" << b << ") "; }
    ~Vehicle() { std::cout << "~Vehicle"; }
};
struct Car : Vehicle {
    Car(const char* b, int d) : Vehicle(b) { std::cout << "Car(" << d << ") "; }
    ~Car() { std::cout << "~Car "; }
};

int main() { Car c("Audi", 2); }
```

<details><summary>Show answer</summary>

**Expected output:**
```
Vehicle(Audi) Car(2) ~Car ~Vehicle
```

The base part is built first, in the order the initializer list asks for (`Vehicle(Audi)`), then the derived constructor body (`Car(2)`). At the end of `main`, destruction runs in reverse: `~Car`, then `~Vehicle`.

</details>

**Q142. `Square` inherits from `Rectangle`. A function that sets a rectangle's width to 10 and height to 5 leaves a `Square` with sides 10 and 5. Which principle does this design break?**

- **A)** Liskov substitution
- **B)** Encapsulation
- **C)** RAII
- **D)** The One Definition Rule

<details><summary>Show answer</summary>

**Correct: A**

The **Liskov substitution principle**: a derived object must work anywhere the base is expected. A square can't keep the rectangle's promise that width and height are independent, so `Square` should not inherit from `Rectangle`.

</details>

**Q143. True or false: a derived class automatically gets the base class's constructors.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** Constructors (and the destructor and assignment operators) are not inherited. The derived class calls a base constructor from its initializer list, or opts in with `using Base::Base;`.

</details>

**Q144. Which of these are better modelled with composition (has-a) than with inheritance? Select all that apply.**

- **A)** A `Car` and its `Engine`
- **B)** A `Dog` and `Animal`
- **C)** A `Stack` built on top of `std::vector`
- **D)** A `Manager` and `Employee`

<details><summary>Show answer</summary>

**Correct: A, C**

A car **has** an engine, and a stack is **implemented using** a vector (it shouldn't expose `insert()` in the middle): both are composition. A dog **is an** animal and a manager **is an** employee: those are is-a relationships, so inheritance fits.

</details>

**Q145. With `class D : protected B`, what does a `public` member of `B` become inside `D`?**

- **A)** public
- **B)** protected
- **C)** private
- **D)** not accessible

<details><summary>Show answer</summary>

**Correct: B**

**protected.** Protected inheritance turns the base's public members into protected ones: usable by `D` and classes derived from `D`, but not by outside code.

</details>

**Q146. A base class has `print()` and `print(int)`. The derived class declares only `print()`. Why does `d.print(3)` fail to compile, and how do you fix it?**

<details><summary>Show answer</summary>

**Name hiding**: declaring `print` in the derived class hides **every** base function named `print`, whatever its parameters, so `print(int)` isn't found through `d`. Fix: add `using Base::print;` inside the derived class (or rename the derived function).

</details>

### 14 — Virtual Functions  (12 Qs)
**Q147. What does `a->speak()` print here, and why?**

```cpp
struct Animal { void speak(){cout<<"Animal";} };  // not virtual
struct Dog : Animal { void speak(){cout<<"Dog";} };
Animal* a = new Dog();
a->speak();
```

<details><summary>Show answer</summary>

It prints **"Animal"**. Because `speak()` is **not virtual**, the call uses **static dispatch** — the version is chosen at compile time from the **pointer's type** (`Animal*`), so `Animal::speak` runs regardless of the real object. If you mark `speak()` **`virtual`**, it switches to **dynamic dispatch** — resolved at runtime from the object's *actual* type via the vtable — and it would print "Dog" instead.

</details>

**Q148. How does a virtual call select the right function at runtime, using the vtable and vptr?**

<details><summary>Show answer</summary>

Each class with virtual functions has one **vtable** — an array of function pointers, one slot per virtual function (overrides point to the derived versions). Each **object** stores a hidden **vptr** pointing to its class's vtable. A call `p->speak()` follows the object's vptr to its vtable, indexes the fixed slot for `speak`, and calls whatever pointer is there — so a `Dog` object's vptr leads to `Dog::speak`. That runtime lookup is dynamic dispatch.

</details>

**Q149. What is the cost of using virtual functions?**

<details><summary>Show answer</summary>

Memory: every polymorphic object stores a hidden **vptr** (~8 bytes on 64-bit), plus one vtable per class. Speed: each virtual call adds **one indirection** (load vptr → load slot → call) and usually **can't be inlined**, since the target is chosen at runtime. A class with **no** virtual functions has no vtable/vptr and pays nothing.

</details>

**Q150. What does the `override` specifier do, and why is it worth adding?**

<details><summary>Show answer</summary>

`override` tells the compiler 'this function is meant to override a base `virtual` with a matching signature.' If it *doesn't* actually match (a typo, wrong `const`, wrong parameters), you get a **compile error** instead of silently creating a brand-new function that never gets called. So it catches a common, hard-to-spot bug and documents intent.

</details>

**Q151. What does `final` do in C++?**

<details><summary>Show answer</summary>

On a **virtual function**, `final` forbids any further overriding of it in subclasses. On a **class**, `final` forbids inheriting from that class at all. It's a way to lock down an inheritance hierarchy (and can help the compiler devirtualize calls for speed).

</details>

**Q152. What does this print?**

```cpp
struct Base {
    void a()         { std::cout << "Ba "; }
    virtual void b() { std::cout << "Bb "; }
};
struct Der : Base {
    void a()          { std::cout << "Da "; }
    void b() override { std::cout << "Db "; }
};

int main() {
    Der d;
    Base* p = &d;
    p->a();
    p->b();
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
Ba Db
```

`a()` is not virtual, so `p->a()` uses the **pointer type** (`Base`) and prints `Ba`. `b()` is virtual, so `p->b()` uses the **actual object** (`Der`) and prints `Db`.

</details>

**Q153. A class has no virtual functions. How much does a vptr add to each object?**

- **A)** 8 bytes
- **B)** 4 bytes
- **C)** Nothing: there is no vptr
- **D)** One pointer per member function

<details><summary>Show answer</summary>

**Correct: C**

**Nothing.** Only classes with at least one virtual function get a vtable and a per-object vptr. (On x86-64, `struct { int x; }` is 4 bytes; adding one virtual function makes it 16: an 8-byte vptr plus padding.)

</details>

**Q154. What does this print?**

```cpp
struct Base {
    Base() { who(); }
    virtual ~Base() = default;
    virtual void who() const { std::cout << "B"; }
};
struct Derived : Base {
    void who() const override { std::cout << "D"; }
};

int main() {
    Derived d;
    Base* p = &d;
    p->who();
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
BD
```

Inside `Base()` the object is still only a `Base`, so the virtual call reaches `Base::who` and prints `B`. After construction, `p->who()` goes through the vtable of the real object and prints `D`.

</details>

**Q155. What does this print?**

```cpp
struct Base {
    virtual ~Base() = default;
    virtual void f(int x = 1) const { std::cout << "Base " << x; }
};
struct Derived : Base {
    void f(int x = 2) const override { std::cout << "Derived " << x; }
};

int main() {
    Derived d;
    const Base& b = d;
    b.f();
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
Derived 1
```

The body is chosen at run time (`Derived::f`), but the default argument is filled in at compile time from the static type of `b`, which is `Base&`. So `Derived::f` runs with `x = 1`.

</details>

**Q156. `Dog` derives from `Animal`, which has `virtual void speak() const`, and `Dog d;` exists. Which of these calls print Dog's version? Select all that apply.**

- **A)** `Animal* p = &d; p->speak();`
- **B)** `Animal& r = d; r.speak();`
- **C)** `Animal a = d; a.speak();`
- **D)** `d.Animal::speak();`

<details><summary>Show answer</summary>

**Correct: A, B**

Only calls through a pointer or reference to the base reach the override. `Animal a = d;` makes a sliced `Animal` copy, and a qualified call `d.Animal::speak()` always calls the named class's version.

</details>

**Q157. True or false: a function in a derived class that matches a base `virtual` function's signature is virtual too, even without the `virtual` keyword.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: A**

**True.** Once virtual, always virtual: the override is itself virtual, and a further derived class can override it again (unless it is marked `final`). Write `override` on it to make this visible and checked.

</details>

**Q158. Give two situations where you would not make a function virtual.**

<details><summary>Show answer</summary>

Any two of: (1) the class is a **value type** not meant to be a base (`Point`, `Money`), so a vtable and vptr are pure cost; (2) the type is **known at compile time**, so overloads or templates can choose the function with no run-time cost; (3) **hot code** over many small objects, where the extra memory load per call and the lost inlining are measurable; (4) the function is called from a constructor or destructor and must behave the same in every class (virtual dispatch doesn't reach derived overrides there anyway).

</details>

### 15 — Interfaces / Abstract Classes  (12 Qs)
**Q159. What makes a class abstract in C++?**

<details><summary>Show answer</summary>

A class becomes **abstract** as soon as it declares at least one **pure virtual** function (`virtual void f() = 0;`). An abstract class **cannot be instantiated** directly — `Shape s;` is a compile error.

</details>

**Q160. If you can't instantiate an abstract class, what CAN you do with it?**

<details><summary>Show answer</summary>

You use **pointers or references** to it — that's the whole point of an abstract base: `Shape* s = new Circle();`. As long as the derived class (`Circle`) overrides **every** pure virtual, it's concrete and can be created, and you manipulate it polymorphically through the abstract base pointer/reference.

</details>

**Q161. What is the difference between an abstract class and an interface in C++?**

<details><summary>Show answer</summary>

Both rely on pure virtuals, but: an **abstract class** has **at least one** pure virtual and may *also* have data members and implemented (normal virtual) methods. An **interface** is the special case where **every** function is pure virtual and there's **no data** — a pure contract. C++ has no `interface` keyword; it's a convention built from an all-pure-virtual abstract class.

</details>

**Q162. Why must an interface / polymorphic base declare a virtual destructor?**

<details><summary>Show answer</summary>

Because clients hold and delete derived objects **through base pointers** (`Base* p = new Derived; ... delete p;`). If the base destructor isn't virtual, `delete p` only runs `~Base()` and the derived part leaks (undefined behaviour). A `virtual ~Base() = default;` ensures the full derived destructor chain runs.

</details>

**Q163. Can an abstract class also contain normal (non-pure) methods with bodies?**

<details><summary>Show answer</summary>

Yes. An abstract class can mix **pure virtuals** (which every subclass must implement) with ordinary **virtual methods that have bodies** (shared default behaviour). This is the *Template Method* pattern: the base defines a skeleton, forcing subclasses to fill in the pure-virtual steps while reusing the implemented ones.

</details>

**Q164. Given `struct Shape { virtual double area() const = 0; };`, which line does **not** compile?**

- **A)** `Shape* p = nullptr;`
- **B)** `Shape s;`
- **C)** `void print(const Shape& s);`
- **D)** `struct Sq : Shape { double area() const override { return 1; } }; Sq q;`

<details><summary>Show answer</summary>

**Correct: B**

**`Shape s;`**: a class with a pure virtual function is abstract and can't be instantiated. Pointers and references to it are fine, and so is a derived class that overrides `area()`.

</details>

**Q165. True or false: a derived class that overrides only some of its base's pure virtual functions is still abstract.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: A**

**True.** It stays abstract until every pure virtual function has an override, so you still can't create an object of it.

</details>

**Q166. What does this print?**

```cpp
struct Report {
    virtual ~Report() = default;
    virtual std::string title() const = 0;
    void print() const { std::cout << "[" << title() << "]"; }
};
struct Sales : Report {
    std::string title() const override { return "sales"; }
};

int main() {
    Sales s;
    s.print();
    const Report& r = s;
    r.print();
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
[sales][sales]
```

`Report` is abstract, but its implemented function `print()` calls the pure virtual `title()` through the vtable, so both calls reach `Sales::title`. The second call goes through a `const Report&`, which works the same way.

</details>

**Q167. Which of these can an abstract class have? Select all that apply.**

- **A)** Data members
- **B)** A constructor
- **C)** Member functions with a body
- **D)** Objects created directly from it, like `Shape s;`

<details><summary>Show answer</summary>

**Correct: A, B, C**

An abstract class can have **data members**, **constructors** (they run as the base part of each derived object) and **implemented member functions**. What it can't have is objects of its own type: `Shape s;` does not compile.

</details>

**Q168. True or false: if `Shape` is abstract, `void draw(Shape s) { }` compiles.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** A parameter by value would need a `Shape` object, which can't exist. g++: `cannot declare parameter 's' to be of abstract type 'Shape'`. Take `const Shape&` or `const Shape*` instead. (This also means an abstract base can't be sliced by accident.)

</details>

**Q169. How do interfaces make a class easier to unit-test?**

<details><summary>Show answer</summary>

If the class depends on an interface (e.g. holds a `Logger&`) instead of a concrete class, the test can pass in a **fake implementation** that records calls or returns fixed data. The class then runs without real files, network or hardware, and the test checks what the fake recorded. The real implementation is passed in by the program (dependency injection).

</details>

**Q170. A class declares `virtual ~Base() = 0;` and never defines it. A class derives from it and an object of the derived class is created. What happens?**

- **A)** It compiles, links and runs
- **B)** Compile error: a destructor can't be pure virtual
- **C)** Link error: undefined reference to `Base::~Base()`
- **D)** It runs and crashes with 'pure virtual method called'

<details><summary>Show answer</summary>

**Correct: C**

It compiles but **fails to link**: the linker reports an *undefined reference to* `Base::~Base()`. A pure virtual destructor still has to be defined (`Base::~Base() {}`), because every derived destructor calls the base destructor when the object is destroyed.

</details>

## C++ Language & Safety

### 16 — const, constexpr & volatile  (11 Qs)
**Q171. Which of these compile, and which is an error?**

```cpp
int n = getInput();
const int a = n;
constexpr int b = n;
constexpr int c = 42;
```

<details><summary>Show answer</summary>

`a` and `c` compile; `b` is an **error**. `const int a = n;` is fine — `const` only means 'won't change after init', and initializing it from a **runtime** value is legal. `constexpr int b = n;` fails because `constexpr` demands a value known at **compile time**, but `n` came from runtime input. `constexpr int c = 42;` is fine — 42 is a compile-time constant.

</details>

**Q172. What is the core difference between `const` and `constexpr`?**

<details><summary>Show answer</summary>

`const` means **read-only after initialization** — but the value may be computed at **runtime**. `constexpr` is stronger: the value (or function result) must be **computable at compile time**, so it can be used where the language *requires* a compile-time constant (array sizes, template arguments, `switch` cases). Every `constexpr` is implicitly `const`; not every `const` is `constexpr`.

</details>

**Q173. Is `volatile` a correct tool for synchronizing a variable between threads?**

<details><summary>Show answer</summary>

**No.** `volatile` only tells the compiler 'don't optimize away or cache accesses — re-read from memory each time', which is for memory-mapped hardware registers and signal handlers. It provides **no atomicity and no memory-ordering guarantees**, so it can't safely synchronize threads. Use **`std::atomic`** (or a mutex) for that — those give the real guarantees.

</details>

**Q174. When does a `constexpr` function run at runtime instead of compile time?**

<details><summary>Show answer</summary>

When you call it with **arguments that aren't known at compile time**. Given compile-time constant arguments in a constant context it runs at **compile time**; given a runtime value it simply runs at **runtime** like an ordinary function.
```cpp
constexpr int sq(int x){ return x*x; }
constexpr int a = sq(5);       // compile time
int y = read(); int b = sq(y); // runtime
```

</details>

**Q175. `n` is read at runtime (`int n = getInput();`). Which of these lines compile? Select all that apply.**

- **A)** `const int a = n;`
- **B)** `constexpr int b = n;`
- **C)** `constexpr int c = 42;`
- **D)** `constexpr int d = c * 2;` (with `c` from the line above)

<details><summary>Show answer</summary>

**Correct: A, C, D**

`const` only means read-only, so it can take a runtime value. `constexpr` needs a value the compiler knows, so `constexpr int b = n;` is an error. `42` is a constant, and `c * 2` is too because `c` is `constexpr`.

</details>

**Q176. True or false: marking a shared counter `volatile` makes `++counter` safe to call from two threads.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** `volatile` only stops the compiler from optimizing the reads and writes away. `++counter` is still a read-modify-write that two threads can interleave. Use `std::atomic<int>` or a mutex.

</details>

**Q177. Which declaration lets you change the `int` through `p`, but never make `p` point to another `int`?**

- **A)** `const int* p`
- **B)** `int const* p`
- **C)** `int* const p`
- **D)** `const int* const p`

<details><summary>Show answer</summary>

**Correct: C**

**`int* const p`.** Read right to left: "p is a const pointer to an int". The pointer is fixed; the int is not. `const int* p` and `int const* p` are the same thing (pointer to a const int: `p` can move, `*p` can't be changed), and `const int* const p` fixes both.

</details>

**Q178. What does this print?**

```cpp
struct Cache {
    mutable int hits = 0;
    int get() const { ++hits; return 7; }
};

int main() {
    const Cache c;
    int sum = c.get() + c.get();
    std::cout << sum << " " << c.hits;
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
14 2
```

`c` is a `const` object, but `get()` is a `const` member function, so it can be called. It increments `hits`, which is allowed because `hits` is `mutable`. Two calls: `sum` is 7 + 7 = 14 and `hits` is 2.

</details>

**Q179. True or false: a `consteval` function (C++20) can be called with a value read at run time; it then simply runs at run time.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** That fallback is what a `constexpr` function does. A `consteval` function must be evaluated at compile time, so calling it with a run-time value is a compile error ("the value of 'k' is not usable in a constant expression").

</details>

**Q180. A signal handler sets a global flag and `main` loops `while (!stop) {}`. Why must the flag be declared `volatile std::sig_atomic_t`, and what can happen at `-O2` without `volatile`?**

<details><summary>Show answer</summary>

The handler runs outside the normal flow of the program, so the compiler can't see that it changes the flag. Without `volatile` the optimizer sees that nothing in the loop changes `stop`, reads it once, and can turn the loop into an endless jump: the program never stops. `volatile` forces a real read on every pass. `std::sig_atomic_t` is the integer type a handler is allowed to write in one indivisible step.

</details>

**Q181. What does `const` after a member function's parameter list (`int get() const`) promise, and which member functions can be called on a `const` object?**

<details><summary>Show answer</summary>

It promises the function does not modify the object's members (inside it, `this` points to a const object; only `mutable` members may still change). On a `const` object, or through a `const&` / `const*`, **only const member functions** can be called. Calling a non-const one fails with "passing 'const X' as 'this' argument discards qualifiers".

</details>

### 17 — Compile-time Constants & VLAs  (11 Qs)
**Q182. Two of these are standard C++ and one is not — which one, and what is it called?**

```cpp
constexpr int s1 = 5*4; int a[s1];
const     int s2 = 5*4; int b[s2];
          int s3 = 5*4; int c[s3];
```

<details><summary>Show answer</summary>

The third — `int s = 5*4; int c[s];` — is **not standard C++**. Because `s` is a plain (non-const) `int`, it's a runtime value, so `c[s]` is a **VLA (Variable Length Array)**. The `constexpr` and `const` versions are standard, because both give a compile-time constant size.

</details>

**Q183. Your `int a[n]` (runtime `n`) compiled fine on g++ — how do you check whether it's actually standard C++?**

<details><summary>Show answer</summary>

Add **`-pedantic`**: `g++ -std=c++17 -pedantic t.cpp` warns 'ISO C++ forbids variable length array' — proving it's a non-standard **GNU extension**, not standard C++. Add **`-pedantic-errors`** to make it a hard error. (MSVC rejects it outright.) A clean default compile on g++ only means *g++ allows the extension*, not that the standard does.

</details>

**Q184. Does the VLA warning depend on which C++ version you pick (`-std=c++11` vs `c++20`)?**

<details><summary>Show answer</summary>

No. VLAs were never part of **any** C++ standard (proposed for C++14, then removed). So the `-Wvla` warning appears under `-pedantic` regardless of the `-std` — it depends on the **flag** (`-pedantic`), not the version. It vanishes only when you drop `-pedantic` (extensions on).

</details>

**Q185. Which array sizes ARE valid standard C++?**

<details><summary>Show answer</summary>

A size that is a **compile-time constant**: either a `constexpr` value, or a `const` integer initialized with a constant expression (e.g. `const int n = 4*5;`). A plain mutable `int` — even one obviously set to a fixed value — does **not** qualify and makes the array a (non-standard) VLA.

</details>

**Q186. What runtime clue reveals that an array is actually a VLA?**

<details><summary>Show answer</summary>

`sizeof`. For a normal array, `sizeof(arr)` is a **compile-time** constant. For a **VLA**, the size isn't known until the program runs, so `sizeof(arr)` is computed at **runtime**. If `sizeof` has to be evaluated at run time, you're looking at a VLA.

</details>

**Q187. `int a[n];` with a runtime `n` compiles silently on g++. Which flag makes g++ warn that it is not standard C++?**

- **A)** `-Wall`
- **B)** `-pedantic`
- **C)** `-std=c++20`
- **D)** `-O2`

<details><summary>Show answer</summary>

**Correct: B**

**`-pedantic`** (or `-pedantic-errors` to make it an error). `-Wall`, `-Wextra`, `-O2` and picking a newer `-std=` do not mention the VLA, because g++ allows it as an extension.

</details>

**Q188. True or false: switching from `-std=c++11` to `-std=c++20` makes g++ reject `int a[n];` with a runtime `n`.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** The language version does not change it: g++ accepts the VLA as an extension in every mode. Only `-pedantic` / `-pedantic-errors` report it.

</details>

**Q189. True or false: `const int n = readSize(); int a[n];` is standard C++, because `n` is `const`.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** `n` is read-only, but its value comes from a run-time call, so it is not a constant expression. `int a[n]` is therefore a VLA (a g++ extension; `-pedantic` warns). Only a `const` integer initialized with a constant expression, or a `constexpr` one, can size a standard array.

</details>

**Q190. In which of these places must the value be a compile-time constant expression? Select all that apply.**

- **A)** The size in `int a[N];`
- **B)** `N` in `std::array<int, N>`
- **C)** A `case` label
- **D)** The argument in an ordinary call `f(n)`
- **E)** The condition of `static_assert`

<details><summary>Show answer</summary>

**Correct: A, B, C, E**

Array bounds, template arguments, `case` labels and `static_assert` conditions are all evaluated by the compiler, so they need constant expressions. An ordinary function argument is just a run-time value.

</details>

**Q191. What does this print?**

```cpp
int n = 3;
std::vector<int> v(n);
auto p = std::make_unique<int[]>(n);
std::cout << v.size() << v[2] << p[2];
```

<details><summary>Show answer</summary>

**Expected output:**
```
300
```

`std::vector<int> v(n)` creates `n` elements set to 0, so `size()` is 3 and `v[2]` is 0. `std::make_unique<int[]>(n)` also value-initializes its `n` ints, so `p[2]` is 0. Output: `3`, `0`, `0` with no spaces.

</details>

**Q192. A program does `int buf[n];` where `n` comes from user input. Explain why this can crash with no error message, and what to write instead.**

<details><summary>Show answer</summary>

`buf` is a VLA: it is placed on the stack by moving the stack pointer `n * sizeof(int)` bytes, and nothing checks that the stack (often 8 MB) has room. A large `n` makes the program write outside the stack and the kernel kills it with a segmentation fault; there is no exception to catch. Write `std::vector<int> buf(n);` instead: the memory comes from the heap, the vector knows its size, and if the allocation fails it throws `std::bad_alloc`. It is also standard C++, unlike the VLA.

</details>

### 18 — Arrays & Memory Contiguity  (11 Qs)
**Q193. An array must be laid out contiguously — is that guaranteed in virtual memory or in physical RAM?**

<details><summary>Show answer</summary>

In the process's **virtual** address space. Indexing computes `base + i*sizeof(element)` and relies on elements sitting one after another *virtually*. In **physical** RAM the array's pages can be scattered across arbitrary frames — that's fine, because the **page table** maps the contiguous virtual pages onto those scattered frames, so the program only ever sees one clean contiguous block.

</details>

**Q194. How does the compiler compute the address of `arr[i]`?**

<details><summary>Show answer</summary>

As **`base_address + i * sizeof(element)`** — a single multiply-and-add, no lookup table (which is why indexing is O(1)). This formula is exactly why an array **must be contiguous**: element `i` has to sit precisely `i` element-widths after the start.

</details>

**Q195. An `int arr[100000]` is about 400 KB — should it live on the stack or the heap, and why?**

<details><summary>Show answer</summary>

On the **heap** — `new int[100000]` or, better, `std::vector<int>`. A **local** array that big can **overflow the stack**, which is typically only 1–8 MB and shared by all frames in the call chain. Small fixed arrays are fine on the stack; large ones belong on the heap.

</details>

**Q196. With demand paging, is the physical RAM for a big `new` array allocated immediately?**

<details><summary>Show answer</summary>

No. The **virtual** address range is reserved right away (so the array looks allocated and contiguous), but the **physical frames** are typically handed out **lazily**, on first touch of each page (via page faults). So memory you allocate but never write may never consume physical RAM.

</details>

**Q197. What does this print?**

```cpp
int arr[5] = {10, 20, 30, 40, 50};
int* p = arr;
std::cout << *(p + 3) << " " << (&arr[4] - &arr[1]);
```

<details><summary>Show answer</summary>

**Expected output:**
```
40 3
```

`p + 3` points at `arr[3]`, so `*(p + 3)` is 40. Subtracting two element pointers gives the distance in **elements**, not bytes: `&arr[4] - &arr[1]` is 3.

</details>

**Q198. An array must be contiguous. Where is that actually guaranteed?**

- **A)** In physical RAM
- **B)** In virtual address space
- **C)** In both physical RAM and virtual address space
- **D)** Nowhere: only `std::vector` is contiguous

<details><summary>Show answer</summary>

**Correct: B**

**In virtual address space.** `arr[i]` is computed from virtual addresses, so they must be continuous. The physical frames behind the pages can be scattered; the page table maps them.

</details>

**Q199. What does this print?**

```cpp
int a[5] = {7, 8};
int sum = 0;
for (int x : a) sum += x;
std::cout << std::size(a) << " " << sum << " " << a[4];
```

<details><summary>Show answer</summary>

**Expected output:**
```
5 15 0
```

`a` has 5 elements; only the first two are given, so `a[2]`, `a[3]` and `a[4]` are 0. `std::size(a)` is 5, the sum is 7 + 8 = 15, and `a[4]` is 0.

</details>

**Q200. In `int m[3][4];`, which element is stored directly after `m[0][3]` in memory?**

- **A)** `m[1][0]`
- **B)** `m[0][4]`
- **C)** `m[1][3]`
- **D)** `m[3][0]`

<details><summary>Show answer</summary>

**Correct: A**

**`m[1][0]`.** C++ stores 2D arrays row-major: all 4 elements of row 0, then row 1. `m[0][3]` is the last element of row 0, so the first element of row 1 follows it. (`m[0][4]` is past the end of row 0.)

</details>

**Q201. True or false: inside `void f(int a[10])`, `sizeof(a)` is the size of 10 ints.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** An array parameter is adjusted to a pointer (`int* a`), whatever size is written in the brackets. `sizeof(a)` is the size of a pointer (8 on x86-64), and g++ warns that `'sizeof' on array function parameter 'a' will return size of 'int*'`.

</details>

**Q202. Summing a 4096 x 4096 `int` array row by row is many times faster than column by column, although both add the same numbers. Why?**

<details><summary>Show answer</summary>

The array is stored row-major, so row by row visits memory in order. The CPU loads memory in 64-byte **cache lines** (16 ints), so one load serves 16 additions, and the **prefetcher** loads the next lines ahead of time. Column by column, each step jumps a whole row (16 KB) ahead, to a different cache line; each loaded line is used for one int and is usually evicted before its neighbours are needed. Most reads then wait for RAM.

</details>

**Q203. Give two ways to pass an array to a function without losing its size.**

<details><summary>Show answer</summary>

Any two of: (1) pass a pointer **and** the count: `f(const int* a, std::size_t n)`; (2) take a **reference to an array** in a template: `template <std::size_t N> void f(const int (&a)[N])`, so `N` is deduced; (3) use `std::array<int, N>` or `std::vector<int>` by `const&`, which know their size; (4) `std::span<const int>` (C++20), a pointer plus size in one object.

</details>

### 19 — Endianness  (12 Qs)
**Q204. On a little-endian machine, how is the int `500` (`0x000001F4`) laid out byte by byte in memory?**

<details><summary>Show answer</summary>

As **`F4 01 00 00`** — least-significant byte first. The value's bytes are `00 00 01 F4` (most-significant first, the way we write it); little-endian stores them **reversed**, so to reconstruct the value you flip them back: `F4 01 00 00` → `0x000001F4` = 500. Small values hide this (5 is `05 00 00 00`, and the leading `05` *looks* right).

</details>

**Q205. If you `cout << somePointer;`, do you see the reversed little-endian bytes or the real address?**

<details><summary>Show answer</summary>

You see the **real, human-readable address** (most-significant-first, e.g. `0x7ffee3a4b5c8`) — **not** reversed. Printing shows the *value*, and the CPU has already read the bytes back in the correct order. You only see the reversed little-endian bytes if you deliberately inspect raw memory (walking `(unsigned char*)&p`, or a hex/debugger view).

</details>

**Q206. Is a pointer affected by endianness?**

<details><summary>Show answer</summary>

Yes. A pointer is just a **multi-byte integer** (8 bytes on 64-bit) that holds an address, so it's stored in the machine's endianness — little-endian on x86, meaning its bytes appear reversed in a raw memory dump, exactly like any `int`.

</details>

**Q207. How do you detect at runtime whether a machine is little- or big-endian?**

<details><summary>Show answer</summary>

Store 1 in an int and look at its first byte:
```cpp
int n = 1;
char* c = (char*)&n;
if (*c == 1) puts("little-endian");  // low byte holds the 1
else         puts("big-endian");     // low byte is 0
```
On little-endian the least-significant byte (the `01`) sits at the lowest address, so `*c == 1`.

</details>

**Q208. Which values are immune to endianness?**

<details><summary>Show answer</summary>

**Single-byte** types — `char`, `uint8_t`, `bool` — because one byte has no ordering to reverse. Endianness only concerns multi-byte values (`short`, `int`, `long`, pointers), and even then it's visible only when you look at the raw bytes (hex dump, `char*`, or data sent between machines).

</details>

**Q209. On a little-endian machine (x86-64), what does this print?**

```cpp
int x = 0x01020304;
unsigned char* b = (unsigned char*)&x;
std::cout << (int)b[0];
```

<details><summary>Show answer</summary>

**Expected output:**
```
4
```

Little-endian stores the **least-significant** byte at the lowest address. `0x01020304` is stored as `04 03 02 01`, so the first byte `b[0]` is 4.

</details>

**Q210. True or false: on a little-endian machine, `std::cout << x;` prints the value of `x` with its bytes reversed.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** `cout` prints the actual value. Endianness only shows up when you look at the raw bytes in memory (a hex dump or a `char*` walk).

</details>

**Q211. What does this print (on any machine)?**

```cpp
std::uint32_t x = 0x0A0B0C0D;
unsigned char hi = x >> 24;
unsigned char lo = x & 0xFF;
std::cout << (int)hi << " " << (int)lo;
```

<details><summary>Show answer</summary>

**Expected output:**
```
10 13
```

Shifts and masks work on the **value**, not on memory, so endianness doesn't matter. `x >> 24` is the most-significant byte `0x0A` = 10, and `x & 0xFF` is the least-significant byte `0x0D` = 13.

</details>

**Q212. What is network byte order?**

- **A)** Big-endian
- **B)** Little-endian
- **C)** Whatever order the sending host uses
- **D)** It depends on the protocol version

<details><summary>Show answer</summary>

**Correct: A**

**Big-endian.** Internet protocol headers send multi-byte numbers most-significant byte first. `htonl`/`htons` convert from host order to it, `ntohl`/`ntohs` back.

</details>

**Q213. True or false: on a big-endian host, `htonl(x)` returns `x` unchanged.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: A**

**True.** Network byte order is big-endian, so a big-endian host is already in network order and the conversion functions do nothing. That is why code that calls them works correctly on both kinds of machine.

</details>

**Q214. A server fills `sockaddr_in::sin_port = 8080;` without `htons` on x86-64. Which port does it really use, and why?**

<details><summary>Show answer</summary>

**36895.** 8080 is `0x1F90`; on little-endian x86-64 it is stored as bytes `90 1F`. The port field is read in network order (big-endian), so those bytes mean `0x901F` = 36895. Write `sin_port = htons(8080);`.

</details>

**Q215. Why is `uint32_t v = *(uint32_t*)buf;` a bad way to read a 32-bit number from a received network buffer, and what should you write instead?**

<details><summary>Show answer</summary>

Two problems: (1) it reads the bytes in **host** order, but the data is in network (big-endian) order, so the value is wrong on x86-64; (2) `buf` may not be aligned for `uint32_t`, and accessing a `char` buffer through a `uint32_t*` breaks the aliasing rules: undefined behaviour. Write `uint32_t v; std::memcpy(&v, buf, 4); v = ntohl(v);`, or rebuild it with shifts: `v = uint32_t(buf[0]) << 24 | uint32_t(buf[1]) << 16 | uint32_t(buf[2]) << 8 | buf[3];`.

</details>

### 20 — Undefined Behavior & Bounds Checking  (11 Qs)
**Q216. This program prints `4` and exits cleanly. Is it correct?**

```cpp
std::array<int,5> a;
a[10] = 4;
cout << a[10];
```

<details><summary>Show answer</summary>

**No — it is undefined behaviour.** `a` has valid indices 0–4, but you write to index 10. `std::array::operator[]` does **no bounds checking**, so it just computes an out-of-bounds address and writes there. It *happened* not to crash and printed `4`, but that's luck — the same code could crash, corrupt another variable, or behave differently on another compiler/run. 'It printed 4' is not proof of correctness.

</details>

**Q217. Which access is bounds-checked, and what does it do on a bad index?**

<details><summary>Show answer</summary>

`.at(i)` is bounds-checked. On an out-of-range index it **throws `std::out_of_range`** (with a descriptive message via `e.what()`), instead of silently corrupting memory like `[]`. So `a.at(10)` on a size-5 array throws rather than doing UB.
```cpp
a.at(10) = 4;  // throws std::out_of_range
```

</details>

**Q218. Why does C++ leave `operator[]` unchecked by default?**

<details><summary>Show answer</summary>

Because of the principle **'don't pay for what you don't use'** — a bounds check on *every* element access adds a comparison that's costly in tight numeric loops, so `[]` is fast and trusts the programmer. (Java/Python bounds-check *always*: safer, but you pay on every access with no opt-out.) C++ gives you both: fast `[]` when you've verified the index, and checked `.at()` when you want the safety net.

</details>

**Q219. Name three different things undefined behaviour is allowed to do.**

<details><summary>Show answer</summary>

It may: (1) **appear to work** (produce the expected output, as in the `a[10]` example), (2) **crash** (e.g. a segfault), or (3) **silently corrupt** other memory (overwrite a nearby variable, the return address, etc.). Because the behaviour is undefined it can also differ across compilers, optimization levels, and runs — which is what makes UB dangerous.

</details>

**Q220. Which compiler flag would have caught the out-of-bounds write at runtime during testing?**

<details><summary>Show answer</summary>

**`-fsanitize=address`** (AddressSanitizer) — it instruments the program and reports a `stack-buffer-overflow` when the bad access actually runs. Add **`,undefined`** (`-fsanitize=address,undefined`) to also catch other undefined behaviour with UBSan.

</details>

**Q221. `std::array<int, 5> a{}; a[10] = 4;` What does the C++ standard say happens?**

- **A)** It throws `std::out_of_range`
- **B)** It is undefined behaviour
- **C)** The compiler always rejects it
- **D)** It writes to `a[4]` instead

<details><summary>Show answer</summary>

**Correct: B**

**Undefined behaviour.** `operator[]` does no bounds check, so anything can happen: a crash, silent corruption, or apparently working. It still compiles (g++ accepts it), and only `.at()` would throw.

</details>

**Q222. What does this print?**

```cpp
std::vector<int> v = {1, 2, 3};
try {
    v.at(5) = 9;
    std::cout << "ok";
} catch (const std::out_of_range&) {
    std::cout << "caught";
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
caught
```

`.at()` **is** bounds-checked: index 5 is outside a size-3 vector, so it throws `std::out_of_range` before anything is written, `"ok"` is skipped, and the `catch` prints `caught`.

</details>

**Q223. Classify each: (a) signed integer overflow, (b) the order in which `f(a(), b())` evaluates `a()` and `b()`, (c) `sizeof(long)`. Which is undefined, which unspecified, which implementation-defined?**

<details><summary>Show answer</summary>

(a) **Undefined**: no requirements; the optimizer may assume it never happens. (b) **Unspecified**: either order is allowed and the compiler needn't document it (g++ 13 evaluates `b()` first, clang 18 `a()` first). (c) **Implementation-defined**: the compiler must document it (8 on x86-64 Linux, 4 on 64-bit Windows).

</details>

**Q224. `bool ok(int x) { int n = x + 1; return n > x; }` returns 0 for `INT_MAX` at `-O0` but 1 at `-O2` with g++. Why?**

- **A)** The program has undefined behaviour, so the optimizer may assume `x + 1 > x` is always true
- **B)** `-O2` has a bug in integer arithmetic
- **C)** `-O0` uses unsigned arithmetic for `int`
- **D)** The comparison is implementation-defined

<details><summary>Show answer</summary>

**Correct: A**

`x + 1` overflows for `INT_MAX`, which is **undefined behaviour**. At `-O0` the addition happens to wrap to `INT_MIN`, so the comparison is false. At `-O2` the optimizer assumes signed overflow never happens, so `x + 1 > x` is always true and the function compiles to `return 1`. The program is wrong, not the compiler. A correct check is `return x < INT_MAX;` (test before adding).

</details>

**Q225. Which of these are undefined behaviour? Select all that apply.**

- **A)** `int r = 10 / d;` with `d == 0`
- **B)** `int x; std::cout << x;`
- **C)** `unsigned u = UINT_MAX; u = u + 1;`
- **D)** An `int` function that reaches its closing `}` without `return`

<details><summary>Show answer</summary>

**Correct: A, B, D**

Integer division by zero, reading an uninitialized local `int`, and a non-void function that ends without `return` are all UB. Unsigned arithmetic is defined to wrap modulo 2^N, so `UINT_MAX + 1u` is simply 0.

</details>

**Q226. True or false: if a program with undefined behaviour gives the right output in every test, the undefined behaviour is harmless.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** UB has no guaranteed behaviour. The same code can break with another compiler, another optimization level, other input, or an unrelated change nearby, because the optimizer is allowed to assume UB never happens.

</details>

### 21 — std::array vs std::vector  (11 Qs)
**Q227. When should you choose `std::array` rather than `std::vector`?**

<details><summary>Show answer</summary>

Choose **`std::array<T,N>`** when the element count is **fixed and known at compile time**: it stores its elements inside itself (no heap allocation of its own, so it sits on the stack when it is a local variable), and never resizes. Choose **`std::vector<T>`** when the count is **unknown or changes at run time**: it keeps its elements in a heap block and grows via `push_back`/`resize`. Rule of thumb: fixed → array, growable → vector. Large fixed data still belongs in a vector, not a local array.

</details>

**Q228. How does a `std::vector` grow when you keep adding elements?**

<details><summary>Show answer</summary>

You add with **`push_back`** (or `resize`/`insert`); when it runs out of room it allocates a **bigger block on the heap**, moves/copies the existing elements into it, and frees the old block. Its element data always lives on the **heap** (the small `vector` object itself — pointer, size, capacity — may sit on the stack).

</details>

**Q229. What is the difference between a vector's `size()` and its `capacity()`?**

<details><summary>Show answer</summary>

`size()` is the number of elements **currently in use**. `capacity()` is how many elements the currently-allocated block can hold **before it must reallocate**. Capacity is usually ≥ size and grows in chunks (often doubling), so not every `push_back` triggers a reallocation. `std::array` has only a fixed size — no separate capacity.

</details>

**Q230. Do both `array` and `vector` offer a bounds-checked access?**

<details><summary>Show answer</summary>

Yes — both provide `.at(i)` (bounds-checked, throws `std::out_of_range`) and `operator[]` (unchecked, fast). The choice between checked and unchecked access is the same for both containers.

</details>

**Q231. Which of these can grow at runtime with `push_back`?**

- **A)** `std::array<int, 5>`
- **B)** `std::vector<int>`
- **C)** `int[5]`
- **D)** Both `std::array` and `std::vector`

<details><summary>Show answer</summary>

**Correct: B**

Only **`std::vector`**. `std::array<int, 5>` and `int[5]` have a size fixed at compile time and no `push_back`.

</details>

**Q232. What does this print?**

```cpp
std::vector<int> v;
v.reserve(10);
v.push_back(1);
v.push_back(2);
std::cout << v.size() << " " << (v.capacity() >= 10);
```

<details><summary>Show answer</summary>

**Expected output:**
```
2 1
```

`reserve(10)` allocates room for at least 10 elements but adds none, so after two `push_back` calls `size()` is 2 while `capacity()` is still at least 10 (`true` prints as 1).

</details>

**Q233. True or false: a `std::array<int, 4>` that is a member of an object created with `new` is stored on the heap.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: A**

**True.** A `std::array` stores its elements inside itself, so it lives wherever its owner lives. Inside a heap object it is part of that heap block. What a `std::array` never does is make a heap allocation of its own.

</details>

**Q234. On x86-64 with g++, what is `sizeof(v)` for a `std::vector<int> v` holding 1000 elements?**

- **A)** 24
- **B)** 4000
- **C)** 4024
- **D)** It depends on the capacity

<details><summary>Show answer</summary>

**Correct: A**

**24.** The vector object is only a handle: three pointers (start, end of the elements, end of the allocated block). The 1000 ints live in a separate heap block that `sizeof` doesn't count.

</details>

**Q235. What does this print?**

```cpp
std::array<int, 3> a = {1, 2, 3};
std::array<int, 3> b = a;
b[0] = 9;
std::cout << a[0] << " " << (a == b) << " " << b.size();
```

<details><summary>Show answer</summary>

**Expected output:**
```
1 0 3
```

`b = a` copies all three elements, so changing `b[0]` doesn't touch `a`: `a[0]` is still 1. `==` compares the elements, which now differ, so it prints 0. `b.size()` is 3.

</details>

**Q236. A function takes `const std::array<int, 3>&`. Why can't you pass it a `std::array<int, 5>`, and what are two ways to write a function that accepts both?**

<details><summary>Show answer</summary>

The size is part of the type: `std::array<int, 3>` and `std::array<int, 5>` are unrelated types, so the reference can't bind. Fixes: (1) make it a template, `template <std::size_t N> int f(const std::array<int, N>& a)`, so `N` is deduced; (2) take a `std::span<const int>` (C++20), or a pointer plus a size via `.data()` and `.size()`; (3) if the size really varies, store the data in a `std::vector` and take `const std::vector<int>&`.

</details>

**Q237. Name three things a `std::array` can do that a C array can't.**

<details><summary>Show answer</summary>

Any three of: it **knows its size** (`.size()`), even inside a function; it **doesn't decay** to a pointer when passed; it can be **copied and assigned** with `=`; `==` **compares the elements** (a C array comparison compares addresses); it has **`.at()`** for checked access; it can be **returned** from a function by value.

</details>

### 22 — Exceptions & try/catch  (12 Qs)
**Q238. Calling `a.at(10)` on a size-5 array printed 'Aborted (core dumped)'. Whose fault is the crash?**

<details><summary>Show answer</summary>

The **caller's** — for not handling the exception. `.at()` did its job: it detected the out-of-range index and **threw** `std::out_of_range`. Because nothing **caught** it, the exception propagated up to `std::terminate`, which aborts the program. The crash means 'an error was reported and nobody handled it', not that `.at()` is broken. (Contrast `[]`, which wouldn't even tell you.)

</details>

**Q239. Rewrite the call so the program reports the error and keeps running.**

<details><summary>Show answer</summary>

Wrap it in `try`/`catch`:
```cpp
try {
    a.at(10) = 4;
} catch (const std::out_of_range& e) {
    std::cout << "Bad index: " << e.what() << '\n';
}
std::cout << "still running\n";   // reached
```
Now the exception is caught and handled, and execution continues past the `try/catch` instead of aborting.

</details>

**Q240. Should you catch an exception by value or by `const` reference, and why?**

<details><summary>Show answer</summary>

By **`const` reference** (`catch (const std::exception& e)`). Catching **by value** copies the exception object and can **slice** it — if the real exception is a derived type, the copy keeps only the base part, losing information (and its overridden `what()`). A `const&` binds to the actual object with no copy and no slicing.

</details>

**Q241. What does `e.what()` return?**

<details><summary>Show answer</summary>

A C-style string (`const char*`) describing the error — the exception's message. For `std::out_of_range` from `.at()`, it includes details such as the bad index and the container size.

</details>

**Q242. What does this print?**

```cpp
try {
    std::cout << "A";
    throw std::runtime_error("boom");
    std::cout << "B";
} catch (const std::exception& e) {
    std::cout << "C" << e.what();
}
std::cout << "D";
```

<details><summary>Show answer</summary>

**Expected output:**
```
ACboomD
```

`A` prints, then `throw` jumps straight to the matching `catch`, so `B` never runs. The handler prints `C` and the message `boom`, and the program continues to print `D`.

</details>

**Q243. Which is the recommended way to catch a standard exception?**

- **A)** `catch (std::exception e)`
- **B)** `catch (const std::exception& e)`
- **C)** `catch (std::exception* e)`
- **D)** Only `catch (...)`

<details><summary>Show answer</summary>

**Correct: B**

**`catch (const std::exception& e)`**. By reference there is no copy and no slicing (a derived exception keeps its real type and message); `const` because you only read it.

</details>

**Q244. What does this print?**

```cpp
struct B {
    B()  { std::cout << "B "; }
    ~B() { std::cout << "~B "; }
};

void f() {
    B b;
    throw std::runtime_error("x");
}

int main() {
    try { f(); }
    catch (const std::exception&) { std::cout << "caught"; }
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
B ~B caught
```

Stack unwinding: when `f` throws, its local `b` is destroyed (`~B`), then the handler runs (`caught`). Locals are destroyed before the handler, in reverse order of construction.

</details>

**Q245. `std::out_of_range`, `std::invalid_argument` and `std::length_error` all derive from which class?**

- **A)** `std::logic_error`
- **B)** `std::runtime_error`
- **C)** `std::bad_alloc`
- **D)** `std::system_error`

<details><summary>Show answer</summary>

**Correct: A**

**`std::logic_error`** (which derives from `std::exception`). So `catch (const std::logic_error&)` handles all three. `std::runtime_error` is the other main branch, for problems only detectable at run time.

</details>

**Q246. True or false: if a constructor throws, the object's destructor runs to clean up.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** The object was never completely built, so its destructor does not run. The members and base classes that were already constructed **are** destroyed. So hold resources in members that clean up after themselves (RAII), not in raw pointers freed by the destructor.

</details>

**Q247. Inside a `catch (const std::exception& e)` handler you want to log and pass the error on. Why write `throw;` and not `throw e;`?**

<details><summary>Show answer</summary>

`throw;` rethrows the **original** exception object, keeping its real type (say `std::invalid_argument`), so outer handlers for that type still match. `throw e;` throws a **new copy** of `e`'s static type, `std::exception`: the derived part is sliced off, and outer handlers for the specific type no longer match.

</details>

**Q248. Why must a destructor not throw, and what happens if it does?**

<details><summary>Show answer</summary>

Destructors are implicitly `noexcept` (since C++11), so an exception leaving one calls `std::terminate` and the program aborts (g++ warns: `'throw' will always call 'terminate'`). Destructors also run during stack unwinding, when another exception is already in flight; two active exceptions at once can't be handled. Report cleanup errors another way, for example with a separate `close()` function that may throw.

</details>

**Q249. Give one situation where an error code or `std::optional` is a better choice than an exception, and one where an exception is better.**

<details><summary>Show answer</summary>

**Error value:** an expected outcome such as "key not found" or invalid user input in a loop, a hot path where failures are common (throwing is expensive), or code built with `-fno-exceptions`. **Exception:** a constructor that can't build its object (it has no return value), or a rare error deep in a call chain that only a far-away caller can handle, since the exception travels up automatically and can't be ignored.

</details>

### 23 — AddressSanitizer & Debugging Tools  (11 Qs)
**Q250. You built with `-fsanitize=address` and compiling produced no error — why hasn't AddressSanitizer reported anything yet?**

<details><summary>Show answer</summary>

Because AddressSanitizer is a **runtime** detector, not a compile-time one. Compiling only *instruments* the code; the error is reported when the **bad access actually executes**. You must **run** the program (`./prog`) and reach the offending line for ASan to print its report. A clean compile — or a run that never hits the bug — shows nothing.

</details>

**Q251. How does AddressSanitizer detect an out-of-bounds access?**

<details><summary>Show answer</summary>

It surrounds each variable/allocation with poisoned **redzones** (guard bytes with no real data) and keeps 'shadow memory' marking which bytes are valid. The instant your program reads or writes into a redzone (or freed memory), ASan detects the poisoned access and reports it — with the file/line, the variable, and byte offsets. They're essentially tripwires around your memory.

</details>

**Q252. Does AddressSanitizer report every error in a run, or stop at the first one?**

<details><summary>Show answer</summary>

By default it **aborts on the first error** (you'll see `==pid==ABORTING`). To report an error and keep going, you need **both** a build with **`-fsanitize-recover=address`** and the run-time option **`ASAN_OPTIONS=halt_on_error=0`**. The environment variable alone is not enough: without the build flag, ASan still aborts.

</details>

**Q253. Name two other tools or flags for finding C++ memory / undefined-behaviour bugs.**

<details><summary>Show answer</summary>

**UBSan** (`-fsanitize=undefined`) for undefined behaviour like signed overflow or bad shifts; **valgrind** (memcheck) for leaks and invalid accesses; and **gdb** for interactive debugging / core-dump inspection. ASan + UBSan together (`-fsanitize=address,undefined -g`) catch a large class of bugs during testing.

</details>

**Q254. Which flags build a program with AddressSanitizer and the line numbers it needs for a readable report?**

- **A)** `-fsanitize=address -g`
- **B)** `-Wall -Wextra`
- **C)** `-O3 -g`
- **D)** `-fstack-protector`

<details><summary>Show answer</summary>

**Correct: A**

**`-fsanitize=address -g`**: the first adds the runtime checks, `-g` adds debug info so the report names files and lines.

</details>

**Q255. True or false: if a program built with `-fsanitize=address` compiles without errors, it has no memory bugs.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** ASan is a **runtime** detector: it reports a bad access only when that code actually runs. A clean compile (or a run that never reaches the bug) proves nothing.

</details>

**Q256. An ASan report says `heap-use-after-free ... READ of size 4`, then `freed by thread T0 here: ... main uaf.cpp:5` and `previously allocated by thread T0 here: ... main uaf.cpp:4`. What happened, and on which lines?**

<details><summary>Show answer</summary>

A 4-byte value (an `int`) was **read from heap memory after it was freed**. The block was allocated with `new` on line 4 and released with `delete`/`delete[]` on line 5; the access itself is the line in the first stack trace (`READ of size 4 ... in main`). Fix the ownership so nothing uses the pointer after the free (for example a smart pointer, or set it to `nullptr` and stop using it).

</details>

**Q257. Which tool reports a data race between two threads incrementing a shared `int`?**

- **A)** `-fsanitize=thread` (TSan)
- **B)** `-fsanitize=address` (ASan)
- **C)** `-fsanitize=undefined` (UBSan)
- **D)** `valgrind --leak-check=full`

<details><summary>Show answer</summary>

**Correct: A**

**ThreadSanitizer** (`-fsanitize=thread`). It records which thread touched which memory and reports unsynchronized pairs, naming the variable and both accesses. ASan and UBSan don't look at thread interleavings, and valgrind's default tool (memcheck) doesn't either.

</details>

**Q258. True or false: running an ASan build with `ASAN_OPTIONS=halt_on_error=0` is enough to make it report several errors in one run.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** ASan only recovers from errors if the program was also built with `-fsanitize-recover=address`. Without that flag it still prints the first report and aborts, whatever the environment variable says.

</details>

**Q259. Which of these does valgrind memcheck find in an ordinary build (no sanitizer flags)? Select all that apply.**

- **A)** Reading a heap block after `delete`
- **B)** A heap block never freed
- **C)** Writing one element past a local array into a neighbouring local variable
- **D)** An `if` that depends on an uninitialized variable

<details><summary>Show answer</summary>

**Correct: A, B, D**

Valgrind tracks heap blocks and which bytes have been initialized, so it finds a heap use-after-free, a leaked heap block (with `--leak-check=full`) and a branch on an uninitialized value. It doesn't know the boundaries of arrays inside a stack frame, so a stack-buffer-overflow into a neighbouring local goes unnoticed (ASan finds that).

</details>

**Q260. A program crashed with a segmentation fault on a test machine, and you can't reproduce it. How do you get a backtrace of that crash with gdb, and what must be in place beforehand?**

<details><summary>Show answer</summary>

Use a **core dump**: allow it with `ulimit -c unlimited` in the shell that runs the program, check where `/proc/sys/kernel/core_pattern` sends it (a `core` file in the current directory, or `systemd-coredump`, opened with `coredumpctl gdb`), and build with `-g`. After the crash, run `gdb ./prog core` and type `bt` to see the call chain, `frame N` and `print var` to inspect the state at the moment of the crash.

</details>

## OS Memory & Systems

### 24 — Paging & Virtual Memory  (12 Qs)
**Q261. Why is a process divided into pages in the first place?**

<details><summary>Show answer</summary>

So it **doesn't need one big contiguous block of physical RAM**. Once the process is cut into equal-size **pages**, each page can be placed into **any free frame anywhere** in RAM — no contiguous run required. This eliminates **external fragmentation** (enough total memory free, but scattered in gaps too small to use) and unlocks virtual memory, isolation, and sharing.

</details>

**Q262. What is the difference between a page and a frame?**

<details><summary>Show answer</summary>

A **page** is a fixed-size chunk of the **program's content** (a slice of code/heap/stack) — think of a chapter torn from a book. A **frame** is a fixed-size **slot in physical RAM** — a shelf slot that holds one page. They're the **same size**, and exactly **one page fits in one frame**. 'Page 3 is in frame 47' means page 3's actual bytes are stored in that physical frame.

</details>

**Q263. Does virtual address space itself store any data or hold any RAM?**

<details><summary>Show answer</summary>

No. A virtual address is a **per-process, imaginary label** — it holds nothing itself and consumes no RAM. The real bytes live in physical **frames**; the **page table** translates each virtual address to the frame that actually stores the data. (Two different processes can even print the *same* virtual address mapping to completely different physical memory.)

</details>

**Q264. If a program's pages are scattered all over physical RAM, how does it still behave as if memory were one contiguous block?**

<details><summary>Show answer</summary>

The **page table** maps each contiguous **virtual** page to whatever physical **frame** holds it, and the **MMU** performs that translation on **every** memory access. So the program always sees a clean, ordered, contiguous virtual layout, while the hardware quietly redirects each access to the scattered real location. Non-contiguous in RAM, contiguous to the program.

</details>

**Q265. Beyond avoiding fragmentation, what benefits does paging unlock?**

<details><summary>Show answer</summary>

(1) **Virtual memory** — a process can use more memory than physically exists (unused pages live on disk). (2) **Isolation/protection** — each process has its own page table, so it can't see another process's memory, and pages carry permission bits. (3) **Sharing** — one physical frame (e.g. a shared library like libc) can be mapped into many processes at once.

</details>

**Q266. True or false: one physical frame can hold pieces of several pages at the same time.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** Pages and frames are the same size, and one frame holds exactly one page.

</details>

**Q267. Which problem does paging solve?**

- **A)** Internal fragmentation
- **B)** External fragmentation
- **C)** Slow disk access
- **D)** CPU cache misses

<details><summary>Show answer</summary>

**Correct: B**

**External fragmentation.** A process no longer needs one big contiguous block of RAM, because any free frame can hold any page. (Paging can cause a little *internal* fragmentation in the last page.)

</details>

**Q268. A global `int value = 1;` exists. After `fork()`, the child sets `value = 2` and exits. The parent waits for the child, then prints `value` and `&value`. What does it see?**

- **A)** 1, at the same address the child printed
- **B)** 2, at the same address the child printed
- **C)** 1, at a different address
- **D)** It depends on which process runs first

<details><summary>Show answer</summary>

**Correct: A**

**1, at the same address the child printed.** Both processes have the same virtual layout, so `&value` is the same number, but each has its own page table. The child's write went to its own copy of the page (copy-on-write), so the parent's frame still holds 1.

</details>

**Q269. Which of these are stored in a page table entry on x86-64? Select all that apply.**

- **A)** The frame number
- **B)** A present bit
- **C)** A dirty bit
- **D)** The name of the program file
- **E)** The process ID

<details><summary>Show answer</summary>

**Correct: A, B, C**

The **frame number**, the **present** bit and the **dirty** bit (also writable, user, accessed, no-execute). The page table has no file names and no process ID: each process simply has its own table.

</details>

**Q270. True or false: the page size is 4096 bytes on every Linux system, so it is safe to hardcode it.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** It is 4 KiB on x86-64, but some ARM64 systems use 16 KiB or 64 KiB pages. Ask with `sysconf(_SC_PAGESIZE)` (or `getconf PAGESIZE` in the shell).

</details>

**Q271. Writing through a pointer into a string literal, or jumping into code placed on the stack, crashes with a segmentation fault. Which part of paging enforces this, and how?**

<details><summary>Show answer</summary>

The **permission bits in the page table entries**. String literals sit in read-only pages (writable bit off); the stack and heap are in no-execute pages (NX bit on). The MMU checks the bits on every access; a violation raises a fault, the kernel sees the access is not allowed and sends `SIGSEGV`. `/proc/self/maps` shows these permissions per region (`r--p`, `r-xp`, `rw-p`).

</details>

**Q272. `/proc/self/maps` shows a region as `r-xp`. What does each letter mean?**

<details><summary>Show answer</summary>

`r` readable, `-` **not** writable, `x` executable, `p` **private** (this process's changes are not shared with other processes; `s` would mean shared). This is how a program's machine code is mapped: it can be run and read, but not modified.

</details>

### 25 — MMU, TLB & Multi-level Paging  (12 Qs)
**Q273. What does the MMU do on every memory access?**

<details><summary>Show answer</summary>

The **MMU (Memory Management Unit)** is dedicated **hardware in the CPU** that translates a **virtual address into a physical address** on *every* memory access — by walking the page table (or hitting the TLB) — and simultaneously **checks the permission bits** (present? writable? executable?), raising a page fault or protection fault if something is wrong. Software sets up the page tables; the MMU reads them and translates automatically.

</details>

**Q274. A virtual address splits into two parts for translation — what are they, and what does each select?**

<details><summary>Show answer</summary>

**Page number** and **offset**. The **page number** selects *which* page — looked up in the page table to get the physical **frame** number. The **offset** selects *where inside* that page/frame the byte is. Physical address = (frame base) + offset.
```
12290 with 4KB pages -> page 3 (12290/4096), offset 2
page 3 -> frame 47 ; physical = frame47_base + 2
```

</details>

**Q275. Why don't OSes use a single flat page table (on x86-64)?**

<details><summary>Show answer</summary>

Because it would be enormous. With a 48-bit address and 4 KB pages there are 2^36 pages; a flat table of 8-byte entries is 2^36 × 8 = **~512 GB per process** — impossible, and almost all empty since a process uses a tiny slice of its address space. **Multi-level paging** uses a **sparse tree** of small (512-entry) tables and creates only the sub-tables for regions actually in use, shrinking it to a few KB.

</details>

**Q276. How many levels does x86-64 paging use, and how is the address split?**

<details><summary>Show answer</summary>

**Four levels.** The 48-bit virtual address splits into four **9-bit** indexes (one per level, each into a 512-entry table) plus a **12-bit offset** (4 KB pages): `9 + 9 + 9 + 9 + 12 = 48`. The MMU walks Table1→Table2→Table3→Table4 to reach the frame. (Newer CPUs offer a 5-level mode for a larger 57-bit space.)

</details>

**Q277. A multi-level walk costs several memory accesses per translation — what hides that cost?**

<details><summary>Show answer</summary>

The **TLB (Translation Lookaside Buffer)** — a small, fast cache in the MMU that stores recent **page→frame** translations. On a TLB **hit**, the translation is instant and the multi-level walk is skipped. Thanks to locality, most accesses hit the TLB, so the expensive 4-level walk happens only on a miss.

</details>

**Q278. With 4 KB (4096-byte) pages, virtual address 12290 is in which page, and at what offset?**

- **A)** Page 3, offset 2
- **B)** Page 2, offset 4098
- **C)** Page 3, offset 4096
- **D)** Page 12, offset 290

<details><summary>Show answer</summary>

**Correct: A**

12290 = 3 × 4096 + 2, so it is **page 3, offset 2**. The page number goes through the page table to find the frame; the offset is kept as-is inside that frame.

</details>

**Q279. With 4 KB pages, how many bits of a virtual address are the offset inside the page?**

- **A)** 9
- **B)** 12
- **C)** 16
- **D)** 4096

<details><summary>Show answer</summary>

**Correct: B**

**12 bits**, because 2^12 = 4096 bytes. The remaining bits are the page number (on x86-64: 4 × 9 bits for the four table levels).

</details>

**Q280. What does this print? (4 KiB pages)**

```cpp
uint64_t va = 0x5123;
std::cout << (va >> 12) << " " << (va & 0xFFF);
```

<details><summary>Show answer</summary>

**Expected output:**
```
5 291
```

`va >> 12` drops the 12 offset bits: 0x5123 >> 12 = 5. `va & 0xFFF` keeps them: 0x123 = 291.

</details>

**Q281. True or false: switching between two threads of the same process requires flushing the TLB.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** Threads of one process share one address space and one page table, so the cached translations stay valid. A switch to a **different process** changes the page table; then the TLB is flushed, unless entries are tagged with PCID (x86) / ASID (ARM).

</details>

**Q282. Why do 2 MiB huge pages reduce TLB misses?**

- **A)** One TLB entry covers 512 times more memory
- **B)** Huge pages stay in the TLB permanently
- **C)** Huge pages need no page table at all
- **D)** They make the CPU caches bigger

<details><summary>Show answer</summary>

**Correct: A**

**One TLB entry covers 512 times more memory** (2 MiB instead of 4 KiB), so the same number of entries covers a much larger working set. The page walk is also one level shorter.

</details>

**Q283. What happens on a TLB miss, and how is it different from a page fault?**

<details><summary>Show answer</summary>

On a **TLB miss** the translation is not cached, so the MMU walks the page tables in hardware (up to 4 memory reads on x86-64), stores the result in the TLB and continues. No kernel code runs. A **page fault** happens only when the walk finds no valid entry (page not present) or the access breaks the permission bits; then the CPU traps into the kernel, which loads the page or kills the process with `SIGSEGV`.

</details>

**Q284. A program's page tables use 52 kB at start. After `malloc(1 << 30)` (1 GiB) they use 60 kB; after writing to every byte of that block, 2108 kB. Why so little at first, and where do the extra 2 MiB come from?**

<details><summary>Show answer</summary>

**Multi-level paging creates table pages only for address ranges in use**, and `malloc` only reserves virtual addresses: no page is mapped yet, so almost no tables are added. Writing touches all 262,144 pages (1 GiB / 4 KiB); each needs an 8-byte last-level entry, so 262,144 x 8 B = 2 MiB of new tables (512 table pages). A flat table would have needed 512 GiB from the start.

</details>

### 26 — Allocation Methods & Fragmentation  (12 Qs)
**Q285. Where is the wasted space in internal fragmentation versus external fragmentation?**

<details><summary>Show answer</summary>

**External** fragmentation wastes memory in the **gaps between** allocations: enough total memory is free, but it's scattered in pieces too small (or separated by live allocations) to satisfy a large contiguous request. **Internal** fragmentation wastes memory **inside** an allocated block, because the block handed out is bigger than what was asked for: the unused tail of a region's last page in paging, `malloc` rounding a 13-byte request up to a 24-byte block, a fixed partition bigger than its process. The names say it: *between* blocks (external) vs *inside* a block (internal).

</details>

**Q286. Why does paging cause internal fragmentation but eliminate external fragmentation?**

<details><summary>Show answer</summary>

Paging places each page into any free frame, so there are **no unusable gaps between allocations** → external fragmentation is gone. But a region rarely fills a whole number of pages, so the **last page** of each region is usually only partly used — the remainder is wasted **inside** that frame → internal fragmentation (bounded by page size − 1). It trades a large, scattered waste for a small, predictable one.

</details>

**Q287. Why does internal fragmentation only affect the *last* page of a region?**

<details><summary>Show answer</summary>

In **paging**, all the **earlier** pages of a region are **completely full** of its data: the data flows continuously with no gaps. Only at the end does the data run out mid-page, leaving the tail of the **final** page unused. (That is the paging case. In general, internal fragmentation is any space wasted inside an allocated block that is bigger than the request, such as `malloc` rounding a request up to its next block size.)

</details>

**Q288. Is external fragmentation a memory-management method you can choose, like paging?**

<details><summary>Show answer</summary>

No — it's a **problem / side effect**, not a method. The methods are **contiguous allocation**, **paging**, and **segmentation**. Contiguous allocation and segmentation *suffer from* external fragmentation (variable-size, must-be-contiguous placement); **paging is the method that cures it**. You never 'choose external fragmentation' — it happens to you when you use a contiguous scheme.

</details>

**Q289. What does each entry in a segment table store?**

<details><summary>Show answer</summary>

A **base** (the segment's start address in physical memory) and a **limit** (its length). An address is `(segment number, offset)`. The **limit** provides **protection**: if the offset is ≥ the limit, the access is past the segment's end and is rejected — so a program can't read/write outside its segment. Segmentation is good for logical protection/sharing but reintroduces external fragmentation.

</details>

**Q290. A process needs 10 KB and pages are 4 KB. How many frames does it use, and how much internal fragmentation is there?**

- **A)** 2 frames, 0 KB
- **B)** 3 frames, 2 KB
- **C)** 3 frames, 0 KB
- **D)** 2.5 frames, 2 KB

<details><summary>Show answer</summary>

**Correct: B**

10 / 4 = 2.5, and you can't use half a frame, so it takes **3 frames** (12 KB). The last frame holds only 2 KB of data, so **2 KB** is wasted inside it.

</details>

**Q291. True or false: paging suffers from external fragmentation.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** Any free frame can hold any page, so gaps between allocations never block a request. Paging trades that for a little internal fragmentation in the last page.

</details>

**Q292. Free holes, in address order: 100, 500, 200, 300, 600 KB. A 212 KB request arrives. Which hole does **best-fit** choose?**

- **A)** 100 KB
- **B)** 500 KB
- **C)** 300 KB
- **D)** 600 KB

<details><summary>Show answer</summary>

**Correct: C**

**300 KB**: the smallest hole that is still big enough (100 and 200 are too small). First-fit would take 500 (the first that fits); worst-fit would take 600 (the largest).

</details>

**Q293. Which of these are **internal** fragmentation? Select all that apply.**

- **A)** `malloc(13)` returns a block with 24 usable bytes
- **B)** 959 KB are free, but the largest hole is 300 KB
- **C)** A 2 MiB huge page holds only 10 KB of data
- **D)** A 40 KB process runs in a 64 KB fixed partition

<details><summary>Show answer</summary>

**Correct: A, C, D**

Internal fragmentation is waste inside an allocated block: `malloc(13)` getting a 24-byte block, a 2 MiB huge page holding 10 KB, a 64 KB fixed partition holding a 40 KB process. 959 KB free with the largest hole 300 KB is **external** fragmentation: the waste is between blocks.

</details>

**Q294. True or false: the allocator can compact a C++ program's heap by moving live blocks together.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** A C++ pointer is a raw address that can be stored anywhere; the allocator can't find and update every copy, so live blocks can never move. Compaction works where addresses are relocatable: page tables (Linux's `kcompactd`) or garbage-collected languages that fix every reference.

</details>

**Q295. A segment table has segment 2 with base 4300 and limit 400. What happens for the logical addresses (2, 53) and (2, 450)?**

<details><summary>Show answer</summary>

(2, 53): 53 < 400, so the physical address is 4300 + 53 = **4353**. (2, 450): 450 is not below the limit 400, so the hardware **traps**: the access is outside the segment (a segmentation fault).

</details>

**Q296. A long-running C++ server's memory keeps growing, though it frees what it allocates. Name three ways to reduce heap fragmentation.**

<details><summary>Show answer</summary>

(1) **Allocate less often:** `reserve()` vectors, store objects by value in a `std::vector` instead of allocating each with `new`. (2) **Pools** for same-size objects, so every freed slot fits the next one. (3) **Arenas** (`std::pmr::monotonic_buffer_resource`): allocate a task's objects from one buffer and release them all together. Also: keep long-lived and short-lived allocations apart, and try another allocator (jemalloc, tcmalloc), measuring the result.

</details>

### 27 — Demand Paging, Page Faults & Swapping  (13 Qs)
**Q297. Walk through exactly what happens on a page fault.**

<details><summary>Show answer</summary>

1) The program touches a virtual page whose page-table entry is marked **not present**. 2) The CPU raises a **page fault** — a trap into the OS. 3) The OS finds a **free frame** (evicting a cold page to disk first if needed), 4) **loads the page's bytes from disk** into that frame, 5) **updates the page table** to mark it present and point at the frame, and 6) **restarts the faulting instruction**. The program resumes as if nothing happened — it just felt a small pause.

</details>

**Q298. A page fault can be ~1000× slower than a RAM access — why is demand paging still a net win?**

<details><summary>Show answer</summary>

Because the cost is **paid once per page**, then that page sits in RAM for many fast reuses. Thanks to **locality of reference**, a program hammers a small **working set** of pages, so faults are rare relative to total accesses. Demand paging also avoids loading (and wasting RAM on) the large parts of a program you never touch, and speeds startup. Many faults are also 'minor' (no disk I/O). It only loses when the working set doesn't fit in RAM.

</details>

**Q299. What is thrashing, and what causes it?**

<details><summary>Show answer</summary>

**Thrashing** is when the working set is **larger than available RAM**, so the OS is forced to constantly evict a page and almost immediately fault it back in. The machine spends most of its time doing disk I/O for paging instead of real work, and performance collapses. The fix is more RAM or a smaller working set (fewer concurrent processes).

</details>

**Q300. What is the difference between a minor and a major page fault?**

<details><summary>Show answer</summary>

A **minor** fault is resolved **without disk I/O** — the page is already in RAM (in the page cache, shared by another process, or a fresh zero-filled page); the OS just fixes the mapping. A **major** fault requires **reading the page from disk**, which is the slow, expensive kind. Most faults after warm-up are minor.

</details>

**Q301. How is a page fault different from a segmentation fault?**

<details><summary>Show answer</summary>

A **page fault** is a *normal* event: the address is valid, the page just isn't in RAM yet, so the OS transparently loads it and continues. A **segmentation fault** is an *error*: the program accessed memory it isn't allowed to (unmapped or wrong permission), so the OS refuses and usually kills the process. Same hardware mechanism (a trap), opposite outcomes.

</details>

**Q302. What is swapping, and which capability does it provide?**

<details><summary>Show answer</summary>

**Swapping** is evicting **cold** (rarely used) pages from RAM out to a reserved area on **disk** (the swap/page file) when RAM is full, freeing frames for pages needed now. It's what makes **virtual memory** possible: total memory in use across processes can **exceed physical RAM**, because RAM acts as a fast window over a larger space that overflows to disk.

</details>

**Q303. Which of these are true of a page fault? Select all that apply.**

- **A)** It is normal: the OS loads the missing page and restarts the instruction
- **B)** It always means the program has a bug
- **C)** A major page fault needs a disk read
- **D)** It is the same thing as a segmentation fault

<details><summary>Show answer</summary>

**Correct: A, C**

A page fault is **normal**: the OS loads the missing page and restarts the instruction. A **major** fault needs a disk read (a minor one doesn't). It is not a bug and not a segfault, which is an illegal access the OS refuses.

</details>

**Q304. The running programs need more memory than RAM, so pages are constantly swapped in and out and the system crawls. What is this called?**

- **A)** Demand paging
- **B)** Thrashing
- **C)** External fragmentation
- **D)** A minor page fault

<details><summary>Show answer</summary>

**Correct: B**

**Thrashing**: the working set is bigger than RAM, so the system spends its time on page faults instead of useful work.

</details>

**Q305. With FIFO replacement, the reference string 1 2 3 4 1 2 5 1 2 3 4 5 gives 9 faults with 3 frames but 10 faults with 4 frames. What is this called?**

- **A)** Belady's anomaly
- **B)** Thrashing
- **C)** Copy-on-write
- **D)** External fragmentation

<details><summary>Show answer</summary>

**Correct: A**

**Belady's anomaly**: with FIFO, adding frames can increase the number of faults. LRU and Optimal never show it, because the pages they keep with n frames are also kept with n + 1 frames.

</details>

**Q306. After `fork()`, the child reads every page of a 40 MiB buffer, then writes every page. Roughly how many page faults does each pass cause in the child?**

- **A)** Reads: about 0; writes: one per page
- **B)** Reads: one per page; writes: about 0
- **C)** Both about 0
- **D)** Both one per page

<details><summary>Show answer</summary>

**Correct: A**

Reads: about **0** (the child uses the parent's frames, shared read-only). Writes: **one fault per page** (10,240 for 40 MiB in 4 KiB pages): each first write triggers copy-on-write, and the kernel copies that one page.

</details>

**Q307. True or false: on Linux with default settings, `malloc(8UL << 30)` (8 GiB) can succeed on a machine with 16 GB of RAM even if most of it is in use, and the process's RAM use barely changes.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: A**

**True.** Linux overcommits: `malloc` only reserves virtual pages, and frames are attached when pages are first touched. RSS stays small until the memory is written. If programs later touch more than RAM + swap, the OOM killer kills a process.

</details>

**Q308. Using LRU with 3 frames, how many page faults does the reference string 1 2 3 1 4 1 5 1 cause?**

- **A)** 4
- **B)** 5
- **C)** 6
- **D)** 8

<details><summary>Show answer</summary>

**Correct: B**

**5.** 1, 2, 3 fault (frames fill). 1 hits. 4 faults and evicts 2 (least recently used). 1 hits. 5 faults and evicts 3. 1 hits. FIFO would cause 6, because it evicts page 1 just for being oldest.

</details>

**Q309. How do the Clock (second-chance) and Optimal replacement policies choose a victim, and why can't the kernel use Optimal?**

<details><summary>Show answer</summary>

**Clock:** frames are in a circle with a referenced (accessed) bit. The hand moves round; a page with the bit set gets a second chance (bit cleared, hand moves on); the first page with the bit clear is evicted. **Optimal:** evicts the page whose next use is farthest in the future. The kernel can't know future references, so Optimal is only a benchmark for comparing real policies.

</details>

## Linux

### 28 — Filesystem & Navigation  (11 Qs)
**Q310. Your program does `open("config.txt")`; it works from one directory but fails with 'file not found' from another. Why?**

<details><summary>Show answer</summary>

`"config.txt"` is a **relative** path — it's resolved against the **process's current working directory**, not the location of the executable. Run the program from a directory that doesn't contain `config.txt` and the open fails. Fixes: use an **absolute** path, compute the path relative to the executable, or `chdir` to the expected directory. Very common bug.

</details>

**Q311. What is the difference between an absolute and a relative path?**

<details><summary>Show answer</summary>

An **absolute** path starts at the root `/` (e.g. `/home/anup/config.txt`) and means the same thing no matter your current directory. A **relative** path (e.g. `config.txt`, `../data/x`) is resolved from the **current working directory**, so its meaning changes with where you run the program. Absolute is the location-independent one.

</details>

**Q312. What do `.` and `..` refer to in a path?**

<details><summary>Show answer</summary>

`.` is the **current** directory; `..` is its **parent** directory. So `./x` is `x` here, and `../x` is `x` one level up. They're used constantly in relative paths and in `cd ..`.

</details>

**Q313. What does `ls -la` show that a plain `ls` does not?**

<details><summary>Show answer</summary>

Two things: **`-l`** gives the **long format** (permissions, owner, group, size, timestamp per entry), and **`-a`** shows **all** entries **including hidden dotfiles** (names starting with `.`, plus the `.` and `..` entries). Plain `ls` lists only the visible names.

</details>

**Q314. Both directories exist. What does this print?**

```bash
cd /home/anup/project/src
cd ../build
pwd
```

<details><summary>Show answer</summary>

**Expected output:**
```
/home/anup/project/build
```

`..` is the parent of `src`, which is `/home/anup/project`; then into `build`.

</details>

**Q315. Which of these paths is absolute?**

- **A)** `../config.txt`
- **B)** `./run.sh`
- **C)** `/etc/hosts`
- **D)** `src/main.cpp`

<details><summary>Show answer</summary>

**Correct: C**

**`/etc/hosts`**: an absolute path starts at the root `/`. The others are relative to the current directory.

</details>

**Q316. `b.txt` is a hard link to `a.txt` (`ln a.txt b.txt`). You run `rm a.txt`. What does `cat b.txt` do?**

- **A)** Prints the original contents
- **B)** Fails: No such file or directory
- **C)** Prints nothing: the file is now empty
- **D)** Prints the path a.txt

<details><summary>Show answer</summary>

**Correct: A**

It **prints the original contents**. `a.txt` and `b.txt` were two names for the same inode. `rm` removed one name; the data is freed only when the last name is gone (and no process has it open). A **symbolic** link would be broken now.

</details>

**Q317. Which of these are true of a symbolic link? Select all that apply.**

- **A)** It can point to a directory
- **B)** It can point to a file on another filesystem
- **C)** It keeps the data alive after the target is deleted
- **D)** It has its own inode

<details><summary>Show answer</summary>

**Correct: A, B, D**

A symlink is its own small file (its own inode) that stores a path, so it **can point to a directory** and **can cross filesystems**. When the target is removed it becomes **dangling**; it does not keep the data alive (a hard link does).

</details>

**Q318. What does this print?**

```cpp
#include <filesystem>
#include <iostream>

int main() {
    std::filesystem::path p = "/home/sam/project/src/main.cpp";
    std::filesystem::path q = "../build/app";
    std::cout << p.is_absolute() << " " << q.is_absolute() << "\n";
    std::cout << p.parent_path().string() << "\n";
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
1 0
/home/sam/project/src
```

`is_absolute()` is true only for a path that starts at `/`, so `1` then `0` (`<<` prints a `bool` as 1 or 0). `parent_path()` drops the last component: `/home/sam/project/src`.

</details>

**Q319. The current directory contains `a.txt` and `b.txt`. Why does `find . -name *.txt` fail, and how do you fix it?**

<details><summary>Show answer</summary>

The **shell** expands `*.txt` before `find` runs, so `find` receives `find . -name a.txt b.txt` and rejects the extra `b.txt` (`paths must precede expression`). Quote the pattern so it reaches `find` unchanged: `find . -name "*.txt"`. (With no `.txt` file in the current directory the unquoted form happens to work, which hides the bug.)

</details>

**Q320. Which directory holds system-wide configuration files (the hosts file, the list of users), and which one is a live view generated by the kernel rather than stored on disk?**

<details><summary>Show answer</summary>

**`/etc`** holds system-wide configuration as text files (`/etc/hosts`, `/etc/passwd`). **`/proc`** is generated by the kernel when read: `/proc/<pid>` describes each process, `/proc/meminfo` the memory. (`/dev` holds device files; `/var` holds logs and other changing data.)

</details>

### 29 — Permissions (rwx)  (11 Qs)
**Q321. What numeric permission mode does `-rwxr-xr-x` correspond to?**

<details><summary>Show answer</summary>

**755.** Ignore the leading `-` (it just marks a regular file; `d` would be a directory). Read the three triplets with r=4, w=2, x=1: owner `rwx` = 4+2+1 = **7**, group `r-x` = 4+0+1 = **5**, others `r-x` = **5** → **755**.

</details>

**Q322. You compiled a program but `./prog` says 'Permission denied' — what's the most likely cause?**

<details><summary>Show answer</summary>

The binary is missing its **execute (`x`) bit**, so the kernel won't run it. Fix it with **`chmod +x prog`** (or `chmod 755 prog`). This is the #1 cause of 'Permission denied' for a script or a freshly created binary. (A compiled binary is usually 755; a source `.cpp` is 644 — no `x`, which is correct since you don't execute source.)

</details>

**Q323. When you access a file, how does the kernel decide which of the three rwx triplets to apply?**

<details><summary>Show answer</summary>

The three triplets are for the file's **owner**, its **group**, and **others**. On each access the kernel checks your process's **UID/GID**: if you're the owner it uses the *owner* triplet; else if you're in the file's group, the *group* triplet; else the *others* triplet. Exactly one triplet applies — chosen most-specific-first — and it decides whether your requested r/w/x is allowed.

</details>

**Q324. On a *directory*, what do r, w, and x each mean (they differ from a file)?**

<details><summary>Show answer</summary>

On a directory: **`r`** = list the names inside it; **`w`** = add/remove/rename entries (create or delete files in it); **`x`** = enter/traverse it (cd into it and reach files by name). Notably you need `x` on a directory just to reach files inside it, even if you already know their paths.

</details>

**Q325. What is `-rw-r--r--` in numeric form?**

- **A)** 644
- **B)** 755
- **C)** 664
- **D)** 444

<details><summary>Show answer</summary>

**Correct: A**

Owner `rw-` = 4+2 = 6, group `r--` = 4, others `r--` = 4, so **644** (the usual mode for a source file).

</details>

**Q326. `ls -l` shows `drwxr-x---`. What is it, and can *others* list its contents?**

- **A)** A regular file; yes
- **B)** A directory; no
- **C)** A directory; yes
- **D)** A symlink; no

<details><summary>Show answer</summary>

**Correct: B**

The leading `d` means a **directory**. The last triplet (others) is `---`, so others have no `r` and **cannot** list it.

</details>

**Q327. The umask is 027. What mode does `touch report.txt` give the new file?**

- **A)** 640 (rw-r-----)
- **B)** 639
- **C)** 750 (rwxr-x---)
- **D)** 666 (rw-rw-rw-)

<details><summary>Show answer</summary>

**Correct: A**

**640 (`rw-r-----`).** `touch` asks for 666; the umask clears the bits in 027: 666 & ~027 = 640. The group keeps read, others get nothing.

</details>

**Q328. True or false: a file with mode `----rwxrwx` owned by `sam` can be read by `sam`, because others are allowed to read it.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** `sam` is the owner, so only the owner triplet `---` is checked; the kernel never falls back to the group or others triplet. (`sam` can still `chmod` it, because the owner may always change the mode.)

</details>

**Q329. Which of these need write permission on the **directory** that holds the file? Select all that apply.**

- **A)** Deleting the file
- **B)** Renaming the file
- **C)** Creating a new file in it
- **D)** Appending a line to the file

<details><summary>Show answer</summary>

**Correct: A, B, C**

Creating, deleting and renaming change the directory's list of names, so they need `w` (and `x`) on the directory. Changing the file's **contents** needs `w` on the file itself.

</details>

**Q330. What do the setuid bit on an executable and the sticky bit on a directory do? Give one real example of each.**

<details><summary>Show answer</summary>

**setuid**: the program runs with the **file owner's** effective user ID instead of the caller's. Example: `/usr/bin/passwd` (`-rwsr-xr-x`, owned by root) lets any user update `/etc/shadow`. **sticky** on a directory: in a directory everyone can write to, a file can be deleted or renamed only by its owner, the directory's owner or root. Example: `/tmp` (`drwxrwxrwt`).

</details>

**Q331. A script `run.sh` has mode `--x--x--x`. Running `./run.sh` fails with "Permission denied", but a compiled program with the same mode runs. Why?**

<details><summary>Show answer</summary>

For a script, the kernel starts the interpreter named on the `#!` line, and the interpreter must **open and read** the script, which needs `r`. A compiled binary is loaded by the kernel itself, so `x` is enough. Give the script `r-x` (e.g. 755).

</details>

### 30 — chmod  (10 Qs)
**Q332. What is the difference between `chmod 755 f` and `chmod +x f`?**

<details><summary>Show answer</summary>

`chmod 755 f` sets **all three triplets explicitly and absolutely** — owner `rwx`, group `r-x`, others `r-x` — overwriting whatever was there. `chmod +x f` is **relative**: it only **adds** the execute bit (for all three categories) and leaves the read/write bits untouched. Use numeric for an exact mode; symbolic to nudge one bit.

</details>

**Q333. In symbolic `chmod`, how do you give execute permission to ONLY the owner?**

<details><summary>Show answer</summary>

**`chmod u+x file`** — `u` targets the owner (user) and `+x` adds execute, leaving group and others untouched. The target letters are `u`=owner, `g`=group, `o`=others, `a`=all. (`chmod +x file` with no letter behaves like `a+x` — execute for everyone.)

</details>

**Q334. Which permission bit is the usual culprit behind 'Permission denied' when running `./script.sh`?**

<details><summary>Show answer</summary>

The **execute (`x`)** bit. Without it, the shell won't run the file even if it's readable. Fix with `chmod +x script.sh`. (For a script you also need a readable interpreter, but the missing `x` is the classic cause.)

</details>

**Q335. A file is `-rw-r--r--` (644). What does `ls -l` show after `chmod u+x f`?**

- **A)** `-rwxr--r--`
- **B)** `-rwxr-xr-x`
- **C)** `-rw-r--r-x`
- **D)** `-rwxrwxrwx`

<details><summary>Show answer</summary>

**Correct: A**

`u+x` adds execute for the **owner only** and leaves every other bit alone: `-rwxr--r--` (744).

</details>

**Q336. Which command sets a file to exactly `rwxr-xr-x`, whatever its bits were before?**

- **A)** `chmod +x f`
- **B)** `chmod 755 f`
- **C)** `chmod u+x f`
- **D)** `chmod a+r f`

<details><summary>Show answer</summary>

**Correct: B**

**`chmod 755 f`**: a numeric mode sets all three triplets at once. The symbolic forms only add or remove the bits you name.

</details>

**Q337. A file is `-rwxr-xr-x` (755). What is its mode after `chmod g+w,o-rx f`?**

- **A)** -rwxrwx--- (770)
- **B)** -rwxrw---- (760)
- **C)** -rwxr-x--- (750)
- **D)** -rw-rw---- (660)

<details><summary>Show answer</summary>

**Correct: A**

`g+w` adds write for the group (`r-x` becomes `rwx`), `o-rx` removes read and execute from others (`r-x` becomes `---`). The owner is untouched: **`-rwxrwx---` (770)**.

</details>

**Q338. What does this print?**

```cpp
std::cout << std::oct << 640 << " " << 0640 << "\n";
```

<details><summary>Show answer</summary>

**Expected output:**
```
1200 640
```

`640` without a leading 0 is a **decimal** literal. Printed in octal it is `1200`, which `chmod` would read as sticky + owner write, not `rw-r-----`. `0640` is the octal literal and prints as `640`.

</details>

**Q339. You want every directory under `www/` to be `rwxr-xr-x` and every regular file `rw-r--r--`, keeping scripts that are already executable runnable. Which command does it?**

- **A)** chmod -R u=rwX,go=rX www
- **B)** chmod -R 644 www
- **C)** chmod -R 755 www
- **D)** chmod -R a+x www

<details><summary>Show answer</summary>

**Correct: A**

**`chmod -R u=rwX,go=rX www`**. Capital `X` adds execute only to directories and to files that already have an `x`. `chmod -R 644` would strip `x` from the directories (nobody could enter them); `chmod -R 755` would make every file executable.

</details>

**Q340. True or false: running `chmod 755 dir` on a directory whose mode is 2775 leaves the setgid bit set.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: A**

**True.** GNU chmod keeps a directory's setuid and setgid bits when given a three-digit mode, so the result is 2755 (`rwxr-sr-x`). Clear it with `chmod g-s dir` or a five-digit mode such as `chmod 00755 dir`.

</details>

**Q341. Which numeric mode do you give a shared upload directory where everyone may create files but nobody may delete other people's files, and how does `ls -ld` show it?**

<details><summary>Show answer</summary>

**1777**: 777 lets everyone create files, and the leading 1 is the **sticky** bit, so only a file's owner (or the directory's owner, or root) may delete or rename it. `ls -ld` shows `drwxrwxrwt`, like `/tmp`.

</details>

### 31 — chown & Ownership  (11 Qs)
**Q342. Why can't a normal (non-root) user give their own file to another user with `chown`?**

<details><summary>Show answer</summary>

Changing a file's **owner** requires **root**. If ordinary users could hand files away, they could dodge disk **quotas** (dump big files onto someone else) or plant files as another user — a security hole. So only root can change ownership. A regular user *can* change a file's **group** to one they belong to (`chgrp`), but not its owner.

</details>

**Q343. Give the chown syntax for: owner+group, owner only, group only, and recursive.**

<details><summary>Show answer</summary>

```bash
chown user:group file   # owner AND group
chown user file         # owner only
chown :group file       # group only (or: chgrp group file)
chown -R user:group dir # recursive: dir and everything inside
```

</details>

**Q344. How do ownership and the rwx bits work together to decide access?**

<details><summary>Show answer</summary>

They're checked **together** on every open/read/write/execute. The kernel compares the process's **UID/GID** to the file's **owner and group** to pick which rwx triplet applies (owner, group, or others), then checks whether that triplet grants the requested operation. So 'who owns it' selects *which* permissions, and the rwx bits say *what* those permissions are.

</details>

**Q345. What does `id` show that `whoami` does not?**

<details><summary>Show answer</summary>

`whoami` prints just your **username**. `id` prints your numeric **UID**, primary **GID**, and **all group memberships**. That extra detail is what matters for permissions, because the kernel checks those numeric IDs (not the name) against a file's owner/group to decide which rwx triplet applies to you.

</details>

**Q346. True or false: a regular (non-root) user can give one of their own files to another user with `chown`.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** Only root can change a file's owner (`chown: ... Operation not permitted` otherwise). A regular owner can only change the group, and only to a group they belong to.

</details>

**Q347. Which command changes **only** the group of `data.txt` to `devs`?**

- **A)** `chown devs data.txt`
- **B)** `chown :devs data.txt`
- **C)** `chmod g=devs data.txt`
- **D)** `chown -R devs data.txt`

<details><summary>Show answer</summary>

**Correct: B**

**`chown :devs data.txt`**: the empty part before the colon leaves the owner unchanged. (`chgrp devs data.txt` does the same.) `chown devs data.txt` would change the owner.

</details>

**Q348. `/srv/proj` is `drwxrwsr-x root devs`. User `sam` (primary group `sam`, also in `devs`) runs `touch /srv/proj/a.txt`. Who owns the new file?**

- **A)** sam:devs
- **B)** sam:sam
- **C)** root:devs
- **D)** root:root

<details><summary>Show answer</summary>

**Correct: A**

**`sam:devs`.** The owner is always the creating process's UID (`sam`). The group would normally be `sam`'s primary group, but the directory has the **setgid** bit (`s` in the group triplet), so the new file gets the directory's group, `devs`.

</details>

**Q349. True or false: `chown` on a setuid program keeps the setuid bit, as long as root runs it.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** Linux clears the setuid and setgid bits of an executable when its owner or group changes, even for root. Run `chmod u+s` after `chown`.

</details>

**Q350. Which of these can a regular (non-root) user who owns `f.txt` do? Select all that apply.**

- **A)** `chmod 600 f.txt`
- **B)** `chgrp` to a group they belong to
- **C)** `chown otheruser f.txt`
- **D)** `chgrp` to a group they don't belong to

<details><summary>Show answer</summary>

**Correct: A, B**

The owner may change the mode (`chmod`) and may change the group to a group they belong to. Giving the file to another user, or to a group they are not a member of, needs root.

</details>

**Q351. A file shows `-rw-r--r-- 1 1005 staff ...` in `ls -l`: a number instead of an owner name. What happened, and why can it be a risk?**

<details><summary>Show answer</summary>

The owner's UID (1005) no longer has an entry in `/etc/passwd`, usually because the user was deleted. The file still belongs to UID 1005, so a user created later with that UID would own it and could read or change it. Clean up with `find / -nouser` and `chown` such files to the right owner.

</details>

**Q352. Why should a server process run as a dedicated system user instead of root, and how is that set up?**

<details><summary>Show answer</summary>

**Least privilege**: if the process is compromised, the attacker only gets the rights of that user (its own data directory), not the whole machine. Setup: `useradd --system --no-create-home --shell /usr/sbin/nologin webapp`, `chown -R webapp:webapp /var/lib/webapp`, `chmod 750` it, and start the service as that user (systemd `User=webapp`, or `sudo -u webapp`, or the program drops privileges with `setgid()` then `setuid()`).

</details>

## C++ Core (continued)

### 32 — Member Initializer List  (12 Qs)
**Q353. What is the difference between initialization (in the list) and assignment (in the body)?**

<details><summary>Show answer</summary>

The list **initializes** a member directly, once, as the object is built. In the body the member already exists (default-constructed / indeterminate), so `a = x;` only **assigns** — for class members that's default-construct + reassign (two steps) vs one.

</details>

**Q354. Which members MUST be initialized in the list (won't compile otherwise)?**

<details><summary>Show answer</summary>

`const` members, **reference** members, member objects whose type has **no default constructor**, and a **base class** with no default constructor.

</details>

**Q355. How do you pass an argument to a base class constructor?**

<details><summary>Show answer</summary>

In the derived class's initializer list: `Derived(int x) : Base(x) {}`. It's the only place you can — omit it and the base's default ctor is called (error if none). Needed even inside a default constructor.

</details>

**Q356. In what order are members initialized?**

<details><summary>Show answer</summary>

In the order they are **declared** in the class, not the order written in the list (bases first, then members). So don't initialize one member from another that's declared after it.

</details>

**Q357. What is a delegating constructor, and its one rule?**

<details><summary>Show answer</summary>

One constructor calls another of the same class through the list (`Entity() : Entity(0) {}`) to reuse setup. Rule: the delegation must be the **only** item in the list.

</details>

**Q358. If C++11 lets you write `int a = 0;` at the declaration, why is the init list still needed?**

<details><summary>Show answer</summary>

A default member initializer is a **fixed** fallback, same for every object, and can't use constructor arguments or initialize a base class. The list is needed for **argument-driven** values and for **base class** initialization.

</details>

**Q359. What does this print?**

```cpp
struct Log { Log(char c) { std::cout << c; } };

struct S {
    Log x, y;
    S() : y('Y'), x('X') {}
};

int main() { S s; }
```

<details><summary>Show answer</summary>

**Expected output:**
```
XY
```

Members are initialized in the order they are **declared** (`x`, then `y`), not the order written in the list. g++ even warns about it with `-Wall` (`-Wreorder`).

</details>

**Q360. True or false: if a member has a default initializer (`int a = 0;`) and is also in the member initializer list, the list's value is used.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: A**

**True.** The list takes precedence: the default initializer is simply not used for that constructor (the member is initialized once, with the list's value).

</details>

**Q361. What does this print?**

```cpp
struct A {
    A(int x) { std::cout << "T" << x; }
    A() : A(5) { std::cout << "D"; }
};

int main() { A a; }
```

<details><summary>Show answer</summary>

**Expected output:**
```
T5D
```

`A a;` uses `A()`, which delegates to `A(5)`. The target constructor runs completely first (`T5`), then the delegating constructor's body (`D`).

</details>

**Q362. What does this print?**

```cpp
struct N {
    N()               { std::cout << "d"; }
    N(int)            { std::cout << "i"; }
    N& operator=(int) { std::cout << "="; return *this; }
};
struct A { N n; A() { n = 1; } };
struct B { N n; B() : n(1) {} };

int main() {
    A a;
    std::cout << " ";
    B b;
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
d= i
```

`A` doesn't list `n`, so `n` is default-constructed (`d`), then assigned in the body (`=`): two steps. `B` initializes `n` directly in the list (`i`): one step.

</details>

**Q363. `class Buffer { int* data; int size; public: Buffer(int n) : size(n), data(new int[size]) {} };` What is wrong?**

- **A)** Nothing: `size` is set first because it is written first
- **B)** `data` is initialized first, so `size` is read before it is set
- **C)** It does not compile: `size` must be `const`
- **D)** `size` is initialized twice

<details><summary>Show answer</summary>

**Correct: B**

`data` is **declared** first, so it is initialized first, whatever the list order. `new int[size]` then reads `size` before it has been set: undefined behaviour. g++ warns (`-Wreorder` and `-Wuninitialized`). Fix: `data(new int[n])`, or declare `size` before `data`.

</details>

**Q364. When should code go in the constructor **body** rather than in the member initializer list?**

<details><summary>Show answer</summary>

When it needs the members to exist already, or is not an initialization: checking the values and throwing if they are invalid, logging, registering the object somewhere, computing a member from several others (in a clear order), or calling functions on the finished members. Setting members themselves belongs in the list (or in default member initializers).

</details>

### 33 — Ternary Operator  (11 Qs)
**Q365. Is the ternary a statement or an expression, and why does that matter?**

<details><summary>Show answer</summary>

An **expression** — it produces a value. That's why it can be used inline where a value is needed (initializing a variable or a `const`, a `return`, a function argument), which an `if/else` statement can't do.

</details>

**Q366. Why can a ternary initialize a `const` when if/else can't?**

<details><summary>Show answer</summary>

A `const` must get its value at the moment of declaration, in one shot. The ternary is a single expression that yields that value. `if/else` runs *after* the variable exists, forcing declare-then-assign — which `const` forbids.

</details>

**Q367. In `cond ? 1 : 2.5`, what is the result type and why?**

<details><summary>Show answer</summary>

**double**. The two branches must have a common type; `int` and `double` convert to the common type `double`, so `1` becomes `1.0` and the whole expression is `double` — regardless of which branch is chosen.

</details>

**Q368. When do the two branches make a ternary fail to compile?**

<details><summary>Show answer</summary>

When they have **no common type** to convert to — e.g. `cond ? 5 : "hi"` (an `int` and a `const char*`). Same type isn't required; a common/convertible type is.

</details>

**Q369. Why does `cout << c ? "a" : "b";` need parentheses?**

<details><summary>Show answer</summary>

Because `<<` has **higher precedence** than `?:`, so it parses as `(cout << c) ? "a" : "b"` — it prints `c`, then applies `?:` to the stream (broken). `cout << (c ? "a" : "b")` forces the ternary first.

</details>

**Q370. Is the branch that isn't chosen evaluated?**

<details><summary>Show answer</summary>

No — only the chosen branch is evaluated. That's what makes `p ? *p : 0` safe: `*p` runs only when `p` is non-null.

</details>

**Q371. What does this print?**

```cpp
int x = 7;
std::cout << (x % 2 == 0 ? "even" : "odd") << " " << (x > 5 ? x * 2 : x);
```

<details><summary>Show answer</summary>

**Expected output:**
```
odd 14
```

7 is odd, so the first ternary gives `"odd"`. 7 > 5, so the second gives `x * 2` = 14. Both are wrapped in parentheses because `<<` binds tighter than `?:`.

</details>

**Q372. `auto r = true ? 1 : 2.5;` What is the type of `r`?**

- **A)** `int`
- **B)** `double`
- **C)** `float`
- **D)** It does not compile

<details><summary>Show answer</summary>

**Correct: B**

**`double`.** The two branches need a common type: `int` and `double` meet at `double`, so even though the `1` branch is chosen, `r` is the `double` 1.0.

</details>

**Q373. What does this print? (`unsigned` is 32 bits.)**

```cpp
int n = -1;
unsigned u = 5;
std::cout << (n < 0 ? n : u);
```

<details><summary>Show answer</summary>

**Expected output:**
```
4294967295
```

The branches are `int` and `unsigned`, so the whole expression has the common type `unsigned`. The chosen value `-1` is converted to `unsigned`: 2^32 - 1 = 4294967295.

</details>

**Q374. What does this print?**

```cpp
int x = 0;
std::cout << (x > 0 ? "pos" : x < 0 ? "neg" : "zero");
```

<details><summary>Show answer</summary>

**Expected output:**
```
zero
```

The chain is read as `x > 0 ? "pos" : (x < 0 ? "neg" : "zero")`. `x` is 0, so both conditions are false and the last value, `zero`, is chosen.

</details>

**Q375. Which of these is the best use of the ternary operator?**

- **A)** Choosing which of two values initializes a `const`
- **B)** Running one of two blocks of several statements
- **C)** Replacing a `switch` with five cases
- **D)** Calling one of two functions only for their side effects

<details><summary>Show answer</summary>

**Correct: A**

The ternary chooses between **two values** in one expression, which is exactly what initializing a `const` needs. Several statements per branch, many cases, or actions done only for their side effects read better as `if/else` or `switch`.

</details>

### 34 — Creating / Instantiating Objects  (12 Qs)
**Q376. What are the two places an object can live, and how does each affect its lifetime?**

<details><summary>Show answer</summary>

The **stack** and the **heap** are the two you choose between in everyday code. A stack object (`Entity e;`) has **automatic** lifetime: it is destroyed when it leaves scope, with its destructor called for you. A heap object (`new Entity`) has **manual** lifetime: it lives until you `delete` it, so it can outlive the scope (but leaks if you forget). Strictly there is a third place, **static storage**: globals, `static` locals and static members live there for the whole program.

</details>

**Q377. Why do you access a heap object with `->` but a stack object with `.`?**

<details><summary>Show answer</summary>

`new` gives you a **pointer**, not the object itself, so you must go through the pointer: `p->x`, which is shorthand for `(*p).x` (dereference, then dot). A stack variable *is* the object, so you use `.` directly.

</details>

**Q378. What is a memory leak and what causes it?**

<details><summary>Show answer</summary>

Heap memory that was allocated with `new` but never `delete`d. The program still owns the address but nothing uses it and nothing else can reuse it, so memory is wasted until the program exits.

</details>

**Q379. What is a dangling pointer? Give two ways to create one.**

<details><summary>Show answer</summary>

A pointer holding an address whose object no longer exists — using it is undefined behaviour. Two ways: (1) point at a **stack object** and let it go out of scope; (2) `delete` a heap object but keep using the pointer (**use-after-delete**).

</details>

**Q380. Why set a pointer to `nullptr` after `delete`?**

<details><summary>Show answer</summary>

After `delete` the pointer still holds the freed address (dangling). Setting it to `nullptr` marks it as 'points to nothing' so you can test it, and because `delete nullptr;` is a safe no-op, it also protects against an accidental **double-delete**.

</details>

**Q381. What does `Entity e();` actually declare?**

<details><summary>Show answer</summary>

A **function** named `e` taking no arguments and returning an `Entity` — not an object (the 'most vexing parse'). To make an object use `Entity e;` or `Entity e{};`.

</details>

**Q382. `Entity* e = new Entity;` How do you call its `print()` method?**

- **A)** `e.print()`
- **B)** `e->print()`
- **C)** `*e->print()`
- **D)** `Entity::print(e)`

<details><summary>Show answer</summary>

**Correct: B**

**`e->print()`**: `e` is a pointer, and `->` dereferences then accesses the member (the same as `(*e).print()`). `e.print()` does not compile on a pointer.

</details>

**Q383. Which of these leak memory or use a dangling pointer? Select all that apply.**

- **A)** `Entity* p = new Entity; p = nullptr;` (and no `delete`)
- **B)** `Entity e; Entity* p = &e;` used inside the same scope
- **C)** `Entity* p = new Entity; delete p; p->print();`
- **D)** `auto p = std::make_unique<Entity>();`

<details><summary>Show answer</summary>

**Correct: A, C**

Losing the only pointer to a `new` object without `delete` **leaks** it, and calling through a pointer after `delete` uses a **dangling** pointer. Pointing at a live stack object in the same scope is fine, and `make_unique` cleans up by itself.

</details>

**Q384. What does this print?**

```cpp
std::vector<int> a(3, 7);
std::vector<int> b{3, 7};
std::cout << a.size() << b.size() << a[0] << b[0];
```

<details><summary>Show answer</summary>

**Expected output:**
```
3273
```

Parentheses call `vector(count, value)`: `a` holds three 7s. Braces prefer the `initializer_list` constructor: `b` holds the two elements 3 and 7. So the sizes are 3 and 2, `a[0]` is 7 and `b[0]` is 3.

</details>

**Q385. What does this print?**

```cpp
struct T {
    int id;
    T(int i) : id(i) { std::cout << "+" << id; }
    ~T() { std::cout << "-" << id; }
};
void use(const T& t) { std::cout << "u" << t.id; }

int main() {
    use(T(1));
    T t(2);
    std::cout << "|";
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
+1u1-1+2|-2
```

`T(1)` is a temporary: it is built (`+1`), used inside `use` (`u1`), and destroyed at the end of the full expression (`-1`). `t` is a named local: built (`+2`), alive while `|` prints, and destroyed at the end of `main` (`-2`).

</details>

**Q386. Which of these objects live in **static storage** (alive until the program ends)? Select all that apply.**

- **A)** `Entity g;` at file scope
- **B)** `static Entity s;` inside a function
- **C)** `Entity e;` inside `main`
- **D)** the object created by `new Entity`

<details><summary>Show answer</summary>

**Correct: A, B**

A global and a `static` local both have static storage: created once, destroyed after `main` returns. A plain local is on the stack, and `new` creates a heap object that lives until `delete`.

</details>

**Q387. True or false: `Entity a[3];` compiles when `Entity`'s only constructor is `Entity(int id)`.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** Each of the three elements must be created with no arguments, so the class needs a default constructor (`error: no matching function for call to 'Entity::Entity()'`). Give each element an argument (`Entity a[3] = {1, 2, 3};`), add `Entity()`, or use a `std::vector<Entity>`.

</details>

### 35 — The new Keyword  (13 Qs)
**Q388. What two things does `new` do?**

<details><summary>Show answer</summary>

It (1) **allocates** memory on the heap (via `operator new`, usually `malloc` underneath) and (2) **calls the constructor** on that memory. It returns a typed pointer. (`delete` does the reverse: destructor, then free.)

</details>

**Q389. How does `new` differ from `malloc`? (three ways)**

<details><summary>Show answer</summary>

`new` **calls the constructor** (and `delete` the destructor); `new` returns a **typed pointer** (no cast) while `malloc` returns `void*`; and `new` **throws `std::bad_alloc`** on failure while `malloc` returns `nullptr`.

</details>

**Q390. Why must `new[]` be paired with `delete[]` and not plain `delete`?**

<details><summary>Show answer</summary>

`new[]` stores a **count** of the elements; `delete[]` reads it and runs the destructor for **every** element before freeing. Plain `delete` runs at most one destructor and mismatches the allocation bookkeeping → undefined behaviour.

</details>

**Q391. What is the difference between `delete` and `free`?**

<details><summary>Show answer</summary>

`delete` first **calls the destructor**, then frees the memory (via `operator delete`, usually `free`). `free` only frees the raw memory — no destructor. So `delete` = destructor + free; `free` = free only.

</details>

**Q392. `free`/`delete` are given only `p` — how do they know where the header is and how big the block is?**

<details><summary>Show answer</summary>

The **header offset** is a fixed constant compiled into the allocator, so it computes `p - headerSize` to reach the header from just `p`. The **block size** is stored *inside* that header, so it reads it once the header is found.

</details>

**Q393. What is the difference between `new int;` and `new int();`?**

<details><summary>Show answer</summary>

`new int` allocates the memory but leaves the value **indeterminate** (garbage). `new int()` **value-initializes** it to 0. (For a class with a default constructor, both forms run it — the difference only matters for plain types.)

</details>

**Q394. What does this print?**

```cpp
struct C {
    C()  { std::cout << "c"; }
    ~C() { std::cout << "d"; }
};

int main() {
    C* p = new C[3];
    delete[] p;
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
cccddd
```

`new C[3]` allocates the array **and runs the constructor for each element** (`ccc`). `delete[]` runs the destructor for each element (`ddd`) before freeing. That's why `new[]` must be paired with `delete[]`.

</details>

**Q395. Which of these are true of `new` compared with `malloc`? Select all that apply.**

- **A)** `new` calls the constructor
- **B)** `new` returns a typed pointer, so no cast is needed
- **C)** `new` returns `nullptr` when memory runs out (by default)
- **D)** `malloc` calls the constructor

<details><summary>Show answer</summary>

**Correct: A, B**

`new` **calls the constructor** and returns a **typed pointer** (no cast). By default it throws `std::bad_alloc` when memory runs out; it's `malloc` that returns `nullptr`. `malloc` never calls a constructor.

</details>

**Q396. What does this print?**

```cpp
int* a = new int[3]();
a[1] = 5;
std::cout << a[0] << a[1] << a[2];
delete[] a;
```

<details><summary>Show answer</summary>

**Expected output:**
```
050
```

`new int[3]()` value-initializes every element, so all three start at 0. Only `a[1]` is then set to 5.

</details>

**Q397. A program runs out of memory. What does `int* p = new (std::nothrow) int[1000];` do?**

- **A)** Throws `std::bad_alloc`
- **B)** Returns `nullptr`
- **C)** Returns a pointer to uninitialized memory anyway
- **D)** Aborts the program immediately

<details><summary>Show answer</summary>

**Correct: B**

**It returns `nullptr`**, so you can check `if (!p)`. Plain `new int[1000]` would throw `std::bad_alloc` instead and never return `nullptr`.

</details>

**Q398. True or false: after `int* p = new int[1000];`, the check `if (p == nullptr)` is the correct way to detect that the allocation failed.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** Plain `new` never returns `nullptr`: on failure it throws `std::bad_alloc`, so the check never fires. Catch the exception, or use `new (std::nothrow)` if you want a null check.

</details>

**Q399. Why does `new Tracked[3]` (3 objects of 4 bytes, `Tracked` has a destructor) ask `operator new[]` for 20 bytes on x86-64 with g++, while `new int[3]` asks for 12?**

<details><summary>Show answer</summary>

For a type with a non-trivial destructor, `new[]` stores the **element count** (8 bytes) just before the first element. `delete[]` reads it to know how many destructors to run. `int` needs no destructor calls, so no count is stored. This is also why `new[]` must be freed with `delete[]`.

</details>

**Q400. Name two places where a raw `new` is still a reasonable thing to write in modern C++.**

<details><summary>Show answer</summary>

Any two of: **inside an RAII class** that owns the memory (implementing a container, a smart pointer or your own resource wrapper); **placement new** (`new (buffer) T(...)`) to construct an object in memory you already have, as memory pools and containers do; **framework or legacy code** where an owner deletes the object for you (for example Qt widgets with a parent). Everywhere else, prefer `std::vector`, `std::make_unique` or `std::make_shared`.

</details>

### 36 — Implicit Conversion & explicit  (12 Qs)
**Q401. What makes a constructor a 'converting constructor'?**

<details><summary>Show answer</summary>

A constructor callable with a **single argument** (and not marked `explicit`). The compiler can use it to implicitly convert that argument's type into the class — e.g. `Entity(int)` lets `Entity e = 22;` work.

</details>

**Q402. Exactly why does `Entity e = "Anup";` fail?**

<details><summary>Show answer</summary>

Because it would need **two** user-defined conversions: `const char*` -> `std::string` -> `Entity`. The compiler allows **at most one** user-defined conversion in a chain. `Entity e = std::string("Anup");` works because that's only one.

</details>

**Q403. What does the `explicit` keyword do?**

<details><summary>Show answer</summary>

It marks a constructor (or conversion operator) as usable only for **direct/explicit** construction, disabling **implicit** conversion through it. So `Entity e = 22;` becomes an error while `Entity e(22);` still works.

</details>

**Q404. With an `explicit` constructor, which works: `Entity e = 22;` or `Entity e(22);`? Why?**

<details><summary>Show answer</summary>

`Entity e(22);` works — that's **direct initialization**, which `explicit` allows. `Entity e = 22;` is **copy initialization**, which relies on implicit conversion, and that's exactly what `explicit` blocks.

</details>

**Q405. Why is marking single-argument constructors `explicit` often a good idea?**

<details><summary>Show answer</summary>

To stop **accidental/surprising** implicit conversions that hide bugs (e.g. `String s = 65;` silently building a 65-char string). `explicit` forces the caller to state intent; you drop it only when you truly want the implicit conversion.

</details>

**Q406. Given `struct Entity { explicit Entity(int a); };` and `void f(Entity);`, which lines compile? Select all that apply.**

- **A)** `Entity e(22);`
- **B)** `Entity e = 22;`
- **C)** `Entity e = Entity(22);`
- **D)** `f(22);`

<details><summary>Show answer</summary>

**Correct: A, C**

`explicit` blocks **implicit** conversion: `Entity e = 22;` (copy-initialization) and `f(22)` both need it, so they fail. Direct construction `Entity e(22);` and the explicit `Entity(22)` still work.

</details>

**Q407. What does this print?**

```cpp
struct Meters {
    double v;
    Meters(double x) : v(x) {}
};

double twice(Meters m) { return m.v * 2; }

int main() { std::cout << twice(3.5); }
```

<details><summary>Show answer</summary>

**Expected output:**
```
7
```

`Meters(double)` is a non-explicit single-argument constructor, so the compiler silently converts `3.5` into a `Meters` to call `twice`. 3.5 × 2 = 7 (printed as `7`).

</details>

**Q408. What does this print?**

```cpp
struct Meters {
    double v;
    explicit Meters(double x) : v(x) {}
    operator double() const { return v; }
};

int main() {
    Meters m(2.5);
    double d = m * 2;
    std::cout << d;
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
5
```

`m * 2` has no `operator*` for `Meters`, but `operator double()` is not `explicit`, so `m` is converted to the `double` 2.5 and multiplied: 5.

</details>

**Q409. Class `C` has `explicit operator bool() const`, and `C c;` exists. Which line does **not** compile?**

- **A)** `if (c) {}`
- **B)** `bool ok = !c;`
- **C)** `int n = c;`
- **D)** `while (c && false) {}`

<details><summary>Show answer</summary>

**Correct: C**

An `explicit operator bool` is used only where a condition is expected: `if`, `while`, `!`, `&&`, `||`. `int n = c;` is a plain initialization, so the conversion isn't allowed (g++: `cannot convert 'C' to 'int' in initialization`).

</details>

**Q410. What does this print? (`unsigned` is 32 bits.)**

```cpp
double p = 9.99;
int i = p;
unsigned u = -2;
std::cout << i << " " << u;
```

<details><summary>Show answer</summary>

**Expected output:**
```
9 4294967294
```

`int i = p;` drops the fraction (it doesn't round), so `i` is 9. `-2` converted to a 32-bit `unsigned` wraps around to 2^32 - 2 = 4294967294.

</details>

**Q411. True or false: a constructor `Entity(int a, int b = 0)` can be used for an implicit conversion from `int`.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: A**

**True.** It can be called with one argument, so it is a converting constructor: `void f(Entity); f(7);` compiles. Mark it `explicit` if that is not wanted.

</details>

**Q412. Why does `int x{3.7};` fail to compile while `int x = 3.7;` compiles?**

<details><summary>Show answer</summary>

Brace initialization forbids **narrowing** conversions (ones that can lose data), so `double` -> `int` inside `{}` is an error. The `=` form performs the implicit conversion silently and truncates to 3. That is one reason to prefer braces: they turn a silent data loss into a compile error.

</details>

### 37 — Operators & Operator Overloading  (12 Qs)
**Q413. What is operator overloading, and why is it called compile-time polymorphism?**

<details><summary>Show answer</summary>

It defines what an operator (`+`, `==`, `<<`...) does for your own type — an operator is just a function with a special name. It's **compile-time** polymorphism because the compiler chooses which `operator` function to call from the **operand types** while compiling (unlike virtual functions, chosen at runtime).

</details>

**Q414. When must you use a free (non-member) operator instead of a member?**

<details><summary>Show answer</summary>

When the **left operand is not your class**. A member operator's left operand is always `this`, so for `cout << e` (left operand is `std::ostream`) or `2 * v` (left operand is `int`) you can't use a member — you write a free function taking both operands as parameters.

</details>

**Q415. Why must `operator<<` be a free function and return `std::ostream&`?**

<details><summary>Show answer</summary>

**Free** because its left operand is the stream (`std::ostream`), which you don't own and can't add members to. It **returns the stream by reference** so `<<` calls **chain**: `cout << a << b` groups as `(cout << a) << b`, and each `<<` must hand back the stream for the next one.

</details>

**Q416. Why does `operator+` return by value but `operator=` returns `*this` by reference?**

<details><summary>Show answer</summary>

`a + b` produces a **brand-new object**, so you return it **by value** (returning a reference to that local would dangle). `a = b` modifies the **existing** left object (which is `*this`), so you `return *this;` **by reference** — no copy, and it lets `a = b = c` chain.

</details>

**Q417. Give two limits on operator overloading.**

<details><summary>Show answer</summary>

Any two of: you can't invent new operators or change their precedence/arity; at least one operand must be a **user-defined type** (`int+int` can't be redefined); and `::`, `.`, `.*`, `?:`, `sizeof` can't be overloaded at all.

</details>

**Q418. What does this print?**

```cpp
struct V {
    int x, y;
    V operator+(const V& o) const { return {x + o.x, y + o.y}; }
    V& operator+=(const V& o) { x += o.x; y += o.y; return *this; }
};
std::ostream& operator<<(std::ostream& os, const V& v) {
    return os << "(" << v.x << "," << v.y << ")";
}

int main() {
    V a{1, 2}, b{3, 4};
    V c = a + b;
    a += b;
    a += b;
    std::cout << c << " " << a;
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
(4,6) (7,10)
```

`a + b` builds a **new** `V` (4,6) and leaves `a` alone. `+=` changes `a` itself: (1,2) → (4,6) → (7,10). `operator<<` returns the stream so the calls chain.

</details>

**Q419. Which of these operators can **not** be overloaded?**

- **A)** `+`
- **B)** `<<`
- **C)** `[]`
- **D)** `::`

<details><summary>Show answer</summary>

**Correct: D**

**`::`** (scope resolution) can't be overloaded, and neither can `.`, `.*`, `?:` or `sizeof`. `+`, `<<` and `[]` are all overloadable.

</details>

**Q420. What does this print?**

```cpp
struct Counter {
    int n = 0;
    Counter& operator++() { ++n; return *this; }
    Counter operator++(int) { Counter old = *this; ++n; return old; }
};

int main() {
    Counter c;
    Counter a = c++;
    Counter b = ++c;
    std::cout << a.n << b.n << c.n;
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
022
```

`c++` returns a copy of the old value (0) and then `c` is 1. `++c` makes `c` 2 and returns `c` itself, so `b` is 2. So `a.n`, `b.n`, `c.n` are 0, 2, 2.

</details>

**Q421. Which declaration is the **postfix** increment (`x++`) for a class `T`?**

- **A)** `T& operator++();`
- **B)** `T operator++(int);`
- **C)** `T& operator++(T&);`
- **D)** `void operator++(int, int);`

<details><summary>Show answer</summary>

**Correct: B**

The postfix form takes a dummy `int` parameter to tell it apart from prefix, and returns the old value **by value**: `T operator++(int);`. Prefix is `T& operator++();`.

</details>

**Q422. True or false: an overloaded `operator&&` still short-circuits, so the right operand is evaluated only when needed.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** An overloaded `&&` is an ordinary function call, so both operands are evaluated before the call. That is why overloading `&&`, `||` and `,` is discouraged.

</details>

**Q423. Why does `operator[]` usually come in a `const` and a non-const version?**

<details><summary>Show answer</summary>

The non-const version returns `T&`, so elements of a modifiable object can be assigned (`v[i] = 5`). The `const` version returns `const T&` (or a value) and is the only one callable on a const object or through a `const&` parameter, so reading still works there while writing is prevented.

</details>

**Q424. What is a friend function, and why is `operator<<` often declared as a friend?**

<details><summary>Show answer</summary>

A **friend** is a non-member function that a class declares inside itself with `friend`, giving it access to the class's private members. It has no `this` and is called like any free function. `operator<<` must be a free function because its left operand is the stream, not your object; it is made a friend when printing needs private data members.

</details>

### 38 — The this Keyword  (10 Qs)
**Q425. What is `this`, and where is it available?**

<details><summary>Show answer</summary>

`this` is a pointer holding the **address of the current object** — the object a member function was called on. It exists inside every **non-static** member function (static functions don't have it).

</details>

**Q426. What is the type of `this` in a non-const vs a const member function?**

<details><summary>Show answer</summary>

Non-const member function: `Entity*`, so the object can be changed through it. Const member function: `const Entity*`, so the object can't be changed. In both, `this` itself can't be reassigned (it is a value, not a variable), which is why it is often described as `Entity* const` / `const Entity* const`. The trailing `const` after the parameter list is what makes a member function const.

</details>

**Q427. What is the difference between `this` and `*this`?**

<details><summary>Show answer</summary>

`this` is the **pointer** (the object's address); `*this` is the **object** itself (dereferenced). You return `*this` **by reference** (`Entity&`) to hand back the same object for chaining; returning `this` would return the address (`Entity*`).

</details>

**Q428. When do you actually need to write `this->`?**

<details><summary>Show answer</summary>

Only to **disambiguate** a member from a **same-named parameter** (e.g. `this->a = a;`), or in some template code (dependent base-class names). Otherwise you can access members directly and `this->` is optional.

</details>

**Q429. Why does a `static` member function have no `this`?**

<details><summary>Show answer</summary>

Because it isn't tied to any particular object — you call it as `Class::fn()` with no instance. With no object, there's no address to put in `this`, which is also why a static function can only touch static members.

</details>

**Q430. What does this print?**

```cpp
struct Counter {
    int n = 0;
    Counter& add(int k) { n += k; return *this; }
};

int main() {
    Counter c;
    c.add(1).add(2).add(3);
    std::cout << c.n;
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
6
```

`add` returns `*this` **by reference**, so every call in the chain works on the same object `c`: 1 + 2 + 3 = 6.

</details>

**Q431. This version returns `Counter` by value instead of by reference. What does it print now?**

```cpp
struct Counter {
    int n = 0;
    Counter add(int k) { n += k; return *this; }   // returns a copy
};

int main() {
    Counter c;
    c.add(1).add(2).add(3);
    std::cout << c.n;
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
1
```

Returning `*this` **by value** hands back a copy. Only the first `add(1)` changes `c`; `.add(2)` and `.add(3)` change temporary copies that are thrown away. So `c.n` is 1.

</details>

**Q432. What does this print?**

```cpp
struct P {
    int x = 0;
    void set(int x) { x = x; }
};

int main() {
    P p;
    p.set(5);
    std::cout << p.x;
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
0
```

Inside `set`, the parameter `x` hides the member `x`, so `x = x;` assigns the parameter to itself. The member keeps its value 0. Fix: `this->x = x;`. (g++ with `-Wall -Wextra` gives no warning for this.)

</details>

**Q433. What does this print?**

```cpp
struct Box;
void show(const Box& b);

struct Box {
    int id;
    void print() const { show(*this); }
};

void show(const Box& b) { std::cout << "box " << b.id << " "; }

int main() {
    Box a{1}, b{2};
    b.print();
    a.print();
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
box 2 box 1
```

`print` passes `*this`, the object it was called on, to `show`. `b.print()` shows box 2, then `a.print()` shows box 1.

</details>

**Q434. True or false: inside a non-const member function, `this = nullptr;` compiles.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** `this` is a value (a prvalue), not a variable, so it can't be assigned: g++ says `lvalue required as left operand of assignment`. That is why it behaves like `Entity* const`.

</details>

### 39 — Object Lifetime  (11 Qs)
**Q435. Name the three storage durations and what determines each object's lifetime.**

<details><summary>Show answer</summary>

**Automatic** (stack): local variables, alive until the end of their scope. **Dynamic** (heap): created with `new`, alive until you `delete` it. **Static**: globals, `static` locals, static members, alive for the whole program. (There is also a fourth, **thread** storage duration: a `thread_local` variable has one copy per thread, alive as long as its thread.)

</details>

**Q436. Why is returning the address of a local variable a bug?**

<details><summary>Show answer</summary>

The local lives in the function's stack frame, which is reclaimed when the function returns. The returned address then points to memory that's no longer valid — a **dangling** pointer — so using it is undefined behaviour.

</details>

**Q437. Give two correct ways to return data that outlives a function.**

<details><summary>Show answer</summary>

Any two of: **return by value** (the caller gets its own copy); allocate on the **heap** and transfer ownership (return the pointer / a smart pointer); or have the **caller pass in a buffer** (by reference/pointer) that the function fills.

</details>

**Q438. What is RAII, and why is it exception-safe?**

<details><summary>Show answer</summary>

RAII (Resource Acquisition Is Initialization): acquire a resource in the constructor and release it in the destructor. It's exception-safe because when an exception propagates, the **stack unwinds** and the destructors of all fully-constructed automatic objects run — so the resource is always released, even on an error path.

</details>

**Q439. Why does a `static` local variable keep its value between calls?**

<details><summary>Show answer</summary>

Because it has **static storage duration** (program lifetime) rather than automatic: it's created and initialized **once**, on first reach, and persists across calls. Only its *scope* is local; its *lifetime* is the whole program.

</details>

**Q440. What does this print? (Each destructor prints its `id`.)**

```cpp
struct T {
    int id;
    T(int i) : id(i) {}
    ~T() { std::cout << id; }
};

int main() {
    T a(1);
    {
        T b(2);
        static T s(9);
    }
    T c(3);
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
2319
```

`b` is automatic and dies at the end of the inner block: `2`. At the end of `main`, the remaining automatics die in reverse order: `c` then `a`: `31`. The `static` local `s` lives until the program exits, so it dies last: `9`.

</details>

**Q441. Which function returns a dangling reference?**

- **A)** `int f() { int x = 5; return x; }`
- **B)** `int& f() { int x = 5; return x; }`
- **C)** `int& f() { static int x = 5; return x; }`
- **D)** `std::unique_ptr<int> f() { return std::make_unique<int>(5); }`

<details><summary>Show answer</summary>

**Correct: B**

**`int& f() { int x = 5; return x; }`**: `x` dies when `f` returns, so the reference points at a dead stack slot (g++ warns: *reference to local variable 'x' returned*). Returning by value, a `static` local, or a `unique_ptr` are all safe.

</details>

**Q442. What does this print?**

```cpp
struct T {
    int id;
    T(int i) : id(i) { std::cout << "+" << id; }
    ~T() { std::cout << "-" << id; }
};

int main() {
    T(1);
    const T& r = T(2);
    std::cout << "|" << r.id;
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
+1-1+2|2-2
```

`T(1)` is a temporary not bound to anything, so it dies at the end of its statement (`+1-1`). `T(2)` is bound directly to the `const T&` `r`, so its lifetime is extended to `r`'s: it is still alive when `|` prints and dies at the end of `main` (`-2`).

</details>

**Q443. `const T& pass(const T& t) { return t; }` and then `const T& bad = pass(T(4));`. Is `bad` safe to use on the next line?**

- **A)** Yes: binding to a `const T&` always extends the temporary
- **B)** No: the temporary dies at the end of the statement, so `bad` dangles
- **C)** Yes, but only in C++17 and later
- **D)** It does not compile

<details><summary>Show answer</summary>

**Correct: B**

**No, it dangles.** Lifetime extension applies only when the temporary is bound **directly** to the declared reference. Here `T(4)` is bound to the parameter `t`, so it dies at the end of the full expression; `bad` refers to a destroyed object (g++ 13 warns with `-Wdangling-reference`). Store a copy instead: `T copy = pass(T(4));`.

</details>

**Q444. True or false: a `thread_local` variable has one copy shared by all threads, created when the program starts.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** `thread_local` gives **thread storage duration**: every thread has its own copy, created for that thread and destroyed when the thread ends. Changing it in one thread doesn't affect the others.

</details>

**Q445. Why is `const char* p = (std::string("abc") + "def").c_str();` a bug, and how do you fix it?**

<details><summary>Show answer</summary>

The `+` creates a temporary `std::string`. `c_str()` returns a pointer into that temporary's buffer, but the temporary is destroyed at the end of the full expression (the `;`). `p` dangles from the next line on; g++ gives no warning. Lifetime extension doesn't help because the temporary isn't bound to a reference, only a pointer into it is kept. Fix: keep the string itself, `std::string s = std::string("abc") + "def";`, and call `s.c_str()` when needed.

</details>

### 40 — Smart Pointers  (13 Qs)
**Q446. What problem do smart pointers solve, and which mechanism makes them work?**

<details><summary>Show answer</summary>

They remove manual `new`/`delete` — no leaks, double-frees, or dangling. They work via **RAII**: the smart pointer's destructor `delete`s the owned object automatically when the smart pointer goes out of scope.

</details>

**Q447. What is the difference between `unique_ptr` and `shared_ptr`, and how does `shared_ptr` know when to delete?**

<details><summary>Show answer</summary>

`unique_ptr` has a **single** owner (can't be copied, only moved). `shared_ptr` allows **many** owners via a **reference count**: copying bumps it up, destruction bumps it down, and the object is deleted when the count reaches **0**.

</details>

**Q448. What is `weak_ptr` for, and why doesn't it affect the reference count?**

<details><summary>Show answer</summary>

It's a **non-owning** observer of a `shared_ptr`, used to **break circular references** (a cycle of shared_ptrs never reaches count 0 -> leak) and to safely check/access the object via `.lock()`. It doesn't count because it doesn't own the object — it only watches it.

</details>

**Q449. Why prefer `make_unique`/`make_shared` over raw `new`?**

<details><summary>Show answer</summary>

They keep raw `new` out of your code (so there is no `delete` to forget), you write the type only once (`auto p = std::make_unique<Entity>(1, 2);`), and `make_shared` makes **one** allocation for the object and its control block instead of two. (Before C++17 they also prevented a leak in calls like `f(std::unique_ptr<T>(new T), g())` when `g()` threw; C++17's rules for evaluating function arguments removed that case.)

</details>

**Q450. What's the difference between `release()`, `reset()`, and `std::move` on a `unique_ptr`?**

<details><summary>Show answer</summary>

`release()` gives up ownership **without deleting** and returns the raw pointer (you must delete it). `reset()` **deletes** the owned object now. `std::move` **transfers** ownership to another `unique_ptr` (which will delete it); the source becomes null.

</details>

**Q451. When is a raw pointer the right choice over a smart pointer?**

<details><summary>Show answer</summary>

For **non-owning** references — 'borrowing' an object whose lifetime is managed elsewhere. You use it to read/call but never `delete` through it, and it's valid only while the real owner keeps the object alive (a reference is often even better when it can't be null).

</details>

**Q452. What does this print?**

```cpp
auto a = std::make_shared<int>(5);
std::cout << a.use_count();
{
    auto b = a;
    std::cout << a.use_count();
}
std::weak_ptr<int> w = a;
std::cout << a.use_count();
```

<details><summary>Show answer</summary>

**Expected output:**
```
121
```

One owner: count 1. Inside the block `b` shares ownership: 2. `b` dies at the closing brace: back to 1. A `weak_ptr` observes without owning, so the count stays 1.

</details>

**Q453. `auto p = std::make_unique<int>(1); auto q = p;` What happens?**

- **A)** `q` shares ownership with `p`
- **B)** Compile error: `unique_ptr` can't be copied; use `std::move`
- **C)** `p` is moved into `q` automatically
- **D)** It compiles but crashes at runtime

<details><summary>Show answer</summary>

**Correct: B**

**It does not compile.** A `unique_ptr` is the sole owner, so it can't be copied; transfer ownership with `auto q = std::move(p);` (then `p` is empty).

</details>

**Q454. What does this print?**

```cpp
void take(std::unique_ptr<int> e) { std::cout << *e << " "; }

int main() {
    auto p = std::make_unique<int>(5);
    take(std::move(p));
    std::cout << (p ? "full" : "empty");
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
5 empty
```

`take(std::move(p))` moves ownership into the parameter `e`. When `take` returns, `e` is destroyed and deletes the `int`; `p` was left empty by the move, so the test prints `empty`.

</details>

**Q455. A function only reads an `Entity` and never stores or deletes it. Callers keep their objects in `std::unique_ptr<Entity>`. Which parameter type is best?**

- **A)** `std::unique_ptr<Entity>`
- **B)** `std::unique_ptr<Entity>&`
- **C)** `const Entity&`
- **D)** `std::shared_ptr<Entity>`

<details><summary>Show answer</summary>

**Correct: C**

`const Entity&`: the function doesn't take part in ownership, so it shouldn't mention a smart pointer at all. Callers write `f(*p)`, and the same function works for objects owned any other way. By-value `unique_ptr` would steal ownership; a `shared_ptr` would force shared ownership on everyone.

</details>

**Q456. What does this print?**

```cpp
auto s = std::make_shared<int>(1);
std::weak_ptr<int> w = s;
std::cout << w.expired();
s.reset();
std::cout << w.expired() << (w.lock() == nullptr);
```

<details><summary>Show answer</summary>

**Expected output:**
```
011
```

While `s` owns the `int`, the `weak_ptr` is not expired: `0`. After `s.reset()` the count drops to 0 and the `int` is deleted, so `w.expired()` is `1` and `lock()` returns an empty `shared_ptr` (`1` for `== nullptr`).

</details>

**Q457. True or false: on x86-64 with g++, `sizeof(std::unique_ptr<int>)` equals `sizeof(int*)`.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: A**

**True.** Both are 8 bytes: a `unique_ptr` with the default deleter stores only the pointer, so it costs nothing over a raw pointer. A `shared_ptr` is 16 bytes (object pointer + control-block pointer).

</details>

**Q458. Why must you never create two `unique_ptr`s (or two independent `shared_ptr`s) from the same raw pointer?**

<details><summary>Show answer</summary>

Each one believes it is the owner (each `shared_ptr` built from a raw pointer gets its own control block and count). When the second one is destroyed it deletes memory that the first already deleted: a **double delete**, undefined behaviour. Create the object with `make_unique`/`make_shared` and then move or copy the smart pointer, never the raw pointer.

</details>

### 41 — Copying & Copy Constructors  (13 Qs)
**Q459. Name two situations where the copy constructor is called.**

<details><summary>Show answer</summary>

Any two of: initializing a new object from another (`T b = a;` or `T b(a);`), passing an object to a function **by value**, or returning an object **by value** (though that copy is often elided).

</details>

**Q460. What does the default copy constructor do, and why is that dangerous for a class with a pointer member?**

<details><summary>Show answer</summary>

It does a **shallow, member-wise copy** — copying each member's value. For a pointer that copies the **address**, so both objects point at the **same** heap buffer. Then both destructors `delete` it -> **double-free**, and changing one affects the other.

</details>

**Q461. What is a deep copy and how does it fix the double-free?**

<details><summary>Show answer</summary>

A deep copy allocates a **separate** buffer for the new object and copies the **contents** into it, so each object owns independent memory. Now each destructor deletes its own buffer — no shared pointer, no double-free.

</details>

**Q462. What is the Rule of Three (and Five)?**

<details><summary>Show answer</summary>

Rule of Three: if a class needs a custom **destructor**, it almost certainly also needs a custom **copy constructor** and **copy assignment operator** (all manage the same resource). Rule of Five (C++11) adds a **move constructor** and **move assignment** for efficiency.

</details>

**Q463. What is the difference between the copy constructor and copy assignment?**

<details><summary>Show answer</summary>

The copy **constructor** builds a **brand-new** object from an existing one (`T b = a;`). Copy **assignment** (`operator=`) is used when **both objects already exist** (`b = a;`): it must free its own old resource, deep-copy, guard against self-assignment, and `return *this`.

</details>

**Q464. What does this print? (`D` = default constructor, `C` = copy constructor, `A` = copy assignment.)**

```cpp
struct S {
    S()                    { std::cout << "D"; }
    S(const S&)            { std::cout << "C"; }
    S& operator=(const S&) { std::cout << "A"; return *this; }
};
void byValue(S) {}
void byRef(const S&) {}

int main() {
    S a;
    S b = a;
    S c;
    c = a;
    byValue(a);
    byRef(a);
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
DCDAC
```

`S a;` → D. `S b = a;` builds a new object → copy constructor C. `S c;` → D. `c = a;` both exist → assignment A. `byValue(a)` copies the argument → C. `byRef(a)` makes no copy.

</details>

**Q465. True or false: the compiler-generated copy constructor copies the data that a pointer member points to.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** It copies member by member, so a pointer member's **address** is copied (a shallow copy): both objects share one buffer, which leads to a double-free. A deep copy needs your own copy constructor.

</details>

**Q466. What does this print? (`D` = default constructor, `C` = copy constructor, `M` = move constructor.)**

```cpp
struct S {
    S()            { std::cout << "D"; }
    S(const S&)    { std::cout << "C"; }
    S(S&&) noexcept { std::cout << "M"; }
};

int main() {
    S a;
    S b = a;
    S c = std::move(a);
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
DCM
```

`S a;` prints D. `S b = a;` copies, because `a` is a named object still in use: C. `S c = std::move(a);` turns `a` into an rvalue, so the move constructor is chosen: M.

</details>

**Q467. Which special member functions make up the Rule of Five? Select all that apply.**

- **A)** Destructor
- **B)** Copy constructor
- **C)** Copy assignment operator
- **D)** Move constructor
- **E)** Move assignment operator
- **F)** Default constructor

<details><summary>Show answer</summary>

**Correct: A, B, C, D, E**

Destructor, copy constructor, copy assignment, move constructor and move assignment: the five functions that manage how a resource is freed, copied and moved. The default constructor is not part of it.

</details>

**Q468. Which class follows the Rule of Zero safely, with no destructor, copy constructor or copy assignment written by you?**

- **A)** A class with a `char*` from `new char[n]`
- **B)** A class with `std::string` and `std::vector<int>` members
- **C)** A class holding a `FILE*` from `fopen`
- **D)** A class with an `int*` array from `new int[n]`

<details><summary>Show answer</summary>

**Correct: B**

A class whose members are `std::string` and `std::vector<int>`: both copy, move and free themselves, so the compiler-generated versions are already correct. The other three own raw resources (`new[]` memory, a `FILE*`), so the generated shallow copy would share and double-free them.

</details>

**Q469. True or false: if a class's copy constructor is `= delete`, then `T x; f(x);` does not compile for `void f(T t)`.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: A**

**True.** Passing `x` by value has to copy it into the parameter, and the copy constructor is deleted (g++: `use of deleted function`). Take `const T&` instead, or pass ownership explicitly if the class can be moved.

</details>

**Q470. Why does copy assignment in a class that owns a buffer need a self-assignment check (or an allocate-first order)?**

<details><summary>Show answer</summary>

Copy assignment frees the object's old buffer. In `a = a`, the source and target are the same object: if it deletes its buffer first and then copies from `other`, it reads memory it just freed (undefined behaviour). Checking `if (this == &other) return *this;`, or allocating and copying into a new buffer before deleting the old one, avoids that. Allocating first also leaves the object unchanged if `new` throws.

</details>

**Q471. What does a move constructor do for a class that owns a heap buffer, and why should it be `noexcept`?**

<details><summary>Show answer</summary>

It takes the source's pointer (and size) instead of allocating and copying, then sets the source's pointer to `nullptr` so its destructor doesn't free the buffer. That makes the move cost a few assignments instead of an allocation. It should be `noexcept` because containers such as `std::vector` move elements during reallocation only if the move can't throw; otherwise they fall back to copying.

</details>

### 42 — The Arrow Operator  (10 Qs)
**Q472. What is `e->a` equivalent to, written the long way?**

<details><summary>Show answer</summary>

`(*e).a` — dereference the pointer `e` with `*`, then use the dot to access the member. `->` just combines those two steps.

</details>

**Q473. For a raw pointer, is `->` built-in or overloaded — and when does overloading come in?**

<details><summary>Show answer</summary>

For a **raw pointer** it's **built-in**. Overloading `operator->` comes in for your **own classes** — smart pointers (`unique_ptr`/`shared_ptr`), iterators, and custom wrapper types define it so they can be used like pointers.

</details>

**Q474. What does an overloaded `operator->` return, and what does the compiler do with it?**

<details><summary>Show answer</summary>

It returns a **pointer**. The compiler then applies the real `->` to that returned pointer to reach the member — so `w->print()` becomes `w.operator->()->print()`. (If it returned another wrapper, `->` keeps chaining until it hits a raw pointer.)

</details>

**Q475. Why can you use `->` on a smart pointer even though it's an object, not a raw pointer?**

<details><summary>Show answer</summary>

Because the smart pointer **overloads `operator->`** (and `operator*`). So `p->method()` calls `p.operator->()` to get the raw pointer, then applies `->` to that — letting an object behave like a pointer.

</details>

**Q476. What does this print?**

```cpp
struct P { int x = 3; };

int main() {
    P obj;
    P* raw = &obj;
    auto sp = std::make_unique<P>();
    sp->x = 7;
    raw->x += 1;
    std::cout << obj.x << " " << (*sp).x;
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
4 7
```

`raw` points at `obj`, so `raw->x += 1` changes `obj.x` to 4. `sp->x = 7` works because `unique_ptr` overloads `->`; `(*sp).x` is the long way to read the same member.

</details>

**Q477. True or false: an overloaded `operator->` must return a pointer, or an object that itself has `operator->`.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: A**

**True.** The compiler applies `->` again to whatever it returns, and keeps going until it reaches a raw pointer. That's how smart pointers and iterators support `p->member`.

</details>

**Q478. What does this print?**

```cpp
std::map<std::string, int> m = {{"b", 2}, {"a", 1}};
for (auto it = m.begin(); it != m.end(); ++it)
    std::cout << it->first << it->second << " ";
```

<details><summary>Show answer</summary>

**Expected output:**
```
a1 b2
```

A `std::map` keeps its keys sorted, so iteration visits `a` then `b`. A map iterator points at a `std::pair`: `it->first` is the key and `it->second` the value, the same as `(*it).first` and `(*it).second`.

</details>

**Q479. `p` is an `Entity*`. How does the compiler read `*p.x`?**

- **A)** `(*p).x`
- **B)** `*(p.x)`
- **C)** `p->x`
- **D)** `&(p->x)`

<details><summary>Show answer</summary>

**Correct: B**

`.` binds tighter than unary `*`, so `*p.x` is `*(p.x)`: it asks for member `x` of the pointer itself, which doesn't compile (g++ suggests `->`). Write `(*p).x` or `p->x`.

</details>

**Q480. What does this print?**

```cpp
struct E { int x = 7; };
struct Inner {
    E* p;
    E* operator->() const { std::cout << "inner "; return p; }
};
struct Outer {
    Inner in;
    Inner operator->() const { std::cout << "outer "; return in; }
};

int main() {
    E e;
    Outer o{Inner{&e}};
    std::cout << o->x;
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
outer inner 7
```

`o` is an object, so `o->x` calls `o.operator->()`, which prints `outer` and returns an `Inner` object. That is not a raw pointer, so the compiler calls `operator->` again on it: `inner`, which returns an `E*`. The built-in `->` then reads `x` (7).

</details>

**Q481. True or false: with `Entity& r = obj;`, you can write `r->x`.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** A reference is another name for the object, not a pointer, so it uses the dot: `r.x`. `r->x` fails with `base operand of '->' has non-pointer type 'Entity'` (unless `Entity` itself overloads `operator->`).

</details>

### 43 — std::vector (Dynamic Array)  (14 Qs)
**Q482. What is the difference between `size()` and `capacity()`?**

<details><summary>Show answer</summary>

`size()` is how many elements are currently stored. `capacity()` is the total number of slots currently allocated before the vector must reallocate. The spare room is `capacity() - size()`; always `capacity() >= size()`.

</details>

**Q483. What happens when `push_back` exceeds capacity, and why is it still amortized O(1)?**

<details><summary>Show answer</summary>

It allocates a **new, larger** block (~1.5-2x), **moves/copies** all existing elements over, and **frees** the old block. Because capacity grows **geometrically**, reallocations get rarer as the vector grows: total copy work over N inserts sums to ~N (not N^2), so the **average** cost per push_back is constant — amortized O(1) — even though one call can be O(n).

</details>

**Q484. What does `reserve()` optimize?**

<details><summary>Show answer</summary>

It **pre-allocates** capacity up front (to your expected final size), so a run of `push_back`s doesn't keep triggering reallocations — each of which would copy/move all elements and destroy the old ones. One allocation instead of many.

</details>

**Q485. What is the difference between `push_back` and `emplace_back`?**

<details><summary>Show answer</summary>

`push_back(obj)` takes an **already-built** object and copies/moves it into the vector. `emplace_back(args...)` **constructs** the element **directly inside** the vector from the constructor arguments — no temporary object, so no extra copy/move + destroy.

</details>

**Q486. What is the difference between `v[i]` and `v.at(i)`?**

<details><summary>Show answer</summary>

`v[i]` does **no bounds checking** — an out-of-range index is undefined behaviour. `v.at(i)` **checks** the index and throws `std::out_of_range` if it's invalid (safer, slightly slower).

</details>

**Q487. Why are existing iterators/pointers/references invalidated after a vector grows?**

<details><summary>Show answer</summary>

Because growth moves the elements to a **new memory block** and frees the old one. Any iterator/pointer/reference still pointing at the old block now points to freed memory (dangling) — using it is undefined behaviour.

</details>

**Q488. What does this print?**

```cpp
std::vector<int> v = {10, 20, 30};
v.push_back(40);
v.emplace_back(50);
std::cout << v.size() << " " << v[4] << " " << v.front() + v.back();
```

<details><summary>Show answer</summary>

**Expected output:**
```
5 50 60
```

Three elements, then `push_back(40)` and `emplace_back(50)` make five. `v[4]` is the fifth element, 50, and `front() + back()` is 10 + 50 = 60.

</details>

**Q489. You saved `int* p = &v[0];`, then a `push_back` made the vector reallocate. What is `p` now?**

- **A)** Still valid: elements never move
- **B)** Dangling: the elements moved to a new block
- **C)** It now points to `v[1]`
- **D)** It is updated automatically

<details><summary>Show answer</summary>

**Correct: B**

**Dangling.** On reallocation the vector moves its elements to a new, bigger block and frees the old one, so `p` still points into freed memory. Using it is undefined behaviour.

</details>

**Q490. What does this print (g++/libstdc++)?**

```cpp
std::vector<int> v;
v.reserve(10);
std::cout << v.size() << " ";
v.resize(3);
std::cout << v.size() << " " << v.capacity() << " ";
v.clear();
std::cout << v.size() << " " << v.capacity();
```

<details><summary>Show answer</summary>

**Expected output:**
```
0 3 10 0 10
```

`reserve(10)` sets the capacity to 10 but creates no elements, so the size is 0. `resize(3)` creates three zeros: size 3, capacity still 10. `clear()` destroys them: size 0, capacity unchanged.

</details>

**Q491. What does this print?**

```cpp
std::vector<int> v = {1, 2, 4, 3, 6, 5};
for (auto it = v.begin(); it != v.end(); ) {
    if (*it % 2 == 0) it = v.erase(it);
    else ++it;
}
for (int x : v) std::cout << x << " ";
```

<details><summary>Show answer</summary>

**Expected output:**
```
1 3 5
```

The loop removes every even number. `erase` returns an iterator to the element after the erased one, so the loop continues from there and advances with `++it` only when nothing was erased. Left: 1 3 5.

</details>

**Q492. What is the time cost of `v.insert(v.begin(), x)` on a vector of n elements?**

- **A)** O(1)
- **B)** O(log n)
- **C)** O(n)
- **D)** Amortized O(1)

<details><summary>Show answer</summary>

**Correct: C**

**O(n).** The elements are contiguous, so all n of them shift one place right to make room at the front (and a reallocation may be needed too). Inserting at the end is amortized O(1).

</details>

**Q493. Which of these can invalidate a pointer to `v[0]`? Select all that apply.**

- **A)** `v.push_back(1)` when `size() == capacity()`
- **B)** `v.reserve(v.capacity() * 2)`
- **C)** `v.size()`
- **D)** `v.insert(v.begin(), 1)`
- **E)** `v.shrink_to_fit()`

<details><summary>Show answer</summary>

**Correct: A, B, D, E**

Anything that may reallocate moves every element to a new block: `push_back` on a full vector, `reserve` with a larger capacity, `shrink_to_fit`. `insert` at the front invalidates it even without a reallocation: the old first element shifts to `v[1]`. Reading `v.size()` changes nothing.

</details>

**Q494. True or false: returning a local `std::vector<int>` by value from a function copies all of its elements.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** The return value is either built directly in the caller (copy elision) or moved, and a move just hands the heap block over. Returning by value is the normal, cheap way to produce a vector.

</details>

**Q495. How do you remove every element equal to 0 from a `std::vector<int> v` in one pass, in C++17 and in C++20?**

<details><summary>Show answer</summary>

C++17: the **erase-remove idiom**, `v.erase(std::remove(v.begin(), v.end(), 0), v.end());`. `std::remove` moves the elements to keep to the front and returns the new logical end; `erase` cuts off the leftovers. One O(n) pass. C++20: `std::erase(v, 0);` (or `std::erase_if(v, pred)` for a condition), which returns the number removed. Erasing one element at a time in a loop is O(n^2) when many match.

</details>

### 44 — Local Static Variables  (13 Qs)
**Q496. What changes when you put `static` on a local variable, and what stays the same?**

<details><summary>Show answer</summary>

The **lifetime** changes: it now lives for the whole program and keeps its value between calls. The **scope** stays the same: only code inside that function can use the name. It behaves like a private global.

</details>

**Q497. Why does `static Logger L;` need a hidden flag but `static int n = 0;` does not?**

<details><summary>Show answer</summary>

`0` is a constant the compiler can store in the program file, so it is already there before `main`. A constructor is **code**, and the compiler can't run your program, so it runs at run time. The declaration line is reached on **every call**, so a hidden flag makes sure it only runs the first time.

</details>

**Q498. What does this code print, and why?**

```cpp
int counter() { static int n = 0; return ++n; }

int main() {
    for (int i = 0; i < 3; i++) std::cout << counter() << ' ';
}
```

<details><summary>Show answer</summary>

It prints `1 2 3`. `n` is created once with value 0 and is **not** re-initialized on later calls, so each call increments the same variable.

</details>

**Q499. Why is returning `arr` safe with `static int arr[3]` but not with `int arr[3]`?**

<details><summary>Show answer</summary>

A plain local array lives in the stack frame, which is destroyed when the function returns, so the returned pointer dangles. A static array lives in the static area until the program ends, so the pointer stays valid.

</details>

**Q500. A function with `static Logger L;` is never called. Is the constructor ever run? Is the destructor?**

<details><summary>Show answer</summary>

Neither. The compiler decides from the initializer alone that a flag is needed. The check runs inside the function, so if the function never runs, the flag stays 0, the constructor never runs, and no destructor is registered.

</details>

**Q501. Two threads call a function containing `static Logger L;` at the same time. What is safe and what is not?**

<details><summary>Show answer</summary>

Since C++11 the **construction** is thread-safe: one thread builds it and the other waits. But later **changes** to the object or to a static `int` (for example `++n`) are not protected, so they are a data race. Use `std::atomic` or a mutex.

</details>

**Q502. What is the difference between `static Logger L;` and `static Logger* P = new Logger();` at program exit?**

<details><summary>Show answer</summary>

`L` is destroyed at exit, so `~Logger()` runs. With `P` only the pointer is static; the `Logger` object is on the heap, so its destructor never runs and the memory is not freed by your code.

</details>

**Q503. What does this print?**

```cpp
int next() { static int n = 10; n += 5; return n; }

int main() {
    std::cout << next() << " ";
    std::cout << next() << " ";
    std::cout << next();
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
15 20 25
```

`n` is created once with 10 and keeps its value between calls, so each call adds 5 to the same variable: 15, 20, 25.

</details>

**Q504. True or false: other functions in the same file can use a `static` local variable by name.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** `static` changes the variable's **lifetime**, not its **scope**. The name is still visible only inside its function.

</details>

**Q505. What does this print?**

```cpp
struct Button {
    int clicks = 0;
    void click() {
        static int total = 0;
        ++clicks;
        ++total;
        std::cout << clicks << "/" << total << " ";
    }
};

int main() {
    Button a, b;
    a.click();
    a.click();
    b.click();
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
1/1 2/2 1/3
```

`total` is a static local, so there is **one** for the function, shared by both objects. `clicks` is a member, one per object. `a` clicks twice (1/1, 2/2), then `b`'s first click is its own 1 but the shared total's 3.

</details>

**Q506. What does this print?**

```cpp
struct T {
    char c;
    T(char ch) : c(ch) { std::cout << "+" << c; }
    ~T() { std::cout << "-" << c; }
};
T& first()  { static T t('A'); return t; }
T& second() { static T t('B'); return t; }

int main() {
    second();
    first();
    second();
    std::cout << "|";
}
```

<details><summary>Show answer</summary>

**Expected output:**
```
+B+A|-A-B
```

Static locals with a constructor are built on the **first call** of their function, so `second()` builds `B` before `first()` builds `A`. At program exit they are destroyed in **reverse** order of construction: `A` (built last) first, then `B`.

</details>

**Q507. Which of these does the compiler protect with a hidden guard flag? Select all that apply.**

- **A)** `static Logger L;` (Logger has a constructor that prints)
- **B)** `static int n = 0;`
- **C)** `static int x = compute();` (a normal function)
- **D)** `static const char* s = "hi";`

<details><summary>Show answer</summary>

**Correct: A, C**

Only initializers that need **run-time** work get a guard: a constructor call (`static Logger L;`) and a function call (`static int x = compute();`). Constant initializers such as `static int n = 0;` and `static const char* s = "hi";` are written into the program file and are ready before `main`, so no flag is needed. (`nm -C` shows a `guard variable for ...` symbol for each guarded one.)

</details>

**Q508. Give one advantage and one disadvantage of keeping state in a static local variable.**

<details><summary>Show answer</summary>

Advantages (any one): it is built lazily and exactly once, only if the function is used; it is hidden from the rest of the program; it avoids the cross-file initialization order problem. Disadvantages (any one): hidden state makes the function harder to test and reason about (the same call gives different results); handing out a pointer to a static buffer makes the function non-reentrant; changes from several threads need a mutex or `std::atomic`; destruction order at exit can bite other statics.

</details>

## Linux (continued)

### 45 — Libraries: Static and Shared  (16 Qs)
**Q509. What is a library, and what does someone need from you to use yours?**

<details><summary>Show answer</summary>

A library is ready-made **compiled code** (`.o` files packed together). They need the **library file** and the **header**. The header lets their code compile against your functions; the library gives the linker the code. They never see your `.cpp`.

</details>

**Q510. Why does `g++ -L. -lcalc main.cpp` fail with `undefined reference`, while `g++ main.cpp -L. -lcalc` works? (static library)**

<details><summary>Show answer</summary>

GNU `ld` reads its arguments **left to right** and only takes code from a static library to satisfy symbols it **already needs**. With the library first, nothing needs `addition` yet, so nothing is taken. When `main.cpp` comes later and asks for it, the library has already been passed. The library must come **after** the files that use it.

</details>

**Q511. A program is linked with a **static** library, then you delete the `.a` file. What happens when you run the program?**

- **A)** It still runs: the code was copied into the program
- **B)** It fails with `cannot open shared object file`
- **C)** It starts, but the library calls crash
- **D)** It reloads the `.a` from the folder it was built in

<details><summary>Show answer</summary>

**Correct: A**

**It still runs.** The linker copied the code it needed into the program, so the `.a` file is not needed any more.

</details>

**Q512. True or false: a shared library is only needed when the program runs, not when you link it.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** The linker needs the `.so` (and the header) to check the symbols and to record the library's name in the program. Without it the link fails with `ld: cannot find -lcalc`. The library is needed **again** when the program runs.

</details>

**Q513. `readelf -d app` prints `NEEDED  Shared library: [libfoo.so]`. What does that tell you?**

- **A)** libfoo.so is in the current folder
- **B)** The program asks for libfoo.so, but it does not say whether the file can be found
- **C)** The program was linked statically
- **D)** libfoo.so is loaded and running

<details><summary>Show answer</summary>

**Correct: B**

Only that the program **asks for** `libfoo.so`. `readelf` reads the program file and never looks at the disk, so it can't say whether the file exists. Use `ldd app` to see whether it is found (`=> path` or `not found`).

</details>

**Q514. Which statements about libraries are true? Select all that apply.**

- **A)** The linker copies the needed code from a static library into the program
- **B)** A program linked with a static library still needs the `.a` file to run
- **C)** Two programs that use the same `.so` can share its code in memory
- **D)** With a library, nobody can read how your function works

<details><summary>Show answer</summary>

**Correct: A, C**

The linker **copies** needed code from a static library, and two programs that use the same `.so` **share its code pages** in memory (the same file is mapped into both). A finished static program does **not** need the `.a` any more. And a library only hides the **source**: `objdump -d` shows the machine code.

</details>

**Q515. A program has `RUNPATH=/opt/v1` and you run it with `LD_LIBRARY_PATH=/opt/v2`. Both folders hold a `libx.so`. Which one is loaded?**

- **A)** `/opt/v1`, the path stored in the program
- **B)** `/opt/v2`, from `LD_LIBRARY_PATH`
- **C)** Neither: it is an error
- **D)** Whichever file is newer

<details><summary>Show answer</summary>

**Correct: B**

**`/opt/v2`.** `LD_LIBRARY_PATH` is searched **before** `RUNPATH`, so the user can override it. With the old `RPATH` tag the program's own path would win and `/opt/v1` would load.

</details>

**Q516. A program runs on your machine but on the server it prints `cannot open shared object file`. Give two ways to find out what is wrong and two ways to fix it.**

<details><summary>Show answer</summary>

**Find out:** `ldd app` and look for `not found`; `readelf -d app | grep -E 'NEEDED|RUNPATH|RPATH'` to see what it asks for and where it looks; `LD_DEBUG=libs ./app` to see every folder the loader tried. **Fix:** copy the `.so` to the server and set `LD_LIBRARY_PATH`; link with `-Wl,-rpath,'$ORIGIN/lib'` and ship the `.so` next to the program; or install it in a system folder such as `/usr/local/lib` and run `ldconfig`.

</details>

**Q517. What are the two main differences between `RPATH` and `RUNPATH`?**

<details><summary>Show answer</summary>

**Order:** `RPATH` is searched **before** `LD_LIBRARY_PATH` (the user can't override it); `RUNPATH` is searched **after** it. **Reach:** `RPATH` is also used for the libraries your libraries need; `RUNPATH` only applies to the program's **direct** `NEEDED` libraries, so each library in a chain needs its own `RUNPATH`. Tested: with `RUNPATH` on `app`, `app -> libb.so -> liba.so` found `libb.so` but `liba.so` was `not found`.

</details>

**Q518. Your CMake project (`target_link_libraries(Main Calculator)`) built `bin/Main`, and `readelf -d bin/Main` shows `RUNPATH: .../shared_libraries/lib`. You never wrote that. Where did it come from, and what is the catch?**

<details><summary>Show answer</summary>

**CMake adds it** when it links in the build tree, so you can run `bin/Main` straight from the build folder with no setup. The catch: it is an **absolute path**. Move the library folder, or copy `bin/Main` to another machine, and the loader can't find the `.so` (`not found`). For something you ship, use a relative `RUNPATH` such as `$ORIGIN/../lib`. The static project's `Main` has no `RUNPATH` and no `NEEDED` for the library, because the code is inside.

</details>

**Q519. True or false: `ldd` is always safe to run on any binary.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: B**

**False.** `man ldd` warns that it may **execute the program** it inspects. For a binary you don't trust, `readelf -d` gives the same `NEEDED` list without running anything.

</details>

**Q520. `libcalc.a` and `libcalc.so` are in the same folder and you link with `-lcalc`. Which one is used?**

- **A)** The `.so`
- **B)** The `.a`
- **C)** Whichever file is newer
- **D)** Neither: it is an ambiguity error

<details><summary>Show answer</summary>

**Correct: A**

**The `.so`.** The linker prefers the shared library when both exist; the program then lists `libcalc.so` as `NEEDED`. `-l:libcalc.a` forces the static one.

</details>

**Q521. When would you choose a static library, and when a shared one? Give one real reason for each.**

<details><summary>Show answer</summary>

**Static:** you want **one self-contained file** to deploy, with no "missing library" problem on the target machine. **Shared:** many programs use the same code, so it is **loaded once and shared**, and you can fix a bug by replacing the `.so` without relinking every program (as long as the interface hasn't changed).

</details>

**Q522. A program needs `libb.so`, which needs `liba.so`. Both are in `/opt/libs`. The program was linked with `-Wl,-rpath,/opt/libs` (stored as `RUNPATH`); `libb.so` has no path of its own. What does the loader do?**

- **A)** It finds both libraries
- **B)** It finds `libb.so`, but `liba.so` is not found
- **C)** It finds neither: RUNPATH is ignored for programs
- **D)** It loads `liba.so` from `LD_LIBRARY_PATH` only if RPATH is also set

<details><summary>Show answer</summary>

**Correct: B**

It finds `libb.so` through the program's `RUNPATH`, but **`liba.so` is not found**: a `RUNPATH` applies only to the program's own direct libraries, not to the libraries those libraries need. (The old `RPATH` would have been used for the whole chain.) Fix: give `libb.so` its own `RUNPATH` (e.g. `$ORIGIN`), or install the libraries where the loader looks by default.

</details>

**Q523. Why must code that goes into a shared library be compiled with `-fPIC`?**

<details><summary>Show answer</summary>

A shared library is mapped at a **different address** in each program, chosen by the loader. Position-independent code reaches its functions and global data through relative addresses and tables filled in at load time, so it works wherever it is placed. Code compiled without it may contain absolute addresses, and the linker refuses to put it in a `.so`: `relocation R_X86_64_PC32 against symbol ... can not be used when making a shared object; recompile with -fPIC`.

</details>

**Q524. True or false: `LD_LIBRARY_PATH` can make a program load a different copy of a library than the folder stored in its `RUNPATH`.**

- **A)** True
- **B)** False

<details><summary>Show answer</summary>

**Correct: A**

**True.** The loader searches `LD_LIBRARY_PATH` **before** `RUNPATH`, so a library found there wins. (With the older `RPATH` tag it would not: `RPATH` is searched first.)

</details>
