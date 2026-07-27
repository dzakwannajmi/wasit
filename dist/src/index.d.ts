#!/usr/bin/env node
/**
 * MCP server exposing Wasit's conformance checks to agents.
 *
 * The suite logic is not reimplemented here: this is an adapter over
 * `@wasit/core`, so the CLI and an agent running the same checks against the
 * same target always reach the same verdict.
 *
 * MPP-13 permanently closes a channel and cannot be undone. An agent cannot be
 * assumed to carry meaningful human consent for that, so the destructive tool
 * is only registered when a human starts this process with an explicit opt-in.
 * Without it the tool is absent from the tool list entirely — an agent cannot
 * call what it cannot see.
 */
export {};
