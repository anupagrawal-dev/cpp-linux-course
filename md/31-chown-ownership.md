# 31 — chown & Ownership

*Category: Linux*

> Every file belongs to one user and one group. chown and chgrp change them; only root may give a file to another user.

## Must-remember points

- Every file stores an **owner (UID)** and a **group (GID)** as numbers; `ls -l` shows names from `/etc/passwd` and `/etc/group`, `ls -ln` the numbers. Ownership picks the rwx triplet that applies (lesson 29).
- `chown user file`, `chown user:group file`, `chown :group file` (group only), `chown user: file` (the user's login group), `chgrp group file`. `-R` = recursive.
- **Only root can change a file's owner.** The owner may change the group, but only to a group they belong to.
- A **new file** gets the creating process's effective UID and primary group, unless the directory has **setgid**: then it gets the **directory's group**, and new subdirectories inherit the setgid bit.
- `cp` makes a new file owned by you; `mv` within one filesystem keeps the original owner. Files created with `sudo` belong to root.
- `id` shows your UID, primary GID and all groups (`whoami` only the name). A new group membership applies from the **next login**.
- A **service** runs as its own **system user** that can't log in and owns only its data: `useradd --system --shell /usr/sbin/nologin webapp`, then `chown -R webapp:webapp` its data directory.
- `chown` **clears setuid and setgid** on an executable, so run `chmod u+s` after it. A deleted user's files keep the bare UID number.

## Owner and group are numbers

**Meaning:** a file's inode stores two numbers: the owner's user ID (UID) and the group ID (GID). Names exist only for people: `ls -l` looks them up in `/etc/passwd` and `/etc/group`. The kernel compares the numbers with the process's IDs to choose a triplet (lesson 29). As in lessons 29 and 30, the sessions run as the ordinary user `sam`, who is also in group `team`; `sudo` runs a command as root.

```bash
$ touch plan.txt
$ ls -l plan.txt
-rw-r--r-- 1 sam sam 0 Oct 31 01:41 plan.txt
$ ls -ln plan.txt
-rw-r--r-- 1 30033 30033 0 Oct 31 01:41 plan.txt
$ id
uid=30033(sam) gid=30033(sam) groups=30033(sam),30002(team)
$ getent passwd sam
sam:x:30033:30033::/home/sam:/bin/bash
$ sudo useradd -M olduser
$ sudo chown olduser plan.txt
$ ls -l plan.txt
-rw-r--r-- 1 olduser sam 0 Oct 31 01:41 plan.txt
$ sudo userdel olduser
$ ls -l plan.txt
-rw-r--r-- 1 30035 sam 0 Oct 31 01:41 plan.txt
```

**How it works:**
1. `ls -ln` prints the stored numbers: UID 30033, GID 30033.
2. `id` lists the user's IDs: the primary group (`gid=`) and every group the user belongs to (`groups=`).
3. The `/etc/passwd` line is `name:x:UID:GID:comment:home:shell`.
4. After `userdel`, the number 30035 has no name, so `ls` prints it bare. The file still belongs to UID 30035: a new user created later with that UID would own it.

## chown and chgrp

**Meaning:** `chown` sets the owner, the group, or both; `chgrp` sets only the group. The part after the colon is the group: empty before the colon keeps the owner, empty after it means the user's login group.

```bash
$ touch plan.txt
$ sudo chown -v kim plan.txt
changed ownership of 'plan.txt' from sam to kim
$ sudo chown -v kim:team plan.txt
changed ownership of 'plan.txt' from kim:sam to kim:team
$ sudo chown -v :sam plan.txt
changed ownership of 'plan.txt' from kim:team to :sam
$ sudo chgrp -v team plan.txt
changed group of 'plan.txt' from sam to team
$ sudo chown -v sam: plan.txt
changed ownership of 'plan.txt' from kim:team to sam:sam
```

**How it works:**
1. `-v` prints before and after. `kim` changed only the owner; `kim:team` both; `:sam` and `chgrp team` only the group.
2. `sam:` set the owner to `sam` and the group to `sam`'s login group.
3. `chown -R kim:team proj` changes a directory and everything below it.
4. On a symbolic link, `chown` changes the **target**; `chown -h` changes the link itself. `-R` doesn't follow links inside the tree.

## Who may change ownership

**Meaning:** giving a file away would let a user escape disk quotas or plant files under someone else's name, so only root may change the owner. The owner may move the file between groups they belong to.

| Action | root | file's owner | anyone else |
|---|---|---|---|
| change the owner | yes | no | no |
| change the group | yes | only to a group the owner belongs to | no |
| change the mode (lesson 30) | yes | yes | no |

```bash
$ touch plan.txt
$ chown kim plan.txt
chown: changing ownership of 'plan.txt': Operation not permitted
$ chgrp team plan.txt
$ chgrp kim plan.txt
chgrp: changing group of 'plan.txt': Operation not permitted
$ sudo -u kim chgrp kim plan.txt
chgrp: changing group of 'plan.txt': Operation not permitted
$ g++ ids.cpp -o tool
$ chmod u+s tool
$ ls -l tool
-rwsr-xr-x 1 sam sam 16480 Oct 31 01:41 tool
$ sudo chown kim tool
$ ls -l tool
-rwxr-xr-x 1 kim sam 16480 Oct 31 01:41 tool
```

**How it works:**
1. `sam` can't give the file to `kim`, but can move it to `team`, one of `sam`'s groups. Group `kim` isn't, so that fails.
2. `kim` isn't the owner, so `kim` can't change the group at all.
3. `ids.cpp` is lesson 29's small program. Changing the owner of a setuid program cleared the `s`, even when root did it: otherwise the file would silently start running as a different user. Set special bits **after** `chown`.

## Who owns a new file

**Meaning:** a new file belongs to the **effective UID** of the process that creates it, and its group is that process's primary group. Exception: in a directory with the **setgid** bit, new files get the **directory's group**, and new subdirectories get the setgid bit too. This is how a team shares a project directory.

```bash
$ sudo mkdir -m 2775 shared
$ sudo chgrp team shared
$ ls -ld shared
drwxrwsr-x 2 root team 4096 Oct 31 01:41 shared
$ touch mine.txt
$ touch shared/report.txt
$ mkdir shared/sub
$ sudo touch byroot.txt
$ cp byroot.txt copy.txt
$ mv byroot.txt moved.txt
$ ls -l mine.txt copy.txt moved.txt shared
-rw-r--r-- 1 sam  sam     0 Oct 31 01:41 copy.txt
-rw-r--r-- 1 sam  sam     0 Oct 31 01:41 mine.txt
-rw-r--r-- 1 root root    0 Oct 31 01:41 moved.txt

shared:
total 4
-rw-r--r-- 1 sam team    0 Oct 31 01:41 report.txt
drwxr-sr-x 2 sam team 4096 Oct 31 01:41 sub
```

**How it works:**
1. `mine.txt` got `sam:sam`: the creator and its primary group.
2. Inside `shared` (setgid, group `team`), `report.txt` got group `team`, and `sub` got the `s` bit, so the rule continues downwards.
3. `sudo touch` ran as root, so root owns the file. `cp` created a **new** file, owned by `sam`. `mv` (same filesystem) only renamed: the owner stayed root.
4. For other team members to edit `report.txt`, it also needs group write: team members use umask 002 (lesson 29).

## Running a service as its own user

**Meaning:** a server should not run as root. Give it a **system user** that can't log in and owns only the service's data. An attacker who takes over the process gets that user's rights, not the machine's. PostgreSQL runs as `postgres`, Redis as `redis`.

```cpp
#include <cerrno>
#include <cstring>
#include <fcntl.h>
#include <iostream>
#include <unistd.h>

int main(int argc, char* argv[]) {
    std::cout << "running as UID " << getuid() << "\n";
    for (int i = 1; i < argc; i++) {                     // each argument: a file to append to
        int fd = open(argv[i], O_WRONLY | O_APPEND);     // no O_CREAT: never creates a file
        if (fd < 0) {
            std::cout << argv[i] << ": " << std::strerror(errno) << "\n";
            continue;
        }
        bool ok = write(fd, "started\n", 8) == 8;
        close(fd);
        std::cout << argv[i] << ": " << (ok ? "written" : "write failed") << "\n";
    }
}
```

```bash
$ sudo useradd --system --no-create-home --shell /usr/sbin/nologin webapp
$ id webapp
uid=995(webapp) gid=994(webapp) groups=994(webapp)
$ sudo mkdir data
$ sudo touch data/app.log
$ sudo chown -R webapp:webapp data
$ sudo chmod 750 data
$ echo "port=8080" > config.txt
$ g++ writer.cpp -o writer
$ sudo -u webapp ./writer data/app.log config.txt
running as UID 995
data/app.log: written
config.txt: Permission denied
$ cat data/app.log
cat: data/app.log: Permission denied
$ sudo su webapp
This account is currently not available.
```

**How it works:**
1. `--system` picks a UID below 1000; `/usr/sbin/nologin` refuses logins (the last command).
2. The service owns `data/` (750), so it can write its log; `config.txt` (owned by `sam`, 644) is read-only for it. `sam` can't read the service's data either.
3. In production, a systemd unit starts the program with `User=webapp` and `Group=webapp` in its `[Service]` section, and the data lives in `/var/lib/webapp`. A program started as root can also drop to the service user itself (`setgid()`, then `setuid()`).

## Common mistakes

- **Building with `sudo`.** `sudo make` leaves root-owned files in your project, and the next build as yourself fails with "Permission denied". Fix: `sudo chown -R "$USER": build`.
- **`chmod 777` instead of fixing the owner.** If a service can't write its directory, `chown` it to the service user (or share a group).
- **Setting setuid before `chown`.** `chown` clears it. Order: `chown`, then `chmod u+s`.
- **Expecting a new group to work at once.** After `usermod -aG team sam`, `sam`'s running sessions keep the old groups; log out and in (or `newgrp team`).
- **`chown -R` on the wrong path.** There is no undo: run on `/` or `/usr`, it changes the owner of system files and clears every setuid bit (`sudo`, `passwd`).

## ⚠ Easily confused

- **chown vs chgrp** — chown changes the owner (and optionally the group); chgrp changes only the group.
- **id vs whoami** — `id` shows your UID, GIDs and all groups; `whoami` shows just your username.
- **`chown user: f` vs `chown :group f`** — `user:` sets the owner and the user's login group. `:group` sets only the group and keeps the owner.
- **primary group vs setgid directory** — A new file normally gets the creator's primary group; in a setgid directory it gets the directory's group instead.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 31).