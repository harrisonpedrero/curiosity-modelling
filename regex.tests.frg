#lang forge/froglet

open "regex.frg"

test suite for valid {
  // Assertion that the index does not decrease along the trace.
  assert {all s1, s2 : State | Trace.tr[s1][s2] = True implies s1.index <= s2.index} is necessary for valid

  // Assertion that the accepting node's index is the input's length
  assert {all s : State | s.currNode = Accepting implies s.index = Input.length} is necessary for valid

  // Assertion that the Start state can reach the Accepting state
  assert {reachable[Accepting, Start, next, skip]} is necessary for valid
}

// match the input AAAAAB against the pattern A*B
pred loop {
    Input.length = 6
    all i: Int | (i >= 0 and i < 5) implies Input.string[i] = A
    Input.string[5] = B
    some nA, nB: Node | {
        nA.character = A
        nB.character = B
        nA.next = nA 
        nA.skip = nB
        Start.skip = nA
        nB.next = Accepting
    }
}

run {
    valid
    loop
} for 6 Int, 15 State, 8 Node

// attempt to match the input BA against the pattern A*B
pred failed_loop {
    Input.length = 2
    Input.string[0] = B
    Input.string[1] = A
    some nA, nB: Node | {
        nA.character = A
        nB.character = B
        nA.next = nA 
        nA.skip = nB
        Start.skip = nA
        nB.next = Accepting
    }
}

// shows that this failed because to validTransitions, which is the part that should fail.
run {
    validInput
    validNodes
    validStates
    not validTransitions
    failed_loop
} for 6 Int, 15 State, 8 Node

// match a random Input (XYZ) against the pattern .*
pred dotStar {
    Input.length = 3
    Input.string[0] = X
    Input.string[1] = Y
    Input.string[2] = Z
    some wild: Node | {
        wild.wildcard = True
        wild.next = wild
        wild.skip = Accepting
        Start.skip = wild
    }
}

run {
    valid
    dotStar
} for 6 Int, 15 State, 8 Node

// Tests multiple self-loops (AAABBC and start->A->B->C->end, requiring A and B to repeat)
pred cascade {
    Input.length = 6
    Input.string[0] = A
    Input.string[1] = A
    Input.string[2] = A
    Input.string[3] = B
    Input.string[4] = B
    Input.string[5] = C
    some nA, nB, nC: Node | {
        nA.character = A
        nB.character = B
        nC.character = C
        Start.skip = nA
        nA.next = nA
        nA.skip = nB
        nB.next = nB
        nB.skip = nC
        nC.next = Accepting
    }
}

run {
    valid
    cascade
} for 6 Int, 15 State, 8 Node