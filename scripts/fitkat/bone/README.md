# FitKat: bone and balance, the tags behind the counts

`tags.json` says which catalogue exercises count as balance work, as posture work, and as impact
through the legs (1 low, 2 moderate, 3 high). `export.py` writes it into
`frontend/src/fitkat/bone-data.js`, which `frontend/src/fitkat/bone.js` reads. Run it after a
catalogue update; an id the catalogue no longer has is left out.

```
python3 scripts/fitkat/bone/export.py
```

## Where the tags come from

934 candidates were read: every exercise a name-and-target rule had tagged, plus a wider net to
catch what the rule missed. Each was read from its catalogue text only, never the media, by three
AI model types (Haiku, Sonnet, Opus), independently and blind: no tags, no ids, a different order
for each reader. What was asked, and the definitions, are in `brief.md`.

To keep invented answers out:

- every answer had to quote the words of the text that decide it, and a script checked each quote
  against the text (all 2,433 were verbatim);
- thirteen exercises with obvious answers were hidden in every batch (every reader got all right);
- six items per batch were repeated under another key (every reader answered them the same twice);
- the 133 items the three did not agree on were read again, blind, by a fourth model type.

The three agreed on balance for 93.0% of items, posture 97.3%, impact 94.3%. A tag is the
majority's answer. 37 answers were still tied after the fourth reader and were settled the
cautious way: no credit for balance or posture, the higher of two impact levels, "none" against
"low".

What this is not: no clinician has verified these tags. The limits feature
(`scripts/fitkat/limits/`) keeps its own rule-derived impact tags.
