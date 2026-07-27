import type { CheckResult } from "../check.js";
export type { CheckResult };
export interface X402SimulatorOptions {
    target: string;
}
export declare function runX402ReadChecks(options: X402SimulatorOptions): Promise<CheckResult[]>;
export interface X402PaymentCheckOptions {
    target: string;
    network: string;
    payerSecretKey: string;
}
export declare function runX402PaymentChecks(options: X402PaymentCheckOptions): Promise<CheckResult[]>;
