# Concept graph: per-node split

Request: show the confused / partly / can explain split on every graph node with colour-coded numbers, and drop the per-concept distribution list under the graph to free space.

- `ConceptNodeView` gets a row under `N = …` with the three counts, each in its level colour (`LEVELS[].text`: rose-600 / amber-700 / teal-700) next to a level dot. Hidden when N = 0 ("no responses" already shows). Instructors see exact counts with the low-sample marker, as before (MVP_Outline privacy rule applies to student views only).
- The graph caption replaces the "Text version" link with a legend for the three count colours.
- `RadarDashboard` removes the `#per-concept` section, so the graph fills the left column. The text alternative to the graph colours (Build_Instructions accessibility rule) is now the counts printed on each node and the node `aria-label`. The node detail panel still shows the full distribution.
- No Convex, schema or copy changes elsewhere.
