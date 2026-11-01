# 38 — The this Keyword

*Category: C++ Core*

> Inside a non-static member function, this is a pointer to the object the function was called on.

## Must-remember points

- `this` is a pointer available in every **non-static** member function. It holds the **address of the object** the function was called on: `e.print()` passes `&e` as a hidden argument.
- Inside a member function, a member name `x` means `this->x`. The same code works for every object because `this` differs per call.
- Type: `Entity*` in a normal member function, `const Entity*` in a `const` member function (so members can't be changed there). `this` itself can't be reassigned, which is why it is often described as `Entity* const`.
- `this` = the pointer (the address); `*this` = the object. `this->m` is the same as `(*this).m`.
- Main uses: tell a member from a same-named parameter (`this->name = name;`), return `*this` **by reference** for chaining, pass the current object to another function (`announce(*this)`), and the self-assignment check `this == &other` (lesson 41).
- Returning `*this` **by value** returns a copy: further chained calls change the copy, not the original.
- `this->` is optional for normal member access (it is needed in some template code, covered later). **Static** member functions have no `this`.

## What this is

**Meaning:** a class's member functions exist once in the program, but each call works on a different object. The compiler makes this possible by passing the object's address as a hidden extra argument. Inside the function, that address is called `this`.

```cpp
#include <iostream>

class Entity {
public:
    int x = 0;
    void whoAmI() const { std::cout << "this = " << this << ", x = " << x << "\n"; }
};

int main() {
    Entity a, b;
    b.x = 5;
    std::cout << "&a   = " << &a << "\n";
    a.whoAmI();
    std::cout << "&b   = " << &b << "\n";
    b.whoAmI();
}
```
```text
&a   = 0x7fffb4d422f0
this = 0x7fffb4d422f0, x = 0
&b   = 0x7fffb4d422f4
this = 0x7fffb4d422f4, x = 5
```

**How it works:**
1. `a.whoAmI()` is compiled roughly like `whoAmI(&a)`: inside, `this` equals `&a`. For `b.whoAmI()` it equals `&b`.
2. `x` inside the function means `this->x`, so the same code reads `a.x` in the first call and `b.x` in the second.
3. A **static** member function is not called on an object, so it gets no hidden argument. Using `this` there fails: `'this' is unavailable for static member functions`.

## Using this: names, chaining, passing the object on

**Meaning:** most of the time you don't write `this` at all. You need it when a parameter has the same name as a member, when a function should return the object it was called on (so calls can be chained), and when the object must hand **itself** to another function.

```cpp
#include <iostream>
#include <string>

class Player;
void announce(const Player& p);                     // a free function that takes a Player

class Player {
    std::string name;
    int score = 0;
public:
    explicit Player(const std::string& name) { this->name = name; }   // member vs parameter
    Player& add(int points) { score += points; return *this; }          // return the object itself
    Player& finish() { announce(*this); return *this; }                 // hand the object to a function
    const std::string& getName() const { return name; }
    int getScore() const { return score; }
};

void announce(const Player& p) {
    std::cout << p.getName() << " finished with " << p.getScore() << "\n";
}

int main() {
    Player p("Mia");
    p.add(10).add(5).finish();                      // every call works on the same p
    std::cout << "score is " << p.getScore() << "\n";
}
```
```output
Mia finished with 15
score is 15
```

**How it works:**
1. In the constructor, the parameter `name` hides the member `name`. `this->name` means the member. (A member initializer list, `: name(name)`, is the usual way to write it: lesson 32.)
2. `add` returns `*this` as `Player&`, a reference to `p` itself, so `.add(5)` and `.finish()` run on the same object.
3. `finish` passes `*this`, the object, to a function that takes `const Player&`. A function taking `Player*` would get `this`.
4. If `add` returned `Player` by value, `.add(5)` would run on a temporary copy, and `p` would end with only 10 points.

## The type of this, and const member functions

**Meaning:** in a normal member function `this` has type `Entity*`. In a `const` member function it is `const Entity*`, so members can be read but not changed through it. That is what the `const` after the parameter list means. In both cases `this` is a value, not a variable: `this = nullptr;` doesn't compile (`lvalue required as left operand of assignment`).

```cpp
class Entity {
    int x = 0;
public:
    int get() const { return x; }       // reading through const Entity*: fine
    void reset() const { x = 0; }       // does not compile: this is const Entity* here
};
```

g++ says: `error: assignment of member 'Entity::x' in read-only object`.

| Member function | Type of `this` | Can change members? | Callable on a const object? |
|---|---|---|---|
| `void f()` | `Entity*` | Yes | No |
| `void f() const` | `const Entity*` | No (except `mutable` members) | Yes |
| `static void f()` | No `this` | Only static members | Yes, no object needed |

## Common mistakes

- **Same-named parameter without `this->`**: `void setX(int x) { x = x; }` assigns the parameter to itself. The member never changes, and g++ with `-Wall -Wextra` prints no warning. Write `this->x = x;` or use a different parameter name.
- **Returning `*this` by value** from a function meant for chaining: the chain continues on copies.
- **Returning `this` where a reference is expected**: `this` is a pointer; return `*this` for `Entity&`.
- **Keeping `this` after the object is gone**: a pointer stored in a list or callback dangles once the object is destroyed, and a copy of the object has a different `this`.
- **`delete this;`**: legal only for an object created with `new`, and nothing may touch the object afterwards. Avoid it; let an owner (a smart pointer, lesson 40) delete the object.

## ⚠ Easily confused

- **this vs *this** — `this` = the pointer (address of the object). `*this` = the object itself. Return `*this` by reference to chain.
- **non-const vs const member function** — Non-const: `this` is `Entity*`, members can be changed. Const: `this` is `const Entity*`, members are read-only. Neither `this` can be reassigned.
- **this-> optional vs required** — Member access usually needs no `this->`. Required to reach a member hidden by a same-named parameter (and for dependent base members in templates).
- **return *this by reference vs by value** — `Entity&`: the caller gets the same object, so chained calls change it. `Entity`: the caller gets a copy, so chained calls change the copy.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 38).