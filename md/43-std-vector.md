# 43 — std::vector (Dynamic Array)

*Category: C++ Core*

> The default container: a contiguous, growable heap array. Size vs capacity, what a reallocation costs and breaks, insert/erase, and passing vectors cheaply.

## Must-remember points

- `std::vector<T>` = the **dynamic array**: elements **contiguous** in one **heap** block, size changes at run time, freed by the destructor. `[]` is O(1) and cache-friendly. Which array type to choose: lesson 21.
- **`size()`** = elements stored; **`capacity()`** = slots allocated before the next reallocation (spare room = capacity - size).
- When full, a push allocates a **new, bigger block** (libstdc++ doubles), **moves** the elements over and **frees** the old one. Geometric growth makes `push_back` **amortized O(1)**: 1,000 pushes move 1,023 elements (growing by 1 slot: 499,500).
- A reallocation **invalidates every pointer, reference and iterator** to the elements. Keep an index, or take the pointer again.
- **`reserve(n)`** = room for n, no new elements. **`resize(n)`** changes the size. `clear()` keeps the capacity; `shrink_to_fit()` asks to free it.
- `push_back(x)` copies or moves an existing object in; **`emplace_back(args...)`** constructs the element **in place** (no temporary).
- `[]` is unchecked, `.at()` checked (lesson 20). Iterate with an index, a **range-for** or iterators.
- **insert/erase** in the middle shift every later element: **O(n)**. Erase in a loop with **`it = v.erase(it)`**; remove all matches with the **erase-remove idiom** (`std::erase_if` in C++20).
- Pass by **`const&`** to read, `&` to modify. **Return by value**: moved or elided, never copied.

## A complete program: creating and using a vector

**Meaning:** a `std::vector` is an array that manages its own heap memory: it grows as you add elements and frees the memory when it goes out of scope. The elements are contiguous like a C array, so indexing is O(1). The vector object itself is a three-pointer handle (lesson 21).

```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> scores;                     // empty, no heap block yet
    scores.push_back(70);                        // append
    scores.push_back(85);
    scores.push_back(92);
    scores[0] = 75;                              // index: unchecked

    std::vector<int> zeros(3);                   // 3 elements, all 0
    std::vector<int> primes = {2, 3, 5, 7};      // from a list

    std::cout << scores.size() << " scores: " << scores.front() << " .. " << scores.back() << "\n";
    scores.pop_back();                           // remove the last
    std::cout << scores.size() << " left, empty? " << scores.empty() << "\n";
    std::cout << zeros[2] << " " << primes[3] << "\n";
}                                                // each vector frees its block here
```
```output
3 scores: 75 .. 92
2 left, empty? 0
0 7
```

**How it works:**
1. `scores[0]` is unchecked; `scores.at(5)` would throw `std::out_of_range` (lesson 20).
2. No `delete`: each destructor frees its block at the end of `main` (RAII, lesson 12).

## Iterating: index, range-for and iterators

**Meaning:** a **range-for** is the shortest and can't go out of bounds: use it by default. An **index** loop gives you the position. **Iterators** are positions that every container and the standard algorithms understand (a range-for uses them underneath); you need them to erase while looping or to call algorithms such as `std::sort(v.begin(), v.end())`.

```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v = {10, 20, 30};

    for (std::size_t i = 0; i < v.size(); i++)     // index
        std::cout << i << ":" << v[i] << " ";
    std::cout << "\n";

    for (int& x : v) x += 1;                       // range-for, reference: changes elements
    for (int x : v) std::cout << x << " ";         // range-for, value: copies
    std::cout << "\n";

    for (auto it = v.begin(); it != v.end(); ++it) // iterators
        std::cout << *it << " ";
    std::cout << "\n";
}
```
```output
0:10 1:20 2:30
11 21 31
11 21 31
```

**How it works:**
1. `size()` is an unsigned `std::size_t`; with `int i`, g++ warns `comparison of integer expressions of different signedness`.
2. For large elements, read with `const auto&` to avoid a copy per element.
3. `begin()` is the first element, `end()` **one past the last**; `*it` is the element.

## size, capacity and amortized O(1) growth

**Meaning:** `size()` counts the elements; `capacity()` counts the slots already allocated. While there is room, `push_back` constructs the new element at the end. When the block is full, the vector **reallocates**: new bigger block, move the elements across (copy them if the move constructor isn't `noexcept`, lesson 41), free the old block.

```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v;
    for (int i = 1; i <= 9; i++) {
        std::size_t oldCap = v.capacity();
        v.push_back(i);
        if (v.capacity() != oldCap)                    // this push reallocated
            std::cout << "size " << v.size() << ": capacity " << oldCap << " -> " << v.capacity() << "\n";
    }
    std::cout << "spare " << v.capacity() - v.size() << "\n";
}
```
```output
size 1: capacity 0 -> 1
size 2: capacity 1 -> 2
size 3: capacity 2 -> 4
size 5: capacity 4 -> 8
size 9: capacity 8 -> 16
spare 7
```

**How it works:**
1. With g++/libstdc++ the capacity **doubles**. Other libraries may use a smaller factor such as 1.5; any constant factor above 1 works.
2. A reallocating push costs O(n), but reallocations get rarer as the vector grows. For 1,000 pushes they move 1 + 2 + 4 + ... + 512 = 1,023 elements in total, fewer than 2N, so the work per push is constant on average: **amortized O(1)**.

| Growth strategy | Elements moved for 1,000 pushes | Cost per push |
|---|---|---|
| +1 slot each time | 0 + 1 + ... + 999 = 499,500 | O(n) |
| Double (libstdc++) | 1,023 | amortized O(1) |
| `reserve(1000)` first | 0 | O(1) |

Know the final size? `reserve(n)` once up front. Calling `reserve(size() + 1)` before each push is the +1 row.

## Reallocation invalidates pointers, references and iterators

**Meaning:** after a reallocation the old block is freed, so every pointer, reference and iterator to an element **dangles**; using one is undefined behaviour (lesson 20). An index stays valid: it is looked up in the current block each time.

```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v = {10, 20, 30};       // size 3, capacity 3: full
    int* p = &v[0];
    std::size_t i = 0;
    v.push_back(40);                         // reallocates: elements move to a new block
    // std::cout << *p;                      // p dangles: reading it is UB
    p = &v[0];                               // take the pointer again after growing
    std::cout << v[i] << " " << *p << "\n";  // the index never went stale
}
```
```output
10 10
```

**How it works:**
1. The commented-out `*p` might even print 10, but it reads freed memory: `-fsanitize=address` reports `heap-use-after-free` (lesson 23).
2. With `v.reserve(100)` before taking `p`, `p` would survive pushes up to 100 elements.

What invalidates what:
- Anything that **reallocates** (`push_back`, `emplace_back`, `insert`, `reserve`, `shrink_to_fit`): **all** pointers, references and iterators.
- `insert` or `erase` without reallocation: those **at or after** the position. `clear()`: all.

## push_back vs emplace_back

**Meaning:** `push_back(obj)` copies an existing object in (or moves it, if it is a temporary). `emplace_back(args...)` passes the arguments to the element's constructor, which builds it directly in the vector's memory: no temporary.

```cpp
#include <iostream>
#include <string>
#include <utility>
#include <vector>

struct Player {
    std::string name;
    Player(std::string n) : name(std::move(n)) { std::cout << "construct " << name << "\n"; }
    Player(const Player& o) : name(o.name) { std::cout << "copy " << name << "\n"; }
    Player(Player&& o) noexcept : name(std::move(o.name)) { std::cout << "move " << name << "\n"; }
};

int main() {
    std::vector<Player> team;
    team.reserve(3);                         // no reallocation noise
    Player p("ann");
    team.push_back(p);                       // copies an existing object
    team.push_back(Player("bob"));           // builds a temporary, then moves it in
    team.emplace_back("cid");                // builds the element in place
}
```
```output
construct ann
copy ann
construct bob
move bob
construct cid
```

**How it works:**
1. `push_back(p)` must copy: the caller still owns `p`. `push_back(std::move(p))` would move instead.
2. `push_back(Player("bob"))` constructs a temporary, moves it in, destroys the temporary.
3. `emplace_back("cid")` forwards `"cid"` to the constructor: one construction.

**When to use which:** `emplace_back` with constructor arguments, `push_back` with an existing object. For `int` there is no difference.

## insert and erase: cost, and erasing while iterating

**Meaning:** inserting or erasing in the middle **shifts** every later element by one place: O(n). Erasing invalidates the erased iterator, so a loop continues from the iterator `erase` **returns** (the next element). To remove all matches, the **erase-remove idiom** does one O(n) pass.

```cpp
#include <algorithm>
#include <iostream>
#include <vector>

void print(const std::vector<int>& v) {
    for (int x : v) std::cout << x << " ";
    std::cout << "\n";
}

bool isEven(int x) { return x % 2 == 0; }

int main() {
    std::vector<int> v = {1, 2, 3, 4, 5};
    v.insert(v.begin() + 1, 9);                    // before index 1: 2..5 shift right
    print(v);

    for (auto it = v.begin(); it != v.end(); ) {   // erase while iterating
        if (isEven(*it)) it = v.erase(it);         // continue from the next element
        else ++it;                                 // advance only if nothing was erased
    }
    print(v);

    std::vector<int> w = {1, 2, 3, 4, 5};
    w.erase(std::remove_if(w.begin(), w.end(), isEven), w.end());   // erase-remove
    print(w);
}
```
```output
1 9 2 3 4 5
1 9 3 5
1 3 5
```

**How it works:**
1. `insert` and `erase` take iterators: `v.erase(v.begin() + i)` removes index i.
2. `++it` after an erase would skip an element, or step past `end()`. So the `for` header has no `++it`.
3. Each erase shifts the tail, so removing many elements this way is O(n^2).
4. `std::remove_if` moves the kept elements to the front in one pass and returns where the leftovers start; `erase` cuts them off. C++20 makes it one call: `std::erase_if(w, isEven)` or `std::erase(w, value)`.

| Operation | Cost |
|---|---|
| `v[i]`, `at(i)`, `back()` | O(1) |
| `push_back`, `emplace_back`, `pop_back` | amortized O(1) |
| `insert` / `erase` at index i | O(n - i) |
| Erase all matches (erase-remove) | O(n) |

## resize, reserve, clear and shrink_to_fit

**Meaning:** `reserve` and `shrink_to_fit` change only the **capacity**; `resize` and `clear` change the **size** (they create or destroy elements).

```cpp
#include <iostream>
#include <vector>

void show(const char* what, const std::vector<int>& v) {
    std::cout << what << ": size " << v.size() << ", capacity " << v.capacity() << "\n";
}

int main() {
    std::vector<int> v;
    v.reserve(10);        show("reserve(10)", v);       // room only, no elements
    v.resize(4);          show("resize(4)", v);         // 4 elements, value 0
    v.resize(2);          show("resize(2)", v);         // drops 2, keeps the room
    v.clear();            show("clear()", v);           // no elements, same block
    v.shrink_to_fit();    show("shrink_to_fit()", v);   // asks to free the spare room
}
```
```output
reserve(10): size 0, capacity 10
resize(4): size 4, capacity 10
resize(2): size 2, capacity 10
clear(): size 0, capacity 10
shrink_to_fit(): size 0, capacity 0
```

| Call | Size | Capacity | Use it to |
|---|---|---|---|
| `reserve(n)` | unchanged | at least n | avoid reallocations |
| `resize(n)` | becomes n | grows if needed | get n elements you can index |
| `clear()` | 0 | unchanged | empty it, refill without allocating |
| `shrink_to_fit()` | unchanged | may drop to size | give memory back after a big vector shrinks |

`shrink_to_fit()` is only a request; libstdc++ honours it.

## 2D vectors

**Meaning:** a vector of vectors makes a grid, `grid[r][c]`. Each row is its own vector with its own heap block, so rows can differ in length.

```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<std::vector<int>> grid(2, std::vector<int>(3, 0));   // 2 rows of 3 zeros
    grid[1][2] = 5;                                // row 1, column 2
    grid[0].push_back(9);                          // rows are independent

    for (const auto& row : grid) {                 // const&: no copy of each row
        for (int x : row) std::cout << x << " ";
        std::cout << "\n";
    }
}
```
```output
0 0 0 9
0 0 5
```

**How it works:** `grid` holds three heap blocks (the outer array and two rows). For a fixed rectangle where speed matters, one flat `std::vector<int> flat(rows * cols)` indexed as `flat[r * cols + c]` keeps everything in one contiguous block. Multidimensional arrays get their own lesson later.

## Passing and returning vectors

**Meaning:** passing a vector **by value** copies every element. Pass `const std::vector<T>&` to read, `std::vector<T>&` to modify the caller's vector. Returning by value is cheap: the result is built directly in the caller (copy elision, lesson 41) or moved, which hands over the heap block.

```cpp
#include <cstdint>
#include <iostream>
#include <vector>

std::uintptr_t inside = 0;                   // address of makeScores's heap block

int sum(const std::vector<int>& v) {         // read: const&, no copy
    int s = 0;
    for (int x : v) s += x;
    return s;
}

void addBonus(std::vector<int>& v) {         // modify the caller's vector: &
    for (int& x : v) x += 1;
}

std::vector<int> makeScores() {              // return by value
    std::vector<int> v = {10, 20, 30};
    inside = reinterpret_cast<std::uintptr_t>(v.data());
    return v;
}

int main() {
    std::vector<int> s = makeScores();
    std::cout << (reinterpret_cast<std::uintptr_t>(s.data()) == inside) << "\n";   // same block?
    addBonus(s);
    std::cout << sum(s) << "\n";
}
```
```output
1
63
```

**How it works:**
1. `s` owns the very block `makeScores` filled: nothing was copied on return.
2. `addBonus` changes `s` through the reference (11 + 21 + 31 = 63); `sum` only reads.
3. A by-value parameter would copy every element (unless the caller passes `std::move(s)`): use it only when the function keeps its own copy.

Prefer returning a vector over filling an output parameter.

## Common mistakes

- **Keeping a pointer, reference or iterator across a push.** It dangles after a reallocation. Keep an index, or `reserve` first.
- **Pushing inside a range-for over the same vector.** `for (int x : v) v.push_back(x);` uses iterators that a reallocation invalidates. Loop by index up to the old size.
- **`reserve` instead of `resize`.** `v.reserve(10); v[3] = 1;` writes past the size: undefined behaviour.
- **`v(3)` vs `v{3}`.** `std::vector<int> v(3)` is three zeros; `v{3}` is one element, 3. `(3, 7)` is three 7s; `{3, 7}` is two elements.
- **Expecting `clear()` to free memory.** It keeps the capacity; add `shrink_to_fit()`.
- **`std::vector<bool>`.** It packs bits, so its elements aren't real `bool`s: `bool& r = vb[0];` fails with `cannot bind non-const lvalue reference of type 'bool&' to an rvalue of type 'bool'`.

## ⚠ Easily confused

- **size() vs capacity()** — size = elements stored. capacity = total slots allocated before reallocating (spare = capacity - size).
- **push_back vs emplace_back** — push_back copies/moves an already-built object in. emplace_back constructs the element in place from the args (no temporary).
- **amortized O(1) vs O(1)** — A single push_back can be O(n) (a reallocation). Averaged over many pushes it is O(1): geometric growth makes reallocations rare (fewer than 2N moves for N pushes).
- **reserve() vs resize()** — `reserve(n)` only allocates room; the size is unchanged and `v[i]` is still out of bounds. `resize(n)` creates or destroys elements so the size becomes n.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 43).