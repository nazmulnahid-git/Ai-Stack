-- Separate database for `pnpm test` so test runs never touch dev data.
CREATE DATABASE __NAME_SNAKE___test OWNER __NAME_SNAKE__;
