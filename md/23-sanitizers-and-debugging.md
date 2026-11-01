# 23 — AddressSanitizer & Debugging Tools

*Category: C++ Language & Safety*

> Sanitizers, valgrind and gdb find memory errors, leaks, undefined behaviour and data races while the program runs, and show where they happened.

## Must-remember points

- A **sanitizer** is compiled into the program (`-fsanitize=...`) and checks memory accesses **at run time**. It reports a bug only when the bad code **actually runs**: a clean compile, or a run that never reaches the bug, proves nothing.
- **ASan** (`-fsanitize=address -g`): out-of-bounds (heap, stack, global), **use-after-free**, double free. It surrounds memory with poisoned **redzones** tracked in **shadow memory**, and **aborts on the first error**.
- Read an ASan report top-down: the **error type**, the **access** (READ/WRITE, size) with its stack, then **where the memory came from** (which variable, or where it was allocated and freed). Build with `-g` so it names files and lines.
- **LSan** (on with ASan on Linux) reports **leaks** at exit. **UBSan** (`-fsanitize=undefined`) reports signed overflow, bad shifts, null loads... and keeps running. **TSan** (`-fsanitize=thread`) reports **data races**; it can't be combined with ASan.
- To continue after an ASan error you need **both** `-fsanitize-recover=address` at build time and `ASAN_OPTIONS=halt_on_error=0` at run time.
- **gdb**: build with `-g -O0`, then `break`, `run`, `next` (step over), `step` (step into), `print`, `bt` (backtrace), `frame`, `finish`, `continue`. `gdb ./prog core` opens a **core dump** after a crash (`ulimit -c unlimited`).
- **valgrind** (memcheck) runs an unmodified binary and finds invalid reads/writes and leaks (`--leak-check=full`), but much more slowly. Don't run it on a sanitizer build.
- Sanitizers cost speed and memory (about 2x slower for ASan on the test below): use them in **debug builds and tests**, not in production.

## How sanitizers work and how to build with them

**Meaning:** a sanitizer is checking code that the compiler inserts around memory accesses and arithmetic, plus a run-time library. **AddressSanitizer** puts **redzones** (poisoned guard bytes) around every stack variable, global and heap block, and keeps **shadow memory**: one shadow byte says which of 8 application bytes may be touched. Every load and store checks it first, so touching a redzone or freed memory is reported at once, with the line.

| Flag | Tool | Finds |
|---|---|---|
| `-fsanitize=address` | ASan (+ LSan) | out-of-bounds, use-after-free, double free, leaks |
| `-fsanitize=undefined` | UBSan | signed overflow, bad shifts, null loads, out-of-range array index... |
| `-fsanitize=thread` | TSan | data races between threads |
| `-g` | debug info | needed so reports show file and line |
| `-fno-omit-frame-pointer` | frame pointers | more reliable stack traces in optimized builds |

ASan and UBSan combine (`-fsanitize=address,undefined`). TSan does not combine with ASan: `error: '-fsanitize=thread' is incompatible with '-fsanitize=address'`. Use one build for each.

All are **run-time** detectors: the report appears when the bad line executes. For a stack array, ASan names the variable: `[32, 52) 'a' <== Memory access at offset 52 overflows this variable` means `a` occupies bytes 32 to 51 of the frame (5 ints) and the access at 52 is just past its end (full run in lesson 20).

## ASan: reading a heap-use-after-free report

**Meaning:** a **use-after-free** reads or writes memory after `delete` returned it. Without ASan it usually "works", because the old values are still there until the memory is reused. ASan keeps freed memory poisoned for a while, so the access is caught.

```cpp
#include <iostream>

int main() {
    int* scores = new int[5]{10, 20, 30, 40, 50};
    delete[] scores;                         // the memory goes back to the allocator
    std::cout << scores[2] << "\n";          // undefined behaviour: read after free
}
```

```text
$ g++ -g -fsanitize=address uaf.cpp -o uaf && ./uaf
=================================================================
==11479==ERROR: AddressSanitizer: heap-use-after-free on address 0x503000000048 at pc 0x561bd903a421 ...
READ of size 4 at 0x503000000048 thread T0
    #0 0x561bd903a420 in main .../uaf.cpp:6

0x503000000048 is located 8 bytes inside of 20-byte region [0x503000000040,0x503000000054)
freed by thread T0 here:
    #0 0x7f9ced2ff1f8 in operator delete[](void*) ...
    #1 0x561bd903a3e1 in main .../uaf.cpp:5

previously allocated by thread T0 here:
    #0 0x7f9ced2fe6c8 in operator new[](unsigned long) ...
    #1 0x561bd903a27e in main .../uaf.cpp:4

SUMMARY: AddressSanitizer: heap-use-after-free .../uaf.cpp:6 in main
Shadow bytes around the buggy address:
=>0x503000000000: fa fa 00 00 00 fa fa fa fd[fd]fd fa fa fa fa fa
...
==11479==ABORTING
```
(Trimmed: addresses change every run, paths shortened.)

**How to read it:**
1. **Error type**: `heap-use-after-free`. Others you will meet: `heap-buffer-overflow`, `stack-buffer-overflow`, `global-buffer-overflow`, `stack-use-after-return`, `attempting double-free`.
2. **The access**: `READ of size 4` (one `int`) in `main` at `uaf.cpp:6`. Read the stack top-down to find your own code.
3. **The memory**: 8 bytes into a 20-byte block (`scores[2]` of 5 ints). `freed by ... uaf.cpp:5` and `previously allocated by ... uaf.cpp:4` tell the whole story.
4. **Shadow bytes**: `fa` = heap redzone, `fd` = freed memory; the bracketed `[fd]` is the byte touched.
5. `ABORTING`: ASan stops at the first error (exit code 1). To report more errors in one run, build with `-fsanitize-recover=address` **and** run with `ASAN_OPTIONS=halt_on_error=0`. The environment variable alone is not enough: without the build flag, ASan still aborts.

## LeakSanitizer: memory that is never freed

**Meaning:** a **leak** is heap memory that is still allocated when nothing points to it any more. On Linux, LeakSanitizer is part of ASan: at exit it scans memory for blocks nobody can reach and prints where each was allocated. (`-fsanitize=leak` turns on LSan alone.)

```cpp
#include <cstring>
#include <iostream>

char* makeLabel(const char* text) {
    char* p = new char[40];                 // the caller now owns this buffer...
    std::strcpy(p, text);
    return p;
}

int main() {
    std::cout << makeLabel("temporary") << "\n";   // ...but nobody calls delete[]: 40 bytes leak
}
```
```output
temporary
```

```text
$ g++ -g -fsanitize=address leak.cpp -o leak && ./leak
temporary

=================================================================
==11549==ERROR: LeakSanitizer: detected memory leaks

Direct leak of 40 byte(s) in 1 object(s) allocated from:
    #0 0x7f3e966fe6c8 in operator new[](unsigned long) ...
    #1 0x557da51e0222 in makeLabel(char const*) .../leak.cpp:5
    #2 0x557da51e0256 in main .../leak.cpp:11

SUMMARY: AddressSanitizer: 40 byte(s) leaked in 1 allocation(s).
```

**How it works:** the program runs normally, then LSan reports at exit (exit code 1). **Direct leak** = no pointer to the block remains anywhere; **indirect leak** = the block is reachable only from a leaked block (for example the nodes of a leaked list). The stack shows the allocation, not the place where the `delete` is missing: that is for you to work out. The fix here is ownership: return a `std::string` or a `std::unique_ptr<char[]>` (lesson 40).

## UBSan: undefined behaviour checks

**Meaning:** UndefinedBehaviorSanitizer adds checks for many kinds of undefined behaviour (lesson 20): signed overflow, shifts by too much, loads through null or misaligned pointers, out-of-range array indexes, invalid `bool` or enum values. By default it prints a `runtime error:` line and **keeps running**.

```cpp
#include <climits>
#include <iostream>

int main(int argc, char*[]) {
    int x = INT_MAX - 1 + argc;              // INT_MAX when run with no arguments
    int bits = 31 + argc;                    // 32
    int* p = (argc > 5) ? &x : nullptr;      // null unless 5+ arguments
    std::cout << x + 1 << "\n";              // undefined behaviour: signed overflow
    std::cout << (1 << bits) << "\n";        // undefined behaviour: shift by 32
    std::cout << *p << "\n";                 // undefined behaviour: null dereference
}
```

```text
$ g++ -g -fsanitize=undefined ub.cpp -o ub && ./ub
ub.cpp:8:27: runtime error: signed integer overflow: 2147483647 + 1 cannot be represented in type 'int'
-2147483648
ub.cpp:9:21: runtime error: shift exponent 32 is too large for 32-bit type 'int'
1
ub.cpp:10:24: runtime error: load of null pointer of type 'int'
Segmentation fault
```

**How it works:**
1. Each report gives `file:line:column` and what went wrong. The program continues after the first two, printing whatever the hardware produced.
2. The null load is reported, then really executed, so the program crashes.
3. Add `-fno-sanitize-recover=undefined` to stop at the first report (exit code 1). That is the usual setting in test suites, so a report can't scroll past unnoticed.

## TSan: data races

**Meaning:** a **data race** is two threads accessing the same memory at the same time, at least one of them writing, with no synchronization. It is undefined behaviour, and its symptoms (wrong totals, rare crashes) appear randomly. ThreadSanitizer records which thread touched which memory and in what order, and reports unsynchronized pairs.

```cpp
#include <iostream>
#include <thread>

int counter = 0;                                       // shared by both threads, no lock

void work() {
    for (int i = 0; i < 100000; ++i) ++counter;        // undefined behaviour: data race
}

int main() {
    std::thread a(work), b(work);
    a.join();
    b.join();
    std::cout << counter << "\n";
}
```

```text
$ g++ -O0 race.cpp -o race && ./race; ./race; ./race      # no sanitizer: wrong and different each run
100000
113974
113136
$ g++ -g -O1 -fsanitize=thread race.cpp -o race && ./race
WARNING: ThreadSanitizer: data race (pid=11816)
  Read of size 4 at 0x563010906154 by thread T2:
    #0 work() .../race.cpp:7 ...
  Previous write of size 4 at 0x563010906154 by thread T1:
    #0 work() .../race.cpp:7 ...
  Location is global 'counter' of size 4 at 0x563010906154 (race+0x4154)
  ...
SUMMARY: ThreadSanitizer: data race .../race.cpp:7 in work()
200000
ThreadSanitizer: reported 1 warnings
```

**How it works:**
1. `++counter` is a read, an add and a write. Two threads interleave those steps and overwrite each other's results.
2. TSan names the variable (`global 'counter'`), both conflicting accesses and where each thread was created. Its build happened to print 200000, which is why a correct-looking result proves nothing.
3. The fix: `std::atomic<int> counter{0};` (header `<atomic>`) makes each `++` indivisible. That version prints 200000 every time, and TSan reports nothing.

## gdb: breakpoints, stepping, backtraces and core dumps

**Meaning:** gdb runs your program under control: it stops at **breakpoints**, steps line by line, prints variables, and shows the call stack at a crash. Build with `-g -O0`; with optimization, variables show as `<optimized out>` and lines jump around.

```cpp
#include <iostream>

int average(const int* data, int n) {
    int sum = 0;
    for (int i = 0; i < n; i++)
        sum += data[i];
    return sum / n;
}

int main(int argc, char*[]) {
    int values[3] = {4, 8, 12};
    std::cout << average(values, 3) << std::endl;
    const int* missing = (argc > 5) ? values : nullptr;   // null unless 5+ arguments
    std::cout << average(missing, 3) << std::endl;        // undefined behaviour: null dereference
}
```

A session, run non-interactively with `-batch` and one `-ex` per command (interactively you type the same commands at the `(gdb)` prompt):

```bash
$ g++ -g -O0 crash.cpp -o crash
$ gdb -batch -ex 'break crash.cpp:12' -ex run -ex step -ex next -ex next -ex 'print *data@n' \
      -ex next -ex 'print sum' -ex finish -ex continue -ex bt -ex 'frame 1' -ex 'print missing' ./crash
Breakpoint 1 at 0x120d: file crash.cpp, line 12.

Breakpoint 1, main (argc=1) at crash.cpp:12
12	    std::cout << average(values, 3) << std::endl;
average (data=0x7fffffffc3fc, n=3) at crash.cpp:4
4	    int sum = 0;
5	    for (int i = 0; i < n; i++)
6	        sum += data[i];
$1 = {4, 8, 12}
5	    for (int i = 0; i < n; i++)
$2 = 4
0x000055555555521e in main (argc=1) at crash.cpp:12
12	    std::cout << average(values, 3) << std::endl;
Value returned is $3 = 8
8

Program received signal SIGSEGV, Segmentation fault.
0x00005555555551bc in average (data=0x0, n=3) at crash.cpp:6
6	        sum += data[i];
#0  0x00005555555551bc in average (data=0x0, n=3) at crash.cpp:6
#1  0x0000555555555267 in main (argc=1) at crash.cpp:14
#1  0x0000555555555267 in main (argc=1) at crash.cpp:14
14	    std::cout << average(missing, 3) << std::endl;        // undefined behaviour: null dereference
$4 = (const int *) 0x0
```

| Command | Does |
|---|---|
| `break file.cpp:12` / `break average` | stop at a line / at a function |
| `run` | start the program (`run arg1 arg2` passes arguments) |
| `next` / `step` | run one line, stepping **over** / **into** function calls |
| `print expr` | show a value; `print *data@n` shows `n` elements behind a pointer |
| `finish` | run until the current function returns, and show its return value |
| `continue` | run until the next breakpoint or crash |
| `bt` | backtrace: the chain of calls that led here |
| `frame N`, `info locals` | switch to caller frame N; list its local variables |

**Core dumps:** a core file is a snapshot of the crashed process's memory, for debugging a crash after it happened. Allow them with `ulimit -c unlimited` (often 0 by default). `/proc/sys/kernel/core_pattern` decides where they go: here `core` in the current directory; on systemd distributions usually `systemd-coredump` (open with `coredumpctl gdb`).

```bash
$ ulimit -c unlimited
$ ./crash
8
Segmentation fault (core dumped)
$ gdb -batch -ex bt ./crash core
...
Program terminated with signal SIGSEGV, Segmentation fault.
...
#0  0x0000555f0a2941bc in average (data=0x0, n=3) at crash.cpp:6
#1  0x0000555f0a294267 in main (argc=1) at crash.cpp:14
```

## valgrind: checking an unmodified binary

**Meaning:** valgrind's memcheck runs the program on a simulated CPU and checks every memory access. No special build is needed (just `-g` for line numbers). It finds invalid heap reads and writes, use of uninitialized values and, with `--leak-check=full`, leaks. The price is speed.

The same use-after-free and leak programs as above, built **without** sanitizers:

```text
$ g++ -g uaf.cpp -o uaf && valgrind ./uaf
==12119== Invalid read of size 4
==12119==    at 0x109212: main (uaf.cpp:6)
==12119==  Address 0x4e23088 is 8 bytes inside a block of size 20 free'd
==12119==    at 0x484BFA4: operator delete[](void*) (in /usr/libexec/valgrind/...)
==12119==    by 0x109209: main (uaf.cpp:5)
==12119==  Block was alloc'd at
==12119==    ...
==12119==    by 0x1091BE: main (uaf.cpp:4)

$ g++ -g leak.cpp -o leak && valgrind --leak-check=full ./leak
...
==12175== 40 bytes in 1 blocks are definitely lost in loss record 1 of 1
==12175==    at 0x48485C3: operator new[](unsigned long) (in /usr/libexec/valgrind/...)
==12175==    by 0x1091A2: makeLabel(char const*) (leak.cpp:5)
==12175==    by 0x1091D6: main (leak.cpp:11)
```

`==12119==` is the process ID; "definitely lost" means a direct leak. Unlike ASan, valgrind misses overflows **within** a stack frame or a global array: it only knows heap block boundaries.

## Which tool finds which bug

**Meaning:** each tool covers a different class of bugs, at a different cost. A typical setup: a normal debug build for gdb, one test run with ASan + UBSan, and one with TSan if the code uses threads.

| Bug | ASan | LSan | UBSan | TSan | valgrind | gdb |
|---|---|---|---|---|---|---|
| Heap out-of-bounds | yes | | partly | | yes | shows the crash |
| Stack / global out-of-bounds | yes | | partly | | no | shows the crash |
| Use-after-free, double free | yes | | | | yes | shows the crash |
| Memory leak | | yes | | | yes | |
| Uninitialized read | no | | | | yes | |
| Signed overflow, bad shift | | | yes | | no | |
| Null dereference | yes (crash report) | | yes | | yes | shows the crash |
| Data race | | | | yes | no (memcheck) | |
| Needs a rebuild | yes | yes | yes | yes | no | `-g` only |

("partly": UBSan checks indexes into arrays whose size the compiler knows, and, when optimizing, some accesses past the end of a heap block.)

Time for one sort-and-sum program built with `-O1 -g` on this machine (it varies by program; code with many small memory accesses slows down more):

```text
plain build        0.162 s
ASan               0.293 s   (about 1.8x)
UBSan              0.338 s   (about 2x)
TSan               0.646 s   (about 4x, single-threaded run)
valgrind (plain)   1.070 s   (about 6.6x)
```

ASan and TSan also use much more memory (shadow memory, redzones, freed blocks kept in quarantine). That is why sanitizers are for **testing**, not for production builds.

## Common mistakes

- **Assuming a clean compile, or a clean run, means no bugs.** Sanitizers only see code that executes. Run them on tests that cover the risky paths.
- **Forgetting `-g`.** Reports then show only addresses, not files and lines.
- **Expecting `ASAN_OPTIONS=halt_on_error=0` alone to continue.** It also needs `-fsanitize-recover=address` at build time.
- **Combining ASan and TSan**, or running valgrind on a sanitizer build. Use separate builds.
- **Debugging an optimized build in gdb.** `-O2` gives `<optimized out>` and jumping lines. Use `-O0 -g`, or `-Og`.
- **No core file after a crash.** Check `ulimit -c` (often 0) and `/proc/sys/kernel/core_pattern`.
- **Shipping sanitizer builds.** They are slower, use more memory, and the run-time library is not meant for production use.
- **Ignoring a UBSan line because the output looked right.** The program is still wrong; the next compiler may break it.

## ⚠ Easily confused

- **compile-time vs runtime detection** — Sanitizers instrument at compile time but report only at RUN time, when the bad access executes. Compiling clean is not bug-free.
- **ASan redzone vs stack canary** — ASan redzones catch any read or write into poisoned bytes the moment it happens. A stack canary (`-fstack-protector`) only checks at function return whether the area before the return address was overwritten.
- **ASan vs valgrind** — ASan: needs a rebuild, about 2x slower, also finds stack and global overflows. valgrind: no rebuild, much slower, finds uninitialized reads that ASan misses.
- **direct vs indirect leak** — Direct: no pointer to the block remains. Indirect: reachable only through another leaked block. Fix the direct ones first.
- **gdb next vs step** — `next` runs the current line and stops at the next line of the same function (steps over calls). `step` enters the function called on this line.
- **UBSan vs TSan** — UBSan checks single operations (overflow, shifts, null loads). TSan checks how threads share memory (data races).

➡ Questions for this topic: `questions/master-question-sheet.md` (section 23).