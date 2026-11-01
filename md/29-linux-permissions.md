# 29 — Permissions (rwx)

*Category: Linux*

> Every file has an owner, a group and three rwx triplets. The kernel picks one triplet for you and checks it on every access.

## Must-remember points

- The `ls -l` mode: the **file type** (`-` file, `d` directory, `l` symlink, `c`/`b` device), then three `rwx` **triplets** for **owner**, **group**, **others**.
- r=4, w=2, x=1, added per triplet: `rwxr-xr-x` = **755**, `rw-r--r--` = **644**. `stat` shows both forms.
- On a **directory**: `r` = list names, `w` = create, delete, rename entries, `x` = enter and reach files inside. Deleting a file needs **w on the directory**, not on the file.
- Exactly **one triplet** applies: owner if you own the file, else group if you are a member, else others. No fallback: the owner gets only the owner bits.
- **root** skips the read and write checks; to execute, it still needs at least one `x` bit. A **script** needs `r` and `x`; a binary runs with `x` alone.
- **umask** clears bits from the mode of new files: files start from 666, directories from 777, so umask 022 gives 644 and 755. It is a mask, not a subtraction.
- Special bits: **setuid** (runs as the file's owner, e.g. `passwd`), **setgid** (runs as the file's group; on a directory, new files get its group), **sticky** on a directory (only a file's owner may delete it, e.g. `/tmp`).

## Reading the mode: ls -l and stat

**Meaning:** the first column of `ls -l` is the **mode**: one character for the type (`-` regular file, `d` directory, `l` symlink, `c`/`b` character/block device), then three triplets of `r` (read), `w` (write), `x` (execute) for the **owner**, the **group** and **others**. `-` means the permission is off. In the sessions, `sam` is an ordinary user; `sudo cmd` runs a command as root and `sudo -u kim cmd` as another user, `kim`.

```bash
$ touch notes.txt
$ mkdir src
$ ls -l
total 4
-rw-r--r-- 1 sam sam    0 Oct 31 01:34 notes.txt
drwxr-xr-x 2 sam sam 4096 Oct 31 01:34 src
$ stat notes.txt
  File: notes.txt
  Size: 0               Blocks: 0          IO Block: 4096   regular empty file
Device: 254,0   Inode: 1927201     Links: 1
Access: (0644/-rw-r--r--)  Uid: (30033/     sam)   Gid: (30033/     sam)
Access: 2026-10-31 01:34:45.820686685 +0000
Modify: 2026-10-31 01:34:45.820686685 +0000
Change: 2026-10-31 01:34:45.820686685 +0000
 Birth: 2026-10-31 01:34:45.820686685 +0000
```

**How it works:**
1. `-rw-r--r--`: a regular file; owner `sam` may read and write, group `sam` and others may only read.
2. Each triplet is one octal digit: r=4, w=2, x=1. `rw-` = 6 and `r--` = 4, so 644. `rwxr-xr-x` = 755.
3. `stat` adds the octal mode, owner and group as numbers, and the times: **Modify** = last content change, **Change** = last change to the inode (content, mode or owner).

## r, w and x on files and directories

**Meaning:** the letters mean different things for a directory, because a directory is a list of names.

| Bit | On a file | On a directory |
|---|---|---|
| `r` | read the contents | list the names inside |
| `w` | change the contents | create, delete or rename entries |
| `x` | run it as a program | enter it and reach the files inside by name |

```bash
$ mkdir box
$ echo hi > box/a.txt
$ chmod 600 box
$ ls box
a.txt
$ cat box/a.txt
cat: box/a.txt: Permission denied
$ chmod 300 box
$ ls box
ls: cannot open directory 'box': Permission denied
$ cat box/a.txt
hi
$ chmod 500 box
$ rm -f box/a.txt
rm: cannot remove 'box/a.txt': Permission denied
$ echo data > ro.txt
$ chmod 444 ro.txt
$ rm -f ro.txt
$ printf '#!/bin/sh\necho hello\n' > hi.sh
$ chmod 100 hi.sh
$ ./hi.sh
/bin/sh: 0: cannot open ./hi.sh: Permission denied
$ chmod 500 hi.sh
$ ./hi.sh
hello
```

**How it works:**
1. `chmod` sets the bits (lesson 30). `rw-` on `box`: the names can be listed, but no file inside can be reached.
2. `-wx`: no listing, but a file whose name you know can be opened.
3. `r-x`: nothing in `box` can be deleted. Yet the read-only `ro.txt` was deleted, because its directory is writable: deleting changes the **directory**.
4. The script with only `x` failed: the kernel starts `/bin/sh`, which must **read** the file. A compiled binary runs with `x` alone.

## Which triplet applies, and root

**Meaning:** the kernel compares the process's effective user ID and groups with the file's owner and group, and picks **one** triplet: owner, else group, else others. There is no fallback to a more generous triplet. **root** (UID 0) skips the read and write checks.

```bash
$ echo secret > f.txt
$ chmod 077 f.txt
$ ls -l f.txt
----rwxrwx 1 sam sam 7 Oct 31 01:34 f.txt
$ cat f.txt
cat: f.txt: Permission denied
$ sudo -u kim cat f.txt
secret
$ chmod 600 f.txt
$ sudo -u kim cat f.txt
cat: f.txt: Permission denied
$ sudo cat f.txt
secret
```

**How it works:**
1. `sam` owns `f.txt`, so only the owner triplet `---` counts, although others have `rwx`. The owner may still `chmod` it.
2. `kim` is neither the owner nor in group `sam`, so the others triplet decides: allowed with 077, refused with 600.
3. root reads it anyway. To run a program, root still needs at least one `x` bit.
4. Checks happen at **open** time: a process that already has the file open keeps its access after a `chmod`.

## umask: the default mode of new files

**Meaning:** a program creating a file asks for a mode, usually 666 for files and 777 for directories. The process's **umask** lists the bits to clear from that request. It is inherited from the parent process; usually 022.

```bash
$ umask
0022
$ touch a.txt
$ mkdir d1
$ umask 077
$ touch b.txt
$ mkdir d2
$ umask 033
$ touch c.txt
$ ls -ld a.txt b.txt c.txt d1 d2
-rw-r--r-- 1 sam sam    0 Oct 31 01:34 a.txt
-rw------- 1 sam sam    0 Oct 31 01:34 b.txt
-rw-r--r-- 1 sam sam    0 Oct 31 01:34 c.txt
drwxr-xr-x 2 sam sam 4096 Oct 31 01:34 d1
drwx------ 2 sam sam 4096 Oct 31 01:34 d2
```

| umask | New file | New directory | Use |
|---|---|---|---|
| 022 | 644 | 755 | the usual default |
| 002 | 664 | 775 | a team shares files through a group |
| 077 | 600 | 700 | private |

**How it works:**
1. New mode = requested mode AND NOT umask. With umask 033: 666 & ~033 = 644, not 633, because there was no `x` to remove.
2. `touch` never creates `x`. The linker marks its output executable (777 filtered by the umask), so `g++ main.cpp -o app` gives 755.
3. `open(path, O_CREAT | O_WRONLY, 0666)` and `std::ofstream` in C++ are filtered the same way.

## Special bits: setuid, setgid, sticky

**Meaning:** three more bits form a fourth octal digit in front (lesson 30). `ls -l` shows them in place of an `x`; a capital `S` or `T` means the `x` under it is off.

| Bit | Octal | On an executable | On a directory | Example |
|---|---|---|---|---|
| setuid | 4000 | runs with the **file owner's** user ID | ignored on Linux | `-rwsr-xr-x` |
| setgid | 2000 | runs with the **file's group** | new files get the directory's group (lesson 31) | `drwxrwsr-x` |
| sticky | 1000 | ignored on Linux | only a file's owner, the directory's owner or root may delete or rename it | `drwxrwxrwt` |

```cpp
#include <iostream>
#include <unistd.h>

int main() {
    std::cout << "real UID " << getuid() << ", effective UID " << geteuid() << "\n";
}
```

```bash
$ ls -l /usr/bin/passwd
-rwsr-xr-x 1 root root 64152 May 30  2024 /usr/bin/passwd
$ g++ ids.cpp -o ids
$ ./ids
real UID 30033, effective UID 30033
$ sudo chown root ids
$ sudo chmod u+s ids
$ ./ids
real UID 30033, effective UID 0
$ sudo mkdir -m 1777 shared
$ touch shared/sam.txt
$ sudo -u kim rm -f shared/sam.txt
rm: cannot remove 'shared/sam.txt': Operation not permitted
```

**How it works:**
1. `passwd` is setuid root: any user runs it, and it can still write `/etc/shadow`.
2. Once `ids` (the program above) is owned by root with setuid, it runs with **real** UID 30033 (who started it) and **effective** UID 0 (the file's owner). Checks use the effective ID.
3. `shared` is world-writable with the sticky bit, like `/tmp` (`drwxrwxrwt`): `kim` can't delete `sam`'s file; without the sticky bit `kim` could.
4. A setuid-root program can do anything root can, so every bug in it is a security hole. Keep it tiny and drop the privilege early (`setuid(getuid())`).

## Common mistakes

- **"Permission denied" on a readable file.** Every directory on the path needs `x` for you.
- **Expecting the owner to fall back to group or others.** One triplet applies: `----rwxrwx` locks the owner out.
- **Treating umask as subtraction.** 666 with umask 033 is 644, not 633.
- **Protecting a file with its own bits.** A read-only file in a writable directory can still be deleted or replaced.
- **`chmod 777` to silence an error.** Everyone can then change the file. Fix the owner or group instead (lesson 31).
- **Setuid on a script.** Linux ignores it; a setuid-root `#!` script still runs as the caller.

## ⚠ Easily confused

- **owner vs group vs others** — Three separate rwx triplets. The kernel picks exactly one from your user and group IDs, most specific first, and checks only that one.
- **r/w/x on a file vs a directory** — File: read, change, run. Directory: list names, create/delete entries, enter and reach files inside.
- **real vs effective UID** — Real = who started the process. Effective = whose rights it has (the file owner in a setuid program). Checks use the effective ID.
- **umask vs chmod** — umask = bits removed from **new** files (a per-process setting). chmod = changes the mode of an **existing** file (lesson 30).

➡ Questions for this topic: `questions/master-question-sheet.md` (section 29).