# Defects the user has caught (check every new sprite for these)

Each one: what it looks like, why it happens, and the fix that worked.

## Outlines

- **Broken or ragged outline** (wreath, stockings): the edge mixes outline
  with red, orange, grey or dark-green pixels. Shrinking puts whatever colour
  dominates a block on the edge, and a dark shading colour looks like a broken
  bit of outline. Fix: `outlineEdges(rows)` — every edge pixel becomes outline,
  including edges round inner holes (a wreath's middle).
- **Thin details lost to the outline** (holly leaves on the stockings): parts
  only 1-2 pixels wide turn entirely into outline. Fix: `outlineEdges(rows,
  'o', keep)` with `keep` true for their colour (e.g. greens): they keep their
  colour and get the outline just outside them.
- **Outline colour used as shading inside** (wreath): dark pixels inside look
  like stray outline. Fix: turn dark interior pixels into a darker shade of the
  area's own colour (dark green in green).
- **A shape built from a clean ring/rectangle reads better** than a noisy
  conversion when the object is geometric (wreath = ring with a bow; picture =
  rectangle frame). Rebuild the silhouette, keep the drawing's colours inside.

## Lines and strings

- **One missing pixel in a line** (fairy lights' wire, bauble strings): a
  bulb or bauble drawn over the line, or shrinking dropping a pixel, leaves a
  gap or a 2-column jump. Check every line pixel-by-pixel for 8-connected
  continuity after anything is drawn over it; add the joining pixel.
- **A lighter (or darker) pixel in a one-colour line** (bauble strings): a
  block caught a highlight. Fix: set the whole string/cord to one colour.
- **A thin object shrunk to nothing** (fairy lights): draw it by hand in code,
  following the drawing's look — the user wants it to match their drawing
  (round bulbs with a rim and a pale middle, alternating above and below a
  wavy wire), not a simplified stand-in. A plain version was called "boring".

## Frames and borders

- **Things spilling outside a frame** (tree picture): snow and candy canes
  drawn over the frame's bottom corners; the green showed outside the outline.
  Fix: redraw the frame on all four sides (outline, wood, inner dark line) over
  the conversion.

## Colours

- **Background bleeding in**: a coloured background (a green field) tints the
  outline (dark greens in a raccoon's outline). Fix: the background test must
  match the real background (`--green`), and any colour from it in the result
  becomes outline (`recolour`). Only a green critter (the frog) keeps greens.
- **Too many near-identical colours**: fine to keep (they're the drawing's
  own), but 30-40 colours per set is plenty.

## Critters

- **Eyes don't match**: mirror the face (`mirrorFace`), not the whole body
  (a tail to one side must stay).
- **Views disagree** (badger's back had mouse-sized ears; raccoon's back had a
  smudge for a tail): build the back from the front's outline
  (`backFromFront`), keeping the tail and head stripes, or convert a proper
  four-view reference instead.
- **Side view on all fours** (deer): every critter stands upright in every
  view. The side body should look like the others' (e.g. the rabbit's side
  body in the critter's colours) under the critter's own head.
- **Two tails** (squirrel): one tail in every view, on the same side as seen
  from front and back.
- **Stray pixel inside an ear** (rabbit's far ear): repaint in the ear's own
  colour.
- **Best source**: when the user sends a clean reference picture of a critter
  in four views, convert that (native grid) rather than patching an older
  sprite — patching the raccoon's mask never satisfied them; converting their
  reference did.

## Process

- Render big and Read before saying it's fixed; check the exact spot the user
  pointed at, and look for the same defect elsewhere in the sprite and in its
  siblings (both stockings, every string, every view).
- Keep fixes in the regeneration script so a rerun doesn't undo them.
