# Night Panel notes

## Investigation priority score

The desktop computes a 0–100 **investigation priority** from locally stored alerts. It is not a cheat probability and must never be labeled as one.

Inputs, capped:

- Alerts in the last hour (×3, cap 25)
- Distinct check ids (×5, cap 20)
- Highest VL / max-VL ratio (×25, cap 25)
- CRITICAL×5 + HIGH×2 (cap 15)
- Time clustering of the last hour (cap 20)

Bands: 0–20 Normal, 21–40 Watch, 41–60 Suspicious, 61–80 High, 81–100 Critical.

## Keyboard

- `Ctrl/Cmd+K` search
- `Ctrl/Cmd+1..7` views
- `Ctrl/Cmd+,` settings
