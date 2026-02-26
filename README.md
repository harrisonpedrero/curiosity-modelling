# curiosity-modelling

## Project Objective

To implement matching a string against a regular expression (regex) pattern. Regular expresions are commonly used to describe textual patterns. They can be efficiently matched against as they are equivalent in expressivity to finite automata. 

## Model Design and Visualization

We implement matching against a subset of the full regex standard, namely patterns including `*`, `?`, and `+`, but without `|` disjunction and `()` character groups. We did this for simplicity, but adding in character groups is not difficult; it amounts to extending the `character` field to a `set`.

The visualizer on the Script -> SVG tab in Spytial Sterling shows the `Node`s connected as an nondeterministic finite automaton (NFA). The Graph view on Sterling looks complex, but this is largely due to having a few collections of objects: one letter for each letter of the alphabet, `State`s for each `State` in the Input matching, the `Input` sequence, and the `Node`s.

## Signatures and Predicates

Signatures
- `Boolean`, `True`, and `False`
- `Input`, defined by a `string` that is a partial function mapping integers to chars and `length` that is an integer
- `Node`, defining a group of characters in the regex pattern, with fields `character` meaning a literal, `wildcard` indicating whether there is a wildcard present after the character, `next` indicating the next node in the pattern, and `skip` indicating epsilon transitions that the node could transition to alternatively. For example, if `l` represents a literal (character) being `N1`, then
    - `l` is represented with `next = N2` and `skip = NULL`
    - `l?` is represented by `next = N2` and `skip = N2`
    - `l*` is represented by `next = N1` and `skip = N2`
    - `l+` is equivalent to `ll*`
    - `Start`, `Accepting` are distinguished states
- `State` walks through the `Node`s, matching against `Input`
- `Trace` is a partial function that models the sequence of states, with the tuple `(state1, state2, True)` in the function if `state1` maps to `state2`.

The signature essential provide the bare minimum for effectively constructing and walking through the NFA.

Predicates for implementation
- `init`: validates the `Input` string, the `Node`s, and `State`s
- `validTransitions`: validates the `Nodes` transition correctly according to the `Input` string, i.e. matches the two objects

The `init` predicate ensures syntactic correctness, while the `validTransitions` ensures semantic correctness in connecting the `Input` with the NFA.

## Testing

Predicates for tests
- `loop`: tests that `AAAAAB` matches against the regex pattern `A*B`
- `dotStar`: tests that `XYZ` matches agains the regex pattern `.*`
- `cascade`: tests that `AAABBC` matches against the regex pattern `A*B*C`.

## Documentation

The code is well-commented.