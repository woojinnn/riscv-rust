pub const CSR_CAPACITY: usize = 4096;

// CSR explanation: <https://book.rvemu.app/hardware-components/03-csrs.html>
pub const CSR_FFLAGS_ADDRESS: u16 = 0x001;
pub const CSR_FRM_ADDRESS: u16 = 0x002;
pub const CSR_FCSR_ADDRESS: u16 = 0x003;

// Supervisor Address Translation and Protection Register (SATP)
// controls supervisor-mode address translation and protection.
pub const CSR_SATP_ADDRESS: u16 = 0x180; // S-mode

// ============== TRAP SETUP ==============
// STATUS REGISTERs
// Base addresses of the status registers
pub const CSR_USTATUS_ADDRESS: u16 = 0x000;
pub const CSR_MSTATUS_ADDRESS: u16 = 0x300; // M-mode.
pub const CSR_SSTATUS_ADDRESS: u16 = 0x100; // S-mode.
/// The interrupt registers
// When bit is set, interrupts are globally enabled.
// SIE: S-mode global interrupt bits
// MIE: M-mode global interrupt bits
pub const CSR_MIE_ADDRESS: u16 = 0x304; // Machine interrupt-enable register
pub const CSR_SIE_ADDRESS: u16 = 0x104;
pub const CSR_UIE_ADDRESS: u16 = 0x004;

pub const CSR_MISA_ADDRESS: u16 = 0x301; // M-mode. ISA and extensions

// The trap delegation registers
// indicate the certain exceptions and interrupts should be directly by a lower privileged level
// - EDELEG: exception delegation
// - IDELEG: interrupt delegation
pub const CSR_MEDELEG_ADDRESS: u16 = 0x302; // Machine exception delegation register
pub const CSR_MIDELEG_ADDRESS: u16 = 0x303; // Machine interrupt delegation register
pub const CSR_SEDELEG_ADDRESS: u16 = 0x102;
pub const CSR_SIDELEG_ADDRESS: u16 = 0x103;

// ============== TRAP SETUP(END) ==============

// ============== TRAP HANDLING ==============
// The M-mode trap-vector base address registers.
// trap vector configuration
pub const CSR_MTVEC_ADDRESS: u16 = 0x305; // Machine-mode trap handler base address
pub const CSR_UTVEC_ADDRESS: u16 = 0x005;
pub const CSR_STVEC_ADDRESS: u16 = 0x105;

pub const _CSR_MSCRATCH_ADDRESS: u16 = 0x340; // Scratch register for machine trap handlers
pub const _CSR_SSCRATCH_ADDRESS: u16 = 0x140; // Scratch register for supervisor trap handlers
pub const _CSR_USCRATCH_ADDRESS: u16 = 0x040;

// EXCEPTION PROGRAM COUNTERS
// contain the information about the program counter when an exception happens.
pub const CSR_MEPC_ADDRESS: u16 = 0x341; // Machine exception program counter
pub const CSR_SEPC_ADDRESS: u16 = 0x141; // S-mode
pub const CSR_UEPC_ADDRESS: u16 = 0x041;

pub const CSR_MIP_ADDRESS: u16 = 0x344; //Machine interrupt pending
pub const CSR_SIP_ADDRESS: u16 = 0x144;
pub const _CSR_UIP_ADDRESS: u16 = 0x044;

// TRAP CAUSE REGISTERS
// contain a code indicating the event that caused the trap.
pub const CSR_MCAUSE_ADDRESS: u16 = 0x342; // Machine trap cause
pub const CSR_SCAUSE_ADDRESS: u16 = 0x142; // S-mode
pub const CSR_UCAUSE_ADDRESS: u16 = 0x042;

// TRAP VALUE REGISTERS
// contain the information about a trap.
pub const CSR_MTVAL_ADDRESS: u16 = 0x343; // Machine bad address or instruction
pub const CSR_STVAL_ADDRESS: u16 = 0x143; // S-mode
pub const CSR_UTVAL_ADDRESS: u16 = 0x043; // U-mode

// ============== TRAP HANDLING(END) ==============

// ============== MACHINE MEMORY PROTECTION ==============
pub const _CSR_PMPCFG0_ADDRESS: u16 = 0x3a0;
pub const _CSR_PMPADDR0_ADDRESS: u16 = 0x3b0;
pub const CSR_CYCLE_ADDRESS: u16 = 0xc00;
pub const CSR_TIME_ADDRESS: u16 = 0xc01;
pub const _CSR_INSERT_ADDRESS: u16 = 0xc02;

// MACHINE COUNTERS/TIMERS
pub const _CSR_MCYCLE_ADDRESS: u16 = 0xb00; // Machine Cycle counter

// HARDWARE THREAD REGISTERS
pub const _CSR_MHARTID_ADDRESS: u16 = 0xf14; // Hardware thread ID
