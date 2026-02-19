#lang forge/froglet

option run_sterling "vis.js"

abstract sig char {

}

one sig A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z extends char {

}

abstract sig Boolean {}
one sig True, False extends Boolean {}

one sig Input {
    string: pfunc Int -> char,
    length: one Int
}

sig Node {
    character: lone char,
    wildcard: one Boolean,
    next: lone Node,
    skip: lone Node
}

one sig Start, Accepting extends Node {}

sig State {
    currNode: one Node,
    index: one Int
}

one sig Trace {
    tr: pfunc State -> State -> Boolean
}

pred init {
    Input.length >= 0
    all i: Int | {
        (i < 0 or i >= Input.length) implies {
            Input.string[i] = none
        }
        (i >= 0 and i < Input.length) implies {
            not (Input.string[i] = none)
        }
    }
    all n: Node | {
        (n = Start or n = Accepting) implies {
            no n.character
            n.wildcard = False
        }
        not (n = Start or n = Accepting) implies {
            not (n.character = none) or n.wildcard = True
        }
        n != Start implies {
            reachable[n, Start, next, skip]
        }
        n = Start implies {
            no n.next
        }
        n = Accepting implies {
            no n.next
            no n.skip
        }
        n.wildcard = True implies {
            no n.character
        }
        not (no n.character) implies {
            n.wildcard = False
        }
        not reachable[n, n, skip]
        not reachable[n, n.skip, skip, next]
    }
    all s: State | {
        s.index < Input.length implies {
            some next: State | {
                (Trace.tr[s][next] = True and next.index = add[s.index, 1]) or (s.currNode.skip = next.currNode and next.index = s.index)
            }
        }
        s.currNode = Start implies {
            s.index = 0
        }
        s.index <= Input.length
        s.index >= 0 
    }
    one s: State | {
        s.currNode = Start
        s.index = 0
    }
}

pred validTransitions {
    all s1: State | {
        all s2: State | {
            Trace.tr[s1][s2] = True iff 
            (
                (
                    (some s1.currNode.character and Input.string[s1.index] = s1.currNode.character) or s1.currNode.wildcard = True)
                     and 
                     (add[s1.index, 1] = s2.index and s1.currNode.next = s2.currNode)) 
                     or
                     ((s1.currNode.skip = s2.currNode) and (s1.index = s2.index))
                    
        }
        s1.currNode != Start implies {
            some s2: State | {
                Trace.tr[s2][s1] = True
            }
        }
    }
    some s: State | {
        s.index = Input.length
        s.currNode = Accepting
    }
}

pred loop {
    // A*B and AAAAAB
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

pred dotStar {
    // Checking .* against a random string
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

pred cascade {
    // Tests multiple self-loops (AAABBC and start->A->B->C->end, requiring A and B to repeat)
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