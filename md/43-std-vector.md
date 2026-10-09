# 43 — std::vector (Dynamic Array)

*Category: C++ Core*

> A contiguous, growable heap array — with amortized O(1) push_back.

## Must-remember points

- `std::vector` = the STL's **dynamic array**: contiguous, growable, elements on the **heap** (`<vector>`); `[]` is O(1) and cache-friendly.
- **`size()`** = elements stored; **`capacity()`** = total slots allocated before a reallocation (spare room = capacity - size).
- On growth it allocates a **new, bigger block** (~1.5-2x), **moves** the elements over, and **frees** the old — never extends in place. So `push_back` is **amortized O(1)**, and a reallocation **invalidates** old iterators/pointers/references.
- `[]` is **unchecked** (UB if out of range); `.at()` is **bounds-checked** (throws `std::out_of_range`).
- `push_back(x)` copies/moves an already-built object in; `emplace_back(args...)` **constructs the element in place** from the args (no temporary).
- Cut the two costs: **`reserve(n)`** (pre-allocate to the expected size -> no repeated reallocations) and **`emplace_back`** (no temporary copy/destroy). Pass by `const&` to avoid copying the whole vector.

## Common usage

```cpp
#include <vector>

std::vector<int> v;
v.reserve(1000);        // one allocation up front (avoids repeated reallocations)
v.push_back(42);        // append a copy/move
v.emplace_back(7);      // construct in place, no temporary

std::cout << v.size() << " / " << v.capacity();  // used vs allocated
int x = v[0];           // unchecked
int y = v.at(0);        // bounds-checked -> throws std::out_of_range if bad

void f(const std::vector<int>& in);   // pass by const& — no copy
```

## Why amortized O(1) (doubling vs +1 growth)

Doubling: copying N elements over all reallocations sums to ~N total (1+2+4+...) -> ~O(1) per push_back on average. Growing by +1 each time would copy everything every time -> 0+1+2+...+(N-1) = ~N^2/2 -> O(n) per insert. For N=1000: doubling ~2,000 copy-ops vs +1 growth ~500,000.

## ⚠ Easily confused

- **size() vs capacity()** — size = elements stored. capacity = total slots allocated before reallocating (spare = capacity - size).
- **push_back vs emplace_back** — push_back copies/moves an already-built object in. emplace_back constructs the element in place from the args (no temporary).
- **[] vs .at()** — `[]` does NO bounds check (UB if out of range). `.at()` checks and throws `std::out_of_range`.
- **amortized O(1) vs O(1)** — A single push_back can be O(n) (a reallocation). Averaged over many inserts it's O(1), because geometric growth makes reallocations rare (total work ~N for N inserts).

➡ Questions for this topic: `questions/master-question-sheet.md` (section 43).