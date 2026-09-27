# Decisions

Three points the brief deliberately left open. Each is worth judging on
reasoning, not on matching a "correct" answer — so here's the reasoning.

## DP1 — Feed order

**Choice:** Sort by risk level first (`High Risk` → `Flagged` → `Clean`),
then by most recent within each tier.

**Why:** The whole point of a triage tool is to get a fact-checker's or
moderator's attention to the most dangerous content first — that's what
"triage" means. Pure recency would bury a high-risk claim from an hour ago
under a stream of harmless recent posts, which defeats the tool's purpose.
Risk-first, recency-second keeps the feed actionable for a reviewer working
through a backlog, while still surfacing new activity within each risk tier.

## DP2 — Visibility of unverified claims

**Choice:** Unverified claims are publicly visible in the feed immediately,
clearly badged `Unverified`, alongside their risk flags.

**Why:** Hiding claims until reviewed would turn TruthLens into a black box —
useful to reviewers but useless as a public-facing transparency tool, and it
would also hide the exact claims the public most needs a "wait, this hasn't
been checked yet" signal on. Showing them immediately, with an honest badge
and visible risk flags, lets readers apply their own caution in the window
before a human reviewer gets to it, which matches the brief's framing of a
tool a newsroom or citizen group would actually use. The trade-off is that
an unverified false claim gets more visibility than a "hide until reviewed"
design would give it; the flag/badge system is the mitigation for that.

## DP3 — Editing after submission

**Choice:** A claim's original text, platform, category, and source link are
immutable once submitted. The only thing that can change afterward is the
review status and reviewer note. Its risk flags and overall risk level are
computed once, at submission time, from that frozen text — they are never
recomputed or editable afterward.

**Why:** This is a fact-checking tool — its credibility depends on being
able to say "this is exactly what was posted, unedited." Allowing the
submitter (there's no login, so anyone) to rewrite a claim after the fact
would let someone launder a genuinely sensational post into something
mild after it had already been flagged, or dispute a reviewer's verdict by
changing the evidence out from under it. Freezing the flags for the same
reason closes the same loophole from the other direction: if the text can't
change but the flags could be recalculated on demand, someone could still
strip a "Sensational" or "Unsourced" flag after the fact by, say, retroactively
attaching a source link — undermining the exact audit trail the flag system
exists to provide. If a correction is genuinely needed, the right move is a
new submission, not a silent edit to the original.
