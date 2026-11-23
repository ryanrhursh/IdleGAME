# Hand-off notes

## Latest: the storybook look and the writing book
Storybook is now the default look (Settings > Look switches between five; `?look=` in the address also works).
The Journal is now a book with five tabs: **Chapters** (21 pages that write themselves as you travel, each with an ink-wash plate and a drop cap;
blank pages show what unlocks them), **Folk** (portraits and the tales each passenger has told), **Plates** (every region you cross is painted in, endlessly),
**Postcards** and **Keepsakes**. Crossing into a region shows a chapter banner, a new page shows a tappable slip, and passengers have hand-drawn portraits.
Please check: do the chapter texts feel like a story you want to read? Is anything too twee, too long, or in the wrong order? Are unlock conditions too slow?


State of the game after the overnight build. Branch: `claude/jolly-goodall-vx6xf9`.
`main` holds the first playable version you tested on your phone; everything below is on the branch only.

## What was added since `main`
1. **Pacing pass.** Found with a bot (`node scripts/balance.mjs 30 6`). Stops were every ~30 s when stoking and passengers left
   after 3 to 8 minutes. Now stops are about every 1.5 to 2.5 minutes, passengers stay 15 to 40+ minutes, forks and landmarks are spread out,
   and early Charm income is roughly doubled (start Charm 70).
2. **Layout matters.** Short walks to a favorite room earn +25% Charm, long ones earn less. The passenger card shows their average trip.
   Hearts float up when someone is happy in their favorite room.
3. **Furnish and Restyle.** Tap a room to raise its level (+20% Charm each, string lights appear) or restyle its colors for free. This is the long-term Charm sink.
4. **Landmarks and gates.** Postcards now describe things you actually pass (windmill, lighthouse, scarecrows, hilltop flag, lantern row, roof-door house,
   scarf stone, tethered cloud, ladder). A gate marks each region boundary and names the next region.
5. **Installable.** Manifest, icons and standalone mode. On the phone: browser menu, "Add to Home Screen".
6. **Phone-readiness.** Settings: Graphics Auto/Low/High. Passenger name tags. Friendly message if WebGL is missing.
   After the "while you were away" report, a waiting passenger opens straight away.

## Please test (on your phone)
- [ ] Start from a fresh save (Settings > Start over). Is the first 2 minutes fun? First stop at about 20 s, first room affordable at about 2 to 3 minutes?
- [ ] Frame rate. If it feels choppy, try Settings > Graphics: Low. Tell me which phone and browser.
- [ ] Drag to draw a room inside. Does the ghost and cost label follow your finger? Can you tap-to-place the smallest size?
- [ ] Pan and pinch-zoom inside. Do the controls feel right, or do they fight with drawing?
- [ ] Tap a passenger figure inside (name tag above them). Is the tap target big enough?
- [ ] Stoke: is the needle timing too fast or too slow?
- [ ] Close the app for 10+ minutes, reopen. Does the welcome-back report look right and open the waiting passenger?
- [ ] Sound: tap once, then check the chuff, whistle and chime sounds are pleasant, and the Sound toggle works.
- [ ] Add to Home Screen, open from the icon. Full screen? Does the save carry over?
- [ ] Fork: do you notice the signs and the choice banner? Is it clear what the choice does?
- [ ] Anything that feels like a chore. That is the thing to cut first.

## Known gaps and honest caveats
- Never run on a real phone by me. All checks were headless browser plus a bot.
- The train does not visibly curve at forks. The choice shows as signs, lamps and a gate.
- Passengers have a favorite room only. There are no neighbor, rivalry or friendship effects yet.
- Region look varies by palette, weather and props, but the shapes of the scenery are the same everywhere.
- Charm piles up for a player who has built everything the bot built; more sinks (bigger rooms, special rooms) would help late game.
- The score and balance numbers (room costs, income, stay lengths) are untested by a human.
- Pages: if GitHub Pages points at this branch, each push goes live. Switch it to `main` to freeze.

## Ideas for next phases
- Passenger relationships (who likes whom, shared rooms) and small story events between them.
- Visible train curve and branch geometry at forks.
- Weather that reaches inside (rain on windows) and a Lost & Found car for keepsakes.
- Room-specific mini-actions (feed the fish, water the garden) as optional active play.
- Service worker for true offline play.

## Commands
```bash
npm install
npm run build        # bundles into docs/index.html and docs/fragment.html
npm test             # headless rule checks
node scripts/balance.mjs 30 6   # 30-minute bot run, stoking every 6 s (use 0 for pure idle)
```
