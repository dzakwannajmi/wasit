export interface CheckResult {
    id: string;
    name: string;
    pass: boolean;
    detail: string;
}
export interface X402SimulatorOptions {
    target: string;
}
export declare function runX402ReadChecks(options: X402SimulatorOptions): Promise<CheckResult[]>;
