# HoldTooltip

The info button beside a held task (Blocked, On Hold, On Request) and the card it opens on hover or focus: why it is held and who it is waiting for.

- Props: `status`, `reason` (required text), `waitingOn` (a person or party, e.g. "Manto", "Klien — tim IT"), `since` (date), `open`.
- The trigger takes the status's ink colour. The card is `surface-raised` with `shadow-md`.
- "Alasan tertahan" is mandatory when a task moves into a held status; "Menunggu siapa" is optional but should name a person when there is one.
