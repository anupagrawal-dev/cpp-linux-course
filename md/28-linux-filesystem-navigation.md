# 28 — Filesystem & Navigation

*Category: Linux*

> Every file sits in one tree that starts at /. Paths are absolute (from /) or relative (from the working directory).

## Must-remember points

- **One directory tree** rooted at `/`, with no drive letters. Disks and kernel views such as `/proc` are mounted inside it.
- An **absolute path** starts at `/` and means the same from anywhere. A **relative path** starts from the current directory. `.` = here, `..` = parent, `~` = your home directory.
- Every process has a **working directory**. A relative path in code (`std::ifstream("config.txt")`) is resolved against it, not against the executable's folder: a classic "file not found" bug.
- Standard directories: `/etc` configuration, `/home` users, `/tmp` temporary, `/var` logs, `/usr/bin` programs, `/proc` processes, `/dev` devices.
- Moving around: `pwd`, `cd dir`, `cd ..`, `cd -` (back), `ls -la` (long format, including **hidden** names that start with `.`).
- File work: `mkdir -p`, `touch`, `cp -r`, `mv` (move/rename), `rm -r` (**no undo**), `less`, `head`, `tail -f`, `find` (by name), `grep -rn` (by content).
- The **shell** expands wildcards (`*`, `?`) before the command runs. Quote patterns meant for `find`, and names with spaces.
- An **inode** holds a file's data and metadata; a name links to it. **Hard link** = a second name for the same inode. **Symbolic link** = a small file holding a path; it breaks when the target goes.

## One tree: absolute and relative paths

**Meaning:** all files hang from one root, `/`. An **absolute** path spells out the way from `/`. A **relative** path starts from the **working directory** shown by `pwd`. `.` is the current directory, `..` its parent, `~` your home directory (`/home/<user>`; `/root` for root). The sessions in this lesson run as user `sam` in a scratch directory made with `mktemp -d`.

```bash
$ pwd
/tmp/tmp.XL2Xu0bgHj/l28
$ mkdir -p project/src project/build
$ cd project/src
$ cd ../build
$ pwd
/tmp/tmp.XL2Xu0bgHj/l28/project/build
$ cd /tmp/tmp.XL2Xu0bgHj/l28/project/src
$ cd -
/tmp/tmp.XL2Xu0bgHj/l28/project/build
$ cd ..
$ ls
build  src
$ echo ~
/home/sam
```

**How it works:**
1. `cd project/src` is relative: it is joined to the working directory. `cd ../build` goes up to `project`, then into `build`.
2. The absolute `cd /tmp/...` works from anywhere. `cd -` returns to the previous directory; `cd` alone goes home.
3. The working directory belongs to the shell process. Programs started from the shell inherit it (last section).

## The standard directories

**Meaning:** every Linux system follows the same layout (the Filesystem Hierarchy Standard), so you know where to look.

| Directory | Holds |
|---|---|
| `/usr/bin` | programs (`ls`, `g++`); on modern distributions `/bin` is a link to it |
| `/usr/lib`, `/usr/include` | libraries and C/C++ headers |
| `/etc` | system-wide configuration, as text files (`/etc/passwd`, `/etc/hosts`) |
| `/home/<user>`, `/root` | users' own files; root's home |
| `/tmp` | temporary files, often cleared at boot |
| `/var` | data that changes: logs in `/var/log`, caches |
| `/proc` | not on disk: the kernel's live view of processes (`/proc/<pid>`) and memory (`/proc/meminfo`) |
| `/dev` | device files: disks, terminals, `/dev/null` |

## Essential file commands

**Meaning:** a dozen commands cover daily work: create, look, copy, move, delete, search.

```bash
$ mkdir -p notes/2026
$ echo "fix the parser bug" > notes/todo.txt
$ cp notes/todo.txt notes/2026/todo.bak
$ printf 'line %s\n' 1 2 3 4 5 > log.txt
$ head -n 2 log.txt
line 1
line 2
$ tail -n 1 log.txt
line 5
$ grep -rn "bug" notes
notes/todo.txt:1:fix the parser bug
notes/2026/todo.bak:1:fix the parser bug
$ find . -name "*.bak"
./notes/2026/todo.bak
$ cp -r notes backup
$ mv backup old-notes
$ rm -r old-notes
$ ls
log.txt  notes
```

**How it works:**
1. `mkdir -p` creates missing parents and doesn't fail if the directory exists. `touch f` creates an empty file.
2. `grep -rn` searches file **contents** and prints file:line. `find` searches by **name** (also type, size, time).
3. `cp -r` copies a tree. `mv` moves, or renames. `rm` deletes for good (no trash); `rm -i` asks first.
4. Interactive: `less file` pages through a file (`/word` searches, `q` quits); `tail -f app.log` keeps printing new lines until Ctrl+C.

## Hidden files, wildcards and tab completion

**Meaning:** a name starting with `.` is **hidden** from `ls` and from `*` (configuration files such as `~/.bashrc`). **Wildcards**: `*` matches any characters, `?` exactly one. The **shell** replaces the pattern with the matching names before the command starts.

```bash
$ touch main.cpp util.cpp util.h .config
$ ls
main.cpp  util.cpp  util.h
$ ls -a
.  ..  .config  main.cpp  util.cpp  util.h
$ echo *.cpp
main.cpp util.cpp
$ echo ????.h
util.h
$ echo *.java
*.java
```

**How it works:**
1. `echo` prints the arguments it received: the shell turned `*.cpp` into two names.
2. A pattern that matches nothing is passed on unchanged (`*.java`).
3. **Tab completion:** type the start of a command or path and press Tab; press it twice to list the choices. Faster, and no typos in long paths.

## Inodes, hard links and symbolic links

**Meaning:** a file's data and metadata (size, owner, permissions, times) live in an **inode**, identified by a number. A directory entry maps a **name** to an inode. A **hard link** is one more name for the same inode. A **symbolic link** is a separate small file containing a path.

```bash
$ echo "version 1" > original.txt
$ ln original.txt hard.txt
$ ln -s original.txt soft.txt
$ ls -li
total 8
1927024 -rw-r--r-- 2 sam sam 10 Oct 31 01:31 hard.txt
1927024 -rw-r--r-- 2 sam sam 10 Oct 31 01:31 original.txt
1927025 lrwxrwxrwx 1 sam sam 12 Oct 31 01:31 soft.txt -> original.txt
$ echo "version 2" >> hard.txt
$ rm original.txt
$ cat hard.txt
version 1
version 2
$ cat soft.txt
cat: soft.txt: No such file or directory
```

**How it works:**
1. Both names share inode 1927024; the **link count** after the permissions is 2. A write through either name changes the one file.
2. `rm` removes a **name**. The data is freed when the link count reaches 0 and no process has the file open.
3. `soft.txt` holds the text `original.txt`. That name is gone, so the link **dangles**.

| | Hard link | Symbolic link |
|---|---|---|
| What it is | another name for the same inode | a small file holding a path |
| Target removed | still works | breaks (dangling) |
| Across filesystems | no (`Invalid cross-device link`) | yes |
| To a directory | no (`hard link not allowed for directory`) | yes |
| Typical use | rare | `libfoo.so -> libfoo.so.1` (lesson 45), shortcuts |

## The working directory in a C++ program

**Meaning:** a program inherits the working directory of the shell that started it, and resolves every relative path against it, wherever the binary is stored. `std::filesystem::current_path()` returns it.

```cpp
#include <filesystem>
#include <fstream>
#include <iostream>

namespace fs = std::filesystem;

int main() {
    std::cout << "working dir: " << fs::current_path().string() << "\n";
    fs::path exeDir = fs::canonical("/proc/self/exe").parent_path();   // the binary's own directory (Linux)
    std::ifstream a("config.txt");               // relative: looked up in the working directory
    std::ifstream b(exeDir / "config.txt");      // absolute: built from the binary's directory
    std::cout << "config.txt: " << (a ? "found" : "not found")
              << ", exeDir/config.txt: " << (b ? "found" : "not found") << "\n";
}
```

```bash
$ g++ -std=c++17 where.cpp -o where
$ echo "port=8080" > config.txt
$ ./where
working dir: /tmp/tmp.XL2Xu0bgHj/l28/app
config.txt: found, exeDir/config.txt: found
$ cd ..
$ app/where
working dir: /tmp/tmp.XL2Xu0bgHj/l28
config.txt: not found, exeDir/config.txt: found
```

**How it works:**
1. Same binary, same `config.txt` beside it; only the directory it was **started from** changed.
2. `/proc/self/exe` is a kernel link to the running binary, so `exeDir` doesn't depend on the working directory.
3. Fixes: take the path as an argument, build it from the binary's directory, or use a fixed absolute path (`/etc/myapp/config.txt`).

## Common mistakes

- **Trusting a relative path in a program.** It depends on where the program is started (a systemd service starts in `/` unless configured otherwise).
- **`rm -r` in the wrong place.** There is no undo. Check `pwd` first; quote variables and refuse empty ones: `rm -r "${DIR:?}/build"`.
- **Unquoted names with spaces.** `rm my file.txt` tries to delete two files, `my` and `file.txt`. Write `rm "my file.txt"`.
- **Unquoted patterns.** With `a.txt` and `b.txt` present, `find . -name *.txt` becomes `find . -name a.txt b.txt` and fails (`paths must precede expression`). Write `find . -name "*.txt"`.
- **Forgetting hidden files.** `cp -r src/* dest` skips `src/.env`; `cp -r src/. dest` copies everything.
- **Relative symlink targets.** `ln -s file.txt sub/link` points to `sub/file.txt`: the target is resolved from the link's own directory.

## ⚠ Easily confused

- **absolute vs relative path** — Absolute starts at `/` and means the same everywhere. Relative starts from the working directory of the shell or program using it.
- **. vs ..** — `.` = the current directory. `..` = its parent.
- **working directory vs executable location** — Relative paths are resolved against where the process was started, never against the binary's folder.
- **hard link vs symbolic link** — Hard link: a second name for the same inode; survives deleting the original. Symbolic link: a file holding a path; breaks when the path disappears, but can cross filesystems and point to directories.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 28).