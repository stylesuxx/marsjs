# marsjs
Core war **MARS** virtual computer (Memory Array Redcode Simulator) written in JavaScript and easily accessible through the browser.

**Live Demo**: http://stylesuxx.github.io/marsjs/

## Features
* debugging (single stepping through the code)
* Parser supports labels, variables and for's
* Available opcodes:
 * **add** - add A to B, store result in B
 * **cmp** - Skip next instruction if A is equal to B
 * **div** - divide B by A, store result in B if A > 0, else terminate
 * **djn** - decrement B, if B is non-zero, transfer execution to A
 * **jmn** - transfer execution to A if B is non-zero
 * **jmp** - transfer execution to A
 * **jmz** - transfer execution to A if B is zero
 * **mod** - divide B by A, store remainder in B if A > 0, else terminate
 * **mov** - move from A to B
 * **mul** - multiply A by B, store result in B
 * **slt** - skip next instruction if A is less than B
 * **spl** - split off process to A
 * **sub** - subtract A from B, store result in B
* Available opcode modifiers:
 * **a** - Instructions read and write A-fields
 * **b** -  Instructions read and write B-fields
 * **ab** - Instructions read the A-field of the A-instruction and the B-field of the B-instruction and write to B-fields
 * **ba** - Instructions read the B-field of the A-instruction and the A-field of the B-instruction and write to A-fields
 * **f** - Instructions read both A- and B-fields of the A- and B-instruction and write to both A- and B-fields (A to A and B to B)
 * **x** - Instructions read both A- and B-fields of the the A- and  B-instruction and write to both A- and B-fields exchanging fields (A to B and B to A)
 * **i** - Instructions read and write entire instructions
* Available addressing modes:
 * **\#** - immediate
 * **$** - direct
 * **\*** - indirect using A-field
 * **@** - indirect using B-field
 * **\{** - predecrement indirect using A-field
 * **\}** - postincrement indirect using A-field
 * **<** - predecrement indirect using B-field
 * **\>** - postincrement indirect using B-field

## Goals
* be compatible with the current pmars implementation regarding parsing and opcodes

## Building & Running
Clone the repository, install all needed modules and build the *app.js* file

    npm install
    grunt
Point your browser to the **index.html** and have fun.

## Development
Run grunt with the *watch* parameter, so that *app.js* is build every time a change is detected in one of the js files.

    grunt watch

### References:
* http://www.koth.org/info/pmars-redcode-94.txt
* http://www.corewars.org/docs/94spec.html