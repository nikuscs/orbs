import { dlopen, FFIType, JSCallback, ptr } from 'bun:ffi';
import { DESKTOP } from './desktop.constants';
import type { Pointer } from 'bun:ffi';

const isMacos = DESKTOP.platform === 'macos';
const objcPath = '/usr/lib/libobjc.A.dylib';

function desktopObjcSend(args: FFIType[]): (...values: unknown[]) => Pointer | null {
  if (!isMacos) {
    return () => null;
  }

  const send = dlopen(objcPath, { objc_msgSend: { args: [FFIType.ptr, FFIType.ptr, ...args], returns: FFIType.ptr } }).symbols.objc_msgSend;

  // SAFETY: a `ptr` return is an object pointer or null; Bun types it with `bigint` only for the generic FFI signature.
  return (...values) => send(...values) as Pointer | null;
}

const objc = isMacos
  ? dlopen(objcPath, {
    objc_getClass: { args: [FFIType.ptr], returns: FFIType.ptr },
    sel_registerName: { args: [FFIType.ptr], returns: FFIType.ptr },
  })
  : null;

const system = isMacos
  ? dlopen('/usr/lib/libSystem.B.dylib', {
    dlopen: { args: [FFIType.ptr, FFIType.i32], returns: FFIType.ptr },
    dlsym: { args: [FFIType.ptr, FFIType.ptr], returns: FFIType.ptr },
  })
  : null;

export const desktopSend = {
  none: desktopObjcSend([]),
  one: desktopObjcSend([FFIType.ptr]),
  two: desktopObjcSend([FFIType.ptr, FFIType.ptr]),
  three: desktopObjcSend([FFIType.ptr, FFIType.ptr, FFIType.ptr]),
  four: desktopObjcSend([FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr]),
  integer: desktopObjcSend([FFIType.i64]),
  bytes: desktopObjcSend([FFIType.ptr, FFIType.u64]),
  handle: desktopObjcSend([FFIType.ptr, FFIType.i64]),
  options: desktopObjcSend([FFIType.u64, FFIType.ptr]),
  main: desktopObjcSend([FFIType.ptr, FFIType.ptr, FFIType.bool]),
  person: desktopObjcSend([FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr]),
  intent: desktopObjcSend([FFIType.ptr, FFIType.i64, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr]),
};

const BLOCK_IS_GLOBAL = 1 << 28;

const blockIsa = system
  ? system.symbols.dlsym(system.symbols.dlopen(null, 0), desktopCString('_NSConcreteGlobalBlock'))
  : null;

const blockDescriptor = Buffer.alloc(16);
const blocksAlive = new Map<Buffer, JSCallback>();

blockDescriptor.writeBigUInt64LE(32n, 8);

function desktopCString(text: string): Buffer {
  return Buffer.from(`${text}\0`);
}

export function desktopSelector(name: string) {
  return objc ? objc.symbols.sel_registerName(desktopCString(name)) : null;
}

export function desktopClass(name: string) {
  return objc ? objc.symbols.objc_getClass(desktopCString(name)) : null;
}

export function desktopString(text: string) {
  return desktopSend.one(desktopClass('NSString'), desktopSelector('stringWithUTF8String:'), desktopCString(text));
}

export function desktopNew(name: string) {
  return desktopSend.none(desktopSend.none(desktopClass(name), desktopSelector('alloc')), desktopSelector('init'));
}

export function desktopFramework(path: string): void {
  if (system) {
    system.symbols.dlopen(desktopCString(path), 1);
  }
}

/** An Objective-C block that calls back into JS once, for completion handlers: `args` follow the block's own pointer. */
export function desktopBlock(args: FFIType[], run: (...values: unknown[]) => void): Pointer | null {
  if (!blockIsa) {
    return null;
  }

  const block = Buffer.alloc(32);

  const callback = new JSCallback((_block: unknown, ...values: unknown[]) => {
    blocksAlive.delete(block);
    run(...values);
  }, {
    args: [FFIType.ptr, ...args],
    returns: FFIType.void,
    threadsafe: true,
  });

  block.writeBigUInt64LE(BigInt(blockIsa), 0);
  block.writeInt32LE(BLOCK_IS_GLOBAL, 8);
  block.writeBigUInt64LE(BigInt(callback.ptr ?? 0), 16);
  block.writeBigUInt64LE(BigInt(ptr(blockDescriptor)), 24);
  blocksAlive.set(block, callback);

  return ptr(block);
}
