# Couponcoder for Hermes installed

Enable it if you did not install with `--enable`:

```bash
hermes plugins enable couponcoder
```

Restart Hermes or the gateway after enabling.

In shared gateways, restrict `/couponcoder` to trusted users with Hermes slash-command access controls; runtime mode is process-local.

Commands:

- `/couponcoder [lite|full|ultra|off]`
- `/couponcoder-review [target]`
- `/couponcoder-audit [target]`
- `/couponcoder-debt`
- `/couponcoder-gain`
- `/couponcoder-help`

Bundled skills are available as `couponcoder:couponcoder`, `couponcoder:couponcoder-review`, `couponcoder:couponcoder-audit`, `couponcoder:couponcoder-debt`, `couponcoder:couponcoder-gain`, and `couponcoder:couponcoder-help`.
