/**
 * Orchestration for the MPP channel-mode suite.
 *
 * This lives in core rather than in a front end so that the CLI and the MCP
 * server run the same checks, in the same order, under the same guards. A
 * second front end reimplementing this is how the two would silently drift.
 */
import { errored, skipped } from "../check.js";
import { assertHttpUrl, classifyCheckError } from "../errors.js";
import { runMppChannelCloseCheck, runMppChannelCommitmentReplayCheck, runMppChannelDeployChecks, runMppChannelOrderingCheck, runMppChannelReplayCheck, } from "./channel.js";
import { fetchChannelChallenge } from "./channel-credential.js";
import { assertMppNetwork } from "./network.js";
const DEPLOY_ID = "MPP-10";
const DEPLOY_NAME = "Channel Deploy";
function missingExpectations(expected) {
    return [
        typeof expected?.token === "string" && expected.token.length > 0 ? null : "token",
        typeof expected?.from === "string" && expected.from.length > 0 ? null : "from",
        typeof expected?.to === "string" && expected.to.length > 0 ? null : "to",
        typeof expected?.refundWaitingPeriod === "number" &&
            Number.isInteger(expected.refundWaitingPeriod)
            ? null
            : "refundWaitingPeriod",
    ].filter((entry) => entry !== null);
}
function isComplete(expected) {
    return missingExpectations(expected).length === 0;
}
async function runDeployCheck(params) {
    const { network, rpcUrl, advertised, advertisedFailure, channelOverride, expected } = params;
    if (advertised && channelOverride && advertised !== channelOverride) {
        return [
            {
                id: DEPLOY_ID,
                name: DEPLOY_NAME,
                pass: false,
                detail: `Channel mismatch: the target bills through ${advertised}, but this run ` +
                    `named ${channelOverride}. Inspecting the named channel would report on a ` +
                    `different contract than the rest of the suite, so nothing was inspected. ` +
                    `Drop the override to use the advertised channel, or point the target at ` +
                    `the intended one.`,
            },
        ];
    }
    const channel = advertised ?? channelOverride;
    if (!channel) {
        return [
            skipped(DEPLOY_ID, DEPLOY_NAME, `the channel the target advertises could not be read ` +
                `(${advertisedFailure ?? "unknown error"}), and no channel was named to ` +
                `inspect instead.`),
        ];
    }
    if (!isComplete(expected)) {
        return [
            skipped(DEPLOY_ID, DEPLOY_NAME, `expected on-chain parameters not supplied ` +
                `(${missingExpectations(expected).join(", ")}).`),
        ];
    }
    const results = await runMppChannelDeployChecks({
        channelContract: channel,
        network,
        ...(rpcUrl ? { rpcUrl } : {}),
        expected,
    });
    if (advertised)
        return results;
    // Inspected an operator-supplied address without being able to confirm it is
    // the one the target bills through. Say so, rather than letting the result
    // read as though the two were checked against each other.
    return results.map((result) => ({
        ...result,
        detail: `${result.detail} Note: the target's advertised channel could not be read ` +
            `(${advertisedFailure ?? "unknown error"}), so ${channel} came from this run's ` +
            `own configuration and is unverified against the target.`,
    }));
}
/**
 * Runs MPP-10 through MPP-14 against a target.
 *
 * The channel under test is resolved once, from the target's own challenge,
 * so every check in the run reports on the same contract. MPP-13 runs last
 * because a close is terminal.
 */
export async function runMppChannelSuite(options) {
    const { target, commitmentSecretHex, network, rpcUrl, channelOverride, expected, allowDestructive = false, destructiveChannel, } = options;
    // A bad URL or an unknown network is wrong for every check in the suite, so
    // it is reported once here instead of repeated identically per check.
    try {
        assertHttpUrl(target);
        assertMppNetwork(network);
    }
    catch (error) {
        return [errored("PREFLIGHT", "Run Preflight", error)];
    }
    const shared = {
        target,
        commitmentSecretHex,
        network,
        ...(rpcUrl ? { rpcUrl } : {}),
    };
    // The target decides which channel it bills through, so its challenge — not
    // the operator's environment — is the authority on what this run is about.
    let advertised;
    let advertisedFailure;
    try {
        advertised = (await fetchChannelChallenge(target)).channelContract;
    }
    catch (error) {
        advertisedFailure = classifyCheckError(error).message;
    }
    const results = [];
    results.push(...(await runDeployCheck({
        network,
        ...(rpcUrl ? { rpcUrl } : {}),
        ...(advertised ? { advertised } : {}),
        ...(advertisedFailure ? { advertisedFailure } : {}),
        ...(channelOverride ? { channelOverride } : {}),
        ...(expected ? { expected } : {}),
    })));
    results.push(...(await runMppChannelOrderingCheck(shared)));
    results.push(...(await runMppChannelReplayCheck(shared)));
    results.push(...(await runMppChannelCommitmentReplayCheck(shared)));
    // Last: a close is terminal, so nothing may run against the channel after it.
    results.push(...(await runMppChannelCloseCheck({
        ...shared,
        allowDestructive,
        ...(destructiveChannel ? { expectedChannel: destructiveChannel } : {}),
    })));
    return results;
}
