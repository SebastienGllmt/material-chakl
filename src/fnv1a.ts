/**
 * Taken from https://github.com/sindresorhus/fnv1a
 * Inlined to reduce dependencies (given this is a really small piece of code)
 */

export interface Options {
	/**
	The bit size of the hash.

	@default 32
	*/
	readonly size?: 32 | 64 | 128 | 256 | 512 | 1024;

	/**
	A Uint8Array used to encode the string into UTF-8 bytes.

	This array can be reused across calls to `fnv1a`. Doing so will improve performance because it avoids allocating a new Uint8Array when encoding the string.

	The size of the array does not have to be large enugh to hold the entire string, but performance will be improved if it is.

	This option is only used when `value` is a string.

	@example
	```
	import fnv1a from '@sindresorhus/fnv1a';

	const utf8Buffer = new Uint8Array(100);

	fnv1a('🦄🌈', {size: 32, utf8Buffer});
	//=> 2868248295n
	```
	*/
	readonly utf8Buffer?: Uint8Array;
}

const FNV_PRIMES = {
	32: 16_777_619n,
} as const;

const FNV_OFFSETS = {
	32: 2_166_136_261n,
} as const;

const cachedEncoder = new globalThis.TextEncoder();

function fnv1aUint8Array(uint8Array: Uint8Array, size: number): bigint {
	const fnvPrime = FNV_PRIMES[size];
	let hash: bigint = FNV_OFFSETS[size];

	// eslint-disable-next-line unicorn/no-for-loop -- This is a performance-sensitive loop
	for (let index = 0; index < uint8Array.length; index++) {
		hash ^= BigInt(uint8Array[index]);
		hash = BigInt.asUintN(size, hash * fnvPrime);
	}

	return hash;
}

function fnv1aEncodeInto(string: string, size: number, utf8Buffer: Uint8Array): bigint {
	if (utf8Buffer.length === 0) {
		throw new Error('The `utf8Buffer` option must have a length greater than zero');
	}

	const fnvPrime = FNV_PRIMES[size];
	let hash: bigint = FNV_OFFSETS[size];
	let remaining: string = string;

	while (remaining.length > 0) {
		const result = cachedEncoder.encodeInto(remaining, utf8Buffer);
		remaining = remaining.slice(result.read);
		for (let index = 0; index < result.written; index++) {
			hash ^= BigInt(utf8Buffer[index]);
			hash = BigInt.asUintN(size, hash * fnvPrime);
		}
	}

	return hash;
}

export default function fnv1a(value: string | Uint8Array, options: Options = {}): bigint {
	const { size = 32, utf8Buffer } = options;

	if (!FNV_PRIMES[size]) {
		throw new Error('The `size` option must be one of 32, 64, 128, 256, 512, or 1024');
	}

	if (typeof value === 'string') {
		if (utf8Buffer) {
			return fnv1aEncodeInto(value, size, utf8Buffer);
		}

		value = cachedEncoder.encode(value);
	}

	return fnv1aUint8Array(value, size);
}