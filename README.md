# marsjs
Core war **MARS** virtual computer (Memory Array Redcode Simulator) written in JavaScript and easily accessible through the browser.

**Live Demo**: http://stylesuxx.github.io/marsjs/

## Features
* debugging (single stepping through the code)

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