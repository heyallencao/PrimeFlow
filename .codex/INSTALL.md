Tell Codex to run these commands:

```bash
git clone https://github.com/heyallencao/PrimeFlow.git ~/.codex/PrimeFlow
cd ~/.codex/PrimeFlow
./primeflow install --host codex
```

Then restart Codex.

First run after restart:

```text
/pf-help
```

Or, if you already know this is a new task:

```text
/pf-orchestrate 判断这个任务该从哪个 entry mode 接入，再路由到最小安全下一步。
```

What this does:

- installs shared runtime to `~/.agents/skills/PrimeFlow` (canonical path)
- creates `~/.codex/skills/PrimeFlow` as a symlink to the shared runtime
- writes individual skill wrappers to `~/.agents/skills/pf-*/SKILL.md` (not `~/.codex/skills/pf-*`)
- after restart, call PrimeFlow directly with `/pf-help`, `/pf-orchestrate`, `/pf-review`, etc.
