#lang forge/froglet

open "regex.frg"

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
    init
    validTransitions
    loop
} for 6 Int, 15 State, 8 Node

run {
    init
    validTransitions
    cascade
} for 6 Int, 15 State, 8 Node

run {
    init
    validTransitions
    dotStar
} for 6 Int, 15 State, 8 Node