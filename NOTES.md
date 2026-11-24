# Hand-off notes

## Latest: smoother walking in Journey
- Phones now get the joystick **and** tap-to-walk together by default (Menu > Walking cycles stick + tap / tap only / stick only; desktop stays tap-only).
- Tap-to-walk takes smooth straight legs instead of tile-to-tile zigzags, turns toward the goal quickly before moving, stops and interacts as soon as you are in reach of the person or thing, and waits and re-routes if a passenger is in the way instead of giving up.
- Turning: touch drag-look is ~24% slower and glides to its target; tap-walk turns ease round (max ~140°/s) instead of snapping. Mouse look is unchanged.
- Walking speed 1.9 to 2.3 then down to 1.2 (menu now shows an "Updated ..." build timestamp so you can check your phone has the latest), view widened (FOV 74 to 80 landscape, 92 on tall phone screens), stoke bar moves aside for the stick, joystick dead zone, and a looser tap threshold for fingers (16 px, 600 ms).

## Latest: the look (storybook polish)
- **Inside:** every room now has its own wallpaper tint (instance colours on a striped, flowered, dado-railed wallpaper texture); door posts everywhere and lintels in first person; framed pictures on about a third of the walls in sleepers, dining cars, parlors, corridors and the music room (first person only, never over a window); round rugs under dining tables and a rug and potted plant in sleepers.
- **Outside:** telegraph poles with wire running beside the track, round bushes at the track edge (tinted by the region palette), drifting clouds, and a few birds. These sit outside the region-weight system, so existing worlds are unchanged.
- Nothing here changes rules or saves.

## Latest: richer passengers
- **Wishes.** Everyone carries one hope (build a bigger Garden, furnish a room to level 2-3, see N new regions, make a friend). It is revealed once they feel at home (mood 30), shown in People / the Book with a progress bar, and granted automatically (+120 Charm, mood up, slip + postcard). If they leave without it, the farewell is wistful, never punishing, and a returning guest brings the wish back.
- **Friends and rivals.** Pairs are fixed for the 15 authored folk (see `RELATIONS` in `data.js`) and hashed for everyone else (~14% friends, ~8% rivals). The stop card hints at who they would get on with. Friends sharing a room build a bond (+mood, +20% Charm); rivals sharing a room eventually squabble (toast + orange spark). In Journey, **talk to either one** to make peace (+40 Charm); in AFK mode it blows over on its own.
- **Odd guests.** Hortensia Bell needs 2 berths; Mr. Pennywhistle (a ghost) and Pip (a dragon in a teapot) take none but are worth +30% / +20% Charm. Berths are now counted per guest (`freeBeds()`), the stop card says what they need.
- **Richer strangers.** Generated passengers combine occupation x quirk x secret x hobby (14 x 12 x 10 x 8), with a region flavour line at the stop. Their three tales are now: their trade, their hobby, a secret.
- New story chapters: *The Thing They Hoped For*, *Two Chairs, Pulled Close*, *The Art of Sitting Between*, *A Train of Small Miracles*.
- Names with titles ("Mr. Pennywhistle", "Madame Oussou") are shortened with `firstOf()` in all dialogue.

## Earlier: more to do in Journey mode
- **Windows:** every room with an outside wall gets a window with a live picture of the Line (scenery, weather and stations passing). Rooms with tall furniture against a wall skip that wall. Interact to look out: you are told what is out there (a landmark, a station, the region).
- **People are solid:** you slide around passengers instead of through them, and a passenger who would walk into you waits a few seconds, then carries on, so nobody is ever stuck.
- **Hands:** you see your own hands, and what you carry: a cup of tea (with steam), the post bag, or the thing you are fetching.
- **More duties (nine kinds now):** *Keep a lookout* (look out of a window, then tell a passenger), *An errand* (fetch something from their favorite room, such as a book from the Library, and bring it), *Water the plants* (Garden Room), *Light the lamps* (any room), plus the earlier tea, hello, post bag, tidy and raise steam. One new chapter unlocks from looking out of windows.
Please check: do the windows feel magical or fussy? Do the errands make you think about who likes what? Does bumping into people feel right, or do you get stuck in doorways? Frame rate with windows on a real phone (the windows are small pictures re-drawn every few frames).
Known gaps: window views are low-resolution; the hands are simple; the first-person art is still the roughest part of the look.

## Latest: AFK mode and Journey mode
- A button in the top bar switches between **AFK** (the game as it was: the train runs itself, steady and calm) and **Journey** (you walk the train in first person as the conductor). Same save either way.
- **Journey:** raised walls and a ceiling, tap-to-walk or a joystick (Settings > Walking switches), drag to look, WASD plus E on a keyboard. Talk to passengers in person (you hear their tales aloud first, then ordinary chat), stoke at the conductor's post.
- **Duties (Journey only):** up to three at a time: serve tea from a dining-car urn, say hello to passengers, deliver the post bag, tidy a room, raise steam. Gold lights mark what a duty needs. Each pays about 0.8 minutes of your income in Charm and feeds three new chapters (The Conductor's Log, Small Duties, What the Cap Remembers).
- **Mouse look (desktop):** click the view to capture the mouse, move it to look around, click again to walk or interact where the crosshair points, and Esc lets go (so you can click the buttons). If a browser refuses pointer capture it falls back to steering by where the cursor sits on screen. Settings > Mouse look turns it off for the old click-to-walk and drag-to-look.
- **Reward for playing Journey:** +25% Charm while you are walking the train, plus duty pay. AFK is untouched.
- **Auto-AFK:** after 30 minutes with no touch, key or mouse input you drop back to AFK. It works whether the game stayed open or was closed: the last-input time is saved, and checked when you return.
Please check: is walking comfortable on your phone (tap and joystick)? Are duties fun for a few minutes or a chore? Is +25% and the duty pay enough to make Journey feel worth it without making AFK feel like a loss? Does first person look good enough, or too rough up close?
Known gaps: no window to look out at the Line from first person, passengers do not block you, the cab/post is a prop at the start of the corridor, and the post bag/tea are just carried (no hands visible).

## Latest: meeting people, and what happens after they leave
- **Talk first (optional):** at a stop, the quick *Invite aboard* still works. *Talk first* opens a short scene: you read a small tell (a glance at the kettle, reading every sign, standing apart) and choose to offer tea, ask about their journey, or give quiet. Reading them well starts them warmer (their first tale opens at once); everyone is welcomed either way.
- **Farewells:** leaving is a card with a gesture that fits who they were, their keepsake, and a promise they may write or return.
- **Letters:** every departed passenger writes a letter 30 to 110 miles later (8 hobbies x 2 letters). Letters live in Journal > Postcards, and a slip tells you one has come.
- **Old friends return:** about one passenger stop in five (once someone has been gone 80+ miles) is a returning guest who says what has changed, arrives warm, brings a gift of Charm, and keeps the tales they had told.
- Two new chapters unlock from this: *The Post Car* and *A Familiar Face*.
Please check: do the replies and letters feel warm rather than samey? Is a returning guest too rare or too common? Does Talk first feel worth the extra tap?

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
- [ ] Journey walking on your phone: is the stick comfortable (position, size, speed)? Does tap-to-walk go where you point? Anything still clunky? Tell me which part.
- [ ] The look: does the inside feel cosier in first person (wallpaper, frames, door posts)? Do poles and bushes outside add life or clutter? Frame rate on your phone vs before (Settings > Graphics: Low still works)?
- [ ] Richer passengers: do wishes feel like a gentle goal or like homework? Is the reveal (mood 30) timed well? Does the wistful farewell land?
- [ ] Friends and rivals: do the stop-card hints ("would get on well with / might clash with") make inviting feel like a choice? Does "talk to them" in Journey make peace clearly enough?
- [ ] Odd guests: invite Hortensia (needs 2 berths) with a full train and check the message; does the ghost/dragon (no berth) feel special?
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
