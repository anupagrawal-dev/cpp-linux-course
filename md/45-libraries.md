# 45 — Libraries: Static and Shared

*Category: Linux*

> A library is ready-made compiled code. Static is copied in at link time; shared is found by the loader at run time.

## Must-remember points

- A **library** is ready-made compiled code. Give someone the library and the **header** and they can call your functions without seeing your `.cpp`.
- **Static** library (`.a` on Linux, `.lib` on Windows): an archive of `.o` files. The linker **copies** the parts the program needs into it at **link time**. The program then runs on its own.
- **Shared** library (`.so` on Linux, `.dll` on Windows): the program only stores the library's **name** (`NEEDED`). The loader finds the file and loads it **when the program starts**, so the `.so` must be shipped with the program.
- Both kinds need the **header and the library to build**. A shared library is needed **again at run time**. The library goes **after** the files that use it: `g++ main.cpp -L. -lcalc`.
- One shared library serves **many programs**: its code is loaded once and shared in memory, and fixing it fixes every program. A static library puts its own copy into every program.
- If the loader can't find it you get `cannot open shared object file`. Fix: `LD_LIBRARY_PATH`, a **`RUNPATH`** stored in the program (`-Wl,-rpath,'$ORIGIN'`), or install the `.so` in a system folder and run `ldconfig`.
- `RUNPATH` (what modern linkers write) is searched **after** `LD_LIBRARY_PATH` and only for the program's direct libraries; the old `RPATH` is searched **before** it and for the whole chain.
- `readelf -d` shows what the program **asks for** and where it will **look**. `ldd` shows what is **found right now**. A library hides the source, **not** the machine code.

## What a library is

**Meaning:** when you compile a `.cpp` file you get an object file (`.o`) with machine code. A **library** packs object files so other programs can use them. The users get the library file plus a **header** with the declarations: the header lets their code compile against your functions, the library gives the linker the code. They never need your `.cpp`.

The example used in this lesson: two functions in two source files, and a program that uses only one of them.

```bash
$ cat calc.h
#pragma once
int addition(int a, int b);
int subtraction(int a, int b);
$ cat add.cpp
#include "calc.h"
int addition(int a, int b) { return a + b; }
$ cat sub.cpp
#include "calc.h"
int subtraction(int a, int b) { return a - b; }
$ cat main.cpp
#include <cstdio>
#include "calc.h"

int main() {
    std::printf("%d\n", addition(2, 3));
}
```

There are two kinds of library. They differ in **when** the code is joined to the program: at link time (static) or when the program starts (shared).

## Static libraries (.a)

**Meaning:** a static library is an **archive** of `.o` files made with `ar`. When you link a program against it, the linker copies the object files the program needs into the executable. After that, the program doesn't need the library any more.

```bash
$ g++ -c add.cpp sub.cpp
$ ar rcs libcalc.a add.o sub.o
$ ar t libcalc.a
add.o
sub.o
$ g++ main.cpp -L. -lcalc -o app_static
$ ./app_static
5
$ nm -C app_static | grep -E 'addition|subtraction'
000000000000117d T addition(int, int)
$ mv libcalc.a /tmp/libcalc.a.away && ./app_static
5
```

**How it works:**
1. `g++ -c` compiles without linking, giving `add.o` and `sub.o`. `ar rcs` puts them into `libcalc.a` (`r` = insert, `c` = create, `s` = add an index).
2. `-L.` adds the current folder to the library search path; `-lcalc` means "look for `libcalc.a` or `libcalc.so`".
3. `nm` lists the symbols in the program: `addition` is there (`T` = code in this file), `subtraction` isn't. The linker only copied the member it needed, `add.o`.
4. The program still runs after the `.a` is moved away: the code is inside it.

**Link order matters.** GNU `ld` reads its arguments left to right and takes code from a static library only for symbols it already needs. With the library first, nothing needs `addition` yet:

```bash
$ g++ -L. -lcalc main.cpp -o wrong
/usr/bin/ld: /tmp/ccTXFOa6.o: in function `main':
main.cpp:(.text+0x13): undefined reference to `addition(int, int)'
collect2: error: ld returned 1 exit status
```

Put libraries **after** the files that use them.

## Shared libraries (.so)

**Meaning:** a shared library is a single file of position-independent code that the **dynamic loader** (`ld.so`) maps into a program's memory when the program starts. The program itself stores only the library's **name** and a list of the functions it expects to find there.

```bash
$ g++ -fPIC -shared add.cpp sub.cpp -o libcalc.so
$ g++ main.cpp -L. -lcalc -o app
$ ./app
./app: error while loading shared libraries: libcalc.so: cannot open shared object file: No such file or directory
$ readelf -d app | grep NEEDED
 0x0000000000000001 (NEEDED)             Shared library: [libcalc.so]
 0x0000000000000001 (NEEDED)             Shared library: [libc.so.6]
$ nm -C app | grep addition
                 U addition(int, int)
$ LD_LIBRARY_PATH=. ./app
5
```

**How it works:**
1. `-fPIC` (position-independent code) lets the loader place the library at any address; `-shared` makes a `.so`.
2. Linking checks that `addition` exists and records `NEEDED libcalc.so`. `nm` shows `U` (undefined): the code is not in `app`.
3. At start-up the loader looks for `libcalc.so` in the standard places, doesn't find it in the current folder, and stops. That is a **run-time** error: the build succeeded.
4. `LD_LIBRARY_PATH=.` adds the current folder to the loader's search, and the program runs.

The library is also needed **to build**. Without it the link fails:

```bash
$ g++ main.cpp -L. -lcalc -o app2
/usr/bin/ld: cannot find -lcalc: No such file or directory
collect2: error: ld returned 1 exit status
```

**Shared in memory:** two programs using the same `.so` map the same file, so its read-only code pages are held in RAM once. Writable data (globals) is still private to each process.

## How the loader finds a shared library

**Meaning:** the loader searches for each `NEEDED` name in a fixed order (`man ld.so`): the program's `RPATH` (old style, only if it has no `RUNPATH`), then `LD_LIBRARY_PATH`, then the program's `RUNPATH`, then the cache built by `ldconfig`, then the default folders `/lib` and `/usr/lib`. So there are three practical ways to make `cannot open shared object file` go away.

**1. `LD_LIBRARY_PATH`** (an environment variable): quick for testing, shown above. It applies to every program started from that shell, so it is a poor permanent fix.

**2. A `RUNPATH` stored in the program**, chosen at link time. `$ORIGIN` means "the folder the executable is in", so the program and its `.so` can be moved together:

```bash
$ g++ main.cpp -L. -lcalc -Wl,-rpath,'$ORIGIN' -o app_rpath
$ readelf -d app_rpath | grep RUNPATH
 0x000000000000001d (RUNPATH)            Library runpath: [$ORIGIN]
$ ./app_rpath
5
```

The single quotes stop the shell from expanding `$ORIGIN`. For the common `bin/` + `lib/` layout use `'$ORIGIN/../lib'`: the program then still finds its library after the whole folder is moved.

**3. Install it system-wide** (needs root) and refresh the loader's cache:

```bash
$ cp libcalc.so /usr/local/lib/ && ldconfig
$ ldd app | grep calc
	libcalc.so => /usr/local/lib/libcalc.so
$ ./app
5
```

**Which to use:** `LD_LIBRARY_PATH` while developing; `$ORIGIN`-relative `RUNPATH` for an application shipped as one folder; system install + `ldconfig` for a library many programs share (that is how distribution packages do it).

## RPATH vs RUNPATH

**Meaning:** `-Wl,-rpath,DIR` stores a search folder in the program. Modern linkers store it as **`RUNPATH`**; with `-Wl,--disable-new-dtags` they store the older **`RPATH`**. The two differ in order and reach.

Version 1 of a library sits in the folder stored in the program, version 2 in a folder given by `LD_LIBRARY_PATH`:

```bash
$ readelf -d new_tag | grep -o 'R[A-Z]*PATH.*'
RUNPATH)            Library runpath: [/tmp/rpdemo/v1]
$ readelf -d old_tag | grep -o 'R[A-Z]*PATH.*'
RPATH)              Library rpath: [/tmp/rpdemo/v1]
$ LD_LIBRARY_PATH=/tmp/rpdemo/v2 ./new_tag
version 2
$ LD_LIBRARY_PATH=/tmp/rpdemo/v2 ./old_tag
version 1
```

A program needs `libb.so`, which itself needs `liba.so`; the program's path points to the folder holding both, `libb.so` has no path of its own:

```bash
$ ldd app_runpath | grep -E 'liba|libb'
	libb.so => /tmp/rpdemo/t/libs/libb.so
	liba.so => not found
$ ldd app_rpath | grep -E 'liba|libb'
	libb.so => /tmp/rpdemo/t/libs/libb.so
	liba.so => /tmp/rpdemo/t/libs/liba.so
```

| | `RPATH` (old) | `RUNPATH` (default today) |
|---|---|---|
| Searched | **before** `LD_LIBRARY_PATH` | **after** `LD_LIBRARY_PATH` |
| User can override it with `LD_LIBRARY_PATH` | No | Yes |
| Used for libraries needed by your libraries | Yes, the whole chain | No, only the program's direct `NEEDED` |
| Link option | `-Wl,--disable-new-dtags -Wl,-rpath,DIR` | `-Wl,-rpath,DIR` |

`RUNPATH` replaced `RPATH` so that users can override a library (for testing or debugging). The price: each library in a chain needs its own `RUNPATH`, usually `$ORIGIN`.

## Inspecting a binary: readelf, ldd, nm, objdump

| Question | Tool | Notes |
|---|---|---|
| Which libraries does it ask for, and where will it look? | `readelf -d prog` | Reads the file only: `NEEDED`, `RUNPATH`, `RPATH`. Never checks the disk, never runs anything. |
| Is each library found right now, and where? | `ldd prog` | Shows `name => path` or `not found`, including libraries needed by libraries. The answer depends on your shell (`LD_LIBRARY_PATH`). `man ldd` warns that it may execute the program: don't use it on untrusted files. |
| Every folder the loader tried, in order | `LD_DEBUG=libs ./prog` | Runs the program. |
| Which functions does a file define or need? | `nm -C file` | `T` = defined here, `U` = needed from elsewhere. `-C` turns mangled names back into C++. |
| What machine code does it contain? | `objdump -d -C file` | The disassembly. |

The loader's search, shown by `LD_DEBUG` (paths depend on the machine):

```text
find library=libcalc.so [0]; searching
  trying file=/lib/x86_64-linux-gnu/glibc-hwcaps/x86-64-v4/libcalc.so
  trying file=/lib/x86_64-linux-gnu/glibc-hwcaps/x86-64-v3/libcalc.so
  trying file=/lib/x86_64-linux-gnu/glibc-hwcaps/x86-64-v2/libcalc.so
  trying file=/lib/x86_64-linux-gnu/libcalc.so
  trying file=/usr/lib/x86_64-linux-gnu/glibc-hwcaps/x86-64-v4/libcalc.so
```

A library hides your **source**, not your code: anyone can disassemble it.

```bash
$ objdump -d -C --no-show-raw-insn add.o | grep -A4 '<addition(int, int)>:'
0000000000000000 <addition(int, int)>:
   0:	endbr64
   4:	push   %rbp
   5:	mov    %rsp,%rbp
   8:	mov    %edi,-0x4(%rbp)
```

**Debugging "cannot open shared object file":** run `ldd prog | grep 'not found'`, then `readelf -d prog | grep -E 'NEEDED|RUNPATH|RPATH'` to see where it looks, then put the `.so` there or fix the path.

## Static vs shared: which to use

| | Static (`.a`) | Shared (`.so`) |
|---|---|---|
| Joined to the program | At link time: code copied in | At start-up: the loader maps the file |
| Library needed on the target machine | No | Yes, or the program won't start |
| Program size | Bigger | Smaller |
| Memory with many programs | One copy of the code per program | Code pages shared |
| Fixing a bug in the library | Relink and redeliver every program | Replace the `.so` (if its interface is unchanged) |
| Start-up cost | None | The loader finds, maps and links the libraries |
| Typical failure | Build error: `undefined reference` | Run-time error: `cannot open shared object file` |

**Choose static** for one self-contained file to deploy (small tools, containers, embedded targets) and when you don't control what is installed on the target.

**Choose shared** when many programs use the same code, when the library must be updated without rebuilding its users (security fixes in system libraries), or for plugins loaded with `dlopen` at run time.

If both `libcalc.a` and `libcalc.so` are in the search path, `-lcalc` picks the **shared** one. `-l:libcalc.a` forces the static one:

```bash
$ g++ main.cpp -L. -lcalc -o a1 && readelf -d a1 | grep -c 'libcalc'
1
$ g++ main.cpp -L. -l:libcalc.a -o a2 && readelf -d a2 | grep -c 'libcalc'
0
```

## Common mistakes

- **Library before the code that uses it**: `g++ -lcalc main.cpp` gives `undefined reference`. Put `-l...` last.
- **Forgetting `-fPIC`** for a shared library. Code that uses a global variable fails to link: `relocation R_X86_64_PC32 against symbol 'counter' can not be used when making a shared object; recompile with -fPIC`. (A tiny function without globals may link anyway; don't rely on it.)
- **Shipping a program without its `.so`**: it builds and runs on your machine, then fails on the server with `cannot open shared object file`. Ship the library and use `$ORIGIN`, or install it.
- **An absolute `RUNPATH`**: CMake, for example, stores the build folder's absolute path so the program runs from the build tree. Move the folder or copy the program to another machine and the library is `not found`. Use `$ORIGIN` for anything you ship.
- **Trusting `ldd` everywhere**: its answer depends on your shell's `LD_LIBRARY_PATH`, and it may run the program. Use `readelf -d` for files you don't trust.
- **Thinking a library hides the logic**: it hides only the source code; `objdump -d` shows the instructions.

## ⚠ Easily confused

- **static vs shared** — Static is joined at **link time** and the library is not needed to run. Shared is joined at **run time**, so the `.so` must be on the machine. Both need the header and the library to **build**.
- **`readelf -d` vs `ldd`** — `readelf -d` only reads the program file: the names it needs and any `RUNPATH`. It never looks at the disk. `ldd` runs the loader's search and prints `=> path` or `not found`, for **your** shell. `ldd` can execute the program it inspects, so don't use it on a binary you don't trust.
- **RPATH vs RUNPATH** — `RPATH` is the old tag: searched **before** `LD_LIBRARY_PATH`, and also used for the libraries your libraries need. `RUNPATH` is the new one: searched **after** `LD_LIBRARY_PATH`, and only for the program's **direct** libraries. Modern linkers write `RUNPATH`.
- **hidden vs protected** — A library hides the **source**. The machine code is still in the file, and `objdump -d` prints it. Don't count on a library to protect logic.
- **`-lcalc` order and which file wins** — The library goes **after** the files that use it: `g++ main.cpp -L. -lcalc`. If `libcalc.a` and `libcalc.so` are in the same folder, `-lcalc` picks the `.so`; `-l:libcalc.a` forces the static one.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 45).