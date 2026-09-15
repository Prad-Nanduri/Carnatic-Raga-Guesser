-- Extend the instrument palette (nadaswaram, saxophone) for alapana mode.

ALTER TYPE "Instrument" ADD VALUE IF NOT EXISTS 'nadaswaram';
ALTER TYPE "Instrument" ADD VALUE IF NOT EXISTS 'saxophone';
