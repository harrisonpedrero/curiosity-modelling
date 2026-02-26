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

// validates the Input
pred validInput {
    // the Input string length is nonnegative
    Input.length >= 0
    all i: Int | {
        // there is no Input character at negative indices or indices last the Input's length
        (i < 0 or i >= Input.length) implies {
            Input.string[i] = none
        }
        // there is an Input character at indices in [0, Input.length)
        (i >= 0 and i < Input.length) implies {
            not (Input.string[i] = none)
        }
    }
}

// validates the Nodes
pred validNodes {
    all n: Node | {
        // the Start and Accepting nodes do not have characters are not not wildcards
        (n = Start or n = Accepting) implies {
            no n.character
            n.wildcard = False
        }
        // all nodes that are not Start and Accepting either have characters or are wildcards
        not (n = Start or n = Accepting) implies {
            not (n.character = none) or n.wildcard = True
        }
        // all nodes are reachable from the Start node using next and skip
        n != Start implies {
            reachable[n, Start, next, skip]
        }
        // the Start node does not have a next node
        n = Start implies {
            no n.next
        }
        // the Accepting node does not have a next node or a skip node
        n = Accepting implies {
            no n.next
            no n.skip
        }
        // all nodes with a wildcard do not have a character
        n.wildcard = True implies {
            no n.character
        }
        // if a node has a character, then it does not have a wildcard
        not (no n.character) implies {
            n.wildcard = False
        }
        // a node is not reachable from itself using skip
        not reachable[n, n, skip]
        // a node is not reachable from itself.skip using skip or next
        not reachable[n, n.skip, skip, next]
    }
}

// validates the States
pred validStates {
    all s: State | {
        // for all states other than the Start state, there is some other state that the Trace records it mapping to
        s.currNode != Start implies {
            some s2: State | {
                Trace.tr[s2][s] = True
            }
        }
        // basically, we can move from one state to the next according to Trace with the requisite rules being followed: for all States `s` with index less than the length of the Input, there is some next State `next` such that Trace records `s` mapping to `next` and the index of `next` is the index of `s` + 1, or we can skip from `s` to `next` and `next` has the same index as `s`
        s.index < Input.length implies {
            some next: State | {
                (Trace.tr[s][next] = True and next.index = add[s.index, 1]) or (s.currNode.skip = next.currNode and next.index = s.index)
            }
        }
        // if the current Node of a state is the Start, then its index is 0
        s.currNode = Start implies {
            s.index = 0
        }
        // a State's index is at most the Input's length
        s.index <= Input.length
        // a State's index is nonnegative
        s.index >= 0 
    }
    // about the Start state
    one s: State | {
        // there is a unique state with its current Node at the Start
        s.currNode = Start
        // for this node, the index is 0
        s.index = 0
    }
    // there is (at least one) Accepting state with length the length of the Input
    some s: State | {
        s.index = Input.length
        s.currNode = Accepting
    }
}

// matches the Input, validates the `Nodes` transition correctly according to the `Input` string, i.e. matches the two objects
pred validTransitions {
    all s1: State | {
        // The Trace records a state `s` mapping to another state `s'` iff 1) (either s's current Node is a wildcard or s's current Node matches with the Index at s's index), and `s.index + 1 = s'.index`, and the next node after s's current Node is s'
        // or 2) `s` can skip to `s'` and `s` and `s'` have the same index
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
    }
}

// Combines the above requirements
pred valid {
    validInput
    validNodes
    validStates
    validTransitions
}