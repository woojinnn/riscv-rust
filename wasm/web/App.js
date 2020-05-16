// App.js

// BigUint64Array polyfill.
// Mac/iOS doesn't seem to support BigUint64Array
// used in JS-WASM bridge generated by wasm-bindgen
// for transferring u64 type data yet.
// Perhaps it may be impossible to perfectly simulate
// BingUint64Array so this polyfill is just for
// transferring the data without error via the JS-WASM bridge.
// It doesn't be expected to use for other purposes.
// And wasm-bindgen update can break this polyfill.
if (!('BigUint64Array' in window)) {
  window.BigUint64Array = new Proxy(Float64Array, {
    construct(target, args) {
      let obj;
      const isArgumentArray = args.length === 1 && Array.isArray(args[0]);
      if (isArgumentArray) {
        const array = args[0];
        obj = new Float64Array(array.length);
      } else {
        obj = new Float64Array(args[0], args[1], args[2]);
      }
      const p = new Proxy(obj, {
        get(target, prop) {
          const num = Number(prop);
          if (Number.isInteger(num)) {
            if (num >= target.length) {
              return undefined;
            }
            const view = new Uint32Array(target.buffer);
            const low = view[num * 2];
            const high = view[num * 2 + 1];
            return (BigInt(high) << BigInt(32)) | BigInt(low);
          } else if (prop === 'set') {
            return (array, offset = 0) => {
              for (let i = 0; i < array.length; i++) {
                p[offset + i] = array[i];
              }
            };
          } else {
            return target[prop];
          }
        },
        set(target, prop, value) {
          const num = Number(prop);
          if (Number.isInteger(num)) {
            const view = new Uint32Array(target.buffer);
            const low = value & BigInt(0xffffffff);
            const high = (value >> BigInt(32)) & BigInt(0xffffffff);
            view[num * 2] = Number(low);
            view[num * 2 + 1] = Number(high);
          } else {
            target[prop] = value;
          }
          return true;
        }
      });
      if (isArgumentArray) {
        const array = args[0];
        for (let i = 0; i < array.length; i++) {
          p[i] = array[i];
        }
      }
      return p;
    }
  });
}

const charTable = {};

const u8_to_char = u8 => {
  if (charTable[u8] === undefined) {
    charTable[u8] = String.fromCharCode(u8);
  }
  return charTable[u8];
};

const u8s_to_strings = u8s => {
  let s = '';
  for (const u8 of u8s) {
    s += u8_to_char(u8);
  }
  return s;
};

export default class App {
  constructor(riscv, terminal, options = {}) {
    this.riscv = riscv;
    this.terminal = terminal;
    this.debugModeEnabled = options.debugModeEnabled !== undefined ? options.debugModeEnabled : false;
    this.runCyclesNum = options.runCyclesNum !== undefined ? options.runCyclesNum : 0x10000;
    this.inDebugMode = false;
    this.inputs = [];
    this.breakpoints = [];
    this.lastCommandStrings = '';
    this._setupInputEventHandlers();
  }

  _setupInputEventHandlers() {
    this.terminal.onKey(event => {
      if (this.inDebugMode) {
        this._handleKeyInputInDebugMode(event.key, event.domEvent.keyCode);
      } else {
        this._handleKeyInput(event.key, event.domEvent.keyCode);
      }
    });
    // I don't know why but terminal.onKey doesn't catch
    // space key so handling in document keydown event listener.
    document.addEventListener('keydown', event => {
      if (event.keyCode === 32) {
        if (this.inDebugMode) {
          this._handleKeyInputInDebugMode(' ', 32);
        } else {
          this._handleKeyInput(' ', 32);
        }
      }
      event.preventDefault();
    });
  }

  _handleKeyInput(key, keyCode) {
    if (this.debugModeEnabled && key.charCodeAt(0) === 1) { // Ctrl-A
      this.enterDebugMode();
      return;
    }

    const inputs = this.inputs;

    // xterm.js doesn't handle function keys so
    // handling by myself here
    switch (keyCode) {
      case 32: // Space
        inputs.push(32);
        break;
      case 33: // Page up
        inputs.push(27, 91, 53, 126);
        break;
      case 34: // Page down
        inputs.push(27, 91, 54, 126);
        break;
      case 35: // End
        inputs.push(27, 91, 52, 126);
        break;
      case 36: // Home
        inputs.push(27, 91, 49, 126);
        break;
      case 37: // Arrow Left
        inputs.push(27, 91, 68);
        break;
      case 38: // Arrow Up
        inputs.push(27, 91, 65);
        break;
      case 39: // Arrow Right
        inputs.push(27, 91, 67);
        break;
      case 40: // Arrow Down
        inputs.push(27, 91, 66);
        break;
      case 45: // Insert
        inputs.push(27, 91, 50, 126);
        break;
      case 46: // Delete
        inputs.push(127);
        break;
      case 112: // F1
        inputs.push(27, 79, 80);
        break;
      case 113: // F2
        inputs.push(27, 79, 81);
        break;
      case 114: // F3
        inputs.push(27, 79, 82);
        break;
      case 115: // F4
        inputs.push(27, 79, 83);
        break;
      case 116: // F5
        inputs.push(27, 91, 49, 53, 126);
        break;
      case 117: // F6
        inputs.push(27, 91, 49, 55, 126);
        break;
      case 118: // F7
        inputs.push(27, 91, 49, 6, 126);
        break;
      case 119: // F8
        inputs.push(27, 91, 49, 57, 126);
        break;
      case 120: // F9
        inputs.push(27, 91, 50, 48, 126);
        break;
      case 121: // F10
        inputs.push(27, 91, 50, 49, 126);
        break;
      case 122: // F11
        inputs.push(27, 91, 50, 50, 126);
        break;
      case 123: // F12
        inputs.push(27, 91, 50, 51, 126);
        break;
      default:
        inputs.push(key.charCodeAt(0));
        break;
    }
  }

  _handleKeyInputInDebugMode(key, keyCode) {
    switch(keyCode) {
      case 8: // backspace
        // Do not delete the prompt
        if (this.terminal._core.buffer.x > 2) {
          this.terminal.write('\b \b');
        }
        break;
      case 13: // new line
        const lines = this.terminal._core.buffer.lines;
        // Is there easier way to get last line?
        const y = this.terminal._core.buffer.y < this.terminal.rows - 1
          ? this.terminal._core.buffer.y : lines.length - 1;
        const line = lines.get(y);
        const length = line.getTrimmedLength();

        let commandStrings = '';
        for (let i = 2; i < length; i++) {
          commandStrings += line.getString(i);
        }
        if (commandStrings.trim() === '') {
          commandStrings = this.lastCommandStrings;
        }
        const command = this._parseCommand(commandStrings);
        this.lastCommandStrings = commandStrings;
        this.terminal.writeln('');
        if (!this._runCommand(command)) {
          this.terminal.writeln('Unknown command.');
        }
        if (this.inDebugMode) {
          this.prompt();
        }
        break;
      default:
        this.terminal.write(key);
        break;
    }
  }

  _parseCommand(s) {
    return s.trim().split(/\s+/);
  }

  _runCommand(command) {
    if (command.length === 0) {
      return false;
    }
    switch(command[0].toLowerCase()) {
      case '':
        // Do nothing
        return command.length === 1;
	    break;
      // UGH...
      case 'b':
      case 'br':
      case 'bre':
      case 'brea':
      case 'break':
      case 'breakp':
      case 'breakpo':
      case 'breakpoi':
      case 'breakpoin':
      case 'breakpoint':
        if (command.length === 1) {
          this.displayBreakpoints();
          return true;
        } else if (command.length === 2) {
          this.setBreakpoint(command[1]);
          return true;
        } else {
          return false;
        }
        break;
      case 'c':
      case 'co':
      case 'con':
      case 'cont':
      case 'conti':
      case 'contin':
      case 'continu':
      case 'continue':
        if (command.length === 1) {
          this.continue();
          return true;
        } else {
          return false;
        }
        break;
      case 'd':
      case 'de':
      case 'del':
      case 'dele':
      case 'delet':
      case 'delete':
        if (command.length === 2) {
          this.deleteBreakpoint(command[1]);
          return true;
        } else {
          return false;
        }
        break;
      case 'h':
      case 'he':
      case 'hel':
      case 'help':
        if (command.length === 1) {
          this.displayHelp();
          return true;
        } else {
          return false;
        }
        break;
      case 'm':
      case 'me':
      case 'mem':
        if (command.length === 2) {
          this.displayMemoryContent(command[1]);
          return true;
        } else {
          return false;
        }
        break;
      case 'p':
      case 'pc':
        if (command.length === 1) {
          this.displayPCContent();
          return true;
        } else {
          return false;
        }
        break;
      case 'r':
      case 're':
      case 'reg':
        if (command.length === 2) {
          this.displayRegisterContent(command[1]);
          return true;
        } else {
          return false;
        }
        break;
      case 's':
      case 'st':
      case 'ste':
      case 'step':
        switch (command.length) {
          case 1:
            this.step(1);
            return true;
          case 2:
            this.step(command[1]);
            return true;
          default:
            return false;
	    }
        break;
      default:
        return false;
    }
  }

  displayHelp() {
    this.terminal.writeln('Commands:');
    this.terminal.writeln('  breakpoint: Show breakpoint set list.');
    this.terminal.writeln('  breakpoint <virtual_address>: Set breakpoint.');
    this.terminal.writeln('  delete <virtual_address>: Delete breakpoint.');
    this.terminal.writeln('  continue: Continue the main program. Ctrl-A enters debug mode again.');
    this.terminal.writeln('  help: Show this message');
    this.terminal.writeln('  mem <virtual_address>: Show eight-byte content of memory');
    this.terminal.writeln('  pc: Show PC content');
    this.terminal.writeln('  reg <register_num>: Show register content');
    this.terminal.writeln('  step [num]: Run [num](one if omitted) step(s) execution');
  }

  step(numOrNumStr) {
    const num = parseInt(numOrNumStr);
    if (isNaN(num)) {
      this.terminal.writeln('Invalid num.');
      return false;
    }
    this.riscv.run_cycles(num);
    this.flush();
    this.riscv.disassemble_next_instruction();
    this.flush();
    this.terminal.writeln('');
  }

  run() {
    const runCycles = () => {
      setTimeout(runCycles, 0);
      this.riscv.run_cycles(this.runCyclesNum);
      this.flush();
      while (this.inputs.length > 0) {
        this.riscv.put_input(this.inputs.shift());
      }
    };

    this.inDebugMode = false;
    this.lastCommandStrings = '';
    runCycles();
  }

  continue() {
    const runCycles = () => {
      if (this.inDebugMode) {
        return;
      }
      setTimeout(runCycles, 0);
      let broken = false;
      if (this.breakpoints.length === 0) {
        // If no breakpoint set, we don't need to take care breakpoints
        // so calling run_cycles() which should be faster than
        // run_until_breakpoints()
        this.riscv.run_cycles(this.runCyclesNum);
      } else {
        if (this.riscv.run_until_breakpoints(new BigUint64Array(this.breakpoints), this.runCyclesNum)) {
          this.inDebugMode = true;
        }
      }
      this.flush();
      while (this.inputs.length > 0) {
        this.riscv.put_input(this.inputs.shift());
      }
      if (this.inDebugMode) {
        this.step(0);
      }
    };

    this.inDebugMode = false;
    runCycles();
  }

  displayMemoryContent(vAddressStr) {
    const vAddress = parseInt(vAddressStr);
    if (isNaN(vAddress)) {
      this.terminal.writeln('Invalid address.');
      return;
    }
    const error = new Uint8Array([0]);
    const data = this.riscv.load_doubleword(BigInt(vAddress), error);
    switch (error[0]) {
      case 0:
        this.terminal.writeln('0x' + data.toString(16));
        break;
      case 1:
        this.terminal.writeln('Page fault.');
        break;
      case 2:
        this.terminal.writeln('Invalid address.');
        break;
      default:
        this.terminal.writeln('Unknown error code.');
        break;
    }
  }

  displayRegisterContent(regNumStr) {
    const regNum = parseInt(regNumStr);
    if (isNaN(regNum)) {
      this.terminal.writeln('Invalid register number.');
      return;
    }
    if (regNum < 0 || regNum > 31) {
      this.terminal.writeln('Register number should be 0-31.');
      return;
    }
    this.terminal.writeln('0x' + this.riscv.read_register(regNum).toString(16));
  }

  displayPCContent() {
    this.terminal.writeln('0x' + this.riscv.read_pc().toString(16));
  }

  setBreakpoint(vAddressStr) {
    let vAddress;
    try {
      vAddress = BigInt(vAddressStr);
    } catch (e) {
      this.terminal.writeln('Invalid virtual address.');
      return;
    }
    if (this.breakpoints.includes(vAddress)) {
      this.terminal.writeln('Already set.');
      return;
    }
    this.breakpoints.push(vAddress);
  }

  deleteBreakpoint(vAddressStr) {
    let vAddress;
    try {
      vAddress = BigInt(vAddressStr);
    } catch (e) {
      this.terminal.writeln('Invalid virtual address.');
      return;
    }
    if (!this.breakpoints.includes(vAddress)) {
      this.terminal.writeln('Not found.');
      return;
    }
    this.breakpoints.splice(this.breakpoints.indexOf(vAddress), 1);
  }

  displayBreakpoints() {
    for (const b of this.breakpoints) {
      this.terminal.writeln('0x' + b.toString(16));
    }
  }

  flush() {
    const outputBytes = [];
    while (true) {
      const data = this.riscv.get_output();
      if (data !== 0) {
        outputBytes.push(data);
      } else {
        break;
      }
    }
    if (outputBytes.length > 0) {
      this.terminal.write(u8s_to_strings(outputBytes));
    }
  }

  enterDebugMode() {
    this.inDebugMode = true;
    this.flush();
    this.terminal.writeln('');
    this.riscv.disassemble_next_instruction();
    this.flush();
    this.terminal.writeln('');
    this.prompt();
  }

  prompt() {
    this.terminal.write('% ');
  }
}
